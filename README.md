# How Algorithms Work

An interactive field guide for a curious adult beginner. Six short chapters move from a familiar recipe to real sorting and searching algorithms, efficiency, a working block builder, and a five-question self-check.

## Open it

Double-click **index.html** in a browser. Keep all the files together in the same folder. No installation, server, build step, internet connection, framework, CDN, or external font is needed. The site uses ordinary script tags and works on `file://`.

## Explore

- Use the chapter navigation or Next / Back. The top rule shows your position; the text tracks chapters explored during this visit.
- Step through finding the largest number, or run the four building-block diagrams.
- Compare bubble, insertion, and merge sort. Switch to linear or binary search, change the target (including a missing value), and use Play / Pause, Step, Reset, speed, data size, or new random data. Changing algorithms preserves the input.
- Compare measured comparison counts for identical inputs at each size. Exact counts are available in a table beneath the SVG chart.
- Build algorithms for finding a minimum, counting values above 10, and sorting. Add blocks from the toolbox; edit their dropdowns. Drag blocks to reorder, or use the up/down buttons. Indentation follows matching repeat / if / else / end blocks. A compare block remembers a yes/no result for the next if; repeat while evaluates its own condition each time. Output ends execution.
- Each challenge has a starter hint and a revealable, loadable model solution. Run animates your instructions; Step executes one block. Editing resets execution. Successful outputs are checked on the visible sample and six additional lists.
- Answer the quiz, read explanations, and change an answer to try again.

Builder positions start at **0**, as its test bench states. Search results use ordinary positions starting at **1**. A pointer equal to the list length is past the last item, so no item is highlighted. The supplied builder challenges use nonempty lists. Programs are kept in memory and reset on reload.

## Read the code

| File | Purpose |
| --- | --- |
| `index.html` | Semantic page structure, six chapters, and local script loading |
| `styles.css` | Paper/ink/vermilion design, responsive layout, focus and reduced-motion rules |
| `algorithms.js` | Pure sorting/searching trace generators, usable in the browser and Node |
| `intro.js` | Largest-number demonstration and animated SVG building blocks |
| `visualizer.js` | Trace playback, counters, pseudocode, and measured efficiency chart |
| `builder.js` | Challenge definitions, block compiler/interpreter, and editing interface |
| `app.js` | Chapter navigation, progress, quiz, and everyday examples |
| `tests/algorithms.test.js` | Dependency-free correctness and interpreter checks |

The trace generators store copies of the list after each operation. Counters count value comparisons, exchanges, and writes to the main list; they exclude loop-condition checks and temporary-buffer copying. Insertion keeps a key in memory while shifting; merge keeps two buffers. Temporary duplicate values in the main list during these operations are expected. Buffer-front comparisons are highlighted in the memory display rather than at misleading positions in the overwritten list.

Binary search expects sorted input and can return any matching position when duplicates exist. Linear search returns the first match. Both use `-1` internally for a missing value. Big-O explanations describe worst-case growth; the chart measures actual comparisons on particular inputs, on a linear input-size axis.

The builder interprets a fixed vocabulary; it does not evaluate user text as JavaScript. It validates nesting, checks initialization and bounds, detects identical repeated states, and imposes a 20,000-step ceiling. Testing multiple examples builds confidence, but does not prove correctness for all possible inputs.

## Verify

With Node installed:

```sh
node tests/algorithms.test.js
for file in *.js tests/*.js; do node --check "$file" || exit 1; done
```

The tests cover 381 sorting executions, 2,392 searches, 369 builder model executions, immutable inputs/snapshots, counters, duplicate and negative values, empty lists for sort/search, if/else branches, malformed nesting, bounds errors, and nonterminating loops. Random tests use a fixed seed.

All JavaScript syntax checks and logic tests pass. A browser smoke test was attempted in the development environment, but the sandbox blocked Chrome startup. Visual rendering, keyboard interaction, and phone layouts still need a real-browser pass. The interface includes native buttons/selects, labeled controls, live status text, a skip link, keyboard block controls, responsive rules, and reduced-motion support.

Next refinements: let learners supply their own builder input lists, and add a visible recursion tree for merge sort.
