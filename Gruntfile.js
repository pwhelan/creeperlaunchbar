module.exports = function(grunt) {
	
	var AppFiles = [
		'main.js',
		'index.html',
		'lib/*.js',
		'lib/**/*.js'
	];
	
	grunt.initConfig({
		'download-atom-shell': {
			version: '0.16.0',
			outputDir: 'binaries',
			downloadDir: 'cache/atom-shell-download/'
		},
		watch: {
			'atom-shell': {
				files: AppFiles,
				tasks: ['atom-shell:restart']
			}
		},
		copy: {
			appbundle: {
				files: [{
					expand: true,
					cwd: 'binaries/Atom.app/',
					src: [
						'Contents/Info.plist',
						'Contents/PkgInfo',
						'Contents/MacOS/Atom',
						'Contents/Resources',
						'Contents/Frameworks/Atom Framework.framework/Atom Framework',
						'Contents/Frameworks/Atom Framework.framework/Libraries/*.so',
						'Contents/Frameworks/Atom Framework.framework/Libraries/*.dylib',
						'Contents/Frameworks/Atom Framework.framework/Resources/**',
						'Contents/Frameworks/Atom Framework.framework/Versions/**',
						'Contents/Frameworks/Atom Helper EH.app/**',
						'Contents/Frameworks/Atom Helper NP.app/**',
						'Contents/Frameworks/Atom Helper.app/**',
						'Contents/Frameworks/Mantle.framework/**',
						'Contents/Frameworks/ReactiveCocoa.framework/**',
						'Contents/Frameworks/Squirrel.framework/**',
					],
					dest: 'build/Creeper.app/',
					process: function(contents, srcpath, dstpath) {
						var fs = require('fs');
						var stat = fs.lstat(srcpath);
						
						if (stat.isSymbolicLink()) {
							return false;
						}
						
						return true;
					}
				}]
			}
		}
	});
	
	grunt.loadNpmTasks('grunt-download-atom-shell');
	grunt.loadNpmTasks('grunt-contrib-watch');
	grunt.loadNpmTasks('grunt-contrib-copy');
	
	grunt.registerTask('atom-shell:start', 'Run Launchdd', function() {
		
		if (!grunt.file.exists('./console/')) {
			grunt.file.mkdir('./console');
		}
		
		var fs = require('fs');
		
		try {
			var oldpid = fs.readFileSync('./console/atom-shell.pid');
			if (oldpid) {
				try {
					process.kill(parseInt(oldpid), 0);
				}
				catch(err) {
					console.log('Atom Shell already running');
					return;
				}
			}
		}
		catch(err) {
		}
		
		var out = fs.openSync('./console/err.log', 'a'),
			err = fs.openSync('./console/out.log', 'a');
		
		var atomshell = grunt.util.spawn({
			cmd: (process.platform == 'darwin' ?
				'./binaries/Atom.app/Contents/MacOS/Atom' :
				'./binaries/atom'),
			args: ['./'],
			opts: {
				detached: true,
				stdio: [ 'ignore', err, out ]
			}
		});
		
		console.log('Running Atom Shell in ' + atomshell.pid);
		fs.writeFileSync('./console/atom-shell.pid', atomshell.pid + "\n", {flag: "w+"});
	});
	
	grunt.registerTask('atom-shell:stop', 'Kill Launchdd', function() {
		
		if (!grunt.file.exists('./console/')) {
			return;
		}
		
		var fs = require('fs');
		try {
			var oldpid = fs.readFileSync('./console/atom-shell.pid');
			if (oldpid) {
				try {
					process.kill(parseInt(oldpid), 'SIGTERM');
					console.log('Shut down Atom Shell running with pid ' + parseInt(oldpid));
				}
				catch(err) {
					console.log('Atom Shell is not running');
					return;
				}
				finally {
					fs.unlinkSync('./console/atom-shell.pid');
				}
			}
		}
		catch (err) {}
	});
	
	grunt.registerTask('atom-shell:restart', ['atom-shell:stop', 'atom-shell:start']);
	
	grunt.registerTask('build', 'Build Application', function() {
		
		if (!grunt.file.exists('./build/')) {
			grunt.file.mkdir('./build/');
		}
		
		var tasks = ['download-atom-shell'];
		
		if (process.platform == 'darwin')
		{
			tasks.push('copy:appbundle');
			tasks.push('build:appbundle');
		}
		
		grunt.task.run(tasks);
	});
	
	grunt.registerTask('build:appbundle', 'Build Application', function() {
		
		if (!grunt.file.exists('build/Creeper.app'))
		{
			
		}
		
		var baseAppDir = './build/Creeper.app/Contents/Resources/app';
		var path = require('path');
		
		
		if (!grunt.file.exists(baseAppDir)) {
			grunt.file.mkdir(baseAppDir);
		}
		
		var files = grunt.file.expand(AppFiles);
		for (var n in files)
		{
			if (!grunt.file.exists(baseAppDir + '/' + path.dirname(files[n])))
			{
				grunt.file.mkdir(baseAppDir + '/' + path.dirname(files[n]));
			}
			
			grunt.file.copy(
				files[n],
				baseAppDir + '/' + files[n]
			);
		}
	});
	
};
