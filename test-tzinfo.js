'use strict';

var tzinfo = require('./');

module.exports = {
    'findZoneinfoFiles': {
        'should locate zoneinfo directory': function(t) {
            var dirname = tzinfo.findZoneinfoFiles();
            t.ok(dirname.length > 0);
            t.done();
        }
    },
}
