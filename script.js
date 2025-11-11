// DOM要素の取得
const dateInput = document.getElementById('date-input');
const scaleFilter = document.getElementById('scale-filter');
const fetchBtn = document.getElementById('fetch-btn');
const loading = document.getElementById('loading');
const error = document.getElementById('error');
const earthquakeList = document.getElementById('earthquake-list');

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
async function fetchEarthquakeData(dateStr, minScale) {
    const apiUrl = `https://api.p2pquake.net/v2/jma/quake?limit=100&order=1&since_date=${dateStr}&until_date=${dateStr}&min_scale=${minScale}`;

    try {
        const response = await fetch(apiUrl);

        if (!response.ok) {
            throw new Error(`API接続に失敗しました (ステータス: ${response.status})`);
        }

        const data = await response.json();
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
    const selectedDate = new Date(dateInput.value);
    const dateStr = formatDateForAPI(selectedDate);
    const minScale = scaleFilter.value;

    setLoading(true);
    error.style.display = 'none';

    try {
        const data = await fetchEarthquakeData(dateStr, minScale);
        displayEarthquakes(data);
    } catch (err) {
        showError(err.message);
        earthquakeList.innerHTML = '';
    } finally {
        setLoading(false);
    }
}

// 初期化
function init() {
    // 今日の日付をデフォルトに設定
    const today = new Date();
    dateInput.valueAsDate = today;

    // イベントリスナーを設定
    fetchBtn.addEventListener('click', loadEarthquakeData);

    // Enterキーでも取得
    dateInput.addEventListener('keypress', (e) => {
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
