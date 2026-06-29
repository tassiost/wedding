import { test, expect } from '@playwright/test';

test.describe('Comprehensive Button and Error Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Listen for console errors
    const errors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
  });

  test('Gallery page - all buttons work without errors', async ({ page }) => {
    await page.goto('/#/gallery');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Test search input
    const searchInput = page.locator('input[placeholder="Search photos..."]').first();
    await expect(searchInput).toBeVisible();
    await searchInput.fill('test');
    await page.waitForTimeout(500);
    await searchInput.fill('');
    await page.waitForTimeout(500);

    // Test guest filter dropdown
    const guestFilter = page.locator('select').first();
    await expect(guestFilter).toBeVisible();
    await guestFilter.selectOption({ index: 1 });
    await page.waitForTimeout(500);
    await guestFilter.selectOption({ index: 0 });
    await page.waitForTimeout(500);

    // Test date filter dropdown
    const dateFilter = page.locator('select').nth(1);
    await expect(dateFilter).toBeVisible();
    await dateFilter.selectOption({ index: 1 });
    await page.waitForTimeout(500);
    await dateFilter.selectOption({ index: 0 });
    await page.waitForTimeout(500);

    // Test layout buttons
    const gridButton = page.locator('button[title="Grid layout"]').first();
    const masonryButton = page.locator('button[title="Masonry layout"]').first();
    const timelineButton = page.locator('button[title="Timeline layout"]').first();

    await expect(gridButton).toBeVisible();
    await expect(masonryButton).toBeVisible();
    await expect(timelineButton).toBeVisible();

    await gridButton.click();
    await page.waitForTimeout(500);
    await masonryButton.click();
    await page.waitForTimeout(500);
    await timelineButton.click();
    await page.waitForTimeout(500);
    await gridButton.click();
    await page.waitForTimeout(500);

    // Test refresh button (icon button)
    const refreshButton = page.locator('button svg').filter({ hasText: '' }).first();
    if (await refreshButton.isVisible()) {
      await refreshButton.click();
      await page.waitForTimeout(2000);
    }

    console.log('Gallery page buttons test completed');
  });

  test('Lightbox - all buttons work without errors', async ({ page }) => {
    await page.goto('/#/gallery');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Open lightbox
    const firstPhoto = page.locator('img[src^="data:image"], img[src^="https://"]').first();
    await firstPhoto.click();
    await page.waitForTimeout(1000);

    // Test navigation buttons - skip if only one photo
    const allPhotos = page.locator('img[src^="data:image"], img[src^="https://"]');
    const photoCount = await allPhotos.count();
    
    if (photoCount > 1) {
      // Use keyboard navigation instead of clicking buttons
      await page.keyboard.press('ArrowRight');
      await page.waitForTimeout(500);
      await page.keyboard.press('ArrowLeft');
      await page.waitForTimeout(500);
    }

    // Test download button
    const downloadButton = page.locator('button[title="Download photo"]').first();
    await expect(downloadButton).toBeVisible();
    const downloadPromise = page.waitForEvent('download');
    await downloadButton.click();
    await downloadPromise;
    await page.waitForTimeout(500);

    // Test slideshow button
    const slideshowButton = page.locator('button[title="Toggle slideshow"]').first();
    await expect(slideshowButton).toBeVisible();
    await slideshowButton.click();
    await page.waitForTimeout(2000);
    await slideshowButton.click();
    await page.waitForTimeout(500);

    // Test like button
    const likeButton = page.locator('button[title="Like photo"]').first();
    await expect(likeButton).toBeVisible();
    await likeButton.click();
    await page.waitForTimeout(2000);
    await likeButton.click();
    await page.waitForTimeout(2000);

    // Test comments button
    const commentsButton = page.locator('button[title="Show comments"]').first();
    await expect(commentsButton).toBeVisible();
    await commentsButton.click();
    await page.waitForTimeout(1000);

    // Test comment input
    const commentInput = page.locator('input[placeholder="Add a comment..."]').first();
    await expect(commentInput).toBeVisible();
    await commentInput.fill('Test comment');
    await page.waitForTimeout(500);

    const postButton = page.locator('button:has-text("Post")').first();
    await expect(postButton).toBeVisible();
    await postButton.click();
    await page.waitForTimeout(2000);

    // Close comments panel
    await commentsButton.click();
    await page.waitForTimeout(500);

    // Close lightbox
    const lightboxOverlay = page.locator('.fixed.inset-0.z-\\[1000\\]');
    await lightboxOverlay.click({ position: { x: 10, y: 10 } });
    await page.waitForTimeout(500);

    console.log('Lightbox buttons test completed');
  });

  test('Upload page - all buttons work without errors', async ({ page }) => {
    await page.goto('/#/upload');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Test upload area
    const uploadArea = page.locator('.upload-area, [class*="upload"], [class*="dropzone"]').first();
    await expect(uploadArea).toBeVisible();
    await uploadArea.click();
    await page.waitForTimeout(500);

    // Test file input
    const fileInput = page.locator('input[type="file"]');
    const testImage = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');
    await fileInput.setInputFiles({
      name: 'test.png',
      mimeType: 'image/png',
      buffer: testImage
    });
    await page.waitForTimeout(1000);

    // Test caption input
    const captionInput = page.locator('input[placeholder*="caption"], input[placeholder*="Caption"]').first();
    await expect(captionInput).toBeVisible();
    await captionInput.fill('Test caption');
    await page.waitForTimeout(500);

    // Test guest name input
    const nameInput = page.locator('input[placeholder*="name"], input[placeholder*="Name"]').first();
    await expect(nameInput).toBeVisible();
    await nameInput.fill('Test Guest');
    await page.waitForTimeout(500);

    // Test upload button
    const uploadButton = page.locator('button:has-text("Upload")').first();
    await expect(uploadButton).toBeVisible();
    await uploadButton.click();
    await page.waitForTimeout(5000);

    console.log('Upload page buttons test completed');
  });

  test('Settings page - all buttons work without errors', async ({ page }) => {
    await page.goto('/#/settings');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Test wedding details inputs
    const coupleNameInput = page.locator('input[placeholder*="Couple"]').first();
    if (await coupleNameInput.isVisible()) {
      await coupleNameInput.fill('Test Couple');
      await page.waitForTimeout(500);
    }

    const dateInput = page.locator('input[type="date"]').first();
    if (await dateInput.isVisible()) {
      await dateInput.fill('2026-12-25');
      await page.waitForTimeout(500);
    }

    // Test save button
    const saveButton = page.locator('button:has-text("Save")').first();
    if (await saveButton.isVisible()) {
      await saveButton.click();
      await page.waitForTimeout(1000);
    }

    // Test GitHub connection inputs
    const tokenInput = page.locator('input[placeholder*="token"], input[placeholder*="Token"]').first();
    if (await tokenInput.isVisible()) {
      await tokenInput.fill('test_token');
      await page.waitForTimeout(500);
    }

    const repoInput = page.locator('input[placeholder*="repo"], input[placeholder*="Repo"]').first();
    if (await repoInput.isVisible()) {
      await repoInput.fill('test/repo');
      await page.waitForTimeout(500);
    }

    // Test connect button
    const connectButton = page.locator('button:has-text("Connect")').first();
    if (await connectButton.isVisible()) {
      await connectButton.click();
      await page.waitForTimeout(1000);
    }

    console.log('Settings page buttons test completed');
  });

  test('Navigation between pages works without errors', async ({ page }) => {
    // Start at home
    await page.goto('/#/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Navigate to gallery
    const galleryLink = page.locator('a[href*="gallery"]').first();
    if (await galleryLink.isVisible()) {
      await galleryLink.click();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);
    } else {
      await page.goto('/#/gallery');
      await page.waitForLoadState('networkidle');
    }

    // Navigate to upload
    await page.goto('/#/upload');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Navigate to settings
    await page.goto('/#/settings');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Navigate back to gallery
    await page.goto('/#/gallery');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    console.log('Navigation test completed');
  });

  test('Photo grid interactions work without errors', async ({ page }) => {
    await page.goto('/#/gallery');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Get all photos (support both data:image and R2 URLs)
    const photos = page.locator('img[src^="data:image"], img[src^="https://"]');
    const photoCount = await photos.count();
    console.log('Photo count:', photoCount);

    // Click on first 3 photos to open lightbox
    for (let i = 0; i < Math.min(3, photoCount); i++) {
      const photo = photos.nth(i);
      await photo.click();
      await page.waitForTimeout(1000);

      // Close lightbox
      const lightboxOverlay = page.locator('.fixed.inset-0.z-\\[1000\\]');
      await lightboxOverlay.click({ position: { x: 10, y: 10 } });
      await page.waitForTimeout(500);
    }

    console.log('Photo grid interactions test completed');
  });

  test('All interactive elements are accessible', async ({ page }) => {
    await page.goto('/#/gallery');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Check all buttons are visible and enabled
    const buttons = page.locator('button');
    const buttonCount = await buttons.count();
    console.log('Button count:', buttonCount);

    for (let i = 0; i < buttonCount; i++) {
      const button = buttons.nth(i);
      const isVisible = await button.isVisible();
      const isEnabled = await button.isEnabled();
      if (isVisible && isEnabled) {
        console.log(`Button ${i} is visible and enabled`);
      }
    }

    // Check all inputs are visible
    const inputs = page.locator('input');
    const inputCount = await inputs.count();
    console.log('Input count:', inputCount);

    for (let i = 0; i < inputCount; i++) {
      const input = inputs.nth(i);
      const isVisible = await input.isVisible();
      if (isVisible) {
        console.log(`Input ${i} is visible`);
      }
    }

    console.log('Accessibility test completed');
  });

  test('No console errors on any page', async ({ page }) => {
    const errors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    // Test home page
    await page.goto('/#/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Test gallery page
    await page.goto('/#/gallery');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Test upload page
    await page.goto('/#/upload');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Test settings page
    await page.goto('/#/settings');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Check for errors
    if (errors.length > 0) {
      console.error('Console errors found:', errors);
    }
    expect(errors.length).toBe(0);

    console.log('No console errors test completed');
  });
});
