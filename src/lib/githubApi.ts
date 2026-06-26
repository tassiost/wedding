import type { Photo, GitHubConfig } from '@/types';

const PHOTOS_FILE_PATH = 'data/photos.json';

interface PhotosData {
  photos: Photo[];
  lastUpdated: string;
}

function getHeaders(config: GitHubConfig) {
  return {
    'Authorization': `token ${config.token}`,
    'Accept': 'application/vnd.github.v3+json',
    'Content-Type': 'application/json',
  };
}

export async function fetchPhotos(config: GitHubConfig): Promise<Photo[]> {
  try {
    const response = await fetch(
      `https://api.github.com/repos/${config.repoOwner}/${config.repoName}/contents/${PHOTOS_FILE_PATH}?ref=${config.branch}`,
      { headers: getHeaders(config) }
    );

    if (response.status === 404) {
      return [];
    }

    if (!response.ok) {
      throw new Error(`Failed to fetch photos: ${response.statusText}`);
    }

    const fileData = await response.json();
    const content = atob(fileData.content.replace(/\n/g, ''));
    const data: PhotosData = JSON.parse(content);
    return data.photos || [];
  } catch (error) {
    console.error('Error fetching photos:', error);
    return [];
  }
}

export async function savePhotos(config: GitHubConfig, photos: Photo[]): Promise<void> {
  const data: PhotosData = {
    photos,
    lastUpdated: new Date().toISOString(),
  };

  const content = btoa(JSON.stringify(data, null, 2));

  // First, get the current file to obtain the SHA (if it exists)
  let sha: string | undefined;
  try {
    const response = await fetch(
      `https://api.github.com/repos/${config.repoOwner}/${config.repoName}/contents/${PHOTOS_FILE_PATH}?ref=${config.branch}`,
      { headers: getHeaders(config) }
    );
    if (response.ok) {
      const fileData = await response.json();
      sha = fileData.sha;
    }
  } catch {
    // File doesn't exist yet, that's fine
  }

  const body: Record<string, string> = {
    message: 'Update wedding photos',
    content,
    branch: config.branch,
  };

  if (sha) {
    body.sha = sha;
  }

  const response = await fetch(
    `https://api.github.com/repos/${config.repoOwner}/${config.repoName}/contents/${PHOTOS_FILE_PATH}`,
    {
      method: 'PUT',
      headers: getHeaders(config),
      body: JSON.stringify(body),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to save photos');
  }
}

export async function uploadPhoto(
  config: GitHubConfig,
  file: File,
  caption: string,
  guestName: string
): Promise<Photo> {
  // Convert file to base64 data URL
  const dataUrl = await fileToDataUrl(file);

  const photo: Photo = {
    id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    filename: file.name,
    caption: caption || '',
    guestName: guestName || 'Anonymous',
    uploadedAt: new Date().toISOString(),
    dataUrl,
    fileSize: file.size,
  };

  // Fetch current photos, append new one, and save
  const photos = await fetchPhotos(config);
  photos.unshift(photo);
  await savePhotos(config, photos);

  return photo;
}

export async function deletePhoto(config: GitHubConfig, photoId: string): Promise<void> {
  const photos = await fetchPhotos(config);
  const filtered = photos.filter(p => p.id !== photoId);
  await savePhotos(config, filtered);
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export async function verifyToken(config: GitHubConfig): Promise<boolean> {
  try {
    const response = await fetch('https://api.github.com/user', {
      headers: getHeaders(config),
    });
    return response.ok;
  } catch {
    return false;
  }
}
