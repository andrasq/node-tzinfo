/**
 * tests for tzinfo
 *
 * Copyright (C) 2017 Andras Radics
 * Licensed under the Apache License, Version 2.0
 * You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 */

'use strict';

var fs = require('fs');
var tzinfo = require('./');

// America/Jamaica zoneinfo file, edited to add a leap second.
var ziJamaica = new Buffer([
0x54, 0x5a, 0x69, 0x66,
0x32,
0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
0x00, 0x00, 0x00, 0x03,
0x00, 0x00, 0x00, 0x03,
0x00, 0x00, 0x00, 0x02,
0x00, 0x00, 0x00, 0x15,
0x00, 0x00, 0x00, 0x03,
0x00, 0x00, 0x00, 0x0c,

0x93, 0x0f, 0xb4, 0xff, 0x07, 0x8d, 0x19, 0x70, 0x09, 0x10, 0xa4, 0x60, 0x09, 0xad, 0x94, 0xf0, 0x0a, 0xf0, 0x86, 0x60,
0x0b, 0xe0, 0x85, 0x70, 0x0c, 0xd9, 0xa2, 0xe0, 0x0d, 0xc0, 0x67, 0x70, 0x0e, 0xb9, 0x84, 0xe0,
0x0f, 0xa9, 0x83, 0xf0, 0x10, 0x99, 0x66, 0xe0, 0x11, 0x89, 0x65, 0xf0, 0x12, 0x79, 0x48, 0xe0,
0x13, 0x69, 0x47, 0xf0, 0x14, 0x59, 0x2a, 0xe0, 0x15, 0x49, 0x29, 0xf0, 0x16, 0x39, 0x0c, 0xe0,
0x17, 0x29, 0x0b, 0xf0, 0x18, 0x22, 0x29, 0x60, 0x19, 0x08, 0xed, 0xf0, 0x1a, 0x02, 0x0b, 0x60,

0x01, 0x02, 0x01, 0x02, 0x01, 0x02, 0x01, 0x02, 0x01, 0x02, 0x01, 0x02, 0x01, 0x02, 0x01, 0x02,
0x01, 0x02, 0x01, 0x02, 0x01,

0xff, 0xff, 0xb8, 0x01, 0x00, 0x00,
0xff, 0xff, 0xb9, 0xb0, 0x00, 0x04,
0xff, 0xff, 0xc7, 0xc0, 0x01, 0x08,

0x4b, 0x4d, 0x54, 0x00, 0x45, 0x53, 0x54, 0x00, 0x45, 0x44, 0x54, 0x00,

// we add leapcnt (2) pairs of 4-byte words
0xff, 0xff, 0xff, 0xfe, 0x00, 0x00, 0x00, 0x01,
0xff, 0xff, 0xff, 0xff, 0x00, 0x00, 0x00, 0x02,

0x00, 0x00, 0x00,
0x00, 0x00, 0x00,

// end of v1 zoneinfo, v2 starts here at offset 201 (originally 185)
0x54, 0x5a, 0x69, 0x66, // 'TZif' magic
0x32,                   // '2' version 2

// 15 bytes reserved padding
0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,

// 6 4-byte words header
0x00, 0x00, 0x00, 0x04,         // ttisgmtcnt, 4
0x00, 0x00, 0x00, 0x04,         // ttisstdcnt, 4
0x00, 0x00, 0x00, 0x02,         // leapcnt, edited to 2
0x00, 0x00, 0x00, 0x16,         // timecnt, 22
0x00, 0x00, 0x00, 0x04,         // typecnt, 4
0x00, 0x00, 0x00, 0x10,         // charcnt, 16

// timecnt (22) time transition timestamps, 8-byte quadwords
0xff, 0xff, 0xff, 0xff, 0x69, 0x87, 0x23, 0x7f, 0xff, 0xff, 0xff,
0xff, 0x93, 0x0f, 0xb4, 0xff, 0x00, 0x00, 0x00, 0x00, 0x07, 0x8d, 0x19, 0x70, 0x00, 0x00, 0x00,
0x00, 0x09, 0x10, 0xa4, 0x60, 0x00, 0x00, 0x00, 0x00, 0x09, 0xad, 0x94, 0xf0, 0x00, 0x00, 0x00,
0x00, 0x0a, 0xf0, 0x86, 0x60, 0x00, 0x00, 0x00, 0x00, 0x0b, 0xe0, 0x85, 0x70, 0x00, 0x00, 0x00,
0x00, 0x0c, 0xd9, 0xa2, 0xe0, 0x00, 0x00, 0x00, 0x00, 0x0d, 0xc0, 0x67, 0x70, 0x00, 0x00, 0x00,
0x00, 0x0e, 0xb9, 0x84, 0xe0, 0x00, 0x00, 0x00, 0x00, 0x0f, 0xa9, 0x83, 0xf0, 0x00, 0x00, 0x00,
0x00, 0x10, 0x99, 0x66, 0xe0, 0x00, 0x00, 0x00, 0x00, 0x11, 0x89, 0x65, 0xf0, 0x00, 0x00, 0x00,
0x00, 0x12, 0x79, 0x48, 0xe0, 0x00, 0x00, 0x00, 0x00, 0x13, 0x69, 0x47, 0xf0, 0x00, 0x00, 0x00,
0x00, 0x14, 0x59, 0x2a, 0xe0, 0x00, 0x00, 0x00, 0x00, 0x15, 0x49, 0x29, 0xf0, 0x00, 0x00, 0x00,
0x00, 0x16, 0x39, 0x0c, 0xe0, 0x00, 0x00, 0x00, 0x00, 0x17, 0x29, 0x0b, 0xf0, 0x00, 0x00, 0x00,
0x00, 0x18, 0x22, 0x29, 0x60, 0x00, 0x00, 0x00, 0x00, 0x19, 0x08, 0xed, 0xf0, 0x00, 0x00, 0x00,
0x00, 0x1a, 0x02, 0x0b, 0x60,

// timecnt (22) 1-byte indexes into the tzinfo structs, one for each time transition
0x01, 0x02, 0x03, 0x02, 0x03, 0x02, 0x03, 0x02, 0x03, 0x02, 0x03,
0x02, 0x03, 0x02, 0x03, 0x02, 0x03, 0x02, 0x03, 0x02, 0x03, 0x02,

// typecnt (4) tzinfo structs, each 6 bytes
0xff, 0xff, 0xb8, 0x01, 0x00, 0x00, 0xff, 0xff, 0xb8, 0x01, 0x00, 0x04,
0xff, 0xff, 0xb9, 0xb0, 0x00, 0x08, 0xff, 0xff, 0xc7, 0xc0, 0x01, 0x0c,

// charcnt (16) bytes of NUL-terminated timezone name abbreviations, here LMT KMT EST EDT
0x4c, 0x4d, 0x54, 0x00, 0x4b, 0x4d, 0x54, 0x00, 0x45, 0x53, 0x54, 0x00, 0x45, 0x44, 0x54, 0x00,

// leapcnt pairs of numbers, 8-byte quadword timestamp and 4-byte seconds count to add to GMT
// we store two back-to-back leap seconds just prior to 1970-01-01 GMT.
// TODO: verify that this 12-byte format is correct (manpage says so)
0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xfe, 0x00, 0x00, 0x00, 0x01,
0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0x00, 0x00, 0x00, 0x02,

// ttisstdcnt (4) flags
0x00, 0x00, 0x00, 0x00,

// ttisgmtcnt (4) flags
0x00, 0x00, 0x00, 0x00,

// newline separated additional info, here "EST5"
0x0a, 0x45, 0x53, 0x54, 0x35,
]);

var fnTrue = function fnTrue() { return true };
var fnFalse = function fnFalse() { return false };

module.exports = {
    'findZoneinfoFiles': {
        'should locate zoneinfo directory': function(t) {
            var myStatSync = function(pathname) { return { isDirectory: fnTrue } };
            var spy = t.stubOnce(fs, 'statSync', myStatSync);
            var dirname = tzinfo.findZoneinfoFiles();
            t.equal(spy.callCount, 1);
            t.equal(dirname, '/usr/share/zoneinfo');
            t.done();
        },

        'should skip non-directories': function(t) {
            var callCount = 0;
            var myStatSync = function(pathanme) {
                return callCount++ === 0 ? { isDirectory: fnFalse } : { isDirectory: fnTrue }
            };
            var spy = t.stub(fs, 'statSync', myStatSync);
            var dirname = tzinfo.findZoneinfoFiles();
            spy.restore();
            t.equal(spy.callCount, 2);
            t.equal(dirname, '/usr/lib/zoneinfo');
            t.done();
        },

        'should throw if zoneinfo directory not exists': function(t) {
            var myStatSync = function(pathname) { throw new Error('ENOENT') };
            var spy = t.stub(fs, 'statSync', myStatSync);
            try { tzinfo.findZoneinfoFiles(); t.fail() }
            catch (e) { t.contains(e.message, 'files not found'); }
            spy.restore();
            t.done();
        },

        'should throw if zoneinfo directory not a directory': function(t) {
            var myStatSync = function(pathname) { return { isDirectory: fnFalse } };
            var spy = t.stub(fs, 'statSync', myStatSync);
            try { tzinfo.findZoneinfoFiles(); t.fail() }
            catch (e) { t.contains(e.message, 'files not found'); }
            spy.restore();
            t.done();
        },
    },

    'readZoneinfoFileSync': {
        'should call fs.readFileSync': function(t) {
            var spy = t.spyOnce(fs, 'readFileSync');
            var buf = tzinfo.readZoneinfoFileSync("America/New_York");
            t.equal(spy.callCount, 1);
            t.contains(spy.callArguments[0], "America/New_York");
            t.done();
        },

        'should read zoneinfo file': function(t) {
            var buf = tzinfo.readZoneinfoFileSync("America/New_York");
            var info = tzinfo.parseZoneinfo(buf);
            t.contains(info.abbrevs, 'EDT\0');
            t.contains(info.abbrevs, 'EST\0');
            t.done();
        },

        'should throw if timezone not found': function(t) {
            t.throws(function() {
                tzinfo.readZoneinfoFileSync("America/Nonesuch");
            });
            t.done();
        },
    },

    'readZoneinfoFile': {
        'should call fs.readFile': function(t) {
            var spy = t.spyOnce(fs, 'readFileSync');
            var buf = tzinfo.readZoneinfoFileSync("America/New_York");
            t.equal(spy.callCount, 1);
            t.contains(spy.callArguments[0], "America/New_York");
            t.done();
        },

        'should read zoneinfo file': function(t) {
            tzinfo.readZoneinfoFile("America/New_York", function(err, buf) {
                var info = tzinfo.parseZoneinfo(buf);
                t.contains(info.abbrevs, 'EDT\0');
                t.contains(info.abbrevs, 'EST\0');
                t.done();
            })
        },

        'should return errors': function(t) {
            tzinfo.readZoneinfoFile("America/Nonesuch", function(err, buf) {
                t.ok(err);
                t.contains(err.message, 'ENOENT');
                t.done();
            })
        },
    },

    'parseZoneinfo': {
        'setUp': function(done) {
            ziJamaica[4] = '2'.charCodeAt(0);
            ziJamaica[201 + 4] = '2'.charCodeAt(0);
            done();
        },

        'should parse zoneinfo file': function(t) {
            var info = tzinfo.parseZoneinfo(ziJamaica);
            t.strictContains(info, {
                magic: 'TZif', version: '2',
                ttisgmtcnt: 4, ttisstdcnt: 4, leapcnt: 2,
                timecnt: 22,   typecnt: 4,    charcnt: 16,
                abbrevs: 'LMT\0KMT\0EST\0EDT\0',
                leaps: [ {time: -2, add: 1}, {time: -1, add: 2} ],
            });
            t.done();
        },

        'should parse v1 zoneinfo file': function(t) {
            ziJamaica[4] = 0;
            var info = tzinfo.parseZoneinfo(ziJamaica);
            t.strictContains(info, {
                magic: 'TZif', version: '\0',
                ttisgmtcnt: 3, ttisstdcnt: 3, leapcnt: 2,
                timecnt: 21,   typecnt: 3,    charcnt: 12,
                abbrevs: 'KMT\0EST\0EDT\0',
                leaps: [ {time: -2, add: 1}, {time: -1, add: 2} ],
            });
            t.done();
        },

        'should reject invalid v1 magic': function(t) {
            ziJamaica[4] = 2;
            var info = tzinfo.parseZoneinfo(ziJamaica);
            t.strictEqual(info, false);
            t.done();
        },

        'should reject invalid v2 magic': function(t) {
            ziJamaica[201+4] = 2;
            var info = tzinfo.parseZoneinfo(ziJamaica);
            t.strictEqual(info, false);
            t.done();
        },
    },

    'helpers': {
        'absearch': {
            'should find an element not larger than val': function(t) {
                var array = new Array();
                for (var i=10; i<=1000; i+=10) array.push(i);
                for (var i=11; i<=1001; i+=10) {
                    var ix = tzinfo.absearch(array, i);
                    t.equal(array[ix], i - 1, "absearch for " + i);
                }
                for (var i=19; i<=1009; i+=10) {
                    var ix = tzinfo.absearch(array, i);
                    t.equal(array[ix], i - 9, "absearch for " + i);
                }
                for (var i=10; i<=1000; i+=10) {
                    var ix = tzinfo.absearch(array, i);
                    t.equal(array[ix], i, "absearch for " + i);
                }
                t.equal(tzinfo.absearch(array, 1), -1);
                t.equal(tzinfo.absearch(array, 9), -1);
                t.equal(tzinfo.absearch(array, 10), 0);
                t.done();
            },
        },
    },
}
