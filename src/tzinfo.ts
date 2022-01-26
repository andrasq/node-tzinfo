/**
 * parse tzinfo files
 *
 * Copyright (C) 2017-2018 Andras Radics
 * Copyright (C) 2022-2023 Stoian Ivanov
 *
* Licensed under the Apache License, Version 2.0
 * You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 *
 * 2022-02-26 - TS port - SI.
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


import fs from 'fs';
export const  zoneinfoDir = locateZoneinfoDirectory();

export interface tzinfo_change_t {
    idx: number,
    tt_gmtoff: number,     // seconds to add to GMT to get localtime
    tt_isdst: number,               // whether DST in effect
    tt_abbrind: number,             // byte offset into abbrevs of tz name abbreviation
    abbrev: string,
}

export interface info_t {
    magic: string;             // 'TZif'
    version: string;           // '\0' or '2'

    ttisgmtcnt: number,         // num gmt/local indicators stored in `ttisgmt`
    ttisstdcnt: number,         // num standard/wall indicators stored in `ttisstd`
    leapcnt:    number,         // num leap seconds for which data is stored in `leaps`
    timecnt:    number,         // num transition types stored in `types'
    typecnt:    number,         // num time transition structs stored in `tzinfo`
    charcnt:    number,         // total num chars to store the tz name abbreviations

    ttimes:     number[],                // transition time timestamps (timecnt)
    types:      number[],                // tzinfo index of each time transitioned to (timecnt)
    tzinfo:     tzinfo_change_t[],                // tzinfo structs (typecnt)
    abbrevs:    string,                // concatenated tz name abbreviations (asciiz strings totaling charcnt bytes)
    leaps:      unknown[],                // leap second descriptors (leapcnt)
    ttisstd:    unknown[],                // transitions of tzinfo were std or wallclock times (ttisstdcnt)
    ttisgmt:    unknown[],                // transitions of tzinfo were UTC or local time (ttisgmtcnt)

    _v1end:  number,
    _v2end:  number,
}

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
export function parseZoneinfo( buf:Buffer ):info_t|false {
    var info = parseV1Zoneinfo(buf, 0);
    if (info==false) return false;

    if (info.version === '2') {
        return parseV2Zoneinfo(buf, info._v1end);
    }

    return info;
}


function parseV1Zoneinfo( buf:Buffer, pos:number ):info_t|false {
    var info:info_t = {
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
        abbrevs:    '',                         // concatenated tz name abbreviations (asciiz strings totaling charcnt bytes)
        leaps:      new Array(),                // leap second descriptors (leapcnt)
        ttisstd:    new Array(),                // transitions of tzinfo were std or wallclock times (ttisstdcnt)
        ttisgmt:    new Array(),                // transitions of tzinfo were UTC or local time (ttisgmtcnt)

        _v1end:  0,
        _v2end:  0,
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
            abbrev: '',
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

function parseV2Zoneinfo( buf:Buffer, pos:number ):info_t|false {
    // read-read the V2 header, then the V2 data
    var info:info_t = {
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
        abbrevs: '',
        leaps:   new Array(),
        ttisstd: new Array(),
        ttisgmt: new Array(),

        _v1end:  0,
        _v2end:  0,
    };
    pos += 4 + 1 + 15 + 24;

    // TODO: maybe should throw if not parseable
    if (info.magic !== 'TZif' || (info.version !== '\0' && info.version !== '2')) return false;

    for (var i=0; i<info.timecnt; i++) {
        info.ttimes[i] = readInt64(buf, pos);
        pos += 8;
    }

    for (var i=0; i<info.timecnt; i++) {
        info.types[i] = buf[pos++];
    }

    for (var i=0; i<info.typecnt; i++) {
        info.tzinfo[i] = { idx: i, tt_gmtoff: readInt32(buf, pos), tt_isdst: buf[pos+4], tt_abbrind: buf[pos+5], abbrev:'' };
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
export function readStringZ( buf:Buffer, offset:number ):string {
    for (var end=offset; buf[end]; end++) ;
    return buf.toString(undefined, offset, end);
}
export function readInt32( buf:Buffer, offset:number ):number {
    var val = (buf[offset++] * 0x1000000) + (buf[offset++] << 16) + (buf[offset++] << 8) + buf[offset++];
    return (val & 0x80000000) ? val - 0x100000000 : val;
}
export function readInt64( buf:Buffer, offset:number ):number {
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


export function locateZoneinfoDirectory( ):string {
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

export function readZoneinfoFileSync( tzname:string ):Buffer {
    var filepath = zoneinfoDir + '/' + tzname;
    return fs.readFileSync(filepath);
}

export function readZoneinfoFile( tzname:string, cb:(err: NodeJS.ErrnoException | null, data: Buffer) => void ) {
    var filepath = zoneinfoDir + '/' + tzname;
    return fs.readFile(filepath, cb);
}

export function findTzinfo( info:info_t, date:number|Date|string, firstIfTooOld:boolean ) {
    var seconds = ((typeof date === 'number') ? date :          // milliseconds
                   (date instanceof Date) ? date.getTime() :    // Date object
                   new Date(date).getTime());                   // datetime string
    seconds = Math.floor(seconds / 1000);

    var index = module.exports.absearch(info.ttimes, seconds);
    var tzindex;

    // if found, return the zoneinfo associated with the preceding time transition
    //   info.ttimes[] is the sorted array of time trantision unix timestamps
    //   info.types[] is the array of tzinfo[] indexes matching the time transitions
    //   info.tzinfo[] is the array of zoneinfo information
    if (index >= 0) return info.tzinfo[info.types[index]];

    // if there are no time transitions but yes tzinfo, return the tzinfo (to always find GMT/UTC)
    if (!info.timecnt && info.typecnt) return info.tzinfo[0];

    // if timestamp is before first transition, optionally return the oldest known tzinfo
    if (firstIfTooOld && info.typecnt) return info.tzinfo[info.types[0]];

    return false;
}

// search the sorted array for the index of the largest element
// not greater than val.  Returns the index of the element if found, else -1.
export function absearch( array:number[], val:number ) {
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

export function getZoneinfoDirectory( ) {
    return zoneinfoDir;
}

// find the names of all the zoneinfo files on the system.
// This is a blocking operation, so call it only on startup.
// The list is small, 80 kb or so, so can be cached.
export function listZoneinfoFiles( dirname:string ):string[] {
    var tzfiles:string[] = new Array();
    try {
        var files = fs.readdirSync(dirname);
    } catch (err) {
        return [];
    }

    var stat, buf = Buffer.alloc(8);
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
