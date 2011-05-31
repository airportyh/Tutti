// GA Event Tracking. We track when a JS command is issued and when
// it's been executed. We don't record the actual JS being executed.
function trackEvent(category, action, value){
    if (_gaq){
        var arr = ['_trackEvent', category, action]
        if (value) arr.push(value)
        _gaq.push(arr)
    }
}

function Console(window, client){
    this.window = window
    this.document = this.window.document
    this.client = client
    this.init()
}
Console.prototype = {
    init: function(){
        this.initConsole()
        this.print('Connecting...')
        var self = this
        this.client.on('connect', function(){
            self.print('Connected', 'reply')
        })
        this.client.on('message', function(data){
            self.displayData(data)
        })
        this.client.on('console', function(msg){
            self.displayData({console: msg})
        })
        this.client.on('connect', function(){
            self.print('<br>')
            self.print('Welcome to Tutti - interactive Javascript shell')
            self.print('----------------------------------------------------------------------')
            self.printHelp()
        })
        this.client.on('reset', function(){
            self.console.reset()
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
        this.console.messageBeforePrompt(msg, clazz)
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
        var console = this.console
        var browser = data.browser || this.client.browserName
        if (data.announcement)
            console.messageBeforePrompt(data.announcement, 'announcement')
        else if (data.command){
            var pt = console.promptText()
            console.promptText(data.command, 'command')
            console.display('')
            console.promptText(pt, 'command')
        }else if ('reply' in data){
            var msg = '<span class="browser">' + browser + 
                ' => </span>' + console.htmlEncode(data.reply)
            console.messageBeforePrompt(msg, 'reply')
        }else if ('error' in data){
            console.messageBeforePrompt('<span class="browser">' + 
                browser + ' => </span>' + data.error, 'error')
        }else if ('console' in data){
            console.messageBeforePrompt('<span class="browser">' + 
                browser + ' : </span>' + data.console, 'console')
        }else if (data.browsers){
            console.messageBeforePrompt('Connected browsers: ' + 
                (data.browsers.map(function(b){return b.browser}).join(', ') || 'none'), 'announcement')
        }
    },
    // console control
    console: null,
    // create console control
    initConsole: function(){
        var self = this
        this.consoleDiv = $('#console')
        this.console = this.consoleDiv.console({
            promptLabel: '> ',
            commandValidate:function(line){
                return line != ''
            },
            continuedPromptLabel: '  ',
            commandHandle: function(line){
                if (self.countParams(line) > 0){
                    self.console.continuedPrompt = true
                }else{
                    self.console.continuedPrompt = false
                    self.console.commandResult('')
                    trackEvent('Command', 'issued')
                    if (line !== ':help') 
                        self.client.sendData({command: line})
                    var reply
                    if (line !== ':browsers'){
                        reply = self.client.execute(line)
                        if (reply)
                            self.displayData(reply)
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
    },
    
    // Layout the UI based on the window size
    layout: function(){
        this.consoleDiv.css({
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
    }
}