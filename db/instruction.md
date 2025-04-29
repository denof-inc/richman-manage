# 【Devin向け】リッチマンManage 初期開発タスク指示書

## 1. ゴール定義 (Objective)

- 下記のDB設計を執行し、**DDL文 (CREATE TABLE文) を作成**する
- ENUM型定義と外部キー制約も設定
- Supabase(PostgreSQL基盤)を想定

## 2. 作業範囲 (Scope)

- 10テーブルのDDL作成
- ENUM型定義、使用
- 外部キーの設定
- created_at, updated_atを全テーブルに追加
- 削除フラグは現時点で不要

## 3. テーブル一覧

- users
- owners
- properties
- units
- unit_status_histories
- unit_payment_records
- loans
- loan_repayments
- loan_interest_changes
- expenses

## 4. リレーション定義 (Relationships)

- users → owners
- owners → properties
- properties → (units, loans, expenses)
- units → (unit_status_histories, unit_payment_records)
- loans → (loan_repayments, loan_interest_changes)

## 5. ENUM型リスト

- owners.type : individual / corporate
- units.unit_type : residence / tenant / parking / vending / solar
- units.status, unit_status_histories.status : occupied / vacant
- unit_payment_records.payment_status : normal / delayed / delinquent / adjusted
- loans.repayment_method : principal_equal / annuity

## 6. 納品物

- DDL文 (全CREATE TABLE文 + ENUM型定義)
- 外部キー制約設定済み
- SQLファイルとして紹介

## 7. 重要ルール

- UUIDをPKとする (serial/int使わない)
- created_at, updated_atは必ず追加
- ENUM型はCREATE TYPEしてから使用
- 外部キーは本気で性能重視
- 無駄な追加開発や魚角調整はしない

---

# 【Manus向け】リッチマンManage DB設計レビュー指示書

## 1. タスク目的 (Objective)

- 指示書のスキーマを読み解き
- 設計思想に符合しているかをレビュー
- 問題点、改善案があれば指摘

## 2. 作業範囲 (Scope)

- 全10テーブル構成、ENUM定義をレビュー
- 以下観点で検証
  - 正規化が適切か
  - リレーション結合が逆でないか
  - ENUM型にムリがないか
- 改善案あればリスト化

## 3. 納品物

- 指摘一覧 (must / better で分類)
- (可能なら) 改善DDL案上げ

## 4. パラメータ

- テーブル設計の高級性を保つ
- 将来拡張性を必ず検証
- 遅延などの別案上げはしない

---

【結論】
- Devin：実装特化
- Manus：設計レビュー特化
- 最高スピードでデータベース設計を終わらせる。
