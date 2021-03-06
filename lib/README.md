Tutti Terminal and Driver
=========================
This package contains

1. A CLI interface for [Tutti](http://tuttijs.com).
2. A driver library for interfacing with [Tutti](http://tuttijs.com) programatically.

[Tutti](http://tuttijs.com) is an interactive Javascript shell with which you can test Javascript on multiple browsers simultaneously.

Prerequisites
-------------
1. [node.js](http://nodejs.org/) 0.4 or above
2. [npm](http://npmjs.org/) 1.0 or above

Installation
-------------

    npm install tutti -g
    
`-g` means install globally(will install executable to `/usr/local/bin`). You could leave it off to install locally. `sudo` may be required depending on your npm install. See [npm docs](https://github.com/isaacs/npm#readme) for more info.

CLI interface Usage
-------------

    tutti <tutti_room_url>
    
This is the equivalent of the web-based Tutti console, only it's in your terminal. It has the same commands: `:help`, `:browsers`, `:reset`. It doesn't have any browsers on its own, so you'll have to connect browsers to the same room using the web-based Tutti in order to actually do anything. Type `exit` to get out of the program.
    
Driver Library
-------------
Here is an example of using the Tutti driver to run a test suite using jasmine.

    var log = console.log
    var sys = require('sys')
    var Tutti = require('tutti').Tutti

    function indent(str){
        return str.split('\n').map(function(l){return '  ' + l}).join('\n')
    }

    function display(msg){
        if ('error' in msg){
            log(msg.browser)
            log(indent(msg.error))
        }else if ('console' in msg){
            log(msg.browser)
            log(indent(msg.console))
        }
    }

    Tutti('<tutti_room_url>')
        .on('message', display)
        .reset()
        .load('jasmine.js')
        .load('consoleJasmineReporter.js')
        .load('tests.js')
        .eval('jasmine.getEnv().addReporter(new ConsoleJasmineReporter())')
        .eval('jasmine.getEnv().execute()')
        .wait('console')
        .exit()
        
Driver API
----------

### var tutti = Tutti(room_url)
Creates a new driver and connects to the room specified by the URL.

### tutti.on(message, callback)
Bind to events. Available events are:

- 'connect' - connection established.
- 'message' - a message from the server.
- 'disconnect' - connection terminated.

### tutti.eval(jsOrFunction)
Send a Javascript command to the connected browsers. `jsOrFunction` can either be a string containing Javascript or a function, in which case the function will be executed remotely in the browsers.

### tutti.load(localJSFile, _localJSFile2, ..._)
or
### tutti.load(arrayOfJLocalJSFiles)
Load one or more local Javascript files to be executed by the connected browsers.

### tutti.reset()
Resets the iframe sandbox in the connected browsers. All state will be blown away.

### tutti.wait(messageType, matcher, timeout)
Wait for a type of message before moving on to the next command in the chain.
`messageType` is one of `console`, `error`, `reply`, `announcement`, and `browser`.
`matcher` is a regular expression used to match the content of the message.
`timeout` is the time to wait before giving up and moving on.

### tutti.exit()
Exit this node program.

### tutti.disconnect()
Disconnect with the Tutti server.
    
Code Examples
-------------
I have the [code examples](https://github.com/airportyh/Tutti-JSConf-Code-Examples) I used for my JSConf 2011 presentation. Please use that as a reference point.

License
-------

(The MIT License)

Copyright (c) 2011 Toby Ho &lt;airportyh@gmail.com&gt;

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the 'Software'), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.