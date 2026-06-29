# Wedding Photo App

A modern wedding photo sharing application with Cloudflare R2 storage, real-time gallery, and social features.

## Features

- **Photo Upload**: Upload wedding photos with captions and guest names
- **Video Upload**: Upload wedding videos with captions and guest names
- **Cloudflare R2 Storage**: 10GB free storage with automatic usage tracking
- **Real-time Gallery**: View photos and videos in grid, masonry, or timeline layouts
- **Social Features**: Like photos and add comments
- **Slideshow**: Auto-advancing photo slideshow on home page with fullscreen mode
- **QR Code**: Share wedding URL via QR code
- **Mobile Responsive**: Optimized for mobile devices
- **Retry Logic**: Automatic retry for failed uploads with individual photo status
- **Keep-Alive**: Cron job to prevent backend cold starts
- **Upload Progress**: Real-time progress bar and status indicators

## Architecture

### Frontend
- React with TypeScript
- Vite for build tooling
- TailwindCSS for styling
- React Router for navigation
- Lucide React for icons

### Backend
- Express.js API
- Cloudflare R2 for photo storage
- GitHub API for metadata storage
- AWS S3 SDK for R2 compatibility

### Storage
- **Photos & Videos**: Cloudflare R2 (S3-compatible object storage)
- **Metadata**: GitHub (photos.json, r2-usage.json)
- **Free Tier Limits**: 10GB storage, 1M Class A operations, 10M Class B operations

## Setup

### Prerequisites
- Node.js 18+
- GitHub account with personal access token
- Cloudflare account with R2 enabled

### Environment Variables

#### Backend (Render)
```
GITHUB_TOKEN=your_github_token
REPO_OWNER=tassiost
REPO_NAME=wedding
BRANCH=main
R2_ACCOUNT_ID=your_account_id
R2_ACCESS_KEY_ID=your_access_key
R2_SECRET_ACCESS_KEY=your_secret_key
R2_BUCKET_NAME=wedding
R2_PUBLIC_URL=https://pub-xxxxx.r2.dev
```

#### Frontend
```
VITE_API_URL=https://wedding-backend-6g10.onrender.com
```

### Installation

```bash
# Install dependencies
npm install

# Build frontend
npm run build

# Start development server
npm run dev
```

### Backend Setup

```bash
cd server
npm install
node index.js
```

## Deployment

### Frontend (GitHub Pages)
1. Build the project: `npm run build`
2. Push to GitHub
3. Enable GitHub Pages in repository settings
4. Set source to `docs` folder

### Backend (Render)
1. Connect GitHub repository to Render
2. Set environment variables
3. Deploy as web service

### Keep-Alive Setup
Set up cron job at https://cron-job.org:
- URL: `https://wedding-backend-6g10.onrender.com/health`
- Schedule: Every 10 minutes

## Usage

### Uploading Photos
1. Navigate to Upload page
2. Select photos from device
3. Add optional caption
4. Enter guest name
5. Click upload

### Viewing Gallery
- Grid view: Standard photo grid
- Masonry view: Pinterest-style layout
- Timeline view: Organized by date

### Social Features
- **Like**: Click heart icon on any photo
- **Comment**: Click message icon to add comments
- **Download**: Click download icon to save photo

## Troubleshooting

### Photos not displaying
- Check R2_PUBLIC_URL environment variable
- Verify R2 public access is enabled
- Check browser console for errors

### Upload failures
- Check Render logs for errors
- Verify R2 credentials are correct
- Check if R2 limits are exceeded
- Retry logic will attempt 3 times with exponential backoff

### Backend cold starts
- Ensure cron job is set up on cron-job.org
- Check health endpoint: `https://wedding-backend-6g10.onrender.com/health`

### Mobile layout issues
- App has padding-top to prevent content being cut off by sticky nav
- Tested on mobile devices

## R2 Usage Tracking

The app automatically tracks R2 usage:
- Storage bytes
- Class A operations (PUT, DELETE)
- Class B operations (GET)

Usage is stored in `data/r2-usage.json` on GitHub.

## License

MIT
