---
type: review
handoff: docs/sessions/active/HANDOFF_20260911_viewer_popover_clamp_and_rebuild_terminal_state.md
reviewer: agent (review/viewer_popover_clamp_and_rebuild_terminal_state)
date: 2026-09-15
verdict: APPROVE
blockers: 0
---

# Review — viewer_popover_clamp_and_rebuild_terminal_state

One commit, `8646ea2`, 401 insertions / 30 deletions over
`apps/viewer/topology_app.js`, `scripts/run_viewer_browser_tests.mjs`, a lesson
and one issue the agent filed against its own work. Not previously merged into
`integration` (`git merge-base --is-ancestor` → not an ancestor), so the
merge-and-watch-it-go-green step was real. No stack content, no `source_ref`,
no tolerance value anywhere in the diff — the seven mandatory checks are
**not applicable** to this handoff and are recorded as such below rather than
skipped silently.

## The mandatory checks

1. **Every tolerance traces to a spec/callout** — N/A, no element values touched.
2. **Signs on every path term** — N/A.
3. **LMC/MMC direction** — N/A.
4. **RSS actually computed** — N/A; `fold()` untouched, no arithmetic added
   (grepped the diff: the only numbers are viewport geometry in `position()`
   and its browser-tier mirror).
5. **Nominal inside its own min/max** — N/A.
6. **Quantised constraints** — N/A.
7. **Traced/inferred/untraced ratio** — N/A; no projection rebuilt, no ratio
   restated.

## What I verified, and how

**Suites, on the merged tree.**

- `venv-win/Scripts/python.exe -m pytest -q` in this review worktree:
  **815 passed, 1 skipped**. The skip is the known worktree-only one
  (`test_viewer_js_suite.py:55` — node-fs tier has no projection to read
  because `data/` is gitignored), not a new one.
- `node scripts/run_viewer_browser_tests.mjs --repo C:/workspace/tolstack`:
  **17/17 browser checks**, `[topology] 122/122` both modes,
  `[rebuild affordance] 10/10`. That `--repo` column is the merged tree against
  the main checkout's real `data/`, which is what the "run it in both
  checkouts" checklist item is actually asking for — the main checkout itself
  is on `master` and cannot exercise this merge.
- **No `data/` pollution.** Nothing under `C:\workspace\tolstack\data\`
  has an mtime inside the window my two suite runs occupied (the 45 files
  touched ~2h earlier belong to a concurrent sibling session, not to me).

**Both new guards observed failing** (the universal "a new guard has been
observed failing" check — I did not take the lesson's red-then-green on faith).
Reverting `position()` to the pre-handoff three lines *and* `pollRebuild`'s test
back to `status.state === "failed"`, in one scratch mutation:

```
[topology file://] 119/122 FAIL   the card wants more height than there is room … (tripwire)
                                  the open card's bottom edge is inside the window
                                  the capped card keeps the overrun reachable in its own scrollport
[topology http]    119/122 FAIL   (same three)
[rebuild affordance] 8/10 FAIL    a terminal `idle` … is not read as a finished rebuild
                                  …said in plain words, with no command or path in it
```

Both blocks go red, in the right place, with names that say what broke.
Restored and re-verified clean afterwards.

**The third measurement this repo's checklist demands of a strengthened
geometric guard** — that the guard cannot be quietly returned to a stage where
the defect is invisible. Shipped code, `CARD_LAYOUT_VIEWPORT` put back to
`1600x1000`: `[topology] 120/122 FAIL` on the tripwire and on the scrollport
check. The witness fires for being *unable to see* the defect. That is the
property `hover_card_layout_guard_can_fail` was a whole handoff about, and this
handoff kept it.

**The terminal-state vocabulary, re-read at the source rather than from the
lesson.** `C:\workspace\drawing-checker\webui\tolstack_rebuild.py`:
`IDLE/QUEUED/RUNNING/DONE/FAILED`, `STATES` at line 56,
`"busy": self.state in (QUEUED, RUNNING)` at line 148, `DONE if rc == 0 else
FAILED` at 233. `done` is the only completion state; the comment and the lesson
state it exactly. Also checked the race the change could have introduced and
did not: `request()` sets `QUEUED` synchronously and returns `as_dict()`, so the
POST's own reply is always `busy: true` — the new strict test cannot reject a
real rebuild on its first poll.

**The handoff's one named trap — the card must not land on its trigger.** The
shipped fix caps rather than moves, so by construction it cannot. Verified the
lesson's correction of the handoff's stale reasoning, too: `grep -rn
"mouseleave" apps/viewer/` returns **nothing** — no popover in this app closes
on mouseleave, so the handoff's and the issue's stated mechanism
(opens-then-closes) was wrong and the real one (closes-then-reopens, because
`onmouseenter` on the covered trigger re-fires) is right. The browser tier now
pins both halves: a real `page.mouse.move` onto the card's centre, and a
side-agnostic "card sits clear of its trigger" assertion.

**`position()` read for correctness on paper**, all four regimes. Fits below →
unchanged. Fits above only → `goAbove` is a strict monotone extension of the old
predicate (if it genuinely fits above and not below, then `roomAbove ≥ height >
roomBelow`, so every case that used to go above still does). Fits neither →
capped to the roomier side, placement lands the card at `top: 8` (above) or
`bottom: innerHeight - 8` (below) exactly. Trigger off-screen → the inline cap is
only ever set when `room < height`, and `height` is already bounded by the
stylesheet's `max-height: calc(100vh - 24px)`, so the inline value can never be
*larger* than the stylesheet cap it overrides. The `maxHeight = ""` reset is
reachable on every open — both `showCrop` and `showCard` go through `position()`,
and there is no other writer of that inline property.

**One copy only.** `grep -rn "roomBelow\|goAbove"` finds the one `position()` and
its browser-tier mirror; the retired stack viewer's `app.js` is gone, so the
"ported verbatim" comment has no live second copy to have gone stale.

## Findings

### Should-fix (1) — filed, not fixed

- **`REBUILD_DONE = "done"` is an unpaired hand-copy of another repo's
  constant.** `apps/viewer/topology_app.js` and
  `scripts/run_viewer_browser_tests.mjs`' stub each carry the literal `"done"`;
  the definition is drawing-checker's `webui/tolstack_rebuild.py: DONE`. The
  test and the client therefore agree with each other whether or not either
  agrees with the server, and the in-repo pairing tests
  (`tests/test_js_python_vocabulary.py`) structurally cannot see a definition
  that lives in another repo. Ask the universal question — *if the source
  changes tomorrow, what breaks loudly?* — and the answer here is nothing.
  This is the exact exposure the handoff named ("a client that hard-codes a
  state string the server never sends fails closed forever"), and the work took
  the only sound available design; what is missing is anything that would tell
  you. It fails **closed** (every successful rebuild reports failure, loudly, to
  the reader) rather than open, which is why it is a should-fix and not a
  blocker. Filed as
  `ISSUE_20260915_rebuild_done_constant_is_unpaired_with_drawing_checkers_states.md`
  (`type: chore`, `priority: low`) with three candidate closures ranked by cost.

### Nits (3)

- `ISSUE_20260914_card_layout_guard_cannot_see_the_absolute_popover_again.md`
  ends by asking the reader to *decide whether the contract is worth a
  configuration of its own at all* — a design call, not a fix — but carries no
  `audience: strategy`, so triage will route it straight to a tactical handoff
  that has to make that call anyway. Everything else about its frontmatter is
  exact. Left as the author wrote it; triage can re-route in one line.
- `apps/viewer/style.css`'s `.croppop` comment still reads "*the max-height
  keeps a tall card reachable*" as though the stylesheet owned that cap.
  `position()` now overrides it inline on exactly the cards this matters for.
  One clause would keep the next reader of that rule out of a dead end.
- The scenario-3 sub-check "*…and the button comes back, so it can be asked for
  again*" passes against the unfixed branch as well (both paths clear
  `rebuild.busy`). It is a real contract about `rebuildFailed()`, so not
  vacuous — but it is not part of this scenario's witness, and a future reader
  counting red sub-checks in the replay should expect two, not three.

### Not findings, recorded because they cost me a measurement

- The degenerate case the code's own comment claims (`Math.max(80, …)`) does
  leave the card past the window bottom, but only for a window shorter than
  roughly 218px, where no assertion in this tier runs. The comment says as much
  and prefers a scrollable stub to an invalid `max-height`. Agreed; nothing to
  file.
- Flipping `.croppop` back to `position: absolute` does **not** leave the whole
  suite green: `[app file://]` and `[app http]` abort with
  `locator.click: Timeout 30000ms exceeded`. The filed issue's claim is narrower
  than that and is exactly right as written (`[topology] 122/122`), but the
  distinction is worth having on the record — a timeout in an unrelated suite is
  a symptom with no name attached, not a guard, and it is the same tell this
  repo's checklist already records from the 2026-09-11 half-revert.

## Checklist maintenance

Two entries appended to `docs/prompts/REVIEW_AGENT.md` → *Recurring bugs to
check*, both genuinely new shapes rather than second sightings:

- **A fix that makes the app more correct can make the guards already in that
  block vacuous** — audit the old sub-checks, not just the new ones, and run the
  old block's own revert-replay. This review's replay is the evidence
  (`position: absolute` → still 122/122).
- **A client constant hand-copied from another repo's source, with nothing in
  this suite pairing the two** — the cross-repo member of the
  restated-vocabulary family, with the fails-closed/fails-open distinction that
  decides its severity.

## Note for the next reviewer

The `CARD_LAYOUT_VIEWPORT` block now measures two different things whose
witnesses point in opposite directions: the cap contracts (falsifiable at
1600x700, verified here) and the out-of-flow contract (no longer falsifiable
anywhere, `ISSUE_20260914_…absolute_popover_again`). Do not read a green
`[topology] 122/122` as evidence about `position: fixed` until that issue is
closed one way or the other.

The lesson is unusually good and worth reading before touching `position()`:
it records a measured dead end (the handoff's own suggested clamp, which makes
the card undismissable) that a future handoff would otherwise re-discover from
the issue text.

## The integration merge, and its one conflict

`integration` moved from `13ce30f` to `3c0af96` while this review ran
(`spec_crop_region_registry` landed, plus a master sync), so the finishing merge
was not a fast-forward. Merging `integration` into this review branch conflicted
in exactly one file: **`docs/prompts/REVIEW_AGENT.md`**, both sides appending to
the tail of *Recurring bugs to check* — my two new entries on one side, that
review's "a declared-rect registry is a provenance artifact" entry on the other.
Nothing overlapping, nothing contradictory: **both sides kept, in that order**,
three conflict markers removed and nothing else touched. That is the whole
resolution; no judgement about whose intent survives was needed, because the
overlay is an append-only checklist and neither side edited the other's text.

Re-verified on the merged tree, not on the pre-merge one:
**869 passed, 1 skipped** (`pytest -q`, up from 815 because
`spec_crop_region_registry` brought its own tests) and **17/17 browser checks**,
`[topology] 122/122` both modes, `[rebuild affordance] 10/10`.
