# Wedding Photo App

A wedding photo sharing app for Victoria & Vincent's wedding. Guests upload photos and videos, browse a live gallery, like and comment, and download everything as a zip.

**Live URLs:**
- **Cloudflare Pages:** https://vivi-wedding.pages.dev (primary)
- **GitHub Pages:** https://tassiost.github.io/wedding (backup)
- **Render:** https://wedding-backend-6g10.onrender.com (legacy, static only)

**Cost: $0/month** — all on free tiers.

## Features

- **Photo & Video Upload**: Drag-and-drop or file picker, with captions and guest names
- **Cloudflare R2 Storage**: 10GB free, automatic usage tracking
- **Real-time Gallery**: Grid, masonry, and timeline layouts
- **Social Features**: Like photos, add comments
- **Slideshow**: Auto-advancing on home page with fullscreen mode
- **Download All**: Streams a zip directly to the browser via Service Worker (zero RAM, fresh content)
- **Single Download**: Individual photo/video download via Worker CORS proxy
- **QR Code**: Share wedding URL via QR code on the home page
- **Mobile Responsive**: Optimized for phones (primary device for wedding guests)
- **Retry Logic**: Automatic retry for failed uploads

## Architecture

```
Guest browser
    |
    |-- Static HTML/JS/CSS -----> Cloudflare Pages (or GitHub Pages / Render)
    |                              ~160KB gzipped, browser-cached
    |
    |-- GET /api/photos ---------> Cloudflare Worker ---> R2 binding (internal, free)
    |-- POST /api/photos --------> Cloudflare Worker ---> R2 binding (internal, free)
    |-- POST /like --------------> Cloudflare Worker ---> R2 binding (internal, free)
    |-- POST /comments ----------> Cloudflare Worker ---> R2 binding (internal, free)
    |-- Download All ------------> Service Worker ---> Worker ---> R2 (streaming zip)
    |-- Single download ---------> Worker ---> R2 binding (CORS proxy)
    `-- <img src={r2Url}> -------> R2 public URL directly (no CORS needed)
```

### Frontend
- React 19 + TypeScript
- Vite for build tooling
- TailwindCSS + shadcn/ui components
- React Router (HashRouter) for navigation
- Lucide React for icons
- Service Worker for streaming zip downloads

### Backend (Cloudflare Worker)
- All API endpoints in a single Worker (`worker/src/index.js`)
- R2 binding for storage (internal Cloudflare traffic = free)
- photos.json stored in R2 (`_metadata/photos.json`) — no GitHub API calls
- ETag support for conditional requests (304 Not Modified)
- R2 CORS proxy for individual photo downloads

### Storage
- **Photos & Videos**: Cloudflare R2 (`wedding` bucket)
- **Metadata**: R2 (`_metadata/photos.json`, `_metadata/r2-usage.json`)
- **No GitHub API calls** at runtime — GitHub is only for code hosting

### Legacy Backend
The `server/` directory contains the original Express.js backend. It is no longer used — all API calls go to the Cloudflare Worker. It's kept for reference only.

## Setup

### Prerequisites
- Node.js 18+
- Cloudflare account with R2 enabled

### Environment Variables

#### Frontend (`.env`)
```
VITE_API_URL=https://wedding-r2-proxy.tassio-wedding.workers.dev
VITE_R2_PROXY_URL=https://wedding-r2-proxy.tassio-wedding.workers.dev
```

#### Worker (`worker/wrangler.toml`)
```toml
name = "wedding-r2-proxy"
main = "src/index.js"
compatibility_date = "2024-01-01"

[[r2_buckets]]
binding = "BUCKET"
bucket_name = "wedding"

[vars]
R2_PUBLIC_URL = "https://pub-xxxxx.r2.dev"
```

### Installation

```bash
# Install frontend dependencies
npm install

# Build frontend
npm run build

# Start development server
npm run dev
```

## Deployment

### Frontend — Cloudflare Pages (primary)
```bash
npm run build
npx wrangler pages deploy docs --project-name vivi-wedding --branch main
```
Live at: https://vivi-wedding.pages.dev

### Frontend — GitHub Pages (backup)
1. Build: `npm run build`
2. Push to GitHub (main branch)
3. GitHub Pages serves from `docs/` folder
4. Live at: https://tassiost.github.io/wedding

### Frontend — Render (legacy)
1. Connect GitHub repository to Render as a static site
2. Build command: `npm run build`
3. Publish directory: `docs/`
4. Live at: https://wedding-backend-6g10.onrender.com

### Worker
```bash
cd worker
npx wrangler deploy
```
Live at: https://wedding-r2-proxy.tassio-wedding.workers.dev

See `worker/DEPLOY.md` for details.

## Usage

### Uploading Photos
1. Navigate to Upload page
2. Select photos/videos from device (or drag and drop)
3. Add optional caption
4. Enter guest name
5. Click upload

### Viewing Gallery
- **Grid view**: Standard photo grid
- **Masonry view**: Pinterest-style layout
- **Timeline view**: Organized by date taken

### Social Features
- **Like**: Click heart icon on any photo
- **Comment**: Click message icon to add comments
- **Download Single**: Click download icon in lightbox
- **Download All**: Click "Download All" button — streams a zip via Service Worker

## Cost Breakdown

| Service | What it does | Free tier | Used | Cost |
|---|---|---|---|---|
| Cloudflare Worker | All API calls | 100K req/day | ~6.3K/day (6.3%) | $0 |
| Cloudflare R2 | Photo storage + metadata | 10GB | 0.83GB (8.3%) | $0 |
| Cloudflare Pages | Frontend hosting | Unlimited bandwidth | ~160KB/guest | $0 |
| GitHub | Code hosting | Unlimited public repos | — | $0 |
| Render (optional) | Legacy frontend hosting | 100GB bandwidth | ~16MB | $0 |

**Total: $0/month**

## Troubleshooting

### Photos not displaying
- Check `R2_PUBLIC_URL` in `worker/wrangler.toml`
- Verify R2 public access is enabled
- Check browser console for errors

### Upload failures
- Check Worker is deployed: `curl https://wedding-r2-proxy.tassio-wedding.workers.dev/health`
- Verify R2 bucket binding exists
- Check if R2 storage limit (10GB) is exceeded
- Max upload size: 100MB (Worker free tier limit)

### Download All not working
- Check Service Worker registered: browser DevTools → Application → Service Workers
- Try hard refresh (Ctrl+Shift+R) to update the Service Worker
- Fallback: uses pre-built zip on R2 via 302 redirect (may be stale)

### Mobile layout issues
- App has padding-top to prevent content being cut off by sticky nav
- Tested on mobile Safari and Chrome

## R2 Usage Tracking

The Worker tracks R2 usage in `_metadata/r2-usage.json`:
- Storage bytes
- Class A operations (PUT, DELETE)
- Class B operations (GET)

## License

MIT
