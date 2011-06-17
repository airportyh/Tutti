Array.prototype.map = function(func, context){
    var len = this.length,
        ret = []
    for (var i = 0; i < len; i++){
        if (i in this)
            ret[i] = func.call(context, this[i], i, this)
    }
    return ret
}
function Console(window, hostname, port, roomID){
    this.window = window
    this.document = this.window.document
    this.client = new SandboxedTuttiClient(window, hostname, port, roomID, this)
    this.init()
}
Console.prototype = {
    init: function(){
        this.initConsole()
        this.print('Connecting...')
        var self = this
        this.client.on('message', function(data){
            if (!data.command && !data.load)
                self.displayData(data)
        })
        this.client.on('console', function(msg){
            self.displayData({console: msg})
        })
        this.client.on('load', function(data){
            self.displayData(data)
            self.trackEvent('Action', 'loaded')
        })
        this.client.on('eval', function(js){
            self.displayData({command: js})
            self.trackEvent('Action', 'eval')
        })
        this.client.on('command', function(cmd){
            self.displayData({command: cmd})
            if (cmd === ':help')
                self.printHelp()
            else if (cmd === ':browsers')
                self.client.sendData({command: ':browsers'})
            else if (cmd === ':reset')
                self.client.reset()
            self.trackEvent('Cmd', cmd)
        })
        this.client.on('connect', function(){
            self.print('Connected', 'reply')
            self.trackEvent('Connection', 'connect')
            self.print('<br>')
            self.print('Welcome to Tutti - interactive Javascript shell')
            self.print('----------------------------------------------------------------------')
        })
        this.client.on('disconnect', function(){
            self.trackEvent('Connection', 'disconnect')
        })
    },
    // Count the number of open {, (, or [ for a given line of Javascript.
    // Used to determine whether the command being entered is a multi-line.
    countParams: function(line){
        var paramStack = []
        function last(){
            return paramStack[paramStack.length - 1]
        }
        var otherHalf = {
            '{': '}',
            '(': ')',
            '[': ']'
        }
        var m
        while(m = line.match(/[\(\)\{\}\[\]]/)){
            if (otherHalf[last()] === m[0])
                paramStack.pop()
            else
                paramStack.push(m[0])
            line = line.slice(m.index + 1)
        }
        return paramStack.length
    },
    
    // print a message to the console
    print: function(msg, clazz){
        clazz = clazz || 'announcement'
        this.jqconsole.messageBeforePrompt(msg, clazz)
    },
    // print help message
    printHelp: function(){    
        this.print('You can execute any Javascript in the shell below.')
        this.print('To connect another browser, just copy-n-paste the current URL into it.')
        this.print('The following commands are also available:')
        this.print('<br/>')
        this.print('&nbsp;:help - print out this message')
        this.print('&nbsp;:browsers - show connected browsers')
        this.print('&nbsp;:reset - reset the Javascript sandbox')
        this.print('<br/>')
    },
    // display a message to the console or notice area
    displayData: function(data){
        var jqconsole = this.jqconsole
        var browser = data.browser || this.client.browserName
        if (data.announcement)
            jqconsole.messageBeforePrompt(data.announcement, 'announcement')
        else if (data.command){
            var pt = jqconsole.promptText()
            jqconsole.promptText(data.command, 'command')
            jqconsole.display('')
            jqconsole.promptText(pt, 'command')
        }else if ('reply' in data){
            var msg = '<span class="browser">' + browser + 
                ' => </span>' + jqconsole.htmlEncode(data.reply)
            jqconsole.messageBeforePrompt(msg, 'reply')
        }else if ('error' in data){
            jqconsole.messageBeforePrompt('<span class="browser">' + 
                browser + ' => </span>' + data.error, 'error')
        }else if ('console' in data){
            jqconsole.messageBeforePrompt('<span class="browser">' + 
                browser + ' : </span>' + data.console, 'console')
        }else if (data.browsers){
            jqconsole.messageBeforePrompt('Connected browsers: ' + 
                (data.browsers.map(function(b){return b.browser}).join(', ') || 'none'), 'announcement')
        }else if ('load' in data){
            jqconsole.messageBeforePrompt(data.filename + ' loaded.', 'announcement')
        }
    },
    // console control
    jqconsole: null,
    // create console control
    initConsole: function(){
        var self = this
        this.jqconsoleDiv = $('#console')
        this.jqconsole = this.jqconsoleDiv.console({
            promptLabel: '> ',
            commandValidate:function(line){
                return line != ''
            },
            continuedPromptLabel: '  ',
            commandHandle: function(line){
                if (self.countParams(line) > 0){
                    self.jqconsole.continuedPrompt = true
                }else{
                    self.jqconsole.continuedPrompt = false
                    self.jqconsole.commandResult('')
                    self.trackEvent('Eval', 'send')
                    if (line !== ':help') 
                        self.client.sendData({command: line})
                    var reply
                    if (line !== ':browsers'){
                        self.client.execute(line, function(reply){
                            if (reply){
                                self.client.sendData(reply)
                                self.displayData(reply)
                            }
                        })
                    }
                }
            },
            autofocus: true,
            animateScroll:true,
            promptHistory:true
        })
        this.layout()
        var self = this
        $(this.window).resize(function(){
            self.layout()
        })
        $(this.window).bind('focus', function(){
            self.jqconsole.focusOnPrompt()
        })
    },
    
    // Layout the UI based on the window size
    layout: function(){
        this.jqconsoleDiv.css({
            height: ($(this.window).height() - 12) + 'px'
        })
    },
    
    printUsage: function(){
        print('You can execute any Javascript in the shell below.')
        print('To connect another browser, just copy-n-paste the current URL into it.')
        print('The following commands are also available:')
        print('<br/>')
        print('&nbsp;:help - print out this message')
        print('&nbsp;:browsers - show connected browsers')
        print('&nbsp;:reset - reset the Javascript sandbox')
        print('<br/>')
    },
    
    // GA Event Tracking. We track when a JS command is issued and when
    // it's been executed. We don't record the actual JS being executed.
    trackEvent: function(category, action, value){
        if (_gaq){
            var arr = ['_trackEvent', category, action]
            if (value) arr.push(value)
            _gaq.push(arr)
        }
    }
}