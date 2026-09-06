---
type: review
handoff: annotation_surface_mvp
reviewer: agent
date: 2026-09-06
verdict: REQUEST CHANGES
blockers: 1
---

# Review: annotation_surface_mvp

Scope note up front: the seven "mandatory checks" in this repo's overlay are
written for a **tolerance stack** (provenance audit of `StackElement`
citations). This handoff is not a stack — it's a new event stream
(`feature_identity.py`), a projection builder, and a new static app
(`apps/annotate/`). None of those seven checks apply directly (no
`source_ref`/`confidence` element citations, no `fold()` path/check terms, no
LMC/MMC, no RSS). What follows instead is the provenance audit this
deliverable's own shape calls for — the same underlying question ("does this
number/fact actually trace to something real") applied to a mesh binding
instead of a stack element — plus the universal/architectural checklist
items that do generalize.

## What I verified

- **Merged `handoff/annotation_surface_mvp` into this review branch** (clean,
  no conflicts — `master` is ahead only by board-tracking commits, no code
  overlap). Full suite: `636 passed, 1 skipped` (matches the lesson's count
  exactly, in this worktree). `node apps/viewer/run_tests.cjs`: unaffected
  (not re-run in full since this handoff added no viewer logic beyond one
  link — see below). `node apps/annotate/run_tests.cjs`: **20/20 passed**.
- **Scope constraints honored.** `git diff integration..handoff/... --
  tolerance_stack/stack.py tolerance_stack/topology.py` is empty — `fold()`
  and the `study/v0`/`topology/v0` schemas are untouched. `apps/viewer/views/
  topology.js` gained exactly one link (`Annotate →`, rendered only once a
  study is selected) and nothing else. Nothing under `rotorkit` was touched —
  its main checkout (`C:\workspace\rotorkit`) is clean, on `master`, with no
  stray worktrees, matching the lesson's account of a temporary worktree
  (`git worktree add`/`remove`) used and cleaned up.
- **Mesh provenance, re-verified myself, not trusted from the lesson.**
  Re-hashed rotorkit's source STEP file
  (`C:\workspace\rotorkit\data\inbox\step_tessellation\
  213668-002_2026-07-23_Released.stp`) — sha256
  `6d5b1321446d54cd713da0739f7821c5266b3d6898ad047465e30003e7f549cf`, exactly
  the directory name under `data/meshes/` and the `provenance.json`'s claimed
  hash. Manifest face 0's `area_native2`/`centroid_native` match the schema
  test fixture's `geometry_key` exactly — a real fingerprint, not invented.
- **`.gitignore` additions checked with `git check-ignore -q --no-index`
  (the `-q` flag, not `-v` — this repo's own checklist flags `-v` as
  misleading because it prints a matched-pattern line even for a negation, so
  the verdict has to be the exit code under `-q`).** Both new stanzas
  (`data/inbox/feature-identity/`, `data/meshes/`) resolve correctly:
  `README.md` not ignored, an arbitrary event/binary file under each is
  ignored. Correct re-include → exclude-contents → negate-doc shape.
- **`ARCHITECTURE.md`/`CLAUDE.md` updates.** New module row for
  `feature_identity.py`, `apps/annotate/` row, the projection_provenance
  importer count bumped 5→6 (and the paired
  `test_the_projection_provenance_row_counts_and_names_its_importers`/
  `test_the_quantifier_scan_can_fail` updated in the same commit — checked
  the count is real: `feature_identity.rebuild()` does lazily `import
  projection_provenance`, confirmed by reading the source). `CLAUDE.md`'s new
  bullet is a pointer, not a restated fact — no number to go stale.
- **Vocabularies are module-level named constants** (`STACK_KEY_KINDS`,
  `VERDICTS`, `PATH_KINDS`, `DIRECTIONS`, `GDT_MODIFIERS`), matching the
  handoff's explicit instruction and this repo's most-repeated defect
  pattern. `apps/annotate/binding_state.js` hand-copies the same words as JS
  constants with no pairing test to `feature_identity.py` — the lesson
  discloses this as a scope decision, not something it hid; see should-fix
  below.
- **Schema/fold correctness** (`tests/test_feature_identity.py`, 28 tests):
  many-to-many with two bindings on one key, `owner_not_in_set` carrying no
  geometry, `direction`/`gdt_modifier`/`owner_path` surviving the fold,
  `revalidate` never re-binding or dropping (only `confirmed`/
  `needs_re_confirmation`), duplicate `event_id`/`seq` rejected. This matches
  the brief's decisions 3-5 and the DoD's three-outcome staleness posture. I
  did not find an invented value anywhere in this path — every fixture
  geometry_key traces to a real manifest, and the schema forces the
  vocabularies at construction time (`__post_init__`), not by convention.
- **Precedence guard (decision 6) and the write-gating requirement**, read in
  `apps/annotate/app.js`: `precedenceNote()` fires next to the pick, in the
  detail pane the user is actually looking at (not buried in a gaps
  section — this repo's own checklist calls out exactly this placement
  failure for a different check), in plain language ("The drawing wins...").
  `renderDetail()` hides the bind/owner-not-in-set forms entirely, with an
  explanatory note, when `!state.storage.canWrite()` — never a dead button.
- **No second `fold()`/combiner.** `revalidate`'s area/centroid comparison is
  a fingerprint match against one event, not a combination of two element
  values, so it correctly needs no `DECLARED_COMBINING_EXCEPTIONS` entry —
  confirmed by reading `ARCHITECTURE.md`'s updated section, which states this
  and gives the reason rather than asserting it.

## Findings

### Blocker

**`scripts/build_feature_identity_projection.py`'s documented worktree
recipe silently rebuilds an empty, wrong projection.** The script's own
docstring gives this as the from-a-worktree invocation (and it is the
standard shape every other script in this repo, and this repo's `CLAUDE.md`,
teaches: "Anything that writes there takes `--data-root`"):

```
C:\workspace\tolstack\venv-win\Scripts\python.exe scripts\build_feature_identity_projection.py --data-root C:\workspace\tolstack\data
```

`--events-dir`'s default (`tolerance_stack/feature_identity.py:578`,
`EVENTS_DIR = REPO_ROOT / "data" / "inbox" / "feature-identity"`) is computed
from `REPO_ROOT = Path(__file__).resolve().parent.parent` — i.e. wherever the
*module* physically lives — and never from `--data-root`. Every other
projection builder's input default is safe to leave un-derived from
`--data-root` because its input lives under tracked `docs/` (identical
between a worktree and the main checkout); this one's input is
`data/inbox/feature-identity/`, gitignored and **not** identical between the
two, exactly like the output. So passing `--data-root` alone — the
documented recipe, the only one this repo's own convention would lead an
agent to type — silently reads the **worktree's own empty `data/inbox/
feature-identity/`** while writing its output into the **main checkout's**
`data/projections/feature-identity/bindings.json` via `--data-root`.

**Reproduced.** I copied a real fixture event into
`C:\workspace\tolstack\data\inbox\feature-identity\` (one file, `verdict:
bound`, real geometry_key) and ran exactly the documented command from this
worktree:

```
wrote C:\workspace\tolstack\data\projections\feature-identity\bindings.json
  0 stack key(s) from 0 event(s)
```

A stamped, gated, plausible-looking `bindings.json` claiming zero bindings,
written over a real event that was sitting one directory away. This is the
exact failure class this repo's own checklist ranks highest — a wrong answer
that reads as diligence (provenance-stamped, gate-passed) rather than an
error. (Cleaned up my probe file and the resulting `data/projections/
feature-identity/` directory afterward — main checkout is back to its
pre-test state.)

Compounding it: **there is no test anywhere that exercises `rebuild()` or
`main()`** — `tests/test_feature_identity.py`'s 28 tests all call
`build_projection`/`revalidate`/the dataclasses directly, never the CLI or
the `--data-root`/`--events-dir` resolution. The one thing every downstream
session is told to run blindly (the lesson: "rebuild the projection... before
trusting `data/projections/feature-identity/bindings.json`") is the one path
with zero coverage, which is exactly how this shipped.

This does not clear the inline-fix boundary: a correct fix (derive
`events_dir`'s default from `--data-root` when not explicitly overridden, or
refuse to run silently when the two roots disagree) is a few lines, but I
would want a test proving the `--data-root`-alone invocation reads the right
directory before trusting it — which is a new test, not a documentation
tweak. **Sending back to the tactical agent.**

### Should-fix (not blocking, filing as issues per "an unfixed should-fix
outlives its handoff" — but noting them here since REQUEST CHANGES means the
handoff still owns them; issues below are filed for defense-in-depth in case
this exact review verdict is what a future reader finds first)

- **`apps/annotate/binding_state.js`'s hand-copied vocabulary constants
  (`STACK_KEY_KINDS`, `VERDICTS`, `DIRECTIONS`, `GDT_MODIFIERS`) have no
  structural pairing test against `feature_identity.py`**, unlike
  `apps/viewer/viewer.js`'s vocabularies (paired by
  `tests/test_js_python_vocabulary.py`). The lesson discloses this
  explicitly as a scope cut, and `run_tests.cjs` does check the JS constants'
  *values* against the lesson's/docstring's prose, which catches a value
  drift but not a structural one (a new Python vocabulary word added without
  a matching JS literal). Given this repo's own history — this is its
  single most-repeated defect class — this is worth closing rather than
  leaving as a known gap.
- **`scripts/build_feature_identity_projection.py`'s own docstring uses a
  cmd-style `^` line continuation** (line 21-22) in its "from a worktree"
  example, not PowerShell's. Reproduced: pasted verbatim into PowerShell, it
  fails (`Cannot run a document in the middle of a pipeline`). This is a
  second sighting of this repo's own recurring-bugs entry ("a documented
  command that does not run in this repo's shell"). **Fixed inline** (joined
  onto one line — a few characters, no behavior change, no test needed):
  see the diff in this review's commit.

### Nits

- None beyond the above.

## Issues filed

- `docs/issues/ISSUE_20260906_feature_identity_events_dir_ignores_data_root.md`
  — the blocker above, filed so it has an owner independent of this report
  even though it is currently blocking (belt and suspenders: if a future
  session merges past this REQUEST CHANGES some other way, the issue still
  exists).
- `docs/issues/ISSUE_20260906_annotate_js_vocab_has_no_pairing_test.md` — the
  should-fix above.

(The `rotorkit` master/integration divergence is already filed by the
handoff itself — `ISSUE_20260906_rotorkit_master_missing_tessellation_spike.md`
— read and agreed with; not re-filing.)

## Verdict

**REQUEST CHANGES.** One blocker: the projection rebuild's documented
worktree recipe silently produces a wrong (empty) projection because
`--events-dir`'s default does not follow `--data-root`, and nothing tests
the CLI path at all. Everything else I checked — schema/fold correctness,
mesh provenance (re-hashed myself), scope discipline, precedence/write-gating
UI, doc/architecture hygiene — passed. This is a small, well-scoped fix (plus
one test); I expect a quick turnaround.

Not merging into `integration`. Worktrees and branches left in place per
process; my own review branch (`review/annotation_surface_mvp`) already has
`handoff/annotation_surface_mvp` merged into it for this review's testing —
that merge stays (it's disposable review-branch state, not a merge into
`integration`), and a re-review after rework can reuse or re-cut it.
