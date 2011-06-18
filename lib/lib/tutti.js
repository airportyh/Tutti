var net = require('net'),
    fs = require('fs'),
    Version = '0.0.1',
    util = require('util'),
    tq = require('./taskqueue'),
    isa = require('./isa').isa

Array.prototype.last = function(){
    return this[this.length - 1]
}

function log(){
    util.debug.apply(util, arguments)
}

function guid() {
    var S4 = function() {
       return (((1+Math.random())*0x10000)|0).toString(16).substring(1);
    };
    return (S4()+S4()+S4()+S4()+S4()+S4());
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
			messages = messages instanceof Array ? messages : [messages];
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

function Tutti(url){
    var urlRegex = /http:\/\/([a-zA-Z.]+)(?::([0-9]+))?(?:\/([0-9a-z]+))?/,
        match = url.match(urlRegex)
    if (!url || !(match = url.match(urlRegex))){
        throw Error('Valid Tutti URL please!')
    }
    
    var host = match[1],
        port = Number(match[2]),
        roomID = match[3],
        callbacks = {
            message: [],
            disconnect: [],
            connect: []
        },
        socket = new net.Socket(),
        queue = new tq.TaskQueue(),
        browsers = [],
        connected = false 
    
    function genRandomKey(len){
        var chars = '012345 67 89%{}~.*a bc defghij klmn opqr stvwxy z!@#$% ^&*()'
        var ret = ''
        for (var i = 0; i < len; i++)
            ret += chars[Math.floor((Math.random() * chars.length))]
        return ret
    }
    var key1 = genRandomKey(20)
    var key2 = genRandomKey(20)
    var key3 = genRandomKey(8)
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
                if (String(data).match(/~m~(?:[0-9]+)~m~/)){
                    this.__proto__ = states.init2
                    this.data(null)
                }else{
                    this.__proto__ = states.init2
                }
            }
        },
        init2: {
            'data': function(data){
                var login = {
                    term: 'Tutti Term ' + Version
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
                        onMessage(line)
                    }
                }, this)
            }
        }
    }
    
    function onMessage(msg){
        try{
            msg = JSON.parse(msg)
            if (!(msg instanceof Object))
                return
        }catch(e){
            return
        }
        if (msg.browsers){
            browsers = msg.browsers
            if (!connected){
                callbacks.connect.forEach(function(cb){ cb() })
                queue.start()
                connected = true
            }
        }
        callbacks.message.forEach(function(cb){
            cb(msg)
        })
        queue.onmessage(msg)
    }
    
    var ctrl = {
        lastMsg: '', __proto__: states.init
    }

    socket.connect(port, host)
    ctrl.connect()
    socket.on('data', function(data){
        if (ctrl.data)
            ctrl.data(data)
    })
    socket.on('end', function(){
        callbacks.disconnect.forEach(function(cb){ cb() })
    })
    
    function send(data){
        socket.write(encode(JSON.stringify(data)))
    }
    
    // External Interface
    
    return {
        on: function on(signal, callback){
            callbacks[signal].push(callback)
            return this
        },
        eval: function eval(cmd){
            if (isa(cmd, Function))
                cmd = '(' + String(cmd) + '())'
            queue.add(new tq.Command(cmd, function(){
                send({command: cmd})
                queue.next()
            }, this))
            if (connected) queue.start()
            return this
        },
        load: function load(){
            var self = this
            var args
            if (isa(arguments[0], Array))
                args = arguments[0]
            else
                args = Array.prototype.slice.apply(arguments)
            args.forEach(function(localFile){
                queue.add(new tq.Command('load ' + localFile, function(){
                    fs.readFile(localFile, function(err, data){
                        send({load: String(data), filename: localFile})
                        queue.next()
                    })
                }))
            })
            if (connected) queue.start()
            return this
        },
        reset: function reset(){
            queue.add(new tq.Command('reset', function(){
                send({command: ':reset'})
                queue.next()
            }, this))
            if (connected) queue.start()
            return this
        },
        wait: function(type, matcher, timeout){
            queue.add(new tq.WaitCommand(
                function(){
                    return browsers.map(function(b){return b.sessionId}
                )}, 
                type, matcher, timeout))
            if (connected) queue.start()
            return this
        },
        exit: function(){
            queue.add(new tq.Command('exit', function(){
                process.exit()
            }))
            if (connected) queue.start()
            return this
        },
        disconnect: function(){
            queue.add(new tq.Command('disconnect', function(){
                socket.destroy()
                queue.next()
            }))
            if (connected) queue.start()
            return this
        }
    }
    
}

exports.Tutti = Tutti