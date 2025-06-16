import { test, expect } from '@playwright/test';

test.describe('Loans', () => {
  test('loan list page loads correctly', async ({ page }) => {
    await page.goto('/loans');

    // ページタイトルの確認
    await expect(page.locator('h1')).toContainText('借入一覧');

    // 検索ボックスの確認
    const searchInput = page.getByPlaceholder('ローン名や物件名で検索...');
    await expect(searchInput).toBeVisible();

    // フィルターの確認
    const propertyFilter = page.locator('select').first();
    await expect(propertyFilter).toBeVisible();

    // 追加ボタンの確認
    const addButton = page.getByRole('button', { name: '+ 借入を追加' });
    await expect(addButton).toBeVisible();

    // テーブルヘッダーの確認
    await expect(page.getByRole('columnheader', { name: 'ローン名' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: '物件' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: '残高' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: '金利' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: '月額返済' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: '次回支払日' })).toBeVisible();
  });

  test('can filter loans by property', async ({ page }) => {
    await page.goto('/loans');

    // フィルターで物件を選択
    const propertyFilter = page.locator('select').first();
    await propertyFilter.selectOption('青山マンション');

    // フィルター結果の確認
    const rows = page.locator('tbody tr');
    await expect(rows).toHaveCount(1);
    await expect(rows.first()).toContainText('青山マンション');
  });

  test('can search loans', async ({ page }) => {
    await page.goto('/loans');

    // 検索
    const searchInput = page.getByPlaceholder('ローン名や物件名で検索...');
    await searchInput.fill('新宿');

    // 検索結果の確認
    const rows = page.locator('tbody tr');
    await expect(rows).toHaveCount(1);
    await expect(rows.first()).toContainText('新宿ビル');
  });

  test('can navigate to loan detail', async ({ page }) => {
    await page.goto('/loans');

    // 最初のローンをクリック
    await page.locator('tbody tr').first().click();

    // 詳細ページへの遷移を確認
    await expect(page).toHaveURL(/\/loans\/loan-001$/);

    // 詳細ページの内容を確認
    await expect(page.locator('h1')).toContainText('青山マンションローン');

    // 借入情報カードの確認
    await expect(page.getByText('物件')).toBeVisible();
    await expect(page.getByText('青山マンション')).toBeVisible();

    // 返済状況カードの確認
    await expect(page.getByText('残債')).toBeVisible();
    await expect(page.getByText('¥75,000,000')).toBeVisible();

    // 返済方式の確認
    await expect(page.getByText('返済方式')).toBeVisible();
    await expect(page.getByText('元利均等')).toBeVisible();

    // 返済履歴テーブルの確認
    await expect(page.getByText('返済履歴')).toBeVisible();

    // 戻るボタンの確認
    const backButton = page
      .locator('button')
      .filter({ has: page.locator('svg') })
      .first();
    await expect(backButton).toBeVisible();
  });

  test('can navigate back from loan detail', async ({ page }) => {
    await page.goto('/loans/loan-001');

    // 戻るボタンをクリック
    const backButton = page
      .locator('button')
      .filter({ has: page.locator('svg') })
      .first();
    await backButton.click();

    // 一覧ページに戻ることを確認
    await expect(page).toHaveURL('/loans');
    await expect(page.locator('h1')).toContainText('借入一覧');
  });

  test('can sort loans', async ({ page }) => {
    await page.goto('/loans');

    // 残高でソート
    await page.getByRole('columnheader', { name: '残高' }).click();

    // ソート結果の確認（降順）
    const firstRow = page.locator('tbody tr').first();
    await expect(firstRow).toContainText('池袋マンション'); // 最高額

    // もう一度クリックして昇順にする
    await page.getByRole('columnheader', { name: '残高' }).click();

    // ソート結果の確認（昇順）
    const firstRowAsc = page.locator('tbody tr').first();
    await expect(firstRowAsc).toContainText('上野アパート'); // 最低額
  });
});
