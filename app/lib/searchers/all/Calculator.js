var util = require('util');

/**
 * Calculator!
 */

function Lexer()
{
	var findLastSpace = function(str)
	{
		var i = 0;
		
		
		while(i < str.length)
		{
			switch(str[i])
			{
				case ' ':
				case "\n":
					i++;
					break;
				default:
					return i;
			}
		}
		
		return i;
	};
	
	var findLastDigit = function(str)
	{
		var i = 0;
		
		
		while(i < str.length)
		{
			switch(str[i])
			{
				case '0':
				case '1':
				case '2':
				case '3':
				case '4':
				case '5':
				case '6':
				case '7':
				case '8':
				case '9':
				case '.':
				case ',':
					i++;
					break;
				default:
					return i;
			}
		}
		
		return i;
	};
	
	this._value_id = 0;
	
	// 2 + 5
	// 5 * 3
	
	var create_ast = function(tokens)
	{
		var vals = null, op, lval = null, val = {lval: null, op: null, rval: null};
		
		
		while ((token = tokens.shift()))
		{
			switch(token.type)
			{
				case 'operator':
					val.op = token;
					break;
				
				case 'parenthesis':
				case 'digit':
					if (val.lval === null)
					{
						val.lval = token;
						break;
					}
					
					val.rval = {
						lval: token,
						op: null,
						rval: null
					};
					
					if (vals === null)
					{
						vals = val;
					}
					val = val.rval;
					break;
			}
		}
		
		return vals;
	};
	
	this.parse = function(str)
	{
		var idx = 0;
		var tokens = [];
		var end = 0;
		var subtokens = null;
		
		
		while (idx < str.length)
		{
			idx += findLastSpace(str.substr(idx));
			switch(str[idx])
			{
				case '+':
				case '*':
				case '/':
				case '-':
					tokens.push({'type': 'operator', 'operator': str[idx]});
					idx++;
					break;
				case '0':
				case '1':
				case '2':
				case '3':
				case '4':
				case '5':
				case '6':
				case '7':
				case '8':
				case '9':
				case '.':
				case ',':
					end = findLastDigit(str.substr(idx));
					tokens.push({'type': 'digit', 'value': parseFloat(str.substr(idx, end)), 'id': this._value_id++});
					idx = idx + end;
					break;
				case '(':
					subtokens = this.parse(str.substr(idx+1));
					
					
					if (typeof subtokens.idx == 'undefined')
					{
						throw "Parse Error";
					}
					
					tokens.push({'type': 'parenthesis', 'tokens': subtokens.tokens});
					idx += subtokens.idx + 1;
					break;
				case ')':
					idx++;
					return {tokens: create_ast(tokens), idx: idx};
				default:
					throw "Illegal Expression";
			}
			
		}
		
		return create_ast(tokens);
	};
	
	var runop = function(operator, tokens)
	{
		var result = [];
		var last;
		
		
		for (val = tokens; val && val.op; )
		{
			if (val.op.operator == operator.symbol)
			{
				val.lval.value = operator.func(
					val.lval,
					val.rval.lval
				);
				
				if (val.rval)
				{
					val.op = val.rval.op;
					val.rval = val.rval.rval;
				}
			}
			else 
			{
				val = val.rval;
			}
		}
	};
	
	var calculate = function(val)
	{
		switch(val.type)
		{
			case 'digit': return val.value;
			case 'parenthesis': return exec(val.tokens);
		}
	};
	
	var exec = function(tokens)
	{
		var op = null;
		var ops = [];
		var lval = null;
		var rval = null;
		var token = null;
		var result = 0;
		var operators = [
			{symbol: '*', func: function(a, b) { return calculate(a) * calculate(b);}},
			{symbol: '/', func: function(a, b) { return calculate(a) / calculate(b);}},
			{symbol: '+', func: function(a, b) { return calculate(a) + calculate(b);}},
			{symbol: '-', func: function(a, b) { return calculate(a) - calculate(b);}}
		];
		
		
		for (var o1 = 0; o1 < operators.length && tokens.rval; o1++)
		{
			runop(operators[o1], tokens);
		}
		
		return tokens.lval.value;
	};
	
	this.exec = exec;
}

exports.apiversion = "0.0.4";

exports.calculate = function(str)
{
	var lex = new Lexer();
	var tokens = lex.parse(str);
	
	return lex.exec(tokens);
};

exports.initialize = function(Database) 
{
	var lex = new Lexer();
	
	
	Database.register(function(query, callback) {
		
		try
		{
			var tokens = lex.parse(query);
			var result = lex.exec(tokens);
			
			
			callback([{
				label: result,
				command: '',
				path: query, 
				icon: ''
			}]);
			
			return true;
		}
		catch (err)
		{
			console.log("ERR: " + err);
			callback();
			return err;
		}
	});
};
