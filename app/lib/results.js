function template_results(locals) {
var jade_debug = [ new jade.DebugItem( 1, "app/template/results.jade" ) ];
try {
var buf = [];
var jade_mixins = {};
var jade_interp;
;var locals_for_with = (locals || {});(function (icon, label, number, path) {
jade_debug.unshift(new jade.DebugItem( 0, "app/template/results.jade" ));
jade_debug.unshift(new jade.DebugItem( 1, "app/template/results.jade" ));
buf.push("<a" + (jade.attr("id", "result-" + number, true, false)) + " class=\"clearfix list-group-item\">");
jade_debug.unshift(new jade.DebugItem( undefined, jade_debug[0].filename ));
jade_debug.unshift(new jade.DebugItem( 2, "app/template/results.jade" ));
buf.push("<img width=\"58\" height=\"58\"" + (jade.attr("src", icon, true, false)) + " class=\"pull-left\"/>");
jade_debug.shift();
jade_debug.unshift(new jade.DebugItem( 3, "app/template/results.jade" ));
buf.push("<div style=\"margin-left:5px;overflow:hidden;white-space:nowrap;max-width:560px\" class=\"pull-left\">");
jade_debug.unshift(new jade.DebugItem( undefined, jade_debug[0].filename ));
jade_debug.unshift(new jade.DebugItem( 9, "app/template/results.jade" ));
buf.push("<h4>");
jade_debug.unshift(new jade.DebugItem( undefined, jade_debug[0].filename ));
jade_debug.unshift(new jade.DebugItem( 10, "app/template/results.jade" ));
buf.push("<span style=\"color:black\">" + (jade.escape(null == (jade_interp = label) ? "" : jade_interp)));
jade_debug.unshift(new jade.DebugItem( undefined, jade_debug[0].filename ));
jade_debug.shift();
buf.push("</span>");
jade_debug.shift();
jade_debug.shift();
buf.push("</h4>");
jade_debug.shift();
jade_debug.unshift(new jade.DebugItem( 11, "app/template/results.jade" ));
buf.push("<div>" + (jade.escape(null == (jade_interp = path) ? "" : jade_interp)));
jade_debug.unshift(new jade.DebugItem( undefined, jade_debug[0].filename ));
jade_debug.shift();
buf.push("</div>");
jade_debug.shift();
jade_debug.shift();
buf.push("</div>");
jade_debug.shift();
jade_debug.unshift(new jade.DebugItem( 12, "app/template/results.jade" ));
buf.push("<div class=\"pull-right\">");
jade_debug.unshift(new jade.DebugItem( undefined, jade_debug[0].filename ));
jade_debug.unshift(new jade.DebugItem( 13, "app/template/results.jade" ));
if ( number <= 9)
{
jade_debug.unshift(new jade.DebugItem( 14, "app/template/results.jade" ));
jade_debug.unshift(new jade.DebugItem( 14, "app/template/results.jade" ));
buf.push("&#8984 " + (jade.escape((jade_interp = number) == null ? '' : jade_interp)) + "");
jade_debug.shift();
jade_debug.shift();
}
jade_debug.shift();
jade_debug.shift();
buf.push("</div>");
jade_debug.shift();
jade_debug.shift();
buf.push("</a>");
jade_debug.shift();
jade_debug.shift();}.call(this,"icon" in locals_for_with?locals_for_with.icon:typeof icon!=="undefined"?icon:undefined,"label" in locals_for_with?locals_for_with.label:typeof label!=="undefined"?label:undefined,"number" in locals_for_with?locals_for_with.number:typeof number!=="undefined"?number:undefined,"path" in locals_for_with?locals_for_with.path:typeof path!=="undefined"?path:undefined));;return buf.join("");
} catch (err) {
  jade.rethrow(err, jade_debug[0].filename, jade_debug[0].lineno, "a.clearfix.list-group-item(id=\"result-\" + number)\n\timg.pull-left(width=\"58\", height=\"58\", src=icon)\n\t.pull-left(style={\n\t\t'margin-left': '5px',\n\t\toverflow: 'hidden',\n\t\t'white-space': 'nowrap',\n\t\t'max-width' : '560px'\n\t})\n\t\th4\n\t\t\tspan(style={color: 'black'})= label\n\t\tdiv= path\n\t.pull-right\n\t\tif number <= 9\n\t\t\t| &#8984 #{number}\n");
}
}