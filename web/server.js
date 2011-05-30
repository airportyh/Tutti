#!/usr/bin/env node
require.paths.unshift(__dirname + '/lib')

var io = require('socket.io')
var express = require('express')
var fs = require('fs')
var Couch = require('couchdb').Couch
var json = json = JSON.stringify
var log = console.log

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
    log('Unknown environment: ' + env)
    process.exit()
}
log('Starting "' + env + '" environment.')
var config = AllConfigs[env]

// Create the server
var app = express.createServer()
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
        app.use(express.static(__dirname + '/public'))
    })

    app.get('/embed.js', function(req, res){
        res.header('Content-Type', 'application/javascript')
        var files = [
            'socket.io.min.js',
            'tutticlient.js'
        ]
        function sendNext(){
            var file = files.shift()
            if (file){
                fs.readFile(__dirname + '/public/javascripts/' + file, function(err, data){
                    res.write(';' + data)
                    sendNext()
                })
            }else{
                res.end(";new EmbeddedTuttiClient().connect()")
            }
        }
        sendNext()
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
                log('room created ' + path)
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
            log(e)
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

// get a client from a room
function getClient(sessionID, roomID){
    var clients = getClients(roomID), len = clients.length
    for (var i = 0; i < len; i++)
        if (clients[i].sessionId === sessionID)
            return clients[i]
    return null
}

// send a message to a particular recipient
function sendTo(roomID, recipient, message){
    //log('sendTo ' + recipient)
    var client = getClient(recipient, roomID)
    if (client){
        client.send(json(message))
        //log('sent message to ' + recipient)
    }
}

// *my* broadcast, which only broadcasts within the same room
function broadcast(client, message, all){
    var clients = getClients(client.roomID)
    // broadcasts to other peers in the same room
    clients.forEach(function(peer){
        if (all || (peer !== client))
            peer.send(json(message))
    })
}

function getBrowsers(clients){
    return clients.reduce(function(curr, c){
        if (c.browser) curr.push({
            sessionId: c.sessionId, 
            browser: c.browser
        })
        return curr
    }, [])
}



// called when a messages comes from a socket
function onClientMessage(data) {
    
    //log("DATA: " + data)
    function onLoggedIn(roomID, message){
        var clients
        clients = getClients(roomID)
        
        var browsers = getBrowsers(clients)
        client.browser = message.login.browser
        client.term = message.login.term
        client.roomID = roomID
        clients.push(client)
        
        client.send(json({browsers: getBrowsers(clients)}))
        
        //message.sessionId = client.sessionId
        message.browser = client.browser

        var name = client.browser || client.term
        
        if (name)
            broadcast(client, {announcement:name + ' joined'})
        log('Clients in room: ' + clients.length)
    }
    
    var client = this
    var message = JSON.parse(data)
    if (message.login) {
        var roomID
        
        if (config.rooms){
            roomID = message.login.roomID
            
            db.get(roomID, function(room){
                if (!room){
                    client.send(json({announcement:"Room does not exist. Try going back to the front page and creating another room."}))
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
        if (message.command === ':browsers'){
            var browsers = getBrowsers(getClients(client.roomID))
            client.send(json({browsers: browsers}))
        }else{
            message.sessionId = client.sessionId
            message.browser = client.browser
            if (message.recipient)
                sendTo(client.roomID, message.recipient, message)
            else
                broadcast(client, message)
        }
    }else{
        client._onDisconnect()
    }
}

// when a socket disconnects
function onClientDisconnect() {
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
log("Tutti listening on port " + config.port + '.')