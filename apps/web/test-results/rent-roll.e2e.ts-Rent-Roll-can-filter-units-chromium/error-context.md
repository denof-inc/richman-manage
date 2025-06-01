# Test info

- Name: Rent Roll >> can filter units
- Location: /Users/tttela/Documents/Work/denof/works/250428richman-manage/dev/richman-manage/apps/web/e2e/rent-roll.e2e.ts:40:7

# Error details

```
Error: locator.selectOption: Test timeout of 30000ms exceeded.
Call log:
  - waiting for locator('select').nth(1)
    - locator resolved to <select class="w-full rounded border border-border-default px-3 py-2 text-sm">…</select>
  - attempting select option action
    2 × waiting for element to be visible and enabled
      - did not find some options
    - retrying select option action
    - waiting 20ms
    2 × waiting for element to be visible and enabled
      - did not find some options
    - retrying select option action
      - waiting 100ms
    58 × waiting for element to be visible and enabled
       - did not find some options
     - retrying select option action
       - waiting 500ms

    at /Users/tttela/Documents/Work/denof/works/250428richman-manage/dev/richman-manage/apps/web/e2e/rent-roll.e2e.ts:45:24
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
  - heading "レントロール" [level=1]
  - paragraph: 全物件の入居状況と家賃情報を管理
  - paragraph: 総戸数
  - paragraph: "12"
  - paragraph: 入居中
  - paragraph: "8"
  - paragraph: 空室
  - paragraph: "4"
  - paragraph: 入居率
  - paragraph: 66.7%
  - heading "フィルター" [level=3]
  - text: 物件
  - combobox:
    - option "すべて" [selected]
    - option "青山マンション"
    - option "渋谷アパート"
    - option "新宿オフィス"
  - text: 入居状況
  - combobox:
    - option "すべて" [selected]
    - option "入居中"
    - option "空室"
  - text: タイプ
  - combobox:
    - option "すべて" [selected]
    - option "住居"
    - option "店舗"
    - option "駐車場"
    - option "自販機"
    - option "ソーラー"
  - button "物件別表示"
  - button "詳細表示"
  - heading "物件別レントロール (3物件)" [level=3]
  - text: "月間家賃収入: ￥1,860,000"
  - heading "青山マンション" [level=3]
  - text: "入居率: 66.7% (4/6室) 想定満室家賃: ￥800,000 現況満室家賃: ￥585,000"
  - table:
    - rowgroup:
      - row "部屋 タイプ 状況 面積 家賃 入居者 契約期間 操作":
        - cell "部屋"
        - cell "タイプ"
        - cell "状況"
        - cell "面積"
        - cell "家賃"
        - cell "入居者"
        - cell "契約期間"
        - cell "操作"
    - rowgroup:
      - row "101 住居 入居中 45.5㎡ 1LDK ￥180,000 田中 太郎 2023年4月1日 〜 2025年3月31日 詳細":
        - cell "101"
        - cell "住居"
        - cell "入居中"
        - cell "45.5㎡ 1LDK"
        - cell "￥180,000"
        - cell "田中 太郎"
        - cell "2023年4月1日 〜 2025年3月31日"
        - cell "詳細":
          - link "詳細":
            - /url: /properties/prop-001/unit-001
            - button "詳細"
      - row "102 住居 空室 50㎡ 1LDK ￥190,000 - - 詳細":
        - cell "102"
        - cell "住居"
        - cell "空室"
        - cell "50㎡ 1LDK"
        - cell "￥190,000"
        - cell "-"
        - cell "-"
        - cell "詳細":
          - link "詳細":
            - /url: /properties/prop-001/unit-002
            - button "詳細"
      - row "201 住居 入居中 45.5㎡ 1LDK ￥185,000 佐藤 花子 2023年7月1日 〜 2025年6月30日 詳細":
        - cell "201"
        - cell "住居"
        - cell "入居中"
        - cell "45.5㎡ 1LDK"
        - cell "￥185,000"
        - cell "佐藤 花子"
        - cell "2023年7月1日 〜 2025年6月30日"
        - cell "詳細":
          - link "詳細":
            - /url: /properties/prop-001/unit-003
            - button "詳細"
      - row "202 住居 入居中 50㎡ 1LDK ￥195,000 山田 次郎 2024年1月1日 〜 2025年12月31日 詳細":
        - cell "202"
        - cell "住居"
        - cell "入居中"
        - cell "50㎡ 1LDK"
        - cell "￥195,000"
        - cell "山田 次郎"
        - cell "2024年1月1日 〜 2025年12月31日"
        - cell "詳細":
          - link "詳細":
            - /url: /properties/prop-001/unit-004
            - button "詳細"
      - row "P1 駐車場 入居中 - ￥25,000 田中 太郎 2023年4月1日 〜 2025年3月31日 詳細":
        - cell "P1"
        - cell "駐車場"
        - cell "入居中"
        - cell "-"
        - cell "￥25,000"
        - cell "田中 太郎"
        - cell "2023年4月1日 〜 2025年3月31日"
        - cell "詳細":
          - link "詳細":
            - /url: /properties/prop-001/unit-011
            - button "詳細"
      - row "P2 駐車場 空室 - ￥25,000 - - 詳細":
        - cell "P2"
        - cell "駐車場"
        - cell "空室"
        - cell "-"
        - cell "￥25,000"
        - cell "-"
        - cell "-"
        - cell "詳細":
          - link "詳細":
            - /url: /properties/prop-001/unit-012
            - button "詳細"
  - heading "渋谷アパート" [level=3]
  - text: "入居率: 75.0% (3/4室) 想定満室家賃: ￥1,110,000 現況満室家賃: ￥825,000"
  - table:
    - rowgroup:
      - row "部屋 タイプ 状況 面積 家賃 入居者 契約期間 操作":
        - cell "部屋"
        - cell "タイプ"
        - cell "状況"
        - cell "面積"
        - cell "家賃"
        - cell "入居者"
        - cell "契約期間"
        - cell "操作"
    - rowgroup:
      - row "A101 住居 入居中 65㎡ 2LDK ￥280,000 鈴木 一郎 2023年10月1日 〜 2025年9月30日 詳細":
        - cell "A101"
        - cell "住居"
        - cell "入居中"
        - cell "65㎡ 2LDK"
        - cell "￥280,000"
        - cell "鈴木 一郎"
        - cell "2023年10月1日 〜 2025年9月30日"
        - cell "詳細":
          - link "詳細":
            - /url: /properties/prop-002/unit-005
            - button "詳細"
      - row "A102 住居 入居中 60㎡ 2LDK ￥270,000 高橋 美咲 2024年2月1日 〜 2026年1月31日 詳細":
        - cell "A102"
        - cell "住居"
        - cell "入居中"
        - cell "60㎡ 2LDK"
        - cell "￥270,000"
        - cell "高橋 美咲"
        - cell "2024年2月1日 〜 2026年1月31日"
        - cell "詳細":
          - link "詳細":
            - /url: /properties/prop-002/unit-006
            - button "詳細"
      - row "B101 住居 空室 65㎡ 2LDK ￥285,000 - - 詳細":
        - cell "B101"
        - cell "住居"
        - cell "空室"
        - cell "65㎡ 2LDK"
        - cell "￥285,000"
        - cell "-"
        - cell "-"
        - cell "詳細":
          - link "詳細":
            - /url: /properties/prop-002/unit-007
            - button "詳細"
      - row "B102 住居 入居中 60㎡ 2LDK ￥275,000 中村 健太 2023年12月1日 〜 2025年11月30日 詳細":
        - cell "B102"
        - cell "住居"
        - cell "入居中"
        - cell "60㎡ 2LDK"
        - cell "￥275,000"
        - cell "中村 健太"
        - cell "2023年12月1日 〜 2025年11月30日"
        - cell "詳細":
          - link "詳細":
            - /url: /properties/prop-002/unit-008
            - button "詳細"
  - heading "新宿オフィス" [level=3]
  - text: "入居率: 50.0% (1/2室) 想定満室家賃: ￥830,000 現況満室家賃: ￥450,000"
  - table:
    - rowgroup:
      - row "部屋 タイプ 状況 面積 家賃 入居者 契約期間 操作":
        - cell "部屋"
        - cell "タイプ"
        - cell "状況"
        - cell "面積"
        - cell "家賃"
        - cell "入居者"
        - cell "契約期間"
        - cell "操作"
    - rowgroup:
      - row "301 店舗 入居中 120㎡ ￥450,000 株式会社テクノロジー 2024年4月1日 〜 2027年3月31日 詳細":
        - cell "301"
        - cell "店舗"
        - cell "入居中"
        - cell "120㎡"
        - cell "￥450,000"
        - cell "株式会社テクノロジー"
        - cell "2024年4月1日 〜 2027年3月31日"
        - cell "詳細":
          - link "詳細":
            - /url: /properties/prop-003/unit-009
            - button "詳細"
      - row "302 店舗 空室 100㎡ ￥380,000 - - 詳細":
        - cell "302"
        - cell "店舗"
        - cell "空室"
        - cell "100㎡"
        - cell "￥380,000"
        - cell "-"
        - cell "-"
        - cell "詳細":
          - link "詳細":
            - /url: /properties/prop-003/unit-010
            - button "詳細"
- alert
- button "Open Next.js Dev Tools":
  - img
```

# Test source

```ts
   1 | import { test, expect } from '@playwright/test';
   2 |
   3 | test.describe('Rent Roll', () => {
   4 |   test('rent roll list page loads correctly', async ({ page }) => {
   5 |     await page.goto('/rent-roll');
   6 |     
   7 |     // ページタイトルの確認
   8 |     await expect(page.locator('h1')).toContainText('レントロール');
   9 |     
  10 |     // 統計サマリーカードの確認
  11 |     await expect(page.locator('text=総戸数')).toBeVisible();
  12 |     await expect(page.locator('text=入居中')).toBeVisible();
  13 |     await expect(page.locator('text=空室')).toBeVisible();
  14 |     await expect(page.locator('text=入居率')).toBeVisible();
  15 |     
  16 |     // フィルター機能の確認
  17 |     await expect(page.locator('text=フィルター')).toBeVisible();
  18 |     await expect(page.locator('select').first()).toBeVisible();
  19 |     
  20 |     // 表示切替ボタンの確認
  21 |     await expect(page.locator('text=物件別表示')).toBeVisible();
  22 |     await expect(page.locator('text=詳細表示')).toBeVisible();
  23 |     
  24 |     // テーブルまたはカードの確認
  25 |     await expect(page.locator('[class*="Card"]').first()).toBeVisible();
  26 |   });
  27 |
  28 |   test('can switch between display modes', async ({ page }) => {
  29 |     await page.goto('/rent-roll');
  30 |     
  31 |     // 詳細表示に切り替え
  32 |     await page.click('text=詳細表示');
  33 |     await expect(page.locator('text=レントロール一覧')).toBeVisible();
  34 |     
  35 |     // 物件別表示に切り替え
  36 |     await page.click('text=物件別表示');
  37 |     await expect(page.locator('text=物件別レントロール')).toBeVisible();
  38 |   });
  39 |
  40 |   test('can filter units', async ({ page }) => {
  41 |     await page.goto('/rent-roll');
  42 |     
  43 |     // 入居状況でフィルタ
  44 |     const statusFilter = page.locator('select').nth(1);
> 45 |     await statusFilter.selectOption('occupied');
     |                        ^ Error: locator.selectOption: Test timeout of 30000ms exceeded.
  46 |     
  47 |     // フィルタ結果の確認（入居中のみ表示）
  48 |     await expect(page.locator('text=入居中')).toBeVisible();
  49 |   });
  50 |
  51 |   test('can navigate to room detail', async ({ page }) => {
  52 |     await page.goto('/rent-roll');
  53 |     
  54 |     // 詳細表示モードに切り替え
  55 |     await page.click('text=詳細表示');
  56 |     
  57 |     // 最初の詳細ボタンをクリック
  58 |     const detailButton = page.locator('text=詳細').first();
  59 |     await detailButton.click();
  60 |     
  61 |     // 部屋詳細ページに遷移することを確認
  62 |     await expect(page.url()).toMatch(/\/properties\/[^\/]+\/[^\/]+$/);
  63 |     await expect(page.locator('h1')).toBeVisible();
  64 |     await expect(page.locator('text=物件詳細に戻る')).toBeVisible();
  65 |   });
  66 | });
```