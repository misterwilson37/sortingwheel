# Sorting Wheel

A house-sorting ceremony app for Ellis Middle School. A staff member types a
student's name, taps SORT, an animation plays, a house is revealed with
confetti, and on Confirm the assignment is written to a Google Sheet.

Multiple devices can run simultaneously and stay in sync, because the
spreadsheet — not the browser — is the source of truth.

**Live app:** https://sortingwheel.misterwilson.org
**Short link for staff:** https://sortingwheel.misterwilson.org/ellis.html
**The spreadsheet:** https://docs.google.com/spreadsheets/d/1rYZ71el1yPjo1X7F71nI8WQ9LvCqY4g7r-iXr5IYQqE/edit

Current version: **1.5.0**

---

## 1. Files in this repo

| File | Version | What it is |
|---|---|---|
| `index.html` | 1.5.0 | The entire app. HTML + CSS + JS in one file, no build step. |
| `ellis.html` | 1.1.0 | Redirect page. Forwards to `index.html?sheet=<Ellis sheet ID>` so staff only have to remember one short URL. |
| `config.js` | — | Firebase project keys (`categorizingcougar`). Safe to be public; Firebase web config is designed to be. |
| `CNAME` | — | GitHub Pages custom domain: `sortingwheel.misterwilson.org` |
| `README.md` | 1.0.0 | This file. |
| `HANDOFF.md` | 1.0.0 | Technical notes for the next developer / Claude session. |

Deployment is GitHub Pages. Upload the changed file through the GitHub web UI
and it is live in about a minute. There is no build, no CLI, no bundler.

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

Houses start at **row 9** and are read downward until the first blank name.
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

## 3. The decision you have to make before registration

The balance slider steers new students toward the **smallest houses by current
Roster count**. So what lives in the Roster determines what "balanced" means.

**Option A — Roster holds only the incoming class.**
Purge everyone who isn't a rising 6th grader. Result: the 150 new students
split near-evenly among the four houses. Their house sizes as a *cohort* will
be within a few students of each other.

**Option B — Roster holds all current students, minus those who left.**
Delete only the departing 8th graders. Result: house sizes are balanced
*school-wide*, which means the incoming 6th grade class itself may be
noticeably lopsided — because it is being used to correct whatever imbalance
already exists in grades 7 and 8.

I simulated 3,000 registrations of 150 students at the default slider setting
of 50 to show the size of this effect:

| Starting Roster | Spread *within the new 6th grade class* | Spread *school-wide* when done |
|---|---|---|
| Empty (Option A) | ~4 students | n/a |
| 300 students, uneven 85/78/72/65 (Option B) | ~20 students | ~4 students |

Neither is wrong. But **Option B can hand you a 6th grade house that is 20
students bigger than another**, which matters if houses compete by grade level
or if 6th grade houses meet as groups. Pick deliberately.

If you want both — even cohorts *and* even school totals — that needs a code
change to scope counts by graduating class. See HANDOFF.md, "Open items."

---

## 4. Registration prep checklist

Do these in order. Steps 1–8 before registration day.

**1. Back up the spreadsheet first.**
Open the Sheet → File → Make a copy → name it
`Sorting Wheel Backup <today's date>`. Do this before touching anything. It is
your only undo.

**2. Decide roster scope.** See §3 above.

**3. Purge the students who are leaving.**
On the `Roster` tab, sort or filter to find them, select those *rows*,
right-click → **Delete rows**. Do not "Clear contents" — leaving empty rows
behind confuses where the app appends new records.

There is currently no grade or graduation-year column, so you may have to
identify departing students by the Timestamp column (when they were sorted) or
by cross-referencing your own roster. **Consider adding a graduation-year
column before this year's registration** so next summer's purge is a
30-second filter instead of detective work. See HANDOFF.md, "Open items."

**4. Confirm the header row survived.**
`Roster` row 1 must still read `Name | Student # | House | Sorted By |
Timestamp`. If the sheet is completely empty, the app will write its first
student into row 1 and that student becomes the header.

**5. Check the `Counts` tab.**
Should show all four houses with counts matching what's left in the Roster.
If a count reads 0 when it shouldn't, the house name in `Config` and the house
name in the `Roster` rows don't match exactly — usually a trailing space.

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

## 5. The balance slider

Bottom-right of Ceremony Controls, admin only. It is saved to the spreadsheet
(`Config!B6`), so all stations share one setting.

- **Left (0)** — pure chance. Every house equally likely every time.
- **Right (100)** — strongly favors whichever house is currently smallest.
- **Middle (50)** — the default, a linear blend of the two.

What that means for a 150-student registration starting from an empty roster,
measured as the gap between the biggest and smallest house at the end:

| Slider | Typical gap | Worst case seen in 3,000 sims |
|---|---|---|
| 0 (pure chance) | 13 students | 35 |
| 25 | 6 | 25 |
| **50 (default)** | **4** | **13** |
| 75 | 3 | 9 |
| 100 (full balance) | 2 | 7 |

The default of 50 is a reasonable place to be: the outcome still feels random
to students, and you're very unlikely to end up embarrassingly lopsided. If
even house sizes matter more than the feeling of chance, go to 75.

"Show Probabilities" reveals the live odds per house. Useful for confirming the
slider is doing what you think, but consider hiding it if students can see the
screen — it makes the ceremony feel mechanical.

---

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

## 8. Known limitations

- No edit or undo inside the app. Corrections happen in the spreadsheet.
- No duplicate detection at sort time. Use the conditional formatting above.
- No grade or graduation-year column, which makes the annual purge manual.
- Google sessions last about an hour; long events need a re-sign-in.
- Counts are read at the moment each sort begins. Two stations confirming
  within the same second both act on the same numbers. Harmless at this scale.
- Requires internet. There is no offline mode.
