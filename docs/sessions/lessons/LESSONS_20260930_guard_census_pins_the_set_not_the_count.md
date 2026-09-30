# LESSONS 2026-09-30 — guard_census_pins_the_set_not_the_count

Handoff: `docs/sessions/active/HANDOFF_20260930_guard_census_pins_the_set_not_the_count.md`.
Source issue: `ISSUE_20260923_the_guard_census_pins_a_count_not_a_set_so_three_arrivals_are_silent.md`.

## What the three arrivals cost, and what closed each

All three are closed. None of them needed a tracked name manifest.

| arrival | closed by | evidence |
|---|---|---|
| (1) one guard deleted and one added in the same change | `DECLARED_GUARDS[tier].names` — twelve hex characters over the sorted name set | planted a rename: `declared` held where it was, pytest red naming the digest and the reason |
| (2) a second declaration of an existing name | `DECLARED_GUARDS[tier].enrollable` in the scan, **and** `ranTwice` in the run | planted a duplicate: two separate reds, one from the scan side and one from the run side |
| (3) a declaration shape the scanner does not match | the scan paired against what the tier ran (`--executed`) | planted a single-quoted `test(…)`: the census stayed green, the pairing went red naming the guard |

Each was replayed by planting the defect, watching the specific new check go
red, and restoring. The second column of that table is the point: (2) is caught
twice, from opposite directions, and only one of the two is a pin.

## The churn argument — what was rejected and why

The mechanical reading of the issue is "pin the set": a tracked fixture holding
every guard name per source, regenerated and diffed. Rejected, and not because
it would not work:

- **Over a thousand tracked lines** across the three sources, which is a diff
  every reviewer scrolls past and nobody reads.
- **Every guard rename becomes a fixture edit**, and this repo renames check
  names often — the whole `expect_red`-is-a-prose-sentence design makes
  rewording a normal act.
- It is churn **paid per guard forever**, in exchange for catching an arrival
  that has never actually happened.

The digest costs **one line, the same line the count already cost**, and it
catches strictly more. Its one real loss is that it says the set moved and not
*which* name moved — so `CENSUS_LIMITS.digest_names_no_name` states that and
points at `--unenrolled`, which names the guards with no spec, which is the
actionable half anyway. The near-miss alternative considered and dropped was
digesting only the **unenrolled** names: it is no cheaper (enrolling a guard
moves it too) and it is harder to explain.

Net churn for an author adding a guard: was one number, is now one *line* of
three values — and both the census report and the pytest failure print that
line ready to paste. Verified on the planted guards: the failure message
carries the exact replacement text for all three sources.

## The cheap half was cheaper than the handoff thought — and stronger

The handoff (and the issue) framed the free pairing as `declared` against the
tier's printed **total**. Comparing the **name sets** costs the same run and is
strictly better: it catches a name the tier ran that the scan missed *and* the
reverse, and it names the guard rather than a delta. Two things fell out of
that:

- **The exit code is deliberately not read.** A guard that ran and FAILED still
  ran. This matters practically: it keeps a legitimately red fast tier from
  producing a second, confusing census failure, and it keeps spawning
  `apps/annotate/run_tests.cjs` here from quietly becoming the gate
  `ISSUE_20260918_the_annotate_js_suite_is_run_by_no_gate.md` is still open
  for. That issue stays honestly open: a FAIL in the annotate suite still
  reddens nothing.
- **A skipped tier degrades the pairing to one direction rather than failing.**
  In a worktree the viewer's `[real]` tier has no projection and ~94 checks do
  not run, so `declared ⊆ executed` would say nothing there but "you are in a
  worktree". `tests/test_viewer_js_suite.py` already says that, once and
  loudly, and **the design goal was not to add a second deliberate worktree
  red** — `CLAUDE.md` names exactly one, and after this change it still names
  exactly one. `ran ⊆ declared` survives a subset run and is always checked.

The parse is checked against the runner's own `N/M passed` arithmetic before
anything is concluded from it. That removes the obvious spoof (a FAIL whose
error text begins a line with `PASS  `) and the obvious silent pass (a runner
that never started, whose empty name set satisfies every subset test there is).

## What is still uncovered, and where it is now written

`CENSUS_LIMITS` in `scripts/guard_enumeration.mjs`, printed by **every** census
run — not a verbose mode — and paired key-for-key by
`test_the_census_emits_what_it_cannot_see`. Five entries: `python` is not
censused at all; the browser scan is never paired against a run; an incomplete
fast run pairs one way only; the digest names no name; and raising a pin
instead of writing a spec is detected by nothing but a reviewer.

Two of those got issues rather than only a sentence:

- `ISSUE_20260930_the_browser_guard_scan_is_the_one_never_paired_against_a_run.md`
  — the *equality* direction is impossible there (one declared name may be run
  by two suites; the template names interpolate), but `ran ⊆ declared` is not,
  and that is the direction that catches arrival (3). It belongs in the browser
  runner, not in pytest.
- `ISSUE_20260930_the_mutation_witness_tier_gates_on_one_of_the_three_census_pins.md`
  — `scripts/run_mutation_witness_tests.mjs` still sets its exit code from
  `declared` alone, so arrivals (1) and (2) are red in pytest and exit 0 in the
  tier. It *prints* them (every moved pin is marked in `censusReport`), which is
  what made leaving it acceptable. Three lines to fix (`pinsMoved` is already
  exported and already backs `censusHolds`); fenced out only because the
  sibling handoff staged this sweep was told its input set couples to that
  file's `SHADOWED` list and the two handoffs were scoped to share no files.

## Is "pin a count as a proxy for a set" a class here? Not yet — two, not three

The handoff asked whether a third sighting would make this a class worth a
refactor rather than three fixes. I went looking and **did not find one**. What
is actually in the tree:

- `tests/test_architecture_inventory.py::test_the_projection_provenance_row_counts_and_names_its_importers`
  pins `named == actual` — a **set** — and derives the count from it. That is
  the shape this change adopted, and it was already here.
- The pinned counts in `tests/test_hub_bearing_*.py` (`checked == 432`,
  `compared == 480`) run over an immutable committed fixture that is *also*
  iterated by cell address, so a substitution is caught by the address lookup
  rather than by the count. Not the defect.
- The `length === N` pins in the JS guards are geometry over fixed fixtures.

So the `docs/prompts/REVIEW_AGENT.md` checklist entry stays what it is — a class
of *claim wider than measurement*, of which "a count as a proxy for a set" is
one named shape with, now, one closed instance. That entry has been updated to
say the example is closed and the rule is not, and to carry the transferable
half: **when a count stands in for a set, a digest of the set is usually
cheaper than the set.**

## Small things the next agent would otherwise rediscover

- `DECLARED_GUARDS[tier]` is an **object** now. `census()`'s rows still carry
  `pinned` as the bare count, deliberately, because
  `scripts/run_mutation_witness_tests.mjs` reads `r.declared !== r.pinned` off
  those rows and that file was fenced out of this change.
- `node scripts/guard_enumeration.mjs --executed` spawns two test runners
  (~2s). It is opt-in on both the human and the `--json` mode for that reason,
  and pytest pays for it once, in a module-scoped fixture.
- The pairing reads `PASS  `/`FAIL  ` lines; both fast runners happen to print
  the identical shape. `GUARD_SOURCES[tier].runner` is paired against
  `TIER_HARNESS[tier].script` so the pairing cannot end up comparing one tier's
  scan against another tier's output — which would look exactly like a rotted
  scanner, every name wrong on both sides at once.
- Editing `scripts/guard_enumeration.mjs` with a tool that round-trips the
  source will happily turn the backslash-u-0000 escapes in its key functions into
  literal NUL bytes. `git grep` then reports the file as binary. Check for that
  before committing.
