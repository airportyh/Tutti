require.paths.unshift('./')
var Tutti = require('tutti').Tutti
    readline = require('readline'),
    sys = require('sys'),
    Version = '0.0.4',
    tutti = null

function printUsage(){
    console.log('Usage:')
    console.log('    tuttiterm <tutti_room_url>')
    console.log()
    console.log('See http://tutti.tobyho.com for info on Tutti.')
}

function red(s){ return ["\033[31m", s, "\033[0m"].join('') }
function green(s){ return ["\033[32m", s, "\033[0m"].join('') }
function cyan(s){ return ["\033[36m", s, "\033[0m"].join('') }
function yellow(s){ return ["\033[33m", s, "\033[0m"].join('') }
function blue(s){ return ["\033[34m", s, "\033[0m"].join('') }

try{
    var url = process.ARGV[2]
    console.log("Connecting to " + url)
    tutti = Tutti(url)
}catch(e){
    printUsage()
    process.exit(0)
}

function displayMessage(msg){
    rli.output.cursorTo(0)
    rli.output.clearLine(1)
    if ('announcement' in msg)
        console.log(yellow(msg.announcement.replace(/<br>/g, '')))
    else if('command' in msg)
        console.log('> ' + msg.command)
    else if('reply' in msg)
        console.log(yellow(msg.browser + ' => ') + green(msg.reply))
    else if('console' in msg)
        console.log(yellow(msg.browser + ' : ') + cyan(msg.console))
    else if('error' in msg)
        console.log(yellow(msg.browser + ' => ') + red(msg.error))
    else if('browsers' in msg)
        console.log(yellow('Logged in browsers: ' + 
            (msg.browsers.map(function(b){return b.browser}).join(', ') || 'none')))
    rli.prompt()
}

tutti.on('message', displayMessage)
var rli = readline.createInterface(process.stdin, process.stdout, function(){})
rli.on('line', function(cmd){
    if (cmd.length == 0){
        
    }else if (cmd === 'exit'){
        console.log('Bye!')
        process.exit(0)
    }else if (cmd.match(/^load (.*)$/)){
        var m = cmd.match(/^load (.*)$/)
        fs.readFile(m[1], function(err, data){
            tutti.command(String(data))
        })
    }else if (cmd == 'reset'){
        tutti.reset()
    }else{
        tutti.command(cmd)
    }
    rli.prompt()
})

rli.setPrompt('> ')
process.stdin.resume()


