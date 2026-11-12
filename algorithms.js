/* Pure trace generators: each frame copies the array and counters.
   The interface can play these snapshots without changing the algorithm itself. */
(function (root) {
  'use strict';

  const code = {
    bubble: [
      'Repeat a pass through the unsorted part.',
      'Compare neighboring values.',
      'If left is bigger, swap them.',
      'Stop if a pass made no swaps.'
    ],
    insertion: [
      'Remember the next value as the key.',
      'Compare the key with a value to its left.',
      'Shift a bigger value one place right.',
      'Put the key in the gap.'
    ],
    merge: [
      'Split the range into two halves.',
      'Sort each half using these same steps.',
      'Compare the front values in the buffers.',
      'Write the smaller value to the list.',
      'Copy any values left in either buffer.'
    ],
    linear: [
      'Start at the first value.',
      'Compare this value with the target.',
      'If equal, return this position.',
      'Otherwise move to the next value.',
      'If none remain, report not found.'
    ],
    binary: [
      'Start with the whole sorted list.',
      'Look at the middle of the remaining range.',
      'Compare the middle value with the target.',
      'If smaller, keep only the right half.',
      'If bigger, keep only the left half.',
      'Return the position, or report not found.'
    ]
  };

  function sort(kind, input) {
    const values = input.slice();
    const frames = [];
    let comparisons = 0;
    let swaps = 0;
    let writes = 0;
    let memory = '';
    let buffers = null;

    function emit(line, active = [], move = [], message = '') {
      frames.push({
        a: values.slice(), line, active, move, message, memory, buffers,
        comparisons, swaps, writes
      });
    }

    emit(-1, [], [], 'Ready. The input is unchanged.');

    if (kind === 'bubble') {
      for (let end = values.length - 1; end > 0; end--) {
        let changed = false;
        emit(0, [], [], `Start a pass through positions 1 to ${end + 1}.`);
        for (let index = 0; index < end; index++) {
          comparisons++;
          emit(1, [index, index + 1], [], 'Compare these neighboring values.');
          if (values[index] > values[index + 1]) {
            [values[index], values[index + 1]] = [values[index + 1], values[index]];
            swaps++;
            writes += 2;
            changed = true;
            emit(2, [], [index, index + 1], 'Swap the out-of-order neighbors.');
          }
        }
        emit(3, [], [], changed ? 'Values moved. Begin another pass.' : 'No swaps: the list is sorted.');
        if (!changed) break;
      }
    } else if (kind === 'insertion') {
      for (let index = 1; index < values.length; index++) {
        const key = values[index];
        let previous = index - 1;
        memory = `Key in memory: ${key}`;
        emit(0, [index], [], `Remember ${key}. The values before it are already sorted.`);
        while (previous >= 0) {
          comparisons++;
          emit(1, [previous], [], `Compare ${values[previous]} with the remembered key ${key}.`);
          if (values[previous] <= key) break;
          values[previous + 1] = values[previous];
          writes++;
          emit(2, [], [previous + 1], 'Shift right. The key is safe in memory; a temporary duplicate is expected.');
          previous--;
        }
        values[previous + 1] = key;
        writes++;
        emit(3, [], [previous + 1], `Place the remembered key ${key} in the gap.`);
      }
    } else if (kind === 'merge') {
      function mergeRange(start, end) {
        if (end - start < 2) return;
        const middle = Math.floor((start + end) / 2);
        emit(0, [], [], `Split positions ${start + 1}–${end} into two halves.`);
        emit(1, [], [], 'Sort the smaller ranges first. A single value is already sorted.');
        mergeRange(start, middle);
        mergeRange(middle, end);

        // Copies protect unread values while we overwrite their original positions.
        const left = values.slice(start, middle);
        const right = values.slice(middle, end);
        let leftIndex = 0;
        let rightIndex = 0;
        let destination = start;
        function updateMemory() {
          buffers = { left: left.slice(leftIndex), right: right.slice(rightIndex) };
          memory = `Left buffer: [${buffers.left.join(', ')}] · Right buffer: [${buffers.right.join(', ')}]`;
        }
        while (leftIndex < left.length && rightIndex < right.length) {
          updateMemory();
          comparisons++;
          emit(2, [], [], `Compare buffer fronts: ${left[leftIndex]} and ${right[rightIndex]}.`);
          values[destination] = left[leftIndex] <= right[rightIndex]
            ? left[leftIndex++]
            : right[rightIndex++];
          writes++;
          updateMemory();
          emit(3, [], [destination], `Write ${values[destination]} at position ${destination + 1}.`);
          destination++;
        }
        while (leftIndex < left.length || rightIndex < right.length) {
          values[destination] = leftIndex < left.length ? left[leftIndex++] : right[rightIndex++];
          writes++;
          updateMemory();
          emit(4, [], [destination], 'One buffer is empty. Copy the next remaining value.');
          destination++;
        }
      }
      mergeRange(0, values.length);
    } else {
      throw new Error('Unknown sorting algorithm.');
    }
    memory = '';
    buffers = null;
    emit(-1, [], [], 'Finished. Every value is in ascending order.');
    frames[frames.length - 1].done = true;
    return frames;
  }

  function search(kind, input, target) {
    const values = input.slice();
    const frames = [];
    let comparisons = 0;
    let result = -1;
    let range = [0, values.length - 1];

    function emit(line, active, message) {
      frames.push({
        a: values.slice(), line, active, move: [], comparisons,
        swaps: 0, writes: 0, message, range: range.slice(), memory: ''
      });
    }

    emit(0, [], 'Ready. Search positions start at 1.');
    if (kind === 'linear') {
      for (let index = 0; index < values.length; index++) {
        comparisons++;
        emit(1, [index], `Compare ${values[index]} with ${target}.`);
        if (values[index] === target) {
          result = index;
          break;
        }
        emit(3, [index], 'No match. Move to the next value.');
      }
    } else if (kind === 'binary') {
      let low = 0;
      let high = values.length - 1;
      while (low <= high) {
        const middle = Math.floor((low + high) / 2);
        range = [low, high];
        emit(1, [middle], `Inspect the middle: position ${middle + 1}.`);
        comparisons++;
        emit(2, [middle], `Compare ${values[middle]} with ${target}.`);
        if (values[middle] === target) {
          result = middle;
          break;
        }
        if (values[middle] < target) {
          low = middle + 1;
          range = [low, high];
          emit(3, [], 'Discard the middle and everything to its left.');
        } else {
          high = middle - 1;
          range = [low, high];
          emit(4, [], 'Discard the middle and everything to its right.');
        }
      }
    } else {
      throw new Error('Unknown search algorithm.');
    }
    emit(kind === 'linear' ? (result < 0 ? 4 : 2) : 5,
      result < 0 ? [] : [result],
      result < 0 ? `${target} is not in this list.` : `Found ${target} at position ${result + 1}.`);
    Object.assign(frames[frames.length - 1], { done: true, result });
    return frames;
  }

  root.Algorithms = { sort, search, code };
  if (typeof module !== 'undefined') module.exports = root.Algorithms;
})(typeof window !== 'undefined' ? window : globalThis);
