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
	GlobalShortcut = require('global-shortcut');


var Database = {};

for (var i = 0; i <= 9; i++) {
	Database[i] = [];
}

for (var i = 'A'.charCodeAt(0); i <= 'Z'.charCodeAt(0); i++) {
	Database[String.fromCharCode(i)] = [];
}

Array.prototype.getUniqueByKey = function(key) {
	var u = {}, a = [];
	for(var i = 0, l = this.length; i < l; ++i){
		if(u.hasOwnProperty(this[i][key])) {
			continue;
		}
		a.push(this[i]);
		u[this[i][key]] = 1;
	}
	return a;
};


require('./lib/searchers/osx/ApplicationBundles').initialize(function(entry) {
	var part;
	var camelcaseparts = entry.label.split(/(SQL|JSON|[A-Z]+[a-z]+)|\s|\_/);
	
	
	entry.term = entry.label;
	Database[entry.label[0].toUpperCase()].push(entry);
	
	
	do {
		part = camelcaseparts.shift();
		
		if (part) part = part.trim();
		if (!part || part.length <= 0) {
			continue;
		}
		
		if (Database[part[0].toUpperCase()]) {
			Database[part[0].toUpperCase()].push({
				label: entry.label,
				icon: entry.icon,
				term: part,
				command: {
					channel: entry.command.channel,
					args: entry.command.args
				}
			});
		}
		
	} while (camelcaseparts.length > 0);
	
	for (var key in Database) {
		Database[key] = Database[key].getUniqueByKey('label');
	}
});


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
		
		var results = [];
		if (query.length > 0) {
			var space = Database[(query[0].toUpperCase())];
			if (space) {
				for (var i = 0; i < space.length; i++) {
					
					var label = space[i].label.substr(0, query.length).toUpperCase();
					if (label == query.toUpperCase()) {
						results.push(space[i]);
						continue;
					}
					
					var term = space[i].term.substr(0, query.length).toUpperCase();
					if (term == query.toUpperCase()) {
						results.push(space[i]);
					}
				}
			}
		}
		
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
