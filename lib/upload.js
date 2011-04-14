var net = require('net'),
    fs = require('fs'),
    socket = new net.Socket(),
    state = 'init',
    Version = '0.0.3'

function red(s){ return ["\033[31m", s, "\033[0m"].join('') }
function green(s){ return ["\033[32m", s, "\033[0m"].join('') }
function cyan(s){ return ["\033[36m", s, "\033[0m"].join('') }
function yellow(s){ return ["\033[33m", s, "\033[0m"].join('') }
function blue(s){ return ["\033[34m", s, "\033[0m"].join('') }

function isArray(obj){
	return Object.prototype.toString.call(obj) === '[object Array]'
}

function stringify(message){
	if (Object.prototype.toString.call(message) == '[object Object]'){
		return '~j~' + JSON.stringify(message);
	} else {
		return String(message);
	}
}

var frame = '~m~'

function encode(messages){
	var ret = '', message,
			messages = isArray(messages) ? messages : [messages];
	for (var i = 0, l = messages.length; i < l; i++){
		message = messages[i] === null || messages[i] === undefined ? '' : stringify(messages[i]);
		ret += frame + message.length + frame + message;
	}
	return '\u0000' + ret + '\ufffd';
}

function decode(data){
	var messages = [], number, n;
	do {
		if (data.substr(0, 3) !== frame) return messages;
		data = data.substr(3);
		number = '', n = '';
		for (var i = 0, l = data.length; i < l; i++){
			n = Number(data.substr(i, 1));
			if (data.substr(i, 1) == n){
				number += n;
			} else {	
				data = data.substr(number.length + frame.length);
				number = Number(number);
				break;
			} 
		}
		messages.push(data.substr(0, number)); // here
		data = data.substr(number);
	} while(data !== '');
	return messages;
}

function writeln(msg){
    console.log(msg)
}

var initData = 'GET /socket.io/websocket HTTP/1.1\n\
Upgrade: WebSocket\n\
Connection: Upgrade\n\
Sec-WebSocket-Key1: %S39r1 164Y81S5 2{\n\
Sec-WebSocket-Key2: 19 79TF41 ~37wk66~p\n\
Host: localhost\n\
\n\
.*...$GP'

function startTransfer(){
    fs.readFile('public/javascripts/jquery.js', function(err, data){
        ctrl.send(data)
        //socket.destroy()
    })
}


var ctrl = {
    lastMsg: '',
    needPrompt: true,
    send: function(data){
        var encoded = encode(String(data))
        console.log('encoded: ' + encoded)
        socket.write(encoded)
    },
    'connect': function(){
        socket.write(initData)
    },
    'data': function(data){
        console.log('Start Transfer')
        startTransfer()
    }
}


socket.connect(8080, 'localhost')
ctrl.connect()
socket.on('data', function(data){
    if (ctrl.data)
        ctrl.data(data)
})
socket.on('end', function(){
    if (ctrl.end)
        ctrl.end()
    console.log('\nDisconnected!')
    process.exit(0)
})
