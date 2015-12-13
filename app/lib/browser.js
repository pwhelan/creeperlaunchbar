var ipc = require('ipc');
window.$ = window.jQuery = require('jquery');


function ExecuteCommand(node)
{
	var command = node.data('command');
	if (!command || !command.channel || !command.args)
	{
		console.error('Node does not have correct command format');
		return;
	}
	
	ipc.send(command.channel, command.args);
	
	$('#query').val('');
	$('#results').hide().html('');
	
	ipc.send('hide-window');
	ipc.send('resize', $('body').height());
}

function ScrollToNode(parent, child)
{
	if (child.offset().top > parent.height())
	{
		parent.scrollTop(
			parent.scrollTop() +
			(
				child.offset().top -
				parent.height()
			)
		);
	}
	else if (child.offset().top < child.height())
	{
		parent.scrollTop(
			parent.scrollTop() -
			(
				(child.offset().top * -1) +
				child.outerHeight()
			)
		);
	}
}


var repeatkeys = {};


$('body').on('keydown', function(ev) {
	
	if (!ev.metaKey) {
		if (ev.which == 13) {
			return false;
		}
		else if (ev.which == 27) {
			return false;
		}
		if ((ev.which >= 37 && ev.which <= 40) || (ev.which == 33 || ev.which == 34)) {
			
			var active = $('#results .active.list-group-item');
			
			
			if (ev.which >= 37 && ev.which <= 40) {
				
				
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
				
				active = $('#results .active.list-group-item');
				ScrollToNode($('#results'), active);
				
				return false;
			}
			// page down
			else if (ev.which ==  34 || ev.which) {
				var step = 7;
				var results = $('#results .list-group-item');
				var ith = 0;
				var stepTo = null;
				
				$.each(results, function(i, node) {
					if (node === active[0]) {
						ith = i;
					}
				});
				
				switch (ev.which) {
					// Page Up
					case 33:
						console.log("SCROLL DOWN " + ith + " -> " + Math.max(ith-step, 0));
						ith = Math.max(ith-step, 0);
						stepTo = $(results[ith]);
						break;
					// Page Down
					case 34:
						console.log("SCROLL DOWN " + ith + " -> " + Math.min(ith+step, results.length-1));
						ith = Math.min(ith+step, results.length-1);
						stepTo = $(results[ith]);
						break;
				}
				
				active.removeClass('active');
				stepTo.addClass('active');
				ScrollToNode($('#results'), stepTo);
			}
			
			repeatkeys[ev.which] = setInterval(
				function() {
					$('body').keydown(ev);
				},
				500
			);
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
	else if ((ev.which >= 37 && ev.which <= 40) || (ev.which == 33 || ev.which == 34)) {
		
		clearInterval(repeatkeys[ev.which]);
		
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

ipc.on('set-max-height', function(maxHeight) {
	$('body').css('max-height', maxHeight);
	$('#results').css('max-height', maxHeight - 80);
});

ipc.on('results', function(results) {
	
	var resnum = 0;
	var active = $('#results .active').data('result');
	
	
	$('#results').html(
		$.map(results, function(result) {
			resnum++;
			var resultNode = $('<a class="clearfix"/>')
				.attr('id', 'result-' + resnum)
				.addClass('list-group-item')
				.append(
					'<img class="pull-left" width="58" height="58" src="' + result.icon + '"/>' +
					'<div class="pull-left" style="margin-left: 5px;overflow:hidden;white-space:nowrap;max-width:560px">' +
						'<h4>' +
							'<span style="color:black">' +
								result.label +
							'</span>' +
						'</h4>' +
						'<div>' + result.path + '</div>' +
					'</div>' +
					'<div class="pull-right">' +
						(resnum <= 9 ?
							'&#8984;' + resnum : '' ) +
					'</div>'
				)
				.data('command', result.command)
				.data('result', result);
			
			if (active)
			{
				console.log('WE HAVE ACTIVE=' + active.path + ' -> ' + active.label);
				if (active.path == result.path && active.label == result.label)
				{
					resultNode.addClass('active');
				}
				else
				{
					console.log('NOT THE SAME = ' + result.path + ' -> ' + result.label);
				}
			}
			
			return resultNode;
		})
	);
	
	$('body').height(80 + $('#results').height());
	$('#results li:first').addClass('active');
	
	setTimeout(function() {
		$('#results').show(function() {
			
			ipc.send('resize', $('body').height());
			active = $('#results .active.list-group-item');
			
			if (active.length > 0)
			{
				setTimeout(function() {
					ScrollToNode($('#results'), active);
				}, 100);
			}
		});
	}, 50);
});

$('#results').on('click', '.list-group-item', function(ev) {
	
	var target = $((ev.target ? ev.target : ev.currentTarget));
	
	// Recurse up four levels since delegated calls handle
	// the actual node clicked instead of the one matching
	// the query.
	for (var i = 0; i < 4; i++)
	{
		if (target.hasClass('list-group-item'))
		{
			break;
		}
		target = target.parent();
	}
	
	if (!target.hasClass('list-group-item'))
	{
		console.error('Unable to find matching node for click event');
		return;
	}
	
	ExecuteCommand(target);
});
