/**
 * Allow execution of Application Bundles on Mac OSX.
 *
 */
var ipc = require('ipc');


exports.apiversion = "0.0.4";

exports.initialize = function(Database) 
{
	Database.register(function(query, callback) {
		
		var m = null;
		if (query.length > 0)
		{
			m = query.match(/^((\(|)[\d\.]+((|\()\s*(|\()(|\()(\+|\-|\/|\%|\*|\()\s*([\d\.]+|)(\)|))*)*\s*$/);
		}
		
		if (m)
		{
			var calculation = "";
			try
			{
				calculation = eval(m[0]);
				
				
				return callback([{
					label: calculation,
					command: '',
					path: m[0], 
					icon: ''
				}]);
			}
			catch (err)
			{
				//console.log(err);
				return callback([]);
			}
		}
		
		return callback([]);
	});
};
