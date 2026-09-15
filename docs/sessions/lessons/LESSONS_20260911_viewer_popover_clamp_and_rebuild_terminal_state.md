# Lessons — viewer_popover_clamp_and_rebuild_terminal_state (run 2026-09-14)

Two unrelated fixes in `apps/viewer/topology_app.js`. Deliverable 2 went in as
written. Deliverable 1 did **not**: the handoff's suggested clamp is actively
wrong, and finding out why is the only thing here worth reading twice.

## Deliverable 1 — the suggested clamp makes the card undismissable

The handoff (and the issue) suggested
`top = min(desiredTop, innerHeight - height - 8)`: pull the card back up until
its bottom is on screen. Both named the trap — "a card nudged back up must not
land ON its trigger" — and both attributed it to a `mouseleave` that closes the
card. **That attribution is stale.** Nothing in this app closes a popover on
mouseleave; `views/stack.js`'s crop trigger says so deliberately, in a comment,
because the pointer has to leave the trigger to reach the links inside the card.
So the named trap looked harmless, and I implemented the clamp.

It is not harmless, and the real mechanism is the mirror image:

> A card that covers its own trigger cannot be **closed**. Escape hides it,
> Chrome re-resolves what is under the stationary pointer, the trigger
> underneath gets a fresh `mouseenter`, and the card re-opens. Not
> opens-then-closes — **closes-then-reopens**, forever.

It fails loudly, which is lucky: the browser tier went from two named sub-check
failures to `locator.hover: Timeout 30000ms exceeded` in two whole suites,
because the undismissable citation card sat over every later hover target. If
you are reading this after making a popover move, that timeout is the symptom.

Note the geometry that makes the clamp useless anyway: a below-placed card is
already only 8px under its trigger, so **any** upward move overlaps it. There is
no version of "clamp but don't overlap" that moves the card far enough to
matter.

### What shipped instead: cap, don't move

The handoff's own sentence turns out to name the fix — "a clamp that would
overlap the trigger should keep the above/below decision it has and **accept the
cap** instead". `position()` now:

1. clears any inline `max-height` and measures the card's natural height;
2. computes the room on each side, net of the 8px gap and the 8px window margin;
3. goes above when the card does not fit below **and above is the roomier side**
   (a monotone extension of the old "above only when it genuinely fits above" —
   every case that used to go above still does);
4. caps the card to that side's room when it does not fit, letting `.croppop`'s
   existing `overflow-y: auto` carry the rest.

The card therefore never overlaps its trigger and never leaves the window. Note
the `maxHeight = ""` reset in step 1: `#croppop` is **one shared node** for every
popover and card in the app, so a cap left by a placement in a tight spot would
otherwise squeeze every later card everywhere.

### Numbers, so the next reader can tell if the configuration still holds

Measured at 1600x700 on `topology.html?mock=1`, the `base_thickness` edge card.
These are **not** the issue's numbers (trigger at 353.5, card 528, bottom 889) —
`viewer_dag_spine_layout` moved the grid since it was filed, and the defect just
moved with it:

| | before | after |
|---|---|---|
| trigger box | 418.5–444.5 | 418.5–444.5 |
| card | 527.5 tall at top 452.5 | 402.5 tall at top 8 |
| card bottom | 980, on a 700px window | 410.5 |
| scrolls inside itself | no (527.5 < the 676 `100vh - 24` cap) | yes |

280px of the card — the citation line and the crop-key claim — was off the
bottom of the window and unreachable, exactly as filed. Note it now goes
**above**: room above is 402.5, room below 239.5.

### The guard, and what it cost

Three new sub-checks in the `CARD_LAYOUT_VIEWPORT` block, shown red against
unfixed code before green (red: `bottom edge is inside the window`, `keeps the
overrun reachable in its own scrollport`, and the tripwire). All three are
written **side-agnostic** — measured against the trigger box, not against
"below" — because the card flips sides at a viewport this suite may well change
again.

The block's existing tripwire had to be rewritten, and this is the part with a
cost. It asserted "the open card hangs past the document's own bottom", which
the cap makes permanently false. It now asserts "the card wants more height than
either side of its trigger can give it" (its box is exactly the roomier side's
room, and its content still overflows). But the three *older* sub-checks under
it — the `position: fixed` vs `absolute` contract from
`viewer_hover_cards_and_deep_links`, which `hover_card_layout_guard_can_fail`
was a whole handoff about — are now **vacuous**, because a card that is always
inside the window is always inside the document too. Verified, not assumed: flip
`.croppop` back to `position: absolute` and the topology suite still reports
122/122. Filed as
`ISSUE_20260914_card_layout_guard_cannot_see_the_absolute_popover_again.md`
rather than papered over; fixing it needs a configuration where document and
viewport coordinates differ, which this one (`docHeight === innerHeight === 700`)
cannot provide.

## Deliverable 2 — where the terminal-state vocabulary came from

Read from the server, as instructed: **`C:\workspace\drawing-checker\webui\tolstack_rebuild.py`**,
whose module-level `STATES = (IDLE, QUEUED, RUNNING, DONE, FAILED)` —
`idle | queued | running | done | failed` — is declared "total by contract", with
the status dict's `busy` flag set for exactly `queued` and `running`
(`webui/main.py` mounts it at `POST /tolstack/rebuild` and
`GET /tolstack/rebuild/status`). Only `done` is a finished rebuild, so
`pollRebuild` now tests **for** `done` instead of accepting the complement of
`failed`, and any other terminal state — `idle` from a restarted server, or a
word this client has never heard — takes the failure exit.

Two corroborations worth knowing about, because they mean the value is not
resting on one read:

- `apps/viewer/storage/adapter.js`'s own contract comment already said the
  status "polls toward done/failed". The client was the only thing that did not
  believe it.
- The browser tier's stub sibling mount was already answering
  `state: busy ? "running" : "done"`. Both halves of the repo had the right
  vocabulary; only the branch that consumed it was wrong.

The stub now takes a `terminalState` option and scenario 3 of
`testRebuildAffordance` drives a terminal `idle` through a real click: the page
must show the plain-words failure and re-enable the button, not reload. Red
against the old branch (the error node never renders; the wait is bounded and
swallowed so it lands as a named sub-check failure rather than aborting the
scenario), green after.

## `depends_on: [viewer_browser_tier_wait_predicates]` — not required

The handoff asked me to check. That handoff landed as `cca3312`, which touched
three hunks in `scripts/run_viewer_browser_tests.mjs` — `testRebuildAffordance`
scenario 3, `testServedModeBoot` and `testAnnotateFlyout` — and **not** the
`CARD_LAYOUT_VIEWPORT` block. Its own lesson confirms the intent: the card block's
waits were examined and deliberately left alone ("Checked, sound — every
`{ state: "visible" }` wait on a card/popover ... do not 'fix' these"). The
ordering cost nothing, but nothing needed it. It did land me in `scenario 3` of
`testRebuildAffordance` for deliverable 2 — I inserted a new scenario 3 and
renumbered its "fresh provenance" case to 4 — so there was a small overlap after
all, just not the one the handoff predicted.

## Running the browser tier from a worktree

Unchanged from `LESSONS_20260911_viewer_browser_tier_wait_predicates.md` and
still both true and still both needed: `cp -r C:/workspace/tolstack/node_modules
./node_modules` (gitignored, so absent here) **and** `--repo C:/workspace/tolstack`.
Its CRLF warning is real for this file too — I edited both files through a
helper that round-trips line endings deliberately, and `git diff --stat`
(174 insertions, 22 deletions across two files, not 2000) is the check that it
worked.
