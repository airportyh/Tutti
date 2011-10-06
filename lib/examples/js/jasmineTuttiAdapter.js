function TuttiJasmineReporter(){}
TuttiJasmineReporter.prototype.reportRunnerStarting = function(runner){
    Tutti.sendData({
        test: 'starting'
    })
}
TuttiJasmineReporter.prototype.reportSuiteResults = function(suite){
    /*Tutti.sendData({
        test: 'suiteResults'
    })*/
}
TuttiJasmineReporter.prototype.reportSpecStarting = function(spec){
    /*Tutti.sendData({
        test: 'testCaseStarting',
        name: spec.getFullName()
        })*/
}
TuttiJasmineReporter.prototype.reportSpecResults = function(spec){
    var results = spec.results(),
        rItems = results.getItems(),
        numItems = rItems.length,
        items = []
    for (var i = 0; i < numItems; i++){
        var item = rItems[i]
        if (item.type === 'log')
            items[i] = {type: 'log', message: String(item)}
        else if (item.type == 'expect' && item.passed && !item.passed()){
            items[i] = {type: 'fail', message: item.message}
        if (item.trace.stack)
                items[i].stackTrace = item.trace.stack
        }
    }
    Tutti.sendData({
        test: 'caseResult',
        items: items,
        passed: results.passed(),
        spec: spec.getFullName()})
}
TuttiJasmineReporter.prototype.reportRunnerResults = function(runner){
    var output = [],
        results = runner.results(),
        specs = runner.specs(),
        failed = results.failedCount,
        total = specs.length,
        passed = total - failed,
        msg = {
            test: 'done', 
            failed: failed,
            total: total,
            passed: passed,
            items: []}

    
    for (var i = 0; i < specs.length; i++) {
        var spec = specs[i]
        var results = spec.results()
        if (results.failedCount > 0){
            var items = results.getItems()
            var numItems = items.length
            for (var j = 0; j < numItems; j++){
                var result = items[j]
                if (result.type == 'log')
                    msg.items.push({
                        type: 'log', message: result.toString()})
                else if (result.type == 'expect' && 
                    result.passed && !result.passed()){
                    msg.items.push({
                        type: 'fail',
                        name: spec.getFullName(),
                        message: result.message,
                        stackTrace: result.trace.stack ?
                            result.trace.stack.split('\n').slice(0, 2).join('\n'):
                            undefined
                    })
                }
            }
        }
    }
    Tutti.sendData(msg)
}