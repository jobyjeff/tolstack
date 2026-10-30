---
type: chore
priority: low
status: open
area: annotate
reporter: agent
found_by: docs/sessions/active/HANDOFF_20261029_the_annotator_has_no_front_door.md
audience: strategy
---

# The arrival settings (topology / study / parts) can no longer be changed by a reader

The rail's "Set up automatically" menu was the only place a reader could switch
the three arrival steps. It left with the standalone page; the shell mirrors the
rail's rows and the hint panel carries only the display settings (See-through,
Suggest likely faces). What is left: the `auto-filter` verb
(`window.AnnotateApp.exec` / the shell's `annotate:exec`), the stored setting
(`AA.PREF_KEYS.autoSteps`) read at boot, `AA.AUTO_STEPS`'s `label` and `hint`
fields (no longer rendered anywhere), and the reader-facing behaviour they gate
(`goto`/`trace` consult them).

Decision for strategy: do the three switches earn a place in the hint panel's
Display group (the one place settings live in the pane), or does the arrival
simply always apply fully and the setting, the verb and `label`/`hint` go?
Recommendation: delete — the shell's selection is the arrival now, and a switch
that turns half of it off is a way to be on a topology with nothing selected.
The browser tier drives the verb directly meanwhile
(`annotate top bar + entry context`).
