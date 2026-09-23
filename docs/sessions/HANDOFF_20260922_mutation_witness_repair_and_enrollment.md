---
priority: med
depends_on: []
model: opus
---

# HANDOFF 2026-09-22 — mutation_witness_repair_and_enrollment: three declared witnesses are still dead on trunk, and ten guards from three merged handoffs were never declared

Source: four issues, routed together by the 2026-09-22 triage sweep because all
four edit `scripts/mutation_witnesses.json` and all four are validated by the
same ten-minute tier run:

- `docs/issues/ISSUE_20260921_three_declared_mutations_are_unwitnessed_on_trunk_after_the_batch_merge.md`
  (bug, med) — **lost coverage on trunk, re-confirmed today**;
- `docs/issues/ISSUE_20260922_the_nav_status_icon_guards_have_no_mutation_witness_entry.md`
  (chore, med) — two rows measured in review, paste-ready;
- `docs/issues/ISSUE_20260922_the_policy_free_residue_guards_have_no_mutation_witness_entry.md`
  (chore, med) — four rows, one with a correction attached;
- `docs/issues/ISSUE_20260922_the_balance_sheet_guards_have_no_mutation_witness_entry.md`
  (chore, low) — four candidate rows, none yet run.

Baseline: trunk `master` @ `836f11e` — the 2026-09-22 batch merge has landed
(`mutation_witness_enrollment_backlog` is in `completed/` and took the registry
from 73 to **96** entries), projections rebuilt, full suite green.
Scope: `scripts/mutation_witnesses.json`, `scripts/run_mutation_witness_tests.mjs`,
`tests/test_mutation_witnesses.py`, and — only where a *declared* guard has to be
repaired — the guard's own test. Do NOT change app behaviour to make a witness
pass: a guard that no longer describes a defect gets its entry retired with a
reason, not a rewritten app. Do NOT touch `apps/viewer/views/stack.js`,
`apps/viewer/topology.js` or `apps/viewer/views/topology.js` — three other
2026-09-22 handoffs own those and will land new guards of their own; if one
merges before you, enroll what it added too and say so.

## Part 1 — the three dead witnesses (do this first; it is the coverage loss)

Re-measured by the 2026-09-22 triage sweep from the **main checkout** on
`master` @ `836f11e`, clean tree, `node scripts/run_mutation_witness_tests.mjs
--only <entry>`. All three are **still NOT WITNESSED**, with the same three
distinct diagnoses the 09-21 filing recorded — so this is not flakiness and the
batch merge did not cure it:

1. **`leader-style-survives-a-topology-switch`** — *another check reddened, but
   not the declared one.* Declared: `[real] switching topology keeps the leader
   STYLE too`. Actually failed (eight checks, none of them the declared one):
   `the leader-style toggle starts at angled`, `every leader is one straight
   segment by default`, `one click: jogged leaders, each drawn as a right-angle
   jog`, `jogged lanes really did spread across the widened zone`, `angled
   leaders in a widened zone correspond too, and the zone stayed where the drag
   left it`, `[real] pitch_system's jogged leaders still land on every dot and
   seam`, `[real] and back in angled style, one straight segment each`,
   `[real] the anchor: the leader style really is off its default before the
   switch`. This is the shape
   `ISSUE_20260915_card_layout_out_of_flow_mutation_reddens_an_earlier_check_so_it_is_never_witnessed.md`
   already names on a different entry: the declared mutation is too broad, so an
   earlier check eats it. Narrow the mutation until only the declared check can
   see it, or move the declaration to the check that actually pins the contract.
2. **`worst-verdict-ranks-worst-last`** — *the tier never reached the witness.*
   The mutated run does not fail a check; it **aborts the suite**:
   `tests.js:9352` → `TypeError: Cannot read properties of undefined (reading
   'says')` at `var CLEAN = { state: "pass", word: "pass", says:
   VA.VERDICTS.pass.says, …`. The runner's own advice applies — a mutation that
   breaks the page itself rather than one behaviour cannot be attributed, so
   declare a narrower mutation. Note the guard this witness belongs to exists to
   close `ISSUE_20260915_worst_verdict_ranks_by_an_unguarded_object_key_order.md`,
   so until this is repaired **that issue's fix is not demonstrably guarded**.
3. **`arriving-at-an-element-shows-its-part-in-3d`** — *the witness cannot see
   the difference:* clean run of `browser / annotate top bar + entry context
   (auto-filter, see-through)` green, mutated run **also green**. This one was
   reported WITNESSED on its own branch on 2026-09-21
   (`docs/sessions/reviews/REVIEW_20260921_annotate_hint_bar_and_context_autofilter.md`,
   "drops only the scene call, keeps every list effect") and is not witnessed on
   trunk — i.e. coverage lost *by a merge* while every branch was green alone,
   which is exactly
   `ISSUE_20260916_a_review_merge_is_the_one_place_the_mutation_tier_is_never_re_run.md`.
   Find what on trunk makes the mutated and unmutated pages indistinguishable to
   that suite, and either repair the witness or retire the entry with the reason
   written in its `note`.

**Also required by Part 1: establish the baseline nobody has.** The most recent
full-tier count written down anywhere in `docs/` is **54/54**
(`LESSONS_20260916_design_pass_typography.md`) and the registry is now 96
entries, so nobody can say whether today's state is a regression or long
standing. Run the **full** tier once (`node scripts/run_mutation_witness_tests.mjs`
from `C:\workspace\tolstack`, >10 minutes) and record the exact `N/M witnessed`
with the checkout, commit and date in the lesson, so the next comparison has
something to stand on.

**Consider making the runner's exit code mean something.** Today it prints the
NOT WITNESSED list above its total and **still exits 0**, which is the whole
reason this went unnoticed for a day across three reviews. Changing that is in
scope if you can do it without breaking the tier's callers — investigate and
report feasibility in the lesson rather than forcing it.

## Part 2 — enroll the ten undeclared guards

Every row below is transcribed from an issue that measured it. **Run each one
before declaring it** (`--only <entry>`); the 2026-09-21 enrollment pass found
2 of 26 proposed rows were not witnessed by the check they named, and a
declared-but-unwitnessed row is worse than no row.

**2a. From `viewer_nav_verdict_into_alert_and_icon` — two rows, both planted and
reverted in review, so this is transcription.** Full `find`/`replace`/`tier`/
`suite`/`expect_red` text is in the source issue; do not retype it from memory.
The browser-tier one (`.navtree__row--study, .navtree__row--stack { flex-wrap:
nowrap; }` → empty) measured `[topology file://] 211/212`, one `FAIL sub-check:`
line naming the two offending rows. **Its `expect_red` is matched as a
substring and the rendered label ends with a live row count** (`…including on
the 2 rows whose name needs two lines`), so the declared string must stop
before the number — that is the `expect_red`-is-unpaired trap
(`ISSUE_20260915_expect_red_is_the_half_of_a_mutation_entry_nothing_cheap_checks.md`)
biting in advance. The fast-tier one (`return !check.sensitivity;` → `return
true;`) measured `486/488` with two named reds. The issue also names the
legibility/border/two-colour checks as **not** paste-ready (one mutation reddens
several and `expect_red` would need a deliberate anchor) — either choose an
anchor deliberately or record why there is no row, in the entry or the lesson.

**2b. From `policy_free_brief_residues` — four rows, with one correction you
must honour.** Rows 1 and 2 (`apps/viewer/views/banner.js`'s `missing(...)`
gaining a terminal command; `apps/viewer/config.js` regaining
`rebuild: { results: "x" }`) are fast-tier and measured. Row 2's guard has
**two independent halves** — the `VA.CONFIG` probe and the static
`codeOnly(src)` scan of seven view files — so a second entry planting
`VA.CONFIG.rebuild.results` into a view without re-adding the table is what
witnesses the other half; add it if it runs. Rows 3 and 4 are **environment**
mutations (`page.addInitScript(() => { delete window.showDirectoryPicker; })`
before the loopback `goto`, and the same read off the iframe's `contentWindow`),
and whether the table can express an environment mutation at all is an open
question: if it cannot, **say so in a `note` on a declared-but-skipped entry or
in the lesson**, rather than leaving two guards silently unenrolled.
**Do not transcribe the fifth, "cheaper" row** (reverting
`apps/viewer/reader_facing_bans.js`'s script-filename shape to the single
literal). The issue carries a dated correction proving it reddens nothing —
`480/480` and `154/154` measured — because once every live command site is
gone, no walked surface prints a script filename at all. A mutation that
*plants* an unspelled `.py` name on a walked surface would witness the shape;
that is the row to write if you write one.

**2c. From `viewer_summary_balance_sheet` — four candidate rows, none yet run.**
`totalsFoot` returning `null`; the totals `<tfoot>` appended to a table of its
own; `VA.splitAuthoredFinding` always returning `{name: whole, rationale:
null}`; `findingRow` appending the rationale as a sibling `<p>` instead of into
the fold. Expected witnesses and suites are tabulated in the source issue.
**Sequencing caveat:** `HANDOFF_20260922_findings_splitter_scopes_to_excluded_terms.md`
is staged against `VA.splitAuthoredFinding` and will change which buckets reach
it. If that handoff has merged before you run, re-measure row 3 against the new
behaviour rather than the issue's text; if it has not, declare the row as
measured and note in its `note` that a staged handoff touches that function.

## Definition of done

- The three Part 1 entries are each either **witnessed** by a re-run
  (`--only <entry>` output pasted into the lesson) or **retired** with the
  reason in the entry's `note`. "Left as-is" is not a disposition.
- A full-tier `N/M` baseline with commit and date is in the lesson.
- Every new entry was **run** and reported witnessed; any candidate that was not
  witnessed is absent from the registry and its absence is explained in the
  lesson (that is what the 09-21 pass did with two rows and it is the right
  precedent).
- `venv-win/Scripts/python.exe -m pytest -q tests/test_mutation_witnesses.py`
  green, and the repo's normal full suite green.
- `tmp/mutation-witness/` is **deleted** from the checkout you ran in — it
  otherwise becomes `live_documents()` dirt
  (`ISSUE_20260917_live_documents_walks_gitignored_scratch_in_the_main_checkout.md`).
- Lesson (`docs/sessions/lessons/LESSONS_20260922_mutation_witness_repair_and_enrollment.md`):
  the baseline number; per dead entry, which of the three failure shapes it was
  and what fixed it; the per-entry wall-clock cost of enrollment (the 09-18 pass
  measured ≈4 min/entry, and
  `docs/strategy/BRIEF_20260915_mutation_witness_enrollment.md` is ranked #4 in
  `dispatch/docs/strategy/BRIEF_QUEUE.md` partly on the freshness of that
  figure — a third data point is the most useful thing this session can leave);
  and whether the runner's exit code can be made to mean something.
