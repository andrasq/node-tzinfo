'use strict';

var unpack = require('./unpack').unpack;

module.exports = {
    'unpack': {
        'should unpack unsigned values': function(t) {
            t.equal(unpack([1,2,123], 0, 'C'), 1);
            t.equal(unpack([1,2,123], 1, 'C'), 2);
            t.equal(unpack([1,2,123], 2, 'C'), 123);
            t.equal(unpack([254], 0, 'C'), 254);
            t.equal(unpack([254], 0, 'C'), 254);
            t.deepEqual(unpack([1,2,3], 0, 'C', 3), [1,2,3]);
            t.deepEqual(unpack([1,2,3], 1, 'C', 2), [2,3]);
            t.deepEqual(unpack([1,2,3], 2, 'C', 1), [3]);
            t.deepEqual(unpack([1,2,3], 3, 'C', 0), []);

            t.equal(unpack([1, 2, 3, 4], 0, 'H'), 0x0102);
            t.equal(unpack([1, 2, 3, 4], 1, 'H'), 0x0203);
            t.equal(unpack([1, 2, 3, 4], 2, 'H'), 0x0304);
            t.deepEqual(unpack([0, 1, 2, 3, 4], 1, 'H', 0), []);
            t.deepEqual(unpack([0, 1, 2, 3, 4], 1, 'H', 1), [0x0102]);
            t.deepEqual(unpack([0, 1, 2, 3, 4], 1, 'H', 2), [0x0102, 0x0304]);

            t.equal(unpack([3,1,2,3,4], 1, 'L'), 16909060);
            t.equal(unpack([3,4,255,2,3,4], 2, 'L'), 4278321924);
            t.deepEqual(unpack([0, 1, 2, 3, 4, 5, 6, 7, 8], 1, 'L', 1), [0x01020304]);
            t.deepEqual(unpack([0, 1, 2, 3, 4, 5, 6, 7, 8], 1, 'L', 2), [0x01020304, 0x05060708]);

            t.equal(unpack([0,0,0,0,1,2,3,4], 0, 'Q'), 0x01020304);
            t.equal(unpack([0,0,0,1,2,3,4,0], 0, 'Q'), 0x0102030400);
            t.equal(unpack([0,0,1,2,3,4,0,0], 0, 'Q'), 0x010203040000);
            t.equal(unpack([0,0,0,0,0,0,1,2,3,4], 2, 'Q'), 0x01020304);
            t.equal(unpack([0,0,0,0,0,0,1,2,3,4], 1, 'Q'), 0x010203);
            t.equal(unpack([0,0,0,0,0,0,1,2,3,4], 0, 'Q'), 0x0102);
            t.done();
        },

        'should unpack signed values': function(t) {
            t.equal(unpack([192], 0, 'c'), -64);
            t.equal(unpack([255,192], 0, 'h'), -64);
            t.equal(unpack([255,255,255,192], 0, 'l'), -64);
            t.equal(unpack([255,255,255,255,255,255,255,192], 0, 'q'), -64);
            t.done();
        },

        'should unpack fixed-length strings': function(t) {
            t.equal(unpack(new Buffer("1234"), 0, 'A4'), '1234');
            t.equal(unpack(new Buffer("1234"), 2, 'A1'), '3');
            t.deepEqual(unpack(new Buffer("1234"), 2, 'A2', 1), ['34']);
            t.deepEqual(unpack(new Buffer("00012345678"), 3, 'A', 3), '123');
            t.deepEqual(unpack(new Buffer("00012345678"), 4, 'A', 5), '23456');
            t.deepEqual(unpack(new Buffer("00012345678"), 3, 'A3', 2), ['123', '456']);
            t.deepEqual(unpack(new Buffer("00012345678"), 3, 'A5', 1), ['12345']);
            t.deepEqual(unpack(new Buffer("00012345678"), 3, 'A5'), '12345');
            t.done();
        },

        'should unpack compound values': function(t) {
            t.deepEqual(unpack([1,2,3,4], 0, {'a': 'C', 'b': 'C'}), { a: 1, b: 2 });
            t.deepEqual(unpack([1,2,3,4], 1, {'a': 'C', 'b': 'C'}), { a: 2, b: 3 });
            t.deepEqual(unpack([1,2,3,4], 2, {'a': 'C', 'b': 'C'}), { a: 3, b: 4 });
            t.deepEqual(unpack([1,2,3,4], 1, {'a': 'C', 'b': { c: 'C', d: 'C'}}), { a: 2, b: {c: 3, d: 4} });
            t.done();
        },

        'should unpack NaN on bounds overrun': function(t) {
            t.ok(isNaN(unpack([1], 0, 'h')));
            t.done();
        },
    },
}
