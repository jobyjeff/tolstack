# BRIEF 2026-09-14 — the hover-card mechanism needs an occlusion policy and an accessibility convention

> Routed here by the triage sweep of 2026-09-14/15 from two issues that the
> second one explicitly asks to be paired: it says the accessibility call
> "belongs with whoever owns the hover-card mechanism as a whole — the same
> owner". Both are consequences of `viewer_dag_hover_cards` (2026-09-14), and
> both set a pattern every future trigger inherits, which is why neither is a
> tactical edit.

Source issues:
- `docs/issues/ISSUE_20260914_dag_hover_card_occludes_the_marks_beneath_it.md` (med, bug)
- `docs/issues/ISSUE_20260914_absorbing_the_native_title_leaves_a_focusable_mark_with_no_accessible_name.md` (low, feature)

## 1. A DAG-side card sits over the marks the reader clicks next

The cards themselves are correct and the **layout** contract holds — the popover
is `position: fixed`, and the browser tier measures the pane box and document
height unchanged with a DAG-side card open. This is about occlusion.

1. Hover a dot near the top of the DAG. Its node card opens anchored just below
   the dot — a ~300–530px box over the diagram.
2. The card **persists**. Nothing closes on pointer-leave, and that is a landed,
   reasoned decision (`apps/viewer/views/stack.js`, `cropTrigger`'s comment): the
   pointer has to leave the trigger to reach the links inside the card, and
   closing on leave produced a leave/enter storm in 2026-08. A card closes on its
   ✕, on Escape, on an outside click, or by being replaced.
3. A click **inside** the popover is deliberately preserved — that is how the
   reference links work (`topology_app.js`'s document click handler). So the rail
   marks now under the card are unreachable by pointer: click them and you click
   the card, until the reader dismisses it.

**Why it did not bite before:** grid-side triggers have had this policy since
2026-09-10 and their cards land over the grid's right-hand edge. A DAG-side card
lands over the DAG. So the policy is not wrong in general — it is wrong for
triggers whose anchor is inside the thing being read.

The issue names a second, smaller face of the same mechanism: **a re-render
re-opens the card**, so the occlusion returns without a fresh hover. Whoever
decomposes this should confirm that face is still live before scoping it.

The decision is what an anchored-inside-the-diagram card should do: anchor
outside the DAG pane, close on the next mark's hover, become non-interactive
until clicked, or something else. It interacts with the dismissal policy above,
which is load-bearing and should not be casually reverted — the leave/enter storm
is documented history, not a hypothetical.

## 2. Absorbing the native `<title>` removed the accessible name and nothing replaced it

The "one hover surface, not two" rule is right for a sighted reader — a browser
tooltip stacked under a card says less than the card alone — but the `<title>`
it retires was also the element's **accessible name**.

The pattern already covers four triggers and predates the handoff that prompted
this:

- `.rail__barhit` and `.rail__dot` — `wire()` sets `tabindex="0"`; the card branch
  appends no `<title>` (`apps/viewer/views/topology.js`, 2026-09-14).
- the merged component cell — `tabindex="0"`, `title` retired (`componentCell`,
  `viewer_hover_cards_and_deep_links`, 2026-09-10).
- the sourcing confidence chip — same shape.

So a keyboard reader tabs onto a graph mark, the card opens on `focus` (good),
and a screen reader announces an unnamed graphic. **Measured:** `grep -rn "aria-"
apps/viewer` returns **nothing at all** — the popover is not `role="tooltip"` or
`role="dialog"`, is not an `aria-live` region, and carries no
`aria-describedby`/`aria-labelledby` relationship to its trigger.

This is a design call because the app has **no accessibility convention to
conform to yet**, and picking one sets the pattern for every future trigger.
Candidates the issue names: name the marks with `aria-label` from the same string
the card heads itself with; make `#croppop` a described-by target; both.

## Why one brief

Decided together these are one coherent answer — *what a hover card is, for a
pointer reader and for a keyboard/screen-reader reader*. Decided apart, an
occlusion fix that re-anchors or auto-closes cards would invalidate whatever
`aria-describedby` relationship the accessibility work had just established, and
vice versa. The four existing triggers mean whatever is chosen is a retrofit
across `views/topology.js`, `views/stack.js` and the confidence chip, not a
single new code path.

## Decomposition hint

The accessibility convention is worth writing down in `apps/viewer/README.md` as
a rule before it is implemented, because the retrofit spans four triggers and the
next one should not need this brief re-read. Note that tolstack has a real
browser tier (`scripts/run_viewer_browser_tests.mjs`) — an accessible-name
assertion is expressible there, so this need not be a convention nothing
witnesses. That matters here specifically: see
`HANDOFF_20260914_guard_mutation_witness_tier`, which exists because this repo
has a measured pattern of shipping correct behaviour that no tier pins.
