# LESSONS 2026-08-10 — viewer_source_ref_export_label

Handoff: `HANDOFF_20260810_viewer_source_ref_export_label.md` (worked 2026-08-11).
Issue: `ISSUE_20260806_viewer_does_not_label_the_source_ref_export_rule.md`, now
`status: resolved`.

What landed: `VA.CROP_RULES` (a table, replacing the if/else chain) with a loud
unlabelled fallback and `VA.unlabelledCropRules()`; `VA.cropShaText` keeping the
three sha states distinct; the banner reading `summary.sha256_verified` and
`summary.by_resolved_by` (`VA.shaCountsText`, `VA.cropRulesLine`, a
`.banner__crop-rules` line); `fixtures.js` brought to the live shape; 11 new
tests, four of them `[real]`. JS 95/95 (was 84/84), Python 340 passed / 1 skipped.

## The durable finding, and it is not "the fixture was out of date"

The handoff's framing — *a JS fixture hand-written from an older data shape let a
green suite pin behaviour the live data cannot produce* — is right, but the
sharper version is what a fix has to target:

**The stale thing was a VALUE inside a field that was present and correctly
named.** `resolved_by: "provenance.sources_used"` is the same key, the same type
and the same position as `resolved_by: "source_ref_export"`. So:

- a schema/key-set comparison between fixture and real data **would not have
  caught it**. I added one anyway (see below) and it is worth having, but it is
  not the guard for this bug;
- what catches it is a value-level assertion: *for every value the live data puts
  in the field the viewer switches on, the viewer has a branch.* That is
  `eq(VA.unlabelledCropRules(realCrops), [])` in the `[real]` tier, plus the
  unlabelled branch being loud on screen so the same fact surfaces to a reader
  even where no test looked.

Generalisation, and it is the twin of `viewer_projection_provenance`'s ("a
provenance field that cannot differ between the things it is meant to distinguish
is not provenance"): **an enumerated field needs a total function, not an
if/else chain.** Every `else if` chain over a value the data owns has a silent
default, and a silent default cannot be distinguished from a handled case by
reading the code — which is exactly how a reader concluded the case was handled.

## Should the fixture be generated from real `crops.json`? No — checked against it

Recommendation: **keep it hand-authored, add cheap guards.** Reasons, in order:

1. The fixture is *deliberately not* a copy of a real stack. It exists to hold
   every provenance state in one small object — a traced element, an untraced
   one, a zero-width band, an INCOMPLETE check, a resolved crop, an unresolvable
   crop, and an element `crops.json` has never heard of. **No real stack contains
   that combination**, so generating from real data would lose the states the
   fixture exists for. (The `no-entry`/stale-index case in particular can only be
   fabricated: a freshly built `crops.json` never has it.)
2. It also feeds `index.html?mock=1`, and its header says nothing in it is a
   claim about a Joby part. Generating it would put real drawing numbers and real
   bands into that file.
3. The gap is closable without generation, in two assertions:
   - **key-set drift** — `[real] the fixture's crop shapes still match the
     builder's` compares the fixture's resolved entry, unresolvable entry,
     `summary` and `summary.sha256_verified` key sets against the live
     `crops.json`. A field added to (or dropped from) the builder fails there,
     naming `fixtures.js` as the thing to update.
   - **value drift** — `[real] every rule in the live crops.json has a label`.

## Yes, the same gap exists in the viewer's other fixtures — audited, six places

Ran the key-set diff over `results.json` too (script in the scratchpad; it is ten
lines against `VA.demoFixture()` / `VA.generatedFixture()`). Every difference is
in the *omission* direction — no fixture carries a field the projection has
dropped — and the two that matter are:

- **`source_ref.export`** is in every live citation since 2026-08-06 and in **no
  fixture**. So the fixture tier cannot pin how the viewer renders it — and
  `grep export apps/viewer/views/stack.js` returns nothing: it renders none of
  it. Filed as `ISSUE_20260811_viewer_shows_nothing_for_source_ref_export.md`
  (the `status: "unestablished"` case is the sharp one: the stack says outright
  that the bytes cannot be identified, and the element row looks like any other).
- **`materials[].material.library_ref` / `values_status`** — same story, and
  `library_ref` is the provenance of a *number*.

Plus `source_ref.cell`/`element_id`/`run_id`, the embedded raw stack's own
`schema`/`id`/`title`/`units`/`paths`/`checks`/`provenance`, and
`hardware_entries.schema`/`description`/`provenance`. Full table and three
options in `ISSUE_20260811_viewer_fixtures_lag_the_live_projection_shape.md`.

## Decisions I made that the handoff left open

- **`joint_export_run`: kept, labelled `LEGACY RULE`, script untouched.** The
  handoff allowed either. Kept because it is genuinely reachable — the input is
  a citation with no `source_ref.export`, of kind drawing/parts_list, whose
  `document` equals the stack's `joint.assembly_drawing`, in a stack whose
  `joint.assembly_export` names a drawing-checker run id. No stack in the repo is
  shaped that way now, but one written before 2026-08-06 is, and the script still
  resolves it. Removing the script's fallback would be a behaviour change to the
  builder inside a viewer-labelling handoff. The label says the export is pinned
  by the **joint block, not by this citation**, which is the difference that
  matters, and the banner marks it `(LEGACY rule)` if it ever appears in a count.
- **`spec_pile` got a label too.** The handoff named three branches; the crop
  script emits three *rules* and `spec_pile` was one of the two the viewer did
  label — but with four words ("from data/inbox/specs/") and no verification
  state at all, on the rule that has none. It now says *"— no sha256 to verify"*,
  because "no sha to check" and "sha not verified" reading the same is the bug
  one notch down. It also matters more than the handoff knew: 4 of the 26
  resolved crops are `spec_pile` (see the count correction below).
- **The export filename is repeated.** The popover header already reads
  `212966-006-A.pdf · sheet 3`, and the provenance line now names the file again.
  Deliberate: the header says *which file you are looking at*, the provenance
  line **asserts that this file is the export the citation names** — it is the
  subject of the sha claim, and a sentence that says "sha256 VERIFIED" without
  naming what was verified is the kind of unqualified provenance claim this file
  already avoids for callout needles.
- **Did not touch the banner's stacks-dir/branch/sha fields** (the fence in the
  handoff). Note `viewer_projection_provenance` has since merged to `master`, so
  its work is in this branch's baseline — there was nothing to rebase across, and
  its `provenanceLine`/`provenanceAlarms` and their tests are untouched and green.

## The counts in the handoff are stale — 26/22/4, not 24/24

The handoff and the issue both say *all 24 resolved crops carry
`source_ref_export`*. At the time of the fix the live projection has **26
resolved of 48 citations: 22 `source_ref_export` and 4 `spec_pile`** —
`fastener_citations_and_confidence` (merged 2026-08-10) added the four spec-pile
fastener citations in between. Two consequences worth carrying forward:

- a handoff that quotes counts from a projection is quoting a *rebuildable
  artifact*; read `summary` before trusting them. Every test I added derives its
  expected numbers from `realCrops.summary` rather than hard-coding, precisely so
  the next fastener citation does not turn a passing suite red for no reason.
- the `sha256_verified` rollup is `{"true": 22, "false": 0, "unverified": 4}` —
  the 4 are the spec-pile ones, which have no sha *by design*. Note the crop
  script's own console report calls the `false` bucket "MISMATCHED"
  (`summary_lines`), which is misleading: a real mismatch raises `Unresolvable`
  and never reaches a resolved row, so `false` can only mean "the rule had a sha
  slot and nothing to put in it" (`pdf_from_run` with a run that recorded no
  sha). The banner says `NOT VERIFIED` instead. I did not change the script's
  wording — out of scope, and low-harm since the bucket is empty.

## Smaller things the next agent would otherwise rediscover

- **I did not rebuild the projection**, per the handoff's caution. `built_at` was
  `2026-08-11T05:05:18+00:00` — same day, from `master` — so reading it was
  strictly better than a rebuild that would have needed drawing-checker's venv
  and could have collided with a live worktree. Nothing in this handoff requires
  a rebuild: every field it reads (`resolved_by`, `sha256_verified`,
  `summary.by_resolved_by`) was already there. **`built_at` unchanged, before and
  after.**
- **Run the JS suite with forward slashes**: `node apps/viewer/run_tests.cjs
  --repo C:/workspace/tolstack`. With `C:\\workspace\\tolstack` under the Bash
  tool the backslashes are eaten and the runner silently reports the node-fs tier
  *skipped* — 68/68 green while the whole real-data tier never ran. The skip line
  names the mangled path, which is the only tell.
- **Demonstrating against real data without a browser** is ~15 lines: `vm`, load
  `config.js` + `viewer.js` (+ `storage/adapter.js` if you touch `fixtures.js`,
  which needs `VA.STATE`), read `crops.json`, print `VA.builtLine`,
  `VA.cropRulesLine` and `VA.cropProvenanceLine` for each entry. Faster than
  `?mock=1` and it prints exactly what a hover would say.
- **`sha256_verified: false` has no live instance**, so its wording is only
  covered by a fixture-tier test. If a `joint_export_run` crop ever appears, read
  that line on screen before trusting it.
