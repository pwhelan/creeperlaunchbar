/**
 * Holds the Database of search results.
 */
var Database = {};


var DatabaseSearch = function(query)
{
	var results = [];
	var resmatrix = {};
	
	
	if (query.length <= 0)
	{
		return results;
	}
	
	query = query.toUpperCase();
	
	var space = Database[(query[0].toUpperCase())];
	if (!space)
	{
		return results;
	}
	
	for (var i = 0; i < space.length; i++)
	{
		var label = space[i].label.substr(0, query.length).toUpperCase();
		if (label == query)
		{
			resmatrix[space[i].label] = space[i];
			continue;
		}
		
		if (query.length >= 2)
		{
			var term = space[i].term.substr(0, query.length).toUpperCase();
			if (term == query)
			{
				resmatrix[space[i].label] = space[i];
			}
		}
	}
	
	for (var key in resmatrix) {
		results.push(resmatrix[key]);
	}
	
	
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
		
		return 0;
	});
	
	return results;
};


var DatabaseIndex = function() {
	this.push.apply(this, arguments);
	return this;
};

DatabaseIndex.prototype = Object.create(Array.prototype);

DatabaseIndex.prototype.getUniqueByKey = function(key) {
	var u = {}, a = [];
	for(var i = 0, l = this.length; i < l; ++i){
		if(u.hasOwnProperty(this[i][key])) {
			continue;
		}
		a.push(this[i]);
		u[this[i][key]] = 1;
	}
	return a;
};

for (var i = 0; i <= 9; i++) {
	Database[i] = new DatabaseIndex();
}

for (var i = 'A'.charCodeAt(0); i <= 'Z'.charCodeAt(0); i++) {
	Database[String.fromCharCode(i)] = new DatabaseIndex();
}


require('./osx/ApplicationBundles').initialize(function(entry) {
	var part;
	var camelcaseparts = entry.label.split(/(SQL|JSON|[A-Z]+[a-z]+)|\s|\_/);
	
	
	entry.term = entry.label;
	Database[entry.label[0].toUpperCase()].push(entry);
	
	
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
