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

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the javascript object is GCed.
var mainWindow = null;


// Register a 'ctrl+x' shortcut listener.
app.on('ready', function() {
	
	app.dock.hide();
	
	mainWindow = new BrowserWindow({
		'width': 800,
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
		
		var results = Database.search(query);
		mainWindow.webContents.send('results', results);
	})
	.on('exec:application', function(event, appPath) {
		spawn('open', [appPath], {detached: true});
	});


// Quit when all windows are closed.
app.on('window-all-closed', function() {
	
	globalShortcut.unregister('ctrl+space');
	globalShortcut.unregisterAll();
	
	if (process.platform != 'darwin')
		app.quit();
});
