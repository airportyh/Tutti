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
    this.sandboxIframe.src = '/blank.html'
    this.document.body.appendChild(this.sandboxIframe)    
}
SandboxedTuttiClient.prototype.evalJS = function(s){
    if (this.window.sandbox){
        return this.window.sandbox.eval(s)
    }else{
        var self = this
        setTimeout(function(){
            self.evalJS(s)
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

SandboxedTuttiClient.prototype.reset = function(){
    this.sandboxIframe.parentNode.removeChild(this.sandboxIframe)
    this.createSandBox()
}

SandboxedTuttiClient.prototype.load = function(data){
    this.notify('load', data)
    var js = data.load
    this.evalJS(js)
}