require.paths.unshift(__dirname + '/lib')

var io = require('socket.io')
var express = require('express')
var fs = require('fs')
var Couch = require('couchdb').Couch
var json = json = JSON.stringify

var AllConfigs = {
    // Production socket.io domain
    prod: {
        port: 46071,
        rooms: true,
        http: true,
        socket: true,
        db: 'tutti'
    },
    // Test environment
    test: {
        port: 32224,
        rooms: true,
        http: true,
        socket: true,
        db: 'tuttitest'
    },
    // Normal dev environment
    dev: {
        port: 8080,
        rooms: true,
        http: true,
        socket: true,
        db: 'tutti'
    },
    // Standalone dev environment - no multiple rooms, no DB required, just the
    // shell
    standalone: {
        port: 8080,
        rooms: false,
        http: true,
        socket: true
    }
}

// Figure out the environment to run in and setup the config
var env = process.argv[2] || 'standalone'
if (!(env in AllConfigs)){
    console.log('Unknown environment: ' + env)
    process.exit()
}
console.log('Starting "' + env + '" environment.')
var config = AllConfigs[env]

// Create the server
var app = express.createServer()
// app-wide count of currently connected clients
var numClients = 0
// An app-wide dictionary of roomID -> clients
app.clients = {
    // For `standalone` mode we only have one roomID: `root`
    root : []
}


// a CouchDB instance to store the rooms info
var db = config.rooms ? new Couch(config.db) : null

function initHTTP(){

    // server static files on ./public
    app.configure(function(){
        app.use(express.staticProvider(__dirname + '/public'))
    })

    if (config.rooms){
        
        // front page is the intro/welcome page which will have a 'Create Room'
        // button
        app.get('/', function(req, res){
            res.sendfile(__dirname + '/public/intro.html')
        })
        
        // create a room, stored in couchdb
        app.post('/create_room', function(req, res){
            db.post({}, function(reply){
                var roomID = reply.id
                var path = '/' + roomID
                console.log('room created ' + path)
                res.redirect(path)
            })
        })

        // page for entering the JS shell. You must have a valid roomID
        // to enter. You should be redirected here from `/create_room` 
        // or gotten the  URL from copy-n-paste.
        app.get('/:roomID', function(req, res){
            var roomID = req.param('roomID')
            db.get(roomID, function(room){
                if (!room){
                    res.send('That room does not exist.', 404)
                }else{
                    res.sendfile(__dirname + '/public/shell.html')
                }
            })
        })
        
    }else{
        
        // Just serve the shell at the top level URL if no rooms needed.
        app.get('/', function(req, res){
            res.sendfile(__dirname + '/public/shell.html')
        })
    }
}

// init socket.io
function initSocketIO(){
    var socket = io.listen(app)
    socket.on('connection', function(client) {
        client.on('message', handleErrs(onClientMessage, true).bind(client))
        client.on('disconnect', handleErrs(onClientDisconnect).bind(client))
    })
}

// function wrapper to auto-handle errors thrown
function handleErrs(f, disconnect){
    return function(){
        try{
            f.apply(this, arguments)
        }catch(e){
            console.log(e)
            if (disconnect)
                this._onDisconnect()
        }
    }
}

// get the connected clients currently in a room. Init the clients array
// if needed.
function getClients(roomID){
    var ret = app.clients[roomID]
    if (!ret){
        ret = app.clients[roomID] = []
    }
    return ret
}

// *my* broadcast, which only broadcasts within the same room
function broadcast(client, message){
    var clients = getClients(client.roomID)
    // broadcasts to other peers in the same room
    clients.forEach(function(peer){
        if (peer !== client)
            peer.send(json(message))
    })
}

// called when a messages comes from a socket
function onClientMessage(data) {
    
    function onLoggedIn(roomID, message){
        clients = getClients(roomID)
        
        var browsers = clients.map(function(c){return c.browser})
        client.browser = message.login.browser
        client.roomID = roomID
        if (message.reconnect){
            client.send(json({announcement: "Reconnected!"}))
        }else{
            client.send(json({announcement: "<br>Welcome to Tutti - interactively run Javascript on multiple browsers!"}))
            client.send(json({announcement: "===================================================================="}))
            client.send(json({announcement: "You can execute any Javascript in the shell below."}))
            client.send(json({browsers:browsers}))
            client.send(json({announcement: "<br>To connect another browser, just copy-n-paste the current URL into it."}))
        }
        clients.push(client)
        //message.sessionId = client.sessionId
        message.browser = client.browser

        broadcast(client, {announcement:client.browser + ' joined'})
        numClients++
        console.log('numClients: ' + numClients)
    }
    
    var client = this
    var message = JSON.parse(data)
    if (message.login) {
        
        var clients
        var roomID
        if (config.rooms){
            roomID = message.login.roomID
            
            db.get(roomID, function(room){
                if (!room){
                    client.send({announcement:"Room does not exist. Try going back to the front page and creating another room."})
                    client._onDisconnect()
                    return
                }

                if (room.secret !== message.login.secret){
                    client.send({announcement:"Login failed! You gave the wrong secret token for this room. Bye!"})
                    client._onDisconnect()
                    return
                }
                
                onLoggedIn(roomID, message)
            })
            
        }else{
            roomID = 'root'
            onLoggedIn(roomID, message)
        }
        
    }else if(client.roomID){
        message.browser = client.browser
        broadcast(client, message)
    }else{
        client._onDisconnect()
    }
}

// when a socket disconnects
function onClientDisconnect() {
    numClients--
    var client = this
    if (client.browser) {
        broadcast(client, {
            announcement:(client.browser)+' disconnected'
        })
    }
    if (client.roomID){
        var clients = getClients(client.roomID)
        var pos = clients.indexOf(client)
        if (pos >= 0) {
            clients.splice(pos, 1)
        }
    }
}

if (config.http)
    initHTTP()
if (config.socket)
    initSocketIO()

// start the server
app.listen(config.port)
console.log("Tutti listening on port " + config.port + '.')