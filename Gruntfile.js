module.exports = function(grunt) {
	
	var when = require('when');
	
	var AppFiles = [
		'app/main.js',
		'app/index.html',
		'app/lib/*.js',
		'app/lib/**/*.js'
	];
	
	grunt.initConfig({
		watch: {
			'electron': {
				files: AppFiles,
				tasks: ['electron:restart']
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
					src: [process.cwd() + '/build/darwin/electron/Creeper.app/Contents/Resources/app'],
					dest: process.cwd() + '/build/darwin/electron/Creeper.app/Contents/Resources/default_app'
				}]
			},
			'app-osx': {
				files: [{
					src: [process.cwd() + '/build/darwin/electron/Electron.app'],
					dest: process.cwd() + '/build/darwin/electron/Creeper.app'
				}]
			}
		},
		exec: {
			'zip-app-osx': {
				cwd: process.cwd() + '/build/darwin/electron/',
				cmd: 'zip -r Creeper.app.zip Creeper.app'
			}
		},
		clean: {
			osxdefault: [process.cwd() + '/build/darwin/electron/Electron.app/Contents/Resources/default_app']
		},
		'build-electron-app': {
			options: {
				platforms: ["darwin", "linux64"]
			}
		}
	});
	
	grunt.loadNpmTasks('grunt-contrib-watch');
	grunt.loadNpmTasks('grunt-install-dependencies');
	grunt.loadNpmTasks('grunt-exec');
	grunt.loadNpmTasks('grunt-contrib-rename');
	grunt.loadNpmTasks('grunt-contrib-clean');
	grunt.loadNpmTasks('grunt-electron-app-builder');
	
	grunt.registerTask('electron:start', 'Run Launchdd', function() {
		
		if (!grunt.file.exists('./console/')) {
			grunt.file.mkdir('./console');
		}
		
		var fs = require('fs');
		
		try {
			var oldpid = fs.readFileSync('./console/electron.pid');
			if (oldpid) {
				try {
					process.kill(parseInt(oldpid), 0);
				}
				catch(err) {
					console.log('Electron is already running');
					return;
				}
			}
		}
		catch(err) {
		}
		
		var out = fs.openSync('./console/err.log', 'a'),
			err = fs.openSync('./console/out.log', 'a');
		
		var electron = grunt.util.spawn({
			cmd: 'electron',
			args: ['./app'],
			opts: {
				detached: true,
				stdio: [ 'ignore', err, out ]
			}
		});
		
		console.log('Running Electron in ' + electron.pid);
		fs.writeFileSync('./console/electron.pid', electron.pid + "\n", {flag: "w+"});
	});
	
	grunt.registerTask('electron:stop', 'Kill Launchdd', function() {
		
		if (!grunt.file.exists('./console/')) {
			return;
		}
		
		var fs = require('fs');
		try {
			var oldpid = fs.readFileSync('./console/electron.pid');
			if (oldpid) {
				try {
					process.kill(parseInt(oldpid), 'SIGTERM');
					console.log('Shut down Electron running with pid ' + parseInt(oldpid));
				}
				catch(err) {
					console.log('Electron is not running');
					return;
				}
				finally {
					fs.unlinkSync('./console/electron.pid');
				}
			}
		}
		catch (err) {}
	});
	
	grunt.registerTask('electron:restart', ['electron:stop', 'electron:start']);
	
	grunt.registerTask('generate-icns', 'Generate ICNS File OSX App', function() {
		var done = this.async();
		var sizes = [ 512, 128, 32, 16 ];
		var pExec = [];
		var files = [];
		
		
		grunt.file.mkdir('build/icons');
		grunt.file.mkdir('build/icons/Creeper.iconset');
		
		
		for (var i = 0; i < sizes.length; i++) {
			
			var size = sizes[i];
			files[i] = 'build/icons/Creeper.iconset/icon_' + size + 'x' + size + '.png';
			
			
			pExec.push(when.promise(function(resolve, reject) {
				
				switch (process.platform) {
				case 'darwin':
					grunt.util.spawn({
						cmd: 'sips',
						args: [
							'-z', size, size,
							'app/media/img/Minecraft_Creeper_2-64x64.png',
							'--out', files[i]
						],
					},
					function() {
						resolve(1);
					});
					break;
				case 'linux':
					grunt.util.spawn({
						'cmd': 'convert',
						args: [
							'app/media/img/Minecraft_Creeper_2-64x64.png',
							'-resize', size+'x'+size,
							files[i]
						]
					},
					function() {
						resolve(1);
					});
					break;
				}
				
			}));
		}
		
		when.all(pExec).then(function() {
			var finished = function() {
				grunt.file.copy(
					'build/icons/Creeper.icns', 
					'build/darwin/electron/Creeper.app/Contents/Resources/atom.icns'
				);
				done();
			};
			
			switch (process.platform) {
			case 'darwin':
				grunt.util.spawn({
					cmd: 'iconutil',
					args:['-c', 'icns', 'build/icons/Creeper.iconset']
				},
				finished);
				break;
				
			case 'linux':
				grunt.util.spawn({
					cmd: 'png2icns',
					args: ['build/icons/Creeper.icns'].concat(files)
				},
				finished);
				break;
			}
		});
	});
	
	grunt.registerTask('build', [
		'install-dependencies',
		'build-electron-app',
		'clean:osxdefault',
		'rename:app-osx',
		'generate-icns',
		'rename:app-osx-packaged-app',
		'exec:zip-app-osx'
	]);
	
	grunt.registerTask('default', ['install-dependencies', 'electron:start']);
};
