---
priority: high
depends_on: [a_rail_row_with_a_proposal_says_so_and_accepts_it_in_place]
model: sonnet
hitl: false
---

# HANDOFF 2026-10-29 — the_annotator_has_no_front_door: `apps/annotate/` is the shell's embedded pane and nothing else — the standalone page, its dropdowns and rail, the viewer's "Annotate →" link and the 8843 serve target go

Source: Jeff, live, 2026-10-29 (`dispatch/docs/strategy/HANDOFF_20261029_strategy.md`):

> Why is there a completely separate annotator app still? We just went
> through a huge refactor to merge everything into one app. … Please delete
> the old app entirely so that agents stop building on it.

What happened: the 2026-10-20 one-shell decision made the annotator an
**embedded pane** (the viewer creates one iframe on `apps/annotate/index.html`
and boots it embedded — `apps/viewer/topology_app.js` ~line 1330 — so the
pane's rail draws in the shell), but the same document still boots as a
standalone page when opened directly, with its own "Set up automatically",
topology and study dropdowns, bind-mode rail and bar (`apps/annotate/app.js`),
served at `http://127.0.0.1:8000/tolstack/annotate/` and by tolstack's own
`serve` verb (`ops.toml`: `http.server 8843 --directory apps`), and linked
from the viewer toolbar ("Annotate →", `apps/viewer/views/topology.js` ~line
175). Two agents built on that door after the decision (the proposals bar,
10-28/29; the hint bar). Baseline: `master` with
`a_rail_row_with_a_proposal_says_so_and_accepts_it_in_place` landed (it moves
the one feature the standalone bar had that the pane lacked). Scope:
`apps/annotate/index.html`, `app.js`, `commands.js`, `style.css`, `README.md`,
`apps/viewer/views/topology.js` (the one link), `ops.toml`, `CLAUDE.md`,
`docs/ANNOTATION_SURFACE.md`, `ARCHITECTURE.md` (module inventory), tests and
witnesses that drive the standalone page. Do NOT touch `sweep.js`'s rail
behaviour, `scene.js` beyond what the deletion requires, or anything in
`apps/viewer/` other than the link.

## Decisions (made)

- **One document, one boot.** `apps/annotate/index.html` opened **outside the
  shell** (without the `?embedded=1` the shell alone sets — `app.js` ~line
  26, `EMBEDDED`) does not render a UI: it redirects to the shell, `../viewer/topology.html`, carrying its
  deep-link params into the shell's own (`topology`, `study`, `edge`,
  `isolate`, `sweep`, `trace`), so every old bookmark and every `?topology=…`
  link in docs/issues still lands somewhere useful — on the shell with the
  pane open at that element. The drawing-checker mount `/tolstack/annotate/`
  **stays** (it serves the pane's document to the iframe); nothing in
  drawing-checker changes.
- **Deleted, not hidden:** "Set up automatically", the topology and study
  dropdowns, the standalone bind-mode rail and its bar, the hint/commands bar
  as a standalone surface (commands stay reachable only as the shell exposes
  them), and the standalone page's own CSS. `app.js` keeps only what the
  embedded boot needs; what it kept and why is one table in the lesson.
- **The viewer's "Annotate →" toolbar link goes.** The pane is opened by the
  3D button and the study rows; there is no second place.
- **`serve` serves the shell.** `ops.toml`'s `serve` verb directory becomes
  `apps` still but its documented URL is the viewer
  (`http://127.0.0.1:8843/viewer/topology.html`); README and CLAUDE.md say
  the drawing-checker mount on 8000 is the one Jeff uses and 8843 is the dev
  fallback (already the rule since 10-20; make the text match).
- **Docs say one thing.** `docs/ANNOTATION_SURFACE.md` and
  `apps/annotate/README.md` describe the pane; every sentence about the
  standalone page, its dropdowns or "the full annotator" is removed or
  rewritten; `ARCHITECTURE.md`'s inventory row for `apps/annotate/` reads
  "the shell's 3D pane; no standalone entry". A prose-pin test
  (`tests/test_*doc*`) that asserts the old wording is updated, never deleted.

## Deliverables

1. The redirect boot and the deletions above.
2. Every browser check that drove the standalone page re-targeted to the
   shell with the pane open (list them in the lesson); witnesses re-anchored.
3. Docs as above; `scripts/` debug tools that opened the standalone page
   updated or deleted.

## Definition of done

- Opening `http://127.0.0.1:8000/tolstack/annotate/?topology=vpa_pitch_linkage`
  lands on the shell with the pane open on that topology; the shell's own
  pane still boots and binds (the proposals rail from the prior handoff works
  unchanged).
- `grep -rn "Annotate →" apps/` is empty; no test opens `annotate/index.html`
  un-embedded except the redirect test.
- `node apps/annotate/run_tests.cjs`, `node apps/viewer/run_tests.cjs`,
  `node scripts/run_viewer_browser_tests.mjs`, `PYTHONIOENCODING=utf-8
  venv-win/Scripts/python.exe -m pytest -q` green; witnesses
  `--changed-since integration` clean.
- Lesson: the kept/deleted table for `app.js`; the list of re-targeted
  checks; the line count removed.
