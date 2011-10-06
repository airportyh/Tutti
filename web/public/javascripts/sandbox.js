var MSIE/*@cc_on =1@*/; // sniff
parent.sandbox= MSIE ?
    this :
    {eval:function(s){return window.eval(s)}};
this.console = {log: parent.consoleLog};

var alert = function(){ throw new Error("Sorry, can't alert() in here.")};
var print = function(){ throw new Error("Sorry, can't print() in here.")};
var confirm = function(){ throw new Error("Sorry, can't confirm() in here.")};
var open = function(){ throw new Error("Sorry, can't open() in here.")};
var Tutti = parent.Tutti