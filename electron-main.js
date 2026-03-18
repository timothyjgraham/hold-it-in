const { app, BrowserWindow, shell } = require('electron');
const path = require('path');

function createWindow() {
    const win = new BrowserWindow({
        width: 1280,
        height: 720,
        minWidth: 800,
        minHeight: 600,
        title: 'Hold It In',
        autoHideMenuBar: true,
        fullscreenable: true,
        fullscreen: true,
        show: false,
        webPreferences: {
            preload: path.join(__dirname, 'electron-preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
        },
    });

    win.removeMenu();
    win.once('ready-to-show', () => win.show());

    // F11 to toggle fullscreen
    win.webContents.on('before-input-event', (event, input) => {
        if (input.key === 'F11' && input.type === 'keyDown') {
            win.setFullScreen(!win.isFullScreen());
            event.preventDefault();
        }
    });

    // Open external links (wishlist buttons, etc.) in system browser
    win.webContents.setWindowOpenHandler(({ url }) => {
        if (url.startsWith('https://') || url.startsWith('http://')) {
            shell.openExternal(url);
        }
        return { action: 'deny' };
    });

    // Also catch <a target="_blank"> clicks
    win.webContents.on('will-navigate', (event, url) => {
        if (url.startsWith('https://') || url.startsWith('http://')) {
            event.preventDefault();
            shell.openExternal(url);
        }
    });

    // Handle renderer crashes
    win.webContents.on('render-process-gone', (event, details) => {
        console.error('[ELECTRON] Renderer crashed:', details.reason);
        const { dialog } = require('electron');
        dialog.showErrorBox('Hold It In - Crash',
            `The game crashed unexpectedly (${details.reason}).\n\nPlease restart.`);
        app.quit();
    });

    win.loadFile(path.join(__dirname, 'dist', 'index.html'));
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
    app.quit();
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
