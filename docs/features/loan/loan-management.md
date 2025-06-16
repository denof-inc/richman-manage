# 借入管理機能 詳細設計書

## 1. 機能概要
物件に紐づく借入（ローン）情報を管理し、金利変更履歴や返済スケジュールを追跡する機能。残債の自動計算と返済シミュレーション機能を提供。

## 2. データモデル

### loans テーブル
```typescript
interface Loan {
  id: string;                    // UUID
  property_id: string;          // 物件ID
  name: string;                 // ローン名称
  lender: string;               // 借入先
  loan_type: LoanType;          // ローン種別
  principal: number;            // 借入元本
  balance: number;              // 現在残高
  interest_rate: number;        // 現在金利(%)
  interest_type: InterestType;  // 金利タイプ
  loan_term: number;            // 借入期間（月数）
  start_date: Date;             // 借入開始日
  end_date: Date;               // 借入終了予定日
  monthly_payment: number;      // 月次返済額
  payment_day: number;          // 返済日（1-31）
  next_due_date: Date;          // 次回返済日
  prepayment_penalty?: number;  // 繰上返済手数料
  notes?: string;               // 備考
  created_at: Date;
  updated_at: Date;
  deleted_at?: Date;
}

type LoanType = 'apartment_loan' | 'prop_loan' | 'business_loan' | 'other';
type InterestType = 'fixed' | 'variable' | 'fixed_period';
```

### loan_interest_changes テーブル
```typescript
interface LoanInterestChange {
  id: string;                    // UUID
  loan_id: string;              // ローンID
  change_date: Date;            // 変更日
  old_rate: number;             // 変更前金利(%)
  new_rate: number;             // 変更後金利(%)
  reason?: string;              // 変更理由
  created_at: Date;
}
```

### loan_repayments テーブル
```typescript
interface LoanRepayment {
  id: string;                    // UUID
  loan_id: string;              // ローンID
  payment_date: Date;           // 返済日
  scheduled_amount: number;     // 予定返済額
  principal_amount: number;     // 元本返済額
  interest_amount: number;      // 利息返済額
  prepayment_amount?: number;   // 繰上返済額
  actual_amount: number;        // 実際返済額
  balance_after: number;        // 返済後残高
  status: RepaymentStatus;      // ステータス
  notes?: string;               // 備考
  created_at: Date;
}

type RepaymentStatus = 'scheduled' | 'paid' | 'delayed' | 'skipped';
```

## 3. API仕様

### 3.1 借入一覧取得
```
GET /api/loans
Query Parameters:
  - property_id?: string
  - loan_type?: LoanType
  - include_property?: boolean

Response:
{
  success: true,
  data: {
    loans: Array<{
      loan: Loan,
      property: Property
    }>,
    summary: {
      total_balance: number,
      total_monthly_payment: number,
      average_interest_rate: number
    }
  }
}
```

### 3.2 借入詳細取得
```
GET /api/loans/:id

Response:
{
  success: true,
  data: {
    loan: Loan,
    property: Property,
    interest_changes: LoanInterestChange[],
    recent_repayments: LoanRepayment[],
    repayment_schedule: Array<{
      date: Date,
      principal: number,
      interest: number,
      balance: number
    }>
  }
}
```

### 3.3 借入作成
```
POST /api/loans
Body: {
  property_id: string,
  name: string,
  lender: string,
  loan_type: LoanType,
  principal: number,
  interest_rate: number,
  interest_type: InterestType,
  loan_term: number,
  start_date: Date,
  payment_day: number
}

Response:
{
  success: true,
  data: {
    loan: Loan,
    repayment_schedule: LoanRepayment[]
  }
}
```

### 3.4 金利変更登録
```
POST /api/loans/:id/interest-changes
Body: {
  change_date: Date,
  new_rate: number,
  reason?: string
}

Response:
{
  success: true,
  data: {
    loan: Loan,
    interest_change: LoanInterestChange,
    updated_schedule: LoanRepayment[]
  }
}
```

### 3.5 返済登録
```
POST /api/loans/:id/repayments
Body: {
  payment_date: Date,
  amount: number,
  prepayment_amount?: number,
  notes?: string
}

Response:
{
  success: true,
  data: {
    repayment: LoanRepayment,
    loan: Loan
  }
}
```

### 3.6 返済シミュレーション
```
POST /api/loans/:id/simulate
Body: {
  prepayment_amount: number,
  prepayment_date: Date
}

Response:
{
  success: true,
  data: {
    current_schedule: {
      total_interest: number,
      end_date: Date
    },
    simulated_schedule: {
      total_interest: number,
      end_date: Date,
      interest_savings: number,
      term_reduction_months: number
    }
  }
}
```

## 4. 画面仕様

### 4.1 借入一覧画面（/loans）

#### レイアウト
- ヘッダー: タイトル + 新規追加ボタン
- サマリーカード: 総残高、月次返済額合計、平均金利
- フィルター: 物件、ローン種別
- 一覧表示

#### 表示項目
| ローン名 | 物件名 | 借入先 | 残高 | 金利 | 月次返済 | 次回返済日 | アクション |
|----------|--------|--------|------|------|----------|------------|------------|
| 青山マンションローン | 青山マンション | ○○銀行 | ¥75,000,000 | 1.5% | ¥210,000 | 12/15 | 詳細 |

### 4.2 借入詳細画面（/loans/[id]）

#### レイアウト
- ヘッダー: ローン名 + 編集ボタン
- 基本情報カード
- 返済状況カード
- 金利変更履歴グラフ
- 返済履歴テーブル
- アクションボタン: 返済登録、金利変更、シミュレーション

#### 基本情報
- ローン名、物件名（リンク）
- 借入先、ローン種別
- 借入元本、現在残高
- 金利タイプ、現在金利
- 借入期間、返済期限
- 月次返済額、返済日

#### 返済状況
- 返済進捗バー
- 総返済額/元本/利息の内訳
- 残り返済回数
- 完済予定日

#### 金利変更履歴
- 折れ線グラフで金利推移を表示
- 変更日、変更前後の金利、理由

#### 返済履歴
- 直近12ヶ月の返済履歴
- 返済日、元本、利息、残高
- ステータス（済/遅延等）

### 4.3 借入新規/編集画面（/loans/new, /loans/[id]/edit）

#### フォーム項目
- 基本情報セクション
  - ローン名*
  - 物件選択*
  - 借入先*
  - ローン種別*
- 借入条件セクション
  - 借入元本*
  - 金利*
  - 金利タイプ*
  - 借入期間*（年数で入力→月数変換）
  - 借入開始日*
  - 返済日*（1-31）
- 返済シミュレーション表示
  - 月次返済額（自動計算）
  - 総返済額
  - 利息総額

### 4.4 返済シミュレーション画面（モーダル）

#### 入力項目
- 繰上返済額
- 繰上返済予定日
- 返済方式（期間短縮/返済額軽減）

#### シミュレーション結果
- 現在の返済プラン
  - 完済予定日
  - 利息総額
- 繰上返済後のプラン
  - 完済予定日（○ヶ月短縮）
  - 利息総額（○円削減）
  - 新月次返済額（返済額軽減の場合）

## 5. ビジネスロジック

### 5.1 返済額計算（元利均等返済）
```typescript
function calculateMonthlyPayment(principal: number, annualRate: number, termMonths: number): number {
  const monthlyRate = annualRate / 100 / 12;
  if (monthlyRate === 0) return principal / termMonths;
  
  return principal * monthlyRate * Math.pow(1 + monthlyRate, termMonths) / 
    (Math.pow(1 + monthlyRate, termMonths) - 1);
}
```

### 5.2 返済スケジュール生成
```typescript
function generateRepaymentSchedule(loan: Loan): LoanRepayment[] {
  const schedule: LoanRepayment[] = [];
  let balance = loan.principal;
  const monthlyRate = loan.interest_rate / 100 / 12;
  
  for (let i = 0; i < loan.loan_term; i++) {
    const interestAmount = balance * monthlyRate;
    const principalAmount = loan.monthly_payment - interestAmount;
    balance -= principalAmount;
    
    schedule.push({
      payment_date: addMonths(loan.start_date, i + 1),
      scheduled_amount: loan.monthly_payment,
      principal_amount: principalAmount,
      interest_amount: interestAmount,
      balance_after: balance,
      status: 'scheduled'
    });
  }
  
  return schedule;
}
```

### 5.3 金利変更時の再計算
```typescript
async function recalculateAfterRateChange(loan: Loan, newRate: number, changeDate: Date) {
  // 残り期間を計算
  const remainingMonths = differenceInMonths(loan.end_date, changeDate);
  
  // 新しい月次返済額を計算
  const newMonthlyPayment = calculateMonthlyPayment(
    loan.balance,
    newRate,
    remainingMonths
  );
  
  // 将来の返済スケジュールを更新
  await updateFutureRepayments(loan.id, changeDate, newMonthlyPayment);
}
```

### 5.4 返済遅延チェック
```typescript
// 日次バッチで実行
async function checkRepaymentDelays() {
  const today = new Date();
  const overdueRepayments = await db.loanRepayments.findMany({
    where: {
      payment_date: { lte: today },
      status: 'scheduled'
    }
  });
  
  // 遅延ステータスに更新 & 通知
  for (const repayment of overdueRepayments) {
    await updateRepaymentStatus(repayment.id, 'delayed');
    await sendDelayNotification(repayment);
  }
}
```

## 6. バリデーション

### 6.1 必須項目
- ローン名: 1-100文字
- 借入元本: 1万円以上
- 金利: 0-99.9%
- 借入期間: 1-480ヶ月（40年）
- 返済日: 1-31

### 6.2 ビジネスルール
- 借入開始日 < 借入終了日
- 月次返済額 > 月次利息額
- 繰上返済額 <= 現在残高

## 7. 通知機能

### 7.1 返済日リマインダー
- 3日前: 返済予定通知
- 当日: 返済日通知
- 翌日: 未返済の場合アラート

### 7.2 金利見直し通知
- 固定期間終了3ヶ月前
- 変動金利の定期見直し時期

## 8. 権限管理
- 表示: 関連物件の所有者のみ
- 作成/編集: 関連物件の所有者のみ
- 返済登録: 関連物件の所有者のみ

## 9. エラーハンドリング
- 404: ローンが見つからない
- 403: 権限がない
- 400: バリデーションエラー
- 422: 計算エラー（金利が高すぎる等）

## 10. テスト観点
- 返済額計算の正確性（様々な金利・期間）
- 返済スケジュール生成
- 金利変更時の再計算
- 繰上返済シミュレーション
- 大量データでのパフォーマンス
- 遅延チェックバッチの動作

---
最終更新: 2024-12-16