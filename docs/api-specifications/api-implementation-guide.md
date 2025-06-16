# RichmanManage API実装指示書

## 目的
backend-dev向けのAPI実装指示書。設計書に基づいた具体的な実装手順とコード例を提供。

## 実装優先度

### 第1優先（即座に実装）
1. **Properties API** - POST/PUT/DELETE
2. **Expenses API** - 完全なCRUD

### 第2優先（第1優先完了後）
3. **Property Taxes API** - GET/POST/PUT + 支払い管理
4. **Cash Flow Analysis API** - 基本分析機能

## 共通実装方針

### 1. レスポンス形式の統一
```typescript
// 成功レスポンス
interface SuccessResponse<T> {
  success: true;
  data: T;
  error: null;
}

// エラーレスポンス
interface ErrorResponse {
  success: false;
  data: null;
  error: {
    code: string;
    message: string;
    details?: any;
  };
}
```

### 2. エラーハンドリングパターン
```typescript
// 共通エラーハンドリング関数
function handleApiError(error: unknown): ErrorResponse {
  if (error instanceof z.ZodError) {
    return {
      success: false,
      data: null,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'バリデーションエラー',
        details: error.errors
      }
    };
  }
  
  if (error instanceof Error) {
    return {
      success: false,
      data: null,
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message
      }
    };
  }
  
  return {
    success: false,
    data: null,
    error: {
      code: 'UNKNOWN_ERROR',
      message: '予期しないエラーが発生しました'
    }
  };
}
```

### 3. バリデーション実装パターン
```typescript
import { z } from 'zod';
import { NextRequest, NextResponse } from 'next/server';

async function validateRequest<T>(
  request: NextRequest,
  schema: z.ZodSchema<T>
): Promise<{ success: true; data: T } | { success: false; error: ErrorResponse }> {
  try {
    const body = await request.json();
    const validatedData = schema.parse(body);
    return { success: true, data: validatedData };
  } catch (error) {
    return { success: false, error: handleApiError(error) };
  }
}
```

## Properties API実装

### ファイル構成
```
apps/web/src/app/api/properties/
├── route.ts              # GET, POST
├── [id]/
│   └── route.ts          # GET, PUT, DELETE
└── schemas.ts            # Zodスキーマ定義
```

### 実装例: POST /api/properties

```typescript
// apps/web/src/app/api/properties/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createPropertySchema } from './schemas';
import { mockProperties, mockOwners } from '../../../data/mockData';
import { validateRequest, handleApiError } from '../../../lib/api-utils';

export async function POST(request: NextRequest) {
  try {
    // バリデーション
    const validation = await validateRequest(request, createPropertySchema);
    if (!validation.success) {
      return NextResponse.json(validation.error, { status: 400 });
    }
    
    const data = validation.data;
    
    // 所有者存在チェック
    const owner = mockOwners.find(o => o.id === data.owner_id);
    if (!owner) {
      return NextResponse.json({
        success: false,
        data: null,
        error: {
          code: 'OWNER_NOT_FOUND',
          message: '指定された所有者が見つかりません'
        }
      }, { status: 404 });
    }
    
    // 重複チェック
    const existingProperty = mockProperties.find(p => p.name === data.name);
    if (existingProperty) {
      return NextResponse.json({
        success: false,
        data: null,
        error: {
          code: 'DUPLICATE_ERROR',
          message: '同名の物件が既に存在します'
        }
      }, { status: 409 });
    }
    
    // 新規物件作成
    const newProperty = {
      id: crypto.randomUUID(),
      ...data,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    // TODO: 実際のDB保存処理
    mockProperties.push(newProperty);
    
    return NextResponse.json({
      success: true,
      data: newProperty,
      error: null
    }, { status: 201 });
    
  } catch (error) {
    const errorResponse = handleApiError(error);
    return NextResponse.json(errorResponse, { status: 500 });
  }
}
```

### スキーマ定義例

```typescript
// apps/web/src/app/api/properties/schemas.ts
import { z } from 'zod';

export const createPropertySchema = z.object({
  owner_id: z.string().min(1, '所有者IDは必須です'),
  name: z.string().min(1, '物件名は必須です').max(255),
  address: z.string().min(1, '住所は必須です').max(500),
  city: z.string().min(1, '市区町村は必須です').max(100),
  state: z.string().min(1, '都道府県は必須です').max(100),
  postal_code: z.string().regex(/^\d{3}-\d{4}$/, '郵便番号は000-0000の形式で入力してください'),
  country: z.string().min(1, '国は必須です').max(100),
  property_type: z.string().min(1, '物件種別は必須です').max(100),
  year_built: z.number().int().min(1800).max(new Date().getFullYear()).optional(),
  total_area: z.number().positive().optional(),
  purchase_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  purchase_price: z.number().positive().optional(),
  current_value: z.number().positive().optional(),
});

export const updatePropertySchema = createPropertySchema.partial().refine(
  (data) => Object.keys(data).length > 0,
  { message: '少なくとも1つのフィールドを更新してください' }
);
```

## Expenses API実装

### ファイル構成
```
apps/web/src/app/api/expenses/
├── route.ts              # GET, POST
├── [id]/
│   └── route.ts          # GET, PUT, DELETE
├── summary/
│   └── route.ts          # 集計API
└── schemas.ts
```

### 実装例: GET /api/expenses（一覧取得）

```typescript
// apps/web/src/app/api/expenses/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getExpensesQuerySchema } from './schemas';
import { mockExpenses, mockProperties } from '../../../data/mockData';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const queryParams = Object.fromEntries(searchParams.entries());
    
    // クエリパラメータのバリデーション
    const validation = getExpensesQuerySchema.safeParse(queryParams);
    if (!validation.success) {
      return NextResponse.json({
        success: false,
        data: null,
        error: {
          code: 'INVALID_QUERY',
          message: 'クエリパラメータが不正です',
          details: validation.error.errors
        }
      }, { status: 400 });
    }
    
    const query = validation.data;
    
    // フィルタリング
    let filteredExpenses = mockExpenses;
    
    if (query.property_id) {
      filteredExpenses = filteredExpenses.filter(e => e.property_id === query.property_id);
    }
    
    if (query.category) {
      filteredExpenses = filteredExpenses.filter(e => e.category === query.category);
    }
    
    if (query.start_date) {
      filteredExpenses = filteredExpenses.filter(e => e.expense_date >= query.start_date);
    }
    
    if (query.end_date) {
      filteredExpenses = filteredExpenses.filter(e => e.expense_date <= query.end_date);
    }
    
    // ソート
    if (query.sort) {
      filteredExpenses.sort((a, b) => {
        switch (query.sort) {
          case 'date_desc':
            return new Date(b.expense_date).getTime() - new Date(a.expense_date).getTime();
          case 'date_asc':
            return new Date(a.expense_date).getTime() - new Date(b.expense_date).getTime();
          case 'amount_desc':
            return b.amount - a.amount;
          case 'amount_asc':
            return a.amount - b.amount;
          default:
            return 0;
        }
      });
    }
    
    // ページネーション
    const page = query.page || 1;
    const limit = query.limit || 20;
    const offset = (page - 1) * limit;
    const paginatedExpenses = filteredExpenses.slice(offset, offset + limit);
    
    // 物件名を付与
    const enrichedExpenses = paginatedExpenses.map(expense => {
      const property = mockProperties.find(p => p.id === expense.property_id);
      return {
        ...expense,
        property_name: property?.name || '不明な物件'
      };
    });
    
    // サマリー計算
    const totalAmount = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);
    const byCategory = filteredExpenses.reduce((acc, e) => {
      acc[e.category] = (acc[e.category] || 0) + e.amount;
      return acc;
    }, {} as Record<string, number>);
    
    const byProperty = filteredExpenses.reduce((acc, e) => {
      const property = mockProperties.find(p => p.id === e.property_id);
      const propertyName = property?.name || '不明な物件';
      if (!acc[e.property_id]) {
        acc[e.property_id] = { property_name: propertyName, total: 0 };
      }
      acc[e.property_id].total += e.amount;
      return acc;
    }, {} as Record<string, { property_name: string; total: number }>);
    
    return NextResponse.json({
      success: true,
      data: {
        expenses: enrichedExpenses,
        pagination: {
          current_page: page,
          total_pages: Math.ceil(filteredExpenses.length / limit),
          total_count: filteredExpenses.length,
          has_next_page: offset + limit < filteredExpenses.length,
          has_prev_page: page > 1
        },
        summary: {
          total_amount: totalAmount,
          by_category: byCategory,
          by_property: byProperty
        }
      },
      error: null
    });
    
  } catch (error) {
    const errorResponse = handleApiError(error);
    return NextResponse.json(errorResponse, { status: 500 });
  }
}
```

## 共通ユーティリティ実装

### API共通関数

```typescript
// apps/web/src/lib/api-utils.ts
import { z } from 'zod';
import { NextRequest } from 'next/server';

export async function validateRequest<T>(
  request: NextRequest,
  schema: z.ZodSchema<T>
): Promise<{ success: true; data: T } | { success: false; error: any }> {
  try {
    const body = await request.json();
    const validatedData = schema.parse(body);
    return { success: true, data: validatedData };
  } catch (error) {
    return { success: false, error: handleApiError(error) };
  }
}

export function handleApiError(error: unknown) {
  if (error instanceof z.ZodError) {
    return {
      success: false,
      data: null,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'バリデーションエラー',
        details: error.errors.map(e => ({
          field: e.path.join('.'),
          message: e.message
        }))
      }
    };
  }
  
  if (error instanceof Error) {
    return {
      success: false,
      data: null,
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message
      }
    };
  }
  
  return {
    success: false,
    data: null,
    error: {
      code: 'UNKNOWN_ERROR',
      message: '予期しないエラーが発生しました'
    }
  };
}

// ID存在チェック関数
export function checkResourceExists<T extends { id: string }>(
  resources: T[],
  id: string,
  resourceName: string
): T | never {
  const resource = resources.find(r => r.id === id);
  if (!resource) {
    throw new Error(`${resourceName}が見つかりません: ${id}`);
  }
  return resource;
}

// 重複チェック関数
export function checkDuplicate<T>(
  resources: T[],
  field: keyof T,
  value: any,
  excludeId?: string
): boolean {
  return resources.some(r => 
    r[field] === value && 
    (excludeId ? (r as any).id !== excludeId : true)
  );
}
```

## テスト実装指針

### 1. APIテストの基本構造

```typescript
// __tests__/api/properties.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { POST, PUT, DELETE } from '../../../src/app/api/properties/route';
import { NextRequest } from 'next/server';

describe('/api/properties', () => {
  beforeEach(() => {
    // モックデータのリセット
  });
  
  describe('POST', () => {
    it('正常な物件作成', async () => {
      const request = new NextRequest('http://localhost/api/properties', {
        method: 'POST',
        body: JSON.stringify({
          owner_id: 'owner-001',
          name: 'テスト物件',
          address: '東京都テスト区1-1-1',
          // ... 他の必須フィールド
        })
      });
      
      const response = await POST(request);
      const data = await response.json();
      
      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.data.name).toBe('テスト物件');
    });
    
    it('バリデーションエラー', async () => {
      const request = new NextRequest('http://localhost/api/properties', {
        method: 'POST',
        body: JSON.stringify({
          // 必須フィールドが不足
        })
      });
      
      const response = await POST(request);
      const data = await response.json();
      
      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('VALIDATION_ERROR');
    });
  });
});
```

## 実装順序とマイルストーン

### Phase 1: 基盤実装（1-2日）
1. 共通ユーティリティ関数作成
2. エラーハンドリングパターン確立
3. バリデーション基盤構築

### Phase 2: Properties API（1日）
1. POST /api/properties
2. PUT /api/properties/[id]
3. DELETE /api/properties/[id]
4. テスト実装

### Phase 3: Expenses API（2日）
1. GET /api/expenses（一覧・フィルタ・ページネーション）
2. POST /api/expenses
3. PUT /api/expenses/[id]
4. DELETE /api/expenses/[id]
5. GET /api/expenses/summary
6. テスト実装

### Phase 4: Property Taxes API（2日）
1. GET /api/property-taxes
2. POST /api/property-taxes
3. PUT /api/property-taxes/[id]
4. 支払い管理エンドポイント
5. テスト実装

### Phase 5: Cash Flow Analysis API（3-4日）
1. 基本分析エンドポイント
2. 詳細分析機能
3. 予測機能（簡易版）
4. テスト実装

## 注意事項

### 1. データベース移行準備
- 現在はmockDataを使用
- 将来的にSupabaseへの移行を想定
- データ構造の変更に対応できる設計

### 2. セキュリティ考慮
- 入力データのサニタイゼーション
- SQLインジェクション対策
- 権限チェックの実装準備

### 3. パフォーマンス考慮
- 大量データ処理の最適化
- キャッシュ戦略の検討
- インデックス設計の準備

### 4. 互換性維持
- 既存APIとの互換性確保
- フロントエンドとの連携確認
- レスポンス形式の一貫性