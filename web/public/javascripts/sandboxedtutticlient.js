function SandboxedTuttiClient(window, host, port, roomID){
    TuttiClient.call(this, window, host, port, roomID)
    this.createSandBox()
}
SandboxedTuttiClient.prototype = new TuttiClient()
SandboxedTuttiClient.prototype.constructor = SandboxedTuttiClient
SandboxedTuttiClient.prototype.sandboxIframe = null
// based on Dean Edwards' sandbox
SandboxedTuttiClient.prototype.createSandBox = function(){
    this.window.sandbox = null
    this.sandboxIframe = this.document.createElement("iframe")
    this.sandboxIframe.style.display = "none"
    this.document.body.appendChild(this.sandboxIframe)
    var self = this
    setTimeout(function(){
        var doc = self.sandboxIframe.contentWindow.document
        doc.open('text/html')
        doc.write('<!doctype html><html><head></head><body>\
<script>\
var MSIE/*@cc_on =1@*/;\
parent.sandbox= MSIE ?\
this :\
{eval:function(s){return window.eval(s)}};\
this.console = {log: parent.consoleLog};\
var alert = function(){ throw new Error("Sorry, cannot alert() in here.")};\
var print = function(){ throw new Error("Sorry, cannot print() in here.")};\
var confirm = function(){ throw new Error("Sorry, cannot confirm() in here.")};\
var open = function(){ throw new Error("Sorry, cannot open() in here.")};\
</script>\
</body></html>')
        doc.close()
    }, 1)
}
SandboxedTuttiClient.prototype.evalJS = function(s){
    if (typeof this.window.sandbox !== 'undefined')
        return this.window.sandbox.eval(s)
    else{
        var self = this
        setTimeout(function(){
            self.sandBoxEval(s)
        }, 1)
    }
}
SandboxedTuttiClient.prototype.setupConsole = function(){
    var self = this
    // console.log function for the sandbox
    function consoleLog(msg){
        var data = {console: msg}
        self.sendData(data)
        self.notify('console', msg)
    }
    this.window.consoleLog = consoleLog
}

SandboxedTuttiClient.prototype.resetConsole = function(){
    this.sandboxIframe.parentNode.removeChild(this.sandboxIframe)
    this.createSandBox()
    this.notify('reset')
}