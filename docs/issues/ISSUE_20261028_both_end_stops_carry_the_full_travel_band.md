---
type: bug
priority: med
status: deferred
area: kinematic study / travel between end stops
reporter: agent
audience: strategy
found_by: docs/sessions/active/HANDOFF_20261028_the_kinematic_study_reads_like_every_other_study_and_its_plot_shows_both_tolerances.md
class: band_attributed_to_the_wrong_member
defer_until: 2026-11-12
resolution: triage 2026-10-29: med beyond the budget (3 staged), deferred 14 days
---

# Both end stops carry the full travel band, and the travel study's nominal is not the sweep's stop

The blade-pitch study (`vpa_pitch_linkage_blade_pitch_at_the_stops`) takes the
travel between the end stops (`vpa_pitch_linkage_travel_between_end_stops`) as a
contributor at **both** stops, each with the whole ±0.82 mm worst case
(±0.5616 RSS) scaled by that stop's motion ratio. The viewer's chart now draws
that as a band on x at each stop and says so in one line under it, linking here.
The fold (`tolerance_stack/kinematic.py`, `study_ref_group` / `fold_at`) was
deliberately not changed in that handoff.

Measured 2026-10-28 against `kinematic_studies.json`:

| stop | driver (mm) | J (deg/mm) | travel reach (deg) | direct (deg) | worst case (deg) | margin vs ±0.5 |
|---|---|---|---|---|---|---|
| −7° (point 0) | 64.466 | −1.728 | 1.417 | 0.290 | 1.707 | −1.207 |
| +72° (point 79) | 0.000 | −1.249 | 1.024 | 0.315 | 1.339 | −0.839 |

## (a) Which stop should carry the travel band?

The sweep's driver is measured from full extension: S461-610/636 put 0 mm at
full extension, the +72° stop. If that stop is the datum the actuator
travel is measured from, its position is not a tolerance of the travel
study at all (it is where the coordinate starts), and only the far stop
(−7°, driver 64.466) moves by the travel's ±0.82 mm. Read that way the
+72° stop's 1.024° of travel reach is double-counted, and its worst case
would be the direct 0.315°, a margin of +0.185 against ±0.5.

The other reading keeps both: if the actuator's own zero (the rod-end and
piston position at full extension) is located by parts whose tolerances the
travel study already holds, the +72° stop moves too, but then by *those*
terms, not by the whole stop-to-stop distance.

Either way the stop-to-stop distance is one number shared by two stops,
and applying its whole band at each stop independently treats it as two.
Options for a strategy session (Jeff's ruling on the physics):

1. Only the −7° stop carries the travel band (the +72° stop is the datum).
2. Split the travel study into what locates each stop from the actuator's
   zero, and give each stop its own part.
3. Keep both, and record why the +72° stop's zero is itself uncertain by
   the whole travel.

Recommendation: 1 unless Jeff knows the actuator's zero to be located by
the same parts; it is the reading the S461-610 coordinate definition gives.

## (b) 64.44 is not 64.466

The travel study's nominal is 64.440 mm (Jeff's 2026-10-20 correction against
the CATIA kinematic model; the study's notes record 64.465 from the section
first). The sweep (run P2) solves the −7° stop at driver 64.466 mm. The
chart draws the band about the sweep's stop and its x axis now reads
"(swept 0.000–64.466; travel study nominal 64.440)". A 0.026 mm difference
in nominal is small against a ±0.82 band but it is two sources for one
dimension: which one is the stop?
