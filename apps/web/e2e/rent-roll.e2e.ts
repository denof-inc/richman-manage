import { test, expect } from '@playwright/test';

test.describe('Rent Roll', () => {
  test('rent roll list page loads correctly', async ({ page }) => {
    await page.goto('/rent-roll');

    // ページタイトルの確認
    await expect(page.locator('h1')).toContainText('レントロール');

    // 統計サマリーカードの確認
    await expect(page.locator('text=総戸数')).toBeVisible();
    await expect(page.locator('text=入居中')).toBeVisible();
    await expect(page.locator('text=空室')).toBeVisible();
    await expect(page.locator('text=入居率')).toBeVisible();

    // フィルター機能の確認
    await expect(page.locator('text=フィルター')).toBeVisible();
    await expect(page.locator('select').first()).toBeVisible();

    // 表示切替ボタンの確認
    await expect(page.locator('text=物件別表示')).toBeVisible();
    await expect(page.locator('text=詳細表示')).toBeVisible();

    // テーブルまたはカードの確認
    await expect(page.locator('[class*="Card"]').first()).toBeVisible();
  });

  test('can switch between display modes', async ({ page }) => {
    await page.goto('/rent-roll');

    // 詳細表示に切り替え
    await page.click('text=詳細表示');
    await expect(page.locator('text=レントロール一覧')).toBeVisible();

    // 物件別表示に切り替え
    await page.click('text=物件別表示');
    await expect(page.locator('text=物件別レントロール')).toBeVisible();
  });

  test('can filter units', async ({ page }) => {
    await page.goto('/rent-roll');

    // 入居状況でフィルタ
    const statusFilter = page.locator('select').nth(1);
    await statusFilter.selectOption('occupied');

    // フィルタ結果の確認（入居中のみ表示）
    await expect(page.locator('text=入居中')).toBeVisible();
  });

  test('can navigate to room detail', async ({ page }) => {
    await page.goto('/rent-roll');

    // 詳細表示モードに切り替え
    await page.click('text=詳細表示');

    // 最初の詳細ボタンをクリック
    const detailButton = page.locator('text=詳細').first();
    await detailButton.click();

    // 部屋詳細ページに遷移することを確認
    await expect(page.url()).toMatch(/\/properties\/[^\/]+\/[^\/]+$/);
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('text=物件詳細に戻る')).toBeVisible();
  });
});
