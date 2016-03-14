var screen = require('screen'),
	util = require('util');

module.exports = function()
{
	var display = screen.getPrimaryDisplay();
	var displays = screen.getAllDisplays();
	var cursor = screen.getCursorScreenPoint();
	
	
	for (var i = 0; i < displays.length; i++)
	{
		if (
			cursor.x >= displays[i].bounds.x &&
			cursor.x <= displays[i].bounds.x + displays[i].bounds.width
		)
		{
			display = displays[i];
		}
	}
	
	console.log(util.inspect({
		display: display,
		displays: displays,
		cursor: cursor
	}, {depth: 100}));
	
	
	return {
		x: display.bounds.x + ((display.bounds.width * 0.20) / 2),
		y: 100,
		w: display.bounds.width - (display.bounds.width * 0.20),
		h: display.bounds.height - (84 * 2)
	};
};
