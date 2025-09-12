一言でいうとモノレポ（npm Workspaces + Turborepo）構成だからです。
このリポジトリは「apps/ にアプリ」「packages/ に共通ライブラリ」というモノレポ前提で組まれており、apps/web は Next.js のフロントエンドアプリ。開発・ビルドは Turbo で横断的に回す想定です。README にも npm（Monorepo Workspaces）、apps/web がフロントエンドだと明記があり、ルートには turbo.json や単一の package-lock.json も置かれています。 ￼

⸻

役割の分担
	•	ルートの package.json
	•	Workspaces の定義と全体オーケストレーション用スクリプト（build/lint/test など）
	•	共通の開発ツール（ESLint/Prettier/TypeScript/Turbo など）の devDependencies を集約
	•	単一ロックファイル（package-lock.json）でワークスペース全体の依存を固定
	•	例：npm run build で Turbo 経由の全体ビルド、npm --workspace apps/web run dev のようにワークスペースを指名してコマンド実行（README の手順にも記載）。 ￼
	•	apps/web/package.json
	•	Web アプリ（Next.js）の実行に必要な依存（next, react, UI ライブラリ等）とアプリ固有のスクリプト（next dev, next build など）
	•	デプロイ（Vercel 等）の単位として参照されるのも基本的にこの package.json。プロジェクト構造の説明でも apps/web が Next.js フロントと明記。 ￼

⸻

依存をどこに入れる？（実務ベースの目安）
	•	web だけで使う実行時依存 → apps/web に入れる
  npm install -w apps/web axios

  	•	全パッケージで使う開発ツール（ESLint/Prettier/TypeScript/Turbo など）→ ルートに devDep として入れる
    npm install -D -w . turbo eslint prettier typescript

	•	複数アプリから使う共通コード → packages/ に切り出して、そのパッケージに依存させる
（README でも packages/ は「共通パッケージ（将来拡張用）」とされており、将来的に apps/mobile を増やしてもスケールします。）  ￼

⸻

よくあるハマりどころ（予防策）
	•	next/react をルートに入れない：アプリ固有依存は apps/web 側に。
	•	依存の重複定義に注意：同じライブラリをルートと web の両方に入れない（解決はするが、想定外のホイストやデプロイ時の解決失敗の元）。
	•	ロックファイルはルートで一本化：ワークスペース運用ではルートの package-lock.json を正とする。ルートに turbo.json があるのも全体ビルドのためです。 ￼

⸻

まとめ
	•	ルート package.json：ワークスペース全体の司令塔（設定・共通ツール・横断スクリプト）
	•	apps/web/package.json：Web アプリ単体の仕様書（実行依存・アプリ専用スクリプト）

この分け方により、複数アプリの共存・依存の明確化・ビルド高速化・デプロイ容易化が実現できます。README の構成／コマンドからもその意図が読み取れます。 ￼

リポジトリの現状（README の明示情報）を前提に、ルート package.json と apps/web/package.json の役割分担と依存・scriptsの運用ルールをチームでそのまま使える形に落とし込みました。

前提としてこのリポジトリは npm Workspaces（モノレポ）＋ Turbo を採用し、Next.js 15（App Router）で apps/web がフロント、横断コマンドは基本 Turbo 経由という構成です。README で明言されています。 ￼

⸻

0) 用語と原則（合意事項）
	•	横断タスクは “同名script” を各パッケージに置く
→ build / dev / lint / test / typecheck は全パッケージで同じキー名にし、ルートは turbo run <task> を叩く。 ￼
	•	実行時依存は「使うアプリ」に置く。開発支援ツールはルートに集約。
→ Next/React/Tailwind/Supabase SDK など実行に必要なものは apps/web。ESLint/Prettier/TypeScript/Turbo/Husky など開発横断はルート。 ￼
	•	ワークスペース単位で起動
→ 開発時は npm --workspace apps/web run dev を基本にする（README 記載の流儀に合わせる）。 ￼
	•	ロックファイルはルートで一本化（npm）
→ package-lock.json はルートのみ。 ￼

1) 依存の置き場所ルール（決定版）
種別
代表例
置き場所
インストール例
Web の実行時依存
next, react, react-dom, @supabase/supabase-js, UI系（tailwindcss, lucide-react, class-variance-authority など）
apps/web
npm i -w apps/web next react react-dom
Web 専用の devDep
eslint-config-next, @types/node, @types/react, postcss, autoprefixer
基本 apps/web（Next依存のLint設定は web 側に）
npm i -D -w apps/web eslint-config-next @types/react
モノレポ横断の devDep
typescript, eslint, prettier, turbo, husky, lint-staged, テスト基盤（jest, playwright 等）
ルート
npm i -D -w . turbo typescript eslint prettier
複数アプリで再利用するコード
ドメイン層、UI キット、型パッケージ
packages/*（内部パッケージ）
npm i -w apps/web @org/ui（内部パッケージ名を参照）
型だけ共有
zod のスキーマ共有など
共有なら packages/types、Web専用なら apps/web
ー

※ README に「パッケージマネージャー：npm（Monorepo Workspaces）」と「apps/web がフロント」とあるため、上記ポリシーが素直にフィットします。 ￼

禁止事項
	•	同じ依存をルートと web に二重定義しない（ホイスト挙動の違いでデプロイ事故の温床）。
	•	next/react をルートに入れない（アプリ固有）。

⸻

2) scripts の置き場所・命名ルール

2-1. ルート package.json（司令塔）
	•	役割：Turbo パイプライン定義に沿ってモノレポ横断のコマンドを提供。CI もここから叩く。 ￼
	•	推奨 scripts 雛形
{
  "private": true,
  "workspaces": ["apps/*", "packages/*"],
  "scripts": {
    "dev": "turbo run dev --parallel",
    "build": "turbo run build",
    "lint": "turbo run lint",
    "test": "turbo run test",
    "typecheck": "turbo run typecheck",
    "format": "prettier --write .",
    "prepare": "husky install",

    "dev:web": "npm --workspace apps/web run dev",
    "build:web": "npm --workspace apps/web run build"
  },
  "devDependencies": {
    "turbo": "^2",
    "typescript": "^5",
    "eslint": "^9",
    "prettier": "^3",
    "husky": "^9",
    "lint-staged": "^15",
    "jest": "^29",
    "@playwright/test": "^1"
  }
}
2-2. apps/web/package.json（アプリ実行＆単体運用）
	•	役割：Next.js アプリのローカル起動・ビルド・Lintを自立完結させる。Vercel 等のデプロイ単位にもなる。 ￼
	•	推奨 scripts 雛形
{
  "name": "@app/web",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "typecheck": "tsc -p tsconfig.json --noEmit",
    "test": "jest --config ./jest.config.js",
    "e2e": "playwright test"
  },
  "dependencies": {
    "next": "15.x",
    "react": "18.x",
    "react-dom": "18.x",
    "@supabase/supabase-js": "^2"
  },
  "devDependencies": {
    "eslint-config-next": "15.x",
    "@types/node": "^20",
    "@types/react": "^18",
    "postcss": "^8",
    "autoprefixer": "^10"
  }
}
script 命名の原則
	•	横断で走らせたいタスク名は完全一致（build/lint/test/typecheck/dev）。
→ ルートの turbo run <task> が全ワークスペースを自動で回せる。
	•	パッケージ固有の補助タスクは : で命名（例：lint:fix、test:watch）。
	•	ルートにエイリアス（dev:web など）を置き、学習コストを下げる。

⸻

3) 依存追加フロー（チートシート）
	1.	どこで使う？
　- Web だけ → apps/web
　- 複数で共有 → packages/* に切り出し
　- 開発補助 → ルート
	2.	インストールコマンド

# Webの実行時依存
npm i -w apps/web <pkg>

# Web限定のdev依存（Lint/型などNext前提）
npm i -D -w apps/web <pkg>

# 横断のdev依存（ツール類）
npm i -D -w . <pkg>

# 内部パッケージをWebで使う
npm i -w apps/web @org/<internal-pkg>

	3.	PR チェック
　- npm run lint && npm run typecheck && npm run test && npm run build を CI で実行（README に CI/CD 記載あり）。 ￼

⸻

4) 環境変数のルール（Next 15 / Supabase 前提）
	•	クライアントで参照する値は NEXT_PUBLIC_ を付けて apps/web の .env.local に置く。
例：NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY（README の必須変数に準拠）。 ￼
	•	サーバ専用の機密値（Service Role など）はクライアントで使わない。Next のサーバルート/Route Handler でのみ参照。 ￼
	•	共通で使う固定値はルートに .env を置かず、各アプリに最小限（モノレポで環境を混ぜない）。

⸻

5) デプロイ運用（Vercel を想定）
	•	Root Directory：apps/web
	•	Install Command：npm ci（モノレポのルートで実行）
	•	Build Command：npm --workspace apps/web run build または ルートの npm run build（Turbo パイプラインが apps/web の build を解決）。
	•	Output：.next

リポジトリの構造と apps/web がフロントという前提に沿った標準構成です。 ￼

⸻

6) CI/CD（GitHub Actions の標準ジョブ例）

name: CI

on:
  push: { branches: [main] }
  pull_request:

jobs:
  ci:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm run lint
      - run: npm run typecheck
      - run: npm run test
      - run: npm run build

README に CI/CD 採用の明記があるため、上記をベースに各ジョブを発火。 ￼

⸻

7) よくある落とし穴と対策
	•	ESLint 設定の依存関係の“場所ズレ”
eslint-config-next は next に依存 → apps/web に置く（ルートに置くと解決失敗や Lint ルール不一致を招く）。
	•	Playwright の実行環境
横断で使うなら runner はルート devDep、テストは apps/web/e2e に。
	•	Husky/lint-staged
ルートの prepare で有効化。プリコミットはルートで eslint --max-warnings=0 と prettier --check を走らせる。
	•	バージョン固定
ルートに "packageManager": "npm@<version>" と engines.node を定義し、Node 版ズレを防止。

⸻

8) 即時導入チェックリスト
	•	ルートに workspaces と Turbo 前提の scripts が並ぶ
	•	apps/web に Next 実行 scripts（dev/build/start/lint/typecheck/test）
	•	横断ツールはルート devDep、Next 連動の Lint は web 側 devDep
	•	CI は npm ci → lint → typecheck → test → build の順
	•	Vercel は Root Directory=apps/web、Build Command はモノレポに合わせて指定
	•	.env.local は apps/web 管理（NEXT_PUBLIC_* と機密の切り分け） ￼

⸻

備考（取得できた情報の範囲）

GitHub のファイルビューワはこの環境から**package.json の生内容を直接参照できませんでしたが、README にはモノレポ（npm Workspaces）、apps/web が Next 15、横断コマンドは Turboという運用前提が明記されています。本ルールはその前提に正規合致する形で作っています。必要であれば、実ファイルの package.json 2つを貼っていただければ、キー単位での差分に合わせて最適化（不要依存の洗い出し / script の統一 / Turbo pipeline の具体化）**まで一気に落とし込みます。 ￼