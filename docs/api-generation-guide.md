# API仕様書・DBドキュメント自動生成ガイド（Zod-first）

## 概要

二重管理を避けるため、ZodスキーマをSSOTとし、OpenAPI 3.1を自動生成してUIに表示します。従来の next-swagger-doc や @swagger コメントは撤去済みです。

## 1. API仕様書の自動生成（Zod→OpenAPI 3.1）

- 生成関数: `apps/web/src/lib/api/openapi/document.ts` の `generateOpenAPIDoc()`
- JSON出力: `GET /api/openapi`（`apps/web/src/app/api/openapi/route.ts`）
- UI: `GET /docs/api`（Scalar, `apps/web/src/app/docs/api/route.ts`）

ルートpackage.jsonには次の契約系スクリプトがあります。

```json
{
  "scripts": {
    "openapi:emit": "curl -sS http://localhost:3000/api/openapi -o packages/generated/openapi.json",
    "openapi:types": "npx openapi-typescript \"$INIT_CWD/packages/generated/openapi.json\" -o \"$INIT_CWD/packages/generated/schema.d.ts\"",
    "openapi:lint": "npx redocly lint \"$INIT_CWD/packages/generated/openapi.json\" || npx spectral lint \"$INIT_CWD/packages/generated/openapi.json\"",
    "openapi:diff": "npx redocly diff \"$INIT_CWD/packages/generated/prev.json\" \"$INIT_CWD/packages/generated/openapi.json\" || true",
    "client:gen": "node scripts/generate-openapi-client.mjs"
  }
}
```

開発フロー例:

1) `npm --workspace apps/web run dev` でローカル起動

2) `npm run openapi:emit && npm run openapi:lint && npm run openapi:diff`

3) `npm run openapi:types && npm run client:gen`

4) `http://localhost:<port>/docs/api` でUI確認（Scalar）

## 2. DBドキュメント

DBスキーマはSupabase(Postgres)のマイグレーションを正とし、必要に応じ`db/schema.sql`からER図等を生成します（詳細は別紙）。

## 備考（レガシー撤去）

- next-swagger-doc / Swagger UI iframe / @swagger コメントは使用しません。
- READMEのAPIドキュメント欄は `/api/openapi` と `/docs/api` を参照します。

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
