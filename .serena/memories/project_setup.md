# RichmanManage プロジェクト開発環境情報

## パッケージマネージャー
- **使用しているパッケージマネージャー**: npm (v10.2.4以上)
- **ロックファイル**: package-lock.json
- **注意**: pnpmではなくnpmを使用している

## プロジェクト構造
- **モノレポ構造**: Turborepo使用
- **workspaces**: 
  - apps/web (メインのWebアプリケーション)
  - packages/* (共有パッケージ)

## テストフレームワーク
- **ユニットテスト**: Jest + React Testing Library
- **E2Eテスト**: Playwright

## 主要コマンド
```bash
# 開発サーバー起動
npm run dev

# テスト実行
npm test

# ビルド
npm run build

# 品質チェック（lint + type-check + format:check + test:ci）
npm run quality:check

# Lintチェック
npm run lint

# Lint自動修正
npm run lint:fix
```

## CI/CD
- GitHub Actionsで自動テスト実施
- Vercelでの自動デプロイ

最終更新: 2025-08-17