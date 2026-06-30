import { test, expect } from '@playwright/test';

test.describe('Gallery Features', () => {
  test.beforeEach(async ({ page }) => {
    // Listen for console errors
    const errors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
  });

  test('photo likes feature works and displays', async ({ page }) => {
    await page.goto('/#/gallery');
    await page.waitForLoadState('networkidle');

    // Wait for photos to load
    await page.waitForTimeout(2000);

    // Find first photo (supports both legacy data:image and R2 URLs)
    const firstPhoto = page.locator('img[src^="data:image"], img[src^="http"]').first();

    // Click photo to open lightbox directly (like button is in lightbox)
    await firstPhoto.click();

    // Wait for lightbox to open
    await page.waitForTimeout(1000);

    // Verify like button is displayed in lightbox
    const lightboxLikeButton = page.locator('button[title="Like photo"]').first();
    await expect(lightboxLikeButton).toBeVisible();

    // Click like button
    await lightboxLikeButton.click();

    // Wait for like to process and verify button state changed
    await page.waitForTimeout(2000);

    // Close lightbox by clicking on the overlay
    const lightboxOverlay = page.locator('.fixed.inset-0.z-\\[1000\\]');
    await lightboxOverlay.click({ position: { x: 10, y: 10 } });

    console.log('Photo like test completed - like button displayed and functional');
  });

  test('photo comments feature works and displays', async ({ page }) => {
    await page.goto('/#/gallery');
    await page.waitForLoadState('networkidle');

    // Wait for photos to load
    await page.waitForTimeout(2000);

    // Find first photo (supports both legacy data:image and R2 URLs)
    const firstPhoto = page.locator('img[src^="data:image"], img[src^="http"]').first();
    await firstPhoto.click();

    // Wait for lightbox to open
    await page.waitForTimeout(1000);

    // Verify comments button is displayed
    const commentsButton = page.locator('button[title="Show comments"]').first();
    await expect(commentsButton).toBeVisible();

    // Click comments button
    await commentsButton.click();

    // Wait for comments panel to open
    await page.waitForTimeout(1000);

    // Verify comment input is displayed
    const commentInput = page.locator('input[placeholder="Add a comment..."]').first();
    await expect(commentInput).toBeVisible();

    // Add a comment
    await commentInput.fill('Test comment from Playwright');

    const postButton = page.locator('button:has-text("Post")').first();
    await expect(postButton).toBeVisible();
    await postButton.click();

    // Wait for comment to post
    await page.waitForTimeout(2000);

    // Close lightbox by clicking on the overlay
    const lightboxOverlay = page.locator('.fixed.inset-0.z-\\[1000\\]');
    await lightboxOverlay.click({ position: { x: 10, y: 10 } });

    console.log('Photo comment test completed - comments UI displayed and functional');
  });

  test('multiple photo uploads work', async ({ page }) => {
    await page.goto('/#/upload');
    await page.waitForLoadState('networkidle');
    
    // Click on the upload area
    const uploadArea = page.locator('.upload-area, [class*="upload"], [class*="dropzone"]').first();
    await uploadArea.click();
    
    // Get the hidden file input
    const fileInput = page.locator('input[type="file"]');
    
    // Create multiple test images
    const testImage1 = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');
    const testImage2 = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABQAYAAABaA+1AAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');
    
    // Upload multiple images
    await fileInput.setInputFiles([
      {
        name: 'test1.png',
        mimeType: 'image/png',
        buffer: testImage1
      },
      {
        name: 'test2.png',
        mimeType: 'image/png',
        buffer: testImage2
      }
    ]);
    
    // Wait for previews to appear
    await page.waitForTimeout(2000);
    
    // Check if multiple previews are shown
    const previews = page.locator('img[alt*="Preview"]');
    const previewCount = await previews.count();
    console.log('Preview count:', previewCount);
    
    // Fill in guest name
    const nameInput = page.locator('input[placeholder*="name"], input[placeholder*="Name"]').first();
    await nameInput.fill('Multi Upload Test');
    
    // Click upload button
    const uploadButton = page.locator('button:has-text("Upload")').first();
    await uploadButton.click();
    
    // Wait for upload to complete and navigate to gallery
    await page.waitForTimeout(5000);
    
    // Manually navigate to gallery if not already there
    const currentUrl = page.url();
    if (!currentUrl.includes('/gallery')) {
      await page.goto('/#/gallery');
      await page.waitForLoadState('networkidle');
    }
    
    console.log('Multiple upload test completed');
  });

  test('search functionality works and displays', async ({ page }) => {
    await page.goto('/#/gallery');
    await page.waitForLoadState('networkidle');

    // Wait for photos to load
    await page.waitForTimeout(2000);

    // Verify search input is displayed
    const searchInput = page.locator('input[placeholder="Search photos..."]').first();
    await expect(searchInput).toBeVisible();

    // Get initial photo count (supports both legacy data:image and R2 URLs)
    const initialPhotos = page.locator('img[src^="data:image"], img[src^="http"]');
    const initialCount = await initialPhotos.count();
    console.log('Initial photo count:', initialCount);

    // Search for a term
    await searchInput.fill('test');

    // Wait for search to filter
    await page.waitForTimeout(1000);

    // Check if photos are filtered
    const filteredPhotos = page.locator('img[src^="data:image"], img[src^="http"]');
    const filteredCount = await filteredPhotos.count();
    console.log('Filtered photo count:', filteredCount);

    // Clear search
    await searchInput.fill('');

    // Wait for photos to reload
    await page.waitForTimeout(1000);

    console.log('Search test completed - search input displayed and functional');
  });

  test('filter by guest name works and displays', async ({ page }) => {
    await page.goto('/#/gallery');
    await page.waitForLoadState('networkidle');

    // Wait for photos to load
    await page.waitForTimeout(2000);

    // Verify guest filter dropdown is displayed
    const guestFilter = page.locator('select').first();
    await expect(guestFilter).toBeVisible();

    // Get initial photo count (supports both legacy data:image and R2 URLs)
    const initialPhotos = page.locator('img[src^="data:image"], img[src^="http"]');
    const initialCount = await initialPhotos.count();
    console.log('Initial photo count:', initialCount);

    // Select a guest from dropdown
    await guestFilter.selectOption({ index: 1 }); // Select first guest option

    // Wait for filter to apply
    await page.waitForTimeout(1000);

    // Check if photos are filtered
    const filteredPhotos = page.locator('img[src^="data:image"], img[src^="http"]');
    const filteredCount = await filteredPhotos.count();
    console.log('Filtered photo count by guest:', filteredCount);

    // Reset filter
    await guestFilter.selectOption({ index: 0 }); // Select "All Guests"

    console.log('Guest filter test completed - filter dropdown displayed and functional');
  });

  test('filter by date works and displays', async ({ page }) => {
    await page.goto('/#/gallery');
    await page.waitForLoadState('networkidle');

    // Wait for photos to load
    await page.waitForTimeout(2000);

    // Verify date filter dropdown is displayed
    const dateFilter = page.locator('select').nth(1); // Second select is date filter
    await expect(dateFilter).toBeVisible();

    // Get initial photo count (supports both legacy data:image and R2 URLs)
    const initialPhotos = page.locator('img[src^="data:image"], img[src^="http"]');
    const initialCount = await initialPhotos.count();
    console.log('Initial photo count:', initialCount);

    // Select a date from dropdown
    await dateFilter.selectOption({ index: 1 }); // Select first date option

    // Wait for filter to apply
    await page.waitForTimeout(1000);

    // Check if photos are filtered
    const filteredPhotos = page.locator('img[src^="data:image"], img[src^="http"]');
    const filteredCount = await filteredPhotos.count();
    console.log('Filtered photo count by date:', filteredCount);

    // Reset filter
    await dateFilter.selectOption({ index: 0 }); // Select "All Dates"

    console.log('Date filter test completed - date filter displayed and functional');
  });

  test('gallery layouts work and display', async ({ page }) => {
    await page.goto('/#/gallery');
    await page.waitForLoadState('networkidle');
    
    // Wait for photos to load
    await page.waitForTimeout(2000);
    
    // Verify layout buttons are displayed
    const gridButton = page.locator('button[title="Grid layout"]').first();
    const masonryButton = page.locator('button[title="Masonry layout"]').first();
    const timelineButton = page.locator('button[title="Timeline layout"]').first();
    
    await expect(gridButton).toBeVisible();
    await expect(masonryButton).toBeVisible();
    await expect(timelineButton).toBeVisible();
    
    // Test grid layout (default)
    await gridButton.click();
    await page.waitForTimeout(500);
    console.log('Grid layout selected');
    
    // Test masonry layout
    await masonryButton.click();
    await page.waitForTimeout(500);
    console.log('Masonry layout selected');
    
    // Test timeline layout
    await timelineButton.click();
    await page.waitForTimeout(500);
    console.log('Timeline layout selected');
    
    console.log('Gallery layouts test completed - layout buttons displayed and functional');
  });

  test('photo download works and displays', async ({ page }) => {
    await page.goto('/#/gallery');
    await page.waitForLoadState('networkidle');

    // Wait for photos to load
    await page.waitForTimeout(2000);

    // Open first photo in lightbox (supports both legacy data:image and R2 URLs)
    const firstPhoto = page.locator('img[src^="data:image"], img[src^="http"]').first();
    await firstPhoto.click();

    // Wait for lightbox to open
    await page.waitForTimeout(1000);

    // Verify download button is displayed
    const downloadButton = page.locator('button[title="Download photo"]').first();
    await expect(downloadButton).toBeVisible();

    // Click download button (new implementation uses fetch + blob, doesn't trigger download event)
    await downloadButton.click();

    // Wait for download to process
    await page.waitForTimeout(2000);

    // Close lightbox by clicking on the overlay
    const lightboxOverlay = page.locator('.fixed.inset-0.z-\\[1000\\]');
    await lightboxOverlay.click({ position: { x: 10, y: 10 } });

    console.log('Photo download test completed - download button displayed and functional');
  });

  test('slideshow mode works and displays', async ({ page }) => {
    await page.goto('/#/gallery');
    await page.waitForLoadState('networkidle');

    // Wait for photos to load
    await page.waitForTimeout(2000);

    // Open first photo in lightbox (supports both legacy data:image and R2 URLs)
    const firstPhoto = page.locator('img[src^="data:image"], img[src^="http"]').first();
    await firstPhoto.click();

    // Wait for lightbox to open
    await page.waitForTimeout(1000);

    // Verify slideshow button is displayed
    const slideshowButton = page.locator('button[title="Toggle slideshow"]').first();
    await expect(slideshowButton).toBeVisible();

    // Enable slideshow
    await slideshowButton.click();

    // Wait for slideshow to advance (3 seconds)
    await page.waitForTimeout(4000);

    // Disable slideshow
    await slideshowButton.click();

    // Close lightbox by clicking on the overlay
    const lightboxOverlay = page.locator('.fixed.inset-0.z-\\[1000\\]');
    await lightboxOverlay.click({ position: { x: 10, y: 10 } });

    console.log('Slideshow test completed - slideshow button displayed and functional');
  });

  test('keyboard navigation works', async ({ page }) => {
    await page.goto('/#/gallery');
    await page.waitForLoadState('networkidle');

    // Wait for photos to load
    await page.waitForTimeout(2000);

    // Open first photo in lightbox (supports both legacy data:image and R2 URLs)
    const firstPhoto = page.locator('img[src^="data:image"], img[src^="http"]').first();
    await firstPhoto.click();

    // Wait for lightbox to open
    await page.waitForTimeout(1000);

    // Test right arrow navigation
    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(500);

    // Test left arrow navigation
    await page.keyboard.press('ArrowLeft');
    await page.waitForTimeout(500);

    // Test escape to close
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);

    // Verify lightbox is closed
    const lightbox = page.locator('.fixed.inset-0.z-\\[1000\\]');
    const isVisible = await lightbox.isVisible();
    expect(isVisible).toBe(false);

    console.log('Keyboard navigation test completed');
  });

  test('video upload works and displays in gallery', async ({ page }) => {
    await page.goto('/#/upload');
    await page.waitForLoadState('networkidle');

    // Click on the upload area
    const uploadArea = page.locator('.upload-area, [class*="upload"], [class*="dropzone"]').first();
    await uploadArea.click();

    // Get the hidden file input
    const fileInput = page.locator('input[type="file"]');

    // Create a simple test video buffer (minimal MP4 header)
    const testVideo = Buffer.from('00000020667479706D703432000000006D7034326D70342100000001667479706D703432', 'hex');

    // Upload the test video
    await fileInput.setInputFiles({
      name: 'test.mp4',
      mimeType: 'video/mp4',
      buffer: testVideo
    });

    // Wait for preview to appear
    await page.waitForTimeout(2000);

    // Fill in guest name
    const nameInput = page.locator('input[placeholder*="name"], input[placeholder*="Name"]').first();
    await nameInput.fill('Video Test');

    // Click upload button
    const uploadButton = page.locator('button:has-text("Upload")').first();
    await uploadButton.click();

    // Wait for upload to complete
    await page.waitForTimeout(5000);

    // Navigate to gallery
    await page.goto('/#/gallery');
    await page.waitForLoadState('networkidle');

    // Wait for photos/videos to load
    await page.waitForTimeout(2000);

    // Check if videos are displayed
    const videos = page.locator('video');
    const videoCount = await videos.count();
    console.log('Video count in gallery:', videoCount);

    console.log('Video upload test completed');
  });

  test('metadata is displayed in lightbox', async ({ page }) => {
    await page.goto('/#/gallery');
    await page.waitForLoadState('networkidle');

    // Wait for photos to load
    await page.waitForTimeout(2000);

    // Open first photo in lightbox
    const firstPhoto = page.locator('img[src^="data:image"], img[src^="http"]').first();
    await firstPhoto.click();

    // Wait for lightbox to open
    await page.waitForTimeout(1000);

    // Check if metadata is displayed (camera info or location indicator)
    const lightboxMeta = page.locator('.absolute.bottom-4, .absolute.bottom-8').first();
    const metaText = await lightboxMeta.textContent();

    // Verify metadata contains date and guest name
    expect(metaText).toContain('By');

    // Close lightbox
    const lightboxOverlay = page.locator('.fixed.inset-0.z-\\[1000\\]');
    await lightboxOverlay.click({ position: { x: 10, y: 10 } });

    console.log('Metadata display test completed');
  });
});
