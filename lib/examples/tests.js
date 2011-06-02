function Q(){
    this.arr = []
}
Q.prototype = {
    size: function(){
        return this.arr.length
    },
    enqueue: function(item){
        this.arr.unshift(item)
    },
    dequeue: function(){
        return this.arr.pop()
    }
}

describe('q', function(){
    it('should create queue', function(){
        var q = new Q()
        expect(q.size()).toBe(0)
    })
    it('should enqueue', function(){
        var q = new Q()
        q.enqueue('foo')
        expect(q.size()).toBe(1)
    })
    it('should dequeue', function(){
        var q = new Q()
        q.enqueue('foo')
        expect(q.dequeue()).toBe('foo')
        expect(q.size()).toBe(0)
    })
})
