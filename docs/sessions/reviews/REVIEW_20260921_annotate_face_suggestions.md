---
type: review
handoff: docs/sessions/active/HANDOFF_20260921_annotate_face_suggestions.md
reviewer: review agent (opus)
date: 2026-09-21
verdict: APPROVE
blockers: 0
---

# REVIEW 2026-09-21 — `annotate_face_suggestions`

Branch `handoff/annotate_face_suggestions`, **one commit** (`58a0f57`), 16
files, +3507/−67. Containment checked before starting —
`git merge-base --is-ancestor handoff/annotate_face_suggestions integration`
said **NOT MERGED**, so the merge-and-watch-it-go-green step was real. Merged
into `review/annotate_face_suggestions` **cleanly, no conflicts**; nothing had
moved `integration` under the branch.

## The seven mandatory checks

**N/A, all seven.** The diff creates, edits and derives no tolerance value, no
`fold()` input, no `confidence` field and no `source_ref` — it is
`apps/annotate/` JS, its two test tiers, five mutation witnesses and four
documents. Verified by reading the whole diff rather than the file list: the
only numbers it produces are `face_geometry.js`'s radii and plane offsets, and
the fence that keeps those out of a binding event, a stack value and the screen
is itself the deliverable (see below).

## What I verified

**Tests, every tier.**

| tier | result |
|---|---|
| `node apps/annotate/run_tests.cjs` | **154/154**, no tier skipped (the `[real]` mesh tier resolved through its main-checkout fallback path) |
| `node apps/viewer/run_tests.cjs --repo C:/workspace/tolstack` | **478/478**, no tier skipped |
| `python -m pytest -q` (review worktree) | **1208 passed, 1 failed** — `test_viewer_js_suite.py`, the documented worktree-only red (`data/projections/` is main-checkout-only). Covered by the 478/478 row above |
| `node scripts/run_viewer_browser_tests.mjs --repo C:/workspace/tolstack` | **25/25 suites**; the new `annotate face suggestions (candidate colours, the pick, the switch)` **25/25**; the four pre-existing annotate suites unchanged and green (flyout 45/45, rail filter 30/30, hosted posture 18/18, top bar 29/29) |

Browser tier run from this worktree over a `node_modules` directory junction
into the main checkout (the lesson's own recipe). **The junction was removed
before committing**; `git status` clean here and in `C:\workspace\tolstack`, so
nothing polluted the shared `data/`.

**A new guard has been observed failing — all five, individually, against the
clean tree.**

| witness | tier | result |
|---|---|---|
| `a-suggestion-never-selects-a-face` (auto-select when the narrowing reaches one) | annotate | **WITNESSED** |
| `a-suggestion-wears-no-state-colour` (candidates in `--traced` green) | annotate | **WITNESSED** |
| `two-flat-faces-on-different-parts-are-not-compared` (fills the `planar: null` in with `"parallel"`) | annotate | **WITNESSED** |
| `suggestions-do-not-overrule-the-see-through-switch` (`setGhost(sha, true)`) | browser | **WITNESSED** |
| `one-part-loads-once-however-many-callers-ask` (drops the shared in-flight promise) | browser | **WITNESSED** |

Each reddens on its **declared sub-check**, and each mutation is the plausible
half-implementation rather than a strawman. The first is the strongest thing in
the handoff: it applies the exact temptation the fence exists for — *it is one
line and it looks helpful* — and the static `THE FENCE` check in
`run_tests.cjs` carries its own anti-vacuity assertion (it fails if the
suggestion path draws nothing at all, so the forbidden-token scan cannot pass
by scanning an empty region). The accent-colour guard likewise reads the hex
out of `apps/viewer/style.css`'s `--accent` rather than pairing two written-down
values, and asserts all three roles are still present.

**The deliverables, one at a time.**

1. *Face classification.* `face_geometry.js` is genuinely DOM-free,
   fetch-free and three.js-free, and every threshold is a named field of one
   frozen `AA.FACE_CLASSIFY` block — no inline literal, no end-of-line
   comment, which is this repo's most-repeated defect. I checked the
   arithmetic rather than the comments: the Jacobi rotation and its
   eigenvector accumulation are the standard two-sided form with the
   Numerical-Recipes `t`; the Kåsa normal equations and the Cramer solve are
   correct term for term (`rhs = −Σz·x`, `withColumn` replaces the right
   column); `angularSpreadDeg` is turn-minus-widest-gap and is not fooled by
   the ±π branch cut; `axialAngleDeg` folds the flip, which is what a
   thickness between two outward normals needs. Hit rates are **measured and
   re-measured on every run**, not asserted from memory: 11 075 faces over 24
   meshes, 55.2% classified, with a 45% floor and every `other` carrying a
   reason. The floor is deliberately slack and says so — it does not own what
   is in the mesh store.
2. *Narrowing rules as a declared table.* `AA.SUGGESTION_RULES`,
   `AA.NARROWING_STAGES`, `AA.NARROWING_RELATIONS` — all module-level frozen
   constants, paired by `run_tests.cjs` (every rule's `surface` must be a class
   the classifier can actually answer; no word in two rows). Word-boundary
   matching, so `dia` does not fire on "diagonal". The **interface name before
   the dimension name** is the right call and the tests prove the case that
   motivates it. What is *not* in the table is as good as what is: `kind` is
   not read (four words, none of which distinguishes round from flat), notes
   are not read, and ambiguous words ("seat", "radius") are omitted rather
   than guessed.
3. *Display states.* Three overlay roles keyed by what the overlay claims,
   the suggestion colour paired against the shared `--accent` by a test,
   nothing-suggested rendering the ordinary view rather than an empty ghost.
   The one deviation from the handoff's literal wording — the suggestion
   display does **not** force the body transparent, it asks what
   `transparency` says — is deliberate, recorded in the lesson, the README,
   the code comment and a mutation witness, and it is the right call: the
   browser tier caught that the forced version made **See-through parts** a
   control that did nothing.
4. *Settings in the commands/help element.* `suggest` / `auto-suggest` are
   registered verbs, the checkbox drives the verb rather than poking state,
   and the verb is deliberately un-gated by the checkbox — so the driving arc
   never has to discover a preference. `readStoredOnOff`/`writeStoredOnOff`
   correctly collapse what was about to become a third copy of the same
   try/catch.

**The fence, checked directly and not on the strength of the guard.** Nothing
in `cmdSuggest` / `cmdAutoSuggest` / `loadClassesForSuggestion` /
`ensureFaceClasses` calls a write path, builds an event or sets
`state.currentPick`; `planFaceSuggestions` is pure and returns face ids; the
radii and offsets it compares are never rendered and never reach a binding
event. `docs/ANNOTATION_SURFACE.md`'s decision 1 is intact.

**Lesson audited, arithmetic re-derived.** Every count checks out against the
live `[real]` output: 2 481 + 3 632 = 6 113 classified, +4 962 other = 11 075;
55.2 / 22.4 / 32.8 / 44.8% all correct; the six `other` reasons sum to 4 962;
6/14 bushing faces = 43%; 4 chamfer rings × 2 = 8; (2.4130 − 2.4065)/2.4130 =
0.27%; 2 376 faces × 80 k triangles ≈ 192 M. The causal attributions hold too
— the see-through conflict, the `loadPart` race and the `#hint-panel
input[type=checkbox]` strict-mode break are each traceable to the code that
fixed them. **One loose clause corrected inline** (below).

**Docs.** `CLAUDE.md`, `docs/ANNOTATION_SURFACE.md`, `apps/annotate/README.md`
and `ARCHITECTURE.md`'s inventory are all consistent with the tree
(`apps/` is inventoried at directory granularity, so the two new JS files owe
no row — and `test_architecture_inventory.py` agrees). The filed issue's
frontmatter is exactly right: `type: feature`, `audience: strategy`,
`found_by:` and **not** `handoff:`.

## Fixed inline (two, both reported, neither silent)

- **`apps/annotate/run_tests.cjs:2537`** — `if (classes.length !== mesh.sha256
  && classes.length === 0)`. The first conjunct compares a number to a sha256
  string and is therefore always true; `mesh` here is
  `{sha256, label, part_id}` and carries nothing the comparison could have
  meant. Reduced to `if (classes.length === 0)`. Behaviour identical, suite
  re-run green (154/154).
- **`LESSONS_20260921_annotate_face_suggestions.md:57`** — "the radii read
  2.578 / 5.5626 (.203 / .438 in)" reads as if those radii are .203/.438 in;
  they are the parts list's **diameters** (2.578 mm ≈ .1015 in). The
  `[real]` tier's own comment states it correctly ("OD 11.125 (r 5.5626), ID
  5.156 (r 2.5781)"); the lesson clause now says so too.

## Should-fix — both filed, neither blocking

1. **`apps/annotate/README.md` states four measured numbers that nothing pairs
   to the tree** (`2.4065`, `0.27%`, `eight → four`; only `2.4130` is pinned),
   and it is the one app README with no doc-facts scan — `apps/viewer/`'s has
   `tests/test_viewer_readme_doc_facts.py`, `apps/annotate/`'s has nothing.
   The `[real]` tier *prints* those numbers and deliberately asserts only that
   the narrowing is strict, which is the right call for a tier that does not
   own the mesh store — but printing is not pairing, and `CLAUDE.md`'s rule is
   flat: a quantity in prose that no test reads from the tree is a defect
   whether or not it is right today. The lesson's classification table has the
   same shape with a weaker claim attached to it
   ("not a claim that decays" — the guard is a 45% aggregate floor, not the
   per-class counts).
   `ISSUE_20260921_annotate_readme_measured_numbers_are_paired_by_nothing.md`.
2. **A face bound to a *different* element gets two opaque overlays.**
   `markFace`'s de-dup key gained `role` (right, so clearing `suggested`
   spares `bound`), and `planEnd`'s `alreadyBound` filter drops only the faces
   bound to **this** element — so after `trace` + an element click, one face
   can carry a `bound` mark and a `suggested` mark at identical
   `polygonOffset`. Display only; the fence and the binding state are
   untouched, so `low`. The browser tier does check the two claims coexisting,
   but on two *different* faces — which is the fixture's shape, not the
   contract's.
   `ISSUE_20260921_a_face_bound_to_another_element_gets_two_opaque_overlays.md`.

## Nits (grouped, no action requested)

- `refreshSuggestions()` is fire-and-forget from `selectEdge`, `cmdSelectFace`
  and `cmdDeselect`, and `CommandLayer.exec` does not serialize — so two rapid
  element clicks during an **uncached** mesh read (0–42 ms measured) can
  interleave and leave the first element's overlays on screen until the next
  `suggest`. Transient, self-healing, and consistent with how `cmdTrace` /
  `cmdIsolate` already behave; noting it, not asking for a generation guard.
- `push("an element with no part suggests nothing…")` asserts an absence after
  waiting only for a selected row — the weakest wait in the new browser suite.
  It is true for the right reason today (`demo_edge_traced` names no part), but
  the predicate would also be satisfied by a build that simply had not painted
  yet. Its name also over-claims slightly: it says "and says nothing about
  narrowing" and asserts only the overlay count (a *different* sub-check does
  assert `.an__suggestion-note` is absent).
- `fitCircle2`'s singularity threshold (`1e-12 · magnitude²`) is scale-free in
  length but scales with the vertex count, so it tightens on larger faces.
  Conservative in the safe direction; no observed effect.

## Checklist maintained

Two new entries appended to `docs/prompts/REVIEW_AGENT.md`'s **Recurring bugs**
list, both from findings in this review: *a measured number landing in the one
app README nothing scans* (name the test that reads it — printing is not
asserting), and *a de-dup key widened by a ROLE, where two roles can land on
one target*. No entry pruned; nothing in the existing list cried wolf here.

## For the next reviewer

This is the highest-quality handoff I have reviewed in this repo. The two
things worth carrying forward as *positive* patterns: (a) every threshold in
`AA.FACE_CLASSIFY` carries the measurement that set it and the population it
rejects, so "why 0.02 and not 0.01" is answerable from the file — that is what
made the geometry reviewable at all; (b) the mutation witness that applies the
**temptation** rather than a strawman (`a-suggestion-never-selects-a-face`) is
the shape a fence-guard should take, and is worth copying wherever this
workspace writes "never" in a comment.

Two things left for whoever picks up the suggestion arc: the cross-part plane
relation is fenced off behind `ISSUE_20260921_cross_part_face_relations_need_
assembly_placement.md` (filed by the author, correctly routed to strategy with
`audience: strategy`), and stage 3's cylindrical leg has **no live
end-to-end case** in the repo's topologies — it is exercised by a synthetic
topology over real bolt and bushing meshes, clearly marked as such. When a real
diametral cross-part interface with two installed meshes arrives, that check is
the shape it will take.

**Verdict: APPROVE.** Merged into `integration`.
