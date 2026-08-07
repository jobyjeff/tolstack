# LESSONS — `viewer_generated_checks` (2026-08-06)

Closed `ISSUE_20260806_viewer_does_not_render_generated_checks.md`: both
`thermal_fit` stacks now reach the review surface with their 16 generated checks,
every weighted term printing its weight, and the worksheet that covers them both
resolved. What follows is only what the code and git history do not already say.

## 1. What the projection schema now guarantees about coefficients

Three guarantees, in the order they matter:

1. **Every term row carries a `coefficient`, always** — `element_terms` is
   `{element_id, sign, coefficient}` for paths and checks, authored and generated
   alike. `1.0` for every previously authored stack (a grip stack has no weighted
   term), so nothing about them reads differently; the field is not optional and
   the viewer never has to guess whether a missing key means one.
2. **`sign` still carries direction alone.** `Term.coefficient` is a positive
   magnitude and the projection does not multiply them together — the pair reads
   `sign × coefficient`, exactly as `Term.weight` does. A reviewer reading signs
   term by term keeps reading one field, and a weight can never hide a sign flip.
3. **The coefficient is rounded for display, in Python, to 9 dp**
   (`COEFFICIENT_DECIMALS`), for the same reason intervals are rounded to 6:
   `String(n)` in the browser must never be a rounding decision. 9 is not
   arbitrary — every weight this archetype generates is a small integer times
   `1 + ΔT·α`, whose exact decimal expansion terminates inside 9 places for every
   CTE in `materials.json`, so the rounding removes binary noise
   (`1 − 0.8 = 0.19999999999999996`) without touching a digit anyone authored. It
   also matches the `%.9f` column of `debug_report_thermal_fit.py --terms`, which
   is what makes §2's comparison a digit-for-digit one. **The fold always used the
   unrounded weight**; at 1e-9 relative that is far inside the 6 dp of the
   intervals printed beside it, so a reviewer recomputing from the displayed
   weights lands on the displayed numbers.

The rule for the next archetype, stated as the handoff asked:

> **Generated checks are produced in Python by the archetype's own loader, once,
> at projection build time. The viewer never re-derives them — not the checks,
> not the coefficients, not a soak factor.** The dispatch is one dict
> (`ARCHETYPE_LOADERS` in `scripts/build_viewer_projection.py`): add
> `"<archetype>": <its loader>` and the surface renders it. Until that entry
> exists the stack projects zero checks and the viewer says *that*, loudly,
> rather than "no checks" — the honesty guard `review/stack_viewer_v0` built has
> been narrowed to exactly this case, not deleted.

And the reason the handoff's ordering was right: a dispatch-only fix would have
put `+ sleeve_wall` on the page for a term weighted `2k·f_s`. That is not a
missing feature, it is a **wrong term list on the surface whose only job is
letting a reviewer read every sign** — and the overlay already tells reviewers
they cannot verify a thermal stack's signs from the JSON. Coefficients first.

## 2. The evidence: rendered terms vs `debug_report_thermal_fit.py --terms`

**104 of 104 terms identical** across both stacks (52 each) — check id, element,
sign and coefficient. Run for this lesson and then **pinned as a test**
(`test_the_projected_terms_are_the_report_that_reviews_them_term_for_term`), so it
cannot quietly stop being true; the one-off script is not the artefact, the test
is. Sample rows, `hub_bearing_thermal_fit_m1`, lower seat, hot corner:

| check | report: element / sign / coefficient (`%.9f`) | viewer chip (`VA.termLabel`) | equal |
|---|---|---|---|
| `lower_seat__hub_to_sleeve__hot` | `sleeve_bore_lower` / +1 / 1.000535600 | `+ 1.0005356 × sleeve_bore_lower` | yes |
| `lower_seat__hub_to_sleeve__hot` | `sleeve_wall_lower` / +1 / 2.001071200 | `+ 2.0010712 × sleeve_wall_lower` | yes |
| `lower_seat__hub_to_sleeve__hot` | `hub_bore_lower` / −1 / 1.001198080 | `− 1.00119808 × hub_bore_lower` | yes |
| `lower_seat__sleeve_to_bearing__hot` | `bearing_od_lower` / +1 / 1.000618800 | `+ 1.0006188 × bearing_od_lower` | yes |
| `lower_seat__sleeve_to_bearing__hot` | `sleeve_wall_lower` / +1 / 1.600856960 | `+ 1.60085696 × sleeve_wall_lower` | yes |
| `lower_seat__sleeve_to_bearing__hot` | `hub_bore_lower` / −1 / 0.800958464 | `− 0.800958464 × hub_bore_lower` | yes |
| `lower_seat__sleeve_to_bearing__hot` | `sleeve_bore_lower` / −1 / 0.200107120 | `− 0.20010712 × sleeve_bore_lower` | yes |
| `lower_seat__sleeve_to_bearing__hot__k1` | `bearing_od_lower` / +1 / 1.000618800 | `+ 1.0006188 × bearing_od_lower` | yes |
| `lower_seat__sleeve_to_bearing__hot__k1` | `sleeve_wall_lower` / +1 / 2.001071200 | `+ 2.0010712 × sleeve_wall_lower` | yes |
| `lower_seat__sleeve_to_bearing__hot__k1` | `hub_bore_lower` / −1 / 1.001198080 | `− 1.00119808 × hub_bore_lower` | yes |

The formatting differs and the numbers do not: the report pads to nine places,
the chip prints `String(n)` of the rounded float. That difference is the point —
the browser is not choosing a format, it is printing what Python decided.

Rebuild output (main checkout, the DoD's command):

```
  hub_bearing_thermal_fit_m1          8 elements (4T/2I/2U), 0 paths, 16 checks GENERATED from `thermal_fit`, 4 SENSITIVITY
  hub_bearing_thermal_fit_m2          8 elements (8T/0I/0U), 0 paths, 16 checks GENERATED from `thermal_fit`, 4 SENSITIVITY
  pitch_link_to_pitch_plate           6 elements (4T/2I/0U), 3 paths, 2 checks, 2 INCOMPLETE, 2 zero-width
  tan_link_to_pitch_plate            11 elements (2T/3I/6U), 3 paths, 6 checks
  tan_link_to_pitch_plate_take2       9 elements (0T/2I/7U), 1 paths, 1 checks, NO WORKSHEET
  vpa_output_to_pitch_plate           6 elements (1T/2I/3U), 1 paths, 1 checks
```

Compare the two thermal lines with the issue's: `0 checks, NO WORKSHEET`.

> **Corrected during `review/viewer_generated_checks`.** The `vpa_output` line was
> pasted as `(2T/1I/3U)`, which was true of this branch's tree and **is not true
> of the merged one**: `traced_labels_and_ratio` landed on `master` after this
> branch last merged it and downgraded `under_head_chamfer_washer` from `traced`
> to `inferred`. The transcript above is the reviewer's rebuild on
> `master + this branch`, which is the tree that ships. The recurring-bugs class
> is "stale inventory numbers", and the traced count is the one that must never
> be quoted stale — re-derive it with
> `tests\debug_report_tolerance_stacks.py --ratio`, never from a pasted build log.

### No-regression evidence for the four authored stacks

I diffed the whole projection against the one the pre-change script produces
(`git show aa708a3:scripts/build_viewer_projection.py`), key by key. For all four
authored stacks **every difference is an ADDED key — not one existing value
changed**:

```
.checks[i].element_terms[i].coefficient : ADDED 1.0
.paths[i].element_terms[i].coefficient  : ADDED 1.0
.checks[i].generated                    : ADDED false
.checks[i].sensitivity                  : ADDED false
.checks_source                          : ADDED "authored"
.worksheet_source                        : ADDED "by_name"
.elements[i].material                   : ADDED null
.materials                              : ADDED []
```

The thermal stacks' three *changed* values are the defect being fixed:
`checks` 0 → 16, `checks_generated_not_rendered` True → False, `worksheet_file`
null → the shared sheet. Worth keeping this diff trick in mind: it is a cheap,
total answer to "did I regress the other stacks" that no test enumerates.

## 3. Deliverable 5 needed no schema invention — the field was already there

The handoff asked me to "add an explicit optional `worksheet` field in the stack
file". Both thermal stacks **already carried** `provenance.worksheet:
"docs/tolerance_stacks/WORKSHEET_hub_bearing_thermal_fit.md"` — authored by
`hub_bearing_thermal_stack`, repo-relative, and read by nothing. So the fix was to
honour the authors' own field rather than invent a second one, and **no stack JSON
was touched** (which also keeps this branch clear of the parallel
`traced_labels_and_ratio`, live in `active/` while I worked; its scope is the three
slice-1 JSONs, mine was `scripts/` + `apps/viewer/`, and we do not overlap).

Two decisions inside it:

- **A declared worksheet that does not exist raises**, rather than falling back to
  the name or reporting absence. The author asserted the file exists; a
  fall-through would render "no worksheet" while the JSON says there is one, which
  is the same class of quiet lie this whole handoff is about.
- **Resolution is `<stack's own dir>` then `<repo root>`, never the cwd.** Taken
  straight from `review/citation_export_provenance`'s blocker: a cwd-dependent
  path in `build_viewer_crops.export_pdf_path` passed in a worktree and failed in
  the main checkout. Any new path resolution in this repo should be read against
  that lesson before it is written.

## 4. Deliverable 4 (materials / CTE): done, and it is not a nice-to-have

The handoff left this as "evaluate". I built it, because writing deliverable 1
made the case: the surface now prints `+ 2.0010712 × sleeve_wall_lower`, and
without the CTE table that number is unauditable — a reader cannot get from
`2` (diametral) and `1 + ΔT·α` to `2.0010712` without α. With the table plus the
card's `temperature_c` chip they can, in one line, by hand.

It also fixes an omission worth naming: **a thermal fit's answer is a CTE
*difference*, and not one CTE reached this surface.** The elements table showed
four diameters; the mechanism (aluminium growing about twice as fast as the
sleeve) was invisible. The table carries each `materials.json` entry verbatim
beside derived sourcing chips, in the same colour language as the elements table —
which means the honest, loud result that **all three CTE rows render `UNTRACED`**,
and the bearing steel's designation renders `NO CITATION`. `values_source` and
`designation_source` stay separate chips because the material's *name* and its
*number* have different provenance and `materials.json` keeps them apart on
purpose.

What I did **not** do: put material or CTE columns in the elements table. The
columns are shared by all six stacks and four of them have no material, and
"render exactly as before" was a DoD item. Each element gets a material chip in
its sourcing cell instead.

## 5. Two other judgement calls the handoff left open

- **The coefficient is rendered as a number, not as `2k`.** The handoff offered
  "`+ 2k × sleeve_wall`, or at minimum the numeric weight". An algebraic label
  would have to be authored in `thermal.py` beside the computed weight — a second,
  human-written statement of a number the archetype exists to compute, which is
  the exact shape of the thing `load_thermal_fit_stack()` *refuses* when it
  rejects a hand-written check. So the chip prints the weight, its `title`
  explains generically what a coefficient can be (diametral 2 / soak / stiffness
  split), and the algebra lives where it is verified: the check's own `guidance`,
  `ARCHETYPE_thermal_fit.md`, and the worksheet. If a future reader wants the
  symbols on the chip, the honest way is for the loader to *derive* the label from
  the same factors it multiplies, not to write it twice.
- **`[SENSITIVITY]` probes are rendered as not-results.** Not in the handoff, but
  dispatching on the archetype put four `k = 0` / `k = 1` cards per stack on the
  page whose own guidance opens "NOT A RESULT", and eight of the 32 cards a
  reviewer now sees are probes. An amber `NOT A RESULT` chip, a dashed recessed
  card, and a count in the header chips. The flag is read from
  `configuration.sensitivity` — a **structured** field, unlike the `INCOMPLETE`
  prose convention (`ISSUE_20260805_check_result_has_no_complete_flag.md` is still
  the fix for that one).

## 6. Verification, including what I did not verify

- `pytest -q`: **279 passed, 1 skipped** on this branch (the skip is the JS
  suite's node-fs tier, which has no projection in a worktree —
  `test_viewer_js_suite.py` skips loudly and says so). **On the merged tree
  (`master` + this branch) it is 290 passed, 1 skipped** — measured during
  `review/viewer_generated_checks`, and the figure that describes what ships.
  The gap is not this branch's: `master` gained five commits
  (`traced_labels_and_ratio`, +11 tests) after this branch last merged it, so
  the DoD's `git log --oneline HEAD..master` was empty when it was run and was
  no longer empty an hour later. That is the "a sibling handoff landed on
  `master` while you were reviewing" item firing again — the check has to be the
  *reviewer's* last act, not the author's.
- JS fast tier: **59/59** in the worktree; **75/75** with
  `--repo C:\workspace\tolstack`, i.e. including the 7 new `[real]` tests that
  render the actual thermal stacks (16 cards, 46 of 52 terms weighted, 4 probes, 3
  untraced CTE rows, both worksheets resolved, and **zero** weighted chips on any
  authored stack).
- Browser truth tier: **4/4**, `59/59` in a real Chrome 150 over both `file://`
  and `http`. Worth running (`npm install` took 2 s, one package) — the fast
  tier's DOM shim supports only `tag` / `.class` / `tag.class` selectors, so
  three of my first-draft tests failed on descendant selectors that a browser
  would have accepted. The reverse of the drift `stack_viewer_v0` recorded, and the
  same cure: keep every test query in both tiers' intersection.
- `git log --oneline HEAD..master` empty after merging `master` in (true when
  run; see the pytest bullet above for why it did not stay true).

**Not verified:** nobody has looked at the new Materials table or the recessed
sensitivity card in a browser *by eye* — the truth tier asserts the DOM and CSS
load, not that a 6-column table at 520 px of worksheet beside it reads well.
Cheapest check for the next person: `index.html?mock=1` will **not** show it — the
mock tour is still the authored `demoFixture()` stack only. `VA.generatedFixture()`
exists for the tests; wiring a second stack into the mock tour is a small,
genuinely useful follow-up if anyone wants to demo this surface without building a
projection.

## 7. Left to do / watch

- **`checks_generated_not_rendered` is now only reachable for an unknown
  archetype**, and nothing in the repo produces one. Its Python and JS tests
  construct that state synthetically. That is deliberate (the guard should outlive
  `thermal_fit`), but a reader seeing the field in `results.json` will find it
  `false` everywhere and could mistake it for dead weight.
- **`archetype` handling is still two dicts and no registry**, per
  `ARCHETYPE_thermal_fit.md`'s "this is not a framework": `ARCHETYPE_LOADERS`
  here, and the `STAGE_LABELS`/vocabulary inside `thermal.py`. The viewer's
  `CORNER_FIELDS` is only field *labels* (`chain`, `stage`, `temperature`, `k`) —
  every value is the string the archetype wrote — so no archetype vocabulary is
  duplicated in JS. A third archetype is where a registry should appear; if it
  arrives, the one thing to keep is that generation stays in Python.
- **The projection is still not rebuilt by anything automatic** (unchanged from
  `stack_viewer_v0`): the two thermal stacks would render 0 checks again for
  anyone reading a stale `results.json`. The banner prints both build times, which
  is a report, not a fix.
- **`docs/tolerance_stacks/README.md`'s worksheet row** says the thermal worksheet
  "covers both thermal-fit stacks" — still true, and now also true of what the
  viewer shows. No edit needed, but that is the sentence to keep in step if the
  worksheet is ever split.
