# パッケージ管理ポリシー（Monorepo / npm Workspaces）

本プロジェクトは npm workspaces によるモノレポ構成です。依存とスクリプトの運用を統一し、ドリフトや競合を回避します。

## 原則（SSOT）
- Lockfile はルート `package-lock.json` のみを正とする。
- 依存導入は必ずリポジトリ直下で実行する（`npm install`）。
- ワークスペース直下（`apps/*`, `packages/*`）での `npm install` は原則禁止。

## バージョン制約
- Node: `>= 18.18.0`
- npm: `>= 10.0.0`
（`package.json#engines` に明記 / `.npmrc` で `engine-strict` は未採用）

## 一時設定（暫定）
- Next 15 と UI ライブラリの peer 競合により、`.npmrc` に `legacy-peer-deps=true` を設定。
- ライブラリが Next 15 を正式サポートした時点で撤去する（Issue管理）。

## ディレクトリ/lockfile ルール
- `apps/*/node_modules` と `packages/*/node_modules` は .gitignore 済み。
- `apps/*/package-lock.json` のコミットは禁止（.gitignore 追加済み）。
- 既存のワークスペース直下 lockfile は削除する。

## スクリプト（共通）
- 品質チェック（CLAUDE.md準拠）: `npm run quality:check`
  - `format:check` → `lint:check` → `typecheck` → `test`
- 契約（OpenAPI）
  - 生成: `npm run openapi:emit`
  - Lint: `npm run openapi:lint`
  - Diff: `npm run openapi:diff`
  - 型生成: `npm run openapi:types`
  - クライアント生成: `npm run client:gen`

## よくある質問

Q. apps/web 直下でインストールしても良いですか？

A. 原則不可です。単体再現が必要な特別ケースを除き、モノレポ直下での `npm install` のみを許可します。lockfile の二重化・依存解決の分岐を招きます。

Q. 依存競合で `npm install` が失敗します。

A. `.npmrc` による暫定設定（`legacy-peer-deps=true`）で回避しています。長期的には該当ライブラリの更新で解消します。

---

最終更新: 2025-09-10
