# デプロイ

このアプリは静的ファイルだけで動作し、GitHub Pages または Azure Static Web Apps へデプロイできます。

## GitHub Pages

### 自動デプロイ

`.github/workflows/deploy-pages.yml` は次のタイミングで実行されます。

- `main` ブランチへの push
- GitHub Actions 画面からの手動実行

workflow は次の処理を行います。

1. リポジトリをチェックアウト
2. Node.js 22 をセットアップ
3. `npm ci` で依存関係を復元
4. `npm run build:pages` で `dist/` を生成
5. Pages artifact をアップロード
6. `github-pages` environment へデプロイ

workflow には `contents: read`、`pages: write`、`id-token: write` の権限を設定しています。同じ `pages` concurrency group の古い実行は、新しいデプロイ開始時にキャンセルします。

### 初回設定

リポジトリの **Settings → Pages → Build and deployment → Source** で **GitHub Actions** を選択します。

公開 URL:

```text
https://tokawa-ms.github.io/openteleprompter/
```

### ローカルで Pages 用成果物を作る

```powershell
npm run build:pages
```

このコマンドは Vite のベースパスを `/openteleprompter/` に設定します。生成された `dist/index.html` のアセット URL も `/openteleprompter/assets/...` になります。

## Azure Static Web Apps

### Azure Developer CLI でデプロイする

```powershell
azd auth login
azd up
```

`azd up` は次を実行します。

1. Azure リソースグループを準備
2. `infra/main.bicep` から Azure Static Web App を作成
3. `npm run build` でルート配信用の `dist/` を生成
4. ビルド成果物を Azure Static Web Apps へデプロイ

### インフラストラクチャファイル

| ファイル | 役割 |
| --- | --- |
| `azure.yaml` | `dist` を配信する static web app サービスを定義 |
| `infra/main.bicep` | Azure Static Web App リソースを定義 |
| `infra/main.parameters.json` | `azd` 環境変数から Bicep パラメーターを設定 |
| `swa-cli.config.json` | SWA CLI のビルド、出力、開発サーバー設定 |

### SWA CLI でローカル確認する

```powershell
npm run build
npm run swa:start
```

既定では `http://localhost:4280` で Azure Static Web Apps のローカルエミュレーターを起動します。

### Azure ランタイム設定

Vite は `public/staticwebapp.config.json` を `dist/staticwebapp.config.json` へコピーします。

| 設定 | 内容 |
| --- | --- |
| `navigationFallback` | アセット以外のパスを `/index.html` へフォールバック |
| `globalHeaders` | `X-Content-Type-Options` と `Referrer-Policy` を付与 |
| `mimeTypes` | `.webmanifest` を `application/manifest+json` として配信 |

`staticwebapp.config.json` は Azure Static Web Apps 専用です。GitHub Pages では使用されません。

## デプロイ先を変更するときの注意

`localStorage` はオリジンごとに分離されます。ローカル環境、GitHub Pages、Azure Static Web Apps の原稿と設定は自動的に移行または同期されません。

このアプリにはバックエンド API がないため、静的成果物以外のサービスをデプロイする必要はありません。
