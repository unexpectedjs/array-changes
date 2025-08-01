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
            { type: 'moveTarget', value: 0, actualIndex: 3, expected: 0, expectedIndex: 0, id: 0, equal: true, last: false },
            { type: 'equal', value: 1, actualIndex: 0, expected: 1, expectedIndex: 1 },
            { type: 'equal', value: 2, actualIndex: 1, expected: 2, expectedIndex: 2 },
            { type: 'equal', value: 3, actualIndex: 2, expected: 3, expectedIndex: 3 },
            { type: 'moveSource', value: 0, actualIndex: 3, expected: 0, expectedIndex: 0, id: 0, equal: true, last: true }
        ]);
    });

    it('shows items that are not equal but should be compared against each other as similar', function () {
        expect(arrayChanges([0, 1, 2, 3], [0, 2, 1, 3], function (a, b) {
            return a === b;
        }), 'to equal', [
            { type: 'equal', value: 0, actualIndex: 0, expected: 0, expectedIndex: 0 },
            { type: 'moveTarget', value: 2, actualIndex: 2, expected: 2, expectedIndex: 1, id: 0, equal: true, last: false },
            { type: 'equal', value: 1, actualIndex: 1, expected: 1, expectedIndex: 2 },
            { type: 'moveSource', value: 2, actualIndex: 2, expected: 2, expectedIndex: 1, id: 0, equal: true },
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

    it('falls back to item by item diffing if that results in less conflicts', function () {
        expect(arrayChanges([1, 2, 5], [1, 3, 4], function (a, b) {
            return a === b;
        }), 'to equal', [
            { type: 'equal', value: 1, expected: 1, actualIndex: 0, expectedIndex: 0 },
            { type: 'similar', value: 2, expected: 3, actualIndex: 1, expectedIndex: 1 },
            { type: 'similar', value: 5, expected: 4, actualIndex: 2, expectedIndex: 2, last: true }
        ]);
    });

    describe('when item by item diff is disabled', function () {
        it('does not use the item by item diff even if that would result in less conflicts', function () {
            expect(arrayChanges([1, 2, 5], [1, 3, 4], function (a, b) {
                return a === b;
            }, function () {
                return false;
            }, { fallbackToItemByItemDiff: false }), 'to equal', [
                { type: 'equal', value: 1, actualIndex: 0, expected: 1, expectedIndex: 0 },
                { type: 'insert', value: 3, expectedIndex: 1 },
                { type: 'insert', value: 4, expectedIndex: 1 },
                { type: 'remove', value: 2, actualIndex: 1 },
                { type: 'remove', value: 5, actualIndex: 2, last: true }
            ]);
        });
    });

    describe('when including non-numerical properties', function () {
        it('returns an empty change-list with an undefined key on the LHS', function () {
            var a = [];
            a.nothing = undefined;
            var b = [];

            expect(arrayChanges(a, b, undefined, false, {
                includeNonNumericalProperties: true
            }), 'to equal', []);
        });

        it('returns an empty change-list with an undefined key on the RHS', function () {
            var a = [];
            var b = [];
            b.nothing = undefined;

            expect(arrayChanges(a, b, undefined, false, {
                includeNonNumericalProperties: true
            }), 'to equal', []);
        });

        it('returns an empty change-list with undefined keys on both the LHS and RHS', function () {
            var a = [];
            a.nothing = undefined;
            var b = [];
            b.nothing = undefined;

            expect(arrayChanges(a, b, undefined, false, {
                includeNonNumericalProperties: true
            }), 'to equal', []);
        });

        it('returns a change-list containing remove when a LHS key is undefined on the RHS', function () {
            var a = [];
            a.nothing = true;
            var b = [];
            b.nothing = undefined;

            expect(arrayChanges(a, b, undefined, false, {
                includeNonNumericalProperties: true
            }), 'to equal', [
                { type: 'remove', actualIndex: 'nothing', value: true, expected: undefined, last: true }
            ]);
        });

        it('returns a change-list containing similar when a RHS key is undefined on the LHS', function () {
            var a = [];
            a.nothing = undefined;
            var b = [];
            b.nothing = true;

            expect(arrayChanges(a, b, undefined, false, {
                includeNonNumericalProperties: true
            }), 'to equal', [
                { type: 'similar', expectedIndex: 'nothing', actualIndex: 'nothing', value: undefined, expected: true, last: true }
            ]);
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
            }, { includeNonNumericalProperties: true }), 'to equal', [
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
            }, { includeNonNumericalProperties: ['foo'] }), 'to equal', [
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
                }, { includeNonNumericalProperties: true }), 'to equal', [
                    { type: 'equal', value: 1, expected: 1, actualIndex: 0, expectedIndex: 0 },
                    { type: 'equal', value: 2, expected: 2, actualIndex: 1, expectedIndex: 1 },
                    { type: 'remove', value: 123, actualIndex: aSymbol },
                    { type: 'insert', value: 456, expectedIndex: bSymbol, last: true }
                ]);
            });
        }
    });

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

    it("handles moves with similar items", function () {
        var a = [
            {
                kind: 0,
                type: 'tag',
                name: 'p',
                children: [{ data: 'A', type: 'text' }],
                attribs: {}
            },
            {
                kind: 1,
                type: 'tag',
                name: 'p',
                children: [{ data: 'Hello world 2023', type: 'text' }],
                attribs: {}
            }
        ];
        var b = [
            {
                kind: 1,
                type: 'tag',
                name: 'p',
                children: [{ data: 'Hello world 2025', type: 'text' }],
                attribs: {}
            },
            {
                kind: 0,
                type: 'tag',
                name: 'p',
                children: [{ data: 'A', type: 'text' }],
                attribs: {}
            }
        ];

        expect(arrayChanges(a, b, function (a, b) {
            return expect.equal(a, b);
        }, function (a, b) {
            return a.kind === b.kind;
        }), 'to equal', [
            {
                type: 'moveTarget',
                value: { kind: 1, type: 'tag', name: 'p', children: [{ data: 'Hello world 2023', type: 'text' }], attribs: {} },
                expected: { kind: 1, type: 'tag', name: 'p', children: [{ data: 'Hello world 2025', type: 'text' }], attribs: {} },
                actualIndex: 1,
                expectedIndex: 0,
                id: 0,
                equal: false,
                last: false
            },
            {
                type: 'equal',
                value: { kind: 0, type: 'tag', name: 'p', children: [{ data: 'A', type: 'text' }], attribs: {} },
                actualIndex: 0,
                expected: { kind: 0, type: 'tag', name: 'p', children: [{ data: 'A', type: 'text' }], attribs: {} },
                expectedIndex: 1
            },
            {
                type: 'moveSource',
                value: { kind: 1, type: 'tag', name: 'p', children: [{ data: 'Hello world 2023', type: 'text' }], attribs: {} },
                expected: { kind: 1, type: 'tag', name: 'p', children: [{ data: 'Hello world 2025', type: 'text' }], attribs: {} },
                actualIndex: 1,
                expectedIndex: 0,
                id: 0,
                equal: false,
                last: true
            }
        ]);
    });

    it("handles moves where no items are similar", function () {
        var a = ['a', 'b', 'c'];
        var b = ['c', 'b', 'a'];

        expect(arrayChanges(a, b, function (a, b) {
            return expect.equal(a, b);
        }, function () {
            return false;
        }), 'to equal', [
            { type: 'moveTarget', value: 'c', actualIndex: 2, last: false, expected: 'c', expectedIndex: 0, id: 1, equal: true },
            { type: 'moveTarget', value: 'b', actualIndex: 1, last: false, expected: 'b', expectedIndex: 1, id: 0, equal: true },
            { type: 'equal', value: 'a', actualIndex: 0, expected: 'a', expectedIndex: 2 },
            { type: 'moveSource', value: 'b', actualIndex: 1, expected: 'b', expectedIndex: 1, id: 0, equal: true },
            { type: 'moveSource', value: 'c', actualIndex: 2, expected: 'c', expectedIndex: 0, id: 1, equal: true, last: true }
        ]);
    });

    it("handles moves with a mix of equal and similar items", function () {
        var a = ['aaa', 'bbb', 'ccc', 'dddd'];
        var b = ['ddd', 'ccc', 'bbb', 'aaa'];

        expect(arrayChanges(a, b, function (a, b) {
            return expect.equal(a, b);
        }, function (a, b) {
            return expect.equal(a.slice(0, 3), b.slice(0, 3));
        }), 'to equal', [
            { type: 'moveTarget', value: 'dddd', actualIndex: 3, id: 2, last: false, expected: 'ddd', expectedIndex: 0, equal: false },
            { type: 'moveTarget', value: 'ccc', actualIndex: 2, id: 1, last: false, expected: 'ccc', expectedIndex: 1, equal: true },
            { type: 'moveTarget', value: 'bbb', actualIndex: 1, id: 0, last: false, expected: 'bbb', expectedIndex: 2, equal: true },
            { type: 'equal', value: 'aaa', actualIndex: 0, expected: 'aaa', expectedIndex: 3 },
            { type: 'moveSource', value: 'bbb', actualIndex: 1, id: 0, expected: 'bbb', expectedIndex: 2, equal: true },
            { type: 'moveSource', value: 'ccc', actualIndex: 2, id: 1, expected: 'ccc', expectedIndex: 1, equal: true },
            { type: 'moveSource', value: 'dddd', actualIndex: 3, id: 2, expected: 'ddd', expectedIndex: 0, equal: false, last: true }
        ]);
    });
});
