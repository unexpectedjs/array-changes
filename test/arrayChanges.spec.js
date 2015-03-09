var arrayChanges = require('../lib/arrayChanges');
var expect = require('unexpected');

describe('array-changes', function () {
    it('returns a change-list with no changes if the arrays are the same', function () {
        expect(arrayChanges([0, 1, 2, 3], [0, 1, 2, 3], function (a, b) {
            return a === b;
        }), 'to equal', [
            { type: 'equal', value: 0, expected: 0 },
            { type: 'equal', value: 1, expected: 1 },
            { type: 'equal', value: 2, expected: 2 },
            { type: 'equal', value: 3, expected: 3, last: true }
        ]);
    });

    it('should indicate item removals', function () {
        expect(arrayChanges([0, 1, 2, 3], [0, 1, 3], function (a, b) {
            return a === b;
        }), 'to equal', [
            { type: 'equal', value: 0, expected: 0 },
            { type: 'equal', value: 1, expected: 1 },
            { type: 'remove', value: 2 },
            { type: 'equal', value: 3, expected: 3, last: true }
        ]);
    });

    it('should indicate missing items', function () {
        expect(arrayChanges([0, 1, 3], [0, 1, 2, 3], function (a, b) {
            return a === b;
        }), 'to equal', [
            { type: 'equal', value: 0, expected: 0 },
            { type: 'equal', value: 1, expected: 1 },
            { type: 'insert', value: 2 },
            { type: 'equal', value: 3, last: true, expected: 3 }
        ]);
    });

    it('should treat moved items as removed and inserted', function () {
        expect(arrayChanges([1, 2, 3, 0], [0, 1, 2, 3], function (a, b) {
            return a === b;
        }), 'to equal', [
            { type: 'insert', value: 0, last: false },
            { type: 'equal', value: 1, expected: 1 },
            { type: 'equal', value: 2, expected: 2 },
            { type: 'equal', value: 3, expected: 3 },
            { type: 'remove', value: 0, last: true }
        ]);
    });

    it('shows items that are not equal but should be compared against each other as similar', function () {
        expect(arrayChanges([0, 1, 2, 3], [0, 2, 1, 3], function (a, b) {
            return a === b;
        }), 'to equal', [
            { type: 'equal', value: 0, expected: 0 },
            { type: 'similar', value: 1, expected: 2 },
            { type: 'similar', value: 2, expected: 1 },
            { type: 'equal', value: 3, expected: 3, last: true }
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
                expected: { type: 'dog', name: 'Fido' }
            },
            {
                type: 'equal',
                value: { type: 'dog', name: 'Teddy' },
                expected: { type: 'dog', name: 'Teddy' }
            },
            {
                type: 'insert',
                value: { type: 'dog', name: 'Murphy' }
            },
            {
                type: 'similar',
                value: { type: 'person', name: 'Sune' },
                expected: { type: 'person', name: 'Andreas' }
            },
            {
                type: 'equal',
                value: { type: 'dog', name: 'Charlie' },
                expected: { type: 'dog', name: 'Charlie' }
            },
            {
                type: 'equal',
                value: { type: 'dog', name: 'Sam' },
                last: true,
                expected: { type: 'dog', name: 'Sam' }
            }
        ]);
    });
});
