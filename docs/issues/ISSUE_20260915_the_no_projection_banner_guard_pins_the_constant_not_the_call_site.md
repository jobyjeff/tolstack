---
type: bug
priority: med
status: open
area: apps/annotate
reporter: agent
found_by: docs/sessions/reviews/REVIEW_20260915_annotate_hosted_page_posture.md
---

# The "no projection" banner's guard pins the constant, not what `setBanner` is called with — the exact defect comes back 65/65 green

`annotate_hosted_page_posture` (2026-09-15) removed the terminal command from
the annotator's "no topology projection" banner and pinned it two ways in
`apps/annotate/run_tests.cjs`:

- `the no-projection banner is plain words, with nothing to paste` —
  `assertNoCommandOrPath(AA.NO_PROJECTION_NOTICE, ...)`, i.e. an assertion on
  the **constant**;
- `this app holds no terminal command for a banner to render` —
  `AA.CONFIG.rebuild === undefined`, plus a static scan of `app.js` for the
  string `CONFIG.rebuild`, i.e. an assertion on the **supply route that
  produced the original bug**.

Nothing pins that `loadAll()`'s no-projection branch actually renders that
constant. The check's own comment says the guard closes the hole — *"a check on
the sentence alone would pass again the moment somebody re-adds `"Build it: " +
a command`"* — and removing `CONFIG.rebuild` closes only the `CONFIG` half of
it. A bare string literal at the call site is the other half, and it is one
character cheaper to write than the original defect was.

## Measured (review, 2026-09-15)

`apps/annotate/app.js:741` restored to the pre-handoff shape with the command
inlined instead of read from config:

```js
setBanner("No topology projection found. Build it: venv-win\\Scripts\\python.exe scripts\\build_topology_projection.py", "warn");
```

```
node apps/annotate/run_tests.cjs --repo C:/workspace/tolstack
65/65 passed
```

`pytest` cannot see it (the copy is JS) and the browser tier cannot either: no
suite reaches the connected-folder-with-no-projection state, which needs a real
File System Access grant. So the defect the handoff was written to remove
returns verbatim with **every tier green**.

## Fix shape

The handoff's own DoD asked for *"a substring assertion on the rendered banner
text"*. The rendered banner is expensive to reach; the call site is not, and
the check already reads `app.js` as text for the `CONFIG.rebuild` scan. Three
lines inside the existing check:

```js
if (!appSource.includes("setBanner(AA.NO_PROJECTION_NOTICE")) {
  throw new Error("loadAll()'s no-projection banner no longer renders AA.NO_PROJECTION_NOTICE");
}
```

Then declare it. Note the second half of the problem: the annotate fast tier
cannot own a mutation-witness entry at all
(`ISSUE_20260915_the_annotate_fast_tier_cannot_own_a_mutation_witness.md`), so
whichever lands first, the other is what makes this guard a standing one rather
than a written one.

## Why this generalises

A guard on a **named constant** certifies the constant, never that the surface
reads it. Whenever a handoff's answer to "the copy must not say X" is to lift
the copy into a constant so a testable tier can see it, ask what pairs the
constant to the one call site that renders it — the lift is what moves the
assertion away from the defect.
