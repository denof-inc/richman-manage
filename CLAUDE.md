# CLAUDE.md - RichmanManage開発ガイドライン

## 🔨 最重要ルール - 新しいルールの追加プロセス

ユーザーから今回限りではなく常に対応が必要だと思われる指示を受けた場合：

1. 「これを標準のルールにしますか？」と質問する
2. YESの回答を得た場合、CLAUDE.mdに追加ルールとして記載する
3. 以降は標準ルールとして常に適用する

このプロセスにより、プロジェクトのルールを継続的に改善していきます。

## 📋 プロジェクト固有ルール

### コーディング規約

1. **言語**: TypeScript必須（any型は原則禁止）
2. **フレームワーク**: Next.js 15 (App Router)
3. **スタイリング**: Tailwind CSS + shadcn/ui
4. **状態管理**: React Context + useReducer（必要に応じてZustand）
5. **バリデーション**: Zod
6. **フォーマット**: Prettier設定に従う
7. **リント**: ESLint設定に従う（エラー0件必須）

### コミット規約

1. **形式**: 日本語でのConventional Commits
   ```
   feat: 新機能追加
   fix: バグ修正
   chore: ビルド・設定変更
   docs: ドキュメント変更
   style: コードスタイル変更
   refactor: リファクタリング
   test: テスト追加・修正
   ```

2. **例**:
   ```
   feat: 固定資産税管理機能を追加
   fix: レントロール画面の金額計算エラーを修正
   ```

### ファイル・ディレクトリ構成

```
apps/web/
├── src/
│   ├── app/              # App Router pages
│   ├── components/       # React components
│   │   ├── ui/          # shadcn/ui components
│   │   └── features/    # Feature-specific components
│   ├── lib/             # Utility functions
│   ├── types/           # TypeScript type definitions
│   └── hooks/           # Custom React hooks
```

### データベース設計

1. **命名規則**: スネークケース（例: property_taxes）
2. **主キー**: UUID使用
3. **タイムスタンプ**: created_at, updated_at必須
4. **論理削除**: deleted_atで管理

### API設計

1. **RESTful設計**: 
   - GET /api/properties - 一覧取得
   - POST /api/properties - 新規作成
   - GET /api/properties/:id - 詳細取得
   - PUT /api/properties/:id - 更新
   - DELETE /api/properties/:id - 削除

2. **レスポンス形式**:
   ```json
   {
     "success": true,
     "data": {},
     "error": null
   }
   ```

### テスト方針

1. **必須テスト**:
   - ユニットテスト（Vitest）
   - E2Eテスト（Playwright）
   
2. **カバレッジ目標**: 80%以上

### 不動産投資用語

以下の用語を正しく理解して使用する：

- **物件**: 不動産投資の対象となる建物
- **レントロール**: 賃貸物件の部屋別収支一覧
- **キャッシュフロー（CF）**: 家賃収入から支出を引いた手取り
- **満室想定家賃**: 全室が埋まった場合の想定家賃
- **実質利回り**: 諸経費を考慮した実際の利回り
- **固定資産税**: 不動産に課される地方税（年4回納付）

### UI/UX原則

1. **モバイルファースト**: スマートフォンでの操作性を優先
2. **即座の反映**: 入力データは即座にUIに反映
3. **エラー表示**: ユーザーフレンドリーなメッセージ
4. **ローディング**: 処理中は必ずローディング表示

### セキュリティ

1. **認証**: Supabase Auth使用
2. **RLS**: Row Level Security必須
3. **入力検証**: フロント・バックエンド両方で実施
4. **機密情報**: 環境変数で管理

### パフォーマンス

1. **初回表示**: 3秒以内
2. **画面遷移**: 1秒以内
3. **API応答**: 500ms以内

## 🚀 開発フロー

1. **Issue作成**: 作業開始前に必須
2. **ブランチ作成**: feature/[機能名] or fix/[バグ名]
3. **開発**: 上記ルールに従って実装
4. **テスト**: 自動テスト実行
5. **PR作成**: レビュー依頼
6. **マージ**: main/developへ

## 📝 ドキュメント更新

1. **変更時**: 仕様変更は必ずdocs/を更新
2. **新機能**: features/[機能名]/に詳細設計書作成
3. **API変更**: APIドキュメント更新必須

## 🔄 継続的改善

このドキュメントは生きたドキュメントです。新しいルールや改善点があれば、上記の最重要ルールに従って追加してください。

---
最終更新: 2024-12-16