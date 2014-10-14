/**
 * Holds the Database of search results.
 */
var Database = {};
var Datastore = require('nedb'), db;
var path = require('path'),
	fs = require('fs'),
	_ = require('underscore');
var exploreDirectory = require('../exploreDirectory').exploreDirectory


Database.search = function(query, callback)
{
	// Return no results for empty query
	if (query.length <= 0)
	{
		return callback([]);
	}
	
	// Remove casing from the query
	query = query.toLowerCase();
	
	// Match any of the terms with the full query as a plain string.
	db.find({compiledterms: query }, function(err, results) {
		
		if (err)
		{
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

Database.insert = function(entry, insertcallback)
{
	entry.terms = [];
	entry.terms.push(entry.label.toLowerCase());
	
	
	// Split the label by spaces, changes in case and special keywords
	entry.terms.concat(entry.label.split(/(SQL|JSON|[A-Z]+[a-z]+|\s|\_)/));
	
	// Since NeDB does not support Full Text Search we simulate it using
	// an extra column called 'compiledterms' that is an array built from
	// strings that include each term at all their possible lengths.
	entry.compiledterms =
		_.chain(entry.label
			.split(/(SQL|JSON|[A-Z]+[a-z]+|\s|\_)/)
		)
		.compact()
		// Remove stop words.
		.filter(function(term) {
			switch(term.toLowerCase()) {
			case 'of':
			case 'the':
			case 'a':
				return false;
			default:
				return true;
			}
		})
		// Create arrays with the terms in a separate group
		// and in a group where each is sequentially appended.
		// This is to create all the searchable combinations
		.reduce(
			function(res, term) {
				res[0].single.push(term);
				if (res[0].compound.length > 0)
				{
					res[0].compound.push(
						res[0].compound[res[0].compound.length-1] +
						term
					);
				}
				else
				{
					res[0].compound.push(term);
				}
				
				return res;
			},
			// Workaround _.reduce by stuffing the results into
			// an object inside a single member array.
			[{single: [], compound: []}]
		)
		.reduce(function(res, term) {
			res = term.single.concat(term.compound);
			return res;
		}, [])
		// Create a version of each string that contains each letter
		// appended... ie: ABC = ["A", "AB", "ABC"].
		.reduce(function(res, term) {
			for (var i = 1; i <= term.length; i++)
			{
				res.push(term.substr(0, i));
			}
			
			return res;
		}, [])
		.map(function(term) {
			return term.toLowerCase();
		})
		.uniq()
		.value();
	
	// Add the filename as one of the terms (minus the extension).
	if ('filename' in entry)
	{
		var filename = path.basename(entry.filename);
		if (filename.lastIndexOf('.') != -1)
		{
			filename = filename.substr(0, filename.lastIndexOf('.'));
		}
		
		entry.terms.push(filename);
	}
	
	
	db.insert(entry, function(err, newdoc) {
		
		if (err)
		{
			console.error('NeDB Insert Error: ' + err);
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
			query = { compiledterms: query };
		}
		
		query.searcherID = moduleID;
		db.find(query, callback);
	};
}

function getDeleteCallback(moduleID) 
{
	return function(query, callback) {
		
		if (typeof query == 'string') {
			query = { compiledterms: query };
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
			function(fpath) { 
				console.log("EXPLORING = " + fpath);
				db.count(
					{filename: fpath, searcherID: moduleID},
					function (err, count) {
						if (count <= 0)
						{
							console.log("COUNT = " + count);
							callback(fpath);
						}
					}
				);
				
				return true;
			}
		);
	}
}


var searchers = {};

// Load all the Modules in the top directory specified by sdir. No attempt
// is made to make this search recursive to allow modules to have their own
// sub components.
function getLoadSearchModules(app, sdir) {
	return function(err, files) {
		
		if (err)
		{
			console.error('Unable to read modules: ' + err);
			return;
		}
		
		for (var i = 0; i < files.length; i++) {
			
			if (files[i].lastIndexOf('.') == -1)
			{
				continue;
			}
			
			var moduleName = files[i].substr(0, files[i].lastIndexOf('.'));
			var fqmn = path.join(sdir, moduleName).replace(path.sep, '.');
			var modulePath = 'lib/searchers/' + sdir + '/' + files[i];
			
			
			fs.stat(modulePath, function(err, stat) {
				
				if (err)
				{
					console.error(err);
					return;
				}
				
				if (!stat.isFile())
				{
					return;
				}
				
				console.log('LOADING SEARCH MODULE ' + fqmn + ' (' + sdir.replace(path.sep, '.') + '/' + moduleName + ')');
				
				var searcher = require('./' + sdir + '/' + moduleName);
				searchers[fqmn] = searcher;
				
				
				switch (searcher.apiversion) {
				case "0.0.4":
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
			});
		}
	};
}

exports.search = Database.search;
exports.load = function(dir)
{
	fs.readdir(dir, getLoadSearchModules(dir));
};

exports.start = function(app)
{
	var dbFile = app.getDataPath() + '/database.nedb';
	
	var platform = ( process.platform == 'darwin' ? 'osx' : process.platform );
	var searcherDirs = [
		'all',
		platform
	];
	
	
	db = new Datastore({ filename: dbFile });
	db.loadDatabase(function(err) {
		
		db.remove({persistent: false}, {multi: true}, function(err, numrows) {
			
			console.log("REMOVED OLD ENTRIES = " + numrows + " err: " + err);
			
			db.persistence.setAutocompactionInterval(300000);
			db.ensureIndex({ fieldName: 'compiledterms'});
			
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
}

exports.getcontext = function(id, callback)
{
	console.log("CONTEXT FOR: " + id);
	
	db.find(
		{_id: id},
		function(err, docs) {
			if (err)
			{
				console.error("DBError: " + err.message);
				return;
			}
			
			var entry = docs[0];
			var searcher = searchers[entry.searcherID];
			
			
			if (searcher.apiversion == "0.0.4")
			{
				searcher.getContext(entry, callback);
			}
		}
	);
	
};
