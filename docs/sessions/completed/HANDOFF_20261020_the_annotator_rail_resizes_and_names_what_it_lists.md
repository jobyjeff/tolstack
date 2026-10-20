---
priority: med
depends_on: []
model: sonnet
---

# HANDOFF 2026-10-20 — the_annotator_rail_resizes_and_names_what_it_lists: a rail you can widen, labels you can read in full, parts called by name, and a sweep bar that tells the truth about binding

Source: Jeff, strategy session 2026-10-20, with a screenshot of the annotator
in sweep mode on run `vpa-pitch-p2-20261016-235852`. Baseline: `integration`
(the 10-14 placement + filter handoffs and the 10-16 pair are merged there).
Scope: `apps/annotate/` (app.js, sweep.js, commands.js, style.css,
index.html, its tests), `scripts/` for one new projection builder and its
rebuild-rail entry, `docs/ANNOTATION_SURFACE.md` and `apps/annotate/README.md`
for the facts that change. Do NOT touch `apps/viewer/` beyond the embedding
iframe's width if the flyout needs it, `docs/topologies/`, or
`tolerance_stack/`. The travel re-cite handoff staged today owns the topology
and worksheet files.

## What Jeff saw, and what is true

- **Part titles truncate and nothing reveals the rest.** The rail is a fixed
  260 px grid column (`style.css`, `grid-template-columns: 260px 1fr`); a part
  row reads `mesh.label + " (" + sha256.slice(0,12) + "…)"`
  (`app.js`, `renderPartsPanel`), so `215735-001 (ext…` is the mesh label
  `215735-001 (extracted from 217755-001 A.1 …)` cut by CSS. No tooltip, no
  resize.
- **Parts are named by number only.** Jeff: "we renumber parts a lot so I
  don't usually bother memorizing part numbers." The drawing's nomenclature
  exists: drawing-checker's extraction carries `title_block.nomenclature`
  (214698-002 → `GAS SPRING PISTON HEAD, PROPELLER, UPR`), and the topology's
  `parts[].name` carries an everyday name for the 16 parts it knows.
- **The sweep bar's one line is wrong twice.** `AA.SWEEP_PICKING_DISABLED`
  says "scrub back to the start to pick a face", and it is shown both on the
  gate line under the bar and as a banner on every click (`app.js` ~1706 and
  ~2973). On P2 the as-modelled pose is the **last** frame (index 79, driver
  0.0, +72°; frame 0 is the −7° stop, 64.466 mm away) — `AA.sweepIsAsModelled`
  is right, the words are not. And at that frame there is still nothing to
  bind, because `?sweep=` arrival does not change the topology: the rail kept
  `pitch_system` / "Cotter hole clearance" from the previous visit while the
  sweep belongs to `vpa_pitch_linkage`, and when Jeff switched to that
  topology by hand the study select said "no studies yet" and the element
  list stayed empty (`renderElementList` returns when there is no study and
  no filter), so the 24 interfaces the sweep is about cannot be picked.
- The topology a sweep belongs to is in the artifact: every entry of
  `geometry.features[]` names `topology: "vpa_pitch_linkage"` (59 of P2's
  60 do; the driver entry has none).

## Deliverables

1. **The rail resizes.** A drag handle on the rail's right edge; the width
   becomes one CSS custom property the grid reads; clamp to a sensible
   minimum and to half the window; remember the width per browser
   (`localStorage`, every read and write in try/catch, absent storage means
   the default). The same behaviour inside the viewer's flyout, where the
   annotator runs in an iframe — the handle lives in the annotator, so it
   comes for free unless the iframe's own width clips it; check.
2. **Truncated text is always discoverable.** Every row the rail clips —
   part rows, element rows, the topology and study selects — carries the full
   text where a hover reveals it (`title`, or the shared `#alert-pop`
   popup if a native tooltip is too slow to appear for a scanning reader —
   your call, say which in the lesson). A native `<select>` cannot tooltip
   per option: give the select itself the selected option's full text. Keep
   the ellipsis; the rule is that the full string is reachable, not that
   nothing ever truncates. Test the narrowest rail width, not the widest.
3. **Parts are named.** A part row reads `<number> <name>`, the sha prefix
   goes behind the hover text (it is an internal id; the standing rule). The
   name comes from a small projection this handoff adds,
   `data/projections/parts/names.json` (`{part_number: {name, source}}`),
   built by `scripts/build_part_names_projection.py` from, in precedence
   order: (a) drawing-checker's extracted title blocks —
   `C:\workspace\drawing-checker\data\runs\*\*_p01.json` →
   `title_block.drawing_no` + `title_block.nomenclature`, newest run per
   drawing number wins; (b) `docs/topologies/*.json` `parts[].name` with the
   leading number stripped when the name repeats it; (c) nothing — the row
   shows the number alone and the hover says "no name on file". Builder goes
   on `scripts/rebuild_projections.ps1`; the projection is gated by
   `projection_provenance` like the others (the inventory count moves by
   one). The annotator reads it through the same transport it reads the
   topology projection with, and degrades to (c) when it is absent. Everyday
   casing on the surface (`gas spring piston head, propeller, upr` → render
   the nomenclature as the drawing wrote it but not shouted: title case or
   lower case, pick one and apply it to every row).
4. **The sweep bar tells the truth.** (a) Compute the as-modelled frame once
   per loaded sweep (the first index `AA.sweepIsAsModelled` accepts; P2 → 79)
   and say where it is in the gate line, with a control that goes there:
   "Face picking works at the as-modelled pose only — frame 80 of 80, 72°.
   Go there." (one line, everyday words). If no frame qualifies, say that
   instead. (b) **One site, not two:** the gate line is the only place the
   sentence lives; a click on the canvas away from that pose pulses or
   focuses the gate line rather than raising a second banner. Remove the
   `setBanner` branch. (c) **A sweep arrival selects its topology**: on
   `?sweep=` / `sweep <id>`, read the topology id from the artifact's
   `geometry.features[]` and select it (through the same path the topology
   select uses, so the filter-clearing and study reset happen); an artifact
   with no features (the 10-01 runs) leaves the selection alone and the bar
   says the run names no topology. (d) **A studyless topology lists every
   edge.** When the selected topology has no studies, `renderElementList`
   lists all of its edges under a one-line head ("all 29 interfaces — no
   study scopes them"), so `vpa_pitch_linkage`'s interfaces can be bound at
   the as-modelled frame. The study select keeps saying "no studies yet".
5. **Retire 8843 as an entry point in the docs.** `apps/annotate/README.md`'s
   "Run it" section and `ops.toml`'s serve comment already call it a dev
   fallback; make the README's first instruction the drawing-checker mount
   (`http://127.0.0.1:8000/tolstack/annotate/index.html?sweep=latest`, one
   server for both apps) and move the `http.server 8843` recipe under a
   "hacking on the app with no drawing-checker server up" heading. No code
   change to the verb.

## Definition of done

- Browser TRUTH tier: a test drags the handle, reloads, and the width holds;
  a test at the minimum width finds every clipped row's full text reachable;
  a test loads P2 and reads the gate line's frame number and the "go there"
  control landing on index 79 with picking enabled; a test loads P2 cold and
  finds the topology select on `vpa_pitch_linkage` with 29 edges listed;
  `node apps/annotate/run_tests.cjs` green (`[real]` tier included, from the
  main checkout).
- `scripts/build_part_names_projection.py` run against the main checkout's
  data root names at least the six parts whose drawings are extracted today
  (213668-002, 214698-002, 214699-002, 214958-002, 214955-004, 214959-002)
  and the topology-named ones; a `[real]` check reads the projection.
- `venv-win/Scripts/python.exe -m pytest -q` green but for the documented
  worktree-only red; the doc guards pass with the README change.
- Lesson (`docs/sessions/lessons/LESSONS_20261020_the_annotator_rail_resizes_and_names_what_it_lists.md`):
  which tooltip mechanism and why; the name-source census (how many parts
  got a drawing name, a topology name, none); the as-modelled frame per
  published run (S, P1, P2); anything the flyout embedding needed.
