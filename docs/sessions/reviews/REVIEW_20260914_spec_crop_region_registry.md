---
type: review
handoff: HANDOFF_20260914_spec_crop_region_registry.md
reviewer: review agent (dispatch), branch review/spec_crop_region_registry
date: 2026-09-14
verdict: APPROVE
blockers: 0
---

# Review — spec_crop_region_registry

Declared crop regions for spec-pile citations. Four deliverables, all present:
the registry (`docs/spec_library/crop_regions.json`, schema
`joby.tolerance_stack/spec_crop_regions/v0`), the recording verb
(`scripts/record_spec_crop_region.py`), consumption in
`scripts/build_viewer_crops.py`, and the SOP / spec-library note.

## The check that mattered: are the rects over the right ink?

Every test in this handoff is necessarily *internal* — ordering, uniqueness,
that each live citation resolves to the label it names. None of them can see
whether a rect is over the right row, and a rect two bands low loads, resolves,
renders, and shows the neighbouring row's digits under the cited row's name.
That is this repo's one rule at the placement layer, so I re-rendered it.

Clipped all **13** shipped rects out of
`data/inbox/specs/NAS6403-NAS6420 Rev 4.pdf` at 8x (drawing-checker's venv,
PyMuPDF) and read each crop against two independent transcriptions: the entry's
own `shows` string, and the citing element's `callout`. **All 13 agree on every
digit.**

| region | crop reads (dash / grip / NAS6403 / NAS6404) | citation's callout |
|---|---|---|
| Grip Dash No. 2 row | 2 · .125 · .448 · .495 | Grip = .125, NAS6403 = .448 |
| Grip Dash No. 3 row | 3 · .188 · .511 · .558 | .188 / .511 |
| Grip Dash No. 4 row | 4 · .250 · .573 · .620 | .250 / .573 |
| Grip Dash No. 5 row | 5 · .312 · .635 · .682 | .312 / .635 |
| Grip Dash No. 6 row | 6 · .375 · .698 · .745 | .375 / .698 |
| Grip Dash No. 7 row | 7 · .438 · .761 · .808 | .438 / .761 |
| Grip Dash No. 8 row | 8 · .500 · .823 · .870 | .500 / .823 |
| Grip Dash No. 9 row | 9 · .562 · .885 · .932 | .562 / .885 |
| Grip Dash No. 10 row | 10 · .625 · .948 · .995 | .625 / .948 |
| Grip Dash No. 11 row | 11 · .688 · 1.011 · 1.058 | .688 / 1.011 |
| Grip Dash No. 13 row | 13 · .812 · 1.135 · 1.182 | .812 / 1.135 |
| Grip Dash No. 14 row | 14 · .875 · 1.198 · 1.245 | .875 / 1.198 |
| NAS6403 row, sheet 1 | headers + NAS6403 · .1900-32 · C .376/.367 · … · M .174/.154 | M = .174 / .154 |

The sheet-1 entry's `shows` is honest about its own limit — it says the columns
right of `M` (`N`, `P`, `R Rad`, `T`, `TD`) are outside the rect, which matters
because `cotter_hole_from_point`'s callout also mentions drill `P`. The cited
value is `M`, and `M` is in the crop; the whole sheet stays one click away
through the existing source-PDF link.

I also verified the "sixty-four-row table" claim that the registry notes, the
module docstring and `ARCHITECTURE.md` all make: sheet 3's grip table runs
1–32 by ones then 34–96 by twos = **exactly 64 rows.** Not a restated guess.

At the production zoom (3x, as committed in `crops.json`) both a dash row and
the sheet-1 band are legible — I read the shipped
`tan_link_to_pitch_plate__fastener_grip_13.png` (322×25) and
`pitch_link_to_pitch_plate__cotter_hole_from_point.png` (947×128) directly.

## Guards, observed failing

Not accepted on green. Four breaks in the worktree, each reverted, tree clean
after:

- Changed one region's `match` from `"Grip Dash No. 13"` to `"… No. 12"` →
  `test_every_live_pile_citation_resolves_to_the_row_it_cites` failed naming
  `tan_link_to_pitch_plate:fastener_grip_13` and the reason (*"12 regions are
  declared … and this citation's where-ref text names none of them"*). Right
  file, right citation, right fix implied.
- Transposed the dash-5 and dash-6 rects (right labels, swapped bands) →
  `test_the_grip_rows_are_ordered_down_the_sheet` failed at the swapped index.
- Re-indented one key by hand →
  `test_the_shipped_registry_is_written_by_the_verb_not_by_hand` failed, which
  is what keeps "everything in this file came through the verb" true.
- Renamed the minted literal to `declared_region_v2` in `locate()` →
  `test_the_js_status_table_spells_exactly_what_python_enumerates[CROP_PLACEMENTS]`
  failed with both sides printed. Renaming the JS table key instead produced
  **two** failures including the `[real]` value guard (*"crop entry located_by =
  \"declared_region\" is in the live projection and the viewer has no branch for
  it"*) — so the new pairing observes the real projection, not a fixture proxy.

## Verification

- `venv-win/Scripts/python.exe -m pytest -q` from the merged review branch:
  **863 passed, 1 skipped.** The skip is the node-fs tier (no projection in this
  worktree's `data/`); the handoff's own 817 was pre-merge, with `integration`
  since moved.
- `node apps/viewer/run_tests.cjs`: **248/248**.
  `… --repo C:\workspace\tolstack` (the `[real]` tier included): **299/299**.
- Live crops, rebuilt into the main checkout by the author: **16** entries now
  carry `located_by: "declared_region"` — the DoD asked for at least one. Four
  resolve by `spec_pile`, twelve by a `source_ref.export` block pointing into
  the pile; all sixteen crop the row rather than the sheet.
- **Read-only invariant holds.** Nothing was written into drawing-checker. Its
  only files touched on 2026-09-14 are its own dispatch prompts/state and
  `data/logs/eager/eager_pass_20260914.log`, whose first line reads
  `repo=C:\workspace\drawing-checker` — its own scheduled eager pass, not this
  handoff, which borrowed only the interpreter.
- **No test pollution.** Main-checkout `git status` clean, and nothing under
  `data/` modified by either of my pytest runs.
- **`data/inbox/specs/` untouched** — nothing renamed, added or tidied; the diff
  contains no `data/` path at all. `docs/reference/` untouched.
- `ARCHITECTURE.md` gained a row for each new module plus a section; the
  inventory-pairing test passes.
- Issue frontmatter on the handoff's own filed issue is correct and complete
  (`type: chore`, `priority: med`, `status: open`, `area`, `reporter: agent`).

## The deviation from the handoff, and why it is right

The handoff asked that the crop entry record the region as *"a new `resolved_by`
value … `VA.CROP_RULES` is total-by-contract and needs the new row"*. The author
used **`located_by`** instead. I checked the stated reason rather than taking
it: `apps/viewer/tests.js:4518`, `[real] the marked citations are exactly the
spec_pile-resolved ones`, asserts set equality between the elements carrying a
derived `identity_rule` and the crops with `resolved_by === "spec_pile"`.
Minting `spec_pile_region` would have split that set and turned a placement
change into a red test about citation *identity*. `located_by` is the field that
already means "where on the sheet".

The handoff's actual intent — an enumerated field needs a total function — was
honoured and then some: the `if`/`else` chain became `VA.CROP_PLACEMENTS`, the
`tests.js` value guard moved from a hand-kept `inList` to the strong form
(`!!VA.CROP_PLACEMENTS[v]`), and a seventh Python↔JS pairing was added, scoped
by AST to `locate()` so a future forwarding site needs no hand exclusion.
Correct call, correctly disclosed.

The second deviation — the rule fires for **any** citation whose resolved PDF
lives in `data/inbox/specs/`, not only `kind: "spec"` ones — is also right and
also disclosed: a region is a fact about the bytes, and keying on the rule would
have left `bolt_grip_11` showing a photocopy while `fastener_grip_13` showed its
row, same table, same sheet, no difference a reader could see.

## Findings

No blockers. Nothing invented; `source_ref` schema untouched; no viewer layout
code touched; the registry is *placement* and cannot make an untraced value
traced, which `ARCHITECTURE.md` says in as many words.

**Nits — none fixed inline; the first is filed:**

1. **`record_spec_crop_region.py` tracebacks on a missing `--registry` path.**
   `scr.load()` sits inside the `try` that catches `(RegistryError, Refused)`,
   but a missing file raises `FileNotFoundError`, which is neither. Every
   *other* misuse of this verb prints `refused: <the whole report>` and returns
   2, so this is the one rough edge in a CLI whose selling point is that it
   refuses cleanly. Filed as
   `ISSUE_20260914_record_spec_crop_region_tracebacks_on_a_missing_registry.md`
   (`type: bug`, `priority: low`) rather than fixed inline, because a new
   refusal path is a behaviour change that wants its own test.
2. **The command sketch in `docs/spec_library/README.md` omits two required
   flags** (`--recorded`, `--recorded-by`), so as printed it is an argparse
   error. It is visibly elided (`--document ...`) and points at `--help` in the
   next sentence, so this is cosmetic.
3. **`tests/test_spec_crop_regions.py`'s live scan keys on
   `source_ref["document"]`; production keys on the resolved `pdf.name`.** They
   agree for all sixteen live citations because every export block points at the
   pile file under its own name — but it is a proxy, and it would be silent on
   exactly the case where the two diverge. Worth a docstring line if anyone
   touches it; not worth a change today.

**Fixed inline, disclosed, on my review branch:** the author's own
`ISSUE_20260914_the_shared_viewer_projections_are_from_two_different_trees.md`
told a future reader that the mixed-tree state is detectable by running the JS
`[real]` tier against the main checkout. That is no longer true: from this
review branch — cut from `integration`, which contains both sibling handoffs —
the same command is **299/299 green** while the three projections genuinely
carry three different `provenance.branch` stamps
(`handoff/spec_crop_region_registry`, `handoff/stack_title_style_pass`,
`review/annotate_affordances_flyout_and_mesh_gating`). I rewrote that one
section to point at the stamps instead. The issue's substance, priority and
remedy are unchanged — the state is real and the issue stays open.

## Note for the next reviewer

Two shapes here outlive this handoff and are now in the overlay: a declared-rect
registry can only be reviewed by **re-rendering the rects**, and a substring
`match` rule has to be checked against the strings already in the file in *both*
directions, not just against today's citations. The live trap is the
sole-region fallback — the second region recorded on a sheet silently changes
what the first citation there gets.
