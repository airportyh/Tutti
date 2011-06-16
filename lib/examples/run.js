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
    .load('jasmine.js')
    .load('consoleJasmineReporter.js')
    .load('tests.js')
    .eval('jasmine.getEnv().addReporter(new ConsoleJasmineReporter())')
    .eval('jasmine.getEnv().execute()')
    .wait('console', 10000)
    .exit()
    