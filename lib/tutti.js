var net = require('net'),
    fs = require('fs'),
    Version = '0.0.1'
    
function Tutti(url){
    var urlRegex = /http:\/\/([a-zA-Z.]+)(?::([0-9]+))?\/([0-9a-z]+)?/,
        match = url.match(urlRegex)
    if (!url || !(match = url.match(urlRegex))){
        throw Error('Valid Tutti URL please!')
    }
    
    var host = match[1],
        port = Number(match[2]),
        roomID = match[3],
        callbacks = {
            message: [],
            disconnect: []
        },
        socket = new net.Socket()

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
    
    var key1 = '%S39r1 164Y81S5 2{'
    var key2 = '19 79TF41 ~37wk66~p'
    var key3 = '.*...$GP'
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
                        callbacks.message.forEach(function(cb){
                            cb(line)
                        })
                    }
                }, this)
            }
        }
    }

    console.log('Connecting to ' + url)

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
    
    return {
        on: function(signal, callback){
            callbacks[signal].push(callback)
        },
        send: send
    }
    
}

exports.Tutti = Tutti