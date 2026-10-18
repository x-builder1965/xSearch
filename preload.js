// -- preload.js -------------------------------------------------------
// copyright = 'Copyright © 2026- @x-builder, Japan';
// email     = 'x-builder@gmail.com';
// appName   = 'xSearch -プレイリスト検索-';
// version   = 'Ver1.01.0';
// ---------------------------------------------------------------------
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
    openDirectory: () => ipcRenderer.invoke('dialog:openDirectory'),
    scanDirectory: (dirPath) => ipcRenderer.invoke('scan:directory', dirPath),
    fastSyncDirectory: (dirPath, items) => ipcRenderer.invoke('fast:syncDirectory', dirPath, items),
    onScanProgress: (callback) => ipcRenderer.on('scan:progress', (event, data) => callback(data)),
    savePlaylist: (items) => ipcRenderer.invoke('save-playlist', items)
});
