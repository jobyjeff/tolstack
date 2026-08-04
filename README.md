# tolstack

**Tolerance-stack authoring and review, plus the spec/datasheet inbox.**

An agent builds a tolerance stack here by following `docs/SOP_TOLERANCE_STACK.md`;
a reviewer checks it against `docs/prompts/REVIEW_AGENT.md`. The one rule both
documents exist to enforce:

> **Every tolerance traces to an actual specification or drawing callout.
> Nothing is invented.** A value recalled from an agent's training data is not a
> source — cite a datasheet in `data/inbox/specs/`, cite a drawing, or record a
> gap.

Founded 2026-08-03 (handoff `tolstack_founding`), stamped from forge's
`template/`; conforms to the forge standard repo layout (see forge
`CONVENTIONS.md`). The tolerance-stack material was imported from
drawing-checker's `tolerance_stack_slice1` slice — see `PROVENANCE.md` for what
came from where.

## Why a separate repo

Slice 1 built the first stacks inside drawing-checker, because that is where the
drawings and the extraction pipeline live. It also concluded that a stack does
not belong there: a stack is a derived, cited artifact that joins across drawing
levels *and* a fastener-spec library, and drawing-checker supplies only one of
its inputs. The specs pile has nothing to do with a CATIA parser at all.

So this repo owns **stacks + the spec inbox**. It still *reads* drawing-checker:
`data/runs/<run>/*_balloons.json` and the drawing PDFs are how a stack element
gets traced to a callout. That is a one-way, read-only dependency — nothing here
writes into drawing-checker.

## Setup (Windows-native)

```powershell
powershell -ExecutionPolicy Bypass -File setup.ps1
venv-win\Scripts\python.exe -m pytest -q
```

## Layout

- `docs/SOP_TOLERANCE_STACK.md` — **start here** to build a stack.
- `docs/prompts/REVIEW_AGENT.md` — the review checklist for this repo (also the
  per-repo override dispatch serves to review agents).
- `docs/tolerance_stacks/` — the stack definitions, the hardware-entry seed, and
  the worksheets. Committed: these are design artifacts, not run data.
- `docs/reference/` — imported reference material (verbatim copies, not authored
  here).
- `tolerance_stack/` — the Python package: the data shapes and the single
  `fold()` that computes worst-case and RSS for both paths and checks.
- `tests/` — `test_tolerance_stack.py` (34 tests pinning the ground-truth
  numbers) plus `debug_*.py` inspection tools, run by hand, never by pytest.
- `data/inbox/specs/` — the spec/datasheet pile. **Append-only**: never rename,
  reorganise, or clean up its contents (see `data/inbox/specs/README.md`).
- `data/inbox/tolerance_stacks/` — source workbooks. Gitignored contents,
  committed `PROVENANCE.md`.
- `data/` — data only; contents gitignored, skeletons tracked via `.gitkeep`.
  Absence from git is not data loss.
- `ops.toml` — the ops manifest (forge `CONVENTIONS.md` §8).
- `PROVENANCE.md` — every path imported into this repo at founding, with the
  source repo's sha at the time of the copy.

Code lives at the top level and in packages — never under `data/`.

## The four schemas

All versioned `/v0`, all defined in `tolerance_stack/stack.py`:

| schema | what it is |
|---|---|
| `joby.tolerance_stack/stack_definition/v0` | ordered `elements`, named `paths`, `checks` over them |
| `joby.tolerance_stack/hardware_entry/v0` | a standard part, `values_status: inline`, `library_ref: null` |
| `joby.tolerance_stack/check_result/v0` | produced not stored; verdict `pass \| marginal \| fail` |
| `source_ref` (embedded) | where a value came from, `confidence: traced \| inferred \| untraced` |

Two load-bearing decisions, both explained in the SOP:

1. **Store `nominal`/`min`/`max` lengths; keep `lmc`/`mmc` beside them as
   transcribed.** LMC/MMC are *material* conditions, not extremes — a subtracted
   element inverts the mapping, and folding "MMC → max" gets it backwards while
   still producing plausible totals.
2. **Paths and checks are the same shape** — a signed term list. One `fold()`
   serves both, so there is exactly one place a sign can be wrong.

## Conventions this repo inherits

- **Handoff lifecycle**: `docs/sessions/` — root = staged, `active/` = running,
  `completed/` = done; lessons in `docs/sessions/lessons/`, reviews in
  `docs/sessions/reviews/`. A handoff's directory IS its status.
- **`CLAUDE.md` is gitignored** — ephemeral, replaced per-session by dispatch.
  Anything durable written there must be mirrored into this README or
  `ARCHITECTURE.md`, or it is lost on the next session.
