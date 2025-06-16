# レントロール管理機能 詳細設計書

## 1. 機能概要
物件の部屋単位で入居状況、家賃、入退去履歴を管理する機能。全物件横断での空室率や収益状況を可視化。

## 2. データモデル

### units テーブル
```typescript
interface Unit {
  id: string;                    // UUID
  property_id: string;          // 物件ID
  unit_number: string;          // 部屋番号
  unit_type: UnitType;          // 部屋種別
  status: UnitStatus;           // 入居状況
  area?: number;                // 面積(㎡)
  bedrooms?: number;            // 部屋数
  bathrooms?: number;           // バス・トイレ数
  rent_amount: number;          // 家賃
  common_fee: number;           // 共益費
  deposit_amount: number;       // 敷金
  key_money: number;            // 礼金
  current_tenant_name?: string; // 現入居者名
  lease_start_date?: Date;      // 契約開始日
  lease_end_date?: Date;        // 契約終了日
  notes?: string;               // 備考
  created_at: Date;
  updated_at: Date;
  deleted_at?: Date;
}

type UnitType = 'residence' | 'office' | 'store' | 'parking' | 'other';
type UnitStatus = 'occupied' | 'vacant' | 'reserved';
```

### unit_status_histories テーブル
```typescript
interface UnitStatusHistory {
  id: string;                    // UUID
  unit_id: string;              // 部屋ID
  status: UnitStatus;           // ステータス
  tenant_name?: string;         // 入居者名
  lease_start_date?: Date;      // 契約開始日
  lease_end_date?: Date;        // 契約終了日
  rent_amount: number;          // 家賃
  deposit_amount: number;       // 敷金
  reason?: string;              // 退去理由等
  created_at: Date;
}
```

### unit_payment_records テーブル
```typescript
interface UnitPaymentRecord {
  id: string;                    // UUID
  unit_id: string;              // 部屋ID
  payment_date: Date;           // 支払日
  amount: number;               // 金額
  type: PaymentType;            // 種別
  status: PaymentStatus;        // ステータス
  notes?: string;               // 備考
  created_at: Date;
}

type PaymentType = 'rent' | 'deposit' | 'key_money' | 'penalty' | 'other';
type PaymentStatus = 'scheduled' | 'paid' | 'delayed' | 'unpaid';
```

## 3. API仕様

### 3.1 レントロール一覧取得
```
GET /api/rent-roll
Query Parameters:
  - property_id?: string
  - status?: UnitStatus
  - unit_type?: UnitType
  - sort?: 'unit_number' | 'rent_amount' | 'status'

Response:
{
  success: true,
  data: {
    units: Array<{
      unit: Unit,
      property: Property
    }>,
    summary: {
      total_units: number,
      occupied_units: number,
      vacant_units: number,
      occupancy_rate: number,
      total_potential_rent: number,
      total_actual_rent: number
    }
  }
}
```

### 3.2 部屋詳細取得
```
GET /api/properties/:propertyId/units/:unitId

Response:
{
  success: true,
  data: {
    unit: Unit,
    property: Property,
    status_history: UnitStatusHistory[],
    payment_records: UnitPaymentRecord[],
    rent_history: Array<{
      start_date: Date,
      end_date?: Date,
      amount: number
    }>
  }
}
```

### 3.3 部屋作成
```
POST /api/properties/:propertyId/units
Body: Omit<Unit, 'id' | 'property_id' | 'created_at' | 'updated_at'>

Response:
{
  success: true,
  data: Unit
}
```

### 3.4 入居登録
```
POST /api/units/:id/move-in
Body: {
  tenant_name: string,
  lease_start_date: Date,
  lease_end_date: Date,
  rent_amount: number,
  deposit_amount: number,
  key_money?: number
}

Response:
{
  success: true,
  data: {
    unit: Unit,
    history: UnitStatusHistory
  }
}
```

### 3.5 退去登録
```
POST /api/units/:id/move-out
Body: {
  move_out_date: Date,
  reason?: string,
  refund_deposit?: number
}

Response:
{
  success: true,
  data: {
    unit: Unit,
    history: UnitStatusHistory
  }
}
```

### 3.6 家賃変更
```
POST /api/units/:id/rent-change
Body: {
  new_rent_amount: number,
  effective_date: Date,
  reason?: string
}

Response:
{
  success: true,
  data: Unit
}
```

## 4. 画面仕様

### 4.1 レントロール一覧画面（/rent-roll）

#### レイアウト
- ヘッダー: タイトル + 表示モード切替
- サマリーカード: 総戸数、入居戸数、空室戸数、入居率
- フィルター: 物件、入居状況、部屋タイプ
- 表示モード: 物件別グループ表示 / 全体一覧表示

#### 物件別グループ表示
```
[青山マンション] 入居率: 75% (3/4室)
満室想定: ¥800,000 / 現況: ¥600,000

| 部屋番号 | タイプ | 面積 | 家賃 | 入居者 | 契約期間 | ステータス |
|----------|--------|------|------|--------|----------|------------|
| 101 | 1LDK | 45㎡ | ¥180,000 | 田中太郎 | 2023/04-2025/03 | 入居中 |
| 102 | 1LDK | 50㎡ | ¥190,000 | - | - | 空室 |
```

#### 全体一覧表示
| 物件名 | 部屋番号 | タイプ | 家賃 | 入居者 | ステータス | アクション |
|--------|----------|--------|------|--------|------------|------------|
| 青山マンション | 101 | 1LDK | ¥180,000 | 田中太郎 | 入居中 | 詳細 |

### 4.2 部屋詳細画面（/properties/[propertyId]/[roomId]）

#### レイアウト
- ヘッダー: 物件名 - 部屋番号 + 編集ボタン
- 基本情報カード
- 現在の契約情報カード
- 履歴タブ（家賃履歴/入退去履歴/支払履歴）

#### 基本情報
- 部屋番号、部屋タイプ
- 面積、間取り
- 現在の家賃、共益費
- 敷金、礼金
- 備考

#### 現在の契約情報（入居中の場合）
- 入居者名
- 契約期間
- 月額合計（家賃+共益費）
- 次回更新日
- アクションボタン: 退去登録、家賃変更

#### 履歴タブ
- 家賃履歴: 期間、金額の推移グラフ
- 入退去履歴: タイムライン形式
- 支払履歴: 月別の入金状況

### 4.3 入居/退去登録モーダル

#### 入居登録
- 入居者名*
- 契約開始日*
- 契約終了日*
- 家賃*
- 共益費
- 敷金*
- 礼金

#### 退去登録
- 退去日*
- 退去理由
- 敷金返還額
- 原状回復費用

## 5. ビジネスロジック

### 5.1 入居率計算
```typescript
// 物件別入居率
const propertyOccupancyRate = (occupiedUnits / totalUnits) * 100;

// 全体入居率
const overallOccupancyRate = (totalOccupiedUnits / totalUnits) * 100;
```

### 5.2 収益計算
```typescript
// 満室想定家賃
const potentialRent = units.reduce((sum, unit) => sum + unit.rent_amount + unit.common_fee, 0);

// 実際の家賃収入
const actualRent = units
  .filter(unit => unit.status === 'occupied')
  .reduce((sum, unit) => sum + unit.rent_amount + unit.common_fee, 0);

// 収益率
const revenueRate = (actualRent / potentialRent) * 100;
```

### 5.3 契約期限アラート
```typescript
// 3ヶ月前から通知
const threeMonthsLater = addMonths(new Date(), 3);
const expiringContracts = units.filter(unit => 
  unit.lease_end_date && unit.lease_end_date <= threeMonthsLater
);
```

### 5.4 支払遅延チェック
```typescript
// 月次バッチで実行
async function checkPaymentDelays() {
  const today = new Date();
  const rentDueDate = 27; // 家賃支払日
  
  if (today.getDate() > rentDueDate + 3) {
    // 3日以上遅延している部屋を抽出
    const delayedUnits = await findUnpaidUnits(today);
    // アラート生成
  }
}
```

## 6. バリデーション

### 6.1 必須項目
- 部屋番号: 1-20文字、物件内でユニーク
- 部屋タイプ: 定義済みの値
- 家賃: 0以上
- 入居時: 入居者名、契約期間必須

### 6.2 ビジネスルール
- 契約開始日 < 契約終了日
- 退去日は契約期間内
- 空室の部屋のみ入居登録可能
- 入居中の部屋のみ退去登録可能

## 7. 統計・分析機能

### 7.1 ダッシュボード連携
- 入居率推移グラフ
- 空室期間分析
- 家賃収入推移

### 7.2 レポート機能
- 物件別レントロール表
- 更新予定一覧
- 空室一覧

## 8. 権限管理
- 表示: 物件の所有者のみ
- 作成/編集: 物件の所有者のみ
- 入退去登録: 物件の所有者のみ

## 9. エラーハンドリング
- 404: 部屋が見つからない
- 403: 権限がない
- 400: バリデーションエラー
- 409: ステータス不整合（空室に退去登録等）

## 10. テスト観点
- 入退去フローの正常系/異常系
- 入居率計算の正確性
- 家賃変更履歴の管理
- 契約期限アラート
- 大量データ（1000室）でのパフォーマンス

