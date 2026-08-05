const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const archiver = require('archiver');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '1mb' })); // JSON endpoints only (like/comment); uploads use multipart

// Multipart upload config — disk storage keeps memory flat for large videos
// ponytail: 200MB limit prevents disk fill on Render free tier (1GB disk) with concurrent uploads
const upload = multer({
  dest: path.join(os.tmpdir(), 'wedding-uploads'),
  limits: { fileSize: 200 * 1024 * 1024 }, // 200MB max per file
});

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const REPO_OWNER = process.env.REPO_OWNER || 'tassiost';
const REPO_NAME = process.env.REPO_NAME || 'wedding';
const BRANCH = process.env.BRANCH || 'main';
const PHOTOS_FILE_PATH = 'data/photos.json';
const R2_USAGE_FILE_PATH = 'data/r2-usage.json';
const ZIP_CACHE_KEY = 'wedding-photos.zip';

// R2 Configuration — env vars only, no hardcoded fallbacks (security)
const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || 'wedding';
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL;

// Startup validation — warn clearly instead of silent failures
const REQUIRED_ENV = ['GITHUB_TOKEN', 'R2_ACCOUNT_ID', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY', 'R2_PUBLIC_URL'];
const MISSING_ENV = REQUIRED_ENV.filter(v => !process.env[v]);
if (MISSING_ENV.length > 0) {
  console.error('⚠️  Missing required environment variables:', MISSING_ENV.join(', '));
  console.error('   Set them in Render → Environment. API calls will fail until resolved.');
}

// R2 Limits (Free Tier)
const R2_LIMITS = {
  STORAGE_GB: 10,
  CLASS_A_OPERATIONS: 1000000,
  CLASS_B_OPERATIONS: 10000000
};

// Initialize S3 client for R2
const s3Client = new S3Client({
  region: 'auto',
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
});

// Helper function to get GitHub headers
function getHeaders() {
  return {
    'Authorization': `token ${GITHUB_TOKEN}`,
    'Accept': 'application/vnd.github.v3+json',
    'Content-Type': 'application/json',
  };
}

// ponytail: shared fetch-mutate-save with SHA retry — fixes concurrent like/comment/delete data loss
// mutateFn receives parsed data, mutates in place, returns { result, message } or throws to abort
async function updatePhotosWithRetry(mutateFn, maxRetries = 3) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const response = await fetch(
      `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${PHOTOS_FILE_PATH}?ref=${BRANCH}`,
      { headers: getHeaders() }
    );
    if (!response.ok) throw new Error('Failed to fetch photos');

    const fileData = await response.json();
    const content = Buffer.from(fileData.content, 'base64').toString('utf-8');
    const data = JSON.parse(content);

    const { result, message } = mutateFn(data);
    const newContent = Buffer.from(JSON.stringify({
      photos: data.photos,
      lastUpdated: new Date().toISOString(),
    }, null, 2)).toString('base64');

    const putResponse = await fetch(
      `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${PHOTOS_FILE_PATH}`,
      {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify({ message: message || 'Update photos', content: newContent, branch: BRANCH, sha: fileData.sha }),
      }
    );

    if (putResponse.ok) return result;
    if (putResponse.status === 409 && attempt < maxRetries - 1) {
      console.log(`SHA mismatch, retrying (${attempt + 1}/${maxRetries})`);
      continue;
    }
    throw new Error(`GitHub save failed: ${putResponse.status}`);
  }
  throw new Error('Max retries exceeded');
}

// Health check endpoint for keep-alive
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// R2 Usage Tracking
async function getR2Usage() {
  try {
    const response = await fetch(
      `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${R2_USAGE_FILE_PATH}?ref=${BRANCH}`,
      { headers: getHeaders() }
    );
    if (response.ok) {
      const fileData = await response.json();
      const content = Buffer.from(fileData.content, 'base64').toString('utf-8');
      return JSON.parse(content);
    }
  } catch (error) {
    console.log('Error fetching R2 usage:', error.message);
  }
  // Return default usage if file doesn't exist
  return {
    storageBytes: 0,
    classAOperations: 0,
    classBOperations: 0,
    lastUpdated: new Date().toISOString()
  };
}

// ponytail: SHA-retry version of updateR2Usage — fixes concurrent upload usage-count race
async function updateR2UsageWithRetry(mutateFn, maxRetries = 3) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    let sha;
    let usage;
    const response = await fetch(
      `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${R2_USAGE_FILE_PATH}?ref=${BRANCH}`,
      { headers: getHeaders() }
    );
    if (response.ok) {
      const fileData = await response.json();
      sha = fileData.sha;
      const content = Buffer.from(fileData.content, 'base64').toString('utf-8');
      usage = JSON.parse(content);
    }

    const newUsage = mutateFn(usage || {
      storageBytes: 0,
      classAOperations: 0,
      classBOperations: 0,
      lastUpdated: new Date().toISOString(),
    });

    const content = Buffer.from(JSON.stringify({
      ...newUsage,
      lastUpdated: new Date().toISOString(),
    }, null, 2)).toString('base64');

    const body = { message: 'Update R2 usage', content, branch: BRANCH };
    if (sha) body.sha = sha;

    const putResponse = await fetch(
      `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${R2_USAGE_FILE_PATH}`,
      { method: 'PUT', headers: getHeaders(), body: JSON.stringify(body) }
    );

    if (putResponse.ok) return;
    if (putResponse.status === 409 && attempt < maxRetries - 1) {
      console.log(`R2 usage SHA mismatch, retrying (${attempt + 1}/${maxRetries})`);
      continue;
    }
    throw new Error(`R2 usage save failed: ${putResponse.status}`);
  }
  throw new Error('R2 usage save: max retries exceeded');
}

function checkR2Limits(usage, additionalStorageBytes = 0) {
  const storageGB = (usage.storageBytes + additionalStorageBytes) / (1024 * 1024 * 1024);
  const classAPercent = (usage.classAOperations / R2_LIMITS.CLASS_A_OPERATIONS) * 100;
  const classBPercent = (usage.classBOperations / R2_LIMITS.CLASS_B_OPERATIONS) * 100;

  return {
    canUpload: storageGB < R2_LIMITS.STORAGE_GB && usage.classAOperations < R2_LIMITS.CLASS_A_OPERATIONS,
    storageGB,
    storageLimitGB: R2_LIMITS.STORAGE_GB,
    classAOperations: usage.classAOperations,
    classALimit: R2_LIMITS.CLASS_A_OPERATIONS,
    classBOperations: usage.classBOperations,
    classBLimit: R2_LIMITS.CLASS_B_OPERATIONS,
    classAPercent,
    classBPercent,
  };
}

// Fetch photos from GitHub (with ETag caching — 304 responses don't count against rate limit)
app.get('/api/photos', async (req, res) => {
  try {
    const ghHeaders = getHeaders();
    // ponytail: forward client's If-None-Match to GitHub for ETag caching
    if (req.headers['if-none-match']) {
      ghHeaders['If-None-Match'] = req.headers['if-none-match'];
    }

    const response = await fetch(
      `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${PHOTOS_FILE_PATH}?ref=${BRANCH}`,
      { headers: ghHeaders }
    );

    if (response.status === 304) {
      return res.status(304).end();
    }

    if (response.status === 404) {
      return res.json({ photos: [] });
    }

    if (!response.ok) {
      throw new Error(`Failed to fetch photos: ${response.statusText}`);
    }

    const fileData = await response.json();
    // ponytail: forward ETag to client for future conditional requests
    if (response.headers.get('etag')) {
      res.setHeader('ETag', response.headers.get('etag'));
    }
    const content = Buffer.from(fileData.content, 'base64').toString('utf-8');
    const data = JSON.parse(content);
    res.json(data);
  } catch (error) {
    console.error('Error fetching photos:', error);
    res.status(500).json({ error: 'Failed to fetch photos' });
  }
});

// Upload photo to R2 (multipart/form-data — streams file to disk, no base64, no 200MB limit)
app.post('/api/photos', upload.single('file'), async (req, res) => {
  const tmpFile = req.file;
  let r2Uploaded = false;
  let r2Key = null;
  try {
    if (!tmpFile) {
      return res.status(400).json({ error: 'No file provided' });
    }

    const { caption, guestName, metadata: metadataStr } = req.body;
    const filename = tmpFile.originalname;
    const fileSize = tmpFile.size;
    const contentType = tmpFile.mimetype || 'application/octet-stream';
    let metadata = {};
    try { metadata = metadataStr ? JSON.parse(metadataStr) : {}; } catch { metadata = {}; }

    console.log('Upload request:', { filename, fileSize, contentType, metadata });

    // Check R2 limits
    const usage = await getR2Usage();
    const limits = checkR2Limits(usage, fileSize);

    if (!limits.canUpload) {
      return res.status(429).json({
        error: 'R2 limits exceeded',
        details: limits
      });
    }

    // Generate unique key for R2
    const key = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}-${filename}`;
    r2Key = key;

    // Upload to R2 — stream from disk, not memory
    console.log('Uploading to R2...');
    const putCommand = new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
      Body: fs.createReadStream(tmpFile.path),
      ContentType: contentType,
      ContentLength: fileSize,
    });

    await s3Client.send(putCommand);
    r2Uploaded = true;
    console.log('Uploaded to R2 successfully');

    // Generate R2 URL (public URL already includes bucket path)
    const r2Url = `${R2_PUBLIC_URL}/${key}`;

    // Fetch current photos and SHA
    let currentPhotos = [];
    let sha;
    try {
      const response = await fetch(
        `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${PHOTOS_FILE_PATH}?ref=${BRANCH}`,
        { headers: getHeaders() }
      );
      if (response.ok) {
        const fileData = await response.json();
        sha = fileData.sha;
        const content = Buffer.from(fileData.content, 'base64').toString('utf-8');
        const data = JSON.parse(content);
        currentPhotos = data.photos || [];
        console.log('Fetched current photos:', currentPhotos.length, 'SHA:', sha);
      } else if (response.status === 404) {
        console.log('File does not exist yet, creating new file');
      } else {
        console.error('GitHub API error:', response.status, response.statusText);
        throw new Error(`GitHub API returned ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Error fetching current photos:', error.message);
      if (!error.message.includes('404')) {
        throw error;
      }
    }

    // Create new photo with R2 URL and metadata
    const newPhoto = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      filename,
      caption: caption || '',
      guestName: guestName || 'Anonymous',
      uploadedAt: new Date().toISOString(),
      dateTaken: metadata?.dateTaken || new Date().toISOString(),
      r2Url,
      r2Key: key,
      fileSize,
      metadata: metadata || {},
    };

    // Add to beginning of array
    const updatedPhotos = [newPhoto, ...currentPhotos];

    // Save metadata to GitHub
    const data = {
      photos: updatedPhotos,
      lastUpdated: new Date().toISOString(),
    };

    let content = Buffer.from(JSON.stringify(data, null, 2)).toString('base64');
    console.log('Content size:', content.length, 'bytes');

    // Retry logic for SHA mismatch (409 error)
    const maxRetries = 3;
    let uploadSuccess = false;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      const body = {
        message: 'Upload wedding photo',
        content,
        branch: BRANCH,
      };

      if (sha) {
        body.sha = sha;
      }

      console.log('Sending to GitHub API...');
      const putResponse = await fetch(
        `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${PHOTOS_FILE_PATH}`,
        {
          method: 'PUT',
          headers: getHeaders(),
          body: JSON.stringify(body),
        }
      );

      console.log('GitHub API response status:', putResponse.status);

      if (putResponse.ok) {
        uploadSuccess = true;
        break;
      }

      const error = await putResponse.json();
      console.error(`GitHub API error (attempt ${attempt + 1}):`, error);

      // If 409 error (SHA mismatch), refetch current SHA and retry
      if (putResponse.status === 409 && attempt < maxRetries - 1) {
        console.log('SHA mismatch, refetching current photos...');
        await new Promise(resolve => setTimeout(resolve, 500)); // Wait before retry

        const refetchResponse = await fetch(
          `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${PHOTOS_FILE_PATH}?ref=${BRANCH}`,
          { headers: getHeaders() }
        );

        if (refetchResponse.ok) {
          const refetchData = await refetchResponse.json();
          sha = refetchData.sha;
          const refetchContent = Buffer.from(refetchData.content, 'base64').toString('utf-8');
          const refetchDataParsed = JSON.parse(refetchContent);
          currentPhotos = refetchDataParsed.photos || [];
          // Rebuild updated photos with current state
          const updatedPhotosRetry = [newPhoto, ...currentPhotos];
          const dataRetry = {
            photos: updatedPhotosRetry,
            lastUpdated: new Date().toISOString(),
          };
          // Update content for retry
          const contentRetry = Buffer.from(JSON.stringify(dataRetry, null, 2)).toString('base64');
          content = contentRetry;
          continue;
        }
      }

      // If not 409 or last attempt, throw error
      throw new Error(error.message || 'Failed to save photo metadata');
    }

    if (!uploadSuccess) {
      throw new Error('Failed to upload photo after retries');
    }

    // Update R2 usage (with SHA retry to handle concurrent uploads)
    await updateR2UsageWithRetry(u => {
      u.storageBytes += fileSize;
      u.classAOperations += 1;
      return u;
    });
    console.log('Updated R2 usage for upload:', { fileSize, key });

    // Rebuild zip cache in background (fire-and-forget, no await)
    rebuildZipCache().catch(err => console.error('Zip rebuild failed:', err.message));

    res.json(newPhoto);
  } catch (error) {
    // ponytail: if R2 upload succeeded but metadata save failed, clean up orphaned R2 object
    if (r2Uploaded && r2Key) {
      console.error('Metadata save failed, cleaning up orphaned R2 object:', r2Key);
      try {
        await s3Client.send(new DeleteObjectCommand({ Bucket: R2_BUCKET_NAME, Key: r2Key }));
        console.log('Cleaned up orphaned R2 object:', r2Key);
      } catch (cleanupErr) {
        console.error('Failed to cleanup R2 object:', cleanupErr.message);
      }
    }
    console.error('Error uploading photo:', error);
    res.status(500).json({ error: 'Failed to upload photo', details: error.message });
  } finally {
    // Always clean up multer temp file
    if (tmpFile) {
      fs.unlink(tmpFile.path, () => {});
    }
  }
});

// Delete photo from R2 and GitHub
app.delete('/api/photos/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Delete from R2 first (outside retry — R2 doesn't have concurrency issues)
    let r2Deleted = false;
    let photoToDelete = null;

    const result = await updatePhotosWithRetry((data) => {
      photoToDelete = data.photos.find(p => p.id === id);
      if (!photoToDelete) throw new Error('NOT_FOUND');

      data.photos = data.photos.filter(p => p.id !== id);
      return { result: { success: true }, message: 'Delete wedding photo' };
    });

    // R2 delete after metadata is committed
    if (photoToDelete?.r2Key) {
      const deleteCommand = new DeleteObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: photoToDelete.r2Key,
      });
      await s3Client.send(deleteCommand);
      console.log('Deleted from R2:', photoToDelete.r2Key);

      await updateR2UsageWithRetry(u => {
        u.storageBytes = Math.max(0, u.storageBytes - (photoToDelete.fileSize || 0));
        return u;
      });
    }

    res.json(result);

    // Rebuild zip cache in background (fire-and-forget)
    rebuildZipCache().catch(err => console.error('Zip rebuild after delete failed:', err.message));
  } catch (error) {
    if (error.message === 'NOT_FOUND') return res.status(404).json({ error: 'Photo not found' });
    console.error('Error deleting photo:', error);
    res.status(500).json({ error: 'Failed to delete photo' });
  }
});

// Like/unlike photo
app.post('/api/photos/:id/like', async (req, res) => {
  try {
    const { id } = req.params;
    const { guestName } = req.body;

    const result = await updatePhotosWithRetry((data) => {
      const photoIndex = data.photos.findIndex(p => p.id === id);
      if (photoIndex === -1) throw new Error('NOT_FOUND');

      const photo = data.photos[photoIndex];
      if (!photo.likedBy) photo.likedBy = [];
      if (!photo.likes) photo.likes = 0;

      const likeIndex = photo.likedBy.indexOf(guestName);
      if (likeIndex === -1) {
        photo.likedBy.push(guestName);
      } else {
        photo.likedBy.splice(likeIndex, 1);
      }
      photo.likes = photo.likedBy.length;
      data.photos[photoIndex] = photo;

      return { result: { likes: photo.likes, likedBy: photo.likedBy }, message: 'Update photo likes' };
    });

    res.json(result);
  } catch (error) {
    if (error.message === 'NOT_FOUND') return res.status(404).json({ error: 'Photo not found' });
    console.error('Error updating likes:', error);
    res.status(500).json({ error: 'Failed to update likes' });
  }
});

// Add comment to photo
app.post('/api/photos/:id/comments', async (req, res) => {
  try {
    const { id } = req.params;
    const { text, author } = req.body;

    const newComment = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      text,
      author: author || 'Anonymous',
      timestamp: new Date().toISOString(),
    };

    const result = await updatePhotosWithRetry((data) => {
      const photoIndex = data.photos.findIndex(p => p.id === id);
      if (photoIndex === -1) throw new Error('NOT_FOUND');

      const photo = data.photos[photoIndex];
      if (!photo.comments) photo.comments = [];
      photo.comments.push(newComment);
      data.photos[photoIndex] = photo;

      return { result: newComment, message: 'Add photo comment' };
    });

    res.json(result);
  } catch (error) {
    if (error.message === 'NOT_FOUND') return res.status(404).json({ error: 'Photo not found' });
    console.error('Error adding comment:', error);
    res.status(500).json({ error: 'Failed to add comment' });
  }
});

// ponytail: Pre-build zip cache on R2 — eliminates Render request timeout
// Streams zip to disk (not memory), then uploads to R2 as wedding-photos.zip
// Called on startup and after each upload/delete (fire-and-forget)
let zipBuilding = false;
let zipPending = false;
let zipReady = false; // true once at least one successful build completes

// ponytail: if a rebuild is requested while one is in progress, mark pending
// and run again after the current one finishes — so burst uploads aren't missed
async function rebuildZipCache() {
  if (zipBuilding) {
    zipPending = true;
    return;
  }
  zipBuilding = true;
  const tmpPath = path.join(os.tmpdir(), `wedding-photos-${Date.now()}.zip`);
  try {
    console.log('Rebuilding zip cache...');
    const response = await fetch(
      `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${PHOTOS_FILE_PATH}?ref=${BRANCH}`,
      { headers: getHeaders() }
    );
    if (!response.ok) throw new Error('Failed to fetch photos for zip');
    const fileData = await response.json();
    const content = Buffer.from(fileData.content, 'base64').toString('utf-8');
    const data = JSON.parse(content);
    const photos = (data.photos || []).filter(p => p.r2Key);

    const output = fs.createWriteStream(tmpPath);
    const archive = archiver('zip', { zlib: { level: 0 } });
    archive.pipe(output);

    // Fetch photos with bounded concurrency to keep memory flat
    const concurrency = 5;
    for (let i = 0; i < photos.length; i += concurrency) {
      const batch = photos.slice(i, i + concurrency);
      await Promise.all(batch.map(async (photo, j) => {
        try {
          const r2res = await fetch(photo.r2Url);
          if (!r2res.ok) throw new Error(`R2 fetch ${r2res.status}`);
          const idx = i + j;
          const baseName = photo.filename || photo.r2Key.split('/').pop() || `${photo.id}.bin`;
          const name = `${String(idx + 1).padStart(3, '0')}-${baseName}`;
          archive.append(r2res.body, { name, size: photo.fileSize });
        } catch (err) {
          console.error('Skip photo in zip:', photo.r2Key, err.message);
        }
      }));
    }
    await archive.finalize();
    await new Promise(resolve => output.on('close', resolve));

    const stat = fs.statSync(tmpPath);
    console.log(`Zip built: ${stat.size} bytes, uploading to R2...`);

    await s3Client.send(new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: ZIP_CACHE_KEY,
      Body: fs.createReadStream(tmpPath),
      ContentLength: stat.size,
      ContentType: 'application/zip',
    }));
    console.log('Zip cache uploaded to R2');
    zipReady = true;
  } catch (error) {
    console.error('Error rebuilding zip cache:', error.message);
  } finally {
    zipBuilding = false;
    fs.unlink(tmpPath, () => {});
    // ponytail: if uploads/deletes happened during this rebuild, run again
    if (zipPending) {
      zipPending = false;
      rebuildZipCache().catch(err => console.error('Pending zip rebuild failed:', err.message));
    }
  }
}

// Download all photos as zip — redirects to pre-built cache on R2 (instant, no timeout)
// If zip isn't built yet (cold start), return 503 so frontend can show "preparing" message
// While rebuilding, serve the stale cache (still has all previous photos)
app.get('/api/photos/zip', (req, res) => {
  if (!zipReady) {
    return res.status(503).json({ error: 'Zip is being prepared, please try again in a moment', retry: true });
  }
  res.redirect(302, `${R2_PUBLIC_URL}/${ZIP_CACHE_KEY}`);
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  // Build initial zip cache on startup (fire-and-forget)
  rebuildZipCache().catch(err => console.error('Initial zip rebuild failed:', err.message));
});
