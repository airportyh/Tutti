var path = require('path');
var fs = require('fs');

exports.mkdirp = exports.mkdirP = function mkdirP (p, mode, f) {
    var cb = f || function () {};
    var ps = path.normalize(path.resolve(p)).split('/');
    path.exists(p, function (exists) {
        if (exists) cb(null);
        else mkdirP(ps.slice(0,-1).join('/'), mode, function (err) {
            if (err && err.code !== 'EEXIST') cb(err)
            else{
                console.log('mkdir(' + p + ')')
                fs.mkdir(p, mode, function (err) {
                    if (err && err.code !== 'EEXIST') cb(err)
                    else cb()
                })
            };
        });
    });
};
