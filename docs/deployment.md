# デプロイ

## GitHub Pages

`.github/workflows/deploy-pages.yml` が `main` ブランチへの push を検知し、GitHub Pages 用のビルドとデプロイを実行します。

初回のみ、GitHub リポジトリの **Settings → Pages → Build and deployment → Source** で **GitHub Actions** を選択してください。

公開 URL:

```text
https://tokawa-ms.github.io/openteleprompter/
```

ローカルで Pages 用の成果物を生成するには、次を実行します。

```powershell
npm run build:pages
```

このコマンドは Vite のベースパスを `/openteleprompter/` に設定して `dist/` を生成します。

## Azure Static Web Apps

このプロジェクトは Azure Static Web Apps へデプロイできます。Azure Developer CLI (`azd`) と Bicep テンプレートを同梱しています。

## azd でデプロイ

```powershell
azd auth login
azd up
```

`azd up` は次を実行します。

1. Azure リソースグループを準備
2. `infra/main.bicep` で Static Web App を作成
3. `npm run build` で `dist/` を生成
4. ビルド成果物を Azure Static Web Apps へデプロイ

## インフラ設定

| ファイル | 説明 |
| --- | --- |
| `azure.yaml` | azd のサービス定義 |
| `infra/main.bicep` | Static Web App リソース |
| `infra/main.parameters.json` | azd 環境変数から渡すパラメーター |

## SWA CLI でローカル確認

```powershell
npm run build
npm run swa:start
```

既定では `http://localhost:4280` で Azure Static Web Apps のローカルエミュレーターが起動します。

## Runtime configuration

`public/staticwebapp.config.json` はビルド時に `dist/staticwebapp.config.json` へコピーされます。

主な設定:

- `navigationFallback`: SPA として `index.html` へフォールバック
- `globalHeaders`: 基本的なセキュリティヘッダー
- `mimeTypes`: Web manifest 用 MIME 設定
