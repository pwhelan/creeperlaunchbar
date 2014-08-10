var app = require('app');  // Module to control application life.
var BrowserWindow = require('browser-window');  // Module to create native browser window.
var globalShortcut = require('global-shortcut');
var ipc = require('ipc');
var fs = require('fs');
var plist = require('plist');
var spawn = require('child_process').spawn;
var exploreDirectory = require('./exploreDirectory').exploreDirectory;
var path = require('path');
var crypto = require('crypto');


function checksum (str, algorithm, encoding) {
	return crypto
		.createHash(algorithm || 'md5')
		.update(str, 'utf8')
		.digest(encoding || 'hex');
}


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
	
	var ret = globalShortcut.register('ctrl+space', function() {
		
		mainWindow.show();
		mainWindow.focus();
		
		mainWindow.webContents.send('show-browser');
	});
});


var Applications = {};

for (var i = 'A'.charCodeAt(0); i <= 'Z'.charCodeAt(0); i++) {
	Applications[String.fromCharCode(i)] = [];
}


var ParseApplicationBundle = function(fpath) {
	var info;
	
	try {
		info = plist.parse(
			fs.readFileSync(fpath + '/Contents/Info.plist', 'utf8')
		);
	}
	catch (err) {
		var shortname = path.basename(fpath);
		shortname = shortname.substr(0, shortname.lastIndexOf('.'));
		
		console.error(err);
		info = {
			CFBundleName: shortname,
			CFBundleIconFile: shortname
		};
	}
	
	//console.log(JSON.stringify(obj));
	console.log('ICON = ' + info.CFBundleIconFile);
	console.log('APP NAME = ' + info.CFBundleName);
	var appName = info.CFBundleName? info.CFBundleName : info.CFBundleExecutable;
	var pngIconFile = '/Users/pwhelan/.launchdd/cache/app-icons/' +
				checksum(fpath + '/' + appName) + '.png';
	
	
	fs.exists(pngIconFile, function(exists) {
		
		if (!exists) {
			var candidates = [
				fpath + '/Contents/Resources/' + info.CFBundleIconFile,
				fpath + '/Contents/Resources/' + info.CFBundleIconFile + '.icns',
				fpath + '/Contents/Resources/' + appName + '.icns'
			];
			
			
			for (var icon = 0; icon < candidates.length; icon++)
			{
				icnsIconFile = candidates[icon];
				if (fs.existsSync(icnsIconFile)) {
					var sips = spawn('sips', [
						'-s',
						'format', 'png',
						icnsIconFile,
						'--out', pngIconFile
					]);
					
					
					sips.stdout.on('data', function (data) {
						console.log('SIPS: stdout: ' + data);
					});
					
					sips.stderr.on('data', function (data) {
						console.log('SIPS: stderr: ' + data);
					});
					
					sips.on('close', function (code) {
						console.log('SIPS: child process exited with code ' + code);
					});
				}
			}
			
		}
		
		Applications[appName[0].toUpperCase()].push({
			label	: appName,
			icon	: 'file://' + pngIconFile,
			command	: {
				channel : 'exec:application',
				args	: [ fpath ]
			}
		});
	});

};


var ParseApplicationsDirectory = function(path) {
	
	if (path.substr(path.lastIndexOf('.')) == '.app') {
		console.log('BUNDLE = ' + process.cwd() + '/' + path);
		ParseApplicationBundle(path);
		
		return false;
	}
	
	return true;
};

exploreDirectory('/Applications/', ParseApplicationsDirectory);
exploreDirectory('/Users/pwhelan/Applications/', ParseApplicationsDirectory);


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
			var space = Applications[(query[0].toUpperCase())];
			
			
			if (space) {
				console.log('IN SPACE: ' + JSON.stringify(space));
				for (var i = 0; i < space.length; i++) {
					var label = space[i].label.substr(0, query.length).toUpperCase();
					if (label == query.toUpperCase()) {
						results.push(space[i]);
					}
				}
			}
		}
		
		mainWindow.webContents.send('results', results);
	})
	.on('exec:numbers', function(event, number) {
		console.log('NUMBER = ' + number);
	})
	.on('exec:application', function(event, appPath) {
		spawn('open', [appPath], {detached: true});
	});


/*
// Unregister a shortcut.
globalShortcut.unregister('ctrl+space');

// Unregister all shortcuts.
globalShortcut.unregisterAll();
*/

// Quit when all windows are closed.
app.on('window-all-closed', function() {
	if (process.platform != 'darwin')
		app.quit();
});

/*
// This method will be called when atom-shell has done everything
// initialization and ready for creating browser windows.
app.on('ready', function() {
	// Create the browser window.
	mainWindow = new BrowserWindow({width: 800, height: 600});
	
	// and load the index.html of the app.
	mainWindow.loadUrl('file://' + __dirname + '/index.html');
	
	// Emitted when the window is closed.
	mainWindow.on('closed', function() {
		// Dereference the window object, usually you would store windows
		// in an array if your app supports multi windows, this is the time
		// when you should delete the corresponding element.
		mainWindow = null;
	});
});

*/
