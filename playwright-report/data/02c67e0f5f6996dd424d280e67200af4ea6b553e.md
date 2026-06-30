# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: gallery-features.spec.js >> Gallery Features >> photo download works and displays
- Location: tests\gallery-features.spec.js:288:3

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: page.waitForEvent: Test timeout of 30000ms exceeded.
=========================== logs ===========================
waiting for event "download"
============================================================
```

# Page snapshot

```yaml
- generic [ref=e2]:
  - navigation [ref=e3]:
    - generic [ref=e4]:
      - link "Vivi's Wedding" [ref=e5] [cursor=pointer]:
        - /url: "#/"
        - img [ref=e6]
        - text: Vivi's Wedding
      - list [ref=e9]:
        - listitem [ref=e10]:
          - link "Home" [ref=e11] [cursor=pointer]:
            - /url: "#/"
            - img [ref=e12]
            - generic [ref=e15]: Home
        - listitem [ref=e16]:
          - link "Upload" [ref=e17] [cursor=pointer]:
            - /url: "#/upload"
            - img [ref=e18]
            - generic [ref=e21]: Upload
        - listitem [ref=e22]:
          - link "Gallery" [ref=e23] [cursor=pointer]:
            - /url: "#/gallery"
            - img [ref=e24]
            - generic [ref=e28]: Gallery
  - main [ref=e29]:
    - generic [ref=e30]:
      - generic [ref=e31]:
        - heading "Guest Gallery" [level=2] [ref=e32]
        - generic [ref=e33]:
          - generic [ref=e34]: 4 of 4 photos
          - generic [ref=e35]: • 0.29 KB
          - button "Refresh gallery" [ref=e36] [cursor=pointer]:
            - img [ref=e37]
          - link "Add Photos" [ref=e42] [cursor=pointer]:
            - /url: "#/upload"
            - img [ref=e43]
            - text: Add Photos
      - generic [ref=e48]:
        - textbox "Search photos..." [ref=e49]
        - combobox [ref=e50]:
          - option "All Guests" [selected]
          - option "Test Guest"
          - option "Video Test"
          - option "Multi Upload Test"
        - combobox [ref=e51]:
          - option "All Dates" [selected]
          - option "2026-06-30"
        - generic [ref=e52]:
          - button "Grid layout" [ref=e53] [cursor=pointer]:
            - img [ref=e54]
          - button "Masonry layout" [ref=e56] [cursor=pointer]:
            - img [ref=e57]
          - button "Timeline layout" [ref=e61] [cursor=pointer]:
            - img [ref=e62]
      - generic [ref=e64]:
        - generic [ref=e65] [cursor=pointer]:
          - generic [ref=e66]:
            - img "Test photo caption" [ref=e67]
            - button [ref=e69]:
              - img [ref=e70]
          - generic [ref=e72]:
            - paragraph [ref=e73]: Test photo caption
            - generic [ref=e74]:
              - generic [ref=e75]:
                - img [ref=e76]
                - text: Test Guest
              - generic [ref=e79]:
                - img [ref=e80]
                - text: Jun 30, 02:33 AM
            - generic [ref=e83]:
              - generic [ref=e84]:
                - img [ref=e85]
                - text: "0"
              - generic [ref=e87]:
                - img [ref=e88]
                - text: "0"
        - generic [ref=e90] [cursor=pointer]:
          - button [ref=e94]:
            - img [ref=e95]
          - generic [ref=e97]:
            - generic [ref=e98]:
              - generic [ref=e99]:
                - img [ref=e100]
                - text: Video Test
              - generic [ref=e103]:
                - img [ref=e104]
                - text: Jun 30, 02:33 AM
            - generic [ref=e107]:
              - generic [ref=e108]:
                - img [ref=e109]
                - text: "0"
              - generic [ref=e111]:
                - img [ref=e112]
                - text: "0"
        - generic [ref=e114] [cursor=pointer]:
          - generic [ref=e115]:
            - img "Wedding photo" [ref=e116]
            - button [ref=e118]:
              - img [ref=e119]
          - generic [ref=e121]:
            - generic [ref=e122]:
              - generic [ref=e123]:
                - img [ref=e124]
                - text: Multi Upload Test
              - generic [ref=e127]:
                - img [ref=e128]
                - text: Jun 30, 02:33 AM
            - generic [ref=e131]:
              - generic [ref=e132]:
                - img [ref=e133]
                - text: "0"
              - generic [ref=e135]:
                - img [ref=e136]
                - text: "0"
        - generic [ref=e138] [cursor=pointer]:
          - generic [ref=e139]:
            - img "Wedding photo" [ref=e140]
            - button [ref=e142]:
              - img [ref=e143]
          - generic [ref=e145]:
            - generic [ref=e146]:
              - generic [ref=e147]:
                - img [ref=e148]
                - text: Multi Upload Test
              - generic [ref=e151]:
                - img [ref=e152]
                - text: Jun 30, 02:33 AM
            - generic [ref=e155]:
              - generic [ref=e156]:
                - img [ref=e157]
                - text: "0"
              - generic [ref=e159]:
                - img [ref=e160]
                - text: "0"
    - generic [ref=e162]:
      - button [ref=e163] [cursor=pointer]:
        - img [ref=e164]
      - button [ref=e167] [cursor=pointer]:
        - img [ref=e168]
      - button [ref=e170] [cursor=pointer]:
        - img [ref=e171]
      - generic [ref=e173]:
        - button "Download photo" [active] [ref=e174] [cursor=pointer]:
          - img [ref=e175]
        - button "Toggle slideshow" [ref=e178] [cursor=pointer]:
          - img [ref=e179]
        - button "Like photo" [ref=e184] [cursor=pointer]:
          - img [ref=e185]
        - button "Show comments" [ref=e187] [cursor=pointer]:
          - img [ref=e188]
      - img "Enlarged photo" [ref=e190]
      - paragraph [ref=e192]: By Multi Upload Test • Jun 30, 02:33 AM
```

# Test source

```ts
  207 |     // Wait for filter to apply
  208 |     await page.waitForTimeout(1000);
  209 | 
  210 |     // Check if photos are filtered
  211 |     const filteredPhotos = page.locator('img[src^="data:image"], img[src^="http"]');
  212 |     const filteredCount = await filteredPhotos.count();
  213 |     console.log('Filtered photo count by guest:', filteredCount);
  214 | 
  215 |     // Reset filter
  216 |     await guestFilter.selectOption({ index: 0 }); // Select "All Guests"
  217 | 
  218 |     console.log('Guest filter test completed - filter dropdown displayed and functional');
  219 |   });
  220 | 
  221 |   test('filter by date works and displays', async ({ page }) => {
  222 |     await page.goto('/#/gallery');
  223 |     await page.waitForLoadState('networkidle');
  224 | 
  225 |     // Wait for photos to load
  226 |     await page.waitForTimeout(2000);
  227 | 
  228 |     // Verify date filter dropdown is displayed
  229 |     const dateFilter = page.locator('select').nth(1); // Second select is date filter
  230 |     await expect(dateFilter).toBeVisible();
  231 | 
  232 |     // Get initial photo count (supports both legacy data:image and R2 URLs)
  233 |     const initialPhotos = page.locator('img[src^="data:image"], img[src^="http"]');
  234 |     const initialCount = await initialPhotos.count();
  235 |     console.log('Initial photo count:', initialCount);
  236 | 
  237 |     // Select a date from dropdown
  238 |     await dateFilter.selectOption({ index: 1 }); // Select first date option
  239 | 
  240 |     // Wait for filter to apply
  241 |     await page.waitForTimeout(1000);
  242 | 
  243 |     // Check if photos are filtered
  244 |     const filteredPhotos = page.locator('img[src^="data:image"], img[src^="http"]');
  245 |     const filteredCount = await filteredPhotos.count();
  246 |     console.log('Filtered photo count by date:', filteredCount);
  247 | 
  248 |     // Reset filter
  249 |     await dateFilter.selectOption({ index: 0 }); // Select "All Dates"
  250 | 
  251 |     console.log('Date filter test completed - date filter displayed and functional');
  252 |   });
  253 | 
  254 |   test('gallery layouts work and display', async ({ page }) => {
  255 |     await page.goto('/#/gallery');
  256 |     await page.waitForLoadState('networkidle');
  257 |     
  258 |     // Wait for photos to load
  259 |     await page.waitForTimeout(2000);
  260 |     
  261 |     // Verify layout buttons are displayed
  262 |     const gridButton = page.locator('button[title="Grid layout"]').first();
  263 |     const masonryButton = page.locator('button[title="Masonry layout"]').first();
  264 |     const timelineButton = page.locator('button[title="Timeline layout"]').first();
  265 |     
  266 |     await expect(gridButton).toBeVisible();
  267 |     await expect(masonryButton).toBeVisible();
  268 |     await expect(timelineButton).toBeVisible();
  269 |     
  270 |     // Test grid layout (default)
  271 |     await gridButton.click();
  272 |     await page.waitForTimeout(500);
  273 |     console.log('Grid layout selected');
  274 |     
  275 |     // Test masonry layout
  276 |     await masonryButton.click();
  277 |     await page.waitForTimeout(500);
  278 |     console.log('Masonry layout selected');
  279 |     
  280 |     // Test timeline layout
  281 |     await timelineButton.click();
  282 |     await page.waitForTimeout(500);
  283 |     console.log('Timeline layout selected');
  284 |     
  285 |     console.log('Gallery layouts test completed - layout buttons displayed and functional');
  286 |   });
  287 | 
  288 |   test('photo download works and displays', async ({ page }) => {
  289 |     await page.goto('/#/gallery');
  290 |     await page.waitForLoadState('networkidle');
  291 | 
  292 |     // Wait for photos to load
  293 |     await page.waitForTimeout(2000);
  294 | 
  295 |     // Open first photo in lightbox (supports both legacy data:image and R2 URLs)
  296 |     const firstPhoto = page.locator('img[src^="data:image"], img[src^="http"]').first();
  297 |     await firstPhoto.click();
  298 | 
  299 |     // Wait for lightbox to open
  300 |     await page.waitForTimeout(1000);
  301 | 
  302 |     // Verify download button is displayed
  303 |     const downloadButton = page.locator('button[title="Download photo"]').first();
  304 |     await expect(downloadButton).toBeVisible();
  305 | 
  306 |     // Setup download handler
> 307 |     const downloadPromise = page.waitForEvent('download');
      |                                  ^ Error: page.waitForEvent: Test timeout of 30000ms exceeded.
  308 |     await downloadButton.click();
  309 |     const download = await downloadPromise;
  310 | 
  311 |     console.log('Download started:', download.suggestedFilename());
  312 | 
  313 |     // Close lightbox by clicking on the overlay
  314 |     const lightboxOverlay = page.locator('.fixed.inset-0.z-\\[1000\\]');
  315 |     await lightboxOverlay.click({ position: { x: 10, y: 10 } });
  316 | 
  317 |     console.log('Photo download test completed - download button displayed and functional');
  318 |   });
  319 | 
  320 |   test('slideshow mode works and displays', async ({ page }) => {
  321 |     await page.goto('/#/gallery');
  322 |     await page.waitForLoadState('networkidle');
  323 | 
  324 |     // Wait for photos to load
  325 |     await page.waitForTimeout(2000);
  326 | 
  327 |     // Open first photo in lightbox (supports both legacy data:image and R2 URLs)
  328 |     const firstPhoto = page.locator('img[src^="data:image"], img[src^="http"]').first();
  329 |     await firstPhoto.click();
  330 | 
  331 |     // Wait for lightbox to open
  332 |     await page.waitForTimeout(1000);
  333 | 
  334 |     // Verify slideshow button is displayed
  335 |     const slideshowButton = page.locator('button[title="Toggle slideshow"]').first();
  336 |     await expect(slideshowButton).toBeVisible();
  337 | 
  338 |     // Enable slideshow
  339 |     await slideshowButton.click();
  340 | 
  341 |     // Wait for slideshow to advance (3 seconds)
  342 |     await page.waitForTimeout(4000);
  343 | 
  344 |     // Disable slideshow
  345 |     await slideshowButton.click();
  346 | 
  347 |     // Close lightbox by clicking on the overlay
  348 |     const lightboxOverlay = page.locator('.fixed.inset-0.z-\\[1000\\]');
  349 |     await lightboxOverlay.click({ position: { x: 10, y: 10 } });
  350 | 
  351 |     console.log('Slideshow test completed - slideshow button displayed and functional');
  352 |   });
  353 | 
  354 |   test('keyboard navigation works', async ({ page }) => {
  355 |     await page.goto('/#/gallery');
  356 |     await page.waitForLoadState('networkidle');
  357 | 
  358 |     // Wait for photos to load
  359 |     await page.waitForTimeout(2000);
  360 | 
  361 |     // Open first photo in lightbox (supports both legacy data:image and R2 URLs)
  362 |     const firstPhoto = page.locator('img[src^="data:image"], img[src^="http"]').first();
  363 |     await firstPhoto.click();
  364 | 
  365 |     // Wait for lightbox to open
  366 |     await page.waitForTimeout(1000);
  367 | 
  368 |     // Test right arrow navigation
  369 |     await page.keyboard.press('ArrowRight');
  370 |     await page.waitForTimeout(500);
  371 | 
  372 |     // Test left arrow navigation
  373 |     await page.keyboard.press('ArrowLeft');
  374 |     await page.waitForTimeout(500);
  375 | 
  376 |     // Test escape to close
  377 |     await page.keyboard.press('Escape');
  378 |     await page.waitForTimeout(500);
  379 | 
  380 |     // Verify lightbox is closed
  381 |     const lightbox = page.locator('.fixed.inset-0.z-\\[1000\\]');
  382 |     const isVisible = await lightbox.isVisible();
  383 |     expect(isVisible).toBe(false);
  384 | 
  385 |     console.log('Keyboard navigation test completed');
  386 |   });
  387 | 
  388 |   test('video upload works and displays in gallery', async ({ page }) => {
  389 |     await page.goto('/#/upload');
  390 |     await page.waitForLoadState('networkidle');
  391 | 
  392 |     // Click on the upload area
  393 |     const uploadArea = page.locator('.upload-area, [class*="upload"], [class*="dropzone"]').first();
  394 |     await uploadArea.click();
  395 | 
  396 |     // Get the hidden file input
  397 |     const fileInput = page.locator('input[type="file"]');
  398 | 
  399 |     // Create a simple test video buffer (minimal MP4 header)
  400 |     const testVideo = Buffer.from('00000020667479706D703432000000006D7034326D70342100000001667479706D703432', 'hex');
  401 | 
  402 |     // Upload the test video
  403 |     await fileInput.setInputFiles({
  404 |       name: 'test.mp4',
  405 |       mimeType: 'video/mp4',
  406 |       buffer: testVideo
  407 |     });
```