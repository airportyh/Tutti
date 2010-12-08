//require.paths.unshift(__dirname + '/lib');

var io = require('socket.io')
var express = require('express')
var json = json = JSON.stringify

// create a secret access token for a room - roomID and secret must match to enter
function makeSecret(){
    return String(Math.random()).substring(2)
}

var app = express.createServer()
app.configure(function(){
    app.use(express.staticProvider(__dirname + '/public'))
})

// state of the app, in-memory only
var AppState = {
    // roomID generator/incrementor
    nextRoomID: 1,
    // dictionary: roomID -> room
    rooms: {},
    // dictionary: roomID -> array of clients
    clients: {}
}

// post to create a room in memory (restart and puff! it's gone.)
app.post('/create_room', function(req, res){
    var roomID = AppState.nextRoomID++
    var secret = makeSecret()
    AppState.rooms[roomID] = {id: roomID, secret: secret}
    AppState.clients[roomID] = []
    var path = '/' + roomID + '-' + secret
    console.log('room created ' + path)
    res.redirect(path)
})

// page for entering the JS shell. You must have the correct roomID/secret pair
// to enter. You should be redirected here from `/create_room` or gotten the 
// URL from copy-n-paste.
app.get('/:id-:secret', function(req, res){
    var roomID = req.param('id')
    var secret = req.param('secret')
    var room = AppState.rooms[roomID]
    if (!room){
        res.send('That room does not exist.', 404)
    }else if (room.secret === secret){
        res.sendfile(__dirname + '/public/shell.html')
    }else{
        res.send('Access denied. You gave the wrong secret token for this room.', 403)
    }
})

// socket stuff
var socket = io.listen(app)
socket.on('connection', function(client) {
    client.on('message', handleErrs(onClientMessage).bind(client))
    client.on('disconnect', onClientDisconnect.bind(client))
})

function handleErrs(f){
    return function(){
        try{
            f.apply(this, arguments)
        }catch(e){
            this._onDisconnect()
        }
    }
}

function onClientMessage(data) {
    var client = this
    var message = JSON.parse(data)
    if (message.login) {
        var room = AppState.rooms[message.login.roomID]
        
        if (!room){
            client.send({announcement:"Room does not exist anymore. Not sure why. Try going back to the front page and creating another room."})
            client._onDisconnect()
            return
        }
        
        if (room.secret !== message.login.secret){
            client.send({announcement:"Login failed! You gave the wrong secret token for this room. Bye!"})
            client._onDisconnect()
            return
        }
        
        var clients = AppState.clients[room.id]
        var browsers = clients.map(function(c){return c.browser})
        client.browser = message.login.browser
        client.roomID = room.id
        client.broadcast(json({announcement:client.browser + ' joined'}))
        client.send(json({browsers:browsers}))
        client.send(json({announcement: "<br/>Welcome to Tutti - interactively run Javascript on multiple browsers!"}))
        client.send(json({announcement: "===================================================================="}))
        client.send(json({announcement: "You can execute any Javascript in the shell below."}))
        client.send(json({announcement: "To connect another browser, just copy-n-paste the current URL into it."}))
        clients.push(client)
    }else{
        //message.sessionId = client.sessionId
        message.browser = client.browser
        client.broadcast(json(message))
    }
}

function onClientDisconnect() {
    var client = this
    if (client.browser) {
        client.broadcast(json({
            announcement:(client.browser)+' disconnected'
        }))
    }
    if (client.roomID){
        var clients = AppState.clients[client.roomID]
        var pos = clients.indexOf(client)
        if (pos >= 0) {
            clients.splice(pos, 1)
        }
    }
}

var port = 42234
app.listen(port)
console.log("Tutti listening on port " + port + ". Go to http://<host>:" + port)
