---
priority: high
depends_on: []
model: opus
hitl: false
---

# HANDOFF 2026-11-18 — a_disagreement_is_settled_by_keep_or_let_go: Keep settles a feature whose faces disagree, and the feature can always be let go

Source: Jeff's note `20261117T224550_onme22` (2026-11-17): "no way to cancel a
selection (pitch link bore got 6 faces selected which 'disagree', clicking
'keep' seemed to do nothing, and there was no way to cancel them)"; traced
read-only by the 2026-11-18 strategy session
(`dispatch/docs/strategy/HANDOFF_20261117_strategy.md`). Baseline: master
`bcd43d9e` or later. Scope: `apps/annotate/app.js` (the bind, add-a-face, keep
and unbind commands), `apps/viewer/identity_fold.js`, the disagree branch of
`VA.featureBodyPlan` in `apps/viewer/views/nav.js`, and their tests. Do NOT
touch the joint Preview's words in `nav.js` (staged:
`a_joints_preview_says_what_the_joint_is`), `scripts/filmstrip.mjs` (staged:
`the_filmstrip_boots_on_the_map_and_the_rails_residue_goes`), the map
(`apps/viewer/views/map.js`) or the suggestion ranking
(`apps/annotate/suggestions.js`).

**Jeff's real binding log is read-only here:**
`C:\workspace\tolstack\data\inbox\feature-identity\` holds 101 files (events
0001–0100 and a README). Count its files before and after; every bind, keep or
unbind you try goes to a scratch data root holding a copy.

## What happened, from Jeff's log (events 0093–0100)

Feature `pitch_plate_link_attach_bore` on part `pitch_plate_215177_001`
(topology `vpa_pitch_linkage`), mesh `37e9f606…`:

| Event | What it is | Faces |
|---|---|---|
| 0093, 0094 | the same bind written twice, 3 ms apart, both `seq: 93` | 1380, 1381 |
| 0095 | "Add a face", written as a plain `bound`, not a correction | 1380, 1381, 1509, 1510 |
| 0096–0100 | five Keeps, each one more plain `bound` over the same four faces | 1380, 1381, 1509, 1510 |

So the page said "6 faces disagree" (2 + 4), and each Keep added an event that
changed nothing. Read in the code on master:

- `writeFeatureSet` (`apps/annotate/app.js:3439-3447`) writes a correction only
  when exactly one feature-keyed binding stands. With two (the double write)
  it writes a plain `bound`, which is how 0095 made a second group.
- `cmdKeep` (`apps/annotate/app.js:3391-3409`) writes a plain `bound` with no
  `supersedes`. `outcomeOf` (`apps/viewer/identity_fold.js:241-270`, and `:330`)
  lets a feature-keyed event replace faces read through an edge, but between
  two feature-keyed events the new one only joins its group. Keep can therefore
  never settle a disagreement between feature-keyed bindings.
- The disagree body (`apps/viewer/views/nav.js:1109-1116`) offers Keep per face
  and "Pick a face", and nothing else. `unbind` (`apps/annotate/app.js:3356`)
  would clear it but is not offered, and an add-mode pick is refused
  (`apps/annotate/app.js:3682-3685`).
- Faces 1509 and 1510 are on solid 4 of that mesh (a bushing); 1380 and 1381
  are on solid 0 (the plate). That the bore's faces sit on two solids is real
  and is the next handoff but one's subject, not a defect here.

## Deliverables

1. **Keep settles it.** After Keep on a face, the feature's binding is the
   group holding that face and the page no longer says the faces disagree —
   whatever mix of feature-keyed and read-through bindings stood before.
   Earlier events stay in the log as history. Suggestion: Keep writes a
   correction that supersedes every other standing feature-keyed binding of the
   feature; if the fold is the better place, say why in the lesson.
2. **A feature can always be let go.** Wherever a feature's body shows faces
   (bound, disagreeing, or a pick armed), one action returns it to unbound, and
   an armed pick can be cancelled from the body as well as by Escape. Everyday
   words on the buttons; no internal names.
3. **One click writes one event.** Find why 0093 and 0094 were both written
   (same `seq`, 3 ms apart) and close that path. If the cause cannot be
   reproduced, say what you tried and make a second write with a `seq` already
   on disk impossible to produce from the page.
4. **Adding a face to a feature with more than one standing binding** writes
   one event that leaves one standing binding, the union the user sees.
5. **Jeff's own log settles with his next click.** Fold a copy of the real
   log, press Keep once on face 1380 in the served page, and the feature reads
   bound to that group with no disagreement. Do the same on a second copy with
   "let go". Write neither into the real log: Jeff presses it himself.
6. **Every site the outcome reaches:** the tree row, the feature body, the
   map's feature marker, the 3D pane's lit faces and the sweep rail's counts
   all read the same settled state after Keep and after let go. Name any you
   leave alone and why.

## Definition of done

- Tests, value-level, against a fixture that reproduces 0093–0100's shape
  (two identical binds, one four-face bind, then Keep): one standing binding
  after Keep; unbound after let go; one event per click; add-a-face over two
  standing bindings leaves one.
- Default and browser tiers green per `CLAUDE.md`.
- **Look at the merged page with vision** (served from your branch on the
  drawing-checker mount shape, data rebuilt into a scratch root from a copy of
  Jeff's log): shots of the feature before Keep ("6 faces disagree"), after
  Keep, and after let go, each read before the lesson is written.
- The real log's file count is 101 before and after.
- Lesson (`docs/sessions/lessons/LESSONS_20261118_a_disagreement_is_settled_by_keep_or_let_go.md`):
  the cause of the double write, where the settling lives (event or fold) and
  why, the three shots, the file counts, and the one click Jeff makes on his
  own page to clear `pitch_plate_link_attach_bore`.
