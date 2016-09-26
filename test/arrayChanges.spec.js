/*global describe, it, Symbol*/
var arrayChanges = require('../lib/arrayChanges');
var expect = require('unexpected').clone()
    .use(require('unexpected-sinon'))
    .use(require('unexpected-check'));
var sinon = require('sinon');

var generators = require('chance-generators');

function toArguments() {
    return arguments;
}

function executeDiff(changes) {
    var result = [];

    changes.forEach(function (item) {
        switch (item.type) {
        case 'moveTarget':
        case 'insert':
            result.push(item.value);
            break;
        case 'equal':
        case 'similar':
            if (typeof item.expected === 'number') {
                result.push(item.expected);
            }

            break;
        }
    });

    return result;
}

expect.addAssertion('<array> when diffed with <array> <assertion>', function (expect, actual, expected) {
    expect.errorMode = 'nested';
    return expect.shift(arrayChanges(actual, expected));
});

expect.addAssertion('<array> when executing the diff <assertion>', function (expect, diff) {
    expect.errorMode = 'nested';
    return expect.shift(executeDiff(diff));
});

describe('array-changes', function () {
    var g;

    beforeEach(function () {
        g = generators(42);
    });

    it('returns an empty change-list when the two arrays are both empty', function () {
        expect(arrayChanges([], [], function (a, b) {
            return a === b;
        }), 'to equal', []);
    });

    it('returns a change-list with no changes if the arrays are the same', function () {
        expect(arrayChanges([0, 1, 2, 3], [0, 1, 2, 3], function (a, b) {
            return a === b;
        }), 'to equal', [
            { type: 'equal', value: 0, expected: 0, actualIndex: 0, expectedIndex: 0 },
            { type: 'equal', value: 1, expected: 1, actualIndex: 1, expectedIndex: 1 },
            { type: 'equal', value: 2, expected: 2, actualIndex: 2, expectedIndex: 2 },
            { type: 'equal', value: 3, expected: 3, actualIndex: 3, expectedIndex: 3, last: true }
        ]);
    });

    it('should indicate item removals', function () {
        expect(arrayChanges([0, 1, 2, 3], [0, 1, 3], function (a, b) {
            return a === b;
        }), 'to equal', [
            { type: 'equal', value: 0, expected: 0, actualIndex: 0, expectedIndex: 0 },
            { type: 'equal', value: 1, expected: 1, actualIndex: 1, expectedIndex: 1 },
            { type: 'remove', value: 2, actualIndex: 2 },
            { type: 'equal', value: 3, expected: 3, actualIndex: 3, expectedIndex: 2, last: true }
        ]);
    });

    it('should indicate item removals at the end', function () {
        expect(arrayChanges([0], [], function (a, b) {
            return a === b;
        }), 'to equal', [
            { type: 'remove', value: 0, actualIndex: 0, last: true }
        ]);
    });

    it('should indicate missing items', function () {
        expect(arrayChanges([0, 1, 3], [0, 1, 2, 3], function (a, b) {
            return a === b;
        }), 'to equal', [
            { type: 'equal', value: 0, expected: 0, actualIndex: 0, expectedIndex: 0 },
            { type: 'equal', value: 1, expected: 1, actualIndex: 1, expectedIndex: 1 },
            { type: 'insert', value: 2, expectedIndex: 2 },
            { type: 'equal', value: 3, last: true, expected: 3, actualIndex: 2, expectedIndex: 3 }
        ]);
    });

    it('should indicate a missing item at the end', function () {
        expect(arrayChanges([], [0], function (a, b) {
            return a === b;
        }), 'to equal', [
            { type: 'insert', value: 0, expectedIndex: 0, last: true }
        ]);
    });

    it('should indicate moved items with two items', function () {
        expect(arrayChanges([1, 2, 3, 0], [0, 1, 2, 3], function (a, b) {
            return a === b;
        }), 'to equal', [
            { type: 'moveTarget', value: 0, actualIndex: 3, last: false },
            { type: 'equal', value: 1, actualIndex: 0, expected: 1, expectedIndex: 1 },
            { type: 'equal', value: 2, actualIndex: 1, expected: 2, expectedIndex: 2 },
            { type: 'equal', value: 3, actualIndex: 2, expected: 3, expectedIndex: 3 },
            { type: 'moveSource', value: 0, actualIndex: 3, last: true }
        ]);
    });

    it('shows items that are not equal but should be compared against each other as similar', function () {
        expect(arrayChanges([0, 1, 2, 3], [0, 2, 1, 3], function (a, b) {
            return a === b;
        }), 'to equal', [
            { type: 'equal', value: 0, actualIndex: 0, expected: 0, expectedIndex: 0 },
            { type: 'moveTarget', value: 2, actualIndex: 2, last: false },
            { type: 'equal', value: 1, actualIndex: 1, expected: 1, expectedIndex: 2 },
            { type: 'moveSource', value: 2, actualIndex: 2 },
            { type: 'equal', value: 3, actualIndex: 3, expected: 3, expectedIndex: 3, last: true }
        ]);
    });

    it('allows you to indicate which items should be considered similar', function () {
        expect(arrayChanges([
            { type: 'dog', name: 'Fido' },
            { type: 'dog', name: 'Teddy' },
            { type: 'person', name: 'Sune' },
            { type: 'dog', name: 'Charlie' },
            { type: 'dog', name: 'Sam' }
        ], [
            { type: 'dog', name: 'Fido' },
            { type: 'dog', name: 'Teddy' },
            { type: 'dog', name: 'Murphy' },
            { type: 'person', name: 'Andreas' },
            { type: 'dog', name: 'Charlie' },
            { type: 'dog', name: 'Sam' }
        ], function (a, b) {
            return a.type === b.type && a.name === b.name;
        }, function (a, b) {
            return a.type === b.type;
        }), 'to equal', [
            {
                type: 'equal',
                value: { type: 'dog', name: 'Fido' },
                expected: { type: 'dog', name: 'Fido' },
                actualIndex: 0,
                expectedIndex: 0
            },
            {
                type: 'equal',
                value: { type: 'dog', name: 'Teddy' },
                expected: { type: 'dog', name: 'Teddy' },
                actualIndex: 1,
                expectedIndex: 1
            },
            {
                type: 'insert',
                value: { type: 'dog', name: 'Murphy' },
                expectedIndex: 2
            },
            {
                type: 'similar',
                value: { type: 'person', name: 'Sune' },
                expected: { type: 'person', name: 'Andreas' },
                actualIndex: 2,
                expectedIndex: 3
            },
            {
                type: 'equal',
                value: { type: 'dog', name: 'Charlie' },
                expected: { type: 'dog', name: 'Charlie' },
                actualIndex: 3,
                expectedIndex: 4
            },
            {
                type: 'equal',
                value: { type: 'dog', name: 'Sam' },
                last: true,
                expected: { type: 'dog', name: 'Sam' },
                actualIndex: 4,
                expectedIndex: 5
            }
        ]);
    });

    it('supports diffing array-like objects', function () {
        expect(arrayChanges(toArguments(1, 2, 5), toArguments(1, 3, 4), function (a, b) {
            return a === b;
        }), 'to equal', [
            { type: 'equal', value: 1, expected: 1, actualIndex: 0, expectedIndex: 0 },
            { type: 'similar', value: 2, expected: 3, actualIndex: 1, expectedIndex: 1 },
            { type: 'similar', value: 5, expected: 4, actualIndex: 2, expectedIndex: 2, last: true }
        ]);
    });

    it('passes the item indices to the equal function', function () {
        var a = [1, 2];
        var b = [4, 5];
        var equal = sinon.spy(function (a, b) {
            return a === b;
        }).named('equal');
        arrayChanges(a, b, equal);
        expect(equal, 'to have calls satisfying', function () {
            equal(1, 4, 0, 0);
            equal(1, 5, 0, 1);
            equal(2, 4, 1, 0);
            equal(2, 5, 1, 1);
            equal(1, 4, 0, 0);
            equal(2, 5, 1, 1);
            equal(1, 4, 0, 0);
            equal(2, 5, 1, 1);
        });
    });

    it('passes the item indices to the similar function', function () {
        var a = [1, 2];
        var b = [4, 5];
        var equal = sinon.spy(function (a, b) {
            return a === b;
        }).named('equal');
        var similar = sinon.spy(function (a, b) {
            return a === b;
        }).named('similar');
        arrayChanges(a, b, equal, similar);
        expect(similar, 'to have calls satisfying', function () {
            similar(1, 4, 0, 0);
            similar(1, 5, 0, 1);
            similar(2, 4, 1, 0);
            similar(2, 5, 1, 1);
            similar(1, 4, 0, 0);
            similar(2, 5, 1, 1);
        });
    });

    it('should diff arrays that have non-numerical property names', function () {
        var a = [1, 2, 3];
        a.foo = 123;
        a.bar = 456;
        a.quux = {};

        var b = [1, 2, 3];
        b.bar = 456;
        b.baz = 789;
        b.quux = false;
        expect(arrayChanges(a, b, function (a, b) {
            return a === b;
        }, function (a, b) {
            return a === b;
        }, true), 'to equal', [
            { type: 'equal', value: 1, expected: 1, actualIndex: 0, expectedIndex: 0 },
            { type: 'equal', value: 2, expected: 2, actualIndex: 1, expectedIndex: 1 },
            { type: 'equal', value: 3, expected: 3, actualIndex: 2, expectedIndex: 2 },
            { type: 'remove', value: 123, actualIndex: 'foo' },
            { type: 'equal', value: 456, expected: 456, actualIndex: 'bar', expectedIndex: 'bar' },
            { type: 'similar', value: {}, expected: false, actualIndex: 'quux', expectedIndex: 'quux' },
            { type: 'insert', value: 789, expectedIndex: 'baz', last: true }
        ]);
    });

    it('should support an array of specific non-numerical keys to diff', function () {
        var a = [1];
        a.foo = 123;
        a.bar = 789;

        var b = [1];
        a.foo = 456;
        a.bar = false;
        expect(arrayChanges(a, b, function (a, b) {
            return a === b;
        }, function (a, b) {
            return a === b;
        }, [ 'foo' ]), 'to equal', [
            { type: 'equal', value: 1, expected: 1, actualIndex: 0, expectedIndex: 0 },
            { type: 'remove', actualIndex: 'foo', value: 456, last: true }
        ]);
    });

    if (typeof Symbol !== 'undefined') {
        it('should diff arrays that have Symbol property names', function () {
            var aSymbol = Symbol('a');
            var bSymbol = Symbol('b');
            var a = [1, 2];
            a[aSymbol] = 123;

            var b = [1, 2];
            b[bSymbol] = 456;
            expect(arrayChanges(a, b, function (a, b) {
                return a === b;
            }, function (a, b) {
                return a === b;
            }, true), 'to equal', [
                { type: 'equal', value: 1, expected: 1, actualIndex: 0, expectedIndex: 0 },
                { type: 'equal', value: 2, expected: 2, actualIndex: 1, expectedIndex: 1 },
                { type: 'remove', value: 123, actualIndex: aSymbol },
                { type: 'insert', value: 456, expectedIndex: bSymbol, last: true }
            ]);
        });
    }

    it('produces a valid plan', function () {
        this.timeout(20000);
        var arrays = g.array(g.natural({ max: 10 }), g.natural({ max: 10 }));
        expect(function (actual, expected) {
            expect(
                actual,
                'when diffed with',
                expected,
                'when executing the diff',
                'to equal',
                expected
            );
        }, 'to be valid for all', arrays, arrays);
    });
});
