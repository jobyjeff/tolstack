---
type: bug
priority: med
status: resolved
area: tests/doc-scans
reporter: agent
audience: strategy
found_by: docs/sessions/HANDOFF_20260917_prose_guards_scope_out_strategy_briefs.md
---

# The byte-identity scan is the one claim scan with no quotation exemption, so a superseded sentence cannot be quoted anywhere it reads

Noticed while repointing the claim-shape scans off `docs/strategy/BRIEF_*.md`
(`prose_guards_scope_out_strategy_briefs`, 2026-09-17). Not fixed inline: it is a
change to a guard's verdict on a real document, which that handoff put out of
scope, and the call is a design one rather than a fix.

## What

This repo has one convention for correcting a number or a claim a review already
read: **leave the old one visible and mark it as a quotation** — a markdown
blockquote line, or an inline `"…"` span where blockquotes are unavailable (JSON,
a mid-sentence correction). Three of the four claim-shape scans implement it in
the same place:

* `tests/test_tolerance_stack.py`'s `_quoted_spans()` — read by the
  hardware-entry-count scan and the traced-ratio scan, both halves pinned by
  `test_the_hardware_entry_count_guard_can_fail` and
  `test_the_traced_ratio_guard_can_fail`.
* `tests/test_thermal_exception_list.py`'s `passages_in()` — recomputes the same
  two forms, with a comment saying why it cannot import them.

The fourth, `tests/test_provenance.py`'s `claims_in()`, has **no quotation
exemption at all**. It recognises only a *negation* immediately before the phrase
(`_NEGATED_RE`, over the preceding 24 characters), so:

```
> the viewer's behaviour is byte-for-byte what `x` shipped   # still an asserted claim
it read "... is byte-for-byte what `x` shipped" until 09-16  # still an asserted claim
```

Both come back `kind="asserted"` and both demand a verification pointer in the
same block.

## Why it matters

The consequence is that a sentence this guard has already corrected cannot be
quoted in any file the scan reads — which is nearly every tracked `.md`, `.py`,
`.json`, `.toml`, `.js` and `.ps1` in the repo. Concretely, in this handoff:

* the 2026-09-15 sentence could not be quoted in a code comment in
  `tests/test_tolerance_stack.py` explaining the defect the change exists to fix.
  The comment had to paraphrase it instead, and the verbatim sentence went into
  `tests/test_provenance.py` — the only file the scan exempts (`_SELF`);
* the other three scans each got the real sentence quoted verbatim next to their
  witness, which is what makes those witnesses replays rather than mimicries.

So the guard's own history is the material it makes hardest to write down, and
the workaround — put the evidence in the scanned module itself — is the one place
the repo already flags as narrow and deliberately exempt.

## The design question

Adopting `_quoted_spans()` here is not obviously right, and that is why this is
`audience: strategy` rather than a staged fix. Arguments both ways:

* **For.** One convention, four scans; a correction note is a report, not a
  claim, and this repo has settled that everywhere else. The asymmetry is
  currently undocumented and surprising.
* **Against.** The byte-identity claim is the one this repo has watched go false
  five times, all five caught by a reviewer and none by an author
  (`tests/test_provenance.py`'s module docstring). A blockquote is cheap to
  write, so a quotation exemption is also a one-character way to silence the
  strictest guard in the repo — and unlike a stale *number*, a stale identity
  claim is not re-derivable from the tree, so nothing else would catch it.

If the answer is "for", the smallest shape is to import `_quoted_spans` (or
recompute it as `passages_in` does, since `claims_in` is deliberately pure and
line-oriented) and add the two-form silence assertions to
`test_the_grep_catches_the_reconstructed_sighting_three`'s neighbourhood, the
way the other three guards pin theirs. If the answer is "against", the asymmetry
should be written into `claims_in`'s docstring as a decision, so the next author
reads it as a choice rather than an oversight.

---

## Resolved 2026-09-24 — the third way out was taken

Neither "for" nor "against": `claims_registry_guards_read_declarations_not_prose` (2026-09-23) deleted the scan. `claims_in()`, `_CLAIM_RE`, `_POINTER_RE` and `_DEFINITION_RE` are gone from `tests/test_provenance.py`; a byte-identity claim is now a `byte_identity` declaration naming both sides, and `tests/claims_registry.py` **compares the bytes** instead of asking the prose to name a verification. So there is no prose scan to exempt anything from, and the "against" argument's worry is answered from the other direction rather than traded away: a declared identity is re-derived on every run, so silencing it with a blockquote is not available — deleting the declaration is, and the presence guard `test_every_declared_byte_identity_claim_is_verified_by_comparing_bytes` reddens on that.

Verified in review rather than taken from the handoff's summary: the four declared claims (the two end-stop studies' `#/selection` and `#/transforms`) resolve and agree, and appending the verbatim claim sentence unbacked to a live document flags nothing anywhere.
