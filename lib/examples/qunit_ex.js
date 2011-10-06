require.paths.push(__dirname + '/../lib')
var Tutti = require('tutti').Tutti,
    sys = require('sys')

function red(s){ return ["\033[31m", s, "\033[0m"].join('') }
function green(s){ return ["\033[32m", s, "\033[0m"].join('') }
function cyan(s){ return ["\033[36m", s, "\033[0m"].join('') }
function yellow(s){ return ["\033[33m", s, "\033[0m"].join('') }
function blue(s){ return ["\033[34m", s, "\033[0m"].join('') }

function indent(str){
    return str.split('\n').map(function(line){
        return '  ' + line
    }).join('\n')
}

function printTestResults(msg){
    console.log(yellow(msg.browser))
    var status = [
        msg.total,
        'tests ran,',
        msg.failed,
        'failed.'
        ].join(' ')
    if (msg.failed === 0)
        console.log(indent(green(status)))
    else{
        console.log(indent(red(status)))
        if (msg.items)
            msg.items.forEach(function(item){
                console.log(indent(item.name))
                console.log(indent(item.message))
                if (item.stackTrace)
                    console.log(indent(item.stackTrace))
            })
    }
}


var testResults = {},
    testProgress = {},
    browsers = null
var tt = Tutti('http://localhost:8080/')
    .on('message', function(msg){
        if (msg.browsers){
            console.log()
            console.log('Progress(# tests run)')
            console.log('=====================')
            browsers = msg.browsers.map(function(b){
                return b.browser
            })
            console.log(cyan(browsers.join('\t')))
        }else if (msg.test === 'caseResult'){
            if (msg.browser in testProgress)
                testProgress[msg.browser]++
            else
                testProgress[msg.browser] = 1
            process.stdout.write('\r' + cyan(browsers.map(function(b){
                return testProgress[b]
            }).join('\t\t')))
        }else if (msg.test === 'done'){
            testResults[msg.browser] = msg
        }
    })
    .upload('js/impl.js')
    .upload('js/qunit.js')
    .upload('js/qunitTuttiAdapter.js')
    .upload('js/qunit_tests.js')
    .upload('qunittest.html')
    .open('qunittest.html')
    .wait(function(msg){
        return msg.test === 'done'
    }, 100000)
    .run(function(){
        console.log('\n')
        console.log('Final Test Results')
        console.log('==================')
        for (var browser in testResults){
            printTestResults(testResults[browser])
        }
        console.log()
    })
    .exit()
