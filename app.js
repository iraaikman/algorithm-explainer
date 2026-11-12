/* Journey navigation and the self-check. Everything stays on this local page. */
(function () {
  'use strict';
  const titles = ['The idea', 'Building blocks', 'Watch them work', 'How good is it?', 'Make your own', 'Take it with you'];
  let chapter = 0;
  const visited = new Set([0]);
  const navigation = document.getElementById('chapters');
  navigation.innerHTML = titles.map((title, index) => `<button data-chapter="${index}" aria-label="Chapter ${index + 1}: ${title}"><span class="num">0${index + 1}</span><span class="nav-title">${title}</span></button>`).join('');

  function showChapter(index, focus = true) {
    chapter = index;
    visited.add(index);
    document.querySelectorAll('.chapter').forEach((section, position) => {
      section.hidden = position !== chapter;
    });
    navigation.querySelectorAll('button').forEach((button, position) => {
      if (position === chapter) button.setAttribute('aria-current', 'step');
      else button.removeAttribute('aria-current');
    });
    document.getElementById('chapter-number').textContent = `CHAPTER 0${chapter + 1} / 06`;
    document.getElementById('progress-text').textContent = `${visited.size} OF 6 EXPLORED`;
    document.getElementById('progress-bar').style.width = `${(chapter + 1) / 6 * 100}%`;
    document.querySelector('.progress').setAttribute('aria-valuenow', String(chapter + 1));
    document.querySelector('.progress').setAttribute('aria-valuetext', `Chapter ${chapter + 1} of 6: ${titles[chapter]}`);
    document.getElementById('back').disabled = chapter === 0;
    document.getElementById('next').textContent = chapter === 5 ? 'Return to the beginning ↺' : `${titles[chapter + 1]} →`;
    document.getElementById('footer-note').textContent = `${String(chapter + 1).padStart(2, '0')} — ${titles[chapter]}`;
    document.dispatchEvent(new Event('chapterchange'));
    if (focus) {
      document.getElementById('main').focus({ preventScroll: true });
      window.scrollTo({ top: 0, behavior: 'instant' });
    }
  }
  navigation.addEventListener('click', event => {
    const button = event.target.closest('[data-chapter]');
    if (button) showChapter(Number(button.dataset.chapter));
  });
  document.getElementById('back').addEventListener('click', () => showChapter(Math.max(0, chapter - 1)));
  document.getElementById('next').addEventListener('click', () => showChapter((chapter + 1) % 6));
  showChapter(0, false);

  const questions = [
    {
      prompt: 'Which instruction belongs in an algorithm?',
      options: ['Keep looking until it feels right.', 'Read each number once, then output the largest.', 'Repeat forever.'],
      correct: 1,
      explanation: 'An algorithm has clear steps and finishes. “Feels right” is ambiguous, and repeating forever never produces a final answer.'
    },
    {
      prompt: 'Why does the largest-number example need memory?',
      options: ['To remember the largest value seen so far.', 'To make the numbers bigger.', 'To avoid looking at the input.'],
      correct: 0,
      explanation: 'Memory preserves a useful fact from earlier steps. Without it, each new number would make us forget the best candidate.'
    },
    {
      prompt: 'What must be true before you use binary search?',
      options: ['The list has no duplicate values.', 'Every value is positive.', 'The list is sorted.'],
      correct: 2,
      explanation: 'Only a sorted list lets us safely rule out half the values. Duplicates and negative values are both fine.'
    },
    {
      prompt: 'For an O(n^2) algorithm, doubling a large input can mean…',
      options: ['Exactly two more steps.', 'Roughly four times the work.', 'The same amount of work.'],
      correct: 1,
      explanation: 'Repeated passes multiply the effort: roughly twice as many items and twice as many passes. Big-O describes growth, not an exact step count.'
    },
    {
      prompt: 'Your algorithm works on one example. What next?',
      options: ['Assume it works for all inputs.', 'Choose the shortest name for it.', 'Try edge cases and explain why it finishes correctly.'],
      correct: 2,
      explanation: 'Try duplicates, boundary values, one item, and different orders. Tests find mistakes; reasoning about the steps explains why an algorithm works in general.'
    }
  ];
  const answers = new Map();
  document.getElementById('quiz').innerHTML = questions.map((question, index) => `
    <div class="quiz-question"><fieldset><legend>${index + 1}. ${question.prompt}</legend>
    <div class="quiz-options">${question.options.map((option, choice) => `<button data-question="${index}" data-choice="${choice}" aria-pressed="false">${option}</button>`).join('')}</div>
    <p id="feedback-${index}" class="quiz-feedback" role="status"></p></fieldset></div>`).join('');
  document.getElementById('quiz').addEventListener('click', event => {
    const button = event.target.closest('[data-question]');
    if (!button) return;
    const index = Number(button.dataset.question);
    const choice = Number(button.dataset.choice);
    const question = questions[index];
    answers.set(index, choice);
    document.querySelectorAll(`[data-question="${index}"]`).forEach(option => {
      option.setAttribute('aria-pressed', String(Number(option.dataset.choice) === choice));
    });
    document.getElementById(`feedback-${index}`).textContent = `${choice === question.correct ? 'That’s right.' : 'Not quite. Try another answer.'} ${question.explanation}`;
    const correct = Array.from(answers).filter(([questionIndex, answer]) => questions[questionIndex].correct === answer).length;
    document.getElementById('quiz-score').textContent = `${answers.size} of 5 answered · ${correct} correct${correct === 5 ? '. You have the foundations. Revisit any experiment to keep exploring.' : '.'}`;
  });

  document.getElementById('life-examples').innerHTML = [
    ['Maps & routing', 'Treat junctions as choices and roads as connections. Find a route with a low total travel time, updating estimates as traffic changes.'],
    ['Search', 'Look up indexed words, then rank possible matches. The search algorithm helps decide which results you see first.'],
    ['Recommendations', 'Use patterns in past activity to rank what you might like next. A prediction is an estimate, not a fact about you.'],
    ['Photo filters', 'Visit the pixels in an image and change their color values according to clear rules, such as increasing contrast.'],
    ['Spam filters', 'Combine signals from a message to estimate whether it is unwanted. A decision threshold separates the inbox from spam; mistakes can happen.']
  ].map(([title, description]) => `<article><h3>${title}</h3><p>${description}</p></article>`).join('');
})();
