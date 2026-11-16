# LESSONS 2026-11-16 — the_model_drawn_alone_and_led_hub_hover_check_goes_green

## Which conjunct failed, and which side was wrong

- **The failing conjunct:** `lookOf(hubLooks, bladeSha).look === "faint"`. With
  the blade's look and the expected `hubDims` / `hubNodes` / `PILOT` added to
  the log line, every other conjunct printed exactly as expected. The blade was
  `ghost` at 0.22.
- **The guard was wrong, not the app.** On a part hover, `VA.focusLightOf`'s
  `touchParts` puts the far-end *features* of the part's interfaces in the
  touching tier. `VA.focusFacesOf` overlays their bound faces, and
  `AA.planLightLooks` makes a touching face's part `near`, which ghosts it.
  `commands.js`'s light comment documents this ("a touching part ghosts"): the
  pane ghosts a part so its overlaid face can be seen. The served log now binds
  `blade_root@hub_blade1_root_bearing_bore`, so the blade's two faces are in the
  touching layer. The mount's far feature (`tan_link_mount_hub_face`) is only
  *proposed*, which is why the mount stays faint. The guard was written before
  that binding existed.
- **The fix:** the expectation is derived instead of hard-coded. A part's
  partners are the far ends of its interfaces. A partner whose feature is
  `bound` in `data/projections/feature-identity/bindings.json` should ghost,
  and every other drawn part should be faint. **Every** drawn part is now
  checked against that rule, which is stricter than the old four named parts.
  The log prints the derived partners and any part off its look.
  - I used the bindings *projection* rather than folding the served log in the
    suite. The projection is the Python fold of the same log, built by the same
    rebuild (step 5), and the sibling gap-edge check already read it. A second
    log fold in JS inside a test would be a second implementation. The page
    folds the log in the browser, so a disagreement between the two folds now
    reddens this check, and that is the useful direction.
  - If the projection is unreadable, the check is red (`!!boundTokens`) rather
    than quietly assuming "nothing bound".
- **Witness:** the spec gained a second mutation. It drops
  `add(near, f.sha256)` for touching faces in `AA.planLightLooks`, which leaves
  the bound blade faint where the bindings say it should ghost. The derived
  expectation bites in that direction too. The original face-opacity mutation
  still bites.

## The class: [real] checks that hard-code `faint` for a possible partner

I read every `faint`/`ghost` look assertion in
`scripts/run_viewer_browser_tests.mjs`:

| site | verdict |
|---|---|
| hub hovered (part, `touchParts`) | **this red** — fixed |
| base body selected: `lookOf(baseLooks, linkSha).look === "faint"` | **same class, same one-line shape** (`touchParts` over the body's parts) — fixed the same way; the rule now expects blade, gas-spring piston and tan link to ghost (all bound), and they do |
| hub–mount joint hovered: link `faint` | not the class — a joint's touching tier is its two parts (`F.part`), no features, so no binding can change it |
| pilot gap hovered | already derived from the bindings (now shares the one helper) |
| Pick-armed bore (`othersFaint`) | already derived from `armed.near` |
| bind-mode hub hover | accepts `faint` or `ghost` |
| the suggestion row's `bracketLook === "faint"` | fixture-seeded, not `[real]` |

The other suites (`apps/annotate/run_tests.cjs`, `apps/viewer/tests.js`) run
on fixtures, so a live binding cannot reach them. Nothing is left to file.

## Test record

- Projections rebuilt first (`scripts/rebuild_projections.ps1`, main checkout
  at `1fddf436`, the same commit as this branch's base; every stamp
  `dirty=False behind_trunk=0`).
- Browser, `--only "the model drawn alone and led"`, `--repo
  C:/workspace/tolstack`: before the fix 22/23 (the hub hover red), after it
  **23/23**.
- Witness, one run over the three guards whose bodies changed (hub hover,
  gap edge, body selected): **4/4 WITNESSED**, 7m54s. An earlier run over the
  first two guards was 3/3. I re-ran after the body-check change, so the
  witness runner ran twice this session.
- `apps/annotate/run_tests.cjs` 323/323. `apps/viewer/run_tests.cjs --repo
  C:\workspace\tolstack` 715/715. Bare in the worktree it is 592/592 with the
  `[real]` tier skipped, which is the documented worktree red.
- Default pytest in the worktree (`C:\workspace\tolstack\venv-win\Scripts\python.exe -m pytest -q`):
  1 failed, 2027 passed, 1 skipped, 4 deselected, 470 s. The one failure is
  `tests/test_viewer_js_suite.py`, the worktree red documented in
  `CLAUDE.md`. The `--repo` run above covers its tier. Recorded with
  `suite-time record`: inside budget. This repo's pytest has no xdist, so
  `-n 16` is refused and the run is single-process.

## Gotcha

- `pytest -n 16 --dist loadfile` (the canonical prompt's parallelism) fails
  with "unrecognized arguments" here. Plain `pytest -q` takes about 8 minutes.
