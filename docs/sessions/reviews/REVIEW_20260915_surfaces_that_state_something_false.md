---
type: review
handoff: surfaces_that_state_something_false
reviewer: agent (review/surfaces_that_state_something_false)
date: 2026-09-15
verdict: APPROVE
blockers: 0
---

# REVIEW 2026-09-15 — surfaces_that_state_something_false

Branch `handoff/surfaces_that_state_something_false`, 4 commits (`9a291bf`
viewer pane, `afbed4e` annotate posture, `6742649` browser tier, `10ec60b`
issues + lesson), merged into `review/surfaces_that_state_something_false` on
top of `integration` `575b2c3`. **No conflicts** — `integration` had moved one
commit past the branch point (`575b2c3`, board bookkeeping only), so the
merge-conflict carve-out did not come up. Containment checked before starting
(`git merge-base --is-ancestor` → not merged), so the merge-and-watch-it-go-
green step was real.

The work is a viewer/annotate UI change, not a tolerance stack: mandatory
checks 1–7 (provenance, signs, LMC/MMC, RSS, nominal-in-band, quantised
constraints, the traced ratio) do not apply — the diff adds no element, no
`source_ref`, no check and no number a fold consumes. `fold()` is untouched and
no second combiner appears, in Python or JS. `data/inbox/specs/`,
`docs/reference/` and `PROVENANCE.md` are untouched; nothing was written into
drawing-checker (read-only probe via its `TestClient` only).

## Tiers, re-run here on the merged tree

| tier | result |
|---|---|
| `node apps/viewer/run_tests.cjs` | 294/294 (node-fs tier honestly SKIP — no projection in a worktree) |
| `… --repo C:/workspace/tolstack` | **356/356**, `[real]` tier live |
| `node apps/annotate/run_tests.cjs` | 63/63 |
| `node scripts/run_viewer_browser_tests.mjs --repo C:/workspace/tolstack` | **19/19** browser checks |
| `venv-win/Scripts/python.exe -m pytest -q` | **869 passed, 1 skipped** |

Nothing was written into `data/` by any tier (0 files under
`C:\workspace\tolstack\data` modified in the 90 minutes covering every run),
and the main checkout's `git status` carries only one unrelated untracked issue
from another session.

Two operational notes for the next reviewer: the browser tier needs
`node_modules` (gitignored, main-checkout only) — a directory junction from the
main checkout is enough; and `--repo C:\workspace\tolstack` through the Bash
tool loses its backslashes and the `[real]` tier reports itself **skipped**,
which reads exactly like a pass. The lesson records this too. Use
`--repo C:/workspace/tolstack`.

## What I verified

### Item 1 — the node preview pane now names derived sides

`VA.nodeSideIds` (`apps/viewer/topology.js`) is the id form of the one
adjacency, and `renderNodeDetail` calls it instead of joining `node.parts`.
The leader sentence dropped its second, differently-separated re-listing of
the same sides and states the rule only, reading the shared predicate
(`VA.internalNodes[id]`) rather than re-deriving `length <= 1` — identical by
construction (`internalNodes` *is* that comparison), and `renderNodeDetail`
early-returns on a node the index does not contain, so the `undefined` case
cannot be reached. **PASS.**

**Re-derived independently**, not read off the report: a script loading
`viewer.js` + `topology.js` in a vm against
`C:\workspace\tolstack\data\projections\viewer\topologies.json` (5 topologies,
46 nodes) confirms every count in the lesson's table —

- 10 nodes whose declared `parts` ≠ derived sides **as a set**, every one of
  them exactly one extra `null` (a clearance), every one an endpoint of a
  `kind: "gap"` edge;
- **0** nodes declaring a part no incident edge carries, and **0** incident
  parts a declared list omits — so the divergence is honest derivation
  difference, not an authoring error, which is the handoff's actual question
  and the lesson answers it correctly and in the right direction (it also
  explains why the new `[real]` test *asserts the authoring-error case away*
  node by node rather than letting the derived print hide it);
- 7 further nodes agreeing as a set but differing in order (authoring order
  vs. first-seen-edge order), so **17 of 46** rendered a different string.
  See S2 — the shipped documents say 10 under the string wording.

**Observed failing, not accepted on green.** Reverting the pane's one line to
`(node.parts || []).slice()`:

| tier | shipped | mutated |
|---|---|---|
| fast `--repo` | 356/356 | **353/356** — the new pane test, the new `[real]` dot test, *and* the pre-existing "which side of the leader rule" test |

### Item 2 — no Connect folder on a hosted annotate page

`VA.chooseTransport` grew `VA.isLocalPage(protocol, hostname)` and a frozen
module-level `VA.LOCAL_HOSTNAMES` (repo rule: a vocabulary is a constant, never
an inline literal — the scan that enforces that is green). `AA.chooseTransport`
**delegates** rather than copying, with `http: null`; `AA.isHosted` is the one
place the annotator reads `window.ViewerApp.TRANSPORT`. The viewer's own boot
is byte-for-byte unchanged because `topology_app.js` passes no `hostname` and
the omission yields the strictest answer — a deliberate, documented asymmetry,
filed as an issue rather than decided. **PASS.**

The lesson's correction of the handoff here is right and worth keeping: there
is **no legitimate `file://` annotate page**, so the DoD's "a local `file://`
annotate page is unchanged" rested on a false premise. Verified at the wire —
a `file://` annotate page shows an empty banner and loads nothing, before and
after, because `app.js` is an ES module and Chrome blocks it from an opaque
origin (`Access to script at 'file:///…/app.js' from origin 'null' has been
blocked by CORS policy`). The newly added classic `<script>` **does** load
there (`window.ViewerApp` is an object on a `file://` page), so the added
coupling introduces nothing new on that path. `?mock=1` short-circuits the
transport as claimed: verified working on both a hosted and a loopback origin
(one topology loaded, canvas present, zero page errors).

Real-browser evidence for the hosted page itself, on a genuine non-loopback
origin: banner = `AA.HOSTED_NOTICE`, `#connect-btn` `display: none`,
`#transport-sub` empty, no page errors. See S1 for what *else* is on it.

**Observed failing, three ways:**

| mutation | result |
|---|---|
| the blunt transplant — `isLocalPage` → `opts.protocol !== FILE_PROTOCOL` | annotate fast **61/63**; browser **17/19**: the new suite's two local sub-checks *plus* the pre-existing `annotate flyout` "boots to an honest pre-connect state". Reproduces the lesson's measured claim exactly, including that second one. |
| `LOCAL_HOSTNAMES` matched as a substring instead of exactly | viewer fast **355/356** — the `localhost.attacker.example` row bites |
| drop `el.connectBtn.style.display = "none"` | browser **18/19**, "Connect folder is not offered at all" — so the browser tier is the *only* witness for `app.js`'s hosted branch, and it does witness it |
| remove `../viewer/storage/adapter.js` from `index.html` | annotate fast **62/63** (the static read) |

The cross-repo coupling the change introduces checks out. drawing-checker
mounts `/tolstack/viewer` → `apps/viewer` and `/tolstack/annotate` →
`apps/annotate`, so the browser's own normalisation of
`../viewer/storage/adapter.js` from `/tolstack/annotate/index.html` lands on a
real mount — confirmed through drawing-checker's `TestClient`:
`GET /tolstack/viewer/storage/adapter.js` → 200. And the changed `ops.toml`
serve verb runs: the exact argv with `--directory apps` serves
`/annotate/index.html`, `/annotate/app.js` and `/viewer/storage/adapter.js`
all 200, with `/index.html` an honest 404. `tests/test_ops_toml_serve_verb.py`
moved with it, the README's `Run it` block moved with it, and the only other
`8843` mentions in the repo are those two.

### Issues and the correction

All three new issues carry correct frontmatter, use `found_by:` (not
`handoff:`, which is triage's), and spell every enum value exactly;
`audience: strategy` is used where the call genuinely needs design and withheld
where it doesn't. `ISSUE_20260910_annotate_has_no_http_read_transport` carries
the correction the handoff asked for as a **dated blockquote**, with
`status: triaged` and its `strategy:` back-link untouched — the insert-only
discipline `docs/reference/` uses, applied to an issue, which is the right
call. The lesson's "left for someone else" list has a filed issue behind every
item; I checked each one exists.

One side effect worth naming: serving `apps/` now also exposes the **viewer**
at `127.0.0.1:8843/viewer/`, where its served probe fails and it says "not
published on this site yet" to someone standing next to the repo. That is a
second, more reachable instance of
`ISSUE_20260915_viewer_says_unpublished_on_a_loopback_origin_it_could_offer_a_
picker_for`, which the same branch filed — no new issue, but the one-line fix
there is now slightly more worth doing.

## Findings

### Should-fix

**S1. The hosted annotate page still instructs the reader to bind a face.**
`apps/annotate/app.js`, `main()`'s hosted early-return. The banner is honest
and **Connect folder** is gone — and below it the detail pane still reads
*"Pick an element on the left, then click a face in the 3D view to bind it"*,
both selects are visible, the dev console's **Run** is visible and live
(`main()` wires it before the return), and the 3D pane is a large empty panel
because `AnnotateScene` is now deliberately never constructed. So the page
states, two inches apart, that annotating is unavailable here and that the way
to annotate is to click a face in a 3D view that does not exist on it.

None of that chrome is new — a hosted page showed the same hint, selects and
console beside an unsatisfiable **Connect folder** before. What changed is that
the page now *says* it cannot annotate, which turns unreachable instructions
into contradicted ones, and that the named 3D view is now genuinely absent
rather than merely empty. The handoff's letter is met; its own thesis, and the
rule its own fast-tier check asserts about the notice (*a feature that is
absent shows nothing about itself*), are not. Not a blocker: strictly better
than what shipped before, and the fix is a design call about an emptied
three-column grid rather than a line.
Filed:
`ISSUE_20260915_the_hosted_annotate_page_still_instructs_the_reader_to_bind_a_face`
(with the measured element-by-element table and a screenshot's worth of
detail). Its 3D-pane half interacts with the branch's own
`a_hosted_viewer_still_offers_3d_affordances…` strategy question; the
selects/hint/console half has no such argument and can go now.

**S2. "10 of the 46 live nodes" is unguarded, and counts a different thing
than the sentence says.** `apps/viewer/README.md` (hover-cards section) and
`apps/viewer/views/topology.js`'s `renderNodeDetail` comment both say *"10 of
the 46 live nodes answering differently hovered and clicked"*. Re-derived: 10
is the count that differ **as a set**; **17** rendered a different string. The
lesson states both correctly — *"17 of 46 live nodes rendered a different
string…; 10 differed in membership"* — and the shipped documents carry the
membership number under the string wording. One number, two nouns, one commit,
with the lesson holding the correct table: a **second sighting** of the
overlay's existing "One number, two nouns, both in the same commit" entry (so
no overlay edit for it).

Separately, both digits are hand-restated live-projection counts with nothing
pairing them — at least the third sighting on this one file in two weeks
(`REVIEW_20260914_viewer_dag_hover_cards` S,
`REVIEW_20260914_viewer_dag_spine_layout` S2, and the still-open rail-
allocation issue). The new `[real]` guard computes the 17 and asserts only
`> 0`, correctly, as a vacuity guard — which leaves the README's digits held by
nothing. The pairing pattern already exists three tests down in the same file.
Not inline-fixed: the wording is a two-word edit but the real fix is the
pairing, which needs a test and therefore is not mine to write.
Filed:
`ISSUE_20260915_the_viewer_readmes_10_of_46_node_divergence_count_is_unguarded_and_counts_the_wrong_thing`.

### Nits

- **Fixed inline** (clears all three prongs — a typo in a comment):
  `apps/viewer/tests.js`, "which an lax match would wave through" → "which a
  lax match". Nothing else was touched.
- `AA.chooseTransport`'s misconfiguration error is carefully worded for
  whoever serves `apps/annotate/` alone — and reaches the **console only**.
  `main()` is called bare with no `.catch()`, so that page renders an empty
  banner and a live **Connect folder**. Verified in Chrome. The `index.html`
  static check, the `ops.toml` change and the README all steer away from the
  misconfiguration, so this is about how the failure *presents*, not whether
  it is caught; a `main().catch((e) => setBanner(e.message, "error"))` would
  put the good sentence where a reader is.
- The hosted early-return never settles `execQueue` (`markLoaded` /
  `markLoadFailed`), so a same-origin flyout `annotate:exec` queues forever.
  **No user-visible effect today**: `topology_app.js`'s `launchAnnotate` posts
  and never awaits a reply, and the pre-change hosted page hung the same way
  waiting on a connect that never came. Worth one line if that queue ever gets
  an awaiting caller — the class is on the overlay
  (`new Promise` gate with no reject path).
- `VA.nodeCard`'s `declaredParts` is now consumed by nothing — no view renders
  it, and the new `[real]` test reads `node.parts` directly. Pre-existing from
  `viewer_dag_hover_cards`; flagged, not filed.
- `apps/viewer/README.md`'s `storage/adapter.js` inventory row still describes
  that file as "VA.chooseTransport / VA.TRANSPORT" and does not name
  `VA.isLocalPage` / `VA.LOCAL_HOSTNAMES`. The row is per-file prose, not a
  paired symbol inventory, so nothing is stale-by-test — mentioning it only
  because the next reader of that row will go looking for the hostname rule
  where it isn't described.

## Overlay

Added one entry to `docs/prompts/REVIEW_AGENT.md`'s **Recurring bugs** for the
new failure class S1 is an instance of — *one sentence made honest, with the
chrome around it still instructing the reader to do the thing* — including the
technique that found it (load the page in the configuration under test and read
the whole viewport; the fast tier cannot boot `app.js` at all). Nothing pruned:
the entries this review leaned on (the mutate-the-line guard entry, the
restated-count entries, "One number, two nouns") all earned their keep here.

## Note for the next reviewer

The lesson for this handoff is unusually load-bearing — it corrects its own
handoff's premise about `file://`, records both node counts correctly where the
shipped docs do not, and records a measured mutation result that I reproduced
exactly. Read it before the diff.
