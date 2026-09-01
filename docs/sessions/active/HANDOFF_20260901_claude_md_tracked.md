---
priority: med
depends_on: []
---

# HANDOFF 2026-09-01 — claude_md_tracked: CLAUDE.md becomes a tracked file

Source: strategy session 2026-09-01, Jeff's decision consuming
`C:\workspace\dispatch\docs\strategy\BRIEF_20260826_tracked_claude_md_across_gitignored_repos.md`:
**CLAUDE.md becomes git-tracked in all five repos where it is gitignored**
(tolstack, wiki, rotorkit, jira-sync, slack-sync — each repo gets its own
small handoff; this is tolstack's). Rationale: an untracked CLAUDE.md can
teach something wrong with no history, no review, and no possibility of a
git-based guard seeing it; the per-session-churn rationale hasn't earned its
cost. This also answers
`docs/issues/ISSUE_20260901_tolstack_claude_md_is_gitignored_while_sibling_repos_track_theirs.md`.

Baseline: trunk at launch. Scope: `.gitignore` (the "Agent bootstrap"
entry), `CLAUDE.md` itself, whatever tests treat CLAUDE.md as per-session,
the two issues below. Do NOT touch: `docs/SOP_TOLERANCE_STACK.md`,
`ARCHITECTURE.md` content beyond what item 2 requires, anything owned by
active `endstop_vision_baseline`.

## Deliverables

1. **Track it.** Remove the gitignore entry, `git add CLAUDE.md`, commit.
   `git check-ignore -q CLAUDE.md` must exit 1 afterwards.
2. **Retire the per-session framing.** CLAUDE.md's own header blockquote
   currently says it is gitignored/per-session, mandates mirroring anything
   durable into README/ARCHITECTURE, and points at the 2026-09-01 issue as
   an open question — rewrite that block for tracked status (the question is
   decided). Decide deliberately what survives: the mirroring rule
   *softens* (CLAUDE.md may now hold durable orientation itself) but the
   file stays orientation-and-pointers — don't migrate ARCHITECTURE/README
   content into it.
3. **Fix the suite's assumption.** The test suite "treats it as per-session"
   per the file's own header — find what asserts that (grep tests for
   CLAUDE) and update it to the tracked reality. If a review-checklist item
   in `docs/prompts/REVIEW_AGENT.md` enforces the mirroring rule, update
   that line too.
4. **Content sanity pass before the first tracked commit.** Read the file
   against reality (test command runs, branch names right, pointers
   resolve); fix anything wrong — this is the last chance to correct it
   without the error entering history as truth.
5. **Close both issues**: the 2026-09-01 tolstack issue above and — it is
   in ANOTHER repo, so do NOT edit it — note in your lesson that dispatch's
   `docs/issues/ISSUE_20260820_no_check_guards_repo_docs_command_spellings.md`
   item 2 is being closed by the strategy session, not by you.

## Cross-repo note

dispatch's `command_spelling_docs_guard` test globs tracked docs, so the
newly-tracked CLAUDE.md is picked up automatically; if a dispatch-side
fixture pins a covered-file or repo count, that bump belongs to dispatch —
record the observation in the lesson, don't edit dispatch.

## Definition of done

- `git check-ignore -q CLAUDE.md` exits 1; the file is committed with the
  reworked header; suite green (including whatever item 3 found).
- Lesson (`docs/sessions/lessons/LESSONS_20260901_claude_md_tracked.md`):
  what the suite asserted about CLAUDE.md and how it changed; anything in
  the content pass that was actually wrong (those are the incidents the
  tracking decision predicts — count them).
