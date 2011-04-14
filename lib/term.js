var net = require('net'),
    readline = require('readline'),
    socket = new net.Socket(),
    fs = require('fs'),
    state = 'init',
    Version = '0.0.3'

function printUsage(){
    console.log('Usage:')
    console.log('    tuttiterm <tutti_room_url>')
    console.log()
    console.log('See http://tutti.tobyho.com for info on Tutti.')
}

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
var key1 = '%S39r1 164Y81S5 2{'
var key2 = '19 79TF41 ~37wk66~p'
var key2 = '.*...$GP'
var initData = 'GET /socket.io/websocket HTTP/1.1\n\
Upgrade: WebSocket\n\
Connection: Upgrade\n\
Sec-WebSocket-Key1: ' + key1 + '\n\
Sec-WebSocket-Key2: ' + key2 + '\n\
Host: localhost\n\
\n\
' + key3
var states = {
    init: {
        'connect': function(){
            socket.write(initData)
        },
        'data': function(data){
            this.__proto__ = states.init2
        }
    },
    init2: {
        'data': function(){
            var login = {
                browser: 'Tuttiterm ' + Version
            }
            if (roomID)
                login.roomID = roomID
            var msg = {login: login}
            var data = encode(JSON.stringify(msg))
            socket.write(data)
            this.__proto__ = states.loggedIn
        }
    },
    loggedIn: {
        'data': function(data){
            var msgs = String(this.lastMsg + data).split('\ufffd')
            this.lastMsg = msgs.pop()
            msgs.forEach(function(line){
                if (line[0] == '\u0000')
                    line = line.substr(1)
                line = decode(line).join('')

                if (line.substr(0, 3) === '~h~'){
                    var data = '~h~' + line.substr(3)
                    socket.write(encode(data))
                }
                else if (line.trim().length > 0){
                    this.displayMessage(line)
                    rli.prompt()
                }
            }, this)
        }
    }
}



var ctrl = {
    lastMsg: '',
    needPrompt: true,
    send: function(data){
        socket.write(encode(JSON.stringify(data)))
    },
    displayMessage: function(msg){
        try{
            rli.output.cursorTo(0)
            rli.output.clearLine(1)
            msg = JSON.parse(msg)
            if ('announcement' in msg)
                writeln(yellow(msg.announcement.replace(/<br>/g, '')))
            else if('command' in msg)
                writeln('> ' + msg.command)
            else if('reply' in msg)
                writeln(yellow(msg.browser + ' => ') + green(msg.reply))
            else if('console' in msg)
                writeln(yellow(msg.browser + ' : ') + cyan(msg.console))
            else if('error' in msg)
                writeln(yellow(msg.browser + ' => ') + red(msg.error))
            else if('browsers' in msg)
                writeln(yellow('Logged in browsers: ' + 
                    (msg.browsers.join(', ') || 'none')))
        }catch(e){}
    },
    __proto__: states.init
}

var url = process.ARGV[2],
    urlRegex = /http:\/\/([a-zA-Z.]+)(?::([0-9]+))?\/([0-9a-z]+)?/,
    match
if (!url || !(match = url.match(urlRegex))){
    printUsage()
    process.exit(0)
}

var host = match[1],
    port = Number(match[2]),
    roomID = match[3]

console.log('Connecting to ' + url)

socket.connect(port, host)
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

var rli = readline.createInterface(process.stdin, process.stdout, function(){})
rli.on('line', function(cmd){
    if (cmd === 'exit'){
        writeln('Bye!')
        process.exit(0)
    }else if (cmd.match(/^load (.*)$/)){
        var m = cmd.match(/^load (.*)$/)
        fs.readFile(m[1], function(err, data){
            ctrl.send({command: String(data)})
        })
    }else if (cmd == 'reset'){
        ctrl.send({reset: true})
    }else{
        ctrl.send({command: cmd})
    }
    rli.prompt()
})
rli.setPrompt('> ')
process.stdin.resume()
