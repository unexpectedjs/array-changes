/*global describe, it*/
var arrayChanges = require('../lib/arrayChanges');
var expect = require('unexpected').clone().use(require('unexpected-sinon'));
var sinon = require('sinon');

function toArguments() {
    return arguments;
}

describe('array-changes', function () {
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

    it('should treat moved items as removed and inserted', function () {
        expect(arrayChanges([1, 2, 3, 0], [0, 1, 2, 3], function (a, b) {
            return a === b;
        }), 'to equal', [
            { type: 'insert', value: 0, last: false, actualIndex: 3 },
            { type: 'equal', value: 1, expected: 1, actualIndex: 0, expectedIndex: 1 },
            { type: 'equal', value: 2, expected: 2, actualIndex: 1, expectedIndex: 2 },
            { type: 'equal', value: 3, expected: 3, actualIndex: 2, expectedIndex: 3 },
            { type: 'remove', value: 0, last: true, actualIndex: 3 }
        ]);
    });

    it('shows items that are not equal but should be compared against each other as similar', function () {
        expect(arrayChanges([0, 1, 2, 3], [0, 2, 1, 3], function (a, b) {
            return a === b;
        }), 'to equal', [
            { type: 'equal', value: 0, expected: 0, actualIndex: 0, expectedIndex: 0 },
            { type: 'similar', value: 1, expected: 2, actualIndex: 1, expectedIndex: 1 },
            { type: 'similar', value: 2, expected: 1, actualIndex: 2, expectedIndex: 2 },
            { type: 'equal', value: 3, expected: 3, actualIndex: 3, expectedIndex: 3, last: true }
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
        expect(equal, 'to have calls satisfying', [
            { args: [ 1, 4, 0, 0 ] },
            { args: [ 1, 5, 0, 1 ] },
            { args: [ 2, 4, 1, 0 ] },
            { args: [ 2, 5, 1, 1 ] },
            { args: [ 1, 4, 0, 0 ] },
            { args: [ 2, 5, 1, 1 ] },
            { args: [ 1, 4, 0, 0 ] },
            { args: [ 2, 5, 1, 1 ] }
        ]);
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
        expect(similar, 'to have calls satisfying', [
            { args: [ 1, 4, 0, 0 ] },
            { args: [ 1, 5, 0, 1 ] },
            { args: [ 2, 4, 1, 0 ] },
            { args: [ 2, 5, 1, 1 ] },
            { args: [ 1, 4, 0, 0 ] },
            { args: [ 2, 5, 1, 1 ] }
        ]);
    });
});
