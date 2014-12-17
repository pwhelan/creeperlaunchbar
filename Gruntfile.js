module.exports = function(grunt) {
	
	var AppFiles = [
		'app/main.js',
		'app/index.html',
		'app/lib/*.js',
		'app/lib/**/*.js'
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
		'build-atom-shell-app': {
			options: {
				platforms: ["darwin", "linux64"],
				atom_shell_version: "v0.16.0"
			}
		}
	});
	
	grunt.loadNpmTasks('grunt-download-atom-shell');
	grunt.loadNpmTasks('grunt-contrib-watch');
	grunt.loadNpmTasks('grunt-atom-shell-app-builder');
	
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
			args: ['./app'],
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
	
	grunt.registerTask('build', ['build-atom-shell-app']);
	
};
