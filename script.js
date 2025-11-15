// DOM要素の取得
const startDateInput = document.getElementById('start-date-input');
const endDateInput = document.getElementById('end-date-input');
const scaleFilter = document.getElementById('scale-filter');
const fetchBtn = document.getElementById('fetch-btn');
const loading = document.getElementById('loading');
const error = document.getElementById('error');
const earthquakeList = document.getElementById('earthquake-list');

// 地図オブジェクト（グローバル変数）
let map = null;
let markersLayer = null;

// 震度スケール変換マップ
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

// 震度によるクラス分類
function getScaleClass(scale) {
    if (scale >= 50) return 'high';
    if (scale >= 30) return 'medium';
    return 'low';
}

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

    // 国土地理院地図タイルレイヤーを追加（淡色地図 - マーカーが見やすい）
    L.tileLayer('https://cyberjapandata.gsi.go.jp/xyz/pale/{z}/{x}/{y}.png', {
        attribution: '<a href="https://maps.gsi.go.jp/development/ichiran.html">国土地理院</a>',
        maxZoom: 18,
        minZoom: 4
    }).addTo(map);

    // マーカーレイヤーグループを作成
    markersLayer = L.featureGroup().addTo(map);
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

// 日付をYYYYMMDD形式に変換
function formatDateForAPI(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}${month}${day}`;
}

// 日付を表示用にフォーマット
function formatDateForDisplay(dateStr) {
    return dateStr.replace(/\//g, '/');
}

// APIから地震情報を取得
async function fetchEarthquakeData(startDateStr, endDateStr, minScale) {
    // limitを大きくして、より多くのデータを取得可能にする
    const apiUrl = `https://api.p2pquake.net/v2/jma/quake?limit=1000&order=1&since_date=${startDateStr}&until_date=${endDateStr}&min_scale=${minScale}`;

    try {
        const response = await fetch(apiUrl);

        if (!response.ok) {
            throw new Error(`API接続に失敗しました (ステータス: ${response.status})`);
        }

        const data = await response.json();
        console.log(`取得した地震情報: ${data.length}件`);
        return data;
    } catch (err) {
        throw new Error(`データの取得に失敗しました: ${err.message}`);
    }
}

// エラー表示
function showError(message) {
    error.textContent = message;
    error.style.display = 'block';
    setTimeout(() => {
        error.style.display = 'none';
    }, 5000);
}

// ローディング表示制御
function setLoading(isLoading) {
    loading.style.display = isLoading ? 'block' : 'none';
    fetchBtn.disabled = isLoading;
}

/**
 * 地図上にマーカーを追加（非同期バッチ処理）
 */
async function addEarthquakeMarkers(data) {
    // 既存のマーカーをクリア
    if (markersLayer) {
        markersLayer.clearLayers();
    }

    if (!data || data.length === 0) {
        return;
    }

    console.log(`マーカーを追加中: ${data.length}件`);

    // バッチサイズ（一度に処理するマーカー数）
    const BATCH_SIZE = 50;
    const markers = [];

    // 有効なマーカーデータを事前に作成
    for (let item of data) {
        if (!item.earthquake || !item.earthquake.hypocenter) {
            continue;
        }

        const eq = item.earthquake;
        const hypo = eq.hypocenter;

        // 緯度経度を取得
        const lat = parseCoordinate(hypo.latitude);
        const lng = parseCoordinate(hypo.longitude);

        // 座標が無効な場合はスキップ
        if (!lat || !lng) {
            continue;
        }

        // マーカーの色を決定
        const color = getMarkerColor(eq.maxScale);
        const scaleClass = getScaleClass(eq.maxScale);

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

        markers.push({
            lat,
            lng,
            color,
            popupContent
        });
    }

    console.log(`有効なマーカー: ${markers.length}件`);

    // バッチ処理でマーカーを追加
    for (let i = 0; i < markers.length; i += BATCH_SIZE) {
        const batch = markers.slice(i, i + BATCH_SIZE);

        // バッチごとにマーカーを作成・追加
        batch.forEach(markerData => {
            const marker = L.circleMarker([markerData.lat, markerData.lng], {
                radius: 8,
                fillColor: markerData.color,
                color: '#fff',
                weight: 2,
                opacity: 1,
                fillOpacity: 0.8
            });

            marker.bindPopup(markerData.popupContent);
            marker.addTo(markersLayer);
        });

        // 次のバッチ処理まで少し待機（UIがフリーズしないように）
        if (i + BATCH_SIZE < markers.length) {
            await new Promise(resolve => setTimeout(resolve, 10));
        }
    }

    console.log(`マーカー追加完了: ${markersLayer.getLayers().length}個`);

    // マーカーがある場合は地図の表示範囲を調整
    if (markersLayer.getLayers().length > 0) {
        try {
            const bounds = markersLayer.getBounds();
            map.fitBounds(bounds, { padding: [50, 50] });
        } catch (error) {
            console.error('地図の境界調整に失敗:', error);
            // エラーが発生しても、デフォルトビューに戻す
            map.setView([36.5, 138.0], 5);
        }
    }
}

// 地震情報を表示
function displayEarthquakes(data) {
    earthquakeList.innerHTML = '';

    if (!data || data.length === 0) {
        earthquakeList.innerHTML = '<div class="no-data">指定された条件の地震情報はありません</div>';
        return;
    }

    data.forEach(item => {
        if (!item.earthquake) return;

        const eq = item.earthquake;
        const maxScale = eq.maxScale || -1;
        const scaleClass = getScaleClass(maxScale);

        const card = document.createElement('div');
        card.className = `earthquake-item scale-${scaleClass}`;

        const magnitude = eq.hypocenter?.magnitude !== undefined
            ? `M${eq.hypocenter.magnitude.toFixed(1)}`
            : '不明';

        const hypocenterName = eq.hypocenter?.name || '不明';

        card.innerHTML = `
            <div class="earthquake-header">
                <div class="earthquake-time">${formatDateForDisplay(eq.time)}</div>
                <div class="earthquake-scale ${scaleClass}">
                    震度 ${scaleMap[maxScale.toString()] || '不明'}
                </div>
            </div>
            <div class="earthquake-details">
                <div class="detail-row">
                    <span class="detail-label">震源地:</span>
                    <span class="detail-value">${hypocenterName}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">マグニチュード:</span>
                    <span class="detail-value">${magnitude}</span>
                </div>
            </div>
        `;

        earthquakeList.appendChild(card);
    });
}

// データを取得して表示
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

        // 地図にマーカーを追加（非同期処理を待つ）
        await addEarthquakeMarkers(data);

    } catch (err) {
        showError(err.message);
        earthquakeList.innerHTML = '';
        console.error('データ取得エラー:', err);
    } finally {
        setLoading(false);
    }
}

// 初期化
function init() {
    // デフォルトの期間を設定（7日前から今日まで）
    const today = new Date();
    const weekAgo = new Date();
    weekAgo.setDate(today.getDate() - 7);

    startDateInput.valueAsDate = weekAgo;
    endDateInput.valueAsDate = today;

    // 地図を初期化
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
