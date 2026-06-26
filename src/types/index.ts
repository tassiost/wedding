export interface Photo {
  id: string;
  filename: string;
  caption: string;
  guestName: string;
  uploadedAt: string;
  dataUrl: string;
  fileSize: number;
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
