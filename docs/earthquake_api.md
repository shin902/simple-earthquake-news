# 地震情報API ドキュメント

## 概要
このドキュメントでは、P2P地震情報APIを使用して地震情報を取得する`getEarthquakeInfo`関数について説明します。このプロジェクトは完全静的Webサイトのため、クライアントサイドJavaScriptでの実装となります。

## 関数: `getEarthquakeInfo(dateNumber, minScale = 3)`

### 説明
指定された日付の地震情報をP2P地震情報APIから取得し、整形された配列として返します。

### パラメータ
- `dateNumber` (number): 日付を表す数値（YYYYMMDD形式、例: 20250115）
- `minScale` (number, optional): 取得する最小震度（デフォルト: 3）

### 戻り値
- `Promise<Array>`: 地震情報オブジェクトの配列

各要素は以下のプロパティを持ちます:
```javascript
{
  time: "2025/01/15 09:30:00",      // 発生時刻
  hypocenter: "石川県能登地方",      // 震源地名
  maxScale: "6強",                  // 最大震度（日本語表記）
  magnitude: 5.8,                   // マグニチュード
  depth: 10,                        // 深さ（km）
  latitude: 37.5,                   // 緯度
  longitude: 137.3                  // 経度
}
```

### 基本実装

```javascript
/**
 * 指定日付の地震情報を取得
 * @param {number} dateNumber - YYYYMMDD形式の日付
 * @param {number} minScale - 最小震度（デフォルト: 3）
 * @returns {Promise<Array>} 地震情報の配列
 */
async function getEarthquakeInfo(dateNumber, minScale = 3) {
  const limit = 100;
  const apiUrl = `https://api.p2pquake.net/v2/jma/quake?limit=${limit}&order=1&since_date=${dateNumber}&until_date=${dateNumber}&min_scale=${minScale * 10}`;

  try {
    const response = await fetch(apiUrl);

    if (!response.ok) {
      throw new Error(`API接続に失敗しました: ${response.status}`);
    }

    const data = await response.json();

    // データを整形して返す
    return data
      .filter(item => item.earthquake && item.earthquake.hypocenter && item.earthquake.hypocenter.name)
      .map(item => {
        const eq = item.earthquake;
        const hypo = eq.hypocenter;

        return {
          time: eq.time,
          hypocenter: hypo.name,
          maxScale: convertScale(eq.maxScale),
          magnitude: hypo.magnitude === -1 ? null : hypo.magnitude,
          depth: hypo.depth,
          latitude: hypo.latitude,
          longitude: hypo.longitude
        };
      });

  } catch (error) {
    console.error('地震情報の取得に失敗しました:', error);
    throw error;
  }
}

/**
 * API震度値を日本語表記に変換
 * @param {number} scaleValue - API震度値
 * @returns {string} 日本語震度表記
 */
function convertScale(scaleValue) {
  const scaleMap = {
    '-1': '不明',
    '10': '1',
    '20': '2',
    '30': '3',
    '40': '4',
    '45': '5弱',
    '50': '5強',
    '55': '6弱',
    '60': '6強',
    '70': '7'
  };

  return scaleMap[String(scaleValue)] || '不明';
}
```

### 使用例

#### 基本的な使い方

```javascript
// 当日の地震情報を取得
const today = new Date();
const dateNumber = parseInt(
  `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`
);

// 震度3以上の地震情報を取得
getEarthquakeInfo(dateNumber, 3)
  .then(earthquakes => {
    console.log(`本日の地震: ${earthquakes.length}件`);
    earthquakes.forEach(eq => {
      console.log(`${eq.time} ${eq.hypocenter} 最大震度:${eq.maxScale} M${eq.magnitude}`);
    });
  })
  .catch(error => {
    console.error('エラーが発生しました:', error);
  });
```

#### HTML要素への表示

```javascript
async function displayEarthquakes(dateNumber) {
  const container = document.getElementById('earthquake-list');

  try {
    // ローディング表示
    container.innerHTML = '<p>読み込み中...</p>';

    const earthquakes = await getEarthquakeInfo(dateNumber);

    if (earthquakes.length === 0) {
      container.innerHTML = '<p>地震情報はありません</p>';
      return;
    }

    // 地震情報をHTML化
    const html = earthquakes.map(eq => `
      <div class="earthquake-item">
        <div class="time">${eq.time}</div>
        <div class="info">
          <span class="hypocenter">${eq.hypocenter}</span>
          <span class="scale">最大震度: ${eq.maxScale}</span>
          <span class="magnitude">M${eq.magnitude || '不明'}</span>
          <span class="depth">深さ: ${eq.depth}km</span>
        </div>
      </div>
    `).join('');

    container.innerHTML = html;

  } catch (error) {
    container.innerHTML = `<p class="error">エラー: 地震情報を取得できませんでした</p>`;
    console.error(error);
  }
}

// 実行
displayEarthquakes(20250115);
```

#### 震度でフィルタリング

```javascript
// 震度5弱以上の地震のみ取得
async function getStrongEarthquakes(dateNumber) {
  const earthquakes = await getEarthquakeInfo(dateNumber, 5);

  // さらに震度5弱以上でフィルタリング
  return earthquakes.filter(eq => {
    const scale = eq.maxScale;
    return scale === '5弱' || scale === '5強' ||
           scale === '6弱' || scale === '6強' || scale === '7';
  });
}
```

### API仕様

#### エンドポイント
```
https://api.p2pquake.net/v2/jma/quake
```

#### クエリパラメータ

| パラメータ | 型 | 説明 | 必須 |
|-----------|-----|------|------|
| `limit` | number | 取得件数の上限（デフォルト: 100） | No |
| `order` | number | 並び順（1: 新しい順、-1: 古い順） | No |
| `since_date` | number | 開始日付（YYYYMMDD形式） | No |
| `until_date` | number | 終了日付（YYYYMMDD形式） | No |
| `min_scale` | number | 最小震度（震度×10、例: 震度3 → 30） | No |

#### レスポンス構造

```javascript
[
  {
    "code": 551,                           // 情報コード
    "id": "xxxxxxxx",                      // ユニークID
    "time": "2025/01/15 09:30:00",        // 発表時刻
    "earthquake": {
      "time": "2025/01/15 09:28:00",      // 発生時刻
      "hypocenter": {
        "name": "石川県能登地方",          // 震源地
        "latitude": 37.5,                  // 緯度
        "longitude": 137.3,                // 経度
        "depth": 10,                       // 深さ（km）
        "magnitude": 5.8                   // マグニチュード
      },
      "maxScale": 60,                      // 最大震度（×10）
      "domesticTsunami": "None",           // 国内津波情報
      "foreignTsunami": "Unknown"          // 国外津波情報
    },
    "points": [                            // 観測地点詳細
      {
        "pref": "石川県",
        "addr": "珠洲市",
        "scale": 60                        // 観測震度
      }
      // ...
    ]
  }
]
```

### 震度スケール変換表

| APIの値 | 表示震度 | 説明 |
|---------|----------|------|
| -1      | 不明     | 震度が不明 |
| 10      | 1        | 震度1 |
| 20      | 2        | 震度2 |
| 30      | 3        | 震度3 |
| 40      | 4        | 震度4 |
| 45      | 5弱      | 震度5弱 |
| 50      | 5強      | 震度5強 |
| 55      | 6弱      | 震度6弱 |
| 60      | 6強      | 震度6強 |
| 70      | 7        | 震度7 |

### 注意事項

1. **CORS対応**: P2P地震情報APIはCORS（Cross-Origin Resource Sharing）に対応しており、ブラウザから直接呼び出すことができます。

2. **エラーハンドリング**: 必ず実装してください
   - ネットワークエラー
   - API接続失敗（ステータスコード確認）
   - データが存在しない場合の処理
   - タイムアウト処理

3. **APIレート制限**: 過度なリクエストは避けてください
   - 1日1,000万リクエスト以上の負荷がかかるAPIです
   - 不要な連続リクエストは控える
   - 必要に応じてローカルストレージでキャッシュ

4. **データの有効性**:
   - 震源地名が空の地震情報は除外されます
   - マグニチュードが-1の場合は「不明」として扱います
   - 津波情報も含まれていますが、詳細は気象庁サイトを参照

5. **ブラウザ互換性**:
   - `fetch` APIを使用（IE非対応）
   - `async/await`を使用（モダンブラウザのみ）
   - 必要に応じてポリフィルを検討

### 発展的な実装例

#### LocalStorageでキャッシュ

```javascript
/**
 * キャッシュ機能付き地震情報取得
 * @param {number} dateNumber - YYYYMMDD形式の日付
 * @param {number} minScale - 最小震度
 * @param {number} cacheMinutes - キャッシュ有効時間（分）
 * @returns {Promise<Array>} 地震情報の配列
 */
async function getEarthquakeInfoWithCache(dateNumber, minScale = 3, cacheMinutes = 10) {
  const cacheKey = `earthquake_${dateNumber}_${minScale}`;
  const cached = localStorage.getItem(cacheKey);

  if (cached) {
    const { data, timestamp } = JSON.parse(cached);
    const now = Date.now();
    const cacheAge = (now - timestamp) / 1000 / 60; // 分単位

    if (cacheAge < cacheMinutes) {
      console.log('キャッシュから取得');
      return data;
    }
  }

  // APIから取得
  const data = await getEarthquakeInfo(dateNumber, minScale);

  // キャッシュに保存
  localStorage.setItem(cacheKey, JSON.stringify({
    data,
    timestamp: Date.now()
  }));

  return data;
}
```

#### 日付範囲指定での取得

```javascript
/**
 * 期間指定で地震情報を取得
 * @param {number} startDate - 開始日（YYYYMMDD）
 * @param {number} endDate - 終了日（YYYYMMDD）
 * @param {number} minScale - 最小震度
 * @returns {Promise<Array>} 地震情報の配列
 */
async function getEarthquakesByDateRange(startDate, endDate, minScale = 3) {
  const limit = 100;
  const apiUrl = `https://api.p2pquake.net/v2/jma/quake?limit=${limit}&order=1&since_date=${startDate}&until_date=${endDate}&min_scale=${minScale * 10}`;

  try {
    const response = await fetch(apiUrl);

    if (!response.ok) {
      throw new Error(`API接続に失敗しました: ${response.status}`);
    }

    const data = await response.json();

    return data
      .filter(item => item.earthquake?.hypocenter?.name)
      .map(item => ({
        time: item.earthquake.time,
        hypocenter: item.earthquake.hypocenter.name,
        maxScale: convertScale(item.earthquake.maxScale),
        magnitude: item.earthquake.hypocenter.magnitude === -1 ? null : item.earthquake.hypocenter.magnitude,
        depth: item.earthquake.hypocenter.depth,
        latitude: item.earthquake.hypocenter.latitude,
        longitude: item.earthquake.hypocenter.longitude
      }));

  } catch (error) {
    console.error('地震情報の取得に失敗しました:', error);
    throw error;
  }
}

// 使用例: 2025年1月の地震情報を取得
getEarthquakesByDateRange(20250101, 20250131, 3)
  .then(earthquakes => {
    console.log(`1月の地震: ${earthquakes.length}件`);
  });
```

## 参考リンク

- [P2P地震情報 公式サイト](https://www.p2pquake.net/)
- [P2P地震情報 開発者向けページ](https://www.p2pquake.net/develop/)
- [P2P地震情報 JSON API v2 仕様](https://www.p2pquake.net/develop/json_api_v2/)
- [GitHub: epsp-specifications](https://github.com/p2pquake/epsp-specifications)
- [気象庁 震度について](https://www.jma.go.jp/jma/kishou/know/shindo/index.html)
- [MDN: Fetch API](https://developer.mozilla.org/ja/docs/Web/API/Fetch_API)
- [MDN: async/await](https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Statements/async_function)

## ライセンス・利用規約

P2P地震情報APIの利用規約に従ってください。

- 商用・非商用問わず無料で利用可能
- APIへの過度なアクセスは控える
- データの二次配布は原則禁止（詳細は公式サイト参照）
- クレジット表記の推奨: 「地震情報は[P2P地震情報](https://www.p2pquake.net/)より取得」

---

**最終更新**: 2025-11-11
**対応プロジェクト**: Simple Earthquake News (GitHub Pages静的サイト)
