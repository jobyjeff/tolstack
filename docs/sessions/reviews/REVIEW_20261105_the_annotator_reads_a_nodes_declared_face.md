---
verdict: APPROVE
handoff: the_annotator_reads_a_nodes_declared_face
---

# Review — the_annotator_reads_a_nodes_declared_face

**APPROVE.** Both deliverables are in and covered by guards, and the lesson names every site the declared face reaches.

- `AA.pickEndPartIds` arms on `face.part` alone when one is declared. `AA.endSurfaceClass` answers a declared `face.surface` first, and the old word-based fallback is unchanged. The two callers in `app.js` and `planEnd` in `suggestions.js` both go through these.
- `AA.edgePartIds` is deliberately left alone, with the reason in the lesson. Accepted: it names drawings and hover, not a pick or a class.
- Two guards, each with a mutation spec, and the annotate pin raised 280 -> 282.
- Run in the review worktree: `node apps/annotate/run_tests.cjs` 282/282. The enrollment and docs/claims pytest subset passed.
- I did not run the main-checkout tiers (viewer browser TRUTH, `--changed-since` sweep), and the lesson says the same of the author. I checked the screenshot itself: it is on `pitch_plate_attach_radius`, whose from-end is `pitch_plate_spindle_bore_axis`, and it shows "493 likely faces", where before it showed nothing. That is the worked case, reached through its edge.
- The `--only` witness runs printed only the enrollment census, so I did not see a WITNESSED line myself. I am relying on the lesson's 2/2 WITNESSED.
