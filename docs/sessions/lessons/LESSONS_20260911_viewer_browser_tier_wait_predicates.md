# Lessons — viewer_browser_tier_wait_predicates (run 2026-09-14)

Two flaky browser-tier sub-checks, both false negatives on correct code, both
in `scripts/run_viewer_browser_tests.mjs`. Fixed, plus a third of the same
shape found by the deliverable-3 sweep. What is worth carrying forward is not
the three edits — it is the predicate rule and the fact that both transients
are *forceable*, so neither fix rests on a run count.

## The rule: wait on a render product, never on markup

A selector is worth waiting on only if **the render that satisfies the
assertion is what puts it in the DOM.**

- `tr.tvrow`, `.banner__built`, `.banner--ready`, `.hovercard--edge`,
  `.croppop--resolved` are *render products*. Each is written by one
  synchronous renderer that clears the node, sets the class and fills it
  (`views/banner.js`, `views/cards.js`, `views/crop.js`), and nothing can
  observe the DOM part-way through a synchronous function — so the class
  cannot exist on an empty node. Waiting on one of these is as strong as
  asserting on what it contains.
- `#banner` is **static markup**: `<div id="banner" class="banner"></div>`
  ships in *both* `apps/viewer/topology.html` and `apps/annotate/index.html`.
  Waiting on it waits for nothing at all.

### The padded-empty-element trap, stated generally

`waitFor({ state: "visible" })` **is not a wait for content.** Playwright's
"visible" means *in the layout with a non-empty box* — and CSS padding alone
gives an empty element a box. `apps/annotate/style.css`'s `.banner` carries
`padding: 6px 16px`, so the empty banner measures 1280×12 and is visible
**78 ms after load, before the app's first script has written anything**
(measured this session). Any element with padding, a border, a min-height, a
background or a fixed size is visible while empty. If the assertion that
follows is about text, the visibility wait proves nothing about it.

The fix shape used here, and the reason to prefer it: make the wait and the
sample **the same read**, so no paint can slip between them —

```js
const bannerText = await page.waitForFunction(() => {
  const doc = document.querySelector("#annotate-flyout iframe")?.contentDocument;
  const el = doc && doc.querySelector("#banner");
  const text = el ? el.textContent.trim() : "";
  return text.length > 0 ? text : null;
}, null, { timeout: 15000 }).then((handle) => handle.jsonValue());
```

Keep the timeout bounded: a boot that never writes a banner must fail **as a
timeout**, not as wrong content. That distinction is the whole reason not to
"fix" a flake by widening the wait.

## Why the served-mode banner transient exists at all (it is not first paint)

The issue attributed it to `topology_app.js`'s initial
`connection: VA.STATE.DISCONNECTED` — right, but incomplete, and the missing
half is what makes it rare. `init()` never calls `render()` directly. The
**annotate-mount probe** does: `VA.probeAnnotateMount(...).then(...)` flips
`state.annotateMount` and renders, and it runs *concurrently with*
`chooseAdapter`'s transport probe. Under a repo-root server `../annotate/`
answers a HEAD in a millisecond or two while `topologies.json` is still in
flight, so that render paints the connect-folder banner. Two independent
probes racing is exactly the 1-in-4 flake rate: whichever ordering the run
happens to get.

Which means the transient is **forceable**: delay only
`/data/projections/viewer/*` in the test server and the boot timeline becomes
deterministic. Measured (1500 ms delay, throwaway harness):

```
t+  105ms  {"cls":"banner banner--disconnected","visible":true,"rows":0}
t+ 3343ms  {"cls":"banner banner--ready","text":"Served over HTTP — no folder…","rows":8}
```

Old predicate `tr.tvrow, .banner--disconnected` resolves at 105 ms on the
banner → the sub-check samples `count === 1` → **FAIL on correct code**, every
time. New predicate `tr.tvrow` resolves at 3343 ms with the banner absent →
PASS. Same harness with the projection 404'd instead of delayed: rows never
render, `.banner--disconnected` stays on screen, and the new predicate fails as
`page.waitForSelector: Timeout 8000ms exceeded` — a genuinely stuck
disconnected boot is still caught, and caught as a timeout.

For the annotate banner the equivalent forcing move is
`browser.newPage({ javaScriptEnabled: false })` against the real
`apps/annotate/index.html`: the app never boots, so the pre-boot DOM is held
still and the old wait's failure is reproducible in one run.

**Both harnesses were throwaway** (scratchpad, not committed): their value was
proving the mechanism, and the runner itself must never depend on a delayed or
crippled server.

## Deliverable 3 — the sweep of the rest of the file

Grepped both shapes across all 1818 lines. Findings:

1. **Fixed — `testRebuildAffordance` scenario 3** (`#banner` + `waitForTimeout(200)`,
   then `.banner__stale` count === 0). The same trap pointed the other way: the
   wait resolved on the static div, so a boot that never rendered a banner at
   all would have **passed** this absence check, with a 200 ms sleep as the only
   thing behind it. Now waits `.banner__built`, which exists only in the
   connected banner's own paint — the same paint `provenance()` would have put
   `.banner__stale` in.
2. **Checked, sound — every `{ state: "visible" }` wait on a card/popover**
   (lines ~476, ~490, ~769, ~802, ~811, ~1484, ~1499). They wait on
   `.hovercard--*` / `.croppop--*` and then sample `.croppop`'s text. Different
   selectors, but `VA.renderHoverCard` / `VA.renderCropPopover` set the class
   and fill the node in one synchronous call, so the class is a render product.
   Sound as written; do not "fix" these.
3. **Checked, sound — `testIndexRedirects`' `'[data-nav-kind], tr.tvrow'`
   disjunction.** It is a disjunction, but both branches are settled renders and
   the assertions are about `page.url()`, not about either branch being absent.
4. **Checked, benign — the nine `waitForTimeout(50)`/`(300)` sleeps**
   (lines ~919–1205, ~1621). Each follows a click or a nav selection whose
   handler re-renders *synchronously*, and each assertion carries a positive
   anchor (e.g. `#toolbar a` count === 1 beside `#study-3d` count === 0), so
   none can pass vacuously. Not filed as an issue: examined, not deferred. If
   one ever does flake, the fix is the same — wait for the effect.

## Running the browser tier from a worktree

`node_modules/` is gitignored, so `playwright-core` is absent in a worktree and
the runner dies with `ERR_MODULE_NOT_FOUND` before doing anything. Copy it in
(`cp -r C:/workspace/tolstack/node_modules ./node_modules`, 14 MB, one package).
Do **not** junction it to the main checkout: worktree cleanup that follows a
junction would delete the real `node_modules`. And `--repo C:/workspace/tolstack`
is still needed on top, for the projection.

A trap if you edit this file with a script: the tree's working copies are
**CRLF**. Reading with Python's universal newlines and writing back with
`newline=""` silently rewrites all 1818 lines to LF. `git diff --stat` catches
it instantly (43 changed lines vs the whole file); convert back before
committing.
