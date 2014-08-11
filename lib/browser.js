var ipc = require('ipc');

window.$ = window.jQuery = require('jquery');

function ExecuteCommand(node) {
	var command = node.data('command');
	ipc.send(command.channel, command.args);
	
	
	$('#query').val('');
	$('#results').hide().html('');
	
	ipc.send('hide-window');
	ipc.send('resize', $('body').height());
}

$('body').on('keydown', function(ev) {
	
	if (!ev.metaKey) {
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
	}
	else {
		// Choose a specific result
		if (ev.which >= 48 && ev.which <= 57) {
			var result = $('#results .list-group-item:nth-child('+(ev.which-48)+')');
			if (result.length > 0) {
				ExecuteCommand(result);
				return false;
			}
		}
	}
	
	//console.log('KEY = ' + ev.which + ' METAKEY = ' + ev.metaKey);
	return true;
});

$('body').on('keyup', function(ev) {
	
	if (ev.which == 13) {
		ExecuteCommand($('#results .active'));
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
			else {
				$('#results .list-group-item:first').addClass('active');
			}
			break;
		// up
		case 38:
			active.removeClass('active');
			if (active.prev().length) {
				active.prev().addClass('active');
			}
			else {
				$('#results .list-group-item:last').addClass('active');
			}
			break;
		}
		
		return false;
	}
	else {
		console.log('KEY = ' + ev.which);
		ipc.send('search', $('#query').val());
		return true;
	}
});

ipc.on('show-browser', function() {
	$('#results').hide();
	ipc.send('resize', $('body').height());
	$('#query').focus();
});

ipc.on('results', function(results) {
	
	var resnum = 0;
	
	$('#results').html(
		$.map(results, function(result) {
			resnum++;
			return $('<a/>')
				.addClass('list-group-item')
				.append(
					'<img width="58" height="58" src="' + result.icon + '"/>' +
					'&nbsp;<h1 style="display:inline">' +
						'<span style="color:black">' +
							result.label +
						'</span>' +
					'</h1>' +
					'<div class="pull-right">' +
						'&#8984;' + resnum +
					'</div>'
				)
				.data('command', result.command);
		})
	);
	
	$('#results li:first').addClass('active');
	
	setTimeout(function() {
		$('#results').show(function() {
			ipc.send('resize', $('body').height());
		});
	}, 100);
});

$('#results').on('click', '.list-group-item', function(ev) {
	ExecuteCommand($(ev.target));
});
