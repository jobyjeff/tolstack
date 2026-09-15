# LESSONS 2026-09-14 — spec_crop_region_registry

Handoff: `HANDOFF_20260914_spec_crop_region_registry.md`. Branch:
`handoff/spec_crop_region_registry`. Declared crop regions now exist for
spec-pile citations, and every live pile citation crops the row it cites
instead of a photocopy of a sixty-four-row table.

## The registry: home and schema as shipped

`docs/spec_library/crop_regions.json`, schema
`joby.tolerance_stack/spec_crop_regions/v0`. The handoff left the home to me:
it sits in `docs/spec_library/` because that directory is the tracked home for
what this repo knows *about the pile*, and because the discovery there is
name-scoped — `spec_library.py` globs `events/*.json` and reads
`intake_queue.json` by name, so a third file beside them is invisible to the
library fold by construction and no glob had to be taught an exclusion. (Same
reasoning as the alias table's `docs/topologies/` home, 2026-09-10.)

An entry is `{document, page, label, rect, match, shows, recorded,
recorded_by}`. `rect` is `[x0, y0, x1, y1]` in PDF points, origin top-left —
the PyMuPDF convention, which is already what `crops.json` reports as
`rect_pt`, so a recorded region and a rendered crop are read in one coordinate
system. `shows` is the entry's evidence and is required: it is what somebody
saw inside the rect, and a region with a label and no reading is an assertion
about a page nobody can check.

## The match rule as implemented, and whether the where-ref text carried it

The handoff asked which of its two suggestions actually worked. **The
where-ref text carried every single live citation; the sole-region fallback
was never needed for sheet 3 and only ever applies to sheet 1.**

Implemented in `tolerance_stack/spec_crop_regions.resolve`:

1. candidates are the regions for the **same document and the same page**;
2. a region whose declared `match` string occurs in the citation's where-ref
   text wins, **longest matched string first**;
3. two *different* regions tying on that longest match is **ambiguous**, and
   ambiguous crops nothing;
4. nothing matched and the page has exactly one region → that region;
5. otherwise no region, and the caller keeps the whole sheet.

The where-ref text is `cell`, `view`, `callout` (the module constant
`WHERE_REF_FIELDS`) plus the element's `hardware_ref` — deliberately **not**
`note`, which runs to paragraphs; a region matched against a paragraph starts
answering to citations nobody meant it for.

**Longest-match-wins is not decoration.** Without it the registry has a
built-in footgun: `"Grip Dash No. 1"` is a substring of every dash-1x
citation's text, so the day somebody records the dash-1 row, three dash-13
citations would silently go back to whole sheets. Longest match resolves it
deterministically and the tie case is loud rather than arbitrary;
`test_the_longest_declared_match_wins` pins exactly that pair.

The registry constructor also refuses two regions on one sheet that declare an
*identical* match string — that collision can never resolve, so it is a broken
file rather than a runtime surprise.

## Where I deviated from the handoff, and why

**The handoff said the crop entry should record the region as "a new
`resolved_by` value". It could not be.** `resolved_by` names how the *document
bytes* were identified, and `apps/viewer/tests.js`'s `[real] the marked
citations are exactly the spec_pile-resolved ones` pairs that field against the
projection's derived `identity_rule: "spec_pile_filename"`. Minting
`spec_pile_region` would have moved citations out of the `spec_pile` count and
made the two sides disagree — a red test whose message would have been about
citation identity, which is not what changed.

So the new value went on **`located_by`**, which is the field that already
means *where on the sheet*: `declared_region`, beside `zone_cell`,
`callout_text` and `sheet_full`, plus `region_label` / `region_match` on every
crop entry (null on the other three placements, so "no region" and "built
before regions existed" cannot look the same).

The handoff's *intent* — an enumerated field needs a total function — is what
made this more than a one-line change. `located_by` was an `if`/`else` chain in
`VA.cropProvenanceLine` with no `else`, and `tests.js`'s `VALUE_GUARDS` pinned
its three values as a hand-kept list with a comment saying there was nothing to
ask. A fourth value would have dropped the whole "where on the sheet" clause
silently. So the chain became **`VA.CROP_PLACEMENTS`**, the guard row became
the strong form (`known: !!VA.CROP_PLACEMENTS[v]`), and
`tests/test_js_python_vocabulary.py` gained a fourth pairing reading the
`located_by` literals out of `locate()` by AST. That extractor is scoped to
`locate()` rather than the whole module on purpose: a future *forwarding* site
(`"located_by": placement["located_by"]`) would otherwise need a hand-written
exclusion, which is the shape `python_crop_rules` already has to carry.

**The consumption rule is wider than "a `spec_pile` citation".** It fires for
any citation whose **resolved PDF lives in `data/inbox/specs/`**, whichever rule
named it. Four live citations resolve by `spec_pile`; twelve more name the same
NAS6403 file through a `source_ref.export` block pointing into the pile, and
eleven of those are dash rows of the same table. Keying on the rule rather than
on the bytes would have left `bolt_grip_11` showing a whole photocopy while
`fastener_grip_13` showed its row — same table, same sheet, no principled
difference a reader could see. A region is a fact about the bytes, so the bytes
are what it keys on. All **sixteen** pile citations now crop a declared region.

## What got recorded, and how the rects were found

Sheet 3's grip/length table has no text layer (200 dpi scan, ceiling zoom
~2.78), so the rows were found by ink: render at 4x greyscale, take the dark-run
bands in the x-slice of the "Grip Dash No." column, and map band *n* to dash
*n − 4* (the header occupies the first three bands). Then — and this is the step
that makes the entries evidence rather than arithmetic — draw every proposed
rect on the page with `page.draw_rect` and render the lot at 8x to check each
box encloses the row it claims. Two bands are fused with the group rule line
above them (dash 9, dash 13); the overlay is what showed that, and both rects
were nudged by hand afterwards.

Recorded: the dash rows every live citation reads (2–11, 13, 14) spanning the
`Grip Dash No.`, `Grip ±.010`, `NAS6403 .1900-32` and `NAS6404 .2500-28`
columns, plus sheet 1's dimension-table `NAS6403` row with its column headers
(the cotter-hole citation reads column M off it). Every recorded row's printed
values agree with the citation's own transcribed callout, which is a free
cross-check the handoff did not ask for and is worth knowing: the crop
corroborates the number.

**Why a row band and not the header too:** they are not contiguous, and one
entry is one rect. Sheet 3's four leftmost columns at ~107 pt wide render to
~320 px, which is close to the 400 px popover — the digits are legible. The full
14-column width would have been a 56:1 strip, illegible at any card width. The
whole sheet stays one click away through the crop popover's existing `file://`
link, so no viewer change was needed, exactly as the handoff said.

## Two things the next session should not be surprised by

**The rebuild needed `--allow-older-tree`, twice.** `crops.json` in the main
checkout had been built minutes earlier by `handoff/stack_title_style_pass`, a
worktree this branch does not contain, so the ancestry gate refused — working
exactly as designed. Overwriting was deliberate (the handoff's definition of
done is the live crops), and it means **`crops.json` and
`results.json`/`topologies.json` in `C:\workspace\tolstack\data` are now from
different trees**. Whoever merges last should run
`scripts/rebuild_projections.ps1` from the main checkout to put all three back
on one tree.

**That mixed state costs two JS `[real]` failures if you run the suite with
`--repo C:\workspace\tolstack`**: `fixtures.js` has no `description` key
(`stack_title_style_pass` added the field to its own stacks) and
`topology_fixtures.js` has no `parts[].mesh`. Neither is this branch's. To check
this branch honestly, build all three projections into the *worktree's* own
`data/` and run `node apps/viewer/run_tests.cjs` with no `--repo` — that is
**285/285**, full `[real]` tier included. One wrinkle: the crop builder resolves
the pile at `<data-root>/inbox/specs/`, so a worktree-rooted crop build finds no
pile and reports the spec citations unresolvable; copy `crops.json` and `crops/`
over from the main-checkout build instead of rebuilding them locally.

## Suites

`venv-win\Scripts\python.exe -m pytest -q`: **817 passed** (it was 769 + 1
skipped before; the skip was `test_viewer_js_suite`'s node-fs tier, which now
has a worktree projection to read). `node apps/viewer/run_tests.cjs`:
**285/285**, `[real]` tier included.
