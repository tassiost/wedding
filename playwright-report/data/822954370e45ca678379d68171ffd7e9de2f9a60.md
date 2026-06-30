# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: gallery-features.spec.js >> Gallery Features >> photo likes feature works and displays
- Location: tests\gallery-features.spec.js:14:3

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('img[src^="data:image"], img[src^="http"]').first().locator('xpath=ancestor::div//button').first()
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for locator('img[src^="data:image"], img[src^="http"]').first().locator('xpath=ancestor::div//button').first()

```

```yaml
- navigation:
  - link "Vivi's Wedding":
    - /url: "#/"
  - list:
    - listitem:
      - link "Home":
        - /url: "#/"
    - listitem:
      - link "Upload":
        - /url: "#/upload"
    - listitem:
      - link "Gallery":
        - /url: "#/gallery"
- main:
  - heading "Guest Gallery" [level=2]
  - text: 0 of 0 photos • 0.00 KB
  - button "Refresh gallery"
  - link "Add Photos":
    - /url: "#/upload"
  - textbox "Search photos..."
  - combobox:
    - option "All Guests" [selected]
  - combobox:
    - option "All Dates" [selected]
  - button "Grid layout"
  - button "Masonry layout"
  - button "Timeline layout"
  - heading "No photos yet" [level=3]
  - paragraph: Be the first to share a moment!
  - link "Upload Photos":
    - /url: "#/upload"
```

# Test source

```ts
  1   | import { test, expect } from '@playwright/test';
  2   | 
  3   | test.describe('Gallery Features', () => {
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
  14  |   test('photo likes feature works and displays', async ({ page }) => {
  15  |     await page.goto('/#/gallery');
  16  |     await page.waitForLoadState('networkidle');
  17  | 
  18  |     // Wait for photos to load
  19  |     await page.waitForTimeout(2000);
  20  | 
  21  |     // Find first photo (supports both legacy data:image and R2 URLs)
  22  |     const firstPhoto = page.locator('img[src^="data:image"], img[src^="http"]').first();
  23  |     const likeButton = firstPhoto.locator('xpath=ancestor::div//button').first();
> 24  |     await expect(likeButton).toBeVisible();
      |                              ^ Error: expect(locator).toBeVisible() failed
  25  | 
  26  |     // Click photo to open lightbox
  27  |     await firstPhoto.click();
  28  | 
  29  |     // Wait for lightbox to open
  30  |     await page.waitForTimeout(1000);
  31  | 
  32  |     // Verify like button is displayed in lightbox
  33  |     const lightboxLikeButton = page.locator('button[title="Like photo"]').first();
  34  |     await expect(lightboxLikeButton).toBeVisible();
  35  | 
  36  |     // Click like button
  37  |     await lightboxLikeButton.click();
  38  | 
  39  |     // Wait for like to process and verify button state changed
  40  |     await page.waitForTimeout(2000);
  41  | 
  42  |     // Close lightbox by clicking on the overlay
  43  |     const lightboxOverlay = page.locator('.fixed.inset-0.z-\\[1000\\]');
  44  |     await lightboxOverlay.click({ position: { x: 10, y: 10 } });
  45  | 
  46  |     console.log('Photo like test completed - like button displayed and functional');
  47  |   });
  48  | 
  49  |   test('photo comments feature works and displays', async ({ page }) => {
  50  |     await page.goto('/#/gallery');
  51  |     await page.waitForLoadState('networkidle');
  52  | 
  53  |     // Wait for photos to load
  54  |     await page.waitForTimeout(2000);
  55  | 
  56  |     // Find first photo (supports both legacy data:image and R2 URLs)
  57  |     const firstPhoto = page.locator('img[src^="data:image"], img[src^="http"]').first();
  58  |     await firstPhoto.click();
  59  | 
  60  |     // Wait for lightbox to open
  61  |     await page.waitForTimeout(1000);
  62  | 
  63  |     // Verify comments button is displayed
  64  |     const commentsButton = page.locator('button[title="Show comments"]').first();
  65  |     await expect(commentsButton).toBeVisible();
  66  | 
  67  |     // Click comments button
  68  |     await commentsButton.click();
  69  | 
  70  |     // Wait for comments panel to open
  71  |     await page.waitForTimeout(1000);
  72  | 
  73  |     // Verify comment input is displayed
  74  |     const commentInput = page.locator('input[placeholder="Add a comment..."]').first();
  75  |     await expect(commentInput).toBeVisible();
  76  | 
  77  |     // Add a comment
  78  |     await commentInput.fill('Test comment from Playwright');
  79  | 
  80  |     const postButton = page.locator('button:has-text("Post")').first();
  81  |     await expect(postButton).toBeVisible();
  82  |     await postButton.click();
  83  | 
  84  |     // Wait for comment to post
  85  |     await page.waitForTimeout(2000);
  86  | 
  87  |     // Close lightbox by clicking on the overlay
  88  |     const lightboxOverlay = page.locator('.fixed.inset-0.z-\\[1000\\]');
  89  |     await lightboxOverlay.click({ position: { x: 10, y: 10 } });
  90  | 
  91  |     console.log('Photo comment test completed - comments UI displayed and functional');
  92  |   });
  93  | 
  94  |   test('multiple photo uploads work', async ({ page }) => {
  95  |     await page.goto('/#/upload');
  96  |     await page.waitForLoadState('networkidle');
  97  |     
  98  |     // Click on the upload area
  99  |     const uploadArea = page.locator('.upload-area, [class*="upload"], [class*="dropzone"]').first();
  100 |     await uploadArea.click();
  101 |     
  102 |     // Get the hidden file input
  103 |     const fileInput = page.locator('input[type="file"]');
  104 |     
  105 |     // Create multiple test images
  106 |     const testImage1 = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');
  107 |     const testImage2 = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABQAYAAABaA+1AAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');
  108 |     
  109 |     // Upload multiple images
  110 |     await fileInput.setInputFiles([
  111 |       {
  112 |         name: 'test1.png',
  113 |         mimeType: 'image/png',
  114 |         buffer: testImage1
  115 |       },
  116 |       {
  117 |         name: 'test2.png',
  118 |         mimeType: 'image/png',
  119 |         buffer: testImage2
  120 |       }
  121 |     ]);
  122 |     
  123 |     // Wait for previews to appear
  124 |     await page.waitForTimeout(2000);
```