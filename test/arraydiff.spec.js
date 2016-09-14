var expect = require('unexpected').clone()
    .use(require('unexpected-check'));
var arrayDiff = require('arraydiff-papandreou');
var generators = require('chance-generators');

describe('arraydiff', function () {
    var g;

    beforeEach(function () {
        g = generators(42);
    });

    function insert(array, index, values) {
        array.splice.apply(array, [index, 0].concat(values));
    }

    function remove(array, index, howMany) {
        return array.splice(index, howMany);
    }

    function move(array, from, to, howMany) {
        var values = remove(array, from, howMany);
        insert(array, to, values);
    }

    function executePlan(before, diff) {
        var out = before.slice();
        for (var i = 0; i < diff.length; i++) {
            var item = diff[i];
            // console.log 'applying:', out, item
            if (item.type === 'insert') {
                insert(out, item.index, item.values);
            } else if (item.type === 'remove') {
                remove(out, item.index, item.howMany);
            } else if (item.type === 'move') {
                move(out, item.from, item.to, item.howMany);
            }
        }
        return out;
    }

    it('produces a valid plan', function () {
        this.timeout(20000);
        var arrays = g.array(g.natural({ max: 10 }), g.natural({ max: 10 }));
        expect(function (actual, expected) {
            var diff = arrayDiff(actual, expected, function (a, b) {
                return a === b;
            });

            expect(
                [actual, diff],
                'when passed as parameters to',
                executePlan,
                'to equal',
                expected
            );
        }, 'to be valid for all', arrays, arrays);
    });
});
