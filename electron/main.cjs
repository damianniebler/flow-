const { app, BrowserWindow, protocol } = require('electron');
const path = require('path');
const url = require('url');

function createWindow() {
  const win = new BrowserWindow({
    width: 1000,
    height: 700,
    webPreferences: {
      contextIsolation: true
    }
  });

  const indexPath = url.pathToFileURL(path.join(__dirname, '../build/index.html')).href;

    protocol.interceptFileProtocol('file', (request, callback) => {
    const pathname = decodeURIComponent(new URL(request.url).pathname);
    if (pathname.startsWith('/')) {
      callback({ path: path.join(__dirname, '../build', pathname.slice(1)) });
    } else {
      callback({ path: path.join(__dirname, '..', pathname) });
    }
  });
  
  win.loadURL(indexPath);
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
