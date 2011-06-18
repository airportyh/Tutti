Test Plan for Tutti
===================

A checklist of things to test before I release.

Tutti Console
-------------

1. console
    * can eval
    * can console.log
    * test all commands
2. multiple browsers(IE6,7,8,9,FF,Safari,Chrome,Opera)
    * can eval on either browser
    * results display on all browsers
    * test obvious differences in browsers
    * make sure to include IE
3. driver
    * run example script
    * repeat runs and make sure the test suite runs through correctly each time
    * test actually installing it as a user and then requiring it
4. embed and marklet
    * make sure they still work
5. tutti terminal
    * can eval
    * can console.log
    * test all commands