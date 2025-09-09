# API 仕様書（集約）

このディレクトリでは、アプリ内のHTTP APIの仕様を機能横断で集約します。実装側の OpenAPI コメント（@swagger）をソースオブトゥルースとし、必要に応じて要点を補足します。

ガイドライン
- 実装に @swagger コメントを必ず付与する
- 新規/変更時は当ディレクトリの該当ファイルも更新する
- エンドポイントは機能単位（owners, loans, properties 等）で分割

目次（SSOT: 実装の@swagger）
- Owners API: 実装内の @swagger を参照（apps/web/src/app/api/owners）
- Loans API: 実装内の @swagger を参照（apps/web/src/app/api/loans）
- Properties API: 実装内の @swagger を参照（apps/web/src/app/api/properties）
