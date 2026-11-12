/* A tiny block language, not JavaScript evaluation. The interpreter executes
   one block at a time; explicit jump links implement nested if/else and loops. */
(function (root) {
  'use strict';

  const challenges = [
    {
      description: 'Find the smallest number. Output a single value, using memory named smallest. Every test list has at least one number.',
      hint: 'Remember the first value as smallest. Visit every item; if it is smaller, update your memory. Output smallest after the loop.',
      sample: [12, 7, 24, 3, 9],
      expected: values => Math.min(...values),
      model: [
        { type: 'set', name: 'pointer', value: 'zero' },
        { type: 'set', name: 'smallest', value: 'first' },
        { type: 'while', condition: 'inList' },
        { type: 'compare', condition: 'less' },
        { type: 'if' },
        { type: 'set', name: 'smallest', value: 'current' },
        { type: 'end' },
        { type: 'move' },
        { type: 'end' },
        { type: 'output', value: 'smallest' }
      ]
    },
    {
      description: 'Count how many numbers are strictly above 10. Output the count. A number equal to 10 does not count.',
      hint: 'Begin with count = 0. Visit each number. Compare it with 10; only add one when the comparison is true.',
      sample: [12, 7, 24, 10, 19],
      expected: values => values.filter(value => value > 10).length,
      model: [
        { type: 'set', name: 'pointer', value: 'zero' },
        { type: 'set', name: 'count', value: 'zero' },
        { type: 'while', condition: 'inList' },
        { type: 'compare', condition: 'above' },
        { type: 'if' },
        { type: 'set', name: 'count', value: 'countPlus' },
        { type: 'end' },
        { type: 'move' },
        { type: 'end' },
        { type: 'output', value: 'count' }
      ]
    },
    {
      description: 'Sort the whole list from smallest to largest, preserving every value. Use nested loops and neighboring swaps, then output the list.',
      hint: 'One pass only moves the largest value to the end. Repeat a neighbor-by-neighbor pass length − 1 times. Reset pointer to 0 before every pass.',
      sample: [18, 7, 12, 3, 9],
      expected: values => values.slice().sort((left, right) => left - right),
      model: [
        { type: 'set', name: 'passes', value: 'zero' },
        { type: 'while', condition: 'morePasses' },
        { type: 'set', name: 'pointer', value: 'zero' },
        { type: 'while', condition: 'hasNext' },
        { type: 'compare', condition: 'neighbors' },
        { type: 'if' },
        { type: 'swap' },
        { type: 'end' },
        { type: 'move' },
        { type: 'end' },
        { type: 'set', name: 'passes', value: 'passesPlus' },
        { type: 'end' },
        { type: 'output', value: 'list' }
      ]
    }
  ];

  const expressionLabels = {
    zero: '0', first: 'first value', current: 'current value',
    countPlus: 'count + 1', passesPlus: 'passes + 1',
    smallest: 'smallest', count: 'count', pointer: 'pointer', passes: 'passes', list: 'the list'
  };
  const conditionLabels = {
    inList: 'pointer < length', hasNext: 'pointer < length − 1',
    morePasses: 'passes < length − 1', less: 'current < smallest',
    above: 'current > 10', neighbors: 'current > next'
  };

  // Compilation pairs each opener with its end, validating the nesting first.
  function compile(program) {
    if (!program.length) throw new Error('Add some blocks before running.');
    const links = {};
    const stack = [];
    program.forEach((block, index) => {
      if (block.type === 'while' || block.type === 'if') {
        stack.push({ type: block.type, start: index, alternative: null });
      } else if (block.type === 'else') {
        const open = stack.at(-1);
        if (!open || open.type !== 'if' || open.alternative !== null) {
          throw new Error(`Block ${index + 1}: else needs an open if, with only one else.`);
        }
        open.alternative = index;
      } else if (block.type === 'end') {
        const open = stack.pop();
        if (!open) throw new Error(`Block ${index + 1}: this end has no matching if or loop.`);
        links[open.start] = { end: index, alternative: open.alternative };
        links[index] = { start: open.start, type: open.type };
        if (open.alternative !== null) links[open.alternative] = { end: index };
      }
    });
    if (stack.length) throw new Error(`Block ${stack.at(-1).start + 1}: add an end to close this ${stack.at(-1).type}.`);
    return links;
  }

  function createMachine(program, input) {
    const links = compile(program);
    const seenStates = new Set();
    const machine = {
      data: input.slice(), variables: {}, test: null, pc: 0, active: -1,
      steps: 0, done: false, hasOutput: false, output: undefined, message: 'Ready.'
    };

    function variable(name) {
      if (!(name in machine.variables)) throw new Error(`Set ${name} before using it.`);
      return machine.variables[name];
    }
    function read(index) {
      if (!Number.isInteger(index) || index < 0 || index >= machine.data.length) {
        throw new Error('The pointer is outside the list. Check the loop condition and where you move it.');
      }
      return machine.data[index];
    }
    function expression(name) {
      switch (name) {
        case 'zero': return 0;
        case 'first': return read(0);
        case 'current': return read(variable('pointer'));
        case 'countPlus': return variable('count') + 1;
        case 'passesPlus': return variable('passes') + 1;
        case 'list': return machine.data.slice();
        default: return variable(name);
      }
    }
    function condition(name) {
      switch (name) {
        case 'inList': return variable('pointer') < machine.data.length;
        case 'hasNext': return variable('pointer') < machine.data.length - 1;
        case 'morePasses': return variable('passes') < machine.data.length - 1;
        case 'less': return read(variable('pointer')) < variable('smallest');
        case 'above': return read(variable('pointer')) > 10;
        case 'neighbors': return read(variable('pointer')) > read(variable('pointer') + 1);
        default: throw new Error('Choose a valid condition.');
      }
    }

    machine.step = function () {
      if (machine.done) return machine;
      if (machine.pc >= program.length) {
        machine.done = true;
        machine.message = 'The steps ended without an output. Add an output block.';
        return machine;
      }
      if (machine.steps >= 20000) {
        machine.done = true;
        machine.message = 'Stopped after 20,000 steps. A loop may never finish. Check what changes inside it.';
        return machine;
      }
      // Repeating an identical full state means this deterministic program
      // can never escape its loop. Stop promptly instead of animating forever.
      const stateKey = JSON.stringify([machine.pc, machine.data, machine.variables, machine.test]);
      if (seenStates.has(stateKey)) {
        machine.done = true;
        machine.message = 'This exact state repeated. The loop cannot finish; change the pointer or loop memory inside it.';
        return machine;
      }
      seenStates.add(stateKey);
      const index = machine.pc;
      const block = program[index];
      machine.active = index;
      machine.pc++;
      machine.steps++;
      try {
        switch (block.type) {
          case 'set':
            machine.variables[block.name] = expression(block.value);
            machine.message = `Remember ${block.name} = ${machine.variables[block.name]}.`;
            break;
          case 'compare':
            machine.test = condition(block.condition);
            machine.message = `${conditionLabels[block.condition]}? ${machine.test ? 'Yes' : 'No'}. Remember that answer.`;
            break;
          case 'if':
            if (machine.test === null) throw new Error('Add a compare block before using if.');
            if (!machine.test) machine.pc = (links[index].alternative ?? links[index].end) + 1;
            machine.message = `The comparison is ${machine.test ? 'true: follow the if branch' : 'false: skip to else, or past end'}.`;
            break;
          case 'else':
            machine.pc = links[index].end + 1;
            machine.message = 'The if branch already ran. Skip the else branch.';
            break;
          case 'while': {
            const repeat = condition(block.condition);
            if (!repeat) machine.pc = links[index].end + 1;
            machine.message = `${conditionLabels[block.condition]}? ${repeat ? 'Yes: enter the loop' : 'No: leave the loop'}.`;
            break;
          }
          case 'end':
            if (links[index].type === 'while') machine.pc = links[index].start;
            machine.message = links[index].type === 'while' ? 'Return to the loop condition.' : 'Continue after the decision.';
            break;
          case 'swap': {
            const pointer = variable('pointer');
            const current = read(pointer);
            const next = read(pointer + 1);
            machine.data[pointer] = next;
            machine.data[pointer + 1] = current;
            machine.message = `Swap ${current} and ${next}.`;
            break;
          }
          case 'move':
            machine.variables.pointer = variable('pointer') + 1;
            machine.message = `Move pointer to position ${machine.variables.pointer}.`;
            break;
          case 'output':
            machine.output = expression(block.value);
            machine.hasOutput = true;
            machine.done = true;
            machine.message = `Output: ${Array.isArray(machine.output) ? '[' + machine.output.join(', ') + ']' : machine.output}.`;
            break;
          default:
            throw new Error('Unknown block.');
        }
      } catch (error) {
        machine.done = true;
        machine.message = `Block ${index + 1}: ${error.message}`;
      }
      return machine;
    };
    return machine;
  }

  function execute(program, input) {
    const machine = createMachine(program, input);
    while (!machine.done) machine.step();
    return machine;
  }

  const api = { challenges, compile, createMachine, execute };
  root.BlockAlgorithms = api;
  if (typeof module !== 'undefined') module.exports = api;
  if (typeof document === 'undefined') return;

  const element = id => document.getElementById(id);
  let challengeIndex = 0;
  let program = [];
  let machine = null;
  let timer = null;
  let draggedIndex = null;
  const defaults = {
    set: { type: 'set', name: 'pointer', value: 'zero' },
    compare: { type: 'compare', condition: 'less' },
    if: { type: 'if' }, else: { type: 'else' },
    while: { type: 'while', condition: 'inList' },
    end: { type: 'end' }, swap: { type: 'swap' }, move: { type: 'move' },
    output: { type: 'output', value: 'smallest' }
  };

  function pause() {
    clearTimeout(timer);
    timer = null;
    element('builder-run').textContent = 'Run';
    element('builder-run').setAttribute('aria-pressed', 'false');
  }

  function drawStage() {
    const data = machine ? machine.data : challenges[challengeIndex].sample;
    const pointer = machine ? machine.variables.pointer : undefined;
    element('builder-data').innerHTML = data.map((value, index) => `<span class="number ${index === pointer ? 'active' : ''}" aria-label="Position ${index}, value ${value}${index === pointer ? ', current pointer' : ''}">${value}</span>`).join('');
    const memories = machine ? Object.entries(machine.variables).map(([name, value]) => `${name} = ${value}`) : [];
    if (machine && machine.test !== null) memories.push(`comparison = ${machine.test}`);
    element('builder-memory').textContent = memories.length ? memories.join('  ·  ') : 'Memory is empty. Your set blocks create it.';
    document.querySelectorAll('#program li').forEach((row, index) => {
      row.classList.toggle('active', Boolean(machine && index === machine.active));
    });
  }

  function resetRun(message = 'Ready. Run your blocks, or take one step at a time.') {
    pause();
    machine = null;
    element('builder-step').disabled = false;
    element('builder-status').textContent = message;
    drawStage();
  }

  function select(field, options, selected, index, label) {
    return `<select data-field="${field}" data-index="${index}" aria-label="Block ${index + 1}: ${label}">${options.map(([value, text]) => `<option value="${value}" ${value === selected ? 'selected' : ''}>${text}</option>`).join('')}</select>`;
  }

  function blockText(block) {
    if (block.type === 'set') return `Set ${block.name} = ${expressionLabels[block.value]}`;
    if (block.type === 'compare') return `Compare: ${conditionLabels[block.condition]}`;
    if (block.type === 'while') return `Repeat while ${conditionLabels[block.condition]}`;
    if (block.type === 'output') return `Output ${expressionLabels[block.value]}`;
    return { if: 'If comparison is true', else: 'Else', end: 'End', swap: 'Swap current and next', move: 'Move pointer + 1' }[block.type];
  }

  function renderProgram() {
    let depth = 0;
    element('program').innerHTML = program.map((block, index) => {
      if (block.type === 'end' || block.type === 'else') depth = Math.max(0, depth - 1);
      const indent = Math.min(depth, 4) * 14;
      let content = `<span class="block-name">${blockText(block)}</span>`;
      if (block.type === 'set') {
        content = '<span class="block-name">Set</span>' + select('name', ['pointer', 'smallest', 'count', 'passes'].map(name => [name, name]), block.name, index, 'variable name') + '<span>to</span>' + select('value', Object.entries(expressionLabels).filter(([key]) => key !== 'list'), block.value, index, 'value');
      } else if (block.type === 'compare' || block.type === 'while') {
        const keys = block.type === 'compare' ? ['less', 'above', 'neighbors'] : ['inList', 'hasNext', 'morePasses'];
        content = `<span class="block-name">${block.type === 'compare' ? 'Compare' : 'Repeat while'}</span>` + select('condition', keys.map(key => [key, conditionLabels[key]]), block.condition, index, 'condition');
      } else if (block.type === 'output') {
        content = '<span class="block-name">Output</span>' + select('value', ['smallest', 'count', 'list', 'pointer', 'passes', 'current'].map(key => [key, expressionLabels[key]]), block.value, index, 'output value');
      }
      if (['if', 'while', 'else'].includes(block.type)) depth++;
      return `<li draggable="true" data-index="${index}" style="margin-left:${indent}px"><div class="block-line"><span class="micro">${String(index + 1).padStart(2, '0')}</span>${content}</div><div class="block-actions"><button data-action="up" data-index="${index}" aria-label="Move block ${index + 1} up" ${index === 0 ? 'disabled' : ''}>↑</button><button data-action="down" data-index="${index}" aria-label="Move block ${index + 1} down" ${index === program.length - 1 ? 'disabled' : ''}>↓</button><button data-action="remove" data-index="${index}" aria-label="Remove block ${index + 1}">×</button></div></li>`;
    }).join('');
    drawStage();
  }

  function verifyOutput() {
    if (!machine.hasOutput) return;
    const challenge = challenges[challengeIndex];
    const equal = (left, right) => JSON.stringify(left) === JSON.stringify(right);
    const expected = challenge.expected(challenge.sample);
    if (!equal(machine.output, expected)) {
      machine.message += ` Expected ${JSON.stringify(expected)}. Check the highlighted step and try again.`;
      return;
    }
    // A correct answer on one sample can be accidental. Exercise edge cases too.
    const tests = [[4], [10, 10, 10], [21, -3, 11, 0, 21], [5, 4, 3, 2, 1], [1, 2, 3, 4, 5], [11, 10, 9, 12]];
    for (const input of tests) {
      const result = execute(program, input);
      if (!result.hasOutput || !equal(result.output, challenge.expected(input))) {
        machine.message += ` Correct for this sample, but try [${input.join(', ')}]: your output is ${result.hasOutput ? JSON.stringify(result.output) : 'missing'}; expected ${JSON.stringify(challenge.expected(input))}. ${result.hasOutput ? '' : result.message}`;
        return;
      }
    }
    machine.message += ' Correct on this sample and 6 additional lists, including duplicates, a single item, and negative values. Testing builds confidence; explaining why it always works is the next step.';
  }

  function step() {
    if (!machine) {
      try {
        machine = createMachine(program, challenges[challengeIndex].sample);
      } catch (error) {
        element('builder-status').textContent = error.message;
        pause();
        return false;
      }
    }
    machine.step();
    if (machine.done) {
      pause();
      verifyOutput();
      element('builder-step').disabled = true;
    }
    drawStage();
    element('builder-status').textContent = `${machine.message} (${machine.steps} steps)`;
    return !machine.done;
  }

  function tick() {
    if (step()) timer = setTimeout(tick, 80);
  }

  function chooseChallenge() {
    challengeIndex = Number(element('challenge').value);
    const challenge = challenges[challengeIndex];
    program = [{ type: 'set', name: 'pointer', value: 'zero' }];
    element('challenge-description').textContent = challenge.description;
    element('builder-hint').textContent = challenge.hint;
    let depth = 0;
    element('model-preview').textContent = challenge.model.map(block => {
      if (block.type === 'end' || block.type === 'else') depth--;
      const line = '  '.repeat(Math.max(0, depth)) + blockText(block);
      if (['if', 'while', 'else'].includes(block.type)) depth++;
      return line;
    }).join('\n');
    element('model-details').open = false;
    resetRun();
    renderProgram();
  }

  element('toolbox').innerHTML = [
    ['set', 'Set variable'], ['compare', 'Compare'], ['if', 'If true'],
    ['else', 'Else'], ['while', 'Repeat while'], ['end', 'End loop / decision'],
    ['swap', 'Swap current and next'], ['move', 'Move pointer + 1'], ['output', 'Output']
  ].map(([type, label]) => `<button class="tool" data-type="${type}"><span aria-hidden="true">+</span>${label}</button>`).join('');

  element('toolbox').addEventListener('click', event => {
    const button = event.target.closest('[data-type]');
    if (!button) return;
    if (program.length >= 80) {
      element('builder-status').textContent = 'This workspace holds up to 80 blocks. Try simplifying your steps.';
      return;
    }
    const block = { ...defaults[button.dataset.type] };
    if (block.type === 'compare' && challengeIndex > 0) block.condition = challengeIndex === 1 ? 'above' : 'neighbors';
    if (block.type === 'output') block.value = ['smallest', 'count', 'list'][challengeIndex];
    program.push(block);
    resetRun(`Added block ${program.length}: ${blockText(block)}.`);
    renderProgram();
  });

  element('program').addEventListener('change', event => {
    const input = event.target;
    if (!input.dataset.field) return;
    program[Number(input.dataset.index)][input.dataset.field] = input.value;
    resetRun('Block updated. Run again to test your change.');
  });

  element('program').addEventListener('click', event => {
    const button = event.target.closest('[data-action]');
    if (!button) return;
    const index = Number(button.dataset.index);
    const action = button.dataset.action;
    let focusIndex = index;
    if (action === 'remove') {
      program.splice(index, 1);
      focusIndex = Math.min(index, program.length - 1);
    } else {
      const destination = index + (action === 'up' ? -1 : 1);
      [program[index], program[destination]] = [program[destination], program[index]];
      focusIndex = destination;
    }
    resetRun('Blocks rearranged. Indentation shows their new nesting.');
    renderProgram();
    const focusButton = element('program').querySelector(`[data-action="${action}"][data-index="${focusIndex}"]:not(:disabled)`)
      || element('program').querySelector(`[data-action="remove"][data-index="${focusIndex}"]`);
    if (focusButton) focusButton.focus();
    else element('clear-builder').focus();
  });

  element('program').addEventListener('dragstart', event => {
    const row = event.target.closest('li');
    if (!row || event.target.closest('select, button')) {
      event.preventDefault();
      return;
    }
    draggedIndex = Number(row.dataset.index);
    event.dataTransfer.setData('text/plain', String(draggedIndex));
    event.dataTransfer.effectAllowed = 'move';
  });
  element('program').addEventListener('dragover', event => {
    if (draggedIndex === null) return;
    event.preventDefault();
    document.querySelectorAll('.drop-target').forEach(row => row.classList.remove('drop-target'));
    const row = event.target.closest('li');
    if (row) row.classList.add('drop-target');
  });
  element('program').addEventListener('drop', event => {
    event.preventDefault();
    if (draggedIndex === null) return;
    const row = event.target.closest('li');
    const destination = row ? Number(row.dataset.index) : program.length - 1;
    const block = program.splice(draggedIndex, 1)[0];
    program.splice(destination, 0, block);
    draggedIndex = null;
    resetRun('Block snapped into its new position.');
    renderProgram();
  });
  element('program').addEventListener('dragend', () => {
    draggedIndex = null;
    document.querySelectorAll('.drop-target').forEach(row => row.classList.remove('drop-target'));
  });
  element('load-model').addEventListener('click', () => {
    program = challenges[challengeIndex].model.map(block => ({ ...block }));
    resetRun('Model loaded. Step through it to understand each instruction.');
    renderProgram();
  });
  element('clear-builder').addEventListener('click', () => {
    program = [];
    resetRun('Workspace cleared. Add a block from the toolbox.');
    renderProgram();
  });
  element('builder-run').addEventListener('click', () => {
    if (timer !== null) {
      pause();
      return;
    }
    if (machine && machine.done) resetRun();
    element('builder-run').textContent = 'Pause';
    element('builder-run').setAttribute('aria-pressed', 'true');
    timer = setTimeout(tick, 50);
  });
  element('builder-step').addEventListener('click', () => {
    pause();
    step();
  });
  element('builder-reset').addEventListener('click', () => resetRun());
  element('challenge').addEventListener('change', chooseChallenge);
  document.addEventListener('chapterchange', pause);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) pause();
  });
  chooseChallenge();
})(typeof window !== 'undefined' ? window : globalThis);
