/**
 * Allow execution of Application Bundles on Mac OSX.
 *
 */
var exploreDirectory = require('../../exploreDirectory').exploreDirectory,
	plist = require('plist'),
	fs = require('fs'),
	path = require('path'),
	ipc = require('ipc'),
	crypto = require('crypto');
var spawn = require('child_process').spawn;


function checksum (str, algorithm, encoding) {
	return crypto
		.createHash(algorithm || 'md5')
		.update(str, 'utf8')
		.digest(encoding || 'hex');
}

var ParseApplicationBundle = function(fpath, Database)
{
	console.log("PARSE = " + fpath + " APP = " + Database.app);
	console.log(" APP PATH = " + Database.app.getPath('userData'));
	
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
			CFBundleIconFile: shortname,
			CFBundlePackageType: 'APPL'
		};
	}
	
	if (!fs.existsSync(Database.app.getPath('userData') + '/cache'))
	{
		fs.mkdirSync(Database.app.getPath('userData') + '/cache');
	}
	
	if (!fs.existsSync(Database.app.getPath('userData') + '/cache/app-icons'))
	{
		fs.mkdirSync(Database.app.getPath('userData') + '/cache/app-icons');
	}
	
	// Support for Bundled Chrome Apps
	if (info.CrAppModeShortcutName)
	{
		info.CFBundleName = info.CrAppModeShortcutName;
	}
	
	console.log(JSON.stringify(info));
	console.log('ICON = ' + info.CFBundleIconFile);
	console.log('APP NAME = ' + info.CFBundleName);
	
	if (info.CFBundlePackageType != 'APPL')
	{
		return;
	}
	
	var appName = info.CFBundleName? info.CFBundleName : info.CFBundleExecutable;
	var pngIconFile = Database.app.getPath('userData') + '/cache/app-icons/' +
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
					
					
					sips.stdout.on('data', console.log);
					sips.stderr.on('data', console.error);
				}
			}
			
		}
		
		
		console.log('ADDING NEW ENTRY = ' + appName);
		
		Database.insert({
			label	: appName,
			filename: fpath,
			icon	: 'file://' + pngIconFile,
			path	: fpath,
			command	: {
				channel : 'exec:applicationbundle',
				args	: [ fpath ]
			}
		});
	});

};


var ParseApplicationsDirectory = function(path, Database)
{
	if (path.substr(path.lastIndexOf('.')) == '.app')
	{
		try
		{
			ParseApplicationBundle(path, Database);
		}
		catch (msg)
		{
			console.error('ERROR: ' + msg);
		}
		return false;
	}
	
	return true;
};


exports.apiversion = "0.0.3";

exports.initialize = function(Database)
{
	Database.explore('/Applications/', function(fpath) {
		return ParseApplicationsDirectory(fpath, Database);
	});
	Database.explore(process.env.HOME + '/Applications/', function(fpath) {
		return ParseApplicationsDirectory(fpath, Database);
	});
	Database.explore(process.env.HOME + '/Downloads/', function(fpath) {
		return ParseApplicationsDirectory(fpath, Database);
	});
};

ipc.on('exec:applicationbundle', function(event, appPath) {
	spawn('open', [appPath], {detached: true});
});
