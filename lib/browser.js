var ipc = require('ipc');

window.$ = window.jQuery = require('jquery');


$('body').on('keydown', function(ev) {
	
	if (ev.which == 13) {
		return false;
	}
	else if (ev.which == 27) {
		return false;
	}
	else if (ev.which >= 37 && ev.which <= 40) {
		
		switch (ev.which) {
		// down
		case 40:
		case 38:
			return false;
		}
	}
	
	return true;
});

$('body').on('keyup', function(ev) {
	
	if (ev.which == 13) {
		var command = $('#results .active').data('command');
		ipc.send(command.channel, command.args);
		
		
		$('#query').val('');
		$('#results').html('');
		ipc.send('hide-window');
		ipc.send('resize', $('body').height());
		
		return false;
	}
	else if (ev.which == 27) {
		$('#query').val('');
		$('#results').html('');
		ipc.send('hide-window');
		return false;
	}
	else if (ev.which >= 37 && ev.which <= 40) {
		
		var active = $('#results .active.list-group-item');
		
		
		switch (ev.which) {
		// down
		case 40:
			active.removeClass('active');
			if (active.next().length) {
				active.next().addClass('active');
			}
			//else {
			//	$('#results .list-group-item:first').addClass('active');
			//}
			break;
		// up
		case 38:
			active.removeClass('active');
			if (active.prev().length) {
				active.prev().addClass('active');
			}
			//else {
			//	$('#results .list-group-item:last').addClass('active');
			//}
			break;
		}
		
		console.log('KEYPAD = ' + ev.which + ' ACTIVE = ' + active.length);
		return false;
	}
	else {
		console.log('KEY = ' + ev.which);
		ipc.send('search', $('#query').val());
		return true;
	}
});

ipc.on('show-browser', function() {
	ipc.send('resize', $('body').height());
	$('#query').focus();
});

ipc.on('results', function(results) {
	
	$('#results').html(
		$.map(results, function(result) {
			return $('<li/>')
				.addClass('list-group-item')
				.append(
					'<img width="58" height="58" src="' + result.icon + '"/>' +
					result.label
				)
				.data('command', result.command);
		})
	);
	
	$('#results li:first').addClass('active');
	ipc.send('resize', $('body').height());
});
