# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: comprehensive.spec.js >> Comprehensive Button and Error Tests >> Lightbox - all buttons work without errors
- Location: tests\comprehensive.spec.js:71:3

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
          - generic [ref=e34]: 3 of 3 photos
          - generic [ref=e35]: • 0.20 KB
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
          - button [ref=e69]:
            - img [ref=e70]
          - generic [ref=e72]:
            - generic [ref=e73]:
              - generic [ref=e74]:
                - img [ref=e75]
                - text: Video Test
              - generic [ref=e78]:
                - img [ref=e79]
                - text: Jun 30, 02:33 AM
            - generic [ref=e82]:
              - generic [ref=e83]:
                - img [ref=e84]
                - text: "0"
              - generic [ref=e86]:
                - img [ref=e87]
                - text: "0"
        - generic [ref=e89] [cursor=pointer]:
          - generic [ref=e90]:
            - img "Wedding photo" [ref=e91]
            - button [ref=e93]:
              - img [ref=e94]
          - generic [ref=e96]:
            - generic [ref=e97]:
              - generic [ref=e98]:
                - img [ref=e99]
                - text: Multi Upload Test
              - generic [ref=e102]:
                - img [ref=e103]
                - text: Jun 30, 02:33 AM
            - generic [ref=e106]:
              - generic [ref=e107]:
                - img [ref=e108]
                - text: "0"
              - generic [ref=e110]:
                - img [ref=e111]
                - text: "0"
        - generic [ref=e113] [cursor=pointer]:
          - generic [ref=e114]:
            - img "Wedding photo" [ref=e115]
            - button [ref=e117]:
              - img [ref=e118]
          - generic [ref=e120]:
            - generic [ref=e121]:
              - generic [ref=e122]:
                - img [ref=e123]
                - text: Multi Upload Test
              - generic [ref=e126]:
                - img [ref=e127]
                - text: Jun 30, 02:33 AM
            - generic [ref=e130]:
              - generic [ref=e131]:
                - img [ref=e132]
                - text: "0"
              - generic [ref=e134]:
                - img [ref=e135]
                - text: "0"
    - generic [ref=e137]:
      - button [ref=e138] [cursor=pointer]:
        - img [ref=e139]
      - button [ref=e142] [cursor=pointer]:
        - img [ref=e143]
      - button [ref=e145] [cursor=pointer]:
        - img [ref=e146]
      - generic [ref=e148]:
        - button "Download photo" [active] [ref=e149] [cursor=pointer]:
          - img [ref=e150]
        - button "Toggle slideshow" [ref=e153] [cursor=pointer]:
          - img [ref=e154]
        - button "Like photo" [ref=e159] [cursor=pointer]:
          - img [ref=e160]
        - button "Show comments" [ref=e162] [cursor=pointer]:
          - img [ref=e163]
      - paragraph [ref=e167]: By Multi Upload Test • Jun 30, 02:33 AM
```

# Test source

```ts
  1   | import { test, expect } from '@playwright/test';
  2   | 
  3   | test.describe('Comprehensive Button and Error Tests', () => {
  4   |   test.beforeEach(async ({ page }) => {
  5   |     // Listen for console errors
  6   |     const errors = [];
  7   |     page.on('console', msg => {
  8   |       if (msg.type() === 'error') {
  9   |         errors.push(msg.text());
  10  |       }
  11  |     });
  12  |   });
  13  | 
  14  |   test('Gallery page - all buttons work without errors', async ({ page }) => {
  15  |     await page.goto('/#/gallery');
  16  |     await page.waitForLoadState('networkidle');
  17  |     await page.waitForTimeout(2000);
  18  | 
  19  |     // Test search input
  20  |     const searchInput = page.locator('input[placeholder="Search photos..."]').first();
  21  |     await expect(searchInput).toBeVisible();
  22  |     await searchInput.fill('test');
  23  |     await page.waitForTimeout(500);
  24  |     await searchInput.fill('');
  25  |     await page.waitForTimeout(500);
  26  | 
  27  |     // Test guest filter dropdown
  28  |     const guestFilter = page.locator('select').first();
  29  |     await expect(guestFilter).toBeVisible();
  30  |     await guestFilter.selectOption({ index: 1 });
  31  |     await page.waitForTimeout(500);
  32  |     await guestFilter.selectOption({ index: 0 });
  33  |     await page.waitForTimeout(500);
  34  | 
  35  |     // Test date filter dropdown
  36  |     const dateFilter = page.locator('select').nth(1);
  37  |     await expect(dateFilter).toBeVisible();
  38  |     await dateFilter.selectOption({ index: 1 });
  39  |     await page.waitForTimeout(500);
  40  |     await dateFilter.selectOption({ index: 0 });
  41  |     await page.waitForTimeout(500);
  42  | 
  43  |     // Test layout buttons
  44  |     const gridButton = page.locator('button[title="Grid layout"]').first();
  45  |     const masonryButton = page.locator('button[title="Masonry layout"]').first();
  46  |     const timelineButton = page.locator('button[title="Timeline layout"]').first();
  47  | 
  48  |     await expect(gridButton).toBeVisible();
  49  |     await expect(masonryButton).toBeVisible();
  50  |     await expect(timelineButton).toBeVisible();
  51  | 
  52  |     await gridButton.click();
  53  |     await page.waitForTimeout(500);
  54  |     await masonryButton.click();
  55  |     await page.waitForTimeout(500);
  56  |     await timelineButton.click();
  57  |     await page.waitForTimeout(500);
  58  |     await gridButton.click();
  59  |     await page.waitForTimeout(500);
  60  | 
  61  |     // Test refresh button (icon button)
  62  |     const refreshButton = page.locator('button svg').filter({ hasText: '' }).first();
  63  |     if (await refreshButton.isVisible()) {
  64  |       await refreshButton.click();
  65  |       await page.waitForTimeout(2000);
  66  |     }
  67  | 
  68  |     console.log('Gallery page buttons test completed');
  69  |   });
  70  | 
  71  |   test('Lightbox - all buttons work without errors', async ({ page }) => {
  72  |     await page.goto('/#/gallery');
  73  |     await page.waitForLoadState('networkidle');
  74  |     await page.waitForTimeout(2000);
  75  | 
  76  |     // Open lightbox
  77  |     const firstPhoto = page.locator('img[src^="data:image"], img[src^="https://"]').first();
  78  |     await firstPhoto.click();
  79  |     await page.waitForTimeout(1000);
  80  | 
  81  |     // Test navigation buttons - skip if only one photo
  82  |     const allPhotos = page.locator('img[src^="data:image"], img[src^="https://"]');
  83  |     const photoCount = await allPhotos.count();
  84  |     
  85  |     if (photoCount > 1) {
  86  |       // Use keyboard navigation instead of clicking buttons
  87  |       await page.keyboard.press('ArrowRight');
  88  |       await page.waitForTimeout(500);
  89  |       await page.keyboard.press('ArrowLeft');
  90  |       await page.waitForTimeout(500);
  91  |     }
  92  | 
  93  |     // Test download button
  94  |     const downloadButton = page.locator('button[title="Download photo"]').first();
  95  |     await expect(downloadButton).toBeVisible();
> 96  |     const downloadPromise = page.waitForEvent('download');
      |                                  ^ Error: page.waitForEvent: Test timeout of 30000ms exceeded.
  97  |     await downloadButton.click();
  98  |     await downloadPromise;
  99  |     await page.waitForTimeout(500);
  100 | 
  101 |     // Test slideshow button
  102 |     const slideshowButton = page.locator('button[title="Toggle slideshow"]').first();
  103 |     await expect(slideshowButton).toBeVisible();
  104 |     await slideshowButton.click();
  105 |     await page.waitForTimeout(2000);
  106 |     await slideshowButton.click();
  107 |     await page.waitForTimeout(500);
  108 | 
  109 |     // Test like button
  110 |     const likeButton = page.locator('button[title="Like photo"]').first();
  111 |     await expect(likeButton).toBeVisible();
  112 |     await likeButton.click();
  113 |     await page.waitForTimeout(2000);
  114 |     await likeButton.click();
  115 |     await page.waitForTimeout(2000);
  116 | 
  117 |     // Test comments button
  118 |     const commentsButton = page.locator('button[title="Show comments"]').first();
  119 |     await expect(commentsButton).toBeVisible();
  120 |     await commentsButton.click();
  121 |     await page.waitForTimeout(1000);
  122 | 
  123 |     // Test comment input
  124 |     const commentInput = page.locator('input[placeholder="Add a comment..."]').first();
  125 |     await expect(commentInput).toBeVisible();
  126 |     await commentInput.fill('Test comment');
  127 |     await page.waitForTimeout(500);
  128 | 
  129 |     const postButton = page.locator('button:has-text("Post")').first();
  130 |     await expect(postButton).toBeVisible();
  131 |     await postButton.click();
  132 |     await page.waitForTimeout(2000);
  133 | 
  134 |     // Close comments panel
  135 |     await commentsButton.click();
  136 |     await page.waitForTimeout(500);
  137 | 
  138 |     // Close lightbox
  139 |     const lightboxOverlay = page.locator('.fixed.inset-0.z-\\[1000\\]');
  140 |     await lightboxOverlay.click({ position: { x: 10, y: 10 } });
  141 |     await page.waitForTimeout(500);
  142 | 
  143 |     console.log('Lightbox buttons test completed');
  144 |   });
  145 | 
  146 |   test('Upload page - all buttons work without errors', async ({ page }) => {
  147 |     await page.goto('/#/upload');
  148 |     await page.waitForLoadState('networkidle');
  149 |     await page.waitForTimeout(1000);
  150 | 
  151 |     // Test upload area
  152 |     const uploadArea = page.locator('.upload-area, [class*="upload"], [class*="dropzone"]').first();
  153 |     await expect(uploadArea).toBeVisible();
  154 |     await uploadArea.click();
  155 |     await page.waitForTimeout(500);
  156 | 
  157 |     // Test file input
  158 |     const fileInput = page.locator('input[type="file"]');
  159 |     const testImage = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');
  160 |     await fileInput.setInputFiles({
  161 |       name: 'test.png',
  162 |       mimeType: 'image/png',
  163 |       buffer: testImage
  164 |     });
  165 |     await page.waitForTimeout(1000);
  166 | 
  167 |     // Test caption input
  168 |     const captionInput = page.locator('input[placeholder*="caption"], input[placeholder*="Caption"]').first();
  169 |     await expect(captionInput).toBeVisible();
  170 |     await captionInput.fill('Test caption');
  171 |     await page.waitForTimeout(500);
  172 | 
  173 |     // Test guest name input
  174 |     const nameInput = page.locator('input[placeholder*="name"], input[placeholder*="Name"]').first();
  175 |     await expect(nameInput).toBeVisible();
  176 |     await nameInput.fill('Test Guest');
  177 |     await page.waitForTimeout(500);
  178 | 
  179 |     // Test upload button
  180 |     const uploadButton = page.locator('button:has-text("Upload")').first();
  181 |     await expect(uploadButton).toBeVisible();
  182 |     await uploadButton.click();
  183 |     await page.waitForTimeout(5000);
  184 | 
  185 |     console.log('Upload page buttons test completed');
  186 |   });
  187 | 
  188 |   test('Settings page - all buttons work without errors', async ({ page }) => {
  189 |     await page.goto('/#/settings');
  190 |     await page.waitForLoadState('networkidle');
  191 |     await page.waitForTimeout(1000);
  192 | 
  193 |     // Test wedding details inputs
  194 |     const coupleNameInput = page.locator('input[placeholder*="Couple"]').first();
  195 |     if (await coupleNameInput.isVisible()) {
  196 |       await coupleNameInput.fill('Test Couple');
```