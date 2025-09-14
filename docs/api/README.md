# API 仕様書（集約）

このディレクトリでは、アプリ内のHTTP APIの仕様を機能横断で集約します。現行は Zod→OpenAPI 3.1 生成（/api/openapi）をSSOTとし、必要に応じて要点を補足します。

ガイドライン

- 仕様のSSOTは Zod スキーマ（/apps/web/src/lib/api/schemas/\*）
- OpenAPI 3.1 は `generateOpenAPIDoc()` から自動生成（/api/openapi）
- 新規/変更時は当ディレクトリの該当ファイルも更新する
- エンドポイントは機能単位（owners, loans, properties 等）で分割

契約CI（contract）

- Node emit: `npm run openapi:emit:node`（dev不要）
- 生成 → Lint/Diff → Types → Client → 生成typesの軽量型チェック（tsc --noEmit）

目次（SSOT: Zodスキーマ／OpenAPI）

- Owners API: `/apps/web/src/lib/api/openapi/paths/owners.paths.ts`
- Loans API: `/apps/web/src/lib/api/openapi/paths/loans.paths.ts`
- Properties API: `/apps/web/src/lib/api/openapi/paths/properties.paths.ts`
- Expenses API: `/apps/web/src/lib/api/openapi/paths/expenses.paths.ts`
- RentRolls API: `/apps/web/src/lib/api/openapi/paths/rent-rolls.paths.ts`
- Users API: `/apps/web/src/lib/api/openapi/paths/users.paths.ts`
