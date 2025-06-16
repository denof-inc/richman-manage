# Test info

- Name: Loans >> can sort loans
- Location: /Users/tttela/Documents/Work/denof/works/250428richman-manage/dev/richman-manage/apps/web/e2e/loans.e2e.ts:107:7

# Error details

```
Error: locator.click: Test timeout of 30000ms exceeded.
Call log:
  - waiting for getByRole('columnheader', { name: '残高' })

    at /Users/tttela/Documents/Work/denof/works/250428richman-manage/dev/richman-manage/apps/web/e2e/loans.e2e.ts:111:58
```

# Page snapshot

```yaml
- banner:
  - link "リッチマンManage":
    - /url: /
  - navigation:
    - link "物件一覧":
      - /url: /properties
    - link "レントロール":
      - /url: /rent-roll
    - link "借入一覧":
      - /url: /loans
  - combobox:
    - option "個人所有" [selected]
    - option "法人所有"
  - button "ユーザー設定"
  - link "ログアウト":
    - /url: /login
    - button "ログアウト"
- main:
  - heading "借入一覧" [level=1]
  - combobox:
    - option "すべての物件" [selected]
    - option "青山マンション"
    - option "渋谷アパート"
    - option "新宿ビル"
    - option "池袋マンション"
    - option "上野アパート"
  - button "+ 借入を追加"
  - textbox "ローン名や物件名で検索..."
  - table:
    - rowgroup:
      - row "金融機関 ↑ 物件 借入額 金利 期間 開始日 月額返済 残債":
        - cell "金融機関 ↑"
        - cell "物件"
        - cell "借入額"
        - cell "金利"
        - cell "期間"
        - cell "開始日"
        - cell "月額返済"
        - cell "残債"
    - rowgroup:
      - row "みずほ銀行 渋谷アパート ￥100,000,000 2%(固定) 30年 2021/1/15 ￥200,000 ￥90,000,000":
        - cell "みずほ銀行"
        - cell "渋谷アパート"
        - cell "￥100,000,000"
        - cell "2%(固定)"
        - cell "30年"
        - cell "2021/1/15"
        - cell "￥200,000"
        - cell "￥90,000,000"
      - row "りそな銀行 池袋マンション ￥180,000,000 1.8%(固定) 35年 2019/3/1 ￥400,000 ￥160,000,000":
        - cell "りそな銀行"
        - cell "池袋マンション"
        - cell "￥180,000,000"
        - cell "1.8%(固定)"
        - cell "35年"
        - cell "2019/3/1"
        - cell "￥400,000"
        - cell "￥160,000,000"
      - row "三井住友銀行 新宿ビル ￥150,000,000 2.5%(変動) 25年 2022/6/1 ￥350,000 ￥140,000,000":
        - cell "三井住友銀行"
        - cell "新宿ビル"
        - cell "￥150,000,000"
        - cell "2.5%(変動)"
        - cell "25年"
        - cell "2022/6/1"
        - cell "￥350,000"
        - cell "￥140,000,000"
      - row "三菱UFJ銀行 青山マンション ￥80,000,000 1.5%(変動) 35年 2020/4/1 ￥210,000 ￥75,000,000":
        - cell "三菱UFJ銀行"
        - cell "青山マンション"
        - cell "￥80,000,000"
        - cell "1.5%(変動)"
        - cell "35年"
        - cell "2020/4/1"
        - cell "￥210,000"
        - cell "￥75,000,000"
      - row "横浜銀行 上野アパート ￥65,000,000 2.2%(変動) 20年 2021/9/1 ￥150,000 ￥60,000,000":
        - cell "横浜銀行"
        - cell "上野アパート"
        - cell "￥65,000,000"
        - cell "2.2%(変動)"
        - cell "20年"
        - cell "2021/9/1"
        - cell "￥150,000"
        - cell "￥60,000,000"
- alert
- button "Open Next.js Dev Tools":
  - img
```

# Test source

```ts
   11 |     const searchInput = page.getByPlaceholder('ローン名や物件名で検索...');
   12 |     await expect(searchInput).toBeVisible();
   13 |
   14 |     // フィルターの確認
   15 |     const propertyFilter = page.locator('select').first();
   16 |     await expect(propertyFilter).toBeVisible();
   17 |
   18 |     // 追加ボタンの確認
   19 |     const addButton = page.getByRole('button', { name: '+ 借入を追加' });
   20 |     await expect(addButton).toBeVisible();
   21 |
   22 |     // テーブルヘッダーの確認
   23 |     await expect(page.getByRole('columnheader', { name: 'ローン名' })).toBeVisible();
   24 |     await expect(page.getByRole('columnheader', { name: '物件' })).toBeVisible();
   25 |     await expect(page.getByRole('columnheader', { name: '残高' })).toBeVisible();
   26 |     await expect(page.getByRole('columnheader', { name: '金利' })).toBeVisible();
   27 |     await expect(page.getByRole('columnheader', { name: '月額返済' })).toBeVisible();
   28 |     await expect(page.getByRole('columnheader', { name: '次回支払日' })).toBeVisible();
   29 |   });
   30 |
   31 |   test('can filter loans by property', async ({ page }) => {
   32 |     await page.goto('/loans');
   33 |
   34 |     // フィルターで物件を選択
   35 |     const propertyFilter = page.locator('select').first();
   36 |     await propertyFilter.selectOption('青山マンション');
   37 |
   38 |     // フィルター結果の確認
   39 |     const rows = page.locator('tbody tr');
   40 |     await expect(rows).toHaveCount(1);
   41 |     await expect(rows.first()).toContainText('青山マンション');
   42 |   });
   43 |
   44 |   test('can search loans', async ({ page }) => {
   45 |     await page.goto('/loans');
   46 |
   47 |     // 検索
   48 |     const searchInput = page.getByPlaceholder('ローン名や物件名で検索...');
   49 |     await searchInput.fill('新宿');
   50 |
   51 |     // 検索結果の確認
   52 |     const rows = page.locator('tbody tr');
   53 |     await expect(rows).toHaveCount(1);
   54 |     await expect(rows.first()).toContainText('新宿ビル');
   55 |   });
   56 |
   57 |   test('can navigate to loan detail', async ({ page }) => {
   58 |     await page.goto('/loans');
   59 |
   60 |     // 最初のローンをクリック
   61 |     await page.locator('tbody tr').first().click();
   62 |
   63 |     // 詳細ページへの遷移を確認
   64 |     await expect(page).toHaveURL(/\/loans\/loan-001$/);
   65 |
   66 |     // 詳細ページの内容を確認
   67 |     await expect(page.locator('h1')).toContainText('青山マンションローン');
   68 |
   69 |     // 借入情報カードの確認
   70 |     await expect(page.getByText('物件')).toBeVisible();
   71 |     await expect(page.getByText('青山マンション')).toBeVisible();
   72 |
   73 |     // 返済状況カードの確認
   74 |     await expect(page.getByText('残債')).toBeVisible();
   75 |     await expect(page.getByText('¥75,000,000')).toBeVisible();
   76 |
   77 |     // 返済方式の確認
   78 |     await expect(page.getByText('返済方式')).toBeVisible();
   79 |     await expect(page.getByText('元利均等')).toBeVisible();
   80 |
   81 |     // 返済履歴テーブルの確認
   82 |     await expect(page.getByText('返済履歴')).toBeVisible();
   83 |
   84 |     // 戻るボタンの確認
   85 |     const backButton = page
   86 |       .locator('button')
   87 |       .filter({ has: page.locator('svg') })
   88 |       .first();
   89 |     await expect(backButton).toBeVisible();
   90 |   });
   91 |
   92 |   test('can navigate back from loan detail', async ({ page }) => {
   93 |     await page.goto('/loans/loan-001');
   94 |
   95 |     // 戻るボタンをクリック
   96 |     const backButton = page
   97 |       .locator('button')
   98 |       .filter({ has: page.locator('svg') })
   99 |       .first();
  100 |     await backButton.click();
  101 |
  102 |     // 一覧ページに戻ることを確認
  103 |     await expect(page).toHaveURL('/loans');
  104 |     await expect(page.locator('h1')).toContainText('借入一覧');
  105 |   });
  106 |
  107 |   test('can sort loans', async ({ page }) => {
  108 |     await page.goto('/loans');
  109 |
  110 |     // 残高でソート
> 111 |     await page.getByRole('columnheader', { name: '残高' }).click();
      |                                                          ^ Error: locator.click: Test timeout of 30000ms exceeded.
  112 |
  113 |     // ソート結果の確認（降順）
  114 |     const firstRow = page.locator('tbody tr').first();
  115 |     await expect(firstRow).toContainText('池袋マンション'); // 最高額
  116 |
  117 |     // もう一度クリックして昇順にする
  118 |     await page.getByRole('columnheader', { name: '残高' }).click();
  119 |
  120 |     // ソート結果の確認（昇順）
  121 |     const firstRowAsc = page.locator('tbody tr').first();
  122 |     await expect(firstRowAsc).toContainText('上野アパート'); // 最低額
  123 |   });
  124 | });
  125 |
```