import { test, expect } from '@playwright/test';

test('property list page loads correctly', async ({ page }) => {
  await page.goto('/properties');
  await expect(page.locator('h1')).toContainText('物件一覧');
  await expect(page.locator('table')).toBeVisible();
});

test('property detail page loads correctly', async ({ page }) => {
  await page.goto('/properties/550e8400-e29b-41d4-a716-446655440000');
  await expect(page.locator('h1')).toBeVisible();
  await expect(page.locator('role=tab')).toBeVisible();
});
