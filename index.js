/**
 * parse tzinfo files
 *
 * Copyright (C) 2017 Andras Radics
 * Licensed under the Apache License, Version 2.0
 * You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 *
 * 2017-11-24 - Started - AR.
 */

/*
 * Resources:
 *
 * /etc/timezone - localhost timezone name, eg America/New_York (US/Eastern)
 * /etc/localtime - symlink to localhost timezone zoneinfo file
 * /usr/share/zoneinfo - location of zoneinfo files, in eg folder "America" sub-folder "New_York"
 * /usr/lib/zoneinfo - alternate location for zoneinfo files
 * /usr/local/etc/zoneinfo - user-created timezone files
 *
 * /usr/bin/zdump - timezone info dumper, `zdump -v -c 1970,2019 America/New_York`
 * /usr/bin/zic - zoneinfo file compiler
 *
 * tzinfo(5) - unix manpage describing the timezone info file layout
 */

'use strict';

var fs = require('fs');

module.exports = {
    parse: parseZoneinfo,

    findZoneinfoFiles: findZoneinfoFiles,
    readInt32: readInt32,
    readInt64: readInt64,
};


// zoneinfo file layout: (see tzinfo(5) manpage)
// 44 byte header =
//     20B: 'TZif' + <version> + <15 zero bytes>
//     24B:  6 4-byte counts
// payload:
//     timecnt 4B transition times
//     timecnt 1B ttinfo indexes
//     typecnt 6B ttinfo structs: 4B gmtoffs, 1B isdst, 1B abbr idx
//     timezone abbreviation characters
//     leapcnt 8B leap second info: 4B time, 4B total additive seconds
//     ttisstdcnt 1B std/wall times show whether transition times were std or wallclock (?)
//     ttisgmtcnt 1B show whether transition times were gmt or local (?)
//
function parseZoneinfo( buf ) {
    var info = {
        magic:      buf.toString(null, 0, 4),   // TZif
        version:    buf.toString(null, 4, 5),   // '\0' or '2'

        ttisgmtcnt: readInt32(buf, 20),         // num gmt/local indicators stored in ttisgmt
        ttisstdcnt: readInt32(buf, 24),         // num standard/wall indicators stored in ttisstd
        leapcnt:    readInt32(buf, 28),         // num leap seconds for which data is stored in leaptimeTimes
        timecnt:    readInt32(buf, 32),         // num transition types stored in transitionTypes
        typecnt:    readInt32(buf, 36),         // num time transition structs stored in localtimeInfo
        charcnt:    readInt32(buf, 40),         // total num chars to store the tz name abbreviations

        times:      new Array(),                // transition times (timecnt)
        types:      new Array(),                // tzinfo describing time period following transition (timecnt)
        tzinfo:     new Array(),                // tzinfo structs (typecnt)
        abbrevs:    new Array(),                // tz name abbreviations (asciiz strings totaling charcnt bytes)
        leaps:      new Array(),                // leap second descriptors (leapcnt)
        ttisstd:    new Array(),                // transitions of tzinfo were std or wallclock times (ttisstdcnt)
        ttisgmt:    new Array(),                // transitions of tzinfo were UTC or local time (ttisgmtcnt)
    };
    var pos = 4 + 1 + 15 + 24;          // magic + version + reserved + header

    if (info.magic !== 'TZif' || (info.version !== '\0' && info.version !== '2')) return false;

    for (var i=0; i<info.timecnt; i++) {
        info.times[i] = readInt32(buf, pos);
        pos += 4;
    }

    for (var i=0; i<info.timecnt; i++) {
        info.types[i] = buf[pos];
        pos += 1;
    }

    for (var i=0; i<info.typecnt; i++) {
        info.tzinfo[i] = {
            tt_gmtoff: readInt32(buf, pos),     // seconds to add to GMT to get localtime
            tt_isdst: buf[pos+4],               // whether DST in effect
            tt_abbrind: buf[pos+5],             // index into abbrev[] of tz name abbreviation
            isstd: null,
            isgmt: null,
        };
        pos += 6;
    }

    var abbrevs = buf.toString(null, pos, pos + info.charcnt - 1);
    info.abbrevs = abbrevs.split('\0');
    pos += info.charcnt;

    for (var i=0; i<info.leapcnt; i++) {
        info.leaps[i] = {
            time: readInt32(buf, pos),          // leap second occurs at
            add:  readInt32(buf, pos + 4),      // total num seconds to add
        };
        pos += 8;
    }

    for (var i=0; i<info.ttisstdcnt; i++) {
        info.ttisstd[i] = buf[pos++];
    }

    for (var i=0; i<info.ttisgmtcnt; i++) {
        info.ttisgmt[i] = buf[pos++];
    }

    // annotate tzinfo with isstd and isgmt
    for (var i=0; i<info.tzinfo.length; i++) {
        info.tzinfo[i].isstd = info.ttisstd[i];
        info.tzinfo[i].isgmt = info.ttisgmt[i];
    }

    if (info.version === '2') {
        var v2info = parseV2Zoneinfo(buf, pos, v2info);
    }

    return (info.version === '2') ? v2info : info;
}

function parseV2Zoneinfo( buf, pos, info ) {
    // read-read the V2 header, then the V2 data
    var info = {
        magic:   buf.toString(null, pos+0, pos+4),
        version: buf.toString(null, pos+4, pos+5),

        ttisgmtcnt: readInt32(buf, pos+20),
        ttisstdcnt: readInt32(buf, pos+24),
        leapcnt:    readInt32(buf, pos+28),
        timecnt:    readInt32(buf, pos+32),
        typecnt:    readInt32(buf, pos+36),
        charcnt:    readInt32(buf, pos+40),

        times: new Array(),
        types:  new Array(),
        tzinfo:   new Array(),
        abbrevs:         new Array(),
        leaps:   new Array(),
        ttisstd:         new Array(),
        ttisgmt:         new Array(),
    };
    pos += 4 + 1 + 15 + 24;

    if (info.magic !== 'TZif' || (info.version !== '\0' && info.version !== '2')) return false;

    for (var i=0; i<info.timecnt; i++) {
        info.times[i] = readInt64(buf, pos);
        pos += 8;
    }

    for (var i=0; i<info.timecnt; i++) {
        info.types[i] = buf[pos++];
    }

    for (var i=0; i<info.typecnt; i++) {
        info.tzinfo[i] = { tt_gmtoff: readInt32(buf, pos), tt_isdst: buf[pos+4], tt_abbrind: buf[pos+5] };
        pos += 6;
    }

    var abbrevs = buf.toString(null, pos, pos + info.charcnt - 1);
    info.abbrevs = abbrevs.split('\0');
    pos += info.charcnt;

    for (var i=0; i<info.leapcnt; i++) {
        info.leaps[i] = { time: readInt64(buf, pos), add:  readInt32(buf, pos + 8) };
        pos += 12;
    }

    for (var i=0; i<info.ttisstdcnt; i++) {
        info.ttisstd[i] = buf[pos++];
    }

    for (var i=0; i<info.ttisgmtcnt; i++) {
        info.ttisgmt[i] = buf[pos++];
    }

    // annotate tzinfo with isstd and isgmt
    for (var i=0; i<info.tzinfo.length; i++) {
        info.tzinfo[i].isstd = info.ttisstd[i];
        info.tzinfo[i].isgmt = info.ttisgmt[i];
    }

    return info;
}

function readInt32( buf, offset ) {
    var val = (buf[offset++] * 0x1000000) + (buf[offset++] << 16) + (buf[offset++] << 8) + buf[offset++];
    return (val & 0x80000000) ? val - 0x100000000 : val;
}
function readInt64( buf, offset ) {
    if (buf[offset] & 0x80) {
        // negative
        // a large negative eg FFFE can be built out of a scaled negative prefix FF * 256 and
        // and a positive additive offset FE, ie (-1 * 256) + 254 = -2.
        var v1 = readInt32(buf, offset);
        var v2 = readInt32(buf, offset + 4);
        if (v2 < 0) v2 += 0x100000000;
        return v1 * 0x100000000 + v2;
    } else {
        // positive
        var uval = 0;
        for (var i=offset; i<offset+8; i++) uval = (uval * 256) + buf[i];
        return uval;
    }
}


function findZoneinfoFiles( ) {
    var tryDirs = [
        '/nonesuch/zoneinfo',
        '/usr/share/zoneinfo',
        '/usr/lib/zoneinfo',
    ];
    for (var i=0; i<tryDirs.length; i++) {
        try { return fs.statSync(tryDirs[i]).isDirectory() && tryDirs[i] }
        catch (e) { }
    }
    throw new Error("tzinfo files not found");
}

function findTzinfoFiles( ) {
    var tryDirs = [
        '/usr/share/zoneinfo',
        '/usr/lib/zoneinfo',
    ];
    for (var i=0; i<tryDirs.length; i++) {
        try {
            var stat = fs.statSync(tryDirs[i]);
            if (stat.isDirectory()) return tryDirs[i];
        }
        catch (e) { }
    }
    throw new Error("tzinfo files not found");
}


/** quicktest:

var info = parseZoneinfo(fs.readFileSync('/usr/share/zoneinfo/America/New_York'));
console.log("AR: sample zoneinfo", JSON.stringify(info).length, info);

/**/
