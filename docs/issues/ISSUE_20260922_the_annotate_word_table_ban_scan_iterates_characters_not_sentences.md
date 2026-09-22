---
type: bug
priority: med
status: open
area: apps/annotate/run_tests.cjs
reporter: agent
found_by: docs/sessions/HANDOFF_20260921_mutation_witness_enrollment_backlog.md
---

# `apps/annotate/run_tests.cjs`'s word-table ban scan is `Object.keys()` on a flat string map — it has never scanned a sentence, only single characters

Found while transcribing `mutation_witness_enrollment_backlog`'s Set A row
"every word table this app renders survives the shared ban list" (named for
enrollment in
`docs/sessions/lessons/LESSONS_20260918_reader_facing_surfaces_second_pass.md`).
Planting the row's own declared mutation — restoring a `data/`-shaped path into
`AA.BINDING_STATE_ALERTS.unbound` — left the check **green**. Investigated
rather than forced through.

## The bug

`apps/annotate/run_tests.cjs`, the check registered as `"every word table this
app renders survives the shared ban list"`:

```js
[["AA.BINDING_STATES", AA.BINDING_STATES],
 ["AA.BINDING_STATE_ALERTS", AA.BINDING_STATE_ALERTS],
].forEach(([name, table]) => {
  Object.keys(table || {}).forEach((key) => {
    const row = table[key];
    Object.keys(row || {}).forEach((field) => {
      if (typeof row[field] !== "string") return;
      assertNothingBanned(row[field], `${name}.${key}.${field}`);
      scanned++;
    });
  });
});
```

This assumes `table[key]` (`row`) is an **object** with string-valued fields.
Neither table is: `apps/annotate/binding_state.js` defines both as flat
`{key: string}` maps —

```js
AA.BINDING_STATES = Object.freeze({
  BOUND: "bound", UNBOUND: "unbound", ...
});
AA.BINDING_STATE_ALERTS = Object.freeze({
  unbound: "No face is bound to this element yet.", ...
});
```

`row` is therefore a **string**, and `Object.keys("bound")` returns numeric
character indices (`"0"`, `"1"`, …). `row[field]` for each of those is a
single character, `typeof row[field] === "string"` is (vacuously) true, and
`assertNothingBanned` is called on **one character at a time** — never on the
sentence as a whole. A banned multi-character literal like `data/`, `sha256`
or `venv-win` can never be found inside a one-character string, by
construction. The `scanned < 4` anti-vacuity guard does not catch this either:
it trivially clears the floor by counting characters (the current tables
contribute ~290 "fields"), so the check reports itself as non-vacuous while
scanning nothing meaningful.

**Measured**: restoring `unbound: "No face is bound to this element yet. See
data/meshes/."` — the exact `data/`-shaped defect
`ISSUE_20260915_the_annotate_fast_tier_cannot_own_a_mutation_witness`-adjacent
work has twice put in this file — leaves `node apps/annotate/run_tests.cjs`
fully green. The check has never caught anything it was written to catch.

## Why it wasn't caught before

The check is new enough (named for enrollment on 2026-09-18, `visual_rules_
nothing_checks` / `reader_facing_surfaces_second_pass`) that nobody had planted
its declared mutation until this transcription pass tried to. `tests/test_
mutation_witnesses.py`'s anchor pairing cannot see this class of defect either
— it only confirms the `find`/`expect_red` strings resolve in the source, not
that the check's own logic does what its name claims.

## Fix shape

`Object.keys(row || {})` should not run on a string leaf at all — either scan
`table[key]` directly when it is a string (`typeof table[key] === "string"`),
or change the loop to branch on the value's type rather than assuming every
value is a nested row. Both `AA.BINDING_STATES` and `AA.BINDING_STATE_ALERTS`
are one level shallower than the code assumes.

Not fixed here: `mutation_witness_enrollment_backlog` is fenced to transcribing
already-measured mutations into `scripts/mutation_witnesses.json`, not to
repairing guards it discovers along the way. The corresponding table row
(`annotate-word-tables-survive-the-ban-list`) is excluded from enrollment with
this issue cited, rather than enrolled against a check that cannot fail.
