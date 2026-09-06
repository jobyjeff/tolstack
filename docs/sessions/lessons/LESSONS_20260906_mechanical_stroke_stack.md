# Lesson — mechanical_stroke_stack (worked 2026-09-06)

Handoff `HANDOFF_20260906_mechanical_stroke_stack.md`, branch
`handoff/mechanical_stroke_stack`, cut from `integration` with
`endstop_location_stack` merged (same baseline that handoff's own lesson names).
Deliverable: the gas-spring mechanical-stroke stack, on the same DAG archetype
and the same shared topology (`docs/topologies/topology_pitch_system.json`),
checked against the S461 gas-spring stroke/stop requirement family.

## What changed

- `docs/topologies/topology_pitch_system.json`: one new node
  (`gas_spring_full_extension_stop`, the S461-610/636 0mm datum) and one new
  edge (`gas_spring_mechanical_stroke`, `kind: "structural"`, part `gas_spring`,
  `kind: "assumed"`/`confidence: "untraced"` — no source anywhere states a
  numeric band for the gas spring's own internal piston travel). The edge's
  `to` end reuses the **existing** `gas_spring_mount_flange` node as a stand-in
  for the piston's own full-retraction stop face — see "The design decision
  that cost a redesign" below. New `provenance.mechanical_stroke_extension_20260906`
  key. Structural counts move to 12 parts / 21 interfaces / 24 edges / 5 branch
  points / 4 grounded loops / 1 gap edge (up from 12/20/23/4/4/1); every place
  those numbers are stated in prose (`docs/DAG_TOPOLOGY.md`'s L2 section, this
  topology's own two inventory notes) is updated, derived-and-checked via
  `tests/test_topology.py`'s existing `_COUNTABLES` machinery, not retyped by
  hand.
- `docs/topologies/study_pitch_system_gas_spring_mechanical_stroke.json` — new.
  A one-edge millimetre study over the new edge, with one requirement-cited
  check (`s461_617_margin_gas_spring_stroke`) against a **derived** 3.289067mm
  margin.
- `docs/topologies/study_pitch_system_end_stop_minus7.json` /
  `study_pitch_system_end_stop_plus72.json` — each gains an **appended** second
  `checks` entry (`s461_617_margin_at_minus7` / `_at_plus72`), citing the SAME
  derived margin (4°, unconverted) against each study's own pre-existing
  accumulated blade-pitch-angle total. `selection`/`transforms`/the first
  (S461-607) `checks` entry are byte-for-byte untouched — pinned by
  `tests/test_topology.py::test_the_end_stop_studies_first_check_is_unchanged_by_the_appended_second`.
- `docs/DAG_TOPOLOGY.md`: L2 inventory sentence updated (seven studies now);
  the L2 bullet list gains the new study and a note on the appended checks;
  the "9 workbook / 6 drawing / 8 assumed" sentence becomes "9/6/9, of 24".
- `docs/tolerance_stacks/WORKSHEET_endstop_vision_baseline.md`: new §10,
  reproduced in outline below.
- `tests/test_topology.py`: new §10 — value-level pins for all three new/
  appended checks' margins, a shape test confirming the appended checks did
  not disturb the first, a structural test pinning the "reuse an existing
  node, stay connected" design decision, and two live-pull pairing tests (the
  new requirement citations quote the artifact verbatim; the four near-
  duplicate id pairs really are exact-text duplicates, not variants).
- This lesson.

No `stack_*.json` touched, `tolerance_stack/stack.py` and `tolerance_stack/
topology.py` **both untouched** (this handoff needed no new Python at all —
`check_study()`'s existing per-study `checks` list already supports an
appended second entry with no code change), no spec-library event added,
`apps/` untouched, no drawing-checker file opened at any point (§10e of the
worksheet) — all per the handoff's own scope fence.

## The design decision that cost a redesign: an isolated subgraph broke the viewer

The first design tried gave the new stroke edge **two** brand-new nodes
(`gas_spring_full_extension_stop` **and** `gas_spring_full_retraction_stop`),
deliberately disconnected from the rest of the graph — the honest-seeming
choice, since no source states how the piston's internal stops relate to the
body's external mounting features, and inventing that relationship felt worse
than admitting it is unknown.

That design passed every test in `tests/test_topology.py` (which is glob-based
and per-file; it never assumed a topology is one component) but broke
`tests/test_topology_projection.py::test_the_number_of_closing_edges_is_the_graphs_cycle_count`,
which asserts `components == 1` for `topology_pitch_system.json` **rather than
deriving it** — the test's own docstring says why: so a future disconnected
topology reddens there with a readable message instead of quietly changing the
viewer's layout math. I only found this by running the **full** suite, not
just `test_topology.py`; if the handoff's "same fences... tests" scope reads
narrowly as "the topology archetype's own test module," this failure mode is
easy to miss. **Run the whole suite, not the module you think you touched,
whenever a topology's own connectivity could change.**

Fixing the viewer's projection builder to support a disconnected topology was
the alternative and was rejected: it is real code under `scripts/`, adjacent to
`apps/` (which the handoff explicitly excludes) and not itself a `topologies +
studies + checks + tests + worksheet prose` change, so touching it would have
been scope creep for a one-edge addition. Instead the edge was redesigned to
reuse the **existing** `gas_spring_mount_flange` node for its full-retraction
end, at the cost of one new branch point there (5 total, up from 4) and an
explicit, named approximation: the reused node is **not** claimed to be the
piston's actual internal stop face, only the closest reference this topology
has. `tests/test_topology.py::test_the_gas_spring_stroke_edge_reuses_an_existing_node_and_stays_connected`
pins the shape so a future edit cannot silently re-isolate it, and the
worksheet's §10b explains the reasoning for a reader who has not read this
lesson.

**For the brake-family stack, staged next on this same archetype**: expect the
identical choice. The brake needs its own internal stroke/stop representation
(today it has only `kind: "assumed"` external edges, same as the gas spring
had before this session), and whichever design is tried first should check
`test_topology_projection.py`'s connectivity assumption before committing to
an isolated subgraph.

## The 516/637-style requirement-pair reading

Read individually per the handoff's own instruction (not assumed variants):
**every one of the four pairs this family contains — 610/636, 516/637,
616/638, 617/639 — is an exact-text duplicate**, same `c_title`, same
`c_description`, differing only in `c_id` and `c_created` timestamp (the
`6xx`-numbered id in each pair was created 2026-05-04, months after its
`5xx`/`6xx`-numbered twin). Nothing in this pull artifact's schema
distinguishes a configuration or a variant between them — there is no such
field at all (the endstop-location lesson's shortcoming 3 already named this:
"no requirement-to-requirement grouping"). The most defensible reading is two
Polarion baseline exports of the same requirement, and this session cites one
member per pair as primary (610, 516, 616, 617) and notes its twin, rather
than inventing a distinction neither text supports. Pinned against the live
pull by `test_the_near_duplicate_requirement_pairs_are_byte_identical_not_variants`,
so a future re-baseline that actually differentiates a pair reddens a test
instead of leaving a stale claim in prose. **This differs from the previous
session's S461-231/241/263 family**, which really were three requirements with
different content (structural vs. numeric vs. context) — do not assume every
near-duplicate-id sighting in this pull is the same shape twice.

## The derived-margin move, and why it is not a second S461-607

S461-617/639 ("sufficient tolerance... extremely improbable") states no
number, exactly the position S461-241 was in for the endstop-location handoff.
That handoff's answer was to adopt S461-607 (a *different* quantity — blade-
to-blade variation, not this chain's own accumulated error) as the closest
available numeric criterion. This session instead **derived** a number from
two *directly relevant* requirements already in hand: S461-241's stop span
(79°) minus S461-516/637's stated operating range (75°) leaves 4° of design
margin, converted to millimetres via S461-516/637's *own* stated 61.67mm/75°
equivalence. I judge this a stronger citation than the S461-607 borrow — it
uses figures about the *same* mechanism and the *same* quantity — but it
carries its own new caveat that S461-607 never needed: **the 4° figure is a
total margin, and neither requirement states how it splits between the two
stops.** Applying the full 4° at both ends is named explicitly, in every
affected check's `excluded_terms`, as the generous reading, not a conservative
one. `SourceRef.confidence` on both derived limits is `"inferred"` (SOP Step
5b: derived from something traced, with the derivation written out), never
`"traced"` — worth getting right the first time, since `"traced"` on a number
neither cited requirement states outright would be exactly this repo's one
rule getting quietly bent.

**A `c_status` mix worth flagging on its own**: S461-241 is `draft`;
S461-516/637 is `validated`. A derived value resting on one draft and one
validated figure is *itself* only as solid as its weakest input — named in
`excluded_terms` on every check that uses it, not implied by citing both
`source_ref`s and hoping a reader notices the mismatch.

## The combined unresolved-identity list

**Unchanged — this session adds zero new rows** to
`WORKSHEET_endstop_vision_baseline.md` §9. That list is specifically for the
`candidate` outcome (a real callout is in reach but its feature identity is
not established); the new `gas_spring_mechanical_stroke` edge has **no
callout in reach at all** — a plain "does not exist in this repo's pile" gap,
the shape §9's own closing paragraph explicitly excludes ("edges whose value
is a genuine absence or not a drawing quantity at all"). Checked and ruled
out, not merely unconsidered, against three specific candidates: S461-516/637
(nominal only, no band), S461-613/663 (force tolerances, wrong quantity),
and this worksheet's own row 63 (a radial bushing clearance, wrong axis).
§9's five rows from `endstop_location_stack` stand exactly as that session
left them.

## A green suite before `git add` is not the suite the reviewer gets

`tests/test_provenance.py`'s byte-identity scanner (`claim_inventory()`) reads
`git ls-files`, which only sees **tracked** files. This session's new study
JSON was untracked when the full suite first ran green, so its own
"byte-identical duplicate" phrase was invisible to the scanner — it only
surfaced as a failure *after* `git add`/`git commit` made the file trackable.
Re-ran the full suite after staging and after committing, not just after
writing; a new untracked file's own content can hide a real failure from a
pre-commit green run. Fixed by rewording the claim in that file's `note`
(dropping the bare phrase, adding an explicit pointer to the test that
verifies it) rather than weakening what is actually checked.

## Verification

- `C:\workspace\tolstack\venv-win\Scripts\python.exe -m pytest -q`: **623
  passed, 1 skipped** (the pre-existing node-fs viewer skip). Ran the full
  suite, not just `test_topology.py`, after the connectivity failure above —
  see that section for why this matters.
- All three new/appended checks' margins hand-verified against
  `check_study()`'s own output before being pinned in the test (not the other
  way around): `s461_617_margin_at_minus7` → `4.0 - 1.091240625` interval;
  `_at_plus72` → `4.0 - 0.816796875`; `s461_617_margin_gas_spring_stroke` →
  `3.289067 - 0.10`.
- The two live-pull-dependent new tests **ran** (did not skip) in this main
  checkout, confirming the requirements pull is present here and every new
  citation's quoted text matches it exactly.
- No `ARCHITECTURE.md` module-inventory row needed — no new Python module or
  function, only new JSON documents and a `checks` list entry the existing
  `check_study()` already reads.

## Drawing-checker read-only invariant

No file under `C:\workspace\drawing-checker\data\` was opened this session —
no PDF, no rendered crop. Every citation this session used was already on
record in `topology_pitch_system.json` and this worksheet; the only new
artifact read was `data/inbox/requirements/S461_equipmentrequirements_20260906.json`,
which lives in this repo, not in drawing-checker's tree. Per SOP Step 0's own
phrasing ("snapshot drawing-checker, before you read a single drawing"), a
snapshot brackets an interaction — with none, none was taken, and the
worksheet's §10e says so in the same words for a reader who lands there first.
