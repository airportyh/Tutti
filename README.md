Tutti - Interactively run Javascript on multiple browsers
=========================================================
Tutti is a web-based interactive Javascript console that allows you to simultaneously execute commands on multiple browsers. This is useful for debugging and discovering browser differences.

The live site
-------------
<http://tutti.tobyho.com/>

To run locally
--------------
To start the server:

    node server.js

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
