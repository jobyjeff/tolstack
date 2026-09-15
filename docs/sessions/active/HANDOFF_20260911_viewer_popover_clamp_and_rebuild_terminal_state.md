---
priority: low
depends_on: [viewer_browser_tier_wait_predicates]
model: opus
---

# HANDOFF 2026-09-11 — viewer_popover_clamp_and_rebuild_terminal_state: clamp the hover card's bottom edge; stop reading `idle` as a finished rebuild

Source: triage sweep 2026-09-11, folding two issues that both live in
`apps/viewer/topology_app.js` —
`docs/issues/ISSUE_20260911_hover_card_bottom_unreachable_on_a_short_window.md` and
`docs/issues/ISSUE_20260911_poll_rebuild_treats_idle_as_success.md`. They are
unrelated in mechanism and staged together only because they edit the same file.
Baseline: trunk after the 2026-09-11 batch merge.

`depends_on` — and why: deliverable 1's guard goes in the `CARD_LAYOUT_VIEWPORT`
block of `scripts/run_viewer_browser_tests.mjs`, which
`viewer_browser_tier_wait_predicates` is editing in the same window. Landing after it
avoids resolving that file twice. Check the reasoning when you arrive — if that
handoff turned out not to touch the card block, the ordering cost you nothing but was
not required, and the lesson should say so.

Scope: `apps/viewer/topology_app.js` and the card block of
`scripts/run_viewer_browser_tests.mjs`; do NOT touch `apps/annotate/`
(`annotate_load_gate_settles_on_failure` owns it) or the served-mode/flyout suite
functions.

## Deliverable 1 — a hover card taller than the room below its trigger hangs off the window bottom

Measured while strengthening the card-layout guard
(`hover_card_layout_guard_can_fail`, 2026-09-11) on the **shipped** `position: fixed`
popover — so this is not the layout-disturbance defect that handoff was about, and
the fix is not a revert of anything.

`position()` places the popover below its trigger, or above it when it genuinely fits
above, and clamps only the TOP edge (`Math.max(8, …)`). Nothing clamps the bottom.
When a card fits neither below nor above — a short window — it renders below anyway
and its bottom edge lands past the viewport:

```
topology.html?mock=1 at 1600x700, hover the base_thickness crop trigger
-> edge card is 528px tall, placed at top: 361.5px  ->  bottom at 889px,
   ~190px below a 700px window.
```

`max-height: calc(100vh - 24px); overflow-y: auto` does not save it: the cap stops the
card being *taller* than the window, but this card is already shorter than the cap
(528 < 676), so nothing scrolls and the offscreen strip — on the edge card, the
citation line and the crop-key claim — is simply unreachable. A `position: fixed`
element cannot be scrolled into view.

Fix shape from the issue (suggested, not binding — one function, no CSS): clamp the
placement so the card's bottom stays on screen, e.g.
`top = min(desiredTop, innerHeight - height - 8)`, with the existing `Math.max(8, …)`
floor still winning for a card taller than the window, which then genuinely needs its
`overflow-y` scrollbar.

**The one trap, already named in the existing comment:** a card nudged back up must
not land ON its trigger, or the resulting `mouseleave` closes it the instant it opens.
A clamp that would overlap the trigger should keep the above/below decision it has and
accept the cap instead. Prove you did not regress this — an opens-then-closes card is
worse than one with an unreachable footer.

Guard to add with the fix: the browser tier's card block already measures at a 700px
viewport (`CARD_LAYOUT_VIEWPORT` in `scripts/run_viewer_browser_tests.mjs`), which is
exactly the configuration that shows this. One more assertion there — that the open
card's bottom is inside the viewport — is the whole test.

## Deliverable 2 — `pollRebuild()` reads any non-failed terminal state as success

`apps/viewer/topology_app.js:855`:

```js
function pollRebuild(status) {
  if (status && status.busy) { /* re-poll after REBUILD_POLL_MS */ return; }
  if (!status || status.state === "failed") { rebuildFailed(); return; }
  state.rebuild = { busy: false, error: null };
  load().catch(...).then(render);
}
```

Two terminal branches: `failed`, and everything else — treated as success and
triggering a reload. So a terminal `idle` is read as "the rebuild finished fine."
Reachable if the server restarts mid-poll: the new process has no memory of the run,
answers `idle`, and the viewer reloads and re-renders as though the rebuild had
completed. The result is a silently stale projection **presented as a fresh one** —
the same shape as the 2026-09-06/08 stale-projection incident this repo already paid
for once, except here the page actively asserts freshness.

Fix shape (suggested): make the success branch require the state the server actually
reports on completion, rather than accepting the complement of `failed`, and route an
unexpected terminal state to `rebuildFailed()` — an unknown status is not evidence of
success.

**Read the vocabulary from the server, do not guess it.** The real endpoint has since
also shipped in drawing-checker; find what terminal states it can actually emit before
pinning a value, and say in the lesson where you read them from. A client that
hard-codes a state string the server never sends fails closed forever, which is a
worse bug than the one you are fixing.

## Definition of done

- At 1600x700 on `topology.html?mock=1`, the `base_thickness` edge card's bottom edge
  is inside the viewport, and the card still does not close on open (both
  demonstrated, not asserted in prose).
- A `CARD_LAYOUT_VIEWPORT` assertion that fails against today's code — run it against
  the unfixed `position()` and show it red before you show it green.
- `pollRebuild` treats only the server's real completion state as success; an `idle`
  or unknown terminal state does not trigger a reload-as-success.
- Full suite green (`venv-win/Scripts/python.exe -m pytest -q`), plus
  `node scripts/run_viewer_browser_tests.mjs --repo C:/workspace/tolstack`.
- Lesson (`docs/sessions/lessons/LESSONS_20260911_viewer_popover_clamp_and_rebuild_terminal_state.md`):
  where you read the rebuild endpoint's terminal-state vocabulary from, and whether
  the `depends_on` ordering was actually necessary.
