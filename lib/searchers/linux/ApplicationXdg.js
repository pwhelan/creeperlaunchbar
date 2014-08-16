/**
 * Allow execution of Application Bundles on Mac OSX.
 *
 */
var exploreDirectory = require('../../exploreDirectory').exploreDirectory,
        fs = require('fs'),
        path = require('path'),
        ipc = require('ipc'),
        crypto = require('crypto');
        spawn = require('child_process').spawn;

var desktopEntry = require('desktop-entry');

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


var ParseDesktopEntry = function(fpath)
{
        var iconpaths = [
                '/usr/share/icons/default',
                '/usr/share/icons/gnome',
                '/usr/share/icons/handhelds',
                '/usr/share/icons/hicolor',
                '/usr/share/icons/DMZ-Black',
                '/usr/share/icons/DMZ-White',
                '/usr/share/icons/HighContrast',
                '/usr/share/icons/Humanity',
                '/usr/share/icons/Humanity-Dark',
                '/usr/share/icons/locolor',
                '/usr/share/icons/LoginIcons',
                '/usr/share/icons/redglass',
                '/usr/share/icons/ubuntu-mono-dark',
                '/usr/share/icons/ubuntu-mono-light',
                '/usr/share/icons/unity-icon-theme',
                '/usr/share/icons/unity-webapps-applications',
                '/usr/share/icons/whiteglass'
        ];

        desktopEntry.load({
                entry: fpath,
                onSuccess:function(model) {
                        var entry = model["Desktop Entry"];
                        var iconPath = null;
                        var iconPathTry = null;
                        
                        
                        if (entry.NoDisplay)
                        {
                                console.log('SKIP (NODISPLAY) = ' + entry.Name + ' path=' + fpath);
                                return;
                        }

                        if (entry.Type != 'Application')
                        {
                                console.log('SKIP (!APPLICATION) = ' + entry.Name + ' path=' + fpath);
                                return;
                        }
                        
                        if (!entry.Exec)
                        {
                                console.log('SKIP (!EXEC) = ' + entry.Name + ' path=' + fpath);
                                return;
                        }
                        
                        if (entry.OnlyShowIn)
                        {
                                console.log('SKIP (' + entry.OnlyShowIn + ') = ' + entry.Name + ' path=' + fpath);
                                return;
                        }
                        
                        // Ignore weird compatability program from Ubuntu
                        if (entry.Exec == 'checkbox-gui')
                        {
                                return;
                        }
                        
                        if (entry.Icon)
                        {
                                if (entry.Icon.indexOf('.') > 0)
                                {
                                        entry.Icon = entry.Icon.substr(0, entry.Icon.lastIndexOf('.')-1);
                                }
                                
                                if (fs.existsSync('/usr/share/pixmaps/' + entry.Icon + '.png'))
                                {
                                        iconPath = '/usr/share/pixmaps/' + entry.Icon + '.png';
                                }
                                else {
                                        for (var f in iconpaths) {
                                                iconPathTry = iconpaths[f] + '/48x48/apps/' + entry.Icon + '.png';
                                                if (fs.existsSync(iconPath))
                                                {
                                                        break;
                                                }
                                        }
                                }

                                Applications.add({
                                        label	: entry.Name,
                                        icon	: iconPath,
                                        path	: path.normalize(fpath),
                                        command	: {
                                                channel : 'exec:applicationxdg',
                                                args	: [ entry.Exec.split(/\s/)[0] ]
                                        }
                                });
                        }
                },
                onError:function(errorMessage) {// handle error here
                        console.error("ERROR LOADING DESKTOP ENTRY '" + fpath + "' :"  + errorMessage);
                }
        });

        /*
        {
                label	: appName,
                icon	: 'file://' + pngIconFile,
                path	: fpath,
                command	: {
                        channel : 'exec:applicationxdg',
                        args	: [ fpath ]
                }

        };
        */
};


var ParseApplicationsDirectory = function(path)
{
        if (path.substr(path.lastIndexOf('.')) == '.desktop') {
                ParseDesktopEntry(path);
        }

        return true;
};


exports.initialize = function(callback) {
        Applications.add = callback;
        exploreDirectory(
                '/usr/share/applications/',
                ParseApplicationsDirectory
        );
};

ipc.on('exec:applicationxdg', function(event, appPath) {
        console.log('XDG SPAWN: ' + appPath);
        spawn('/bin/bash', ['-c', appPath], {detached: true});
});
