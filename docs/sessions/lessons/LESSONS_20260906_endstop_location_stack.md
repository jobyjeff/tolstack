# Lesson — endstop_location_stack (worked 2026-09-06)

Handoff `HANDOFF_20260906_endstop_location_stack.md`, branch
`handoff/endstop_location_stack`, cut from `integration`. Deliverable: the
end-stop-location stack, on the DAG archetype, checked against the pulled S461
requirements (`data/inbox/requirements/S461_equipmentrequirements_20260906.json`,
schema `joby.tolstack/requirements-pull/v0`, 254 rows).

## What changed

- `tolerance_stack/stack.py`: `SOURCE_REF_KINDS` gains `"requirement"` (an item
  pulled from Polarion into `data/inbox/requirements/`), with the same
  comment-driven mapping `spec` got: `document` = the pull artifact's filename,
  `cell` = the requirement id (e.g. `S461-241`), `callout` = its `c_description`
  quoted verbatim after stripping the HTML wrapper, `note` must record
  `c_status`.
- `docs/SOP_TOLERANCE_STACK.md` Step 5b: the `kind` pipe-list and its
  explanatory prose extended to match, keeping
  `test_the_sop_spells_the_same_vocabularies_the_code_enforces` green.
- `tolerance_stack/topology.py`: `Study` gains an optional `checks` field (a
  list of raw spec dicts, field-for-field the same shape
  `StackDefinition.checks` uses, plus `limit` — the external budget a study's
  own total is checked against) and a new `check_study(topology, study,
  check_id) -> CheckResult` function. It folds exactly two terms through the
  one `fold()` — the limit (sign `+1`) and the study's own `StudyResult`
  standing in as a synthetic `Dimension` (sign `-1`) — which is the L1
  grip-check pattern (`grip - clamped_stack`), not a second arithmetic path.
  `complete`/`excluded_terms` are authored, exactly as a stack check's are.
- `docs/topologies/topology_pitch_system.json`: six edges re-cited against
  `WORKSHEET_endstop_vision_baseline.md`'s §3/§8b dispositions instead of the
  founding workbook. Three move to `traced`, one to `inferred`, two gain a real
  drawing citation but **stay** `untraced` because the worksheet scored them
  `candidate` (identity unresolved) — see the per-edge table below. A new
  `provenance.retrace_update_20260906` key records the change; the four
  existing study documents' **numbers are untouched** (none of the six edges
  the DAG_TOPOLOGY.md "do not touch" instruction protects were on this
  session's list, and none of the six touched here changed value in a way that
  would move any of the four studies' totals — checked edge-by-edge, not
  assumed).
- `docs/topologies/study_pitch_system_end_stop_minus7.json` /
  `study_pitch_system_end_stop_plus72.json` — new. Each is
  `study_pitch_system_blade_angle_worst.json` / `_average.json`'s exact
  selection and transform set, re-titled around one of S461-241's two named
  stop angles, with one `checks` entry citing S461-607 (the numeric budget) and
  S461-241 (the operating-point context, folded into nothing — see below).
  Separate documents, not edits, per the handoff's own constraint.
- `docs/DAG_TOPOLOGY.md`: names the two new study files, documents the
  `checks`/`limit` schema addition under "A study, in outline", and adds them
  to "The two committed examples" list.
- `tests/test_topology.py`: the placeholder-honesty test
  (`test_every_placeholder_in_the_pitch_system_says_so`) rewritten from a
  blanket "nothing may claim better than untraced" refusal to a named,
  pinned allowlist (`_RETRACED_CONFIDENCES`) — the founding claim stopped being
  true of the whole document, not of the rule the test exists to enforce. Four
  new tests (§9 of that file) cover `check_study()`'s arithmetic, the shape of
  both new checks' requirement citations, and — when the gitignored pull
  artifact is present (this main checkout; skipped elsewhere) — a value-level
  pairing of the quoted text, `c_status` and id set against the live pull,
  the same skip-if-absent shape `test_tolerance_stack.py`'s traced-ratio
  publisher check already uses for the identical reason.
- `docs/tolerance_stacks/WORKSHEET_endstop_vision_baseline.md`: new §9, the
  unresolved-identity list (deliverable 3), reproduced below.
- This lesson.

No `stack_*.json` touched, `tolerance_stack/stack.py`'s `fold()` untouched
(only its `SOURCE_REF_KINDS` tuple gained a word), no spec-library event
added, `apps/` untouched — all per the handoff's own scope fence.

## Per-edge retrace table (topology_pitch_system.json)

| edge | worksheet row | was | now | value change |
|---|---:|---|---|---|
| `pitch_plate_flange_to_link_hole` | 37 | workbook/untraced | drawing (215735-A)/**traced** | none (0.20mm) |
| `hub_blade_root_seat_position` | 17 | workbook/untraced | drawing (212966-006-A)/**traced** | **0.12mm → 0.10mm**, matching the drawing (F1: the workbook's "diameter MMC" comment is inverted vs. the drawing's LMC modifier) |
| `gas_spring_body_height` | 41 | workbook/untraced | drawing (213668-002)/**traced** | none (0.20mm) |
| `piston_length` | 38 | workbook/untraced | drawing (214700-002-A)/**inferred** | none (0.20mm) — a documented derivation off the owner's own general-tolerance block, not a specific callout |
| `end_stop_clearance` | 39 | workbook/untraced | drawing (214700-002-A)/**still untraced** | none — real candidate callout cited, identity NOT established, not overclaimed |
| `gas_spring_mount_position` | 61 | workbook/untraced | drawing (213668-002)/**still untraced** | none — F7's true-position frame cited, identity NOT established |
| `pitch_link_length`, `tan_link_mount_height`, `hub_top_deck_to_tan_link_mount_seat`, `pitch_plate_flange_to_gas_spring_bushing` | 31/42/45/62 | workbook/untraced | workbook/**still untraced**, note only | none — owner refined one BOM level (§8d), still unacquired |

Topology-internal count (23 dimensioned edges, all non-derived): **3 traced /
1 inferred / 19 untraced** — up from 0/0/23 at founding. The SOP's own
headline ratio (`debug_report_tolerance_stacks.py --ratio`, over `stack_*.json`
files) is **unchanged**: 5/26 seeded, 30/59 all stacks, exactly as the
2026-09-04 retrace lesson recorded — this handoff touched no stack file, so
that number was never going to move, and saying so here is the same discipline
`WORKSHEET_endstop_vision_baseline.md` §8f already applied to itself.

## The unresolved-identity list (deliverable 3)

Lives in full, with per-row reasoning, in
`WORKSHEET_endstop_vision_baseline.md` §9. Reproduced here as the
`{topology_id, edge_id}` pairs `annotation_surface_mvp`'s `feature-identity/v0`
events are expected to bind — the interlock between the two handoffs:

```
{"topology_id": "pitch_system", "edge_id": "end_stop_clearance"}
{"topology_id": "pitch_system", "edge_id": "gas_spring_mount_position"}
{"topology_id": "pitch_system", "edge_id": "blade_root_clocking_to_hub_seat"}
{"topology_id": "pitch_system", "edge_id": "hub_lower_to_top_bearing_flange"}
{"topology_id": "pitch_system", "edge_id": "hub_top_flange_to_top_deck"}
```

`end_stop_clearance` is the sharpest of the five: it is the edge the S461-241
requirement is literally about, a real candidate value is in hand
(`214700-002-A` sheet 2, `5.00 ±0.05`), and this repo still declines to call it
`traced` because nothing on the sheet names the feature an end stop. That is
exactly the gap a feature-identity surface exists to close, and exactly why
neither new study's check can be `complete: true` no matter how many other
gaps get filled.

## Which requirements ended up checkable vs. blocked on gaps

| requirement | c_status | role in this handoff |
|---|---|---|
| S461-241 "End stop" (-7°/+72°) | draft | **context**, not arithmetic — names the operating point each new study represents (`context_ref` in each check spec), but states no numeric band of its own, so it folds into nothing |
| S461-607 "Blade pitch angle variation" (±0.5°) | draft | **the numeric budget both checks use** — a blade-to-blade variation limit, adopted as the closest available acceptance criterion because neither S461-241 nor S461-805 supplies one. Both checks compute a real margin against it and both come back `complete: false` (see excluded_terms in each study file) |
| S461-805 "Blade Pitch Position Accuracy" | draft | **blocked outright** — its own threshold is the literal string `"TBD deg"` in Polarion. No numeric criterion exists to check against; named in both checks' `excluded_terms` rather than silently dropped |
| S461-231 "End stop" (non-jamming) | draft | **not converted into a check** — a qualitative/structural requirement, not a tolerance-stack quantity. Cited nowhere in this handoff's new JSON; recorded here as a deliberate scope decision, not an oversight |
| S461-263 "End stop" (withstand VPA stall torque / impact without rupture) | draft | same as S461-231 — qualitative/structural, out of scope for a variation-band check |

Every one of the five is `c_status: "draft"` — nothing in the endstop-location
family has been validated in Polarion yet, which both new studies' checks say
explicitly in their `limit`/`context_ref` notes, per the handoff's own
instruction to carry `c_status` wherever a requirement is cited.

## Topology-extension decisions the stroke stack (staged next, same files) must respect

The mechanical-stroke stack is a separate, not-yet-started handoff sharing
`docs/topologies/topology_pitch_system.json`. What this session decided, for
that session to inherit rather than re-decide:

1. **A new operating-point study is a new document, never an edit of an
   existing study's numbers.** The two end-stop studies duplicate
   `blade_angle_worst`/`_average`'s selection and transform maps rather than
   parametrising them, because the handoff's own baseline forbids touching
   those four files' numbers. If the stroke stack needs a third operating
   condition over the same chain, the same pattern applies: a new
   `study_pitch_system_<condition>.json`, not a fourth transform column bolted
   onto an existing file.
2. **`Study.checks` is now real schema, not a one-off.** A requirement-cited
   margin check is `check_study(topology, study, check_id)` over an authored
   `checks` entry — reusable as-is for any future stroke requirement that
   reduces to "does this chain's accumulated variation fit inside a published
   limit."
3. **`SourceRef.kind: "requirement"` is now real vocabulary**, not scoped to
   the end-stop family. Any Polarion-sourced numeric or contextual citation the
   stroke work needs should use it rather than inventing a second shape.
4. **The sensitivity-condition mismatch is not resolved, only named.** Neither
   new study's borrowed transform (`pitch_arm_linear_to_rotary` at "-5 deg
   worst case", or its full-sweep-average sibling) is characterised at -7° or
   +72°. If the stroke stack needs a sensitivity at a THIRD condition (a
   specific stroke position), the same absence will recur, and the honest move
   is the one taken here: use the closest available constant, name the gap in
   `excluded_terms`, and do not fold across the mismatch silently.
5. **Six edges are now genuinely `traced`/`inferred`.** Do not "helpfully"
   revert them to `workbook`/`untraced` to make a future diff smaller — they
   are real citations against drawings already in the pipeline, verified this
   session (§ below), and reverting them would be a regression the
   `_RETRACED_CONFIDENCES` allowlist test would (correctly) refuse to let pass
   silently — it would just need the allowlist edited down, which is the
   point of naming it.

## `requirements-pull/v0` artifact shortcomings the eventual Polarion-sync stream should fix

Found by actually building citations against this pull, not by reading its
schema in the abstract:

1. **No structured numeric threshold field.** S461-241's "-7° and +72°" and
   S461-607's "±0.5 degrees" are English prose inside `c_description`, not a
   parseable value/unit pair. Every number this handoff cited was read out of a
   sentence by a human/agent, exactly the "plausible digits, wrong number"
   risk this repo's one rule exists to catch — except here the risk is
   mis-*parsing* prose, not inventing a value. A real sync stream should
   capture whatever structured field Polarion has for a numeric limit, if one
   exists, rather than leaving every consumer to regex a sentence.
2. **"TBD" is smuggled into a text field as the literal string "TBD deg"**
   (S461-805), not represented as an absent/null threshold. A consumer has to
   string-match "TBD" to know a requirement is unquantified rather than
   checking a structured flag — fragile, and this session's own `excluded_terms`
   now depend on that exact string not changing case or wording upstream.
3. **No requirement-to-requirement grouping.** Five rows (`S461-231/241/263/805`
   plus `S461-607`) are all, functionally, "the end-stop-location family," and
   the only way to find that is to notice four of them share the title "End
   stop" and a fifth is topically related. A hazard/feature grouping field
   would make this handoff's own manual triage (which is precisely what
   produced the "checkable vs. blocked" table above) mechanical instead of
   read-by-eye.
4. **No verification-method field.** Nothing in the pull says whether S461-607
   is meant to be closed by analysis (a tolerance stack, this repo's whole
   business), test, or inspection — a tolerance-stack check silently assumes
   "analysis" for every requirement it touches, and that assumption is nowhere
   recorded as a citable fact.
5. **The degree symbol in the source text is "º" (masculine ordinal
   indicator, U+00BA), not "°" (degree sign, U+00B0).** Copied verbatim per
   this handoff's own rule (quote what the source says), but worth flagging
   before anything downstream tries to match on the "real" degree sign and
   silently misses every end-stop requirement in this pull.

## Mismatch findings carried forward, plus one new

Per the handoff's deliverable 4. None of F4/F5/F9/F10 are resolved here — they
stay **Jeff questions**, exactly as the 2026-09-01/2026-09-04 sessions left
them:

- **F4** — one `⌖⌀0.2 A B C` callout serves stack rows 32/37/48; rows 32 and 37
  are both vertical and both 0.20mm, and whether that is a deliberate second
  contributor or one tolerance counted twice is unresolved.
- **F5** — row 51 (tangential link position, pitch plate) disagrees with
  `215735-A`: workbook 0.15mm vs. the drawing's 0.20mm.
- **F9** — the pitch-arm link hole (`215071-C`) is 0.020mm total vs. the
  workbook's 0.01mm, a plausible ±-vs-total-width transcription slip.
- **F10** — NAS1154's shank-diameter column was adopted over its numerically
  closer gage-diameter column on functional grounds, not value proximity;
  recorded so the rejected alternative stays visible.
- **F11 — new this session** (worksheet §9 addendum): neither new study's
  borrowed sensitivity condition ("-5 deg worst case" or "full sweep average")
  is characterised at S461-241's actual -7°/+72° stop angles. This is the
  finding that, by itself, would force both new checks' `complete: false`
  even if every acquisition gap in `ISSUE_20260906_endstop_piece_part_acquisition.md`
  were closed tomorrow — it needs Jeff or CAD, not another drawing.

See `ISSUE_20260906_endstop_piece_part_acquisition.md` for the filed
acquisition todo (four piece parts, two MS spherical-bearing specs) — the
gap list this handoff's deliverable 4 asks for.

## Verification

- `C:\workspace\tolstack\venv-win\Scripts\python.exe -m pytest -q`: **612
  passed, 1 skipped** (the pre-existing node-fs viewer skip). Includes the new
  value-level pairing test against the live pull artifact, which **ran** (not
  skipped) in this main checkout.
- `tests\debug_report_tolerance_stacks.py --ratio`: unchanged, 5/26 seeded,
  30/59 all stacks (see above for why).
- No `ARCHITECTURE.md` module-inventory row needed — no new file, only new
  functions/fields on the existing `topology.py` module and new data files.

## Drawing-checker read-only invariant

This session did not open a new PDF; it re-cited four already-read drawings
(`215735-A.pdf`, `212966-006-A.pdf`, `213668-002 A.1 MOUNT, GAS SPRING,
PROPELLER.pdf`, `214700-002-A.pdf`) against findings already on record in
`WORKSHEET_endstop_vision_baseline.md` §3/§8, and computed their sha256 hashes
directly (`sha256sum`, a read-only operation) to fill in each citation's
`export` block — the SOP's requirement that every `drawing` citation carry an
established export.

- **Before:** no snapshot was taken at this session's own start (a process
  gap, named rather than hidden). The best available baseline is the
  2026-09-04 retrace session's own closing snapshot: **5767** entries,
  `2026-09-05T01:58:10Z`.
- **After**, `scripts/snapshot_drawing_checker.py take`, this session: **5767**
  entries, `2026-09-06T21:09:42Z`.
- The counts match exactly, which is consistent with (not a rigorous proof of)
  an empty diff — no stored JSON from the 2026-09-04 session survived into
  this one's scratchpad to `diff` against directly. Given the only operations
  this session performed against drawing-checker's tree were `sha256sum` reads
  of four already-catalogued files, the risk this represents an undetected
  write is low, but the next session touching this repo should take a
  snapshot at its own start rather than rely on this reasoning a second time.
