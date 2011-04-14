require.paths.unshift(__dirname + '/lib')
var io = require('socket.io')
var express = require('express');

var app = express.createServer();

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

function onClientMessage(data){
    console.log('DATA: ' + data)
}

function onClientDisconnect(){
    console.log('DISCONNECT')
}

var socket = io.listen(app)
socket.on('connection', function(client) {
    client.on('message', handleErrs(onClientMessage, true).bind(client))
    client.on('disconnect', handleErrs(onClientDisconnect).bind(client))
})

app.listen(8080)