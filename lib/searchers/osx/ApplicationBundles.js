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


var Applications = {
	add: function() {
		console.log('Missing Add callback');
	}
};


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
	
	console.log(JSON.stringify(info));
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
					
					console.log('GENERATING PNG FROM ICONFILE = ' + icnsIconFile);
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
		
		//Applications[appName[0].toUpperCase()].push({
		Applications.add({
			label	: appName,
			icon	: 'file://' + pngIconFile,
			path	: fpath,
			command	: {
				channel : 'exec:application',
				args	: [ fpath ]
			}
		});
	});

};


var ParseApplicationsDirectory = function(path) {
	
	if (path.substr(path.lastIndexOf('.')) == '.app') {
		console.log('BUNDLE = ' + path);
		ParseApplicationBundle(path);
		
		return false;
	}
	
	return true;
};

exploreDirectory('/Applications/', ParseApplicationsDirectory);
exploreDirectory('/Users/pwhelan/Applications/', ParseApplicationsDirectory);
exploreDirectory('/Users/pwhelan/Downloads/', ParseApplicationsDirectory);


exports.initialize = function(callback) {
	Applications.add = callback;
};

ipc.on('exec:application', function(event, appPath) {
	spawn('open', [appPath], {detached: true});
});
