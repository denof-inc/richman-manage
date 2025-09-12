本書は、Next.js + Supabase + Zod + OpenAPI 3.1 のプロジェクトで、Zod を SSOT（Single Source of Truth）として OpenAPI を自動生成し、ドキュメント／型／SDK／CIまで一気通貫で整えるための実装指示書です。
現状（/lib/api/schemas/ に Zod スキーマ整備済み、next-swagger-doc と @swagger コメント運用）からの段階的な移行手順と、以後の運用ルールを明文化します。

⸻

0. 方針（結論）
	•	契約の SSOT：Zod スキーマ（入力・出力を分離し、.meta() 等で OpenAPI 情報を付与）
	•	交換仕様：OpenAPI 3.1（JSON Schema 2020‑12 準拠）を Zod から自動生成
	•	ドキュメント UI：Next.js 内に Scalar（または Redoc）を埋め込み
	•	型/SDK：openapi-typescript で 型生成、openapi-fetch で 軽量クライアント生成
	•	品質管理：Spectral/Redocly で Lint、oasdiff で破壊的変更検出、型テストで DB 型と整合確認
	•	移行：next-swagger-doc と @swagger コメントは 凍結→廃止。Zod 由来のみを正とする

ライブラリ選択（2択）
	•	オプション1（推奨）: zod-openapi … 既存 .meta() 方針を活かしやすく、移行コスト低
	•	オプション2: @asteasolutions/zod-to-openapi … Registry/Generator による厳格運用（将来拡張向き）

以降は オプション1（zod-openapi） を主軸に記述し、最後に オプション2 の導入要点を付録します。

⸻

1. 必須要件・前提
	•	Zod：v3.20+（可能なら v4 推奨）
	•	OpenAPI：3.1 を採用（3.0 系の nullable 等の挙動差に注意）
	•	Next.js：App Router 前提（Route Handlers 利用）
	•	すでに /lib/api/schemas/ に Zod スキーマが存在すること

⸻

2. 依存パッケージの導入
# Zod→OpenAPI 生成（オプション1）
pnpm add zod-openapi

# ドキュメント UI（Scalar を使用する場合）
pnpm add @scalar/nextjs-api-reference

# 型/SDK 生成
pnpm add -D openapi-typescript
pnpm add openapi-fetch

# OpenAPI Lint/差分
pnpm add -D @redocly/cli spectral oasdiff

# 型テスト（例：Vitest を使う場合）
pnpm add -D vitest @vitest/expect
TypeScript で .meta() を使うため、必要に応じて import 'zod-openapi' を各スキーマで宣言します。

3. ディレクトリ構成（提案）
/lib/
  api/
    schemas/                # 既存のZodスキーマ（入力/出力を分離）
      owner.ts
      ...resource.ts
    docs/                   # 各リソースの OpenAPI パス定義（Zod参照）
      owners.paths.ts
      ...resource.paths.ts
    openapi/                # 生成器（集約）
      document.ts           # createDocument() 実装
/app/
  api/
    openapi/route.ts        # /api/openapi.json を返す
  docs/page.tsx             # ドキュメントUI（Scalarなど）
/scripts/
  generate-openapi.ts       # 必要ならCLI用
/packages/generated/        # 自動生成物（型/SDK等を置く場所の一例）

4. Zod スキーマの整備（入力/出力/param の分離）

入力と出力は 別スキーマに分け、**ID（id / outputId など）**を付与して衝突や意図しない共有を防止。

/lib/api/schemas/owner.ts
import { z } from 'zod'
import 'zod-openapi' // TS型拡張（ランタイム変更なし）

export const OwnerKind = z.enum(['individual','corporation']).meta({
  id: 'OwnerKind',
  description: '所有者種別',
  example: 'individual',
})

export const CreateOwner = z.object({
  name: z.string().min(1).max(100).meta({ description: '所有者名', example: '山田太郎' }),
  owner_kind: OwnerKind.default('individual'),
}).meta({
  id: 'CreateOwner',
  description: '所有者作成リクエスト',
})

export const Owner = z.object({
  id: z.string().uuid().meta({ description: '所有者ID' }),
  user_id: z.string().uuid().meta({ description: 'ユーザーID' }),
  name: z.string().meta({ description: '所有者名' }),
  owner_kind: OwnerKind,
  created_at: z.string().datetime().meta({ description: '作成日時' }),
  updated_at: z.string().datetime().meta({ description: '更新日時' }),
  deleted_at: z.string().datetime().nullable().meta({ description: '削除日時' }),
}).meta({
  id: 'Owner',
  description: '所有者レスポンス',
})

export const OwnerIdParam = z.string().uuid().meta({
  id: 'OwnerId',
  description: '所有者ID',
  // zod-openapi の param メタ（使用している版に合わせてキー名を調整）
  param: { name: 'id', in: 'path', required: true },
})

共通エラー（RFC 9457 Problem Details）
/lib/api/schemas/problem-details.ts
import { z } from 'zod'
import 'zod-openapi'

export const ProblemDetails = z.object({
  type: z.string().url().optional(),
  title: z.string(),
  status: z.number().int(),
  detail: z.string().optional(),
  instance: z.string().optional(),
}).meta({
  id: 'ProblemDetails',
  description: 'RFC 9457 Problem Details',
})
5. OpenAPI パス定義（Zod を参照し paths を宣言）

/lib/api/docs/owners.paths.ts
import { z } from 'zod'
import { CreateOwner, Owner, OwnerIdParam } from '../schemas/owner'
import { ProblemDetails } from '../schemas/problem-details'

export const ownersPaths = {
  '/api/owners': {
    get: {
      tags: ['Owners'],
      operationId: 'listOwners',
      summary: '所有者一覧を取得',
      responses: {
        200: { description: '成功', content: { 'application/json': { schema: z.array(Owner) } } },
        401: { $ref: '#/components/responses/Unauthorized' },
      },
    },
    post: {
      tags: ['Owners'],
      operationId: 'createOwner',
      summary: '所有者を作成',
      requestBody: { required: true, content: { 'application/json': { schema: CreateOwner } } },
      responses: {
        201: { description: '作成成功', content: { 'application/json': { schema: Owner } } },
        400: { $ref: '#/components/responses/BadRequest' },
        401: { $ref: '#/components/responses/Unauthorized' },
      },
    },
  },
  '/api/owners/{id}': {
    get: {
      tags: ['Owners'],
      operationId: 'getOwner',
      summary: '所有者詳細を取得',
      requestParams: { path: z.object({ id: OwnerIdParam }) },
      responses: {
        200: { description: '成功', content: { 'application/json': { schema: Owner } } },
        401: { $ref: '#/components/responses/Unauthorized' },
        404: { $ref: '#/components/responses/BadRequest' }, // 運用上は NotFound を用意してもOK
      },
    },
  },
} as const

6. OpenAPI ドキュメント生成（createDocument）

/lib/api/openapi/document.ts

import { createDocument } from 'zod-openapi'
import { ProblemDetails } from '../schemas/problem-details'
import { ownersPaths } from '../docs/owners.paths'

export function generateOpenAPIDoc() {
  return createDocument({
    openapi: '3.1.0',
    info: {
      title: 'RichmanManage API',
      version: '1.0.0',
      description: '不動産投資管理システムのAPI仕様',
    },
    // server variables を用意して環境を切替可能にしてもOK
    servers: [
      { url: 'https://api.example.com', description: 'Production' },
      { url: 'http://localhost:3000', description: 'Local' },
    ],
    components: {
      securitySchemes: {
        BearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      },
      responses: {
        BadRequest: {
          description: 'リクエスト不正',
          content: { 'application/problem+json': { schema: ProblemDetails } },
        },
        Unauthorized: {
          description: '認証エラー',
          content: { 'application/problem+json': { schema: ProblemDetails } },
        },
      },
      schemas: { ProblemDetails },
    },
    security: [{ BearerAuth: [] }],
    paths: {
      ...ownersPaths,
      // ...他リソースの paths を集約
    },
  })
}

7. Next.js 組込み（/api/openapi.json & /docs）

/app/api/openapi/route.ts

import { NextResponse } from 'next/server'
import { generateOpenAPIDoc } from '@/lib/api/openapi/document'

export const dynamic = 'force-static' // 生成を静的化したい場合は適宜

export async function GET() {
  const doc = generateOpenAPIDoc()
  return NextResponse.json(doc)
}

/app/docs/page.tsx（Scalar を使う例）
'use client'

import { ApiReference } from '@scalar/nextjs-api-reference'

export default function ApiDocsPage() {
  return (
    <ApiReference
      theme="default"
      layout="modern"
      configuration={{
        spec: { url: '/api/openapi' }, // 上のルート
        hideDownloadButton: false,
        withFonts: true,
      }}
    />
  )
}
既存の Swagger UI を使い続けたい場合は /api/openapi.json の URL を差し替えるだけでも可。

8. スクリプト（型/SDK 生成・Lint・Diff）

package.json（一例）
{
  "scripts": {
    "openapi:emit": "curl -sS http://localhost:3000/api/openapi -o packages/generated/openapi.json",
    "openapi:types": "openapi-typescript packages/generated/openapi.json -o packages/generated/schema.d.ts",
    "openapi:lint": "redocly lint packages/generated/openapi.json || spectral lint packages/generated/openapi.json",
    "openapi:diff": "oasdiff breaking packages/generated/prev.json packages/generated/openapi.json || true",
    "client:gen": "node scripts/generate-openapi-client.mjs",
    "typecheck": "tsc -p tsconfig.json --noEmit",
    "test:types": "vitest --typecheck"
  }
}
scripts/generate-openapi-client.mjs（最小例）
import { writeFileSync } from 'node:fs'

// openapi-fetch は型引数に openapi-typescript の出力型を使う方針
const content =
`import createClient from 'openapi-fetch'
import type { paths } from '../packages/generated/schema'

export const api = createClient<paths>({ baseUrl: process.env.NEXT_PUBLIC_BASE_URL || '' })
`
writeFileSync('packages/generated/client.ts', content)

運用では openapi:emit→openapi:lint→openapi:diff→openapi:types→client:gen の順に実行。

⸻

9. CI（GitHub Actions 例）

.github/workflows/contract.yml
name: contract
on:
  pull_request:
  push:
    branches: [ main ]

jobs:
  openapi:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
      - run: pnpm i --frozen-lockfile

      # Next を起動して OpenAPI を取得（SSGなら直取得でも可）
      - run: pnpm -w dev & sleep 3 && pnpm openapi:emit

      - run: pnpm openapi:lint
      - run: pnpm openapi:diff
      - run: pnpm openapi:types
      - run: pnpm client:gen

      # 型整合（アプリ側）
      - run: pnpm -w typecheck
      - run: pnpm -w test:types


⸻

10. Supabase（DB 型との整合）
	•	DB スキーマの SSOT は Postgres（Supabase）。
	•	アプリ側で Supabase 型生成を定期実行して Zod と突き合わせ。

	# Supabase 型生成（例）
supabase gen types typescript --project-id $SUPABASE_PROJECT_ID > src/types/supabase.ts

// e.g. /lib/api/schemas/__tests__/owner.types.test-d.ts
import { expectTypeOf } from 'vitest'
import { z } from 'zod'
import type { Database } from '@/src/types/supabase'
import { Owner } from '../owner'

type OwnerRow = Database['public']['Tables']['owners']['Row']
expectTypeOf<z.infer<typeof Owner>>().toMatchTypeOf<OwnerRow>()

破壊的な DB 変更や Zod 側の変更があると CI で検出できます。

⸻

11. 運用ルール（必ず守る）
	1.	OpenAPI 3.1 を唯一の仕様出力とし、Zod→自動生成以外で paths/components を編集しない
	2.	operationId を必須（命名規則：{resource}{Verb} 例：listOwners/createOwner）
	3.	エラーは RFC 9457 application/problem+json に統一（ProblemDetails 再利用）
	4.	securitySchemes は BearerAuth を標準（必要なら apikey を明示的に併用）
	5.	入力/出力スキーマの分離（同一 Zod を両面で使い回さない）
	6.	path/query/header は Zod 側に param/header メタで明示
	7.	examples/description を .meta() に必ず記述（最低 1 例）
	8.	PR 時チェック：openapi:lint / openapi:diff / typecheck / test:types をすべてパスすること

⸻

12. 段階的移行手順（next-swagger-doc → Zod-first）
	1.	凍結：@swagger コメントの新規追記を停止（ESLint ルールや PR テンプレで明示）
	2.	併存：/api/openapi.json（Zod 生成）を先に用意し、ドキュメント UI をこちらに切替
	3.	置換：各 API に対応する paths を **Zod 側（/lib/api/docs/*.paths.ts）**へ移植
	4.	削除：next-swagger-doc と @swagger コメントの依存を撤去（不要ファイル・設定を削除）
	5.	強制ガード：CI に openapi:lint と openapi:diff を追加し、逸脱を防止

⸻

13. よくある落とし穴と回避策
	•	3.0 に留まる → 3.1 に移行（null/oneOf 周りが素直）
	•	Server Actions を外部公開 API に流用 → Route Handlers + OpenAPI で契約化
	•	Zod と DB 型のドリフト → 型テストと oasdiff を CI に常設
	•	パラメータ定義の重複 → .meta({ param }) を使って Zod に集約
	•	examples/description 不足 → Lint ルールで必須化（Redocly/Spectral）

	14. PR テンプレ（サンプル）

.github/PULL_REQUEST_TEMPLATE.md

## 変更概要
- [ ] Zod スキーマ（入力/出力/param）を追加・更新
- [ ] OpenAPI 3.1 生成（/api/openapi.json）に反映
- [ ] ドキュメント UI（/docs）で確認済み

## チェック項目（必須）
- [ ] `pnpm openapi:lint` を実行し警告ゼロ
- [ ] `pnpm openapi:diff` を実行し破壊的変更なし or 周知済み
- [ ] `pnpm openapi:types` / `pnpm client:gen` を実行
- [ ] `pnpm typecheck` / `pnpm test:types` パス
- [ ] examples/description/operationId/security の記載

15. 参考：@asteasolutions/zod-to-openapi を選ぶ場合（要点のみ）
	•	Registry で Zod スキーマと paths を登録し、OpenApiGeneratorV31 で出力
	•	生成ポリシー（union → anyOf/oneOf など）を オプションで統制でき、大規模運用での整合・安定に強い
	•	既存 .meta() もある程度読めるため、段階移行がしやすい

最小コード（概念）

import { OpenAPIRegistry, OpenApiGeneratorV31 } from '@asteasolutions/zod-to-openapi'
import { CreateOwner, Owner } from '../schemas/owner'

const registry = new OpenAPIRegistry()
registry.register('CreateOwner', CreateOwner)
registry.register('Owner', Owner)

registry.registerPath({
  method: 'post',
  path: '/api/owners',
  tags: ['Owners'],
  operationId: 'createOwner',
  request: { body: { content: { 'application/json': { schema: CreateOwner } } } },
  responses: { 201: { description: 'OK', content: { 'application/json': { schema: Owner } } } },
})

export function generate() {
  const generator = new OpenApiGeneratorV31(registry.definitions)
  return generator.generateDocument({
    openapi: '3.1.0',
    info: { title: 'RichmanManage API', version: '1.0.0' },
  })
}

16. 受け入れ基準（Definition of Done）
	•	/api/openapi が OpenAPI 3.1 を返す（Zod 由来のみ）
	•	/docs で 最新仕様が可視化される（Scalar/Redoc 等）
	•	openapi-typescript で 型生成、openapi-fetch で SDK 生成できる
	•	CI で Lint / Diff / Typecheck / 型テスト が動作
	•	next-swagger-doc と @swagger コメントを撤去済み
	•	すべてのエラーが application/problem+json（ProblemDetails）で統一
	•	すべての operation に operationId が付与されている

⸻

付記
	•	ルータ統合をより強固にしたい場合は、将来 Hono + @hono/zod-openapi を導入し、ルート定義＝契約の密結合に寄せることも可能です（本指示書は既存構成を尊重し、まずは生成系の一本化に集中します）。