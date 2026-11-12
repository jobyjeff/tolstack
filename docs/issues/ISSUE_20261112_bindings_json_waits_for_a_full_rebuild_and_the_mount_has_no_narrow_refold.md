---
type: feature
priority: low
status: open
area: drawing-checker mount / rebuild route
reporter: agent
found_by: docs/sessions/active/HANDOFF_20261112_a_binding_shows_the_moment_it_is_made_and_is_corrected_where_it_is_shown.md
---

# `bindings.json` is refreshed only by a full rebuild, and the mount offers no narrow refold

**What changed on 2026-11-12:** the pages no longer depend on
`data/projections/feature-identity/bindings.json`. They read the served log
(`data/projections/viewer/feature-identity/log.json`) and fold it in the
browser. The annotator rewrites that file through its folder grant after every
event it writes. A reload on 8000 now shows a bind with no rebuild.

**What did not change:** `bindings.json` is still what every Python reader
uses: `scripts/fit_bound_features.py`, the contact suggestions and the
proposer's refusals. It is refreshed only by
`scripts/rebuild_projections.ps1`, step 5. drawing-checker's only route,
`POST /tolstack/rebuild` (`webui/tolstack_rebuild.py`), runs the whole script.

**Measured:** the 2026-11-11 21:05 rebuild wrote `topologies.json` at
21:05:58 and the kinematic projection at 21:12:44, about 6 m 46 s. The
contact-suggestions step accounts for most of that. Step 5 alone takes a few
seconds. A full rebuild per bind is too slow and too heavy to call from the
page, so the handoff did not call it. (Its own docstring still says "~30s";
that figure is stale.)

**Ask (a drawing-checker handoff, not tolstack's):** a narrow route, e.g.
`POST /tolstack/refold-bindings`, that runs only
`venv-win\Scripts\python.exe scripts\build_feature_identity_projection.py` in
tolstack's main checkout. It would be single-flight and coalesced like the
rebuild runner. The annotator would call it after a write, so the Python
readers see a bind as soon as the pages do. Until it exists, `bindings.json`
lags the log until the next rebuild. Nothing a person looks at reads it now.
