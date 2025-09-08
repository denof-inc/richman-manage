# キャッシュフロー分析画面設計書

## 技術アーキテクチャ設計 (Serena/Cipher/Context7分析結果)

### データ構造分析
- **収入源**: 家賃収入(rent_amount)、その他収入
- **支出項目**: ローン返済(元金・利息)、管理費、固定資産税、その他経費
- **計算項目**: 営業利益、税引前利益、税引後利益、累計キャッシュフロー

### 既存データモデル活用
```typescript
// 既存型定義を拡張してキャッシュフロー用インターフェース作成
interface CashFlowData {
  period: string; // "2024-01" 形式
  income: {
    rent: number;           // Unit.rent_amountの合計
    other: number;
  };
  expenses: {
    loan_principal: number; // Loan.payment_amount(元金部分)
    loan_interest: number;  // Loan.payment_amount(利息部分)
    management_fee: number; // Expense(category: 'management_fee')
    property_tax: number;   // Expense(category: 'tax')
    other_expenses: number; // その他経費
  };
  operating_profit: number;
  pre_tax_profit: number;
  post_tax_profit: number;
  cumulative_cash_flow: number;
}
```

### 推奨技術スタック
1. **フロントエンド**: Next.js App Router + shadcn/ui
2. **グラフライブラリ**: Recharts (ComposedChart推奨)
3. **状態管理**: React Context API + useReducer
4. **データ取得**: Server Components + API Routes

### Recharts実装方針
- **ComposedChart**: 収入・支出（棒グラフ）と利益推移（線グラフ）
- **ResponsiveContainer**: モバイル対応
- **FilteringSidebar**: 期間・物件選択UI

### API設計
- エンドポイント: `/api/cashflow`
- クエリパラメータ: `period=monthly|yearly&property_ids=uuid1,uuid2`
- サーバーサイド集計でパフォーマンス最適化

### フィルタリング機能
- 期間選択: 月次/四半期/年次
- 物件選択: 個別/複数/全体
- debounce処理でAPI負荷軽減

## 次ステップ
1. `/app/cashflow/page.tsx` 作成
2. CashFlow API実装
3. Rechartsコンポーネント実装
4. フィルタリングUI実装