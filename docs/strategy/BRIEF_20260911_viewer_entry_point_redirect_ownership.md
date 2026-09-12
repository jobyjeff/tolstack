---
priority: low
---

# STRATEGY BRIEF 2026-09-11 — viewer_entry_point_redirect_ownership: the viewer's entry shim redirects twice, and one of the two drops the query string

**Routing note.** Filed from drawing-checker's
`docs/issues/ISSUE_20260911_mounted_tolstack_viewer_entry_point_double_redirects.md`
(`type: bug`, `audience: strategy`) by the 2026-09-11 triage sweep. Routed to tolstack
because the file is tolstack's; routed as a brief rather than a handoff because the
filing is explicit that the open part is **where it gets fixed**, cross-repo, not what
to type — *"Needs a cross-repo call on where it gets fixed, not a tactical patch from
either side."* The one-line change is not the hard part.

## Where this stands

`/tolstack/viewer/` serves `apps/viewer/index.html`, a pure redirect shim to
`topology.html` that does it **two ways at once**:

```html
<meta http-equiv="refresh" content="0; url=./topology.html" />
<script>window.location.replace("./topology.html" + window.location.search);</script>
```

The `<script>` carries the query string; the `<meta>` cannot. Whichever the browser
honours decides whether `?mock=1` — and, more importantly, `?stack=<id>`, the deep-link
contract documented in drawing-checker's
`docs/sessions/lessons/LESSONS_20260910_analyses_viewer_deep_link.md` — survives the hop.

**Measured 2026-09-11** (`scripts/debug_tolstack_viewer_boot_probe.mjs` against the real
mount, over a dozen probes): *the script always won* — two main-frame navigations
(`/tolstack/viewer/?mock=1` then `…/topology.html?mock=1`), 27 requests, last at 413 ms,
nothing left in flight. So the query string was preserved every time and **nothing is
currently broken on the viewer side.** This is a latent hazard, not a live defect, which
is why it is `low`.

Worth recording because it removes a scarier story: drawing-checker's
`ISSUE_20260911_tolstack_panel_runner_stale_against_viewer_v2` reported
`/tolstack/viewer/?mock=1` re-requested ~2000 times in 12 s, attributed to
`index.html`'s `location.replace` re-entering. That did **not** reproduce in any probe,
and the `networkidle` hang it was inferred from turned out to have a complete and
different explanation (a Playwright lifecycle wait straddling the document swap never
sees the new document's idle event; the runner now waits on URLs and selectors and is
green three runs running). The storm is unconfirmed. The double redirect that would
explain one is real and still there.

## The question

- **Who owns the fix?** The file is tolstack's and the one-line change is tolstack's to
  make. But drawing-checker is what *mounts* this page and deep-links into it, so a
  query-dropping entry point is its failure surface too — a clicked stack row landing
  unselected is a drawing-checker symptom with a tolstack cause. Decide whether that
  makes it a tolstack fix with a drawing-checker regression test, a coordinated pair, or
  something drawing-checker should stop depending on.
- **Should the shim exist at all?** Dropping the `<meta>` is the obvious minimum (it
  cannot carry a search string, which is the whole point). But a redirect shim as the
  documented entry point of a deep-link contract is itself the fragile part — serving
  `topology.html` at `/tolstack/viewer/` directly, or having drawing-checker's mount
  point at it, removes the hop instead of fixing it. That is the more durable answer and
  it costs more.
- **What pins it afterwards?** Nothing currently asserts the query string survives the
  entry point. Whatever is decided, the deep-link contract deserves a test on the side
  that would notice — and which side that is follows from the ownership call above.
- **Doing nothing is defensible and should be said out loud if chosen.** The script wins
  every time measured, and the fix is one line whenever it stops winning. What is not
  defensible is leaving it undecided a second time: this is now the second handoff
  scoped away from it.

## Source

- drawing-checker
  `docs/issues/ISSUE_20260911_mounted_tolstack_viewer_entry_point_double_redirects.md`
  (the filing, with the probe results).
- Re-measure with `venv-win/Scripts/python.exe tests/debug_tolstack_panel_browser.py`
  and `node scripts/debug_tolstack_viewer_boot_probe.mjs <base-url> /tolstack/viewer/?mock=1`
  (both in drawing-checker).
- Filed at the 2026-09-11 triage sweep; no design work has been done on it.
