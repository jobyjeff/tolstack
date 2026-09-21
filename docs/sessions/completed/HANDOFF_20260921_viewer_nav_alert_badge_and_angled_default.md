---
priority: high
depends_on: []
model: opus
---

# HANDOFF 2026-09-21 — viewer_nav_alert_badge_and_angled_default: nav alerts fold into one ⚠; leaders default angled

Source: Jeff, strategy session 2026-09-21, reviewing the live viewer
(screenshot on file with the session): the left-side stack/study nav rows
still wear a row of loud chips — `PASS` beside `UNVERIFIED`, `INCOMPLETE`,
`no criterion` — and "the alerts still haven't been replaced with a single
triangle ! (hover over to see details)". He confirmed the annotate rail's
badge is exactly the wanted shape, "same purpose, just in a different place".
Baseline: trunk `master` with the 2026-09-18 batch merged. Scope:
`apps/viewer/` and its tests only; do NOT touch `apps/annotate/` (a parallel
staged handoff owns it: `annotate_hint_bar_and_context_autofilter`).

## Deliverables

1. **One ⚠ per nav row, words on hover.** On the left nav's study rows, the
   **verdict chip stays** (PASS/MARGINAL/FAIL — the disposition is the
   headline) and every *alert* chip folds into a single ⚠ badge whose hover
   popup lists the alerts as plain-language sentences: unverified,
   incomplete-chain, no-criterion, and whatever other non-verdict states those
   rows can carry (find the full set from the renderer — the chip styles are
   `topology.css:1009-1011`, `.tvflag--unverified` / `.tvflag--incomplete`).
   A row with nothing wrong shows the verdict alone — the standing
   nothing-wrong-shows-NOTHING rule. The shipped precedent to match (not
   necessarily share code with — different app namespace): `apps/annotate/
   binding_state.js` (`BINDING_STATE_ALERTS` / `ALERT_ICON` / `elementAlerts`)
   plus `alertBadge`/`showAlertPop` in `apps/annotate/app.js:536-` — one
   glyph constant, an alerts table keyed by state so the vocabulary cannot
   drift, hover popup, aria-label carrying the words. Whether "no criterion"
   is an alert or a muted informational mark is the agent's call — the rule
   is: verdicts stay chips, everything that asks the reader to act or
   distrust folds into the ⚠.
2. **Leader lines default to angled.** Jeff: "angled by default (jogged isn't
   really usable yet and arguably isn't worth putting more effort into since
   the angled lines look just fine)." The toolbar toggle stays
   (`apps/viewer/README.md` §leaders documents "Jogged is the default" —
   flip the default to angled wherever the preference initialises, update that
   README sentence, and update whatever test pins the default). Add a dated
   note in the README that jogged is kept but deprioritized — no further
   investment without a new decision — so the next viewer session doesn't
   re-polish it.

## Definition of done

- Against the live projection (main checkout `data/projections/viewer/`):
  the pitch-link and pitch-system nav rows render verdict + at most one ⚠
  each, hover lists the folded alerts in full sentences, and a fresh
  (preference-less) load draws angled leaders.
- `node apps/viewer/run_tests.cjs` and the browser tier green in the main
  checkout; changed pins updated at value level.
- Lesson (`docs/sessions/lessons/LESSONS_20260921_viewer_nav_alert_badge_and_angled_default.md`):
  the final alert-state inventory for nav rows (which states fold, which
  stay), and where the leader default actually lived.
