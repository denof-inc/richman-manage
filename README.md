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

---

## 🛠️ 開発環境

- **フロントエンド**：React Native (Expo)
- **バックエンド / DB**：Supabase
- **CI**：GitHub Actions (Lint + Test)
- **Lint / Test**：ESLint / Vitest

---

## 🧪 セットアップ手順

```bash
git clone git@github.com:denof-inc/richman-manage.git
cd richman-manage
npm ci
npm run dev       # Expo開発サーバー起動
npm run lint      # コードスタイルチェック
npm run test      # 単体テスト（Vitest）
```

