# Lessons — `stack_fable_audit` (2026-09-15)

The first sweep of all seven stacks and five topologies as one pass. Full
findings in `docs/tolerance_stacks/AUDIT_20260915_full_pass.md` (the document
Jeff reads); this file is what the next agent needs that the report and the
diff don't say.

## The classes of error, and the Sonnet-era-redress question

The handoff asked this directly, so plainly: **no authoring error was found.**
Every workbook-cited value reproduces its cell (10/10 against 260729, 13/13
against 260825, 427 formula cells against 260209 already pinned), every
spot-checked drawing callout is on its cited sheet, and every sign and
`lmc`/`mmc` inversion spot-checked is right. The three defect classes that did
turn up:

1. **Policy** (the big one): the old omit-when-unverified rule left the
   pitch-link joint's model missing two physical members, and its "fail" was a
   budget artifact readers could mistake for a design verdict. Fixed under the
   09-15 placeholder amendments — the joint now passes worst case by 0.1098 mm
   *conditional on the placeholder bearing*.
2. **Citation currency**: nine seeded values sat `untraced` on workbook cells
   while the RBC catalogs in the pile printed their bands to the digit, and two
   already-extracted drawings (212956-005, 215177) answered standing identity
   questions nobody had re-asked. The workbook was transcribing the catalogs
   all along.
3. **Identity bookkeeping**: the pitch link was findable as 213862-002 in the
   216231 A.1 PDF sitting in the pile; the 2026-09-06 endstop owner-refinement
   attached the pitch-link length to the wrong link (81.43 ≠ 109.4 — a
   casualty of the crossed link names, now an issue).

So: **earlier authoring does not need value-level redress.** What it needs is
exactly what this audit did — completeness and currency passes — and the
recurring mechanism is *"a document that answers X arrived and nothing
noticed"*, now filed as
`ISSUE_20260915_nothing_notices_when_a_requested_drawing_lands_in_drawing_checker.md`.

## The one decision a reviewer should probe: the eye placeholder is the narrow bearing

No document names 213862-002's bearing. I folded MS14101-3 (7.09/7.14) over
MS14103-3 (11.05/11.10) on three converging arguments (Jeff's two candidates;
the sibling link carrying one of each; and — decisive — the drawing-selected
−11 bolt closing only against the narrow width, the wide one putting the
cotter hole *inside* the clamped stack). The element, worksheet, hardware
entry and report all carry the reasoning and the loud UNCONFIRMED marker;
`confidence: untraced` with ranked gap 1; forge todo `20260915T233854_1oaguy`
asks for the drawing. If the reviewer thinks even a reasoned placeholder
overreaches, the fallback the handoff explicitly rejected is omission — Jeff's
ruling ("omits them entirely and then fails silently which is worst of both
worlds") is the authority for including it.

Confidence grading I settled on and applied consistently: a band printed in an
in-pile catalog + part identity from a parts-list extraction + a count-argument
share-out = `inferred` (nine instances); the same printed band where the part
itself is unconfirmed in the joint = `untraced` (the eye). The hardware
ENTRIES for all four new parts are `traced` — an entry grades its numbers
against its cited page, an element grades them *for its joint*; that split is
now stated in the entries file description and the counts test.

## Operator queue (deliverable 5) — the ids

`20260915T233854_1oaguy` (213862-002 export, rank 1), `20260915T233911_4vjah8`
(214820-002 PDF), `20260915T233911_fhf9cp` (NAS1149),
`20260915T233912_ppcerj` (VPA "piston" naming, rows 38/39 quoted),
`20260915T233929_ukyucc` (VPA rod-end bearing identity — its band equals
MS14101-4's exactly, recorded as candidate only), `20260915T233929_2jxqvg`
(MS21299), `20260915T233929_ehxu62` (214943-002). All
`--source-note 20260915T145908_fwc7qp`. The handoff's own 212956 ask was NOT
queued: that drawing has been in drawing-checker since 2026-09-04 and its
extraction answers differently than the ask assumed (one bearing per eye, not
one per link type).

## Mechanics the next data-touching session needs

- **The JS `[real]` tier trap is real and the previous lesson's recipe works
  verbatim** (junction scratch root, rebuild all three projections +
  crops with `--allow-older-tree` into it, `node apps/viewer/run_tests.cjs
  --repo <scratch>`; crops need drawing-checker's interpreter). Nine `[real]`
  pins moved with this change; 373/373 after. New wrinkle: **the
  `apps/viewer/README.md` spine-crossings totals are derived from the live
  graph and paired by a `[real]` test** — adding two edges to a topology moved
  its before-total 92 → 96. If you change any topology's shape, expect that
  pairing to move.
- **The shared projection in the main checkout was deliberately not rebuilt**
  (same call as `pitch_link_known_bands`: other sessions own it / the gate
  exits 3). Whoever integrates rebuilds.
- **`Study.from_dict` drops unknown keys**, which is what makes
  `no_checks_reason` additive-safe — and also means only the raw-JSON test
  (`test_every_study_has_checks_or_says_why_not`) enforces it. Don't expect
  the field on the loaded object.
- The `hardware_entry_counts` doc-guard needed a new count key (`nas_bolts`):
  "the thirteen NAS bolts" stopped equalling the spec-kind count the moment
  non-bolt spec entries existed. The mutation-witness test pins the tuple-key
  form — if you add spec entries of yet another class, that guard is fine, but
  a new *phrase pattern* needs its own key.
- The extended cross-stack guard was mutation-verified both ways (a flipped
  band; an unclassified element folding a multi-feature part). The
  multi-feature map's element-id sets are the classifier — a new stack folding
  NAS77A3-015A must add its element id there, and the failure says so.

## Suite state

887 → 907 passing; the one failure is the branch-point one
(`test_every_byte_identity_claim_in_a_live_file_names_its_verification`, filed
by `pitch_link_known_bands` as
`ISSUE_20260915_byte_identity_claim_in_origin_posture_brief_names_no_verification.md`
— a strategy brief outside this handoff's scope). Everything else green,
including the JS suite against the scratch root.

## Read-only invariant

Snapshot diff over drawing-checker's two watched roots (5997 entries):
**EMPTY** — before `2026-09-16T05:38:23Z`, after `2026-09-16T06:45:33Z`,
nothing added, removed or modified. `forge check` passes on the worktree and
on the main checkout.

## Small surprises worth keeping

- The 20260909 run of 217755 consumed a `[PRELIM 2026-JUL-2]` export — *older*
  naming than the JUL-23 one — and its find numbers differ again (212956-005
  is find 24 / 25 / 25 across the JUL-23, JUL-2 and handoff-quoted lists).
  Cite finds only with their export, as the SOP already says.
- `RBC - Plain bearings (NAS77 p92).pdf` and
  `RBC_Aerospace_Plain_Bearings_Web.pdf` still don't paginate alike (known),
  and the full catalog's spherical-bearing tables have a clean text layer —
  no vision pass needed, unlike the NAS6403 scan.
- The 216231 A.1 PDFs in the pile (four exports!) carry full text layers
  including their parts lists — a rich identity source the stacks side had
  never opened because it lives under a hub-and-blade filename.
