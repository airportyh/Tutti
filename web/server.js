#!/usr/bin/env node

var io = require('socket.io'),
    express = require('express'),
    fs = require('fs'),
    json = JSON.stringify,
    guid = require('guid'),
    mkdirp = require('./lib/mkdirp.js').mkdirp,
    fspath = require('path'),
    log = console.log

var AllConfigs = {
    // Production socket.io domain
    prod: {
        port: 46071,
        rooms: true,
        http: true,
        socket: true
    },
    // Test environment
    test: {
        port: 32224,
        rooms: true,
        http: true,
        socket: true
    },
    // Normal dev environment
    dev: {
        port: 8080,
        rooms: true,
        http: true,
        socket: true
    },
    // Standalone dev environment - no multiple rooms, no DB required, just the
    // shell
    standalone: {
        port: 8080,
        rooms: false,
        http: true,
        socket: true
    },
    // Cloud9 dev environment, standalone
    cloud9: {
        port: process.env.C9_PORT,
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

// base directory for uploaded files
config.basedir = process.env.HOME + '/.tuttiserver'
console.log('config.basedir = ' + config.basedir)

function ensureDir(path){
    try{
        fs.mkdirSync(path, 0777)
    }catch(e){
        // Dir already exists? Great!
    }
}
ensureDir(config.basedir)
ensureDir(roomDir('root'))

// Create the server
var app = express.createServer()
// An app-wide dictionary of roomID -> clients
app.clients = {
    // For `standalone` mode we only have one roomID: `root`
    root : []
}

function roomDir(roomID){
    return [config.basedir, roomID].join('/')
}

function roomPath(roomID){
    return '/' + roomID + '/'
}

function filePath(roomID, filename){
    return roomDir(roomID) + '/' + filename
}

function initHTTP(){

    // server static files on ./public
    app.configure(function(){
        app.use(express.static(__dirname + '/public'))
    })

    app.get('/embed.js', function(req, res){
        res.header('Content-Type', 'application/javascript')
        var files = [
            'isa.js',
            'taskqueue.js',
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
                res.end(";new EmbeddedTuttiClient()")
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
        
        // create a room, stored in the filesystem
        app.post('/create_room', function(req, res){
            var roomID = guid.create().toString()
            fs.mkdir(roomDir(roomID), 0777, function(err){
                if (err) console.error(err.message)
                else{
                    var path = roomPath(roomID)
                    log('room created ' + roomID)
                    res.redirect(path)
                }
            })
        })

        // page for entering the JS shell. You must have a valid roomID
        // to enter. You should be redirected here from `/create_room` 
        // or gotten the  URL from copy-n-paste.
        app.get('/:roomID/', function(req, res){
            var roomID = req.param('roomID')
            console.log('roomID: ' + roomID)
            fs.stat(roomDir(roomID),  function(err, stat){
                if (err){
                    res.send(err.message, 404)
                }else if (!stat.isDirectory()){
                    res.send('That room does not exist.', 404)
                }else{
                    res.sendfile(__dirname + '/public/shell.html')
                }
            })
        })
        
        app.get(/^\/(.+)\/(.*)$/, function(req, res){
            var roomID = req.param[0],
                file = req.param[1]
            res.sendfile(filePath(file))
        })
        
        
        
        // If accessing the room w/o a slash at the end, redirect to
        // a URL *with* a slash
        app.get('/:roomID', function(req, res){
            res.redirect('/' + req.param('roomID') + '/')
        })
        
    }else{
        
        // Just serve the shell at the top level URL if no rooms needed.
        app.get('/', function(req, res){
            res.sendfile(__dirname + '/public/shell.html')
        })
        
        app.get(/^\/(.*)$/, function(req, res){
            var file = req.params[0]
            var path = filePath('root', file)
            res.sendfile(path)
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

// remove any socket client references that have disconnected
function cleanupClients(roomID){
    var clients = getClients(roomID)
    clients.forEach(function(client, i){
        if (!client.connected)
            clients.splice(i, 1)
    })
}

// save a file uploaded from a client
function saveFile(message, roomID, client){
    log(['saving', message.filename, 'to room', roomID].join(' '))
    var filename = message.filename,
        content = message.upload,
        path = filePath(roomID, filename),
        dir = fspath.dirname(path)
    log('file path: ' + path)
    log('dir: ' + dir)
    mkdirp(dir, 0755, function(err){
        if (err) console.log(err)
        else fs.writeFile(path, content, function(err){
            if (err){
                log(err)
                client.send(json({upload: 'error', error: err.message}))
            }else{
                log('wrote ' + message.filename + ' succeed!')
                client.send(json({upload: 'succeed', filename: filename}))
            }
        })
    })
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
        
        
        cleanupClients(roomID)
        log('Clients in room: ' + clients.length)
        
        client.send(json({browsers: getBrowsers(clients)}))
        
        //message.sessionId = client.sessionId
        message.browser = client.browser

        var name = client.browser || client.term
        
        if (name)
            broadcast(client, {announcement:name + ' joined'})
    }
    
    var client = this
    var message = JSON.parse(data)
    if (message.login) {
        var roomID
        
        if (config.rooms){
            roomID = message.login.roomID
            fs.stat(roomDir(roomID), function(err, stat){
                if (err){
                    client.send(json({announcement:err.message + ' Sorry!'}))
                    client._onDisconnect()
                    return
                }
                if (!stat.isDirectory()){
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
        var roomID = client.roomID
        if (message.browsers){
            var browsers = getBrowsers(getClients(client.roomID))
            client.send(json({browsers: browsers}))
        }else if (message.upload){
            saveFile(message, roomID, client)
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