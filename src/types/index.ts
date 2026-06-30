export interface Comment {
  id: string;
  text: string;
  author: string;
  timestamp: string;
}

export interface PhotoMetadata {
  dateTaken?: string;
  camera?: string;
  lens?: string;
  location?: {
    latitude?: number;
    longitude?: number;
  };
  duration?: number; // For videos in seconds
  width?: number;
  height?: number;
}

export interface Photo {
  id: string;
  filename: string;
  caption: string;
  guestName: string;
  uploadedAt: string;
  dateTaken?: string; // When the photo/video was actually taken
  dataUrl?: string; // Legacy support for old photos
  r2Url?: string; // New R2 URL
  r2Key?: string; // R2 object key for deletion
  fileSize: number;
  likes: number;
  likedBy: string[]; // Array of guest names who liked
  comments: Comment[];
  metadata?: PhotoMetadata;
}

export interface WeddingSettings {
  coupleNames: string;
  weddingDate: string;
  venue: string;
  eventTitle: string;
  repoOwner: string;
  repoName: string;
  branch: string;
}

export interface GitHubConfig {
  token: string;
  repoOwner: string;
  repoName: string;
  branch: string;
}
