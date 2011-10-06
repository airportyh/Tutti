var stdout = process.stdout

stdout.write('abcdefg')

setTimeout(function(){
    stdout.write('\r12345678\n')
}, 1000)
