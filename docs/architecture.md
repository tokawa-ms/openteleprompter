# アーキテクチャ

## システム構成

Open Standalone Web Promptor は Vite + TypeScript で構築した静的 Web アプリです。バックエンド API、データベース、サーバーサイドレンダリングは使用しません。

```text
Source
  └─ TypeScript + CSS + bundled fonts
          │
          ▼
     Vite build
          │
          ▼
        dist/
          │
          ├─ GitHub Pages
          ├─ Azure Static Web Apps
          └─ Local preview
                 │
                 ▼
              Browser
                 ├─ UI and rich-text editing
                 ├─ Teleprompter playback
                 ├─ Fullscreen controls
                 └─ localStorage persistence
```

ホスティング先は静的ファイルを配信するだけです。アプリケーション状態と原稿データはブラウザー内に残ります。

## 主要ファイル

| ファイル | 役割 |
| --- | --- |
| `index.html` | Vite の HTML エントリーポイント |
| `src/main.ts` | UI 生成、状態管理、保存、サニタイズ、再生、巻き戻し制御 |
| `src/styles.css` | レイアウト、書式、全画面 UI、日本語組版 |
| `tests/playback.spec.ts` | 主要ユーザーフローの Playwright E2E テスト |
| `.github/workflows/deploy-pages.yml` | GitHub Pages のビルドとデプロイ |
| `public/staticwebapp.config.json` | Azure Static Web Apps のフォールバックとヘッダー |
| `azure.yaml` | Azure Developer CLI のサービス定義 |
| `infra/main.bicep` | Azure Static Web App のリソース定義 |

## 状態モデル

外部の状態管理ライブラリは使用せず、`src/main.ts` のモジュールスコープで状態を保持します。

| 状態 | 内容 |
| --- | --- |
| `documents` | 保存済み原稿の配列 |
| `settings` | 選択中の原稿 ID と表示設定 |
| `activeDocument` | 現在編集中の原稿 |
| `isPlaying` | 自動スクロールの実行状態 |
| `promptScrollTop` | 小数を含む論理スクロール位置 |
| `savedEditorRange` | 書式操作に使用する本文の選択範囲 |
| `durationRenderFrame` | 想定再生時間の再計算をまとめる animation frame |

原稿は `id`、`title`、`body`、`updatedAt` を持ちます。`body` はサニタイズ済み HTML です。

## 永続化

| `localStorage` キー | 内容 |
| --- | --- |
| `open-standalone-web-promptor.documents.v1` | 原稿一覧 |
| `open-standalone-web-promptor.settings.v1` | 表示設定と選択中の原稿 ID |

JSON の解析に失敗した場合は該当データを初期値へ戻します。保存領域はオリジン単位なので、ローカル環境、GitHub Pages、Azure Static Web Apps の間では共有されません。

## リッチテキスト処理

本文は `contenteditable` で編集し、保存前と表示前にサニタイズします。

許可する要素:

- 改行とブロック: `br`, `div`, `p`
- 書式: `b`, `strong`, `i`, `em`, `u`, `span`
- 互換入力: `font` は色だけを取り出して `span` へ変換
- 制御タグ: `<span data-rewind-point="true">`

許可する属性:

- 通常の `span` は妥当な `style.color` だけを保持
- 制御タグは `data-rewind-point="true"` と `contenteditable="false"` を再生成

その他の要素、属性、イベントハンドラーは破棄し、子の安全な内容だけを残します。

書式ボタンを押すと保存した選択範囲を編集欄へ復元し、ブラウザーの編集コマンドで太字、斜体、下線をトグルします。操作後はサニタイズ、永続化、プレビュー更新を連続して行います。

## テレプロンプター表示変換

保存した HTML は次の手順で表示用 DOM へ変換します。

1. 本文を再度サニタイズします。
2. `br` とブラウザーが生成する `div`／`p` を行として解析します。
3. 空行で段落を確定し、`.promptor-paragraph` を生成します。
4. 制御タグを本文フロー内の幅と高さを持たない `.promptor-rewind-point` へ変換します。
5. 書式要素を保持したまま `.promptor-text` へ配置します。

この変換により、制御タグを使っても表示上の段落や行間を増やさず、任意位置を巻き戻し先として定義できます。空行は従来どおり表示上の段落区切りになります。

## 再生と巻き戻し

再生ループは `requestAnimationFrame` の経過時間と速度設定から次のスクロール位置を計算します。DOM の整数スクロール位置とは別に小数値を保持するため、低速でも移動が失われません。

- 一行巻き戻し: `文字サイズ × 行間` を現在位置から引きます。
- 一段落巻き戻し: `.promptor-paragraph` と `.promptor-rewind-point` の位置を列挙し、直前の対象を画面上端から 1/3 の目線位置へ合わせます。
- 目線ガイド: 全画面時だけ `33.333vh` の位置へ固定表示します。

## 想定再生時間

通常画面でも本番の表示幅に近い値を得るため、表示用本文を不可視の要素へ複製し、幅 `100vw` で測定します。

```text
想定秒数 = ceil((全画面幅での本文 scrollHeight - viewport height) / 速度)
```

測定要素は計算直後に DOM から削除します。原稿や表示設定の連続変更では、直前の予約を取り消して次の animation frame に測定をまとめます。通常画面と全画面の出力は同じ計算結果で更新します。

再計算の契機:

- 原稿、文字サイズ、行間、速度の変更
- ウィンドウサイズの変更
- 全画面状態の変更
- Web フォントの読み込み完了

## ホスティング差異

| 項目 | GitHub Pages | Azure Static Web Apps |
| --- | --- | --- |
| ビルド | `npm run build:pages` | `npm run build` |
| ベースパス | `/openteleprompter/` | `/` |
| ランタイム設定 | GitHub Pages workflow | `staticwebapp.config.json` |
| アプリ本体 | 同じ `dist` 形式 | 同じ `dist` 形式 |
