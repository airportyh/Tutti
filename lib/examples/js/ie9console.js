function consoleLog(msg){
    var log = document.getElementById('mylog')
    log.innerHTML += msg + '\n'
}

var iframe = document.createElement('iframe')
document.body.appendChild(iframe)

var idoc = iframe.contentWindow.document
idoc.open()
idoc.write('<!doctype html><html><head></head><body>\
<script>\
var a = "bob";\
window.console = {log: parent.consoleLog};\
var oldCon = console;\
console.log("blah");\
console.log(oldCon === console);\
setTimeout(function(){\
    console.log("blah blah");\
    console.log(oldCon === console);\
}, 1);\
</script>\
</body></html>')
idoc.close()