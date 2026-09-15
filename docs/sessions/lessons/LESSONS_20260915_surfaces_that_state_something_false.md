# LESSONS 2026-09-15 — surfaces_that_state_something_false

Two surfaces that stated something the app knew to be wrong. Both fixed. The
findings the next agent cannot read off the diff:

## 1. The 10 declared-vs-derived disagreements are ALL one shape, and none is an authoring error

This was the handoff's real question — *is a node whose authored `parts` are
not its incident parts an authoring error worth surfacing, or a display bug
worth hiding?* — and it has a clean answer. Measured against
`C:\workspace\tolstack\data\projections\viewer\topologies.json` (46 nodes,
5 topologies, built 2026-09-14):

| | count |
|---|---|
| nodes whose declared `parts` ≠ derived sides as a **set** | **10** |
| of those, the difference is *exactly* one extra `null` (a clearance) | **10** |
| nodes declaring a part **no incident edge carries** | **0** |
| incident parts a node's declared list **omits** | **0** |
| nodes agreeing as a set but differing in **order** | **7** |

Every one of the 10 is an endpoint of a `kind: "gap"` edge. A gap edge carries
no `part`, and `VA.nodeAdjacentParts` treats that `null` as a real side
(deliberately — a node between a structural edge and a gap sits on a component
boundary and must read as one). An authored `parts` list is a list of **parts**,
and a clearance is not a part, so it *cannot* name one.

So neither list was wrong: **they answer different questions.** No issue filed,
because there is no data defect to file — and the nodes are exactly the ones you
would predict from the mechanics: every joint's `shank_full_dia_end` and its
opposite clamped face (`washer_far_face`, `bushing_far_face`,
`flanged_bushing_effective_far_face`), plus `pitch_system`'s two end-stop faces
either side of `end_stop_clearance`.

What those 10 panes print now (the DoD asked for this list; `was:` is the
authored list the pane used to show, `now:` is the derived sides both surfaces
show):

```
pitch_link_to_pitch_plate/washer_far_face
    was: on washer_nas1149v0332h
    now: on washer_nas1149v0332h ⇔ a clearance
pitch_link_to_pitch_plate/shank_full_dia_end
    was: on bolt_nas6403u11d
    now: on bolt_nas6403u11d ⇔ a clearance
pitch_system/vpa_end_stop_feature
    was: on vpa_208510_007
    now: on vpa_208510_007 ⇔ a clearance
pitch_system/piston_end_stop_face
    was: on vpa_piston
    now: on a clearance ⇔ vpa_piston
rotor_fastener_length/washer_far_face
    was: on washer_nas1149v0332_tt
    now: on washer_nas1149v0332_tt ⇔ a clearance
rotor_fastener_length/shank_full_dia_end
    was: on fastener_family
    now: on fastener_family ⇔ a clearance
tan_link_to_pitch_plate_take2/flanged_bushing_effective_far_face
    was: on flanged_bushing_tan_link
    now: on flanged_bushing_tan_link ⇔ a clearance
tan_link_to_pitch_plate_take2/shank_full_dia_end
    was: on bolt_nas6403u13h
    now: on bolt_nas6403u13h ⇔ a clearance
vpa_output_to_pitch_plate/bushing_far_face
    was: on plain_bushing_214943_002
    now: on plain_bushing_214943_002 ⇔ a clearance
vpa_output_to_pitch_plate/shank_full_dia_end
    was: on bolt_nas6404u13d
    now: on bolt_nas6404u13d ⇔ a clearance
```

`piston_end_stop_face` is the one whose clearance comes **first** — derived
order is first-seen-edge order, and `end_stop_clearance` is the edge declared
before `piston_length`. Nothing to fix: the card prints that order too, which
is the whole point.

Two things worth knowing beyond the 10:

- **The extra 7.** Same two parts, opposite order — the declared list is in
  authoring order, the derived one in first-seen-edge order. So **17 of 46**
  live nodes rendered a *different string* hovered and clicked; 10 differed in
  membership. All six `head_bearing_face`-shaped nodes are in the 7. The
  mutation check fired on one of these first, not on one of the 10.
- **Printing derived sides would HIDE the divergence that WOULD be an authoring
  error** (a declared part no incident edge carries). That is why the new
  `[real]` test asserts it away node by node rather than leaving it to a future
  reader's eye. If that assertion ever fires, the topology document is wrong,
  not the pane.

The pane also contradicted **itself**, which is how cheap this was to confirm:
its where-line printed declared parts and its leader sentence, two lines below,
re-listed the *derived* ones with a different separator. The sentence now states
the rule only.

**Label styles are not the same question as sides.** The card labels each side
with the part's prose component-card title (it pairs the label with that part's
thumbnail); the pane and the grid print the part **id**, because a live part
name here runs to eighty characters (`"NAS1149V0332H washer, flat, 6Al-4V, .203
x .438 x .032 in"`). `VA.nodeSideIds` is the id form of the one derivation, so
the two surfaces differ in *wording* and cannot differ in *which sides a node
has* — which is what the tests pin.

## 2. The annotator's premise is the inverse of the viewer's, and a literal transplant would have bricked the app

The handoff said "apply the viewer's settled posture" and "a local `file://`
annotate page is unchanged — that path is legitimate and must keep working."
**There is no legitimate `file://` annotate page.** Its own README: *"This app
already cannot run from `file://` at all"* — File System Access has no
`file://` story and neither does fetching a mesh binary.

The viewer's rule reads the **protocol** because the viewer's legitimate local
page *is* `file://` (it is built to run by double-click). Applied to annotate
literally, `protocol !== "file:"` → UNPUBLISHED → **no way in on any origin**,
including:

- `http://127.0.0.1:8000/tolstack/annotate/` — drawing-checker's `serve` verb
  (uvicorn on 127.0.0.1:8000), the canonical mount, and where Jeff's live 3D
  flyout workflow runs;
- `http://127.0.0.1:8843/annotate/index.html` — this repo's own `ops.toml`
  serve verb.

So the shared decision grew the predicate the *reasoning* always implied:
`VA.isLocalPage(protocol, hostname)` — `file://`, or a loopback hostname. The
question behind **Connect folder** was never "what protocol is this page"; it
is "does the reader plausibly hold the repo the picker would open".

**The viewer's own behaviour is byte-for-byte unchanged**, because a caller that
passes no `hostname` gets the strictest answer and `topology_app.js`
deliberately passes none. That is a documented decision in that file, not an
omission — and whether the viewer *should* pass its hostname is
`ISSUE_20260915_viewer_says_unpublished_on_a_loopback_origin_it_could_offer_a_picker_for`,
which also records the two tiers that would have to change with it.

### Decisions the handoff did not specify

- **The hosted sentence is annotate's own fact, not the viewer's.** The
  viewer's — *"the data is not published on this site yet"* — goes **false** the
  moment drawing-checker bakes the projections, while this app still cannot
  write. `AA.HOSTED_NOTICE` says instead: *"Annotating is not available on this
  site — it records what it learns by writing into the tolerance-stack
  repository, which only a copy of that repository on your own machine can
  do."* True before and after the bake. A fast-tier check refuses a notice
  containing a control name, a path or a command.
- **The transport decision moved AHEAD of the 3D scene construction.** A hosted
  page has nothing to render into a WebGL context, and — the reason it matters
  for tests — `new AnnotateScene(...)` would otherwise throw *before* the banner
  in any browser without WebGL, replacing an honest sentence with a blank page.
- **`ops.toml`'s serve verb now serves `apps\`, not `apps\annotate\`.** Forced,
  not tidying: annotate's `index.html` now loads `../viewer/storage/adapter.js`
  (the shared decision — one rule, not two), which a lone-app root 404s, taking
  the whole boot with it. The two apps are siblings on the canonical mount for
  the same reason, and `viewer.js` already assumes it (`../annotate/index.html`).
  `tests/test_ops_toml_serve_verb.py` and the README moved with it.
- `AA.isHosted(picked)` exists so `app.js` never reaches into
  `window.ViewerApp` itself — the cross-app reach is in one file, the adapter
  that already owns the delegation.

### The browser-tier technique: one server, two hostnames

Every server in `scripts/run_viewer_browser_tests.mjs` listens on `127.0.0.1`,
which under the new rule is the **local** case — the opposite of what a hosted
check needs. Chrome's `--host-resolver-rules=MAP hosted.tolstack.test
127.0.0.1` (now on `launch()`, `HOSTED_TEST_HOST`) maps one name at the
resolver, so the page really is on a non-loopback origin with no DNS and no real
host; `.test` is the reserved TLD for this (RFC 6761) so the name can never
become someone's site. Inert for every other check — nothing else uses it.

Running **both** halves off the one server is the point: a build that removed
the picker everywhere passes the hosted half. Measured, both ways:

- removing the hosted branch → 2 sub-checks red;
- dropping the loopback carve-out (the blunt transplant) → the local half red
  **plus** the pre-existing `annotate flyout` suite's "boots to an honest
  pre-connect state" check.

That second one is the useful fact: the flyout suite was already, unknowingly,
a guard against exactly this mistake.

## Gotchas that cost time

- **`--repo C:\workspace\tolstack` through the Bash tool loses its
  backslashes** and silently becomes `workspacetolstack`, so the `[real]` tier
  reports itself *skipped* rather than failing. Use forward slashes:
  `--repo C:/workspace/tolstack`. (A skip that looks like a pass is worse than a
  failure — I nearly believed 293/293 was the real-tier number.)
- **The truth tier needs `npm install` in the worktree** — one package, under a
  second. Recorded twice before; still the first thing that stops a worktree
  run.
- **The `[real]` fast-tier failures the previous session recorded are gone.**
  `LESSONS_20260914_viewer_transport_honest_hosted.md` warns that two
  `crop_region`/`region_match` checks fail on that branch
  (`ISSUE_20260914_two_active_handoffs_each_turn_the_others_real_tier_red`).
  They pass here: 356/356 with the projection built 2026-09-14 23:53. Don't go
  hunting for them.

## Left for someone else (all filed, none merely described here)

- `ISSUE_20260915_viewer_says_unpublished_on_a_loopback_origin_it_could_offer_a_picker_for`
  — the asymmetry above, `audience: strategy`.
- `ISSUE_20260915_a_hosted_viewer_still_offers_3d_affordances_the_annotator_cannot_service`
  — three viewer affordances now lead to the hosted notice. Probably wants to
  be decided *with* the HTTP read transport, since read is not write and the
  flyout's `trace` is pure read; `audience: strategy` for that reason.
- `ISSUE_20260915_annotate_banner_renders_a_terminal_command_for_the_user_to_copy`
  — `loadAll()` prints `venv-win\Scripts\python.exe scripts\build_topology_
  projection.py` into the banner, the exact shape Jeff ruled out. The viewer
  went through this pass; this app did not.
- `ISSUE_20260910_annotate_has_no_http_read_transport` carries the correction
  this handoff asked for: its "fall back to FSA" fix shape would reintroduce the
  picker on a hosted page. `status: triaged` and its `strategy:` back-link left
  alone.
