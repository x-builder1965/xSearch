# note 開発ノート

## 2026-10-XX Ver1.XX.0 設定情報のインポート・エクスポート機能の追加。
- インポート（📤）、エクスポート（📤）を保存（💾）の右横に配置
・インポート（📤）クリック時：
    - 選択ダイアログを表示。（拡張子：xsj、json）
    - 「開く」クリック：選択した設定ファイルを読み込んで画面に反映。
    - 「キャンセル」クリック：なにもしない。
- エクスポート（📤）クリック時：
    - 保存ダイアログを表示。（デフォルトファイル名：xSearch_setting.xsj）
    - 「保存」クリック：localStorageの設定をファイルに保存
    - 「キャンセル」クリック：なにもしない。
- 修正対象ロジック：
<!-- -- index.html ---------------------------------------------------
<!-- コントロールパネル -->
<header class="toolbar">
    <button id="select-dir-btn">🔎</button>
    <button id="fast-search-btn">👁️</button>
    <span id="current-dir-path" class="path-label">フォルダが選択されていません</span>
    <button id="save-btn">💾</button>
</header>

/* -- styles.css --------------------------------------------------------
button {
    font-family: "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif;
    background-color: var(--accent-color);
    color: #fff;
    border: none;
    padding: 8px 16px;
    border-radius: 4px;
    cursor: pointer;
    font-weight: bold;
}

// -- renderer.js ------------------------------------------------------
let appState = {
    selectedDir: '',
    items: [],
    theme: 'dark',
    isProcessing: false // 追加：処理中フラグ
};
