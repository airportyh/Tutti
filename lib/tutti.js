var net = require('net'),
    fs = require('fs'),
    Version = '0.0.1',
    util = require('util')

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

function Queue(){
    this.arr = []
}
Queue.prototype.add = function(item){
    this.arr.unshift(item)
}
Queue.prototype.remove = function(){
    return this.arr.pop()
}
Queue.prototype.peek = function(){
    return this.arr[this.arr.length - 1]
}

function BrowserQueues(){
    var browsers = {}
    return {
        browsers: browsers,
        add: function(command){
            for (var b in browsers){
                var browser = browsers[b]
                browser.queue.add(command)
                if (!browser.running)
                    this.startNext(b)
            }
            log('added command ' + command)
        },
        finish: function(browser, id){
            log(['browser', browser, 'id', id].join(' '))
            if (browsers[browser].queue.peek() && 
                browsers[browser].queue.peek().id === id){
                var cmd = browsers[browser].queue.remove()
                log('got reply for ' + cmd)
                this.startNext(browser)
            }
        },
        addBrowser: function(browser){
            browsers[browser] = {
                browser: browser,
                queue: new Queue()
            }
            //log('added browser ' + browser)
        },
        removeBrowser: function(browser){
            delete browsers[browser.sessionId]
        },
        startNext: function(browser){
            var browser = browsers[browser]
            var cmd = browser.queue.peek()
            if (cmd){
                cmd.execute()
                log('executed ' + cmd)
                if (!browser.running) browser.running = true
            }else{
                browser.running = false
            }
        }
    }
}

function Command(id, name, func, context){
    this.id = id
    this.func = func
    this.context = context
    this.name = name
}
Command.prototype.execute = function(){
    this.func.apply(this.context)
}
Command.prototype.toString = function(){
    return this.name + '[' + this.id + ']'
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

exports.BrowserQueues = BrowserQueues

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
            disconnect: [],
            connect: []
        },
        socket = new net.Socket(),
        queues = new BrowserQueues()
        
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
                //console.log('init')
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
                //console.log("logged in")
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
        msg = JSON.parse(msg)
        if (msg.id){
            queues.finish(msg.sessionId, msg.id)
        }else if (msg.browsers){
            // register browsers w the browser queues
            //console.log('browsers: ' + JSON.stringify(msg))
            msg.browsers.forEach(function(browser){
                queues.addBrowser(browser.sessionId)
            })
            if (!ctrl.connected){
                ctrl.connected = true
                callbacks.connect.forEach(function(cb){ cb() })
            }
        }
        callbacks.message.forEach(function(cb){
            cb(msg)
        })
        
    }
    
    var ctrl = {lastMsg: '', __proto__: states.init, connected: false}

    socket.connect(port, host)
    ctrl.connect()
    socket.on('data', function(data){
        if (ctrl.data)
            ctrl.data(data)
    })
    socket.on('end', function(){
        callbacks.disconnect.forEach(function(cb){ cb() })
    })
    
    // External Interface
    
    return {
        socket: socket,
        on: function on(signal, callback){
            callbacks[signal].push(callback)
            return this
        },
        send: function send(data){
            socket.write(encode(JSON.stringify(data)))
            return this
        },
        command: function command(cmd){
            var id = guid()
            queues.add(new Command(id, cmd, function(){
                this.send({command: cmd, id: id})
            }, this))
            return this
        },
        load: function load(localFile){
            var self = this
            var id = guid()
            queues.add(new Command(id, 'load ' + localFile, function(){
                fs.readFile(localFile, function(err, data){
                    self.send({command: String(data), id: id})
                })
            }))
            return this
        },
        reset: function reset(){
            var id = guid()
            queues.add(new Command(id, 'reset', function(){
                this.send({reset: true, id: id})
            }, this))
            return this
        },
        exit: function(){
            
        }
    }
    
}

exports.Tutti = Tutti