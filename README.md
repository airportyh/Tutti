Tutti - Interactively run Javascript on multiple browsers
=========================================================
Tutti is a web-based interactive Javascript console that allows you to simultaneously execute commands on multiple browsers. This is useful for debugging and discovering browser differences.

The live site
-------------
<http://tuttijs.com/>

To get started, create a room and bookmark the URL associated with that room. Copy-and-paste the room URL to other browsers to connect them to the same room. Javascript that you execute in the console will be executed on all browsers within this room and the results displayed.

The Tutti Terminal
------------------
There's also a terminal version of Tutti which you can install with

    npm install tutti
    
Sometimes `sudo` may be needed depending on your npm installation. Now, run with

    tutti <tutti room url>
    
The Tutti Driver
----------------
`npm install tutti` also installs a node library that let's you programmatically script the browsers that are connected to a particular room.
See the [Tutti lib README.md](https://github.com/airportyh/Tutti/blob/master/lib/README.md) for more.

To run locally
--------------
    
    npm install tuttiserver
    tuttiserver

Then,

1. Point your browser to <http://localhost:8080>.
2. Point more browsers to the same location.
3. Type commands into any of the browsers you have open and see them executed on all of them.

Code Examples from JSConf
-------------------------
I've posted my [code examples](https://github.com/airportyh/Tutti-JSConf-Code-Examples) used at my JSConf 2011 demos.

Credits
-------
Tutti depends on the follow software:

1. [node.js](http://nodejs.org/)
2. [socket.IO](http://socket.io/)
3. [Express](http://expressjs.com/)
3. [jQuery](http://jquery.com/)
4. [jquery.console.js](https://github.com/chrisdone/jquery-console)

License
-------

(The MIT License)

Copyright (c) 2011 Toby Ho &lt;airportyh@gmail.com&gt;

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the 'Software'), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
