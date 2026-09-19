# LESSONS 2026-09-18 — mutation_witness_enrollment_gaps

Ten entries declared, the tier at **64/64** (was 54/54), a fourth tier word
(`python`), one stale note corrected, and one line added to the review prompt.

The handoff asked for two numbers the brief
(`docs/strategy/BRIEF_20260915_mutation_witness_enrollment.md`) does not have.
Sections 1 and 2 are those numbers. Read them first if that is why you are here.

---

## 1. What one enrollment round actually costs

**Wall clock, measured off commit timestamps** (session start = the board commit
that moved this handoff to `active/`):

| | |
|---|---|
| 18:41:34 | session start |
| 18:51:43 | pytest tier built + 8 entries declared and individually witnessed |
| 18:54:50 | 2 more entries + the stale notes |
| 19:00:16 | review prompt, and the two suite repairs section 5 describes |
| 19:02:10 → 19:13:35 | full tier, **64/64**, 11m25s unattended |
| ~19:25 | this lesson, the deferred-work issue, final commit |

**≈45 minutes of agent time, plus one 11-minute unattended run, for 10 entries.**
Call it **4 minutes an entry** amortised — and that number is honest only because
almost none of it was spent enrolling. Declaring an entry is: copy the nearest
one, change five strings, `--only <id> --repo <main checkout>`, read `WITNESSED`.
Twenty to ninety seconds for a fast/annotate/python entry, one to three minutes
for a browser one. The rest of the 45 minutes went to §3 (building the tier),
§4 (a defect in the paste) and §5 (the shadow tree's blast radius).

**Guards that turned out not to redden: zero.** All ten declared mutations
witnessed on the check they named. Two entries *missed on their first run*, and
neither was a guard failing — both were the declared NAME being wrong (§4).

One prediction was *not* entered because it does not reproduce: the crop
lightbox's frame-sizing claim, which
`review/crop_lightbox_zoom_viewer` had already measured as green under mutation
and split out into
`ISSUE_20260917_the_crop_lightboxs_fit_clamp_and_hairline_are_unwitnessed_in_every_tier.md`.
That is a guard that needs *writing*, not a witness that needs declaring, and it
is worth keeping the two jobs apart when costing this.

## 2. Where the six gaps came from — and the cheap answer

Counted, one line each:

| gap | cause |
|---|---|
| `three_new_guards_have_no_mutation_witness_entry` | a **blanket fence** — "append to `mutations[]` only if a deliverable below says so", and no deliverable said so |
| `the_reader_facing_copy_guards_have_no_mutation_witness_entry` | a **fence naming a handoff**: "name it in your lesson so that handoff can" — and that handoff was already in `completed/` |
| `the_sticky_rails_witness_note_describes_a_limit_that_no_longer_exists` | the same fence, the same named handoff, running in parallel and finishing without doing it |
| `the_mutation_witness_table_has_no_tier_for_a_pytest_guard` | missing capability |
| `the_crop_lightboxs_new_guards_carry_no_mutation_witnesses` | silence — the handoff simply did not ask |
| `a_review_merge_is_the_one_place_the_mutation_tier_is_never_re_run` | process gap |

**Three of six are a fence. Two of those three named a specific handoff as the
owner, and in both cases that handoff had completed or was completing in
parallel.** So the handoff's hypothesis is right, and it is worth stating as a
rule rather than a count:

> **A fence that defers work must name an artifact that outlives both handoffs.**
> "Do not do X yourself; handoff H will" is a dangling pointer the moment H
> reaches `completed/` — and H completing is the *expected* outcome, not the
> failure case. Name an issue, or file one.

**What this means for the brief, and it is the useful part.** The fences did not
actually lose the work: every one of the six became a `docs/issues/ISSUE_*.md`,
filed by a review agent, and the 2026-09-18 triage sweep routed all six into one
handoff. The collection mechanism already exists and it already works. What it
costs is **latency** — two days, six issue files, one triage disposition and one
handoff — not **coverage**.

So the question the brief is really asking is not "would a mechanism catch more
gaps?" but "is two days of latency and one handoff of overhead worth removing?".
Against the measured ~4 minutes an entry, a diff-reading CI check has to be very
cheap to build and near-zero to maintain before it pays. The intermediate option
the brief lists — argued acceptance that the flat rate is correct — looks better
after this round than it did before it, with **one** amendment that costs
nothing: fix the fence wording. Two of the six would not have existed.

## 3. The pytest tier, and the re-entrancy the handoff told me to think about

`tier: "python"` runs `venv-win/Scripts/python.exe -m pytest` against **one test
file** out of the shadow — the entry's `suite`. Three things are worth knowing
that are not obvious from the diff.

**The suite is mandatory, and that is the re-entrancy fix.** The handoff's
warning is real: the harness for this tier is the suite that runs the table's own
pairing module. Run the whole suite under a mutation and
`test_every_anchor_resolves_to_exactly_one_place` reddens — *correctly*, because
the shadow's copy of the table still declares a `find` the shadow's mutated file
no longer holds. Any entry pointed at `tests/test_mutation_witnesses.py` would be
"witnessed" by that, for **any** mutation whatsoever, while proving nothing.
Scoping to one file makes the whole-suite run impossible to express, and both the
runner (`SELF_PAIRING_SUITE`) and the pairing module refuse that one file by name
anyway. Belt and braces on purpose: the failure it prevents *reads as coverage*.

**`expect_red` changed kind, and the pairing had to follow.** For a python entry
it is a test FUNCTION name off pytest's `FAILED <file>::<name>` line — an exact
identifier, which is strictly better than a prose sub-check. But there is no one
file pytest's names live in, so `CHECK_SOURCE["python"]` is `None` and
`check_source_of(entry)` reads the entry's own `suite` instead. Keeping the
`None` row rather than dropping `python` from the map is deliberate: it keeps
`test_the_check_source_map_covers_the_tier_vocabulary` able to catch a *fifth*
tier added with no thought about where its names come from.

**The shadow decides which test files are eligible.** `SHADOWED` now copies
`tests/`, `tolerance_stack/`, `docs/tolerance_stacks/` and `docs/spec_library/`
on top of what it had. `tests/` is a package, so pytest puts the shadow root on
`sys.path` and each module's own `REPO_ROOT = Path(__file__).parent.parent`
lands in the shadow with it — that is the whole reason this works without a
conftest. A test file that reads `data/` or a `docs/` subdirectory nobody has
named is simply red before any mutation, and the runner says
`the tier was red before the mutation, so nothing was proved` rather than
pretending. Adding a subdirectory to `SHADOWED` is how you make one eligible;
do it one directory at a time, the way `docs/topologies/` was.

## 4. "Paste-ready" was wrong for two of seven, and pytest could not see it

Seven of the ten entries arrived pre-written in their issues, checked by their
author *and* replayed by a reviewer against this repo's own pairing helpers, and
called paste-ready. **Two missed on the first run of the tier.**

Both were `ISSUE_20260916_the_reader_facing_copy_guards_..."`'s, and the issue
says plainly what it did and why:

> Both `expect_red` strings above are deliberately cut short of the full check
> name … so they resolve under plain `source_of()` without needing
> `joined_source()`'s seam-closing.

That is a correct statement about the pytest pairing, which **counts
substrings** — and a fatal one for the runner, which compares the declared name
to the printed name with `Array.includes`, an **exact equality**. A prefix is
green in 0.6s and a guaranteed `NOT WITNESSED` several minutes into a browser or
fast run, reported as *another check reddened, but not the declared one* — the
loudest possible way to say nothing useful.

`tests/test_mutation_witnesses.py::test_no_expect_red_is_a_truncated_check_name`
now catches it. A check name is a string literal, so once the `" + "` seams are
closed the real name's last character is followed by the quote that ends the
literal; a prefix is followed by more of the name. It holds for all 64 entries
and is proven falsifiable (truncate one and it reddens, with the printed name
quoted back at you). The *opening* quote is deliberately not required — one
entry's name is legitimately concatenated onto the tier's own
`"FAIL sub-check: "` prefix.

**The generalisation worth carrying:** when a filing agent verifies a paste by
replaying the repo's cheap checker, it has verified it against the cheap
checker — not against the thing the entry has to satisfy. Ask what the *expensive*
half compares, and whether the cheap half compares it the same way.

## 5. Growing the shadow tree broke two things that a fresh clone cannot reproduce

Both bit immediately, both were invisible until the tier had run once (`tmp/` is
gitignored, so the failures only exist on a machine that has run the tier):

- **`pytest -q` died on collection.** 35 errors, duplicate module basenames —
  the shadow's `tests/` collected alongside the real one. Fixed with a new
  `pytest.ini` (`norecursedirs`, defaults preserved plus `tmp`).
- **Every tracked document under a shadowed `docs/` subdirectory was scanned
  twice** by `live_documents()`, the corpus walker every claim scan in
  `tests/test_tolerance_stack.py` shares. Caught by
  `test_thermal_exception_list`, which counted 4 rule-stating passages where 3
  exist — one of them at `tmp/mutation-witness/docs/...`. Fixed by adding `tmp`
  to `_SKIP_DIR_NAMES`, beside `node_modules` and `.pytest_cache`, for the same
  reason those are there.

If you widen `SHADOWED` again, **run the full pytest suite before you trust
anything**, and expect the failure to look like a bug in a document rather than a
bug in the runner. `PROVENANCE.md`'s row for `tests/test_tolerance_stack.py` is
amended for the second one.

## 6. The browser tier cannot run from a worktree, and a junction is cheaper than a copy

`playwright-core` resolves by walking up from the shadow's own directory, and
`node_modules/` is gitignored — so every browser entry reports
`the tier was red before the mutation` in a fresh worktree, which reads exactly
like the wall of broken guards the tier exists to announce. `REVIEW_AGENT.md`
already knows this and says to *copy* `node_modules`. A **directory junction** is
instant and costs no disk:

```
New-Item -ItemType Junction -Path <worktree>\node_modules -Target C:\workspace\tolstack\node_modules
```

Removed at the end of this session, deliberately — a junction is outside git's
view and a recursive delete that follows reparse points would take the main
checkout's `node_modules` with it. Re-make it when you need it; do not leave it
for the cleanup.

Note that `--repo` does **not** solve this. It is documented as the worktree
escape hatch and it is, for `data/` and (now) for the venv interpreter — but it
has nothing to say about node's module resolution.

## 7. Left undone, with owners

- `ISSUE_20260918_a_tier_that_can_only_fail_at_a_merge_has_to_be_run_at_the_merge.md`
  (`audience: strategy`, low) — the review-merge rule landed in tolstack's
  override; whether the *principle* belongs in dispatch's canonical prompt is a
  strategy read, and it was the half of that issue with no owner left.
- `annotate-flyout-waits-out-the-respine`'s mutation is broad — a never-ending
  tween hangs 12 other settle-waits. Harmless as declared (one mutation, one
  named suite) and recorded in the entry's own `note`, which is where the next
  person to touch it will read it. A narrower mutation would be a better entry.
- The crop lightbox's three unwitnessed lines stay with
  `ISSUE_20260917_the_crop_lightboxs_fit_clamp_and_hairline_are_unwitnessed_in_every_tier.md`.
  They need assertions written; that is not this job.
