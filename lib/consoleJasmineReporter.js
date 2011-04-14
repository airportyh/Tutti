function ConsoleJasmineReporter(){
    
}

ConsoleJasmineReporter.prototype.reportRunnerResults = function(runner){
    window.runner = runner
    var output = []
    var results = runner.results()
    output.push('\t' + [results.totalCount, 'specs,', results.failedCount, 'failures.'].join(' '))
    
    var specs = runner.specs();
    for (var i = 0; i < specs.length; i++) {
        var spec = specs[i]
        var results = spec.results()
        if (results.failedCount > 0){
            var items = results.getItems()
            var numItems = items.length
            for (var j = 0; j < numItems; j++){
                var result = items[j]
                if (result.type == 'log')
                    output.push('\t\tLOG: ' + result.toString())
                else if (result.type == 'expect' && 
                    result.passed && !result.passed()){
                    output.push('\t\t' + result.message)
                    //console.log(result.trace.stack)
                }
            }
        }
    }
    console.log('\n' + output.join('\n'))
}

ConsoleJasmineReporter.prototype.reportSpecResults = function(spec){
    
    /*
    var results = spec.results()
    var status = results.passed() ? 'passed' : 'failed'
    console.log(status + ' : ' + spec.getFullName())
    var items = results.getItems(), numItems = items.length
    for (var i = 0; i < numItems; i++){
        var result = results.getItems()[i]
        if (result.type == 'log')
            console.log('LOG: ' + result.toString())
        else if (result.type == 'expect'  && result.passed && !result.passed()){
            console.log('\t' + result.message)
            console.log(result.trace.stack)
        }
    }
    */
}

ConsoleJasmineReporter.prototype.reportSuiteResults = function(suite){
    
    window.suite = suite
    /*
    var results = suite.results()
    console.log(results.totalCount, ' specs, ',  results.failedCount, 'failures')
    var status = results.passed() ? 'passed' : 'failed'
    console.log('Suite Run: ' + status)
    */
}