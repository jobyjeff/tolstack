# LESSONS 2026-09-22 — stack_page_alert_marks_and_drawn_glyph

Three deliverables: fold the materials table's source column into the page's one
quiet mark, stop typing the `⚠` character on the viewer's table badge, stop
typing it on the annotator's. All three shipped. The handoff named three
decisions as mine to make and record; they are the first three sections here.
The fourth section is the one thing the live data said that nothing in the
handoff or either source issue expected.

---

## Decision 1 — where the values words live: exactly where they already did

`VA.VALUES_CHIP_TEXT` (`viewer.js`) was already the one spelling of
`CTE NOT TRANSCRIBED` / `VALUES STATUS UNKNOWN`, read by two renderers. The
fold added a third reader and **no fourth spelling**: a new
`VA.materialRowAlerts(authored)`, defined immediately below that table, turns a
loud `VA.valuesProvenance` state into the `{kind, text, why}` shape
`VA.alertBadge` and the `alerts` card already render.

The handoff suggested "a `values` branch on `VA.rowAlerts`" as the cheap and
probably right answer. **It is not what I did, and the reason is the parameter
list.** `VA.rowAlerts(element, derived)` takes an elements-table row and its
derived projection row; a material entry is neither, so reaching a third branch
would have meant passing it something that means "whatever the caller happens to
hold". The shape this repo already uses is **one small alert-list function per
surface**, each reading the shared vocabulary rather than restating it —
`VA.rowAlerts` here, `VA.studyNavAlerts` and `VA.stackNavAlerts` in
`topology.js`. This is the fourth of those, which makes it the boring choice
rather than a new pattern.

`views/detail.js`'s pane still renders the words as a chip, and that is
deliberate: the pane is what a click asked for. What the fold removed is the
words from an **always-visible** column, which is what Jeff's sentence was
about.

## Decision 2 — the chip framing does not survive in a table cell

The mark is `.rowalert` now: `display: inline-flex; align-self: center;
flex: none; line-height: 0; color: var(--inferred)`, holding
`VA.warningIcon` — no border, no radius, no background. Two reasons, both the
ones the nav rail's `.navstatus` gave a day earlier:

* a border around the only alert marker on a row is a **second mark**. That is
  the argument `.chip--alert` itself made in 2026-09-16 against the filled chips
  it replaced, and the one `.navstatus` made against `.chip--alert` in turn;
* unframed, the mark is the one thing in a cell of three or four outlined chips
  that is **different in kind**. The chips state the row's provenance; this says
  "distrust the number". A pill among pills reads as a fifth fact.

**A third reason I wrote first was wrong, and catching it is the most useful
thing in this session.** I argued — in `views/dom.js`, in `style.css`, in a
fast-tier message and in a new browser check — that a 16px picture inside a
`.chip` would render ~20px tall against ~15px chips and, via
`.el-row__chips`' default `align-items: stretch`, drag every sibling chip up to
match; so the frame had stopped being a frame and become a row-height decision.
I wrote the browser check to assert it. **It measured `16px mark, 21px chip`**:
a `.chip` is micro type at the body's line-height plus padding and border, so a
framed mark would have fitted inside the height the chips already set and cost
nothing. The frame-removal decision stands on the two reasons above; the third
was a plausible-sounding invention.

The check that caught it was replaced by one that pins something real, and the
wrong argument is recorded rather than deleted (`views/dom.js`, `style.css`, and
the browser tier beside the replacement) — because it is exactly the reason a
later pass would reach for again. What the replacement pins: **the mark is
centred against the chips beside it**, which is what `align-self: center` buys
and which nothing but a layout engine can see. Verified non-vacuous by
commenting that declaration out — `602 vs 604`, and it is the only sub-check
that moves.

*Generalisable:* a comment that explains a CSS decision by predicting a
measurement is a claim, and this repo's own posture applies to it — write the
check, or do not write the sentence. Mine was wrong for one run and would have
been quoted as fact by the next reader.

## Decision 3 — a shared file, not a copy, for the annotate icon

`apps/viewer/warning_icon.js`: `VA.WARNING_ICON_PATH`, `VA.WARNING_ICON_PX`,
`VA.warningIcon`, moved out of `views/dom.js`. `apps/annotate/index.html` loads
it as a sibling, and `apps/annotate/run_tests.cjs` loads it across the same
boundary.

The handoff offered a deliberate copy with a pairing comment as acceptable. I
took the file because **the precedent for sharing JS across these two apps is
direct, documented and already twice-used**: `../viewer/storage/adapter.js` (the
shared "may this page ask for a folder grant?" decision) and
`../viewer/reader_facing_bans.js` (the shared list of strings neither app may
print), whose headers both say a second copy of a shared vocabulary is this
repo's most-repeated defect. A shared definition needs **no drift guard at
all**, which beats a copy plus an assertion.

Two details worth knowing before doing this again:

* the precedent that points the *other* way is `tests/test_app_type_scale.py`,
  which copies the type scale into `apps/annotate/style.css` on purpose and
  makes a test the coupling — because the two apps deliberately share no
  **stylesheet**. That reasoning is about CSS and does not reach JS.
* the annotate side reaches it through `AA.warningIcon` (`binding_state.js`),
  not from `app.js`. That is this app's existing rule for the other shared
  thing (`AA.chooseTransport`, `storage/adapter.js`): a renderer does not touch
  the viewer's namespace, and a missing sibling file fails with a sentence
  naming the file instead of `undefined is not a function`.
* the shared file does **not** use `VA.svg`, and that is the one price of the
  split: the annotate page has no `views/dom.js`, so the file carries a
  four-line namespace-aware element creator of its own. A helper duplicated, not
  a fact.

The annotate guard was rewritten rather than dropped, as the source issue asked.
It now proves **delegation** (substitute the viewer's function, watch the call
land), that the missing-sibling error names the file, that `AA` defines no
geometry of its own, and that the path data is path data — a moveto followed by
nothing but commands and numbers, at a numeric pixel size ≥ 14. That the
*rendered* badge is a sized `<path>` with no text in it is asserted in the
browser tier, where a DOM exists.

---

## What the live data said, and it is not what either source issue assumed

**The chip this handoff was written to fold has never rendered on a live stack
page.** All six live material entries — three on `hub_bearing_thermal_fit_m1`,
the same three on `_m2` — carry `values_status: "inline"`, whose `loud` is
`false`. `viewer.js` already said half of this next to the sentences ("only one
of the three was ever reachable by live data"); nobody had connected it to the
chip.

So the handoff's first definition-of-done bullet — *"on the live
`hub_bearing_thermal_fit_m1` and `_m2` stack pages, the materials table's
source column carries at most a quiet mark per row"* — is satisfied
**vacuously**: it carried none before and carries none now. The before/after
pair of that live column is pixel-identical, and it is committed here for that
reason:

| | |
|---|---|
| `…_2_materials_source_cell_live_before.png` | `UNTRACED` · `workbook` · `designation: NO CITATION` |
| `…_2_materials_source_cell_live_after.png` | identical |

What a reader of that column actually meets is **two filled chips on every row**
— the CTE's confidence and the designation's. Those are exempt from the fold by
a rule this repo wrote down on purpose (`VA.rowAlerts`: *"the confidence chip,
the kind chip and the material chip … are the row's primary provenance
signal"*), and whether a *second* confidence axis belongs on an always-visible
row at all is a design call, not mine. Filed:
`ISSUE_20260922_the_loud_chips_in_the_live_materials_source_column_are_the_two_provenance_chips.md`
(`audience: strategy`, with the screenshot and the three honest options).

The fold's own visual witness had to be manufactured, which is the second
finding: **no browser surface renders a materials table at all.** `?mock=1`
offers `demo_joint` and `demo_joint_standalone`, neither with materials; the one
fixture stack that has them (`VA.generatedFixture()`'s `demo_fit`) is never put
into a page. I shot it by rendering that fixture into `#stackview` by hand from
a throwaway script — the technique `tests/debug_flyout_and_alerts.mjs` uses for
a *retired* presentation, which is the wrong technique for something that ships.
Filed: `ISSUE_20260922_no_browser_surface_can_render_a_materials_table_at_all.md`
(chore, with the two sub-checks whose counts have to move with the fixture).

## Screenshots, and what each pair is for

All in this directory, prefixed `LESSONS_20260922_stack_page_alert_marks_and_drawn_glyph_`:

1. **`1_elements_source_cell_mock_{before,after}`** — deliverable 2, `?mock=1`'s
   washer row (zero-width AND unestablished). A rounded amber chip with an 11px
   glyph in it → a 16px drawn triangle with no box.
2. **`2_materials_source_cell_live_{before,after}`** — deliverable 1 on live
   data: **identical**, for the reason above. The evidence for the finding, not
   for the change.
3. **`3_elements_source_cell_live_{before,after}`** — deliverable 2 where it
   really lands for a reader: `pitch_link_to_pitch_plate`'s unestablished
   bushing, on the live projection.
4. **`4_annotate_rail_mock_{before,after}`** — deliverable 3. Two of three rows
   badged; the character was noticeably smaller and thinner than the drawn mark
   at the same row size, which is the whole argument for drawing it.
5. **`5_materials_source_cell_fixture_{before,after}`** — deliverable 1's actual
   change, rendered from `VA.generatedFixture()` in the page: three stacked
   all-caps chips → two chips and one quiet mark.

## Is the 2026-09-16 "loud" thread empty?

**Yes, as written — every half of
`ISSUE_20260916_the_viewer_nav_rail_may_be_the_left_side_menu_jeff_called_loud`
has now shipped, and it can close.** The question behind it moved rather than
closed: the two filled provenance chips above, in the new strategy issue. A
reader wanting one line: *the issue is done; the column it pointed at is still
loud for a different reason, and that reason needs a sentence from Jeff.*

## Three things the next agent should not have to rediscover

* **Running the tiers from a worktree.** Both viewer tiers take `--repo`; the
  browser one also needs `playwright-core`, so a directory junction from the
  worktree to `C:\workspace\tolstack\node_modules` (`New-Item -ItemType
  Junction`) is the whole trick — the 2026-09-22 nav lesson records it and it
  still works. **Remove it before finishing.** I did.
* **A deleted constant makes an absence check vacuous.** Two fast-tier checks
  asserted `root.textContent.indexOf(VA.ALERT_ICON) === -1`. With the constant
  deleted they assert that the string `"undefined"` is absent and pass over
  anything. They read a suite-local `TRIANGLE_CHARACTER = "\u26A0"` now —
  spelled as an escape, so a grep for the glyph over `apps/` still finds only
  prose.
* **`grep -n '⚠' apps/` found a fourth site nobody had named**:
  `views/banner.js`'s stale-data summary typed it in front of its sentence, with
  no semantic colour at all, in the one box on the page that means "do not trust
  what you are reading". Fixed in the same pass (it is the same defect, and the
  definition of done's own grep is what surfaced it), with a
  `.banner__stale-summary` flex line and the box's `--untraced` colour on the
  mark.

## What is left red, and why I did not fix it

`tests/test_mutation_witnesses.py` has **three failures on this branch**, all
from one registry entry: `alert-badge-is-not-filled` anchors at the
`.chip--alert` declaration this pass deletes and at the browser sub-check name
this pass reworded. The anchor-rot guards did exactly what they exist for.

I did not repair it because this handoff's scope says, in as many words, **"Do
NOT touch `scripts/mutation_witnesses.json`"** — `HANDOFF_20260922_mutation_witness_repair_and_enrollment`
owns that file, is staged, and is already told to enroll what another handoff
added. Filed with a **verified** paste-ready replacement (every string checked
against that module's own `source_of` / `joined_source` / `expect_red_hits` /
`suite_registry_keys`, `find` → 1, `expect_red` → 1, the character after the
name in the joined source is `"`, suite key still dispatches):
`ISSUE_20260922_the_alert_badge_mutation_witness_anchors_at_the_retired_chip_rule.md`.
It has **not** been replayed through the browser tier, which is what "witnessed"
means — the issue says so.

That issue also carries a smaller finding in the guard itself:
`test_no_expect_red_is_a_truncated_check_name` fails with a bare
`ValueError: substring not found` rather than an assertion naming the entry,
because it `.index()`es a name the pairing test above it has already reported as
absent.
