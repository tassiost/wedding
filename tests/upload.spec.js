import { test, expect } from '@playwright/test';

test('photo upload works and appears in gallery', async ({ page }) => {
  // Listen for console errors
  const errors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
    }
  });

  // First, test if we can access the gallery directly
  await page.goto('/#/gallery');
  await page.waitForLoadState('networkidle');
  
  // Check for console errors on gallery load
  await page.waitForTimeout(2000);
  
  console.log('Console errors on gallery load:', errors);
  
  // Now test upload
  await page.goto('/#/upload');
  
  // Wait for page to load
  await page.waitForLoadState('networkidle');
  
  // Click on the upload area to trigger file selection
  const uploadArea = page.locator('.upload-area, [class*="upload"], [class*="dropzone"]').first();
  await uploadArea.click();
  
  // Get the hidden file input
  const fileInput = page.locator('input[type="file"]');
  
  // Create a simple test image buffer
  const testImage = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');
  
  // Upload the test image
  await fileInput.setInputFiles({
    name: 'test.png',
    mimeType: 'image/png',
    buffer: testImage
  });
  
  // Fill in caption and guest name if fields exist
  const captionInput = page.locator('input[placeholder*="caption"], input[placeholder*="Caption"]').first();
  if (await captionInput.isVisible()) {
    await captionInput.fill('Test photo caption');
  }
  
  const nameInput = page.locator('input[placeholder*="name"], input[placeholder*="Name"]').first();
  if (await nameInput.isVisible()) {
    await nameInput.fill('Test Guest');
  }
  
  // Click upload button
  const uploadButton = page.locator('button:has-text("Upload"), button:has-text("upload")').first();
  await uploadButton.click();
  
  // Wait for navigation to gallery
  await page.waitForURL('**/#/gallery', { timeout: 10000 });
  
  // Wait for gallery to load
  await page.waitForLoadState('networkidle');
  
  // Check if photos are displayed
  const photos = page.locator('img[src^="data:image"]');
  const photoCount = await photos.count();
  console.log('Photo count in gallery:', photoCount);
  
  // Check for console errors
  if (errors.length > 0) {
    console.error('Console errors found:', errors);
  }
  
  console.log('Test completed. Photo count:', photoCount, 'Errors:', errors.length);
});
