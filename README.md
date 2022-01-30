tzinfo
======

[![Build Status](https://api.travis-ci.com/andrasq/node-tzinfo.svg?branch=master)](https://travis-ci.com/andrasq/node-tzinfo?branch=master)
[![Coverage Status](https://codecov.io/github/andrasq/node-tzinfo/coverage.svg?branch=master)](https://codecov.io/github/andrasq/node-tzinfo?branch=master)

Functions to parse /usr/share/zoneinfo timezone info files.
Parses both v1 and v2 format zoneinfo files.

    const tzinfo = require('tzinfo');
    const buf = tzinfo.readZoneinfoFileSync('America/New_York');
    const zoneInfo = tzinfo.parseZoneinfo(buf);
    const tzInfo = tzinfo.findTzinfo(zoneInfo, '2020-07-02T03:04:05.678');
    // => {
    //   idx: 1,
    //   tt_gmtoff: -14400,
    //   tt_isdst: 1,
    //   tt_abbrind: 4,
    //   abbrev: 'EDT'
    // }


Api
---

### tzinfo.getZoneinfoDirectory( )

Return the auto-detected directory containing the system zoneinfo files.

### tzinfo.listZoneinfoFiles( zoneinfoDirectory )

List all the zoneinfo files contained in the named zoneinfo directory.  Recursively
walks the directory and tests each file found.  This is a blocking operation, so call
only on program load.  The results are small and can be easily cached.

### tzinfo.readZoneinfoFile( tzname, cb )

Read the zoneinfo file corresponding to the named timezone.  Returns to its callback a
`Buffer` with the file contents, or an `Error`.

### tzinfo.readZoneinfoFileSync( tzname )

Read the zoneinfo file corresponding to the named timezone.  Returns a `Buffer`
containing the file contents, or throws an `Error`.

### tzinfo.parseZoneinfo( buf )

Parse the zoneinfo file contained in `buf` and return it as an object.

Returned object format:

    zoneinfo = {
        magic:      // 'TZif'
        version:    // '\0' or '2'

        ttisgmtcnt: // num gmt/local indicators stored in `ttisgmt`
        ttisstdcnt: // num standard/wall indicators stored in `ttisstd`
        leapcnt:    // num leap seconds for which data is stored in `leaps`
        timecnt:    // num transition types stored in `types`
        typecnt:    // num time transition structs stored in `tzinfo`
        charcnt:    // total num chars to store the tz name abbreviations

        ttimes:     // array of `timecnt` transition time timestamps
        types:      // array of `timecnt` tzinfo indices for each time transitioned to
        tzinfo:     // array of `typecnt` tzinfo structs (see below)
        abbrevs:    // concatenated tz name abbreviations (asciiz strings totaling charcnt bytes)
        leaps:      // array of `leapcnt` leap second descriptors `{ time, add }`
        ttisstd:    // array of `ttisstdcnt` transitions of tzinfo were std or wallclock times
        ttisgmt:    // array of `ttisgmtcnt` transitions of tzinfo were UTC or local time
    };

### tzinfo.findTzinfo( zoneinfo, date [,firstIfTooOld] )

Find in the parsed `zoneinfo` the index of the tzinfo struct corresponding to the
given `date`.  Returns a `tzinfo` struct or `false` if the date is before the earliest
time transition on record or if date is not valid.  If `date` precedes the first known
time transition but `firstIfTooOld` is truthy, it returns the oldest tzinfo struct.
If there are no time transitions defined but there is a tzinfo struct, it returns the
first tzinfo struct (to always succeed for GMT and UTC).

Tzinfo format, a slightly expanded `tzfile(5)` `struct ttinfo`:

    tzinfo = {
        idx:        // index of this entry in `zoneinfo.tzinfo`
        tt_gmtoff:  // seconds to add to GMT to get localtime
        tt_isdst:   // whether daylight saving is in effect
        tt_abbrind: // byte offset in abbrevs of tz name abbreviation
        abbrev:     // timezone name abbreviation, eg 'EDT', from `zoneinfo.abbrevs`
    };

To find the POSIX-style timezone environment variable attributes associated with this `tzinfo`,
look at `zoneinfo.ttisstd[tzinfo.idx]` and `zoneinfo.ttisgmt[tzinfo.idx]`.


Change Log
----------

- 0.5.2 - fix Buffer deprecation warnings
- 0.5.1 - always find GMT zoneinfo
- 0.5.0 - findTzinfo option to return the oldest known tzinfo struct for very old dates
- 0.4.2 - more tests, make `readStringZ` stop on unterminated strings
- 0.4.1 - npm tag
- 0.4.0 - `listZoneinfoFiles()`, `getZoneinfoDirectory()`
- 0.3.0 - `readZoneinfoFile` and `readZoneinfoFileSync`, `findTzinfo`
- 0.2.0 - first published release, with `parseZoneinfo`


Todo
----

- `setZoneinfoDirectory` to override the auto-detected one


Related Work
------------

- [zoneinfo](http://npmjs.com/package/zoneinfo)
- `tzfile(5)`, `zdump(8)`, `zic(8)` - unix zoneinfo manpages
