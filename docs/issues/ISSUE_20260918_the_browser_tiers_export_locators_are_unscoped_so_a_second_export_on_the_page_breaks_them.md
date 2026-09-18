---
type: chore
priority: low
status: open
area: tests/browser-tier
reporter: agent
found_by: docs/sessions/HANDOFF_20260918_real_tier_red_and_the_skipping_tier.md
---

# The browser tier locates `.el-export--established` page-wide, so a second export block on the fixture page breaks it with a strict-mode error

`scripts/run_viewer_browser_tests.mjs` (around the "an established export names
its file and its checksum in the right pane" check) does:

```js
/Read from 215197\.pdf/.test(await page.locator(".el-export--established").textContent())
```

Playwright's `locator.textContent()` is strict: it throws if the selector
resolves to more than one node. The demo fixture page has exactly one
established export today — the plate row's — so the check works. It stops
working the moment the page carries a second one, and the failure reads as a
strict-mode violation rather than as "the thing you added is on the page".

## How it was found, and what was given up for it

`real_tier_red_and_the_skipping_tier` (2026-09-18) made a joint's
`assembly_export_ref` render through `VA.exportBlockNode`, the same builder the
element pane uses. The natural place to pin that at the fixture tier is
`apps/viewer/fixtures.js`'s demo joint — every live stack that has an export
ref would then be represented by a fixture, and the surface-scan walk would
read it in **every** worktree instead of only where `data/` lives.

That was **not** done, purely because of this locator. The browser tier needs
`node_modules/playwright-core` and an installed Chrome and therefore cannot be
run from a worktree at all, so the session declined to make a change it could
not verify in a file outside its handoff's scope. The joint-export shape is
pinned by two checks in `apps/viewer/tests.js` that build their own joint, and
by the `[real]` tier over the four live stacks that carry one — which is
narrower coverage than the fixture would have given.

## The fix

Scope the three export locators in that block to the pane that owns them
(`#detail .el-export--established`, etc.), the same way the untraced-row checks
just above are already scoped to `#stackview` and for the same stated reason
("the topology grid's OWN (hidden) demo mechanism also has an untraced edge, and
a bare selector would count both"). Then add `assembly_export_ref` to the demo
fixture's joint, and delete the note in `fixtures.js` that explains why it is
absent.

Needs a machine that can run `node scripts/run_viewer_browser_tests.mjs` —
i.e. the main checkout, after `npm install`.
