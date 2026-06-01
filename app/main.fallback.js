const { app, BrowserWindow, Tray, Menu, nativeImage, ipcMain, screen, globalShortcut } = require('electron');
const path = require('path');
const fs = require('fs');
const AutoLaunch = require('auto-launch');

let win = null;
let tray = null;

const isWin = process.platform === 'win32';
const isMac = process.platform === 'darwin';
const FAB_SIZE = 76;

const PANEL_EXPANDED = { width: 400, height: 680 };
const PANEL_COLLAPSED = { width: 76, height: 76 };

const autoLauncher = new AutoLaunch({
  name: 'FloatingTodo',
  path: app.getPath('exe'),
});

// Position file path
const posPath = path.join(app.getPath('userData'), 'window-pos.json');
let savePosTimer = null;

const POS_VERSION = 2;

// Load position (v2: fixed 400x680 window; ignore legacy 76x76 saves)
function loadPos() {
  try {
    if (fs.existsSync(posPath)) {
      const data = JSON.parse(fs.readFileSync(posPath, 'utf-8'));
      if (data && data.v === POS_VERSION && typeof data.x === 'number' && typeof data.y === 'number') {
        return { x: data.x, y: data.y };
      }
    }
  } catch (e) {}
  return null;
}

// Save position
function savePos() {
  try {
    if (win) {
      const b = win.getBounds();
      let x = b.x;
      let y = b.y;
      if (isMac && isCollapsedBounds(b)) {
        const origin = toExpandedOriginFromCollapsed(b.x, b.y);
        x = origin.x;
        y = origin.y;
      }
      fs.writeFileSync(posPath, JSON.stringify({ x, y, v: POS_VERSION }), 'utf-8');
    }
  } catch (e) {}
}

// Single instance
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (win) { win.show(); win.focus(); }
  });
}

function getCollapsedHomeBounds() {
  const wa = screen.getPrimaryDisplay().workArea;
  return {
    x: Math.round(wa.x + wa.width - PANEL_EXPANDED.width - 16),
    y: Math.round(Math.max(wa.y + 16, 72)),
    width: PANEL_EXPANDED.width,
    height: PANEL_EXPANDED.height
  };
}

function setMousePassthrough(ignore) {
  if (!win || win.isDestroyed()) return;
  if (isWin) {
    win.setIgnoreMouseEvents(!!ignore, { forward: true });
  } else {
    // macOS does not support forward; small collapsed window handles hit-testing
    win.setIgnoreMouseEvents(false);
  }
}

function toCollapsedBounds(bounds) {
  return {
    x: Math.round(bounds.x + bounds.width - FAB_SIZE),
    y: Math.round(bounds.y),
    width: FAB_SIZE,
    height: FAB_SIZE,
  };
}

function toExpandedOriginFromCollapsed(cx, cy) {
  return {
    x: Math.round(cx - (PANEL_EXPANDED.width - FAB_SIZE)),
    y: Math.round(cy),
  };
}

function isCollapsedBounds(bounds) {
  return bounds.width <= FAB_SIZE + 8;
}

function applyPanelBounds(isOpen) {
  if (!win || win.isDestroyed()) return;
  const b = win.getBounds();
  if (isMac) {
    if (isOpen) {
      const origin = isCollapsedBounds(b)
        ? toExpandedOriginFromCollapsed(b.x, b.y)
        : { x: b.x, y: b.y };
      const next = clampToDisplay(origin.x, origin.y, PANEL_EXPANDED.width, PANEL_EXPANDED.height, 'expanded');
      win.setBounds({ ...next, width: PANEL_EXPANDED.width, height: PANEL_EXPANDED.height }, false);
    } else {
      const source = isCollapsedBounds(b)
        ? { x: b.x - (PANEL_EXPANDED.width - FAB_SIZE), y: b.y, width: PANEL_EXPANDED.width, height: PANEL_EXPANDED.height }
        : b;
      const next = toCollapsedBounds(source);
      const clamped = clampToDisplay(next.x, next.y, FAB_SIZE, FAB_SIZE, 'collapsed');
      win.setBounds({ ...clamped, width: FAB_SIZE, height: FAB_SIZE }, false);
    }
  }
  setMousePassthrough(!isOpen);
}

function createWindow() {
  const wa = screen.getPrimaryDisplay().workArea;
  const savedPos = loadPos();
  let startX = Math.round(wa.x + wa.width - PANEL_EXPANDED.width - 16);
  let startY = Math.round(Math.max(wa.y + 16, 72));
  if (savedPos && typeof savedPos.x === 'number' && typeof savedPos.y === 'number') {
    startX = savedPos.x;
    startY = savedPos.y;
  }

  let winW = PANEL_EXPANDED.width;
  let winH = PANEL_EXPANDED.height;
  if (isMac) {
    const collapsed = toCollapsedBounds({ x: startX, y: startY, width: PANEL_EXPANDED.width, height: PANEL_EXPANDED.height });
    startX = collapsed.x;
    startY = collapsed.y;
    winW = FAB_SIZE;
    winH = FAB_SIZE;
  }

  win = new BrowserWindow({
    width: winW,
    height: winH,
    x: startX,
    y: startY,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    resizable: false,
    skipTaskbar: true,
    hasShadow: false,
    focusable: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  win.loadFile(path.join(__dirname, 'src', 'index.html'));
  const clampW = isMac ? FAB_SIZE : PANEL_EXPANDED.width;
  const clampH = isMac ? FAB_SIZE : PANEL_EXPANDED.height;
  const clampMode = isMac ? 'collapsed' : 'expanded';
  const next = clampToDisplay(startX, startY, clampW, clampH, clampMode);
  if (next.x !== startX || next.y !== startY) win.setPosition(next.x, next.y);

  win.setAlwaysOnTop(true, 'floating');
  setMousePassthrough(!isMac);

  // Save position when moved
  win.on('moved', () => {
  if (savePosTimer) clearTimeout(savePosTimer);
  savePosTimer = setTimeout(() => savePos(), 180);
});

  win.on('closed', () => { win = null; });
}

function clampToDisplay(x, y, width, height, mode = 'collapsed') {
  const point = { x: Math.round(x + width / 2), y: Math.round(y + height / 2) };
  const current = screen.getDisplayNearestPoint(point);
  const primary = screen.getPrimaryDisplay();
  const wa = current.workArea;
  const currentDistance = Math.abs(point.x - (wa.x + wa.width / 2));
  const primaryDistance = Math.abs(point.x - (primary.workArea.x + primary.workArea.width / 2));
  const activeWa = currentDistance > 400 && primaryDistance < currentDistance ? primary.workArea : wa;
  const nx = Math.min(Math.max(Math.round(x), activeWa.x), activeWa.x + activeWa.width - width);
  if (mode === 'collapsed') {
    const minY = Math.max(activeWa.y, 72);
    const maxY = activeWa.y + activeWa.height - height;
    return { x: nx, y: Math.min(Math.max(Math.round(y), minY), maxY) };
  }
  return { x: nx, y: Math.max(Math.round(y), activeWa.y) };
}

function ensureWinVisible(mode = 'collapsed') {
  if (!win) return;
  const b = win.getBounds();
  const next = clampToDisplay(b.x, b.y, b.width, b.height, mode);
  if (next.x !== b.x || next.y !== b.y) win.setPosition(next.x, next.y);
}

function restoreFloatingIcon() {
  if (!win) { createWindow(); return; }
  const home = getCollapsedHomeBounds();
  if (isMac) {
    const cb = toCollapsedBounds(home);
    const next = clampToDisplay(cb.x, cb.y, FAB_SIZE, FAB_SIZE, 'collapsed');
    win.setBounds({ ...next, width: FAB_SIZE, height: FAB_SIZE }, false);
  } else {
    win.setBounds(home, false);
    setMousePassthrough(true);
  }
  win.show();
  win.focus();
  savePos();
}

function setPanelOpenInMain(isOpen) {
  if (!win) return;
  applyPanelBounds(isOpen);
  win.show();
  if (win && !win.isDestroyed()) {
    win.webContents.send('panel-bounds-applied', { open: !!isOpen });
  }
}

function createTray() {
  let icon;
  const iconPath = path.join(__dirname, 'assets', 'tray-icon.png');
  const logoPath = path.join(__dirname, 'assets', 'logo.png');
  try {
    icon = nativeImage.createFromPath(fs.existsSync(iconPath) ? iconPath : logoPath);
    if (icon.isEmpty()) icon = nativeImage.createEmpty();
    else if (isMac) icon = icon.resize({ width: 22, height: 22 });
  } catch (e) {
    icon = nativeImage.createEmpty();
  }

  tray = new Tray(icon);
  tray.setToolTip('FloatingTodo');

  function buildMenu(autoLaunchOn) {
    return Menu.buildFromTemplate([
      {
        label: 'Show / Hide',
        click: () => {
          if (!win) { createWindow(); return; }
          restoreFloatingIcon();
        }
      },
      { type: 'separator' },
      {
        label: 'Reset Position',
        click: () => {
          if (win) {
            const home = getCollapsedHomeBounds();
            win.setBounds(home, false);
            savePos();
          }
        }
      },
      { type: 'separator' },
      {
        label: 'Launch on system startup',
        type: 'checkbox',
        checked: autoLaunchOn,
        click: async (item) => {
          try {
            item.checked ? await autoLauncher.enable() : await autoLauncher.disable();
          } catch (e) { console.error(e); }
        }
      },
      { type: 'separator' },
      {
        label: 'Quit',
        click: () => { app.isQuiting = true; app.quit(); }
      },
    ]);
  }

  autoLauncher.isEnabled()
    .then(on => tray.setContextMenu(buildMenu(on)))
    .catch(() => tray.setContextMenu(buildMenu(false)));

  tray.on('click', () => {
  restoreFloatingIcon();
});
}

// ── Global Shortcuts ──
// Convert shortcut config object to Electron accelerator string
function toAccelerator(sc) {
  if (!sc) return null;
  const parts = [];
  if (sc.ctrl || sc.meta)  parts.push(sc.meta ? 'CmdOrCtrl' : 'Ctrl');
  if (sc.alt)              parts.push('Alt');
  if (sc.shift)            parts.push('Shift');
  let key = sc.key;
  // Electron expects special names for some keys
  const keyMap = { ' ': 'Space', 'Spacebar': 'Space' };
  if (keyMap[key]) key = keyMap[key];
  // Single letter keys need to be uppercase
  if (key.length === 1) key = key.toUpperCase();
  parts.push(key);
  return parts.join('+');
}

function registerGlobalShortcuts(shortcuts) {
  // Unregister all first
  globalShortcut.unregisterAll();

  if (shortcuts.togglePanel) {
    const acc = toAccelerator(shortcuts.togglePanel);
    if (acc) {
      globalShortcut.register(acc, () => {
        if (win) win.webContents.send('global-shortcut', 'togglePanel');
      });
    }
  }

  if (shortcuts.toggleInspo) {
    const acc = toAccelerator(shortcuts.toggleInspo);
    if (acc) {
      globalShortcut.register(acc, () => {
        if (win) win.webContents.send('global-shortcut', 'toggleInspo');
      });
    }
  }
}

// ── IPC ──

// Renderer asks for current window position before each drag
ipcMain.handle('get-win-pos', () => {
  if (!win) return { x: 0, y: 0 };
  const [x, y] = win.getPosition();
  return { x, y };
});

// Renderer sends absolute target position every mousemove during drag
ipcMain.on('win-move', (_, { x, y }) => {
  if (!win) return;
  const next = clampToDisplay(x, y, PANEL_EXPANDED.width, PANEL_EXPANDED.height, 'expanded');
  win.setBounds({
    x: next.x,
    y: next.y,
    width: PANEL_EXPANDED.width,
    height: PANEL_EXPANDED.height
  }, false);
});

ipcMain.on('win-move-end', () => {
  savePos();
});

ipcMain.on('set-panel-open', (_, isOpen) => {
  setPanelOpenInMain(!!isOpen);
});

// Renderer toggles mouse passthrough when cursor enters/leaves UI elements
// ignore=true  → transparent areas pass clicks through to windows below
// ignore=false → UI elements receive mouse events normally
ipcMain.on('set-ignore-mouse', (_, ignore) => {
  if (isMac) {
    if (!ignore) setMousePassthrough(false);
    return;
  }
  setMousePassthrough(!!ignore);
});

// Auto-launch toggle from renderer settings
ipcMain.handle('get-autolaunch', async () => {
  try { return await autoLauncher.isEnabled(); }
  catch { return false; }
});

ipcMain.on('set-autolaunch', async (_, enable) => {
  try {
    enable ? await autoLauncher.enable() : await autoLauncher.disable();
  } catch (e) { console.error(e); }
});

// Renderer registers/unregisters global shortcuts when user changes settings
ipcMain.on('register-global-shortcuts', (_, shortcuts) => {
  registerGlobalShortcuts(shortcuts);
});

// ── Boot ──
app.whenReady().then(() => {
  if (isMac && app.dock) app.dock.hide();
  createWindow();
  createTray();
  app.on('activate', () => { if (!win) createWindow(); });
});

app.on('window-all-closed', e => { if (!app.isQuiting) e.preventDefault(); });
app.on('before-quit', () => { app.isQuiting = true; globalShortcut.unregisterAll(); });
