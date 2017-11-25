/**
 * unpack bytes into integers or structs of integers,
 * kinda like php or perl `unpack`.
 *
 * 2017-11-25 - Started - AR.
 */

'use strict';

module.exports = {
    unpack: qunpack,
};

var sizes = { null: 0, 'A1': 1, 'A4': 4, c: 1, C: 1, h: 2, H: 2, l: 4, L: 4, q: 8, Q: 8 };

// extract the big-endian integer stored at offset in the byte sequence buf.
// Supports 1-, 2-, 4- and 8-bit signed integer types.
// Can return a single integer, an array of integers, an object, or an array of objects.
function qunpack( buf, offset, format, count ) {
    var val, val2, values;
    var asArray = count !== undefined;
    if (count === undefined) count = 1;
    if (asArray) values = new Array();

    if (format === 'A') return buf.toString(null, offset, offset+count);

    for (var i=0; i<count; i++) {
        // if about to extract the second value, auto-switch to array mode
        if (typeof format === 'object') {
            var nameFormat = new Array();
            for (var name in format) {
                // TODO: cache the size
                nameFormat.push({
                    name: name, format: format[name], size: sizes[format[name]] || structSize[format[name]] });
            }
            val = {};
            for (var j=0; j<nameFormat.length; j+=1) {
                val[nameFormat[j].name] = qunpack(buf, offset, nameFormat[j].format);
                offset += nameFormat[j].size;
            }
        }
        else if (format[0] === 'A' && format[1] >= '0' && format[1] <= '9') {
            var n = parseInt(format.slice(1));
            val = buf.toString(null, offset, offset + n);
            offset += n;
        }
        else if (format === 'Z') {
            for (var i = offset; buf[i] !== 0; i++) ;
            val = buf.slice(offset, i);
            offset = i;
        }
        else {
            if (!sizes[format]) throw new Error(format + ": invalid unpack format");
            switch (format) {
            case null:
                skip;

            case 'C':
                // unsigned 8-bit char
                val = buf[offset++];
                break;
            case 'H':
                // unsigned 16-bit short
                val = (buf[offset++] << 8) + buf[offset++];
                break;
            case 'L':
                // unsigned 32-bit long
                val = (buf[offset++] * 0x1000000) + (buf[offset++] << 16) + (buf[offset++] << 8) + buf[offset++];
                break;
            case 'Q':
                // unsigned 64-bit long long
                val  = qunpack(buf, offset, 'L');
                val2 = qunpack(buf, offset + 4, 'L');
                offset += 8;
                val = val * 0x100000000 + val2;
                break;

            case 'c':
                // signed 8-bit char
                val = qunpack(buf, offset, 'C');
                val = (val & 0x80) ? val - 0x100 : val;
                offset += 1;
                break;
            case 'h':
                // signed 16-bit short
                val = qunpack(buf, offset, 'H');
                if (buf[offset] & 0x80) val = val - 0x10000;
                offset += 2;
                break;
            case 'l':
                // signed 32-bit long
                val = qunpack(buf, offset, 'L');
                if (buf[offset] & 0x80) val = val - 0x100000000;
                offset += 4;
                break;
            case 'q':
                // signed 64-bit long long.  Note that only 53 bits of are retained,
                // since js numbers are 64-bit floats with 53 bits precision.
                val  = qunpack(buf, offset, 'L');
                val2 = qunpack(buf, offset + 4, 'L');
                offset += 8;
                // a large negative eg FFFE can be built out of a scaled negative prefix FF * 256 and
                // and a positive additive offset FE, ie (-1 * 256) + 254 = -2.
                val = (val & 0x80000000) ? (val - 0x100000000) : val;
                val =  val * 0x100000000 + val2;
                break;

            default:
                throw new Error(format + ": unknown unpack format");
            }
        }
        if (asArray) values.push(val);
    }

    return asArray ? values : val;
}


function structSize( format ) {
    var size = 0;
    if (typeof format === 'string') {
        if (/[0-9]/.test(format[1])) size = parseInt(format.slice(1));
        else size = sizes[format];
        if (size === undefined) throw new Error(format + ": invalid unpack format specifier");
    }
    else for (var name in format) {
        size += structSize(format[name]);
    }
    return size;
}
