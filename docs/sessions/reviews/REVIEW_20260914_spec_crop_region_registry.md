---
type: review
handoff: HANDOFF_20260914_spec_crop_region_registry.md
reviewer: review agent (dispatch), branch review/spec_crop_region_registry
date: 2026-09-14
verdict: APPROVE (round 2; round 1 was REQUEST CHANGES, 1 blocker)
blockers: 0 (1 raised in round 1, answered)
---

# Review — spec_crop_region_registry

Declared crop regions for spec-pile citations. All four deliverables are
present and the domain work is, on the evidence below, **correct**: the registry
(`docs/spec_library/crop_regions.json`, schema
`joby.tolerance_stack/spec_crop_regions/v0`), the recording verb
(`scripts/record_spec_crop_region.py`), consumption in
`scripts/build_viewer_crops.py`, and the SOP / spec-library note. Sixteen live
pile citations now crop the row they cite instead of a photocopy of a
sixty-four-row table, which is exactly what Jeff asked for.

Round 1 raised **one blocker** — not about what the code decides, but that the
entire deliverable could be reverted by deleting one line with all three test
tiers staying 100% green — plus three nits. The tactical agent answered all
four in `0046ff5`. **Round 2: APPROVE, merged to `integration`.**

This report is written in order: the round-1 findings stand as written, with a
round-2 section recording what I re-verified myself rather than took on report.

---

## Round 2 — what I verified after the rework

`build_viewer_crops.py` is **not** in the rework diff, so the resolution path is
byte-identical to what I reviewed in round 1 and the committed `crops.json`
remains what HEAD produces. The rework is four tests, a CLI refusal branch, two
docstrings and a lesson section. That is the right shape for answering B1.

**The blocker is closed.** Four tests now enter at `crop_element` /
`crop_topology_edge` — the builder's real entry points, rendering included —
with a `fitz` stand-in in `sys.modules`. The `FakePixmap` size is derived from
the clip, so a crop entry's `width`/`height` says *which rect was rendered*;
that is what makes the `(321, 24)` assertion load-bearing rather than a magic
number (the rect is 107.1 × 8.0 pt at zoom 3, against 610 × 842 for the sheet).

I re-ran the three mutations the author reported rather than believing them,
**and added two of my own**. All five, each reverted with `git status` clean
after:

| mutation | caught by |
|---|---|
| `region = None` in `_crop_from_citation` | 2 failed |
| `region_for(registry, specs_dir, pdf, …)` transposed — the silent-`None` case | 2 failed |
| `crop_element` passes `None` instead of threading `registry` | 1 failed |
| **mine:** keep `located_by: "declared_region"` but crop `page.rect` — the "right label, wrong crop" case this whole handoff exists to prevent | 2 failed, on `rect_pt` and on the pixel size |
| **mine:** drop `region_for`'s pile check so drawings get regions too | 1 failed |

The fourth is the one I most wanted to see, because a seam that only proves
`located_by` was set would have been satisfied by a crop of the wrong rect.
It isn't; the size assertion bites.

**The three nits are all genuinely fixed**, each checked by running it:

1. `record_spec_crop_region.py --registry C:\nonexistent\cr.json` now prints
   `refused: no crop-region registry at … -- the tracked one is at
   docs/spec_library/crop_regions.json … check --registry` and **exits 2**,
   matching every other refusal. An unparseable registry file is caught too
   (`json.JSONDecodeError` added to the `except`). Two tests.
2. The `docs/spec_library/README.md` command now carries every required flag —
   I ran it as printed against the real pile with `--dry-run`: exit 0,
   `dry run: nothing written`, tree clean.
3. `live_pile_citations`'s docstring now states the `source_ref.document` vs
   `pdf.name` proxy out loud and points at the new end-to-end tests as what
   covers the divergence from the other side.

**Suites, re-run by me on the merged branch:** `pytest -q` → **869 passed, 1
skipped**; `node apps/viewer/run_tests.cjs` → **257/257**;
`… --repo C:\workspace\tolstack` → **311/311**, `[real]` tier included. (The
author's lower counts — 823 and 285/285 — are their unsynced branch, as they
said.)

**One thing I fixed on my own branch:** the issue I filed in round 1,
`ISSUE_20260914_record_spec_crop_region_tracebacks_on_a_missing_registry.md`,
was still `status: open` — correctly, since the file lives here and the author
rightly declined to create a conflicting same-path copy. The fix shipped with
the branch the issue was filed against, so `open` would have sent a triage sweep
after a bug that no longer exists. Marked `resolved` with the verified refusal
text and a note saying why; `closed` remains triage's to set.

Nothing else changed in round 2, and no new findings.

---

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

| region | crop reads (dash · grip · NAS6403 · NAS6404) | citation's callout |
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

These are good, and they are why the blocker below is the *only* one.

## Round 1 blocker — ANSWERED in `0046ff5`, kept here as written

### B1 — deleting the one line that wires the registry into the crop builder leaves every tier green

`scripts/build_viewer_crops.py:993`. Replace

```python
region = region_for(registry, pdf, specs_dir, page_no, source_ref, hardware_ref)
```

with `region = None` — the whole deliverable, undone, spec-pile citations back
to whole photocopied sheets — and:

- `venv-win/Scripts/python.exe -m pytest -q` → **863 passed, 1 skipped**
- `node apps/viewer/run_tests.cjs --repo C:\workspace\tolstack` → **311/311**

I ran both. Nothing anywhere goes red, and a rebuild would not change that:
`test_every_live_pile_citation_resolves_to_the_row_it_cites` calls
`scr.resolve` directly, `tests/test_viewer_crops.py` enters at `bvc.locate` and
`bvc.region_for`, and the JS `[real]` value guard only complains about
`located_by` values it has *no branch for* — never about the value going
missing. Nothing in the tree drives `_crop_from_citation`, `crop_element`,
`crop_topology_edge` or `main()`; I grepped.

This is not hypothetical deletion-of-a-line paranoia. `registry` is threaded by
hand as a **trailing positional argument** through six sites added in this diff
— `main()` → `crop_element` / `crop_topology_edge` → `_crop_from_citation` →
`region_for` → `locate` — and `_crop_from_citation` is a function this repo has
recently refactored (it was extracted to be shared between stack elements and
topology edges). A future refactor that drops the thread, or transposes
`region_for`'s positional `pdf` / `specs_dir` (which fails the pile check and
returns `None`, silently), reverts the feature with nothing to say so.

It is the shape the overlay entry **"The whole deliverable is one line from
being silently reverted — mutate the wiring, not just the pure function"**
names, added hours ago by the `viewer_dag_spine_layout` review, where it was
two blockers. I ran the mutation because that entry arrived on my branch with
the mid-review `integration` sync, which is the checklist working as designed.

**Suggested fix (small, and the module was built to allow it).** The pure pieces
are well covered; the *join* is not. `_crop_from_citation` imports `fitz` lazily
at function scope — deliberately, per the module docstring — so a fake `fitz`
in `sys.modules` plus the `FakePage` that `tests/test_viewer_crops.py` already
defines drives it end to end without PyMuPDF. One test asserting that a pile
citation comes back from `crop_element` with `located_by == "declared_region"`
and the right `region_label`, and one asserting a drawing citation does not,
closes it. Any other seam that makes the wiring observable is equally fine —
the requirement is that *something* goes red when the builder stops consulting
the registry. Please add it and observe it failing against the mutated line
before you hand back.

## Verification (of the branch as delivered)

- `venv-win/Scripts/python.exe -m pytest -q`: **863 passed, 1 skipped.** The
  skip is the node-fs tier (no projection in this worktree's `data/`); the
  handoff's own 817 was pre-merge, with `integration` since moved.
- `node apps/viewer/run_tests.cjs`: **257/257** after the `integration` sync
  (248/248 before it). `… --repo C:\workspace\tolstack`: **311/311**, `[real]`
  tier included.
- Live crops rebuilt into the main checkout by the author: **16** entries carry
  `located_by: "declared_region"` — the DoD asked for at least one. Four resolve
  by `spec_pile`, twelve by a `source_ref.export` block pointing into the pile;
  all sixteen crop the row rather than the sheet.
- **Read-only invariant holds.** Nothing was written into drawing-checker. Its
  only files touched on 2026-09-14 are its own dispatch prompts/state and
  `data/logs/eager/eager_pass_20260914.log`, whose first line reads
  `repo=C:\workspace\drawing-checker` — its own scheduled eager pass, not this
  handoff, which borrowed only the interpreter.
- **No test pollution.** Main-checkout `git status` clean, and nothing under
  `data/` modified by any of my pytest runs.
- **`data/inbox/specs/` untouched** — nothing renamed, added or tidied; the diff
  contains no `data/` path at all. `docs/reference/` untouched.
- `ARCHITECTURE.md` gained a row for each new module plus a section; the
  inventory-pairing test passes.
- Issue frontmatter on the handoff's own filed issue is correct and complete
  (`type: chore`, `priority: med`, `status: open`, `area`, `reporter: agent`).

## The deviations from the handoff, and why both are right

The handoff asked that the crop entry record the region as *"a new `resolved_by`
value … `VA.CROP_RULES` is total-by-contract and needs the new row"*. The author
used **`located_by`** instead. I checked the stated reason rather than taking
it: `apps/viewer/tests.js`, `[real] the marked citations are exactly the
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

The second deviation — the rule fires for **any** citation whose resolved PDF
lives in `data/inbox/specs/`, not only `kind: "spec"` ones — is also right and
also disclosed: a region is a fact about the bytes, and keying on the rule would
have left `bolt_grip_11` showing a photocopy while `fastener_grip_13` showed its
row, same table, same sheet, no difference a reader could see.

Both deviations are argued in the lesson. This is the good version of deviating.

## Round 1 nits — all three taken in the rework, kept here as written

1. **`record_spec_crop_region.py` tracebacks on a missing `--registry` path.**
   `scr.load()` sits inside the `try` that catches `(RegistryError, Refused)`,
   but a missing file raises `FileNotFoundError`, which is neither. Every
   *other* misuse of this verb prints `refused: <the whole report>` and returns
   2, so this is the one rough edge in a CLI whose selling point is that it
   refuses cleanly. Filed as
   `ISSUE_20260914_record_spec_crop_region_tracebacks_on_a_missing_registry.md`
   (`type: bug`, `priority: low`) so it survives regardless of what you do with
   it here.
2. **The command sketch in `docs/spec_library/README.md` omits two required
   flags** (`--recorded`, `--recorded-by`), so as printed it is an argparse
   error. It is visibly elided (`--document ...`) and points at `--help` in the
   next sentence, so this is cosmetic.
3. **`tests/test_spec_crop_regions.py`'s live scan keys on
   `source_ref["document"]`; production keys on the resolved `pdf.name`.** They
   agree for all sixteen live citations because every export block points at the
   pile file under its own name — but it is a proxy, and it would be silent on
   exactly the case where the two diverge. Worth a docstring line if you are in
   the file for B1 anyway.

## Fixed inline, disclosed

The author's own
`ISSUE_20260914_the_shared_viewer_projections_are_from_two_different_trees.md`
told a future reader that the mixed-tree state is detectable by running the JS
`[real]` tier against the main checkout. That is no longer true: from this
review branch — cut from `integration`, which contains both sibling handoffs —
the same command is **311/311 green** while the three projections genuinely
carry three different `provenance.branch` stamps
(`handoff/spec_crop_region_registry`, `handoff/stack_title_style_pass`,
`review/annotate_affordances_flyout_and_mesh_gating`). I rewrote that one
section to point at the stamps instead. The issue's substance, priority and
remedy are unchanged — the state is real and the issue stays open.

## Note for the next reviewer

Three shapes here outlive this handoff and are now in the overlay: a
declared-rect registry can only be reviewed by **re-rendering the rects**; a
substring `match` rule has to be checked against the strings already in the file
in *both* directions, not just against today's citations; and the sole-region
fallback is the live trap — the second region recorded on a sheet silently
changes what the first citation there gets.

**Branch state:** `review/spec_crop_region_registry` carries
`handoff/spec_crop_region_registry` (round 1, clean fast-forward), an
`integration` sync, the rework merge (`0046ff5`), and this report. On round 2
APPROVE it was merged into `integration` and pushed. Round 1 left `integration`
untouched, as REQUEST CHANGES requires.
