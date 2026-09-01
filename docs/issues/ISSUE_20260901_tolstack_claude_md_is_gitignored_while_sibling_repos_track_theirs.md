---
type: chore
priority: med
status: open
area: repo conventions
reporter: agent
audience: strategy
---

# tolstack gitignores `CLAUDE.md` while drawing-checker and forge track theirs — decide which is right

Handoff `dag_topology_format` (2026-08-31) carried a cheap add-on deliverable
from its locked brief: *"tolstack's `CLAUDE.md` is still the template stub — the
expander should not rely on it for context (and filling the stub is a cheap
add-on deliverable)."* Filling it turned out to sit on top of an undecided repo
convention, which is what this issue is about. **The stub is filled** (in the
main checkout, where a gitignored file belongs); what is not settled is whether
that content should be committed.

## The state, measured 2026-09-01

| repo | `CLAUDE.md` tracked? | size on disk | last touched |
|---|---|---|---|
| `tolstack` | **no** — `.gitignore`, "Agent bootstrap (ephemeral, replaced per-session by dispatch)" | 1.6 KB, the unedited forge template stub | 2026-08-20 |
| `drawing-checker` | **yes** | 42.6 KB | 2026-08-28 |
| `forge` | **yes** | 13.0 KB | 2026-08-26 |
| `dispatch` | n/a — no `CLAUDE.md` at all | — | — |

`git check-ignore -v CLAUDE.md` reports the rule in tolstack and reports nothing
in the two siblings; `git ls-files --error-unmatch CLAUDE.md` resolves in both
siblings and fails in tolstack.

So tolstack is the outlier, and the outcome is visible: the two repos that track
the file grew real orientation documents, and the one that ignores it has carried
an unedited template stub since founding on 2026-08-03 — through roughly thirty
merged handoffs, none of which could durably improve it.

## Why it is a decision and not a patch

tolstack's ignore rule is not an oversight — it is load-bearing in three places,
and un-ignoring the file silently contradicts all three:

1. `README.md`, "Conventions this repo inherits": *"`CLAUDE.md` is gitignored —
   ephemeral, replaced per-session by dispatch. Anything durable written there
   must be mirrored into this README or `ARCHITECTURE.md`, or it is lost on the
   next session."*
2. `docs/prompts/REVIEW_AGENT.md` carries that as a **checklist item** reviewers
   are asked to verify, and cites it a second time in the ARCHITECTURE-staleness
   item.
3. `tests/test_tolerance_stack.py`'s `_HISTORICAL_NAMES` excludes `CLAUDE.md`
   from `live_documents()` with the comment `# CLAUDE.md: gitignored,
   per-session`, so the repo's doc-scan guards deliberately do not read it.

Note also that the premise underneath the rule looks **empirically false**:
"replaced per-session by dispatch" would mean the file changes every session, and
it has not changed since 2026-08-20. Whether dispatch ever replaced it, or the
sentence was inherited from the forge template along with the ignore rule, is
worth establishing before either option is chosen — it is the fact the whole
convention rests on.

This is also **cross-repo in effect**: the `CLAUDE.md`-as-agent-bootstrap
convention comes from forge's `template/` and the seed-composition behaviour is
dispatch's, so whichever way it goes, the fix probably belongs in the template or
in dispatch rather than only in tolstack.

## The options

1. **Track it, like the siblings.** Un-ignore, commit the filled file, remove
   `CLAUDE.md` from `_HISTORICAL_NAMES` so the doc-scan guards cover it like any
   other live document, and rewrite the `README.md` sentence and the two
   `REVIEW_AGENT.md` items. Upside: the repo stops throwing away orientation, and
   tolstack matches the two repos where this demonstrably worked. Cost: three
   documents and a test constant change together, and the file becomes something
   a reviewer must read.
2. **Keep it ignored, and fix the mirroring instead.** Leave the rule alone, and
   accept that the *durable* content lives in `README.md`/`ARCHITECTURE.md` with
   `CLAUDE.md` as a per-session pointer sheet — which is what this handoff did.
   Cost: every session that improves the orientation pays for it again, and the
   evidence is that ~thirty of them declined to.
3. **Track a seed and keep the live file ignored** — commit e.g.
   `docs/AGENT_ORIENTATION.md` and have the ignored `CLAUDE.md` point at it.
   Keeps the per-session escape hatch and the durability. Cost: a fourth
   orientation document in a repo that already has `README.md`,
   `ARCHITECTURE.md` and an SOP, i.e. one more place to go stale.

Option 1 unless the "replaced per-session by dispatch" premise turns out to be
live, in which case option 3. Not prescribed here — routing to strategy because
the choice spans dispatch's seed behaviour, forge's template, and three of this
repo's documents plus a test.

## What was done in the meantime

`C:\workspace\tolstack\CLAUDE.md` (main checkout, gitignored, absolute path per
the worktree rule for untracked files) now holds real orientation: the one rule,
which document to read for which archetype, the three load-bearing design
decisions, the environment, and the traps that have cost previous sessions time.
It is written to survive being thrown away — every durable fact in it is also in
`README.md`, `ARCHITECTURE.md`, the SOP or `docs/DAG_TOPOLOGY.md`, per convention
2 above. If option 1 is chosen, that file is the content to commit.
