---
type: review
handoff: docs/sessions/active/HANDOFF_20260916_crop_lightbox_zoom_viewer.md
reviewer: agent
date: 2026-09-17
verdict: APPROVE
blockers: 0
---

# REVIEW 2026-09-17 — crop_lightbox_zoom_viewer

Nine commits on `handoff/crop_lightbox_zoom_viewer` (`0f5a35a` … `13a1fb7`),
merged into `review/crop_lightbox_zoom_viewer` as a **fast-forward** —
`integration` had not moved since the branch was cut at `a3e8b4f`, so there was
no conflict to resolve and nothing landed underneath the work. The tactical
worktree was clean; nothing had to be committed on the author's behalf.

Jeff's note asked for a button in the thumbnail that launches a crop into a
full-size zoom/pan viewer. What shipped: one `<button>` on `VA.cropFigure` —
the single builder behind every crop image on the page — and one modal
`<dialog>` whose whole zoom/pan mechanism is a CSS transform on a wrapper
around the crop's own frame, so the percentage-positioned `.crophl` highlight
boxes ride it for free. The arithmetic is pure (`VA.lightbox*`, `viewer.js`),
pinned value by value in the fast tier; the browser tier measures the laid-out
box against `crops.json`'s own `highlights[].frac`.

**The stack checks 1–7 of this overlay do not apply.** The diff touches
`apps/viewer/`, the browser runner, one hand-run probe, three issues and a
lesson with six screenshots — no stack, topology, spec-library or
`hardware_entries.json` data, no `source_ref`, no fold. `data/inbox/specs/` and
`docs/reference/` are untouched; nothing was written into drawing-checker (its
`data/runs` and `data/inbox` hold only Jeff's own 2026-09-16 pipeline run over
a new PRELIM PDF, whose files predate this session's work and belong to a
drawing-checker session).

## What I verified

**Four tiers, on the merged tree.**

| tier | result |
|---|---|
| `venv-win/Scripts/python.exe -m pytest -q` | 1 failed, **1192 passed**, 1 skipped |
| `node apps/viewer/run_tests.cjs --repo C:/workspace/tolstack` | **453/453** |
| `node scripts/run_viewer_browser_tests.mjs --repo C:/workspace/tolstack` | **22/22 suites** — the new suite 17/17, `suite file://` and `suite http` 353/353 each, `topology` 201/201 ×2 |
| `node scripts/run_mutation_witness_tests.mjs --repo C:/workspace/tolstack` | **54/54 witnessed** |

pytest, the fast tier and the browser tier were **re-run after** my own
inline fixes below and are the figures above. The mutation tier's 54/54 was
measured on the merged tree **before** them (a ~90-minute run), so instead of
repeating it whole I checked what those fixes could reach: they touch two
files that carry witness entries (`apps/viewer/style.css`,
`scripts/run_viewer_browser_tests.mjs`) and in both cases only comment text,
no `find` or `expect_red` string. `tests/test_mutation_witnesses.py` — the
cheap half that reddens on a `find` that no longer resolves — is green in the
pytest run above, and I re-ran the four entries in those two files
individually (`card-layout-out-of-flow`, `card-crop-overlay-frame`,
`suite-prints-the-registry-key-it-was-handed`, `alert-badge-is-not-filled`):
all four WITNESSED.

The one Python failure is pre-existing and not the branch's:
`test_no_live_document_states_an_unguarded_hardware_entry_count`, on
`docs/strategy/BRIEF_20260915_origin_posture_and_absent_feature_rule.md:152`.
I ran `pytest -q` **at the merge-base before merging** — `1 failed, 1192
passed, 1 skipped`, same test, and the failure's item list is one item long and
identical before and after, so the branch added nothing to it. The author could
not run that comparison (they had not measured the base) and gave the stronger
diff-based argument instead; it holds, and the direct measurement now exists.
Four issues already describe this red; the author correctly filed no fifth.

**The three projection stamps, read before trusting any `[real]` result:**
`results.json` and `crops.json` from `master @ 70241ce`, `topologies.json` from
`review/python_value_and_schema_pins @ 6da6bbb`. Two trees, which is the
ordinary state of the shared projection here; no `[real]` failure anywhere, so
the drift cost nothing this time.

**Eleven planted mutations**, each in a `git archive HEAD` scratch tree inside
the worktree, all three tiers per mutation. **Eight bit and named the right
check:**

| mutation | what went red |
|---|---|
| `frame.appendChild(launchButton(...))` deleted | fast 450/453 — both parity walks and the no-op-click check |
| `omitLaunch` not passed by `renderLightbox` | fast 452/453 — *"…and no second launcher back into itself"* |
| `views/lightbox.js` `<script>` removed from `topology.html` | fast 452/453, naming the file; browser aborts at 2 sub-checks |
| `transform-origin: 0 0` → CSS default | browser 16/17 — exactly *"what was under the pointer is still under the pointer"* |
| `width: 96vw; height: 92vh` removed from the dialog | browser ABORTED, 2 failed, printing `thumbnail 527x601, lightbox 227x259` |
| `body.lightbox-open { overflow: hidden }` deleted | browser 16/17 — the scroll-bleed check |
| the `:focus` / `:focus-visible` reveal deleted | browser 16/17 — the keyboard-affordance check |
| `document.body.classList.remove(BODY_OPEN_CLASS)` deleted from the `close` listener | browser 15/17 — both the Escape and the ✕ dismissals |
| `openHandle.apply()` after `showModal()` deleted | browser 16/17 |

**Three did not** — see should-fix S1 below.

**The geometry, measured independently** with my own probe against the live NAS
grip-table crop at 1600×1000 (`tan_link_to_pitch_plate_take2` /
`fastener_grip_13`, the `spec_pile` → `declared_region` case the note was
about): stage 1518×846, picture 742×846 at fit, centred with a 388px gap on
each side; at 5.0625× the picture is 3756×4283 and a hard drag is held at
`gapLeft 0` with no blank stage. DoD (a) and (b) are in the committed
screenshots and both hold up when opened: shot 2 shows the whole sheet with the
dash-13 row boxed, shot 3 the same box on `1.182` at zoom with the border
visibly a hairline rather than a 16px frame.

**The lesson's numbers, re-derived.** Every figure in its table reproduces
(1192/1/1 both ends, 437 → 453, 22/22, 17/17, 54/54), and its file inventory is
exact: 9 viewer files + browser runner + probe + 3 issues + lesson + 6
screenshots = the 21 files in the diff. One number was stale and I corrected it
(nit N1). The fast tier's 16 new checks and the browser suite's 17 sub-checks
both count out as stated.

**The new surface's copy**, against the standing web-copy rule: the only new
rendered strings are `⤢`, *"open at full size — zoom and pan"*, `−`, `+`,
`Fit`, *"zoom out"*, *"zoom in"*, *"show the whole crop again"* and
*"close (Esc)"* — no internal id, field name, checksum, workstation path or
terminal command, and the caption is the shared `VA.cropReference` where-line
with `omitProvenance`, which is what the handoff asked for. The lightbox is
enrolled in the live banned-string walk the day it was added, and the
enrolment is **not** vacuous: instrumenting the walk, it renders **46 lightbox
surfaces of 189** on live data.

**The other standing greps.** No second combiner in JS: the new arithmetic is
`entry.width/height` and layout boxes into CSS pixels, never printed, never
rounded into a display string, never compared for a verdict — the
`edgeLengthValue` / popover-clamp class (but see nit N2: the README said
`viewer.js` had *no* arithmetic). `VA.LIGHTBOX_ZOOM` / `VA.LIGHTBOX_CONTROLS`
need no `PAIRINGS` row — they have no Python counterpart and no projection
field behind them. Every new string is a module-level constant. No harness
residue (`</invoke>`, `</content>`), no NUL bytes, no whitespace-only reformat
(`git diff -w --stat` agrees line for line), nothing appended below the end of
a created file. The suites left `C:\workspace\tolstack\data\` byte-untouched —
nothing under it has been modified in the last six hours — and the main
checkout's `git status` is clean.

## Findings

### should-fix

**S1 — three of the lightbox's four geometric wiring lines delete green in
every tier, and the sub-check named for one of them reads the view store.**
Filed as
`ISSUE_20260917_the_crop_lightboxs_fit_clamp_and_hairline_are_unwitnessed_in_every_tier.md`
(`med`), with the three assertions that close it. Measured:

* **the fit-to-stage sizing** (`figure.style.width/height` in `apply()`) — 453/453
  and 17/17 with it gone, and the consequence is reader-visible: the crop
  renders at its natural 1374×1566 in an 846px stage, so the top half of the
  sheet fills the window and **the drag is declined at fit**, leaving no way to
  reach the rest. The check whose name is this claim — *"it opens at FIT, the
  whole crop on screen"* — asserts `handle.view().scale === 1`, which is 1 in
  both states.
* **`VA.lightboxClamp`'s call** — 453/453 and 17/17. At fit the picture goes
  hard against the stage's left edge (gaps 0 / 776 rather than 388 / 388) and a
  drag runs unbounded off-screen. The pure function has six value-level cases;
  nothing pins the wiring, and *"Fit returns to the whole crop, centred"*
  measures scale and the `frac`, not centring.
* **`.lightbox .crophl`'s hairline border** — 453/453 and 17/17. This is the
  author's own correction for the defect their lesson measured at 7.59×.

The common cause is worth more than the three instances, and is now in the
overlay: the `.crophl`-is-a-percentage-of-`.cropfig` invariance that makes this
design right is exactly what makes all three `frac` comparisons blind to the
frame. Not a blocker — the shipped code is correct, every deliverable the
handoff *named* is witnessed, and the fix is additive assertions.

**S2 — one of the author's three predicted mutation witnesses does not
reproduce.** `ISSUE_20260916_the_crop_lightboxs_new_guards_carry_no_mutation_
witnesses.md` names, per guard, the mutation it should redden on. Predictions 1
and 2 fire exactly as written (verified above). Prediction 3 — drop the frame's
pixel sizing, expect the `frac` check to fail — leaves everything green, so the
entry would have been declared against a check that cannot fail on it. The
issue says each must be watched reddening before it is declared, which is the
right instinct; I recorded the measurement in the issue so triage inherits a
fact rather than a forecast.

**S3 — the witness issue is a third same-day filing of one shape and
cross-referenced neither sibling.**
`ISSUE_20260916_three_new_guards_have_no_mutation_witness_entry.md` and
`ISSUE_20260916_the_reader_facing_copy_guards_have_no_mutation_witness_entry.md`
were both already in this branch's merge-base tree (`a3e8b4f`), both `med`,
both `area: scripts/mutation-witnesses`; this one arrived `low` under
`area: viewer/tests`. Not a duplicate — each names different guards — but
`ls docs/issues/ | grep mutation_witness` in its own worktree would have found
them. Cross-referenced in review and harmonised to `med` /
`scripts/mutation-witnesses`; **triage should stage all three as one enrolment
pass**, together with the new S1 issue.

### fixed inline

**F1 — "the only MODAL one" is false, in three places.** The lightbox's comment
blocks (`topology.html`, `style.css`, `views/lightbox.js`) called it *"the
fourth `<dialog>` on this page and the only MODAL one"*. Fourth is right;
`topology_app.js` `showModal()`s `#legend-dialog` and `#worksheet-dialog` too,
so it is the **third** modal one — `#annotate-flyout` is the only non-modal
dialog on the page. Rewritten in all three to state the measured fact and to
keep the argument that survives it (here the modality is load-bearing rather
than new). One command settles it — `grep showModal apps/viewer/*.js
apps/viewer/views/*.js` — and the irony is the point: this handoff's own lesson
is about having propagated an unmeasured comment about these same two dialogs.

**F2 — the new 300-line suite orphaned `testDeepLinks`'s header comment.** The
block went in directly under *"--- the inbound deep-link contract
(viewer_hover_cards_and_deep_links)"*, so those six lines sat above the
lightbox suite and `testDeepLinks` had none. Moved back down; browser tier
re-run 22/22 after.

### nits

**N1 — the lesson's `352/352`** for the two `test.html` passes is stale by one:
it was measured before `54e5e9f` added the sixteenth fast-tier check. The
shipped tree reads **353/353** each. Corrected with a dated blockquote; the
table's 437 → 453 in the same file is post-`54e5e9f` and right.

**N2 — `apps/viewer/README.md`'s Layout block still said `viewer.js` holds "no
arithmetic"** after the diff put eight pixel-geometry functions in it. Fixed by
declaring the exception the way `topology.js`'s own row already does (screen
pixels only, never a printed number, never a verdict) — the row beside it was
the model.

**N3 — `ISSUE_…_has_no_file_origin_coverage_in_any_tier.md` said the browser
suite has 16 sub-checks**; it has 17. Fixed.

## For the next reviewer

* The launcher is on the shared builder, so **every** future crop surface gets
  it for free and the parity walks (one launcher per picture, fast tier, stack
  and topology halves) will catch a surface that renders a crop any other way.
  The grid's inline `tvthumb` is the one deliberate exception and both halves
  of that decision are asserted.
* `scripts/run_viewer_browser_tests.mjs`'s new suite starts **its own**
  repo-root server, because the `served mode` suite closes the shared one
  mid-run on purpose. Any suite registered after that one must do the same.
* The suite's subject is derived from the live crop index (first topology edge
  whose crop is a `declared_region` with a highlight). If a rebuild ever
  retires that shape the suite **SKIPs and returns `ok: true`** — one console
  line, the tier total drops silently from 22 to 22. That matches the runner's
  existing skip idiom, so I have not filed it, but it is the "block gated on a
  projection-derived subject" shape and worth a witness line if the idiom is
  ever tightened.
* The mutation tier reads 54/54 on the merged tree, so nothing in the merge
  killed an existing witness — and note for your own run: it takes ~90 minutes
  end to end here, while `--only <id>` on the handful of entries a diff can
  actually reach is a minute each.
