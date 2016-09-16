const {app, BrowserWindow} = require('electron')

app.on('ready', () => {
	let mainWindow = new BrowserWindow({width: 800, height: 600, titleBarStyle: 'hidden'})

	mainWindow.on('closed', () => {
		mainWindow = null
	})

	mainWindow.loadURL('file://' + __dirname +  '/app/index.html')
})