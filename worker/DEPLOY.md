# Deploy the R2 CORS Proxy Worker

This Cloudflare Worker adds CORS headers to R2 responses, enabling the browser
to fetch photos directly from R2 and build the zip client-side (zero Render bandwidth).

## Prerequisites

- A Cloudflare account (you already have one for R2)
- Node.js installed

## Steps

1. Install Wrangler (Cloudflare's CLI):
   ```
   npm install -g wrangler
   ```

2. Login to Cloudflare:
   ```
   wrangler login
   ```
   This opens a browser to authenticate with your Cloudflare account.

3. Deploy the Worker:
   ```
   cd worker
   wrangler deploy
   ```
   This uploads the Worker to Cloudflare. The output will show the Worker URL, e.g.:
   ```
   https://wedding-r2-proxy.<your-account>.workers.dev
   ```

4. Set the Worker URL as an environment variable on Render:
   - Go to your Render dashboard → wedding-backend → Environment
   - Add: `VITE_R2_PROXY_URL` = `https://wedding-r2-proxy.<your-account>.workers.dev`
   - Wait for Render to rebuild

   **OR** if you're building locally and deploying the frontend to GitHub Pages:
   - Create a `.env` file in the project root:
     ```
     VITE_R2_PROXY_URL=https://wedding-r2-proxy.<your-account>.workers.dev
     ```
   - Run `npm run build` and push the `docs/` folder to GitHub

## How it works

- Browser fetches photos through the Worker (e.g. `https://worker.dev/photo-key.jpg`)
- Worker reads from R2 via internal binding (free, fast — no public internet)
- Worker adds `Access-Control-Allow-Origin: *` header
- Browser builds the zip client-side with fflate
- On desktop Chrome/Edge: streams to disk via File System Access API (constant RAM)
- On mobile: falls back to pre-built zip on R2 (302 redirect, zero Render bandwidth)

## Cost

- Free tier: 100,000 requests/day
- 359 photos × 20 downloads = 7,180 requests (well within limits)
- No egress fees (Cloudflare Workers + R2 = all internal)
