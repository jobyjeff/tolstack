# Lessons — the annotator rail resizes and names what it lists (2026-10-20)

## Decisions the handoff left open

- **Tooltip mechanism: native `title`, not the `#alert-pop` popup.** The rows
  are plain text, a native tooltip needs no positioning code, works from the
  keyboard-less hover a scanning reader uses, and cannot be clipped by the
  rail's scrollport (the reason `#alert-pop` is fixed-position applies to a
  *rich* popup, not to a string). A `<select>` carries the **selected** option's
  text on the select itself (`syncSelectTitle`), re-synced on every topology /
  study change. The delay is the browser's; if Jeff finds it too slow for rows,
  `showAlertPop` is the ready seam.
- **Name casing: lower case, for every source.** Drawing nomenclature is
  shouted and topology names are already lower; one rule over both.
  `GAS SPRING PISTON HEAD, PROPELLER, UPR` → `gas spring piston head, propeller, upr`
  (the abbreviation lower-cased with the rest — nothing expands it).
- **A bare drawing number names its dash numbers.** drawing-checker writes
  `215735` where the mesh label says `215735-001`; the lookup is exact first, then
  the six-digit base. The projection stores numbers exactly as the source wrote them.
- **A title block that lost `drawing_no` falls back to `source_pdf`'s leading
  number.** `213668-002`'s extraction has `drawing_no: null`; its PDF name opens
  with the number, which is what the author wrote.
- **The topology select no longer prints the topology id** (`title (id)` →
  `title`): an internal id in a user-facing option, two clicks from the rule I
  was already enforcing. Full title on hover.
- **The sweep gate quotes the reference measure, not the driver.** The driver
  at the published runs' as-modelled frame is `0 mm`; the number a reader knows
  the pose by is blade pitch, `72 deg` — the same choice the scrubber chip makes.

## Census

- **Name sources** (`data/projections/parts/names.json`, built from the main
  checkout): 48 numbers named — 40 from a drawing, 8 from a topology.
  Over the 47 installed meshes: 27 labels open with a part number; of those 13
  are named by a drawing, 7 by a topology, 7 by nothing (`217970-001`,
  `546293-002`, `217263-001`, `551438-001`, `213861-002`, `215256-001`,
  `213859-002`). The other 20 meshes are catalog hardware or a hand-named
  solid with no part number in the label; those rows still show the label
  unchanged.
- **As-modelled frame per published 2026-10-16 run (S, P1, P2):** all three are
  index 79 (frame 80 of 80, driver 0.0 mm). Exactly one frame per run qualifies
  (the existing `[real]` check already pins that).
- **Topology per run:** S, P1 and P2 name `vpa_pitch_linkage` (every feature entry in S; every one but the
  driver entry in P1 and P2). The
  10-01 and 10-15 runs carry no `geometry.features` and name none.

## Flyout embedding

Nothing needed. The handle lives inside the annotator, and the flyout's own
floor is 560 px, so the iframe is always wider than the minimum rail with the
half-window clamp still above it. The one new fact: the remembered width is
`localStorage` for the annotate **origin**, which the flyout shares with the full
page — a rail width chosen in one is the other's default. Clamping to half the
*iframe's* inner width keeps that safe.

## Found while doing it (filed, not fixed)

- `ISSUE_20261020_the_annotate_real_browser_pass_times_out_waiting_for_sweep_bodies_to_resolve.md`
  — `run_browser_check.mjs --real` times out at the bodies wait. Reproduced
  identically on a clean `git archive` of the starting `HEAD`, so not this
  handoff's. The new real-data checks do not depend on it (they run in their own
  pass, `railRealPass`, with no `--real` flag, and skip when the run or the
  topology projection is absent).

## Gotchas worth knowing

- `tests/test_architecture_inventory.py` pins "all N projection writers" in two
  places (the pin and its own quantifier-scan fixture). A new writer of the
  provenance gate is three edits: the ARCHITECTURE row, the importer sentence
  and both pins.
- A Python heredoc with `\n` or `\t` inside a normal string silently mangles
  Windows paths and JS strings (`\tolstack`, `lines.join("\n")`); the damage
  survived a first read. Write the patch script to a file and use raw strings.
- The existing mock-sweep check that read the gate line with `innerText()` on a
  hidden element would have kept passing once the gate carried a button,
  because `innerText` of a `display: none` node is its text content. It now
  asks `isVisible()`.

## Verification record

- `node apps/annotate/run_tests.cjs` (worktree, `[real]` reading the main checkout's data): 195/195.
- `node apps/annotate/run_browser_check.mjs` (worktree, mock + `railRealPass` on P2): 67/67.
- Six new annotate guards each have a mutation spec, each WITNESSED
  (`run_mutation_witness_tests.mjs --only <name> --repo C:\workspace\tolstack`);
  `DECLARED_GUARDS.annotate` raised 189 → 195 with those six specs behind it.
- Full `pytest -q` in the worktree: 8 red on the first run — the documented
  worktree-only `test_viewer_js_suite`; two I caused and fixed (a stray "only" in the
  ARCHITECTURE row, the stale `260px 1fr` mutation anchor) plus the enrollment census
  (fixed by the six specs); four `test_mutation_witness_shadow_concurrency` failures
  that pass on a quiet rerun (the run took 30 min under load from other suites).
  A final full rerun was not repeated after those fixes; the touched files were
  rerun together (inventory + witnesses + concurrency: green).
- **Not runnable here:** the viewer browser TRUTH tier and its mutation witness for the
  rewritten `260px` anchor (`playwright-core` is main-checkout only). The anchor edit
  is mechanical (`var(--rail-w, 260px)` in both find and replace); run
  `node scripts/run_mutation_witness_tests.mjs --only "3D canvas runs to the right edge"`
  in the main checkout at merge.
