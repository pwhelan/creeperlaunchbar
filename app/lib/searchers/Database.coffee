###
Holds the Database of search results.
###

path = require('path')
fs = require('fs')
Q = require('q')
exploreDirectory = (require '../exploreDirectory').exploreDirectory
app = (require 'electron').app
_ = require 'underscore'


class Database
	constructor: () ->
		searcherDirs = [
			'all'
			if process.platform == 'darwin' then 'osx' else process.platform
		]
		
		@searches = [@dbsearch];
		
		@db = new (require 'nedb') {
			filename: app.getPath('userData') + '/database.nedb'
		}
		
		@db.loadDatabase (err) =>
			@db.ensureIndex {fieldName: 'filename', unique: true}
			
			@db.remove {persistent: false}, {multi: true}, (err, numrows) =>
				
				@db.persistence.setAutocompactionInterval 300000
				fs.readdir path.join(__dirname,  dir), @getLoadSearchModules(app, dir) \
					for dir in searcherDirs
				
				@db.persistence.compactDatafile()
	
	closest: (q, a, b) ->
		[q, a, b] = [q.toLowerCase(), a.toLowerCase(), b.toLowerCase()]
		for i in [0..q.length]
			if a[i] == q[i] && b[i] != q[i] then return -1
			if a[i] != q[i] && b[i] == q[i] then return 1
		return 0
	
	alphabetical: (a, b) ->
		[a, b] = [a.toLowerCase(), b.toLowerCase()]
		for i in [0..Math.min(a.length, b.length)]
			if a.charCodeAt(i) > b.charCodeAt(i) then return 1
			if a.charCodeAt(i) < b.charCodeAt(i) then return -1
		return 0
	
	dbsearch: (query, cb) =>
		if query.length <= 0 then return cb []
		
		rgx = new RegExp '^' + (query.replace /[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), "i"
		@db.find {terms: rgx}, (err, results) =>
			if err
				console.error 'NeDB error: ' + err
				return cb []
			
			if query.length >= 3
				results.sort (a, b) =>
					if closest = @closest query, a.label, b.label then return closest
					if alphabetical = @alphabetical a.label, b.label then return alphabetical
					
					if closest = @closest query, a.path, b.path then return closest
					if alphabetical = @alphabetical a.path, b.path then return alphabetical
					
					if a.label.length < b.label.length then return -1
					if a.label.length > b.label.length then return 1
					
					if a.path.length < b.path.length then return -1
					if a.path.length > b.path.length then return 1
					
					return 0
			
			cb results
	
	search: (query, cb) =>
		
		doSearch = (search) ->
			d = Q.defer()
			search query, (results) ->
				d.resolve results
			return d.promise
		
		Q.allSettled((doSearch search for search in @searches)).then (resultsets) ->
			
			cb (_
				.chain resultsets
				.filter (resultset) ->
					return typeof resultset.value != 'undefined'
				.map (resultset) ->
					return resultset.value
				.flatten()
				.value())
	
	insert: (entry, cb) ->
		camelcaseparts = _.map entry.label.split /(SQL|JSON|[A-Z]+[a-z]+)|\s|\_/, (part) ->
			part.trim()
		
		entry.terms = [entry.label.toLowerCase()]
		
		if 'filename' of entry then entry.terms.push \
			(path.basename entry.filename).substr 0, \
				(path.basename entry.filename).lastIndexOf('.')
		
		entry.terms = entry.terms.concat _.filter(camelcaseparts, () ->
			part.length > 0 and not part.toLowerCase() in ['a', 'of', 'the']
		)
		
		@db.insert entry, (err, doc) =>
			if err
				if err.errorType == 'uniqueViolated'
					@db.update {_id: entry._id}, entry, {}, (err, numReplaced) ->
						return
				
				console.error 'NeDB Insert Error: ' + err.message
				return
			
			if typeof cb == 'function'
				cb {
					id: doc._id
					remove: () =>
						@db.remove {_id: doc._id}
					update: (entry) =>
						return
				}
	
	load: () -> true
	
	getInsertCallback: (moduleID, persistent) =>
		return (entry, callback) =>
			entry.searcherID = moduleID
			entry.persistent = if typeof(persistent) != 'undefined' \
				then persistent else false
			@insert entry, callback
	
	getSearchCallback: (moduleID) =>
		return (query, callback) =>
			@db.find {
				terms: rgx = new RegExp \
					"^" + query.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), \
					"i"
				searcherID: moduleID
			}, callback
	
	getDeleteCallback: (moduleID) =>
		return (query, callback) =>
			@db.remove {
				terms: rgx = new RegExp \
					"^" + query.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), \
					"i"
				searcherID: moduleID
			}, callback
	
	getExploreCallback: (moduleID) =>
		return (directory, callback) =>
			exploreDirectory(
				directory,
				(fpath, dcallback) =>
					#console.log "EXPLORING = " + fpath
					@db.count(
						{filename: fpath, searcherID: moduleID},
						(err, count) =>
							if (count > 0)
								#console.log "OLD ENTRY FOUND"
								return
							
							#console.log "ADDING NEW ENTRY ..."
							if callback(fpath) then dcallback()
					)
					
					true
				,
				true
			)
	
	getLoadSearchModules: (app, sdir) =>
		return (err, files) =>
			
			if err then return console.error 'Unable to read modules: ' + err
			
			for file in files
				ext = file.substr file.lastIndexOf('.')
				if ext != '.js' then continue
				
				moduleName = file.substr 0, file.lastIndexOf('.')
				fqmn = path.join(sdir, moduleName).replace path.sep, '.'
				
				#console.log 'LOADING SEARCH MODULE ' + fqmn + ' (' + sdir.replace(path.sep, '.') + '/' + moduleName + ')'
				searcher = require './' + sdir + '/' + moduleName
				
				switch searcher.apiversion
					when "0.0.4"
						searcher.initialize {
							register: (callback) =>
								#console.log("REGISTER SEARCH...");
								@searches.push callback
							explore: @getExploreCallback(fqmn)
							insert:	@getInsertCallback(fqmn, true)
							find:	@getSearchCallback(fqmn)
							app:	app
						}
					when "0.0.3"
						searcher.initialize {
							explore:@getExploreCallback(fqmn)
							insert:	@getInsertCallback(fqmn, true)
							find:	@getSearchCallback(fqmn)
							app:	app
						}
					when "0.0.2"
						searcher.initialize {
							insert:	@getInsertCallback(fqmn)
							find:	@getSearchCallback(fqmn)
							app:	app
						}
					when "0.0.1"
						searcher.initialize getInsertCallback(fqmn)

module.exports = new Database
