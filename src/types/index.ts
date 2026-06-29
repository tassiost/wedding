export interface Comment {
  id: string;
  text: string;
  author: string;
  timestamp: string;
}

export interface Photo {
  id: string;
  filename: string;
  caption: string;
  guestName: string;
  uploadedAt: string;
  dataUrl?: string; // Legacy support for old photos
  r2Url?: string; // New R2 URL
  r2Key?: string; // R2 object key for deletion
  fileSize: number;
  likes: number;
  likedBy: string[]; // Array of guest names who liked
  comments: Comment[];
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
