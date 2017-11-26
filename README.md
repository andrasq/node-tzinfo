tzinfo
======

[![Build Status](https://api.travis-ci.org/andrasq/node-tzinfo.svg?branch=master)](https://travis-ci.org/andrasq/node-tzinfo?branch=master)
[![Coverage Status](https://codecov.io/github/andrasq/node-tzinfo/coverage.svg?branch=master)](https://codecov.io/github/andrasq/node-tzinfo?branch=master)

Functions to parse /usr/share/zoneinfo timezone info files.
Parses both v1 and v2 format zoneinfo files.

Work in progress.

Api
---

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
        tzinfo:     // array of `typecnt` tzinfo structs
                    //     { idx: , tt_gmtoff: , tt_isdst: , tt_abbrind: }
        abbrevs:    // concatenated tz name abbreviations (asciiz strings totaling charcnt bytes)
        leaps:      // array of `leapcnt` leap second descriptors
        ttisstd:    // array of `ttisstdcnt` transitions of tzinfo were std or wallclock times
        ttisgmt:    // array of `ttisgmtcnt` transitions of tzinfo were UTC or local time
    };

### tzinfo.findTzinfo( zoneinfo, date )

Find in the parsed `zoneinfo` the index of the tzinfo struct corresponding to the
given `date`.  Returns a `tzinfo` struct or `false` if the date is before the earliest
time transition on record or if date is not valid.

Tzinfo format:

    tzinfo = {
        idx:        // index of this entry in `zoneinfo.tzinfo`
        tt_gmtoff:  // seconds to add to GMT to get localtime
        tt_isdst:   // whether daylight saving is in effect
        tt_abbrind: // byte offset in abbrevs of tz name abbreviation
        abbrev:     // timezone name abbreviation, eg 'EDT'
    };

To find the POSIX-style timezone environment variable attributes associated with this `tzinfo`,
look at `zoneinfo.ttisstd[tzinfo.idx]` and `zoneinfo.ttisgmt[tzinfo.idx]`.

### tzinfo.readZoneinfoFile( tzname, cb )

Read the zoneinfo file corresponding to the named timezone.  Returns to its callback a
`Buffer` with the file contents, or an `Error`.

### tzinfo.readZoneinfoFileSync( tzname )

Read the zoneinfo file corresponding to the named timezone.  Returns a `Buffer`
containing the file contents, or throws an `Error`.


Change Log
----------

- 0.3.0 - `readZoneinfoFile` and `readZoneinfoFileSync`, `findTzinfo`
- 0.2.0 - first published release, with `parseZoneinfo`


Related Work
------------

- [zoneinfo](http://npmjs.com/package/zoneinfo)


Todo
----
