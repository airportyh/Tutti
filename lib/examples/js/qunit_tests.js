module('q')
console.log('here')
test('should create queue', function(){
    console.log('should create queue')
    var q = new Q()
    equals(q.size(), 0)
})
test('should enqueue', function(){
    var q = new Q()
    q.enqueue('foo')
    equals(q.size(), 1)
})
test('should dequeue', function(){
    var q = new Q()
    q.enqueue('foo')
    equals(q.dequeue(), 'foo')
    //throw new Error('Ouch!')
    equals(q.size(), 0)
})
