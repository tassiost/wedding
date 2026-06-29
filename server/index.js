const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '99mb' }));

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

    console.log('Upload request:', { filename, fileSize, dataUrlLength: dataUrl?.length });

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
        console.log('Fetched current photos:', currentPhotos.length);
      } else {
        console.log('GitHub API response status:', response.status, response.statusText);
      }
    } catch (error) {
      console.log('Error fetching current photos:', error.message);
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
    console.log('Content size:', content.length, 'bytes');

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
        console.log('Current file SHA:', sha);
      }
    } catch (error) {
      console.log('Error getting SHA:', error.message);
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
      throw new Error(error.message || 'Failed to save photo');
    }

    res.json(newPhoto);
  } catch (error) {
    console.error('Error uploading photo:', error);
    res.status(500).json({ error: 'Failed to upload photo', details: error.message });
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
