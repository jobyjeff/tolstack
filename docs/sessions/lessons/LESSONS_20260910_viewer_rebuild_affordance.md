---
name: viewer_rebuild_affordance
handoff: HANDOFF_20260910_viewer_rebuild_affordance.md
---

# viewer_rebuild_affordance

## Where the broken command string actually came from

Not a string-concatenation bug anywhere in `config.js` or a build script —
`scripts/rebuild_projections.ps1` (the actual rebuild recipe) is correct and
untouched. The bug lived entirely in `views/banner.js`'s `provenance()`: the
stale-pair alarm's expanded detail appended two `<code>` elements back to
back with no separating text node between them:

```js
detail.appendChild(VA.el("code", "banner__cmd", VA.CONFIG.rebuild[labels.rebuildKey]));
detail.appendChild(VA.el("code", "banner__cmd", VA.CONFIG.rebuild.crops));
```

`<code>` is inline, so two adjacent inline elements with nothing between them
render with no visual gap **and no separator when the text is selected and
copied** — a browser's copy only inserts a line break at a block boundary. On
`topology.html`'s own stale banner (`labels.rebuildKey === "topologies"`) the
two commands concatenate to exactly the string Jeff hit: the topology-
projection command immediately followed by the crops command, drawing-checker
interpreter prefix and all, all on one clipboard line. There was no separate
"lost interpreter prefix" bug — that phrase in the handoff describes what
PowerShell effectively does with the joined line: it treats the second
command's whole path as a positional argument to the first `python.exe`, so
the second interpreter is present in the text but never actually invoked.

The fix does not add a separator between the two `<code>`s — it removes both
of them from this box entirely, since the house rule ("no commands in a web
UI, ever, without Jeff's case-by-case approval") makes that the right target
regardless of the concatenation bug.

## Design decision not spelled out in the handoff: where the button/sentence live

The `<details class="banner__stale">` box (branch/sha alarms, collapsed by
default) is recreated from scratch on every `render()` — `VA.clear()` + a
fresh DOM tree, not a diff — so it always starts collapsed again after any
re-render. The Rebuild button and its progress/error text are rendered as a
**sibling** of that `<details>`, not inside its collapsed detail: putting them
inside would make the button (and, worse, the "Rebuilding…" / failure state)
vanish the instant a click re-rendered the banner, since the native `open`
attribute resets with the element. Caught by the real-browser tier, not the
fixture tier — the node DOM shim has no notion of `<details>` visibility, so
this only showed up once `scripts/run_viewer_browser_tests.mjs`'s stub-mount
scenario actually clicked the button in a real browser.

## The capability-probe shape agreed with the d-c endpoint handoff

`tolstack_mount_rebuild_endpoint` (drawing-checker, staged the same day,
**not built as of this session**) is expected to expose `POST /tolstack/
rebuild` and `GET /tolstack/rebuild/status`, sibling to the existing `/tolstack/
viewer/` and `/tolstack/data/` mounts (`webui/analyses.py`'s `VIEWER_MOUNT`/
`DATA_MOUNT`). `storage/http.js`'s sibling-data-mount candidate now carries a
third relative path, `rebuildDir: "../rebuild"`, alongside `dataDir`/
`textDir` — resolved the same way, from the page's own pathname. The
repo-root-static candidate's `rebuildDir` is `null`: nothing ever serves a
rebuild endpoint there, by construction (it's a plain static file server).

Capability is **probed**, never inferred from the candidate matching: `init()`
calls `_probeRebuild()` right after picking the data candidate, which GETs
`.../rebuild/status` and requires both `ok` and a JSON content-type (the same
two-part check the data-candidate probe already used, for the same reason —
a catch-all route could otherwise answer 200 for anything). This matters
because the endpoint's own handoff had not shipped yet during this session:
a sibling-data-mount server with no rebuild route mounted must read as
"capability absent", not crash or wrongly report "capable". The two adapter
methods (`requestRebuild()`, `readRebuildStatus()`) consume only `busy` and
`state` off whatever the endpoint answers, and both throw on a non-ok
response (POST failing to even start is a real transport failure, same
contract as every other non-404 failure in this adapter) — this is a
minimal, defensive contract chosen without a real server to test against;
the actual endpoint may need `topology_app.js`'s poll loop adjusted once it
exists, but the shapes it currently reads (`busy: bool`, `state: string`)
should already match `webui/deploy_runner.py`'s own `DeployStatus.as_dict()`,
which the d-c handoff says it reuses.

## Deliberately NOT surfacing the server's own error text

On rebuild failure the banner shows a single fixed sentence
("The rebuild failed. Try again, or ask whoever runs the server to check its
logs.") — never the endpoint's own `reason`/`tail`/`state_text`, even though
`webui/deploy_runner.py`'s own `STATE_TEXT` dict is explicitly designed as
human-readable words. A script failure's tail is an ordinary Python
traceback shape (file paths, sometimes a command line) and this handoff
exists specifically to keep that out of the banner; a fixed sentence is the
only guarantee that holds regardless of what the (not-yet-built) real
endpoint eventually returns.

## Left for a follow-up (filed, not fixed here)

`views/banner.js`'s `missing()` (no-projection-at-all state), `views/crop.js`'s
not-built popover, `views/topology.js`'s missing-topology message, and
`apps/annotate/app.js`'s own banner all still print a rebuild command — the
same anti-pattern, but out of this handoff's scope (it named the stale-pair
banner specifically). Filed as `ISSUE_20260910_other_viewer_surfaces_still_
print_terminal_commands.md`, routed to strategy since giving all of them a
button needs the server endpoint to actually exist first.
