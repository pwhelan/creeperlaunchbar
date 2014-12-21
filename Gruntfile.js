module.exports = function(grunt) {
	
	var when = require('when');
	
	var AtomShellVersion = "0.17.0";
	
	var AppFiles = [
		'app/main.js',
		'app/index.html',
		'app/lib/*.js',
		'app/lib/**/*.js'
	];
	
	grunt.initConfig({
		'download-atom-shell': {
			version: AtomShellVersion,
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
				atom_shell_version: "v" + AtomShellVersion
			}
		},
		'install-dependencies': {
			options: {
				cwd: 'app'
			}
		},
		'rename': {
			'app-osx-packaged-app': {
				files: [{
					src: [process.cwd() + '/build/darwin/atom-shell/Creeper.app/Contents/Resources/app'],
					dest: process.cwd() + '/build/darwin/atom-shell/Creeper.app/Contents/Resources/default_app'
				}]
			},
			'app-osx': {
				files: [{
					src: [process.cwd() + '/build/darwin/atom-shell/Atom.app'],
					dest: process.cwd() + '/build/darwin/atom-shell/Creeper.app'
				}]
			}
		},
		exec: {
			'zip-app-osx': {
				cwd: process.cwd() + '/build/darwin/atom-shell/',
				cmd: 'zip -r Creeper.app.zip Creeper.app'
			}
		},
		clean: {
			osxdefault: [process.cwd() + '/build/darwin/atom-shell/Atom.app/Contents/Resources/default_app']
		}
	});
	
	grunt.loadNpmTasks('grunt-download-atom-shell');
	grunt.loadNpmTasks('grunt-contrib-watch');
	grunt.loadNpmTasks('grunt-atom-shell-app-builder');
	grunt.loadNpmTasks('grunt-install-dependencies');
	grunt.loadNpmTasks('grunt-exec');
	grunt.loadNpmTasks('grunt-contrib-rename');
	grunt.loadNpmTasks('grunt-contrib-clean');
	
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
	
	grunt.registerTask('generate-icns', 'Generate ICNS File OSX App', function() {
		var done = this.async();
		var sizes = [ 512, 128, 64, 32, 24, 16 ];
		var pExec = [];
		
		grunt.file.mkdir('build/icons');
		grunt.file.mkdir('build/icons/Creeper.iconset');
		
		
		for (var i = 0; i < sizes.length; i++) {
			
			var size = sizes[i];
			
			pExec.push(when.promise(function(resolve, reject) {
				
				grunt.util.spawn({
						cmd: 'sips',
						args: [
							'-z', size, size,
							'app/media/img/Minecraft_Creeper_2-64x64.png',
							'--out', 'build/icons/Creeper.iconset/icon_' + size + 'x' + size + '.png',
						],
					},
					function() {
						resolve(1);
					}
				);
				
			}));
		}
		
		when.all(pExec).then(function() {
			grunt.util.spawn({
					cmd: 'iconutil',
					args:['-c', 'icns', 'build/icons/Creeper.iconset']
				},
				function() {
					grunt.file.copy(
						'build/icons/Creeper.icns', 
						'build/darwin/atom-shell/Creeper.app/Contents/Resources/atom.icns'
					);
					done();
				}
			);
		});
	});
	
	grunt.registerTask('build', [
		'install-dependencies',
		'build-atom-shell-app',
		'clean:osxdefault',
		'rename:app-osx',
		'generate-icns',
		'rename:app-osx-packaged-app',
		'exec:zip-app-osx'
	]);
	
	grunt.registerTask('default', ['install-dependencies', 'atom-shell:start']);
};
