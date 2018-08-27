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
var zoneinfoDir = locateZoneinfoDirectory();

module.exports = {
    getZoneinfoDirectory: getZoneinfoDirectory,
    listZoneinfoFiles: listZoneinfoFiles,
    readZoneinfoFileSync: readZoneinfoFileSync,
    readZoneinfoFile: readZoneinfoFile,
    parseZoneinfo: parseZoneinfo,
    findTzinfo: findTzinfo,

    absearch: absearch,
    locateZoneinfoDirectory: locateZoneinfoDirectory,
    zoneinfoDir: zoneinfoDir,
    readStringZ: readStringZ,
    readInt32: readInt32,
    readInt64: readInt64,
};


// zoneinfo file layout: (see tzinfo(5) manpage)
// header:
//     20B: 'TZif' + <version> + <15 zero bytes>
//     24B:  6 4-byte counts
// data:
//     timecnt 4B transition times
//     timecnt 1B ttinfo indexes
//     typecnt 6B ttinfo structs: 4B gmtoffs, 1B isdst, 1B abbr idx
//     timezone abbreviation characters
//     leapcnt 8B leap second info: 4B time, 4B total additive seconds
//     ttisstdcnt 1B std/wall times show whether transition times were std or wallclock (?)
//     ttisgmtcnt 1B show whether transition times were gmt or local (?)
//
function parseZoneinfo( buf ) {
    var info = parseV1Zoneinfo(buf, 0);

    if (info.version === '2') {
        var v2info = parseV2Zoneinfo(buf, info._v1end);
    }

    return (info.version === '2') ? v2info : info;
}

function parseV1Zoneinfo( buf, pos ) {
    var info = {
        magic:   buf.toString(undefined, 0, 4), // 'TZif'
        version: buf.toString(undefined, 4, 5), // '\0' or '2'

        ttisgmtcnt: readInt32(buf, 20),         // num gmt/local indicators stored in `ttisgmt`
        ttisstdcnt: readInt32(buf, 24),         // num standard/wall indicators stored in `ttisstd`
        leapcnt:    readInt32(buf, 28),         // num leap seconds for which data is stored in `leaps`
        timecnt:    readInt32(buf, 32),         // num transition types stored in `types'
        typecnt:    readInt32(buf, 36),         // num time transition structs stored in `tzinfo`
        charcnt:    readInt32(buf, 40),         // total num chars to store the tz name abbreviations

        ttimes:     new Array(),                // transition time timestamps (timecnt)
        types:      new Array(),                // tzinfo index of each time transitioned to (timecnt)
        tzinfo:     new Array(),                // tzinfo structs (typecnt)
        abbrevs:    new Array(),                // concatenated tz name abbreviations (asciiz strings totaling charcnt bytes)
        leaps:      new Array(),                // leap second descriptors (leapcnt)
        ttisstd:    new Array(),                // transitions of tzinfo were std or wallclock times (ttisstdcnt)
        ttisgmt:    new Array(),                // transitions of tzinfo were UTC or local time (ttisgmtcnt)

        _v1end:  null,
    };
    var pos = 4 + 1 + 15 + 24;                  // magic + version + reserved + header

    if (info.magic !== 'TZif' || (info.version !== '\0' && info.version !== '2')) return false;

    for (var i=0; i<info.timecnt; i++) {
        info.ttimes[i] = readInt32(buf, pos);
        pos += 4;
    }

    for (var i=0; i<info.timecnt; i++) {
        info.types[i] = buf[pos];
        pos += 1;
    }

    for (var i=0; i<info.typecnt; i++) {
        info.tzinfo[i] = {
            idx: i,
            tt_gmtoff: readInt32(buf, pos),     // seconds to add to GMT to get localtime
            tt_isdst: buf[pos+4],               // whether DST in effect
            tt_abbrind: buf[pos+5],             // byte offset into abbrevs of tz name abbreviation
            abbrev: null,
        };
        pos += 6;
    }

    info.abbrevs = buf.toString(undefined, pos, pos + info.charcnt);
    // annotate the tzinfo structs with the tz name abbrev
    for (var i=0; i<info.typecnt; i++) {
        info.tzinfo[i].abbrev = readStringZ(buf, pos + info.tzinfo[i].tt_abbrind);
    }
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

    info._v1end = pos;

    return info;
}

function parseV2Zoneinfo( buf, pos ) {
    // read-read the V2 header, then the V2 data
    var info = {
        magic:   buf.toString(undefined, pos+0, pos+4),
        version: buf.toString(undefined, pos+4, pos+5),

        ttisgmtcnt: readInt32(buf, pos+20),
        ttisstdcnt: readInt32(buf, pos+24),
        leapcnt:    readInt32(buf, pos+28),
        timecnt:    readInt32(buf, pos+32),
        typecnt:    readInt32(buf, pos+36),
        charcnt:    readInt32(buf, pos+40),

        ttimes:  new Array(),
        types:   new Array(),
        tzinfo:  new Array(),
        abbrevs: new Array(),
        leaps:   new Array(),
        ttisstd: new Array(),
        ttisgmt: new Array(),

        _v2end:  null,
    };
    pos += 4 + 1 + 15 + 24;

    if (info.magic !== 'TZif' || (info.version !== '\0' && info.version !== '2')) return false;

    for (var i=0; i<info.timecnt; i++) {
        info.ttimes[i] = readInt64(buf, pos);
        pos += 8;
    }

    for (var i=0; i<info.timecnt; i++) {
        info.types[i] = buf[pos++];
    }

    for (var i=0; i<info.typecnt; i++) {
        info.tzinfo[i] = { idx: i, tt_gmtoff: readInt32(buf, pos), tt_isdst: buf[pos+4], tt_abbrind: buf[pos+5] };
        pos += 6;
    }

    info.abbrevs = buf.toString(undefined, pos, pos + info.charcnt);
    // annotate the tzinfo structs with the tz name abbrev
    for (var i=0; i<info.typecnt; i++) {
        info.tzinfo[i].abbrev = readStringZ(buf, pos + info.tzinfo[i].tt_abbrind);
    }
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

    info._v2end = pos;

    return info;
}

// return the NUL-terminated string from buf at offset
function readStringZ( buf, offset ) {
    for (var end=offset; buf[end]; end++) ;
    return buf.toString(undefined, offset, end);
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


function locateZoneinfoDirectory( ) {
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

function readZoneinfoFileSync( tzname ) {
    var filepath = zoneinfoDir + '/' + tzname;
    return fs.readFileSync(filepath);
}

function readZoneinfoFile( tzname, cb ) {
    var filepath = zoneinfoDir + '/' + tzname;
    return fs.readFile(filepath, cb);
}

function findTzinfo( info, date, firstIfTooOld ) {
    var seconds = ((typeof date === 'number') ? date :
                   (date && typeof date.getTime === 'function') ? date.getTime() :
                   new Date(date).getTime()) / 1000;

    var index = module.exports.absearch(info.ttimes, seconds);
    if (index < 0) {
        if (!firstIfTooOld) return false;
        index = info.types[0];
    }

    var tzindex = info.types[index];
    return info.tzinfo[tzindex];
}

// search the sorted array for the index of the largest element
// not greater than val.  Returns the index of the element if found, else -1.
function absearch( array, val ) {
    var hi, lo, mid;

    // binary search to approximate the location of val
    for (lo = 0, hi = array.length - 1; (hi - lo) > 30; ) {
        mid = ((hi + lo) / 2) >>> 0;
        if (val < array[mid]) hi = mid - 1;
        else lo = mid;
    }

    // once close enough, switch to linear search for speed
    // scan to find the first element larger than val
    while (lo <= hi && array[lo] <= val) lo++;

    // if such an element exists, we want the preceding element thats <= val
    if (lo > 0) return lo - 1;

    // if val is less than all elements in the array, return -1
    return -1;
}

function getZoneinfoDirectory( ) {
    return zoneinfoDir;
}

// find the names of all the zoneinfo files on the system.
// This is a blocking operation, so call it only on startup.
// The list is small, 80 kb or so, so can be cached.
function listZoneinfoFiles( dirname ) {
    var tzfiles = new Array();
    try {
        var files = fs.readdirSync(dirname);
    } catch (err) {
        return [];
    }

    var stat, buf = new Buffer(8);
    for (var i=0; i<files.length; i++) {
        var filepath = dirname + '/' + files[i];
        try {
            stat = fs.statSync(filepath);
            if (stat.isDirectory()) {
                var moreTzfiles = listZoneinfoFiles(filepath);
                tzfiles = tzfiles.concat(moreTzfiles);
            }
            else {
                var fd = fs.openSync(filepath, 'r');
                fs.readSync(fd, buf, 0, 5, 0);
                fs.closeSync(fd);
                if (buf.toString(undefined, 0, 4) === 'TZif') tzfiles.push(filepath);
            }
        } catch(e) { }
    }

    return tzfiles;
}

/** quicktest:

var info = parseZoneinfo(fs.readFileSync('/usr/share/zoneinfo/America/New_York'));
var info = parseZoneinfo(fs.readFileSync('/usr/share/zoneinfo/America/Jamaica'));
console.log("AR: sample zoneinfo", JSON.stringify(info).length, info);

/**/
