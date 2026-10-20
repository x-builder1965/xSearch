// -- main.js ----------------------------------------------------------
// copyright = 'Copyright © 2026- @x-builder, Japan';
// email     = 'x-builder@gmail.com';
// appName   = 'xSearch -プレイリスト検索-';
// version   = 'Ver1.15.0';
// ---------------------------------------------------------------------
const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs').promises;
const { spawn } = require('child_process');

// AniList의 英語ジャンル名から日本語への対応辞書
const GENRE_MAP = {
    'Action': 'アクション',
    'Adventure': 'アドベンチャー',
    'Comedy': 'コメディ',
    'Drama': 'ドラマ',
    'Ecchi': 'エッチ',
    'Fantasy': 'ファンタジー',
    'Hentai': '成人向け',
    'Horror': 'ホラー',
    'Mahou Shoujo': '魔法少女',
    'Mecha': 'メカ・ロボット',
    'Music': '音楽',
    'Mystery': 'ミステリー',
    'Psychological': 'サスペンス・心理',
    'Romance': '恋愛・ラブコメ',
    'Sci-Fi': 'SF',
    'Slice of Life': '日常・ほのぼの',
    'Sports': 'スポーツ',
    'Supernatural': '超自然・能力',
    'Thriller': 'スリラー'
};

let currentCancelToken = null;          // キャンセル状態を管理するマップまたは変数
let lastApiCallTime = 0;                // レートリミット管理用変数
const MIN_API_INTERVAL = 500;           // 最低500msの間隔を空けてサーバー負荷を抑制
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function throttleApiCall() {
    const now = Date.now();
    const elapsed = now - lastApiCallTime;
    if (elapsed < MIN_API_INTERVAL) {
        const waitTime = MIN_API_INTERVAL - elapsed;
        await delay(waitTime);
    }
    lastApiCallTime = Date.now();
}

// --- リクエスト結果のキャッシュ（同一条件での重複リクエスト防止） ---
const aniListCache = new Map();   // key: seriesName, value: genre
const syobocalCache = new Map();  // key: titleName, value: tid

function createWindow() {
    const mainWindow = new BrowserWindow({
        width: 1280,
        height: 720,
        title: 'xSearch -プレイリスト検索-',
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
            webSecurity: true,
            sandbox: false
        },
        icon: path.join(__dirname, 'xSearch.ico'),
        autoHideMenuBar: true,
    });

    mainWindow.loadFile('index.html');

    // ▼ 【追加】レンダラーのクラッシュ（白画面）を検知して自動リロードする
    mainWindow.webContents.on('render-process-gone', (event, details) => {
        console.error('Renderer process crashed or killed:', details);
        // 必要に応じてログやアラートを出力しつつ、再読み込みする
        mainWindow.reload();
    });
}

app.whenReady().then(() => {
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.exit();
});

// フォルダ選択ダイアログ
ipcMain.handle('dialog:openDirectory', async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog({
        properties: ['openDirectory']
    });
    if (canceled || filePaths.length === 0) return null;
    return filePaths[0];
});

// AniListデータ取得（アンマッチ時に「劇場版」「映画」を除外して再リクエスト）
async function fetchAniListWithFallback(name) {
    let genre = await fetchAniListData(name);
    // アンマッチ（'-' または空）かつ、キーワードに「劇場版」または「映画」が含まれている場合
    if ((!genre || genre === '-') && (name.includes('劇場版') || name.includes('映画'))) {
        const cleanedName = name.replace(/劇場版|映画/g, '').trim();
        if (cleanedName && cleanedName !== name) {
            genre = await fetchAniListData(cleanedName);
        }
    }
    return genre;
}

// しょぼカレンダーTID取得（アンマッチ時に「劇場版」「映画」を除外して再リクエスト）
async function fetchSyobocalTidWithFallback(name) {
    let tid = await fetchSyobocalTid(name);
    // アンマッチ（'-' または空）かつ、キーワードに「劇場版」または「映画」が含まれている場合
    if ((!tid || tid === '-') && (name.includes('劇場版') || name.includes('映画'))) {
        const cleanedName = name.replace(/劇場版|映画/g, '').trim();
        if (cleanedName && cleanedName !== name) {
            tid = await fetchSyobocalTid(cleanedName);
        }
    }
    return tid;
}

// プレイリスト内のパスを検証して状態を判定するヘルパー関数
async function checkPlaylistStatus(folderPath, lines) {
    if (lines.length === 0) {
        return 'BLANK';
    }

    try {
        for (const line of lines) {
            const rawPath = line.trim();
            // 絶対パスでなければフォルダからの相対パスとして解決
            const targetPath = path.isAbsolute(rawPath) ? rawPath : path.resolve(folderPath, rawPath);
            await fs.access(targetPath);
        }
        return 'OK';
    } catch (e) {
        return 'NG';
    }
}

// シリーズ情報の動的パース関数
function parseSeriesInfo(folderName) {
    const parts = folderName.split('_');
    let kana = '';
    let period = '';
    let rating = '';
    const remainingParts = [];

    const kanaRegex = /^[あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめもやゆよらりるれろわをん]$/;
    const periodRegex = /^\d{4}(?:00|0[1-9]|1[0-2])～\d{4}(?:00|0[1-9]|1[0-2])$/;
    const ratingRegex = /^[★☆]{5}$/;

    for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        const isLast = (i === parts.length - 1);

        // 最後の要素以外をメタデータ候補として判定
        if (!isLast) {
            if (!kana && kanaRegex.test(part)) {
                kana = part;
                continue;
            }
            if (!period && periodRegex.test(part)) {
                period = part;
                continue;
            }
            if (!rating && ratingRegex.test(part)) {
                rating = part;
                continue;
            }
        }
        remainingParts.push(part);
    }

    return {
        seriesKana: kana || '-',
        seriesPeriod: period || '-',
        seriesRating: rating || '-',
        seriesName: remainingParts.join('_') || folderName
    };
}

// タイトル情報の動的パース関数
function parseTitleInfo(baseFileName) {
    const parts = baseFileName.split('_');
    let kana = '';
    let date = '';
    let rating = '';
    const remainingParts = [];

    const kanaRegex = /^[あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめもやゆよらりるれろわをん]$/;
    const dateRegex = /^\d{4}(?:00|0[1-9]|1[0-2])$/;
    const ratingRegex = /^[★☆]{5}$/;

    for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        const isLast = (i === parts.length - 1);

        if (!isLast) {
            if (!kana && kanaRegex.test(part)) {
                kana = part;
                continue;
            }
            if (!date && dateRegex.test(part)) {
                date = part;
                continue;
            }
            if (!rating && ratingRegex.test(part)) {
                rating = part;
                continue;
            }
        }
        remainingParts.push(part);
    }

    return {
        titleKana: kana || '-',
        titleDate: date || '-',
        titleRating: rating || '-',
        titleName: remainingParts.join('_') || baseFileName
    };
}


// 再帰的にすべてのプレイリストファイルとシリーズ情報を事前に収集するヘルパー関数
async function collectPlaylists(currentDir) {
    let playlists = [];
    try {
        const entries = await fs.readdir(currentDir, { withFileTypes: true });
        const dirEntries = entries.filter(e => e.isDirectory());
        const fileEntries = entries.filter(e => e.isFile() && e.name.endsWith('.amppl'));

        let folderStat;
        try {
            folderStat = await fs.stat(currentDir);
        } catch (e) {
            folderStat = { mtimeMs: 0 };
        }
        const folderMtime = folderStat.mtimeMs;

        const folderName = path.basename(currentDir);
        const parsedSeries = parseSeriesInfo(folderName);
        
        const seriesInfo = {
            folderPath: currentDir,
            folderMtime,
            seriesKana: parsedSeries.seriesKana,
            seriesPeriod: parsedSeries.seriesPeriod,
            seriesRating: parsedSeries.seriesRating,
            seriesName: parsedSeries.seriesName
        };

        // この階層にあるプレイリストファイルをリストに追加
        for (const fileEntry of fileEntries) {
            const filePath = path.join(currentDir, fileEntry.name);
            playlists.push({ filePath, seriesInfo });
        }

        // 子ディレクトリを再帰的に収集
        for (const dirEntry of dirEntries) {
            const subDirPath = path.join(currentDir, dirEntry.name);
            const subPlaylists = await collectPlaylists(subDirPath);
            playlists = playlists.concat(subPlaylists);
        }
    } catch (e) {
        console.error('Error collecting playlists in:', currentDir, e);
    }
    return playlists;
}

// 高速再検索 / 同期（初回スキャン兼用版）
ipcMain.handle('fast:syncDirectory', async (event, rootDir, existingItems = []) => {
    const cancelToken = { canceled: false };
    currentCancelToken = cancelToken;

    try {
        const existingMap = new Map();
        if (Array.isArray(existingItems)) {
            existingItems.forEach(item => {
                existingMap.set(item.filePath, item);
            });
        }

        const playlistItems = await collectPlaylists(rootDir);
        const total = playlistItems.length;
        const results = [];
        let current = 0;

        for (const item of playlistItems) {
            if (cancelToken.canceled) {
                throw new Error('Canceled');
            }

            current++;
            const { filePath, seriesInfo } = item;
            const fileName = path.basename(filePath);

            event.sender.send('scan:progress', {
                current,
                total,
                message: `( ${current} / ${total} ) ${fileName}`
            });

            let fileStat;
            try {
                fileStat = await fs.stat(filePath);
            } catch (e) {
                continue;
            }
            const fileMtime = fileStat.mtimeMs;

            const cachedItem = existingMap.get(filePath);

            const baseFileName = path.basename(filePath, '.amppl');
            const parsedTitle = parseTitleInfo(baseFileName);

            const ampplContent = await fs.readFile(filePath, 'utf-8');
            const lines = ampplContent.split(/\r?\n/).filter(line => line.trim() !== '');
            const episodeCount = lines.length;

            const lowerPath = filePath.toLowerCase();
            const isAnimePath = lowerPath.includes('アニメ') || lowerPath.includes('anime');

            // --- プレフィックス除去用のヘルパー関数 ---
            const removePrefix = (str) => {
                let cleaned = str;
                cleaned = cleaned.replace(/^[ぁ-んァ-ン]_/, '');           // 50音＋ "_"
                cleaned = cleaned.replace(/^[\d\s～〜年月日]+_/, '');        // 放映期間＋ "_"
                cleaned = cleaned.replace(/^[★☆]+_/, '');                 // 評価＋ "_"
                return cleaned;
            };

            // --- 「分類」および「シリーズ情報」の算出ロジック ---
            const relativePath = path.relative(rootDir, seriesInfo.folderPath);
            const pathSegments = relativePath.split(path.sep).filter(Boolean);
            
            let category;
            let rawFolderName;

            if (pathSegments.length === 0) {
                // 選択フォルダの直下にプレイリストファイルが存在する場合
                const rootFolderName = path.basename(rootDir);
                category = removePrefix(rootFolderName);
                rawFolderName = rootFolderName;
            } else {
                // 選択フォルダの直下にフォルダが存在し、その中（または下層）にプレイリストが存在する場合
                category = pathSegments[0];
                rawFolderName = path.basename(seriesInfo.folderPath);
            }

            // シリーズ名からプレフィックスを除去
            let seriesName = removePrefix(rawFolderName);

            let genre = cachedItem ? cachedItem.genre : null;
            let tid = cachedItem ? cachedItem.tid : null;
            let playlistStatus = cachedItem ? cachedItem.playlistStatus : null;

            const isMtimeUnchanged = cachedItem && 
                                     cachedItem.folderMtime === seriesInfo.folderMtime && 
                                     cachedItem.fileMtime === fileMtime &&
                                     cachedItem.category === category &&
                                     cachedItem.seriesName === seriesName; // 分類・シリーズの変化も考慮

            const needsFetchGenre = isAnimePath && (!cachedItem || !genre);
            const needsFetchTid = isAnimePath && (!cachedItem || !tid);
            const needsCheckStatus = !cachedItem || !playlistStatus;

            let resultItem;
            if (isMtimeUnchanged && !needsFetchGenre && !needsFetchTid && !needsCheckStatus) {
                resultItem = cachedItem;
            } else {
                if (!isAnimePath) {
                    genre = '-';
                    tid = '-';
                } else {
                    if (needsFetchGenre) {
                        genre = await fetchAniListWithFallback(seriesName);
                    }
                    if (needsFetchTid) {
                        tid = await fetchSyobocalTidWithFallback(parsedTitle.titleName);
                    }
                }

                if (needsCheckStatus || !isMtimeUnchanged) {
                    playlistStatus = await checkPlaylistStatus(seriesInfo.folderPath, lines);
                }

                resultItem = {
                    id: `${seriesInfo.folderPath}__${filePath}`,
                    folderPath: seriesInfo.folderPath,
                    filePath,
                    folderMtime: seriesInfo.folderMtime,
                    fileMtime,
                    tid,
                    category, 
                    seriesKana: seriesInfo.seriesKana,
                    seriesPeriod: seriesInfo.seriesPeriod,
                    seriesRating: seriesInfo.seriesRating,
                    seriesName, 
                    genre,
                    titleKana: parsedTitle.titleKana,
                    titleDate: parsedTitle.titleDate,
                    titleRating: parsedTitle.titleRating,
                    titleName: parsedTitle.titleName,
                    episodeCount,
                    playlistStatus,
                    isSave: cachedItem ? cachedItem.isSave : false
                };
            }

            results.push(resultItem);
            event.sender.send('scan:item', resultItem);
        }
        return results;
    } catch (error) {
        if (error.message === 'Canceled') {
            console.log('Sync/Scan canceled by user.');
            return { canceled: true };
        }
        console.error('Sync/Scan error:', error);
        throw error;
    } finally {
        if (currentCancelToken === cancelToken) {
            currentCancelToken = null;
        }
    }
});

// キャンセル受信用IPCハンドラーの追加
ipcMain.handle('scan:cancel', () => {
    if (currentCancelToken) {
        currentCancelToken.canceled = true;
    }
});

// AniList API からジャンルを取得し日本語に変換（リトライ・ルール適用版）
async function fetchAniListData(query) {
    if (!query) return '-';

    // 1. 同一条件（同じ検索クエリ）ですでに成功した結果があればそれを利用
    if (aniListCache.has(query)) {
        return aniListCache.get(query);
    }

    const graphqlQuery = `
        query ($search: String) {
            Media (search: $search, type: ANIME) {
                genres
            }
        }
    `;

    const maxRetries = 5;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            await throttleApiCall();

            const response = await fetch('https://graphql.anilist.co', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
                body: JSON.stringify({
                    query: graphqlQuery,
                    variables: { search: query }
                })
            });

            // 429 エラー (Rate Limit) の場合
            if (response.status === 429) {
                if (attempt < maxRetries) {
                    console.warn(`AniList API Error: HTTP ${response.status} (attempt ${attempt}/${maxRetries}). Waiting 30s...`);
                    await delay(30000);
                    continue;
                } else {
                    console.error(`AniList API Error: HTTP ${response.status} ${query}`);
                    break;
                }
            }

            // 429 以外のエラーレスポンスの場合、リトライせずに終了
            if (!response.ok) {
                console.warn(`AniList API Error: HTTP ${response.status} ${query}`);
                return '-';
            }

            const result = await response.json();
            const media = result?.data?.Media;

            if (media && media.genres && media.genres.length > 0) {
                const translatedGenres = media.genres.map(g => GENRE_MAP[g] || g);
                const genres = translatedGenres.join(', ');
                aniListCache.set(query, genres); // キャッシュに保存
                return genres;
            } else {
                // 結果が見つからない場合もキャッシュして無駄な再リクエストを防ぐ
                aniListCache.set(query, '-');
                return '-';
            }
        } catch (e) {
            console.error('AniList API network error:', e);
            if (attempt === maxRetries) break;
            await delay(3000);
        }
    }

    return '-';
}

// しょぼいカレンダーAPIからTIDを取得（リトライ・ルール適用版）
async function fetchSyobocalTid(title) {
    if (!title) return '-';

    // 1. 同一条件のキャッシュがあれば利用
    if (syobocalCache.has(title)) {
        return syobocalCache.get(title);
    }

    const url = `https://cal.syoboi.jp/json.php?Req=TitleSearch&Search=${encodeURIComponent(title)}`;
    const maxRetries = 5;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            await throttleApiCall();

            const response = await fetch(url);

            // 429 エラー (Rate Limit) の場合
            if (response.status === 429) {
                if (attempt < maxRetries) {
                    console.warn(`Syobocal API Error: HTTP ${response.status} (attempt ${attempt}/${maxRetries}). Waiting 30s...`);
                    await delay(30000);
                    continue;
                } else {
                    console.error(`Syobocal API Error: HTTP ${response.status} ${title}`);
                    break;
                }
            }

            // 429 以外のエラーレスポンスの場合、リトライせずに終了
            if (!response.ok) {
                console.warn(`Syobocal API Error: HTTP ${response.status} ${title}`);
                return '-';
            }

            const data = await response.json();
            if (data.Titles) {
                const keys = Object.keys(data.Titles);
                if (keys.length > 0) {
                    const tid = keys[0];
                    syobocalCache.set(title, tid); // キャッシュに保存
                    return tid;
                }
            }

            syobocalCache.set(title, '-');
            return '-';
        } catch (e) {
            console.error('Syobocal API network error:', e);
            if (attempt === maxRetries) break;
            await delay(3000);
        }
    }

    return '-';
}

// プレイリスト統合保存 IPC ハンドラー
ipcMain.handle('save-playlist', async (event, items) => {
    try {
        const saveTargets = items.filter(item => item.isSave);
        if (saveTargets.length === 0) {
            return { success: false, message: '保存対象が選択されていません。' };
        }

        const window = BrowserWindow.getFocusedWindow();
        const { canceled, filePath } = await dialog.showSaveDialog(window, {
            title: 'プレイリストファイルを保存',
            defaultPath: 'xSearch.amppl',
            filters: [
                { name: 'AudioMotion Playlist', extensions: ['amppl'] },
                { name: 'すべてのファイル', extensions: ['*'] }
            ]
        });

        if (canceled || !filePath) {
            return { success: false, canceled: true };
        }

        let combinedLines = [];
        for (const item of saveTargets) {
            const ampplFilePath = item.filePath || item.ampplPath;
            if (ampplFilePath) {
                try {
                    const content = await fs.readFile(ampplFilePath, 'utf-8');
                    const lines = content.split(/\r?\n/).filter(line => line.trim() !== '');
                    combinedLines.push(...lines);
                } catch (readErr) {
                    console.error(`ファイル読み込みエラー: ${ampplFilePath}`, readErr);
                }
            }
        }

        combinedLines = [...new Set(combinedLines)];

        const playlistContent = combinedLines.join('\n');
        await fs.writeFile(filePath, playlistContent, 'utf-8');

        return { success: true, filePath };
    } catch (error) {
        console.error('プレイリスト保存エラー:', error);
        return { success: false, message: error.message };
    }
});

// 設定のエクスポート処理
ipcMain.handle('export-settings', async (event, settingsData) => {
    // 現在日時を YYYYMMDDHHmmss 形式で生成
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    const timestamp = `${year}${month}${day}${hours}${minutes}${seconds}`;

    const defaultFileName = `xSearchSettings_${timestamp}.xsj`;

    const { filePath, canceled } = await dialog.showSaveDialog({
        title: '設定のエクスポート',
        defaultPath: defaultFileName,
        filters: [
            { name: 'Setting Files (*.xsj; *.json)', extensions: ['xsj', 'json'] },
            { name: 'All Files (*.*)', extensions: ['*'] }
        ]
    });

    if (canceled || !filePath) {
        return { success: false, canceled: true };
    }

    try {
        await fs.writeFile(filePath, JSON.stringify(settingsData, null, 4), 'utf-8');
        return { success: true, filePath };
    } catch (error) {
        console.error('Export error:', error);
        return { success: false, error: error.message };
    }
});

// 設定のインポート処理
ipcMain.handle('import-settings', async () => {
    const { filePaths, canceled } = await dialog.showOpenDialog({
        title: '設定のインポート',
        filters: [
            { name: 'Setting Files (*.xsj; *.json)', extensions: ['xsj', 'json'] },
            { name: 'All Files (*.*)', extensions: ['*'] }
        ],
        properties: ['openFile']
    });

    if (canceled || filePaths.length === 0) {
        return { success: false, canceled: true };
    }

    try {
        const fileContent = await fs.readFile(filePaths[0], 'utf-8');
        const settingsData = JSON.parse(fileContent);
        return { success: true, data: settingsData };
    } catch (error) {
        console.error('Import error:', error);
        return { success: false, error: error.message };
    }
});

// 1. プレイヤーアプリ設定用のファイル選択ダイアログ
ipcMain.handle('dialog:selectPlayerApp', async () => {
    const result = await dialog.showOpenDialog({
        title: 'プレイヤーアプリの選択',
        properties: ['openFile'],
        filters: [
            { name: 'Executables', extensions: ['exe', 'app', 'bat', 'sh'] },
            { name: 'All Files', extensions: ['*'] }
        ]
    });

    if (result.canceled || result.filePaths.length === 0) {
        return null;
    }
    return result.filePaths[0];
});

// 2. 外部URLを開く処理（しょぼいカレンダー用：既定のブラウザ、またはChrome/Edge指定起動）
ipcMain.handle('shell:openExternalUrl', async (event, url) => {
    // 単純にデフォルトブラウザで開く場合
    await shell.openExternal(url);
    
    // ※もし「Chrome または Edge で強制的にポップアップ表示」を厳密に行いたい場合は、
    //   インストールパスを指定して spawn で起動するカスタム処理に書き換えることも可能です。
});

// 3. プレイヤーアプリの実行処理
ipcMain.handle('app:launchPlayer', async (event, { appPath, targetPath }) => {
    try {
        // 1. プレイヤーアプリ（exe等）の存在確認
        try {
            await fs.access(appPath);
        } catch {
            return { success: false, error: `プレイヤーアプリが見つかりません: ${appPath}` };
        }

        // 2. 引数パスのプレイリストファイルの存在確認
        try {
            await fs.access(targetPath);
        } catch {
            return { success: false, error: `プレイリストファイルが存在しません: ${targetPath}` };
        }

        // 3. プレイリストが存在する場合に外部プロセスを起動
        const targetDir = path.dirname(targetPath);
        const child = spawn(appPath, [targetPath], {
            cwd: targetDir, // 念のためプレイリストのフォルダを作業ディレクトリに指定
            detached: true,
            stdio: 'ignore'
        });
        
        child.unref();
        return { success: true };
    } catch (error) {
        console.error('Failed to launch player app:', error);
        return { success: false, error: error.message };
    }
});
