# RichmanManage

## 📌 プロジェクト概要

**RichmanManage** は、不動産投資家向けに「物件・借入・レントロール情報」を一元管理できるアプリです。  
金融機関への提出に耐える PDF 出力も含め、スマホ1つで物件状況と経営判断が完結します。

## 🚀 主な機能（MVP）

- 所有物件の登録・編集・削除
- 借入情報の履歴管理（開始情報・金利変動・返済履歴）
- レントロール入力と入居状況履歴管理
- 各月のキャッシュフロー自動集計
- 銀行提出用 PDF 出力（リッチマンとの連携を想定）

詳細仕様は [`docs/mvp-spec.md`](./docs/mvp-spec.md) を参照してください。

## 📊 実装状況

### ✅ 実装済み機能
- **認証機能**: Supabase Authによるメール認証、ログイン/ログアウト
- **ダッシュボード**: 物件一覧表示、基本的なKPI表示
- **物件管理**: CRUD操作、物件一覧・詳細表示
- **借入管理**: 借入情報の登録・編集・表示
- **レントロール管理**: 部屋単位の入居状況管理
- **固定資産税管理**: 年度別税額管理、納付スケジュール
- **支出管理**: カテゴリ別支出の記録・管理
- **基本的なUI/UX**: レスポンシブデザイン、モバイル対応

### 🚧 開発中機能
- **高度な分析機能**: 詳細なキャッシュフロー分析
- **PDF出力**: 銀行提出用フォーマット
- **AIデータインポート**: 画像からの自動データ抽出

### 📅 今後の予定
- **外部API連携**: 銀行API、不動産情報API
- **モバイルアプリ**: React Native版の開発
- **多言語対応**: 英語・中国語対応

---

## 🛠️ 開発環境

- **フレームワーク**：Next.js 15.1 (App Router)
- **言語**：TypeScript 5.x
- **スタイリング**：Tailwind CSS + shadcn/ui
- **バックエンド / DB**：Supabase (PostgreSQL + Auth + Storage)
- **状態管理**：React Context + useReducer
- **フォーム管理**：React Hook Form + Zod
- **デプロイ**：Vercel
- **CI/CD**：GitHub Actions (Lint + Test + Type Check)
- **パッケージマネージャー**：pnpm
- **テスト**：Vitest (Unit) + Playwright (E2E)

---

## 🧪 セットアップ手順

```bash
# リポジトリのクローン
git clone git@github.com:denof-inc/richman-manage.git
cd richman-manage

# 依存関係のインストール（pnpm推奨）
pnpm install

# 環境変数の設定
cp .env.example .env.local
# .env.localを編集してSupabase接続情報を設定（詳細は下記参照）

# 開発サーバーの起動
pnpm run dev       # http://localhost:3000 でアクセス

# その他のコマンド
pnpm run build     # プロダクションビルド
pnpm run lint      # ESLintチェック
pnpm run test      # Vitestユニットテスト
pnpm run test:e2e  # Playwright E2Eテスト
pnpm run quality:check  # 品質チェック（lint + type-check + test）
```

## 📁 プロジェクト構造

```
richman-manage/                 # モノレポルート
├── apps/
│   └── web/                   # Next.js フロントエンドアプリ
│       ├── src/
│       │   ├── app/           # App Router pages
│       │   │   ├── (auth)/    # 認証関連ページ
│       │   │   ├── dashboard/ # ダッシュボード
│       │   │   ├── properties/# 物件管理
│       │   │   ├── loans/     # 借入管理
│       │   │   └── settings/  # 設定
│       │   ├── components/    # React components
│       │   │   ├── ui/        # shadcn/ui components
│       │   │   └── features/  # 機能別components
│       │   ├── lib/           # ユーティリティ・設定
│       │   ├── types/         # TypeScript型定義
│       │   ├── utils/         # ヘルパー関数
│       │   └── data/          # モックデータ・定数
│       ├── e2e/               # E2Eテスト（Playwright）
│       ├── public/            # 静的ファイル
│       └── mocks/         # テストモック
├── packages/                  # 共通パッケージ（将来拡張用）
├── docs/                      # 設計・仕様書
│   ├── features/              # 機能別詳細設計
│   ├── README.md              # ドキュメント概要
│   ├── requirements-and-screens.md
│   ├── data-model.md          # データベース設計
│   └── design-principles.md   # 設計原則
├── db/                        # データベース関連
├── ai-agents/                 # AIエージェント機能
├── .github/workflows/         # GitHub Actions
├── CLAUDE.md                  # 開発ガイドライン（重要）
├── README.md                  # このファイル
├── turbo.json                 # Turbo設定
└── package.json               # ルートpackage.json
```

## 🎯 開発方針

### 基本方針
- **実装を「Single Source of Truth」とする**: ドキュメントは実装から自動生成を基本とし、二重管理を避ける
- **TDD（Test Driven Development）**: t-wada流TDDを実践し、品質を確保
- **モバイルファースト**: スマートフォンでの操作性を最優先に設計
- **段階的リリース**: MVP → 機能拡張 → エンタープライズ版の順で開発

### コード品質基準
- **テストカバレッジ**: 80%以上を維持
- **TypeScript**: any型の使用は原則禁止
- **ESLint/Prettier**: 0エラー・0警告を維持
- **コミット前チェック**: `pnpm run quality:check`を必ず実行

### 開発ワークフロー
1. Issueの作成・アサイン
2. feature/fix ブランチの作成
3. TDDサイクルでの実装
4. 品質チェックの実行
5. PRの作成とレビュー
6. mainブランチへのマージ

詳細は[CLAUDE.md](./CLAUDE.md)を参照してください。

## 🔧 環境変数設定

### 必須環境変数

`.env.local`ファイルに以下の環境変数を設定してください：

```env
# Supabase設定
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# アプリケーション設定
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Supabase設定手順

1. [Supabase](https://supabase.com)でプロジェクトを作成
2. Settings > API から以下を取得：
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - Anon/Public Key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - Service Role Key → `SUPABASE_SERVICE_ROLE_KEY`
3. `.env.local`に設定値を記入
4. データベーススキーマは`db/`ディレクトリのマイグレーションファイルを実行

### 環境別設定

- **開発環境**: `.env.local`
- **本番環境**: Vercelの環境変数設定で管理
- **テスト環境**: `.env.test`（CI/CD用）

## 🆘 トラブルシューティング

### よくある問題と解決方法

#### 1. pnpm: command not found
```bash
# Node.js 16.14以降が必要
npm install -g pnpm
```

#### 2. TypeScriptエラーが解決しない
```bash
# 依存関係の再インストール
pnpm install --force

# TypeScript言語サーバーの再起動（VSCode）
Cmd/Ctrl + Shift + P → "TypeScript: Restart TS Server"
```

#### 3. Supabase接続エラー
- `.env.local`の設定値を再確認
- Supabaseプロジェクトの状態を確認（一時停止されていないか）
- ネットワーク接続を確認

#### 4. テストが失敗する
```bash
# テストデータベースのリセット
pnpm run test:db:reset

# キャッシュのクリア
pnpm run test -- --clearCache
```

### サポート

- **ドキュメント**: `docs/`ディレクトリ
- **開発ガイドライン**: [CLAUDE.md](./CLAUDE.md)
- **Issue報告**: [GitHub Issues](https://github.com/denof-inc/richman-manage/issues)
- **質問・相談**: GitHub Discussions（設定予定）
