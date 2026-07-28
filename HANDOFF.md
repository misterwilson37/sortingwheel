# HANDOFF — Sorting Wheel

Technical notes for whoever picks this up next, human or Claude.
Operational instructions live in `README.md`; this file is the code map.

**Handoff version:** 1.14.0
**App version at handoff:** `index.html` 1.9.1, `faculty.html` 2.6.1, `animations.js` 1.3.0, `sorting-wheel.css` 1.3.1, `ellis.html` 1.2.0
**Session:** Round 3 of documented work. Claude instance name: **Vernier**
— the scale that lets you read the fine gradations between the marks, which was
the assignment. Predecessors: Trilby (this project), Fable and Stedman (other
Jake projects). Do not reuse.

**Context at handoff:** built in an earlier undocumented session, tested by four
students, then audited and hardened across rounds 1-2 (Trilby). Round 3 was an
independent re-audit: Jake reported that the previous session had started making
mistakes and asked for the mathematics in particular to be checked with a
fine-toothed comb. Verification was static analysis, jsdom, and simulation of
the *shipped* functions. Still no browser, still no access to the live sheet.

**Round 3 verdict:** the sorting mathematics is correct and was not touched. One
live deployment defect was found and fixed (a duplicated stylesheet — see
"The duplicated stylesheet" below), two latent bugs were fixed in
`animations.js`, and several claims in this file were found stale or
self-contradictory and have been corrected.

---

## DESIGN INVARIANT — read before changing sorting logic

**This app exists to balance houses across the entire school, not within a
grade level.**

It replaced a physical wheel that left Callidus significantly smaller than the
other three houses. The incoming 6th grade class is *deliberately* skewed —
heavily toward Callidus — so that school-wide totals come out even. A 6th grade
that is 60 Callidus / 30 each of the others is the app working correctly.

Two things follow, and an earlier draft of this handoff got both wrong:

- **Do not add cohort-scoped or per-grade counts.** It sounds like an
  improvement. It defeats the entire purpose. An earlier version of this file
  listed it as the highest-value enhancement; that was a misread of intent,
  corrected here so nobody builds it.
- **The counts must reflect the whole enrolled student body**, not just students
  this app has sorted. See "Baseline counts" below. If the app starts from zero
  it has no deficit to correct and produces exactly the outcome it was built to
  prevent.

If a future request seems to ask for even splits *within* 6th grade, confirm
with Jake before writing code. It probably means something else.

### Real numbers as of July 2026

8th grade already removed from the source sheet. Current 6th + 7th = students
still enrolled next year, which is the baseline:

| House | baseline | needs (target 141) |
|---|---|---|
| Accomodore | 99 | 42 |
| Callidus | 85 | 56 |
| Princeps | 97 | 44 |
| Vevaios | 102 | 39 |
| **total** | **383** | **181 incoming** |

Note **Vevaios is now the largest house, not Callidus's rival for smallest.**
The old physical wheel dumped 79 of last year's 216 sixth graders into Vevaios.
Callidus is behind by only 17, so the correction needed this year is mild — about
31% Callidus, not the ~90% seen in the spring load-test. If someone reports
"Callidus isn't getting enough students," check the numbers before assuming a
bug.

### SECOND INVARIANT — the Roster tab is a hybrid, by design

**Do not "clean up" the `Roster` tab. Do not propose moving the `IMPORTRANGE`
out of it. This was considered and rejected for good reasons.**

The Sorting Wheel spreadsheet is a *worksheet*. House assignments are owned by
other staff in a separate master list, and that list changes all year as students
move in and out of the area. The Sorting Wheel cannot be the system of record and
never will be, so it links to the master list instead of copying it.

Layout:

| Rows | Content |
|---|---|
| 1 | header |
| 2 – ~600 | `IMPORTRANGE` mirror of the master list (anchored near `G1`), reshaped into Roster columns by formulas like `=I2&" "&H2` |
| below | static rows appended by the app |

`COUNTIF(Roster!C:C, …)` sees both, so counts are live and correct with **no
baseline column and no hand-typed numbers.** An earlier draft of this file
recommended a hand-typed baseline in `Counts!C`. That was wrong — it came from
not knowing the mirror existed. Ignore any such advice.

**Verified empirically by Jake, not by me:** with the mirror filled to row 400, a
test sort appended at row 401 and the Accomodore count incremented correctly.
Google's `values.append` lands after the last row containing data, and column D
of the mirror is filled with `Original Wheel` all the way down, which is what
marks that boundary. **Shortening the mirror block or clearing column D would let
appends land inside the formula rows.** That is the fragile edge — not the mirror
itself.

Annual cleanup: delete the app-appended static rows (identifiable by a timestamp
in column E; mirrored rows have none) once those students appear in the master
list, or they get double-counted.

### Population vs target — do not confuse these

They get conflated because both are "numbers about houses." They are different
kinds of thing and never combine.

| | Meaning | Storage | Written by |
|---|---|---|---|
| Population | students in each house now | `Counts!B2:B5` | sheet formula |
| Target | per-house goal (141) | `Config` key `target_per_house` | app, on admin input |

`calculateTargetProbabilities()` reads population from `state.counts` and
compares it against `state.targetPerHouse`. The target is a finish line, not a
quantity to distribute — never add it to a count.

**A wrong population breaks BOTH modes**, not just target mode. Slider mode reads
the same `Counts!B`; if it under-reports, the slider concludes every house is
already even and stops correcting. If someone reports "balancing isn't doing
anything," check `Counts!B` against real enrolment before touching the algorithm.

### Baseline counts

Pre-app students (sorted by the physical wheel) are represented as four numbers
in **`Counts!C2:C5`**, with `Counts!B` summing the `COUNTIF` and the baseline:

```
Counts!B2  =COUNTIF(Roster!C:C, A2) + C2
```

This works with zero code change because `loadCounts()` reads `Counts!A2:B{n}`
and the app **never writes to the Counts tab** after initial creation
(`handleCreateNew`, which won't run again on an existing sheet). Verified.

Consequence: `Roster` row count is *not* the school population. It is only the
students this app sorted. Anything that needs true totals must read `Counts!B`.

---

## THIRD INVARIANT — faculty rigging stays out of the student app

`faculty.html` produces **predetermined** house assignments for new staff. That
capability must never be merged into `index.html`, and no "set specific outcomes"
mode may be added to the student app.

The reason is a single forgotten toggle. Any rigging setting reachable from the
student ceremony — especially one stored in `Config`, which is shared across every
station — would be one oversight away from silently rigging real student sorting,
with no visible symptom. A separate page cannot make that mistake.

Faculty are also deliberately absent from the house counts. `faculty.html` never
reads `Counts` and never writes to `Roster`. It signs in read-only, purely to
fetch house names/colours/logos from `Config`.

If someone asks to "just add a manual override to the main app", the answer is
`faculty.html`.

---

## Shared stylesheet — sorting-wheel.css

index.html's entire `<style>` block was extracted verbatim in v1.8.0 and both
pages now `<link>` it. **One stylesheet is the requirement, not a convenience:**
the faculty ceremony has to be visually indistinguishable from the student one,
and two copies would drift on the first change.

`animations.css` (a partial extraction from v1.7.0) was deleted and folded in.

Verified after extraction: every class used in either page's markup, and every
class added dynamically from either page's JS, resolves in the stylesheet.

Two classes in index.html have no CSS rule — `role-sorter` and
`logo-manager-item`. Both pre-date this work; `role-sorter` is harmless because
gating is done with `.admin-only` / `body.role-admin`. Left alone.

**State class names differ per component** and are easy to get wrong when writing
a new page against this stylesheet:

| Component | Active class |
|---|---|
| `.loading-overlay` | `.active` |
| `.error-banner` | `.visible` |
| `.toast` | `.show` |
| `.screen` | `.active` |
| `.roller-frame`, `.animation-stage` | `.visible` |

`.error-banner` also expects an inner `#errorText` span and a close button —
setting `textContent` on the banner itself destroys its structure.

---

## Shared animation module

`animations.js` holds the eight ceremony animations, used by both pages.
Extracted in v1.7.0 so the faculty page didn't need a second copy of 704 lines
that would drift. Its CSS now lives in `sorting-wheel.css` — the separate
`animations.css` was folded in and deleted, and nothing should reference it.

No build step. `animations.js` is a classic script that installs a factory:

```js
window.createSortingWheelAnimations = function (deps) { ... }
```

Host pages wire it up once `$` exists:

```js
const _sw = createSortingWheelAnimations({ $, getHouses: () => state.houses });
const ANIMATION_META = _sw.ANIMATION_META;
const animations     = _sw.animations;
const spinRoller     = _sw.spinRoller;
```

**Dependencies are injected, never reached for globally.** The module must not
reference `state`, `firebase`, the spreadsheet, or page-specific DOM beyond:

- required from the host page: `animationStage`, `rollerFrame`, `rollerStrip`
- created by the animations themselves: `shieldRow`, `shuffleArena`, `bracketStage`

That constraint is the whole point — it's what stops the faculty page from being
able to break the student page.

Notes on the extraction:

- `state.houses` became `getHouses()` — 28 substitutions.
- `pulseElement` was a nested function inside `animateBracket`, so it travelled
  along automatically.
- `adjustColor` and `contrastText` stayed in `index.html` (used elsewhere there)
  and the module keeps its own private copies. ~11 lines duplicated on purpose so
  the module is self-contained and droppable into any page.
- `getEnabledAnimations`, `setEnabledAnimations`, `rebuildAnimPicker` stayed in
  `index.html` — they're admin UI, not animation logic.
- `ANIMATION_META` moved into the module because both pages need it.

The animation rules were extracted the same way and now live in
`sorting-wheel.css`. They depend on these custom properties, which the host page
must define: `--accent-gold`, `--bg-card`, `--bg-deep`, `--bg-secondary`,
`--text-muted`. One keyframe, `bracket-color-pulse`, is **not** in the stylesheet
— `animateBracket` injects it at runtime under `#bracketPulseStyle`. That is
deliberate and it is the only such case; don't "fix" it by half-moving it.

### Verification

`test_anim.js` loads `index.html` + `animations.js` in jsdom, stubs Firebase and
canvas, then **invokes all eight animations and awaits each Promise.** Also runs a
two-house config to confirm nothing assumes four. `test_faculty.js` does the same
against `faculty.html`'s DOM. (Neither file is currently in the repo — see "Test
suites" above.) Round 3 reproduced this check ad hoc across `index.html` and
`faculty.html` at 2, 4 and 5 houses; all eight resolve on both pages.

**Collapse the timers, don't wait them out.** The animations are several seconds
each, so a suite that runs them honestly takes minutes. Overriding
`window.setTimeout` to fire at zero delay preserves ordering — the animations are
sequential chains — and makes hundreds of runs practical. That is how the bracket
fix below was verified over 200 runs per house count. `requestAnimationFrame`
still needs `pretendToBeVisual: true`.

jsdom needs `pretendToBeVisual: true` or four of the animations fail on a missing
`requestAnimationFrame`. That's a harness requirement, not a bug.

**What jsdom cannot check:** actual visual rendering, canvas output, and CSS
transition timing. Spin each animation once in a real browser after touching this
module.

---

## Faculty page structure

`faculty.html` mirrors index.html's `#ceremonyScreen` **markup structure
element for element**: `colorWash`, `ceremony-header`, `ceremony-stage` with
`readyState` / `inputState` / `rollerFrame` / `animationStage` / `resultState`,
then the `anim-picker` and a bottom drawer. `showResult()` is a faithful copy
including the colour wash and the luminance correction on the house name.

**A hard-won lesson: copy the markup, don't reconstruct it.** The first version
of this page invented the roller frame structure from the CSS class names. The
result rendered as a full-screen light-blue chevron — the roller pointers with no
correctly-sized parent. Nothing in jsdom catches that, because the DOM is valid
and the animations all resolve; it's purely a layout failure. If you build a
third page, copy the ceremony markup verbatim from index.html and change only the
IDs you must.

Deliberate differences, all invisible during the ceremony:

- `studentName` / `studentNumber` become a single `personName` input.
- `approveBtn` says "Next" and calls `acceptSpin()` — no spreadsheet write.
- A `role-badge` reading `Faculty` sits in the header.
- The admin drawer is a single tab that opens the queue modal.
- `setCeremonyPhase` also hides the drawer outside the ready phase, so there is
  nothing to tap mid-ceremony.

## Test suites — and a warning about the runner

**Status as of 1.14.0: there is no `tests/` directory in the repository.** This
section and the "Testing" section near the bottom of this file used to
contradict each other outright — one described a suite in detail, the other said
"there is no test suite" — and the repo contained neither. Whether the suites
were never committed, were deleted, or live only on Jake's machine is unknown;
ask him before recreating them from scratch. Everything below is preserved
because the *lesson* is still worth having, and because it is the spec if you
rebuild them.

If they exist, suites live in `tests/` and are run with `tests/run_tests.sh`.

**The runner checks exit code, `***` markers, output length, and that at least
one assertion actually printed.** All four matter. An earlier runner only grepped
for `***`, which meant a suite that threw on import produced no output, no
markers, and was reported as passing.

That is not hypothetical: after the `animations.js` extraction, four suites
(`test_v16`, `test_extra`, `test_counts`, `test_retry`) died on every run for
several versions because they loaded `index.html`'s inline script without first
loading `animations.js` into the same VM context. They reported green throughout.
Target mode, count validation, and the IMPORTRANGE retry logic were unverified
that whole time.

If you add a suite: load `animations.js` into the context first, pass
`pretendToBeVisual: true` to jsdom, and make sure it prints at least one line
containing `PASS`.

## Groups, not runs (faculty 2.6.0)

**A group is everyone sorted since the last celebration.** Results carry
`groupId`; `showSummary` filters on it and then increments `state.groupId`. A
queue is only a scheduling overlay on top of a group — a group needs no queue at
all, which is what lets a stretch of plain walk-ups be celebrated together.

This replaced a `runId` scheme where a run began when a queue was built and
walk-ups before it were excluded. Two test assertions encoded that older rule and
were updated, not "fixed" — the behaviour change was deliberate.

## The glyph is a readout, not a button (faculty 2.6.0)

**`Confirm` always drives the ceremony forward. The glyph only reports where
forward goes.** Getting this backwards produced two rounds of confusing
behaviour, including a version where the queue could only be ended by tapping the
cross, which nobody would guess.

`endsOnNextConfirm()` is the single predicate:

```js
if (state.endOverride !== null) return state.endOverride;
if (!runActive()) return false;
if (state.queuePaused) return false;
return effectiveCursor() >= state.steps.length;
```

`effectiveCursor()` is `cursor + (pending queued spin ? 1 : 0)` — it counts the
spin currently on screen, which is why the cross appears **on** the last queued
person rather than after them. `acceptSpin` calls `endsOnNextConfirm()` **before**
mutating state, since it reads `state.pending`.

Glyph precedence: `endsOnNextConfirm()` &rarr; `-1` (cross); queue slot remaining
and not held &rarr; `effectiveCursor() + 1` (shape); otherwise `0` (infinity).

`state.endOverride` is a three-way: `null` decide automatically, `false` "not
yet", `true` "end on the next Confirm". Cleared by `closeRun()` and by resuming.

**`renderQueue()` must be called whenever `state.pending` changes** — on reveal
and on re-sort. Otherwise the glyph lags a step, which is exactly how the
readout stopped matching reality during testing.

## Queue position glyph (faculty 2.2.0)

`queueGlyphSVG(n)` draws an n-sided figure in the dead space right of the
"Faculty Controls" tab: `n = 0` infinity (two touching rings), `n = 1` filled
dot, `n = 2` vertical bar, `n >= 3` a regular n-gon, `n > 10` an n-gon plus a
centre dot since high-n polygons are indistinguishable from circles.

`n = -1` renders a cross, meaning the run is spent and waiting to be closed out.

Precedence in `updateQueueGlyph`: no run &rarr; 0; exhausted &rarr; -1; held
&rarr; 0; otherwise `cursor + 1`.

**Why the cross exists.** An exhausted queue used to show infinity whether held
or not, so tapping produced no visible change and there was no way to tell the
tap had registered — a dead end found in live use after a long run.

Superseded in 2.6.0: the cross now means "the next Confirm ends the group", shows
exactly once on the last queued person, and **tapping it means "not yet"** — the
way to extend past the end of a queue. See "The glyph is a readout" above.

**Why not "3 of 4":** the audience is a room of adults who will pounce on any
visible sign that the wheel is being steered. A small triangle reads as
decoration. Keep any future queue indicator equally opaque — no numerals, no
progress bars, no wording.

## animateCards — three-card monte order

Rewritten in `animations.js` 1.2.0. Cards are dealt **face up in alphabetical
order**, held ~1.1s so they can be read, flipped face down, and only then
shuffled. Previously they started face down, so there was nothing to track and
you learned what you were looking at only after it finished.

The flip is a scaleX(0) squash, content swap, scaleX(1) expand — no 3D card
structure needed.

Two things that will bite an editor:

- `flipDown` sets an inline `transition`; `startShuffle` clears both inline
  `transition` and `transform` so the stylesheet's `all 0.4s` drives `left`
  again during the shuffle.
- `revealCards` clears inline `transform` before adding `.shuffle-eliminated` /
  `.shuffle-winner`, because those classes are transform-based and an inline
  transform would beat them.

Shuffle count was trimmed from `12 + n*3` at 250ms to `8 + n*2` at 200ms to pay
for the new opening, keeping total runtime roughly where it was.

## animateBracket — the final must contain the winner (animations 1.3.0)

**The bracket crowned the wrong house whenever there were five or more houses.**

The animation stages one round of semis and one final. Semis are built by pairing
off a shuffled house order two at a time, so `n` houses give `ceil(n / 2)`
matchups. The final then took `semiWinners.slice(0, 2)` — which is only ever safe
at `n <= 4`, where there are exactly two semis.

At five or more houses there are three or more semi winners, and the house that
was actually sorted could win its semi and then be left out of its own final.
`runMatchup` was still told `winner = targetIdx`, its `winner === idxA ? elA : elB`
fell through to `elB`, and the card on the right got the champion glow — in the
target's colour, under a different house's name — a second before the reveal
announced the correct house.

Measured over 20,000 simulated spins per configuration:

| houses | wrong champion |
|---|---|
| 2, 3, 4 | 0% |
| 5 | 19.9% |
| 6 | 33.8% |
| 8 | 49.9% |

Ellis runs four houses, so this never fired in production. It is recorded at
length because it is a **counterexample to a claim made elsewhere in this file**:
"5 houses instead of 4 — gap 0, nothing hardcodes 4" was true of the sorting
maths and false of the animations. Adding a fifth house is not a config change;
re-test the animations if it ever happens.

The fix seeds one side of the final with `targetIdx` directly and draws its
opponent at random from the other semi winners, then randomises which side the
target sits on so the champion isn't always the same slot. `runMatchup` also
gained a tripwire that `console.error`s if it is ever asked to crown a house that
isn't in the matchup, instead of quietly picking one. Verified: 0% wrong at 2, 3,
4, 5, 6 and 8 houses over 200 real end-to-end runs each, tripwire never fires.

Note that with 5+ houses the third and later semi winners now win a match and
then simply sit there. This is a *flavour* bracket, not a real tournament, and
making it a true single-elimination ladder would mean multiple rounds and a
layout rewrite. Left as is deliberately.

## buildRollerStrip — a shuffle that wasn't (animations 1.3.0)

The roller is the default animation on both pages, and its card sequence was
`(i + cycle * 3) % n`. Despite the comment calling it a shuffle, that is a
monotonic 0,1,2,3 walk with its start point nudged each cycle. Two consequences:

1. **At every cycle boundary the +3 offset and the +1 index cancelled mod 4**, so
   the same house appeared on both sides of the seam. With four houses that is
   **eight duplicated cards per spin out of 33**, on the animation everyone sees
   by default. Three and six houses happened to come out clean, which is
   presumably how it passed review.
2. The strip length was `n * cycles + targetIndex + 1`, so the distance travelled
   depended on which house had won. Fixed duration, variable distance, therefore
   variable speed. Nobody was going to clock it, but a wheel whose spin varies
   with its own answer is a bad idea in a room full of people looking for a tell.

Now: eight genuine Fisher-Yates shuffles of the full house list, with two
constraints — a cycle may not start on the house the previous one ended on, and
the last cycle may not end on the winner. Length is constant at `n * cycles + 1`.
Every house still appears exactly eight times, so the strip carries no
information about the outcome.

Verified over 3,000 generated strips per house count using the real exported
`buildRollerStrip`: zero adjacent repeats at 3, 4, 5, 6 and 8 houses; length
constant; final card always the target; each house appearing exactly 8 times.

**Two houses is the one case that cannot be fully satisfied** — with only two
cards the two constraints conflict about half the time and one repeat survives,
which is inherent rather than a bug. A two-house roller is a-b-a-b regardless.

## A process failure worth not repeating

While rewriting the tap handler I used `str.replace()` with a pattern that no
longer matched, because the source had already changed in an earlier round.
Python's `replace` returns the original string silently, so the edit vanished and
the stale function shipped. It was only caught by probing runtime behaviour.

Any scripted edit to these files should assert the substitution happened:

```python
if old not in s: sys.exit("NO MATCH: " + label)
```

Same class of problem as the test runner that reported dead suites as green:
silence read as success.

## The duplicated stylesheet (found and fixed in round 3)

**`sorting-wheel.css` shipped containing a complete second copy of itself.** A
stale v1.1.0 copy of all 216 rules sat appended after the v1.3.0 copy, the two
joined mid-line immediately after `.build-stamp:hover`. 51.8 KB where 26 KB
belonged.

The interesting part is what it did, because it is not what you would guess.
The two copies were byte-identical apart from the version string and four
declarations on `.build-stamp`. Since the stale block came **second**, it won the
cascade at equal specificity. So:

- v1.3.0's build-stamp restyle was silently reverted to the old 10px / 0.45
  styling, and
- every page reported **`css 1.1.0`** in its own build stamp.

That second one matters. The build stamp is the mechanism this project uses to
catch a forgotten upload, and here it reported a *forgotten upload* when the real
fault was a *doubled file*. Jake would have re-uploaded the same broken file and
watched the stamp refuse to change.

Three things to take from it:

1. **A version stamp proves which bytes won, not which file arrived.** If the
   stamp reports an older version than the header of the file you just uploaded,
   check the file's length before you re-upload anything.
2. **This is the append-instead-of-replace failure again**, one layer out from
   the `str.replace()` incident above. Same root cause: a scripted edit whose
   result nobody measured.
3. **Assert on size, not just on content.** Any scripted rewrite of a whole file
   should check that the output is roughly the size you expect. A dedupe that
   doubles a file and a patch that vanishes are both invisible to a grep for the
   thing you were trying to add.

Fixed in css 1.3.1: one copy, ~26 KB, both published version literals bumped so
the stamp reads `css 1.3.1` and confirms the upload took. The deduplicated file
was diffed against the surviving half byte-for-byte — no rules were lost.

## Version reporting

With a no-build, hand-uploaded deploy, the likeliest deployment mistake is
updating one file and forgetting another it depends on. So each shared file
publishes its own version and the page reports **what actually loaded**:

- `animations.js` sets `window.SW_ANIMATIONS_VERSION`
- `sorting-wheel.css` sets `--sw-css-version` on `:root`, read back with
  `getComputedStyle(document.documentElement).getPropertyValue(...)`
- both pages render a `.build-stamp` bottom-left and show `MISSING` in red if
  either is absent

**When you bump either shared file, bump it in two places** — the header comment
and the published constant. They are deliberately separate so a mismatch is
visible rather than assumed.

Page titles carry versions too, and `index.html` / `faculty.html` both re-apply
the version when they rewrite `document.title` with the school name. An earlier
version of `index.html` overwrote the title on entering the ceremony and lost the
version from the tab.

## Holding the queue

`state.queuePaused` is a **sticky** toggle bound to the glyph itself
(`toggleQueuePause`, with `stopPropagation` so it doesn't also open the modal).
While held, `startSort` passes `step = null`: even chance, and `cursor` never
advances.

**Do not "fix" this by consuming a queue entry.** Skipping a `pool` step would
leave one of the reserved houses permanently unassigned, silently breaking the
guarantee the set exists to provide.

**Sticky, not one-shot.** Two reasons: there may be more than one walk-up, and
holding an *exhausted* queue open is how you add someone to the final tally.
Resuming an exhausted queue is what closes the run — `toggleQueuePause` checks
`runExhausted()` on release and fires the summary.

**No toast on toggle.** A visible "queue held" message in front of the room
defeats the entire design. The glyph changing shape is the only feedback.

**Never close out a run while `state.pending` is set.** Found in live use, not by
testing: resuming while a spin's result was still on screen called
`showSummary()` immediately, which discarded `state.pending`. That person was
never recorded, never appeared in the celebration, and the operator never got to
press Confirm — silent data loss in front of an audience. `toggleQueuePause` now
requires `!state.pending` before closing out; `acceptSpin` closes the run a
moment later instead, and the person is included. Regression test:
`tests/test_pending.js`, which walks the exact live sequence
A / hold / D / resume / B / hold / E / resume / C / hold / F / resume.

Run lifecycle: `runActive()` = queue non-empty. `runExhausted()` = cursor past
the end. `closeRun()` clears the queue so later spins belong to no run.

## Everyone in a run is in its celebration

`showSummary` filters on `r.runId === state.runId` only — **not** on
`r.queued`. Anyone sorted while a run is open joins the celebration, including
walk-ups spun with the queue held. That is intentional: they joined the group, so
they join the group photo. Spins with no run open get `runId: null` and never
appear.

An earlier version excluded walk-ups. It was wrong, and the test that asserted
it was wrong too.

## Queue completion summary (faculty 2.1.0)

When a **defined** queue reaches its end, `acceptSpin` calls `showSummary()`
instead of returning to ready: a `'summary'` ceremony phase listing everyone from
that run with house colour, logo, staggered reveal, and a two-corner confetti
burst.

Trigger condition is deliberately narrow — `step && state.steps.length > 0 &&
state.cursor >= state.steps.length`. Ad-hoc even-chance spins must never trigger
it, because there is no run to close, and because the summary is also the
operator's signal that the queue is spent and spins have returned to even.

Results are tagged with `runId`, incremented by `beginRunIfNeeded()` whenever the
queue goes from empty to non-empty. `showSummary` filters on
`r.queued && r.runId === state.runId`.

**This replaced a trailing-block scan and the replacement matters.** The original
walked backwards through `state.results` until it hit a non-queued entry. That
broke the instant an off-queue walk-up happened mid-run: everyone before the
interruption silently vanished from the summary — which is precisely the
situation off-queue exists to handle. Caught by test, not by inspection. Don't
revert to positional inference.

Re-sort on the final queued spin must not trigger it either — `cancelSort` runs
before `cursor` advances, so it doesn't. There is a test for this; keep it.

## Faculty queue model

`faculty.html` flattens the queue into `fstate.steps`, each either:

- `{kind:'pool', poolId}` — resolved at spin time by drawing at random from that
  pool's remaining houses and removing it. The set is guaranteed; which person
  gets which house is a genuine coin flip.
- `{kind:'free', excluded:[idx]}` — random among the houses not excluded.

With **no queue entry at all** (the default), the spin is an even chance across
every house. The queue is optional; an empty queue makes this a plain wheel, and
once the queue is exhausted spins return to even chance.

Resolving at spin time rather than shuffling up front is deliberate: it keeps the
randomness live, `describeStep` can show what's left, and `returnStep()` can undo
a draw when the operator hits Re-sort — otherwise re-spinning someone would
silently consume one of the reserved houses.

Tested over 20,000 runs of admin's actual request (set of Callidus+Princeps, then
an open spin excluding Vevaios): the pair appears 100% of the time, order splits
50/50, the third spin never returns Vevaios. Edge cases covered: empty exclusion
list, a set of all four houses, a set of one.

---

## Architecture

Single-file app, no build step, no bundler, no modules. `index.html` is
~3,400 lines: CSS in one `<style>`, all logic in one `<script>` at the end of
`<body>`. Deployed by uploading files through the GitHub web UI to GitHub
Pages. Do not introduce a build step — the deployment path can't run one.

Three external dependencies, all CDN:
- Firebase 10.12.0 compat SDK (`app`, `auth`, `storage`) — auth and logo storage
- `canvas-confetti` 1.9.3
- Google Fonts (Cinzel, Outfit)

**Firebase is used for auth and image storage only. There is no database.**
All application data lives in a Google Sheet, read and written through the
Sheets REST API v4 with the user's own OAuth token. This means:

- Every user needs Drive access to the Sheet. Firebase auth alone is not enough.
- There are no server-side security rules on the data. Drive permissions *are*
  the security model.
- Two stations can't corrupt each other, because `values:append` is atomic
  server-side.

### Screen model

Four top-level `.screen` divs, each a **direct child of `<body>`**:
`loginScreen`, `setupScreen`, `unauthorizedScreen`, `ceremonyScreen`.
`showScreen(id)` strips `.active` from all of them and adds it to one.

> `.screen { display:none }` / `.screen.active { display:flex }`. A `.screen`
> nested inside another `.screen` can therefore **never be shown** — the
> parent's `display:none` wins. This was a live bug (see Fixed, #1). If you add
> a screen, add it at body level and verify with the jsdom check in "Testing."

### Auth flow

Deliberately loop-proof, and the comments in the code say so. Read them before
touching it. The principle: **tokens only ever come from an explicit user
action** — clicking Sign In, or a redirect result. `onAuthStateChanged` never
initiates a new auth flow. There is no silent refresh, so there is no
possibility of a refresh loop. If the token is gone, the user clicks Sign In
again. An earlier iteration apparently had loop problems; don't undo this.

Token is cached in `sessionStorage` with a 3,500,000 ms (~58 min) assumed
lifetime. `isTokenLikelyValid()` is a clock check, not a real validation.

`signIn()` tries popup first, falls back to redirect only on
`auth/popup-blocked` or `auth/cancelled-popup-request`. `showAuthBlockedError()`
probes `accounts.google.com` to distinguish "network blocks Google" from
"browser blocks popups" and gives different advice. School-network specific;
worth keeping.

### Sheet contract

`Config` row positions are hardcoded. The app writes to `Config!B4` (school
logo), `B5` (logo bg), `B6` (balance), and `C{9+i}` (house logos). Houses are
read from row 9 down. **Inserting or deleting a Config row above 9 silently
corrupts those writes** — they'll land in the wrong cell with no error. If you
ever refactor the sheet layout, make these key-based lookups instead of fixed
offsets. Documented as a warning in the README, not fixed, because changing it
mid-season would require migrating the live sheet.

`Counts` is derived: `=COUNTIF(Roster!C:C, A2)` where `A2` is `=Config!A9`.
The app reads it and never writes it. Sheets recalculates server-side, so a
fresh GET after an append returns correct numbers.

`Users` tab absent or empty → open access as `sorter`
(`loadUsers()` catch block). This was almost certainly for legacy-sheet
compatibility. It is a fail-open, but the real gate is Drive permissions, so
the blast radius is limited to role escalation among people who already have
Sheet access.

### Sort mechanics

`calculateBlendedProbabilities(slider)` linearly interpolates between a uniform
distribution and a deficit-proportional one. Deficits use `(maxCount - c) + 1`,
so no house can ever reach 0% probability even at slider 100. That `+1` is
load-bearing for the ceremony feeling fair — leave it.

Counts are refreshed at the start of every sort (`startSort` calls
`loadCounts` + `loadBalanceSetting`) so multi-station odds stay current.

Eight animations. `roller` is CSS-transform based and special-cased.
The other seven live in the `animations` map and are canvas or DOM driven,
each returning a Promise. `ANIMATION_META` drives the picker UI. Enabled set is
per-device in `localStorage` under `sortingWheel_enabledAnims`.

### Storage keys

| Store | Key | Notes |
|---|---|---|
| localStorage | `sortingWheel_sheetId` | overridden by `?sheet=` param |
| localStorage | `sortingWheel_enabledAnims` | per-device animation choices |
| localStorage | `sortingWheel_adminContact` | cached for error messages |
| sessionStorage | `sortingWheel_token` | OAuth access token |
| sessionStorage | `sortingWheel_tokenExpiry` | epoch ms |
| sessionStorage | `sortingWheel_awaitingRedirect` | redirect-flow flag |

---

## Added in 1.6.0 — Even Target sorting mode

Jake signed off on this as a **toggle**, explicitly so the old behaviour stays
available if the new one misbehaves live. Default is `slider`; target mode is
opt-in. Keep it that way.

`calculateTargetProbabilities()` weights each draw by how far each house is
below a fixed per-house target:

```js
need_i  = max(0, targetPerHouse - counts_i)
prob_i  = need_i / sum(need)
```

Because remaining need and remaining students shrink together, the odds hold
roughly constant across the whole event instead of front-loading.

`currentProbabilities()` is the dispatcher and the **single source of truth** —
both `weightedSelect()` and `updateProbabilities()` go through it, so the
displayed odds can never disagree with actual behaviour. If you add a third
mode, add it there and nowhere else.

### The bug that nearly shipped — read this

The first implementation computed the target live:

```js
const target = (counts.reduce(sum) + expectedIncoming) / n;   // WRONG
```

`counts` grows with every confirmed sort, so the target climbed all night and
never converged. My standalone simulation said the gap would be 0.0; running the
same 2,000 trials through the *actual shipped function* in jsdom gave an average
gap of **10.6**. The bug only appeared because the test exercised the real code
rather than a reimplementation of it.

The fix: `state.targetPerHouse` is a stored constant, written to
`Config!target_per_house` when an admin sets the class size, and never derived
from live counts. **Do not make it dynamic again.**

Lesson worth keeping: simulate the shipped function, not your mental model of it.

### Count validation (v1.6.2)

Because `Counts!B` sits downstream of an `IMPORTRANGE` to a sheet Jake does not
control, a rename or permission change on the master list breaks it. `loadCounts`
previously did `parseInt(row[1]) || 0`, so `#REF!` became `0` — and all-zero
counts make the app conclude every house is empty and already even. It would have
sorted at pure random, silently, with the balancing feature appearing to work.

`loadCounts` now rejects anything non-numeric, **retries once after 1.6s**, and
only then sets `state.countsValid = false` and shows an error. `startSort`
refuses to run while counts are invalid.

The retry exists specifically because `IMPORTRANGE` reports `Loading...`
transiently during recalculation, and blocking a station for that would be worse
than the bug. Tested: transient `Loading...` recovers and the station keeps
working; a persistent `#REF!` blocks with a clear message; recovery via Refresh
Counts restores normal sorting. See `test_retry.js`.

Do not "simplify" this back to a single read.

### Estimate sensitivity — asymmetric, and it matters

`target_per_house` depends on an admin's guess at attendance. That guess is
wrong-tolerant in one direction only:

| entered | 150 arrive | 181 | 200 | 220 |
|---|---|---|---|---|
| 150 | 1.2 | 2.1 | 2.1 | 2.1 |
| 181 | 5.8 | 0.0 | 2.1 | 2.1 |
| 200 | 7.4 | 4.4 | 1.0 | 2.0 |

Overshoot is self-healing: houses hit target, `needTotal` goes to 0, and the
`calculateBlendedProbabilities(100)` fallback drives the gap toward zero.
Undershoot is not: every house ends proportionally short and the neediest house
stays furthest behind.

So **advise a deliberately low figure.** Entering 100 when 181 arrive still gives
a gap of 2.1 with identical streak lengths — there is no measurable penalty for
being conservative, and a real one for optimism. README §5 says enter 150.

If anyone proposes "helpfully" defaulting this to a best-guess class size,
default it LOW.

### Config keys and semantics

| Key | Meaning |
|---|---|
| `sort_mode` | `slider` \| `target` |
| `expected_incoming` | what the admin last typed; display/audit only |
| `target_per_house` | **authoritative** fixed target used by the algorithm |

Found by name-scan anywhere below the houses block, so they don't disturb the
hardcoded rows above. `saveConfigKey()` appends the row if absent and remembers
its position, so the sheet self-heals — no manual setup required.

The house parser breaks on a blank name **or** on any name in
`EXTRA_CONFIG_KEYS`, so an appended settings row can never be mistaken for a
fifth house. That guard is why appending is safe; don't remove it.

The input is labelled **"Students still to sort"**, not "class size". This is
deliberate: re-entering it mid-event recomputes the target from current counts,
which is only correct if the number means students remaining.

`onExpectedIncomingChange()` calls `loadCounts()` before computing the target
(v1.6.1). An admin may set this from a station whose counts are stale while
another station has been sorting for half an hour; computing from stale counts
would set the target too low and under-fill every house. The provisional value
shown immediately uses cached counts for responsiveness, then the debounced
handler corrects it against the sheet.

`loadBalanceSetting()` was widened from `Config!A6:B6` to `A1:B50` and now
refreshes mode, target, and slider before every sort, so a mode change on one
station propagates to the others on their next student. It deliberately does
**not** re-read houses — swapping logos mid-animation would be bad.

### Verified by test, not by inspection

| Case | Result |
|---|---|
| Real Ellis numbers, 181 students, 2,000 trials | 141/141/141/141 every time, gap 0 |
| Longest same-house streak | 4.5 avg, 11 worst |
| Overshoot — 220 arrive when 181 expected | gap 1, fallback holds level |
| Undershoot — 160 arrive when 181 expected | gap ~5 |
| Mid-event switch target → slider 75 | gap 4, safe |
| 5 houses instead of 4 | gap 0, nothing in the *sorting maths* hardcodes 4 (the bracket animation did — see "animateBracket") |
| Sheet with no new keys (backwards compat) | defaults to slider, 4 houses parsed |
| Target mode with target unset | falls back to slider blend |

Test harness: `test_v16.js` and `test_extra.js`. They load `index.html` in
jsdom, stub Firebase, and export the lexically-scoped `state` via an appended
`globalThis.state = state`. Neither is in the repo; recreate them from the
snippets in "Testing" below if you need them.

### Re-verified independently in round 3

Everything above was re-derived from scratch against the shipped functions, on
the assumption that the previous session's conclusions might be wrong. They
weren't. The maths is correct and was not modified.

| Check | Result |
|---|---|
| Target mode, real Ellis numbers, 181 students, 2,000 trials | 141/141/141/141 every time, gap 0.00 |
| Sensitivity table above, re-measured | reproduces to within 0.2 (e.g. entered 150 → 1.23 / 2.18 / 2.09 / 2.07 vs the documented 1.2 / 2.1 / 2.1 / 2.1) |
| `weightedSelect()` bias, 400,000 draws on a fixed distribution | χ² = 4.04 on 3 df (5% threshold 7.81) — no detectable bias |
| Probability vectors sum to 1 | exact, zero float residual, so the last-index fallback never fires |
| `recomputeTarget()` call sites | called **only** from `onExpectedIncomingChange`; the "target climbs all night" bug has not regressed |
| Baseline arithmetic in "Real numbers as of July 2026" | correct: 99+85+97+102 = 383; needs 42/56/44/39 = 181; Callidus 56/181 = 30.9%, matching "about 31%" |
| Degenerate inputs (all at target, all zero, one house over, one seat left, target unset) | all behave; no throws, no NaN, no negative weights |
| Duplicate element IDs, inline handler resolution, `$('id')` resolution, JS syntax | clean on both pages |

**One thing worth knowing operationally:** in target mode a house that has
reached its target legitimately drops to **0.0%**, because the `+1` deficit floor
exists only in slider mode. That is correct — it is how the event lands exactly
even — but if "Show Probabilities" is up on a screen late in the day, an observer
will see a house sitting at zero, and the last few students are effectively
determined. Not a bug; don't "fix" it by adding a floor, which would reintroduce
a final gap.

---

## Fixed in 1.5.0 (from 1.4.1)

**1. `unauthorizedScreen` was unreachable. Severity: high.**
It was nested inside `#setupScreen`, so `showScreen('unauthorizedScreen')`
removed `.active` from the parent and the child rendered inside a
`display:none` ancestor. Any staff member not on the `Users` tab got a blank
black screen with no message and no Sign Out button — reload was the only
escape. Exactly the failure you'd hit on registration day with a
last-minute helper. Moved to body level; a comment marks it "do not re-nest."

**2. `?sheet=` param was ignored when a sheet ID was already cached.**
The guard was `if (paramSheet && !state.sheetId)`. So a device that had ever
connected to any sheet silently ignored share links and kept using the old one.
Param now always wins. Also moved the whole block to the top of the script,
before `firebase.initializeApp`, so it cannot race `onAuthStateChanged`.

**3. Roster append switched from `USER_ENTERED` to `RAW`.**
Two problems with `USER_ENTERED`: student numbers lost leading zeros (`007`
→ `7`), and any typed value starting with `=`, `+`, `-`, or `@` was evaluated
as a formula. Now stored verbatim as text.

**4. Double-submit guards.**
`approveSort` had no guard and could append two roster rows on a double-tap.
`startSort` could double-fire because both the SORT button and a global Enter
keydown handler call it. Both now use in-flight flags and disable their button.

**5. Session pre-flight check.**
Previously an expired token surfaced only when Confirm failed — after the
student had already watched a 6-second animation and seen their house. Now
`startSort` checks `isTokenLikelyValid()` before anything happens and tells the
operator to re-sign-in first. Failure moved to before the ceremony instead of
during it.

**6. Animation errors no longer freeze the station.**
The animation await is wrapped in try/catch/finally; a thrown animation now
logs and jumps straight to the reveal rather than leaving a student staring at
a stuck screen. The house was already chosen before the animation ran, so the
result is unaffected.

**7. `ellis.html` rewritten (1.0 → 1.1.0).**
Its script ran in `<head>` and the error branch called
`getElementById('msg')` before that element existed — guaranteed TypeError,
leaving a spinner forever. Moved to end of `<body>`, added
`encodeURIComponent`, hid the spinner on error, and corrected stale comments
that referred to the file as `go.html`.

---

## Verified, not changed

- All 84 functions referenced by inline `onclick`/`oninput`/`onchange`
  attributes exist. No dead handlers.
- All `$('id')` lookups resolve to real elements. Three (`shieldRow`,
  `shuffleArena`, `bracketStage`) are created dynamically immediately before
  use — that's fine, not a bug.
- No duplicate element IDs.
- Student names reach the DOM via `textContent`, never `innerHTML`. House names
  *do* go through `innerHTML` in the roller cards and result placeholder, but
  those come from the Config tab, which is admin-controlled. Low risk, worth
  knowing if house names ever become user-editable.
- `loadCounts` requests one row more than there are houses. Harmless.
- The `+1` in the deficit calculation. Intentional. See above.
- House name `Accomodore` (Config row 9). Reads like it might be a misspelling
  of "Accommodore," but house names are Jake's call and it's already on
  spreadsheets, signage, and in students' heads. **Ask before changing** —
  renaming a house in Config without updating existing Roster rows silently
  zeroes that house's count.

---

## Open items

Ordered by value. Nothing here is required for anything to work.

> **Removed in 1.14.0 — "Reconcile the duplicated animation CSS."** This item
> said `index.html` still carried an inline copy of the animation rules and told
> the next person to add `<link rel="stylesheet" href="animations.css">`. Both
> halves were wrong by the time anyone could read it: `index.html` has no
> `<style>` block at all any more, and `animations.css` was deleted when it was
> folded into `sorting-wheel.css`. Following the instruction would have linked a
> 404. Recorded rather than silently deleted, so nobody re-derives it.

**1. In-app undo / last-sort correction.**
Typos currently require opening the spreadsheet. A "fix last entry" button that
rewrites the most recent row appended by the current user would cover the common
case. Note the Roster is a hybrid (see SECOND INVARIANT) — an undo must only ever
touch static appended rows, never the formula mirror block.

**2. Duplicate-name warning at sort time.**
With several stations running, the same student getting sorted twice is the
likeliest data error. A soft warning would catch it live. README §7 has a
conditional-formatting workaround needing no code.

**3. Add a graduation-year / `Class Of` column to the Roster.**
Low priority now — the master-list link means the annual rollover is already
mostly automatic. Still, the only way to identify which appended rows belong to
which year is the Timestamp column. Would mean extending `Roster!A:E` to `A:F`.

**4. Config key lookups instead of fixed row offsets.**
Removes the "never insert a row above 9" landmine. Needs a live-sheet migration,
so not something to do near an event.

**5. Session countdown in the header.**
The pre-flight check catches expiry, but showing "session ends 2:47" would let
operators refresh at a natural gap rather than mid-line.

### Resolved, recorded so it isn't rebuilt

- **"A secondary method of input"** meant Even Target mode. Shipped in 1.6.0. The
  original phrasing was ambiguous enough to send someone building a bulk-paste
  queue or a barcode scanner; it was neither.
- **Quota/target sorting** — shipped in 1.6.0 as a toggle.
- **Faculty spins** — shipped in 1.7.0 as `faculty.html`.

---

## Testing

There is no `tests/` directory in the repo — see "Test suites" above for the
contradiction this used to create. Verification is currently ad hoc. The
round 1-2 baseline was:

```bash
# Extract and syntax-check the inline JS
python3 -c "import re;h=open('index.html').read();\
open('/tmp/app.js','w').write(re.search(r'<script>\n(.*)\n</script>',h,re.S).group(1))"
node --check /tmp/app.js

# Confirm every .screen is a direct child of body and can actually be shown
node -e "const {JSDOM}=require('jsdom'),fs=require('fs');
const d=new JSDOM(fs.readFileSync('index.html','utf8')).window.document;
for(const id of ['loginScreen','setupScreen','unauthorizedScreen','ceremonyScreen']){
  d.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));
  d.getElementById(id).classList.add('active');
  let el=d.getElementById(id),ok=true;
  while(el&&el.tagName!=='BODY'){
    if(el.classList.contains('screen')&&!el.classList.contains('active')){ok=false;break;}
    el=el.parentElement;}
  console.log(id,ok?'OK':'HIDDEN BY ANCESTOR');}"
```

Also worth re-running when touching the DOM: the inline-handler and `$('id')`
resolution checks described under "Verified."

### Round 3 additions

Three cheap checks that would have caught this round's findings:

```bash
# 1. Doubled file. Would have caught the duplicated stylesheet immediately.
#    Any repo file whose header comment appears more than once is suspect.
for f in *.css *.js *.html; do
  n=$(grep -c "SORTING WHEEL" "$f"); [ "$n" -gt 1 ] && echo "$f: header x$n"
done
# And: exactly one --sw-css-version declaration must exist.
grep -c "sw-css-version:" sorting-wheel.css   # must be 1

# 2. Every JS file and inline block parses.
node --check animations.js
python3 -c "import re;h=open('index.html').read();\
open('/tmp/app.js','w').write(re.search(r'<script(?![^>]*src=)[^>]*>(.*?)</script>',h,re.S).group(1))"
node --check /tmp/app.js
```

For the animations, load `animations.js` into a jsdom context, build the factory
with a stub `$` and a synthetic `getHouses()`, override `window.setTimeout` to
zero delay, and assert on the DOM afterwards:

- **bracket** — after `animations.bracket(t)` resolves, the single
  `.bracket-champion` element's text must equal `houses[t].name`. Run it at 2, 3,
  4, 5, 6 and 8 houses; four houses alone will not catch anything.
- **roller** — after `buildRollerStrip(t)`, read the `.roller-card-name` spans:
  no two adjacent may match, the last must be the target, each house must appear
  exactly 8 times, and the length must not vary with `t`.
- **all eight** — invoke each and await its Promise, against both `index.html`
  and `faculty.html` DOMs, at more than one house count.

The zero-delay `setTimeout` override is what makes this practical; honest timing
puts a full sweep in the tens of minutes.

**What could not be verified without a browser or the live sheet:**
every animation actually rendering, Firebase Storage rules permitting logo
upload and listing, the real Config row layout in the live sheet, and how many
rows the Roster currently holds. Ask before assuming any of these.

---

## Conventions

- Version bumps on every shipped file. Patch and minor are automatic; **major
  requires Jake's explicit sign-off.**
- `index.html`'s version appears in **three** places that must match:
  the `<title>` (line 6), `APP_VERSION` (~line 1183), and the trailing HTML
  comment before `</body>`.
- Complete replacement files only. Never diffs or patches.
- Never store student-identifying data anywhere outside the spreadsheet.
- Explicit over magic. Comments explaining *why* a thing is the way it is are
  worth more here than clever code, since sessions are months apart.
- If a bug report doesn't match what the code shows, ask for a screenshot,
  repro steps, or a diagnostic rather than speculating. Stop after one or two
  files without a clean explanation.
