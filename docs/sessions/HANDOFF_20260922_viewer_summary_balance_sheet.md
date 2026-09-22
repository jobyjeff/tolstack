---
priority: high
depends_on: [viewer_nav_verdict_into_alert_and_icon]
model: opus
---

# HANDOFF 2026-09-22 — viewer_summary_balance_sheet: the study summary reads like a balance sheet, not an essay

Source: Jeff, 2026-09-22 strategy session, verbatim — this is the calibration
for the whole handoff, so it is quoted whole:

> "TBH it's slowly improving but the entire page is still extremely busy and
> difficult to make sense of. The last part that really needs attention is the
> study summary (bottom pane). Still tons of long-winded text explanations,
> very unconventional and confusing layout (the weird ribbon of random values
> in circled elements at the top, no real thought put into the explanations).
> […] The components of the stack are already arranged into a table/grid,
> simply put the computed/rolled up values in the same grid at the bottom,
> like a balance sheet/invoice etc. Anything that doesn't fit neatly into the
> main table can go in additional tables and/or a 'card' with parameter/value
> pairs (like the way a single row of a database table would be displayed on
> a card in a webui). It shouldn't be that complicated to make tabular data
> look clear, concise and easy to interpret."

Texts he called out as "poorly worded, excessively long, needlessly confuse
the reader" (both render in the summary pane today):

> "This answer does not include everything the joint needs, so it is a budget
> for what is missing rather than a verdict on the hardware. Missing: •
> MS9363-09 nut height and thread-start-to-castellation distance -- the
> height is printed in MS9363 Rev C (spec-library subject MS9363-09,
> H = .178/.198 in) but deliberately not folded, because the quantity that
> decides cotter installability is the castellation PHASE, which no document
> controls (JPS00094 5.9.7's washer-swap procedure is the remedy); folding
> the height alone would dress an unanswerable alignment question as a
> linear one"

> "3 dimensions in this chain are unverified — nothing readable stands behind
> them: washer thickness, NAS1149V0332H (.032 in); pitch-link eye: spherical
> bearing ball width (bearing identity UNCONFIRMED); plain bushing length
> (214820-002)."

Baseline: trunk `master` after `viewer_nav_verdict_into_alert_and_icon`
merges (its `depends_on` — both touch viewer CSS and serializing avoids a
pointless conflict). Scope: the summary/detail pane views
(`apps/viewer/views/` — measure which of `stack.js` / `worksheet.js` /
`detail.js` / `cards.js` own the pieces in the screenshot: the chip ribbon,
the verdict statement, the Why/Details disclosures, "What's missing"),
`topology.css` / `style.css`, viewer tests. Do NOT touch the nav
(just merged), the annotate app, or `topology.js`'s graph canvas.

## Deliverables

1. **The chip ribbon dies.** The row of circled values at the top of a check's
   summary (`nominal 3.1662 mm`, `worst case 2.3296 … 4.3098 mm`,
   `worst-case half ±0.9901 mm`, `RSS …`, `RSS half …`, `weakest input:
   UNTRACED`, unit chip, contribution count) stops being a ribbon of pills.
   Its numeric content moves into item 2; its status content (weakest-input,
   completeness) into item 3's structured findings.
2. **Rolled-up values are footer rows of the contributions grid.** The stack's
   members are already a table; the computed results (nominal, worst-case
   min/max, worst-case half-width, RSS min/max, RSS half-width, the margin
   the verdict is judged on, the criterion/limit when one exists) render as a
   visually distinct totals section at the bottom of that same grid — the
   balance-sheet/invoice idiom Jeff named. Same units column discipline as
   the member rows; the verdict word sits with the margin row, once.
3. **Anything that doesn't fit the grid goes in cards of parameter/value
   pairs** — the database-row-on-a-card idiom: small labeled key/value
   blocks (e.g. measurement basis, criterion source/citation, weakest
   input), never sentences doing a table's job.
4. **Findings become structured rows, not essays.** Each missing input,
   unverified dimension, or gap renders as one concise row: the item's name,
   its one-line plain-language reason ("not folded — castellation phase is
   what decides installability, and no document controls it"), and the full
   authored rationale behind a per-row disclosure. The two quoted texts
   above are the acceptance cases: after this handoff each reads at a glance
   as a short labeled list with detail on demand. **Compress the wording,
   never the facts** — the cite-or-gap discipline is the repo's spine; every
   citation, caveat and named document survives, one click deeper. Where the
   prose is *generated*, fix the generator wording; where it is *authored
   data* (stack/analysis files), restructure the rendering (name + reason
   split from rationale) rather than editing analysis truth — and record in
   the lesson which of the two each surface turned out to be.
5. **UI-copy rules apply throughout** (Jeff's standing philosophy, pinned in
   this workspace): no paragraph explanations of mechanics, no internal
   names, everyday words on badges, every claim expandable to its evidence.
   Check `apps/viewer/reader_facing_bans.js` and extend it with any wording
   class this pass bans.

## Definition of done

- Against the live projection, the "Cotter hole clearance" check
  (`pitch_link_cotter_hole_clearance`, the screenshot case): renders as
  contributions grid + totals section + findings rows + card(s), no chip
  ribbon, no visible paragraph longer than ~2 lines without a disclosure;
  before/after screenshots in the lesson.
- The other six live stacks render through the same layout without special
  cases (spot-check one thermal-fit stack — the `joint.assembly` spelling).
- Viewer test suite green; reader-facing-bans green.
- Lesson (`docs/sessions/lessons/LESSONS_20260922_viewer_summary_balance_sheet.md`):
  the generated-vs-authored split found in item 4, and the totals-section
  markup pattern so the annotate flyout and d-c's analyses panel can copy it.
