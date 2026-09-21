---
type: bug
priority: med
status: open
area: apps/annotate
reporter: agent
found_by: docs/sessions/HANDOFF_20260921_annotate_hint_bar_and_context_autofilter.md
---

# The annotator's precedence note calls an UNTRACED element "already cited", and prints the schema value to say so

`apps/annotate/app.js`'s `precedenceNote(edge)` fires on any edge whose
`confidence` is set and is not `no_source_ref`:

```js
if (edge.confidence && edge.confidence !== "no_source_ref") {
  return "A drawing already cites this element (confidence: " + edge.confidence + "). " +
    "The drawing wins -- a binding here only records which feature this is, it does not supply a dimension.";
}
```

`untraced` and `inferred` are both in that set, so an **untraced** element —
the only kind the viewer offers an "annotate this →" link for at all
(`VA.needsAnnotation`) — is told *"A drawing already cites this element
(confidence: untraced)"*. That is false on the sentence's own terms, and it
appears on essentially every element a reader arrives at from the stack
viewer.

Two defects in one string:

1. **The condition is wrong.** The precedence guard
   (`docs/ANNOTATION_SURFACE.md`, decision 6) is about a *real* citation
   winning over a binding. `untraced` means the opposite — no citation — so
   the note should key on the confidences that ARE citations
   (`VA.CONFIDENCES`' traced/inferred side), not on "anything but
   `no_source_ref`".
2. **It prints a schema value at the reader.** `(confidence: untraced)` is
   the raw projection word, on a surface whose whole alert vocabulary was
   moved out of schema values on 2026-09-16
   (`AA.BINDING_STATE_ALERTS`, and the guard in `apps/annotate/run_tests.cjs`
   that forbids an underscored identifier in one). The note is built inline in
   `app.js` and so is reachable by no tier: lifting it into a constant beside
   the other word tables is what would let the existing scan see it.

## Repro

`apps/annotate/index.html?mock=1&topology=demo_system&edge=demo_edge_untraced`
— the fixture's `demo_edge_untraced` carries `confidence: "untraced"`, and the
red-spined note appears at the top of the bar reading "A drawing already cites
this element (confidence: untraced)".

## Why it was not fixed in place

Found while moving `#detail` into the top bar
(`annotate_hint_bar_and_context_autofilter`, 2026-09-21). The handoff was
about *where* that pane lives, not about which elements the precedence guard
fires on — and deciding the second is a real call about the confidence
vocabulary, not a typo. The move made it more visible (the note is now a
full-width band at the top of the canvas rather than a paragraph in a 320px
column), which is how it was noticed.
