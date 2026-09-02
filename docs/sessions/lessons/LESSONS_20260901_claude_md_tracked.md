# LESSONS 2026-09-01 — `claude_md_tracked`

`CLAUDE.md` is now a tracked file in this repo. What follows is what the next
agent could not get from the diff.

## What the suite actually asserted about `CLAUDE.md` — one constant, two scans

The handoff said the suite "treats it as per-session"; that turned out to be
one line, not a family of tests:

```python
_HISTORICAL_NAMES = {"PROVENANCE.md", "CLAUDE.md"}   # CLAUDE.md: gitignored, per-session
```

`live_documents()` (`tests/test_tolerance_stack.py`) skips those names, so the
file was invisible to the two doc-level scans that walk it:
`test_no_live_document_states_an_unguarded_hardware_entry_count` and the
enumerated-state surface lookup `_surface_readme_text()`. Nothing else in the
suite mentioned `CLAUDE.md` at all — no fixture, no path assertion, no
gitignore matrix. Dropping the name from the set was the whole change, and the
suite stayed at **559 passed / 1 skipped** because the newly-read file states
no hardware-entry count and is not a surface README.

The name is *not* interchangeable with `PROVENANCE.md`, which stays on the
list: that exclusion is about **dated records** ("what someone believed on a
date"), and `CLAUDE.md` never was one — it was excluded for being untracked.
Two different reasons wearing one constant; the comment above it now says so.

**The one thing that did go red**, and it will catch the next person editing a
test file too: `tests/test_provenance.py`'s
`test_this_branch_amended_the_row_of_every_imported_file_it_changed` diffs the
branch against its merge-base and demands that any *imported* file the branch
touches gets an **Amended again** clause appended to its `PROVENANCE.md` row.
A one-line change to a constant counts. The failure message writes the
sentence stub for you; take it.

## The content pass — three defects in one day of real content

This is the number the tracking decision predicted, so it is worth stating
precisely. `CLAUDE.md` held the forge template stub from founding until
2026-08-31, when `dag_topology_format` filled it with real orientation. That
content existed for **one day**, was never reviewed, and already carried:

1. **"Three writers share that gate."** Wrong: `scripts/projection_provenance.py`
   has **four** callers — the three `build_*` CLIs plus
   `tolerance_stack.spec_library.rebuild()` since 2026-08-12 — and its own
   docstring says "four callers, not two". The fix was not to write `four`:
   `ARCHITECTURE.md`'s inventory already pairs that count against the modules
   that import it, so the sentence now points at the owner and states no count.
2. **"Three seeded elements broke this for a month."** Wrong by a factor of
   ten: seeded at founding 2026-08-03, fixed 2026-08-06 by
   `traced_labels_and_ratio` (the issue was filed 08-04 and closed 08-06).
   Rewritten to the dated fact.
3. **"four separate cases of a vocabulary drifting."** Not checkable, and it
   disagrees with the tree depending on how you count:
   `REVIEW_AGENT.md`'s "Documented vocabularies drifting" item is on its
   **fourth** sighting, a different checklist item is on its **fifth**, and
   `test_no_persisted_field_vocabulary_is_an_inline_literal`'s docstring calls
   itself the generalisation of a question asked by hand twice. Removed rather
   than corrected, pointing at the checklist item that owns the count — which
   is what this file's own rule ("a quantity no test reads is a defect") asks
   for.

None of the three would have survived a reviewer. That is the argument for
tracking, made by the file itself, and it is why deliverable 4 was sequenced
*before* the first tracked commit rather than after.

**A fourth wrong fact was outside the file**: "ephemeral, replaced per-session
by dispatch", which the `.gitignore` comment and `README.md` both asserted. It
is false and always was. `dispatch/dispatch/init.py` writes a repo's
`CLAUDE.md` **once**, at `dispatch init`, from `dispatch/scaffold/CLAUDE.md`,
and its docstring says it "will not clobber an existing config or an edited
`CLAUDE.md`"; a session's seed is composed into the gitignored
`.dispatch/prompts/` and never touches it. The sentence came from the forge
template along with the ignore rule. The issue asked for this premise to be
established before choosing; it is established, and it does not hold.

## Cross-repo: the handoff's assumption about dispatch's guard is wrong

The handoff says dispatch's `command_spelling_docs_guard` "globs tracked docs,
so the newly-tracked CLAUDE.md is picked up automatically". It is **not**.
`dispatch/tests/test_command_spelling_docs.py` carries

```python
UNCOVERABLE_REPOS = {"slack-sync", "jira-sync", "rotorkit", "wiki", "tolstack"}
```

and `_covered_repos()` skips those repos **entirely** — not just their
`CLAUDE.md`, but their `docs/prompts/*.md` too, deliberately, so that a green
suite is not mistaken for full coverage. Tracking the file here changes
nothing on the dispatch side until someone removes `"tolstack"` from that set.
So the dispatch-side follow-up is not a fixture count bump — there is no
pinned covered-file or repo count, the swept set is derived from
`git ls-files` at import time. It is:

- drop `"tolstack"` from `UNCOVERABLE_REPOS`, and delete the whole set once the
  other four repos convert, along with the rationale in
  `test_a_gitignored_claude_md_is_never_swept_even_with_the_bad_spelling` (the
  test itself is synthetic and still fine);
- fix that file's comment, which quotes this repo's now-changed constant as
  `_HISTORICAL_NAMES = {"PROVENANCE.md", "CLAUDE.md"}  # gitignored, per-session`.

I checked ahead so that enrolment is a one-liner: running dispatch's own
`BAD_SPELLING_RE` over this repo's tracked `CLAUDE.md` and `docs/prompts/*.md`
gives **zero hits**, so dropping tolstack from the set will not turn dispatch
red. (Note also that `EXCLUDED_FILES` holds the bare relpath
`docs/prompts/REVIEW_AGENT.md`, which excludes *every* repo's file at that
path, not just dispatch's — probably not intended, but it is dispatch's call.)

Per the handoff, none of this was edited from here.

**And the other issue closes elsewhere**: dispatch's
`docs/issues/ISSUE_20260820_no_check_guards_repo_docs_command_spellings.md`
item 2 (the untracked-`CLAUDE.md` coverage gap) is being closed by the
2026-09-01 strategy session that cut this handoff — it is in another repo and
was deliberately not touched here.

## Decisions made that the handoff left open

- **The mirroring rule is retired, not softened.** The handoff said it
  "softens". Read against reality it could not survive as a rule: it existed
  only because the file was thrown away, and it is now a *harmful* rule,
  because obeying it would duplicate content into `README.md` /
  `ARCHITECTURE.md` where the repo's doc guards would then have two copies of
  the same fact to keep in step. What replaced it is a narrower fence, stated
  in the header and in the review checklist: the file may hold a durable fact,
  but it may not restate a number or a rule that a test reads somewhere else.
- **`docs/prompts/REVIEW_AGENT.md`'s checklist item was rewritten, not
  deleted.** Deleting it would leave a reviewer with no instruction about the
  file at all; it now says what the file is, what it is not, and that a number
  restated there is a number nothing recounts. Its two other citations of the
  old rule (the hardware-count scan's out-of-scope list, and the
  ARCHITECTURE-staleness item's "dies with the session" aside) were updated in
  the same pass — grep for the rule, not for the checklist item.
- **`README.md`'s "Conventions this repo inherits" bullet was in scope even
  though the handoff did not name it.** It asserted the gitignore rule as fact;
  leaving it would have shipped a false sentence in the same commit that made
  it false.

## Left to do

Nothing in this repo. The dispatch-side enrolment above is the only open
thread, and it belongs to dispatch.
