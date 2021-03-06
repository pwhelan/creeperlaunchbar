/**
 * Holds the Database of search results.
 */
var Database = {};
var Datastore = require('nedb'), db;
var path = require('path'),
	fs = require('fs'),
	Q = require('q');

var exploreDirectory = require('../exploreDirectory').exploreDirectory;


Database.search = function(query, callback)
{
	// Return no results for empty query
	if (query.length <= 0)
	{
		return callback([]);
	}
	
	// Remove casing from the query
	rgx = new RegExp(
		'^' + query.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), "i"
	);
	
	// Match any of the terms with the full query as a plain string.
	db.find({terms: rgx }, function(err, results) {
		
		if (err) {
			callback();
			console.error('NeDB error: ' + err);
			return;
		}
		
		// Sort results Alphabetically
		results.sort(function(a, b) {
			var i;
			
			
			// Cheat and sort first by similarity to atual query
			for (i = 0; i < query.length; i++) {
				if (a.label[i].toLowerCase() == query[i])
				{
					if (b.label[i].toLowerCase() != query[i])
					{
						return -1;
					}
				}
				
				if (b.label[i].toLowerCase() == query[i])
				{
					if (a.label[i].toLowerCase() != query[i])
					{
						return 1;
					}
				}
			}
			
			// Sort Alphabetically
			for (i = 0; i < b.label.length && i < a.label.length; i++) {
				if (a.label.charCodeAt(i) > b.label.charCodeAt(i)) {
					return 1;
				}
				if (b.label.charCodeAt(i) > a.label.charCodeAt(i)) {
					return -1;
				}
			}
			
			// Sort by shortest first
			if (a.label.length < b.label.length)
			{
				return -1;
			}
			
			if (a.label.length > b.label.length)
			{
				return 1;
			}
			
			// Sort by shortest path first
			if (a.path.length < b.path.length)
			{
				return -1;
			}
			
			if (a.path.length > b.path.length)
			{
				return 1;
			}
			
			return 0;
		});
		
		callback(results);
	});
	
};

array_unique = function(arr, key)
{
	var u = {}, a = [];
	for(var i = 0, l = arr.length; i < l; ++i){
		if(u.hasOwnProperty(arr[i])) {
			continue;
		}
		a.push(arr[i]);
		u[arr[i]] = 1;
	}
	return a;
};


function SplitTermIntoIndexes(term)
{
	var terms = [];
	
	
	for (var i = 0; i <= term.length; i++) {
		terms.push(term.substr(0, i));
	}
	
	return terms;
}

function SplitTermsIntoIndexes(terms)
{
	var splits = [];
	
	
	for (var i = 0; i < terms.length; i++) {
		var split = SplitTermIntoIndexes(terms[i]);
		for (var x = 0; x < split.length; x++) {
			splits.push(split[x]);
		}
	}
	
	return splits;
}

Database.insert = function(entry, insertcallback)
{
	var part;
	var camelcaseparts = entry.label.split(/(SQL|JSON|[A-Z]+[a-z]+)|\s|\_/);
	
	
	entry.terms = [];
	entry.terms.push(entry.label.toLowerCase());
	
	
	if ('filename' in entry) {
		var filename = path.basename(entry.filename);
		filename = filename.substr(0, filename.lastIndexOf('.'));
		
		entry.terms.push(filename);
	}
	
	do {
		part = camelcaseparts.shift();
		
		if (part) part = part.trim();
		if (!part || part.length <= 0) {
			continue;
		}
		
		switch(part.toLowerCase()) {
		case 'OF':
		case 'THE':
		case 'A':
			break;
		default:
			entry.terms.push(part.toLowerCase());
		}
		
	} while (camelcaseparts.length > 0);
	
	
	db.insert(entry, function(err, newdoc) {
		
		if (err) 
		{
			if (err.errorType == 'uniqueViolated')
			{
				db.update({_id: entry._id}, entry, {}, function(err, numReplaced) {
					
				});
			}
			else
			{
				console.error('NeDB Insert Error: ' + err.message);
			}
			return;
		}
		
		if (typeof insertcallback == 'function') {
			insertcallback({
				id: newdoc._id,
				remove: function() {
					db.remove({_id: newdoc._id});
				},
				update: function(newentry) {
					
				}
			});
		}
	});
};


function getInsertCallback(moduleID, persistent)
{
	return function(entry, callback) {
		entry.searcherID = moduleID;
		entry.persistent = typeof(persistent) !== 'undefined' ?
			persistent : false;
		Database.insert(entry, callback);
	};
}

function getSearchCallback(moduleID)
{
	return function(query, callback) {
		
		if (typeof query == 'string') {
			
			rgx = new RegExp(
				"^" + query.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), 
				"i"
			);
			
			query = { terms: rgx };
		}
		
		query.searcherID = moduleID;
		db.find(query, callback);
	};
}

function getDeleteCallback(moduleID)
{
	return function(query, callback) {
		
		if (typeof query == 'string') {
			
			rgx = new RegExp(
				"^" + query.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), 
				"i"
			);
			
			query = { terms: rgx };
		}
		
		query.searcherID = moduleID;
		db.remove(query, callback);
	};
}

function getExploreCallback(moduleID)
{
	return function(directory, callback) {
		exploreDirectory(
			directory,
			function(fpath, dcallback) {
				console.log("EXPLORING = " + fpath);
				db.count(
					{filename: fpath, searcherID: moduleID},
					function (err, count) {
						if (count > 0)
						{
							console.log("OLD ENTRY FOUND");
							return;
						}
						
						console.log("ADDING NEW ENTRY ...");
						var rc = callback(fpath);
						if (rc)
						{
							console.log("dig deeper...");
							dcallback();
						}
					}
				);
				
				return true;
			},
			true
		);
	};
}

function getLoadSearchModules(app, sdir) {
	return function(err, files) {
		
		if (err) {
			console.error('Unable to read modules: ' + err);
			return;
		}
		var ext;
		
		for (var i = 0; i < files.length; i++) 
		{
			ext = files[i].substr(files[i].lastIndexOf('.'));
			if (ext != '.js')
			{
				continue;
			}
			
			var moduleName = files[i].substr(0, files[i].lastIndexOf('.'));
			var fqmn = path.join(sdir, moduleName).replace(path.sep, '.');
			
			
			console.log('LOADING SEARCH MODULE ' + fqmn + ' (' + sdir.replace(path.sep, '.') + '/' + moduleName + ')');
			
			var searcher = require('./' + sdir + '/' + moduleName);
			
			
			switch (searcher.apiversion) {
			case "0.0.4":
				searcher.initialize({
					register: function(callback)
					{
						console.log("REGISTER SEARCH...");
						Database.searches.push(callback);
					},
					explore:getExploreCallback(fqmn),
					insert:	getInsertCallback(fqmn, true),
					find:	getSearchCallback(fqmn),
					app:	app
				});
				break;
				
			case "0.0.3":
				searcher.initialize({
					explore:getExploreCallback(fqmn),
					insert:	getInsertCallback(fqmn, true),
					find:	getSearchCallback(fqmn),
					app:	app
				});
				break;
			
			case "0.0.2":
				searcher.initialize({
					insert:	getInsertCallback(fqmn),
					find:	getSearchCallback(fqmn),
					app:	app
				});
				break;
				
			case "0.0.1":
				searcher.initialize(getInsertCallback(fqmn));
				break;
				
			default:
				console.error("Unknown Searcher API Version: " + searcher.apiversion);
				return;
			}
		}
	};
}


Database.searches = [Database.search];


exports.search = function(query, callback)
{
	var qs = [];
	var d = null;
	
	
	for (var s = 0; s < Database.searches.length; s++)
	{
		(function(qs, d, m) {
			
			qs.push(d.promise);
			Database.searches[s](query, function(results) {
				d.resolve(results);
			});
			
		}(qs, Q.defer(), s));
		
	}
	
	
	Q.allSettled(qs).then(function(results) {
		
		var res = [];
		
		
		for (var i = 0; i < results.length; i++)
		{
			if (!results[i].value)
			{
				continue;
			}
			
			for (var r = 0; r < results[i].value.length; r++)
			{
				res.push(results[i].value[r]);
			}
		}
		
		callback(res);
	});
};

exports.load = function(dir)
{
	fs.readdir(dir, getLoadSearchModules(dir));
};

exports.start = function(app)
{
	var dbFile = app.getPath('userData') + '/database.nedb';
	
	var platform = ( process.platform == 'darwin' ? 'osx' : process.platform );
	var searcherDirs = [
		'all',
		platform
	];
	
	
	db = new Datastore({ filename: dbFile });
	db.loadDatabase(function(err) {
		
		db.ensureIndex({fieldName: 'filename', unique: true});
		
		db.remove({persistent: false}, {multi: true}, function(err, numrows) {
			
			console.log("REMOVED OLD ENTRIES = " + numrows + " err: " + err);
			
			db.persistence.setAutocompactionInterval(300000);
			for (var i = 0; i < searcherDirs.length; i++)
			{
				fs.readdir(
					path.join(__dirname,  searcherDirs[i]),
					getLoadSearchModules(app, searcherDirs[i])
				);
			}
			
			db.persistence.compactDatafile();
		});
	});
};
