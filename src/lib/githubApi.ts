import type { Photo, GitHubConfig } from '@/types';

const PHOTOS_FILE_PATH = 'data/photos.json';
const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://wedding-backend-6g10.onrender.com';

interface PhotosData {
  photos: Photo[];
  lastUpdated: string;
}

// ponytail: ETag cache — 304 responses from GitHub don't count against rate limit
let photosETag: string | null = null;
let cachedPhotos: Photo[] = [];

export async function fetchPhotos(config: GitHubConfig): Promise<Photo[]> {
  const headers: Record<string, string> = {};
  if (photosETag) {
    headers['If-None-Match'] = photosETag;
  }

  const response = await fetch(`${API_BASE_URL}/api/photos`, { headers });

  if (response.status === 304) {
    return cachedPhotos;
  }

  if (!response.ok) {
    throw new Error(`Failed to fetch photos: ${response.statusText}`);
  }

  const etag = response.headers.get('etag');
  if (etag) {
    photosETag = etag;
  }

  const data: PhotosData = await response.json();
  cachedPhotos = data.photos || [];
  return cachedPhotos;
}

export async function uploadPhoto(
  config: GitHubConfig,
  file: File | Blob,
  caption: string,
  guestName: string,
  metadata?: any,
  onProgress?: (progress: number) => void
): Promise<Photo> {
  const maxRetries = 3;
  const baseDelay = 1000; // 1 second

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('caption', caption || '');
      formData.append('guestName', guestName || 'Anonymous');
      formData.append('metadata', JSON.stringify(metadata || {}));

      const response = await fetch(`${API_BASE_URL}/api/photos`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to upload photo');
      }

      return response.json();
    } catch (error) {
      console.error(`Upload attempt ${attempt + 1} failed:`, error);

      if (attempt === maxRetries - 1) {
        throw error;
      }

      // Exponential backoff: 1s, 2s, 4s
      const delay = baseDelay * Math.pow(2, attempt);
      console.log(`Retrying upload in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw new Error('Failed to upload photo after retries');
}

export async function verifyToken(config: GitHubConfig): Promise<boolean> {
  // Backend handles authentication, so we just check if config exists
  return true;
}

export async function likePhoto(config: GitHubConfig, photoId: string, guestName: string): Promise<{ likes: number; likedBy: string[] }> {
  const response = await fetch(`${API_BASE_URL}/api/photos/${photoId}/like`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ guestName }),
  });

  if (!response.ok) {
    throw new Error('Failed to like photo');
  }

  return response.json();
}

export async function addComment(config: GitHubConfig, photoId: string, text: string, author: string): Promise<any> {
  const response = await fetch(`${API_BASE_URL}/api/photos/${photoId}/comments`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ text, author }),
  });

  if (!response.ok) {
    throw new Error('Failed to add comment');
  }

  return response.json();
}
