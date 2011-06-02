function TuttiClient(window, host, port, roomID){
    if (!host || !port) return
    this.window = window
    this.document = this.window.document
    this.host = host
    this.port = port
    this.roomID = roomID
    this.firstLogin = true
    this.login = {browser: this.browserName}
    if (roomID) this.login.roomID = roomID
    this.setupConsole()
    this.cbs = {}
}
TuttiClient.prototype = {
    browserName: (function(){
        var userAgent = navigator.userAgent
        var regexs = [
            /MS(?:(IE) ([0-9]\.[0-9]))/,
            /(Chrome)\/([0-9]+\.[0-9]+)/,
            /(Firefox)\/([0-9a-z]+\.[0-9a-z]+)/,
            /(Opera).*Version\/([0-9]+\.[0-9]+)/,
            [/(iPhone).*Version\/([0-9]+\.[0-9]+).*(Safari)/, function(m){
                return [m[1], m[3], m[2]].join(' ')
            }],
            [/(iPad).*Version\/([0-9]+\.[0-9]+).*(Safari)/, function(m){
                return [m[1], m[3], m[2]].join(' ')
            }],
            [/Version\/([0-9]+\.[0-9]+).*(Safari)/, function(m){
                return [m[2], m[1]].join(' ')
            }]
        ]
        for (var i = 0; i < regexs.length; i++){
            var regex = regexs[i]
            var pick = function(m){
                return m.slice(1).join(' ')
            }
            if (regex instanceof Array){
                pick = regex[1]
                regex = regex[0]
            }
            var match = userAgent.match(regex)
            if (match){
                return pick(match)
            }
        }
        return userAgent
    })(),
    bind: function(fname){
        var f = this[fname],
            self = this
        return function(){
            return f.apply(self, arguments)
        }
    },
    on: function(event, callback){
        var cbs = this.cbs[event] = this.cbs[event] || []
        cbs.push(callback)
    },
    setupConsole: function(){
        if (this.window.console._tutti) return
        var self = this
        this.window.console = {
            _tutti: true,
            log: (function(){
            var realConsole = self.window.console
            return function(){
                var args = Array.prototype.slice.apply(arguments)
                var data = {console: args.join(', ')}
                self.sendData(data)
                realConsole.log.apply(realConsole, args)
            }
        }())}
    },
    connect: function(){
        var socket
        this.socket = socket = new io.Socket(this.host, {
            port: this.port, 
            rememberTransport: true,
            transports: [
                'websocket', 
                'htmlfile', 
                'xhr-multipart', 
                'xhr-polling', 
                'jsonp-polling'
            ]
        })
        socket.on('connect', this.bind('onConnect'))
        socket.on('disconnect', this.bind('onDisconnect'))
        socket.on('message', this.bind('onMessage'))
        socket.connect()
    },
    
    notify: function(evt){
        var args = Array.prototype.slice.call(arguments, 1),
            cbs = this.cbs[evt],
            len = cbs ? cbs.length : 0
        for (var i = 0; i < len; i++)
            cbs[i].apply(null, args)
    },
    
    onConnect: function(){
        this.notify('connect')
        var data = JSON.stringify({login: this.login})
        this.socket.send(data)
        if (this.firstLogin){
            this.execute(':help')
            this.firstLogin = false
        }
    },
    // received data from socket
    onMessage: function(data) {
        data = JSON.parse(data)
        this.notify('message', data)
        if (data.command){
            var reply = this.execute(data.command)
            if (reply){
                this.notify('message', reply)
                this.sendData(reply)
            }
        }else if (data.load){
            this.load(data)
        }
    },
    load: function(data){
        this.notify('load', data)
        var js = data.load
        var script = this.document.createElement('script')
        var text = this.document.createTextNode(js)
        script.appendChild(text)
        this.document.body.appendChild(script)
        this.document.body.removeChild(script)
    },
    onDisconnect: function(){
        this.notify('disconnected')
    },
    // send data as JSON
    sendData: function(data){
        this.socket.send(JSON.stringify(data))
    },
    execute: function(command){
        if (command.match(/^:[a-zA-Z]+$/))
            this.notify('command', command)
        else
            return this.executeJS(command)
    },
    executeJS: function(command){
        var reply
        try{
            var result = this.evalJS(command)
            if (typeof result === 'string')
                result = "'" + result + "'"
            else
                result = String(result)
            reply = {reply: result}
        }catch(e){
            var emsg = String(e)
            if (emsg.charAt(0) == '[')
                emsg = 'Error: ' + e.message
            reply = {error: emsg}
        }
        this.notify('eval')
        return reply
    },
    evalJS: function(js){
        return this.window.eval(js)
    }
}

function EmbeddedTuttiClient(){
    function getConnectInfo(){
        var tags = document.getElementsByTagName('script')
        for (var i = 0; i < tags.length; i++){
            var tag = tags[i]
            var src = tag.getAttribute('src'), match
            if (src && (match = src.match(/^http:\/\/([^:]*)(?::([0-9]+))\/embed\.js(?:\?(.*))?$/))){
                return {
                    hostname: match[1],
                    port: match[2],
                    roomID: match[3]
                }
            }
        }
        return null
    }
    var info = getConnectInfo()
    return new TuttiClient(window, info.hostname, info.port, info.roomID)
}