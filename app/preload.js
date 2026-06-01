const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  // Drag: get real window position from main before drag starts
  getWinPos:      ()       => ipcRenderer.invoke('get-win-pos'),
  // Drag: send absolute target position each frame
  moveWin:        (x, y)  => ipcRenderer.send('win-move', { x, y }),
moveWinEnd:     ()      => ipcRenderer.send('win-move-end'),
  // Mouse passthrough: false = UI active, true = transparent area passthrough
  setIgnoreMouse: (v)      => ipcRenderer.send('set-ignore-mouse', v),
setPanelOpen:   (open)   => ipcRenderer.send('set-panel-open', open),
onPanelBoundsApplied: (callback) => ipcRenderer.on('panel-bounds-applied', (_, payload) => callback(payload)),
onPanelResizeStart: (callback) => ipcRenderer.on('panel-resize-start', (_, payload) => callback(payload)),
  // Auto-launch
  getAutoLaunch:  ()      => ipcRenderer.invoke('get-autolaunch'),
  setAutoLaunch:  (v)     => ipcRenderer.send('set-autolaunch', v),
  // Global shortcuts: register from renderer
  registerGlobalShortcuts: (shortcuts) => ipcRenderer.send('register-global-shortcuts', shortcuts),
  // Listen for global shortcut events from main process
  onGlobalShortcut:       (callback)   => ipcRenderer.on('global-shortcut', (_, action) => callback(action)),
});
