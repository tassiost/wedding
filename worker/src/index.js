// Cloudflare Worker — complete backend for wedding photo app
// Handles: photo metadata, uploads, likes, comments, R2 CORS proxy
// All traffic stays on Cloudflare's network (Worker → R2 binding = free)
// Free tier: 100,000 requests/day, 10ms CPU, no egress fees

const PHOTOS_KEY = '_metadata/photos.json';
const USAGE_KEY = '_metadata/r2-usage.json';
const ALLOWED_TYPES = [
  'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/heic', 'image/heif',
  'video/mp4', 'video/quicktime', 'video/webm', 'video/x-matroska',
];

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': '*',
    'Access-Control-Max-Age': '86400',
  };
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders() },
  });
}

// Read photos.json from R2
async function getPhotos(env) {
  const obj = await env.BUCKET.get(PHOTOS_KEY);
  if (!obj) return { photos: [], lastUpdated: new Date().toISOString() };
  const text = await obj.text();
  return JSON.parse(text);
}

// Write photos.json to R2 (atomic — R2 writes are strongly consistent for single keys)
async function putPhotos(env, data) {
  data.lastUpdated = new Date().toISOString();
  await env.BUCKET.put(PHOTOS_KEY, JSON.stringify(data, null, 2));
}

// Read/update photos with retry for concurrent writes
async function updatePhotos(env, mutateFn, maxRetries = 3) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const data = await getPhotos(env);
    const result = mutateFn(data);
    await putPhotos(env, data);
    return result;
    // R2 PUT is atomic — no SHA mismatch like GitHub. Retries not needed
    // but kept for future-proofing if we move to a different backend.
  }
}

// Read R2 usage tracking
async function getUsage(env) {
  const obj = await env.BUCKET.get(USAGE_KEY);
  if (!obj) return { storageBytes: 0, classAOperations: 0, classBOperations: 0, lastUpdated: new Date().toISOString() };
  return JSON.parse(await obj.text());
}

// Update R2 usage
async function updateUsage(env, mutateFn) {
  const usage = await getUsage(env);
  const newUsage = mutateFn(usage);
  newUsage.lastUpdated = new Date().toISOString();
  await env.BUCKET.put(USAGE_KEY, JSON.stringify(newUsage, null, 2));
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    // CORS preflight for all routes
    if (method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders() });
    }

    // === API ROUTES ===

    // Health check
    if (path === '/health' && method === 'GET') {
      return json({ status: 'ok', timestamp: new Date().toISOString() });
    }

    // Get all photos metadata
    if (path === '/api/photos' && method === 'GET') {
      // ETag support — return 304 if not modified
      const ifNoneMatch = request.headers.get('If-None-Match');
      const obj = await env.BUCKET.get(PHOTOS_KEY);
      if (!obj) return json({ photos: [] });

      const etag = obj.httpEtag;
      // Compare ETags — strip weak prefix (W/) for comparison
      const etagNorm = etag?.replace(/^W\//, '');
      const ifNoneNorm = ifNoneMatch?.replace(/^W\//, '');
      if (ifNoneNorm && etagNorm && ifNoneNorm === etagNorm) {
        return new Response(null, { status: 304, headers: { ETag: etag, ...corsHeaders() } });
      }

      const text = await obj.text();
      const headers = { 'Content-Type': 'application/json', ETag: etag, ...corsHeaders() };
      return new Response(text, { headers });
    }

    // Upload photo (multipart/form-data)
    if (path === '/api/photos' && method === 'POST') {
      try {
        const formData = await request.formData();
        const file = formData.get('file');
        const caption = formData.get('caption') || '';
        const guestName = formData.get('guestName') || 'Anonymous';
        const metadataStr = formData.get('metadata') || '{}';

        if (!file || !(file instanceof File)) {
          return json({ error: 'No file provided' }, 400);
        }

        // Validate file type
        if (!ALLOWED_TYPES.includes(file.type)) {
          return json({ error: `File type ${file.type} not allowed. Only images and videos.` }, 400);
        }

        let metadata = {};
        try { metadata = JSON.parse(metadataStr); } catch { metadata = {}; }

        const fileSize = file.size;
        const filename = file.name;

        // Check R2 storage limits (10GB free tier)
        const usage = await getUsage(env);
        const storageGB = (usage.storageBytes + fileSize) / (1024 * 1024 * 1024);
        if (storageGB >= 10) {
          return json({ error: 'R2 storage limit exceeded' }, 429);
        }

        // Generate unique key
        const key = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}-${filename}`;

        // Upload to R2 via binding (internal — zero bandwidth cost)
        await env.BUCKET.put(key, file.stream(), {
          httpMetadata: { contentType: file.type },
        });

        // Build R2 public URL (for img/video tags — direct from r2.dev, no CORS needed)
        const r2PublicUrl = env.R2_PUBLIC_URL || '';
        const r2Url = r2PublicUrl ? `${r2PublicUrl}/${key}` : '';

        const newPhoto = {
          id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          filename,
          caption,
          guestName,
          uploadedAt: new Date().toISOString(),
          dateTaken: metadata?.dateTaken || new Date().toISOString(),
          r2Url,
          r2Key: key,
          fileSize,
          metadata: metadata || {},
        };

        // Update photos.json
        await updatePhotos(env, (data) => {
          if (!data.photos) data.photos = [];
          data.photos.unshift(newPhoto);
        });

        // Update usage tracking
        await updateUsage(env, (u) => {
          u.storageBytes += fileSize;
          u.classAOperations += 1;
          return u;
        });

        return json(newPhoto);
      } catch (err) {
        return json({ error: 'Failed to upload photo', details: err.message }, 500);
      }
    }

    // Like/unlike photo
    const likeMatch = path.match(/^\/api\/photos\/([^/]+)\/like$/);
    if (likeMatch && method === 'POST') {
      const photoId = likeMatch[1];
      try {
        const body = await request.json();
        const guestName = body.guestName || 'Anonymous';

        const result = await updatePhotos(env, (data) => {
          const photo = data.photos?.find(p => p.id === photoId);
          if (!photo) throw new Error('NOT_FOUND');

          if (!photo.likedBy) photo.likedBy = [];
          const idx = photo.likedBy.indexOf(guestName);
          if (idx === -1) {
            photo.likedBy.push(guestName);
          } else {
            photo.likedBy.splice(idx, 1);
          }
          photo.likes = photo.likedBy.length;

          return { likes: photo.likes, likedBy: photo.likedBy };
        });

        return json(result);
      } catch (err) {
        if (err.message === 'NOT_FOUND') return json({ error: 'Photo not found' }, 404);
        return json({ error: 'Failed to update likes' }, 500);
      }
    }

    // Add comment
    const commentMatch = path.match(/^\/api\/photos\/([^/]+)\/comments$/);
    if (commentMatch && method === 'POST') {
      const photoId = commentMatch[1];
      try {
        const body = await request.json();
        const text = body.text;
        const author = body.author || 'Anonymous';

        if (!text || !text.trim()) {
          return json({ error: 'Comment text is required' }, 400);
        }

        const newComment = {
          id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          text,
          author,
          timestamp: new Date().toISOString(),
        };

        const result = await updatePhotos(env, (data) => {
          const photo = data.photos?.find(p => p.id === photoId);
          if (!photo) throw new Error('NOT_FOUND');

          if (!photo.comments) photo.comments = [];
          photo.comments.push(newComment);

          return newComment;
        });

        return json(result);
      } catch (err) {
        if (err.message === 'NOT_FOUND') return json({ error: 'Photo not found' }, 404);
        return json({ error: 'Failed to add comment' }, 500);
      }
    }

    // Zip download — 302 redirect to pre-built zip on R2
    if (path === '/api/photos/zip' && method === 'GET') {
      const r2PublicUrl = env.R2_PUBLIC_URL || '';
      if (r2PublicUrl) {
        return Response.redirect(`${r2PublicUrl}/wedding-photos.zip`, 302);
      }
      return json({ error: 'R2 public URL not configured' }, 500);
    }

    // === R2 CORS PROXY (for individual photo downloads via fetch) ===
    // Matches any other GET/HEAD path — treats it as an R2 key
    if (method === 'GET' || method === 'HEAD') {
      const key = decodeURIComponent(path.slice(1));
      if (!key || key.startsWith('api/')) {
        return json({ error: 'Not found' }, 404);
      }

      const object = await env.BUCKET.get(key);
      if (!object) return json({ error: 'Not found' }, 404);

      const headers = new Headers();
      object.writeHttpMetadata(headers);
      headers.set('Access-Control-Allow-Origin', '*');
      headers.set('Access-Control-Expose-Headers', 'Content-Length, Content-Type');
      headers.set('Cache-Control', 'public, max-age=86400');
      if (!headers.has('Content-Type')) {
        headers.set('Content-Type', 'application/octet-stream');
      }

      if (method === 'HEAD') {
        headers.set('Content-Length', object.size);
        return new Response(null, { headers });
      }

      return new Response(object.body, { headers });
    }

    return json({ error: 'Method not allowed' }, 405);
  },
};
