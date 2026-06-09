# ローカル開発・テスト

## 必要なツール

- Node.js
- npm
- Azure Developer CLI (`azd`) - Azure デプロイ時

## セットアップ

```powershell
npm install
```

## 開発サーバー

```powershell
npm run dev
```

Vite の開発サーバーが起動します。通常は `http://localhost:5173` で確認できます。

## ビルド

```powershell
npm run build
```

`tsc` による型チェック後、Vite が `dist/` を生成します。

## Playwright E2E テスト

```powershell
npm run test:e2e
```

現在の E2E テストでは次を確認します。

- 再生開始で全画面になり、スクロールが進む
- 全画面下部コントロールが表示される
- 本文領域クリックで再生/停止できる
- 一行/一段落巻き戻しが動く
- 文字サイズ、速度、行間の変更が同期される
- 日本語禁則処理用 CSS が適用される
- リッチテキスト書式がテレプロンプター表示と保存内容に反映される
- 既存本文末尾で改行して追記しても本文が消えない

## Azure Static Web Apps CLI

SWA CLI 設定は `swa init` で生成された `swa-cli.config.json` を使います。

```powershell
npm run build
npm run swa:start
```

