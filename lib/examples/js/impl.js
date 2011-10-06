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