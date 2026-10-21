// -- renderer.js ------------------------------------------------------
// copyright = 'Copyright © 2026- @x-builder, Japan';
// email     = 'x-builder@gmail.com';
// appName   = 'xSearch -プレイリスト検索-';
// version   = 'Ver1.21.0';
// ---------------------------------------------------------------------
// 🔲イミディエイト定義🔲
// 項目指定記号と内部プロパティのマッピング定義
const fieldMappings = {
    '[全]': 'all',
    '[TID]': 'tid',
    '[分類]': 'category',
    '[S音]': 'seriesKana',
    '[放映期間]': 'seriesPeriod',
    '[S評価]': 'seriesRating',
    '[シリーズ]': 'seriesName',
    '[ジャンル]': 'genre',
    '[保存]': 'isSave',
    '[T音]': 'titleKana',
    '[放映年月]': 'titleDate',
    '[T評価]': 'titleRating',
    '[タイトル]': 'titleName',
    '[話数]': 'episodeCount',
    '[状態]': 'playlistStatus'
};
// thに対応する項目指定記号のマッピング（テーブルの列順に対応）
const thSymbols = [
    '[TID]', 
    '[分類]',
    '[S音]', 
    '[放映期間]', 
    '[S評価]', 
    '[シリーズ]', 
    '[ジャンル]', 
    '[保存]',
    '[T音]', 
    '[放映年月]', 
    '[T評価]', 
    '[タイトル]', 
    '[話数]', 
    '[状態]'
];

// 🔲グルーバル共通変数🔲
let appState = {                // localStorage管理情報
    selectedDir: '',            // 検索フォルダパス
    rawItems: [],               // ベースリスト管理
    items: [],                  // リスト管理
    theme: 'dark',              // テーマ管理
    isProcessing: false,        // 処理中フラグ
    playerAppPath: ''           // プレイヤーアプリのパス
};
let toastTimer = null;          // トースター表示タイマー
let toastStartTime = 0;         // トースター表示開始時間
let toastRemainingTime = 3000;  // デフォルトのトースター表示時間（3秒）
let startTime = null;           // 処理開始時刻
let recentFileTimes = [];       // 直近の処理時間を保持する配列
let lastItemTime = null;        // 前回のアイテム受信時刻
let activePopupMenu = null;     // アクティブなポップアップメニュー要素の保持

document.addEventListener('DOMContentLoaded', async () => {
    // 🔲初期処理🔲
    // HTMLロード
    await setupHTMLLoad();
    // ローカルストレージから状態を復元
    await loadFromLocalStorage();
    // 初回保持（もし未定義なら現在のitemsを保持）
    await setupRawItem();
    // 起動時に一度フィルタ（または全件表示）を適用して件数を正しく表示させる
    applyFilter();
    // テーマの適用
    applyTheme();

    // 🔲イベント登録処理🔲
    // ☀️／🌙テーマ切替イベントのリスナー登録
    registerThemeToggleBtnClick();
    // 進捗イベントのリスナー登録
    registerWindowApiProgress();
    // 🔎プレイリスト検索イベントのリスナー登録
    registerSelectDirBtnClick();
    // 👁️プレイリスト再建策イベントのリスナー登録
    registerFastSearchBtnClick();
    // 💾保存ボタンイベントのリスナー登録
    registerSaveBtnClick();
    // ⚙️ボタンクリックベントのリスナー登録
    registerPlayerConfigBtnClick();
    // 📤エクスポートボタンクリックベントのリスナー登録
    registerExportBtnClick();
    // 📤インポートボタンクリックベントのリスナー登録
    registerImportBtnClick();
    // ❌検索・再検索のキャンセルクリックイベントのリスナー登録
    registerScanCancelBtnClick();
    // ESCキー押下によるキャンセル処理のリスナー登録
    registerWindowKeydown();
     // リストヘッダーの全選択 / 全解除の変更イベントのリスナー登録
    registerSelectAllSaveChange();
    // メニュー外のクリック（左右クリック）でメニューを閉じる
    registerDocumentMousedown();
    // リアルタイムフィルタリングベントのリスナー登録
    registerFilterInputInput();
    // フィルタ条件のキー入力イベントのリスナー登録
    registerFilterInputKeydown();
    // 🆑（クリアボタン）ベントのリスナー登録
    registerFilterClearBtnClick();
    // リストの各見出し項目（th）の右クリックベントのリスナー登録
    registerPlaylistTableThContextmenu();
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

// ローカルストレージから状態を復元
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

            // プレイヤーアプリの復元
            const savedPath = localStorage.getItem('playerAppPath');
            const btn = document.getElementById('player-config-btn');
            if (savedPath) {
                appState.playerAppPath = savedPath;
                if (btn) btn.style.backgroundColor = 'red';
            } else {
                appState.playerAppPath = '';
                if (btn) btn.style.backgroundColor = '';
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
        case 'OVERLAP': return '🟣';
        default: return '🟡'; // BLANK など
    }
}

// リストデータ右クリック時の値変換ヘルパー関数
function getFilterValue(symbol, rawValue, item) {
    if (symbol === '[状態]') {
        switch (rawValue) {
            case '🟢': return 'OK';
            case '🔴': return 'NG';
            case '🟡': return 'BLANK';
            case '🟣': return 'OVERLAP';
            default: {
                return '';
            }
        }
    }
    if (symbol === '[保存]') {
        return item.isSave ? 'ON' : 'OFF';
    }
    return String(rawValue ?? '');
}

// リスト描画
function renderTable() {
    const tbody = document.getElementById('table-body');
    tbody.innerHTML = '';

    appState.items.forEach((item, index) => {
        const tr = document.createElement('tr');

        // 各フィールドの定義（列順に合わせて調整）
        const fields = [
            item.tid,           // index 0: TID
            item.category,      // index 1: 分類
            item.seriesKana,    // index 2: S音
            item.seriesPeriod,  // index 3: 放映期間
            item.seriesRating,  // index 4: 評価
            item.seriesName,    // index 5: シリーズ
            item.genre,         // index 6: ジャンル
            item.titleKana,     // index 7: T音
            item.titleDate,     // index 8: 放映年月
            item.titleRating,   // index 9: T評価
            item.titleName,     // index 10: タイトル
            item.episodeCount,  // index 11: 話数
            getStatusIcon(item.playlistStatus) // index 12: 状態
        ];

        // --- 0〜6番目の描画（TIDは index 0、シリーズは index 5） ---
        for (let i = 0; i <= 6; i++) {
            const td = document.createElement('td');
            const textVal = fields[i] ?? '';
            td.textContent = textVal;
            td.title = textVal;

            const symbol = thSymbols[i];

            // リストデータ右クリックイベントの登録（項目記号の省略を廃止し、常にsymbolを付与）
            td.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                e.stopPropagation();
                closePopupMenu();

                if (symbol) {
                    const val = getFilterValue(symbol, textVal, item);
                    // 記号と値（val）をそれぞれそのまま渡す
                    insertFilterItem(symbol, val);
                }
            });

            // TID列（index 0）のクリックイベント
            if (i === 0 && textVal && textVal !== '-') {
                td.style.cursor = 'pointer';
                td.style.color = '#4da6ff';
                td.addEventListener('click', () => {
                    const tidUrl = `https://cal.syoboi.jp/tid/${textVal}/subtitle`;
                    window.api.openExternalUrl(tidUrl);
                });
            }

            // シリーズ列（index 5）のクリックイベント
            if (i === 5) {
                td.style.cursor = 'pointer';
                td.addEventListener('click', async () => {
                    // プレイヤーアプリが未設定の場合の挙動
                    if (!appState.playerAppPath) {
                        if (item.folderPath) {
                            await window.api.showInFolder(item.folderPath);
                        }
                        return;
                    }
            
                    const result = await window.api.launchPlayer({
                        appPath: appState.playerAppPath,
                        targetPath: item.folderPath
                    });
                    if (result && !result.success && result.error) {
                        showToast(result.error, 'error');
                    }
                });
            }
            

            tr.appendChild(td);
        }

        // 保存対象（チェックボックス）列の追加（7番目の列）
        const saveTd = document.createElement('td');
        saveTd.style.textAlign = 'center';
        
        // 保存列の右クリックイベント
        const saveSymbol = thSymbols[7]; // '[保存]'
        saveTd.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            e.stopPropagation();
            closePopupMenu();

            if (saveSymbol) {
                const val = getFilterValue(saveSymbol, null, item);
                insertFilterItem(saveSymbol, `${saveSymbol} ${val}, `);
            }
        });

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.className = 'save-checkbox';
        checkbox.checked = item.isSave ?? false;
        checkbox.dataset.index = index;

        checkbox.addEventListener('change', (e) => {
            item.isSave = e.target.checked;
            saveToLocalStorage();
            updateSelectAllCheckbox();
        });
        saveTd.appendChild(checkbox);
        tr.appendChild(saveTd);

        // --- 7番目以降の描画（ fields[7] 以降） ---
        for (let i = 7; i < fields.length; i++) {
            const td = document.createElement('td');
            const textVal = fields[i] ?? '';
            td.textContent = textVal;
            td.title = textVal;

            // thSymbolsのインデックスは保存列（index 7）の分だけ +1 シフトする
            const symbol = thSymbols[i + 1];

            // リストデータ右クリックイベントの登録（項目記号の省略を廃止し、常にsymbolを付与）
            td.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                e.stopPropagation();
                closePopupMenu();

                if (symbol) {
                    const val = getFilterValue(symbol, textVal, item);
                    // 記号と値（val）をそれぞれそのまま渡す
                    insertFilterItem(symbol, val);
                }
            });

            // タイトル列（fieldsのindex 10にあたる）のクリックイベント
            if (i === 10) { 
                td.style.cursor = 'pointer';
                td.addEventListener('click', async () => {
                    // プレイヤーアプリが未設定の場合の挙動
                    if (!appState.playerAppPath) {
                        if (item.filePath) {
                            await window.api.showInFolder(item.filePath);
                        }
                        return;
                    }
            
                    const result = await window.api.launchPlayer({
                        appPath: appState.playerAppPath,
                        targetPath: item.filePath
                    });
                    if (result && !result.success && result.error) {
                        showToast(result.error, 'error');
                    }
                });
            }

            // 話数や状態などのテキスト中央揃えなど
            if (i === 11 || i === 12) {
                td.style.textAlign = 'center';
            }
            tr.appendChild(td);
        }

        tbody.appendChild(tr);
    });

    updateSelectAllCheckbox();
}

// 初回保持（もし未定義なら現在のitemsを保持）
function setupRawItem() {
    if (!appState.rawItems) {
        appState.rawItems = [...appState.items];
    }
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

// 進捗・アイテム受信イベントのリスナー登録
function registerWindowApiProgress() {
    window.api.onScanProgress((progress) => {
        if (!appState.isProcessing) return;
        
        const now = Date.now();
        if (!startTime) {
            startTime = now;
        }
        showProgress(progress.current, progress.total, progress.message, now);
    });

    // ★ サーバー制限時のトースト通知を受け取るリスナーを追加
    if (window.api.onScanToast) {
        window.api.onScanToast((data) => {
            showToast(data.message, data.type);
        });
    }

    // ★ 1件ずつアイテムを受信したタイミングで処理時間を計測
    window.api.onScanItem((item) => {
        if (!appState.isProcessing) return;
        
        const now = Date.now();
        if (lastItemTime) {
            const duration = now - lastItemTime;
            recentFileTimes.push(duration);
            // 最大12件を維持（超えたら古いものを削除）
            if (recentFileTimes.length > 12) {
                recentFileTimes.shift();
            }
        }
        lastItemTime = now;

        // 配列に追加
        appState.rawItems.push(item);

        // 100件に達するごとに再描画とストレージ保存を実行
        if (appState.rawItems.length % 100 === 0) {
            applyFilter();
            saveToLocalStorage();
        }
    });
}

// 🔎プレイリスト検索イベントのリスナー登録（初回スキャン）
function registerSelectDirBtnClick() {
    document.getElementById('select-dir-btn').addEventListener('click', async () => {
        const dirPath = await window.api.openDirectory();
        if (!dirPath) return;

        appState.selectedDir = dirPath;
        document.getElementById('current-dir-path').textContent = dirPath;

        appState.isProcessing = true;
        
        appState.rawItems = [];
        appState.items = [];
        applyFilter();

        showProgress(0, 100, 'スキャン準備中...');

        let isCanceled = false;
        try {
            // ★ 第二引数を渡さなければ、自動的にフルスキャンとして動作します
            const scanResults = await window.api.fastSyncDirectory(dirPath);
            
            if (scanResults && scanResults.canceled) {
                isCanceled = true;
                return;
            }

            appState.items = scanResults;
            appState.rawItems = [...scanResults];
            saveToLocalStorage();
            applyFilter();
        } catch (e) {
            console.error(e);
            showToast('スキャン中にエラーが発生しました。', 'error');
        } finally {
            appState.isProcessing = false;
            hideProgress();

            if (!isCanceled) {
                showToast('検索が完了しました。');
            }
        }
    });
}

// 👁️プレイリスト再検索イベントのリスナー登録
function registerFastSearchBtnClick() {
    document.getElementById('fast-search-btn').addEventListener('click', async () => {
        if (!appState.selectedDir) {
            showToast('フォルダが選択されていません。', 'warning');
            return;
        }

        appState.isProcessing = true; // 処理開始

        // ★【重要】クリアする前に、キャッシュ照合用の既存アイテムデータを待避しておく
        const existingItems = [...appState.rawItems]; // または appState.items

        // 画面表示用データおよび全体データをクリアしてテーブルを初期化
        appState.rawItems = [];
        appState.items = [];
        applyFilter();

        showProgress(0, 100, '高速チェック中...');

        let isCanceled = false; // キャンセル判定用フラグ
        try {
            // ★ 第二引数には待避しておいた existingItems を渡す！
            const syncedItems = await window.api.fastSyncDirectory(appState.selectedDir, existingItems);
            
            // キャンセルされた場合のチェック
            if (syncedItems && syncedItems.canceled) {
                isCanceled = true;
                return;
            }

            // 最終結果で確定
            appState.items = syncedItems;
            appState.rawItems = [...syncedItems];
            saveToLocalStorage();
            applyFilter();
        } catch (e) {
            console.error(e);
            showToast('高速チェック中にエラーが発生しました。', 'error');
        } finally {
            appState.isProcessing = false; // 処理終了フラグ
            hideProgress();

            // キャンセルされていない場合のみトーストを表示
            if (!isCanceled) {
                showToast('再検索が完了しました。');
            }
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
            showToast(`プレイリストを保存しました:\n${result.filePath}`);
        } else if (!result.canceled) {
            showToast(`保存に失敗しました:\n${result.message || '不明なエラー'}`, 'error');
        }
    });
}

// ⚙️ボタンクリックベントのリスナー登録
function registerPlayerConfigBtnClick() {
    document.getElementById('player-config-btn').addEventListener('click', async () => {
        // メインプロセス経由でファイル選択ダイアログを表示する例
        const filePath = await window.api.selectPlayerApp();
    
        if (filePath) {
            // 「開く」選択時
            appState.playerAppPath = filePath;
            localStorage.setItem('playerAppPath', filePath);
            document.getElementById('player-config-btn').style.backgroundColor = 'red';
            showToast('プレイヤーアプリを設定しました');
        } else {
            // 「キャンセル」選択時、または未選択の場合のクリア処理
            // ※必要に応じて「解除しますか？」の確認などを挟んでも良いですが、要件に合わせてシンプルにクリア実装
            appState.playerAppPath = '';
            localStorage.removeItem('playerAppPath');
            document.getElementById('player-config-btn').style.backgroundColor = '';
            showToast('プレイヤーアプリの設定をクリアしました');
        }
    });
}

// 📤エクスポートボタンクリックベントのリスナー登録
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

// 📤インポートボタンクリックベントのリスナー登録
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

// ❌検索・再検索のキャンセルクリックイベントのリスナー登録
function registerScanCancelBtnClick() {
    const cancelBtn = document.getElementById('scan-cancel-btn');
    if (cancelBtn) {
        cancelBtn.addEventListener('click', () => {
            handleCancelAction();
        });
    }
}

// ESCキー押下によるキャンセル処理のリスナー登録
function registerWindowKeydown() {
    window.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && appState.isProcessing) {
            handleCancelAction();
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

// メニュー外のクリック（左右クリック）でメニューを閉じる
function registerDocumentMousedown() {
    document.addEventListener('mousedown', (e) => {
        if (activePopupMenu && !activePopupMenu.contains(e.target)) {
            closePopupMenu();
        }
    });
}

// リアルタイムフィルタリングベントのリスナー登録
function registerFilterInputInput() {
    const filterInput = document.getElementById('filter-input');
    filterInput.addEventListener('input', () => {
        applyFilter();
    });
}

// フィルタ条件のキー入力イベントのリスナー登録
function registerFilterInputKeydown() {
    const filterInput = document.getElementById('filter-input');
    filterInput.addEventListener('keydown', (e) => {
        const start = filterInput.selectionStart;
        const end = filterInput.selectionEnd;
        const value = filterInput.value;

        // 1. 文字列を選択して "(" または "（" を入力した時
        if (e.key === '(' || e.key === '（') {
            if (start !== end) {
                e.preventDefault();
                const openChar = e.key;
                const closeChar = openChar === '(' ? ')' : '）';
                const selectedText = value.slice(start, end);
                
                const newValue = value.slice(0, start) + openChar + selectedText + closeChar + value.slice(end);
                filterInput.value = newValue;
                
                const newCursorPos = end + 2;
                filterInput.setSelectionRange(newCursorPos, newCursorPos);
                
                applyFilter();
                return;
            }
        }

        // 2. Backspace または Delete で "(" または "（" を削除時、対応する ")" または "）" を探して削除
        if ((e.key === 'Backspace' || e.key === 'Delete') && start === end) {
            let targetIndex = -1;
            let charToDelete = '';

            if (e.key === 'Backspace' && start > 0) {
                charToDelete = value[start - 1];
                if (charToDelete === '(' || charToDelete === '（') {
                    targetIndex = start - 1;
                }
            } else if (e.key === 'Delete' && start < value.length) {
                charToDelete = value[start];
                if (charToDelete === '(' || charToDelete === '（') {
                    targetIndex = start;
                }
            }

            if (targetIndex !== -1 && charToDelete) {
                const openChar = charToDelete;
                const closeChar = openChar === '(' ? ')' : '）';
                
                // 対応する閉じ括弧の位置をネストを考慮して探す
                let depth = 1;
                let closeIndex = -1;
                for (let i = targetIndex + 1; i < value.length; i++) {
                    const c = value[i];
                    if (c === openChar) {
                        depth++;
                    } else if (c === closeChar) {
                        depth--;
                        if (depth === 0) {
                            closeIndex = i;
                            break;
                        }
                    }
                }
                
                if (closeIndex !== -1) {
                    e.preventDefault();
                    // 開き括弧(targetIndex)と対応する閉じ括弧(closeIndex)の両方を削除
                    const newValue = value.slice(0, targetIndex) + value.slice(targetIndex + 1, closeIndex) + value.slice(closeIndex + 1);
                    filterInput.value = newValue;
                    
                    // カーソル位置を削除位置に調整
                    filterInput.setSelectionRange(targetIndex, targetIndex);
                    applyFilter();
                    return;
                }
            }
        }
    });
}

// 🆑（クリアボタン）ベントのリスナー登録
function registerFilterClearBtnClick() {
    const clearBtn = document.getElementById('filter-clear-btn');
    const filterInput = document.getElementById('filter-input');
    clearBtn.addEventListener('click', () => {
        filterInput.value = '';
        applyFilter();
    });
}

// リストの各見出し項目（th）の右クリックイベントのリスナー登録
function registerPlaylistTableThContextmenu() {
    const headers = document.querySelectorAll('#playlist-table th');
    const filterInput = document.getElementById('filter-input');

    headers.forEach((th, index) => {
        const symbol = thSymbols[index];
        if (!symbol) return;

        th.addEventListener('contextmenu', (e) => {
            e.preventDefault(); // コンテキストメニューを抑制
            e.stopPropagation();

            // 既存のポップアップを破棄
            closePopupMenu();

            // 対象項目のメニュー設定を取得
            const items = getHeaderMenuItems(symbol);

            // 【現状維持の項目】（TID、放映期間、シリーズ、放映年月、タイトル、話数など）の場合
            if (!items) {
                const cursorPos = filterInput.selectionStart;
                const text = filterInput.value;
                let newInput = symbol + ' ';
                if (cursorPos > 0 && !text.slice(0, cursorPos).endsWith(' ')) {
                    newInput = ' ' + newInput;
                }
                const newText = text.slice(0, cursorPos) + newInput + text.slice(cursorPos);
                
                filterInput.value = newText;
                filterInput.focus();
                filterInput.setSelectionRange(cursorPos + newInput.length, cursorPos + newInput.length);
                
                applyFilter();
                return;
            }

            // 【ポップアップメニュー表示対象の項目】
            // ポップアップメニューの作成
            const menu = document.createElement('div');
            menu.className = 'menu-style';

            // 先頭アイテム：[選択見出し項目]
            const headerItem = document.createElement('div');
            headerItem.className = 'menu-item';
            headerItem.textContent = symbol;
            headerItem.style.fontWeight = 'bold';
            headerItem.style.borderBottom = '1px solid #444';
            headerItem.addEventListener('click', (event) => {
                event.stopPropagation();
                insertFilterItem(symbol, '');
                // メニューは表示したまま
            });
            menu.appendChild(headerItem);

            // 各メニューアイテムの追加
            items.forEach((itemVal) => {
                const menuItem = document.createElement('div');
                menuItem.className = 'menu-item';
                menuItem.textContent = itemVal;
                menuItem.addEventListener('click', (event) => {
                    event.stopPropagation();
                    insertFilterItem(symbol, itemVal);
                    // メニューは表示したまま
                });
                menu.appendChild(menuItem);
            });

            // メニューの表示位置計算（画面外へのはみだし調整）
            document.body.appendChild(menu);
            activePopupMenu = menu;

            const x = Math.min(e.clientX, window.innerWidth - menu.offsetWidth - 10);
            const y = Math.min(e.clientY, window.innerHeight - menu.offsetHeight - 10);

            menu.style.left = `${Math.max(10, x)}px`;
            menu.style.top = `${Math.max(10, y)}px`;
        });
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
// 進捗バー表示（完了予定日時の計算を含む）
function showProgress(current, total, message, now) {
    const container = document.getElementById('progress-container');
    const bar = document.getElementById('progress-bar');
    const text = document.getElementById('progress-text');
    const status = document.getElementById('status-display');
    const cancelBtn = document.getElementById('scan-cancel-btn');

    container.style.display = 'flex';
    cancelBtn.style.display = 'flex';
    const percent = total > 0 ? Math.min(Math.round((current / total) * 100), 100) : 0;
    bar.style.width = `${percent}%`;

    // 完了予定時間の計算（直近12件から最速・最遅を除いた10件の平均を使用）
    let etaString = '';
    if (current > 0 && current < total && now) {
        let avgTimePerFile = 0;
        
        if (recentFileTimes.length > 0) {
            let timesToUse = [...recentFileTimes];
            
            // 12件溜まっている場合は、最も早い時間と最も遅い時間を除外して10ファイルにする
            if (timesToUse.length >= 12) {
                timesToUse.sort((a, b) => a - b); // 昇順ソート
                timesToUse = timesToUse.slice(1, timesToUse.length - 1); // 最小と最大をカット
            }
            
            const sum = timesToUse.reduce((a, b) => a + b, 0);
            avgTimePerFile = sum / timesToUse.length;
        } else if (startTime) {
            // 履歴が溜まるまでは全体平均でフォールバック
            avgTimePerFile = (now - startTime) / current;
        }

        const remainingFiles = total - current;
        const etaMs = avgTimePerFile * remainingFiles;
        const etaDate = new Date(now + etaMs);

        const month = etaDate.getMonth() + 1;
        const day = etaDate.getDate();
        const hours = String(etaDate.getHours()).padStart(2, '0');
        const minutes = String(etaDate.getMinutes()).padStart(2, '0');

        etaString = `　⌚完了予定：${month}/${day} ${hours}:${minutes}`;
    }

    text.textContent = `${percent}% ( ${current} / ${total} )${etaString}`;
    status.textContent = message;
}

// 進捗バー非表示時の一連のリセット処理
function hideProgress() {
    const container = document.getElementById('progress-container');
    container.style.display = 'none';
    startTime = null;
    const cancelBtn = document.getElementById('scan-cancel-btn');
    cancelBtn.style.display = 'none';
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
    const container = document.getElementById('toast-container');
    const statusDisplay = document.getElementById('status-display');
    if (!container) return;

    const icons = {
        info: 'ℹ️',
        warning: '⚠️',
        error: '🚫'
    };
    const icon = icons[type] || icons.info;

    // 1. トースト要素を動的生成
    const toastEl = document.createElement('div');
    toastEl.className = `toast toast-${type} hidden`;
    toastEl.textContent = `${icon} ${message}`;

    // 2. 個別のタイマー・時間管理用変数
    let timer = null;
    let remainingTime = displayTime;
    let startTime = Date.now();

    // タイマー開始・再開用関数
    const startTimer = (duration) => {
        startTime = Date.now();
        timer = setTimeout(() => {
            removeToast();
        }, duration);
    };

    // トースト削除関数（アニメーション付き）
    const removeToast = () => {
        if (timer) {
            clearTimeout(timer);
            timer = null;
        }
        toastEl.classList.add('hidden');
        // トランジション終了後にDOMから完全削除
        setTimeout(() => {
            toastEl.remove();
        }, 300);
    };

    // 3. イベントリスナーの設定（個別要素に紐付け）
    toastEl.addEventListener('click', removeToast);

    toastEl.addEventListener('mouseenter', () => {
        if (timer) {
            clearTimeout(timer);
            timer = null;
            const elapsed = Date.now() - startTime;
            remainingTime = Math.max(0, remainingTime - elapsed);
        }
    });

    toastEl.addEventListener('mouseleave', () => {
        if (remainingTime > 0 && !toastEl.classList.contains('hidden')) {
            startTimer(remainingTime);
        }
    });

    // 4. コンテナに追加して表示
    container.appendChild(toastEl);

    // 強制再描画（フェードイン・スライドインのアニメーションを効かせるため）
    toastEl.offsetHeight;
    toastEl.classList.remove('hidden');

    // タイマー起動
    startTimer(remainingTime);

    // ステータス表示の更新（必要に応じて）
    if (statusDisplay) {
        statusDisplay.style.whiteSpace = 'pre-line';
        statusDisplay.textContent = `${icon} ${message}`;
    }
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

// フィルタリング処理のメインロジick
function filterItems(items, query) {
    if (!query || query.trim() === '') {
        return items;
    }

    // 1. カンマ（, または 、）でクエリを分割し、空の項目や前後の空白を除外する
    const rawParts = query.split(/[,，]/);
    const orParts = rawParts.map(p => p.trim()).filter(Boolean);

    if (orParts.length === 0) {
        return items;
    }

    // 2. 各項（ORグループ）ごとの条件リストを構築する
    const orGroups = [];
    for (let part of orParts) {
        // 各項は完全に独立してパースする（前の項のフィールドを引き継がない）
        const conditions = parseAndConditions(part, '[全]');
        if (conditions.length > 0) {
            orGroups.push(conditions);
        }
    }

    if (orGroups.length === 0) {
        return items;
    }

    // 3. ベースデータ（items）の元の並び順を維持したままフィルタリング
    // 各項のいずれか（OR）にヒットするかを判定しつつ、上から順のインデックスを保持する
    return items.filter(item => {
        return orGroups.some(orGroup => {
            // グループ内のすべての条件（AND）を満たすか
            return orGroup.every(cond => {
                const internalField = fieldMappings[cond.field] || 'all';
                return evaluateSingleCondition(item, internalField, cond.expression);
            });
        });
    });
}

// 1つのブロック内のスペース区切りからAND条件のリストを抽出するパーサー
function parseAndConditions(partStr, defaultField) {
    const regex = /(\[[^\]]+\])|([^\s]+)/g;
    let tokens = [];
    let match;
    while ((match = regex.exec(partStr)) !== null) {
        if (match[1]) tokens.push({ type: 'field', val: match[1] });
        else if (match[2]) tokens.push({ type: 'word', val: match[2] });
    }

    let conditions = [];
    let currentField = defaultField;

    for (let token of tokens) {
        if (token.type === 'field') {
            currentField = token.val;
        } else if (token.type === 'word') {
            let val = token.val.trim();
            if (val) {
                conditions.push({ field: currentField, expression: val });
            }
        }
    }

    return conditions;
}

// 個別の条件評価
function evaluateSingleCondition(item, internalField, expr) {
    let op = '=';
    let val = expr;
    if (expr.startsWith('>')) {
        op = '>';
        val = expr.slice(1);
    } else if (expr.startsWith('<')) {
        op = '<';
        val = expr.slice(1);
    } else if (expr.startsWith('=')) {
        op = '=';
        val = expr.slice(1);
    } else if (expr.startsWith('!')) {
        op = '!';
        val = expr.slice(1);
    }

    if (internalField === 'isSave') {
        const upperVal = val.toUpperCase();
        if (upperVal === 'ON' || upperVal === 'OFF') {
            const expectedBool = (upperVal === 'ON');
            const actualBool = Boolean(item.isSave);
            return op === '!' ? (actualBool !== expectedBool) : (actualBool === expectedBool);
        }
        return false;
    }

    const targetValues = internalField === 'all' 
        ? Object.values(item) 
        : [item[internalField]];

    return targetValues.some(itemVal => {
        if (itemVal === undefined || itemVal === null) return false;
        const strVal = String(itemVal);
        const numVal = Number(itemVal);
        const targetNum = Number(val);
        const isNumeric = !isNaN(numVal) && !isNaN(targetNum) && val !== '';

        switch (op) {
            case '>':
                return isNumeric ? numVal >= targetNum : strVal >= val;
            case '<':
                return isNumeric ? numVal <= targetNum : strVal <= val;
            case '!':
                return !strVal.includes(val);
            case '=':
            default:
                return strVal.includes(val);
        }
    });
}

// 括弧内のカンマやOR演算子を無視して分割するヘルパー関数
function splitByOr(query) {
    const result = [];
    let current = '';
    let parenDepth = 0;
    
    for (let i = 0; i < query.length; i++) {
        const char = query[i];
        if (char === '(' || char === '（') {
            parenDepth++;
            current += char;
        } else if (char === ')' || char === '）') {
            parenDepth = Math.max(0, parenDepth - 1);
            current += char;
        } else if (parenDepth === 0 && (char === ',' || char === '，' || char === '、')) {
            result.push(current);
            current = '';
        } else if (parenDepth === 0 && query.substr(i, 2) === '||') {
            result.push(current);
            current = '';
            i++; 
        } else if (parenDepth === 0 && query.substr(i, 2) === '｜｜') {
            result.push(current);
            current = '';
            i++; 
        } else {
            current += char;
        }
    }
    result.push(current);
    return result;
}

// AND条件グループをパースする簡易パーサー
function parseAndConditions(groupStr) {
    // ざっくり正規表現やスペース区切りで分解しつつ、[項目記号] 比較演算子 値 のペアを抽出
    // 例: "[S音]>あ <お" や "[シリーズ]ああああ"
    const regex = /(\[[\s\S]*?\])?\s*([><!=]?)([^\[\s]+)/g;
    let match;
    const conditions = [];

    // もし上記正規表現でパースしきれないシンプルな文字列（スペース区切りの単語など）の場合のフォールバック
    // ここでは簡易的にスペースやAND演算子で分割して処理する構造にします
    const tokens = groupStr.split(/[\s ]+|&&|＆＆/).filter(Boolean);
    
    let currentField = '[全]';
    let subConditions = [];

    for (let token of tokens) {
        if (token.startsWith('[') && token.endsWith(']')) {
            currentField = token;
        } else {
            subConditions.push({ field: currentField, expression: token });
        }
    }
    return subConditions;
}

// 個別の条件評価
function evaluateCondition(item, cond) {
    const internalField = fieldMappings[cond.field] || 'all';
    const expr = cond.expression;

    // 比較式の抽出 (>値, <値, =値 or 値, !値)
    let op = '=';
    let val = expr;
    if (expr.startsWith('>')) {
        op = '>';
        val = expr.slice(1);
    } else if (expr.startsWith('<')) {
        op = '<';
        val = expr.slice(1);
    } else if (expr.startsWith('=')) {
        op = '=';
        val = expr.slice(1);
    } else if (expr.startsWith('!')) {
        op = '!';
        val = expr.slice(1);
    }

    // ★ 保存対象（[保存] / isSave）の特殊判定
    if (internalField === 'isSave') {
        const upperVal = val.toUpperCase();
        if (upperVal === 'ON' || upperVal === 'OFF') {
            const expectedBool = (upperVal === 'ON');
            const actualBool = Boolean(item.isSave);
            return op === '!' ? (actualBool !== expectedBool) : (actualBool === expectedBool);
        }
        // 誤った指定可能値（ON/OFF以外）が指定された場合は条件無効（falseを返す）
        return false;
    }

    // ターゲットの値を取得
    const targetValues = internalField === 'all' 
        ? Object.values(item) 
        : [item[internalField]];

    return targetValues.some(itemVal => {
        if (itemVal === undefined || itemVal === null) return false;
        const strVal = String(itemVal);
        const numVal = Number(itemVal);
        const targetNum = Number(val);
        const isNumeric = !isNaN(numVal) && !isNaN(targetNum) && val !== '';

        switch (op) {
            case '>':
                return isNumeric ? numVal >= targetNum : strVal >= val;
            case '<':
                return isNumeric ? numVal <= targetNum : strVal <= val;
            case '!':
                return !strVal.includes(val);
            case '=':
            default:
                return strVal.includes(val);
        }
    });
}

// リアルタイムフィルタリングと件数表示の更新
function applyFilter() {
    const inputElem = document.getElementById('filter-input');
    const query = inputElem.value;
    
    // 全データ（appState.rawItems または元のリスト）からフィルタリング
    // ※ appState.rawItems に全件保持されている想定
    const sourceItems = appState.rawItems || appState.items;
    const filteredItems = filterItems(sourceItems, query);

    // 表示用リストを更新
    appState.items = filteredItems;
    renderTable();

    // フィルタ件数の更新 ("表示行数 / 全行数")
    const countElem = document.getElementById('filter-count');
    const totalCount = sourceItems.length;
    const filteredCount = filteredItems.length;
    countElem.textContent = `${filteredCount} / ${totalCount}`;
}

// キャンセル実行処理
async function handleCancelAction() {
    await window.api.cancelScan();
    appState.isProcessing = false;
    hideProgress();

    showToast('検索を中断しました。', 'warning')
}

// ポップアップメニューを閉じる関数
function closePopupMenu() {
    if (activePopupMenu) {
        activePopupMenu.remove();
        activePopupMenu = null;
    }
}

// 各見出し（th）のメニュー定義を取得するヘルパー関数
function getHeaderMenuItems(symbol) {
    switch (symbol) {
        case '[分類]': {
            // リストの「分類」列内の値を重複を除いて設定（値の末尾に", "を追加）
            const categories = Array.from(
                new Set(appState.items.map(item => item.category).filter(Boolean))
            );
            return categories.map(cat => `${cat}, `);
        }
        case '[S音]':
        case '[T音]': {
            // 50音（シリーズ）/ 50音（タイトル）
            return [
                "あ, い, う, え, お, ",
                "か, き, く, け, こ, ",
                "さ, し, す, せ, そ, ",
                "た, ち, つ, て, と, ",
                "な, に, ぬ, ね, の, ",
                "は, ひ, ふ, へ, ほ, ",
                "ま, み, む, め, も, ",
                "や, ゆ, よ, ら, り, ",
                "ら, り, る, れ, ろ, ",
                "わ, を, ん, "
            ];
        }
        case '[S評価]':
        case '[T評価]': {
            // 評価（シリーズ）/ 評価（タイトル）
            return [
                "☆☆☆☆☆, ",
                "★☆☆☆☆, ",
                "★★☆☆☆, ",
                "★★★☆☆, ",
                "★★★★☆, ",
                "★★★★★, "
            ];
        }
        case '[ジャンル]': {
            return [
                "アクション, ",
                "アドベンチャー, ",
                "コメディ, ",
                "ドラマ, ",
                "エッチ, ",
                "ファンタジー, ",
                "成人向け, ",
                "ホラー, ",
                "魔法少女, ",
                "メカ・ロボット, ",
                "音楽, ",
                "ミステリー, ",
                "サスペンス・心理, ",
                "恋愛・ラブコメ, ",
                "SF, ",
                "日常・ほのぼの, ",
                "スポーツ, ",
                "超自然・能力, ",
                "スリラー, "
            ];
        }
        case '[保存]': {
            return [
                "ON, ",
                "OFF, "
            ];
        }
        case '[状態]': {
            return [
                "OK, ",
                "NG, ",
                "BLANK, ",
                "OVERLAP, "
            ];
        }
        default:
            return null; // 現状維持（メニュー非表示）の項目
    }
}

// フィルタ入力欄へテキストを挿入する関数（記号の省略を完全に廃止）
function insertFilterItem(symbol, val) {
    const filterInput = document.getElementById('filter-input');
    const cursorPos = filterInput.selectionStart;
    const text = filterInput.value;

    const textBeforeCursor = text.slice(0, cursorPos);
    
    // カーソル位置の直前がスペースやカンマでなければ、自然にスペースを空ける
    const prefix = (cursorPos > 0 && !textBeforeCursor.endsWith(' ') && !textBeforeCursor.endsWith(',')) ? ' ' : '';

    // 常に「[記号] 値, 」の形式で文字列を生成する
    const insertText = prefix + symbol + ' ' + val;

    const newText = text.slice(0, cursorPos) + insertText + text.slice(cursorPos);
    filterInput.value = newText;
    filterInput.focus();

    const newCursorPos = cursorPos + insertText.length;
    filterInput.setSelectionRange(newCursorPos, newCursorPos);

    applyFilter();
}
