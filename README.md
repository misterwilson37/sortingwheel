# Sorting Wheel

A house-sorting ceremony app for Ellis Middle School. A staff member types a
student's name, taps SORT, an animation plays, a house is revealed with
confetti, and on Confirm the assignment is written to a Google Sheet.

Multiple devices can run simultaneously and stay in sync, because the
spreadsheet — not the browser — is the source of truth.

**Live app:** https://sortingwheel.misterwilson.org
**Short link for staff:** https://sortingwheel.misterwilson.org/ellis.html
**The spreadsheet:** https://docs.google.com/spreadsheets/d/1rYZ71el1yPjo1X7F71nI8WQ9LvCqY4g7r-iXr5IYQqE/edit

Current version: **1.6.0**

---

## 1. Files in this repo

| File | Version | What it is |
|---|---|---|
| `index.html` | 1.6.0 | The entire app. HTML + CSS + JS in one file, no build step. |
| `ellis.html` | 1.1.0 | Redirect page. Forwards to `index.html?sheet=<Ellis sheet ID>` so staff only have to remember one short URL. |
| `config.js` | — | Firebase project keys (`categorizingcougar`). Safe to be public; Firebase web config is designed to be. |
| `CNAME` | — | GitHub Pages custom domain: `sortingwheel.misterwilson.org` |
| `README.md` | 1.2.0 | This file. |
| `HANDOFF.md` | 1.2.0 | Technical notes for the next developer / Claude session. |

Deployment is GitHub Pages. Upload the changed file through the GitHub web UI
and it is live in about a minute. There is no build, no CLI, no bundler.

---

## 1a. Security — who can see the student data

Short answer: **nothing in this repo grants access to your spreadsheet.** But
there is one setting you should verify, and it matters.

**How the app reads a spreadsheet that's behind a login.** It doesn't have its
own access. When a staff member signs in with Google, the app requests an OAuth
token *as that person*, and every read and write happens under their Google
account. The app is a courier, not a key holder. Nobody who isn't already
permitted to open the Sheet can get anything through it.

**The Firebase keys in `config.js` are not secrets.** Firebase web API keys are
public identifiers by design — they tell Google which project a request belongs
to. They do not authorise data access. Every Firebase web app ships them in
plain sight.

**The spreadsheet ID is not a secret either.** It's an address, like a URL.
Knowing it does not grant access; without Drive permission you get an error.

**Nothing student-identifying is in the code, this README, or HANDOFF.md.**
I checked. No names, no student numbers, no demographics — only house totals.

### The one thing to go check right now

Open the spreadsheet → **Share** → look at "General access."

- If it says **Restricted** — you're fine. Only the people you've explicitly
  added can see it. Stop here.
- If it says **Anyone with the link** — fix this today. The sheet ID is in
  `ellis.html` in a public repo, so "anyone with the link" effectively means
  anyone who finds the repo, including students. Change it to Restricted and
  add your station staff individually as Editors.

That share setting is the entire security boundary for this system. Everything
else is bookkeeping.

### Two smaller things worth knowing

**The app asks for broad spreadsheet permission.** It requests the
`spreadsheets` scope, which technically covers every spreadsheet the signed-in
person can reach, not just this one. That's normal for this kind of tool and the
app only ever touches the one sheet — but it does mean anyone with write access
to the GitHub repo could change what the page does with staff credentials. Keep
the repo's collaborator list short.

**Check your Firebase Storage rules** at some point. That's where house and
school logos live. If the rules are wide open, a stranger could upload junk. No
student data is there, so this is housekeeping, not urgent.

---

## 2. How the spreadsheet works

Four tabs. **The tab names and the row positions matter** — the app reads
fixed cell ranges, not headers by name.

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

### `Roster` tab — the actual record

| A | B | C | D | E |
|---|---|---|---|---|
| Name | Student # | House | Sorted By | Timestamp |

One row appended per confirmed sort. Row 1 is the header and **must stay**
(see §4, step 4).

### `Counts` tab — derived, do not hand-edit

| A | B |
|---|---|
| `House` | `Count` |
| `=Config!A9` | `=COUNTIF(Roster!C:C, A2)` |
| `=Config!A10` | `=COUNTIF(Roster!C:C, A3)` |
| …one row per house | |

These formulas are what the app reads to display counts and to compute
sorting odds. If a count looks wrong, check these formulas first.

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

**2. Load the current school-wide house counts. This is the critical step.**

The rising 7th and 8th graders were sorted by the old physical wheel, so their
house assignments live in your source spreadsheet, not this one. The app needs
those numbers or it has nothing to correct.

The efficient way is a **baseline column** on the `Counts` tab. No code change,
no student names — just four numbers.

Working from the counts as of July 2026 (current 6th and 7th grade; 8th grade
already removed):

| House | current 6th | current 7th | **baseline** |
|---|---|---|---|
| Accomodore | 42 | 57 | **99** |
| Callidus | 49 | 36 | **85** |
| Princeps | 46 | 51 | **97** |
| Vevaios | 79 | 23 | **102** |
| | | | **383 total** |

So:

- In `Counts!C1`, type: `Baseline (pre-app students still enrolled)`
- In `Counts!C2:C5`, enter `99`, `85`, `97`, `102` — **in the same house order
  as column A**. Check that order before typing; if column A reads Accomodore /
  Callidus / Princeps / Vevaios you're fine.
- Change `Counts!B2` from `=COUNTIF(Roster!C:C, A2)` to
  `=COUNTIF(Roster!C:C, A2) + C2`
- Do the same for `B3`, `B4`, `B5` (referencing `C3`, `C4`, `C5`).

The app reads columns A and B only and never writes to the `Counts` tab, so
column C is entirely safe. This also keeps `Roster` meaning exactly one thing —
students this app sorted.

Note that **you do not need to bump everyone up a grade for the app to work.**
The app only reads house totals; grade labels are your own bookkeeping. Do the
grade promotion whenever it suits you.

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

### Even Target (recommended)

Enter **how many students are still to be sorted** — 181 for this registration.
The app fixes a per-house target at that moment and then weights each spin by
how many places each house still needs.

With your numbers: 383 currently enrolled + 181 incoming = 564, so the target is
**141 per house**. That means Accomodore needs 42, Callidus 56, Princeps 44,
Vevaios 39. The odds stay near-constant all night — roughly Accomodore 23%,
Callidus 31%, Princeps 24%, Vevaios 22%.

Because those four numbers are close together, the ceremony reads as luck. I ran
2,000 full simulated registrations through the actual shipped code:

- Final house totals: **141 / 141 / 141 / 141, every single time.** Gap of zero.
- Longest run of the same house anywhere in 181 sorts: 4.5 on average, 11 at the
  very worst.

The "Students still to sort" figure is also the mid-event correction knob. If
you've done 100 and 60 are left, type 60 and the target recomputes correctly.

### Chance / Balance slider (the original)

The pre-1.6.0 behaviour, kept as a fallback. The slider runs from pure chance
(left) to strongly favouring the smallest house (right), saved to `Config!B6`.
It aims at whichever house is currently largest, so it corrects greedily and
front-loads the correction.

With your current numbers it works acceptably — the imbalance is mild enough
that even slider 50 finishes with a gap of about 4. If you fall back to it,
**set it to 75.** Slider 100 is not worth it: same result, more streaking.

### Which to use

Use Even Target. It is strictly better on every measure I could test: exact
convergence, shorter streaks, and less front-loading. The slider is there so
that if anything feels wrong on the night you can switch back mid-event with one
tap — I tested switching partway through and both modes still finish level.

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

Once the baseline column from §4 step 2 is in place, the annual rollover is
short:

1. Back up the sheet.
2. Work out the new baseline: current house counts for students who will still
   be enrolled next year. That is last year's baseline, plus the students this
   app sorted, minus the graduating class.
3. Update `Counts!C2:C5` with those four numbers.
4. Optionally archive the previous year's `Roster` rows to a dated tab so the
   Roster stays readable, and fold their counts into the baseline. If you do
   this, the baseline and the Roster must not double-count anybody — that's the
   one arithmetic mistake to watch for.
5. Verify the counts in Ceremony Controls before sorting anybody.

The one thing that makes step 2 easier is knowing which Roster rows belong to
which graduating class. Right now the only signal is the Timestamp column. Ask
about adding a `Class Of` column if this becomes annoying — see HANDOFF.md.

---

## 9. Known limitations

- No edit or undo inside the app. Corrections happen in the spreadsheet.
- No duplicate detection at sort time. Use the conditional formatting in §7.
- No grade or graduation-year column on the Roster, so identifying a specific
  cohort later means going by Timestamp.
- Google sessions last about an hour; long events need a re-sign-in.
- Counts are read at the moment each sort begins. Two stations confirming
  within the same second both act on the same numbers. Harmless at this scale.
- The correction is front-loaded — heaviest streaking happens at the start of
  registration. See §5.
- Requires internet. There is no offline mode.
