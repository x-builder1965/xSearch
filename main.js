// -- main.js ----------------------------------------------------------
// copyright = 'Copyright © 2026- @x-builder, Japan';
// email     = 'x-builder@gmail.com';
// appName   = 'xSearch -プレイリスト検索-';
// version   = 'Ver1.03.0';
// ---------------------------------------------------------------------
const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs').promises;

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

// --- レートリミット管理用変数 ---
let lastApiCallTime = 0;
const MIN_API_INTERVAL = 500; // 最低500msの間隔を空けてサーバー負荷を抑制
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

// 再帰的にフォルダをスキャンし、データを構築する
ipcMain.handle('scan:directory', async (event, rootDir) => {
    try {
        const results = [];
        const entries = await fs.readdir(rootDir, { withFileTypes: true });
        
        const dirEntries = entries.filter(e => e.isDirectory());
        let currentFolderIndex = 0;
        const totalFolders = dirEntries.length;

        for (const entry of dirEntries) {
            currentFolderIndex++;
            const folderName = entry.name;
            const folderPath = path.join(rootDir, folderName);
            
            event.sender.send('scan:progress', {
                current: currentFolderIndex,
                total: totalFolders,
                message: `(${currentFolderIndex}/${totalFolders}) ${folderName}`
            });

            let folderStat;
            try {
                folderStat = await fs.stat(folderPath);
            } catch (e) {
                continue;
            }
            const folderMtime = folderStat.mtimeMs;

            const fParts = folderName.split('_');
            const seriesKana = fParts[0] || '';
            const seriesPeriod = fParts[1] || '';
            const seriesRating = fParts[2] || '';
            const seriesName = fParts[3] || folderName;

            const genre = await fetchAniListData(seriesName);

            const subEntries = await fs.readdir(folderPath, { withFileTypes: true });
            for (const subEntry of subEntries) {
                if (!subEntry.isFile() || !subEntry.name.endsWith('.amppl')) continue;

                const fileName = subEntry.name;
                const filePath = path.join(folderPath, fileName);
                
                let fileStat;
                try {
                    fileStat = await fs.stat(filePath);
                } catch (e) {
                    continue;
                }
                const fileMtime = fileStat.mtimeMs;

                const baseFileName = path.basename(fileName, '.amppl');
                const tParts = baseFileName.split('_');
                const titleKana = tParts[0] || '';
                const titleDate = tParts[1] || '';
                const titleRating = tParts[2] || '';
                const titleName = tParts[3] || baseFileName;

                const ampplContent = await fs.readFile(filePath, 'utf-8');
                const lines = ampplContent.split(/\r?\n/).filter(line => line.trim() !== '');
                const episodeCount = lines.length;

                const tid = await fetchSyobocalTid(titleName);

                results.push({
                    id: `${folderPath}__${filePath}`,
                    folderPath,
                    filePath,
                    folderMtime,
                    fileMtime,
                    tid,
                    seriesKana,
                    seriesPeriod,
                    seriesRating,
                    seriesName,
                    genre,
                    titleKana,
                    titleDate,
                    titleRating,
                    titleName,
                    episodeCount
                });
            }
        }
        return results;
    } catch (error) {
        console.error('Scan error:', error);
        throw error;
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

// 高速再検索（追加・変更・削除の同期）
ipcMain.handle('fast:syncDirectory', async (event, rootDir, existingItems) => {
    try {
        const existingMap = new Map();
        existingItems.forEach(item => {
            existingMap.set(item.filePath, item);
        });

        const results = [];
        const entries = await fs.readdir(rootDir, { withFileTypes: true });
        const dirEntries = entries.filter(e => e.isDirectory());
        
        let currentFolderIndex = 0;
        const totalFolders = dirEntries.length;

        for (const entry of dirEntries) {
            currentFolderIndex++;
            const folderName = entry.name;
            const folderPath = path.join(rootDir, folderName);

            event.sender.send('scan:progress', {
                current: currentFolderIndex,
                total: totalFolders,
                message: `(${currentFolderIndex}/${totalFolders}) ${folderName}`
            });

            let folderStat;
            try {
                folderStat = await fs.stat(folderPath);
            } catch (e) {
                continue;
            }
            const folderMtime = folderStat.mtimeMs;

            const fParts = folderName.split('_');
            const seriesKana = fParts[0] || '';
            const seriesPeriod = fParts[1] || '';
            const seriesRating = fParts[2] || '';
            const seriesName = fParts[3] || folderName;

            let subEntries;
            try {
                subEntries = await fs.readdir(folderPath, { withFileTypes: true });
            } catch (e) {
                continue;
            }

            for (const subEntry of subEntries) {
                if (!subEntry.isFile() || !subEntry.name.endsWith('.amppl')) continue;

                const fileName = subEntry.name;
                const filePath = path.join(folderPath, fileName);

                let fileStat;
                try {
                    fileStat = await fs.stat(filePath);
                } catch (e) {
                    continue;
                }
                const fileMtime = fileStat.mtimeMs;

                const cachedItem = existingMap.get(filePath);

                const baseFileName = path.basename(fileName, '.amppl');
                const tParts = baseFileName.split('_');
                const titleKana = tParts[0] || '';
                const titleDate = tParts[1] || '';
                const titleRating = tParts[2] || '';
                const titleName = tParts[3] || baseFileName;

                const ampplContent = await fs.readFile(filePath, 'utf-8');
                const lines = ampplContent.split(/\r?\n/).filter(line => line.trim() !== '');
                const episodeCount = lines.length;

                // --- 変更点: 更新日時が同じでも、ジャンルまたはTIDが "-" であれば再取得対象とする ---
                let genre = cachedItem ? cachedItem.genre : null;
                let tid = cachedItem ? cachedItem.tid : null;

                const isMtimeUnchanged = cachedItem && 
                                         cachedItem.folderMtime === folderMtime && 
                                         cachedItem.fileMtime === fileMtime;

                const needsFetchGenre = !cachedItem || !genre || genre === '-';
                const needsFetchTid = !cachedItem || !tid || tid === '-';

                if (isMtimeUnchanged && !needsFetchGenre && !needsFetchTid) {
                    // 更新日時が変更されておらず、かつ値が正常に取得できている場合はキャッシュをそのまま流用
                    results.push(cachedItem);
                } else {
                    // 更新日時が変更されている、または前回値が "-" のため再取得が必要
                    if (needsFetchGenre) {
                        genre = await fetchAniListData(seriesName);
                    }
                    if (needsFetchTid) {
                        tid = await fetchSyobocalTid(titleName);
                    }

                    results.push({
                        id: `${folderPath}__${filePath}`,
                        folderPath,
                        filePath,
                        folderMtime,
                        fileMtime,
                        tid,
                        seriesKana,
                        seriesPeriod,
                        seriesRating,
                        seriesName,
                        genre,
                        titleKana,
                        titleDate,
                        titleRating,
                        titleName,
                        episodeCount,
                        isSave: cachedItem ? cachedItem.isSave : false
                    });
                }
            }
        }
        return results;
    } catch (error) {
        console.error('Fast sync error:', error);
        throw error;
    }
});

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
