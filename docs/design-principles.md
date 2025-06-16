# 設計原則・ガイドライン - RichmanManage

## 1. アーキテクチャ原則

### 1.1 レイヤード・アーキテクチャ
```
┌─────────────────────────────────┐
│   Presentation Layer (UI)        │  ← React Components
├─────────────────────────────────┤
│   Application Layer              │  ← Business Logic
├─────────────────────────────────┤
│   Domain Layer                   │  ← Core Entities
├─────────────────────────────────┤
│   Infrastructure Layer           │  ← Database, APIs
└─────────────────────────────────┘
```

### 1.2 基本原則
1. **単一責任の原則**: 各モジュールは1つの責任のみを持つ
2. **依存性逆転の原則**: 上位層は下位層に依存しない
3. **DRY原則**: 同じロジックを繰り返さない
4. **YAGNI原則**: 必要になるまで実装しない

### 1.3 データフロー
```
User Action → Component → Hook → API → Database
     ↑                                      ↓
     └──────── State Update ←──────────────┘
```

## 2. コーディング規約

### 2.1 命名規則
```typescript
// ファイル名: kebab-case
property-management.tsx
use-property-data.ts

// コンポーネント: PascalCase
function PropertyList() {}

// 関数: camelCase
function calculateMonthlyPayment() {}

// 定数: UPPER_SNAKE_CASE
const MAX_PROPERTY_COUNT = 100;

// 型/インターフェース: PascalCase
interface Property {}
type PropertyStatus = 'active' | 'inactive';
```

### 2.2 ディレクトリ構造
```
src/
├── app/                    # Next.js App Router
│   ├── (auth)/            # 認証が必要なページ
│   └── (public)/          # 公開ページ
├── components/
│   ├── ui/                # 汎用UIコンポーネント
│   └── features/          # 機能別コンポーネント
│       ├── property/
│       ├── loan/
│       └── rent-roll/
├── hooks/                 # Custom Hooks
├── lib/                   # ユーティリティ
├── types/                 # 型定義
└── services/             # API通信
```

### 2.3 コンポーネント設計
```typescript
// ✅ Good: 単一責任、明確なprops
interface PropertyCardProps {
  property: Property;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
}

function PropertyCard({ property, onEdit, onDelete }: PropertyCardProps) {
  return (
    <Card>
      <CardHeader>
        <h3>{property.name}</h3>
      </CardHeader>
      <CardContent>
        <p>住所: {property.address}</p>
        <p>CF: {formatCurrency(property.netCf)}</p>
      </CardContent>
    </Card>
  );
}

// ❌ Bad: 責任過多、不明確なprops
function PropertyManager({ data, mode, callback }) {
  // 表示、編集、削除すべてを担当...
}
```

## 3. UI/UXガイドライン

### 3.1 デザイントークン
```css
/* カラーパレット */
--color-primary: #3B82F6;      /* Blue-500 */
--color-secondary: #10B981;    /* Green-500 */
--color-danger: #EF4444;       /* Red-500 */
--color-warning: #F59E0B;      /* Amber-500 */
--color-background: #FFFFFF;
--color-surface: #F9FAFB;
--color-text-primary: #111827;
--color-text-secondary: #6B7280;

/* スペーシング */
--spacing-xs: 0.25rem;  /* 4px */
--spacing-sm: 0.5rem;   /* 8px */
--spacing-md: 1rem;     /* 16px */
--spacing-lg: 1.5rem;   /* 24px */
--spacing-xl: 2rem;     /* 32px */

/* ブレークポイント */
--breakpoint-sm: 640px;
--breakpoint-md: 768px;
--breakpoint-lg: 1024px;
--breakpoint-xl: 1280px;
```

### 3.2 コンポーネントパターン
```typescript
// カード表示パターン
<Card>
  <CardHeader>
    <CardTitle>タイトル</CardTitle>
    <CardDescription>説明文</CardDescription>
  </CardHeader>
  <CardContent>
    {/* コンテンツ */}
  </CardContent>
  <CardFooter>
    <Button>アクション</Button>
  </CardFooter>
</Card>

// テーブル表示パターン
<Table>
  <TableHeader>
    <TableRow>
      <TableHead>項目1</TableHead>
      <TableHead>項目2</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    <TableRow>
      <TableCell>データ1</TableCell>
      <TableCell>データ2</TableCell>
    </TableRow>
  </TableBody>
</Table>
```

### 3.3 レスポンシブデザイン
```css
/* モバイルファースト */
.container {
  padding: 1rem;
}

/* タブレット以上 */
@media (min-width: 768px) {
  .container {
    padding: 2rem;
  }
}

/* デスクトップ */
@media (min-width: 1024px) {
  .container {
    max-width: 1280px;
    margin: 0 auto;
  }
}
```

## 4. API設計ガイド

### 4.1 RESTful設計
```
GET    /api/properties          # 一覧取得
POST   /api/properties          # 新規作成
GET    /api/properties/:id      # 詳細取得
PUT    /api/properties/:id      # 更新
DELETE /api/properties/:id      # 削除
```

### 4.2 レスポンス形式
```typescript
// 成功時
{
  "success": true,
  "data": {
    // レスポンスデータ
  },
  "meta": {
    "timestamp": "2024-12-16T10:00:00Z",
    "version": "1.0"
  }
}

// エラー時
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "入力値が不正です",
    "details": {
      "field": "email",
      "reason": "無効なメールアドレス形式"
    }
  }
}
```

### 4.3 エラーコード体系
```typescript
enum ErrorCode {
  // 認証系 (1xxx)
  UNAUTHORIZED = 1001,
  FORBIDDEN = 1003,
  
  // バリデーション系 (2xxx)
  VALIDATION_ERROR = 2001,
  DUPLICATE_ERROR = 2002,
  
  // ビジネスロジック系 (3xxx)
  INSUFFICIENT_BALANCE = 3001,
  PROPERTY_LIMIT_EXCEEDED = 3002,
  
  // システム系 (5xxx)
  INTERNAL_ERROR = 5000,
  DATABASE_ERROR = 5001,
}
```

## 5. データベース設計原則

### 5.1 命名規則
```sql
-- テーブル名: 複数形、スネークケース
CREATE TABLE properties (...);
CREATE TABLE loan_repayments (...);

-- カラム名: スネークケース
property_id UUID NOT NULL,
created_at TIMESTAMP NOT NULL,

-- インデックス名: idx_テーブル名_カラム名
CREATE INDEX idx_properties_owner_id ON properties(owner_id);
```

### 5.2 共通カラム
```sql
-- すべてのテーブルに必須
id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

-- 論理削除対応テーブル
deleted_at TIMESTAMP NULL
```

### 5.3 制約の活用
```sql
-- 外部キー制約
FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE,

-- チェック制約
CHECK (interest_rate >= 0 AND interest_rate <= 100),

-- ユニーク制約
UNIQUE (property_id, unit_number)
```

## 6. セキュリティガイドライン

### 6.1 認証・認可
```typescript
// ミドルウェアでの認証チェック
export async function middleware(request: NextRequest) {
  const session = await getSession(request);
  
  if (!session) {
    return NextResponse.redirect('/login');
  }
  
  // RLSでさらに権限チェック
}
```

### 6.2 入力検証
```typescript
// Zodによるスキーマ定義
const propertySchema = z.object({
  name: z.string().min(1).max(100),
  address: z.string().min(1).max(200),
  acquisitionPrice: z.number().positive(),
  acquisitionDate: z.date().max(new Date())
});

// 使用例
try {
  const validated = propertySchema.parse(input);
} catch (error) {
  // バリデーションエラー処理
}
```

### 6.3 機密情報の扱い
```typescript
// ❌ Bad: ログに機密情報
console.log(`User ${email} logged in with password ${password}`);

// ✅ Good: 機密情報をマスク
console.log(`User ${email} logged in`);

// 環境変数の使用
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
```

## 7. パフォーマンス最適化

### 7.1 データ取得の最適化
```typescript
// ❌ Bad: N+1問題
const properties = await getProperties();
for (const property of properties) {
  property.units = await getUnits(property.id);
}

// ✅ Good: JOIN使用
const properties = await getPropertiesWithUnits();
```

### 7.2 コンポーネントの最適化
```typescript
// メモ化
const MemoizedComponent = React.memo(ExpensiveComponent);

// useCallback使用
const handleClick = useCallback(() => {
  // 処理
}, [dependency]);

// useMemo使用
const calculatedValue = useMemo(() => {
  return expensiveCalculation(data);
}, [data]);
```

### 7.3 画像最適化
```typescript
import Image from 'next/image';

// Next.js Image使用
<Image
  src="/property.jpg"
  alt="物件画像"
  width={800}
  height={600}
  loading="lazy"
  placeholder="blur"
/>
```

## 8. テスト戦略

### 8.1 テストピラミッド
```
         /\
        /E2E\      ← 少数の重要シナリオ
       /______\
      /Integration\ ← API・DB連携
     /______________\
    /      Unit      \ ← ビジネスロジック
   /__________________\
```

### 8.2 テストパターン
```typescript
// ユニットテスト例
describe('calculateMonthlyPayment', () => {
  it('正しい月次返済額を計算する', () => {
    const result = calculateMonthlyPayment(10000000, 1.5, 360);
    expect(result).toBe(34560);
  });
});

// 統合テスト例
describe('Property API', () => {
  it('物件を作成できる', async () => {
    const response = await request(app)
      .post('/api/properties')
      .send(validPropertyData);
      
    expect(response.status).toBe(201);
    expect(response.body.data).toHaveProperty('id');
  });
});
```

## 9. 監視・ロギング

### 9.1 ログレベル
```typescript
enum LogLevel {
  ERROR = 'error',    // エラー情報
  WARN = 'warn',      // 警告情報
  INFO = 'info',      // 一般情報
  DEBUG = 'debug',    // デバッグ情報
}

// 使用例
logger.info('Property created', { propertyId, userId });
logger.error('Database connection failed', { error });
```

### 9.2 メトリクス収集
- 応答時間
- エラー率
- 同時接続数
- データベース負荷

## 10. 継続的改善

### 10.1 コードレビュー基準
- [ ] 命名規則に従っているか
- [ ] 適切にテストされているか
- [ ] セキュリティ考慮されているか
- [ ] パフォーマンス問題はないか
- [ ] ドキュメント更新されているか

### 10.2 リファクタリング指針
1. 動作するコードを書く
2. テストを書く
3. リファクタリングする
4. テストが通ることを確認

---
最終更新: 2024-12-16