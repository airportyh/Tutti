var http = require('http'),
    sys = require('sys')

function keys(obj){
  var ret = []
  for (var key in obj) ret.push(key)
  return ret
}

function expandViewPath(viewPath, params){
    var parts = viewPath.split('/')
    var viewPath = '_design/' + parts[0] + '/_view/' + parts[1]
    var qs = params ? keys(params).map(function(key){return key + '=' + encodeURI(JSON.stringify(params[key]))}).join('&') : null
    if (qs) viewPath += '?' + qs
    //sys.debug('viewPath: ' + viewPath)
    return viewPath
}

var Couch = function Couch(name, host, port){
  this.name = name
  this.host = host || 'localhost'
  this.port = port || 5984
  this.baseUrl = '/' + name + '/'
}
Couch.prototype = {
  get: function(id, callback, context){
    this.request('GET', this.baseUrl + id, null, callback, context)
  },
  post: function(doc, callback, context){
    this.request('POST', this.baseUrl, doc, callback, context)
  },
  put: function(doc, callback, context){
    this.request('PUT', this.baseUrl + doc._id, doc, callback, context)
  },
  del: function(doc, callback, context){
    this.request('DELETE', this.baseUrl + doc._id + '?rev=' + doc._rev, null, callback, context)
  },
  forceDelete: function(id, callback, context){
      this.get(id, function(doc){
          this.del(doc, callback, context)
      }, this)
  },
  view: function(viewPath, params, callback, context){
    this.get(expandViewPath(viewPath, params), callback, context)
  },  
  drop: function(callback, context){
    this.request('DELETE', '/' + this.name, null, callback, context)
  },
  create: function(callback, context){
    this.request('PUT', '/' + this.name, null, callback, context)
  },
  request: function request(verb, uri, data, callback, context){
    var client = http.createClient(this.port, this.host)
    var request = client.request(verb, uri, {})
    if (verb != 'GET')
  	  request.write(JSON.stringify(data), "utf8");
  	request.addListener('response', function(response) {
  	    var responseBody = ""
  		response.setBodyEncoding("utf8")
  		response.addListener("data", function(chunk) {
  		    responseBody += chunk
  		})
  		response.addListener("end", function() {
  			//sys.puts(responseBody)
  			var result = JSON.parse(responseBody);
  			if (callback)
  			  callback.call(context, result, response.statusCode)
  		})
  	})
  	request.end()
  },
  updateView: function(id, _design){
    var self = this
    this.get(id, function(design){
        if (design.error == 'not_found'){
              design = {
                  _id: id,
                  language: "javascript",
                  views: {}
              }
        }
        for (var view in _design){
            design.views[view] = {}
            if (_design[view].map)
                design.views[view].map = _design[view].map.toString()
            if (_design[view].reduce)
                design.views[view].reduce = _design[view].reduce.toString()
        }
        sys.puts(JSON.stringify(design))
        self.put(design)  
    })
  },
  updateViews: function(designs){
      for (var key in designs){
          var _design = designs[key]
          var id = '_design/' + key
          this.updateView(id, _design)
      }
  }
}

exports.Couch = Couch
