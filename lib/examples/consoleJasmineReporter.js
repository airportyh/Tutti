(function(){

    function red(s){ return ["\033[31m", s, "\033[0m"].join('') }
    function green(s){ return ["\033[32m", s, "\033[0m"].join('') }
    function cyan(s){ return ["\033[36m", s, "\033[0m"].join('') }
    function yellow(s){ return ["\033[33m", s, "\033[0m"].join('') }
    function blue(s){ return ["\033[34m", s, "\033[0m"].join('') }
    
    function ConsoleJasmineReporter(){ 
    }

    ConsoleJasmineReporter.prototype.reportRunnerResults = function(runner){
        var output = [],
            results = runner.results(),
            specs = runner.specs()
        var msg = [specs.length, 'specs,', results.failedCount, 'failures.'].join(' ')
        if (results.failedCount > 0)
            msg = red(msg)
        else
            msg = green(msg)
        output.push(msg)
    
        
        for (var i = 0; i < specs.length; i++) {
            var spec = specs[i]
            var results = spec.results()
            if (results.failedCount > 0){
                var items = results.getItems()
                var numItems = items.length
                for (var j = 0; j < numItems; j++){
                    var result = items[j]
                    if (result.type == 'log')
                        output.push('  LOG: ' + result.toString())
                    else if (result.type == 'expect' && 
                        result.passed && !result.passed()){
                        output.push(spec.getFullName())
                        output.push('  ' + red(result.message))
                    }
                }
            }
        }
        console.log(output.join('\n'))
    }
    
    window.ConsoleJasmineReporter = ConsoleJasmineReporter

}())