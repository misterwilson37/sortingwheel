# Sorting Wheel — tests

Not deployed. Nothing in here needs to be uploaded to GitHub Pages for the app
to work; it's for checking changes before you upload them.

## Running them

You need Node (v18 or newer) once:

```bash
cd tests
npm install          # installs jsdom, the only dependency
./run_tests.sh
```

Expected output:

```
  test_v16.js  pass (4 checks, 22 lines)
  ...
ALL SUITES GREEN
```

Run a single suite for detail:

```bash
node test_confirm.js
```

Paths are relative to this folder, so the whole repo can live anywhere.

## What each suite covers

| Suite | Covers |
|---|---|
| `test_v16.js` | Config parser, Even Target mode, backwards compatibility with an older sheet |
| `test_extra.js` | Target convergence, mid-event mode switching, non-4 house counts |
| `test_counts.js` | Unreadable `Counts` values (`#REF!`, `#N/A`, blanks) blocking a sort |
| `test_retry.js` | Transient `IMPORTRANGE` `Loading...` recovering instead of stalling |
| `test_anim.js` | All eight animations invoked and awaited via `animations.js` |
| `test_fac2.js` | Faculty page structural parity with `index.html` |
| `test_summary.js` | Celebration triggers, group membership |
| `test_glyph.js` | Glyph shapes, holding the queue |
| `test_hold.js` | Holding and resuming across a full run |
| `test_pending.js` | The live sequence that once lost a person mid-ceremony |
| `test_xglyph.js` | The cross state and its guards |
| `test_confirm.js` | Confirm-driven endings, groups without a queue, layout scaling |
| `test_noshow.js` | The 28 July live failure: a no-show leaving a forced set entry at the front of the queue |
| `test_ticks.js` | Ticked-but-not-added guard. Clicks real toggles and real buttons; asserts no warning text names a house |

## Writing a new suite

Three requirements, each of which has burned us:

1. **Load `animations.js` into the VM context before the page's inline script.**
   `index.html` and `faculty.html` both call `createSortingWheelAnimations` at the
   top and throw without it. Four suites silently died for several versions
   because of this.
2. **Pass `pretendToBeVisual: true` to jsdom**, or four of the animations fail on
   a missing `requestAnimationFrame`.
3. **Print at least one line containing `PASS`.** `run_tests.sh` treats a suite
   with no assertions as a failure, because an earlier runner only grepped for
   `***` and so reported crashed suites as green.
4. **Press buttons, don't call functions.** Every suite before `test_ticks.js`
   called `addPool()` / `addFree()` directly, so none of them could ever catch an
   operator who never called them. The 28 July failure lived in that gap. Inline
   `onclick=""` attributes are not compiled under `runScripts:'outside-only'`, so
   press a markup button by running its attribute in the page context:

   ```js
   const press=(fn)=>vm.runInContext(btn(fn).getAttribute('onclick'), ctx);
   ```

   Toggles are different — they get `el.onclick = fn` assigned in JS, so
   `el.onclick()` works directly.

`const` declarations at the top level of a classic script don't become `window`
properties, so suites append an export shim:

```js
vm.runInContext(inlineScript + '\n;globalThis.state = state;', ctx);
```

## What these tests cannot tell you

**Anything visual.** jsdom builds the DOM and runs the JavaScript but has no
layout engine and draws no pixels. It will confirm an element exists, a function
resolved, and the right house came out. It will not confirm that anything looks
right.

Two bugs got through green suites and were caught by eye:

- the roller rendering as a full-screen chevron (valid DOM, working JS, broken
  layout)
- a person being lost mid-ceremony when the queue was resumed over an
  unconfirmed result

So after touching animations or the ceremony flow, open it in a browser and
watch a run. That is not belt-and-braces; it is the only coverage for a whole
category of failure.
