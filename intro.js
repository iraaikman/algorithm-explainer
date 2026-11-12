/* Two separate steps make reading an input and updating memory visible. */
(function () {
  'use strict';
  const values = [12, 7, 24, 18, 9];
  let phase = 0;
  let largest = null;
  let pointer = -1;
  const numberList = document.getElementById('largest-numbers');
  const stepButton = document.getElementById('largest-step');
  const status = document.getElementById('largest-status');

  function draw() {
    if (!numberList.children.length) {
      numberList.innerHTML = values.map(value => `<span class="number">${value}</span>`).join('');
    }
    Array.from(numberList.children).forEach((number, index) => {
      number.classList.toggle('active', index === pointer);
      number.setAttribute('aria-label', `${index === pointer ? 'Current number: ' : 'Number: '}${values[index]}`);
    });
    document.getElementById('largest-value').textContent = largest === null ? '—' : largest;
    const line = phase === 0 ? 0 : phase > 10 ? 3 : phase % 2 ? 1 : 2;
    document.querySelectorAll('#largest-steps li').forEach((element, index) => {
      element.classList.toggle('active', index === line);
    });
    stepButton.disabled = phase > 10;
  }

  stepButton.addEventListener('click', () => {
    phase++;
    if (phase > 10) {
      pointer = -1;
      status.textContent = 'Finished. The output is 24.';
    } else if (phase % 2) {
      pointer++;
      status.textContent = `Read ${values[pointer]}. Is it bigger than what we remember?`;
    } else {
      const changed = largest === null || values[pointer] > largest;
      if (changed) largest = values[pointer];
      status.textContent = changed
        ? `Remember ${largest} as the largest so far.`
        : `Keep ${largest}; ${values[pointer]} is smaller.`;
    }
    draw();
  });

  document.getElementById('largest-reset').addEventListener('click', () => {
    phase = 0;
    largest = null;
    pointer = -1;
    status.textContent = 'Take the first step.';
    draw();
  });
  draw();

  // The diagrams are inline SVG, with a single active node per execution step.
  const demos = [
    {
      name: 'Sequence', description: 'Do things in order. Changing the order can change the result.',
      diagram: '<path d="M90 45h23m90 0h23"/><rect class="node" x="0" y="25" width="90" height="40" rx="2"/><text x="45" y="50">Boil water</text><rect class="node" x="113" y="25" width="90" height="40" rx="2"/><text x="158" y="50">Add tea</text><rect class="node" x="226" y="25" width="90" height="40" rx="2"/><text x="271" y="50">Steep</text>',
      path: [0, 1, 2], messages: ['Boil the water first.', 'Add the tea next.', 'Allow time to steep.'],
      finished: 'The sequence ends. Your tea is ready.'
    },
    {
      name: 'Decision', description: 'Ask a clear yes-or-no question. The answer chooses the next path.',
      diagram: '<path d="M158 38v18H63v16m95-16h95v16"/><rect class="node" x="104" y="1" width="108" height="37" rx="2"/><text x="158" y="24">Is it raining?</text><rect class="node" x="0" y="72" width="126" height="32" rx="2"/><text x="63" y="92">Yes: umbrella</text><rect class="node" x="190" y="72" width="126" height="32" rx="2"/><text x="253" y="92">No: no umbrella</text>',
      path: [0, 1], messages: ['Suppose it is raining. The answer is yes.', 'Follow only the yes branch.'],
      finished: 'A decision chooses one path. Try again for the other answer.'
    },
    {
      name: 'Repetition', description: 'Repeat while a condition is true. Change something so the loop can finish.',
      diagram: '<path d="M90 40h23m90 0h23m45 20v32H45V60"/><rect class="node" x="0" y="20" width="90" height="40" rx="2"/><text x="45" y="45">Cups &lt; 3?</text><rect class="node" x="113" y="20" width="90" height="40" rx="2"/><text x="158" y="45">Pour a cup</text><rect class="node" x="226" y="20" width="90" height="40" rx="2"/><text x="271" y="45">Count + 1</text><text x="158" y="108">Return to the question</text>',
      path: [0, 1, 2, 0, 1, 2, 0, 1, 2, 0],
      messages: ['0 < 3: yes.', 'Pour cup 1.', 'Remember cups = 1.', '1 < 3: yes.', 'Pour cup 2.', 'Remember cups = 2.', '2 < 3: yes.', 'Pour cup 3.', 'Remember cups = 3.', '3 < 3: no. Stop repeating.'],
      finished: 'Three cups poured. The condition is now false.'
    },
    {
      name: 'Memory', description: 'Give a value a name so you can remember it, use it, and change it later.',
      diagram: '<path d="M90 45h23m90 0h23"/><rect class="node" x="0" y="25" width="90" height="40" rx="2"/><text x="45" y="50">count = 0</text><rect class="node" x="113" y="25" width="90" height="40" rx="2"/><text x="158" y="50">count = 1</text><rect class="node" x="226" y="25" width="90" height="40" rx="2"/><text x="271" y="50">count = 2</text>',
      path: [0, 1, 2], messages: ['Create count and remember 0.', 'Replace the stored value with 1.', 'Replace the stored value with 2.'],
      finished: 'The memory named count now holds 2, replacing its old value.'
    }
  ];
  document.getElementById('blocks').innerHTML = demos.map((demo, index) => `
    <article class="block-card">
      <p class="eyebrow">0${index + 1} / ${demo.name.toUpperCase()}</p>
      <h2>${demo.name}</h2><p>${demo.description}</p>
      <svg class="diagram" id="diagram-${index}" viewBox="0 0 316 116" role="img" aria-label="${demo.name} diagram">${demo.diagram}</svg>
      <button data-demo="${index}">Run ${demo.name.toLowerCase()} →</button>
      <p class="demo-status" id="demo-status-${index}" aria-live="polite">Press to follow the steps.</p>
    </article>`).join('');

  let timers = [];
  let rain = true;
  document.querySelectorAll('[data-demo]').forEach(button => {
    button.addEventListener('click', () => {
      const index = Number(button.dataset.demo);
      const demo = demos[index];
      const nodes = Array.from(document.querySelectorAll(`#diagram-${index} .node`));
      let path = demo.path;
      if (index === 1) {
        path = [0, rain ? 1 : 2];
        demo.messages = rain
          ? ['It is raining. The answer is yes.', 'Take the umbrella.']
          : ['It is dry. The answer is no.', 'Leave the umbrella at home.'];
        rain = !rain;
      }
      let step = 0;
      button.disabled = true;
      function tick() {
        nodes.forEach(node => node.classList.remove('lit'));
        if (step >= path.length) {
          button.disabled = false;
          document.getElementById(`demo-status-${index}`).textContent = demo.finished;
          return;
        }
        nodes[path[step]].classList.add('lit');
        document.getElementById(`demo-status-${index}`).textContent = demo.messages[step];
        step++;
        timers.push(setTimeout(tick, 650));
      }
      tick();
    });
  });
  document.addEventListener('chapterchange', () => {
    timers.forEach(clearTimeout);
    timers = [];
    document.querySelectorAll('[data-demo]').forEach(button => {
      button.disabled = false;
    });
    document.querySelectorAll('.diagram .lit').forEach(node => node.classList.remove('lit'));
  });
})();
