# RichmanManage プロジェクト概要

## プロジェクトの目的
不動産投資家向けに「物件・借入・レントロール情報」を一元管理できるWebアプリケーション。
金融機関への提出に耐えるPDF出力も含め、スマホ1つで物件状況と経営判断が完結することを目指す。

## 主な機能（MVP）
- 所有物件の登録・編集・削除（CRUD）
- 借入情報の履歴管理（開始情報・金利変動・返済履歴）
- レントロール入力と入居状況履歴管理
- 各月のキャッシュフロー自動集計
- 銀行提出用PDF出力（リッチマンとの連携を想定）

## プロジェクト構造
```
richman-manage/              # モノレポルート
├── apps/
│   └── web/                # Next.js フロントエンドアプリ
│       ├── src/
│       │   ├── app/        # App Router pages
│       │   ├── components/ # React components
│       │   ├── lib/        # ユーティリティ・設定
│       │   ├── types/      # TypeScript型定義
│       │   ├── utils/      # ヘルパー関数
│       │   └── data/       # モックデータ・定数
│       └── e2e/            # E2Eテスト（Playwright）
├── packages/               # 共通パッケージ（将来拡張用）
├── docs/                   # 設計・仕様書
├── db/                     # データベース関連
└── ai-agents/             # AIエージェント機能
```

## ビルドシステム
- **モノレポ管理**: Turborepo
- **パッケージマネージャー**: npm (10.2.4)
- **ワークスペース**: apps/*, packages/*

## GitHub情報
- リポジトリ: https://github.com/denof-inc/richman-manage
- Issues: https://github.com/denof-inc/richman-manage/issues