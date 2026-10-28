# Lessons — the nav scene tree's six gestures, named once and each witnessed

## Vocabulary shape: a frozen table per side, paired by a test

`VA.SCENE_ACTS` (`apps/viewer/views/nav.js`) and `AA.RAIL_ACTS`
(`apps/annotate/commands.js`) are `Object.freeze({word: "word"})` tables. The
sender and `railGesture` read them (`VA.SCENE_ACTS.toggle`, `acts.toggle`), so
no word is spelled inline any more; `tests/test_rail_act_vocabulary_is_paired.py`
compares the two tables and scans for a re-spelled literal.

**Rejected: the annotator posts its list with the tree.** It would make the
receiver the one owner, but the viewer would then have no word to send until the
first tree arrived, a stale or missing list would silently turn every gesture
into a no-op, and the failure moves to runtime instead of a red test.

A one-sided rename was checked red by hand (`toggle` -> `toggleX` in nav.js).
The pairing test is a pytest guard; the census does not see the python tier, so
it has no mutation spec.

## Things worth knowing

- **Isolate is button 0 on a part row, not index > 0.** The only row with a
  button above index 0 is a part row: `[Isolate, Remove|Add]`. The index check
  presses button 1 (Remove, then Add to put it back) and asserts the
  annotator's own member button flipped and Isolate did not engage.
- **Moving a literal rots other specs.** Five existing specs anchored on
  `send(row.key, "enter")` and the like in nav.js; they read "ANCHOR ROTTED"
  until re-pointed. Any change to a line a spec's `find` quotes needs
  `--changed-since` to be run, not just the new specs.
- **A mutation that reddens another check does not witness.** My first "ticking
  again shows the body" mutation (`!checked`) broke the first click, so the
  hide check went red instead. The mutation has to leave every earlier check
  intact (`checked`: hide works, show never does).
- **The unknown-act warning comes before the key lookup** (a bad word is a
  defect whatever the key); an unknown key stays quiet.
- A worktree has no `node_modules`; I junctioned the main checkout's in to run
  the browser tier and removed the junction afterwards. The first browser run
  timed out loading under machine load; the rerun was clean (22 s).

## Sites

Reached: nav sender, annotator receiver, the five specs/anchors that quoted the
old literals. Not reached: `apps/viewer/topology_app.js`'s `sceneRail` only
passes `act` through, so it needs no change.
