---
priority: med
depends_on: []
model: opus
---

# HANDOFF 2026-09-14 — surfaces_that_state_something_false: the node preview pane and the annotator both tell the reader something untrue

Source: triage sweep 2026-09-14/15, dispositioning two issues that share a
shape — a surface that confidently states something the app knows to be wrong.
Baseline: trunk after the 2026-09-14 batch merge. Scope:
`apps/viewer/views/topology.js`'s `nodeDetail`, and `apps/annotate/` (its boot
path and `README.md`). Do NOT touch `apps/viewer/tests.js` or
`scripts/run_viewer_browser_tests.mjs` beyond adding coverage for these two
changes — `HANDOFF_20260914_guard_mutation_witness_tier` owns the guard
restructuring there and will conflict with you if you restructure too. Do NOT
add annotate's HTTP read transport (see item 2's fence).

## 1. The node preview pane prints DECLARED parts where the dot's card prints DERIVED — 10 of 46 live nodes disagree

`viewer_dag_hover_cards` (2026-09-14) added the node hover card on `.rail__dot`.
**The card is right**, and its reasoning is recorded in
`LESSONS_20260914_viewer_dag_hover_cards.md`: a node's sides are **derived** from
the edges actually incident on it (`VA.nodeAdjacentParts`), because that is the
adjacency the leader/internal rule reads and the only one whose sides can be
honestly thumbnailed.

The defect is the other surface. The node **preview pane** — what the same dot's
*click* fills — still prints the node's authored `parts` list, in
`apps/viewer/views/topology.js`, `nodeDetail`:

```js
root.appendChild(VA.el("div", "detail__where",
  "on " + node.parts.join(" ⇔ ")));          // DECLARED
...
var adjacentParts = VA.nodeAdjacentParts(ctx.topoProj)[id] || [];   // DERIVED
```

So the same dot, hovered and clicked, gives two different answers about the same
node — and **10 of the 46 live nodes disagree**, so this is not a theoretical
divergence.

The fix direction is to make the pane agree with the card (derived), since the
card's choice is the reasoned one and the function already computes
`adjacentParts` two lines later. But **check what a declared-vs-derived
disagreement actually means for those 10 nodes before you erase the distinction**
— a node whose authored `parts` are not its incident parts may be an authoring
error worth surfacing rather than a display bug worth hiding. If any of the 10
look like data errors, say so in the lesson and file an issue rather than
silently making the surface consistent; consistency that hides a real
disagreement is worse than the disagreement.

## 2. The annotator still offers Connect folder on a hosted page

`viewer_transport_honest_hosted` (2026-09-14) settled the rule for
`apps/viewer/`: on an `http(s)` page whose served probe fails there is **no FSA
fallback**, because a hosted visitor has no tolstack repo to grant, and a picker
they cannot satisfy reads as a page asking for access to their files.

`apps/annotate/` is the same app family on the same hosted mount
(`/tolstack/annotate/`, and it is embedded in the viewer's own 3D flyout), and it
still boots straight to a folder grant there. `apps/annotate/README.md` still
documents **Connect folder** as the way in.

Apply the viewer's settled posture to annotate. `apps/viewer/storage/adapter.js`'s
`VA.chooseTransport` is the existing answer — reuse it rather than writing a
second decision procedure.

**Fence, and an important one:** this is the *posture* half only. Annotate's
missing HTTP read transport is a separate, already-triaged issue
(`ISSUE_20260910_annotate_has_no_http_read_transport`, routed to
`docs/strategy/BRIEF_20260911_served_surface_capability_gaps.md`). Do not build
that transport here. The two questions are genuinely independent: adding an HTTP
transport fixes the *happy path*; what the page does when the probe **fails** is
this item.

**Also correct the stale fix shape.** That triaged issue's suggested fix says the
annotate `storage/http.js` should *"fall back to FSA"* — which, implemented
literally, lands a hosted annotate page back on **Connect folder**, the exact
defect the viewer just removed. Edit that issue's text to note the contradiction
and point at the posture decided here, so whoever picks up the transport work
does not reintroduce it. Leave its `status: triaged` and its `strategy:`
back-link alone.

## Definition of done

- Hovering and clicking the same dot give the **same** answer about that node's
  sides, on all 46 live nodes. Demonstrate against the real projection at
  `C:\workspace\tolstack\data\projections\viewer\topologies.json` (absolute path;
  it does not exist in your worktree), and report what the 10 previously
  disagreeing nodes now show.
- A hosted annotate page with a failing probe shows no **Connect folder**
  affordance, and `apps/annotate/README.md` no longer documents it as the way in
  on a hosted origin. A local `file://` annotate page is **unchanged** — that
  path is legitimate and must keep working; say how you verified it.
- `ISSUE_20260910_annotate_has_no_http_read_transport.md` carries the correction
  from item 2.
- Coverage for both: value-level tests per repo convention, plus a browser-tier
  check for the hosted-annotate case if the tier can reach that mount.
- All tiers green: `node apps/viewer/run_tests.cjs` and `--repo
  C:\workspace\tolstack`, the browser tier, and
  `venv-win/Scripts/python.exe -m pytest -q` (869 passed / 1 skipped as of this
  staging).
- Lesson (`docs/sessions/lessons/LESSONS_<YYYYMMDD>_surfaces_that_state_something_false.md`):
  what the 10 declared-vs-derived disagreements turned out to be — authoring
  errors or honest derivation differences. That is the finding; the display fix
  is the easy half.
