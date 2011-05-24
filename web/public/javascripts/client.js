
// give this browser a name based on the `userAgent`
// display name for this browser
var browserName = (function(){
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
        if (regex.constructor === Array){
            pick = regex[1]
            regex = regex[0]
        }
        var match = userAgent.match(regex)
        if (match){
            return pick(match)
        }
    }
    return userAgent
})()

// `map()` method for arrays for convinience
Array.prototype.map = function(f){
    var retval = []
    for (var i = 0; i < this.length; i++)
        retval.push(f(this[i]))
    return retval
}

// put together login info
var login
if (location.pathname == '/'){
    // no room/secret required for standalone mode
    login = {
        browser: browserName
    }
}else{
    login = {
        browser: browserName,
        roomID: location.pathname.match(/^\/([0-9a-z]+)$/)[1]
    }
}

// GA Event Tracking. We track when a JS command is issued and when
// it's been executed. We don't record the actual JS being executed.
function trackEvent(category, action, value){
    if (_gaq){
        var arr = ['_trackEvent', category, action]
        if (value) arr.push(value)
        _gaq.push(arr)
    }
}

// Count the number of open {, (, or [ for a given line of Javascript.
// Used to determine whether the command being entered is a multi-line.
function countParams(line){
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
}

// Create a dummy console.log if non-existent.
if (!window.console){
  window.console = {log: function(){}}
}

// console.log function for the sandbox
function log(msg){
    var data = {console: msg}
    sendData(data)
    displayData(data)
}

var sandboxIframe
// based on Dean Edwards' sandbox
function createSandBox(){
    window.sandbox = undefined
    sandboxIframe = document.createElement("iframe")
    //sandboxIframe.id = 'sandbox'
    //sandboxIframe.src = '/blank.html'
    sandboxIframe.style.display = "none"
    document.body.appendChild(sandboxIframe)
    setTimeout(function(){
        var doc = sandboxIframe.contentWindow.document
        doc.open('text/html')
        doc.write('<!doctype html><html><head></head><body>\
        <h1>One Two</h1>\
        <script>\
        var MSIE/*@cc_on =1@*/;\
        parent.sandbox= MSIE ?\
            this :\
            {eval:function(s){return window.eval(s)}};\
        this.console = {log: parent.log};\
        var alert = function(){ throw new Error("Sorry, cannot alert() in here.")};\
        var print = function(){ throw new Error("Sorry, cannot print() in here.")};\
        var confirm = function(){ throw new Error("Sorry, cannot confirm() in here.")};\
        var open = function(){ throw new Error("Sorry, cannot open() in here.")};\
        </script>\
        </body></html>')
        doc.close()
    }, 1)
}
function sandBoxEval(s){
    if (typeof sandbox !== 'undefined')
        return sandbox.eval(s)
    else{
        setTimeout(function(){
            sandBoxEval(s)
        }, 1)
    }
}

// socket.IO socket
var socket
// Connect to socket.IO server
function connect(){
    var firstLogin = true
    displayData({announcement: 'Connecting...'})
    
    var host = location.hostname
    var port = location.port
    
    socket = new io.Socket(host, {
        port:port, 
        rememberTransport: true,
        transports: ['websocket', 'htmlfile', 'xhr-multipart', 'xhr-polling']
        });

    socket.on('connect', function(){
        socket.send(JSON.stringify({login: login}))
        print('Connected.', 'reply')
        if (firstLogin){
            print('<br>')
            print('Welcome to Tutti - interactive Javascript shell')
            print('----------------------------------------------------------------------')
            execute(':help')
            firstLogin = false
        }
        trackEvent('Connection', 'connect')
    })

    socket.on('disconnect', function(){
        trackEvent('Connection', 'disconnect')
        displayData({announcement: 'Connection lost.'})
    }) 

    socket.on('message', didReceiveData)

    socket.connect()
}

// reset the console, including all text, command history and the document
function resetConsole(){
    sandboxIframe.parentNode.removeChild(sandboxIframe)
    control.reset()
    createSandBox()
}

// received data from socket
function didReceiveData(data) {
    //console.log(data)
    data = JSON.parse(data)
    displayData(data)
    if (data.command){
        var reply = execute(data.command)
        if (reply){
            if (data.sessionId)
                reply.recipient = data.sessionId
            displayData(reply)
            sendData(reply)
        }
    }
}

// send data as JSON
function sendData(data){
    socket.send(JSON.stringify(data))
}

function print(msg, clazz){
    clazz = clazz || 'announcement'
    control.messageBeforePrompt(msg, clazz)
}

function printUsage(){    
    print('You can execute any Javascript in the shell below.')
    print('To connect another browser, just copy-n-paste the current URL into it.')
    print('The following commands are also available:')
    print('<br/>')
    print('&nbsp;:help - print out this message')
    print('&nbsp;:browsers - show connected browsers')
    print('&nbsp;:reset - reset the Javascript sandbox')
    print('<br/>')
}

function execute(command){
    var retval
    if (command === ':reset')
        retval = resetConsole()
    else if (command === ':help')
        retval = printUsage()
    else
        retval = executeJS(command)
    trackEvent('Command', 'completed')
    return retval
}
function executeJS(command){
    var reply
    try{
        var result = sandBoxEval(command)
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
    return reply
}

// display a message to the console or notice area
function displayData(data){
    var browser = data.browser || browserName
    if (data.announcement)
        control.messageBeforePrompt(data.announcement, 'announcement')
    else if (data.command){
        var pt = control.promptText()
        control.promptText(data.command, 'command')
        control.display('')
        control.promptText(pt, 'command')
    }else if ('reply' in data){
        var msg = '<span class="browser">' + browser + 
            ' => </span>' + control.htmlEncode(data.reply)
        control.messageBeforePrompt(msg, 'reply')
    }else if ('error' in data){
        control.messageBeforePrompt('<span class="browser">' + 
            browser + ' => </span>' + data.error, 'error')
    }else if ('console' in data){
        control.messageBeforePrompt('<span class="browser">' + 
            browser + ' : </span>' + data.console, 'console')
    }else if (data.browsers){
        control.messageBeforePrompt('Connected browsers: ' + 
            (data.browsers.map(function(b){return b.browser}).join(', ') || 'none'), 'announcement')
    }
}

// console control
var control
// create console control
function initConsole(){
    control = $('#console').console({
        promptLabel: '> ',
        commandValidate:function(line){
            return line != ''
        },
        continuedPromptLabel: '  ',
        commandHandle:function(line){
            if (countParams(line) > 0){
                control.continuedPrompt = true
            }else{
                control.continuedPrompt = false
                control.commandResult('')
                trackEvent('Command', 'issued')
                if (line !== ':help') 
                    sendData({command: line})
                var reply
                if (line !== ':browsers'){
                    reply = execute(line)
                    if (reply)
                        displayData(reply)
                }
            }
        },
        autofocus: true,
        animateScroll:true,
        promptHistory:true
    })
    
    layout()
    $(window).resize(layout)
}

// Layout the UI based on the window size
function layout(){
    $('#console').css({
        height: ($(window).height() - 12) + 'px'
    })
}

// Use jQuery on-ready to init.
$(function(){
    createSandBox()
    initConsole()
    connect()
})

