const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const REPO_OWNER = process.env.REPO_OWNER || 'tassiost';
const REPO_NAME = process.env.REPO_NAME || 'wedding';
const BRANCH = process.env.BRANCH || 'main';
const PHOTOS_FILE_PATH = 'data/photos.json';

// Helper function to get GitHub headers
function getHeaders() {
  return {
    'Authorization': `token ${GITHUB_TOKEN}`,
    'Accept': 'application/vnd.github.v3+json',
    'Content-Type': 'application/json',
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

// Upload photo to GitHub
app.post('/api/photos', async (req, res) => {
  try {
    const { filename, caption, guestName, dataUrl, fileSize } = req.body;

    // Fetch current photos
    let currentPhotos = [];
    try {
      const response = await fetch(
        `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${PHOTOS_FILE_PATH}?ref=${BRANCH}`,
        { headers: getHeaders() }
      );
      if (response.ok) {
        const fileData = await response.json();
        const content = Buffer.from(fileData.content, 'base64').toString('utf-8');
        const data = JSON.parse(content);
        currentPhotos = data.photos || [];
      }
    } catch {
      // File doesn't exist yet
    }

    // Create new photo
    const newPhoto = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      filename,
      caption: caption || '',
      guestName: guestName || 'Anonymous',
      uploadedAt: new Date().toISOString(),
      dataUrl,
      fileSize,
    };

    // Add to beginning of array
    const updatedPhotos = [newPhoto, ...currentPhotos];

    // Save to GitHub
    const data = {
      photos: updatedPhotos,
      lastUpdated: new Date().toISOString(),
    };

    const content = Buffer.from(JSON.stringify(data, null, 2)).toString('base64');

    // Get current file SHA if it exists
    let sha;
    try {
      const response = await fetch(
        `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${PHOTOS_FILE_PATH}?ref=${BRANCH}`,
        { headers: getHeaders() }
      );
      if (response.ok) {
        const fileData = await response.json();
        sha = fileData.sha;
      }
    } catch {
      // File doesn't exist
    }

    const body = {
      message: 'Upload wedding photo',
      content,
      branch: BRANCH,
    };

    if (sha) {
      body.sha = sha;
    }

    const putResponse = await fetch(
      `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${PHOTOS_FILE_PATH}`,
      {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(body),
      }
    );

    if (!putResponse.ok) {
      const error = await putResponse.json();
      throw new Error(error.message || 'Failed to save photo');
    }

    res.json(newPhoto);
  } catch (error) {
    console.error('Error uploading photo:', error);
    res.status(500).json({ error: 'Failed to upload photo' });
  }
});

// Delete photo from GitHub
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

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
