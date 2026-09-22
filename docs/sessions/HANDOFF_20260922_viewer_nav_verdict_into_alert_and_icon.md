---
priority: high
depends_on: []
model: opus
---

# HANDOFF 2026-09-22 — viewer_nav_verdict_into_alert_and_icon: nav rows drop the verdict chip; one legible status icon carries everything

Source: Jeff, 2026-09-22 strategy session, reviewing the live viewer with the
just-merged `viewer_nav_alert_badge_and_angled_default`: "get rid of the
pass/fail in the left side menu (move it into the alert along with all the
other alerts). Also reformat the alert icon: get rid of the rounded border
around it, make the actual icon larger so it's legible (or replace it with a
proper icon/emoji rather than a character)."

This supersedes half of the 09-21 decision that nav rows "keep the verdict
chip" — Jeff reversed it looking at the result: rows carrying a PASS or
dashed MARGINAL pill *plus* a bordered ⚠ chip read as two competing badges
per row and the ⚠ glyph is illegibly small inside its rounded border.

Baseline: trunk `master` with the 09-21/09-22 batch merged. Scope:
`apps/viewer/views/nav.js`, `apps/viewer/topology.css` / `style.css` as
needed, viewer tests. Do NOT touch the annotate app (`apps/annotate/`), the
worksheet/summary pane (owned by the staged
`viewer_summary_balance_sheet`), or the check-detail cards' own verdict
rendering — this is the left-hand nav only.

## Deliverables

1. **No verdict chips in the nav.** PASS / FAIL / MARGINAL pills leave the
   nav rows entirely. The row's one status affordance is the alert icon; its
   hover content (the annotate-rail pattern the 09-21 handoff established)
   now leads with the verdict in plain words, followed by the other alerts
   (UNVERIFIED / INCOMPLETE / no criterion, as today).
2. **The icon itself becomes legible.** Remove the rounded/dashed border
   ("chip" framing) around it; render the glyph larger, or replace the text
   character with a proper icon (inline SVG or an emoji-class glyph) —
   whichever survives the type scale legibly at nav row size. Suggestion,
   not binding: the single icon may still carry coarse state (color or
   shape distinguishing "fine" / "look here") so a scan of the nav isn't
   blind — but words live in the hover, never abbreviations on the row.
   Check `apps/viewer/reader_facing_bans.js` before choosing copy.
3. **Every nav tier is consistent** — stacks, studies, checks: whatever a row
   showed before (chip + icon, chip only, icon only) maps onto the one-icon
   scheme, and a row with a clean verdict and zero alerts shows either
   nothing or the quiet variant of the icon (pick one, apply everywhere).

## Definition of done

- Against the live projection (`data/projections/viewer/results.json`, main
  checkout): the nav renders with zero verdict pills, one legible status icon
  per flagged row, hover showing verdict + alerts in plain words; screenshot
  in the lesson at 100% zoom demonstrating legibility.
- Viewer test suite green (`node apps/viewer/run_tests.cjs` or the repo's
  standard runner); reader-facing-bans checks pass.
- Lesson (`docs/sessions/lessons/LESSONS_20260922_viewer_nav_verdict_into_alert_and_icon.md`):
  the icon choice (glyph vs SVG vs emoji) with why, and the quiet-row
  decision, so the annotate rail can copy both.
