# 技術スタック

## フロントエンド
- **フレームワーク**: Next.js 15.1 (App Router)
- **言語**: TypeScript 5.x
- **スタイリング**: Tailwind CSS + shadcn/ui
- **UIライブラリ**: 
  - lucide-react (アイコン)
  - recharts (グラフ)
  - clsx, tailwind-merge (ユーティリティ)

## バックエンド / データベース
- **BaaS**: Supabase
  - PostgreSQL (データベース)
  - Auth (認証)
  - Storage (ファイルストレージ)
- **API**: Next.js API Routes (RESTful)

## 状態管理・フォーム
- **状態管理**: React Context + useReducer
- **フォーム管理**: React Hook Form + Zod
- **バリデーション**: Zod

## 開発ツール
- **リンター**: ESLint (v9)
- **フォーマッター**: Prettier
- **プリコミットフック**: Husky + lint-staged
- **TypeScript**: 厳密モード（any型禁止）

## テスト
- **ユニットテスト**: Jest + React Testing Library
- **E2Eテスト**: Playwright
- **テストカバレッジ目標**: 80%以上

## デプロイ・CI/CD
- **ホスティング**: Vercel
- **CI/CD**: GitHub Actions
- **環境**:
  - 開発環境: .env.local
  - 本番環境: Vercel環境変数
  - テスト環境: .env.test

## その他のツール
- **CSS**: 
  - Tailwind CSS Forms Plugin
  - Tailwind CSS Typography Plugin
  - Autoprefixer
  - PostCSS