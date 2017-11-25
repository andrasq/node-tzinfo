tzinfo
======

Functions to parse /usr/share/zoneinfo timezone info files.
Parses both v1 and v2 format zoneinfo files.

Work in progress.

Api
---

### tzinfo.parseZoneinfo( buf )

Parse the zoneinfo file contained in buf and return it as an object.

Returned object format:

    {
        magic:      // TZif
        version:    // '\0' or '2'

        ttisgmtcnt: // num gmt/local indicators stored in ttisgmt
        ttisstdcnt: // num standard/wall indicators stored in ttisstd
        leapcnt:    // num leap seconds for which data is stored in leaptimeTimes
        timecnt:    // num transition types stored in transitionTypes
        typecnt:    // num time transition structs stored in localtimeInfo
        charcnt:    // total num chars to store the tz name abbreviations

        times:      // array of transition times (timecnt)
        types:      // array of tzinfo indexes describing time period following transition (timecnt)
        tzinfo:     // array of tzinfo (typecnt) of
                    //     { tt_gmtoff:, tt_isdst:, tt_abbrind:, isdst: , isgmt: }
        abbrevs:    // array of tz name abbreviations (asciiz strings totaling charcnt bytes)
        leaps:      // array of leap second descriptors (leapcnt)
        ttisstd:    // array of transitions of tzinfo were std or wallclock times (ttisstdcnt)
        ttisgmt:    // array of transitions of tzinfo were UTC or local time (ttisgmtcnt)
    };


Related Work
------------

- [zoneinfo](http://npmjs.com/package/zoneinfo)


Todo
----
