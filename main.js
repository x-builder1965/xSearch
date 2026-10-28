// -- main.js ----------------------------------------------------------
// copyright = 'Copyright © 2026- @x-builder, Japan';
// email     = 'x-builder@gmail.com';
// appName   = 'xSearch -プレイリスト検索-';
// version   = 'Ver1.48.1';
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
const TAG_MAP = {
    "4-koma": "4コマ",
    "Achromatic": "モノクロ・無彩色",
    "Achronological Order": "時系列順不同",
    "Acrobatics": "アクロバット",
    "Acting": "演劇・演技",
    "Adoption": "養子・養親",
    "Advertisement": "広告",
    "Afterlife": "死後の世界・冥界",
    "Age Gap": "年の差",
    "Age Regression": "年齢退行・子供返り",
    "Agender": "エイジェンダー",
    "Agriculture": "農業",
    "Ahegao": "アヘ顔",
    "Airsoft": "サバイバルゲーム",
    "Alchemy": "錬金術",
    "Aliens": "宇宙人・エイリアン",
    "Alternate Universe": "平行世界・異世界",
    "American Football": "アメリカンフットボール",
    "Amnesia": "記憶喪失",
    "Amputation": "切断",
    "Anachronism": "時代錯誤",
    "Anal Sex": "アナルセックス",
    "Ancient China": "古代中国",
    "Angels": "天使",
    "Animals": "動物",
    "Anthology": "アンソロジー",
    "Anthropomorphism": "擬人化",
    "Anti-Hero": "アンチヒーロー",
    "Archery": "アーチェリー・弓道",
    "Armpits": "脇",
    "Aromantic": "アロマンティック",
    "Arranged Marriage": "政略結婚・お見合い",
    "Artificial Intelligence": "人工知能・AI",
    "Asexual": "アセクシャル",
    "Ashikoki": "足コキ",
    "Asphyxiation": "窒息",
    "Assassins": "暗殺者",
    "Astronomy": "天文学",
    "Athletics": "陸上競技",
    "Augmented Reality": "拡張現実・AR",
    "Autobiographical": "自伝的",
    "Aviation": "航空・飛行",
    "Badminton": "バドミントン",
    "Ballet": "バレエ",
    "Band": "バンド",
    "Bar": "バー",
    "Baseball": "野球",
    "Basketball": "バスケットボール",
    "Battle Royale": "バトルロイヤル",
    "Biographical": "伝記",
    "Bisexual": "バイセクシャル",
    "Blackmail": "脅迫",
    "Board Game": "ボードゲーム",
    "Boarding School": "全寮制学校",
    "Body Horror": "ボディホラー",
    "Body Image": "ボディイメージ・容姿",
    "Body Swapping": "身体入れ替わり",
    "Bondage": "拘束・ボンテージ",
    "Boobjob": "パイズリ",
    "Bowling": "ボウリング",
    "Boxing": "ボクシング",
    "Boys' Love": "ボーイズラブ・BL",
    "Brainwashing": "洗脳",
    "Bullying": "いじめ",
    "Butler": "執事",
    "Calligraphy": "書道",
    "Camping": "キャンプ",
    "Cannibalism": "人食い・カニバリズム",
    "Card Battle": "カードバトル",
    "Cars": "自動車",
    "Centaur": "ケンタウロス",
    "Cervix Penetration": "子宮口突き",
    "CGI": "CGI・3DCG",
    "Cheating": "浮気・不倫",
    "Cheerleading": "チアリーダー",
    "Chibi": "ちびキャラ",
    "Chimera": "キメラ",
    "Chuunibyou": "中二病",
    "Circus": "サーカス",
    "Class Struggle": "階級闘争",
    "Classic Literature": "古典文学",
    "Classical Music": "クラシック音楽",
    "Clone": "クローン",
    "Coastal": "沿岸・海岸",
    "Cohabitation": "同居",
    "College": "大学",
    "Coming of Age": "成長物語・青春",
    "Conspiracy": "陰謀",
    "Cosmic Horror": "コズミックホラー",
    "Cosplay": "コスプレ",
    "Cowboys": "カウボーイ",
    "Creature Taming": "魔物使い・モンスターテイマー",
    "Crime": "犯罪",
    "Criminal Organization": "犯罪組織",
    "Crossdressing": "男装・女装",
    "Crossover": "クロスオーバー",
    "Cult": "カルト",
    "Cultivation": "仙侠・修真",
    "Cumflation": "中出し妊娠膨張",
    "Cunnilingus": "クンニリングス",
    "Curses": "呪い",
    "Cute Boys Doing Cute Things": "可愛い男の子たちの日常",
    "Cute Girls Doing Cute Things": "日常系・可愛い女の子たち",
    "Cyberpunk": "サイバーパンク",
    "Cyborg": "サイボーグ",
    "Cycling": "サイクリング・自転車",
    "Dancing": "ダンス",
    "Death Game": "デスゲーム",
    "Deepthroat": "ディープスロート",
    "Defloration": "処女喪失",
    "Delinquents": "不良",
    "Demons": "悪魔",
    "Denpa": "電波系",
    "Desert": "砂漠",
    "Detective": "探偵",
    "DILF": "DILF（魅力的な中年男性）",
    "Dinosaurs": "恐竜",
    "Disability": "障害",
    "Dissociative Identities": "多重人格・解離性障害",
    "Double Penetration": "ダブルピストン・DP",
    "Dragons": "ドラゴン",
    "Drawing": "絵画・お絵描き",
    "Drugs": "薬物",
    "Dullahan": "デュラハン",
    "Dungeon": "ダンジョン",
    "Dystopian": "ディストピア",
    "E-Sports": "eスポーツ",
    "Eco-Horror": "エコホラー",
    "Economics": "経済",
    "Educational": "教育的",
    "Elderly Protagonist": "高齢の主人公",
    "Elf": "エルフ",
    "Ensemble Cast": "群像劇",
    "Environmental": "環境問題",
    "Episodic": "一話完結型・オムニバス",
    "Ero Guro": "エログロ",
    "Erotic Piercings": "エロティックピアス",
    "Espionage": "スパイ・諜報",
    "Estranged Family": "確執のある家族",
    "Exhibitionism": "露出症",
    "Exiled": "追放",
    "Exorcism": "悪魔払い・除霊",
    "Facial": "顔射",
    "Fairy": "妖精",
    "Fairy Tale": "おとぎ話",
    "Fake Relationship": "偽りの関係",
    "Family Life": "家族生活",
    "Fashion": "ファッション",
    "Feet": "足フェティシズム",
    "Fellatio": "フェラチオ",
    "Female Harem": "女性向けハーレム・逆ハーレム",
    "Female Protagonist": "女性主人公",
    "Femboy": "フェムボーイ・女装男子",
    "Femdom": "フェムドム・女王様",
    "Fencing": "フェンシング",
    "Filmmaking": "映画制作",
    "Fingering": "フィンガーリング",
    "Firefighters": "消防士",
    "Fishing": "釣り",
    "Fisting": "フィストファック",
    "Fitness": "フィットネス",
    "Flash": "フラッシュアニメ",
    "Flat Chest": "貧乳・絶壁",
    "Food": "料理・グルメ",
    "Football": "サッカー",
    "Foreign": "外国",
    "Found Family": "血縁を超えた家族・擬似家族",
    "Fugitive": "逃亡者",
    "Full CGI": "フルCGI・フル3DCG",
    "Full Color": "フルカラー",
    "Futanari": "ふたなり",
    "Gambling": "ギャンブル",
    "Gangs": "ギャング・暴走族",
    "Gekiga": "劇画",
    "Gender Bending": "性転換",
    "Ghost": "幽霊",
    "Go": "囲碁",
    "Goblin": "ゴブリン",
    "Gods": "神々",
    "Golf": "ゴルフ",
    "Gore": "グロテスク・流血",
    "Graduation Project": "卒業制作",
    "Group Sex": "乱交",
    "Guns": "銃器",
    "Gyaru": "ギャル",
    "Hair Pulling": "髪を引っ張る行為",
    "Handball": "ハンドボール",
    "Handjob": "手コキ",
    "Henshin": "変身",
    "Heterosexual": "異性愛",
    "Hikikomori": "引きこもり",
    "Hip-hop Music": "ヒップホップ",
    "Historical": "歴史・時代劇",
    "Homeless": "ホームレス",
    "Horticulture": "園芸・栽培",
    "Human Experimentation": "人体実験",
    "Human Pet": "人間ペット",
    "Hypersexuality": "過剰性欲",
    "Ice Sports": "アイススポーツ",
    "Idol": "アイドル",
    "Incest": "近親相姦",
    "Indigenous Cultures": "先住民族文化",
    "Inn": "旅館・宿屋",
    "Inseki": "いんせき・隕石",
    "Interspecies": "異種間恋愛",
    "Irrumatio": "イラマチオ",
    "Isekai": "異世界",
    "Iyashikei": "癒し系",
    "Jazz Music": "ジャズ",
    "Josei": "女性向け",
    "Judo": "柔道",
    "Kabuki": "歌舞伎",
    "Kaiju": "怪獣",
    "Karuta": "かるた",
    "Kemonomimi": "ケモノ耳",
    "Kids": "子供向け",
    "Kingdom Management": "国家運営",
    "Konbini": "コンビニ",
    "Kuudere": "クーデレ",
    "Lacrosse": "ラクロス",
    "Lactation": "母乳・搾乳",
    "Language Barrier": "言葉の壁",
    "Large Breasts": "巨乳",
    "LGBTQ+ Themes": "LGBTQ+テーマ",
    "Long Strip": "縦スクロールマンガ",
    "Lost Civilization": "失われた文明",
    "Love Triangle": "三角関係",
    "Mafia": "マフィア",
    "Magic": "魔法",
    "Mahjong": "麻雀",
    "Maids": "メイド",
    "Makeup": "メイクアップ",
    "Male Harem": "男性向けハーレム",
    "Male Pregnancy": "男の妊娠",
    "Male Protagonist": "男性主人公",
    "Manzai": "漫才",
    "Marriage": "結婚",
    "Martial Arts": "武術・格闘技",
    "Masochism": "マゾヒズム",
    "Masturbation": "マスターベーション",
    "Matchmaking": "お見合い・縁談",
    "Mating Press": "マッティングプレス",
    "Matriarchy": "母系社会",
    "Medicine": "医学・医療",
    "Medieval": "中世",
    "Memory Manipulation": "記憶操作",
    "Mermaid": "人魚",
    "Meta": "メタフィクション",
    "Metal Music": "ヘヴィメタル",
    "Middle East": "中東",
    "MILF": "MILF（魅力的な母親）",
    "Military": "ミリタリー・軍事",
    "Mixed Gender Harem": "男女混合ハーレム",
    "Mixed Media": "メディアミックス",
    "Modeling": "モデル",
    "Monster Boy": "モンスター少年",
    "Monster Girl": "モンスター娘",
    "Mopeds": "原付バイク",
    "Motorcycles": "バイク・オートバイ",
    "Mountaineering": "登山",
    "Musical Theater": "ミュージカル",
    "Mythology": "神話",
    "Nakadashi": "中出し",
    "Natural Disaster": "自然災害",
    "Necromancy": "死霊術・ネクロマンシー",
    "Nekomimi": "猫耳",
    "Netorare": "寝取られ・NTR",
    "Netorase": "寝取らせ",
    "Netori": "寝取り",
    "Ninja": "忍者",
    "No Dialogue": "セリフなし",
    "Noir": "フィルム・ノワール",
    "Non-fiction": "ノンフィクション",
    "Nudity": "ヌード・露出",
    "Nun": "修女・シスター",
    "Office": "オフィス・職場",
    "Office Lady": "OL（オフィスレディ）",
    "Oiran": "花魁",
    "Ojou-sama": "お嬢様",
    "Omegaverse": "オメガバース",
    "Orphan": "孤児",
    "Otaku Culture": "オタクカルチャー",
    "Outdoor Activities": "アウトドア活動",
    "Oyakodon": "親子丼（性的表現）",
    "Pandemic": "パンデミック",
    "Parenthood": "子育て・育児",
    "Parkour": "パルクール",
    "Parody": "パロディ",
    "Pet Play": "ペットプレイ",
    "Philosophy": "哲学",
    "Photography": "写真",
    "Pirates": "海賊",
    "Poker": "ポーカー",
    "Police": "警察",
    "Politics": "政治",
    "Polyamorous": "ポリアモリー",
    "Post-Apocalyptic": "終末世界・ポスト・アポカリプス",
    "POV": "一人称視点・POV",
    "Pregnancy": "妊娠",
    "Primarily Adult Cast": "成人メインの登場人物",
    "Primarily Animal Cast": "動物メインの登場人物",
    "Primarily Child Cast": "子供メインの登場人物",
    "Primarily Female Cast": "女性メインの登場人物",
    "Primarily Male Cast": "男性メインの登場人物",
    "Primarily Teen Cast": "十代メインの登場人物",
    "Prison": "刑務所・獄中",
    "Prophecy": "予言",
    "Prostitution": "売春",
    "Proxy Battle": "代理戦争",
    "Psychosexual": "心理性的",
    "Public Sex": "野外露出・公共の場の性行為",
    "Puppetry": "人形劇",
    "Rakugo": "落語",
    "Rape": "レイプ",
    "Real Robot": "リアルロボット",
    "Rehabilitation": "更生",
    "Reincarnation": "転生",
    "Religion": "宗教",
    "Rescue": "救助",
    "Restaurant": "飲食店・レストラン",
    "Revenge": "復讐",
    "Reverse Isekai": "逆異世界転移",
    "Rimjob": "アナル舐め・リムジョブ",
    "Robots": "ロボット",
    "Rock Music": "ロック音楽",
    "Rotoscoping": "ロトスコープ",
    "Royal Affairs": "王室・皇室のゴシップ",
    "Rugby": "ラグビー",
    "Rural": "田舎",
    "Sadism": "サディズム",
    "Samurai": "侍",
    "Satire": "風刺",
    "Scat": "スカトロジー",
    "School": "学校・学園",
    "School Club": "部活動",
    "Scissoring": "シザーリング",
    "Scuba Diving": "スキューバダイビング",
    "Seinen": "青年向け",
    "Sex Toys": "セックスおもちゃ",
    "Shapeshifting": "変身能力・シェイプシフト",
    "Shimaidon": "姉妹丼",
    "Ships": "船舶",
    "Shogi": "将棋",
    "Short-Form Chapter": "ショートチャプター",
    "Shoujo": "少女向け",
    "Shounen": "少年向け",
    "Shrine Maiden": "巫女",
    "Sixty-nine": "シックスティナイン",
    "Skateboarding": "スケートボード",
    "Skeleton": "スケルトン・骸骨",
    "Slapstick": "スラップスティック・ドタバタ",
    "Slavery": "奴隷制",
    "Snowscape": "雪景色",
    "Software Development": "ソフトウェア開発",
    "Space": "宇宙",
    "Space Opera": "スペースオペラ",
    "Spearplay": "槍術",
    "Squirting": "潮吹き",
    "Steampunk": "スチームパンク",
    "Stop Motion": "ストップモーション",
    "Strap-on": "張形・ストラップオン",
    "Succubus": "サキュバス",
    "Suicide": "自殺",
    "Sumata": "素股",
    "Sumo": "相撲",
    "Super Power": "超能力",
    "Super Robot": "スーパーロボット",
    "Superhero": "スーパーヒーロー",
    "Surfing": "サーフィン",
    "Surreal Comedy": "シュールギャグ・不条理コメディ",
    "Survival": "サバイバル",
    "Swapping": "スワッピング",
    "Sweat": "汗",
    "Swimming": "水泳",
    "Swordplay": "剣術",
    "Table Tennis": "卓球",
    "Tanks": "戦車",
    "Tanned Skin": "日焼け肌",
    "Teacher": "教師",
    "Teens' Love": "ティーンズラブ・TL",
    "Tennis": "テニス",
    "Tentacles": "触手",
    "Terrorism": "テロリズム",
    "Threesome": "スリーサム",
    "Time Loop": "タイムループ",
    "Time Manipulation": "時間操作",
    "Time Skip": "時間経過・タイムスキップ",
    "Tokusatsu": "特撮",
    "Tomboy": "ボーイッシュ・お転婆",
    "Torture": "拷問",
    "Tragedy": "悲劇",
    "Trains": "鉄道・電車",
    "Transgender": "トランスジェンダー",
    "Travel": "旅行",
    "Triads": "三合会・マフィア",
    "Tsundere": "ツンデレ",
    "Twins": "双子",
    "Unrequited Love": "片思い",
    "Urban": "都会・アーバン",
    "Urban Fantasy": "都市ファンタジー",
    "Vampire": "吸血鬼・ヴァンパイア",
    "Vertical Video": "縦型動画",
    "Veterinarian": "獣医師",
    "Video Games": "ビデオゲーム",
    "Vikings": "バイキング",
    "Villainess": "悪役令嬢",
    "Virginity": "処女・童貞",
    "Virtual World": "仮想世界",
    "Vocal Synth": "歌声合成ソフト・ボカロ",
    "Volleyball": "バレーボール",
    "Vore": "ヴォア",
    "Voyeur": "覗き見・ヴォワイアント",
    "VTuber": "VTuber",
    "War": "戦争",
    "Watersports": "ウォータースポーツ・聖水プレイ",
    "Werewolf": "人狼",
    "Wilderness": "大自然・荒野",
    "Witch": "魔女",
    "Work": "仕事・職場",
    "Wrestling": "プロレス・レスリング",
    "Writing": "執筆",
    "Wuxia": "武侠",
    "Yakuza": "ヤクザ・極道",
    "Yandere": "ヤンデレ",
    "Youkai": "妖怪",
    "Yuri": "百合",
    "Zombie": "ゾンビ",
    "Zoophilia": "動物性愛"
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

// 共通のしょぼいカレンダーAPI検索実行関数（警告・エラー判定のログ出力を追加）
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

                if (response.status === 530) {
                    if (!isSyobocalRateLimited) {
                        isSyobocalRateLimited = true;
                        event.sender.send('scan:toast', { message: 'しょぼいカレンダーAPI制限中', type: 'error' });
                        console.warn('【警告】SyoboiAPI： 530エラー検知のため制限フラグを設定');
                    }
                    return null;
                }

                if (response.status === 429) {
                    if (attempt < maxRetries) {
                        console.warn(`【警告】SyoboiAPI： 429エラー検知リトライ（${attempt}/${maxRetries}） URL: ${url}`);
                        await delay(30000);
                        continue;
                    } else {
                        console.warn(`【警告】SyoboiAPI： 429エラー検知オーバー（${attempt}/${maxRetries}） URL: ${url}`);
                        break;
                    }
                }

                if (!response.ok) {
                    console.warn(`【警告】SyoboiAPI： ${response.status}エラー検知 (${response.statusText}) URL: ${url}`);
                    break;
                }

                const data = await response.json();
                if (data && data.Titles && Object.keys(data.Titles).length > 0) {
                    return data.Titles;
                }
                break;
            } catch (error) {
                console.error(`【エラー】SyoboiAPI： リクエスト中に例外が発生（試行回数 ${attempt}/${maxRetries}）:`, error.message);
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
            console.log(`【情報】SyoboiAPI： ${effectiveTitleName} ${foundTid}`);
            return foundTid;
        }
    }

    // 5. 存在しない場合は TID に "-" を設定し、検索できなかった結果もキャッシュに "-" として登録
    syobocalCache.set(normalizedTargetTitle, '-');

    const fallbackTid = cachedTid || '-';
    console.log(`【情報】SyoboiAPI： ${effectiveTitleName} ${cachedTid || '-'}`);
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
                // ★ スキャン開始時に一度フラグをリセットしておく（前回の青表示を引き継がない場合）
                item.isUpdated = false;
                existingMap.set(item.filePath, item);
            });

            // --- ★「保存」がON設定のタイトルのキャッシュ削除ロジック ---
            try {
                const storedSyobocalData = store.get('syoboiAPI_data') || { titles: {} };
                const storedAniListData = store.get('anilistAPI_data') || { genres: {} };

                let isStoreUpdated = false;

                existingItems.forEach(item => {
                    if (item.isSave) {
                        // 保存がONのタイトルのキャッシュを削除
                        if (item.tid && storedSyobocalData.titles && storedSyobocalData.titles[item.tid]) {
                            delete storedSyobocalData.titles[item.tid];
                            isStoreUpdated = true;
                        }
                        if (item.seriesName && storedAniListData.genres && storedAniListData.genres[item.seriesName]) {
                            delete storedAniListData.genres[item.seriesName];
                            isStoreUpdated = true;
                        }
                        // メモリキャッシュ側もクリア
                        if (item.seriesName) {
                            aniListCache.delete(item.seriesName);
                        }
                        if (item.titleName) {
                            syobocalCache.delete(item.titleName);
                        }
                    }
                });

                if (isStoreUpdated) {
                    store.set('syoboiAPI_data', storedSyobocalData);
                    store.set('anilistAPI_data', storedAniListData);
                }
            } catch (e) {
                console.error('【エラー】強制検索用キャッシュ削除に失敗:', e);
            }

            // existingItemsが存在する場合、electron-storeにTID, Titleを登録（既存処理）
            try {
                const titlesMap = {};
                const genresMap = {};
                
                existingItems.forEach(item => {
                    if (item.tid && item.tid !== '-' && item.titleName && !item.isSave) {
                        titlesMap[item.tid] = {
                            Title: item.titleName
                        };
                    }
                    if (item.seriesName && item.genre && item.genre !== '-' && !item.isSave) {
                       genresMap[item.seriesName] = item.genre;
                    }
                });
            
                const storedSyobocalData = store.get('syoboiAPI_data') || {};
                const storedAniListData = store.get('anilistAPI_data') || {};

                const existingTitles = storedSyobocalData.titles || {};
                const existingGenres = storedAniListData.genres || {};

                const mergedTitles = { ...existingTitles, ...titlesMap };
                const mergedGenres = { ...existingGenres, ...genresMap };

                if (Object.keys(titlesMap).length > 0) {
                    store.set('syoboiAPI_data', {
                        ...storedSyobocalData,
                        titles: mergedTitles
                    });
                }

                if (Object.keys(genresMap).length > 0) {
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

            // リマインダーから渡されたリスト情報（existingItems）に基づく既存アイテムの取得
            const cachedItem = existingMap.get(filePath);

            const baseFileName = path.basename(filePath, '.amppl');
            const parsedTitle = parseTitleInfo(baseFileName);

            const ampplContent = await fs.readFile(filePath, 'utf-8');
            const lines = ampplContent.split(/\r?\n/).filter(line => line.trim() !== '');
            const episodeCount = lines.length;

            const lowerPath = filePath.toLowerCase();
            const isAnimePath = lowerPath.includes('アニメ') || lowerPath.includes('anime');

            const removePrefix = (str) => {
                let cleaned = str;
                cleaned = cleaned.replace(/^[ぁ-んァ-ン]_/, '');
                cleaned = cleaned.replace(/^[\d\s～〜年月日]+_/, '');
                cleaned = cleaned.replace(/^[★☆]+_/, '');
                return cleaned;
            };

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

            const isForced = cachedItem && cachedItem.isSave;

            let genre = isForced ? null : (cachedItem ? cachedItem.genre : null);
            let tid = isForced ? null : (cachedItem ? cachedItem.tid : null);
            let playlistStatus = cachedItem ? cachedItem.playlistStatus : null;

            const isMtimeUnchanged = !isForced && cachedItem && 
                                     cachedItem.folderMtime === seriesInfo.folderMtime && 
                                     cachedItem.fileMtime === fileMtime &&
                                     cachedItem.category === category &&
                                     cachedItem.seriesName === seriesName;

            const needsFetchGenre = isAnimePath && (!cachedItem || !genre || isForced);
            const needsFetchTid = isAnimePath && (!cachedItem || !tid || isForced);
            const needsCheckStatus = !cachedItem || !playlistStatus;

            let resultItem;
            let isUpdated = false;

            if (isMtimeUnchanged && !needsFetchGenre && !needsFetchTid && !needsCheckStatus) {
                resultItem = cachedItem;
                isUpdated = cachedItem.isUpdated || false;
            } else {
                if (!isAnimePath) {
                    genre = '-';
                    tid = '-';
                } else {
                    if (needsFetchGenre) {
                        if (isAniListRateLimited) {
                            genre = cachedItem ? cachedItem.genre : '-';
                        } else {
                            genre = await fetchAniListWithFallback(seriesName, event, cachedItem ? cachedItem.genre : '-');
                        }
                    }
                    if (needsFetchTid) {
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

                if (!cachedItem) {
                    isUpdated = true; // 新規追加
                } else {
                    isUpdated = (
                        cachedItem.tid !== tid ||
                        cachedItem.genre !== genre ||
                        cachedItem.playlistStatus !== playlistStatus ||
                        cachedItem.episodeCount !== episodeCount ||
                        cachedItem.titleName !== parsedTitle.titleName ||
                        cachedItem.seriesName !== seriesName ||
                        cachedItem.category !== category
                    );
                }

                resultItem = {
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
                    id: `${seriesInfo.folderPath}__${filePath}`,
                    titleKana: parsedTitle.titleKana,
                    titleDate: parsedTitle.titleDate,
                    titleRating: parsedTitle.titleRating,
                    titleName: parsedTitle.titleName,
                    episodeCount,
                    playlistStatus,
                    isSave: cachedItem ? cachedItem.isSave : false,
                    viewCount: (cachedItem && typeof cachedItem.viewCount === 'number') ? cachedItem.viewCount : 0,
                    isUpdated
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
    if (!query || isAniListRateLimited) {
        return cachedGenre || '-';
    }

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

    // ★ queries に genres と tags (name) を追加取得するよう変更
    const graphqlQuery = `
        query ($search: String) {
            Media (search: $search, type: ANIME) {
                genres
                tags {
                    name
                }
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
                    'Accept': 'application/json'
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
                    console.warn('【警告】AniListAPI： 403エラー検知のため制限フラグを設定');
                }
                aniListCache.set(query, cachedGenre || '-');
                return cachedGenre || '-';
            }

            if (response.status === 429) {
                if (attempt < maxRetries) {
                    console.warn(`【警告】AniListAPI： 429エラー検知リトライ（${attempt}/${maxRetries}）`);
                    await delay(30000);
                    continue;
                } else {
                    console.warn(`【警告】AniListAPI： 429エラー検知オーバー（${attempt}/${maxRetries}）`);
                    break;
                }
            }

            if (!response.ok) {
                aniListCache.set(query, cachedGenre || '-');
                console.log(`【情報】AniListAPI： ${query} ${cachedGenre || '-'}`);
                return cachedGenre || '-';
            }

            const result = await response.json();
            const media = result?.data?.Media;

            let resolvedGenre = '-';
            if (media) {
                const combinedItems = [];

                // 1. ジャンルの日本語化＆追加
                if (media.genres && media.genres.length > 0) {
                    const translatedGenres = media.genres.map(g => GENRE_MAP[g] || g);
                    combinedItems.push(...translatedGenres);
                }

                // 2. タグの取得、TAG_MAPによる日本語化、先頭への"#"付加＆追加
                if (media.tags && media.tags.length > 0) {
                    const translatedTags = media.tags.map(t => {
                        const tagName = t.name;
                        const translatedName = TAG_MAP[tagName] || tagName;
                        return `#${translatedName}`;
                    });
                    combinedItems.push(...translatedTags);
                }

                // 3. 重複を除外してカンマ区切りの文字列に統合
                if (combinedItems.length > 0) {
                    const uniqueItems = [...new Set(combinedItems)];
                    resolvedGenre = uniqueItems.join(', ');
                }
            }

            // 2. メモリキャッシュおよび electron-store へ保存・更新
            aniListCache.set(query, resolvedGenre);
            
            const updatedGenresMap = { ...genresMap, [query]: resolvedGenre };
            store.set('anilistAPI_data', {
                ...storedAniListData,
                genres: updatedGenresMap
            });

            console.log(`【情報】AniListAPI： ${query} ${resolvedGenre}`);
            return resolvedGenre;
        } catch (e) {
            if (attempt === maxRetries) break;
            console.error(`【エラー】AniListAPI： リクエスト中に例外が発生（試行回数 ${attempt}/${maxRetries}）:`, error.message);
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
