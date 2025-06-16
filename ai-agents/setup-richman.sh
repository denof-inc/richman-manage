#!/bin/bash

# 🏢 RichMan Management AI Agents Setup
# Next.js不動産管理システム専用マルチエージェント環境

set -e

# 色付きログ関数
log_info() {
    echo -e "\033[1;32m[INFO]\033[0m $1"
}

log_success() {
    echo -e "\033[1;34m[SUCCESS]\033[0m $1"
}

echo "🏢 RichMan Management AI Agents 環境構築"
echo "================================================"
echo ""

# プロジェクトディレクトリの確認
if [[ ! -f "package.json" ]] || [[ ! -f "turbo.json" ]]; then
    echo "❌ エラー: RichManプロジェクトのルートディレクトリで実行してください"
    exit 1
fi

# 既存セッションクリーンアップ
log_info "🧹 既存セッション削除..."
tmux kill-session -t richman-agents 2>/dev/null && log_info "richman-agentsセッション削除完了" || log_info "richman-agentsセッションは存在しませんでした"
tmux kill-session -t richman-president 2>/dev/null && log_info "richman-presidentセッション削除完了" || log_info "richman-presidentセッションは存在しませんでした"

# 作業ディレクトリ準備
mkdir -p ./ai-agents/tmp ./ai-agents/logs
rm -f ./ai-agents/tmp/worker*_done.txt 2>/dev/null || true

# richman-agentsセッション作成（4ペイン: tech-lead + frontend, backend, qa）
log_info "👥 richman-agentsセッション作成..."
tmux new-session -d -s richman-agents -n "dev-team"

# 2x2グリッド作成
tmux split-window -h -t "richman-agents:0"
tmux select-pane -t "richman-agents:0.0"
tmux split-window -v
tmux select-pane -t "richman-agents:0.2"
tmux split-window -v

# RichMan専用エージェント設定
AGENTS=("tech-lead" "frontend-dev" "backend-dev" "qa-engineer")
COLORS=("\033[1;31m" "\033[1;34m" "\033[1;36m" "\033[1;33m")

for i in {0..3}; do
    tmux select-pane -t "richman-agents:0.$i" -T "${AGENTS[$i]}"
    tmux send-keys -t "richman-agents:0.$i" "cd $(pwd)" C-m
    tmux send-keys -t "richman-agents:0.$i" "export PS1='(${COLORS[$i]}${AGENTS[$i]}\[\033[0m\]) \[\033[1;32m\]\w\[\033[0m\]\$ '" C-m
    tmux send-keys -t "richman-agents:0.$i" "echo '=== ${AGENTS[$i]} - RichMan不動産管理システム開発チーム ==='" C-m
done

# richman-presidentセッション作成
log_info "🏢 richman-presidentセッション作成..."
tmux new-session -d -s richman-president
tmux send-keys -t richman-president "cd $(pwd)" C-m
tmux send-keys -t richman-president "export PS1='(\[\033[1;35m\]PRODUCT-OWNER\[\033[0m\]) \[\033[1;32m\]\w\[\033[0m\]\$ '" C-m
tmux send-keys -t richman-president "echo '=== PRODUCT OWNER - RichManシステム ==='" C-m
tmux send-keys -t richman-president "echo '不動産管理システムの責任者'" C-m

log_success "✅ RichMan AI Agents環境構築完了！"

echo ""
echo "📊 セットアップ結果:"
echo "==================="
echo "📺 Tmux Sessions:"
tmux list-sessions

echo ""
echo "📋 開発チーム構成:"
echo "  richman-agentsセッション（4ペイン）:"
echo "    Pane 0: tech-lead      (技術リーダー - アーキテクチャ設計)"
echo "    Pane 1: frontend-dev   (フロントエンド開発 - Next.js/React)"
echo "    Pane 2: backend-dev    (バックエンド開発 - API/DB)"
echo "    Pane 3: qa-engineer    (品質保証 - テスト/E2E)"

echo ""
echo "  richman-presidentセッション（1ペイン）:"
echo "    Pane 0: PRODUCT-OWNER  (プロダクトオーナー - 要件定義)"

echo ""
echo "📋 開始手順:"
echo "  1. 🔗 セッション確認:"
echo "     tmux attach-session -t richman-agents    # 開発チーム確認"
echo "     tmux attach-session -t richman-president # PO確認"

echo ""
echo "  2. 🤖 Claude Code起動:"
echo "     # PO認証"
echo "     tmux send-keys -t richman-president 'claude --dangerously-skip-permissions' C-m"
echo "     # 開発チーム一括起動"
echo "     for i in {0..3}; do tmux send-keys -t richman-agents:0.\$i 'claude --dangerously-skip-permissions' C-m; done"

echo ""
echo "  3. 🎯 開発開始:"
echo "     POに「新機能開発」や「バグ修正」を依頼してください"
echo "     例: 'あなたはproduct-ownerです。固定資産税管理機能を追加してください'"