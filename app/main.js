var electron = require('electron'),
	app = electron.app,
	// IPC between Main envinronment and Chromium
	ipc = require('electron').ipcMain,
	// File System Access
	fs = require('fs'),
	// Path Manipulation
	path = require('path'),
	// Process Spawning
	spawn = require('child_process').spawn,
	// Module to create native browser window.
	BrowserWindow = electron.BrowserWindow,
	// Module to Activate the Global Shortcut
	GlobalShortcut = electron.globalShortcut,
	// Database for Search Results
	Database = require('./lib/searchers/Database');

app.commandLine.appendSwitch('remote-debugging-port', '8315');
app.commandLine.appendSwitch('host-rules', 'MAP * 127.0.0.1');

var Menu = electron.Menu;
var Tray = electron.Tray;

var appIcon = null;
	
// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the javascript object is GCed.
var mainWindow = null;

var startAtLogin = -1;
var changeAutoStart = function() {};

function refreshTrayMenu()
{
	var menu = [];
	
	if (startAtLogin != -1)
	{
		menu.push({ 
			label: 'Start at Login', 
			type: 'checkbox', 
			checked: startAtLogin, 
			click: changeAutoStart 
		});
	}
	
	menu.push({
		label: 'Quit', 
		click: function() { app.quit(); } 
	});
	
	appIcon.setContextMenu(Menu.buildFromTemplate(menu));
}

switch(process.platform)
{
	case 'darwin':
		// Support for PList files on OSX
		var plist = require('plist');
		var programLabel = 'org.pwhelan.' + app.getName();
		var plistFile = process.env.HOME + '/Library/LaunchAgents/' + programLabel + '.plist';
		
		
		(function() {
			// Make sure to resolve paths to absolute paths
			var args = process.argv;
			for (var arg in args)
			{
				var realpath = path.resolve(args[arg]);
				
				if (realpath && realpath != args[arg])
				{
					args[arg] = realpath;
				}
			}
			
			
			fs.exists(plistFile, function (exists) {
				if (exists)
				{
					fs.readFile(plistFile, function (err, data) {
						if (err) throw err;
						try
						{
							var plistData = plist.parse(data.toString());
							startAtLogin = plistData.RunAtLoad;
							refreshTrayMenu();
						}
						catch (e) {}
					});
					return;
				}
				
				fs.writeFile(plistFile, plist.build({ 
					Label: programLabel,
					KeepAlive: {
						SuccessfulExit: false
					},
					programArguments: process.argv,
					RunAtLoad: true,
					AbandonProcessGroup: true
				}), function() {
				});
			});
			
		})();
		
		changeAutoStart = function()
		{
			fs.readFile(plistFile, function (err, data) {
				var plistData;
				
				if (err) throw err;
				try
				{
					plistData = plist.parse(data.toString());
					plistData.RunAtLoad = !plistData.RunAtLoad;
				}
				catch (e) {}
				
				console.error('PLIST DATA = ');
				console.error(plistData);
				
				fs.writeFile(plistFile, plist.build(plistData), function(err) {
					if (err) throw err;
					
					startAtLogin = plistData.RunAtLoad;
					refreshTrayMenu();
				});
				
			});
		};
		
		break;
	default:
		changeAutoStart = function ()
		{
			// NOT SUPPORTED!
		};
		break;
}


app.on('ready', function() {
	
	if (!fs.existsSync(app.getPath('userData')))
	{
		fs.mkdirSync(app.getPath('userData'));
	}
	
	try
	{
		appIcon = new Tray(__dirname + '/media/img/Minecraft_Creeper_2-16x16.png');
		
		appIcon.setToolTip('Creeper Launch Bar');
		refreshTrayMenu();
	}
	catch (err)
	{
		console.log('TRAY ERROR:');
		console.log(err);
	}
	
	
	mainWindow = new BrowserWindow({
		'width':  500,
		'height': 84,
		'transparent': true,
		'frame': false,
		'alwaysOnTop': true,
		'show': false,
		'skip-taskbar': true,
		'auto-hide-menu-bar': true,
		//'type': 'panel',
		'backgroundColor': '#00000000',
		'closable': false,
		'resizable': false,
		'movable': false,
		'useContentSize': false
	});
	
	//console.log({
	//	boundswidth: displays[i].bounds.width,
	//	width: width,
	//	curx: curx
	//});
	
	
	// and load the index.html of the app.
	mainWindow.loadURL('file://' + __dirname + '/index.html');
	
	// Emitted when the window is closed.
	mainWindow
		.on('closed', function() {
			//mainWindow.webContents.send('hide-browser');
			// Dereference the window object, usually you would store windows
			// in an array if your app supports multi windows, this is the time
			// when you should delete the corresponding element.
			//mainWindow = null;
		});
	mainWindow
		.on('blur', function() {
			mainWindow.hide();
		});
	
	if (app.dock && typeof app.dock.hide == 'function') {
		app.dock.hide();
	}
	
	// Library for finding display offset+width
	var Offset = require('./lib/display-offset');
	
	
	console.log('ready...');
	
	var ret = GlobalShortcut.register('Control+Space', function() {
		console.log("poof");
		var offset = Offset();
		var osize = mainWindow.getSize();
		
		
		console.log(offset);
		
		mainWindow.setPosition(offset.x, offset.y);
		mainWindow.webContents.send('set-max-height', offset.h);
		
		mainWindow.setSize(offset.w, 84);
		
		mainWindow.webContents.send('show-browser');
		
		mainWindow.show();
		mainWindow.focus();
		
		setTimeout(function() { 
			mainWindow.setSize(offset.w, 84);
		}, 250);
	});
	
});


ipc
	.on('resize', function(event, size) {
		var osize = mainWindow.getSize();
		mainWindow.setSize(osize[0], size);
	})
	.on('hide-window', function(event, args) {
		
		var osize = mainWindow.getSize();
		console.log("RESET SIZE CLOSE");
		mainWindow.setSize(osize[0], 84);
		mainWindow.hide();
		
		return false;
	})
	.on('search', function(event, query) {
		var results = Database.search(query, function(results) {
			mainWindow.webContents.send('results', results);
		});
	})
	.on('show', function() {
		mainWindow.show();
		mainWindow.focus();
	});


// Quit when all windows are closed.
app.on('window-all-closed', function() {

	globalShortcut.unregister('ctrl+space');
	globalShortcut.unregisterAll();

	if (process.platform != 'darwin')
		app.quit();
});
