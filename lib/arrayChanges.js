var arrayDiff = require('arraydiff-papandreou');

function extend(target) {
    for (var i = 1; i < arguments.length; i += 1) {
        var source = arguments[i];
        Object.keys(source).forEach(function (key) {
            target[key] = source[key];
        });
    }
    return target;
}

module.exports = function arrayChanges(actual, expected, equal, similar, includeNonNumericalProperties) {
    var mutatedArray = new Array(actual.length);

    for (var k = 0; k < actual.length; k += 1) {
        mutatedArray[k] = {
            type: 'similar',
            value: actual[k],
            actualIndex: k
        };
    }

    equal = equal || function (a, b) {
        return a === b;
    };

    similar = similar || function (a, b) {
        return false;
    };

    var itemsDiff = arrayDiff(Array.prototype.slice.call(actual), Array.prototype.slice.call(expected), function (a, b, aIndex, bIndex) {
        return equal(a, b, aIndex, bIndex) || similar(a, b, aIndex, bIndex);
    });

    function offsetIndex(index) {
        var offsetIndex = 0;
        var i;
        for (i = 0; i < mutatedArray.length && offsetIndex < index; i += 1) {
            if (mutatedArray[i].type !== 'remove' && mutatedArray[i].type !== 'moveSource') {
                offsetIndex++;
            }
        }

        return i;
    }

    var removes = itemsDiff.filter(function (diffItem) {
        return diffItem.type === 'remove';
    });

    var removedItems = 0;
    removes.forEach(function (diffItem) {
        var removeIndex = removedItems + diffItem.index;
        mutatedArray.slice(removeIndex, diffItem.howMany + removeIndex).forEach(function (v) {
            v.type = 'remove';
        });
        removedItems += diffItem.howMany;
    });

    var moves = itemsDiff.filter(function (diffItem) {
        return diffItem.type === 'move';
    });


    moves.forEach(function (diffItem) {
        var moveFromIndex = offsetIndex(diffItem.from + 1) - 1;
        var removed = mutatedArray.slice(moveFromIndex, diffItem.howMany + moveFromIndex);
        var added = removed.map(function (v) {
            return extend({}, v, { last: false, type: 'moveTarget' });
        });
        removed.forEach(function (v) {
            v.type = 'moveSource';
        });
        var insertIndex = offsetIndex(diffItem.to);
        Array.prototype.splice.apply(mutatedArray, [insertIndex, 0].concat(added));
    });


    var inserts = itemsDiff.filter(function (diffItem) {
        return diffItem.type === 'insert';
    });

    inserts.forEach(function (diffItem) {
        var added = new Array(diffItem.values.length);
        for (var i = 0 ; i < diffItem.values.length ; i += 1) {
            added[i] = {
                type: 'insert',
                value: diffItem.values[i],
                expectedIndex: diffItem.index
            };
        }
        var insertIndex = offsetIndex(diffItem.index);
        Array.prototype.splice.apply(mutatedArray, [insertIndex, 0].concat(added));
    });

    var offset = 0;
    mutatedArray.forEach(function (diffItem, index) {
        var type = diffItem.type;
        if (type === 'remove' || type === 'moveSource') {
            offset -= 1;
        } else if (type === 'similar') {
            diffItem.expected = expected[offset + index];
            diffItem.expectedIndex = offset + index;
        }
    });

    var conflicts = mutatedArray.reduce(function (conflicts, item) {
        return item.type === 'similar' || item.type === 'moveSource' || item.type === 'moveTarget' ? conflicts : conflicts + 1;
    }, 0);

    var c, i;
    for (i = 0, c = 0; i < Math.max(actual.length, expected.length) && c <= conflicts; i += 1) {
        if (
            i >= actual.length || i >= expected.length || (!equal(actual[i], expected[i], i, i) && !similar(actual[i], expected[i], i, i))
        ) {
            c += 1;
        }
    }

    if (c <= conflicts) {
        mutatedArray = [];
        var j;
        for (j = 0; j < Math.min(actual.length, expected.length); j += 1) {
            mutatedArray.push({
                type: 'similar',
                value: actual[j],
                expected: expected[j],
                actualIndex: j,
                expectedIndex: j
            });
        }

        if (actual.length < expected.length) {
            for (; j < Math.max(actual.length, expected.length); j += 1) {
                mutatedArray.push({
                    type: 'insert',
                    value: expected[j],
                    expectedIndex: j
                });
            }
        } else {
            for (; j < Math.max(actual.length, expected.length); j += 1) {
                mutatedArray.push({
                    type: 'remove',
                    value: actual[j],
                    actualIndex: j
                });
            }
        }
    }

    mutatedArray.forEach(function (diffItem) {
        if (diffItem.type === 'similar' && equal(diffItem.value, diffItem.expected, diffItem.actualIndex, diffItem.expectedIndex)) {
            diffItem.type = 'equal';
        }
    });

    if (includeNonNumericalProperties) {
        var nonNumericalKeys;
        if (Array.isArray(includeNonNumericalProperties)) {
            nonNumericalKeys = includeNonNumericalProperties;
        } else {
            var isSeenByNonNumericalKey = {};
            nonNumericalKeys = [];
            [actual, expected].forEach(function (obj) {
                Object.keys(obj).forEach(function (key) {
                    if (!/^(?:0|[1-9][0-9]*)$/.test(key) && !isSeenByNonNumericalKey[key]) {
                        isSeenByNonNumericalKey[key] = true;
                        nonNumericalKeys.push(key);
                    }
                });
                if (Object.getOwnPropertySymbols) {
                    Object.getOwnPropertySymbols(obj).forEach(function (symbol) {
                        if (!isSeenByNonNumericalKey[symbol]) {
                            isSeenByNonNumericalKey[symbol] = true;
                            nonNumericalKeys.push(symbol);
                        }
                    });
                }
            });
        }
        nonNumericalKeys.forEach(function (key) {
            if (key in actual) {
                if (key in expected) {
                    mutatedArray.push({
                        type: equal(actual[key], expected[key], key, key) ? 'equal' : 'similar',
                        expectedIndex: key,
                        actualIndex: key,
                        value: actual[key],
                        expected: expected[key]
                    });
                } else {
                    mutatedArray.push({
                        type: 'remove',
                        actualIndex: key,
                        value: actual[key]
                    });
                }
            } else {
                mutatedArray.push({
                    type: 'insert',
                    expectedIndex: key,
                    value: expected[key]
                });
            }
        });
    }

    if (mutatedArray.length > 0) {
        mutatedArray[mutatedArray.length - 1].last = true;
    }

    return mutatedArray;
};
