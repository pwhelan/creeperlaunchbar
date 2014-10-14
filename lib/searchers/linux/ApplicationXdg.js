/**
 * Allow execution of XDG Desktop entries.
 * 
 * http://standards.freedesktop.org/desktop-entry-spec/latest
 */
var fs = require('fs'),
	path = require('path'),
	ipc = require('ipc'),
	crypto = require('crypto');
	spawn = require('child_process').spawn,
	_ = require('underscore'),
	zeitgeist = require('./XDG/zeitgeist'),
	desktopEntry = require('node-x11-desktop-entry');


// Checksum is used to create cached application icons
// TODO: refactor into a icon cache.
function checksum (str, algorithm, encoding) {
	return crypto
		.createHash(algorithm || 'md5')
		.update(str, 'utf8')
		.digest(encoding || 'hex');
}

// Local copy of entries used when updating desktop entries via FS events.
// BUG: entries are not correctly updated when the entries are already
//      previously parsed (saved in the database).
var XDG = {
	entries: {}
};


/** Parse an XDG Desktop entry file.
 * 
 * Parses a .desktop XDG desktop entry file and inserts a record
 * into the Database.
 */
var ParseDesktopEntry = function(fpath, Database)
{
	// Hard coded icon paths.
	// TODO: find API to query for the user's current Gnome/GTK+ Theme
	// to better prioritize the icon paths.
	var iconpaths = [
		'/usr/share/icons/gnome',
		'/usr/share/icons/default',
		'/usr/share/icons/handhelds',
		'/usr/share/icons/hicolor',
		'/usr/share/icons/Humanity',
		'/usr/share/icons/DMZ-Black',
		'/usr/share/icons/DMZ-White',
		'/usr/share/icons/HighContrast',
		'/usr/share/icons/Humanity-Dark',
		'/usr/share/icons/locolor',
		'/usr/share/icons/LoginIcons',
		'/usr/share/icons/redglass',
		'/usr/share/icons/ubuntu-mono-dark',
		'/usr/share/icons/ubuntu-mono-light',
		'/usr/share/icons/unity-icon-theme',
		'/usr/share/icons/unity-webapps-applications',
		'/usr/share/icons/whiteglass',
		'/usr/local/share/icons/hicolor/',
		process.env.HOME + '/.local/share/icons/hicolor/'
	];
	
	
	desktopEntry.load({
		entry: fpath,
		onSuccess:function(model) {
			var entry = model["Desktop Entry"];
			var iconPath = null;
			var iconPathTry = null;
			
			// Skip NoDisplay entries except for those installed in
			// $HOME (the logic being those are Chrome Apps).
			if (entry.NoDisplay && fpath.substr(0, process.env.HOME.length) != process.env.HOME.length)
			{
				console.log('SKIP (NODISPLAY) = ' + entry.Name + ' path=' + fpath);
				return;
			}
			
			// Skip anything that is not an application (for now).
			if (entry.Type != 'Application')
			{
				console.log('SKIP (!APPLICATION) = ' + entry.Name + ' path=' + fpath);
				return;
			}
			
			// Skip entries without an executable statement
			if (!entry.Exec)
			{
				console.log('SKIP (!EXEC) = ' + entry.Name + ' path=' + fpath);
				return;
			}
			
			// Skip entries that are not shown in more than one DE.
			if (entry.NotShownIn)
			{
				var notshown = entry.NotShownIn
					.split(';')
					.filter(function(notin) { 
						return notin.length > 0;
					});
				
				if (notshown.length > 0)
				{
					return;
				}
			}
			
			// Skip Unity only applications
			if (entry.OnlyShowIn)
			{
				var onlyshow = entry.OnlyShowIn
					.split(';')
					.filter(function(onlyin) { 
						return onlyin.length > 0;
					});
					
				if (onlyshow[0] == 'Unity' && onlyshow.length == 1)
				{
					return;
				}
			}
			
			
			// Ignore weird compatability program from Ubuntu
			if (entry.Exec == 'checkbox-gui')
			{
				return;
			}
			
			// This code is meant to match up the application with
			// it's icon. This code could be an entire library unto
			// itself.
			//
			// Things going on here:
			// 
			//	* Check first to see if the icon path is a full path.
			//	* Attempt to match an icon from the hard coded paths.
			//		* Try to get one that is as close ass possible
			//		  to 48x48 pixels.
			//
			if (entry.Icon)
			{
				// Check to see if it is a full path
				if (fs.existsSync(entry.Icon)) {
					iconPath = entry.Icon;
					if (entry.Icon.indexOf('.') > 0)
					{
						var ext = entry.Icon.substr(entry.Icon.lastIndexOf('.'));
						if (ext != 'jpg' && ext != 'png')
						{
							iconPath = Database.app.getDataPath() + '/cache/app-icons/' + checksum(entry.Icon) + '.png';
							console.log("CONVERT " + entry.Icon + " -> " + iconPath);
							var convert = spawn('convert', ['-flatten', '-alpha', 'on', '-background', 'none', entry.Icon, iconPath]);
							
							
							convert.stdout.on('data', function(err, data) {
								console.log('CONVERT -> ' + data);
							});
							
							convert.stderr.on('data', function(err, data) {
								console.error('CONVERT(ERROR) -> ' + data);
							});
						}
					}
				}
				else {
					if (entry.Icon.indexOf('.') > 0)
					{
						// Grab icon only name (by removing the extension)
						entry.Icon = entry.Icon.substr(0, entry.Icon.lastIndexOf('.'));
					}
					
					// Try the hard coded icon paths for 48x48 sized icons
					for (var f in iconpaths) {
						iconPathTry = iconpaths[f] + '/48x48/apps/' + entry.Icon + '.png';
						if (fs.existsSync(iconPathTry))
						{
							iconPath = iconPathTry;
							break;
						}
					}
					
					// Try the hard coded icon paths for scalable icons
					if (iconPath === null)
					{
						for (var f in iconpaths) {
							iconPathTry = iconpaths[f] + '/scalable/apps/' + entry.Icon + '.svg';
							if (fs.existsSync(iconPathTry))
							{
								iconPath = iconPathTry;
								break;
							}
						}
					}
					
					// Try the hard coded icon paths for 48x48 device icons
					// Worth a shot...
					if (iconPath === null)
					{
						for (var f in iconpaths) {
							iconPathTry = iconpaths[f] + '/48x48/devices/' + entry.Icon + '.png';
							if (fs.existsSync(iconPathTry))
							{
								iconPath = iconPathTry;
								break;
							}
						}
					}
					
					// One more try with this weird directory
					if (iconPath === null)
					{
						if (fs.existsSync('/usr/share/app-install/icons/' + entry.Icon + '.svg')) {
							iconPath = '/usr/share/app-install/icons/' + entry.Icon + '.svg';
						}
						else if (fs.existsSync('/usr/share/app-install/icons/' + entry.Icon + '.png')) {
							iconPath = '/usr/share/app-install/icons/' + entry.Icon + '.png';
						}
					}
					
				}
				
				// Now we try to convert the icon from a pixmap
				if (iconPath === null)
				{
					if (fs.existsSync('/usr/share/pixmaps/' + entry.Icon))
					{
						iconPath = '/usr/share/pixmaps/' + entry.Icon;
						if (entry.Icon.indexOf('.') > 0)
						{
							var ext = entry.Icon.substr(entry.Icon.lastIndexOf('.'));
							if (ext != 'jpg' && ext != 'png')
							{
								iconPath = Database.app.getDataPath() + '/cache/app-icons/' + checksum(entry.Icon) + '.png';
								console.log("CONVERT " + entry.Icon + " -> " + iconPath);
								var convert = spawn('convert', ['/usr/share/pixmaps/' + entry.Icon, iconPath]);
								
								
								convert.stdout.on('data', function(err, data) {
									console.log('CONVERT -> ' + data);
								});
								
								convert.stderr.on('data', function(err, data) {
									console.error('CONVERT(ERROR) -> ' + data);
								});
							}
						}
						
					}
					else if (fs.existsSync('/usr/share/pixmaps/' + entry.Icon + '.png'))
					{
						iconPath = '/usr/share/pixmaps/' + entry.Icon + '.png';
					}
					if (fs.existsSync('/usr/share/pixmaps/' + entry.Icon + '.xpm')) {
						iconPath = Database.app.getDataPath() + '/cache/app-icons/' + checksum(entry.Icon) + '.png';
						console.log("CONVERT " + entry.Icon + " -> " + iconPath);
						var convert = spawn('convert', ['/usr/share/pixmaps/' + entry.Icon + '.xpm', iconPath]);
						
						
						convert.stdout.on('data', function(err, data) {
							console.log('CONVERT -> ' + data);
						});
						
						convert.stderr.on('data', function(err, data) {
							console.error('CONVERT(ERROR) -> ' + data);
						});
						
					}
				}
				
				// Insert into the database.
				Database.insert({
					label		: entry.Name,
					filename	: fpath,
					icon		: iconPath,
					path		: path.normalize(fpath),
					hasContext	: _.reduce(
						entry.Exec.split(/[\s\,]/),
						function(hasContext, pathPart) {
							
							return hasContext ?
								hasContext : 
									pathPart[0] == '%' && 
									(pathPart[1] == 'F' || pathPart[1] == 'f');
							
						},
						0
					),
					command	: {
						channel : 'exec:applicationxdg',
						args	: entry.Exec.split(/[\s\,]/)
					}
					
				}, function(entry) {
					XDG.entries[path.normalize(fpath)] = entry;
				});
			}
		},
		onError:function(errorMessage) {// handle error here
			console.error("ERROR LOADING DESKTOP ENTRY '" + fpath + "' :"  + errorMessage);
		}
	});
	
};


var ParseApplicationsDirectory = function(filepath, Database)
{
	if (filepath.substr(filepath.lastIndexOf('.')) == '.desktop') 
	{
		ParseDesktopEntry(filepath, Database);
	}
	else 
	{
		fs.lstat(filepath, function(err, stat) {
			
			if (err) {
				console.error("stat error: " + JSON.stringify(err));
				return;
			}
			
			if (stat.isDirectory())
			{
				fs.watch(filepath, function(event, file) {
					
					if (event == 'rename')
					{
						fs.exists(filepath + '/' + file, function(exists) {
							var fpath = path.normalize(filepath + '/' + file);
							
							
							if (!exists)
							{
								if (fpath in XDG.entries)
								{
									console.log("REMOVING!");
									XDG.entries[fpath].remove();
									delete XDG.entries[fpath];
								}
								else
								{
									console.log("CANNOT FIND ENTRY: " + fpath);
								}
							}
							else
							{
								ParseApplicationsDirectory(fpath, Database);
							}
						});
					}
				});
			}
		});
	}
	
	return true;
};


exports.apiversion = "0.0.4";

exports.initialize = function(Database) 
{
	Database.explore(
		'/usr/share/applications/',
		function(fpath) { 
			return ParseApplicationsDirectory(fpath, Database);
		}
	);
	Database.explore(
		'/usr/local/share/applications/',
		function(fpath) { 
			return ParseApplicationsDirectory(fpath, Database);
		}
	);
	Database.explore(
		process.env.HOME + '/.local/share/applications/',
		function(fpath) { 
			return ParseApplicationsDirectory(fpath, Database);
		}
	);
};

/** Get Context for XDG Desktop entry
 * 
 * Use Zeitgeist to get previously opened files for an XDG desktop entry.
 */
exports.getContext = function(entry, callback)
{
	if (!entry.hasContext)
	{
		return;
	}
	
	var application = 'application://' +
		entry.filename.substr(
			entry.filename.lastIndexOf('/')+1
		);
	
	
	zeitgeist.findevents(application, function(events) {
		callback(
			_.chain(events)
			.filter(function(event) {
				// Filter out non file object entries.
				return event.data.interpretation == 
					"http://www.semanticdesktop.org/ontologies/2007/03/22/nfo#FileDataObject";
			})
			.map(function(event) {
				// Return a result compatible with the format
				// used by the entries in the database.
				return {
					label		: event.data.url.substr('file://'.length),
					filename	: event.data.url.substr('file://'.length),
					icon		: '/usr/share/icons/HighContrast/48x48/places/folder.png',
					path		: event.data.url.substr('file://'.length),
					hasContext	: false,
					command	: {
						channel : entry.command.channel,
						args	: _.map(entry.command.args, function(arg) {
							if (arg == '%f' || arg == '%F')
							{
								return event.data.url.substr('file://'.length);
							}
							else if (arg == '%u' || arg == '%U')
							{
								return event.data.url;
							}
							
							return arg;
						})
					}
				};
			})
			// Make entries unique
			.uniq(
				false,
				function (event) {
					return event.label;
				}
			)
			.value()
		);
	});
}

ipc.on('exec:applicationxdg', function(event, appPath) {
	
	try
	{
		var execPath = _.filter(
			appPath,
			function (path) {
				return path[0] != '%';
			}
		);
		
		spawn(
			'/bin/bash', 
			['-c', execPath.join(' ')],
			{detached: true, cwd: process.env.HOME}
		);
	}
	catch(msg) {
		console.error("ERROR: " +msg);
	}
});
