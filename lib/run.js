require.paths.unshift(__dirname)
var sys = require('sys')
var tutti = require('tutti').Tutti('http://localhost:8080/')

function red(s){ return ["\033[31m", s, "\033[0m"].join('') }
function green(s){ return ["\033[32m", s, "\033[0m"].join('') }
function cyan(s){ return ["\033[36m", s, "\033[0m"].join('') }
function yellow(s){ return ["\033[33m", s, "\033[0m"].join('') }
function blue(s){ return ["\033[34m", s, "\033[0m"].join('') }


tutti.on('connect', function(){
    tutti.on('message', function(msg){
        //if ('reply' in msg)
        //    console.log(msg.reply)
        if ('error' in msg)
            console.log(msg.error)
        if ('console' in msg){
            console.log(cyan(msg.browser))
            console.log(cyan('===================================================='))
            console.log(msg.console)
        }
    })
    tutti.on('disconnect', function(){
        sys.puts('Disconnected!')
    })
    tutti.command('console.log("hello world")')
    //tutti.reset()
    //tutti.load('jasmine.js')
    //tutti.load('consoleJasmineReporter.js')
    //tutti.load('tests.js')
    tutti.exit()
})