# 地震情報マップ機能 - 実装ガイド

## 概要

このドキュメントでは、P2P地震情報APIから取得した地震データを地図上にプロット（可視化）する機能の実装方法について説明します。

### 機能概要

- 地震の震源地を地図上にマーカーで表示
- 震度に応じたマーカーの色分け
- クリックで詳細情報をポップアップ表示
- インタラクティブな地図操作（ズーム、パン）

### 技術スタック

| 項目 | 選定技術 | 理由 |
|------|----------|------|
| 地図ライブラリ | **Leaflet.js** | 完全無料、APIキー不要、軽量（42KB）、実装が簡単 |
| 地図タイル | **OpenStreetMap** または **国土地理院地図** | 無料、商用利用可能、日本語対応 |
| データソース | **P2P地震情報API** | 緯度経度データを含む |

### 実現可能性

✅ **完全に実現可能**

- コスト: **¥0**（完全無料）
- APIキー: **不要**
- クレジットカード登録: **不要**
- GitHub Pages対応: **完全対応**
- 実装難易度: **低**（初心者でも可能）
- 実装時間: **4〜6時間**

---

## Leaflet.js について

### 特徴

- **軽量**: わずか42KBのJavaScriptライブラリ
- **オープンソース**: MIT License
- **モバイル対応**: タッチ操作に最適化
- **プラグイン豊富**: マーカークラスタリング、ヒートマップなど
- **日本語情報**: Qiita、個人ブログなど豊富

### 公式サイト

- 公式: https://leafletjs.com/
- ドキュメント: https://leafletjs.com/reference.html
- チュートリアル: https://leafletjs.com/examples.html

---

## 基本実装

### 1. HTMLにライブラリを追加

`index.html` の `<head>` セクションにLeaflet.jsのCSSとJSを追加します。

```html
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>地震情報 - Simple Earthquake News</title>
    <link rel="stylesheet" href="style.css">

    <!-- Leaflet.js CSS -->
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
          integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY="
          crossorigin="" />
</head>
<body>
    <!-- 既存のコンテンツ -->

    <!-- Leaflet.js JavaScript -->
    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"
            integrity="sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo="
            crossorigin=""></script>
    <script src="script.js"></script>
</body>
</html>
```

### 2. 地図コンテナを追加

地震情報リストの上に地図を表示するエリアを追加します。

```html
<main>
    <!-- 既存のコントロール -->
    <div class="controls">
        <!-- ... -->
    </div>

    <!-- 地図コンテナ（新規追加） -->
    <div id="map" class="earthquake-map"></div>

    <!-- ローディング表示 -->
    <div id="loading" class="loading" style="display: none;">
        <!-- ... -->
    </div>

    <!-- 既存のエラー表示と地震リスト -->
    <div id="error" class="error" style="display: none;"></div>
    <div id="earthquake-list" class="earthquake-list"></div>
</main>
```

### 3. CSSで地図の高さを設定

`style.css` に地図のスタイルを追加します。

```css
/* 地震情報マップ */
.earthquake-map {
    width: 100%;
    height: 500px;
    margin: 20px 0;
    border-radius: 8px;
    overflow: hidden;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

/* モバイル対応 */
@media (max-width: 768px) {
    .earthquake-map {
        height: 400px;
        margin: 15px 0;
    }
}

/* ポップアップのスタイル */
.leaflet-popup-content {
    margin: 10px;
    line-height: 1.6;
}

.earthquake-popup h4 {
    margin: 0 0 8px 0;
    font-size: 16px;
    color: #333;
}

.earthquake-popup p {
    margin: 4px 0;
    font-size: 14px;
    color: #666;
}

.earthquake-popup .scale {
    font-weight: bold;
    font-size: 15px;
}

/* 震度による色分け */
.earthquake-popup .scale-high {
    color: #d32f2f;
}

.earthquake-popup .scale-medium {
    color: #f57c00;
}

.earthquake-popup .scale-low {
    color: #388e3c;
}
```

### 4. JavaScriptで地図を初期化

`script.js` に地図の初期化とマーカー追加のコードを追加します。

```javascript
// 地図オブジェクト（グローバル変数）
let map = null;
let markersLayer = null;

/**
 * 地図を初期化
 */
function initMap() {
    // 地図が既に初期化されている場合はスキップ
    if (map !== null) {
        return;
    }

    // 地図を作成（中心: 日本全体、ズームレベル: 5）
    map = L.map('map').setView([36.5, 138.0], 5);

    // OpenStreetMapタイルレイヤーを追加
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 18,
        minZoom: 4
    }).addTo(map);

    // マーカーレイヤーグループを作成
    markersLayer = L.layerGroup().addTo(map);
}

/**
 * 緯度経度の文字列をパース（"N38.3" → 38.3）
 */
function parseCoordinate(coord) {
    if (typeof coord === 'number') {
        return coord;
    }

    if (typeof coord === 'string') {
        // "N38.3", "E141.7" などの形式に対応
        const value = parseFloat(coord.replace(/[NSEW]/g, ''));
        const isNegative = coord.includes('S') || coord.includes('W');
        return isNegative ? -value : value;
    }

    return null;
}

/**
 * 震度に応じたマーカーの色を取得
 */
function getMarkerColor(scale) {
    if (scale >= 50) return '#d32f2f'; // 震度5強以上: 赤
    if (scale >= 30) return '#f57c00'; // 震度3〜4: オレンジ
    return '#388e3c'; // 震度1〜2: 緑
}

/**
 * 地図上にマーカーを追加
 */
function addEarthquakeMarkers(data) {
    // 既存のマーカーをクリア
    if (markersLayer) {
        markersLayer.clearLayers();
    }

    if (!data || data.length === 0) {
        return;
    }

    data.forEach(item => {
        if (!item.earthquake || !item.earthquake.hypocenter) {
            return;
        }

        const eq = item.earthquake;
        const hypo = eq.hypocenter;

        // 緯度経度を取得
        const lat = parseCoordinate(hypo.latitude);
        const lng = parseCoordinate(hypo.longitude);

        // 座標が無効な場合はスキップ
        if (!lat || !lng) {
            return;
        }

        // マーカーの色を決定
        const color = getMarkerColor(eq.maxScale);
        const scaleClass = getScaleClass(eq.maxScale);

        // 円形マーカーを作成
        const marker = L.circleMarker([lat, lng], {
            radius: 8,
            fillColor: color,
            color: '#fff',
            weight: 2,
            opacity: 1,
            fillOpacity: 0.8
        });

        // ポップアップの内容を作成
        const magnitude = hypo.magnitude !== undefined && hypo.magnitude !== -1
            ? `M${hypo.magnitude.toFixed(1)}`
            : '不明';

        const depth = hypo.depth !== undefined && hypo.depth !== -1
            ? `${hypo.depth}km`
            : '不明';

        const popupContent = `
            <div class="earthquake-popup">
                <h4>${hypo.name || '不明'}</h4>
                <p><strong>発生時刻:</strong> ${eq.time}</p>
                <p class="scale scale-${scaleClass}">
                    <strong>最大震度:</strong> ${scaleMap[eq.maxScale.toString()] || '不明'}
                </p>
                <p><strong>マグニチュード:</strong> ${magnitude}</p>
                <p><strong>深さ:</strong> ${depth}</p>
            </div>
        `;

        // ポップアップをバインド
        marker.bindPopup(popupContent);

        // マーカーレイヤーに追加
        marker.addTo(markersLayer);
    });

    // マーカーがある場合は地図の表示範囲を調整
    if (markersLayer.getLayers().length > 0) {
        const bounds = markersLayer.getBounds();
        map.fitBounds(bounds, { padding: [50, 50] });
    }
}

/**
 * データを取得して表示（既存関数を更新）
 */
async function loadEarthquakeData() {
    const startDate = new Date(startDateInput.value);
    const endDate = new Date(endDateInput.value);

    // 日付の妥当性チェック
    if (startDate > endDate) {
        showError('開始日は終了日より前の日付を指定してください');
        return;
    }

    const startDateStr = formatDateForAPI(startDate);
    const endDateStr = formatDateForAPI(endDate);
    const minScale = scaleFilter.value;

    setLoading(true);
    error.style.display = 'none';

    try {
        const data = await fetchEarthquakeData(startDateStr, endDateStr, minScale);

        // リスト表示
        displayEarthquakes(data);

        // 地図にマーカーを追加（新規追加）
        addEarthquakeMarkers(data);

    } catch (err) {
        showError(err.message);
        earthquakeList.innerHTML = '';
    } finally {
        setLoading(false);
    }
}

/**
 * 初期化（既存関数を更新）
 */
function init() {
    // デフォルトの期間を設定（7日前から今日まで）
    const today = new Date();
    const weekAgo = new Date();
    weekAgo.setDate(today.getDate() - 7);

    startDateInput.valueAsDate = weekAgo;
    endDateInput.valueAsDate = today;

    // 地図を初期化（新規追加）
    initMap();

    // イベントリスナーを設定
    fetchBtn.addEventListener('click', loadEarthquakeData);

    // Enterキーでも取得
    startDateInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') loadEarthquakeData();
    });

    endDateInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') loadEarthquakeData();
    });

    scaleFilter.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') loadEarthquakeData();
    });

    // ページ読み込み時に自動取得
    loadEarthquakeData();
}

// ページ読み込み完了時に初期化
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
```

---

## 地図タイルの選択肢

### オプション1: OpenStreetMap（デフォルト）

```javascript
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map);
```

**特徴**: 世界標準のオープンソース地図

### オプション2: 国土地理院地図（標準地図）

```javascript
L.tileLayer('https://cyberjapandata.gsi.go.jp/xyz/std/{z}/{x}/{y}.png', {
    attribution: '<a href="https://maps.gsi.go.jp/development/ichiran.html">国土地理院</a>'
}).addTo(map);
```

**特徴**: 日本の詳細な地形・地名情報

### オプション3: 国土地理院地図（淡色地図）

```javascript
L.tileLayer('https://cyberjapandata.gsi.go.jp/xyz/pale/{z}/{x}/{y}.png', {
    attribution: '<a href="https://maps.gsi.go.jp/development/ichiran.html">国土地理院</a>'
}).addTo(map);
```

**特徴**: マーカーが見やすい淡い色合い（推奨）

### オプション4: OpenStreetMap Japan

```javascript
L.tileLayer('https://tile.openstreetmap.jp/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map);
```

**特徴**: 日本向けに最適化されたOSMタイル

---

## カスタマイズ

### マーカーのサイズを変更

```javascript
const marker = L.circleMarker([lat, lng], {
    radius: 10, // サイズを変更（デフォルト: 8）
    fillColor: color,
    color: '#fff',
    weight: 2,
    opacity: 1,
    fillOpacity: 0.8
});
```

### マグニチュードに応じたサイズ変更

```javascript
function getMarkerRadius(magnitude) {
    if (magnitude >= 6.0) return 12;
    if (magnitude >= 5.0) return 10;
    if (magnitude >= 4.0) return 8;
    return 6;
}

const marker = L.circleMarker([lat, lng], {
    radius: getMarkerRadius(hypo.magnitude),
    // ...
});
```

### アイコンマーカーを使用

```javascript
const customIcon = L.icon({
    iconUrl: 'earthquake-icon.png',
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32]
});

const marker = L.marker([lat, lng], { icon: customIcon });
```

### 震度に応じた詳細な色分け

```javascript
function getMarkerColor(scale) {
    if (scale >= 70) return '#800080'; // 震度7: 紫
    if (scale >= 60) return '#9C27B0'; // 震度6強: 濃い紫
    if (scale >= 55) return '#E91E63'; // 震度6弱: ピンク
    if (scale >= 50) return '#d32f2f'; // 震度5強: 赤
    if (scale >= 45) return '#f44336'; // 震度5弱: 明るい赤
    if (scale >= 40) return '#ff9800'; // 震度4: オレンジ
    if (scale >= 30) return '#ffc107'; // 震度3: 黄色
    if (scale >= 20) return '#8bc34a'; // 震度2: 黄緑
    return '#4caf50'; // 震度1: 緑
}
```

---

## 高度な機能

### 1. マーカークラスタリング

多数の地震データを表示する際、近接するマーカーをグループ化します。

#### プラグインの追加

```html
<!-- Leaflet.markercluster CSS -->
<link rel="stylesheet" href="https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.css" />
<link rel="stylesheet" href="https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.Default.css" />

<!-- Leaflet.markercluster JS -->
<script src="https://unpkg.com/leaflet.markercluster@1.5.3/dist/leaflet.markercluster.js"></script>
```

#### 使用方法

```javascript
// 通常のレイヤーグループの代わりにクラスターグループを使用
markersLayer = L.markerClusterGroup({
    maxClusterRadius: 50,
    spiderfyOnMaxZoom: true,
    showCoverageOnHover: false,
    zoomToBoundsOnClick: true
});

markersLayer.addTo(map);
```

### 2. ヒートマップ表示

震源地の密度を可視化します。

#### プラグインの追加

```html
<script src="https://unpkg.com/leaflet.heat@0.2.0/dist/leaflet-heat.js"></script>
```

#### 使用方法

```javascript
// ヒートマップ用のデータを準備
const heatData = data.map(item => {
    const lat = parseCoordinate(item.earthquake.hypocenter.latitude);
    const lng = parseCoordinate(item.earthquake.hypocenter.longitude);
    const intensity = item.earthquake.maxScale / 70; // 0〜1に正規化
    return [lat, lng, intensity];
}).filter(coord => coord[0] && coord[1]);

// ヒートマップレイヤーを作成
const heat = L.heatLayer(heatData, {
    radius: 25,
    blur: 35,
    maxZoom: 10
}).addTo(map);
```

### 3. 凡例の追加

震度の色分けを説明する凡例を表示します。

```javascript
// 凡例コントロールを作成
const legend = L.control({ position: 'bottomright' });

legend.onAdd = function(map) {
    const div = L.DomUtil.create('div', 'info legend');
    const scales = [
        { range: '震度7', color: '#800080' },
        { range: '震度6強', color: '#9C27B0' },
        { range: '震度6弱', color: '#E91E63' },
        { range: '震度5強', color: '#d32f2f' },
        { range: '震度5弱', color: '#f44336' },
        { range: '震度4', color: '#ff9800' },
        { range: '震度3', color: '#ffc107' },
        { range: '震度2', color: '#8bc34a' },
        { range: '震度1', color: '#4caf50' }
    ];

    div.innerHTML = '<h4>震度</h4>';
    scales.forEach(scale => {
        div.innerHTML += `
            <div>
                <i style="background:${scale.color}"></i> ${scale.range}
            </div>
        `;
    });

    return div;
};

legend.addTo(map);
```

#### 凡例のCSS

```css
.info.legend {
    padding: 10px;
    background: white;
    border-radius: 5px;
    box-shadow: 0 0 15px rgba(0, 0, 0, 0.2);
}

.info.legend h4 {
    margin: 0 0 5px;
    font-size: 14px;
}

.info.legend i {
    width: 18px;
    height: 18px;
    float: left;
    margin-right: 8px;
    opacity: 0.8;
    border-radius: 50%;
}

.info.legend div {
    line-height: 18px;
    margin-bottom: 5px;
    clear: both;
}
```

### 4. 地図とリストの連動

リストの項目をクリックしたら地図のマーカーを強調表示します。

```javascript
// マーカーにIDを付与して保存
const markerMap = new Map();

function addEarthquakeMarkers(data) {
    markersLayer.clearLayers();
    markerMap.clear();

    data.forEach((item, index) => {
        // ... マーカー作成処理 ...

        // マーカーにIDを保存
        marker._earthquakeId = index;
        marker.addTo(markersLayer);
        markerMap.set(index, marker);
    });
}

function displayEarthquakes(data) {
    earthquakeList.innerHTML = '';

    data.forEach((item, index) => {
        // ... カード作成処理 ...

        // クリックイベントを追加
        card.addEventListener('click', () => {
            const marker = markerMap.get(index);
            if (marker) {
                // マーカーの位置に移動
                map.setView(marker.getLatLng(), 10);
                // ポップアップを開く
                marker.openPopup();
            }
        });

        earthquakeList.appendChild(card);
    });
}
```

---

## トラブルシューティング

### 地図が表示されない

#### 原因1: 地図コンテナの高さが指定されていない

```css
#map {
    height: 500px; /* 必須 */
}
```

#### 原因2: Leaflet.jsのCSSが読み込まれていない

```html
<!-- CSSを必ず読み込む -->
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
```

#### 原因3: 初期化のタイミングが早すぎる

```javascript
// DOMContentLoaded後に初期化
document.addEventListener('DOMContentLoaded', () => {
    initMap();
});
```

### マーカーが表示されない

#### 原因1: 緯度経度のパースに失敗

```javascript
// デバッグ用のログを追加
const lat = parseCoordinate(hypo.latitude);
const lng = parseCoordinate(hypo.longitude);
console.log('座標:', lat, lng);

if (!lat || !lng) {
    console.warn('無効な座標:', hypo);
    return;
}
```

#### 原因2: マーカーが地図の範囲外

```javascript
// マーカー追加後に表示範囲を調整
if (markersLayer.getLayers().length > 0) {
    const bounds = markersLayer.getBounds();
    map.fitBounds(bounds, { padding: [50, 50] });
}
```

### タイル画像が読み込まれない

#### 原因: CORS / HTTPS混在

- HTTPSサイトからHTTPのタイルを読み込むとブロックされる
- すべてのタイルURLが `https://` から始まることを確認

### モバイルで動作が重い

#### 対策1: マーカー数を制限

```javascript
// 最大100件まで表示
const limitedData = data.slice(0, 100);
addEarthquakeMarkers(limitedData);
```

#### 対策2: マーカークラスタリングを使用

```javascript
// 近接するマーカーをグループ化
markersLayer = L.markerClusterGroup();
```

---

## パフォーマンス最適化

### 1. 遅延読み込み

```javascript
// 地図は最初に表示されるまで初期化しない
let mapInitialized = false;

function initMapOnDemand() {
    if (!mapInitialized) {
        initMap();
        mapInitialized = true;
    }
}

// データ取得時に初期化
async function loadEarthquakeData() {
    initMapOnDemand();
    // ...
}
```

### 2. 表示件数の制限

```javascript
// 最新100件のみ表示
function addEarthquakeMarkers(data) {
    const maxMarkers = 100;
    const limitedData = data.slice(0, maxMarkers);

    // マーカー追加処理
    // ...
}
```

### 3. デバウンス処理

```javascript
// 連続したイベントを抑制
let debounceTimer;

function debouncedLoadData() {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
        loadEarthquakeData();
    }, 300);
}

// イベントリスナーで使用
startDateInput.addEventListener('change', debouncedLoadData);
```

---

## ブラウザ互換性

### 対応ブラウザ

- Chrome 60+
- Firefox 60+
- Safari 12+
- Edge 79+
- iOS Safari 12+
- Chrome Android 60+

### 非対応ブラウザ

- Internet Explorer（すべてのバージョン）

### 互換性チェック

```javascript
// Leaflet.jsの動作確認
if (typeof L === 'undefined') {
    console.error('Leaflet.jsが読み込まれていません');
    alert('お使いのブラウザは対応していません。最新のブラウザをご利用ください。');
}
```

---

## 参考リンク

### 公式ドキュメント

- [Leaflet.js 公式サイト](https://leafletjs.com/)
- [Leaflet.js APIリファレンス](https://leafletjs.com/reference.html)
- [Leaflet.js チュートリアル](https://leafletjs.com/examples.html)

### 地図タイル

- [OpenStreetMap](https://www.openstreetmap.org/)
- [国土地理院タイル一覧](https://maps.gsi.go.jp/development/ichiran.html)

### プラグイン

- [Leaflet.markercluster](https://github.com/Leaflet/Leaflet.markercluster)
- [Leaflet.heat](https://github.com/Leaflet/Leaflet.heat)
- [Awesome Leaflet](https://github.com/tombatossals/awesome-leaflet)

### 日本語情報

- [Leafletで色々な地図を表示する - Qiita](https://qiita.com/halboujp/items/67e70f55906b7266e1fc)
- [Leaflet & OpenStreetMap - Qiita](https://qiita.com/t0kut0ku_0831/items/e87c6dac0e5b8143dca5)

---

## まとめ

### 実装のポイント

1. ✅ Leaflet.jsは軽量で実装が簡単
2. ✅ APIキー不要で完全無料
3. ✅ P2P地震情報APIの緯度経度データをそのまま利用可能
4. ✅ 震度に応じた色分けで視覚的に分かりやすい
5. ✅ クリックで詳細情報を表示
6. ✅ レスポンシブ対応でモバイルでも快適

### 次のステップ

1. 基本実装を完了させる
2. 地図タイルを選択（OpenStreetMap / 国土地理院）
3. UI/UXを調整（色、サイズ、レイアウト）
4. オプション機能を検討（クラスタリング、凡例など）
5. モバイルでの動作確認
6. パフォーマンステスト

---

**最終更新**: 2025-11-14
**対応プロジェクト**: Simple Earthquake News (GitHub Pages静的サイト)
