# LESSONS 2026-09-06 — rule_scan_bullet_block_masking

## The split rule chosen

`_flattened_units()` (`tests/test_thermal_exception_list.py`) already split a
blank-line-delimited block into per-row units when every line started with
`|` (the table case). This handoff added a second split, applied to every
non-table block: within the block, any line matching
`BULLET_START = re.compile(r"^\s*-\s+(\[[ xX]\]\s+)?\S")` opens a new unit;
every line that doesn't match is a continuation line and is appended to the
*current* unit. The first line of a block always opens a unit regardless of
whether it matches the marker, so a block with **no** bullet marker anywhere
still collapses to exactly one unit — the whole block, byte-for-byte the same
result `_flattened_units` gave before this change. That's why the existing 12
tests needed no changes: the new code path is additive, not a rewrite of the
non-bullet case.

`BULLET_START` deliberately requires a non-space character after the marker
(and after an optional `- [ ]`/`- [x]` checkbox) so a bare `-` or a `---`
horizontal rule doesn't get misread as a list item start (`---`'s second
character is `-`, not whitespace, so the regex's `\s+` after the first `-`
never matches it anyway — but the trailing `\S` requirement is the one that
actually matters for a bare `-` line).

Line numbers fell out for free: each unit's reported `start` is
`block_start + offset`, where `offset` is the cumulative line count of the
items before it — the same arithmetic the table split already used per row,
just applied per bullet instead. No separate fix was needed for the
"reports the block's first line, not the offending sentence's" complaint in
the handoff; it was a direct consequence of the unit actually being the
bullet instead of the whole block.

## Regression test

Added to `test_the_rule_statement_scan_can_fail`: a two-line synthetic block,
first line a qualified bullet (`except the sites on the declared exception
list`), second line a bare one (`combines element values.`), asserting
exactly one *unconditional* finding and that its `location` is `d.md:2` — the
bare line's own line, not the block's. A second assertion repeats this with
`- [ ]` checkboxes and a wrapped continuation line on each item, checking the
continuation stays attached to its own item (doesn't leak into the next
item's unit) and that the second item's reported start line accounts for the
first item's two physical lines (`d.md:3`).

## Corpus sweep result

Ran the real repro from the issue: inserted an absolute rule statement
("It is the only place element values are combined.") into
`docs/prompts/REVIEW_AGENT.md`'s checklist block (previously lines
1527-1747, one 14 976-character unit) via a scratch copy, then called
`_flattened_units` on it directly. **Before this change** that block was
confirmed (in the handoff) to stay masked — the qualifier at line ~1592
covered everything through line 1747. **After this change** the block splits
into 18 units in that range, and the inserted sentence lands in its own
small unit (reported at its own line, not 1527), with no qualifier text in
it. Not run as a permanent test against the live doc (that would pin a
specific line count that has no reason to stay stable) — the synthetic
fixture in `test_the_rule_statement_scan_can_fail` is the permanent
regression coverage; the corpus sweep was a one-off confirmation, and the
scratch file was deleted afterward.

**No previously-masked real finding surfaced in the actual tracked corpus.**
`docs/prompts/REVIEW_AGENT.md` *is* in the scanned corpus (`rule_scan_sources()`
pulls it in through `live_documents()` same as any other tracked `.md`), so
`rule_statements()` was re-run directly over the real, unmodified corpus after
the change: `[p.location for p in rule_statements() if not p.quoted and not
p.conditional]` is `[]`. Full suite (`pytest -q`) is green at 667 passed, 1
skipped — same as before this change — so splitting bullet blocks did not
turn up a bare rule statement anywhere in the real corpus (including
`docs/prompts/REVIEW_AGENT.md`'s own checklist block) that the old
whole-block unit was hiding. The 14 KB block there was the *reproduction* for
this defect, not a live masked finding — the doc doesn't currently contain a
bare rule statement in that block, only the fix-the-scan discussion text
itself, which is why the corpus sweep needed a scratch copy with an inserted
sentence (below) rather than turning up something already there.

## Left alone

Per the handoff's scope note, `tests/test_tolerance_stack.py`'s
curated-publisher logic was not touched — that's
`drop_stale_gitignore_publisher_exemption`, a separate handoff.
