# Deploy the Cloudflare Worker

The Worker is the entire backend — it handles all API endpoints, file uploads, and serves as a CORS proxy for R2. All traffic stays on Cloudflare's network (Worker → R2 binding = free, no egress).

## API Endpoints

| Method | Path | Description |
|---|---|---|
| GET | `/health` | Health check |
| GET | `/api/photos` | Get all photos metadata (with ETag/304 support) |
| POST | `/api/photos` | Upload a photo (multipart/form-data) |
| POST | `/api/photos/:id/like` | Like/unlike a photo |
| POST | `/api/photos/:id/comments` | Add a comment |
| GET | `/api/photos/zip` | 302 redirect to pre-built zip on R2 (fallback) |
| GET | `/:r2Key` | R2 CORS proxy for individual photo downloads |

## Prerequisites

- A Cloudflare account (you already have one for R2)
- Node.js installed
- R2 bucket named `wedding` with public access enabled

## Steps

1. Install Wrangler:
   ```bash
   npm install -g wrangler
   ```

2. Login to Cloudflare:
   ```bash
   wrangler login
   ```

3. Deploy the Worker:
   ```bash
   cd worker
   wrangler deploy
   ```
   Output:
   ```
   https://wedding-r2-proxy.<your-account>.workers.dev
   ```

4. Set the Worker URL in the frontend `.env`:
   ```
   VITE_API_URL=https://wedding-r2-proxy.<your-account>.workers.dev
   VITE_R2_PROXY_URL=https://wedding-r2-proxy.<your-account>.workers.dev
   ```

5. Rebuild and redeploy the frontend:
   ```bash
   npm run build
   npx wrangler pages deploy docs --project-name vivi-wedding --branch main
   ```

## Initial Data Migration

If migrating from the old GitHub-based metadata, upload `photos.json` to R2:

```bash
npx wrangler r2 object put wedding/_metadata/photos.json \
  --file=data/photos.json \
  --content-type=application/json \
  --remote
```

## How it works

- **Gallery load**: Browser fetches `/api/photos` → Worker reads `photos.json` from R2 → returns JSON with ETag
- **Upload**: Browser POSTs multipart form → Worker writes file to R2 + updates `photos.json`
- **Likes/comments**: Browser POSTs → Worker updates `photos.json` in R2
- **Download All**: Service Worker intercepts `/__download_zip__` → fetches each photo through the Worker → streams a store-only zip to the browser's download manager (zero RAM)
- **Single download**: Browser fetches `/:r2Key` through Worker → Worker adds CORS headers → browser saves blob
- **Gallery images**: `<img src={r2Url}>` loads directly from R2 public URL (no Worker needed)

## Limits (Free Tier)

- **Requests**: 100,000/day (wedding uses ~6,300/day)
- **CPU**: 10ms per request (enough for R2 reads + JSON manipulation)
- **Request body**: 100MB max (limits upload file size)
- **R2 storage**: 10GB free (wedding uses 0.83GB)

## Cost

$0/month. All traffic is internal to Cloudflare (Worker → R2 binding).
