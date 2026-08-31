# ローカル開発・テスト

## 対象読者

このガイドは、アプリをローカルで実行し、変更を検証する開発者向けです。

## 必要なツール

- Node.js 22 推奨
- npm
- Chromium（Playwright のセットアップ時に取得）
- Azure Developer CLI (`azd`)（Azure へデプロイする場合のみ）

## セットアップ

lockfile と同じ依存関係をインストールします。

```powershell
npm ci
```

依存関係を更新する場合は `npm install` を使用し、`package-lock.json` の変更もコミットします。

Playwright のブラウザーが未導入の場合:

```powershell
npx playwright install chromium
```

## 開発サーバー

```powershell
npm run dev
```

Vite が通常 `http://localhost:5173` で開発サーバーを起動します。`--host 0.0.0.0` を設定済みなので、必要に応じて同一ネットワークの別端末からも接続できます。

## コマンド

| コマンド | 用途 |
| --- | --- |
| `npm run dev` | Vite 開発サーバーを起動 |
| `npm run build` | TypeScript を検査し、ルート配信用の `dist/` を生成 |
| `npm run build:pages` | `/openteleprompter/` ベースパスで Pages 用の `dist/` を生成 |
| `npm run preview` | 現在の `dist/` を Vite でプレビュー |
| `npm run test:e2e` | Playwright E2E テストを実行 |
| `npm run swa:start` | Azure Static Web Apps のローカルエミュレーターを起動 |
| `npm run swa:deploy` | SWA CLI から production 環境へデプロイ |

## 本番ビルド

```powershell
npm run build
```

このコマンドは次を順番に実行します。

1. `tsc` による型チェック
2. Vite によるバンドル
3. `dist/` への HTML、CSS、JavaScript、フォント、公開ファイルの出力

## E2E テスト

```powershell
npm run test:e2e
```

`playwright.config.ts` はテスト前に開発サーバーを起動し、Chromium で `tests/playback.spec.ts` を実行します。ローカルでポート 5173 に既存サーバーがある場合は再利用し、CI では新しいサーバーを起動します。

現在のテスト範囲:

- 再生開始、全画面化、自動スクロール
- 速度変更による想定再生時間の再計算と全画面表示
- 全画面コントロールと本文クリックによる再生切り替え
- 画面上端から 1/3〜1/2 の目線ガイドと配色設定
- 一行巻き戻しと一段落巻き戻し
- 明示的な制御タグへの巻き戻し
- 通常画面と全画面の文字サイズ、速度、行間の同期
- 日本語の禁則処理用 CSS
- 太字、斜体、下線、文字色の表示と保存
- 太字、斜体、下線のトグル解除
- 巻き戻しポイントの挿入、保存、テレプロンプター上での非表示
- 既存本文へ改行を追加した場合の内容保持

特定のテストだけを実行する場合:

```powershell
npm run test:e2e -- --grep "rewind point"
```

## 変更時の確認

コードを変更した場合は、少なくとも次を実行します。

```powershell
npm run test:e2e
npm run build
```

GitHub Pages のパス解決へ影響する変更では、追加で Pages 用ビルドも確認します。

```powershell
npm run build:pages
```

## Azure Static Web Apps をローカルで確認する

```powershell
npm run build
npm run swa:start
```

`swa-cli.config.json` は `dist` を出力先、`http://localhost:5173` を開発サーバー URL として定義しています。既定では SWA エミュレーターを `http://localhost:4280` で確認できます。
