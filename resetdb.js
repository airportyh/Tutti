require.paths.unshift(__dirname + '/lib')
var Couch = require('couchdb').Couch
var db = new Couch('tutti')
db.drop(function(){
    db.create()
})