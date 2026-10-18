// -- renderer.js ------------------------------------------------------
// copyright = 'Copyright © 2026- @x-builder, Japan';
// email     = 'x-builder@gmail.com';
// appName   = 'xSearch -プレイリスト検索-';
// version   = 'Ver1.05.0';
// ---------------------------------------------------------------------
let appState = {
    selectedDir: '',
    items: [],
    theme: 'dark',
    isProcessing: false // 追加：処理中フラグ
};
let toastTimer = null;
let toastStartTime = 0;
let toastRemainingTime = 3000; // デフォルトの表示時間（3秒）

document.addEventListener('DOMContentLoaded', async () => {
    // 🔲初期処理🔲
    // HTMLロード
    await setupHTMLLoad();
    // ローカルストレージから状態を復元
    await loadFromLocalStorage();
    // 初期表示
    await renderTable();
    // テーマの適用
    await applyTheme();

    // 🔲イベント登録処理🔲
    // テーマ切替
    registerThemeToggleBtnClick();
    // 進捗イベントのリスナー登録
    registerWindowApiProgress();
    // 🔎プレイリスト検索イベントのリスナー登録
    registerSelectDirBtnClick();
    // 👁️プレイリスト再建策イベントのリスナー登録
    registerFastSearchBtnClick();
    // 💾保存ボタンイベントのリスナー登録
    registerSaveBtnClick();
    // 📤エクスポートボタンクリック時
    registerExportBtnClick();
    // 📤インポートボタンクリック時
    registerImportBtnClick();
    // リストヘッダーの全選択 / 全解除の変更イベントのリスナー登録
    registerSelectAllSaveChange();
    // トースタークリックイベントのリスナー登録
    registerToastMessageClick();
    // トースターマウスエンターイベントのリスナー登録
    registerToastMessageMouseenter();
    // トースターマウスリーヴイベントのリスナー登録
    registerToastMessageMouseleave();
    // アプリタイトルクリックイベントのリスナー登録
    registerAppTitleClick();
    // バージョンクリックイベントのリスナー登録
    registerVerTitleClick();
    // ❌ヘルプのクローズクリックイベントのリスナー登録
    registerHelpCloseBtnClick();
    // ❌変更履歴のクローズクリックイベントのリスナー登録
    registerChangelogCloseBtnClick();
});

// 🔲初期処理🔲
// HTMLロード
async function setupHTMLLoad() {
    // 初期化処理 (HTML読み込み & 設定値反映)
    try {
        const helpTableContainer = document.getElementById('helpTableContainer');
        const appConfigContainer = document.getElementById('appConfigContainer');
        const changelogContent = document.getElementById('changelogContent');
        // [処理1] index_helpTable.html の読み込みと流し込み
        const helpRes = await fetch('index_helpTable.html');
        if (helpRes.ok) {
            const helpHtmlText = await helpRes.text();
            // 取得したHTMLをhelpTableContainerへ挿入
            if (helpTableContainer) {
                helpTableContainer.innerHTML = helpHtmlText;
            }
        }

        // [処理2] index_changelog.html の読み込みと流し込み
        const changelogRes = await fetch('index_changelog.html');
        if (changelogRes.ok) {
            const changelogHtmlText = await changelogRes.text();
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = changelogHtmlText;

            // appConfig を appConfigContainer に差し込む
            const appConfigEl = tempDiv.querySelector('#appConfig');
            if (appConfigEl && appConfigContainer) {
                appConfigContainer.appendChild(appConfigEl);
            }

            // changelog-list を changelogContent に差し込む
            const changelogListEl = tempDiv.querySelector('.changelog-list');
            if (changelogListEl && changelogContent) {
                changelogContent.appendChild(changelogListEl);
            }
        }

        // [処理3] appConfig の読み込みと画面への反映
        const appConfig = document.getElementById('appConfig');
        const appTitle = document.querySelector('.app-title');
        const verTitle = document.querySelector('.ver-title');
        const helpContainer = document.querySelector('.help-container');
        const helpTitle = helpContainer?.querySelector('h1');
        const changelogContainer = document.querySelector('.changelog-container');
        const changelogTitle = changelogContainer?.querySelector('h1');
        const copyrightText = document.querySelector('.copyright-text');
        const emailText = document.querySelector('.email-text');
        if (appConfig) {
            // dataset 経由で data-* 属性の値を取得
            const appName = appConfig.dataset.appName || '';
            const version = appConfig.dataset.version || '';

            // 設定１: タイトル部分の設定 (アイコン画像 + appName, verTitle)
            if (appTitle) {
                appTitle.innerHTML = `
                    <img src="xSearch.ico" alt="xSearch Icon" class="title-icon">
                    ${appName}
                `;
            }
            if (verTitle) {
                verTitle.textContent = `${version}`;
            }

            // 設定２: ヘルプ画面の <h1> 設定 (appName + ' ' + version)
            if (helpTitle) {
                helpTitle.textContent = `${appName} ${version} ヘルプ`;
            }

            // 設定３: 変更履歴画面の <h1> 設定 (appName + ' ' + version)
            if (changelogTitle) {
                changelogTitle.textContent = `${appName} ${version} 変更履歴`;
            }

            // dataset 経由で data-* 属性の値を取得
            if (copyrightText) copyrightText.textContent = appConfig.dataset.copyright || '';
            if (emailText) emailText.textContent = appConfig.dataset.email || '';
        }
    } catch (error) {
        console.error('初期化データの読み込みに失敗しました:', error);
    }
}

function loadFromLocalStorage() {
    const saved = localStorage.getItem('playlist_app_state');
    if (saved) {
        try {
            const loadedState = JSON.parse(saved);
            // 既存のオブジェクト構造を維持しつつマージ
            appState = { ...appState, ...loadedState };

            // フォルダパスの復元
            if (appState.selectedDir) {
                const pathLabel = document.getElementById('current-dir-path');
                if (pathLabel) pathLabel.textContent = appState.selectedDir;
            }

            // データを復元した後にテーブルを再描画して各行のチェック状態を反映
            if (typeof renderTable === 'function' && appState.items.length > 0) {
                renderTable();
            }
        } catch (e) {
            console.error('Failed to load localStorage:', e);
        }
    }
}

// ステータスに応じたアイコンを返すヘルパー関数
function getStatusIcon(status) {
    switch (status) {
        case 'OK': return '🟢';
        case 'NG': return '🔴';
        default: return '🟡'; // BLANK など
    }
}

function renderTable() {
    const tbody = document.getElementById('table-body');
    tbody.innerHTML = '';

    appState.items.forEach((item, index) => {
        const tr = document.createElement('tr');

        const fields = [
            item.tid,
            item.seriesKana,
            item.seriesPeriod,
            item.seriesRating,
            item.seriesName,   // index 4: シリーズ
            item.genre,        // index 5: ジャンル
            item.titleKana,
            item.titleDate,
            item.titleRating,
            item.titleName,    // index 9: タイトル
            item.episodeCount, // index 10: 話数
            getStatusIcon(item.playlistStatus) // index 11: 状態
        ];

        // 6番目（ジャンル）までを描画
        for (let i = 0; i <= 5; i++) {
            const td = document.createElement('td');
            const textVal = fields[i] ?? '';
            td.textContent = textVal;
            td.title = textVal;
            tr.appendChild(td);
        }

        // 保存対象（チェックボックス）列の追加
        const saveTd = document.createElement('td');
        saveTd.style.textAlign = 'center';
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.className = 'save-checkbox';
        checkbox.checked = item.isSave ?? false;
        checkbox.dataset.index = index;

        checkbox.addEventListener('change', (e) => {
            item.isSave = e.target.checked;
    
            // 個別変更時も localStorage へ保存
            saveToLocalStorage();
            
            // 全選択チェックボックスの状態を再同期
            updateSelectAllCheckbox();
        });

        saveTd.appendChild(checkbox);
        tr.appendChild(saveTd);

        // 7番目以降（タイトル50音〜話数・状態）を描画
        for (let i = 6; i < fields.length; i++) {
            const td = document.createElement('td');
            const textVal = fields[i] ?? '';
            td.textContent = textVal;
            td.title = textVal;
            if (i === 11) {
                td.style.textAlign = 'center'; // 状態アイコンを中央寄せ
            }
            tr.appendChild(td);
        }
        tbody.appendChild(tr);
    });

    // ループの外で全選択チェックボックスの状態を同期
    updateSelectAllCheckbox();
}

// 🔲イベント登録処理🔲
// ☀️／🌙テーマ切替イベントのリスナー登録
function registerThemeToggleBtnClick() {
    document.getElementById('theme-toggle-btn').addEventListener('click', () => {
        appState.theme = appState.theme === 'dark' ? 'light' : 'dark';
        document.getElementById('theme-toggle-btn').textContent = appState.theme === 'dark' ? '☀️' : '🌙';
        applyTheme();
        saveToLocalStorage();
    });
}

// 進捗イベントのリスナー登録
function registerWindowApiProgress() {
    window.api.onScanProgress((progress) => {
        // 処理中でなければ進捗イベントを無視する
        if (!appState.isProcessing) return;
        showProgress(progress.current, progress.total, progress.message);
    });
}

// 🔎プレイリスト検索イベントのリスナー登録
function registerSelectDirBtnClick() {
    document.getElementById('select-dir-btn').addEventListener('click', async () => {
        const dirPath = await window.api.openDirectory();
        if (!dirPath) return;

        appState.selectedDir = dirPath;
        document.getElementById('current-dir-path').textContent = dirPath;

        appState.isProcessing = true;
        showProgress(0, 100, 'スキャン準備中...');

        try {
            const scanResults = await window.api.scanDirectory(dirPath);
            appState.items = scanResults;
            saveToLocalStorage();
            renderTable();
        } finally {
            appState.isProcessing = false;
            hideProgress();

            showToast('検索が完了しました。');
        }
    });
}

// 👁️プレイリスト再建策イベントのリスナー登録
function registerFastSearchBtnClick() {
    document.getElementById('fast-search-btn').addEventListener('click', async () => {
        if (!appState.selectedDir) {
            showToast('フォルダが選択されていません。', 'warning');
            return;
        }

        appState.isProcessing = true; // 処理開始
        showProgress(0, 100, '高速チェック中...');

        try {
            const syncedItems = await window.api.fastSyncDirectory(appState.selectedDir, appState.items);
            appState.items = syncedItems;
            saveToLocalStorage();
            renderTable();
        } catch (e) {
            console.error(e);
            showToast('高速チェック中にエラーが発生しました。', 'error');
        } finally {
            appState.isProcessing = false; // 処理終了フラグを立てる
            hideProgress();

            showToast('再検索が完了しました。');
        }
    });
}

// 💾保存ボタンイベントのリスナー登録
function registerSaveBtnClick() {
    document.getElementById('save-btn')?.addEventListener('click', async () => {
        // 1. 保存対象（isSave === true）が存在するか事前チェック
        const hasSaveTarget = appState.items.some(item => item.isSave);
        if (!hasSaveTarget) {
            showToast('保存対象の項目にチェックを入れてください。', 'warning');
            return;
        }

        // 2. メインプロセスへ統合保存をリクエスト
        const result = await window.api.savePlaylist(appState.items);

        if (result.success) {
            showToast(`プレイリストを保存しました:\n${result.filePath}`, 'info');
        } else if (!result.canceled) {
            showToast(`保存に失敗しました:\n${result.message || '不明なエラー'}`, 'error');
        }
    });
}

// 📤エクスポートボタンクリック時
function registerExportBtnClick() {
    document.getElementById('export-btn').addEventListener('click', async () => {
        try {
            // localStorage の内容をすべて収集・展開
            const settings = {};
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                const rawValue = localStorage.getItem(key);

                // JSON文字列としてパースできる値はオブジェクト/配列として展開して保存
                try {
                    settings[key] = JSON.parse(rawValue);
                } catch {
                    // 通常の文字列の場合はそのまま保持
                    settings[key] = rawValue;
                }
            }

            // appState の状態も含める
            settings._appState = {
                selectedDir: appState.selectedDir,
                theme: appState.theme
            };

            const result = await window.api.exportSettings(settings);
            if (result.success) {
                console.log('設定をエクスポートしました:', result.filePath);
                showToast(`設定をエクスポートしました:\n${result.filePath}`);
            } else if (!result.canceled) {
                showToast('設定のエクスポートに失敗しました。', 'error');
            }
        } catch (error) {
            console.error('Export error:', error);
            showToast(`設定のエクスポートに失敗しました。\n${error}`, 'error');
        }
    });
}

// 📤インポートボタンクリック時
function registerImportBtnClick() {
    document.getElementById('import-btn').addEventListener('click', async () => {
        try {
            const result = await window.api.importSettings();
            if (result.success && result.data) {
                const settings = result.data;

                // 読み込んだデータを localStorage と appState に反映
                for (const [key, value] of Object.entries(settings)) {
                    if (key === '_appState') {
                        if (value.selectedDir) {
                            appState.selectedDir = value.selectedDir;
                            const pathLabel = document.getElementById('current-dir-path');
                            if (pathLabel) {
                                pathLabel.textContent = appState.selectedDir;
                            }
                        }
                        if (value.theme) {
                            appState.theme = value.theme;
                            // 必要に応じてテーマ変更処理を呼び出し
                        }
                    } else {
                        // オブジェクトや配列構造の場合は文字列化して localStorage に保存
                        const storageValue = (typeof value === 'object' && value !== null)
                            ? JSON.stringify(value)
                            : value;
                        
                        localStorage.setItem(key, storageValue);
                    }
                }

                showToast('設定ファイルをインポートしました。');
                
                // インポート後に画面をリロードして反映
                location.reload();

            } else if (!result.canceled && result.error) {
                showToast(`設定のインポートに失敗しました。\n${result.error}`, 'error');
            }
        } catch (error) {
            console.error('Import error:', error);
            showToast(`設定のインポートに失敗しました。\n${error}`, 'error');
        }
    });
}

// リストヘッダーの全選択 / 全解除の変更イベントのリスナー登録
function registerSelectAllSaveChange() {
    document.getElementById('select-all-save')?.addEventListener('change', (e) => {
        const isChecked = e.target.checked;

        // 全項目の isSave 状態を更新
        appState.items.forEach(item => {
            item.isSave = isChecked;
        });
        
        // 表示中のチェックボックス画面表示を一括更新
        document.querySelectorAll('.save-checkbox').forEach(cb => {
            cb.checked = isChecked;
        });

        // 変更後の状態を localStorage にまとめて保存
        saveToLocalStorage();

        // 念のため同期関数を呼んで半透明状態などをリセット
        updateSelectAllCheckbox();
    });
}

// トースタークリックイベントのリスナー登録
function registerToastMessageClick() {
    const toastMessage = document.getElementById('toast-message');
    toastMessage?.addEventListener('click', hideToast);
}

// トースターマウスエンターイベントのリスナー登録
function registerToastMessageMouseenter() {
    const toastMessage = document.getElementById('toast-message');
    toastMessage?.addEventListener('mouseenter', () => {
        if (toastTimer) {
            clearTimeout(toastTimer);
            toastTimer = null;
            // 経過時間を引いて残りの表示時間を計算
            const elapsedTime = Date.now() - toastStartTime;
            toastRemainingTime = Math.max(0, toastRemainingTime - elapsedTime);
        }
    });
}

// トースターマウスリーヴイベントのリスナー登録
function registerToastMessageMouseleave() {
    const toastMessage = document.getElementById('toast-message');
    toastMessage?.addEventListener('mouseleave', () => {
        if (!toastMessage.classList.contains('hidden') && toastRemainingTime > 0) {
            toastStartTime = Date.now();
            toastTimer = setTimeout(() => {
                hideToast();
            }, toastRemainingTime);
        }
    });
}

// アプリタイトルクリックイベントのリスナー登録
function registerAppTitleClick() {
    const appTitle = document.querySelector('.app-title');
    appTitle?.addEventListener('click', () => {
        const mainContainer = document.querySelector('.main-container');
        const changelogContainer = document.querySelector('.changelog-container');
        const helpContainer = document.querySelector('.help-container');
        if (mainContainer) mainContainer.style.display = 'none';
        if (changelogContainer) changelogContainer.style.display = 'none';
        if (helpContainer) helpContainer.style.display = 'flex';
    });
}

// バージョンクリックイベントのリスナー登録
function registerVerTitleClick() {
    const verTitle = document.querySelector('.ver-title');
    verTitle?.addEventListener('click', () => {
        const mainContainer = document.querySelector('.main-container');
        const changelogContainer = document.querySelector('.changelog-container');
        const helpContainer = document.querySelector('.help-container');
        if (mainContainer) mainContainer.style.display = 'none';
        if (helpContainer) helpContainer.style.display = 'none';
        if (changelogContainer) changelogContainer.style.display = 'flex';
    });
}

// ❌ヘルプのクローズクリックイベントのリスナー登録
function registerHelpCloseBtnClick() {
    const helpCloseBtn = document.getElementById('helpCloseBtn');
    helpCloseBtn?.addEventListener('click', () => {
        const mainContainer = document.querySelector('.main-container');
        const helpContainer = document.querySelector('.help-container');
        if (mainContainer) mainContainer.style.display = 'flex';
        if (helpContainer) helpContainer.style.display = 'none';
    });
}

// ❌変更履歴のクローズクリックイベントのリスナー登録
function registerChangelogCloseBtnClick() {
    const changelogCloseBtn = document.getElementById('changelogCloseBtn');
    changelogCloseBtn?.addEventListener('click', () => {
        const mainContainer = document.querySelector('.main-container');
        const changelogContainer = document.querySelector('.changelog-container');
        if (mainContainer) mainContainer.style.display = 'flex';
        if (changelogContainer) changelogContainer.style.display = 'none';
    });
}

// 🔲共通ヘルパー処理🔲
// 進捗バー表示
function showProgress(current, total, message) {
    const container = document.getElementById('progress-container');
    const bar = document.getElementById('progress-bar');
    const text = document.getElementById('progress-text');
    const status = document.getElementById('status-display');

    container.style.display = 'block';
    const percent = total > 0 ? Math.min(Math.round((current / total) * 100), 100) : 0;
    bar.style.width = `${percent}%`;
    text.textContent = `${percent}% (${current} / ${total})`;
    status.textContent = message;
}

// 進捗バー非表示
function hideProgress() {
    const container = document.getElementById('progress-container');
    container.style.display = 'none';
}

// テーマ適用
function applyTheme() {
    document.documentElement.setAttribute('data-theme', appState.theme);
}

// localStorage保存
function saveToLocalStorage() {
    localStorage.setItem('playlist_app_state', JSON.stringify(appState));
}

// トーストを非表示にする共通関数
function hideToast() {
    const toastMessage = document.getElementById('toast-message');
    if (!toastMessage) return;
    if (toastTimer) {
        clearTimeout(toastTimer);
        toastTimer = null;
    }
    toastMessage.classList.add('hidden');
}

// 呼び出し例:
// showToast('処理が完了しました', 'info');
// showToast('接続を確認してください', 'warning');
// showToast('エラーが発生しました', 'error');
function showToast(message, type = 'info', displayTime = 6000) {
    const toastMessage = document.getElementById('toast-message');
    const statusDisplay = document.getElementById('status-display');
    if (!toastMessage) return;

    // 既存タイマーのクリア
    if (toastTimer) {
        clearTimeout(toastTimer);
        toastTimer = null;
    }

    const icons = {
        info: 'ℹ️',
        warning: '⚠️',
        error: '🚫'
    };
    const icon = icons[type] || icons.info;

    toastMessage.classList.remove('toast-info', 'toast-warning', 'toast-error');
    toastMessage.classList.add(`toast-${type}`);
    
    // 改行コード（\n）を反映させるため white-space を指定
    toastMessage.style.whiteSpace = 'pre-line';
    toastMessage.textContent = `${icon} ${message}`;
    toastMessage.classList.remove('hidden');

    if (statusDisplay) {
        statusDisplay.style.whiteSpace = 'pre-line';
        statusDisplay.textContent = `${icon} ${message}`;
    }

    // 新しい表示に合わせて残時間と開始時間をリセット
    toastRemainingTime = displayTime;
    toastStartTime = Date.now();

    toastTimer = setTimeout(() => {
        hideToast();
    }, toastRemainingTime);
}

// 全選択チェックボックスの状態を同期・更新するヘルパー関数
function updateSelectAllCheckbox() {
    const selectAllCb = document.getElementById('select-all-save');
    if (!selectAllCb) return;

    if (appState.items.length === 0) {
        selectAllCb.checked = false;
        selectAllCb.indeterminate = false;
        return;
    }

    const allChecked = appState.items.every(item => item.isSave);
    const someChecked = appState.items.some(item => item.isSave);

    selectAllCb.checked = allChecked;
    // 一部だけチェックされている場合は半透明（indeterminate）にすると直感的です
    selectAllCb.indeterminate = someChecked && !allChecked;
}
