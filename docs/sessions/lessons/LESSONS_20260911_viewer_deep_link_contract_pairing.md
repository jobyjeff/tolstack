# LESSONS 2026-09-11 — viewer_deep_link_contract_pairing

One new test module, `tests/test_viewer_deep_link_contract.py` (9 tests), pairing
`apps/viewer/README.md`'s `## Deep links in — the URL contract` section against
`VA.DEEP_LINK_PARAMS`. Nothing else changed: the README needed no edit (the six
rows and the "answers six selection params" sentence were already correct), and
`viewer.js` / `tests.js` were left alone as the handoff directed.

## The shape, and the two scopings that are the whole point

`contract_problems(viewer_js_text, readme_text)` returns a list of sentences;
three checks feed it — every param in the constant has a `` `<param>=<id>` `` row,
every such row names a param the constant has, and the section's stated param
count equals `len(constant)`. One function so every replay can feed it a mutated
README and read back exactly what the live pairing reports.

- **Section scoping** (`^##[ \t]+Deep links in` to the next `^## `) is not
  cosmetic. The obvious reuse — this repo's `_ENUMERATED_STATE_VOCABULARIES`
  guard in `tests/test_tolerance_stack.py`, which matches a code value *by name,
  anywhere in the surface README* — is **vacuous for every one of the six**:
  `topology`, `study`, `edge`, `node`, `stack`, `element` are all ordinary words
  appearing throughout that README. Not "weak here"; it can never fail.
- **Claim-shape scoping** (`` `<param>=<id>` ``, not the bare name) matters even
  *after* section scoping, and this is the part the issue's fix shape got exactly
  right for a reason easy to miss: the section's own prose writes `` `topology` ``
  and `` `stack` `` in the "give one, not both" rule, so a bare-name match inside
  the section would still be satisfied for two of the six by prose documenting no
  table row at all.

**`?mock=1` falls out of the claim shape rather than an exemption list.** It is in
the section and deliberately *not* in the constant (it picks the dataset, not a
selection), and the document writes it `mock=1`, never `mock=<id>` — so the
reverse direction never sees it. Pinned by its own test, because that is the one
value the two sides legitimately disagree about and the thing keeping it quiet is
a punctuation difference, not a rule anyone wrote down.

## The count claim — a small scope addition, deliberate

The handoff asked for the param pairing. I also paired the sentence one line
above the table, *"`topology.html` answers **six** selection params"*, against
`len(VA.DEEP_LINK_PARAMS)`, because the exact scenario the handoff exists to
close — a seventh param added to the constant — leaves that sentence stale and
the param scan alone would have passed it as a document that merely *omits* a
row. CLAUDE.md's "a quantity written in prose that no test reads from the tree is
a defect" points the same way.

The matcher is narrow on purpose (`REVIEW_AGENT.md`, "a doc-scan guard's false
positive"): `<digits|one..twelve>` + **at most one** intervening word + `params`.
Measured against the live section, it matches exactly once ("six selection
params"); the section's other numbers — "in **one** constant", "pinned by tests
in **both** repos", "same param names" — are not followed by `params` and are not
claims about this count. `test_neither_side_of_the_pairing_is_empty` asserts the
count claim still exists, so deleting the sentence to dodge the check is itself
red.

## Replay evidence

Two kinds, and the second is the one that matters. The in-module replays mutate
README text in memory; separately I mutated the **real tracked files** in the
worktree, ran the live test, and restored (both files verified clean afterwards
by `git status --porcelain`).

**1. A table row cut from the real `apps/viewer/README.md`** —
`test_the_readme_contract_table_names_exactly_the_constants_params` red:

```
AssertionError: apps/viewer/README.md's deep-link contract disagrees with VA.DEEP_LINK_PARAMS:
    VA.DEEP_LINK_PARAMS carries 'element', and the `## Deep links in` section of
    apps/viewer/README.md has no `element=<id>` row for it -- add the row; a sibling
    repo reads the contract from that section and nothing else tells it the param exists.
```

**2. A phantom row (`` `revision=<id>` ``) added to the real table** — red:

```
    the `## Deep links in` section documents a `revision=<id>` row and
    VA.DEEP_LINK_PARAMS has no such param -- the page ignores that query key, so
    the row promises a consumer something the code drops.
```

**3. The issue's actual scenario, replayed forwards: a seventh param added to
`VA.DEEP_LINK_PARAMS` in the real `viewer.js`, README untouched** — red with
*both* problems, which is the evidence the count check earns its lines:

```
    VA.DEEP_LINK_PARAMS carries 'revision', and the `## Deep links in` section of
    apps/viewer/README.md has no `revision=<id>` row for it -- ...
    the section says 'six' params and VA.DEEP_LINK_PARAMS carries 7 -- restate the
    count or drop it.
```

**4. Section-scoping is not vacuous** (in-module,
`test_the_section_scoping_is_not_vacuous`): cut the `element` row, then write
`` `element=<id>` `` one line *past the next `## ` heading*. A whole-README scan
goes green; this stays red. **Gotcha worth keeping:** my first version of this
replay inserted the text immediately *before* `## Hover reference cards` and the
test failed — text above the next heading is still *inside* the section. The
insertion point has to be computed past the next heading's line end, not by a
string-replace anchored on it. A section-scoped scan's own negative case is easy
to write inside the section by accident, and it then "fails" for the right-looking
wrong reason.

**5. Deleted / duplicated section**: `contract_section()` raises `LookupError`
("expected exactly one `## Deep links in ...` heading … found 0/2") rather than
scanning an empty string. This is the narrow slice of `REVIEW_AGENT.md`'s "a
doc-scan guard cannot fail on a deleted section" that *is* closed here — for this
one section only, because the heading lookup is the extraction.

## Does section scoping generalize to the README's other contract tables?

Yes as a technique, and it is cheap — `contract_section()` is ten lines and the
only per-table cost is a claim-shape regex. But **none of the other four tables
is in the same position as this one**, and I built no further scans (the handoff
said name them, don't build them). For a future handoff, in rough order of value:

| README table | ground truth | already paired? |
|---|---|---|
| `## Reading the colours` legend (`\| \| meaning \|`) | `VA.CONFIDENCES`, `VA.VERDICT_SCOPES` | JS↔Python only (`test_js_python_vocabulary.py`); README **unpaired** |
| `## Which bytes the number was read off` (`\| state \|`) | `VA.EXPORT_STATUSES`, `VA.IDENTITY_RULES` | name-anywhere via `_ENUMERATED_STATE_VOCABULARIES` (EXPORT_STATUSES only) |
| `## Hover crops` status table (`\| status \|`) | `crops.json`'s four statuses — **no JS constant**; the words live in `scripts/build_viewer_crops.py` and in branch logic | unpaired |
| `## Hover crops` `resolved_by` table | `VA.CROP_RULES` | JS↔Python only; README **unpaired** |

Three observations a future handoff should start from rather than rediscover:

1. **The value of this pairing came from the cross-repo consumer, not from the
   table being a hand-copy.** Every row above is also a hand-copy. What made the
   deep-link section worth its own scan is that another repo reads *it* instead
   of the code, so a stale row misleads someone who can't see the constant. The
   other four are read by humans who are already in this repo. Weigh that before
   spending the lines.
2. **The claim shape is the hard part each time, and it differs per table.**
   `` `<param>=<id>` `` is unusually clean. The colours legend's first column is
   `` green `traced` `` — a colour word plus a backticked value — and the crop
   status table's first column is a bare backticked value that also appears in
   surrounding prose. Each needs its own measured "how many times does this match
   in the live section" check; do not lift this module's regex.
3. **The crop status table has no constant to pair against at all** — its four
   words are branch logic, so pairing it means first extracting them the way
   `python_crop_rules()` extracts `resolved_by` literals from the script. That is
   a different, larger job than the other three, and it is the one whose
   vocabulary could most plausibly drift silently.

I filed no issue for the four above: naming them here was the handoff's explicit
ask, and each would be a `feature`-shaped design call (is a new doc scan worth its
false-positive surface?) rather than deferred work with a missing owner. If a
future reader disagrees, the table above is the whole brief.

## Verification

- `venv-win/Scripts/python.exe -m pytest -q` → **768 passed, 1 skipped**
  (759 + 1 at the 2026-09-11 batch-merge baseline, + 9 from this module).
- Viewer JS fast tier, run with the main checkout's data so the node-fs tier is
  not skipped: `node apps/viewer/run_tests.cjs --repo "C:/workspace/tolstack"` →
  **283/283 passed**. (From a worktree without `--repo` it reports `SKIP node-fs
  tier` and 234/234 — that is the gitignored-`data/` rule, not a regression.
  Note the flag needs a forward-slash or properly-quoted path: a bash-escaped
  `C:\\workspace\\tolstack` silently became a relative path and skipped the tier
  without erroring.)
