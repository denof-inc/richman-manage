# 開発コマンド一覧

## 基本コマンド

### 開発サーバー
```bash
npm run dev         # 開発サーバー起動 (http://localhost:3000)
turbo run dev       # Turboでの開発サーバー起動
```

### ビルド・本番
```bash
npm run build       # プロダクションビルド
npm run start       # 本番サーバー起動
turbo run build     # Turboでのビルド
```

## 品質管理

### リント・フォーマット
```bash
npm run lint        # ESLintチェック
npm run lint:fix    # ESLint自動修正
npm run format      # Prettier フォーマット
npm run fix         # format + lint:fix + lint:check 一括実行
```

### テスト
```bash
npm run test        # ユニットテスト実行 (Jest)
npm run test:e2e    # E2Eテスト実行 (Playwright) ※要設定
```

### 品質チェック（コミット前必須）
```bash
# CLAUDE.mdで推奨されているが、現在package.jsonに定義なし
# 代替として以下を実行:
npm run lint && npm run test
```

## Git関連

### ブランチ作成
```bash
git checkout -b feature/機能名    # 機能追加
git checkout -b fix/バグ名        # バグ修正
git checkout -b refactor/対象名   # リファクタリング
git checkout -b docs/内容         # ドキュメント
```

### コミット
```bash
git add .
git commit -m "feat: 新機能を追加"     # 日本語Conventional Commits
git commit -m "fix: バグを修正"
git commit -m "docs: READMEを更新"
```

### プルリクエスト
```bash
git push origin feature/機能名
# GitHub上でPR作成
# PR本文に "Closes #XX" を含める（Issue自動クローズ）
```

## Supabase関連

### マイグレーション（db/ディレクトリ）
```bash
# Supabase CLIが必要
supabase migration new 名前
supabase db push
```

## システムユーティリティ（macOS/Darwin）

### ファイル操作
```bash
ls -la              # ファイル一覧（隠しファイル含む）
find . -name "*.ts" # TypeScriptファイル検索
grep -r "pattern"   # パターン検索
```

### プロセス管理
```bash
lsof -i :3000      # ポート3000を使用中のプロセス確認
kill -9 PID        # プロセス強制終了
```

## Turborepo関連

### 並列実行
```bash
turbo run build lint test --parallel  # 複数タスク並列実行
turbo run dev --filter=web           # 特定アプリのみ実行
```

## 環境変数

### セットアップ
```bash
cp .env.example .env.local          # 環境変数ファイルコピー
# .env.localを編集してSupabase接続情報を設定
```

## トラブルシューティング

### 依存関係リセット
```bash
rm -rf node_modules package-lock.json
npm install
```

### TypeScriptエラー解消
```bash
npm install --force                 # 依存関係強制再インストール
# VSCode: Cmd+Shift+P → "TypeScript: Restart TS Server"
```

### ポート競合解消
```bash
lsof -i :3000                      # 使用中プロセス確認
kill -9 $(lsof -t -i:3000)        # 3000番ポート解放
```

## 注意事項
- コミット前は必ず`npm run lint`と`npm run test`を実行
- PRには必ず`Closes #XX`でIssue番号を記載
- 品質基準（テストカバレッジ80%、ESLintエラー0）を維持