# LESSONS 2026-09-14 — viewer_transport_honest_hosted

A hosted `apps/viewer/` page must never offer **Connect folder**. Done; here is
what the next agent cannot read off the diff.

## The exact banner sentence

> **The tolerance-stack data is not published on this site yet — there is
> nothing to show.**

Rendered by `views/banner.js`'s first branch, above every connection state,
under `.banner--unpublished`. Nothing else goes on the bar: no button, no
path, no URL, no command. The em dash is the real character, not a hyphen.

Why this wording and not the alternatives I discarded:

- It names the **site**, not the reader. The failure is a server that has
  nothing baked yet; a sentence starting "You need…" would be false.
- It offers no instruction, because there is nothing a visitor can do. The
  house rule ("if a control needs a paragraph, redesign the control") also
  runs the other way: if the reader has no move, do not invent one for them.
- "not published **yet**" is the honest tense. The bake is a live handoff on
  the drawing-checker side; this state is temporary and the copy says so
  without promising a date.

## The decision moved, and that is the interesting part

`chooseAdapter` (topology_app.js) used to hold the whole transport decision
inline and was **untestable** — it is private inside the page's IIFE, and
`run_tests.cjs` does not even load `topology_app.js`. That is why the FSA
fallback could be wrong on a hosted page for as long as it was: no tier could
see it.

It now delegates to **`VA.chooseTransport`** in `storage/adapter.js`, which
takes the already-constructed candidates and the page's `protocol` and returns
`{ adapter, kind, state }`. `chooseAdapter` keeps only `?mock=1`. The seam is
what made the fast-tier cases possible at all, and it is placed by a rule worth
keeping: **what a failed probe means is a property of the page's ORIGIN, not of
the page**, so it belongs beside the adapter contract, not in a boot file.

The FSA side of those tests is a **spy**, not a stub that works: there is no
File System Access API in node, and the thing being proved is that FSA is never
*reached*. A spy proves that; a working stub would only prove the outcome.

## Confirming the reload-recovers behaviour (deliverable 3)

Confirmed twice, both automated, both against a server started dataless and
then given data mid-session — the fast tier's mid-session server-*stop* fixture
inverted:

1. **Fast tier**, `startPublishableServer()` in `run_tests.cjs`: probe →
   `UNPUBLISHED`; call `publishData()`; probe again with a *fresh* adapter
   (which is exactly what a browser reload constructs) → `HTTP` / `READY`, and
   `readTopologies()` returns the real projection.
2. **Truth tier**, `startHostedCatchAllServer()` in
   `scripts/run_viewer_browser_tests.mjs`: real Chrome, the unpublished banner
   appears, `publish()`, then `page.reload()` — no click, no grant, no cache
   clear — and the banner reads "Served over HTTP" with the DAG rendered.

There is nothing to un-latch because nothing is stored: no flag, no
`localStorage`, no module-level memory. That was a design constraint, not a
happy accident, and the second test is what keeps it one.

## Decisions I made that the handoff did not specify

- **A truth-tier case was added even though the DoD only asked for the truth
  tier to be *green*.** The fast tier proves the decision and the banner
  separately; it cannot prove `topology_app.js` wires them together, and the
  wiring turns on a real `window.location.protocol`. `startHostedCatchAllServer`
  reproduces the measured hosted origin exactly (app files under
  `/tolstack/viewer/`, 200 + site-index HTML for every other path). Mutation-
  checked: neutering the protocol guard turns it red.
- **The other no-adapter case got new copy.** `file://` in a browser with no
  File System Access API is a genuine dead end and still shows an error, but
  the old sentence offered "a served projection endpoint" as an alternative,
  which is nonsense on `file://`. It now reads "This browser cannot open a
  local folder — the viewer needs Chrome or Edge."
- **`onConnect`/`onReconnect` are guarded against a null adapter.** The banner
  never offers them without one, but a no-adapter boot still renders a banner,
  and a handler that throws is worse than a control that is absent.
- **`VA.TRANSPORT` is a frozen module-level vocabulary.** The word is spelled
  in three files now (`chooseTransport`, `topology_app.js`, `views/banner.js`);
  the pre-existing `"http"` literal in `banner.js` was folded into it too.
  Repo rule, and this is the shape it asks for.

## Gotchas

- **The `[real]` fast-tier failures under `--repo C:\workspace\tolstack` are
  not yours.** On this branch two fail (`crop shapes still match the builder's`
  and `no live value is one the viewer has no branch for`, over
  `region_label` / `region_match` / `declared_region`); the main checkout's own
  clean `master` fails **four**. This is
  `ISSUE_20260914_two_active_handoffs_each_turn_the_others_real_tier_red`,
  already open — the shared projection in `C:\workspace\tolstack\data\` was
  built by a tree whose crop builder emits fields this branch's `fixtures.js`
  has never heard of. Check master before you start debugging your own change.
- **The truth tier needs `npm install` in the worktree**, not the main
  checkout's `node_modules/` — Node resolves bare specifiers from the running
  script's own ancestors. One package, under a second, no browser download.
  (Recorded before, in `LESSONS_20260904_dag_viewer_vertical_budget.md`; still
  the first thing that stops a worktree run.)
- **`.banner--unpublished` keeps the default bottom border** (`var(--line)`),
  deliberately. The other three banner states tint theirs because each is
  either an action or an alarm; this one is a statement of fact and colouring
  it would say something the sentence does not.

## Still to do — not mine, and not filed as an issue because it already has an
owner

The other half of Jeff's report is drawing-checker's: nothing tolstack-side is
baked on the host, which is why the catch-all answers at all. That is the
`hosted_tolstack_bake` handoff in *that* repo, named in this handoff's own
source paragraph. When it lands, the hosted URLs serve real JSON and this
banner stops appearing on its own — no change needed here, which is the whole
point of deliverable 3.
