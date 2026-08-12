# LESSONS 2026-08-12 — viewer_fixture_shape_guards

## The one thing to carry forward: which tier catches what

The whole thread that produced this handoff — `ISSUE_20260806_viewer_does_not_
label_the_source_ref_export_rule`, then `ISSUE_20260811_viewer_fixtures_lag_the_
live_projection_shape` — is made of one mistake repeated: assuming a key-set
test is enough.

**The key-set tier would NOT have caught the original bug.** The failure was
`resolved_by: "provenance.sources_used"` in `fixtures.js`: a field that was
**present, correctly named, and in the right place**, holding a value the crop
script had stopped emitting on 2026-08-06. Every key-set diff — old and new —
compares `Object.keys()` and passes straight through it. It would have passed on
the day the bug shipped and every day of the four it survived.

**The value tier would have caught it, on the first run.** `[real] no live value
is one the viewer has no branch for` asks a different question: for each field
the viewer switches on, does the *live projection* hold a value the viewer has no
branch for? That question is orthogonal to shape, and it is the one the bug
failed. Verified, not asserted: a poisoned copy of the live projection with
`resolved_by` set back to `provenance.sources_used` fails that test by name.

So: **both tiers, always.** Tier 1 catches the builder growing a field the
fixture never hears about. Tier 2 catches the builder changing a value the viewer
never hears about. Neither is a superset of the other, and the cheap-looking one
is the one that misses the bug this repo actually had.

## The design decision worth keeping: ask the viewer, don't copy it

A value guard needs the viewer's vocabulary. There are two ways to get it and
they are not equally good:

* **Ask the viewer** where the viewer owns a table — `VA.CROP_RULES`,
  `VA.confidenceClass`, `VA.verdictClass`. The guard then stays in sync for free:
  teaching the viewer a value teaches the guard. Five of the thirteen rows are
  this form (`known: function` in `VALUE_GUARDS`; the other eight are
  `known: inList`) and they are the ones that will still be right in six months.
* **Pin the vocabulary in `tests.js`**, with a pointer to the line that owns it,
  where the branch is a chain of `if`s (`located_by` in `cropProvenanceLine`,
  `worksheet_source` in `views/worksheet.js`) or a set of CSS rules
  (`.gap--*`, `.croppop--*`). This still fails loudly on a new live value, but it
  is a copy and has to be re-read by hand when the branch changes.

I considered a third form — a *differential* probe, rendering the real value and
a sentinel and calling the field "branched" if the output differs. **Do not use
it.** It is fooled in both directions: `status` is interpolated straight into a
CSS class (`croppop--<status>`), so a sentinel produces different output and the
field looks branched when the prose arm is a default; and `worksheet_source:
"by_name"` produces output identical to a sentinel, so a correct silent default
looks unbranched. I also rejected reading `index.html`'s CSS from the test to
harvest class names: the node-fs tier reads through `--repo`, which points at the
**main checkout**, so a worktree editing CSS would be checked against trunk's.

## `known: NONE` rows are a feature, not a shrug

Three fields — `source_ref.export.status`, `materials[].material.values_status`,
and `source_ref.kind` — have **no viewer branch at all**. `values_status:
"library"` would look exactly like `"inline"` on screen, though one means the
number is a cross-check and the other means it is the source. Those rows pin the
live vocabulary anyway (`["inline"]`, `["established"]`) so the next new value is
a decision rather than a silent no-op. Two of the three are
`viewer_export_and_material_provenance`'s deliverable; when that lands, its
values move from a pinned list to an asked table and the `branch:` note should be
rewritten, not deleted.

## Things that surprised me

**The fixture was describing a `materials.json` the loader would refuse to
read.** `DEMO_BEARING_STEEL` has `values_source: null` — which is the *only*
input that makes the projected material confidence come out `no_source_ref`, the
loudest state and the reason the row exists. But `MaterialEntry.__post_init__`
rejects a null `values_source` when `values_status` is `inline`, and `inline` is
the default. So the row was unreachable from real data: the same class of bug as
the `resolved_by` one, at value level, sitting in the fixture the whole time. It
is now `values_status: "not_transcribed"`, the only legal spelling. That spelling
forces the entry to keep a CTE it claims was not transcribed, which is a wrinkle
in the schema, not in the fixture — filed as
`ISSUE_20260812_not_transcribed_material_must_still_carry_a_cte`.

**The washer's unresolvable reason was a state no live citation is in.** It said
"citation names no export"; the live `unresolved` reasons are only "the source is
a spreadsheet" and "the value is assumed". Putting the `unestablished` export on
the washer (deliverable 3) let the reason become the one
`build_viewer_crops.py` actually writes for that path — `"the export this value
was read from is unestablished: <why>"`. Two assertions followed it: one in
`tests.js` and one in **`scripts/run_viewer_browser_tests.mjs`**, which is
outside the handoff's stated scope but which the fixture change made red. The
browser tier asserts on fixture prose in a couple of places; if you change what
`?mock=1` says, run `npm run test:browser`, not only the fast tier.

**Archetype input blocks break a naive key-set union.** The live raw stack
carries `thermal_fit` — an input block keyed by the archetype's own *name*, read
by that archetype's loader in Python and by nothing in the viewer. A union guard
demands the fixture carry it, and the fixture's archetype is `demo_thermal_fit`
on purpose, so it never can. The guard skips those keys by a name **computed from
the data** (`stacks[].archetype`), not a literal list, so adding an archetype does
not need `tests.js` edited.

**The audit's table missed a row.** `crops.json`'s top level also carries
`built_by`, `crops_dir`, `drawing_checker_available` and `drawing_checker_root`,
none of which the fixture had. Same class as the `results` top-level row that
*was* in the table. Added to the fixture and to the guard; flagged here because it
means the original audit was manual and shape-by-shape, which is exactly what the
guard now automates.

**`node_modules` is gitignored, so the browser tier will not start in a
worktree.** `npm install` in the worktree (one package, `playwright-core`, no
browser download — a couple of seconds). Do **not** run the browser tier from the
main checkout to get around it: it would test trunk's source, not your branch.

## Bounds of what landed

* The key-set guard compares **key unions per shape**, not per-object equality.
  Both sides legitimately vary (a citation with no zone carries no `zone` key).
  It does not descend into every nested shape — `stack.paths[]` and
  `stack.checks[]` (the *authored*, pre-fold spellings now in the fixture) are
  carried so the raw stack's own key set is complete, but their inner key sets are
  unguarded. If a reviewer wants them, they are two more rows in `SHAPES`.
* **`hardware_entries.entries[]` is unguarded on BOTH tiers, and structurally so**
  (noted in review, 2026-08-12). The fixture's `entries` array is empty *on
  purpose* — the demo stack's one `hardware_ref` is the missing-entry state — so a
  key-union guard over it would compare an empty fixture side against a live pile
  and fail on every key. The only thing keeping that honest today is that
  the viewer reads **nothing** out of a hardware entry (`hardware_ref` on the
  element row is the whole surface, `views/stack.js`), so there is no rendering to
  drift from. The day the viewer renders an entry's `values_status` or
  `values_source`, that shape needs a second fixture stack with a populated pile —
  not a row in `SHAPES`.
* The reverse direction (a fixture key no live object has) is checked against a
  per-shape `fixtureOnly` allowlist. There is exactly one entry today —
  `source_ref.export.why`, required when the status is `unestablished` and
  present on nothing in the repo, which is precisely why the fixture holds it.
  **Put the reason in that list**, do not silence a shape.
* The fixture is still hand-authored and still not generated from real data. It
  now exercises three export states in one place — `established` with a sha256
  and a corroborating run (plate), `unestablished` with a `why` (washer), and no
  export at all (eye) — which is the combination no real stack contains and the
  reason generating it was rejected.

## Left for the next agent

`viewer_export_and_material_provenance` renders none of this yet: on screen an
`unestablished` citation is still indistinguishable from an sha-verified one, and
`values_status` / `library_ref` / `designation_source` / `applied_over_c` /
`cindas_request` reach the projection and stop there. The fixture now carries
every one of them, so that work can be pinned at the fixture tier instead of
against live data.
