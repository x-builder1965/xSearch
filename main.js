// -- main.js ----------------------------------------------------------
// copyright = 'Copyright © 2026- @x-builder, Japan';
// email     = 'x-builder@gmail.com';
// appName   = 'xSearch -プレイリスト検索-';
// version   = 'Ver1.01.0';
// ---------------------------------------------------------------------
const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs').promises;

// AniListの英語ジャンル名から日本語への対応辞書
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
        
        // フォルダのみを抽出
        const dirEntries = entries.filter(e => e.isDirectory());
        let currentFolderIndex = 0;
        const totalFolders = dirEntries.length;

        for (const entry of dirEntries) {
            currentFolderIndex++;
            const folderName = entry.name;
            const folderPath = path.join(rootDir, folderName);
            
            // レンダラーに進捗を通知
            event.sender.send('scan:progress', {
                current: currentFolderIndex,
                total: totalFolders,
                message: `(${currentFolderIndex}/${totalFolders}) ${folderName}`
            });

            const folderStat = await fs.stat(folderPath);
            const folderMtime = folderStat.mtimeMs;

            const fParts = folderName.split('_');
            const seriesKana = fParts[0] || '';
            const seriesPeriod = fParts[1] || '';
            const seriesRating = fParts[2] || '';
            const seriesName = fParts[3] || folderName;

            const aniListData = await fetchAniListData(seriesName);

            const subEntries = await fs.readdir(folderPath, { withFileTypes: true });
            for (const subEntry of subEntries) {
                if (!subEntry.isFile() || !subEntry.name.endsWith('.amppl')) continue;

                const fileName = subEntry.name;
                const filePath = path.join(folderPath, fileName);
                
                const fileStat = await fs.stat(filePath);
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
                    genre: aniListData.genre,
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

// AniList API からジャンルを取得し日本語に変換
async function fetchAniListData(query) {
    try {
        const graphqlQuery = `
            query ($search: String) {
                Media (search: $search, type: ANIME) {
                    genres
                }
            }
        `;

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

        if (!response.ok) return { genre: '-' };

        const result = await response.json();
        const media = result?.data?.Media;

        if (media && media.genres && media.genres.length > 0) {
            // 英語のジャンル名を日本語にマッピング（マッピングにない場合は元の英語名を使用）
            const translatedGenres = media.genres.map(g => GENRE_MAP[g] || g);
            const genres = translatedGenres.join(', ');
            return { genre: genres };
        }
    } catch (e) {
        console.error('AniList API error:', e);
    }
    return { genre: '-' };
}

// しょぼいカレンダーAPIからTIDを取得
async function fetchSyobocalTid(title) {
    try {
        const url = `https://cal.syoboi.jp/json.php?Req=TitleSearch&Search=${encodeURIComponent(title)}`;
        const response = await fetch(url);
        if (!response.ok) return '-';
        const data = await response.json();
        if (data.Titles) {
            const keys = Object.keys(data.Titles);
            if (keys.length > 0) {
                return keys[0]; // 最初に見つかったTID
            }
        }
    } catch (e) {
        console.error('Syobocal API error:', e);
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

                if (cachedItem && cachedItem.folderMtime === folderMtime && cachedItem.fileMtime === fileMtime) {
                    results.push(cachedItem);
                } else {
                    const baseFileName = path.basename(fileName, '.amppl');
                    const tParts = baseFileName.split('_');
                    const titleKana = tParts[0] || '';
                    const titleDate = tParts[1] || '';
                    const titleRating = tParts[2] || '';
                    const titleName = tParts[3] || baseFileName;

                    const ampplContent = await fs.readFile(filePath, 'utf-8');
                    const lines = ampplContent.split(/\r?\n/).filter(line => line.trim() !== '');
                    const episodeCount = lines.length;

                    let genre = cachedItem ? cachedItem.genre : null;
                    let tid = cachedItem ? cachedItem.tid : null;

                    if (!cachedItem || cachedItem.seriesName !== seriesName) {
                        const aniListData = await fetchAniListData(seriesName);
                        genre = aniListData.genre;
                    }

                    if (!cachedItem || cachedItem.titleName !== titleName) {
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
                        episodeCount
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
        // 保存対象が選択されているか確認
        const saveTargets = items.filter(item => item.isSave);
        if (saveTargets.length === 0) {
            return { success: false, message: '保存対象が選択されていません。' };
        }

        // 1. 名前を付けて保存ダイアログを表示
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

        // 2. チェック対象の各 .amppl ファイルから内容を読み込んで統合
        let combinedLines = [];
        for (const item of saveTargets) {
            // item.filePath または item.ampplPath など対象のファイルパスを指定
            const ampplFilePath = item.filePath || item.ampplPath;
            if (ampplFilePath) {
                try {
                    const content = await fs.readFile(ampplFilePath, 'utf-8');
                    // 改行で分割して空行を除外しながら追加
                    const lines = content.split(/\r?\n/).filter(line => line.trim() !== '');
                    combinedLines.push(...lines);
                } catch (readErr) {
                    console.error(`ファイル読み込みエラー: ${ampplFilePath}`, readErr);
                }
            }
        }

        // 重複行を除外する場合（必要に応じてコメント解除）
        combinedLines = [...new Set(combinedLines)];

        // 3. 統合したコンテンツを書き込み
        const playlistContent = combinedLines.join('\n');
        await fs.writeFile(filePath, playlistContent, 'utf-8');

        return { success: true, filePath };
    } catch (error) {
        console.error('プレイリスト保存エラー:', error);
        return { success: false, message: error.message };
    }
});
