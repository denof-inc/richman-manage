# 固定資産税管理機能 詳細設計書

## 1. 機能概要

物件ごとの固定資産税を管理し、年4回の納付スケジュールを追跡する機能。納付時には自動的に支出履歴に連携。

## 2. データモデル

### property_taxes テーブル

```typescript
interface PropertyTax {
  id: string; // UUID
  property_id: string; // 物件ID
  year: number; // 課税年度
  assessed_value: number; // 評価額
  tax_rate: number; // 税率(%)
  annual_amount: number; // 年間税額
  city_planning_tax?: {
    // 都市計画税
    rate: number; // 税率(%)
    amount: number; // 税額
  };
  exemptions?: {
    // 減免措置
    type: string; // 減免種別
    amount: number; // 減免額
    description: string; // 説明
  }[];
  notes?: string; // 備考
  created_at: Date;
  updated_at: Date;
  deleted_at?: Date;
}
```

### property_tax_payments テーブル

```typescript
interface PropertyTaxPayment {
  id: string; // UUID
  property_tax_id: string; // 固定資産税ID
  quarter: 1 | 2 | 3 | 4; // 期別
  due_date: Date; // 納期限
  amount: number; // 納付額
  paid_date?: Date; // 納付日
  status: PaymentStatus; // ステータス
  expense_id?: string; // 連携支出ID
  notes?: string; // 備考
  created_at: Date;
  updated_at: Date;
}

type PaymentStatus = 'pending' | 'paid' | 'overdue';
```

## 3. API仕様

### 3.1 固定資産税一覧取得

```
GET /api/property-taxes
Query Parameters:
  - property_id?: string
  - year?: number
  - status?: PaymentStatus
  - include_payments?: boolean

Response:
{
  success: true,
  data: {
    taxes: PropertyTax[],
    summary: {
      total_annual_amount: number,
      paid_amount: number,
      pending_amount: number,
      overdue_count: number
    }
  }
}
```

### 3.2 固定資産税詳細取得

```
GET /api/property-taxes/:id

Response:
{
  success: true,
  data: {
    tax: PropertyTax,
    property: Property,
    payments: PropertyTaxPayment[]
  }
}
```

### 3.3 固定資産税作成

```
POST /api/property-taxes
Body: {
  property_id: string,
  year: number,
  assessed_value: number,
  tax_rate: number,
  city_planning_tax?: {
    rate: number
  },
  exemptions?: Array
}

Response:
{
  success: true,
  data: {
    tax: PropertyTax,
    payments: PropertyTaxPayment[] // 自動生成された4期分
  }
}
```

### 3.4 納付登録

```
POST /api/property-taxes/:id/payments/:quarter/pay
Body: {
  paid_date: Date,
  notes?: string
}

Response:
{
  success: true,
  data: {
    payment: PropertyTaxPayment,
    expense: Expense // 自動作成された支出
  }
}
```

### 3.5 固定資産税更新

```
PUT /api/property-taxes/:id
Body: Partial<PropertyTax>

Response:
{
  success: true,
  data: PropertyTax
}
```

### 3.6 固定資産税削除

```
DELETE /api/property-taxes/:id

Response:
{
  success: true,
  data: { id: string }
}
```

## 4. 画面仕様

### 4.1 固定資産税一覧画面（/property-taxes）

#### レイアウト

- ヘッダー: タイトル + 新規追加ボタン
- サマリーカード: 年間総額、納付済額、未納額、期限超過件数
- フィルター: 年度、物件、納付状況
- 一覧表示

#### 表示項目

| 物件名         | 年度 | 年間税額   | 1期     | 2期     | 3期        | 4期  | 進捗 | アクション |
| -------------- | ---- | ---------- | ------- | ------- | ---------- | ---- | ---- | ---------- |
| 青山マンション | 2024 | ¥1,200,000 | ✓納付済 | ✓納付済 | ⚠️期限間近 | 未納 | 50%  | 詳細       |

#### ステータス表示

- ✓ 納付済（緑）
- ⚠️ 期限間近（黄・7日前から）
- ❌ 期限超過（赤）
- － 未到来（グレー）

### 4.2 固定資産税詳細画面（/property-taxes/[id]）

#### レイアウト

- ヘッダー: 物件名 - 年度 + 編集ボタン
- 基本情報カード
- 納付スケジュールカード
- 減免措置カード（該当時）

#### 基本情報

- 物件名（リンク）
- 課税年度
- 評価額
- 税率
- 年間税額
- 都市計画税（該当時）

#### 納付スケジュール

各期ごとに表示：

- 期別（第1期〜第4期）
- 納期限
- 納付額
- ステータス
- 納付日（納付済の場合）
- 納付ボタン（未納の場合）

#### 減免措置

- 減免種別
- 減免額
- 説明

### 4.3 固定資産税新規/編集画面（/property-taxes/new, /property-taxes/[id]/edit）

#### フォーム項目

- 基本情報セクション
  - 物件選択\*
  - 課税年度\*
  - 評価額\*
  - 税率\*（デフォルト1.4%）
- 都市計画税セクション（オプション）
  - 適用有無チェックボックス
  - 税率（デフォルト0.3%）
- 減免措置セクション（オプション）
  - 減免追加ボタン
  - 種別、金額、説明
- 自動計算結果表示
  - 固定資産税額
  - 都市計画税額
  - 減免後税額
  - 各期納付額

## 5. ビジネスロジック

### 5.1 税額計算

```typescript
// 固定資産税額
const propertyTaxAmount = assessedValue * (taxRate / 100);

// 都市計画税額
const cityPlanningTaxAmount = cityPlanningTax ? assessedValue * (cityPlanningTax.rate / 100) : 0;

// 減免後の年間税額
const totalExemptions = exemptions?.reduce((sum, e) => sum + e.amount, 0) || 0;
const annualAmount = propertyTaxAmount + cityPlanningTaxAmount - totalExemptions;
```

### 5.2 納付スケジュール生成

```typescript
function generatePaymentSchedule(year: number, annualAmount: number): PropertyTaxPayment[] {
  const quarters = [
    { quarter: 1, month: 6, day: 30 }, // 第1期: 6月末
    { quarter: 2, month: 9, day: 30 }, // 第2期: 9月末
    { quarter: 3, month: 12, day: 25 }, // 第3期: 12月25日
    { quarter: 4, month: 2, day: 28 }, // 第4期: 2月末
  ];

  return quarters.map((q) => ({
    quarter: q.quarter,
    due_date: new Date(q.quarter === 4 ? year + 1 : year, q.month - 1, q.day),
    amount: Math.floor(annualAmount / 4),
    status: 'pending',
  }));
}
```

### 5.3 ステータス自動更新

```typescript
// 毎日実行するバッチ処理
function updatePaymentStatus() {
  const today = new Date();

  // pending → overdue
  await db.propertyTaxPayments.updateMany({
    where: {
      status: 'pending',
      due_date: { lt: today },
    },
    data: { status: 'overdue' },
  });
}
```

### 5.4 支出連携

```typescript
// 納付登録時に支出レコード作成
async function createExpenseFromPayment(payment: PropertyTaxPayment, propertyTax: PropertyTax) {
  return await db.expenses.create({
    data: {
      property_id: propertyTax.property_id,
      property_tax_id: propertyTax.id,
      category: '固定資産税',
      amount: payment.amount,
      expense_date: payment.paid_date,
      description: `固定資産税 ${propertyTax.year}年度 第${payment.quarter}期`,
      vendor: '税務署',
    },
  });
}
```

## 6. バリデーション

### 6.1 必須項目

- 物件: 選択必須
- 年度: 2000-2099
- 評価額: 0以上
- 税率: 0-10%

### 6.2 ビジネスルール

- 同一物件・同一年度の重複不可
- 過去の納付済データは編集不可
- 減免額は税額を超えない

## 7. 通知機能

### 7.1 納期限リマインダー

- 14日前: 初回通知
- 7日前: 再通知
- 当日: 最終通知
- 期限超過: アラート

### 7.2 通知方法

- アプリ内通知
- メール通知（設定による）

## 8. 権限管理

- 表示: 物件の所有者のみ
- 作成/編集: 物件の所有者のみ
- 納付登録: 物件の所有者のみ

## 9. エラーハンドリング

- 404: 固定資産税情報が見つからない
- 403: 権限がない
- 400: バリデーションエラー
- 409: 重複エラー

## 10. テスト観点

- 税額計算の正確性
- 納付スケジュール生成
- ステータス自動更新
- 支出連携の整合性
- 通知タイミング
- 年度またぎの処理
