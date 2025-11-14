# Simple Earthquake News - 開発ガイド

## プロジェクト概要

P2P地震情報APIを利用して、日本の地震情報をシンプルに表示する静的Webサイトです。

## 技術スタック

**GitHub Pages前提の完全静的サイト**

- **HTML5**: 構造とコンテンツ
- **CSS3**: スタイリング
- **JavaScript (ES6+)**: クライアントサイドロジック
- **GitHub Pages**: ホスティング

### 制約事項

- サーバーサイド処理は不可
- ビルドツール・フレームワークは不使用
- ブラウザで直接実行可能なシンプル構成

## ファイル構成

```
simple-earthquake-news/
├── index.html          # メインHTMLファイル
├── style.css           # スタイルシート
├── script.js           # JavaScriptロジック
├── docs/
│   └── earthquake_api.md  # API仕様ドキュメント
└── CLAUDE.md           # このファイル
```

## 機能要件

### 基本機能

1. **地震情報の表示**
   - 当日の地震情報を一覧表示
   - 発生時刻、震源地、最大震度、マグニチュードを表示

2. **日付選択**
   - カレンダーまたは日付入力で過去の地震情報を取得

3. **自動更新**
   - ページロード時に最新情報を取得
   - オプション: 定期的な自動リフレッシュ

4. **フィルタリング**
   - 震度による絞り込み（震度3以上、震度5以上など）

### UI/UX

- レスポンシブデザイン（モバイル対応）
- シンプルで見やすいレイアウト
- 読み込み中の表示（ローディングインジケータ）
- エラーハンドリング（API接続失敗時の表示）

## API仕様

### P2P地震情報API

**エンドポイント**
```
https://api.p2pquake.net/v2/jma/quake
```

**クエリパラメータ**
- `limit`: 取得件数 (デフォルト: 100)
- `order`: 並び順 (1: 新しい順)
- `since_date`: 開始日付 (YYYYMMDD形式)
- `until_date`: 終了日付 (YYYYMMDD形式)
- `min_scale`: 最小震度 (震度×10、例: 震度3 → 30)

**リクエスト例**
```javascript
const date = 20241115;
const url = `https://api.p2pquake.net/v2/jma/quake?limit=100&order=1&since_date=${date}&until_date=${date}&min_scale=30`;

fetch(url)
  .then(response => response.json())
  .then(data => {
    // データ処理
  });
```

**レスポンス形式**
```json
[
  {
    "earthquake": {
      "time": "2024/11/15 09:30:00",
      "hypocenter": {
        "name": "石川県能登地方",
        "magnitude": 5.8
      },
      "maxScale": 60
    }
  }
]
```

### 震度スケール変換

| APIの値 | 表示震度 |
|---------|----------|
| -1      | 不明     |
| 10      | 1        |
| 20      | 2        |
| 30      | 3        |
| 40      | 4        |
| 45      | 5弱      |
| 50      | 5強      |
| 55      | 6弱      |
| 60      | 6強      |
| 70      | 7        |

## 開発方針

### コーディング規約

**JavaScript**
- ES6+の構文を使用
- `const` / `let` を使用（`var` は使用しない）
- アロー関数を積極的に使用
- async/await でAPI呼び出しを実装
- エラーハンドリングを必ず実装

**CSS**
- Flexbox / CSS Grid でレイアウト
- CSS変数でカラーテーマを管理
- モバイルファーストのレスポンシブデザイン

**HTML**
- セマンティックHTML5要素を使用
- アクセシビリティを考慮

### エラーハンドリング

```javascript
// 必須のエラーハンドリング例
try {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error('API接続に失敗しました');
  }
  const data = await response.json();
  // データ処理
} catch (error) {
  console.error('エラー:', error);
  // ユーザーへのエラー表示
}
```

### パフォーマンス最適化

- 不要なAPI呼び出しを避ける
- ローディング状態を明示
- 画像は最適化（必要な場合）

## デプロイ方法

### GitHub Pagesへのデプロイ

1. **リポジトリ設定**
   - Settings → Pages
   - Source: Deploy from a branch
   - Branch: `main` (または任意のブランチ)
   - Folder: `/ (root)` または `/docs`

2. **ファイル配置**
   - ルートディレクトリに `index.html`, `style.css`, `script.js` を配置
   - または `docs/` ディレクトリに配置

3. **アクセス**
   - `https://<username>.github.io/<repository>/`

### ローカル開発

シンプルなHTTPサーバーで動作確認:

```bash
# Python 3
python -m http.server 8000

# Node.js (http-server)
npx http-server

# VSCode Live Server拡張機能を使用
```

ブラウザで `http://localhost:8000` にアクセス

## 地図機能

### 概要

地震の震源地を地図上にマーカーでプロット表示する機能が実装可能です。

**実現可能性**: ✅ **完全に実現可能**

- **コスト**: ¥0（完全無料）
- **APIキー**: 不要
- **実装難易度**: 低（初心者でも可能）
- **実装時間**: 4〜6時間

### 推奨技術スタック

- **地図ライブラリ**: Leaflet.js（軽量42KB、APIキー不要）
- **地図タイル**: OpenStreetMap または 国土地理院地図
- **データソース**: P2P地震情報API（緯度経度を含む）

### 主な機能

- 震源地を地図上にマーカー表示
- 震度に応じた色分け
- クリックで詳細情報をポップアップ
- インタラクティブな地図操作（ズーム、パン）
- レスポンシブ対応（モバイル最適化）

### 詳細ドキュメント

実装方法の詳細は [`docs/earthquake_map.md`](docs/earthquake_map.md) を参照してください。

- 基本実装（HTMLへのライブラリ追加、地図の初期化、マーカー追加）
- 地図タイルの選択肢（OpenStreetMap / 国土地理院地図）
- カスタマイズ方法（色分け、サイズ調整）
- 高度な機能（マーカークラスタリング、ヒートマップ、凡例）
- トラブルシューティング
- パフォーマンス最適化

## 今後の拡張案

- [x] 地図表示（震源地の位置）← **実装可能（ドキュメント完備）**
- [ ] 震度分布図
- [ ] 通知機能（新しい地震情報）
- [ ] データのキャッシュ（LocalStorage）
- [ ] ダークモード対応
- [ ] PWA化（オフライン対応）
- [ ] 詳細情報へのリンク（気象庁など）

## 参考リンク

- [P2P地震情報 API仕様](https://www.p2pquake.net/dev/)
- [GitHub Pages ドキュメント](https://docs.github.com/ja/pages)
- [気象庁 震度について](https://www.jma.go.jp/jma/kishou/know/shindo/index.html)

## ライセンス

P2P地震情報APIの利用規約に従ってください。

---

**最終更新**: 2025-11-14
