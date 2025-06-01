import { test, expect } from '@playwright/test';

test.describe('Room Detail', () => {
  // モックデータから実際のIDを使用
  const propertyId = 'prop-001';
  const roomId = 'unit-001';

  test('room detail page loads correctly', async ({ page }) => {
    await page.goto(`/properties/${propertyId}/${roomId}`);

    // ページタイトルの確認
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('h1')).toContainText('青山マンション');
    await expect(page.locator('h1')).toContainText('101');

    // ナビゲーションボタンの確認
    await expect(page.locator('text=物件詳細に戻る')).toBeVisible();
  });

  test('displays room basic information correctly', async ({ page }) => {
    await page.goto(`/properties/${propertyId}/${roomId}`);

    // 基本情報カードの確認
    await expect(page.locator('text=基本情報')).toBeVisible();
    await expect(page.locator('text=部屋番号')).toBeVisible();
    await expect(page.locator('text=タイプ')).toBeVisible();
    await expect(page.locator('text=面積')).toBeVisible();
    await expect(page.locator('text=現在の家賃')).toBeVisible();

    // 実際の値の確認
    await expect(page.locator('p:has-text("101")').first()).toBeVisible();
    await expect(page.locator('text=住居')).toBeVisible();
    await expect(page.locator('text=45.5㎡')).toBeVisible();
  });

  test('displays contract information for occupied rooms', async ({ page }) => {
    await page.goto(`/properties/${propertyId}/${roomId}`);

    // 契約情報カードの確認（入居中の場合）
    await expect(page.locator('text=現在の契約情報')).toBeVisible();
    await expect(page.locator('text=入居者名')).toBeVisible();
    await expect(page.locator('text=契約開始日')).toBeVisible();
    await expect(page.locator('text=契約終了日')).toBeVisible();

    // 実際の入居者情報の確認
    await expect(page.locator('p:has-text("田中 太郎")').first()).toBeVisible();
  });

  test('displays rent history correctly', async ({ page }) => {
    await page.goto(`/properties/${propertyId}/${roomId}`);

    // 家賃履歴カードの確認
    await expect(page.locator('h3:has-text("家賃履歴")')).toBeVisible();
    await expect(page.locator('p.text-sm.text-text-muted:has-text("契約開始")')).toBeVisible();

    // 履歴エントリの確認
    const historyEntries = page.locator('[class*="border p-3"]');
    await expect(historyEntries).not.toHaveCount(0);
  });

  test('displays lease history correctly', async ({ page }) => {
    await page.goto(`/properties/${propertyId}/${roomId}`);

    // 入退去履歴カードの確認
    await expect(page.locator('text=入退去履歴')).toBeVisible();

    // 履歴エントリの確認
    await expect(page.locator('p:has-text("田中 太郎")').first()).toBeVisible();
    await expect(page.locator('span:has-text("入居中")').first()).toBeVisible();
  });

  test('can navigate back to property detail', async ({ page }) => {
    await page.goto(`/properties/${propertyId}/${roomId}`);

    // 戻るボタンをクリック
    await page.click('text=物件詳細に戻る');

    // 物件詳細ページに遷移することを確認
    await page.waitForURL(`**/properties/${propertyId}`);
    await expect(page.url()).toContain(`/properties/${propertyId}`);
    await expect(page.url()).not.toContain(`/${roomId}`);
  });

  test('action buttons are visible', async ({ page }) => {
    await page.goto(`/properties/${propertyId}/${roomId}`);

    // アクションボタンの確認
    await expect(page.locator('text=家賃変更')).toBeVisible();
    await expect(page.locator('text=入退去登録')).toBeVisible();
  });

  test('handles invalid room id gracefully', async ({ page }) => {
    await page.goto(`/properties/${propertyId}/invalid-room-id`);

    // エラーメッセージの確認
    await expect(page.locator('text=部屋が見つかりません')).toBeVisible();
    await expect(page.locator('text=物件詳細に戻る')).toBeVisible();
  });
});
