# 🏢 RichMan AI Agents システム

RichMan不動産管理システム専用のマルチエージェント開発環境です。

## 🎯 概要

Claude Code Communication をベースにしたRichMan専用のAI開発チームです。5つの専門エージェントが連携して効率的な開発を実現します。

## 👥 開発チーム構成

| エージェント | 役割 | 専門領域 |
|-------------|------|----------|
| **product-owner** | プロダクトオーナー | 要件定義・ビジネス価値・優先順位 |
| **tech-lead** | 技術リーダー | アーキテクチャ設計・技術戦略 |
| **frontend-dev** | フロントエンド開発 | Next.js/React/UI/UX |
| **backend-dev** | バックエンド開発 | API/データベース/認証 |
| **qa-engineer** | 品質保証 | テスト/E2E/品質管理 |

## 🚀 クイックスタート

### 1. 環境構築
```bash
./ai-agents/setup-richman.sh
```

### 2. Claude Code起動
```bash
# Product Owner起動
tmux send-keys -t richman-president 'claude --dangerously-skip-permissions' C-m

# 開発チーム一括起動
for i in {0..3}; do tmux send-keys -t richman-agents:0.$i 'claude --dangerously-skip-permissions' C-m; done
```

### 3. 開発開始
Product Ownerに新機能や修正を依頼してください：
```bash
./ai-agents/agent-send.sh product-owner "固定資産税管理機能を追加してください"
```

## 💬 メッセージ送信

### 基本的な使用方法
```bash
./ai-agents/agent-send.sh [エージェント] [メッセージ]
```

### エージェント別使用例

#### Product Owner (要件定義)
```bash
./ai-agents/agent-send.sh product-owner "レントロール画面に入居者の更新履歴を追加してください"
./ai-agents/agent-send.sh po "物件収支レポート機能を実装してください"
```

#### Tech Lead (技術設計)
```bash
./ai-agents/agent-send.sh tech-lead "新機能のアーキテクチャ設計をお願いします"
./ai-agents/agent-send.sh tl "データベース設計を見直してください"
```

#### Frontend Developer (UI実装)
```bash
./ai-agents/agent-send.sh frontend-dev "物件詳細画面のUIを改善してください"
./ai-agents/agent-send.sh fe "レスポンシブデザインを実装してください"
```

#### Backend Developer (API実装)
```bash
./ai-agents/agent-send.sh backend-dev "収支計算APIを実装してください"
./ai-agents/agent-send.sh be "データベースの最適化をお願いします"
```

#### QA Engineer (品質保証)
```bash
./ai-agents/agent-send.sh qa-engineer "新機能のテストケースを作成してください"
./ai-agents/agent-send.sh qa "E2Eテストを実行して品質確認してください"
```

## 📋 開発ワークフロー

### 1. 要件定義フェーズ
```bash
# 1. Product Ownerに要件を伝える
./ai-agents/agent-send.sh product-owner "新機能：[機能名]を実装してください"

# 2. Product OwnerからTech Leadに技術設計を依頼
# (自動的に実行されます)
```

### 2. 開発フェーズ
```bash
# Tech Leadから各開発者に作業分担
# Frontend, Backend, QAに同時並行で指示が出されます
```

### 3. 統合フェーズ
```bash
# 各開発者の完了報告後、Tech Leadが統合
# QA Engineerが最終品質確認
```

## 🛠️ セッション管理

### セッション確認
```bash
tmux list-sessions
```

### セッション接続
```bash
# 開発チーム確認
tmux attach-session -t richman-agents

# Product Owner確認
tmux attach-session -t richman-president
```

### セッション終了
```bash
tmux kill-session -t richman-agents
tmux kill-session -t richman-president
```

## 📁 システム構成

```
ai-agents/
├── setup-richman.sh           # 環境構築スクリプト
├── agent-send.sh              # メッセージ送信スクリプト
├── instructions/              # エージェント別指示書
│   ├── product-owner.md       # PO専用指示
│   ├── tech-lead.md          # TL専用指示
│   └── developer.md          # 開発者専用指示
├── logs/                     # 通信ログ
│   └── send_log.txt          # 送信履歴
└── tmp/                      # 一時ファイル
```

## 🎯 RichMan特有の開発要件

### データモデル活用
- `/src/data/mockData.ts` の統一データソース活用
- 不動産業界特有のリレーションシップ（物件↔ユニット↔借入）

### UI/UX品質
- `@richman/ui` ライブラリの活用
- レスポンシブデザイン（現地確認での操作性）
- アクセシビリティ対応

### 技術品質
- TypeScript strict mode 準拠
- Next.js 15 + React 19 の最新機能活用
- Jest/Playwright による完全なテストカバレッジ

## 🔍 トラブルシューティング

### tmuxが見つからない場合
```bash
# macOS
brew install tmux

# Linux (Ubuntu/Debian)
sudo apt-get install tmux
```

### セッションが作成されない場合
```bash
# 既存セッションを削除してから再作成
tmux kill-session -t richman-agents
tmux kill-session -t richman-president
./ai-agents/setup-richman.sh
```

### メッセージが送信できない場合
```bash
# セッション存在確認
tmux list-sessions

# 必要に応じて再構築
./ai-agents/setup-richman.sh
```

## 📝 ログ確認

### 送信履歴確認
```bash
tail -f ai-agents/logs/send_log.txt
```

### エージェント一覧確認
```bash
./ai-agents/agent-send.sh --list
```

---

## 🏢 RichMan システム詳細

このAI Agentsシステムは、RichMan不動産管理システムの開発に特化されています：

- **Next.js 15** + **React 19** + **TypeScript**
- **Turbo Monorepo** 構成
- **統一モックデータ** による開発
- **Jest** + **Playwright** テスト環境
- **@richman/ui** 独自UIライブラリ

効率的なチーム開発で、高品質なRichManシステムを構築しましょう！