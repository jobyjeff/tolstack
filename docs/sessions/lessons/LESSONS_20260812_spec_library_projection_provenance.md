# LESSONS 2026-08-12 — spec_library_projection_provenance

Handoff: `HANDOFF_20260812_spec_library_projection_provenance.md`. Issue:
`ISSUE_20260810_the_spec_library_projection_is_the_third_shared_writer.md`
(closed by this session).

What landed: `python -m tolerance_stack` takes `--data-root` and
`--allow-older-tree`; `rebuild()` stamps `provenance` into `library.json` and
refuses to overwrite a projection built from a tree this one does not contain;
`projection_provenance.stamp()` grew a `source_key` argument; five tests in
`tests/test_spec_library.py`; the shared file in the main checkout is stamped for
the first time.

## The design question: keep the file, and the issue's own reason for keeping it was wrong

The handoff made this the first deliverable and said deliverables 2–3 were
"work thrown away" if in-process derivation won. It does not win, but not for the
reason either the issue or the handoff gives.

**What I found:** *nothing in this repo reads `library.json`.* Grep for the
filename, for `projections/spec_library`, and for `library_ref` across every
suffix: the only code that resolves a subject is
`build_library(load_events(EVENTS_DIR))`, in `tests/test_spec_library.py` and
`tests/test_spec_library_review.py`. So the alternative design — *consumers fold
in process and the shared file stops existing* — is **already how every code
consumer works**. There is nothing to convert; deliverable 2–3's replacement
would have been a no-op plus a deletion.

That also corrects a claim both the issue and the handoff make, and that I would
have repeated: *"`library.json` is what a stack's `library_ref` resolves
through"*. No code resolves through it. `hardware_entry.library_ref` is a string
an **agent** wrote into `hardware_entries.json` after reading the library, and
the value beside it was transcribed by that agent. The leverage the issue claims
is real — a wrong value here launders into a stack wearing
`confidence: "traced"` — but the mechanism is a *reader*, not a code path.
(`ARCHITECTURE.md`'s data-flow diagram drew that arrow as if it were code; it now
says which it is.)

**Which decides it.** Deleting the file does not remove the reader; it sends them
to `docs/spec_library/events/*.json` to fold latest-per-document with corrections
overlaid, by hand, in their head. That is strictly worse for the exact failure
this projection's provenance is supposed to protect. Keep the file, stamp it. The
stamp cost ~40 lines against machinery that already existed.

Generalisation worth carrying: *"could a consumer derive this in process instead?"*
is only a real question if there is a consumer that doesn't. **Enumerate the
readers before you weigh the design** — I nearly argued the trade on the issue's
framing (higher-leverage because code resolves through it) and the framing was
the part that was false.

## No top-level `built_at`, and the asymmetry is the point

`results.json` and `crops.json` carry `built_at` at top level *and* in
`provenance`, and `build_viewer_projection.py` says why: existing consumers read
the top-level one by name, and renaming a published field to tidy a duplication
is the worse trade. `library.json` has never had one and has no consumer at all,
so a second copy could only ever go out of sync with the one beside it. One
timestamp, in `provenance`. Pinned by
`test_the_stamp_names_the_tree_that_built_the_library`, which asserts the
top-level key's *absence* — the decision is a claim, so it gets an assertion.

Same reasoning produced `stamp(..., source_key=...)`: this projection is built
from `docs/spec_library/events/`, and filing that absolute path under a key
called `stacks_dir` would be a provenance field that misnames its own subject.
`guard()` compares `head_sha` and never reads the key, so it is a label for the
reader and should say what it is. Default is unchanged; the two viewer builders
are untouched.

## Deliverable 4: the class audit, by what is written rather than how it is configured

The audit that missed this file searched `scripts/` + `tests/` for a
`--data-root`-style default. Method used this time, whole repo, two independent
sweeps that must agree:

1. **By destination.** `grep -rn "projections"` over `*.py *.js *.mjs *.cjs
   *.ps1 *.toml` — every path construction naming the directory, however the
   path is configured, plus `ops.toml` and `setup.ps1` in case a build is
   declared rather than written.
2. **By verb.** Every file-writing call in the repo — `write_text`,
   `write_bytes`, `json.dump`, `open(..., "w")`, `csv.writer`, `mkdir`, `rmtree`,
   `unlink` in Python; `writeFileSync`, `createWriteStream`, `writeFile`,
   `mkdirSync` in JS/CJS/MJS — then read each one's destination.

**The class has three members, and all three are now stamped and gated:**

| writer | file |
|---|---|
| `scripts/build_viewer_projection.py` | `<data-root>/projections/viewer/results.json` |
| `scripts/build_viewer_crops.py` | `<data-root>/projections/viewer/crops.json` + `crops/*.png` |
| `tolerance_stack/spec_library.py` `rebuild()` | `<data-root>/projections/spec_library/library.json` |

How I know it is three and not four:

- Sweep 2 found exactly two other Python writers, both caller-named with no
  default under `data/`: `scripts/snapshot_drawing_checker.py` (`--out`) and
  `tests/debug_dump_tol_stack_xlsx.py --csv`. Neither can land in `data/`
  without someone typing the path.
- **The JS sweep found zero write calls anywhere in `apps/viewer/`** — the
  storage adapters are read-only by construction, which is what makes the viewer
  a renderer rather than a fourth writer.
- Every writer under `tests/` writes beneath a `tmp_path` fixture; no test has a
  `REPO_ROOT / "data"` destination.

The two sweeps agree, and sweep 1 is the one that would have caught this file in
August: it names the *directory*, and every member of the class must construct
that path to write into it.

## Things the next agent would otherwise rediscover

- **The shared file is now stamped by this branch, and that has a cost until the
  merge.** `C:\workspace\tolstack\data\projections\spec_library\library.json`
  carries `handoff/spec_library_projection_provenance @ 383efcd`. Until this
  branch is on `master`, a rebuild from any other tree **refuses** and needs
  `--allow-older-tree` (or a merge first). Worse, `master`'s own copy of
  `spec_library.py` has no gate, so `python -m tolerance_stack` run from the main
  checkout on `master` silently clobbers the stamp and writes an unstamped file —
  the same "the gate only protects trees that HAVE the gate" caveat
  `viewer_projection_provenance` recorded, now applying to a second projection.
  Whoever merges should say so.
- **The pre-existing file was verified consistent before it was replaced.** A
  fresh fold matched the 2026-08-05 copy exactly, so the issue's "that is luck,
  not a property" was luck that held. Recorded here because after this session
  nobody can check it again: the old file is gone.
- **`library.json` on disk is CRLF, and it always was.** `Path.write_text` uses
  the platform line ending, so the file is 63,866 bytes and the JSON it holds is
  62,356 characters. Any "same bytes" check on this file has to go through text
  mode (`read_text`), and comparing `read_bytes()` against a `json.dumps` string
  will report a difference that is not there. That is why
  `test_the_stamp_is_additive_and_the_rest_of_the_file_is_untouched` reconstructs
  the previous writer's *string* rather than diffing bytes.
- **The repo fails a build for unbacked identity claims — including in a
  docstring.** `test_every_byte_identity_claim_in_a_live_file_names_its_verification`
  fired on the phrase "identical byte for byte" inside a test docstring I wrote,
  because the pointer regex ignores the enclosing `def test_` line. Any tracked
  file asserting identity must name a `sha256` / `git diff` / `tests/` path /
  `test_<name>` **in the same block of prose**. The fix was the right one: name
  the test that actually checks it, which forced me to write that test.
- **The gate is in `rebuild()`, not `main()`**, unlike the two viewer builders.
  `rebuild()` is public (`from tolerance_stack import rebuild`) and is the
  function that writes the shared file, so gating in `main()` alone would leave a
  hole for the next script that imports it. Consequences: `rebuild()` now shells
  out to git ~6 times per call and prints its notes to stderr. Both are cheap and
  both are visible in the test output.
- **`scripts/` is imported lazily and by path.** `spec_library.py` is imported by
  every consumer in the repo, so a module-level `sys.path` edit to reach
  `projection_provenance` would follow every `from tolerance_stack import ...`.
  `_provenance()` does it inside the two functions that need git.
- **How the refusal was demonstrated** (about eight commands, worth repeating
  verbatim next time): rebuild the real file from this worktree with
  `--data-root C:/workspace/tolstack/data`; `git worktree add
  C:/workspace/tolstack-worktrees/_gate_demo -b demo/... master`; in it, `git
  checkout <this-branch> -- tolerance_stack scripts` and commit, so the throwaway
  tree carries the gate but not this branch's history; run its rebuild against
  the same data root → **exit 3, file untouched**; `--allow-older-tree` → it wins,
  loudly; this tree's rebuild then refuses in the *other* direction; restore with
  `--allow-older-tree`; `git worktree remove` + `git branch -D`, and check
  `git worktree list`.
- **Use forward slashes in `--data-root` from the Bash tool.** `--data-root
  C:\\workspace\\tolstack\\data` arrives as `C:workspacetolstackdata`, and the
  rebuild cheerfully creates that as a *relative* directory inside the worktree.
  Nothing warns you; the "wrote ..." line is the only tell, and it scrolls.

## Follow-ups (not done, deliberately)

- **Nothing reads the projection, so nothing detects a stale one.** The viewer
  has a banner that reads its projections' stamps; `library.json` has no reader
  to show its stamp to, so the stamp is only useful to whoever opens the file. If
  a `library_ref` resolver is ever written (the obvious next consumer), it should
  read `provenance` and say what it is trusting.
- **The intake-queue state printed by `main()` is not written anywhere.** It is
  derived from the same fold and printed to stdout only. Not a defect; noting it
  because a reader looking for "which document closes which gap" in the
  projection file will not find it.
- **`master`'s gate-less writers.** The caveat above will keep applying to every
  projection this repo adds until the gate is on trunk and every live worktree
  has merged it. There is no mechanism that makes an old tree *acquire* the gate.
</content>
