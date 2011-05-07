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
    
and run with

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

Credits
-------
Tutti depends on the follow software:

1. [node.js](http://nodejs.org/)
2. [socket.IO](http://socket.io/)
3. [Express](http://expressjs.com/)
3. [jQuery](http://jquery.com/)
4. [jquery.console.js](https://github.com/chrisdone/jquery-console)
