/**
 * tests for tzinfo
 *
 * Copyright (C) 2017 Andras Radics
 * Licensed under the Apache License, Version 2.0
 * You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 */

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
