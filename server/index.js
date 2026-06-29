const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
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
    const { filename, caption, guestName, dataUrl, fileSize } = req.body;

    console.log('Upload request:', { filename, fileSize, dataUrlLength: dataUrl?.length });

    // Check R2 limits
    const usage = await getR2Usage();
    const limits = checkR2Limits(usage, fileSize);

    if (!limits.canUpload) {
      return res.status(429).json({
        error: 'R2 limits exceeded',
        details: limits
      });
    }

    // Convert base64 to buffer
    const base64Data = dataUrl.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');

    // Generate unique key for R2
    const key = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}-${filename}`;

    // Upload to R2
    console.log('Uploading to R2...');
    const putCommand = new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
      Body: buffer,
      ContentType: 'image/jpeg',
    });

    await s3Client.send(putCommand);
    console.log('Uploaded to R2 successfully');

    // Generate R2 URL
    const r2Url = `https://pub-${R2_ACCOUNT_ID}.r2.dev/${R2_BUCKET_NAME}/${key}`;

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

    // Create new photo with R2 URL
    const newPhoto = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      filename,
      caption: caption || '',
      guestName: guestName || 'Anonymous',
      uploadedAt: new Date().toISOString(),
      r2Url,
      r2Key: key,
      fileSize,
    };

    // Add to beginning of array
    const updatedPhotos = [newPhoto, ...currentPhotos];

    // Save metadata to GitHub
    const data = {
      photos: updatedPhotos,
      lastUpdated: new Date().toISOString(),
    };

    const content = Buffer.from(JSON.stringify(data, null, 2)).toString('base64');
    console.log('Content size:', content.length, 'bytes');

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

    if (!putResponse.ok) {
      const error = await putResponse.json();
      console.error('GitHub API error:', error);
      throw new Error(error.message || 'Failed to save photo metadata');
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

    // Fetch current photos
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
    const photoToDelete = data.photos.find(p => p.id === id);

    if (!photoToDelete) {
      return res.status(404).json({ error: 'Photo not found' });
    }

    // Delete from R2 if it has an R2 key
    if (photoToDelete.r2Key) {
      const deleteCommand = new DeleteObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: photoToDelete.r2Key,
      });
      await s3Client.send(deleteCommand);
      console.log('Deleted from R2:', photoToDelete.r2Key);

      // Update R2 usage
      const usage = await getR2Usage();
      usage.storageBytes -= photoToDelete.fileSize || 0;
      await updateR2Usage(usage);
    }

    const filteredPhotos = data.photos.filter(p => p.id !== id);

    // Save updated photos
    const updatedData = {
      photos: filteredPhotos,
      lastUpdated: new Date().toISOString(),
    };

    const newContent = Buffer.from(JSON.stringify(updatedData, null, 2)).toString('base64');

    const body = {
      message: 'Delete wedding photo',
      content: newContent,
      branch: BRANCH,
      sha: fileData.sha,
    };

    const putResponse = await fetch(
      `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${PHOTOS_FILE_PATH}`,
      {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(body),
      }
    );

    if (!putResponse.ok) {
      throw new Error('Failed to delete photo');
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting photo:', error);
    res.status(500).json({ error: 'Failed to delete photo' });
  }
});

// Like/unlike photo
app.post('/api/photos/:id/like', async (req, res) => {
  try {
    const { id } = req.params;
    const { guestName } = req.body;

    // Fetch current photos
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

    // Find and update photo
    const photoIndex = data.photos.findIndex(p => p.id === id);
    if (photoIndex === -1) {
      return res.status(404).json({ error: 'Photo not found' });
    }

    const photo = data.photos[photoIndex];
    if (!photo.likedBy) photo.likedBy = [];
    if (!photo.likes) photo.likes = 0;

    const likeIndex = photo.likedBy.indexOf(guestName);
    if (likeIndex === -1) {
      // Add like
      photo.likedBy.push(guestName);
      photo.likes = photo.likedBy.length;
    } else {
      // Remove like
      photo.likedBy.splice(likeIndex, 1);
      photo.likes = photo.likedBy.length;
    }

    data.photos[photoIndex] = photo;

    // Save updated photos
    const updatedData = {
      photos: data.photos,
      lastUpdated: new Date().toISOString(),
    };

    const newContent = Buffer.from(JSON.stringify(updatedData, null, 2)).toString('base64');

    const body = {
      message: 'Update photo likes',
      content: newContent,
      branch: BRANCH,
      sha: fileData.sha,
    };

    const putResponse = await fetch(
      `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${PHOTOS_FILE_PATH}`,
      {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(body),
      }
    );

    if (!putResponse.ok) {
      throw new Error('Failed to update likes');
    }

    res.json({ likes: photo.likes, likedBy: photo.likedBy });
  } catch (error) {
    console.error('Error updating likes:', error);
    res.status(500).json({ error: 'Failed to update likes' });
  }
});

// Add comment to photo
app.post('/api/photos/:id/comments', async (req, res) => {
  try {
    const { id } = req.params;
    const { text, author } = req.body;

    // Fetch current photos
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

    // Find and update photo
    const photoIndex = data.photos.findIndex(p => p.id === id);
    if (photoIndex === -1) {
      return res.status(404).json({ error: 'Photo not found' });
    }

    const photo = data.photos[photoIndex];
    if (!photo.comments) photo.comments = [];

    const newComment = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      text,
      author: author || 'Anonymous',
      timestamp: new Date().toISOString(),
    };

    photo.comments.push(newComment);
    data.photos[photoIndex] = photo;

    // Save updated photos
    const updatedData = {
      photos: data.photos,
      lastUpdated: new Date().toISOString(),
    };

    const newContent = Buffer.from(JSON.stringify(updatedData, null, 2)).toString('base64');

    const body = {
      message: 'Add photo comment',
      content: newContent,
      branch: BRANCH,
      sha: fileData.sha,
    };

    const putResponse = await fetch(
      `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${PHOTOS_FILE_PATH}`,
      {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(body),
      }
    );

    if (!putResponse.ok) {
      throw new Error('Failed to add comment');
    }

    res.json(newComment);
  } catch (error) {
    console.error('Error adding comment:', error);
    res.status(500).json({ error: 'Failed to add comment' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
