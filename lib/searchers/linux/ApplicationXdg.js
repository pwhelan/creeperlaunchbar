/**
 * Allow execution of Application Bundles on Mac OSX.
 *
 */
var fs = require('fs'),
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

var XDG = {
        entries: {}
};


var ParseDesktopEntry = function(fpath, Database)
{
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
                        
                        
                        if (entry.NoDisplay && fpath.substr(0, process.env.HOME.length) != process.env.HOME.length)
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
                        
                        if (entry.Icon)
                        {
                                if (fs.existsSync(entry.Icon)) {
                                        iconPath = entry.Icon;
                                        if (entry.Icon.indexOf('.') > 0)
                                        {
                                                var ext = entry.Icon.substr(entry.Icon.lastIndexOf('.'));
                                                if (ext != 'jpg' && ext != 'png')
                                                {
                                                        iconPath = process.env.HOME + '/.config/creeper/cache/app-icons/' + checksum(entry.Icon) + '.png';
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
                                                entry.Icon = entry.Icon.substr(0, entry.Icon.lastIndexOf('.'));
                                        }
                                        
                                        for (var f in iconpaths) {
                                                iconPathTry = iconpaths[f] + '/48x48/apps/' + entry.Icon + '.png';
                                                if (fs.existsSync(iconPathTry))
                                                {
                                                        iconPath = iconPathTry;
                                                        break;
                                                }
                                        }
                                        
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
                                                                iconPath = process.env.HOME + '/.config/creeper/cache/app-icons/' + checksum(entry.Icon) + '.png';
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
                                                iconPath = process.env.HOME + '/.config/creeper/cache/app-icons/' + checksum(entry.Icon) + '.png';
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
                                
                                
                                Database.insert({
                                        label	: entry.Name,
                                        filename: fpath,
                                        icon	: iconPath,
                                        path	: path.normalize(fpath),
                                        command	: {
                                                channel : 'exec:applicationxdg',
                                                args	: entry.Exec.split(/\s/)
                                        }
                                }, function(entry) {
                                        console.log("ADDING XDG ENTRY = " + fpath + " = " + JSON.stringify(entry));
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
        if (filepath.substr(filepath.lastIndexOf('.')) == '.desktop') {
                ParseDesktopEntry(filepath, Database);
        }
        else {
                fs.lstat(filepath, function(err, stat) {
                        
                        if (err) {
                                console.error("stat error: " + JSON.stringify(err));
                                return;
                        }
                        
                        if (stat.isDirectory())
                        {
                                fs.watch(filepath, function(event, file) {
                                        
                                        if (event == 'rename') {
                                                fs.exists(filepath + '/' + file, function(exists) {
                                                        var fpath = path.normalize(filepath + '/' + file);
                                                        
                                                        
                                                        if (!exists) {
                                                                if (fpath in XDG.entries) {
                                                                        console.log("REMOVING!");
                                                                        XDG.entries[fpath].remove();
                                                                        delete XDG.entries[fpath];
                                                                }
                                                                else {
                                                                        console.log("CANNOT FIND " + fpath + " IN ");
                                                                        console.log(XDG.entries);
                                                                }
                                                        }
                                                        else {
                                                                ParseApplicationsDirectory(fpath, Database);
                                                        }
                                                });
                                        }
                                        else {
                                                
                                        }
                                        
                                });
                        }
                });
        }
        
        return true;
};


exports.apiversion = "0.0.3";

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

ipc.on('exec:applicationxdg', function(event, appPath) {
        spawn('/bin/bash', ['-c', appPath], {detached: true});
});
