/**
 * tests for tzinfo
 *
 * Copyright (C) 2017-2018 Andras Radics
 * Licensed under the Apache License, Version 2.0
 * You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 */

'use strict';

var fs = require('fs');
var tzinfo = require('./');

// America/Jamaica zoneinfo file, edited to add a leap second.
// Note: this is "America/Jamaica" from mid-2017, without the later /usr/share/zoneinfo updates
var ziJamaica = new Buffer([
0x54, 0x5a, 0x69, 0x66,
0x32,
0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
0x00, 0x00, 0x00, 0x03,         // isgmtcnt (3; note that v2 has 4)
0x00, 0x00, 0x00, 0x03,         // isstdcnt (3; note that v2 has 4)
0x00, 0x00, 0x00, 0x02,         // leapcnt (hand-edited to 2)
0x00, 0x00, 0x00, 0x15,         // timecnt num time transitions (21; note that v2 has 22)
0x00, 0x00, 0x00, 0x03,         // typecnt (3; note that v2 has 4)
0x00, 0x00, 0x00, 0x0c,         // charcnt (12; note that v2 has 16)

// timecnt v1 trantision times
0x93, 0x0f, 0xb4, 0xff, 0x07, 0x8d, 0x19, 0x70, 0x09, 0x10, 0xa4, 0x60, 0x09, 0xad, 0x94, 0xf0, 0x0a, 0xf0, 0x86, 0x60,
0x0b, 0xe0, 0x85, 0x70, 0x0c, 0xd9, 0xa2, 0xe0, 0x0d, 0xc0, 0x67, 0x70, 0x0e, 0xb9, 0x84, 0xe0,
0x0f, 0xa9, 0x83, 0xf0, 0x10, 0x99, 0x66, 0xe0, 0x11, 0x89, 0x65, 0xf0, 0x12, 0x79, 0x48, 0xe0,
0x13, 0x69, 0x47, 0xf0, 0x14, 0x59, 0x2a, 0xe0, 0x15, 0x49, 0x29, 0xf0, 0x16, 0x39, 0x0c, 0xe0,
0x17, 0x29, 0x0b, 0xf0, 0x18, 0x22, 0x29, 0x60, 0x19, 0x08, 0xed, 0xf0, 0x1a, 0x02, 0x0b, 0x60,

// timecnt zoneinfo indexes
0x01, 0x02, 0x01, 0x02, 0x01, 0x02, 0x01, 0x02, 0x01, 0x02, 0x01, 0x02, 0x01, 0x02, 0x01, 0x02,
0x01, 0x02, 0x01, 0x02, 0x01,

// typecnt time transition (zoneinfo) structs (4B gmtoffs, 1B isdst, 1B abbrev byte idx)
0xff, 0xff, 0xb8, 0x01, 0x00, 0x00,
0xff, 0xff, 0xb9, 0xb0, 0x00, 0x04,
0xff, 0xff, 0xc7, 0xc0, 0x01, 0x08,

// charcnt bytes of nul-terminated ascii timezone name abbreviations
0x4b, 0x4d, 0x54, 0x00, 0x45, 0x53, 0x54, 0x00, 0x45, 0x44, 0x54, 0x00,

// we add leapcnt (2) pairs of 4-byte words
0xff, 0xff, 0xff, 0xfe, 0x00, 0x00, 0x00, 0x01,
0xff, 0xff, 0xff, 0xff, 0x00, 0x00, 0x00, 0x02,

0x00, 0x00, 0x00,
0x00, 0x00, 0x00,

// ----------------------------------------------------------------
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

// typecnt (4) tzinfo structs, each 6 bytes (4B gmtoffs, 1B isdst, 1B abbrev byte idx)
0xff, 0xff, 0xb8, 0x01, 0x00, 0x00,     // -18431, 0, 0 LMT (is -18430 in May 2018)
0xff, 0xff, 0xb8, 0x01, 0x00, 0x04,     // -18431, 0, 4 KMT (is -18430 in May 2018)
0xff, 0xff, 0xb9, 0xb0, 0x00, 0x08,     // -18000, 0, 8 EST
0xff, 0xff, 0xc7, 0xc0, 0x01, 0x0c,     // -14400, 1, 12 EDT

// charcnt (16) bytes of NUL-terminated timezone name abbreviations, here LMT KMT EST EDT
0x4c, 0x4d, 0x54, 0x00, 0x4b, 0x4d, 0x54, 0x00, 0x45, 0x53, 0x54, 0x00, 0x45, 0x44, 0x54, 0x00,

// leapcnt (2) pairs of numbers, 8-byte quadword timestamp and 4-byte seconds count to add to GMT
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

/*----------------
For testing, here are the last few lines from Jamaica before it stopped DST:
% zdump -v America/Jamaica
...
America/Jamaica  Sun Apr 25 06:59:59 1982 UT = Sun Apr 25 01:59:59 1982 EST isdst=0 gmtoff=-18000
America/Jamaica  Sun Apr 25 07:00:00 1982 UT = Sun Apr 25 03:00:00 1982 EDT isdst=1 gmtoff=-14400
America/Jamaica  Sun Oct 31 05:59:59 1982 UT = Sun Oct 31 01:59:59 1982 EDT isdst=1 gmtoff=-14400
America/Jamaica  Sun Oct 31 06:00:00 1982 UT = Sun Oct 31 01:00:00 1982 EST isdst=0 gmtoff=-18000
America/Jamaica  Sun Apr 24 06:59:59 1983 UT = Sun Apr 24 01:59:59 1983 EST isdst=0 gmtoff=-18000
America/Jamaica  Sun Apr 24 07:00:00 1983 UT = Sun Apr 24 03:00:00 1983 EDT isdst=1 gmtoff=-14400
America/Jamaica  Sun Oct 30 05:59:59 1983 UT = Sun Oct 30 01:59:59 1983 EDT isdst=1 gmtoff=-14400
America/Jamaica  Sun Oct 30 06:00:00 1983 UT = Sun Oct 30 01:00:00 1983 EST isdst=0 gmtoff=-18000
America/Jamaica  Mon Jan 18 03:14:07 2038 UT = Sun Jan 17 22:14:07 2038 EST isdst=0 gmtoff=-18000
America/Jamaica  Tue Jan 19 03:14:07 2038 UT = Mon Jan 18 22:14:07 2038 EST isdst=0 gmtoff=-18000
---------------- */

var fnTrue = function fnTrue() { return true };
var fnFalse = function fnFalse() { return false };

module.exports = {
    'locateZoneinfoDirectory': {
        'should have located the zoneinfo directory when loaded': function(t) {
            var dir = tzinfo.zoneinfoDir;
            t.equal(dir[0], '/');
            t.contains(dir, '/zoneinfo');
            t.done();
        },

        'should locate zoneinfo directory': function(t) {
            var myStatSync = function(pathname) { return { isDirectory: fnTrue } };
            var spy = t.stubOnce(fs, 'statSync', myStatSync);
            var dirname = tzinfo.locateZoneinfoDirectory();
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
            var dirname = tzinfo.locateZoneinfoDirectory();
            spy.restore();
            t.equal(spy.callCount, 2);
            t.equal(dirname, '/usr/lib/zoneinfo');
            t.done();
        },

        'should throw if zoneinfo directory not exists': function(t) {
            var myStatSync = function(pathname) { throw new Error('ENOENT') };
            var spy = t.stub(fs, 'statSync', myStatSync);
            try { tzinfo.locateZoneinfoDirectory(); t.fail() }
            catch (e) { t.contains(e.message, 'files not found'); }
            spy.restore();
            t.done();
        },

        'should throw if zoneinfo directory not a directory': function(t) {
            var myStatSync = function(pathname) { return { isDirectory: fnFalse } };
            var spy = t.stub(fs, 'statSync', myStatSync);
            try { tzinfo.locateZoneinfoDirectory(); t.fail() }
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
        'tearDown': function(done) {
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

    'findTzinfo': {
        'before': function(done) {
            this.zinfo = tzinfo.parseZoneinfo(ziJamaica);
            done();
        },

        'should call absearch': function(t) {
            var spy = t.spyOnce(tzinfo, 'absearch');
            tzinfo.findTzinfo(this.zinfo, 12345678);
            t.equal(spy.callCount, 1);
            t.done();
        },

        'should always find GMT zinfo': function(t) {
            var ziGmt = tzinfo.parseZoneinfo(tzinfo.readZoneinfoFileSync("GMT"));
            var ziUtc = tzinfo.parseZoneinfo(tzinfo.readZoneinfoFileSync("UTC"));
            var now = new Date();

            t.ok(tzinfo.findTzinfo(ziGmt, now));
            t.ok(tzinfo.findTzinfo(ziGmt, -10000000000));
            t.ok(tzinfo.findTzinfo(ziGmt, 0));
            t.ok(tzinfo.findTzinfo(ziGmt, '2999-01-01T01:02:03Z'));

            t.ok(tzinfo.findTzinfo(ziUtc, now));
            t.ok(tzinfo.findTzinfo(ziUtc, -10000000000));
            t.ok(tzinfo.findTzinfo(ziUtc, 0));
            t.ok(tzinfo.findTzinfo(ziUtc, '2999-01-01T01:02:03Z'));

            t.done();
        },

        'should find the tzinfo of a timestamp': function(t) {
            var times = [
                'Sun Apr 25 06:59:59 1982 UTC',         // before DST
                '1982-04-25T06:59:59Z',                 // same before DST, test notation too
                'Sun Apr 25 07:00:00 1982 UTC',         // after DST
                'Sun Aug 25 07:02:04 1982 UTC',         // same DST, a few months later
            ];
            var checks = { strings: [], dates: [], millis: [] };
            for (var i=0; i<times.length; i++) checks.strings.push(times[i]);
            for (var i=0; i<times.length; i++) checks.dates.push(new Date(times[i]));
            for (var i=0; i<times.length; i++) checks.millis.push(new Date(times[i]).getTime());
            for (var dateType in checks) {
                var tz1 = tzinfo.findTzinfo(this.zinfo, checks[dateType][0]);
                t.equal(tz1.abbrev, 'EST');
                t.equal(tz1.tt_gmtoff, -18000);

                var tz2 = tzinfo.findTzinfo(this.zinfo, checks[dateType][1]);
                t.equal(tz2, tz1);

                var tz2 = tzinfo.findTzinfo(this.zinfo, checks[dateType][2]);
                t.equal(tz2.abbrev, 'EDT', 'test "' + dateType + '": ' + checks[dateType][2]);
                t.equal(tz2.tt_gmtoff, -14400);

                var tz3 = tzinfo.findTzinfo(this.zinfo, checks[dateType][3]);
                t.equal(tz3, tz2);
            }
            t.done();
        },

        'should return false if the timestamp is too early': function(t) {
            t.equal(tzinfo.findTzinfo(this.zinfo, '1801-01-01T01:02:03Z'), false);
            // note: the test dataset has the gmt offset 0xffffb801 (-18431), but May 2018 zoneinfo has 0xffffb802 (-18430)
            t.equal(tzinfo.findTzinfo(this.zinfo, '1801-01-01T01:02:03Z', true).tt_gmtoff, -18431);
            t.done();
        },
    },

    'getZoneinfoDirectory': {
        'should return directory located at load time': function(t) {
            var dirname = tzinfo.getZoneinfoDirectory();
            try {
                var stat = fs.statSync(dirname + '/America');
                t.ok(stat.isDirectory());
                t.done();
            } catch(err) {
                t.fail();
            }
        },
    },

    'listZoneinfoFiles': {
        'should return empty array if not a directory': function(t) {
            var list = tzinfo.listZoneinfoFiles("/nonesuch");
            t.deepEqual(list, []);
            t.done();
        },

        'should return list of zoneinfo filepaths': function(t) {
            var tzdir = tzinfo.getZoneinfoDirectory();
            var list = tzinfo.listZoneinfoFiles(tzdir);
            t.contains(list, tzdir + '/' + "America/Los_Angeles");
            t.done();
        },

        'should return empty array if no zoneinfo files found': function(t) {
            var list = tzinfo.listZoneinfoFiles(__dirname);
            t.deepEqual(list, []);
            t.done();
        },
    },

    'helpers': {
        'readStringZ': {
            'should extract asciiz string': function(t) {
                var buf = new Buffer("ABC\0DEF\0GHI\0\0");
                t.equal(tzinfo.readStringZ(buf, 0), 'ABC');
                t.equal(tzinfo.readStringZ(buf, 1), 'BC');
                t.equal(tzinfo.readStringZ(buf, 4), 'DEF');
                t.equal(tzinfo.readStringZ(buf, 5), 'EF');
                t.equal(tzinfo.readStringZ(buf, 12), '');
                t.equal(tzinfo.readStringZ(new Buffer("ABC"), 1), 'BC');
                t.done();
            },
        },

        'readInt32': {
            'should extract 32-bit signed int': function(t) {
                t.equal(tzinfo.readInt32([255, 255, 255, 255], 0), -1);

                var buf = new Buffer([128, 0, 0, 0, 0, 1]);
                t.equal(tzinfo.readInt32(buf, 0), (1 << 31));
                t.equal(tzinfo.readInt32(buf, 1), 0);
                t.equal(tzinfo.readInt32(buf, 2), 1);

                var buf = new Buffer([1, 2, 3, 4, 5, 6, 7, 8]);
                t.equal(tzinfo.readInt32(buf, 0), 0x01020304);
                t.equal(tzinfo.readInt32(buf, 1), 0x02030405);
                t.equal(tzinfo.readInt32(buf, 3), 0x04050607);

                var buf = new Buffer([255, 255, 255, 255, 1, 2, 3, 4]);
                t.equal(tzinfo.readInt32(buf, 0), -1);
                t.equal(tzinfo.readInt32(buf, 1), (0xffffff01 >> 0));   // -256 + 1
                t.equal(tzinfo.readInt32(buf, 2), (0xffff0102 >> 0));   // -65536 + 256 + 2
                t.equal(tzinfo.readInt32(buf, 3), (0xff010203 >> 0));   // -16777216 + 65536 + 512 + 3);
                t.done();
            },
        },

        'readInt64': {
            'should extract 64-bit signed int': function(t) {
                t.equal(tzinfo.readInt32([255, 255, 255, 255, 255, 255, 255, 255], 0), -1);

                var buf = new Buffer([128, 0, 0, 0, 0, 0, 0, 0, 0, 1]);
                t.equal(tzinfo.readInt64(buf, 0), -0x8000000000000000);
                t.equal(tzinfo.readInt64(buf, 1), 0);
                t.equal(tzinfo.readInt64(buf, 2), 1);

                var buf = new Buffer([0, 0, 0, 0, 1, 2, 3, 4, 5, 6, 7, 8]);
                t.equal(tzinfo.readInt64(buf, 0), 0x01020304);
                t.equal(tzinfo.readInt64(buf, 1), 0x0102030405);
                t.equal(tzinfo.readInt64(buf, 2), 0x010203040506);
                t.equal(tzinfo.readInt64(buf, 3), 0x01020304050607);

                var buf = new Buffer([255, 255, 255, 255, 255, 255, 255, 1, 2, 3, 4, 5, 6, 7, 8]);
                t.equal(tzinfo.readInt64(buf, 0), -256 + 1);
                t.equal(tzinfo.readInt64(buf, 1), -65536 + 256 + 2);
                t.equal(tzinfo.readInt64(buf, 2), -16777216 + 65536 + 512 + 3);
                t.equal(tzinfo.readInt64(buf, 3), -0x100000000 + 16777216 + 2*65536 + 3*256 + 4);
                t.done();
            },
        },

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
