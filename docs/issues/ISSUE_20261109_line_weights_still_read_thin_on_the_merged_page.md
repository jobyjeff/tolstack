---
type: feature
priority: high
status: open
area: viewer/design
reporter: agent
audience: strategy
found_by: docs/sessions/HANDOFF_20261108_the_integration_walk_reads_the_merged_page_against_jeffs_sentences.md
---

# Line weights still read thin on the merged page

Jeff, 2026-11-08 (S9): *"Line weights are still very thin."* The handoff that answered
it (`the_dag_and_grid_nest_coloured_bodies_and_compact_means_denser_rows`, item 3)
changed only the containers, as the handoff asked. Computed styles on integration
`4abddff3`, read with the page's own `getComputedStyle`:

| mark | stroke |
| --- | ---: |
| rails (`line.rail`, `path.rail__link`) | 2px |
| DAG-to-grid leaders (`path.rail__leader`) | 1.5px |
| 2D-to-3D leaders (`.seam__leader`) | 1.5px |
| body container | 1.5px |
| part container | 1.25px |
| dimension bar | 4px |

At 1600 and 2560 wide (`docs/sessions/lessons/shots/the_integration_walk_reads_the_merged_page_against_jeffs_sentences/s09_line_weights_1600.png`, `_2560.png`), the 1.5px
grey leaders and 1.25px part outlines are still the thinnest marks on the page. On a
projector they will read thinner still. The weights are a design call (rails versus
leaders versus containers, and contrast versus weight), so this goes to strategy.
Recommendation: rails 2.5–3px, leaders 2px, part containers 1.5px, and check the
look at 1920 on a projector.
