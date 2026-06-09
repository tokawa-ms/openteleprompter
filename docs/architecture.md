# アーキテクチャ

## 構成

Open Standalone Web Promptor は Vite + TypeScript の静的 Web アプリです。バックエンド API は持たず、Azure Static Web Apps へ静的ファイルとしてデプロイできます。

```text
Browser
  ├─ UI rendering
  ├─ Teleprompter playback
  ├─ Rich text editing
  └─ localStorage persistence

Azure Static Web Apps
  └─ Static hosting for dist/
```

## 主要ファイル

| ファイル | 役割 |
| --- | --- |
| `src/main.ts` | UI 生成、状態管理、保存、再生制御、リッチテキスト処理 |
| `src/styles.css` | レイアウト、全画面コントロール、日本語組版、リッチエディター |
| `public/staticwebapp.config.json` | Azure Static Web Apps のルーティング/ヘッダー設定 |
| `infra/main.bicep` | Azure Static Web App リソース定義 |
| `tests/playback.spec.ts` | Playwright E2E テスト |

## 状態管理

外部状態管理ライブラリは使っていません。`src/main.ts` 内の次の状態を DOM と同期します。

- `documents`: 保存済み原稿一覧
- `settings`: 表示設定
- `activeDocument`: 現在編集中の原稿
- `isPlaying`: 再生中かどうか
- `promptScrollTop`: 小数を含むスクロール位置

## 保存キー

| キー | 内容 |
| --- | --- |
| `open-standalone-web-promptor.documents.v1` | 原稿一覧 |
| `open-standalone-web-promptor.settings.v1` | 表示設定 |

## リッチテキストの安全性

本文は HTML として保存しますが、保存前に次のように制限します。

- 許可タグ: `b`, `strong`, `i`, `em`, `u`, `span`, `div`, `p`, `br`
- `span` と `font` 由来の色だけを許可
- その他のタグ、属性、イベントハンドラーは破棄

## テレプロンプター表示変換

編集欄では Chrome が Enter 入力時に `<div>` を生成することがあります。表示変換では通常テキスト、`<br>`、`<div>`、`<p>` が混在しても、順序を保って `.promptor-paragraph` に変換します。

