import type { Photo, GitHubConfig } from '@/types';

const PHOTOS_FILE_PATH = 'data/photos.json';
const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://wedding-backend-6g10.onrender.com';

interface PhotosData {
  photos: Photo[];
  lastUpdated: string;
}

export async function fetchPhotos(config: GitHubConfig): Promise<Photo[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/photos`);
    if (!response.ok) {
      throw new Error(`Failed to fetch photos: ${response.statusText}`);
    }
    const data: PhotosData = await response.json();
    return data.photos || [];
  } catch (error) {
    console.error('Error fetching photos:', error);
    return [];
  }
}

export async function savePhotos(config: GitHubConfig, photos: Photo[]): Promise<void> {
  // This is now handled by the backend upload endpoint
  throw new Error('Use uploadPhoto instead');
}

export async function uploadPhoto(
  config: GitHubConfig,
  file: File,
  caption: string,
  guestName: string
): Promise<Photo> {
  // Convert file to base64 data URL
  const dataUrl = await fileToDataUrl(file);

  const maxRetries = 3;
  const baseDelay = 1000; // 1 second

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/photos`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          filename: file.name,
          caption: caption || '',
          guestName: guestName || 'Anonymous',
          dataUrl,
          fileSize: file.size,
        }),
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

export async function deletePhoto(config: GitHubConfig, photoId: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/photos/${photoId}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    throw new Error('Failed to delete photo');
  }
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
