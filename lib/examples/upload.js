require.paths.push(__dirname + '/../lib')
var Tutti = require('tutti').Tutti

Tutti('http://localhost:8080/')
    .on('message', function(msg){
        if (msg.console)
            console.log(msg.console)
    })
    .upload('js/jasmine.js')
    .upload('js/consoleJasmineReporter.js')
    .upload('js/tests.js')
    .upload('test.html')
    .open('test.html')
    .wait('console', 5000)
    .exit()
