// -- main.js ----------------------------------------------------------
// copyright = 'Copyright © 2026- @x-builder, Japan';
// email     = 'x-builder@gmail.com';
// appName   = 'xSearch -プレイリスト検索-';
// version   = 'Ver1.23.0';
// ---------------------------------------------------------------------
const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs').promises;
const { spawn } = require('child_process');
const Store = require('electron-store');

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

const MIN_API_INTERVAL = 2000;          // 最低2sの間隔を空けてサーバー負荷を抑制
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
const aniListCache = new Map();         // リクエスト結果のキャッシュ：key: seriesName, value: genre
const syobocalCache = new Map();        // リクエスト結果のキャッシュ：key: titleName, value: tid
const store = new Store();              // main.js版localStorage

let currentCancelToken = null;          // キャンセル状態を管理するマップまたは変数
let lastApiCallTime = 0;                // レートリミット管理用変数
let isAniListRateLimited = false;       // AniListAPIアクセス制限フラグ
let isSyobocalRateLimited = false;      // しょぼいカレンダーAPIアクセス制限フラグ
let isSyobocalStoreLoaded = false;      // しょぼいカレンダーAPI メモリキャッシュロードフラグ
let isAniListStoreLoaded = false;       // AniListAPI メモリキャッシュロードフラグ

async function throttleApiCall(apiName = 'API') {
    const now = Date.now();
    const elapsed = now - lastApiCallTime;
    if (elapsed < MIN_API_INTERVAL) {
        const waitTime = MIN_API_INTERVAL - elapsed;
        await delay(waitTime);
    }
    lastApiCallTime = Date.now();
}

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
        console.error('【エラー】レンダラー処理クラッシュ（ホワイトアウト）:', details);
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

// AniListデータ取得（アンマッチ時に「劇場版」「映画」を除外して再リクエスト＋制限・キャッシュ対応版）
async function fetchAniListWithFallback(name, event, cachedGenre) {
    if (isAniListRateLimited) {
        return cachedGenre || '-';
    }

    let genre = await fetchAniListData(name, event, cachedGenre);
    
    if (isAniListRateLimited) {
        return cachedGenre || '-';
    }

    if ((!genre || genre === '-') && (name.includes('劇場版') || name.includes('映画'))) {
        const cleanedName = name.replace(/劇場版|映画/g, '').trim();
        if (cleanedName && cleanedName !== name) {
            genre = await fetchAniListData(cleanedName, event, cachedGenre);
        }
    }
    return genre;
}

// 共通のしょぼいカレンダーAPI検索実行関数（スペース分割・リトライ・スロットリングを維持）
async function requestSyobocalTitleSearch(queryName, event, cachedTid) {
    if (!queryName || isSyobocalRateLimited) return null;

    const keywords = queryName.trim().split(/[ \u3000]+/).filter(Boolean);
    if (keywords.length === 0) return null;

    const searchQueries = [queryName.trim()];
    if (keywords.length > 1) {
        searchQueries.push(keywords[0]);
    }

    const maxRetries = 5;

    for (const searchQuery of searchQueries) {
        const encodedSearch = encodeURIComponent(searchQuery);
        const url = `https://cal.syoboi.jp/json.php?Req=TitleSearch&Search=${encodedSearch}`;

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                await throttleApiCall('Syobocal');

                const response = await fetch(url, {
                    headers: {
                        'User-Agent': 'xSearchApp/1.0 (DesktopApp)'
                    }
                });

                // ★ 530 エラーの場合の制限中処理
                if (response.status === 530) {
                    if (!isSyobocalRateLimited) {
                        isSyobocalRateLimited = true;
                        event.sender.send('scan:toast', { message: 'しょぼいカレンダーAPI制限中', type: 'error' });
                        console.warn('【警告】SyoboiAPI： 530エラー検知のため制限フラグを設定。');
                    }
                    return null;
                }

                if (response.status === 429) {
                    if (attempt < maxRetries) {
                        await delay(30000);
                        continue;
                    } else {
                        break;
                    }
                }

                if (!response.ok) {
                    break;
                }

                const data = await response.json();
                if (data && data.Titles && Object.keys(data.Titles).length > 0) {
                    return data.Titles;
                }
                break;
            } catch (error) {
                if (attempt === maxRetries) break;
                await delay(3000);
            }
        }
    }
    return null;
}

// しょぼいカレンダーからTIDを取得する内部関数
async function fetchSyobocalTid(seriesName, titleName, event, cachedTid) {
    if (isSyobocalRateLimited) {
        return cachedTid || '-';
    }

    const effectiveTitleName = titleName || seriesName;
    if (!effectiveTitleName) return cachedTid || '-';

    const normalizedTargetTitle = normalizeString(effectiveTitleName);
    const storedSyobocalData = store.get('syoboiAPI_data') || {};
    const titlesMap = storedSyobocalData.titles || {};

    if (!isSyobocalStoreLoaded) {
        for (const tid in titlesMap) {
            const item = titlesMap[tid];
            if (item.Title) {
                syobocalCache.set(normalizeString(item.Title), tid);
            }
            if (item.ShortTitle) {
                syobocalCache.set(normalizeString(item.ShortTitle), tid);
            }
        }
        isSyobocalStoreLoaded = true;
    }

    // 1. 【高速化】メモリ上のキャッシュ（syobocalCache）から一発検索（TIDが "-" 以外の場合のみ返却）
    if (syobocalCache.has(normalizedTargetTitle)) {
        const matchedTid = syobocalCache.get(normalizedTargetTitle);
        if (matchedTid && matchedTid !== '-') {
            return matchedTid;
        }
    }

    // 2. ストア（キャッシュ）に存在しない（または "-" の）場合はAPIへリクエスト
    const titles = await requestSyobocalTitleSearch(effectiveTitleName, event, cachedTid);
    if (isSyobocalRateLimited) return cachedTid || '-';

    if (titles) {
        let foundTid = null;

        // 3. 返却データを electron-store へ保存 / マージ（既存のTIDは更新、存在しないものは追加）
        const updatedTitlesMap = { ...titlesMap };
        for (const tid in titles) {
            updatedTitlesMap[tid] = {
                ...(updatedTitlesMap[tid] || {}),
                ...titles[tid]
            };
        }

        store.set('syoboiAPI_data', {
            ...storedSyobocalData,
            titles: updatedTitlesMap
        });

        // 4. 新規取得データをメモリキャッシュおよびストアに反映
        for (const tid in titles) {
            const item = titles[tid];
            const normTitle = item.Title ? normalizeString(item.Title) : '';
            const normShort = item.ShortTitle ? normalizeString(item.ShortTitle) : '';

            if (normTitle === normalizedTargetTitle || normShort === normalizedTargetTitle) {
                if (!foundTid) foundTid = tid;
            }

            if (item.Title) syobocalCache.set(normTitle, tid);
            if (item.ShortTitle) syobocalCache.set(normShort, tid);
        }

        if (foundTid) {
            return foundTid;
        }
    }

    // 5. 存在しない場合は TID に "-" を設定し、検索できなかった結果もキャッシュに "-" として登録
    syobocalCache.set(normalizedTargetTitle, '-');

    const fallbackTid = cachedTid || '-';
    return fallbackTid;
}

// プレイリスト内のパスを検証して状態を判定するヘルパー関数
async function checkPlaylistStatus(folderPath, lines) {
    if (lines.length === 0) {
        return 'BLANK';
    }

    const seenPaths = new Set();
    let hasOverlap = false;
    const targetPaths = [];

    // パスの解決と重複チェック用のリスト作成
    for (const line of lines) {
        const rawPath = line.trim();
        if (!rawPath) continue; // 空行があればスキップ

        // 絶対パスでなければフォルダからの相対パスとして解決
        const targetPath = path.isAbsolute(rawPath) ? rawPath : path.resolve(folderPath, rawPath);

        // 重複チェック
        if (seenPaths.has(targetPath)) {
            hasOverlap = true;
        } else {
            seenPaths.add(targetPath);
        }
        targetPaths.push(targetPath);
    }

    try {
        // すべてのファイルの存在確認
        for (const targetPath of targetPaths) {
            await fs.access(targetPath);
        }
    } catch (e) {
        return 'NG'; // ファイルが存在しない場合は NG を優先
    }

    // 重複がある場合は OVERLAP を返す
    if (hasOverlap) {
        return 'OVERLAP';
    }

    return 'OK';
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
        console.error('【エラー】プレイリストファイル読込に失敗:', currentDir, e);
    }
    return playlists;
}

// しょぼカレンダーTID取得（アンマッチ時に「劇場版」「映画」を除外して再リクエスト）
async function fetchSyobocalTidWithFallback(seriesName, titleName, event, cachedTid) {
    if (isSyobocalRateLimited) return cachedTid || '-';

    let tid = await fetchSyobocalTid(seriesName, titleName, event, cachedTid);
    if (isSyobocalRateLimited) return cachedTid || '-';

    if ((!tid || tid === '-') && (titleName.includes('劇場版') || titleName.includes('映画'))) {
        const cleanedName = titleName.replace(/劇場版|映画/g, '').trim();
        if (cleanedName && cleanedName !== titleName) {
            tid = await fetchSyobocalTid(seriesName, cleanedName, event, cachedTid);
        }
    }
    return tid;
}

// 高速再検索 / 同期（初回スキャン兼用版）
ipcMain.handle('fast:syncDirectory', async (event, rootDir, existingItems = []) => {
    const cancelToken = { canceled: false };
    currentCancelToken = cancelToken;

    // ★ 検索・再検索実行時にフラグをfalseでクリア
    isAniListRateLimited = false;
    isSyobocalRateLimited = false;

    try {
        const existingMap = new Map();
        if (Array.isArray(existingItems)) {
            existingItems.forEach(item => {
                existingMap.set(item.filePath, item);
            });

            // existingItemsが存在する場合、electron-storeにTID, Title、および「ジャンル」を登録
            try {
                const titlesMap = {};
                const genresMap = {};
                
                existingItems.forEach(item => {
                    if (item.tid && item.tid !== '-' && item.titleName) {
                        titlesMap[item.tid] = {
                            Title: item.titleName
                        };
                    }
                    if (item.seriesName && item.genre && item.genre !== '-') {
                        genresMap[item.seriesName] = item.genre;
                    }
                });
            
                const storedSyobocalData = store.get('syoboiAPI_data') || {};
                const storedAniListData = store.get('anilistAPI_data') || {};

                const existingTitles = storedSyobocalData.titles || {};
                const existingGenres = storedAniListData.genres || {};

                const mergedTitles = { ...existingTitles, ...titlesMap };
                const mergedGenres = { ...existingGenres, ...genresMap };

                const titlesCount = Object.keys(titlesMap).length;
                const genresCount = Object.keys(genresMap).length;

                if (titlesCount > 0) {
                    store.set('syoboiAPI_data', {
                        ...storedSyobocalData,
                        titles: mergedTitles
                    });
                }

                if (genresCount > 0) {
                    store.set('anilistAPI_data', {
                        ...storedAniListData,
                        genres: mergedGenres
                    });
                }
            } catch (e) {
                console.error('【エラー】electron-storeの登録に失敗:', e);
            }
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
                cleaned = cleaned.replace(/^[ぁ-んァ-ン]_/, '');            // 50音＋ "_"
                cleaned = cleaned.replace(/^[\d\s～〜年月日]+_/, '');        // 放映期間＋ "_"
                cleaned = cleaned.replace(/^[★☆]+_/, '');                  // 評価＋ "_"
                return cleaned;
            };

            // --- 「分類」および「シリーズ情報」の算出ロジック ---
            const relativePath = path.relative(rootDir, seriesInfo.folderPath);
            const pathSegments = relativePath.split(path.sep).filter(Boolean);
            
            let category;
            let rawFolderName;

            if (pathSegments.length === 0) {
                const rootFolderName = path.basename(rootDir);
                category = removePrefix(rootFolderName);
                rawFolderName = rootFolderName;
            } else {
                category = pathSegments[0];
                rawFolderName = path.basename(seriesInfo.folderPath);
            }

            let seriesName = removePrefix(rawFolderName);

            let genre = cachedItem ? cachedItem.genre : null;
            let tid = cachedItem ? cachedItem.tid : null;
            let playlistStatus = cachedItem ? cachedItem.playlistStatus : null;

            const isMtimeUnchanged = cachedItem && 
                                     cachedItem.folderMtime === seriesInfo.folderMtime && 
                                     cachedItem.fileMtime === fileMtime &&
                                     cachedItem.category === category &&
                                     cachedItem.seriesName === seriesName;

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
                        // ★ AniList制限中の判定：制限中ならキャッシュのジャンル、または '-' を返却
                        if (isAniListRateLimited) {
                            genre = cachedItem ? cachedItem.genre : '-';
                        } else {
                            genre = await fetchAniListWithFallback(seriesName, event, cachedItem ? cachedItem.genre : '-');
                        }
                    }
                    if (needsFetchTid) {
                        // ★ しょぼいカレンダー制限中の判定：制限中ならキャッシュのTID、または '-' を返却
                        if (isSyobocalRateLimited) {
                            tid = cachedItem ? cachedItem.tid : '-';
                        } else {
                            tid = await fetchSyobocalTidWithFallback(seriesName, parsedTitle.titleName, event, cachedItem ? cachedItem.tid : '-');
                        }
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
            console.log('【情報】ユーザーによるキャンセル。');
            return { canceled: true };
        }
        console.error('【エラー】検索・再建策に失敗:', error);
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
async function fetchAniListData(query, event, cachedGenre) {
    if (!query || isAniListRateLimited) return cachedGenre || '-';

    // electron-store からジャンルマップを取得
    const storedAniListData = store.get('anilistAPI_data') || {};
    const genresMap = storedAniListData.genres || {};

    if (!isAniListStoreLoaded) {
        for (const titleKey in genresMap) {
            aniListCache.set(titleKey, genresMap[titleKey]);
        }
        isAniListStoreLoaded = true;
    }

    // 1. 【高速化】メモリキャッシュ（aniListCache）から検索（'-' 以外の場合のみ返却）
    if (aniListCache.has(query)) {
        const matchedGenre = aniListCache.get(query);
        if (matchedGenre && matchedGenre !== '-') {
            return matchedGenre;
        }
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
            await throttleApiCall('AniList');

            const response = await fetch('https://graphql.anilist.co', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'User-Agent': 'xSearchApp/1.0 (DesktopApp)'
                },
                body: JSON.stringify({
                    query: graphqlQuery,
                    variables: { search: query }
                })
            });

            if (response.status === 403) {
                if (!isAniListRateLimited) {
                    isAniListRateLimited = true;
                    event.sender.send('scan:toast', { message: 'AniListAPI制限中', type: 'error' });
                    console.warn('【警告】AniListAPI： 403エラー検知のため制限フラグを設定。');
                }
                aniListCache.set(query, cachedGenre || '-');
                return cachedGenre || '-';
            }

            if (response.status === 429) {
                if (attempt < maxRetries) {
                    await delay(30000);
                    continue;
                } else {
                    break;
                }
            }

            if (!response.ok) {
                aniListCache.set(query, cachedGenre || '-');
                return cachedGenre || '-';
            }

            const result = await response.json();
            const media = result?.data?.Media;

            let resolvedGenre = '-';
            if (media && media.genres && media.genres.length > 0) {
                const translatedGenres = media.genres.map(g => GENRE_MAP[g] || g);
                resolvedGenre = translatedGenres.join(', ');
            }

            // 2. メモリキャッシュおよび electron-store へ保存・更新
            aniListCache.set(query, resolvedGenre);
            
            const updatedGenresMap = { ...genresMap, [query]: resolvedGenre };
            store.set('anilistAPI_data', {
                ...storedAniListData,
                genres: updatedGenresMap
            });

            return resolvedGenre;
        } catch (e) {
            if (attempt === maxRetries) break;
            await delay(3000);
        }
    }

    aniListCache.set(query, '-');
    return cachedGenre || '-';
}

// 表記揺れ（全角半角・大文字小文字・スペース等）を吸収するための正規化関数
function normalizeString(str) {
    if (!str) return '';
    return str
        .toLowerCase()
        .replace(/[\s\u3000]+/g, '') // スペース全削除
        .replace(/[!-~]/g, s => String.fromCharCode(s.charCodeAt(0) + 0xFEE0)); // 半角英数を全角化して判定統一
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
                    console.error(`【エラー】ファイル読込に失敗: ${ampplFilePath}`, readErr);
                }
            }
        }

        combinedLines = [...new Set(combinedLines)];

        const playlistContent = combinedLines.join('\n');
        await fs.writeFile(filePath, playlistContent, 'utf-8');

        return { success: true, filePath };
    } catch (error) {
        console.error('【エラー】プレイリスト保存に失敗:', error);
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
        console.error('【エラー】設定エクスポートに失敗:', error);
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
        console.error('【エラー】設定インポートに失敗:', error);
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
        console.error('【エラー】プレイヤーアプリ起動に失敗:', error);
        return { success: false, error: error.message };
    }
});

// エクスプローラでファイル/フォルダを表示する処理
ipcMain.handle('app:showInFolder', async (event, targetPath) => {
    try {
        // 対象のパスが存在するか確認
        await fs.access(targetPath);
        // エクスプローラでファイルを選択した状態で表示
        shell.showItemInFolder(targetPath);
        return { success: true };
    } catch (error) {
        return { success: false, error: `パスが見つかりません: ${targetPath}` };
    }
});
