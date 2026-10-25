// -- renderer_dashboard.js --------------------------------------------
// copyright = 'Copyright © 2026- @x-builder, Japan';
// email     = 'x-builder@gmail.com';
// appName   = 'xSearch -プレイリスト検索-';
// version   = 'Ver1.31.1';
// ---------------------------------------------------------------------
let categoryChartInstance = null;
let ratingDonutInstance = null;
let seriesKanaDonutInstance = null;
let genreDonutInstance = null;

let selectedCategory = '全て';
let selectedPeriodKey = null;

// 定数定義
const STATUS_COLORS = {
    green: '#4caf50',
    red: '#f44336',
    yellow: '#ffeb3b',
    purple: '#9c27b0'
};

const RATING_KEYS = ['★★★★★', '★★★★☆', '★★★☆☆', '★★☆☆☆', '★☆☆☆☆', '評価なし'];
const RATING_COLORS = ['#e91e63', '#ff9800', '#ffeb3b', '#4caf50', '#2196f3', '#9e9e9e'];

const KANA_GROUPS = ['あ', 'か', 'さ', 'た', 'な', 'は', 'ま', 'や', 'ら', 'わ', 'その他'];
const KANA_COLORS = [
    '#f44336', '#e91e63', '#9c27b0', '#673ab7', '#3f51b5',
    '#2196f3', '#00bcd4', '#009688', '#4caf50', '#ff9800', '#795548'
];

// 初期化関数
function initDashboard() {
    updateDashboardTimestamp();
    setupDashboardEventListeners();
    refreshDashboard();
}

// タイムスタンプ更新（例：2026年10月22日(木) 15:00時点）
function updateDashboardTimestamp() {
    const now = new Date();
    const days = ['日', '月', '火', '水', '木', '金', '土'];
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const day = days[now.getDay()];
    const hh = String(now.getHours()).padStart(2, '0');
    const min = String(now.getMinutes()).padStart(2, '0');

    const tsEl = document.getElementById('summary-timestamp');
    if (tsEl) {
        tsEl.textContent = `${yyyy}年${mm}月${dd}日(${day}) ${hh}:${min}時点`;
    }
}

// イベントリスナー登録
function setupDashboardEventListeners() {
    const periodUnitSelect = document.getElementById('period-unit-select');
    const metricTypeSelect = document.getElementById('metric-type-select');

    if (periodUnitSelect) {
        periodUnitSelect.addEventListener('change', () => {
            selectedPeriodKey = null; // 集計単位変更時は選択期間リセット
            renderCategoryChart();
            renderPeriodDonutCharts();
        });
    }

    if (metricTypeSelect) {
        metricTypeSelect.addEventListener('change', () => {
            renderCategoryChart();
        });
    }
}

// 全体更新
function refreshDashboard() {
    renderSummaryTable();
    renderCategoryChart();
    renderPeriodDonutCharts();
}

// -------------------------------------------------------------
// 1. サマリーカード描画
// -------------------------------------------------------------
function renderSummaryTable() {
    const tbody = document.getElementById('summary-table-body');
    if (!tbody) return;
    tbody.innerHTML = '';

    const rawItems = (window.appState && window.appState.rawItems) ? window.appState.rawItems : [];

    // カテゴリ一貫リストの抽出（「全て」＋重複のない分類一覧）
    const categories = ['全て'];
    rawItems.forEach(item => {
        if (item.category && !categories.includes(item.category)) {
            categories.push(item.category);
        }
    });

    categories.forEach(cat => {
        const filtered = (cat === '全て') ? rawItems : rawItems.filter(i => i.category === cat);

        // シリーズ件数 (重複除外)
        const seriesSet = new Set(filtered.map(i => i.seriesName).filter(Boolean));
        const seriesCount = seriesSet.size;

        // タイトル件数
        const titleCount = filtered.length;

        // 話数件数
        const episodeCount = filtered.reduce((sum, i) => sum + (parseInt(i.episodeCount, 10) || 0), 0);

        // 状態別件数集計 🟢(🟩), 🔴(🟥), 🟡(🟨), 🟣(🟪)
        let green = 0, red = 0, yellow = 0, purple = 0;
        
        filtered.forEach(i => {
            const isUpdated = Boolean(i.isUpdated);
            const status = (i.playlistStatus || 'BLANK').toUpperCase();

            // renderer.js の判定ロジックに準拠
            let isGreen = false;
            let isRed = false;
            let isPurple = false;
            let isYellow = false;

            if (isUpdated) {
                // 更新状態 (🟩, 🟥, 🟪, 🟨)
                isGreen = (status === 'OK' || i.playlistStatus === '🟩');
                isRed = (status === 'NG' || i.playlistStatus === '🟥');
                isPurple = (status === 'OVERLAP' || i.playlistStatus === '🟪');
                isYellow = (status === 'BLANK' || !status || i.playlistStatus === '🟨');
            } else {
                // 通常状態 (🟢, 🔴, 🟣, 🟡)
                isGreen = (status === 'OK' || i.playlistStatus === '🟢');
                isRed = (status === 'NG' || i.playlistStatus === '🔴');
                isPurple = (status === 'OVERLAP' || i.playlistStatus === '🟣');
                isYellow = (status === 'BLANK' || !status || i.playlistStatus === '🟡');
            }

            // 絵文字そのものがplaylistStatusに直接格納されているケースのフォールバック
            if (i.playlistStatus === '🟢' || i.playlistStatus === '🟩') isGreen = true;
            if (i.playlistStatus === '🔴' || i.playlistStatus === '🟥') isRed = true;
            if (i.playlistStatus === '🟣' || i.playlistStatus === '🟪') isPurple = true;
            if (i.playlistStatus === '🟡' || i.playlistStatus === '🟨') isYellow = true;

            if (isGreen) green++;
            else if (isRed) red++;
            else if (isYellow) yellow++;
            else if (isPurple) purple++;
        });

        const tr = document.createElement('tr');
        if (cat === selectedCategory) {
            tr.classList.add('selected-row');
        }

        // 状態別件数をそれぞれ独立した列に割り当て
        tr.innerHTML = `
            <td class="cat-cell">${cat}</td>
            <td>${seriesCount.toLocaleString()}</td>
            <td>${titleCount.toLocaleString()}</td>
            <td>${episodeCount.toLocaleString()}</td>
            <td>${green.toLocaleString()}</td>
            <td>${red.toLocaleString()}</td>
            <td>${yellow.toLocaleString()}</td>
            <td>${purple.toLocaleString()}</td>
        `;

        // 行クリックで選択分類を変更
        tr.addEventListener('click', () => {
            selectedCategory = cat;
            document.querySelectorAll('#summary-table-body tr').forEach(r => r.classList.remove('selected-row'));
            tr.classList.add('selected-row');

            document.getElementById('category-stats-title').textContent = `分類統計（${selectedCategory}）`;
            selectedPeriodKey = null;
            renderCategoryChart();
            renderPeriodDonutCharts();
        });

        tbody.appendChild(tr);
    });
}

// -------------------------------------------------------------
// 2. 選択分類の統計（横棒積層グラフ）
// -------------------------------------------------------------
function getPeriodKey(dateStr, unit) {
    if (!dateStr || dateStr === '-') return '不明';
    const cleanDate = dateStr.replace(/[^0-9]/g, '');
    if (cleanDate.length < 4) return '不明';

    const year = parseInt(cleanDate.substring(0, 4), 10);
    const month = cleanDate.length >= 6 ? parseInt(cleanDate.substring(4, 6), 10) : 1;

    switch (unit) {
        case 'monthly':
            return cleanDate.length >= 6 ? cleanDate.substring(0, 6) : `${year}01`;
        case 'season': {
            // 冬: 前年12月～02月, 春: 03月～05月, 夏: 06月～08月, 秋: 09月～11月
            if (month === 12) return `${year}冬`;
            if (month === 1 || month === 2) return `${year - 1}冬`;
            if (month >= 3 && month <= 5) return `${year}春`;
            if (month >= 6 && month <= 8) return `${year}夏`;
            if (month >= 9 && month <= 11) return `${year}秋`;
            return `${year}年`;
        }
        case 'year':
            return `${year}年`;
        case '5year': {
            // 1970年開始、5年単位
            if (year < 1970) return '1970年以前';
            const startYear = 1970 + Math.floor((year - 1970) / 5) * 5;
            return `${startYear}～${startYear + 4}年`;
        }
        case 'all':
            return '全期間';
        default:
            return `${year}年`;
    }
}

function renderCategoryChart() {
    const ctx = document.getElementById('categoryChart')?.getContext('2d');
    if (!ctx) return;

    const rawItems = (window.appState && window.appState.rawItems) ? window.appState.rawItems : [];
    const items = (selectedCategory === '全て') ? rawItems : rawItems.filter(i => i.category === selectedCategory);

    const unit = document.getElementById('period-unit-select').value;
    const metric = document.getElementById('metric-type-select').value;

    // 期間ごとのデータバケット作成
    const periodMap = new Map();
    items.forEach(item => {
        const key = getPeriodKey(item.titleDate || item.seriesPeriod, unit);
        if (!periodMap.has(key)) {
            periodMap.set(key, []);
        }
        periodMap.get(key).push(item);
    });

    // 期間ソート
    const sortedPeriods = Array.from(periodMap.keys()).sort();

    // 内訳要素の定義
    let subKeys = [];
    let subColors = [];

    if (metric === 'rating') {
        subKeys = RATING_KEYS;
        subColors = RATING_COLORS;
    } else if (metric === 'seriesKana') {
        subKeys = KANA_GROUPS;
        subColors = KANA_COLORS;
    } else if (metric === 'genre') {
        // ジャンル抽出（カンマ区切り分解、タグ除外）
        const genreSet = new Set();
        items.forEach(i => {
            if (i.genre && i.genre !== '-') {
                i.genre.split(',').map(g => g.trim()).forEach(g => {
                    if (g && !g.startsWith('#')) genreSet.add(g);
                });
            }
        });
        subKeys = Array.from(genreSet);
        if (subKeys.length === 0) subKeys = ['未設定'];
        // カラーパレットの生成
        subColors = subKeys.map((_, idx) => `hsl(${(idx * 137.5) % 360}, 65%, 55%)`);
    }

    // Chart.js データセット構築
    const datasets = subKeys.map((subKey, idx) => {
        const data = sortedPeriods.map(pKey => {
            const pItems = periodMap.get(pKey) || [];
            if (metric === 'rating') {
                return pItems.filter(i => (i.titleRating || '評価なし') === subKey).length;
            } else if (metric === 'seriesKana') {
                return pItems.filter(i => {
                    const k = i.seriesKana || i.titleKana || '';
                    if (subKey === 'その他') return !KANA_GROUPS.slice(0, 10).includes(k);
                    return k === subKey;
                }).length;
            } else if (metric === 'genre') {
                return pItems.filter(i => {
                    if (!i.genre || i.genre === '-') return subKey === '未設定';
                    const genres = i.genre.split(',').map(g => g.trim()).filter(g => !g.startsWith('#'));
                    return genres.includes(subKey);
                }).length;
            }
            return 0;
        });

        return {
            label: subKey,
            data: data,
            backgroundColor: subColors[idx % subColors.length]
        };
    });

    if (categoryChartInstance) {
        categoryChartInstance.destroy();
    }

    const isDark = (document.documentElement.getAttribute('data-theme') || 'dark') === 'dark';
    const textColor = isDark ? '#d4d4d4' : '#333333';
    const gridColor = isDark ? '#404040' : '#cccccc';

    categoryChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: sortedPeriods, // X軸に期間を設定
            datasets: datasets
        },
        options: {
            // indexAxis: 'y' を削除することでデフォルトの縦棒グラフになります
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    stacked: true, // X軸側も積層にする場合（期間ごとに並べるため積み上げOK）
                    ticks: { color: textColor },
                    grid: { color: gridColor }
                },
                y: {
                    stacked: true, // Y軸側を積層（タイトル数）にする
                    ticks: { color: textColor },
                    grid: { color: gridColor }
                }
            },
            plugins: {
                legend: {
                    labels: { color: textColor }
                }
            },
            onClick: (e, elements) => {
                if (elements.length > 0) {
                    const index = elements[0].index;
                    selectedPeriodKey = sortedPeriods[index];
                    renderPeriodDonutCharts();
                }
            }
        }
    });
}

// -------------------------------------------------------------
// 3. 選択期間の統計（ドーナッツグラフ 3種）
// -------------------------------------------------------------
function renderPeriodDonutCharts() {
    const rawItems = (window.appState && window.appState.rawItems) ? window.appState.rawItems : [];
    let items = (selectedCategory === '全て') ? rawItems : rawItems.filter(i => i.category === selectedCategory);

    const unit = document.getElementById('period-unit-select').value;

    // 分類統計（横棒グラフ）と同様の手順で期間キーの一覧を抽出・ソート
    const periodMap = new Map();
    items.forEach(item => {
        const key = getPeriodKey(item.titleDate || item.seriesPeriod, unit);
        if (!periodMap.has(key)) {
            periodMap.set(key, []);
        }
        periodMap.get(key).push(item);
    });
    const sortedPeriods = Array.from(periodMap.keys()).sort();

    // 期間が未選択の場合、分類統計の最新期間（ソート後の最後尾）をデフォルト選択
    if (!selectedPeriodKey && sortedPeriods.length > 0) {
        selectedPeriodKey = sortedPeriods[sortedPeriods.length - 1];
    }

    const titleEl = document.getElementById('period-stats-title');
    if (titleEl) {
        titleEl.textContent = `期間統計（${selectedPeriodKey || '未選択'}）`;
    }

    if (selectedPeriodKey) {
        items = periodMap.get(selectedPeriodKey) || [];
    }

    const isDark = (document.documentElement.getAttribute('data-theme') || 'dark') === 'dark';
    const textColor = isDark ? '#d4d4d4' : '#333333';

    // 1. 評価ドーナッツ
    const ratingCounts = RATING_KEYS.map(key => items.filter(i => (i.titleRating || '評価なし') === key).length);
    ratingDonutInstance = createDonutChart(ratingDonutInstance, 'ratingDonutChart', RATING_KEYS, ratingCounts, RATING_COLORS, textColor);

    // 2. シリーズ50音ドーナッツ
    const kanaCounts = KANA_GROUPS.map(subKey => {
        return items.filter(i => {
            const k = i.seriesKana || i.titleKana || '';
            if (subKey === 'その他') return !KANA_GROUPS.slice(0, 10).includes(k);
            return k === subKey;
        }).length;
    });
    seriesKanaDonutInstance = createDonutChart(seriesKanaDonutInstance, 'seriesKanaDonutChart', KANA_GROUPS, kanaCounts, KANA_COLORS, textColor);

    // 3. ジャンル（タグ除く）ドーナッツ
    const genreMap = new Map();
    items.forEach(i => {
        if (i.genre && i.genre !== '-') {
            i.genre.split(',').map(g => g.trim()).forEach(g => {
                if (g && !g.startsWith('#')) {
                    genreMap.set(g, (genreMap.get(g) || 0) + 1);
                }
            });
        }
    });

    const genreLabels = Array.from(genreMap.keys());
    const genreCounts = Array.from(genreMap.values());
    const genreColors = genreLabels.map((_, idx) => `hsl(${(idx * 137.5) % 360}, 65%, 55%)`);

    genreDonutInstance = createDonutChart(genreDonutInstance, 'genreDonutChart', genreLabels, genreCounts, genreColors, textColor);
}

function createDonutChart(instance, canvasId, labels, data, colors, textColor) {
    const ctx = document.getElementById(canvasId)?.getContext('2d');
    if (!ctx) return null;

    if (instance) {
        instance.destroy();
    }

    return new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: colors
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false // ドーナッツが小さいため凡例は非表示にし省スペース化
                }
            }
        }
    });
}
