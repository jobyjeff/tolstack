---
type: review
handoff: docs/sessions/active/HANDOFF_20260916_reader_facing_copy_and_vocabulary.md
reviewer: review agent (opus)
date: 2026-09-16
verdict: REQUEST CHANGES
blockers: 1
---

# REVIEW 2026-09-16 — reader_facing_copy_and_vocabulary

One blocker in a branch that is otherwise the best-evidenced piece of work this
repo has seen: every count in the lesson re-derived exactly, three planted
positives reproduced by hand plus three more of my own, and the guard's own
"the scan matched nothing and nobody could tell" story is the most useful thing
in it. The blocker is narrow and is the handoff's own Definition of Done:
**item 2's string — the highest-priority issue in the set — is pinned by
nothing, in any of the three tiers.** I deleted it and everything stayed green.

Not merged to `integration`. Merged into `review/reader_facing_copy_and_vocabulary`
(fast-forward — merge-base was `integration` exactly, no conflict) so the tiers
could be run against the merged tree.

## What I ran

| | pre-merge (`integration`, `2c83917`) | post-merge |
|---|---|---|
| `venv-win/Scripts/python.exe -m pytest -q` | 1 failed, **1186** passed, 1 skipped | 1 failed, **1192** passed, 1 skipped |
| `node apps/viewer/run_tests.cjs --repo C:/workspace/tolstack` | — | **419/419** |
| `node scripts/run_viewer_browser_tests.mjs --repo C:/workspace/tolstack` | — | **20/20** |

The one pytest failure is
`test_no_live_document_states_an_unguarded_hardware_entry_count`
(`docs/strategy/BRIEF_20260915_origin_posture_and_absent_feature_rule.md:152`).
**Confirmed red on `integration` before this branch was merged**, exactly as
the lesson says, and already filed several times over. Nothing in this diff
touches it.

The main checkout's `data/` and working tree were clean before and after every
run — no production-data pollution. (The browser tier needs `node_modules`,
which is gitignored and main-checkout-only; I used the junction the lesson
documents.)

## The mandatory stack checks

**Not applicable, and deliberately so.** This diff changes no element value, no
`source_ref`, no path term and no `lmc`/`mmc` — it touches `apps/viewer/`,
`apps/viewer/tests.js`, `tests/test_js_python_vocabulary.py`, two issues, a
lesson and five screenshots, and nothing under `docs/tolerance_stacks/` or
`docs/topologies/`. Checks 1–7 (tracing, signs, material corners, LMC/MMC
direction, RSS, nominal-in-band, quantised constraints, traced ratio) have no
subject here. Verified by reading the diffstat, not by assuming it.

## Guards observed failing — six plants, all by hand on the merged tree

The handoff required a negative control and a planted positive. I re-planted
the author's three and added three of my own, reverting each after measuring.
Every one bit, and every message named the right file and the right string.

| plant | what I broke | what fired |
|---|---|---|
| **A** | `VA.exportRunsText` prepends `"runs: " + summary.ids.join(", ")` | `[real] no rendered stack surface …` — *`pitch_link_to_pitch_plate element pane on pitch_plate_flange renders "20260409_170546"`*, plus the `[real] every established export` row, 415/419 |
| **B** | `kvList`: `VA.fieldLabel(key)` → `key` | both stack walks (fixture: *`demo_joint stack page renders the schema field name `assembly_drawing``*; `[real]`: `assembly_revision`) **and** the shared joint-block renderer test, 416/419 |
| **C** | `VA.needsAnnotation` back to two inline literals | `test_no_viewer_vocabulary_is_spelled_as_a_comparison_chain` — *`apps/viewer/viewer.js:106: `confidence` is compared against ['no_source_ref', 'untraced'], which is exactly what VA.UNVERIFIED_CONFIDENCES spells`* |
| **D** *(mine)* | `build_topology_projection.UNVERIFIED_CONFIDENCES` grows `"recalled"` | the new pairing row, from the **Python** side: *"Python emits, the viewer has no branch for: ['recalled']"* |
| **E** *(mine)* | `VA.WORKSHEET_SOURCES`' `by_name` key renamed `matched` | the new pairing row from **both** sides at once, **and** `[real] no live value is one the viewer has no branch for` — so the `knownWorksheetSource` substitution really did keep the value guards' teeth |
| **F** *(mine)* | **item 2's qualifier deleted** from `VA.referenceText` | **nothing.** 419/419, 20/20, 1192 passed. See the blocker. |

## Lesson arithmetic — re-derived, all of it

Canonical check, and this lesson passes it cleanly, which is rare enough to say
out loud:

* `18 files scanned, 32 VA.<NAME> tables, 3 chains, 0 flagged` — exact, and the
  three chains are at `topology_app.js:947`, `views/topology.js:884` and
  `storage/http.js:64` as written.
* the negative-control table (`22`/`50`, `143`/`141`, `29`/`39`, `252`/`141`
  surfaces/field-names) — all four exact, measured by instrumenting the four
  walks and reverting.
* `1192 passed, 1 failed, 1 skipped`, `419/419` (`417` at session start: two
  new JS tests), `20/20` — all exact.
* `rotor_fastener_length` is the only live stack with `zero_width_count > 0`,
  and it is `2` — exact, so the `2 elements with no tolerance recorded` chip in
  screenshot 3 is the real plural arm and not a fixture.
* the "the handoff's live cases have moved" correction table — checked against
  the live projections: `pitch_link_to_pitch_plate:bolt_grip_11` is the only
  element carrying the four-clause revision; the stack element `fastener_grip`
  exists only on `vpa_output_to_pitch_plate` and carries the plain `"Rev 4"`.
  Correct. (A topology *edge* named `fastener_grip` exists on two topologies,
  but edges carry no `revision` — different namespace, not a counter-example.)

All five screenshots open and show the string the lesson attributes to them; I
read 2, 3 and 4 directly. Screenshot 2 shows
`dimensions from 260825_End_Stop_JC.xlsx · sheet End Stop Tol Stack
(unverified); 212966-006-A · sheet 4` on `pitch_system | hub`, which is item 2
working exactly as argued.

## Findings

### BLOCKER

**1. Item 2's rendered string is pinned by nothing — `apps/viewer/topology.js:2487-2488`.**

The handoff's Definition of Done for item 2 says: *"Pick one, say in the lesson
which and why, and **pin the chosen string at the value level**."* The first two
are done, well. The third is not.

Plant F: delete the qualifier clause from `VA.referenceText` —

```js
    return bits.join(" · ") +
      (reference.unverified ? " (" + VA.ATTENTION.unverified.text + ")" : "");
```
→
```js
    return bits.join(" · ");
```

and the result is **419/419 fast tier, 20/20 browser tier, 1192 pytest passes**.
The whole of item 2 — the qualifier, `VA.partReferences`' per-document
`unverified` flag (`topology.js:2436-2443`), and `views/cards.js`'s `title`
wiring — is one line from being silently reverted, on the **priority-med issue
the handoff calls "the highest in this set"**.

Why it slipped past an author who pinned everything else at the value level:
`VA.referenceText` *does* have value-level tests (`tests.js:3420-3443`), and
every one of them passes a reference object with no `unverified` key, so the
new conditional arm is dead in every test and live on every real page. The
`[real]` guard the handoff mentions (*"every live part with no drawing names
the document its own dimensions come off, or says nothing at all"*) cannot
help — the handoff says explicitly that **both** options pass under it.

Smallest fix (the author's, not mine — writing the test would be reviewing my
own work):

* a value-level `eq(VA.referenceText({document: …, unverified: true}), "… (unverified)")`
  beside the existing three, plus the negative (`unverified` absent → no suffix);
* one assertion that `VA.partReferences` actually sets the flag from an
  untraced edge and not from a traced one — that is the producer, and it is
  what no fixture exercises today;
* ideally one `[real]` assertion on `pitch_system | hub`, the live part the
  lesson identifies as the only one citing a traced drawing *and* an untraced
  workbook — it is the case the per-document (rather than per-line) design
  exists for, and the tie-break the lesson states is currently argued in prose
  with nothing standing on it.

### Should-fix

**2. `apps/viewer/README.md` now says three things the viewer no longer does.**
The README documents the rendered wording chip by chip and panel by panel, and
nothing pairs it against the strings, so all three went green:

* `:1154` — the chip legend still reads `dashed blue zero-width band` /
  `min == max`, both retired by item 3. This is the same table a reader goes to
  when they meet the chip.
* `:1276` — the `established` export row still promises *"the drawing-checker
  runs that consumed it, or *no run has consumed this export*"*. Item 4
  replaced the first half with *"read by drawing-checker N times, most recently
  <date>"*, and `VA.EXPORT_NO_RUNS_TEXT` is not that second phrase either.
* `:1320-1326` — *"a run id is a **link** only where the element's own crop
  resolved through that run … Every other id prints as plain text with a hover
  saying why"*. Now false end to end: no id is printed at all, the link's text
  is the drawing number and revision, and the ids live on the summary's
  `title`. The bullet's *argument* (a URL built from a prefix would be a guess)
  survives and is still worth keeping — it is the sentence around it that is
  stale.

**3. Stale comment, `apps/viewer/viewer.js:693`.** `VA.exportProvenance`'s
docstring still says *"`VA.citationWhere` already says `no source_ref`, and
saying it twice buys nothing"*. It says `no citation` now. Left for the author
rather than fixed inline, since the file is going back anyway.

### Nits

**4. `div.worksheet__body` is a dead exemption.** Instrumenting
`viewerAuthoredText` over the merged tree: every newly-enrolled
`VERBATIM_PROSE_CLASSES` selector matches live nodes — `dd.kv__value` 451,
`li.el-gaps__text` 129, `span.gap__text` 93, `tr.el-note--record` 65,
`p.check__guidance` 55, `li.notelist__note` 38, `div.el-row__srcnote` 12,
`div.el-row__callout` 6 — **except `div.worksheet__body`, which matches 0**,
because `stackSurfaces()` calls `VA.renderWorksheet(r, stackProj, null)` and a
null markdown renders no body. The worksheet body is therefore neither scanned
nor actually exempted; the enrollment reads as coverage that is not there.

**5. `dd.kv__value` exempts 451 nodes** — the value half of every free-form
authored block, which is the single most likely place for a workstation path or
a checksum to be *authored*. The argument for it (the record's words, not the
page's) is sound and is written down; it is worth knowing that the free-form
blocks are now scanned for their **labels** and not their **values**.

**6. `VA.exportRunsSummary.lastDate` is the last *parseable* date, not the last
run's.** `dates` is filtered before the last element is taken, so an export
whose final run has no `ts` and a non-date `run_id` reports the *previous*
run's day as "most recently". The comment claims the last recorded run. The
single-dateless-run case is tested; the mixed case is not. No live data reaches
it.

### Filed as an issue (out of scope, file-don't-fix)

`ISSUE_20260916_the_record_still_says_zero_width_band_on_the_screens_the_chip_now_calls_no_tolerance_recorded.md`
— the viewer's half of the zero-width/no-tolerance split is closed, but the
**record's** half is not: 12 authored instances across three stacks, two
topologies and `hardware_entries.json` still say "ZERO-WIDTH BAND", and one of
them is visible two lines under the corrected chip in this handoff's own
screenshot 3. It is an authoring decision (the same shape as the fenced
`revision` question), so it wants triage, not a rewrite.

## What I verified beyond the plants

* The two new pairing rows are real pairings, not assertions about themselves
  (plants D and E bit from Python and JS respectively).
* `knownWorksheetSource` replacing `inList(WORKSHEET_SOURCES)` in both value
  registries keeps them biting (plant E took `[real] no live value is one the
  viewer has no branch for` red).
* The six source issues all carry `status: triaged` + `handoff:` pointing here,
  so dispatch will resolve them on Complete. Nothing to do.
* Both newly-filed issues carry a correct frontmatter block —
  `type`/`priority`/`status`/`area`/`reporter`/`found_by`, no `handoff:`.
  Exactly right.
* `tests/debug_reader_facing_copy.mjs` is a hand-run probe under the repo's
  `debug_*` convention and is not collected by any tier.
* The `viewerAuthoredText` change from substring-subtraction to a subtree-skip
  narrows the *fixture* topology walk slightly (it previously scanned raw
  `textContent` for ids and banned strings; it now scans viewer-authored text,
  as the `[real]` walk already did). That is the right call given the run-id
  shape now in the banned list — a record's note legitimately names a run — and
  it makes the two tiers agree, which they did not before. Noted rather than
  flagged.

## Checklist maintained

Three entries appended to `docs/prompts/REVIEW_AGENT.md`'s **Recurring bugs to
check**: the suffix-on-a-shared-helper copy change that no test reaches
(finding 1), the viewer README left describing the old string (finding 2), and
the exemption selector that matches nothing (finding 4). No entries pruned —
several fired usefully this round (mutate the deliverable; audit the lesson's
arithmetic; the duplicate-filing entry, which is why the one red test needed no
new issue).

## For the next reviewer

The rework is small and bounded: findings 1–3, nothing else. When it comes
back, re-run plant F first — if deleting the qualifier still leaves three green
tiers, the blocker is not closed, whatever tests were added.
