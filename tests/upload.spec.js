import { test, expect } from '@playwright/test';

test('photo upload works', async ({ page }) => {
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
  
  // Wait for upload to complete
  await page.waitForTimeout(5000);
  
  // Check current state
  const currentUrl = page.url();
  console.log('Current URL after upload:', currentUrl);
  
  // Take screenshot for debugging
  await page.screenshot({ path: 'upload-test.png' });
});
