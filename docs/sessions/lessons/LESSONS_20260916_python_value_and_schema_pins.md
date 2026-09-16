# LESSONS 2026-09-16 — `python_value_and_schema_pins`

Four values the Python tier published and did not pin: a verdict domain, a
margin, a register schema, and a run id living in prose. All four landed. Six
mutations planted, all six reddened, all six reverted.

> **Correction, `review/python_value_and_schema_pins`, 2026-09-16 — two counts
> in this lesson, neither of which changes a result.**
>
> * **Seven plants, not six.** The sentence above and the heading *"The six
>   mutation plants"* both undercount the section they introduce: it documents
>   **A, B, C, D, E, F and G**, and D is itself two rounds (D1 schema-only, D2
>   schema + key rename). All of them were re-run independently in review and
>   every guard reddened as recorded; only the tally is wrong. The handoff's bar
>   was "four minimum, five counting deliverable 1's second one," so the real
>   number clears it by more than the stated one did.
> * **Four stale figures, not three.** *"Three of this handoff's four quoted
>   figures were stale"* contradicts the table below it, which lists four rows
>   and opens *"Four figures … none correct now."* Four is right; what is true of
>   only three of them is the clause that follows — the baseline went stale
>   because `integration` moved under a batch merge, not because it was quoted
>   forward out of an issue.
>
> Everything else in this lesson was re-derived in review and holds: the
> baseline (`1 failed, 1162 passed, 1 skipped`), the final
> (`1 failed, 1172 passed, 1 skipped`, +10), the 37 authored criteria
> (19 + 18, all `">= 0"`), the 104 / 53 gap rows, both PDF `sha256` values and
> all four run `ts` values against drawing-checker's own `run_meta.json`.

---

## The baseline the handoff states is not the baseline that exists

The handoff says **1155 passed**, green, from `master` after the 2026-09-16
batch merge. On `handoff/python_value_and_schema_pins`, cut from `integration`,
a clean tree measures:

```
1 failed, 1162 passed, 1 skipped in 41.91s
FAILED tests/test_tolerance_stack.py::test_no_live_document_states_an_unguarded_hardware_entry_count
```

**The tree is red before this session touches it**, and the failure is not
mine to fix: the count guard's `other\s+(\d)\s+do\s+not` shape matches the
phrase *"for a reason the other three do not have"* in
`docs/strategy/BRIEF_20260915_origin_posture_and_absent_feature_rule.md:152`,
which is not a hardware-entry count and never was. Already filed **twice**, by
two different 2026-09-15/16 sessions:
`ISSUE_20260916_hardware_count_guard_matches_other_three_do_not_in_unrelated_prose.md`
and `..._matches_the_other_three_in_unrelated_prose.md`. I filed nothing new.

**Final: 1 failed, 1172 passed, 1 skipped.** Delta **+10 passing** over the
true baseline, all ten new. (Against the handoff's stated 1155 the delta reads
+17, which is an artifact of the stale baseline, not of this session.)

Next agent: **measure your own baseline before you believe a handoff's
number.** Three of this handoff's four quoted figures were stale by one or two
sessions, and each one was written in good faith on the day the issue was filed
(see below). They are not errors in the handoff so much as a demonstration that
a number copied out of an issue ages at the speed of `integration`.

---

## The six mutation plants, verbatim

Every guard below was watched failing and then watched passing again.

### Plant A — a fourth verdict (deliverable 1)

`tolerance_stack/stack.py`, `CheckResult.verdict`: `return "marginal"` →
`return "borderline"`.

```
>           assert got.verdict in VERDICTS, f"{why}: {got.verdict!r} is outside VERDICTS"
E           AssertionError: nominal satisfies it, worst case does not: 'borderline' is outside VERDICTS
E           assert 'borderline' in ('pass', 'marginal', 'fail')
```

`test_every_verdict_a_check_can_reach_is_a_member_of_the_vocabulary`. Also
reddened `test_threads_in_bore_13_matches_workbook` and
`test_a_marginal_checks_margin_is_negative_even_though_nominal_passes`
(4 failed, 150 passed in that module).

### Plant B — rename a member of `VERDICTS` (deliverable 1, second plant)

`VERDICTS = ("pass", "marginal", "fail")` → `("pass", "marginal", "failed")`.

```
>           assert got.verdict in VERDICTS, f"{why}: {got.verdict!r} is outside VERDICTS"
E           AssertionError: nominal does not satisfy it either: 'fail' is outside VERDICTS
E           assert 'fail' in ('pass', 'marginal', 'failed')
```

Repo-wide: `4 failed, 1164 passed, 1 skipped`, the other two being
`test_js_python_vocabulary.py::test_the_js_status_table_spells_exactly_what_python_enumerates[VERDICTS]`
and the provenance amendment guard (which fires on any uncommitted edit to an
imported file — see below).

**The result the handoff asked me to report specifically.** The two
imported-constant sites do move with the tuple, but **neither of them fails on
this plant**, and that is worth knowing rather than glossing. Both
`test_an_incomplete_check_is_budget_scoped_...` and
`test_the_check_result_dict_carries_the_field_and_the_derived_scope` construct
a check whose interval lands on `pass`, so `"pass" in ("pass","marginal","failed")`
is still true. Converting a literal to a constant made those two lines *honest*
— they now say what they meant — but it did not give them bite. **The bite is
entirely in the new enumeration test**, because it is the only thing that
reaches all three branches. A membership assertion over one sample is a
one-word domain check no matter which tuple it reads from.

### Plant C — `margin` reads the permissive corner (deliverable 2)

`return self.interval.min - 0.0` → `return self.interval.max - 0.0`.

```
>           assert got.margin == pytest.approx(got.interval.min, abs=TOL)
E           assert 1.3279999999999998 == 0.10980000000000101 ± 1.0e-06

>       assert got.margin == pytest.approx(-0.5, abs=TOL)
E       assert 1.5 == -0.5 ± 1.0e-06
```

Repo-wide: `5 failed, 1163 passed, 1 skipped`.

### Plant D — the live hardware register re-schema'd (deliverable 3)

Two rounds, and the second is the one that shows the defect.

**D1**, `schema` changed only → the CLI now raises:

```
ValueError: ...\docs\tolerance_stacks\hardware_entries.json: expected schema
'joby.tolerance_stack/hardware_entry/v0', got 'joby.tolerance_stack/hardware_register/v1'
```

But with the guard bypassed, D1 still projected **104 gaps, 53
`hardware_entry`** — unchanged. **The issue's framing overstates what a bare
schema change costs**: `entries` was still `entries`, so the old code read it
fine and the panel was correct. A schema string nobody checks is only dangerous
in company.

**D2**, `schema` changed **and** the list key renamed `entries` →
`hardware_entries` — i.e. an actual re-schema rather than a relabel. Guard
bypassed:

```
PRE-FIX, register re-schemad + key renamed:
  total gaps 51 Counter({'unverified_value': 27, 'excluded_from_model': 23, 'no_tolerance_recorded': 1})
```

**104 → 51, and every `hardware_entry` row gone**, silently, on a panel where
an empty list is a positive claim that nothing is missing. With the guard in,
the same file raises. That is the defect, demonstrated.

### Plant E — remove the new raise (deliverable 3's guard)

```
>           with pytest.raises(ValueError, match="expected schema"):
E           Failed: DID NOT RAISE ValueError
```

### Plant F — postdate the joint-level run (deliverable 4)

`joint.assembly_export_ref`'s `ts` for `20260804_114000`, `18:40:27Z` →
`23:40:27Z`, one hour after `d6829f2`:

```
>           assert run_id in _RUNS_CLEARED_WITHOUT_A_TIMESTAMP, (
E           AssertionError: run 20260804_114000 (2026-08-04T23:40:27.959980+00:00) postdates
E           the session's first commit and no reason is recorded for citing it anyway --
E           it may be this repo's own write into a read-only dependency
```

**This is the half of the invariant the 2026-09-15 re-citation lost, firing
again**, which was the deliverable's whole point.

### Plant G — postdate the pre-root run (unasked, and it earns its place)

`20260803_145243`'s `ts` moved past tolstack's root commit `e7bd996`:

```
>       assert set(pre_root) == {"20260723_163810", "20260727_153847",
E       AssertionError: assert {'20260723_16...60730_132230'} == {'20260723_16...60803_145243'}
E         Extra items in the right set:
E         '20260803_145243'
```

`test_the_strongest_read_only_claim_still_has_a_subject`. Worth doing because
the strongest form of the invariant — *a cited run existed before this repo
did* — **came back to the pitch-link stack** as a side effect of deliverable 4:
`20260803_145243` ran 72 minutes before `e7bd996` and had been in this repo's
citations since founding, invisible only because the walk stopped at element
level.

---

## Where the handoff's premises were stale, and what that changes

Four figures, all correct when their issue was filed, none correct now. I
pinned what is true today in every case.

| Handoff says | Actually | Where it went |
|---|---|---|
| baseline **1155 passed**, green | **1162 passed, 1 failed** | `integration` moved; the failure is pre-existing and twice-filed |
| pitch-link budget margin **-8.1939** | **+0.1098** | `stack_fable_audit` (2026-09-15) completed the clamped column and flipped the check to a thin joint-scoped `pass`; `apps/viewer/tests.js:7112` records the whole chain `-8.1939` → `-8.428` → `+0.1098` |
| **no test in `tests/` asserts a `margin` value** | one does, since 2026-09-15 | `d377e62` added `assert got.margin == pytest.approx(0.1098, abs=TOL)` to `test_pitch_link_shank_out_is_complete_and_passes_thinly`. It reddened on plant C too |
| projection carries **98 gaps, 43 `hardware_entry`** | **104 / 53** | the same audit |

The margin one is the one to notice. Deliverable 2's issue was filed against a
tree where nothing pinned a margin; by the time the handoff was written that was
no longer true, and a session that took the premise at face value would have
added a duplicate of an existing assertion and called it a fix. What this
session added on top of `d377e62` and what each is for:

* `margin == interval.min` **as an identity**, not just as a number that happens
  to match — the existing test pins `0.1098` twice (once as `interval.min`, once
  as `margin`) but never says they are the same rule;
* the **cotter-hole** check, so the pin is not a single sample;
* the **sign** case. Both live pitch-link checks pass, so both corners are
  positive and plant C moved a number without moving a sign. The constructed
  `marginal` check (min `-0.5`, max `+1.5`) is the only place in the suite where
  reading the wrong corner turns a shortfall into slack, which is the failure a
  reader acts on;
* the **`NotImplementedError` gate**, which had no test at all, on *both*
  properties.

---

## Deliverable 4: the additive shape held. `joint` does not need a dataclass.

The handoff labelled the additive shape a suggestion and asked for a
feasibility verdict. **It held, cleanly, and a `joint` dataclass would have been
the wrong trade.**

What shipped:

* `JOINT_EXPORT_KEY = "assembly_export_ref"` and
  `JOINT_EXPORT_PROSE_KEY = "assembly_export"` — module constants, so the loader
  and the pairing test read one definition;
* `StackDefinition.__post_init__` inflates the block through the existing
  `SourceExport.from_dict` and raises on a malformed one, so validation happens
  at **load**, the same moment an element-level export is validated;
* `StackDefinition.assembly_export_ref -> Optional[SourceExport]`.

Total: ~35 lines in `stack.py`, plus 40 inserted lines across four JSON files.

**Why a `Joint` dataclass would have cost more than it bought.** The seven
stacks' `joint` blocks share almost nothing: `assembly` vs `assembly_drawing`;
`question` and `why_this_stack_exists` on the thermal pair only; `scope`,
`zone`, `zone_note`, `places`, `parts`, `identification_note`, `out_of_scope`
scattered across the rest. A dataclass would have to enumerate that union —
roughly fifteen optional fields — and the three stacks with no `assembly_export`
key would each gain a declaration that they have no export, which is exactly the
claim the absent-key state exists to avoid making. The cost falls hardest on the
stacks that need changing least. `joint` stays a dict; **one** key inside it is
typed, which is the key anything reads.

**Three states, and the third is absent, not a sentinel.** Pinned by name in
`test_the_three_states_of_a_joint_export_are_all_live_and_all_distinct`:

| state | stacks |
|---|---|
| `established` | `pitch_link_to_pitch_plate`, `rotor_fastener_length` |
| `unestablished` + `why` | both `hub_bearing_thermal_fit` stacks |
| key absent | `tan_link_to_pitch_plate`, `_take2`, `vpa_output_to_pitch_plate` |

`unestablished` means *somebody looked and could not establish it*. The three
absent ones never asked the question. Writing `unestablished` for them would
have been inventing a search that never happened — the one rule of this repo,
applied to a field about citation rather than to a value.

### Nothing was invented, and here is the audit trail

The AUG-3 export needed a `sha256` and two `ts` values that are cited nowhere
element-level any more. They were **recovered, then re-verified**:

1. `git show 02e5077^:docs/tolerance_stacks/stack_pitch_link_to_pitch_plate.json`
   — the block as `citation_export_provenance` established it on 2026-08-06,
   before `pitch_link_known_bands` removed it;
2. re-hashed the actual file in drawing-checker's inbox on 2026-09-16:
   `c6381f204582dc7a87d25664855bbc547b619226997e9fa62697b6d6ea4294d8` — matches;
3. and independently, `washer_nas1149v0332`'s own `note` **in the same stack
   file** already quotes that sha256 in prose.

The AUG-19 block was copied from the live `washer_ms21299c3` element-level
citation in the same stack and its sha re-hashed the same way
(`789efa19...`, matches). Both PDFs are present at
`C:/workspace/drawing-checker/data/inbox/drawings/`.

### Two mechanical notes for whoever edits these JSON files next

* **Do not round-trip a stack through `json.dumps(..., indent=2)`.** All seven
  files differ from their own re-serialisation — they are hand-authored
  documents with inline-array formatting. The migration script does a targeted
  text splice after the prose key's line, then re-parses and asserts the parsed
  document is identical modulo the one added key. Diff: `+40 lines, -0`.
* **`tolerance_stack/stack.py` has a `PROVENANCE.md` row (line 84) and any edit
  to it reddens `test_this_branch_amended_the_row_of_every_imported_file_it_changed`**
  — including an uncommitted mutation plant, which is why plants B, C and E each
  showed that test failing alongside the intended one. It is comparing against
  the merge-base *and* the working tree. The row is amended in the deliverable-4
  commit.

---

## Deliverable 3: the register is tracked, not in `data/`

The handoff says to mutate `C:\workspace\tolstack\data\hardware_entries.json`,
copy it aside first, and warns that an accidental loss is unrecoverable because
`data/` is gitignored. **There is no register at that path.** The file
`load_hardware` reads is `docs/tolerance_stacks/hardware_entries.json` —
tracked, present in every worktree, resolved via `HARDWARE_NAME` relative to the
topologies dir's parent. `git diff --quiet` confirmed the byte-for-byte restore
after the plant. The scratch copy was cheap insurance and stayed unused.

## What the criterion gate revealed

`">= 0"` is the only criterion anything in this repo uses: **37 authored
criteria, 19 in `docs/tolerance_stacks/` and 18 in `docs/topologies/`, all that
string.** Where it is written down, and this is the whole of it:

1. the dataclass default `criterion: str = ">= 0"` on `CheckResult`;
2. two `NotImplementedError` raises (`verdict`, `margin`), which until today had
   no test;
3. one flat sentence in `docs/SOP_TOLERANCE_STACK.md`, "Verdicts":
   *"`criterion` is `">= 0"`."*

**There is no `CRITERIA` constant**, and I did not mint one. This looks like the
repo's documented vocabulary-drift shape, and it is not: a vocabulary constant
exists so several modules can agree on a *set of words*. Here there is one word,
one consumer, and a `NotImplementedError` that already refuses everything else —
the constant would have one member and no second reader. What was actually
missing was the **pin**, and that is what
`test_every_authored_criterion_is_one_the_check_result_implements` is: it walks
both authoring surfaces, asserts every criterion is the supported one, and
asserts both surfaces contributed, so the gate is never guarding empty space.
If a second criterion ever arrives, *that* is when the tuple should be minted —
and that test is where its absence will be felt.

## Do the four holes share a cause?

Yes, and it is narrower than "nobody wrote a test".

**Every one of the four was published to a reader through a path that does not
run Python assertions, and each was verified at the far end of that path
instead of at the near end.** The verdict words were checked by
`tests/test_js_python_vocabulary.py` against `apps/viewer/viewer.js`. The margin
value was checked by a rendered-string assertion in the JS `[real]` tier —
`has(out, "margin +0.1098 mm at worst case")` — which reads the *built
projection file* and therefore only fires after somebody manually re-runs the
builder. The hardware register's schema was checked by the sibling builder, so
the fact was true of the repo and false of the module. And the joint's run ids
were checked by `build_viewer_crops.py`'s regex, which proves the *sentence*
parses and says nothing about what it names.

So in all four cases something downstream *was* watching. The hole is that the
watcher lived one artifact, one language, or one module away from the rule —
close enough that a reviewer reading either end sees a guard, and far enough
that mutating the rule leaves the guard green. That is why this repo keeps
filing "guards that survive their own mutation": the guards are real, they are
just not attached. The fix shape, four times over, was to assert the rule where
the rule is, in the language the rule is written in, and then go watch it fail.

## Out of scope, filed

* `ISSUE_20260916_the_joint_export_run_id_regex_can_retire_now_that_the_runs_are_structured.md`
  — `build_viewer_crops._RUN_ID_RE` can read `assembly_export_ref.run_ids`
  instead of parsing prose. Explicitly deferred by the handoff (that file is
  `viewer_unwitnessed_surface_guards`'s this sweep); the issue also flags
  `ARCHITECTURE.md:531`, which describes the prose field as the legacy fallback
  and will need to move with the code.
* `ISSUE_20260916_the_sop_documents_no_joint_block_so_the_new_structured_export_is_unauthorable_from_the_sop.md`
  — the SOP prescribes no `joint` keys at all, so the new required key is
  discoverable only by tripping the pairing test.

## Verification summary

```
venv-win/Scripts/python.exe -m pytest -q
  1 failed, 1172 passed, 1 skipped          (baseline 1 failed, 1162 passed, 1 skipped)

venv-win/Scripts/python.exe scripts/build_topology_projection.py \
    --data-root C:/workspace/tolstack/data
  clean; written projection carries 104 gap rows, 53 of them hardware_entry
  (unchanged, and proven identical to the pre-change output with the new
  guard bypassed)
```

`scripts/build_viewer_projection.py` also builds all seven stacks clean, and
`build_viewer_crops._RUN_ID_RE` still finds both run ids in the untouched prose
field — both checked in-process rather than by writing the shared projection,
since neither was in the definition of done.
