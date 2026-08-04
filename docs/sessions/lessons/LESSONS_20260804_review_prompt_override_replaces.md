# Lessons — a repo-local role prompt *replaces* the canonical one

From the `tolstack_founding` review, 2026-08-04. Recorded here because tolstack is
where it was found, but **the generalisation is cross-repo and belongs to
dispatch** — flagging it for strategy rather than fixing it, since editing
dispatch was outside a tolstack review's scope.

## The mechanism

`RepoConfig.role_path` (`dispatch/config.py:144-157`) resolves a repo-local
`docs/prompts/<ROLE>.md` **ahead of** dispatch's canonical
`dispatch/dispatch/prompts/<ROLE>.md`, and returns *one* path. The launched agent
is handed the local file and nothing else.

So a repo-local role prompt is a **replacement, not an overlay** — which is
exactly backwards from how a repo naturally wants to use it. tolstack's founding
handoff asked for a *domain* checklist (how to review a tolerance stack) at
`docs/prompts/REVIEW_AGENT.md`. Written there, it silently displaced dispatch's
*process* checklist: integrate-on-APPROVE (merge, push, worktree cleanup), the
report frontmatter, the file-don't-fix issue policy, the severity vocabulary, the
data-pollution universal check, and the maintain-this-checklist duty.

The author saw the collision and wrote "follow the canonical prompt's process" —
a reasonable instinct that does not work, because the reader was never given that
prompt and has no reason to know a fuller one exists. The visible symptom would
have been the *next* tolstack review stopping at "APPROVE" and leaving Jeff to
merge by hand.

## What it looks like when it bites

Nothing errors. The agent does a competent job of whatever the local file
describes and simply never performs the duties the canonical file would have
assigned. Absent process is invisible — there is no diff, no failing test, and
the review report looks complete.

## The fix applied here

Restated the canonical process inside tolstack's own copy (a "The review job"
section), and changed the intro to say plainly that the file *replaces* rather
than supplements. Duplication, and it will drift — which is the point of the
strategy note below.

## For strategy

Any repo that wants a **domain** checklist at `docs/prompts/<ROLE>.md` faces this,
not just tolstack. Three options, in rough order of preference:

1. **Composition** — dispatch concatenates canonical + local (`<ROLE>.local.md`,
   or an `include:` marker) instead of choosing. The local file then only holds
   what is repo-specific, and process fixes propagate.
2. **A separate filename** for domain checklists, so the role slot stays
   dispatch's (`docs/prompts/REVIEW_CHECKLIST.md`, referenced from the canonical
   prompt).
3. **Status quo + a warning** — have `dispatch` note at launch that a local
   override is in force and the canonical prompt was *not* sent, so at least the
   agent knows to go read it.

Option 1 also fixes the related footgun already in the canonical checklist: an
override that goes stale re-enables superseded policy, and nobody notices until a
review behaves like it is 2026-07.
