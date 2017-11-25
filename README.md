tzinfo
======

Functions to parse /usr/share/zoneinfo timezone info files.
Parses both v1 and v2 format zoneinfo files.

Work in progress.

Api
---

### tzinfo.parseZoneinfo( buf )

Parse the zoneinfo file contained in `buf` and return it as an object.

Returned object format:

    zoneinfo = {
        magic:      // TZif
        version:    // '\0' or '2'

        ttisgmtcnt: // num gmt/local indicators stored in `ttisgmt`
        ttisstdcnt: // num standard/wall indicators stored in `ttisstd`
        leapcnt:    // num leap seconds for which data is stored in `leaps`
        timecnt:    // num transition types stored in `types`
        typecnt:    // num time transition structs stored in `tzinfo`
        charcnt:    // total num chars to store the tz name abbreviations

        times:      // array of transition times (timecnt)
        types:      // array of tzinfo indexes describing time period following transition (timecnt)
        tzinfo:     // array of tzinfo structs (typecnt) of
                    //     { idx: , tt_gmtoff: , tt_isdst: , tt_abbrind: }
        abbrevs:    // array of tz name abbreviations (asciiz strings totaling charcnt bytes)
        leaps:      // array of leap second descriptors (leapcnt)
        ttisstd:    // array of transitions of tzinfo were std or wallclock times (ttisstdcnt)
        ttisgmt:    // array of transitions of tzinfo were UTC or local time (ttisgmtcnt)
    };

### tzinfo.findTzinfo( zoneinfo, date )

TBD.

Find in the parsed `zoneinfo` the index of the tzinfo struct corresponding to the
given `date`.

Tzinfo format:

    tzinfo = {
        idx:        // index of this entry in `zoneinfo.tzinfo`
        tt_gmtoff:  // seconds to add to GMT to get localtime
        tt_isdst:   // whether daylight saving is in effect
        tt_abbrind: // index into abbrev[] of tz name abbreviation
    };

To find the POSIX-style timezone environment variable attributes associated with this `tzinfo`,
look at `zoneinfo.ttisstd[tzinfo.idx]` and `zoneinfo.ttisgmt[tzinfo.idx]`.


Related Work
------------

- [zoneinfo](http://npmjs.com/package/zoneinfo)


Todo
----
