# HANDOFF — Sorting Wheel

Technical notes for whoever picks this up next, human or Claude.
Operational instructions live in `README.md`; this file is the code map.

**Handoff version:** 1.2.0
**App version at handoff:** `index.html` 1.6.0, `ellis.html` 1.1.0
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

Ordered by value. Nothing here is required for the app to work.

**1. Secondary input method — SPECIFICATION NEEDED, do not guess.**
Jake raised this and it's the next thing to build, but "a secondary method of
input" has at least four plausible readings and they lead to completely
different designs:

- a bulk paste / queue of names to work through one at a time
- scanning a student ID card or barcode
- picking from a pre-loaded roster instead of typing
- a second physical station type, e.g. a student-facing kiosk

Ask which before writing anything. Note that a pre-loaded roster would mean
putting student names into the sheet ahead of time, which changes the data
handling story.

**2. Add a graduation-year / `Class Of` column to the Roster.**
Now lower priority than it first appeared, because the baseline-column approach
means the annual rollover is four numbers rather than a row hunt. Still useful:
the only way to identify a cohort in the Roster today is by Timestamp. Requires
extending the append range `Roster!A:E` → `A:F` and sourcing the year (a Config
key set once a year is simplest).

**3. In-app undo / last-sort correction.**
Typos currently require opening the spreadsheet. A "fix last entry" button that
rewrites the most recent row appended by the current user would cover the
common case.

**4. Duplicate-name warning at sort time.**
With several stations running, the same student getting sorted twice is the
likeliest data error. A soft warning ("a student with this name was already
sorted into X — continue?") would catch it live. README §7 has a
conditional-formatting workaround that requires no code.

**5. Config key lookups instead of fixed row offsets.**
Removes the "never insert a row above 9" landmine. Needs care and a live-sheet
migration, so not something to do days before an event.

**6. Session countdown in the header.**
The pre-flight check catches expiry, but showing "session ends 2:47" would let
operators refresh at a natural gap instead of mid-line.

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
