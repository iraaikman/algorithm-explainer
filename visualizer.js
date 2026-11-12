/* A player for immutable algorithm frames. Changing algorithms preserves the
   input, so a learner can compare approaches on exactly the same numbers. */
(function () {
  'use strict';
  const element = id => document.getElementById(id);
  let mode = 'sort';
  let data = [];
  let frames = [];
  let position = 0;
  let timer = null;
  const descriptions = {
    bubble: 'Bubble sort compares neighbors and swaps them. Each pass carries a large value to the end.',
    insertion: 'Insertion sort builds a sorted beginning, shifting values to make room for each remembered key.',
    merge: 'Merge sort splits, sorts the halves, then combines them. Buffer fronts are compared in temporary memory, shown below the bars.',
    linear: 'Linear search checks one value at a time. This example uses sorted data for a fair comparison; linear search also works on unsorted data.',
    binary: 'Binary search requires sorted data. Every unsuccessful comparison removes about half the remaining possibilities. Faded bars have been ruled out.'
  };

  function pause() {
    clearTimeout(timer);
    timer = null;
    element('play').textContent = 'Play';
    element('play').setAttribute('aria-pressed', 'false');
  }

  function draw() {
    const frame = frames[position];
    const maximum = Math.max(...data, 1);
    element('bars').classList.toggle('dense', data.length > 18);
    const barContainer = element('bars');
    // Keep the same nodes between frames so height changes can transition.
    if (barContainer.children.length !== frame.a.length) {
      barContainer.innerHTML = frame.a.map(() => '<div class="bar"><span></span></div>').join('');
    }
    frame.a.forEach((value, index) => {
      const state = frame.done && (mode === 'sort' || index === frame.result) ? 'done'
        : frame.move.includes(index) ? 'move'
          : frame.active.includes(index) ? 'compare' : '';
      const excluded = frame.range && (index < frame.range[0] || index > frame.range[1]);
      const bar = barContainer.children[index];
      bar.className = `bar ${state}`;
      bar.style.height = `${12 + value / maximum * 175}px`;
      bar.style.opacity = excluded ? '.22' : '1';
      bar.firstElementChild.textContent = value;
    });
    element('bars').setAttribute('aria-label', `Values: ${frame.a.join(', ')}. ${frame.message}`);
    ['comparisons', 'swaps', 'writes'].forEach(name => {
      element(name).textContent = frame[name];
    });
    element('viz-status').textContent = frame.message;
    if (frame.buffers) {
      // Merging compares the copied buffer fronts, not overwritten array slots.
      element('viz-memory').innerHTML = Object.entries(frame.buffers).map(([side, values]) => {
        const items = values.map((value, index) => `<span class="buffer-value ${frame.line === 2 && index === 0 ? 'compared' : ''}">${value}</span>`).join(' ');
        return `<div>${side === 'left' ? 'Left' : 'Right'} buffer: ${items || 'empty'}</div>`;
      }).join('');
    } else {
      element('viz-memory').textContent = frame.memory || 'Temporary memory: —';
    }
    element('frame-count').textContent = `STEP ${position} / ${frames.length - 1}`;
    document.querySelectorAll('#viz-code li').forEach((line, index) => {
      line.classList.toggle('active', index === frame.line);
    });
    element('viz-step').disabled = position === frames.length - 1;
  }

  function reset() {
    pause();
    const algorithm = element('algorithm').value;
    const targetInput = element('target');
    if (targetInput.value === '' || !Number.isFinite(Number(targetInput.value))) {
      targetInput.value = data[0];
    }
    frames = mode === 'sort'
      ? Algorithms.sort(algorithm, data)
      : Algorithms.search(algorithm, data, Number(targetInput.value));
    position = 0;
    element('viz-code').innerHTML = Algorithms.code[algorithm].map(line => `<li>${line}</li>`).join('');
    element('algorithm-description').textContent = descriptions[algorithm];
    draw();
  }

  function randomize() {
    data = Array.from({ length: Number(element('data-size').value) }, () => 5 + Math.floor(Math.random() * 90));
    if (mode === 'search') {
      data.sort((left, right) => left - right);
      element('target').value = data[Math.floor(data.length * .7)];
    }
    reset();
  }

  function configure() {
    pause();
    const options = mode === 'sort'
      ? [['bubble', 'Bubble sort'], ['insertion', 'Insertion sort'], ['merge', 'Merge sort']]
      : [['linear', 'Linear search'], ['binary', 'Binary search']];
    element('algorithm').innerHTML = options.map(([value, label]) => `<option value="${value}">${label}</option>`).join('');
    element('target-label').hidden = mode !== 'search';
    element('sort-tab').setAttribute('aria-pressed', String(mode === 'sort'));
    element('search-tab').setAttribute('aria-pressed', String(mode === 'search'));
    if (mode === 'search') {
      data.sort((left, right) => left - right);
      element('target').value = data[Math.floor(data.length * .7)];
    }
    if (data.length === 0) randomize();
    else reset();
  }

  function step() {
    if (position < frames.length - 1) {
      position++;
      draw();
    }
    if (position === frames.length - 1) pause();
  }

  function tick() {
    step();
    if (position < frames.length - 1) {
      timer = setTimeout(tick, 1150 - Number(element('speed').value) * 100);
    }
  }

  element('play').addEventListener('click', () => {
    if (timer !== null) {
      pause();
      return;
    }
    if (position === frames.length - 1) {
      position = 0;
      draw();
    }
    element('play').textContent = 'Pause';
    element('play').setAttribute('aria-pressed', 'true');
    timer = setTimeout(tick, 100);
  });
  element('viz-step').addEventListener('click', () => {
    pause();
    step();
  });
  element('viz-reset').addEventListener('click', reset);
  element('random').addEventListener('click', randomize);
  element('algorithm').addEventListener('change', reset);
  element('target').addEventListener('input', reset);
  element('speed').addEventListener('input', () => {
    element('speed-value').textContent = element('speed').value;
  });
  element('data-size').addEventListener('input', () => {
    element('size-value').textContent = element('data-size').value;
    randomize();
  });
  element('sort-tab').addEventListener('click', () => {
    mode = 'sort';
    configure();
  });
  element('search-tab').addEventListener('click', () => {
    mode = 'search';
    configure();
  });
  document.addEventListener('chapterchange', pause);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) pause();
  });
  configure();

  // Measure real executions on shared input, rather than plotting ideal curves.
  function drawChart() {
    const sizes = [4, 8, 16, 32, 64];
    const series = { bubble: [], insertion: [], merge: [] };
    const styles = {
      bubble: { name: 'Bubble', color: '#a3422c', dash: '' },
      insertion: { name: 'Insertion', color: '#282923', dash: '7 4' },
      merge: { name: 'Merge', color: '#737468', dash: '2 4' }
    };
    sizes.forEach(size => {
      const input = Array.from({ length: size }, () => Math.floor(Math.random() * 200));
      Object.keys(series).forEach(kind => {
        series[kind].push(Algorithms.sort(kind, input).at(-1).comparisons);
      });
    });
    const maximum = Math.ceil(Math.max(...Object.values(series).flat()) / 100) * 100 || 100;
    const x = size => 60 + (size - 4) / 60 * 540;
    const y = count => 270 - count / maximum * 225;
    let svg = '<text x="60" y="18">Value comparisons</text>';
    for (let tick = 0; tick <= 4; tick++) {
      const count = maximum * tick / 4;
      svg += `<line x1="60" y1="${y(count)}" x2="600" y2="${y(count)}" stroke="#d8d7cd" stroke-width=".7"/><text x="48" y="${y(count) + 4}" text-anchor="end">${Math.round(count)}</text>`;
    }
    sizes.forEach(size => {
      svg += `<text x="${x(size)}" y="291" text-anchor="middle">${size}</text>`;
    });
    svg += '<text x="330" y="321" text-anchor="middle">Input size / number of values</text>';
    Object.entries(series).forEach(([kind, counts]) => {
      const style = styles[kind];
      const points = counts.map((count, index) => `${x(sizes[index])},${y(count)}`).join(' ');
      svg += `<polyline points="${points}" fill="none" stroke="${style.color}" stroke-width="2" stroke-dasharray="${style.dash}"/>`;
      counts.forEach((count, index) => {
        svg += `<circle cx="${x(sizes[index])}" cy="${y(count)}" r="3" fill="${style.color}"><title>${style.name}: ${count} comparisons for ${sizes[index]} values</title></circle>`;
      });
      svg += `<text x="615" y="${y(counts.at(-1)) + 4}" style="fill:${style.color}">${style.name}</text>`;
    });
    element('efficiency-chart').innerHTML = svg;
    element('chart-values').innerHTML = `<table class="chart-table"><caption>Exact comparison counts for this experiment</caption><thead><tr><th scope="col">Input size →</th>${sizes.map(size => `<th scope="col">${size}</th>`).join('')}</tr></thead><tbody>${Object.entries(series).map(([kind, counts]) => `<tr><th scope="row">${styles[kind].name}</th>${counts.map(count => `<td>${count}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
  }
  element('chart-refresh').addEventListener('click', drawChart);
  drawChart();

  element('growth-cards').innerHTML = [
    ['O(log n)', 'Halve the possibilities', 'Binary search needs at most roughly one extra comparison when the sorted list doubles.'],
    ['O(n)', 'One visit per item', 'Linear search may inspect every item. Twice the items can mean twice the work.'],
    ['O(n log n)', 'Divide, then combine', 'Merge sort does a little more than twice the work when the list doubles: more items, plus one more level of splitting.'],
    ['O(n^2)', 'Repeated passes', 'Bubble and insertion sort can need roughly four times the work when the list doubles. Already sorted input takes much less work.']
  ].map(([notation, title, description]) => `<article class="block-card"><span class="growth-mark">${notation}</span><h2>${title}</h2><p>${description}</p></article>`).join('');
})();
