# 物件管理機能 詳細設計書

## 1. 機能概要
不動産投資物件の基本情報と収支サマリーを管理する機能。物件ごとのレントロール、借入、支出を統合して表示。

## 2. データモデル

### properties テーブル
```typescript
interface Property {
  id: string;                    // UUID
  owner_id: string;             // 所有者ID
  name: string;                 // 物件名
  address: string;              // 住所
  type: PropertyType;           // 物件種別
  size: number;                 // 延床面積(㎡)
  rooms: number;                // 部屋数
  year_built: number;           // 築年
  acquisition_date: Date;       // 取得日
  acquisition_price: number;    // 取得価格
  current_value: number;        // 現在価値
  potential_rent: number;       // 満室想定家賃
  actual_rent: number;          // 実際の家賃
  monthly_repayment: number;    // 月次返済額
  net_cf: number;              // ネットキャッシュフロー
  notes?: string;              // 備考
  created_at: Date;
  updated_at: Date;
  deleted_at?: Date;
}

type PropertyType = 'apartment' | 'mansion' | 'office' | 'store' | 'other';
```

## 3. API仕様

### 3.1 物件一覧取得
```
GET /api/properties
Query Parameters:
  - owner_id?: string
  - sort?: 'name' | 'net_cf' | 'created_at'
  - order?: 'asc' | 'desc'
  - limit?: number
  - offset?: number

Response:
{
  success: true,
  data: Property[],
  pagination: {
    total: number,
    limit: number,
    offset: number
  }
}
```

### 3.2 物件詳細取得
```
GET /api/properties/:id

Response:
{
  success: true,
  data: {
    property: Property,
    units: Unit[],        // 関連部屋
    loans: Loan[],        // 関連借入
    expenses: Expense[]   // 最近の支出
  }
}
```

### 3.3 物件作成
```
POST /api/properties
Body: Omit<Property, 'id' | 'created_at' | 'updated_at'>

Response:
{
  success: true,
  data: Property
}
```

### 3.4 物件更新
```
PUT /api/properties/:id
Body: Partial<Property>

Response:
{
  success: true,
  data: Property
}
```

### 3.5 物件削除（論理削除）
```
DELETE /api/properties/:id

Response:
{
  success: true,
  data: { id: string }
}
```

## 4. 画面仕様

### 4.1 物件一覧画面（/properties）

#### レイアウト
- ヘッダー: タイトル + 新規追加ボタン
- フィルター: 所有者選択
- ソート: 物件名、CF、登録日
- テーブル/カード表示切替

#### 表示項目（テーブル）
| 物件名 | 住所 | 満室想定 | 実際家賃 | 返済額 | CF | アクション |
|--------|------|----------|----------|---------|-----|------------|
| クリックで詳細へ | 一部表示 | ¥350,000 | ¥320,000 | ¥210,000 | ¥110,000 | 編集・削除 |

#### 表示項目（カード）
- 物件名（大）
- 住所
- 収支サマリー（実際家賃 - 返済額 = CF）
- 入居率バッジ

### 4.2 物件詳細画面（/properties/[id]）

#### レイアウト
- ヘッダー: 物件名 + 編集ボタン
- 基本情報カード
- 収支サマリーカード
- 関連情報タブ（レントロール/借入/支出）

#### 基本情報
- 物件名、住所
- 物件種別、延床面積、部屋数
- 築年、取得日、取得価格
- 現在価値
- 備考

#### 収支サマリー
- 満室想定家賃
- 実際の家賃（入居率%）
- 月次返済額
- その他支出
- ネットCF

#### 関連情報
- レントロール: 部屋一覧（リンク付き）
- 借入: 関連ローン一覧
- 支出: 最近の支出履歴

### 4.3 物件新規/編集画面（/properties/new, /properties/[id]/edit）

#### フォーム項目
- 基本情報セクション
  - 物件名*
  - 住所*
  - 物件種別*
  - 延床面積
  - 部屋数
  - 築年
- 取得情報セクション
  - 取得日*
  - 取得価格*
  - 現在価値
- 収支情報セクション（自動計算）
  - 満室想定家賃（レントロールから集計）
  - 実際の家賃（レントロールから集計）
  - 月次返済額（借入から集計）
- 備考

## 5. ビジネスロジック

### 5.1 収支自動計算
```typescript
// 満室想定家賃 = 全部屋の家賃合計
property.potential_rent = units.reduce((sum, unit) => sum + unit.rent_amount, 0);

// 実際の家賃 = 入居中の部屋の家賃合計
property.actual_rent = units
  .filter(unit => unit.status === 'occupied')
  .reduce((sum, unit) => sum + unit.rent_amount, 0);

// 月次返済額 = 関連借入の月次返済額合計
property.monthly_repayment = loans.reduce((sum, loan) => sum + loan.monthly_payment, 0);

// ネットCF = 実際の家賃 - 月次返済額 - その他月次支出
property.net_cf = property.actual_rent - property.monthly_repayment - monthlyExpenses;
```

### 5.2 入居率計算
```typescript
const occupancyRate = (occupiedUnits / totalUnits) * 100;
```

## 6. バリデーション

### 6.1 必須項目
- 物件名: 1-100文字
- 住所: 1-200文字
- 物件種別: 定義済みの値
- 取得日: 過去の日付
- 取得価格: 0以上

### 6.2 ビジネスルール
- 取得価格 <= 現在価値 * 2（異常値チェック）
- 築年 <= 現在年 - 取得年

## 7. 権限管理
- 表示: 自分が所有する物件のみ
- 作成: ログインユーザー
- 編集/削除: 物件の所有者のみ

## 8. エラーハンドリング
- 404: 物件が見つからない
- 403: 権限がない
- 400: バリデーションエラー
- 500: サーバーエラー

## 9. パフォーマンス考慮
- 一覧表示はページネーション（20件/ページ）
- 収支計算は非同期で実行
- キャッシュ活用（Redis）

## 10. テスト観点
- CRUD操作の正常系/異常系
- 収支自動計算の精度
- 権限チェック
- パフォーマンス（100物件での表示速度）

