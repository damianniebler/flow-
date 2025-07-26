const { app, BrowserWindow, protocol } = require('electron');
const path = require('path');

function createWindow() {
	const win = new BrowserWindow({
		width: 1000,
		height: 700,
		webPreferences: {
			contextIsolation: true
		}
	});

	// Register a custom protocol to serve files from the build directory. This
	// avoids "Not allowed to load local resource" errors when loading the app
	// from the file system.
       protocol.registerFileProtocol('app', (request, callback) => {
               const urlPath = request.url.replace('app://', '').replace(/^\/+/, '');
               const target = path.join(__dirname, '../build', urlPath);
               callback({ path: target });
       });

	// Load the built SvelteKit app using the custom protocol
	win.loadURL('app://index.html');
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
	if (process.platform !== 'darwin') app.quit();
});
