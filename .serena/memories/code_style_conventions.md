# コードスタイルと規約

## 命名規則

### ファイル・ディレクトリ
- **ファイル名**: kebab-case（例: property-management.md, loan-details.tsx）
- **ディレクトリ名**: kebab-case（例: property-tax/, rent-roll/）
- **コンポーネントファイル**: PascalCase可（例: PropertyCard.tsx）

### TypeScript/JavaScript
- **インターフェース/型**: PascalCase（例: Property, LoanFilter）
- **変数・関数**: camelCase（例: currentValue, calculateTotal）
- **定数**: UPPER_SNAKE_CASE（例: MAX_LOAN_AMOUNT）
- **列挙型の値**: UPPER_SNAKE_CASE（例: PaymentStatus.PAID）

### データベース
- **テーブル名**: snake_case（例: user_profiles）
- **カラム名**: snake_case（例: created_at, owner_id）
- **主キー**: UUID使用
- **タイムスタンプ**: created_at, updated_at必須
- **論理削除**: deleted_atで管理

## TypeScript規約
- **any型**: 原則禁止
- **型定義**: すべての関数引数と戻り値に型を指定
- **インターフェース**: プロパティは必須/オプショナルを明確に
- **型の配置**: apps/web/src/types/に集約

## React/Next.js規約
- **コンポーネント**: 関数コンポーネントのみ使用
- **Hooks**: カスタムフックはuse接頭辞
- **Props**: インターフェースで型定義
- **スタイル**: Tailwind CSSクラスを使用（CSS-in-JSは避ける）

## API設計
- **RESTful設計**:
  - GET /api/resources - 一覧取得
  - POST /api/resources - 新規作成
  - GET /api/resources/:id - 詳細取得
  - PUT /api/resources/:id - 更新
  - DELETE /api/resources/:id - 削除
- **レスポンス形式**:
  ```json
  {
    "success": true,
    "data": {},
    "error": null
  }
  ```

## インポート規則
- 絶対パス推奨（@/で始まる）
- 順序: 外部ライブラリ → 内部モジュール → 型定義

## コメント
- **原則**: コードで意図を表現し、コメントは最小限に
- **必要な場合**: 複雑なビジネスロジックの説明のみ
- **形式**: 英語または日本語（一貫性を保つ）

## エラーハンドリング
- try-catchで適切にキャッチ
- ユーザーフレンドリーなエラーメッセージ
- エラーログの記録

## Git規約
- **コミットメッセージ**: 日本語のConventional Commits
  - feat: 新機能追加
  - fix: バグ修正
  - chore: ビルド・設定変更
  - docs: ドキュメント変更
  - style: コードスタイル変更
  - refactor: リファクタリング
  - test: テスト追加・修正