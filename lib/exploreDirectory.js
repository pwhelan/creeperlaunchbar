var fs = require('fs'),
	path = require('path');

// original gist: https://gist.github.com/825583
// I've added support for empty directories
// i.e. when `start` dir was empty callback was not fired,
// now it is fired like this: callback(null, {dirs: [], files: []})
function exploreDirectory(start, callback, async) {
	// Use lstat to resolve symlink if we are passed a symlink
	fs.lstat(start, function(err, stat) {
		if(err) {
			return false;
		}
		
		function isDir(abspath, file) {
			fs.stat(abspath, function(err, stat) {
				if (err) {
					return false;
				}
				if(stat.isDirectory()) {
					if (async)
					{
						callback(
							abspath,
							function() {
								exploreDirectory(abspath, callback, async);
							}
						);
					}
					else
					{
						var rc = callback(abspath);
						if (rc) {
							exploreDirectory(abspath, function(file) {
								if (file[0] != '/')
									return callback(abspath + '/' + file);
								else
									return callback(file);
							});
						}
					}
				}
				else {
					if (async)
					{
						callback(abspath, function() {
							exploreDirectory(abspath, callback, async);
						});
					}
					else callback(abspath);
				}
			});
		}
		
		// Read through all the files in this directory
		if(stat.isDirectory()) {
			fs.readdir(start, function (err, files) {
				for(var x=0, l=files.length; x<l; x++) {
					isDir(path.join(start, files[x]));
				}
			});
		}
	});
}

exports.exploreDirectory = function(start, callback, async)
{
	if (async)
	{
		callback(start, function() {
			exploreDirectory(start, callback, async);
		});
	}
	else
	{
		if (!callback(start))
		{
			return;
		}
		
		exploreDirectory(start, callback);
	}
};
