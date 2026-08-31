# Open Standalone Web Promptor

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

Open Standalone Web Promptor は、ブラウザーだけで動作するテレプロンプターです。原稿と表示設定はサーバーへ送信せず、ブラウザーの `localStorage` に保存します。

[GitHub Pages でアプリを開く](https://tokawa-ms.github.io/openteleprompter/)

## 主な機能

- 複数原稿の作成、自動保存、選択、削除
- 太字、斜体、下線、文字色、3 段階の文字強調と装飾解除
- 文字サイズ、速度、行間、行揃え、左右反転の調整
- 全画面での自動スクロールと、本文クリックによる再生・一時停止
- 一行巻き戻しと、段落または指定したポイントへの巻き戻し
- 原稿と表示設定に基づく想定再生時間の表示
- 配色を変更できる目線ガイド
- Noto Sans JP の同梱と日本語の禁則処理

詳しい操作方法と各設定の範囲は[操作ガイド](docs/usage.md)と[機能仕様](docs/features.md)を参照してください。

## ローカルで実行する

Node.js 22 と npm を使用します。

```powershell
npm ci
npm run dev
```

ブラウザーで Vite が表示する URL、通常は `http://localhost:5173` を開きます。

Playwright の Chromium が未導入の場合は、テストの前に `npx playwright install chromium` を実行します。

```powershell
npm run test:e2e
npm run build
```

セットアップ、コマンド、テスト範囲については[ローカル開発・テスト](docs/development.md)を参照してください。

## デプロイ

### GitHub Pages

`main` ブランチへ push すると、GitHub Actions が `npm run build:pages` でアプリをビルドし、GitHub Pages へデプロイします。

初回のみ、リポジトリの **Settings → Pages → Build and deployment → Source** で **GitHub Actions** を選択してください。

### Azure Static Web Apps

Azure Developer CLI から `azd up` を実行すると、`infra/main.bicep` で Azure Static Web App を作成し、`dist/` のビルド成果物をデプロイします。SWA CLI によるローカル確認も利用できます。手順と構成は[デプロイガイド](docs/deployment.md)を参照してください。

## ドキュメント

- [操作ガイド](docs/usage.md)
- [機能仕様](docs/features.md)
- [アーキテクチャ](docs/architecture.md)
- [ローカル開発・テスト](docs/development.md)
- [デプロイ](docs/deployment.md)

## 構成

```text
.
├── docs/                         # ドキュメント
├── infra/                        # azd/Bicep インフラストラクチャ
├── public/staticwebapp.config.json
├── src/                          # Vite + TypeScript アプリ
├── tests/                        # Playwright E2E テスト
├── azure.yaml                    # Azure Developer CLI 設定
├── playwright.config.ts
└── swa-cli.config.json           # SWA CLI 設定
```

## データの保存

原稿、書式、表示設定は現在のサイトオリジンの `localStorage` に保存されます。別のブラウザー、端末、またはデプロイ先とは同期されません。バックエンド API はなく、原稿本文を外部へ送信する処理もありません。

## Contributing

Issue や Pull Request を歓迎します。変更時は次を実行してください。

```powershell
npm run test:e2e
npm run build
```

## License

MIT License © 2026 tokawa-ms
