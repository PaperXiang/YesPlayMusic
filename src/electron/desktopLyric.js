import { BrowserWindow, ipcMain, screen } from 'electron';

const clc = require('cli-color');
const log = text => {
  console.log(`${clc.blueBright('[desktopLyric.js]')} ${text}`);
};

// 注意：主进程代码不经过 Babel，不能使用 ?. 和 ??

function pageURL() {
  const base = process.env.WEBPACK_DEV_SERVER_URL || 'http://localhost:27232/';
  return new URL('desktop-lyric.html', base).toString();
}

function styleFromSettings(settings) {
  const s = settings || {};
  const pick = (value, fallback) => (value === undefined ? fallback : value);
  return {
    fontSize: Number(pick(s.desktopLyricFontSize, 34)),
    width: Number(pick(s.desktopLyricWidth, 800)),
    color: pick(s.desktopLyricColor, '#ffffff'),
    showTranslation: pick(s.desktopLyricShowTranslation, true),
    locked: pick(s.desktopLyricLocked, false),
  };
}

// 窗口高度由字号决定：工具栏 + 两行歌词 + 上下留白
function heightFor(style) {
  const toolbar = 32;
  const main = Math.ceil(style.fontSize * 1.35);
  const sub = Math.ceil(style.fontSize * 0.6 * 1.5);
  return toolbar + main + sub + 28;
}

export function initDesktopLyric(mainWin, store) {
  let win = null;
  let style = styleFromSettings(store.get('settings'));
  let lastSync = null;
  let drag = null; // { timer, offsetX, offsetY }

  const sendState = () => {
    if (!mainWin.isDestroyed()) {
      mainWin.webContents.send('desktopLyricState', win !== null);
    }
  };

  // 透明窗口不支持系统缩放（Electron 文档的已知限制，Windows 上会抽搐），
  // 所以窗口固定为不可缩放，尺寸只由设置里的宽度和字号决定。
  const targetSize = () => {
    const { workArea } = screen.getPrimaryDisplay();
    return {
      width: Math.min(style.width, workArea.width),
      height: heightFor(style),
    };
  };

  const clampToDisplay = bounds => {
    const display = screen.getDisplayMatching(bounds);
    const area = display.workArea;
    return {
      width: bounds.width,
      height: bounds.height,
      x: Math.min(
        Math.max(bounds.x, area.x - bounds.width + 80),
        area.x + area.width - 80
      ),
      y: Math.min(
        Math.max(bounds.y, area.y),
        area.y + area.height - bounds.height
      ),
    };
  };

  const saveBounds = () => {
    if (win) store.set('desktopLyric.bounds', win.getBounds());
  };

  const applySize = () => {
    if (!win) return;
    const old = win.getBounds();
    const size = targetSize();
    if (old.width === size.width && old.height === size.height) return;
    // 以底部中心为锚点调整尺寸，字号变大时向上长
    win.setBounds(
      clampToDisplay({
        width: size.width,
        height: size.height,
        x: Math.round(old.x + (old.width - size.width) / 2),
        y: old.y + old.height - size.height,
      })
    );
    saveBounds();
  };

  const applyStyle = () => {
    if (!win) return;
    // 锁定后鼠标穿透；forward 让页面仍能收到 mousemove，用来显示解锁按钮
    win.setIgnoreMouseEvents(style.locked, { forward: true });
    applySize();
    win.webContents.send('style', style);
  };

  const stopDrag = () => {
    if (!drag) return;
    clearInterval(drag.timer);
    drag = null;
    saveBounds();
  };

  const open = () => {
    if (win) return;
    log('open desktop lyric window');
    const { workArea } = screen.getPrimaryDisplay();
    const size = targetSize();
    const saved = store.get('desktopLyric.bounds') || {};
    const bounds = clampToDisplay({
      width: size.width,
      height: size.height,
      x:
        saved.x !== undefined
          ? saved.x
          : Math.round(workArea.x + (workArea.width - size.width) / 2),
      y:
        saved.y !== undefined
          ? saved.y
          : workArea.y + workArea.height - size.height - 40,
    });
    win = new BrowserWindow(
      Object.assign({}, bounds, {
        frame: false,
        transparent: true,
        alwaysOnTop: true,
        skipTaskbar: true,
        hasShadow: false,
        resizable: false,
        maximizable: false,
        minimizable: false,
        fullscreenable: false,
        focusable: true,
        show: false,
        title: 'YesPlayMusic Lyric',
        webPreferences: {
          nodeIntegration: true,
          contextIsolation: false,
          backgroundThrottling: false,
        },
      })
    );
    win.setAlwaysOnTop(true, 'screen-saver');
    win.loadURL(pageURL());
    win.once('ready-to-show', () => {
      if (win) win.showInactive();
    });
    win.webContents.on('did-finish-load', () => {
      applyStyle();
      if (win && lastSync) win.webContents.send('sync', lastSync);
    });
    win.on('closed', () => {
      stopDrag();
      win = null;
      sendState();
    });
    store.set('desktopLyric.enabled', true);
    sendState();
  };

  const close = () => {
    store.set('desktopLyric.enabled', false);
    if (win) win.close();
  };

  ipcMain.on('toggleDesktopLyric', () => (win ? close() : open()));
  ipcMain.on('desktopLyricClose', close);

  // 拖动：由主进程按鼠标位置移动窗口，每次都带上固定宽高，
  // 避免 Windows 高 DPI 下 setPosition 导致窗口尺寸漂移
  ipcMain.on('desktopLyricDragStart', () => {
    if (!win || style.locked) return;
    stopDrag();
    const cursor = screen.getCursorScreenPoint();
    const b = win.getBounds();
    const size = { width: b.width, height: b.height };
    drag = {
      offsetX: cursor.x - b.x,
      offsetY: cursor.y - b.y,
      timer: setInterval(() => {
        if (!win) return stopDrag();
        const p = screen.getCursorScreenPoint();
        win.setBounds({
          x: p.x - drag.offsetX,
          y: p.y - drag.offsetY,
          width: size.width,
          height: size.height,
        });
      }, 10),
    };
  });
  ipcMain.on('desktopLyricDragEnd', stopDrag);

  // 锁定状态下，鼠标移到解锁按钮上时临时取消穿透
  ipcMain.on('desktopLyricIgnoreMouse', (_, ignore) => {
    if (win && style.locked) {
      win.setIgnoreMouseEvents(ignore, { forward: true });
    }
  });

  // 歌词窗口工具栏改设置：转给主窗口写入 Vuex，再经 sendSettings 同步回来
  ipcMain.on('desktopLyricSetting', (_, payload) => {
    if (!mainWin.isDestroyed()) {
      mainWin.webContents.send('desktopLyricSetting', payload);
    }
  });

  ipcMain.on('desktopLyricSync', (_, payload) => {
    lastSync = payload;
    if (win) win.webContents.send('sync', payload);
  });

  ipcMain.on('settings', (_, settings) => {
    style = styleFromSettings(settings);
    applyStyle();
  });

  mainWin.webContents.on('did-finish-load', () => {
    if (store.get('desktopLyric.enabled')) open();
    sendState();
  });
  mainWin.on('closed', () => {
    if (win) win.destroy();
  });
}
