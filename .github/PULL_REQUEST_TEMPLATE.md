## 概要

このPRの目的・背景を簡潔に記載してください。

## 変更内容

- [ ] Zod スキーマ（入力/出力/params）の追加・更新
- [ ] OpenAPI 3.1 の生成（/api/openapi）に反映
- [ ] APIドキュメントUI（/docs/api）で確認済み（Scalar）
- [ ] 旧Swagger方式の追加や@swaggerコメントは未使用

## 確認項目（必須）

- [ ] `npm run openapi:emit` を実行し JSON を更新
- [ ] `npm run openapi:lint` で警告ゼロ
- [ ] `npm run openapi:diff` で破壊的変更なし（または合意済み）
- [ ] `npm run openapi:types && npm run client:gen` 実行済み
- [ ] `npm run quality:check`（format:check / lint / typecheck / test）パス

## 関連 Issue

Closes #<番号>

## 備考

必要に応じて補足を記載してください。

