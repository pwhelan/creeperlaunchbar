###
 Parse XDG Desktop entries
###
fs = require 'fs'
path = require 'path'
ipc = require('electron').ipcMain
crypto = require 'crypto'
spawn = require('child_process').spawn
_ = require 'underscore'
desktopEntry = require 'node-x11-desktop-entry';

checksum = (str, algorithm, encoding) ->
	crypto
		.createHash(algorithm || 'md5')
		.update(str, 'utf8')
		.digest(encoding || 'hex');

XDG = { entries: {}}

###
Parse an XDG Desktop entry file.
Parses a .desktop XDG desktop entry file and inserts a record
into the Database.
###

module.exports =
class ApplicationXdg
	@apiversion: "0.0.4";
	@dirs: [
		'/usr/share/applications/'
		'/usr/local/share/applications/'
		process.env.HOME + '/.local/share/applications/'
	]
	# Hard coded icon paths.
	# TODO: find API to query for the user's current Gnome/GTK+ Theme
	# to better prioritize the icon paths.
	@iconpaths = [
		'/usr/share/icons/gnome'
		'/usr/share/icons/default'
		'/usr/share/icons/handhelds'
		'/usr/share/icons/hicolor'
		'/usr/share/icons/Humanity'
		'/usr/share/icons/DMZ-Black'
		'/usr/share/icons/DMZ-White'
		'/usr/share/icons/HighContrast'
		'/usr/share/icons/Humanity-Dark'
		'/usr/share/icons/locolor'
		'/usr/share/icons/LoginIcons'
		'/usr/share/icons/redglass'
		'/usr/share/icons/ubuntu-mono-dark'
		'/usr/share/icons/ubuntu-mono-light'
		'/usr/share/icons/unity-icon-theme'
		'/usr/share/icons/unity-webapps-applications'
		'/usr/share/icons/whiteglass'
		'/usr/local/share/icons/hicolor'
		'/usr/share/icons/hicolor'
		process.env.HOME + '/.local/share/icons/hicolor'
	]
	
	@initialize: (database) ->
		for dir in @dirs
			database.explore dir, (fpath) =>
				console.log "explore app dir"
				return @parseappdir database, fpath
		
		ipc.on 'exec:applicationxdg', (event, appPath) ->
			
			try
				execPath = _.filter appPath, (path) ->
					return path[0] != '%';
				
				spawn '/bin/bash', [
					'-c'
					execPath.join(' ')
				], {
					detached: false
					cwd: process.env.HOME
				}
			catch msg
				console.error("ERROR: " +msg);
	
	@parseappdir: (database, filepath) =>
		console.log "parsing app dir: #{filepath}"
		if filepath.substr(filepath.lastIndexOf('.')) == '.desktop'
			@parsedesktopentry database, filepath
		else
			fs.lstat filepath, (err, stat) =>
				console.log "into #{filepath} we go ..."
				if err
					console.error "stat error: " + JSON.stringify(err)
					return
				
				if !stat.isDirectory()
					return
				
				fs.watch filepath, (event, file) =>
					
					if event != 'rename'
						return
					
					fs.exists filepath + '/' + file, (exists) =>
						fpath = path.normalize filepath + '/' + file
						if !exists
							if fpath in XDG.entries
								console.log "REMOVING!"
								XDG.entries[fpath].remove()
								delete XDG.entries[fpath]
							else
								console.log "CANNOT FIND " + fpath + " IN "
						else
							@parseappdir database, fpath
		
		true
	
	@getIconPath: (entry, iconpath) ->
		resolutions = ['48x48', '64x64', '128x128', 'scalable']
		actions = ['apps', 'actions', 'mimetypes', 'devices', 'categories']
		
		for resolution in resolutions
			for action in actions
				iconPathTry = iconpath + 
					'/' +
					resolution + '/' +
					action + '/' +
					entry.IconName + 
					if resolution == 'scalable' then '.svg' else '.png'
				
				console.log "ICON PATH ATTEMPT: #{iconPathTry}"
				if fs.existsSync(iconPathTry)
					console.log("ICONPATH=" + iconPathTry);
					return iconPathTry
		
		null
	
	@parsedesktopentry: (database, fpath) ->
		
		desktopEntry.load {
			entry: fpath
			onSuccess: (model) =>
				
				entry = model["Desktop Entry"]
				iconPath = null
				iconPathTry = null
				
				# Skip NoDisplay entries except for those installed in
				# $HOME (the logic being those are Chrome Apps).
				if entry.NoDisplay && fpath.substr(0, process.env.HOME.length) != process.env.HOME.length
					console.log('SKIP (NODISPLAY) = ' + entry.Name + ' path=' + fpath)
					return
				
				# Skip anything that is not an application (for now).
				if (entry.Type != 'Application')
					console.log('SKIP (!APPLICATION) = ' + entry.Name + ' path=' + fpath);
					return;
				
				# Skip entries without an executable statement
				if !entry.Exec
					console.log('SKIP (!EXEC) = ' + entry.Name + ' path=' + fpath);
					return
				
				# Skip entries that are not shown in more than one DE.
				if (entry.NotShownIn)
					notshown = entry.NotShownIn
						.split(';')
						.filter (notin) ->
							return notin.length > 0;
					
					if (notshown.length > 0)
						return
				# Skip Unity only applications
				if (entry.OnlyShowIn)
					onlyshow = entry.OnlyShowIn
						.split(';')
						.filter (onlyin) ->
							return onlyin.length > 0
					
					if ((onlyshow[0] == 'Unity' || onlyshow[0] == 'XFCE') && onlyshow.length == 1)
						return
				
				# Ignore weird compatability program from Ubuntu
				if entry.Exec == 'checkbox-gui'
					return
				
				# This code is meant to match up the application with
				# it's icon. This code could be an entire library unto
				# itself.
				#
				# Things going on here:
				# 
				#	* Check first to see if the icon path is a full path.
				#	* Attempt to match an icon from the hard coded paths.
				#		* Try to get one that is as close ass possible
				#		  to 48x48 pixels.
				#
				if entry.Icon
					# Check to see if it is a full path
					if fs.existsSync(entry.Icon)
						iconPath = entry.Icon;
						if (entry.Icon.indexOf('.') > 0)
							ext = entry.Icon.substr(entry.Icon.lastIndexOf('.'))
							if ext != 'jpg' && ext != 'png'
								iconPath = database.app.getPath('userData') + '/cache/app-icons/' + checksum(entry.Icon) + '.png'
								console.log("CONVERT " + entry.Icon + " -> " + iconPath)
								convert = spawn('convert', ['-flatten', '-alpha', 'on', '-background', 'none', entry.Icon, iconPath])
								
								convert.stdout.on 'data', (err, data) ->
									console.log('CONVERT -> ' + data);
								
								convert.stderr.on 'data', (err, data) ->
									console.error('CONVERT(ERROR) -> ' + data)
					
					else
						if entry.Icon.indexOf('.') > 0
							# Grab icon only name (by removing the extension)
							entry.IconName = entry.Icon.substr(0, entry.Icon.lastIndexOf('.'))
						else
							entry.IconName = entry.Icon
						
						# Try the hard coded icon paths for 48x48 sized icons
						for ipath in @iconpaths
							iconPath = @getIconPath entry, ipath
							if iconPath
								break
						
						# One more try with this weird directory
						if iconPath == null
							if fs.existsSync('/usr/share/app-install/icons/' + entry.IconName + '.svg')
								iconPath = '/usr/share/app-install/icons/' + entry.IconName + '.svg';
							else if fs.existsSync('/usr/share/app-install/icons/' + entry.IconName + '.png')
								iconPath = '/usr/share/app-install/icons/' + entry.IconName + '.png';
					
					# Now we try to convert the icon from a pixmap
					if iconPath == null
						_getPixmap = (entry) ->
							formats = [
								{ext: '', convert: false}
								{ext: '.png', convert: false}
								{ext: '.jpg', convert: false}
								{ext: '.jpeg', convert: false}
								{ext: '.xpm', convert: true}
								{ext: '.svg', convert: true}
							]
							format = null
							
							for format in formats
								console.log "PIXMAP TRY = " + '/usr/share/pixmaps/' + entry.Icon + format.ext
								if fs.existsSync('/usr/share/pixmaps/' + entry.Icon + format.ext)
									if format.convert
										iconPath = database.app.getPath('userData') + '/cache/app-icons/' + checksum(entry.Icon) + '.png'
										console.log "CONVERT " + entry.Icon + " -> " + iconPath
										convert = spawn('convert', ['/usr/share/pixmaps/' + entry.Icon, iconPath])
										
										
										convert.stdout.on 'data', (err, data) ->
											console.log 'CONVERT -> ' + data
										
										convert.stderr.on 'data', (err, data) ->
											console.error 'CONVERT(ERROR) -> ' + data
									else
										return '/usr/share/pixmaps/' + entry.Icon + format.ext
						
						iconPath = _getPixmap(entry)
					
					console.log "FPATH = #{fpath}"
					
					database.insert {
						label	: entry.Name
						filename: fpath
						icon	: iconPath
						path	: path.normalize(fpath)
						command	: {
							channel : 'exec:applicationxdg'
							args	: entry.Exec.split(/[\s\,]/)
						}
					}, (entry) ->
						console.log "ADDING XDG ENTRY = " + fpath + " = " + JSON.stringify(entry)
						XDG.entries[path.normalize(fpath)] = entry
			
			onError: (errorMessage) ->
				console.error "ERROR LOADING DESKTOP ENTRY '" + fpath + "' :"  + errorMessage
		}
