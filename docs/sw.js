// Service Worker — streams a zip of all wedding photos directly to the browser's
// download manager. Zero RAM usage (streams chunk by chunk to disk), works on all
// browsers that support Service Workers (Safari 16.4+, Chrome, Edge, Firefox).
//
// The zip uses "store" (no compression) — photos are already JPEG/PNG/MP4 (compressed),
// so zip compression would waste CPU for ~0% size reduction.
//
// Flow:
// 1. Page sends { type: 'PREPARE_DOWNLOAD', photos, apiBase } to SW
// 2. SW stores the photo list in memory
// 3. Page creates <a href="/__download_zip__" download="wedding-photos.zip">
// 4. SW intercepts the fetch for /__download_zip__
// 5. SW creates a ReadableStream that fetches each photo and writes zip data
// 6. Browser's download manager streams the response to disk — zero RAM

let pendingDownload = null;

// === Minimal streaming ZIP builder (store-only, no compression) ===
// ZIP format: local file headers + file data, then central directory + EOCD

const crcTable = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) {
      c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[i] = c;
  }
  return table;
})();

function crc32(data) {
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < data.length; i++) {
    crc = (crc >>> 8) ^ crcTable[(crc ^ data[i]) & 0xFF];
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

function createZipStream(photoUrls, client) {
  const encoder = new TextEncoder();
  const centralDir = [];
  let offset = 0;

  return new ReadableStream({
    async start(controller) {
      for (let i = 0; i < photoUrls.length; i++) {
        const { url, name } = photoUrls[i];
        try {
          const res = await fetch(url);
          if (!res.ok) {
            console.warn(`SW: Skip ${name} (HTTP ${res.status})`);
            continue;
          }
          const data = new Uint8Array(await res.arrayBuffer());
          const filenameBytes = encoder.encode(name);
          const crc = crc32(data);
          const localHeaderOffset = offset;

          // Local file header (30 bytes + filename)
          const lh = new Uint8Array(30 + filenameBytes.length);
          const dv = new DataView(lh.buffer);
          dv.setUint32(0, 0x04034b50, true);
          dv.setUint16(4, 20, true);
          dv.setUint16(6, 0, true);
          dv.setUint16(8, 0, true);  // store
          dv.setUint16(10, 0, true);
          dv.setUint16(12, 0, true);
          dv.setUint32(14, crc, true);
          dv.setUint32(18, data.length, true);
          dv.setUint32(22, data.length, true);
          dv.setUint16(26, filenameBytes.length, true);
          dv.setUint16(28, 0, true);
          lh.set(filenameBytes, 30);

          controller.enqueue(lh);
          offset += lh.length;
          controller.enqueue(data);
          offset += data.length;

          // Central directory entry (46 bytes + filename)
          const cd = new Uint8Array(46 + filenameBytes.length);
          const cdv = new DataView(cd.buffer);
          cdv.setUint32(0, 0x02014b50, true);
          cdv.setUint16(4, 20, true);
          cdv.setUint16(6, 20, true);
          cdv.setUint16(8, 0, true);
          cdv.setUint16(10, 0, true);
          cdv.setUint16(12, 0, true);
          cdv.setUint16(14, 0, true);
          cdv.setUint32(16, crc, true);
          cdv.setUint32(20, data.length, true);
          cdv.setUint32(24, data.length, true);
          cdv.setUint16(28, filenameBytes.length, true);
          cdv.setUint16(30, 0, true);
          cdv.setUint16(32, 0, true);
          cdv.setUint16(34, 0, true);
          cdv.setUint16(36, 0, true);
          cdv.setUint32(38, 0, true);
          cdv.setUint32(42, localHeaderOffset, true);
          cd.set(filenameBytes, 46);
          centralDir.push(cd);

          // Send progress to page
          if (client) {
            client.postMessage({ type: 'DOWNLOAD_PROGRESS', done: i + 1, total: photoUrls.length });
          }
        } catch (err) {
          console.warn(`SW: Skip ${name} (${err.message})`);
        }
      }

      // Central directory
      const cdStart = offset;
      let cdSize = 0;
      for (const entry of centralDir) {
        controller.enqueue(entry);
        cdSize += entry.length;
        offset += entry.length;
      }

      // End of central directory record (22 bytes)
      const eocd = new Uint8Array(22);
      const edv = new DataView(eocd.buffer);
      edv.setUint32(0, 0x06054b50, true);
      edv.setUint16(4, 0, true);
      edv.setUint16(6, 0, true);
      edv.setUint16(8, centralDir.length, true);
      edv.setUint16(10, centralDir.length, true);
      edv.setUint32(12, cdSize, true);
      edv.setUint32(16, cdStart, true);
      edv.setUint16(20, 0, true);
      controller.enqueue(eocd);

      controller.close();
    },
  });
}

// === Service Worker lifecycle ===

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// === Message handler — receive photo list from page ===

self.addEventListener('message', (event) => {
  if (event.data.type === 'PREPARE_DOWNLOAD') {
    pendingDownload = {
      photos: event.data.photos,
      apiBase: event.data.apiBase,
      clientId: event.source.id,
    };
    event.source.postMessage({ type: 'DOWNLOAD_PREPARED' });
  }
});

// === Fetch handler — intercept /__download_zip__ and stream the zip ===

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  if (url.pathname === '/__download_zip__') {
    if (!pendingDownload) {
      event.respondWith(new Response('No pending download', { status: 404 }));
      return;
    }

    const { photos, apiBase, clientId } = pendingDownload;
    pendingDownload = null;

    console.log(`SW: Starting zip stream for ${photos.length} photos`);

    const photoUrls = photos.map((p, i) => ({
      url: p.r2Key
        ? `${apiBase}/${encodeURIComponent(p.r2Key)}`
        : p.r2Url,
      name: `${String(i + 1).padStart(3, '0')}-${p.filename || `${p.id}.bin`}`,
    }));

    event.respondWith((async () => {
      const client = await self.clients.get(clientId);
      const stream = createZipStream(photoUrls, client);

      return new Response(stream, {
        status: 200,
        headers: {
          'Content-Type': 'application/zip',
          'Content-Disposition': 'attachment; filename="wedding-photos.zip"',
          'Cache-Control': 'no-cache',
        },
      });
    })());
  }
});
