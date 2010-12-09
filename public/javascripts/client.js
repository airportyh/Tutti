// given this browser a name based on the `userAgent`
// display name for this browser
var browserName = (function(){
    var userAgent = navigator.userAgent
    var regexs = [
        /MS(?:(IE) ([0-9]\.[0-9]))/,
        /(Chrome)\/([0-9]+\.[0-9]+)/,
        /(Firefox)\/([0-9a-z\.]+)/,
        /(Opera).*Version\/([0-9]+\.[0-9]+)/,
        /Version\/([0-9]+\.[0-9]+).*(Safari)/
    ]
    for (var i = 0; i < regexs.length; i++){
        var regex = regexs[i]
        var match = userAgent.match(regex)
        if (match){
            var results = match.slice(1)
            if (match.toString().indexOf('Safari') >= 0)
                results = [results[1], results[0]]
            return results.join(' ')
        }
    }
    return userAgent
})()

// put together login info
var login = {
    browser: browserName,
    roomID: location.pathname.match(/^\/([0-9]+)/)[1],
    secret: location.pathname.match(/([0-9]+)$/)[1]
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
    data.browser = browserName
    displayData(data)
}

// Dean Edwards' sandbox
function createSandBox(){
    var iframe = document.createElement("iframe");
    iframe.style.display = "none";
    document.body.appendChild(iframe);

    // write a script into the <iframe> and create the sandbox
    frames[frames.length - 1].document.write(
        "<" + "script>"+
        "var MSIE/*@cc_on =1@*/;"+ // sniff
        "parent.sandbox=MSIE?this:{eval:function(s){return eval(s)}};"+
        "this.console = {log: parent.log};" +
        "<" + "\/script>"
    );
}

// socket.IO socket
var socket
// intervalID for attempt retries to reconnect if disconnected
var retryIntervalID
// Connect to socket.IO server
function connect(){
    io.setPath('/')
    displayData({announcement: 'Connecting...'})
    socket = new io.Socket(location.hostname, {port:location.port, 
        transports: ['websocket', 'htmlfile', 'xhr-multipart', 'xhr-polling']});

    socket.on('connect', function(){
        if (retryIntervalID){
            clearInterval(retryIntervalID)
            retryIntervalID = null
        }
    })

    socket.on('disconnect', function(){
        control.notice('Disconnected from server!')
        retryIntervalID = setInterval(connect, 5000)
    }) 

    socket.on('message', didReceiveData)

    socket.connect()

    socket.send(JSON.stringify({login: login}))
}

// received data from socket
function didReceiveData(data) {
    data = JSON.parse(data)
    displayData(data)

    if (data.command){
        var reply
        try{
            var result = String(sandbox.eval(data.command))
            reply = {reply: result}
        }catch(e){
            var emsg = String(e)
            if (emsg.charAt(0) == '[')
                emsg = 'Error: ' + e.message
            reply = {error: emsg}
        }
        reply.browser = browserName
        displayData(reply)
        sendData(reply)
    }

}

// send data as JSON
function sendData(data){
    socket.send(JSON.stringify(data))
}

// display a message to the console or notice area
function displayData(data){
    if (data.announcement)
        control.messageBeforePrompt(data.announcement, 'announcement')
    else if (data.command){
        control.promptText(data.command, 'command')
        control.display('')
    }else if (data.reply){
        var msg = '<span class="browser">' + data.browser + 
            ' => </span>' + data.reply
        control.messageBeforePrompt(msg, 'reply')
    }else if (data.error){
        control.messageBeforePrompt('<span class="browser">' + data.browser + ' => </span>' + data.error, 'error')
    }else if (data.console){
        control.messageBeforePrompt('<span class="browser">' + data.browser + ' : </span>' + data.console, 'console')
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
                sendData({command: line})
                var reply
                try{
                    var result = String(sandbox.eval(line))
                    reply = {reply: result}
                }catch(e){
                    var emsg = String(e)
                    if (emsg.charAt(0) == '[')
                        emsg = 'Error: ' + e.message
                    reply = {error: emsg}
                }finally{
                    reply.browser = browserName
                    displayData(reply)
                    sendData(reply)
                }
            }
        },
        autofocus:true,
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
