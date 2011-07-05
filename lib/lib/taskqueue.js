if (typeof require !== 'undefined')
    var isa = require('./isa').isa

function TaskQueue(keepRunning, readyFun){
    var waiting = null
    var running = false
    var queue = []
    return {
        start: function(){
            if (!running)
                this.next()
        },
        add: function(cmd){
            queue.unshift(cmd)
            if (keepRunning && !running)
                this.next()
        },
        next: function(){
            var self = this
            if (readyFun && !readyFun()){
                setTimeout(function(){
                    self.next()
                }, 250)
                return
            }
            
            if (!running)
                running = true
            
            var cmd = queue.pop()
            if (cmd instanceof WaitCommand){
                cmd.start(this)
                waiting = cmd
            }else if (cmd){
                cmd.execute(function(){
                    self.next()
                })
            }else{
                running = false
            }
        },
        stopWaiting: function(){
            waiting = null
            this.next()
        },
        onmessage: function(msg){
            if (!waiting) return
            waiting.onmessage(msg)
            if (waiting.done()){
                this.stopWaiting()
            }
        }
    }
}

function Command(name, func, context){
    this.func = func
    this.context = context
    this.name = name
}
Command.prototype.execute = function(){
    this.func.apply(this.context, arguments)
}
Command.prototype.toString = function(){
    return this.name
}

function WaitCommand(getbrowsers){
    this.browsers = null
    this.getbrowsers = getbrowsers
    
    for (var i = 1; i < arguments.length; i++){
        var arg = arguments[i]
        if (isa(arg, String))
            this.type = arg
        else if (isa(arg, Number))
            this.timeout = arg
        else if (isa(arg, RegExp))
            this.regex = arg
        else if (isa(arg, Function))
            this.matches = arg
    }
        
    this.timeout = this.timeout || 3000
}
WaitCommand.prototype.onmessage = function(msg){
    if (this.matches(msg)){
        var idx = this.browsers.indexOf(msg.sessionId)
        if (idx != -1){
            this.browsers.splice(idx, 1)
        }
    }
}
WaitCommand.prototype.matches = function(msg){
    if (!(this.type in msg)) return false
    if (this.regex && !this.regex.match(msg[this.type])) return false
    return true
}
WaitCommand.prototype.done = function(){
    return this.browsers.length == 0
}
WaitCommand.prototype.start = function(queue){
    this.browsers = this.getbrowsers()
    setTimeout(function(){
        queue.stopWaiting()
    }, this.timeout)
}
WaitCommand.prototype.toString = function(){
    return [this.type, this.regex || ''].join(' ')
}

if (typeof exports !== 'undefined'){
    exports.TaskQueue = TaskQueue
    exports.Command = Command
    exports.WaitCommand = WaitCommand
}