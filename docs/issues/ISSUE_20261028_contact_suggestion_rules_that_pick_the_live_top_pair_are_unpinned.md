---
type: bug
priority: med
status: open
area: contact-suggestions
reporter: agent
class: geometric_deliverable_pinned_only_where_a_pure_function
found_by: docs/sessions/HANDOFF_20261028_an_interface_suggests_the_faces_that_touch.md
defer_until: docs/sessions/HANDOFF_20261029_the_contact_engine_asks_the_ends_what_shape_they_are.md
resolution: triage 2026-10-29: med beyond the budget; deferred onto the_contact_engine_asks_the_ends_what_shape_they_are, whose engine changes this issue's premise -- woke 2026-10-29 -- the_contact_engine_asks_the_ends_what_shape_they_are completed; re-triage
---

# Four contact-suggestion rules change the live linkage's answer and no test sees them

`tolerance_stack/interface_contact.py`'s tests pin the four fixtures the
handoff asked for: two plates, a pin in a bore, a ball in a socket and a
near-miss. The `[real]` half (`tests/test_contact_suggestions.py`) asserts
the schema and that each ball joint has *some* spherical candidate. Several
rules that decide **which pair is on top** of the live projection are
therefore pinned by nothing.

The review planted each mutation in the module and ran
`tests/test_interface_contact.py tests/test_contact_suggestions.py` (both
green, 22 passed, `[real]` armed against a projection built from the merged
tree). It then rebuilt the live projection under the same mutation and diffed
it against the unmutated build:

| mutation (one line) | tests | live projection |
|---|---|---|
| `ball_in_seat`: drop `ball.local.convex is not True` (a concave sphere may be the ball) | green | **top pair changes on 3 of 4 ball joints** (`pitch_arm_link_joint` link faces 104,105 → 88,89; `pitch_plate_link_joint` 140,141 → 124,125; `tan_link_mount_joint` 64,65 → 48,49) |
| `edge_candidates`: drop the "coaxial only when nothing touches" filter | green | 6 edges go from 1 candidate to 2–8; all 4 "clear" edges stop being clear |
| `cylinder_in_cylinder`: `-max_interference_mm <= clearance` → unbounded | green | 4 bearing edges go from 1 candidate to 4 (the −4.7 mm race-on-bolt-hole pairs the lesson's margin table says this bound excludes) |
| `best_of`: flip the `own` tie-break | green | `pitch_arm_link_joint` picks a different occurrence pair, one of them a borrowed slot rather than the mesh's own. The lesson's stated reason for the tie-break is that the own slots are where the annotator draws the part, so `frame-contact` may frame a place the part is not drawn |

Two more survive green with no live effect today: `_convexity`'s vote
threshold `0.9` → `0.5`, and a race seat that does not check that it is
concave. The shared-occurrence clause in the `ambiguous_with` loop also
survives, because the blade fixture's rivals share their faces.

## Suggested fix

Pin the rules, not only the four shapes:

- a fixture with a convex ball **and** a concave sphere near a bore, where the
  concave one must never be offered as the ball;
- a pin in its bore plus a second coaxial cylinder, where the coaxial pair must
  not appear while a contact exists;
- a race on a bolt hole (pin radius > bore radius + `max_interference_mm`)
  that must not be a contact;
- two tied occurrence pairs, one `own` and one borrowed, where the own pair must win;
- a `[real]` assertion pinning the top pair's face ids (or at least its
  relation and candidate count) on the four edges the lesson reports as having
  one clear top pair.

`0.9` in `_convexity` is also an inline threshold. The repo rule wants it as a
named module constant with its measured population, beside
`CONTACT_TOLERANCES`.
