/*******************************************************************************
 * Access the Zeitgeist log to get the activity log for a program to list it   *
 * when pressing the left keyboard key.                                        *
 *                                                                             *
 * No idea still how this will look like or even behave......................  *
 ******************************************************************************/

var dbus = require('dbus-native'),
	_ = require('underscore'),
	session = dbus.sessionBus();

var zeitgeist = session.getService('org.gnome.zeitgeist.Engine');

exports.findevents = function(appentry, callback)
{
	zeitgeist.getInterface(
		'/org/gnome/zeitgeist/log/activity',
		'org.gnome.zeitgeist.Log',
		function (err, ZeitgeistLog)
		{
			ZeitgeistLog.FindEvents([
				0,
				new Date().getTime()
			],
			[[
				[
					"",
					"" + (new Date().getTime()),
					"",
					"",
					appentry,
					""
				],
				[[
					"",
					"",
					"",
					"",
					"",
					"",
					"",
					//"",
					""
				]],
				[]
			]],
			2,	// StorageState
			100,	// Number of Results
			0, 	// Order = MostRecentEvents
			function(err, eventlogs) {
				
				callback(_.map(eventlogs, function(eventlog) {
					return {
						id: 		eventlog[0][0],
						timestamp: 	eventlog[0][1],
						type: 		eventlog[0][2],
						ontology: 	eventlog[0][3],
						application: 	eventlog[0][4],
						data: {
							url:		eventlog[1][0][0],
							type:		eventlog[1][0][1],
							interpretation:	eventlog[1][0][2],
							directoryurl:	eventlog[1][0][3],
							mime:		eventlog[1][0][4]
						}
					};
				}));
			});
		}
	);
};
