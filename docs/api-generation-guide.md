# API仕様書・DBドキュメント自動生成ガイド

## 概要

「二重管理を避ける」原則に基づき、実装コードから自動的にドキュメントを生成する方法を説明します。

## 1. API仕様書の自動生成

### 1.1 必要なパッケージのインストール

```bash
npm install --save-dev @apidevtools/swagger-parser swagger-ui-react
npm install next-swagger-doc
```

### 1.2 API Routeへのアノテーション追加

```typescript
// app/api/properties/route.ts
import { NextRequest, NextResponse } from 'next/server';

/**
 * @swagger
 * /api/properties:
 *   get:
 *     tags:
 *       - Properties
 *     summary: 物件一覧を取得
 *     description: ユーザーが所有する全物件の一覧を取得します
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, inactive]
 *         description: 物件のステータスでフィルタリング
 *     responses:
 *       200:
 *         description: 成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Property'
 *       401:
 *         description: 認証エラー
 */
export async function GET(request: NextRequest) {
  // 実装
}

/**
 * @swagger
 * components:
 *   schemas:
 *     Property:
 *       type: object
 *       required:
 *         - id
 *         - name
 *         - address
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         name:
 *           type: string
 *           example: 新宿ビル
 *         address:
 *           type: string
 *           example: 東京都新宿区西新宿1-1-1
 *         acquisitionPrice:
 *           type: number
 *           example: 50000000
 */
```

### 1.3 Swagger設定ファイル

```typescript
// lib/swagger.ts
import { createSwaggerSpec } from 'next-swagger-doc';

export const getApiDocs = async () => {
  const spec = createSwaggerSpec({
    apiFolder: 'app/api',
    definition: {
      openapi: '3.0.0',
      info: {
        title: 'RichmanManage API',
        version: '1.0.0',
        description: '不動産投資管理システムのAPI仕様書',
      },
      servers: [
        {
          url: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000',
          description: 'API Server',
        },
      ],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
          },
        },
      },
    },
  });
  return spec;
};
```

### 1.4 Swagger UIページの作成

```typescript
// app/api-docs/page.tsx
'use client';

import { useEffect, useState } from 'react';
import SwaggerUI from 'swagger-ui-react';
import 'swagger-ui-react/swagger-ui.css';

export default function ApiDocsPage() {
  const [spec, setSpec] = useState(null);

  useEffect(() => {
    fetch('/api/openapi')
      .then((res) => res.json())
      .then(setSpec);
  }, []);

  if (!spec) return <div>Loading...</div>;

  return <SwaggerUI spec={spec} />;
}
```

## 2. DBドキュメントの自動生成

### 2.1 Supabaseスキーマからの生成

```bash
# スキーマのエクスポート
supabase db dump --schema-only > db/schema.sql

# ER図生成スクリプト
npm install --save-dev @mermaid-js/mermaid-cli
```

### 2.2 スキーマ解析スクリプト

```typescript
// scripts/generate-db-docs.ts
import fs from 'fs';
import path from 'path';

async function generateERDiagram() {
  // schema.sqlを解析
  const schema = fs.readFileSync('db/schema.sql', 'utf-8');
  
  // テーブル定義を抽出
  const tables = extractTables(schema);
  
  // Mermaid形式のER図を生成
  const mermaidDiagram = generateMermaidERD(tables);
  
  // ドキュメントに書き出し
  const output = `# データベーススキーマ（自動生成）

最終更新: ${new Date().toISOString()}

## ER図

\`\`\`mermaid
${mermaidDiagram}
\`\`\`

## テーブル定義

${generateTableDocs(tables)}
`;

  fs.writeFileSync('docs/generated/db-schema.md', output);
}
```

### 2.3 GitHub Actionsでの自動化

```yaml
# .github/workflows/generate-docs.yml
name: Generate Documentation

on:
  push:
    paths:
      - 'app/api/**'
      - 'supabase/migrations/**'

jobs:
  generate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          
      - name: Install dependencies
        run: npm ci
        
      - name: Generate API docs
        run: npm run generate:api-docs
        
      - name: Generate DB docs
        run: npm run generate:db-docs
        
      - name: Commit changes
        uses: EndBug/add-and-commit@v9
        with:
          add: 'docs/generated'
          message: 'docs: 自動生成ドキュメントの更新'
```

## 3. 実装例

### 3.1 package.jsonスクリプト

```json
{
  "scripts": {
    "generate:api-docs": "ts-node scripts/generate-api-docs.ts",
    "generate:db-docs": "ts-node scripts/generate-db-docs.ts",
    "generate:docs": "npm run generate:api-docs && npm run generate:db-docs"
  }
}
```

### 3.2 開発フロー

1. API RouteやDBスキーマを変更
2. `npm run generate:docs`を実行
3. 生成されたドキュメントを確認
4. コミット時に自動生成

## 4. メリット

1. **Single Source of Truth**: 実装が唯一の正
2. **常に最新**: コードと同期された状態を維持
3. **手間削減**: ドキュメント更新の手間を削減
4. **一貫性**: フォーマットの統一

## 5. 注意事項

- 生成されたファイルは`.gitignore`に追加しない（レビュー可能にするため）
- 生成ファイルは`docs/generated/`配下に配置
- 手動編集が必要な概念的な説明は別ファイルで管理

