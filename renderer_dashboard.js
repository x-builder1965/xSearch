// -- renderer_dashboard.js --------------------------------------------
// copyright = 'Copyright © 2026- @x-builder, Japan';
// email     = 'x-builder@gmail.com';
// appName   = 'xSearch -プレイリスト検索-';
// version   = 'Ver1.39.4';
// ---------------------------------------------------------------------
// 定数定義
const STATUS_COLORS = {
    green: '#4caf50',
    red: '#f44336',
    yellow: '#ffeb3b',
    purple: '#9c27b0'
};

// 評価
const RATING_KEYS = ['★★★★★', '★★★★☆', '★★★☆☆', '★★☆☆☆', '★☆☆☆☆', '不明'];
const RATING_COLORS = ['#e91e63', '#ff9800', '#ffeb3b', '#4caf50', '#2196f3', '#607d8b'];

// 50音個別
const KANA_INDIVIDUAL = ['あ', 'い', 'う', 'え', 'お', 'か', 'き', 'く', 'け', 'こ', 'さ', 'し', 'す', 'せ', 'そ', 'た', 'ち', 'つ', 'て', 'と', 'な', 'に', 'ぬ', 'ね', 'の', 'は', 'ひ', 'ふ', 'へ', 'ほ', 'ま', 'み', 'む', 'め', 'も', 'や', 'ゆ', 'よ', 'ら', 'り', 'る', 'れ', 'ろ', 'わ', 'を', 'ん'];
const KANA_INDIVIDUAL_KEYS = [...KANA_INDIVIDUAL, '不明', 'その他'];
const KANA_INDIVIDUAL_COLORS = [
    ...KANA_INDIVIDUAL.map((_, idx) => `hsl(${(idx * 7.5) % 360}, 65%, 55%)`),
    '#607d8b', // 不明
    '#795548'  // その他
];

// 50音グループ定義
const KANA_GROUP_MAP = {
    'あグループ': ['あ', 'い', 'う', 'え', 'お'],
    'かグループ': ['か', 'き', 'く', 'け', 'こ'],
    'さグループ': ['さ', 'し', 'す', 'せ', 'そ'],
    'たグループ': ['た', 'ち', 'つ', 'て', 'と'],
    'なグループ': ['な', 'に', 'ぬ', 'ね', 'の'],
    'はグループ': ['は', 'ひ', 'ふ', 'へ', 'ほ'],
    'まグループ': ['ま', 'み', 'む', 'め', 'も'],
    'やグループ': ['や', 'ゆ', 'よ'],
    'らグループ': ['ら', 'り', 'る', 'れ', 'ろ'],
    'わグループ': ['わ', 'を', 'ん']
};
const KANA_GROUP_KEYS = [...Object.keys(KANA_GROUP_MAP), '不明', 'その他'];
const KANA_GROUP_COLORS = [
    '#f44336', '#e91e63', '#9c27b0', '#673ab7', '#3f51b5',
    '#2196f3', '#00bcd4', '#009688', '#4caf50', '#ff9800',
    '#607d8b', // 不明
    '#795548'  // その他
];

let categoryChartInstance = null;
let ratingDonutInstance = null;
let seriesKanaDonutInstance = null;
let genreDonutInstance = null;
let selectedCategory = '全て';
let selectedPeriodKey = null;
let marqueeInterval = null;         // 自動スクロール用タイマー管理

// 初期化関数
function initDashboard() {
    // 🔴 起動時に appState から保存された選択状態を復元・反映
    if (window.appState) {
        if (window.appState.dashSelectedCategory) {
            selectedCategory = window.appState.dashSelectedCategory;
        }
        if (window.appState.dashSelectedPeriodKey !== undefined) {
            selectedPeriodKey = window.appState.dashSelectedPeriodKey;
        }

        const periodUnitSelect = document.getElementById('period-unit-select');
        const metricTypeSelect = document.getElementById('metric-type-select');

        if (periodUnitSelect && window.appState.dashPeriodUnit) {
            periodUnitSelect.value = window.appState.dashPeriodUnit;
        }
        if (metricTypeSelect && window.appState.dashMetricType) {
            metricTypeSelect.value = window.appState.dashMetricType;
        }
    }

    const titleEl = document.getElementById('category-stats-title');
    if (titleEl) {
        titleEl.textContent = `分類統計（${selectedCategory}）`;
    }

    updateDashboardTimestamp();
    setupDashboardEventListeners();
    refreshDashboard();
}

// タイムスタンプ更新
function updateDashboardTimestamp() {
    const tsEl = document.getElementById('summary-timestamp');
    if (!tsEl) return;

    // appState に保存されている検索実行日時を取得
    const savedTimestamp = (window.appState && window.appState.lastScanTimestamp) 
        ? window.appState.lastScanTimestamp 
        : null;

    if (savedTimestamp) {
        tsEl.textContent = savedTimestamp;
    } else {
        tsEl.textContent = '----年--月--日(-) --:--時点（未検索）';
    }
}

// イベントリスナー登録
function setupDashboardEventListeners() {
    const periodUnitSelect = document.getElementById('period-unit-select');
    const metricTypeSelect = document.getElementById('metric-type-select');
    const scaleRange = document.getElementById('category-scale-range');

    if (periodUnitSelect) {
        periodUnitSelect.addEventListener('change', () => {
            selectedPeriodKey = null; // 集計単位変更時は選択期間リセット
            if (window.appState) {
                window.appState.dashPeriodUnit = periodUnitSelect.value;
                window.appState.dashSelectedPeriodKey = null;
                if (typeof saveToLocalStorage === 'function') saveToLocalStorage();
            }
            renderCategoryChart();
            renderPeriodDonutCharts();
        });
    }

    if (metricTypeSelect) {
        metricTypeSelect.addEventListener('change', () => {
            if (window.appState) {
                window.appState.dashMetricType = metricTypeSelect.value;
                if (typeof saveToLocalStorage === 'function') saveToLocalStorage();
            }
            renderCategoryChart();
            renderPeriodDonutCharts();
        });
    }

    // 縮尺スライダーのイベントリスナー設定（ダッシュボード初期化時などに紐付け）
    if (scaleRange) {
        // 多重登録防止のため既存のリスナーがあれば置き換え、またはイベントを一度だけ付与
        scaleRange.oninput = (e) => {
            const val = parseFloat(e.target.value);
            if (window.appState) {
                window.appState.dashCategoryScale = val;
                if (typeof saveToLocalStorage === 'function') {
                    saveToLocalStorage();
                }
            }
            renderCategoryChart();
        };
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

    const rawItems = (window.appState && window.appState.items) ? window.appState.items : [];

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

        // 状態別件数集計 (通常 / 更新)
        let green = 0, red = 0, yellow = 0, purple = 0;
        let greenUpdated = 0, redUpdated = 0, yellowUpdated = 0, purpleUpdated = 0;
        
        filtered.forEach(i => {
            const isUpdated = Boolean(i.isUpdated);
            const status = (i.playlistStatus || '').toUpperCase();
            const rawStatus = i.playlistStatus;

            if (isUpdated) {
                if (status === 'OK' || rawStatus === '🟩') {
                    greenUpdated++;
                } else if (status === 'NG' || rawStatus === '🟥') {
                    redUpdated++;
                } else if (status === 'OVERLAP' || rawStatus === '🟪') {
                    purpleUpdated++;
                } else {
                    // BLANK または 未設定
                    yellowUpdated++;
                }
            } else {
                if (status === 'OK' || rawStatus === '🟢') {
                    green++;
                } else if (status === 'NG' || rawStatus === '🔴') {
                    red++;
                } else if (status === 'OVERLAP' || rawStatus === '🟣') {
                    purple++;
                } else {
                    // BLANK または 未設定
                    yellow++;
                }
            }
        });

        const tr = document.createElement('tr');
        if (cat === selectedCategory) {
            tr.classList.add('selected-row');
        }

        tr.innerHTML = `
            <td class="cat-cell">${cat}</td>
            <td>${seriesCount.toLocaleString()}</td>
            <td>${titleCount.toLocaleString()}</td>
            <td>${green.toLocaleString()}</td>
            <td>${red.toLocaleString()}</td>
            <td>${yellow.toLocaleString()}</td>
            <td>${purple.toLocaleString()}</td>
            <td>${greenUpdated.toLocaleString()}</td>
            <td>${redUpdated.toLocaleString()}</td>
            <td>${yellowUpdated.toLocaleString()}</td>
            <td>${purpleUpdated.toLocaleString()}</td>
            <td>${episodeCount.toLocaleString()}</td>
        `;

        // 行クリックで選択分類を変更 & localStorage保存
        tr.addEventListener('click', () => {
            selectedCategory = cat;
            document.querySelectorAll('#summary-table-body tr').forEach(r => r.classList.remove('selected-row'));
            tr.classList.add('selected-row');

            document.getElementById('category-stats-title').textContent = `分類統計（${selectedCategory}）`;
            selectedPeriodKey = null;

            // 状態保存
            if (window.appState) {
                window.appState.dashSelectedCategory = selectedCategory;
                window.appState.dashSelectedPeriodKey = null;
                if (typeof saveToLocalStorage === 'function') saveToLocalStorage();
            }

            renderCategoryChart();
            renderPeriodDonutCharts();
        });

        tbody.appendChild(tr);
    });
}

// -------------------------------------------------------------
// 共通：選択カテゴリにおける全ジャンルのマスターリストとカラーを生成するヘルパー関数
// -------------------------------------------------------------
function getGenreMaster(items) {
    const genreSet = new Set();
    items.forEach(i => {
        if (i.genre && i.genre !== '-') {
            i.genre.split(',').map(g => g.trim()).forEach(g => {
                if (g && !g.startsWith('#')) genreSet.add(g);
            });
        }
    });

    // 1. 常に固定の昇順ソート（「不明」以外）
    let labels = Array.from(genreSet).sort((a, b) => a.localeCompare(b, 'ja'));
    if (labels.includes('不明')) {
        labels = labels.filter(g => g !== '不明');
        labels.push('不明');
    } else {
        labels.push('不明');
    }

    // 2. 常にマスター全体のインデックスに基づいた固定カラーを生成
    const colors = labels.map((g, idx) => g === '不明' ? '#607d8b' : `hsl(${(idx * 137.5) % 360}, 65%, 55%)`);

    return { labels, colors };
}

// -------------------------------------------------------------
// 2. 選択分類の統計グラフ内でのクリック（選択期間の変更）
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

    const scrollContainer = document.getElementById('category-chart-scroll-container');
    const innerContainer = document.getElementById('category-chart-inner');
    const scaleRange = document.getElementById('category-scale-range');
    const scaleValueSpan = document.getElementById('category-scale-value');

    // 現在のスクロール位置と比率を保存（表示位置維持のため）
    let scrollRatio = 0;
    if (scrollContainer) {
        const maxScrollLeft = scrollContainer.scrollWidth - scrollContainer.clientWidth;
        if (maxScrollLeft > 0) {
            scrollRatio = scrollContainer.scrollLeft / maxScrollLeft;
        }
    }

    const rawItems = (window.appState && window.appState.items) ? window.appState.items : [];
    const items = (selectedCategory === '全て') ? rawItems : rawItems.filter(i => i.category === selectedCategory);

    const unit = document.getElementById('period-unit-select').value;
    const metric = document.getElementById('metric-type-select').value;

    const periodMap = new Map();
    items.forEach(item => {
        const key = getPeriodKey(item.titleDate || item.seriesPeriod, unit);
        if (!periodMap.has(key)) {
            periodMap.set(key, []);
        }
        periodMap.get(key).push(item);
    });

    const sortedPeriods = Array.from(periodMap.keys()).sort();

    // 縮尺スライダーの値を取得・反映
    let currentScale = 1.0;
    if (scaleRange) {
        currentScale = parseFloat(scaleRange.value) || 1.0;
        if (scaleValueSpan) {
            scaleValueSpan.textContent = `${currentScale.toFixed(1)}x`;
        }
    } else if (window.appState && window.appState.dashCategoryScale) {
        currentScale = window.appState.dashCategoryScale;
    }

    // インナーコンテナの横幅を動的に変更（1倍時は親コンテナ幅に合わせ、2倍以上は割合に応じて拡大）
    if (innerContainer && scrollContainer) {
        const baseWidth = scrollContainer.clientWidth;
        // 期間の数に応じて基本幅を調整するか、scaleに応じてコンテナ幅を増やす
        const dynamicWidth = Math.max(baseWidth, baseWidth * currentScale);
        innerContainer.style.width = `${dynamicWidth}px`;
    }

    let subKeys = [];
    let subColors = [];

    if (metric === 'rating') {
        subKeys = RATING_KEYS;
        subColors = RATING_COLORS;
    } else if (metric === 'seriesKana') {
        subKeys = KANA_INDIVIDUAL_KEYS;
        subColors = KANA_INDIVIDUAL_COLORS;
    } else if (metric === 'seriesKanaGroup') {
        subKeys = KANA_GROUP_KEYS;
        subColors = KANA_GROUP_COLORS;
    } else if (metric === 'genre') {
        const master = getGenreMaster(items);
        subKeys = master.labels;
        subColors = master.colors;
    }

    const datasets = subKeys.map((subKey, idx) => {
        const data = sortedPeriods.map(pKey => {
            const pItems = periodMap.get(pKey) || [];
            if (metric === 'rating') {
                return pItems.filter(i => {
                    const r = i.titleRating || '評価なし';
                    if (subKey === '不明') return r === '-';
                    return r === subKey;
                }).length;
            } else if (metric === 'seriesKana') {
                return pItems.filter(i => {
                    const k = i.seriesKana || i.titleKana || '';
                    if (subKey === '不明') return k === '-' || !k;
                    if (subKey === 'その他') return k !== '-' && k && !KANA_INDIVIDUAL.includes(k);
                    return k === subKey;
                }).length;
            } else if (metric === 'seriesKanaGroup') {
                return pItems.filter(i => {
                    const k = i.seriesKana || i.titleKana || '';
                    if (subKey === '不明') return k === '-' || !k;
                    if (subKey === 'その他') {
                        if (k === '-' || !k) return false;
                        const allGroupChars = Object.values(KANA_GROUP_MAP).flat();
                        return !allGroupChars.includes(k);
                    }
                    const groupChars = KANA_GROUP_MAP[subKey] || [];
                    return groupChars.includes(k);
                }).length;
            } else if (metric === 'genre') {
                return pItems.filter(i => {
                    if (subKey === '不明') return !i.genre || i.genre === '-';
                    if (!i.genre || i.genre === '-') return false;
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
            labels: sortedPeriods,
            datasets: datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    stacked: true,
                    ticks: { color: textColor },
                    grid: { color: gridColor }
                },
                y: {
                    stacked: true,
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

                    if (window.appState) {
                        window.appState.dashSelectedPeriodKey = selectedPeriodKey;
                        if (typeof saveToLocalStorage === 'function') saveToLocalStorage();
                    }

                    renderPeriodDonutCharts();
                }
            }
        }
    });

    // グラフ描画完了後、保存した表示位置（スクロール位置）を復元
    setTimeout(() => {
        if (scrollContainer) {
            const newMaxScrollLeft = scrollContainer.scrollWidth - scrollContainer.clientWidth;
            if (newMaxScrollLeft > 0) {
                scrollContainer.scrollLeft = newMaxScrollLeft * scrollRatio;
            }
        }
    }, 0);
}

// -------------------------------------------------------------
// 3. 選択期間の統計（ドーナッツグラフ 3種） & 要素別件数カードの更新
// -------------------------------------------------------------
function renderPeriodDonutCharts() {
    const rawItems = (window.appState && window.appState.items) ? window.appState.items : [];
    let items = (selectedCategory === '全て') ? rawItems : rawItems.filter(i => i.category === selectedCategory);

    const unit = document.getElementById('period-unit-select').value;
    const metric = document.getElementById('metric-type-select').value;

    const periodMap = new Map();
    items.forEach(item => {
        const key = getPeriodKey(item.titleDate || item.seriesPeriod, unit);
        if (!periodMap.has(key)) {
            periodMap.set(key, []);
        }
        periodMap.get(key).push(item);
    });
    const sortedPeriods = Array.from(periodMap.keys()).sort();

    if (!selectedPeriodKey && sortedPeriods.length > 0) {
        selectedPeriodKey = sortedPeriods[sortedPeriods.length - 1];
        if (window.appState) {
            window.appState.dashSelectedPeriodKey = selectedPeriodKey;
            if (typeof saveToLocalStorage === 'function') saveToLocalStorage();
        }
    }

    const titleEl = document.getElementById('period-stats-title');
    if (titleEl) {
        titleEl.textContent = `期間統計（${selectedPeriodKey || '未選択'}）`;
    }

    // 期間内のアイテム
    const periodItems = selectedPeriodKey ? (periodMap.get(selectedPeriodKey) || []) : [];

    // 🆕 要素別件数カードの更新処理を呼び出し
    try {
        renderElementCountCard(periodItems, selectedPeriodKey, metric, items); // 全アイテム(items)をマスター作成用に渡す
    } catch (err) {
        console.error("要素別件数カードの描画中にエラーが発生しました:", err);
    }

    const isDark = (document.documentElement.getAttribute('data-theme') || 'dark') === 'dark';
    const textColor = isDark ? '#d4d4d4' : '#333333';

    // 1. 評価ドーナッツ
    const ratingCounts = RATING_KEYS.map(key => {
        return periodItems.filter(i => {
            const r = i.titleRating || '評価なし';
            if (key === '不明') return r === '-';
            return r === key;
        }).length;
    });
    ratingDonutInstance = createDonutChart(ratingDonutInstance, 'ratingDonutChart', RATING_KEYS, ratingCounts, RATING_COLORS, textColor);

    // 2. シリーズ50音 / 50音グループ ドーナッツ
    let kanaKeys = KANA_INDIVIDUAL_KEYS;
    let kanaColors = KANA_INDIVIDUAL_COLORS;

    // 🟢 50音グラフのタイトル要素を動的に変更する処理
    // 期間統計カード内の 2番目の donut-chart-box にある .chart-title を取得
    const periodStatsCard = document.querySelector('.period-stats-card');
    if (periodStatsCard) {
        const donutBoxes = periodStatsCard.querySelectorAll('.donut-chart-box');
        if (donutBoxes.length >= 2) {
            const kanaTitleEl = donutBoxes[1].querySelector('.chart-title');
            if (kanaTitleEl) {
                if (metric === 'seriesKanaGroup') {
                    kanaTitleEl.textContent = '50音グループ';
                } else {
                    // evaluation, seriesKana, genre の場合はすべて「50音個別」に設定
                    kanaTitleEl.textContent = '50音個別';
                }
            }
        }
    }

    if (metric === 'seriesKanaGroup') {
        kanaKeys = KANA_GROUP_KEYS;
        kanaColors = KANA_GROUP_COLORS;
    }

    const kanaCounts = kanaKeys.map(subKey => {
        return periodItems.filter(i => {
            const k = i.seriesKana || i.titleKana || '';
            if (metric === 'seriesKanaGroup') {
                if (subKey === '不明') return k === '-' || !k;
                if (subKey === 'その他') {
                    if (k === '-' || !k) return false;
                    const allGroupChars = Object.values(KANA_GROUP_MAP).flat();
                    return !allGroupChars.includes(k);
                }
                const groupChars = KANA_GROUP_MAP[subKey] || [];
                return groupChars.includes(k);
            } else {
                if (subKey === '不明') return k === '-' || !k;
                if (subKey === 'その他') return k !== '-' && k && !KANA_INDIVIDUAL.includes(k);
                return k === subKey;
            }
        }).length;
    });
    seriesKanaDonutInstance = createDonutChart(seriesKanaDonutInstance, 'seriesKanaDonutChart', kanaKeys, kanaCounts, kanaColors, textColor);

    // 3. ジャンル ドーナッツ
    const master = getGenreMaster(items);
    const genreLabels = master.labels;
    const genreColors = master.colors;

    const genreCounts = genreLabels.map(key => {
        if (key === '不明') {
            return periodItems.filter(i => !i.genre || i.genre === '-').length;
        }
        return periodItems.filter(i => {
            if (!i.genre || i.genre === '-') return false;
            const genres = i.genre.split(',').map(g => g.trim()).filter(g => !g.startsWith('#'));
            return genres.includes(key);
        }).length;
    });

    genreDonutInstance = createDonutChart(genreDonutInstance, 'genreDonutChart', genreLabels, genreCounts, genreColors, textColor);
}

function createDonutChart(instance, canvasId, labels, data, colors, textColor) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return null;

    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    if (canvas.parentElement) {
        canvas.parentElement.style.minHeight = '120px';
        canvas.parentElement.style.position = 'relative';
    }

    // 既存インスタンスがある場合は、作り直さずにデータを更新する
    if (instance) {
        instance.data.labels = labels;
        instance.data.datasets[0].data = data;
        instance.data.datasets[0].backgroundColor = colors;
        instance.update(); // アニメーション付きで更新される
        return instance;
    }

    // 初回生成時のみ new Chart を行う
    return new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: colors,
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: {
                animateRotate: true,
                duration: 1000
            },
            plugins: {
                legend: {
                    display: false
                }
            }
        }
    });
}

// -------------------------------------------------------------
// 4. 要素別件数カードの描画ロジック（マスター共有・色完全一致版）
// -------------------------------------------------------------
function renderElementCountCard(periodItems, periodKey, metric, allCategoryItems) {
    const cardTitleEl = document.getElementById('element-card-title');
    const totalCountEl = document.getElementById('element-total-count');
    const scrollContainer = document.getElementById('element-scroll-container');

    if (!cardTitleEl || !totalCountEl || !scrollContainer) return;

    if (marqueeInterval) {
        clearInterval(marqueeInterval);
        marqueeInterval = null;
    }

    cardTitleEl.textContent = `要素別件数（${periodKey || '未選択'}）`;

    const totalCount = periodItems.length;
    totalCountEl.textContent = `全件数：${totalCount.toLocaleString()}件`;

    let elementData = [];

    if (metric === 'rating') {
        RATING_KEYS.forEach((key, idx) => {
            const count = periodItems.filter(i => {
                const r = i.titleRating || '評価なし';
                if (key === '不明') return r === '-';
                return r === key;
            }).length;
            elementData.push({ 
                name: key, 
                count, 
                color: RATING_COLORS[idx % RATING_COLORS.length] 
            });
        });
    } else if (metric === 'seriesKana') {
        KANA_INDIVIDUAL_KEYS.forEach((key, idx) => {
            const count = periodItems.filter(i => {
                const k = i.seriesKana || i.titleKana || '';
                if (key === '不明') return k === '-' || !k;
                if (key === 'その他') return k !== '-' && k && !KANA_INDIVIDUAL.includes(k);
                return k === key;
            }).length;
            elementData.push({ 
                name: key, 
                count, 
                color: KANA_INDIVIDUAL_COLORS[idx % KANA_INDIVIDUAL_COLORS.length] 
            });
        });
    } else if (metric === 'seriesKanaGroup') {
        KANA_GROUP_KEYS.forEach((key, idx) => {
            const count = periodItems.filter(i => {
                const k = i.seriesKana || i.titleKana || '';
                if (key === '不明') return k === '-' || !k;
                if (key === 'その他') {
                    if (k === '-' || !k) return false;
                    const allGroupChars = Object.values(KANA_GROUP_MAP).flat();
                    return !allGroupChars.includes(k);
                }
                const groupChars = KANA_GROUP_MAP[key] || [];
                return groupChars.includes(k);
            }).length;
            elementData.push({ 
                name: key, 
                count, 
                color: KANA_GROUP_COLORS[idx % KANA_GROUP_COLORS.length] 
            });
        });
    } else if (metric === 'genre') {
        // 🟢 共通マスター関数を利用し、グラフ側と100%同じマスター（ラベル・カラー）を取得
        const master = getGenreMaster(allCategoryItems);
        const genreLabels = master.labels;
        const genreColors = master.colors;

        genreLabels.forEach((key, idx) => {
            const count = periodItems.filter(i => {
                if (key === '不明') return !i.genre || i.genre === '-';
                if (!i.genre || i.genre === '-') return false;
                const genres = i.genre.split(',').map(g => g.trim()).filter(g => !g.startsWith('#'));
                return genres.includes(key);
            }).length;

            elementData.push({
                name: key,
                count: count,
                color: genreColors[idx] // グラフ側と完全に同一のインデックスのカラーを適用
            });
        });
    }

    scrollContainer.innerHTML = '';

    if (elementData.length === 0) {
        scrollContainer.innerHTML = '<span style="color: var(--text-muted); font-size: 0.9em;">データなし</span>';
        return;
    }

    const renderItems = [...elementData, ...elementData];

    renderItems.forEach(el => {
        const itemBox = document.createElement('div');
        itemBox.className = 'element-item-box';
        itemBox.innerHTML = `
            <span class="el-name"><span style="color: ${el.color}; margin-right: 2px;">■</span>${el.name}：</span>
            <span class="el-count">${el.count.toLocaleString()}</span>
        `;
        scrollContainer.appendChild(itemBox);
    });

    if (scrollContainer.scrollWidth > scrollContainer.clientWidth) {
        const startMarquee = () => {
            if (marqueeInterval) return;
            
            marqueeInterval = setInterval(() => {
                if (!scrollContainer) return;

                const singleSetWidth = scrollContainer.scrollWidth / 2;

                if (scrollContainer.scrollLeft >= singleSetWidth) {
                    scrollContainer.scrollLeft -= singleSetWidth;
                } else {
                    scrollContainer.scrollLeft += 1;
                }
            }, 40);
        };

        startMarquee();

        scrollContainer.onmouseenter = () => {
            if (marqueeInterval) {
                clearInterval(marqueeInterval);
                marqueeInterval = null;
            }
        };
        
        scrollContainer.onmouseleave = () => {
            startMarquee();
        };
    }
}
