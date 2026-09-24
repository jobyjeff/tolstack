# Mutation witnesses — one file per guard, named for the guard

Every `*.json` beside this README is a **mutation spec**: one guard in this
repo, and the edit (or edits) it must go red on. They are read by
`scripts/run_mutation_witness_tests.mjs`, which applies each mutation to a
shadow copy of the tree and fails if the named tier stays green, and by
`tests/test_mutation_witnesses.py`, which checks on every pytest run — with no
browser, in under a second — that each one still describes a place in the tree.

## Why this exists

A guard's witness is often coupled to an incidental property of the app — a
viewport where the document happened to be short, a preference that happened to
be at its default, a measurement that re-derives whatever is on screen. When the
app changes **correctly** the coupling breaks, the guard silently stops
witnessing anything, and nothing goes red to announce that the coverage left.
Five of those were filed by five different review sessions between 2026-09-11
and 2026-09-15, three of them found only because a reviewer mutated the code by
hand and noticed the suite stayed green. A spec here is how that hand check
becomes a standing one.

## Enrolling a guard — the whole of it

**A guard is enrolled by existing, plus one mutation spec in the same change.**
Nothing else. You do not pick an id, you do not edit a shared table, and you do
not record the gap anywhere: the gap is computed.

1. Write the guard.
2. Run `node scripts/guard_enumeration.mjs`. The census is one line per guard
   source; the tier you touched is now one guard over its pin.
3. Write the spec. `node scripts/run_mutation_witness_tests.mjs --unenrolled`
   prints the file name to write and the shape to put in it — the file name is
   **derived from the guard's own name**, so it is not yours to choose.
4. Raise that tier's number in `DECLARED_GUARDS`
   (`scripts/guard_enumeration.mjs`).
5. Run it: `node scripts/run_mutation_witness_tests.mjs --only "<a few words
   of the guard's name>" --repo C:\workspace\tolstack`.

Raising the pin **without** writing a spec is allowed and sometimes correct —
some guards cannot be witnessed at all (below). It is a line in a diff a
reviewer reads, which is the whole difference from before: until 2026-09-23
"this guard has no witness" was a fact nobody could compute, and six enrollment
handoffs in eight days moved the backlog without moving the rate
(`docs/strategy/BRIEF_20260915_mutation_witness_enrollment.md`).

## What a spec holds

```jsonc
{
  "tier": "fast",                 // which harness runs the guard
  "suite": null,                  // the browser registry key / the pytest file
  "expect_red": "…",              // the guard's name, copied VERBATIM
  "mutations": [
    {
      "contract": "…",            // what the guard is for, in one sentence
      "issue": "docs/issues/…",   // or null, for a guard nobody filed a bug on
      "note": "…",                // why this mutation and not a simpler one
      "file": "apps/viewer/style.css",
      "find": "…",                // exact, UNIQUE snippet, indentation included
      "replace": "…"              // the broken version
    }
  ]
}
```

`mutations` is a **list** because the unit is the guard: a guard worth
witnessing is often worth witnessing from more than one direction (three ways to
break the topology switch, two to break the command-table ban). Everything above
that list is derived — the file's own name is a slug of `tier` and `expect_red`
plus a digest of those two (**not** `suite`: a browser guard is declared once
and may be run by more than one suite, so keying on `suite` would put the file
name beyond what the enumeration can see, and `--unenrolled` could no longer
print it), so two agents enrolling two guards cannot collide,
and a **renamed guard is a loud orphan**: its spec no longer matches any
declaration and pytest says so, naming the file to rename it to.

## The tier words

`tier` names a **harness**, not a speed:

  - `fast` — `apps/viewer/run_tests.cjs`, the *viewer's* fast tier, whose guard
    names live in the `tests.js` it loads.
  - `annotate` — `apps/annotate/run_tests.cjs`, the annotate app's own fast
    tier, which is both the harness **and** where its guard names are written. A
    separate word rather than a second meaning for `fast`, because they are
    separate harnesses with separate name sources (2026-09-16,
    `ISSUE_20260915_the_annotate_fast_tier_cannot_own_a_mutation_witness`).
  - `browser` — `scripts/run_viewer_browser_tests.mjs`.
  - `python` — `venv-win/Scripts/python.exe -m pytest`, handed ONE test file:
    the spec's `suite`. Added 2026-09-18
    (`ISSUE_20260916_the_mutation_witness_table_has_no_tier_for_a_pytest_guard`).
    Two things about it are unlike the three above. First, `expect_red` is a
    test **function's** name off pytest's `FAILED <file>::<name>` line rather
    than a prose sub-check — an exact identifier, which is the better of the
    two. Second, a test file may only read what the shadow copies; one that
    reads `data/` or the rest of `docs/` is red before any mutation, and the
    runner says so rather than witnessing. `tests/test_mutation_witnesses.py` is
    **forbidden** as a suite: with a mutation applied, its own anchor check
    reddens for every spec, so such a witness would pass against anything.

That list is not a fourth copy of the vocabulary — `tests/test_mutation_witnesses.py`
reads the words back out of this file and pairs them against
`GUARD_SOURCES`/`TIER_HARNESS`, so a fifth tier added to the code and not to
this section is red on the next pytest run
(`ISSUE_20260918_the_witness_tables_about_block_is_a_third_unpaired_copy_of_the_tier_vocabulary`).

A `suite` is how a spec pays for part of a harness rather than all of it, and it
means a different thing in each tier that has one: for `browser` it is a
registry key passed straight to that runner's `--only` filter, for `python` it
is the test file pytest is pointed at. Neither fast tier has suites, so their
specs carry `"suite": null`.

## Two guards that can never be enrolled, and how you know

The census counts these rather than describing them — run
`node scripts/guard_enumeration.mjs` for today's numbers.

- **A name built by interpolation.** `expect_red` is compared to the printed
  name for **equality**, so a name written as a template literal with a
  `${count}` in it resolves to nothing here and to a different string on every
  run. Print the live number on a line *beside* the check instead; the nav-mark
  placement guard was rewritten that way on 2026-09-22 for exactly this reason.
- **A name declared more than once.** The runner cannot attribute a red to one
  of two guards wearing the same name. (A `skip(...)` arm carrying the same
  words as its `test(...)` one is *not* one of these: only the test arm can
  print a FAIL line, so the enumeration passes over the skip arm.)

## One thing a spec cannot declare

A mutation that breaks the page **itself** rather than one behaviour — removing
the popover's room cap, say — stops a later hover or wait from ever completing
and takes its whole suite down as an `ERROR`. That red is real, and louder than
a failed assertion, but it carries no check name for the runner to attribute, so
it is reported as a miss. Narrow the mutation until it fails an assertion, or
leave that guard to the hand check it already survives.

## Where the mutation is applied

Never to this tree. The runner copies everything a tier reads into
`tmp/mutation-witness/` and patches the copy. `SHADOWED` in
`run_mutation_witness_tests.mjs` is that list and the only place it is written
down — read it there rather than from a copy here, which is how a line in the
document this README replaced went stale once already (2026-09-16).
