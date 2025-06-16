# RichmanManage ドキュメント

このディレクトリには、RichmanManageプロジェクトの設計・仕様書が格納されています。

## 📁 ディレクトリ構成

```
docs/
├── README.md                      # このファイル
├── requirements-and-screens.md    # 要件定義・画面一覧
├── project-charter.md            # プロジェクト憲章
├── design-principles.md          # 設計原則・ガイドライン
├── data-model.md                 # データモデル図
├── business-workflow.md          # 業務フロー図
└── features/                     # 機能別詳細設計
    ├── property/                 # 物件管理機能
    │   └── property-management.md
    ├── loan/                     # 借入管理機能
    │   └── loan-management.md
    ├── rent-roll/                # レントロール管理機能
    │   └── rent-roll-management.md
    ├── property-tax/             # 固定資産税管理機能
    │   └── property-tax-management.md
    ├── ai/                       # AI機能
    │   └── ai-data-import.md    # AIデータインポート
    ├── expense/                  # 支出管理機能
    ├── cash-flow/                # キャッシュフロー機能
    ├── dashboard/                # ダッシュボード機能
    └── auth/                     # 認証機能
```

## 📖 ドキュメント一覧

### 基本ドキュメント

| ドキュメント | 説明 | 対象読者 |
|-------------|------|----------|
| [要件定義・画面一覧](./requirements-and-screens.md) | サービス概要、機能要件、画面一覧を統合 | 全員 |
| [プロジェクト憲章](./project-charter.md) | ビジョン、ミッション、成功の定義 | PM、ステークホルダー |
| [設計原則・ガイドライン](./design-principles.md) | 技術的な判断基準、コーディング規約 | 開発者 |
| [データモデル図](./data-model.md) | ER図、テーブル設計、制約 | 開発者、DBA |
| [業務フロー図](./business-workflow.md) | ユーザーの業務プロセス、システム利用フロー | 全員 |

### 機能別詳細設計

| 機能 | ドキュメント | 内容 |
|------|-------------|------|
| 物件管理 | [property-management.md](./features/property/property-management.md) | 物件CRUD、収支計算ロジック |
| 借入管理 | [loan-management.md](./features/loan/loan-management.md) | ローン管理、返済スケジュール |
| レントロール | [rent-roll-management.md](./features/rent-roll/rent-roll-management.md) | 入退去管理、家賃履歴 |
| 固定資産税 | [property-tax-management.md](./features/property-tax/property-tax-management.md) | 税金管理、納付スケジュール |
| AI機能 | [ai-data-import.md](./features/ai/ai-data-import.md) | 画像からのデータ自動抽出 |

## 🚀 ドキュメントの使い方

### 新規参画者の場合
1. [プロジェクト憲章](./project-charter.md) でプロジェクトの目的を理解
2. [要件定義・画面一覧](./requirements-and-screens.md) で機能全体を把握
3. [設計原則・ガイドライン](./design-principles.md) で開発ルールを確認
4. 担当機能の詳細設計書を読む

### 機能開発時
1. 該当機能の詳細設計書を確認
2. [データモデル図](./data-model.md) でDB構造を確認
3. [設計原則・ガイドライン](./design-principles.md) に従って実装
4. 変更があれば該当ドキュメントを更新

### レビュー時
1. [設計原則・ガイドライン](./design-principles.md) のチェックリストを使用
2. 機能仕様との整合性を確認
3. ドキュメントの更新漏れをチェック

## 📝 ドキュメント管理ルール

### 更新タイミング
- **仕様変更時**: 決定後、実装前に更新
- **バグ修正時**: 仕様に影響する場合は更新
- **リファクタリング時**: 設計に影響する場合は更新

### 更新方法
1. 該当ドキュメントを修正
2. 更新履歴に記載（各ドキュメント末尾）
3. PRにドキュメント更新を含める
4. レビューで内容確認

### 命名規則
- ファイル名: kebab-case（例: property-management.md）
- ディレクトリ名: kebab-case（例: property-tax/）
- 見出し: 日本語可（例: ## 物件管理機能）

## 🔍 よくある質問

### Q: 新しい機能を追加する場合は？
A: features/ディレクトリに新しいフォルダを作成し、詳細設計書を追加してください。

### Q: 画面を追加する場合は？
A: requirements-and-screens.mdの画面一覧に追加し、必要に応じて詳細設計書も作成してください。

### Q: APIの仕様はどこに書く？
A: 各機能の詳細設計書内に「API仕様」セクションとして記載してください。

### Q: テスト仕様は？
A: 各機能の詳細設計書内に「テスト観点」として記載してください。詳細なテストケースは別途管理。

## 📞 お問い合わせ

ドキュメントに関する質問や改善提案は、GitHubのIssueまたはSlackの#richman-docsチャンネルまでお願いします。

---
最終更新: 2024-12-16