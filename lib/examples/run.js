require.paths.push(__dirname + '/../lib')
var log = console.log
var Tutti = require('tutti').Tutti

function indent(str){
    return str.split('\n').map(function(l){return '  ' + l}).join('\n')
}

function display(msg){
    if ('error' in msg){
        log(msg.browser)
        log(indent(msg.error))
    }else if ('console' in msg){
        log(msg.browser)
        log(indent(msg.console))
    }
}

Tutti('http://localhost:8080/')
    .on('message', display)
    .reset()
    .upload('jasmine.js')
    .upload('consoleJasmineReporter.js')
    .upload('tests.js')
    .eval(function(){
        var scripts = ['jasmine.js', 'consoleJasmineReporter.js', 'tests.js']
        for (var i = 0; i < scripts.length; i++){
            var script = document.createElement('script')
            script.setAttribute('src', scripts[i])
            document.body.appendChild(script)
        }
            
    })
    .wait(1000)
    .eval('jasmine.getEnv().addReporter(new ConsoleJasmineReporter())')
    .eval('jasmine.getEnv().execute()')
    .wait('console', 10000)
    .exit()
    