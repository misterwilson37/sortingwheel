# Sorting Wheel

A house-sorting ceremony app for Ellis Middle School. A staff member types a
student's name, taps SORT, an animation plays, a house is revealed with
confetti, and on Confirm the assignment is written to a Google Sheet.

Multiple devices can run simultaneously and stay in sync, because the
spreadsheet — not the browser — is the source of truth.

**Live app:** https://sortingwheel.misterwilson.org
**Short link for staff:** https://sortingwheel.misterwilson.org/ellis.html
**The spreadsheet:** https://docs.google.com/spreadsheets/d/1rYZ71el1yPjo1X7F71nI8WQ9LvCqY4g7r-iXr5IYQqE/edit

Current version: **1.6.2**

---

## 1. Files in this repo

| File | Version | What it is |
|---|---|---|
| `index.html` | 1.6.2 | The entire app. HTML + CSS + JS in one file, no build step. |
| `ellis.html` | 1.1.0 | Redirect page. Forwards to `index.html?sheet=<Ellis sheet ID>` so staff only have to remember one short URL. |
| `config.js` | — | Firebase project keys (`categorizingcougar`). Safe to be public; Firebase web config is designed to be. |
| `CNAME` | — | GitHub Pages custom domain: `sortingwheel.misterwilson.org` |
| `README.md` | 1.5.0 | This file. |
| `HANDOFF.md` | 1.5.0 | Technical notes for the next developer / Claude session. |

Deployment is GitHub Pages. Upload the changed file through the GitHub web UI
and it is live in about a minute. There is no build, no CLI, no bundler.

---

## 1a. Access and permissions

Sharing on the spreadsheet is set to **Restricted** — only people added
individually can open it. That's correct and should stay that way. The sheet ID
appears in `ellis.html` in a public repo, so "Anyone with the link" would
effectively publish student data to anyone who found the repo.

### Adding a new person takes TWO steps

This is the one thing that will bite you. Adding someone in one place and not
the other looks like a broken app.

| Step | Where | What it does |
|---|---|---|
| 1 | Spreadsheet → **Share** → add as **Editor** | Grants actual access. Without this they cannot record a sort. |
| 2 | `Users` tab → add email + role | Sets their role (`admin` or `sorter`). Without this they see "Not Authorized". |

Symptoms of getting it half-right:

- **Share but no `Users` row** → they sign in and land on the "Not Authorized"
  screen.
- **`Users` row but no Share** → they get in, then hit "You don't have access to
  this spreadsheet."

Removing someone also takes both steps. Pulling the `Users` row alone leaves
them with Drive access to the raw student data.

### How the app reads a spreadsheet that's behind a login

It has no access of its own. When someone signs in with Google, the app requests
an OAuth token *as that person*, and every read and write runs under their
account. The app is a courier, not a key holder. This is why Drive sharing is
the real security boundary and the `Users` tab is only role assignment.

### What is and isn't a secret

- **The Firebase keys in `config.js` are not secrets.** Firebase web API keys are
  public identifiers by design — they route requests to a project, they don't
  authorise data access. Every Firebase web app ships them in plain sight.
- **The spreadsheet ID is not a secret.** It's an address. Knowing it grants
  nothing without Drive permission.
- **Nothing student-identifying is in the repo or in these docs.** Only house
  totals.

Two things worth a look if you're ever auditing this:

- The app requests the broad `spreadsheets` OAuth scope, which technically covers
  every spreadsheet the signed-in person can reach. Normal for this kind of tool,
  but it means anyone with write access to the GitHub repo could change what the
  page does with staff credentials. Keep the collaborator list short.
- Firebase Storage rules govern the logo files. No student data there, so this is
  housekeeping rather than risk.

---

## 2. How the spreadsheet works

Four tabs. **The tab names and the row positions matter** — the app reads
fixed cell ranges, not headers by name.

### Where every number lives

Two numbers get confused with each other. They are not the same kind of thing
and they never combine.

| | What it is | Where it lives | Who sets it |
|---|---|---|---|
| **Population** | how many students are in each house *right now* | `Counts!B2:B5` | formula |
| **Target** | the per-house goal the app aims at (141) | `Config` tab, key `target_per_house` | the app, when an admin enters a class size |

`Counts!B` must account for **every** enrolled student, but
`COUNTIF(Roster!C:C, …)` only sees students this app sorted. Anyone placed by the
old physical wheel is invisible to it. Closing that gap is what §4 step 2 is
about.

The target is a goal, not a quantity of students. It is never added to a count.
Both sorting modes read `Counts!B`; only Even Target mode reads
`target_per_house`. **A wrong population breaks both modes** — the slider would
think every house was empty and therefore already even.

### `Config` tab

| Row | Column A | Column B | Column C |
|---|---|---|---|
| 1 | `Key` | `Value` | |
| 2 | `school_name` | Ellis Middle School | |
| 3 | `school_colors` | comma-separated hex codes | |
| 4 | `school_logo_url` | Firebase Storage URL | |
| 5 | `school_logo_bg` | hex code, or `transparent` | |
| 6 | `balance_setting` | 0–100 (see §5) | |
| 7 | `---HOUSES---` | `---` | |
| 8 | `House Name` | `House Color` | `Logo URL` |
| 9+ | house name | hex color | logo URL |

Below the houses block, three optional settings rows are added automatically by
the app the first time you use Even Target mode:

| Column A | Column B |
|---|---|
| `sort_mode` | `slider` or `target` |
| `expected_incoming` | last figure typed into "Students still to sort" |
| `target_per_house` | the fixed target — **this is the number sorting uses** |

These are found by name, not position, so they can sit anywhere below the
houses. You don't need to create them by hand.

Houses start at **row 9** and are read downward until the first blank name (or
the first of those settings rows).
The app writes directly to `B4`, `B5`, `B6`, and `C9`+ when you change logos or
the balance slider, so **do not insert or delete rows above row 9.** Doing so
silently repoints those writes at the wrong cells.

### How the `Roster` tab actually works

This sheet is a **worksheet for the Sorting Wheel, not the system of record.**
House assignments live in a separate master list owned by the staff who maintain
grade-level rosters, and that list changes all year as students move in and out
of the area. The Sorting Wheel needs a live, accurate count at all times, so it
links to that master list rather than keeping its own copy.

Mechanically, the `Roster` tab is a hybrid:

| Rows | Content | Nature |
|---|---|---|
| 1 | header | static |
| 2 – ~600 | mirror of the master house list via `IMPORTRANGE` (anchored around `G1`), reshaped into Roster columns by formulas such as `=I2&" "&H2` | **formulas — do not overwrite** |
| below the block | students sorted by this app | static values appended by the app |

`COUNTIF(Roster!C:C, …)` therefore sees **both** the mirrored students and the
app-sorted ones, which is why counts are correct with no baseline column and no
manual bookkeeping.

Two things follow that are easy to get wrong:

- **The append boundary is defined by data, not by row number.** Google's
  `values.append` writes after the last row containing anything. Column D of the
  mirror block holds `Original Wheel` filled all the way down, which is what
  pushes appends safely past the formulas. Verified in practice: with the block
  filled to row 400, a test student landed at row 401 and the count incremented
  correctly.
- **A student can briefly be counted twice** — once as an app-appended row, once
  in the mirror — if the master list is updated while sorting is still going on.
  Harmless at this scale, but if you want the counts perfectly tight during the
  event, have master-list entry happen afterwards rather than in parallel.

### `Roster` tab — column layout

| A | B | C | D | E |
|---|---|---|---|---|
| Name | Student # | House | Sorted By | Timestamp |

Row 1 is the header and must stay. Within the mirror block these columns are
formula-derived; below it, the app appends one static row per confirmed sort.

**Column E is how you tell the two apart.** Mirrored rows have no timestamp;
app-sorted rows do. That's the discriminator for the annual cleanup in §4 step 2.

### `Counts` tab — derived, do not hand-edit

| A | B |
|---|---|
| `House` | `Count` |
| `=Config!A9` | `=COUNTIF(Roster!C:C, A2)` |
| `=Config!A10` | `=COUNTIF(Roster!C:C, A3)` |
| …one row per house | |

These formulas are what the app reads to display counts and to compute sorting
odds. If a count looks wrong, check these formulas first, then check that the
`IMPORTRANGE` on the `Roster` tab is still resolving.

As of v1.6.2 the app validates what it reads here. If a cell returns `#REF!`,
`#N/A`, or a blank, it retries once (to ride out a transient `Loading...` while
`IMPORTRANGE` recalculates) and then **blocks sorting** with an explanatory
error. Previously an unreadable count was silently read as `0`, which made the
app think every house was empty and already even — it would have sorted at pure
random with no visible symptom.

### `Users` tab

| A | B |
|---|---|
| `Email` | `Role` |
| someone@school.org | `admin` or `sorter` |

- **admin** — sees the balance slider, probabilities, Settings, Share Link,
  Open Spreadsheet, Refresh Counts. Can toggle into sorter view to preview it.
- **sorter** — sees the ceremony and the house counts. Nothing else.

> **Important:** the Users tab controls *roles*, not *access*. Actual access is
> Google Drive sharing on the spreadsheet itself. A person needs **Editor**
> access to the Sheet to record a sort, no matter what the Users tab says.
> Conversely, if the Users tab is empty or missing, the app falls open and
> treats anyone who can read the Sheet as a sorter. Keep both in sync.

---

## 3. Why this app exists (the design intent)

**The goal is an even split across the whole school, not within any one grade.**

The physical wheel it replaced was lopsided, and Callidus ended up with
significantly fewer students than the other three houses. This app fixes that
by steering incoming 6th graders toward whichever house is currently smallest.

That means the 6th grade class **will deliberately be uneven** — a lot more
Callidus than anything else — so that the school totals come out level. That is
the feature, not a bug. Do not "fix" it.

Two consequences that drive everything else in this document:

**1. The app has to know the current school-wide counts to work at all.**
It steers toward the smallest house by count. If it starts from zero, it has
nothing to correct and you get four even 6th grade houses on top of an already
lopsided school — the exact problem you were trying to solve. Getting the
current numbers loaded (§4, step 2) is the one prep step that cannot be
skipped.

**2. The counts must include only students who will still be at Ellis.**
Departing 8th graders leave with their house membership. Counting them would
make the app correct an imbalance that no longer exists.

So the numbers you need are: **current house counts for rising 7th and 8th
graders only.**

---

## 4. Registration prep checklist

Do these in order. Steps 1–8 before registration day.

**1. Back up the spreadsheet first.**
Open the Sheet → File → Make a copy → name it
`Sorting Wheel Backup <today's date>`. Do this before touching anything. It is
your only undo.

**2. Refresh the `Roster` mirror block.**

Read "How the Roster tab actually works" in §2 first if you haven't.

Short version: rows 2 through ~600 are formulas mirroring the master house list
via `IMPORTRANGE`. The app appends new students *below* that block. Counts are
always live and correct without anything hand-typed.

For a new registration year:

- **Delete the previous year's appended rows.** These are the static rows below
  the mirror block — the ones with a real timestamp in column E. As students get
  entered into the master house list by the staff who own it, they reappear
  inside the mirror block automatically, so their static row is now a duplicate
  and must go.
- **Extend the fill-down if needed.** The mirror formulas currently run to row
  600. They need to reach past the largest the master list will ever get. Extend
  before registration, not during.
- **Confirm the counts.** Open the app, expand Ceremony Controls, and check the
  four house numbers against real enrolment. This is the only verification that
  matters — everything downstream depends on it.

> **Don't shorten the fill-down block.** Google's append lands immediately after
> the last row containing data. Column D of the mirror block is filled with
> `Original Wheel` all the way down, which is what marks that boundary. Shorten
> the block or clear column D and the next appended student can land *inside* the
> mirror rows.

**3. Sanity check the numbers before you trust them.**
Open the app as an admin and expand Ceremony Controls. The four house counts
shown should match your real current enrollment for rising 7th + 8th grade.
Callidus should visibly be the smallest. If the numbers look wrong here, stop —
everything downstream depends on them.

**4. Confirm the `Roster` header row is intact.**
Row 1 must read `Name | Student # | House | Sorted By | Timestamp`. If the
Roster is completely empty, the app writes its first student into row 1 and
that student becomes the header. Delete leftover test rows, but keep row 1.

**5. Check that house names match exactly.**
The counts rely on `COUNTIF` matching text. If a house shows 0 when it
shouldn't, the name in `Config` and the name in the `Roster` rows differ —
usually a trailing space.

**6. Check the `Config` tab.**
Four houses at rows 9–12 with the right names, colors, and logo URLs. Nothing
inserted or deleted above row 9.

**7. Set up your station staff.**
For each person running a station:
- Add their **school Google email** to the `Users` tab with role `admin` or
  `sorter`.
- Separately, **share the Sheet with them as Editor** (Share button, top
  right). This is the step that's easy to forget and it is the one that
  actually matters.

**8. Test every physical device you plan to use.**
On each device:
- Open `sortingwheel.misterwilson.org/ellis.html`
- Sign in with Google
- Enter a fake name like `ZZTest One`, sort it, confirm it
- Verify the row appears in the Roster
- Delete that test row when all devices are verified

Do not skip this. Different devices fail differently — see §6.

**9. Set the balance slider** (admin only, in Ceremony Controls). See §5.

**10. Day-of housekeeping.**
- Charge everything.
- Google sign-in sessions last about **one hour**. If registration runs longer,
  each station will need to Sign Out and sign back in. The app now warns you
  *before* a student watches an animation that can't be saved, but plan a
  refresh around the hour mark anyway.
- Ceremony Controls drawer is at the bottom of the screen; tap it to expand.

**11. After registration.**
- Spot-check the Roster count against your actual headcount.
- Look for duplicates (§7 has a formula that flags them automatically).
- Make another backup copy.

---

## 5. Sorting method — use Even Target

As of v1.6.0 there are two methods, toggled in Ceremony Controls (admin only).
The setting is saved to the spreadsheet, so all stations follow whichever is
selected.

### Where the controls are

Bottom of the ceremony screen there's a drawer tab reading **Ceremony
Controls** — tap it to expand. The right-hand column holds **Sorting Method**:
two buttons, `Chance / Balance` and `Even Target`. Admin only; sorters never see
it. Picking Even Target reveals a **Students still to sort** box.

Both settings save to the spreadsheet, so every station follows whichever is
selected. You can change either one at any point, including mid-registration.

### Even Target (recommended)

Type in how many students are **still to be sorted**. The app fixes a per-house
target at that moment and weights each spin by how many places each house still
needs. The readout underneath shows the target and the remaining need per house,
so you can always see what it's aiming at.

The label says "still to sort", not "class size", deliberately: it means the
same thing at the start of the day (all of them) and halfway through (the ones
left), so you can retype it whenever your estimate firms up.

### Your estimate does not need to be right

This is the important part, and it's counterintuitive: **guess low.**

Over-estimating hurts. Under-estimating costs almost nothing. When more students
turn up than expected, every house reaches target and the app falls back to
straight balance-chasing, which keeps things level. When fewer turn up, every
house is left proportionally short and Callidus — needing the most — stays
furthest behind.

Final school-wide gap, 2,000 simulated registrations per cell, run through the
actual shipped code:

| you enter | 150 arrive | 181 arrive | 200 arrive | 220 arrive |
|---|---|---|---|---|
| **150** | **1.2** | **2.1** | **2.1** | **2.1** |
| 181 | 5.8 | 0.0 | 2.1 | 2.1 |
| 200 | 7.4 | 4.4 | 1.0 | 2.0 |

Entering 150 is never worse than a gap of about 2, whatever actually happens.
Entering 200 and having 150 show up leaves a gap of 7 — worse than the 17-student
imbalance you're trying to correct is not, but bad enough to waste a year.

Going lower still costs nothing measurable. Entering 100 when 181 arrive gives a
gap of 2.1 and identical streak lengths. So there's no penalty for being
conservative.

**Recommendation: enter 150 on the morning.** If the day is clearly busier and
you want the extra precision, retype the remaining count once you know it —
say 60 when 60 are left. The app re-reads counts from the spreadsheet before
recomputing, so it's safe to do this from any station even if that station has
been idle.

### Chance / Balance slider (the original)

The pre-1.6.0 behaviour, kept as a fallback. The slider runs from pure chance
(left) to strongly favouring the smallest house (right), saved to `Config!B6`.
It aims at whichever house is currently largest, so it corrects greedily and
front-loads the correction.

With your current numbers it works acceptably — the imbalance is mild enough
that even slider 50 finishes with a gap of about 4. If you fall back to it,
**set it to 75.** Slider 100 is not worth it: same result, more streaking.

### Which to use

Use Even Target with 150 entered. It is strictly better on every measure I could
test: near-exact convergence, shorter streaks, and less front-loading. The slider
is there so that if anything feels wrong on the night you can switch back
mid-event with one tap — I tested switching partway through and both modes still
finish level.

One note: **expect roughly 31% Callidus this year, not 90%.** Your spring test
ran against a much bigger Callidus deficit. With the 8th graders gone, Vevaios
is now the largest house (102) and Callidus the smallest (85) by only 17. The
correction needed is far gentler than what you saw in testing. That's not the
app misbehaving.

Whichever mode you use, **turn off "Show Probabilities"** if students can see
the screen.

## 6. Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| "Not Authorized" screen | Email isn't on the `Users` tab | Add it, then reload the app |
| "You don't have access to this spreadsheet" | Sheet isn't shared with that Google account | Share the Sheet as Editor |
| "Session expired. Please sign out and sign in again." | Google token expired (~1 hr) | Sign Out, sign back in |
| Sort animation plays but Confirm fails | Same as above, caught late | Sign out/in, re-enter that student |
| Station shows the wrong house counts | Stale local cache | Tap **Refresh Counts** (admin) |
| Station is on the wrong spreadsheet | Old sheet ID cached in that browser | Open `ellis.html` — as of v1.5.0 the link always overrides the cache |
| Sign-in popup does nothing | Brave Shields, ad blocker, or blocked domain | Set Shields down for this site; disable blockers; ask IT to allow `accounts.google.com` and `categorizingcougar.firebaseapp.com` |
| "Google Sheets API is not enabled" | Cloud project misconfigured | Google Cloud Console → APIs & Services → enable Google Sheets API |
| A house always shows 0 | House name mismatch between `Config` and `Roster` | Check for trailing spaces |
| Need to fix a typo'd student name | The app has no edit or undo | Edit the row directly in the spreadsheet |

---

## 7. Recommended spreadsheet safety nets

Neither requires a code change. Both take two minutes.

**Flag duplicate students automatically.**
Roster tab → select `A2:A` → Format → Conditional formatting → Custom formula:

```
=AND(A2<>"", COUNTIF($A$2:$A, A2)>1)
```

Set a red fill. With multiple stations running at once, the same student
getting sorted twice is the most likely data error, and this makes it obvious.

**Protect the structural tabs.**
Right-click the `Config` and `Counts` tabs → Protect sheet → restrict editing
to yourself. These tabs are load-bearing and a stray paste can break the app
mid-ceremony.

---

## 8. Every summer after this one

The link to the master house list does the heavy lifting, so the rollover is
short:

1. Back up the sheet (File → Make a copy).
2. Delete last year's app-appended rows — the static ones below the mirror block
   with a timestamp in column E. Those students now appear inside the mirror
   block instead, so keeping both double-counts them.
3. Extend the mirror fill-down if the master list has outgrown it. Never shorten
   it (see the append-boundary warning in §4 step 2).
4. Open the app and confirm the four house counts match real enrolment.
5. Set the sorting method and class size for the new registration (§5).

No baseline numbers to maintain, no grade column to keep current — the master
list is the source of truth and the mirror keeps up with it automatically.

## 9. Known limitations

- No edit or undo inside the app. Corrections happen in the spreadsheet.
- No duplicate detection at sort time. Use the conditional formatting in §7.
- Identifying which app-sorted rows belong to which year means going by the
  Timestamp column; there's no explicit cohort marker.
- The mirror block has a fixed length (currently ~600 rows) and needs manual
  extension if the master list outgrows it.
- Google sessions last about an hour; long events need a re-sign-in.
- Counts are read at the moment each sort begins. Two stations confirming
  within the same second both act on the same numbers. Harmless at this scale.
- The correction is front-loaded — heaviest streaking happens at the start of
  registration. See §5.
- Requires internet. There is no offline mode.
