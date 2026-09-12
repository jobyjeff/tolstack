---
type: chore
priority: low
status: resolved
area: apps/viewer
reporter: agent
resolution: fixed inline at the 2026-09-11 triage sweep -- apps/viewer/README.md now reads "shipped in that repo -- webui/analyses.py, pinned by tests/test_analyses_panel.py". Verified before editing: drawing-checker carries docs/sessions/completed/HANDOFF_20260910_analyses_viewer_deep_link.md and the live link-building code in webui/analyses.py.
---

# The deep-link contract section calls drawing-checker's consumer "staged" — it shipped

`apps/viewer/README.md`'s `## Deep links in — the URL contract` section opens
with:

> **This section is a contract a sibling repo consumes** — drawing-checker's
> analyses panel links into this page with a stack selected
> (`analyses_viewer_deep_link`, **staged in that repo**, reads exactly what is
> documented here).

`analyses_viewer_deep_link` is no longer staged. In `C:\workspace\drawing-checker`
it is `docs/sessions/completed/HANDOFF_20260910_analyses_viewer_deep_link.md`,
with a lesson and a `REVIEW_20260911_analyses_viewer_deep_link.md` beside it, and
the link-building code is live in `webui/analyses.py` (pinned by
`tests/test_analyses_panel.py`).

Why it matters more than a stale adjective normally would: the sentence is what
tells a tolstack reader **how much a change to this section costs**. "Staged"
reads as "nobody depends on it yet"; the truth is a shipped, tested consumer in
another repo. That is the whole argument for the section's "treat a rename or a
semantics change as **breaking**" rule one line below, and the new pairing scan
(`tests/test_viewer_deep_link_contract.py`, 2026-09-11) does not read the prose —
it pairs the table's vocabulary only, by design.

Found in review of `viewer_deep_link_contract_pairing`; out of scope for that
handoff (its brief was `tests/`, and `apps/viewer/README.md` only if a *param*
mismatch existed — none did), so filed rather than fixed.

## Fix

One-line edit: drop "staged in that repo" for what it is now (e.g. "shipped in
that repo, `webui/analyses.py`"). Nothing pairs this claim to the other repo and
nothing should — cross-repo lifecycle state is not mechanisable from here. The
durable note for the next reader is the one already in
`docs/prompts/REVIEW_AGENT.md`: prose about *another repo's* state has no guard
at all, so re-resolve it by looking rather than reading.
