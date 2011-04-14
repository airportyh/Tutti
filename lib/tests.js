describe('shit', function(){
    it('does shit', function(){
        expect('shit').toBe('shit')
    })
    it('does other shit', function(){
        expect('other shit').toBe('da shit')
    })
    it('bombs', function(){
        throw new Error('Shit!')
    })
})
jasmine.getEnv().addReporter(new ConsoleJasmineReporter())
jasmine.getEnv().execute();