// -- preload.js -------------------------------------------------------
// copyright = 'Copyright © 2026- @x-builder, Japan';
// email     = 'x-builder@gmail.com';
// appName   = 'xSearch -プレイリスト検索-';
// version   = 'Ver1.12.0';
// ---------------------------------------------------------------------
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
    openDirectory: () => ipcRenderer.invoke('dialog:openDirectory'),
    scanDirectory: (dirPath) => ipcRenderer.invoke('scan:directory', dirPath),
    fastSyncDirectory: (dirPath, items) => ipcRenderer.invoke('fast:syncDirectory', dirPath, items),
    onScanProgress: (callback) => ipcRenderer.on('scan:progress', (event, data) => callback(data)),
    onScanItem: (callback) => ipcRenderer.on('scan:item', (event, item) => callback(item)), // ★ 追加
    cancelScan: () => ipcRenderer.invoke('scan:cancel'),
    savePlaylist: (items) => ipcRenderer.invoke('save-playlist', items),
    exportSettings: (data) => ipcRenderer.invoke('export-settings', data),
    importSettings: () => ipcRenderer.invoke('import-settings'),
    selectPlayerApp: () => ipcRenderer.invoke('dialog:selectPlayerApp'),
    openExternalUrl: (url) => ipcRenderer.invoke('shell:openExternalUrl', url),
    launchPlayer: (data) => ipcRenderer.invoke('app:launchPlayer', data)
});
