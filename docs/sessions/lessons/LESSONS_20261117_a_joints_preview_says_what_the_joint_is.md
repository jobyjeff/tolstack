# Lessons — a_joints_preview_says_what_the_joint_is (2026-11-18)

## What changed

- **Vocabulary.** `VA.ELEMENT_KIND_WORDS` / `VA.elementKindWord` (`apps/viewer/topology.js`):
  `mating_surface` → "mating surface", `datum_feature` → "datum feature",
  `structural` → "dimension", `gap` → "gap". Built with `VOCAB.table` over the generated
  `NODE_KINDS` and `EDGE_KINDS`, so a kind added in Python and named nowhere throws on page
  load; a viewer test also walks both lists. The node and edge Preview chips print it, and
  those chips carry `chip--word` (`.chip--kind.chip--word` drops the monospace: a word is prose,
  an id is not).
- **Notes.** Every node and edge `note` in `topology_vpa_end_stop_v2.json` and
  `topology_vpa_pitch_linkage.json` lost its "Was named … until", "New in v2 (…)", "Since/Until
  <date>", "Added <date> (<slug>)" and handoff slugs. A note that was only history was deleted.
  `What would close it:` became `Value to come from` (v2 edges, which `tests/test_topology.py`
  now pins to that wording alone, and v1's).
- **Guard.** `BANNED_AS_HISTORY` in `tests/test_topology_prose_for_a_reader.py`: an ISO date,
  "Was named" / "New in" / "handoff", or any handoff slug read from the board's own
  `HANDOFF_*.md` names. It extends the file's existing banned-string guard rather than adding a
  second one. It covers node and edge notes (the Preview's surface), not part notes.
- **Fix shape chosen: rewrite, not fold behind a disclosure.** History is not information the
  Preview's reader needs at all, and git already has it; a collapsed line would keep a
  rule-breaking string on the surface and make the guard impossible to state. The prose-budget
  rule's own text is "No negation, no history, no echo".

## Rules this answers

`dispatch/dispatch/prompts/TACTICAL_AGENT.md`, "Prose budget": "**No negation, no history, no
echo.** Never say what a thing isn't, what it used to be, or restate a requirement already on
screen"; and "Web-UI design rules": "no internal file/module names in user-facing copy; badges
use everyday words". The handoff slugs and the stored kind spelling were those two.

## Shots

`shots/a_joints_preview_says_what_the_joint_is/rotary_joint_selected_3840.png` and
`rotary_joint_selected_1920.png`: the hub / blade rotary joint selected on the map. Chips read
"mating surface · rotary · 3 edge(s)" and the note reads "The blade turns in this bore about its
pitch axis: the base's rotary joint with the blade." Taken by `tests/debug_joints_preview_20261118.mjs`
against a scratch copy of `data/` with the topology projection rebuilt from this branch.

## Surprises

- **The mutation witness cannot clear from a worktree for a branch that edits a topology.** The
  clean run of the new spec is red on the `[real]` "projection was built from this tree" check
  (topologies.json's inputs differ), so `run_mutation_witness_tests.mjs --only` reports NOT
  WITNESSED ("the tier was red before the mutation"). `rebuild_projections.ps1` rebuilds from the
  main checkout, so a tactical branch cannot fix that. I applied the mutation by hand instead:
  the guard went red alone, and was green again once reverted. The review's post-merge witness
  run will be the first clean proof.
- A `git diff` of the notes looks bigger than it is: JSON string values are single lines.
- Writing `\b` inside a non-raw Python heredoc string produces a backspace character; the file
  looked right and a self-test caught it. Use the Write tool for scripts with regexes.

## Not done (filed)

- Part notes (13 in v1) still carry dates, run ids and issue file names:
  `docs/issues/ISSUE_20261118_part_notes_carry_dates_and_run_ids_on_the_hover_card.md`.
- Many node notes still run over the one-line budget (mesh measurements). Not history, not in
  this handoff's scope.

## Sites

Reached: the node Preview, the edge Preview (both chips), both models' node and edge notes, the
tree and the hover cards (they render the same notes). Not reached: `parts[].note` (filed above),
`bodies[].note`, edge `source_ref.note` (a citation's argument keeps its dates).
