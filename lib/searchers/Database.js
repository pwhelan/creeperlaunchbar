/**
 * Holds the Database of search results.
 */
var Database = {};
var Datastore = require('nedb'),
	db = new Datastore();
var path = require('path'),
	fs = require('fs');


db.ensureIndex({ fieldName: 'compiledterms'});


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
		
		if (err) {
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
	
	entry.compiledterms = SplitTermsIntoIndexes(array_unique(entry.terms));
	
	db.insert(entry, function(err, newdoc) {
		
		if (err) {
			console.error('NeDB Insert Error: ' + err);
			return;
		}
		
		if (typeof insertcallback == 'function') {
			insertcallback({
				id: newdoc._id,
				delete: function() {
					db.remove({_id: newdoc._id});
				},
				update: function(newentry) {
					
				}
			});
		}
	});
};


function getInsertCallback(moduleID) {
	return function(entry) {
		entry.searcherID = moduleID;
		Database.insert(entry);
	};
}

function getSearchCallback(moduleID) {
	return function(query, callback) {
		
		if (typeof query == 'string') {
			query = { compiledterms: query };
		}
		
		query.searcherID = moduleID;
		db.find(query, callback);
	};
}

function getDeleteCallback(moduleID) {
	return function(query, callback) {
		
		if (typeof query == 'string') {
			query = { compiledterms: query };
		}
		
		query.searcherID = moduleID;
		db.remove(query, callback);
	};
}


function getLoadSearchModules(sdir) {
	return function(err, files) {
		
		if (err) {
			console.error('Unable to read modules: ' + err);
			return;
		}
		
		for (var i = 0; i < files.length; i++) {
			
			var moduleName = files[i].substr(0, files[i].lastIndexOf('.'));
			var fqmn = path.join(sdir, moduleName).replace(path.sep, '.');
			
			
			console.log('LOADING SEARCH MODULE ' + fqmn + ' (' + sdir.replace(path.sep, '.') + '/' + moduleName + ')');
			
			var searcher = require('./' + sdir + '/' + moduleName);
			
			
			switch (searcher.apiversion) {
			case "0.0.2":
				searcher.initialize({
					insert:	getInsertCallback(fqmn),
					find:	getSearchCallback(fqmn)
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


var platform = ( process.platform == 'darwin' ? 'osx' : process.platform );
var searcherDirs = [
	'all',
	platform
];

for (var i = 0; i < searcherDirs.length; i++)
{
	fs.readdir(
		path.join(__dirname,  searcherDirs[i]),
		getLoadSearchModules(searcherDirs[i])
	);
}

exports.search = Database.search;
exports.load = function(dir)
{
	fs.readdir(dir, getLoadSearchModules(dir));
};
