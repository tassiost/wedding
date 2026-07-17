const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const archiver = require('archiver');
const { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '99mb' }));

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const REPO_OWNER = process.env.REPO_OWNER || 'tassiost';
const REPO_NAME = process.env.REPO_NAME || 'wedding';
const BRANCH = process.env.BRANCH || 'main';
const PHOTOS_FILE_PATH = 'data/photos.json';
const R2_USAGE_FILE_PATH = 'data/r2-usage.json';

// R2 Configuration
const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID || 'cddd528ef49c820d4fd4a106f2d67e00';
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID || 'f16e1b0f3480c4e919b6d97475a689eb';
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY || '6fc3303918de7e8d4c4063f4f3527805bfdf0098aeef85d7647cb13e24a3fd1f';
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || 'wedding';
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL || 'https://pub-bb9444735bc44da9934152376e2dc0de.r2.dev';

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

async function updateR2Usage(usage) {
  const data = {
    ...usage,
    lastUpdated: new Date().toISOString()
  };
  const content = Buffer.from(JSON.stringify(data, null, 2)).toString('base64');

  // Get current SHA
  let sha;
  try {
    const response = await fetch(
      `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${R2_USAGE_FILE_PATH}?ref=${BRANCH}`,
      { headers: getHeaders() }
    );
    if (response.ok) {
      const fileData = await response.json();
      sha = fileData.sha;
    }
  } catch (error) {
    // File doesn't exist yet
  }

  const body = {
    message: 'Update R2 usage',
    content,
    branch: BRANCH,
  };
  if (sha) body.sha = sha;

  await fetch(
    `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${R2_USAGE_FILE_PATH}`,
    {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(body),
    }
  );
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

// Fetch photos from GitHub
app.get('/api/photos', async (req, res) => {
  try {
    const response = await fetch(
      `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${PHOTOS_FILE_PATH}?ref=${BRANCH}`,
      { headers: getHeaders() }
    );

    if (response.status === 404) {
      return res.json({ photos: [] });
    }

    if (!response.ok) {
      throw new Error(`Failed to fetch photos: ${response.statusText}`);
    }

    const fileData = await response.json();
    const content = Buffer.from(fileData.content, 'base64').toString('utf-8');
    const data = JSON.parse(content);
    res.json(data);
  } catch (error) {
    console.error('Error fetching photos:', error);
    res.status(500).json({ error: 'Failed to fetch photos' });
  }
});

// Upload photo to R2
app.post('/api/photos', async (req, res) => {
  try {
    const { filename, caption, guestName, dataUrl, fileSize, metadata } = req.body;

    console.log('Upload request:', { filename, fileSize, dataUrlLength: dataUrl?.length, metadata });

    // Check R2 limits
    const usage = await getR2Usage();
    const limits = checkR2Limits(usage, fileSize);

    if (!limits.canUpload) {
      return res.status(429).json({
        error: 'R2 limits exceeded',
        details: limits
      });
    }

    // Detect content type from dataUrl or metadata
    let contentType = 'image/jpeg';
    if (dataUrl.startsWith('data:video/')) {
      contentType = dataUrl.match(/^data:(video\/\w+);/)?.[1] || 'video/mp4';
    } else if (dataUrl.startsWith('data:image/')) {
      contentType = dataUrl.match(/^data:(image\/\w+);/)?.[1] || 'image/jpeg';
    }

    // Convert base64 to buffer
    const base64Data = dataUrl.replace(/^data:.*?;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');

    // Generate unique key for R2
    const key = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}-${filename}`;

    // Upload to R2
    console.log('Uploading to R2...');
    const putCommand = new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    });

    await s3Client.send(putCommand);
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

    // Update R2 usage
    usage.storageBytes += fileSize;
    usage.classAOperations += 1;
    await updateR2Usage(usage);
    console.log('Updated R2 usage:', usage);

    res.json(newPhoto);
  } catch (error) {
    console.error('Error uploading photo:', error);
    res.status(500).json({ error: 'Failed to upload photo', details: error.message });
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

      const usage = await getR2Usage();
      usage.storageBytes = Math.max(0, usage.storageBytes - (photoToDelete.fileSize || 0));
      await updateR2Usage(usage);
    }

    res.json(result);
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

// Download all photos as zip
app.get('/api/photos/zip', async (req, res) => {
  try {
    const response = await fetch(
      `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${PHOTOS_FILE_PATH}?ref=${BRANCH}`,
      { headers: getHeaders() }
    );
    if (!response.ok) {
      throw new Error('Failed to fetch photos');
    }
    const fileData = await response.json();
    const content = Buffer.from(fileData.content, 'base64').toString('utf-8');
    const data = JSON.parse(content);
    const photos = (data.photos || []).filter(p => p.r2Key);

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', 'attachment; filename="wedding-photos.zip"');

    const archive = archiver('zip', { zlib: { level: 5 } });
    archive.on('error', err => {
      console.error('Archive error:', err);
      if (!res.headersSent) res.status(500).json({ error: 'Zip failed' });
      archive.abort();
    });
    archive.pipe(res);

    // ponytail: fetch via public R2 URL with node-fetch instead of S3 GetObject
    // ponytail: S3 SDK hangs from Render Frankfurt; node-fetch already works for GitHub API
    // ponytail: index prefix avoids duplicate-filename collisions (guests upload same IMG_xxxx)
    for (let i = 0; i < photos.length; i++) {
      const photo = photos[i];
      try {
        const r2res = await fetch(photo.r2Url);
        if (!r2res.ok) throw new Error(`R2 fetch ${r2res.status}`);
        const baseName = photo.filename || photo.r2Key.split('/').pop() || `${photo.id}.bin`;
        const name = `${String(i + 1).padStart(3, '0')}-${baseName}`;
        archive.append(r2res.body, { name });
      } catch (err) {
        console.error('Skip photo in zip:', photo.r2Key, err.message);
      }
    }
    await archive.finalize();
  } catch (error) {
    console.error('Error building zip:', error);
    if (!res.headersSent) res.status(500).json({ error: 'Failed to build zip' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
