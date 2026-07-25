# ひとくち数学

承認済みの数学問題エクスポートを実行時に読み込み、空き時間にランダム3問ずつ「次に行う操作」を選びながら途中式を学ぶ、iPhone向けWebアプリです。未完了問題を優先したランダム出題のほか、単元を指定した3問学習や問題一覧からの個別学習にも対応します。問題やコンテンツバージョンはアプリに埋め込まず、静的ファイルの追加と `latest.json` の切り替えだけで更新できます。

公開サイト: https://potajiro-tenezut.github.io/math-learning-web/

## 構成

Webアプリは `apps/learner-web/` にあります。

- `src/data/contentRepository.ts`: latest、manifest、index、問題の取得、パス制限、Schema/ハッシュ/バイト検証、正常版へのフォールバック
- `src/domain/session.ts`: 選択肢の固定シャッフルと学習状態遷移
- `src/domain/progress.ts`: `question.id + revision` 単位のブラウザ進捗
- `src/App.tsx`: 問題一覧、絞り込み、問題プレイヤー、各種エラー状態
- `public/runtime-config.json`: 実行時のコンテンツ配信先

## 開発と検証

Node.js 20以降を使用します。

```bash
cd apps/learner-web
npm install
npm run sync-content
npm run dev
```

既定の同期元はリポジトリ直下の `dist/`、同期先はWebアプリの `public/content/` です。別のエクスポートを使う場合は、引数または `CONTENT_EXPORT_DIR` で指定します。

```bash
npm run sync-content -- ../../../hana-math-content-workspace/dist
```

同期処理はmanifestに記載されたファイルだけをコピーし、問題制作側の `dist/` を削除・変更しません。不完全な公開を避けるため、`latest.json` は最後にコピーします。検証一式は次のとおりです。

```bash
npm test
npm run typecheck
npm run lint
npm run build
```

Viteの出力先は `apps/learner-web/build/` であり、問題制作側の `dist/` を上書きしません。

`main` ブランチへのpush時はGitHub Actionsが同じ検証を行い、成功したビルドだけをGitHub Pagesへ公開します。

## コンテンツ更新

1. 問題制作側で新しいバージョン（例: `2026-08-01.1`）をエクスポートします。
2. `content/2026-08-01.1/` を公開先へ追加します。既存バージョンは残します。
3. manifest、index、全問題が公開済みであることを確認します。
4. 最後に `content/latest.json` を新バージョンへ切り替えます。

アプリは起動時に `latest.json` を `cache: "no-store"` と毎回異なるキャッシュ回避パラメータ付きで取得し、manifestとindexを検証してから新版を有効化します。GitHub Pagesのように配信側のキャッシュヘッダーを変更できない環境でも、リリース切り替えを即時確認できます。問題JSONは選択時に取得・検証します。通信失敗、未対応Schema、JSON破損、ハッシュまたはバイト数の不一致があれば不完全な新版へ切り替えず、ブラウザに保存された最後の正常版を使います。

切り戻しは、`latest.json` を直前の正常バージョンへ戻すだけです。バージョンディレクトリを消す必要はありません。

## 実行時設定と外部配信

既定の配信先はWebアプリと同じパス配下の `./content/` です。ルート配信では `/content/` と同じ場所になり、GitHub Pagesのようなサブパス配信でもそのまま動作します。デプロイ後も `runtime-config.json` を差し替えるだけで変更できます。

```json
{
  "contentBaseUrl": "https://cdn.example.com/hana-math/"
}
```

`runtime-config.json` が利用できない場合のみ、ビルド時の `VITE_CONTENT_BASE_URL`、最後に `./content/` の順でフォールバックします。外部オリジンを使う場合は、配信元でWebアプリのoriginを `Access-Control-Allow-Origin` に許可してください。公開パスは指定ベースURLの配下に限定され、`..` や別originへの逸脱は拒否されます。

## 推奨キャッシュ設定

Nginxの例です。`latest.json` は常に再検証し、バージョン付きファイルは不変として長期キャッシュします。

```nginx
location = /content/latest.json {
  add_header Cache-Control "no-store";
}

location ~ ^/content/[^/]+/(manifest\.json|index\.json|questions/.+\.json)$ {
  add_header Cache-Control "public, max-age=31536000, immutable";
}
```

Cloudflare等でも同じ方針にします。CORSを使う場合は `Content-Type: application/json; charset=utf-8` と、必要な `Access-Control-Allow-Origin` を付けてください。

## 保存範囲と制約

進捗と検証済みコンテンツは端末のlocalStorageに保存されます。同じ問題IDでもrevisionが変われば未着手として扱い、contentVersionだけが変わりrevisionが同じ場合は完了状態を維持します。自主学習用途を想定しており、公開済みJSONを直接解析する利用者から正解を秘匿する仕組みはありません。
