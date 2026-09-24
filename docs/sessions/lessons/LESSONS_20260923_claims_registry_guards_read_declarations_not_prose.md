# LESSONS 2026-09-23 — claims_registry_guards_read_declarations_not_prose

R3 from `dispatch/docs/reports/REPORT_20260921_bug_pareto.md`: every guard in
this repo that read free English for a claim shape now reads a machine-readable
declaration instead. What follows is the part that is not in the diff.

## The format chosen, and the one rejected

**Chosen: a fenced block whose info string is `claim`**, holding a strict
`key: value` body. In a JSON document — where there is no fence, and where this
repo's prose lives in fields — a `claims` array beside the prose it backs,
carrying the same keys and parsing to the same object.

> ```claim
> metric: traced_ratio
> value: 5 of 26
> ```

**Rejected: a `claims:` block in YAML frontmatter** at the top of each document.
Three reasons, all about the defect being prevented rather than about taste:

1. **Locality.** The failure is a number drifting from the data it describes. A
   declaration beside the sentence it backs lands in the diff hunk of the edit
   that would break it. One at the top of a 1 800-line `ARCHITECTURE.md` does
   not, and `ARCHITECTURE.md` turned out to carry claims about three unrelated
   metrics in three unrelated sections.
2. **Many per document, each with a line number.** Frontmatter gives one block
   keyed by nothing that says which passage it belongs to, so a failure message
   could name the file but not the paragraph.
3. **No document here has frontmatter today**, and these are read by humans in a
   markdown renderer: a fence renders as a visible block a reader can check,
   while a leading `---` block renders as either nothing or a stray
   rule-plus-text depending on the renderer.

Two smaller calls worth recording because they are not obvious from the code:

- **A fence opened behind `>` is not a declaration.** That is the *only*
  quotation rule left, and unlike the four the prose scanners carried it is a
  property of the fence rather than an inference about the English around a
  match. It is what lets this lesson, an issue, or the module's own docstring
  show the format without declaring anything.
- **Values are carried as text in both carriers** (`"value": "5"`, not `5`), so
  a count reads identically in a fence and in JSON and there is one coercion
  site per metric rather than two.

## The corpus is git-derived now, and that has a trap in it

`claim_corpus()` asks `git ls-files` rather than walking, which is the fix for
`ISSUE_20260917_live_documents_walks_gitignored_scratch_in_the_main_checkout`
(a file git does not track is not a document this repo publishes). It falls back
to an `os.walk` for a tree that is not a work-tree **root**, and returns which
mode it used so the fallback can be asserted rather than guessed.

**The toplevel check is load-bearing and I did not have it at first.** The
mutation-witness shadow tree lives at `tmp/mutation-witness/` *inside* the
worktree, so `git -C <shadow> ls-files` succeeds, answers about the enclosing
repo, and returns **nothing** — `tmp/` is gitignored. Taken at face value that
is a corpus of zero files with the mode still reading `git-tracked`: every
declaration guard green with nothing read. The first run of the new guard's own
mutation witness is what surfaced it, which is a small argument for enrolling in
the same change rather than later. `test_a_tree_nested_inside_a_checkout_walks_rather_than_asking_git`
pins it, using `docs/` as the stand-in nested directory.

## Which documents were actually migrated

Run the scans first, don't guess from the handoff's prose — the handoff said so
and it was right. What the old scans actually flagged, versus what the handoff
named speculatively:

| what the handoff named | what was really there |
|---|---|
| "whichever worksheet/README carries the hardware-entry count sentence" | **no worksheet or README states one.** Every hardware count the scan found was inside `hardware_entries.json` itself — five in its `description`, one in entry 4's `library_ref_note`. `docs/tolerance_stacks/README.md` had already chosen to state no count at all. |
| "whichever document carries a byte-identity assertion" | **51 sites**, most of which are not claims about this repo's artifacts at all — `viewer.js`'s `return "checked against the citation, byte for byte"` is UI copy, and five more are tests asserting that UI copy. See the scope note below. |
| "`ARCHITECTURE.md`'s one-fold rule statement" | correct, and five more sources: `docs/DAG_TOPOLOGY.md`, `ARCHETYPE_thermal_fit.md`, `stack.py`, `thermal.py`, `topology.py`. |
| "any document restating a traced-ratio figure" | exactly the eleven `traced_ratio_publishers()`, all using the literal `5 of 26`. |

**Migrated (22 documents, 32 declarations):**

> **Correction, 2026-09-24 (`review/claims_registry_guards_read_declarations_not_prose`).**
> Both numbers are wrong and the itemised list below is right: the registry
> reports **33 declarations across 21 documents**
> (`venv-win/Scripts/python.exe -m tests.claims_registry`, and the per-metric
> tally is 11 `traced_ratio` + 9 `hardware_entry_count` + 6 `one_fold_rule`
> + 4 `byte_identity` + 2 `mesh_routes` + 1 `smallest_chain` = 33). 21, not 22,
> because `ARCHITECTURE.md` appears in three of the groups below and
> `docs/ANNOTATION_SURFACE.md` in one.

- 11 traced-ratio publishers — `ARCHITECTURE.md`, `docs/SOP_TOLERANCE_STACK.md`,
  `docs/prompts/REVIEW_AGENT.md`, `data/inbox/specs/README.md`, and the seven
  `WORKSHEET_*.md`.
- 6 one-fold-rule sources (`RULE_PASSAGE_SOURCES`, unchanged as a set).
- `docs/tolerance_stacks/hardware_entries.json` — nine counts, a superset of the
  six the old scan found, because the registry can be asked for any count key.
- `docs/topologies/study_pitch_system_end_stop_{minus7,plus72}.json` — four
  `byte_identity` claims over `#/selection` and `#/transforms`. These are now
  **compared** rather than cross-referenced to the test that compares them.
- `ARCHITECTURE.md` + `docs/ANNOTATION_SURFACE.md` — `mesh_routes`.
- `apps/viewer/README.md` — `smallest_chain`.

**Deliberately not migrated: the other 47 byte-identity prose sites.** The old
guard's unit was "any file mentioning bytes"; the new guard's unit is "a claim
somebody declared". Converting `viewer.js`'s rendered string, or `tests.js`
asserting that string is on screen, would be converting things that were never
claims — they were false positives the old scan happened to let through because
a `sha256` appeared nearby. The genuine, file-level, checkable ones are the four
above. `PROVENANCE.md`'s own byte-identical rows were never in this scan's scope
and are still checked from the other end by `unamended_rows`.

## The five named issues — verified against the files, not the report

- **`byte_identity_scan_has_no_quotation_exemption` (open) — resolved.** There
  is no byte-identity prose scan to exempt anything from. Verified empirically:
  appended the verbatim claim sentence, unbacked, to `ARCHITECTURE.md` and ran
  the four guard modules — 216 passed.
- **`a_qualifier_anywhere_in_a_15kb_block_covers_an_absolute_rule_statement`
  (resolved by point-fix) — now inexpressible.** No guard classifies a region by
  a token found anywhere in it, because no guard reads regions.
- **`the_one_fold_rules_absolute_form_survives_outside_rule_passages` (resolved
  by point-fix) — now inexpressible.** `exceptions` is a required field, so a
  declaration that mentions no exception does not parse and one that names the
  wrong set disagrees with the list. Pinned by
  `test_a_declaration_cannot_state_the_rules_absolute_form`.
- **`the_free_form_block_value_exemption_hides_the_values_from_every_scan`
  (open) — CARRIED FORWARD, and the report's summary of it is wrong.** It is not
  a document-prose scan at all: `dd.kv__value` is a DOM class in
  `VERBATIM_PROSE_CLASSES`, and the scan is the viewer's **reader-facing copy**
  walk in `apps/viewer/tests.js` over rendered nodes. Different corpus,
  different guard family, untouched by this handoff. Its resolution shape (a
  two-tier exemption: the record's text exempt from the field-name scan but not
  from banned literals and shapes) is unaffected by anything here.
- **`live_documents_walks_gitignored_scratch_in_the_main_checkout` (open) —
  PARTIALLY resolved, and the remainder is real.** Every guard that reads a
  claim now uses the git-derived `claim_corpus()`, so untracked scratch cannot
  join a claim scan's corpus. But `live_documents()` itself is still a bare
  `os.walk`: it has one caller left, the enumerated-state surface guard, which
  wants "this README stopped being live" to be loud and is about what is on disk
  rather than what states a fact. So the issue's *title* is still literally true
  and its *consequence* ("untracked dirt joins every claim-shape scan's corpus")
  is not. Whoever closes it should decide whether the surviving caller wants the
  git-aware set too.

## Does any guard in scope still read free prose? No — and here is the cost

Every guard named in the handoff's deliverable 3 reads only declarations. Three
things were lost in the move and are worth a successor knowing about, rather
than rediscovering:

1. **A stale number written into a sentence and declared nowhere is caught by
   nothing.** This is the trade R3 asks for, and it is mitigated in exactly one
   place: a metric marked `rendered` (today, only `traced_ratio`, whose value is
   a distinctive string) also requires its declared value to appear literally in
   the document's prose outside the declaration. Source → declaration → sentence,
   all three links checked. `hardware_entry_count` cannot use this — containment
   of `"5"` is vacuous.
2. **`apps/viewer/README.md`'s mutation-witness-count prohibition is gone with
   no replacement.** Its subject was a number the README deliberately does *not*
   state (Jeff: say it without a digit, point at the runner's printed output), so
   there is no value to declare. The alternative was to declare the spec count
   and make every future enrolment edit that README, which contradicts the
   decision the section was written under. The prohibition was dropped; a future
   author who writes a stale witness count there will not be caught.
3. **Sighting 3's historical replay went with the byte-identity grep.**
   `test_the_grep_catches_the_reconstructed_sighting_three` replayed a real blob
   (`46a450a`) to prove `_DEFINITION_RE` — that a test's own `def` line must not
   discharge a claim inside it. There is no pointer heuristic left to regress, so
   the test had no subject. `test_the_byte_identity_check_can_fail` replays the
   same *shape* (two artifacts asserted identical that are not) against the
   declaration instead.

## Out of scope and still reading prose

`tests/test_sop_vocabulary.py` carries its own `claims_in()` / `claim_inventory()`
— a scan for **superseded-nullness** claims (`library_ref` is always null) over a
`git ls-files` corpus with its own `_HISTORICAL` and `_SCANNED_SUFFIXES` copies.
Same shape, same family, not in this handoff's scope list. It is the obvious next
adopter: the fact it guards is declarable (`library` count is already a
`hardware_entry_count` key), and its corpus constants are a third copy of scope
logic the registry now owns.

## Fences the handoff set, and what I could not file

The handoff forbade touching `docs/issues/` (a parallel session may be filing
there). So the two pieces of deferred work above — the `test_sop_vocabulary.py`
adopter, and the surviving `live_documents()` walk — have **no issue file**, only
this lesson and the completion report. That is the failure mode
`BRIEF_20260921_fenced_work_has_no_later.md` names, and it is stated here so
whoever reads this can file them rather than rediscover them.

## Smaller things that cost time

- **CRLF.** This repo is checked out with CRLF on. A migration script that reads
  with `Path.read_text()` and splits on `\n` is fine, but a multi-line
  `str.replace` written in a shell heredoc is not — several patched cleanly and
  several silently matched nothing. Assert `count(old) == 1` before every
  replacement; two of mine would have been silent no-ops otherwise.
- **The claim corpus must not read `tests/`.** A test module for the registry
  necessarily writes deliberately-wrong declarations as fixtures. That exemption
  is about *this* module, not inherited from the old scans, and it is why
  `tests/test_claims_registry.py` can carry four `WRONG_ON_PURPOSE` claims
  without reddening the suite.
- **The python mutation-witness tier's suite must be green in a tree holding
  only `apps/ scripts/ docs/{topologies,tolerance_stacks,spec_library} tests/
  tolerance_stack/`.** That is why the corpus floors and the dated-history
  exemption assertions live in `tests/test_tolerance_stack.py` and not beside
  the registry's other guards — proving an exemption excludes something real
  needs the excluded directories to exist.
- **The browser tier cannot run from a worktree without help**:
  `node_modules/playwright-core` is gitignored into the main checkout, and ESM
  resolution walks up from `scripts/`. A junction
  (`mklink /J node_modules C:\workspace\tolstack\node_modules`) is enough, and
  it is gitignored so it leaves with the worktree.
