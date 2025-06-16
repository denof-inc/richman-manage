#!/bin/bash

# 🤖 RichMan AI Agents メッセージ送信システム

# エージェント→tmuxターゲット マッピング
get_agent_target() {
    case "$1" in
        "product-owner"|"po") echo "richman-president" ;;
        "tech-lead"|"tl") echo "richman-agents:0.0" ;;
        "frontend-dev"|"frontend"|"fe") echo "richman-agents:0.1" ;;
        "backend-dev"|"backend"|"be") echo "richman-agents:0.2" ;;
        "qa-engineer"|"qa"|"test") echo "richman-agents:0.3" ;;
        *) echo "" ;;
    esac
}

show_usage() {
    cat << EOF
🏢 RichMan AI Agents メッセージ送信

使用方法:
  $0 [エージェント名] [メッセージ]
  $0 --list

利用可能エージェント:
  product-owner (po)    - プロダクトオーナー (要件定義・優先順位)
  tech-lead (tl)        - 技術リーダー (設計・アーキテクチャ)
  frontend-dev (fe)     - フロントエンド開発 (Next.js/React/UI)
  backend-dev (be)      - バックエンド開発 (API/DB/認証)
  qa-engineer (qa)      - 品質保証 (テスト/E2E/品質管理)

使用例:
  $0 product-owner "固定資産税管理機能を追加してください"
  $0 tech-lead "新機能のアーキテクチャ設計をお願いします"
  $0 frontend-dev "UIコンポーネント作成をお願いします"
  $0 backend-dev "API実装をお願いします"
  $0 qa-engineer "テスト作成をお願いします"
EOF
}

show_agents() {
    echo "📋 RichMan開発チーム:"
    echo "======================"
    echo "  product-owner → richman-president    (要件定義・ビジネス価値)"
    echo "  tech-lead     → richman-agents:0.0   (技術設計・アーキテクチャ)"
    echo "  frontend-dev  → richman-agents:0.1   (UI/UX・Next.js開発)"
    echo "  backend-dev   → richman-agents:0.2   (API・データベース)"
    echo "  qa-engineer   → richman-agents:0.3   (テスト・品質保証)"
}

# ログ記録
log_send() {
    local agent="$1"
    local message="$2"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    
    mkdir -p ai-agents/logs
    echo "[$timestamp] $agent: SENT - \"$message\"" >> ai-agents/logs/send_log.txt
}

# メッセージ送信
send_message() {
    local target="$1"
    local message="$2"
    
    echo "📤 送信中: $target ← '$message'"
    
    # Claude Codeのプロンプトを一度クリア
    tmux send-keys -t "$target" C-c
    sleep 0.3
    
    # メッセージ送信
    tmux send-keys -t "$target" "$message"
    sleep 0.1
    
    # エンター押下
    tmux send-keys -t "$target" C-m
    sleep 0.5
}

# ターゲット存在確認
check_target() {
    local target="$1"
    local session_name="${target%%:*}"
    
    if ! tmux has-session -t "$session_name" 2>/dev/null; then
        echo "❌ セッション '$session_name' が見つかりません"
        echo "💡 先に ./ai-agents/setup-richman.sh を実行してください"
        return 1
    fi
    
    return 0
}

# メイン処理
main() {
    if [[ $# -eq 0 ]]; then
        show_usage
        exit 1
    fi
    
    if [[ "$1" == "--list" ]]; then
        show_agents
        exit 0
    fi
    
    if [[ $# -lt 2 ]]; then
        show_usage
        exit 1
    fi
    
    local agent_name="$1"
    local message="$2"
    
    # エージェントターゲット取得
    local target
    target=$(get_agent_target "$agent_name")
    
    if [[ -z "$target" ]]; then
        echo "❌ エラー: 不明なエージェント '$agent_name'"
        echo "利用可能エージェント: $0 --list"
        exit 1
    fi
    
    # ターゲット確認
    if ! check_target "$target"; then
        exit 1
    fi
    
    # メッセージ送信
    send_message "$target" "$message"
    
    # ログ記録
    log_send "$agent_name" "$message"
    
    echo "✅ 送信完了: $agent_name に '$message'"
    
    return 0
}

main "$@"