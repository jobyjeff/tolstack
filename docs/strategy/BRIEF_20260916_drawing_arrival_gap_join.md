# STRATEGY BRIEF 2026-09-16 — nothing notices when a drawing an open gap is waiting on lands in drawing-checker

> **Routing note.** Filed by the triage sweep of 2026-09-16 from
> `docs/issues/ISSUE_20260915_nothing_notices_when_a_requested_drawing_lands_in_drawing_checker.md`
> (feature, med, `audience: strategy`), which was filed off
> `docs/sessions/active/HANDOFF_20260915_stack_fable_audit.md`. Triage has
> **not** designed this — a strategy agent should decompose it. What follows is
> the case, the measured evidence from the source issue, the dedupe result, and
> the questions triage thinks decomposition has to answer.

## The problem in one sentence

A part drawing that lands (and is extracted) in drawing-checker does not
re-cite anything by itself, and nothing in tolstack notices that it *could* —
the same defect class `spec_pile_gap_join` fixed for `data/inbox/specs/` on
2026-08-13, one directory over and across a repo boundary.

## Why this is a brief and not a tactical handoff

It clears two of the three bars in `TRIAGE_AGENT.md` §1:

- **A cross-repo contract.** The join reads drawing-checker's `data/runs/` and
  `data/inbox/drawings/`, so who owns the key, who publishes an index, and
  whether drawing-checker grows anything at all cannot be settled by either
  repo's tactical agent alone.
- **A policy.** The matching key is a drawing number embedded in free gap
  prose, and the answer sets how this repo matches such prose from now on — the
  spec-pile join already had to choose a range-aware match over a substring one
  for standards, and this is the same choice for drawing numbers plus revision
  and dash suffixes.

## The evidence (from the source issue, measured 2026-09-15)

The `stack_fable_audit` session answered two operator-gated questions off
drawings that had been sitting extracted in drawing-checker **for weeks with
nothing noticing**:

| drawing | drawing-checker run | age when finally read | what it closed |
|---|---|---|---|
| `212956-005-A` | `20260904_184233_212956-005-A` | 11 days | its parts list names both link eye bearings (MS14103-3 + MS14101-3) — the exact fact the handoff had queued an export *request* for |
| `215177-A` | `20260813_180719_215177-A` | ~1 month | its parts list names NAS77A3-015A / NAS77A4-015A, closing the flanged-bushing identity that `tan_link`'s elements carried as a wrong candidate (`214936-002`) the whole time |

Both run directories are present today (107 run directories in
`drawing-checker/data/runs/` as of 2026-09-16), and **the run directory name
itself carries the drawing number and revision** — which is why a join is
plausible at all.

`tests/debug_report_spec_pile_gaps.py` joins the open-gap list against the spec
pile, but not against drawing-checker's runs/inbox, where part drawings and
assembly extractions land. Gap texts in this repo name drawing numbers
(`213862-002`, `214943-002`, `214820-002`, …) that a join could test against
run directory names and inbox filenames the same range-aware way.

## What already exists to build on

- **The spec-pile precedent, already decided.** The 2026-08-13 strategy session
  settled the spec-pile version of this question: tool + backlog clearing as one
  handoff in two ordered phases; **reporter only, not enforced**, with an
  allowlist for "document is here but does not actually give this quantity";
  ratio restated once, last. That brief has been expanded and staged already, so
  it cannot take an addendum — but its answers are the obvious default here and
  decomposition should say where it departs from them.
- **A read-only cross-repo reader.** `scripts/snapshot_drawing_checker.py` (with
  `tests/test_dc_snapshot.py`) already resolves
  `C:/workspace/drawing-checker/data/runs` and
  `.../data/inbox/drawings` and is explicitly read-only over that repo — the
  suite proves the session wrote nothing there, and never fabricates a run
  directory to test against. Whatever this becomes should inherit that posture,
  plus the spec-pile tool's rule of **skipping rather than reporting empty** when
  the sibling tree is absent (a worktree session), so a worktree agent is never
  told "no candidates" by a tool that simply could not look.

## Dedupe — why no existing brief hosts this

Checked 2026-09-16 against tolstack's 16 open briefs, drawing-checker's 6, and
dispatch's cross-repo set:

- `docs/strategy/BRIEF_20260911_served_surface_capability_gaps.md` — nearest
  neighbour, and it is the other direction. It decides what the
  **drawing-checker HTTP mount serves to a browser** (viewer projections,
  `data/meshes/`, worksheets under `docs/`, rebuild driving) and which side owns
  each piece. This question is a batch, filesystem-level read *by* tolstack *of*
  drawing-checker's output tree, with no server, no mount and no surface in it.
  Folding it in would make that brief's one clean question ("what does the mount
  expose") into two unrelated ones.
- `docs/strategy/BRIEF_20260911_endstop_topology_retrace_and_f12.md` — a CAD/HITL
  retrace of named worksheet rows and one nominal-length discrepancy. It consumes
  drawings that have already been read; it says nothing about noticing arrivals.
  (Adjacency worth noting: `212956-005-A` appears in both, as the drawing whose
  shared `(81.43)` reference dimension confirmed `213863-004-A`'s ownership.)
- `docs/strategy/BRIEF_20260812_spec_pile_gap_join.md` — the same defect class,
  and the reason this is not a new *question* so much as a new *domain* for a
  settled one. It is closed to addenda (expanded, staged and landed 2026-08-13),
  so per §2 there is no open brief to append to.
- drawing-checker's own briefs — `run_staleness_surface` (whether the run viewer
  says it is showing pre-fix output; also already expanded) and the rest are
  about drawing-checker's surfaces, not about what a consumer repo is owed.

## The questions decomposition has to answer

1. **Extend the tool or grow a sibling?** `debug_report_spec_pile_gaps.py`
   already collects the open questions (every element instance across
   `ALL_STACK_FILES` with `confidence` in `untraced`/`inferred`, plus
   `hardware_entries.json` entries not `traced`). Only the pile side differs.
   One tool with two piles reports "what could close this gap, from anywhere";
   two tools keep each pile's matching rules honest. The source issue names this
   as the open question and does not pick.
2. **What is the key, and who owns it?** Options: match the run directory name
   (available today, no drawing-checker change, and dash/revision suffixes are
   in it); read a per-run manifest or `runs.jsonl`; or ask drawing-checker to
   publish a by-drawing-number index for consumers. The third is a real
   cross-repo ask and the only one that survives a rename of the directory
   convention — decide whether the coupling to a directory-name convention is
   acceptable, because that is what makes this cheap.
3. **Parts lists, or only the drawing number?** The two measured hits were
   answered by an extracted **parts list naming a different part** than the
   drawing's own number — `215177-A`'s list named the bushings. A join on
   drawing numbers alone finds neither. So decide whether the pile side is
   "drawings whose number a gap names" or "the extracted content of every run",
   which is a much larger and noisier match.
4. **Report, guard, or request-tracking?** The spec-pile precedent says reporter
   with an allowlist. But this repo also *queues export requests* (the audit's
   own queued request for the link-eye bearings is what sat unanswered), so a
   third shape exists: close the loop on outstanding requests rather than
   re-scanning every gap. Deciding that decides where it runs — a debug report a
   session invokes, a test, or something the projection rebuild prints.
5. **Backlog clearing is separate work and moves the traced ratio.** As with the
   08-06 precedent, anything restating the ratio sequences behind the re-citation
   pass, not beside it.

## Out of scope

Reading crops by vision and re-citing the values. The join produces candidates a
human confirms; the re-citation is the second handoff and is where the ratio
moves.
