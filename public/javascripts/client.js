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

var sandBoxEval
// based on Dean Edwards' sandbox
function createSandBox(){
    var iframe = document.createElement("iframe")
    iframe.style.display = "none"
    document.body.appendChild(iframe)

    // write a script into the <iframe> and create the sandbox
    frames[frames.length - 1].document.write(
        "<" + "script>"+
        "var MSIE/*@cc_on =1@*/;"+ // sniff
        "(function(){\
            var myeval = window.eval;\
            parent.sandbox=MSIE?this:{eval:function(s){return myeval(s)}};\
        })();" +
        "this.console = {log: parent.log};" +
        "<" + "\/script>"
    )
    sandbox.eval(
        "var alert = function(){ throw new Error('Sorry, can\\'t alert() in here.')};\
        var print = function(){ throw new Error('Sorry, can\\'t print() in here.')};\
        var confirm = function(){ throw new Error('Sorry, can\\'t confirm() in here.')};\
        var open = function(){ throw new Error('Sorry, can\\'t open() in here.')};\
        var parent = undefined;"
        )
    sandBoxEval = sandbox.eval
}

// socket.IO socket
var socket
// Connect to socket.IO server
function connect(reconnect){
    displayData({announcement: 'Connecting...'})
    
    var host = location.hostname
    var port = location.port
    
    socket = new io.Socket(host, {
        port:port, 
        rememberTransport: false,
        transports: ['websocket', 'htmlfile', 'xhr-multipart', 'xhr-polling']
        });

    socket.on('connect', function(){
        socket.send(JSON.stringify({login: login, reconnect: reconnect}))
        trackEvent('Connection', 'connect', reconnect ? 'reconnect': 'initial')
    })

    socket.on('disconnect', function(){
        trackEvent('Connection', 'disconnect')
        displayData({announcement: 'Disconnected from server!'})
        setTimeout(function(){
            connect(true)
        }, 5000)
    }) 

    socket.on('message', didReceiveData)

    socket.connect()
}

// received data from socket
function didReceiveData(data) {
    data = JSON.parse(data)
    displayData(data)

    if (data.command){
        var reply
        try{
            var result = String(sandBoxEval(data.command))
            reply = {reply: result}
        }catch(e){
            var emsg = String(e)
            if (emsg.charAt(0) == '[')
                emsg = 'Error: ' + e.message
            reply = {error: emsg}
        }
        displayData(reply)
        trackEvent('Command', 'completed')
        sendData(reply)
    }

}

// send data as JSON
function sendData(data){
    socket.send(JSON.stringify(data))
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
        control.messageBeforePrompt('<span class="browser">' + browser + ' => </span>' + data.error, 'error')
    }else if ('console' in data){
        control.messageBeforePrompt('<span class="browser">' + browser + ' : </span>' + data.console, 'console')
    }else if (data.browsers){
        control.messageBeforePrompt('<br>Connected browsers: ' + (data.browsers.join(', ') || 'none'), 'announcement')
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
                sendData({command: line})
                var reply
                try{
                    var result = String(sandBoxEval(line))
                    reply = {reply: result}
                }catch(e){
                    var emsg = String(e)
                    if (emsg.charAt(0) == '[')
                        emsg = 'Error: ' + e.message
                    reply = {error: emsg}
                }finally{
                    displayData(reply)
                    sendData(reply)
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
    $('#console, #console .jquery-console-inner').css({
        height: ($(window).height() - 12) + 'px'
    })
}

// Use jQuery on-ready to init.
$(function(){
    createSandBox()
    initConsole()
    connect()
})
