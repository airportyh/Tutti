require.paths.unshift(__dirname + '/lib')
var Couch = require('couchdb').Couch
var dbName = process.argv[2] || 'tutti'
console.log('Reseting DB ' + dbName)
var db = new Couch(dbName)
db.drop(function(){
    db.create()
})