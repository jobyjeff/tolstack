# LESSONS 2026-09-15 — viewer_value_guard_rows_and_replays

Four items out of the 2026-09-15 triage sweep: enrol the branched topology
fields `TOPO_VALUE_GUARDS` missed, give the stack-side bite test the
empty-collector replay, fix and pair the "10 of the 46 live nodes" sentence,
and stop `test_every_prose_field_the_count_pairing_claims_is_really_scanned`
pinning which fields the corpus states an inventory in.

Everything below is what the next agent could not get from the diff.

---

## 1. The audit that produced this handoff had gone stale in one place — check before you copy a rationale into a comment

The handoff was explicit that two findings were **deliberately not rows** and
that "the reasoning must survive into the code or a comment so the next audit
does not re-derive it". One of those two rationales was no longer true by the
time I read it.

`ISSUE_20260915_four_branched_topology_fields_have_no_value_guard_row.md`
measured `studies[].checks[]`'s `verdict` / `verdict_scope` /
`worst_confidence` as *"the topology page renders none of them;
`views/topology.js:1127` says so and grep finds no reader."* That was correct
when it was measured. Then `viewer_study_verdicts_and_gaps` merged (also
2026-09-15, `0c56580`) and put the verdict strip on the page. Today:

- `verdict` — read by `VA.studyCheckRow` (`apps/viewer/topology.js:406`) and
  `VA.studyVerdict`, rendered as the verdict chip on the cards `views/topology.js`'s
  `VA.renderTopoTotals` builds. Live values `pass`/`fail`/
  `marginal`, 18 checks across 21 studies.
- `verdict_scope` — read at `topology.js:407`, gives the BUDGET chip or the
  loud `SCOPE UNKNOWN` fallback. Live `budget`/`joint`.
- `worst_confidence` — still read by **nothing** on this page. `grep` across
  `apps/viewer/` finds only `views/stack.js`, which reads the *results*
  projection's copy (already guarded stack-side).

So two of the three became rows and the third stayed a non-row, and the note
in the table says exactly that, dated, with the reason it changed. **The
lesson for the next agent is the general one:** a handoff that tells you to
write down a measurement is telling you to write down *a* measurement, not to
transcribe the one in the issue. Re-run the grep. A comment asserting "this is
rendered nowhere" beside a field that is on screen is worse than no comment —
the file already says so about itself, three lines from where I was working
(`views/topology.js`, the `renderTopoTotals` preamble: *"for six days after
that the field existed and nothing read it — the comment that used to sit here
said the opposite, which is how a stale comment costs more than no comment"*).

Line numbers in the issues are also all shifted: `respine_tween_fidelity_round2`
landed between the audit and this session and moved everything in
`views/topology.js` by ~30-140 lines. Grep for the branch, never `sed -n` the
cited line.

---

## 2. The final `TOPO_VALUE_GUARDS` row list — 9 → 15

One line each on why the field is in it. (Stack-side `VALUE_GUARDS` is
unchanged at **15** rows; the two tables now happen to be the same size, which
means nothing.)

Rows 1-9, unchanged, in file order:

| row | why |
|---|---|
| `layout.rows[].kind` | `node` is the grid's DEFAULT arm — a new kind renders as an interface with no value |
| `layout.links[].kind` | `close` is `railGeometry`'s default arm — a new kind is drawn as a loop closure |
| `edges[].value_source` | `VA.VALUE_SOURCES`; an unlabelled one gets the loud magenta chip |
| `studies[].status` | anything but `ok` renders the error block, so a third status shows totals as a refusal |
| `edges[].confidence` | `VA.confidenceClass`; `null` is the derived gap and is a real answer |
| `nodes[].kind` | `mating_surface` is the DEFAULT arm of the chip's explanation |
| `edges[].kind` | `structural` is the default arm; `gap` dashes the bar |
| `edges[].transform.kind` | anything but `identity` raises the chip and prints the sensitivity |
| `parts[].mesh.installed` | every 3D affordance hangs off `=== true`; absent reads exactly like "no model" |

Rows 10-15, added here:

| row | why | live values |
|---|---|---|
| `topologies[].worksheet_source` | the same `views/worksheet.js` branch the stack-side row guards, over the **other** projection — the stack table runs against `realResults` only and never sees this copy. Only `declared` earns the note; anything else prints nothing | `{null, "declared"}` |
| `edges[].zero_width` | falsy is the silent arm, and a zero-width band is a claim about a **lower bound** on the real spread — the chip a reader can least afford to lose quietly. Three readers: the row class, the detail chip, `topology.js`'s `no_tolerance` badge | `{false, true}` (54/4) |
| `nodes[].branch` | the BRANCH POINT chip, whose title is the page's only explanation of `BranchAmbiguity`. Falsy is silent | `{false, true}` (36/10) |
| `layout.rows[].branch` **(node rows)** | the *second* field the builder writes the same fork mark into — the rail dot's class and its larger radius, via `!!row.branch`. Guarding one is not guarding the other | `{false, true}` (163/10) |
| `studies[].checks[].verdict` | `VA.VERDICTS` through `VA.studyCheckRow` — the topology page's own reader, not the stack view's `VA.verdictClass`. On screen since `viewer_study_verdicts_and_gaps` | `{pass, fail, marginal}` |
| `studies[].checks[].verdict_scope` | `VA.VERDICT_SCOPES`; the reachable unknown here is a **stale projection**, not a new word, which is exactly what a guard over the live file catches | `{budget, joint}` |

**The one trap in the new rows:** `layout.rows[].branch` is collected over
`kind === "node"` rows only. Edge rows carry no `branch` key at all (164 of
them), by design, so a row that collected every layout row would see
`undefined` and fail on the first run. The filter is not a softening of the
guard — it is what makes `known: v === true || v === false` the strict test it
reads as.

### Where the two deliberate non-rows are recorded, and why there

**In the `TOPO_VALUE_GUARDS` array itself**, as a comment block immediately
after the last row, not in this lesson and not in a doc. The reason is stated
in the comment: that list is what the next person asking *"is this field
covered?"* reads — the handoff that added row 9 said so in as many words
(*"the next person to ask 'is this field covered?' is told to read the rows"*),
and a lesson is a place nothing schedules anyone to read. Both notes name the
thing that would make them rows:

- `studies[].checks[].worst_confidence` — *"WHOEVER PUTS A WEAKEST-INPUT CHIP
  ON THE STUDY STRIP: `VA.CONFIDENCES` arrives with it and wants a row here the
  same day."*
- `studies[].error.type` — a **loud** fallback (`VA.unlabelledStudyErrorText`)
  and no live study carries an error, so a row would trip the empty-collector
  arm on every run, permanently. Paired to Python by
  `tests/test_topology_projection.py` instead. Not a gap.

---

## 3. Both arms, both tables — and how I demonstrated it rather than asserted it

`unexplainedValues` and a new `replayBlindCollectors` are hoisted out of the
topology block up to the node-fs tier (just above `VALUE_GUARDS`), so both
tables call one copy. The signature gained a third parameter, `crops`, because
the stack-side rows take `(realResults, realCrops)` and the topology rows take
one argument and ignore the second. The two loops' messages differed ("the
collector in `tests.js` is wrong" vs "the collector is wrong"); the shared one
keeps the spelling that **names the file**, per the issue.

Row counts, before → after: `TOPO_VALUE_GUARDS` **9 → 15**, `VALUE_GUARDS`
**15 → 15** (rows untouched; its bite test gained the replay).

Four demonstrations, all by temporary edit + run + revert. Worth repeating
verbatim if you touch this table, because *"the test is green"* proves nothing
about a guard:

1. **Delete the empty-collector `push` in `unexplainedValues`** → both bite
   tests red, `[real] each value guard bites… : source_ref.confidence and
   elements[].confidence: a blind collector went unreported…: 0 !== 1`.
2. **`console.log` inside `replayBlindCollectors`** → 30 lines, one per row
   (15 stack + 15 topology), each `-> 1 report(s)`. This is the one worth
   doing: `eq` throws on the first failure, so a passing bite test does not by
   itself tell you it reached row 15.
3. **`known: () => false` per row, via the same probe** → every row has ≥1
   live distinct value and reports each. No new row is vacuous; the smallest
   is `studies[].status` with one live value, which is pre-existing.
4. **README digit edits** (below).

---

## 4. "17 of 46", and pairing a noun rather than a digit

`divergedFromDeclared` in the `[real]` node test is a **string** comparison
(`parts.join("|") !== sideIds.join("|")`), so it is **17**. The membership
count is **10**. The 7 in between are the same two parts in the opposite order
— authoring order against first-seen-edge order. The README and
`renderNodeDetail` both shipped 10 under the string wording.

I quoted **17** for the string claim (the handoff offered either that or
rewording to "a different **set**"), because 17 is the number the guard
already had in hand. The comment then carries 10 and 7 explicitly, with their
own noun, so the distinction survives — and all four digits (17, 10, 7, 46)
are re-derived inside `[real] every live dot answers the SAME on hover and on
click` from `data/projections/viewer/topologies.json`.

**The part worth stealing: the pairing pins the noun, not just the digit.**
The regex is
`/which is (\d+) of the\s+(\d+) live\s+nodes answering differently hovered and clicked/`
— it will not match if someone rewrites the sentence to the membership
wording, and the assertion message says so (*"that wording is the STRING
count, not the membership one"*). A pairing that only checked "some number
near the words 46 live nodes" would have passed the exact defect that was
filed.

It reads **both** documents through `VIEWER_SRC.readText` — `README.md` and
`views/topology.js`. `VIEWER_SRC` takes any path relative to `apps/viewer/`,
which I had not seen used for a `.js` file before; it works, and it is the
right seam (it deliberately does **not** go through `--repo`, so a worktree
checks its own source, not trunk's).

Reddening shown for each: README `17→18`, README `46→45`, comment `17→11`,
comment `10→9`. All reverted.

`ok(divergedFromDeclared > 0, …)` is untouched — it answers a different
question (could the pane still be printing `node.parts`?) and the handoff said
to keep it.

---

## 5. The prose-field replay: `>=` was offered; a derived set is better

The issue's fix shape was one character —
`assert replayed >= {"description", "notes"}`. I used a derived set instead:

```python
expects_replay = {n.rsplit(":", 1)[1]
                  for n in unlisted_inventory_fields(())} & set(PROSE_FIELDS)
assert expects_replay, (…vacuity…)
assert replayed == expects_replay, (…)
```

`unlisted_inventory_fields(())` — the **same scanner**, run with an empty
tuple, so it reports every top-level prose field of every committed topology
that states an inventory at all. No second copy of the rule, and nothing
hand-maintained on either side.

**Why not `>=`:** `>=` still hand-lists `{"description", "notes"}`, so it goes
spuriously red the other way round — remove an inventory sentence from
`description` (an equally ordinary authoring act) and the demonstration
reddens with a message about the wrong thing. The derived set moves with the
corpus in both directions.

**What stops it passing vacuously:** the separate `assert expects_replay`. If
nothing in the corpus states an inventory in any prose field, the replay loop
runs zero meaningful iterations and `replayed == expects_replay` is
`set() == set()` — green, proving nothing. The non-empty assertion is what
refuses that, and it turned out to be the arm that catches the failure the
`==` was really standing in for: **experiment C below.**

Experiments (all reverted):

| change | result |
|---|---|
| append `"The graph as modelled: 3 parts, 12 edges."` (correct, guarded) to `topology_rotor_fastener_length.json`'s `provenance.structure` | **green** — and `provenance` joins `expects_replay`, so the new field is fully replayed with nothing edited by hand. Same edit against the **old** test: red, exactly as filed |
| make that sentence wrong (`4 parts, 13 edges`) | red, in the **guard proper** (`test_a_topologys_own_notes_count_the_graph_they_describe`), which is the right test to object |
| drop `description` from `PROSE_FIELDS` | red |
| drop `notes` from `PROSE_FIELDS` | red |
| **C:** `unlisted_inventory_fields` stops honouring its `fields` argument (`key not in PROSE_FIELDS` instead of `key not in fields`) | red, on the **vacuity** assertion — `expects_replay` collapses to `set()`. This is the defect that argument exists to rule out, and `>=` would **not** have caught it |

---

## 6. Environment notes that cost time

- **The suite is one test red at baseline, and it is not yours.**
  `tests/test_provenance.py::test_every_byte_identity_claim_in_a_live_file_names_its_verification`
  fails on a clean tree: `docs/strategy/BRIEF_20260915_origin_posture_and_absent_
  feature_rule.md:62` uses "byte-for-byte" as a figure of speech about
  *behaviour*. Committed by the 2026-09-15 triage sweep (`df21a4a`). Filed as
  `ISSUE_20260915_a_strategy_briefs_byte_for_byte_figure_of_speech_reddens_the_provenance_guard.md`.
  Counts this session: **886 passed, 1 failed, 1 skipped**, unchanged
  before and after my work. (The handoff expected `880 passed, 1 skipped`;
  the passing count moved with intervening merges.)
- **`node_modules/` does not exist in a worktree** and the browser tier dies
  with `ERR_MODULE_NOT_FOUND: playwright-core` before printing anything about
  `--repo`. Node's ESM resolution walks *parents*, and the main checkout is a
  sibling. A directory junction fixes it without a network install:
  `New-Item -ItemType Junction -Path <worktree>\node_modules -Target C:\workspace\tolstack\node_modules`
  (`node_modules/` is gitignored, so it commits nothing). **Remove it before
  you finish** — dispatch deletes the worktree at Complete and a recursive
  delete that follows a junction would reach the main checkout's copy.
- **Reading a projection from Python on this box needs
  `encoding="utf-8"` explicitly** — the default is cp1252 and
  `topologies.json` has a byte it will not decode.
- `git checkout <file>` reverts to **HEAD**, not to your uncommitted edit.
  I lost the README's `10 → 17` edit that way while reverting a mutation
  experiment; commit before you start mutating, or `cp` to the scratchpad.

---

## Out of scope, filed rather than fixed

- `ISSUE_20260915_worksheet_source_vocabulary_has_no_va_constant.md` — the
  four-fields issue asked for a `VA.WORKSHEET_SOURCES` as part of the fix, and
  the constant belongs beside `views/worksheet.js`'s branch, in `viewer.js` or
  `topology.js`. The handoff scoped me to four files and named
  `apps/viewer/topology.js` do-not-touch. So the vocabulary is currently **one
  shared `WORKSHEET_SOURCES` inside `tests.js`**, read by both guard rows —
  one copy instead of two, but still not co-located with the branch. The
  comment above it names the issue.
- `ISSUE_20260915_a_strategy_briefs_byte_for_byte_figure_of_speech_reddens_the_provenance_guard.md`
  — the baseline red, above.

## Out of scope, fixed anyway (one sentence)

`docs/prompts/REVIEW_AGENT.md`'s value-guard checklist pointed at
`[real] each value guard bites when fed a value nothing can explain` **by
name**, and deliverable 2 renamed that test. A pointer I broke is mine to keep
true, so I updated the name and added one sentence on the second arm. Nothing
else in that file was touched.
