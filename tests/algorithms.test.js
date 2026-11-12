/* Run with: node tests/algorithms.test.js. No browser or dependencies needed. */
'use strict';
const assert = require('node:assert/strict');
const { sort, search } = require('../algorithms.js');
const { challenges, compile, execute } = require('../builder.js');

// A reproducible generator makes a failing test repeatable.
let seed = 1741;
function random() {
  seed = (seed * 1664525 + 1013904223) >>> 0;
  return seed / 4294967296;
}

const inputs = [[], [1], [2, 1], [4, 4, 4], [-4, 0, -8, 3], [1, 2, 3, 4], [4, 3, 2, 1]];
for (let trial = 0; trial < 120; trial++) {
  inputs.push(Array.from({ length: Math.floor(random() * 40) }, () => Math.floor(random() * 41) - 20));
}
let sortCases = 0;
let searchCases = 0;
let blockCases = 0;
for (const input of inputs) {
  for (const kind of ['bubble', 'insertion', 'merge']) {
    const original = input.slice();
    const frames = sort(kind, input);
    const final = frames.at(-1);
    assert.deepEqual(final.a, input.slice().sort((left, right) => left - right));
    assert.deepEqual(input, original, 'A generator must not mutate the caller’s input.');
    assert.deepEqual(frames[0].a, original, 'Earlier frames must stay unchanged.');
    assert.equal(final.done, true);
    frames.forEach((frame, index) => {
      assert.equal(frame.a.length, input.length);
      for (const counter of ['comparisons', 'swaps', 'writes']) {
        assert.ok(Number.isInteger(frame[counter]) && frame[counter] >= 0);
        if (index) assert.ok(frame[counter] >= frames[index - 1][counter]);
      }
    });
    sortCases++;
  }
  const sorted = input.slice().sort((left, right) => left - right);
  for (const target of [-30, -10, 0, 10, 30, ...sorted.slice(0, 5)]) {
    for (const kind of ['linear', 'binary']) {
      const final = search(kind, sorted, target).at(-1);
      assert.equal(final.done, true);
      if (sorted.includes(target)) assert.equal(sorted[final.result], target);
      else assert.equal(final.result, -1);
      if (kind === 'linear') assert.equal(final.result, sorted.indexOf(target));
      if (kind === 'binary') {
        assert.ok(final.comparisons <= Math.ceil(Math.log2(sorted.length + 1)));
      }
      searchCases++;
    }
  }
  if (input.length) {
    for (const challenge of challenges) {
      const result = execute(challenge.model, input);
      assert.equal(result.hasOutput, true, result.message);
      assert.deepEqual(result.output, challenge.expected(input));
      blockCases++;
    }
  }
}
assert.equal(sort('bubble', [1, 2, 3, 4]).at(-1).comparisons, 3);
assert.equal(sort('bubble', [3, 2, 1]).at(-1).swaps, 3);
assert.equal(sort('merge', [3, 2, 1]).at(-1).swaps, 0);
assert.equal(search('linear', [7, 2, 9], 2).at(-1).result, 1);
assert.throws(() => compile([{ type: 'else' }]), /else needs/);
assert.throws(() => compile([{ type: 'while' }]), /add an end/);
assert.throws(() => compile([{ type: 'end' }]), /no matching/);
assert.throws(() => sort('unknown', []), /Unknown/);
assert.throws(() => search('unknown', [], 1), /Unknown/);

// Exercise else branches independently of the provided model solutions.
function conditionalProgram(condition) {
  return [
    { type: 'set', name: 'pointer', value: 'zero' },
    { type: 'compare', condition },
    { type: 'if' },
    { type: 'output', value: 'current' },
    { type: 'else' },
    { type: 'output', value: 'pointer' },
    { type: 'end' }
  ];
}
assert.equal(execute(conditionalProgram('above'), [12]).output, 12);
assert.equal(execute(conditionalProgram('above'), [7]).output, 0);
const outOfBounds = execute([
  { type: 'set', name: 'pointer', value: 'zero' },
  { type: 'move' },
  { type: 'output', value: 'current' }
], [1]);
assert.equal(outOfBounds.hasOutput, false);
assert.match(outOfBounds.message, /outside the list/);
assert.match(execute([{ type: 'if' }, { type: 'end' }], [1]).message, /compare block/);
const endless = execute([
  { type: 'set', name: 'pointer', value: 'zero' },
  { type: 'while', condition: 'inList' },
  { type: 'end' }
], [1]);
assert.equal(endless.hasOutput, false);
assert.match(endless.message, /loop|Loop/);
console.log(`Passed: ${sortCases} sort cases, ${searchCases} search cases, ${blockCases} builder model cases, plus counters, branching, malformed blocks, bounds, and loop protection.`);
