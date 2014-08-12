/**
 * Holds the Database of search results.
 */
var Database = {};
var Datastore = require('nedb'),
	db = new Datastore();

db.ensureIndex({ fieldName: 'terms'});


var DatabaseSearch = function(query, callback)
{
	if (query.length <= 0)
	{
		return callback([]);
	}
	
	query = query.toUpperCase();
	
	
	db.find({terms: query }, function(err, results) {
		
		// Sort results Alphabetically
		results.sort(function(a, b) {
			var i;
			
			
			// Cheat and sort first by similarity to atual query
			for (i = 0; i < query.length; i++) {
				if (a.label[i].toUpperCase() == query[i])
				{
					if (b.label[i].toUpperCase() != query[i])
					{
						return -1;
					}
				}
				
				if (b.label[i].toUpperCase() == query[i])
				{
					if (a.label[i].toUpperCase() != query[i])
					{
						return 1;
					}
				}
			}
			
			// Sort Alphabetically
			for (i = 0; i < b.label.length && i < a.label.length; i++) {
				if (a.label.charCodeAt(i) > b.label.charCodeAt(i)) {
					return -1;
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

function InsertSearchEntries(entry)
{
	var part;
	var camelcaseparts = entry.label.split(/(SQL|JSON|[A-Z]+[a-z]+)|\s|\_/);
	
	
	entry.terms = [];
	entry.terms.push(entry.label.toUpperCase());
	
	do {
		part = camelcaseparts.shift();
		
		if (part) part = part.trim();
		if (!part || part.length <= 0) {
			continue;
		}
		
		switch(part.toUpperCase()) {
		case 'OF':
		case 'THE':
		case 'A':
			break;
		default:
			entry.terms.push(part.toUpperCase());
		}
		
	} while (camelcaseparts.length > 0);
	
	entry.terms = SplitTermsIntoIndexes(array_unique(entry.terms));
	
	db.insert(entry);
}

require('./osx/ApplicationBundles').initialize(InsertSearchEntries);

exports.search = DatabaseSearch;

/*
require('./lib/searchers/osx/ChromeTabs').initialize(function(entry) {
	entry.term = entry.label;
	console.log('ENTRY');
	console.log(entry);
	Database[entry.label[0].toUpperCase()].push(entry);
});
*/
