---
type: review
handoff: docs/sessions/active/HANDOFF_20260921_annotate_hint_bar_and_context_autofilter.md
reviewer: review agent (opus)
date: 2026-09-21
verdict: APPROVE
blockers: 0
---

# REVIEW 2026-09-21 — `annotate_hint_bar_and_context_autofilter`

Branch `handoff/annotate_hint_bar_and_context_autofilter`, one commit
(`985d97f`), 14 files, +1916/−149. Merged into `review/annotate_hint_bar_and_
context_autofilter` **cleanly, no conflicts**, after first fast-forwarding the
review branch onto the `integration` that had moved under it
(`e9cb66d` → `19e9685`, the `viewer_nav_alert_badge_and_angled_default`
landing). Containment checked before starting: `git merge-base --is-ancestor`
said NOT MERGED, so the merge-and-watch-it-go-green step was real.

## The seven mandatory checks

This handoff touches no stack JSON, no element values and no spec-library
event — it is `apps/annotate/` UI plus its two test tiers. Checks 1–7
(source_ref tracing, signs on path terms, coherent material corners, LMC/MMC
direction, RSS computed, nominal inside min/max, quantised constraints, traced
ratio) are **N/A: no tolerance value, no `fold()` input and no `confidence`
field is created, edited or derived anywhere in the diff.** Verified by
reading the whole diff, not by reading the file list: the only place a schema
word reaches a reader is `precedenceNote`, which the author did not change and
did file against (see below).

## What I verified

**Tests, all four tiers.**

| tier | result |
|---|---|
| `node apps/annotate/run_tests.cjs` | 112/112 |
| `node apps/viewer/run_tests.cjs --repo C:/workspace/tolstack` | 478/478, no tier skipped |
| `venv-win/.../python.exe -m pytest -q` (review worktree) | 1208 passed, 1 failed — `test_viewer_js_suite.py`, the documented worktree-only red (`data/projections/` is main-checkout-only). Re-run of that tier against the main checkout's data is the 478/478 row above |
| `node scripts/run_viewer_browser_tests.mjs --repo C:/workspace/tolstack` | 24/24 suites; the new `annotate top bar + entry context (auto-filter, see-through)` 29/29; the two pre-existing annotate suites unchanged and green (rail filter 30/30, hosted posture 18/18, flyout 45/45) |

The browser tier was run from this worktree over a `node_modules` directory
junction into the main checkout (the lesson's own recipe); **the junction was
removed before committing** — `git status` clean, `tmp/` gitignored, and
`C:\workspace\tolstack` `git status` clean, so nothing polluted the shared
`data/`.

**A new guard has been observed failing — all four of them.** The deliverable
here is largely a layout and behaviour claim, so the four new
`scripts/mutation_witnesses.json` entries are what stands between it and a
silent revert. Each run individually against the clean tree:

| witness | result |
|---|---|
| `annotate-hint-pane-is-a-bar-not-a-third-column` (restores `260px 1fr 320px`) | WITNESSED |
| `arriving-at-an-element-shows-its-part-in-3d` (drops only the scene call, keeps every list effect) | WITNESSED |
| `unticking-an-auto-filter-switch-returns-that-control-to-manual` (drops only the immediate lift) | WITNESSED |
| `the-see-through-switch-flips-what-is-already-on-screen` (keeps the setting, drops the re-application) | WITNESSED |

All four redden on a **named sub-check**, and each mutation is the plausible
half-implementation rather than a strawman — the third one is the interesting
case: the lesson records that the first version was defeated by an `else`
branch and the fix was in the *app* (two independent `if`s), which is the right
reading of a witness that will not fire. The eight pre-existing
`annotate-*`-prefixed witnesses were re-run in the same pass: 8/8 still
witnessed, so the move did not blunt the hosted-posture or copy guards.

**The deliverables, one at a time.**

1. *Top bar.* `.an`'s grid is `260px 1fr`, `#detail` is inside `.an__scene`
   above `.an__stage`, and the browser tier measures the canvas running to the
   window's right edge, the bar at one line (`< 48px`) at rest, and the WebGL
   canvas laid out at the host's width. Screenshotted by hand at 1600×1000 in
   three states (arrival, help open, bind form open): the bar reads as one
   quiet line, the help panel is two labelled groups of short lines, the bind
   form wraps horizontally without crushing a field. Collapsible help present,
   structured as `group(title)` blocks so the staged `annotate_face_suggestions`
   section is an append.
2. *Entry context.* Verified live, not only by assertion: an element deep link
   lands with topology + study selected, one `.el-row.selected`, one part row,
   the part visible and ghosted, and the bar reading "Select the remaining face
   that defines Demo untraced edge" — the singular coming from
   `bindingDirectionsNeeded`, not from a guess. All of it goes through
   `AA.exec`; the URL branching moved out of `app.js` into the pure
   `AA.planEntryCommands`, which is the right place and is now readable by the
   fast tier.
3. *Auto-filter menu.* Three switches, everyday words, `AA.AUTO_STEPS` is the
   single list the markup carries no copy of (the fast tier asserts the markup
   spells no checkbox between the menu and the topology select). `planArrival`
   is a total function over the three flags and I traced all four branches by
   hand including the `applies: false` one; unticking Parts lifts the scope at
   once, ticking it back replays, the setting survives a reload, and neither
   disturbs the others.
4. *Scope-level entry.* `trace <topology>` with no study is the whole topology;
   `planScopeFilter` returns `planPanelFilter`'s shape (checked key-for-key by a
   fast-tier diff, so the rail needs no second renderer), and study-scope and
   topology-scope entries are both browser-tested — only the scope's parts,
   see-through, bound faces marked, scope named by its title in the rail.
   Transparency lives in the help panel under **Display**, applies to both entry
   shapes, and flips what is already on screen.

**Docs.** `apps/annotate/README.md`'s verb table gained all three new verbs, and
the existing fast-tier guard pairs that table against `commands.register(...)`
in `app.js` — so the table cannot drift. `ANNOTATION_SURFACE.md`'s "detail pane"
sentence was moved with the pane. `apps/viewer/README.md` needed nothing:
`VA.annotateLink` is untouched and no URL *parameter* was added — `study` merely
became optional on an existing one.

**Vocabularies.** `AA.ON_OFF` is a module-level constant and the read/write
pair spells `"on"`/`"off"` through it rather than inline, which is the shape
`CLAUDE.md` asks for. None of the new constants is a hand-copy of a Python one,
so nothing needs pairing to `tolerance_stack/`.

**The lesson.** Audited against the code. Two claims were off and I corrected
them in place with a dated blockquote (inside the inline-fix boundary): in
`cmdTrace` the `clearMarks` runs **before** the `ghost`/`isolate`, not after,
and `runPendingDeepLink` is twelve lines brace to brace, not three (its
substantive claim — that it branches on nothing the URL carries — is right).
Everything else checked out, including `GHOST_OPACITY`/`HIGHLIGHT`/`MARK_COLOR`
in `scene.js`, the rail's 10px padding behind the `list-style-position` note,
and the `max-height: 45vh` bound on the bar.

**Three issues filed by the author** (`precedenceNote` calling an untraced
element cited; no viewer launcher at topology scope; the flyout `min` width
still reserving the retired 320px column) are all correctly framed, correctly
typed and carry the frontmatter contract. The first is the load-bearing one —
the move made a false sentence prominent, and the author was right to say so
rather than quietly widen scope.

## Findings

### should-fix (1) — filed, not blocking

- **`apps/annotate/app.js`, `cmdHelp` → `renderDetail()`: the Help button
  discards a half-filled bind form.** `renderDetail` is
  `el.detail.innerHTML = ""` + rebuild, and the bind form's six controls are
  inside what it rebuilds — so the button a reader reaches for *while* filling
  the form is the button that empties it. Measured, not reasoned:
  fill `#bind-note-input` with `front face of the bushing`, click
  `#detail .an__disclose`, read it back → `""`. New with this handoff (the Help
  disclosure did not exist before, and nothing else adjacent to the form
  re-rendered it). Not a blocker: nothing wrong is written and the reader
  retypes. The fix is not mine to make — `help` wants `renderHintPanel()` plus
  an `aria-expanded` update instead of a full `renderDetail()`, which is a
  behaviour change I would want a browser-tier sub-check behind, so it fails
  prongs 1 and 2 of the inline-fix boundary.
  `ISSUE_20260921_the_annotators_help_button_discards_a_half_filled_bind_form.md`.
  Promoted to the overlay as the **second sighting** of "UI state that lives on
  a DOM element the renderer re-creates" (2026-09-10), widened there: a text
  field's typed value is UI state too, and the check is *grep what the handler
  calls and ask whether that renderer owns the subtree the control sits in*.
  The same diff's sibling toggles are the correct shape and make the contrast —
  `transparency` calls only `renderHintPanel()`, the auto-filter boxes only
  `renderAutoSetup()` plus the rail renderers.

### nits (3) — not filed

- **Dead CSS.** `.an__detail h3` (`style.css:270`) styles a node nothing
  creates any more: the element-name `<h3>` was folded into the instruction
  line, and `renderDetail` builds no heading. Its comment still explains a
  browser default that no longer applies to anything.
- **Stale comment.** The `.an__disclose` block says "Two of them sit on the
  instruction line and one opens the help panel" — there is exactly one, the
  Help button. (The owner-not-in-set disclosure is a `<summary>`, a different
  class.)
- **`key === "part"` twice in `cmdAutoFilter`** is an inline spelling of an
  `AA.AUTO_STEP_KEYS` member. Normally this repo's most-repeated defect, but
  here it is *not* unguarded: the browser tier drives the switches
  positionally (`boxes.nth(2)`), so renaming the key reddens "unticking Parts
  returns the lists to manual at once". Worth knowing about rather than fixing.

### What the tiers structurally cannot cover, and where that leaves the DoD

The DoD asks for a real viewer edge deep link against the live projection. The
browser tier cannot reach that state: FSA cannot grant a folder from an
automated browser, so the annotator's real-data path stops at the pre-connect
banner (the `annotate flyout` suite asserts the deep-link *queue* note and no
more) and every new assertion is `?mock=1`. That is the existing structural
limit of this surface, not a gap this handoff introduced, and the mock fixture
exercises every branch the live one would. **Jeff's own click-through with a
real folder granted is still the last mile here** — the mechanics are pinned,
the pitch-link data is not.

## Verdict

**APPROVE**, 0 blockers. Merged to `integration`.

## For the next reviewer

The four new mutation witnesses are all on one browser suite. If that suite is
ever split or renamed, all four `suite:` fields go stale at once and the tier
reports them NOT WITNESSED in a way that looks like a code regression — check
the suite name before believing the code broke.
