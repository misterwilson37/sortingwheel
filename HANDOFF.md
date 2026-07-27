# HANDOFF — Sorting Wheel

Technical notes for whoever picks this up next, human or Claude.
Operational instructions live in `README.md`; this file is the code map.

**Handoff version:** 1.6.0
**App version at handoff:** `index.html` 1.7.0, `faculty.html` 1.0.0, `animations.js` 1.0.0, `animations.css` 1.0.0, `ellis.html` 1.1.0
**Session:** Rounds 1-2 of documented work. Claude instance name: **Trilby**
— a hat that reads code instead of minds, for an app that sorts students into
houses. Predecessors on other Jake projects: Fable, Stedman. Do not reuse.

**Context at handoff:** the app was built in an earlier undocumented session
and tested by four students. It works. It was about to be used to sort ~150
rising 6th graders. This session was a cold-read audit plus fixes, with no
access to the live spreadsheet or a browser — all verification was static
analysis, jsdom, and simulation.

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

## Shared animation module

`animations.js` + `animations.css` hold the eight ceremony animations, used by
both pages. Extracted in v1.7.0 so the faculty page didn't need a second copy of
704 lines that would drift.

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

`animations.css` was extracted the same way. Its rules depend on these custom
properties, which the host page must define: `--accent-gold`, `--bg-card`,
`--bg-deep`, `--bg-secondary`, `--text-muted`.

### Verification

`test_anim.js` loads `index.html` + `animations.js` in jsdom, stubs Firebase and
canvas, then **invokes all eight animations and awaits each Promise.** Also runs a
two-house config to confirm nothing assumes four. `test_faculty.js` does the same
against `faculty.html`'s DOM.

jsdom needs `pretendToBeVisual: true` or four of the animations fail on a missing
`requestAnimationFrame`. That's a harness requirement, not a bug.

**What jsdom cannot check:** actual visual rendering, canvas output, and CSS
transition timing. Spin each animation once in a real browser after touching this
module.

---

## Faculty queue model

`faculty.html` flattens the queue into `fstate.steps`, each either:

- `{kind:'pool', poolId}` — resolved at spin time by drawing at random from that
  pool's remaining houses and removing it. The set is guaranteed; which person
  gets which house is a genuine coin flip.
- `{kind:'free', excluded:[idx]}` — random among the houses not excluded.

Resolving at spin time rather than shuffling up front is deliberate: it keeps the
randomness live, and `describeStep` can show what's left.

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
| 5 houses instead of 4 | gap 0, nothing hardcodes 4 |
| Sheet with no new keys (backwards compat) | defaults to slider, 4 houses parsed |
| Target mode with target unset | falls back to slider blend |

Test harness: `test_v16.js` and `test_extra.js`. They load `index.html` in
jsdom, stub Firebase, and export the lexically-scoped `state` via an appended
`globalThis.state = state`. Recreate them from the snippets in "Testing" below
if lost.

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

**1. Reconcile the duplicated animation CSS.**
`animations.css` was extracted for `faculty.html`, but `index.html` still carries
its own inline copy of those ~46 rule blocks. Left that way on purpose: touching
`index.html`'s stylesheet days before registration risked a visual regression
nobody would notice until go-live. After registration, delete those blocks from
`index.html` and add `<link rel="stylesheet" href="animations.css">`. Verify by
spinning each animation in a real browser, not in jsdom.

**2. In-app undo / last-sort correction.**
Typos currently require opening the spreadsheet. A "fix last entry" button that
rewrites the most recent row appended by the current user would cover the common
case. Note the Roster is a hybrid (see SECOND INVARIANT) — an undo must only ever
touch static appended rows, never the formula mirror block.

**3. Duplicate-name warning at sort time.**
With several stations running, the same student getting sorted twice is the
likeliest data error. A soft warning would catch it live. README §7 has a
conditional-formatting workaround needing no code.

**4. Add a graduation-year / `Class Of` column to the Roster.**
Low priority now — the master-list link means the annual rollover is already
mostly automatic. Still, the only way to identify which appended rows belong to
which year is the Timestamp column. Would mean extending `Roster!A:E` to `A:F`.

**5. Config key lookups instead of fixed row offsets.**
Removes the "never insert a row above 9" landmine. Needs a live-sheet migration,
so not something to do near an event.

**6. Session countdown in the header.**
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

There is no test suite. Verification this session was:

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
