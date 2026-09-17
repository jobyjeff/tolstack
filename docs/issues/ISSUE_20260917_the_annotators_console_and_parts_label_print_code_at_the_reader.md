---
type: bug
priority: med
status: open
area: apps/annotate
reporter: agent
found_by: docs/sessions/HANDOFF_20260916_design_pass_typography.md
---

# The annotator prints a command line, a JS module path and a repo folder path at the reader, on the two surfaces that are always visible

## What is on screen

`apps/annotate/index.html?mock=1`, at rest, nothing selected — see
`docs/sessions/lessons/LESSONS_20260916_design_pass_typography_10_annotator_page_after.png`:

* the command box's placeholder reads
  **`command, e.g. isolate machined_213668 (window.AnnotateApp.exec)`**
* the parts panel's label reads **`parts (data/meshes/)`**

Both break standing web-UI rules, and each breaks a different one:

> **Never render terminal commands in a web UI for the user to copy/paste** —
> wire the action to a button/endpoint or degrade to plain words.
>
> No text inputs for backend IDs a user can't know without reading code; no
> internal file/module names in user-facing copy.

`isolate machined_213668` is a command to type. `window.AnnotateApp.exec` is an
internal module path. `machined_213668` is a backend id a reader cannot know
without reading code. `data/meshes/` is a repo-relative path into a gitignored
directory — and in the flyout, where this app is embedded beside the viewer, it
is a path the reader has no shell in which to look at.

## Why it was not fixed

It is **copy**, and handoff `design_pass_typography` (2026-09-16) was
styling-only, with copy named as out of scope precisely because the words in
these apps live in `VA.*`/`AA.*` constants with paired tests
(`tests/test_annotate_js_vocabulary.py`, `tests/test_js_python_vocabulary.py`).
Rewording is cheap; deciding *what the console is for* is not, and the console
is the part that needs the decision rather than a rewrite:

* if the command box is a **developer affordance**, it should not be always-on
  chrome at the foot of a reader's 3D view at all — that is the "if a feature is
  disabled or absent from a build, show nothing about it" rule, one step over;
* if it is a **reader** affordance, then "isolate" is a verb the parts panel
  already offers as a button, and the box is a second way to do the one thing
  that already has a control.

Either answer removes the placeholder; neither is a tactical agent's call inside
a handoff that did not ask.

`parts (data/meshes/)` is the smaller half and is genuinely just a rewording —
it wants to say where the meshes came from without naming a path, and the
annotator's own `README.md` is where that sentence should come from.

## Where the pieces are

* `apps/annotate/index.html` — the console markup and the parts panel's label
* `apps/annotate/app.js` — `AA.exec`'s verb vocabulary (what the box accepts)
* `apps/annotate/README.md` — what the console is documented to be for
* `docs/ANNOTATION_SURFACE.md` — the surface's scope ("select + tag only")
