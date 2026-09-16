---
type: review
handoff: docs/sessions/HANDOFF_20260916_js_guards_and_suite_isolation.md
reviewer: agent
date: 2026-09-16
verdict: APPROVE
blockers: 0
---

# REVIEW 2026-09-16 — js_guards_and_suite_isolation

Four commits on `handoff/js_guards_and_suite_isolation` (`f5079b1`, `d09edf0`,
`ee119d1`, `71a36cf`), 649 insertions across three source files, one lesson and
two issues. Nothing uncommitted in the tactical worktree. Merged into
`review/js_guards_and_suite_isolation` with **no conflict** — `integration` had
moved two commits (`41b1e22`, `d770446`) under the branch, both docs + Python
tests, disjoint from this work.

## What I verified

**Every one of the three plants, replanted by hand.** I did not take the
lesson's transcripts on trust; I made each edit myself in this worktree and ran
the named tier. All three reproduce, and all three failing lines match the
lesson **verbatim**:

1. `VA.VERDICTS` reordered to `fail, marginal, pass` in `apps/viewer/viewer.js`
   → `FAIL worstVerdict ranks fail over marginal over pass, whatever order the
   checks arrive in / not equal: "pass" !== "marginal"`, **411/412 passed**.
   The new check is the only one of 412 that reddens, as claimed. I also ran
   `pytest -q tests/test_js_python_vocabulary.py` under the plant: **14
   passed** — the set-comparison pairing really is blind to the permutation,
   which is the whole premise of deliverable 1.
2. The command inlined at `apps/annotate/app.js:741` → `FAIL loadAll's
   no-projection branch renders that constant, not a sentence of its own`,
   **65/66 passed**, with `PASS this app holds no terminal command for a banner
   to render` printed two lines above it. That pair of lines is the defect in
   two lines and the lesson is right to say so.
3. `var settling = false` in `apps/viewer/views/topology.js` →
   `FAIL sub-check: the study's respine transition settles before any of its
   rows are addressed …` followed by the byte-identical strict-mode violation
   the original issue reported. Reverted after each; tiers back to green.

**The pre-fix defect, reproduced on `integration` before merging.**
`--only "annotate flyout"` on the unmerged review branch aborted with the
issue's exact error (`resolved to 2 elements`), so the failure is real here and
the merge is what changes it — my "watch it go green" step was not a no-op.

**Deliverable 3's stated cause, checked against the source rather than the
narrative.** `VA.RESPINE = { duration: 260 }` at `apps/viewer/topology.js:1012`
✓. `ghostOf` at `apps/viewer/views/topology.js:432` **re-parents** (`appendChild`
of the live `.tv__hscroll`, not a clone) into an `aria-hidden="true"`
`div.tv__ghost` ✓, and its own comment argues against redraw and against clone,
which is what makes "the second row is by design" the right reading. The
`rail__barhit` line does carry the edge's `data-id` (`fade(VA.svg("line",
"rail__barhit", …), "edge", mark.id)`), so the lesson's correction to the
issue's "unique `data-id`" premise stands. Only one nav click per half, so
there is no second un-waited respine in this suite.

**Definition of done, re-measured here, not quoted:**

| DoD item | handoff | measured in review |
|---|---|---|
| `node apps/viewer/run_tests.cjs --repo C:/workspace/tolstack` | 407 + new | **411/411** pre-merge → **412/412** post-merge |
| `node apps/annotate/run_tests.cjs --repo C:/workspace/tolstack` | 65 + new | **65/65** → **66/66** |
| `node scripts/run_viewer_browser_tests.mjs` | 19/19 | **20/20**, `annotate flyout` 19/19 |
| `--only "annotate flyout"` ×6 | passing | **6/6 consecutive**, 19/19 each |
| `venv-win/Scripts/python.exe -m pytest -q` | still 1155 | **1 failed, 1186 passed, 1 skipped — identical pre- and post-merge** |

The `--repo` was spelled with forward slashes under the Bash tool throughout
(overlay entry, 2026-09-15); the `[real]` tier is present in every count above.

**The pytest red is not this session's.** Byte-identical before and after the
merge, and the work touches no `tests/`, `tolerance_stack/` or `docs/` path
that could move it. I re-derived the whole chain in the filed issue
independently: `BRIEF_20260915_origin_posture_and_absent_feature_rule.md:152`
reads *"for a reason the other three do not have"* about the brief's four
origin-posture cases; `_COUNT_CLAIMS`' `rf"other\s+({_NUM})\s+do\s+not"` at
`tests/test_tolerance_stack.py:2830` matches it with no anchor to its own
subject; the claim shape is `46e545e` (2026-08-12, `hardware_counts_doc_guard`)
and the brief is `78305fc` (the 2026-09-16 triage sweep itself). Confirmed
false positive, confirmed provenance, correctly filed `high`.

**The lesson's own arithmetic, re-derived.** The pytest baseline checks out
exactly: the branch was cut at `1b3848b`, `integration` has since added
`tests/test_mesh_route_doc_facts.py` (5 tests) and
`tests/test_viewer_readme_doc_facts.py` (6) — 1186 − 11 = **1175**, the number
the lesson states. The §3 `--only` table matches my full run suite for suite,
all 20 rows. The `--only`-is-a-substring caveat is real: `topology file://` is
a prefix of `topology file:// respine` in the `SUITES` registry and the filter
is `suiteLabel.includes(ONLY)`. One count is wrong — see should-fix 1.

**The three paste-ready witness entries, replayed against the repo's own
helpers.** All three pass every check `tests/test_mutation_witnesses.py` would
apply: keys match `REQUIRED_KEYS`, tiers are in `TIERS` (`annotate` is indeed
there now — the handoff's premise for withholding really is stale), each `find`
resolves to exactly 1 under `source_of()`, each `expect_red` to exactly 1 under
`joined_source()`, and entry 3's `suite` is a `suite_registry_keys()` label.
The issue's honest hedge about CRLF is correct in its facts and I settled the
open question for whoever lands them (see "Notes" below).

**Scope.** Every "Do NOT touch" holds: `VALUE_GUARDS`/`TOPO_VALUE_GUARDS`/the
`SUITES` loop, `apps/viewer/viewer.js`, `apps/viewer/topology.js`, the topology
pane's box stack, `run_mutation_witness_tests.mjs`, `mutation_witnesses.json`,
`tolerance_stack/`, `tests/test_*.py`, `scripts/build_*_projection.py`,
`docs/reference/`, `data/inbox/specs/` — all untouched. Deliverable 1 is a
standalone fast-tier check, not a registry row, as instructed. The explicitly
rejected outcome (a README/runner note telling people not to use `--only`) was
not taken.

**No test pollution.** Nothing under `C:\workspace\tolstack\data\` has a
mtime later than 2:59 PM; every tier run in this review happened after 3:50 PM.

## Findings

### Should-fix — fixed inline as correction blockquotes (2)

Both are restated counts in artifacts under review, the class the canonical
prompt puts on the reviewer. Neither changes a conclusion, and a correction
blockquote is the established fix.

1. **`LESSONS_…:190` — "14 references"** to `!lastTopoRender.tweening` "in this
   file before mine". Re-derived on `git show integration:scripts/run_viewer_
   browser_tests.mjs`: **16 lines / 17 occurrences** of `tweening`. The
   breakdown's first two terms are exactly right (eleven direct
   `waitForFunction` calls — seven in `testTheTopologyPage`, four in
   `testHeightBudget` — plus `testRespine`'s `settled()` helper, so **12**
   settle-waits); the third term is **four, not two**, and all four sit inside
   `testRespine` rather than "the grid checks" — they are mid-flight *catchers*
   (`catchFrame`'s `last.tweening && ghost`, the interruption catcher, and the
   `tweening:` read and `=== false` assertion beside it), not waits. 11 + 1 + 4
   = 16. Correction blockquote added; the paragraph's conclusion is untouched
   and still correct.
2. **`ISSUE_20260916_three_new_guards…:115` — "15 other call sites"** that
   `var settling = false` hangs. Same re-derivation: **12**. The caveat's point
   (the mutation is broad — 4 suite functions, 5 of 20 suite instances — and a
   narrower one would be a better entry) is unaffected. Correction blockquote
   added.

### Should-fix — filed, not fixed (1)

3. **`scripts/run_viewer_browser_tests.mjs:3634` — `paneSettled()`'s result is
   discarded in the `file://` half** while the mounted half pushes it as a
   named check. The helper swallows its timeout precisely so a stuck pane
   fails *with a name on it* (its own comment at 3489 says so, citing
   `mutation_witnesses.json`'s "ONE THING AN ENTRY CANNOT DECLARE"); the bare
   call three lines before the same `tr.tvrow[data-id=…]` click gives back the
   unnamed-ERROR/MISS outcome that comment rules out. Harmless today — the
   proposed witness reddens the mounted half first, which I confirmed by plant
   — so it is `low`, but it is a guard silent in one of the two cases it was
   written for. Not fixed inline: the fix adds a sub-check (19 → 20) and so
   moves what the tier reports, which is past the inline-fix boundary.
   `ISSUE_20260916_the_annotate_flyout_settle_wait_is_named_in_one_half_and_
   discarded_in_the_other.md`.

### Nits (0 blocking)

- The new annotate check pins `setBanner(AA.NO_PROJECTION_NOTICE` anywhere in
  `app.js`, not specifically in `loadAll()`'s no-projection branch, while its
  thrown message names `loadAll()`. Today there is exactly one occurrence, so
  the scan is exact; the comment block is already honest that the rendered
  banner is the assertion it wants and cannot have. No change asked for.
- The lesson's environment notes (heredoc backslash collapse, per-file line
  endings, backticks eaten from `git commit -m`) are the most transferable
  part of the file and cost real time to learn. Worth a look by the next agent
  scripting an edit in this repo.

## Notes for the next reviewer / whoever lands the witnesses

- **The CRLF question in `ISSUE_20260916_three_new_guards…` is settled: yes.**
  `scripts/run_mutation_witness_tests.mjs:249` defines
  `const lf = (text) => text.replace(/\r\n/g, "\n")` and applies it on both
  sides — line 255 writes `lf(before).replace(mutation.find, …)` into the
  shadow tree, line 263 reads `lf(readFileSync(…))` before the anchor-rot
  `split(mutation.find)`. So entry 1's multi-line `find` on CRLF
  `apps/viewer/viewer.js` resolves in the runner for the same reason it
  resolves under `Path.read_text` in pytest. I added that as a dated reviewer
  note on the issue so the paste is turnkey. (Corrections and a settled open
  question on an issue *filed by the work under review* I treat the same way
  the canonical prompt treats a correction blockquote on its lesson — stated
  here rather than done silently.)
- **`integration`'s pytest is red on arrival** with
  `test_no_live_document_states_an_unguarded_hardware_entry_count`, and will
  stay red for every session cut from it until
  `ISSUE_20260916_hardware_count_guard_regex_matches_ordinary_prose.md` is
  taken. Do not reword the brief; anchor the regex.
- Overlay updated: the "green in a full run is not green" entry now carries the
  **named cause** (the respine ghost, 260 ms, `tr.tvrow` duplicated per edge)
  and the two traps around it (a ghost-excluding locator is the wrong fix;
  unique `data-id` was never the page's invariant), and a new entry covers the
  swallow-and-report helper whose result one caller drops.

## Verdict

**APPROVE**, 0 blockers. All three deliverables done and, unusually for this
class of handoff, done in a way that survives an independent replant: I broke
each of the three guards myself and watched each one name itself. Deliverable 3
is the standout — the handoff demanded a named cause rather than a wait, and
the answer ("arithmetic, not flake: a 260 ms cross-fade and six Playwright
actions") is measured, falsifiable, and came with four hypotheses eliminated on
evidence including the two the handoff itself proposed. The lesson's correction
of its own issue's framing — *the second row is by design, and chasing "what
produces it" would have led to deleting a deliberate feature* — is the most
valuable paragraph in the branch.
