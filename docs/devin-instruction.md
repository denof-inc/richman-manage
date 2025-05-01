Devin 指示書：RichmanManage Web版MVP（モノレポ構成）

1. 概要

RichmanManage は、不動産投資家が所有物件・借入情報・レントロールを一元管理し、常に正しい情報から経営判断を可能にするための SaaS プロダクトです。
• ターゲット：法人化済み投資家が中心だが、1棟目〜3棟目の初心者も無料枠で想定
• リリース戦略：まずは Web MVP を Next.js で開発、次フェーズで React Native によりモバイル展開
• PDF出力がウリの一つであり、金融機関提出用ドキュメント生成が重要機能です

⸻

2. 技術構成（Web版MVP）

項目 内容
フロントエンド Next.js（App Router） + TypeScript
UIライブラリ Tailwind CSS + shadcn/ui
フォーム React Hook Form + zod
認証 Supabase Auth または Auth.js（Devinが得意な方を選択）
状態管理 基本 Props、必要に応じて Zustand
DB/API Supabase（PostgreSQL / schema.sql 使用）
PDF生成 未実装（別スプリント）
デプロイ Vercel（CI/CD前提）
課金 Stripe（初期は未導入。次回導入予定のため構成準備のみ）

⸻

3. ディレクトリ構成（モノレポ前提）

richman-manage/
├── apps/
│ ├── web/ # Web版 Next.js アプリ（今回構築）
│ └── mobile/ # React Native（将来的に追加）
├── packages/
│ ├── ui/ # 共通 UI コンポーネント
│ ├── config/ # eslint / prettier / tsconfig
│ └── utils/ # 共通ロジック（API・hooksなど）
├── db/
│ ├── schema.sql # Supabase 用 DB定義（完成済み）
├── docs/
│ ├── mvp-spec.md
│ ├── ui-design-spec.md
│ └── devin-instruction.md
├── .gitignore
├── README.md
└── turbo.json # 将来的に turborepo 予定

⸻

4. 機能・画面構成

4.1 ログイン（/login）
• 認証必須（メール＋パスワード）
• ログイン後にダッシュボードへ遷移

4.2 ダッシュボード（/dashboard）
• 月次総収入・支出・キャッシュフローのサマリー
• 「最近の入金/返済記録」など一覧簡易表示

4.3 物件一覧（/properties）
• 所有物件の一覧
• 表示：物件名、総収入、返済額、キャッシュフロー（月次）
• PDF出力対象

4.4 物件詳細（/properties/[id]）
• 所有者（個人/法人）切替可能（将来：複数所有対応）
• レントロール一覧、借入紐付け、物件属性、備考表示

4.5 借入一覧（/loans）
• 借入先、金利、残債、月額返済額表示
• 金利履歴も保持（変更可能）
• PDF出力対象（オプション）

4.6 借入詳細（/loans/[id]）
• 借入条件（元本、金利、返済方法、開始日）
• 毎月の返済履歴（元金・利息・残債）表示

4.7 レントロール（/rent-roll）
• 所有物件横断の部屋一覧
• 表示：部屋番号、家賃、共益費、入居状況、間取り、面積
• 推移PDF出力機能あり（例：年月×部屋で入居家賃セル）

4.8 キャッシュフロー（/cashflow）
• 月ごとの収支表
• 表：収入（家賃等）、支出（管理費、光熱費、修繕費、税金）、減価償却含む
• グラフ表示あり

4.9 PDF出力（/pdf-export）
• 出力種別選択（現時点 or 月次推移）
• 出力対象：物件一覧、借入一覧、レントロール
• A4複数枚を前提

4.10 設定（/settings）
• プロフィール・パスワード変更
• 法人アカウントの追加（複数所有対応）

4.11 課金（/settings/subscription）※次フェーズ導入予定
• Stripeでのプラン管理（準備のみ）
• DBには subscription_status, plan, next_billing_date を追加予定

⸻

5. DB設計
   • Supabase PostgreSQL ベース、DDLは db/schema.sql
   • Manus による構造レビュー済みで、インデックス・外部キー制約も網羅
   • 認証・ユーザーIDと各リソース（物件、借入等）にリレーションあり

⸻

6. 実装指針
   • 認証：Supabase Auth or Auth.js（Devinが得意な方）
   • Stripe：初期は使わないが lib/subscription.ts の枠、SDK初期化は済ませておく
   • UI：shadcn/uiとTailwindで統一。アクセシビリティにも配慮
   • バリデーション：全てzodで型と整合
   • ページ構成はApp Router（pagesディレクトリは使用しない）
   • 認証後のリダイレクト、ルートガードなどは含めて設計

⸻

7. その他
   • モバイルアプリ（apps/mobile）は空で作成し、将来 Expo + React Native にて着手予定
   • 共通部品は packages/ui や packages/utils に配置し、モバイルと共有可能に
   • CI/CD や Turborepo はWeb版安定後に着手

⸻

以上を前提に構築を開始してください。
不明点がある場合は逐次確認を。
