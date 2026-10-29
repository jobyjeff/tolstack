---
type: bug
priority: med
status: deferred
area: tests/mutation-witness
class: decayed_witness
reporter: agent
found_by: docs/sessions/HANDOFF_20261026_the_full_registry_leaves_the_merge_gate.md
defer_until: docs/sessions/HANDOFF_20261029_the_grid_header_rides_its_rows_on_merged_trunk.md
resolution: triage 2026-10-29: 30 of the 34 are 'tier red before the mutation', so the unmutated browser tier is the shared cause; the merged trunk's browser red is staged as the_grid_header_rides_its_rows_on_merged_trunk (plus viewer_browser_checks_wait_on_settled_state for the load races); deferred onto that slug so the next sweep re-reads the 34 against a green tier
---

# Witness sweep 2026-10-28: 34 of 460 declared mutations no longer witnessed

Trunk `04266cf55b67`, `--full`, wall time about 1h52m (run + sweep-tier lock tests: 2 passed). 426/460 witnessed. 30 of the 34 are "the tier was red before the mutation": the browser tier was already red on unmutated trunk, which points at a shared cause (many are scene/flyout/embedded-kinematic checks), not 30 separate decays. Check the unmutated browser tier first.

Verdict lines, verbatim:

```
NOT WITNESSED — an enrolled guard that no longer reddens:
  browser__and-it-sits-to-the-panel-s-right-which-is-what-beside-me__237dba65 — the tier was red before the mutation, so nothing was proved
  browser__closing-the-flyout-puts-the-page-back-exactly-the-nav-ra__c85739df — the tier was red before the mutation, so nothing was proved
  browser__dragging-the-divider-left-narrows-the-flyout__44d881ae — the tier was red before the mutation, so nothing was proved
  browser__no-seam-the-scene-column-is-the-page-s-background-with-n__b4c1a2ea — the tier was red before the mutation, so nothing was proved
  browser__opening-the-flyout-moves-the-dag-pane-out-from-under-it__8ce9bd17 — the tier was red before the mutation, so nothing was proved
  browser__pointed-at-the-same-url-the-panel-booted-with-less-the-e__208d84ab — the tier was red before the mutation, so nothing was proved
  browser__real-a-camera-move-posts-the-anchors-again__fbf9b5b0 — the tier was red before the mutation, so nothing was proved
  browser__real-a-joint-line-runs-between-the-two-bodies-anchors-re__95f00675 — the tier was red before the mutation, so nothing was proved
  browser__real-a-selected-node-shows-the-plane-and-the-cut-its-anc__d0fe9cf2 — the tier was red before the mutation, so nothing was proved
  browser__real-a-structural-line-rides-its-body-drawn-in-the-body__85040aa4 — the tier was red before the mutation, so nothing was proved
  browser__real-a-synthetic-binding-moves-exactly-one-node-to-its-b__389dc6f7 — the tier was red before the mutation, so nothing was proved
  browser__real-bind-mode-draws-the-whole-model-at-the-as-modelled__5df95a14 — the tier was red before the mutation, so nothing was proved
  browser__real-clicking-a-contributor-row-with-the-pane-open-keeps__d42adbc7 — another check reddened, but not the declared one
  browser__real-embedded-on-p2-the-scene-builds-the-model-layer-by__6f8fd0fb — the tier was red before the mutation, so nothing was proved
  browser__real-embedded-on-the-kinematic-page-the-scene-draws-the__92c8b346 — the tier was red before the mutation, so nothing was proved
  browser__real-every-node-of-the-merged-model-has-an-anchor-and-ev__0545b398 — the tier was red before the mutation, so nothing was proved
  browser__real-switching-topology-keeps-the-density-the-length-mod__24d58bf9#1 — the witness cannot see the difference
  browser__real-switching-topology-keeps-the-density-the-length-mod__24d58bf9#2 — the witness cannot see the difference
  browser__real-switching-topology-keeps-the-density-the-length-mod__24d58bf9#3 — the witness cannot see the difference
  browser__real-switching-topology-keeps-the-leader-style-too__d25818b3 — the witness cannot see the difference
  browser__real-the-hub-s-internals-sit-on-the-hub-s-x-side-as-a-la__1dcf8600 — the tier was red before the mutation, so nothing was proved
  browser__real-the-pitch-link-and-tan-link-lines-are-the-stick-fig__e501a078 — the tier was red before the mutation, so nothing was proved
  browser__real-the-shell-receives-annotate-anchors-with-every-node__cb2c5ac1 — the tier was red before the mutation, so nothing was proved
  browser__real-the-shell-s-word-rules-the-rest-hide-leaves-only-th__251f823a — the tier was red before the mutation, so nothing was proved
  browser__real-the-tan-link-mount-s-bore-anchors-on-its-x-intersec__242d7e68 — the tier was red before the mutation, so nothing was proved
  browser__real-until-the-shell-posts-a-lit-set-the-open-study-s-co__5d72e1d7 — the tier was red before the mutation, so nothing was proved
  browser__real-with-no-binding-in-the-inbox-no-anchor-is-a-bound-f__2bb20a42 — the tier was red before the mutation, so nothing was proved
  browser__the-embedded-annotator-boots-to-the-pre-grant-state-it-a__73fc7a11 — the tier was red before the mutation, so nothing was proved
  browser__the-nav-stays-at-the-far-left-with-the-scene-open-so-a-s__85be7f34 — the tier was red before the mutation, so nothing was proved
  browser__the-preview-pane-stands-down-while-the-scene-is-open-on__8467e314 — the tier was red before the mutation, so nothing was proved
  browser__the-scene-sits-between-the-nav-and-the-dag-the-nav-at-th__418aaf46 — the tier was red before the mutation, so nothing was proved
  browser__the-study-s-respine-transition-settles-before-any-of-its__9f6ba52e — the tier was red before the mutation, so nothing was proved
  browser__under-file-the-study-s-respine-transition-settles-too-be__2014a8df — the tier was red before the mutation, so nothing was proved
  python__test-every-established-export-lists-exactly-the-runs-the__5afb2dce — the tier was red before the mutation, so nothing was proved
```

Re-check one entry with `node scripts/run_mutation_witness_tests.mjs --only <id>` (id = the name above, e.g. `browser__and-it-sits-to-the-panel-s-right-which-is-what-beside-me__237dba65`; from a worktree add `--repo C:/workspace/tolstack`).
