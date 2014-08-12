/**
 * Holds the Database of search results.
 */
var Database = {};
var Datastore = require('nedb'),
	db = new Datastore();


var DatabaseSearch = function(query, callback)
{
	if (query.length <= 0)
	{
		return callback([]);
	}
	
	query = query.toUpperCase();
	var exp = new RegExp('^' + query);
	
	
	db.find({ $or: [ {terms: { $regex: exp }}, {terms: query}]}, function(err, results) {
		
		// Sort results Alphabetically
		results.sort(function(a, b) {
			
			// Cheat and sort first by similarity to atual query
			if (a.label[0].toUpperCase() == query[0])
			{
				if (b.label[0].toUpperCase() != query[0])
				{
					return 1;
				}
			}
			
			if (b.label[0].toUpperCase() == query[0])
			{
				if (a.label[0].toUpperCase() != query[0])
				{
					return 1;
				}
			}
			
			// Sort Alphabetically
			for (var i = 0; i < b.label.length && i < a.label.length; i++) {
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
				return 1;
			}
			
			if (a.label.length > b.label.length)
			{
				return -1;
			}
			
			// Sort by shortest path first
			if (a.path.length < b.path.length)
			{
				return 1;
			}
			
			if (a.path.length > b.path.length)
			{
				return -1;
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
		
		if (Database[part[0].toUpperCase()]) {
			Database[part[0].toUpperCase()].push({
				label: entry.label,
				icon: entry.icon,
				term: part,
				path: entry.path,
				command: {
					channel: entry.command.channel,
					args: entry.command.args
				}
			});
		}
		
	} while (camelcaseparts.length > 0);
	
});

exports.search = DatabaseSearch;

/*
require('./lib/searchers/osx/ChromeTabs').initialize(function(entry) {
	entry.term = entry.label;
	console.log('ENTRY');
	console.log(entry);
	Database[entry.label[0].toUpperCase()].push(entry);
});
*/
