---
type: chore
priority: low
status: resolved
area: tolerance_stack/topology
reporter: agent
resolution: both comments in tolerance_stack/topology.py now name VA.MAP_SYMBOLS, VA.INTERFACE_KIND_WORDS and "Joint symbols"
found_by: docs/sessions/active/HANDOFF_20261117_the_map_is_the_only_drawing_and_classic_retires.md
handoff: docs/sessions/HANDOFF_20261117_the_filmstrip_boots_on_the_map_and_the_rails_residue_goes.md
---

# `tolerance_stack/topology.py`'s comments name the retired joint-glyph file and section

Handoff `the_map_is_the_only_drawing_and_classic_retires` (2026-11-17) retired
the rails drawing, and with it `apps/viewer/interface_glyphs.js` (the rails'
joint glyphs). Its everyday words moved to `apps/viewer/topology.js`
(`VA.INTERFACE_KIND_WORDS`), and `docs/DAG_TOPOLOGY.md`'s "Joint glyphs — the
joint is the node" became "Joint symbols — what a joint is drawn as" (the
map's symbols are `VA.MAP_SYMBOLS` in `apps/viewer/map.js`).

The handoff fenced `tolerance_stack/` out of scope, so two comments there
still point at what is gone:

| Where | Says | Should say |
|---|---|---|
| `tolerance_stack/topology.py`, the `INTERFACE_KINDS` comment (`#: word is one glyph, one SVG <symbol> in apps/viewer/interface_glyphs.js`) | each word is a glyph in a file that no longer exists | each word is one symbol on the map (`VA.MAP_SYMBOLS`, `apps/viewer/map.js`) and one everyday word (`VA.INTERFACE_KIND_WORDS`, `apps/viewer/topology.js`) |
| the same block (`Paired against docs/DAG_TOPOLOGY.md, "Joint glyphs"`) | a section name that changed | `"Joint symbols"` |

Comment-only; no test reads either line. A one-line edit each for whichever
handoff next touches `tolerance_stack/topology.py`.

## 2026-11-17 triage sweep

Folded into `docs/sessions/HANDOFF_20261117_the_filmstrip_boots_on_the_map_and_the_rails_residue_goes.md` (same cause, comment-only). Source: dispatch/docs/sessions/lessons/LESSONS_20261117_triage_sweep.md.
