// Cloudflare Worker — CORS proxy for R2
// Enables browser fetch() from GitHub Pages to R2 photos (r2.dev doesn't support CORS)
// Free tier: 100,000 requests/day, no egress fees
// R2 binding = internal Cloudflare traffic (free, fast)

export default {
  async fetch(request, env) {
    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, HEAD',
          'Access-Control-Allow-Headers': '*',
          'Access-Control-Max-Age': '86400',
        },
      });
    }

    if (request.method !== 'GET' && request.method !== 'HEAD') {
      return new Response('Method not allowed', { status: 405 });
    }

    const url = new URL(request.url);
    // Key is the full path after the domain (e.g. "123-abc-photo.jpg")
    const key = decodeURIComponent(url.pathname.slice(1));
    if (!key) {
      return new Response('Missing key', { status: 400 });
    }

    // Read directly from R2 via binding (internal, free — no HTTP fetch)
    const object = await env.BUCKET.get(key);
    if (!object) {
      return new Response('Not found', { status: 404 });
    }

    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set('Access-Control-Allow-Origin', '*');
    headers.set('Access-Control-Expose-Headers', 'Content-Length, Content-Type');
    headers.set('Cache-Control', 'public, max-age=86400');
    if (!headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/octet-stream');
    }

    if (request.method === 'HEAD') {
      headers.set('Content-Length', object.size);
      return new Response(null, { headers });
    }

    return new Response(object.body, { headers });
  },
};
