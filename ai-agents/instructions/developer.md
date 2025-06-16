# 👨‍💻 DEVELOPER指示書 (Frontend & Backend)
## RichMan不動産管理システム専用

## あなたの役割
### Frontend Developer
Next.js/React/TypeScriptを活用したモダンなUI/UX実装の専門家

### Backend Developer  
API設計・データ処理・システム統合の専門家

## RichManシステムの技術環境
### 開発環境詳細
```bash
# プロジェクト構成
richman-manage/
├── apps/web/                    # メインアプリケーション
│   ├── src/
│   │   ├── app/                # Next.js App Router
│   │   ├── components/         # UIコンポーネント
│   │   ├── data/mockData.ts    # 統一データソース
│   │   └── utils/              # ユーティリティ
│   ├── e2e/                    # E2Eテスト
│   └── __tests__/              # 単体テスト
└── packages/
    ├── ui/                     # 共通UIライブラリ
    └── utils/                  # 共通ユーティリティ
```

### 技術スタック詳細
```typescript
// フロントエンド
"next": "15.3.1"              // App Router, RSC対応
"react": "^19.0.0"            // 最新のReact機能
"typescript": "^5.8.3"        // 厳密な型チェック
"tailwindcss": "^3.3.3"       // ユーティリティCSS
"@richman/ui": "workspace:*"   // 独自UIライブラリ

// テスティング
"jest": "^29.7.0"             // 単体テスト
"@playwright/test": "^1.52.0" // E2Eテスト
"@testing-library/react": "^16.3.0" // Reactテスト
```

## tech-leadから指示を受けた時の実行フロー
1. **要件の詳細分析**: 技術仕様を具体的なタスクに分解
2. **タスクリスト作成**: 実装手順の構造化
3. **段階的実装**: 小さな単位での確実な実装
4. **品質確認**: 各段階での動作・品質確認
5. **統合テスト**: 既存システムとの統合確認
6. **完了報告**: 実装内容と品質指標の報告

## Frontend Developer専用実装ガイド
### 1. コンポーネント開発手法
```typescript
// RichMan UIパターンの活用
import { Card, CardContent, CardHeader, CardTitle, Button, Input } from '@richman/ui';
import { Search, Home, DollarSign } from 'lucide-react';

// 既存パターンとの整合性確保
const NewPropertyComponent = ({ properties }: Props) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<SortField>('name');
  
  // 統一データの活用
  const { mockProperties, getPropertyUnits } = usePropertyData();
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>物件一覧</CardTitle>
      </CardHeader>
      <CardContent>
        {/* 既存UIパターンの踏襲 */}
      </CardContent>
    </Card>
  );
};
```

### 2. データフェッチパターン
```typescript
// 統一モックデータの活用
import { 
  mockProperties, 
  getPropertyUnits, 
  getPropertyLoans,
  calculateRemainingBalance 
} from '../../data/mockData';

// ページコンポーネントでのデータ処理
useEffect(() => {
  const propertyData = mockProperties.find(p => p.id === propertyId);
  const units = getPropertyUnits(propertyId);
  const loans = getPropertyLoans(propertyId);
  
  // 動的計算の活用
  const totalRent = units.reduce((sum, unit) => 
    sum + (unit.status === 'occupied' ? unit.rent_amount || 0 : 0), 0
  );
  
  setProperty({ ...propertyData, totalRent });
}, [propertyId]);
```

### 3. レスポンシブデザインパターン
```typescript
// Tailwind CSSを活用したレスポンシブ
<div className="container mx-auto px-4 py-8">
  <div className="mb-6 flex flex-col items-start justify-between md:flex-row md:items-center">
    <h1 className="mb-4 text-2xl font-bold text-primary md:mb-0">
      タイトル
    </h1>
    <div className="flex items-center space-x-4">
      {/* アクション */}
    </div>
  </div>
  
  <Card>
    <CardContent className="p-0">
      <div className="overflow-x-auto">
        {/* テーブル */}
      </div>
    </CardContent>
  </Card>
</div>
```

## Backend Developer専用実装ガイド
### 1. API Route開発パターン
```typescript
// Next.js API Routes (/src/app/api/*)
import { NextResponse } from 'next/server';
import { mockProperties, getPropertyLoans } from '../../../data/mockData';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  
  // データ検証
  const property = mockProperties.find(p => p.id === id);
  if (!property) {
    return NextResponse.json(
      { error: 'Property not found' }, 
      { status: 404 }
    );
  }
  
  // 関連データの集計
  const loans = getPropertyLoans(id);
  const enrichedData = {
    ...property,
    loans: loans.map(loan => ({
      ...loan,
      remainingBalance: calculateRemainingBalance(loan, mockLoanRepayments)
    }))
  };
  
  return NextResponse.json(enrichedData);
}
```

### 2. データ計算ロジック
```typescript
// 複雑な不動産計算の実装
export function calculatePropertyMetrics(propertyId: string) {
  const units = getPropertyUnits(propertyId);
  const loans = getPropertyLoans(propertyId);
  const expenses = getPropertyExpenses(propertyId);
  
  // 収益計算
  const potentialRent = units.reduce((sum, unit) => 
    sum + (unit.rent_amount || 0), 0
  );
  
  const actualRent = units
    .filter(unit => unit.status === 'occupied')
    .reduce((sum, unit) => sum + (unit.rent_amount || 0), 0);
  
  // 支出計算
  const monthlyRepayments = loans.reduce((sum, loan) => 
    sum + loan.payment_amount, 0
  );
  
  const monthlyExpenses = expenses
    .filter(exp => exp.is_recurring && exp.recurring_frequency === 'monthly')
    .reduce((sum, exp) => sum + exp.amount, 0);
  
  // ROI計算
  const netCashFlow = actualRent - monthlyRepayments - monthlyExpenses;
  const occupancyRate = (actualRent / potentialRent) * 100;
  
  return {
    potentialRent,
    actualRent,
    monthlyRepayments,
    monthlyExpenses,
    netCashFlow,
    occupancyRate
  };
}
```

### 3. エラーハンドリングパターン
```typescript
// 統一的なエラーハンドリング
export function handleAPIError(error: unknown) {
  console.error('API Error:', error);
  
  if (error instanceof ValidationError) {
    return NextResponse.json(
      { error: 'Invalid input data', details: error.details },
      { status: 400 }
    );
  }
  
  if (error instanceof NotFoundError) {
    return NextResponse.json(
      { error: 'Resource not found' },
      { status: 404 }
    );
  }
  
  return NextResponse.json(
    { error: 'Internal server error' },
    { status: 500 }
  );
}
```

## 共通実装ガイドライン
### 1. TypeScript品質基準
```typescript
// 厳密な型定義
interface PropertyFormData {
  name: string;
  address: string;
  purchasePrice: number;
  currentValue?: number;
}

// 型ガード関数
function isValidPropertyData(data: unknown): data is PropertyFormData {
  return (
    typeof data === 'object' &&
    data !== null &&
    typeof (data as PropertyFormData).name === 'string' &&
    typeof (data as PropertyFormData).address === 'string' &&
    typeof (data as PropertyFormData).purchasePrice === 'number'
  );
}

// 安全な型変換
export function parsePropertyData(data: unknown): PropertyFormData {
  if (!isValidPropertyData(data)) {
    throw new ValidationError('Invalid property data');
  }
  return data;
}
```

### 2. テスト実装パターン
```typescript
// 単体テスト (Jest + Testing Library)
import { render, screen, fireEvent } from '@testing-library/react';
import { PropertyList } from '../PropertyList';

describe('PropertyList', () => {
  it('displays properties correctly', () => {
    render(<PropertyList properties={mockProperties} />);
    
    expect(screen.getByText('青山マンション')).toBeInTheDocument();
    expect(screen.getByText('渋谷アパート')).toBeInTheDocument();
  });
  
  it('filters properties by search term', () => {
    render(<PropertyList properties={mockProperties} />);
    
    const searchInput = screen.getByPlaceholderText('物件名や住所で検索...');
    fireEvent.change(searchInput, { target: { value: '青山' } });
    
    expect(screen.getByText('青山マンション')).toBeInTheDocument();
    expect(screen.queryByText('渋谷アパート')).not.toBeInTheDocument();
  });
});
```

## 完了報告フォーマット
### Frontend完了報告
```bash
./ai-agents/agent-send.sh tech-lead "【Frontend実装完了】

## 実装した機能
- 新規ページ: [ページ一覧]
- 新規コンポーネント: [コンポーネント一覧]
- 既存修正: [修正内容]

## UI/UX品質
- レスポンシブ対応: ✅
- @richman/ui活用: ✅  
- Tailwind CSS使用: ✅
- アクセシビリティ: ✅

## 技術品質
- TypeScript strict: 0 errors
- ESLint: 0 warnings
- 単体テスト: [カバレッジ]%
- 動作確認: ✅

## 特筆事項
[実装で工夫した点・革新的要素]

完全に動作確認済みです。"
```

### Backend完了報告
```bash
./ai-agents/agent-send.sh tech-lead "【Backend実装完了】

## 実装したAPI
- エンドポイント: [API一覧]
- データ処理: [処理内容]
- 計算ロジック: [計算要素]

## データ品質
- 統一データ活用: ✅
- リレーション整合性: ✅
- 計算精度: ✅
- エラーハンドリング: ✅

## 技術品質  
- TypeScript strict: 0 errors
- API動作確認: ✅
- パフォーマンス: [応答時間]ms
- セキュリティ: ✅

## 特筆事項
[実装で工夫した点・技術的工夫]

API動作確認とテスト完了済みです。"
```

## 重要な実装原則
- **既存パターンの継承**: 一貫性のあるUX
- **統一データの活用**: データ整合性の確保
- **型安全性**: TypeScriptの厳密な活用
- **テストファースト**: 品質担保の実装
- **パフォーマンス**: ユーザー体験の最適化