var app = require('app'),
	// IPC between Main envinronment and Chromium
	ipc = require('ipc'),
	// File System Access
	fs = require('fs'),
	// Path Manipulation
	path = require('path'),
	// Process Spawning
	spawn = require('child_process').spawn,
	// Module to create native browser window.
	BrowserWindow = require('browser-window'),
	// Module to Activate the Global Shortcut
	GlobalShortcut = require('global-shortcut'),
	// Database for Search Results
	Database = require('./lib/searchers/Database');

var Menu = require('menu');
var Tray = require('tray');

var appIcon = null;
	
// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the javascript object is GCed.
var mainWindow = null;


// Register a 'ctrl+x' shortcut listener.
app.on('ready', function() {
	
	
	if (!fs.existsSync(app.getDataPath()))
	{
		fs.mkdirSync(app.getDataPath());	
	}
	
	Database.start(app);
	
	
	try
	{
		appIcon = new Tray(__dirname + '/media/img/Minecraft_Creeper_2-16x16.png');
		var contextMenu = Menu.buildFromTemplate([
			{ label: 'Quit', click: function() { app.quit(); } }
		]);
		
		appIcon.setToolTip('Creeper Launch Bar');
		appIcon.setContextMenu(contextMenu);
	}
	catch (err)
	{
		console.log('TRAY ERROR:');
		console.log(err);
	}
	
	
	var screen = require('screen');
	var display = screen.getPrimaryDisplay();
	var width = Math.round(display.bounds.width*0.60);
	width = width - (width % 100);
	console.log("WIDTH = " + width);
	
	
	mainWindow = new BrowserWindow({
		'width':  width,
		'height': 20,
		'frame': false,
		'always-on-top': true,
		'show': false,
		'skip-taskbar': true,
		'auto-hide-menu-bar': true
	});

	var pos = mainWindow.getPosition();
	mainWindow.setPosition(pos[0], 100);

	// and load the index.html of the app.
	mainWindow.loadUrl('file://' + __dirname + '/index.html');

	// Emitted when the window is closed.
	mainWindow
		.on('closed', function() {
			// Dereference the window object, usually you would store windows
			// in an array if your app supports multi windows, this is the time
			// when you should delete the corresponding element.
			mainWindow = null;
		});
	
	if (app.dock && typeof app.dock.hide == 'function') {
		app.dock.hide();
	}
	
	var ret = GlobalShortcut.register('ctrl+space', function() {
		
		mainWindow.show();
		mainWindow.focus();

		mainWindow.webContents.send('show-browser');
	});
	
});


ipc
	.on('resize', function(event, size) {
		var osize = mainWindow.getSize();
		mainWindow.setSize(osize[0], size);
	})
	.on('hide-window', function(event, args) {
		var pos = mainWindow.getPosition();
		var osize = mainWindow.getSize();

		mainWindow.hide();
		mainWindow.setPosition(pos[0], 100);

		return false;
	})
	.on('search', function(event, query) {

		var results = Database.search(query, function(results) {
			mainWindow.webContents.send('results', results);
		});
	});


// Quit when all windows are closed.
app.on('window-all-closed', function() {

	globalShortcut.unregister('ctrl+space');
	globalShortcut.unregisterAll();

	if (process.platform != 'darwin')
		app.quit();
});