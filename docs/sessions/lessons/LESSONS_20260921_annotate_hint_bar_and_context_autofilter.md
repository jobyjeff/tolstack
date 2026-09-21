# LESSONS — 2026-09-21 `annotate_hint_bar_and_context_autofilter`

The hint pane became a top bar, the entry context applies itself, and both are
governed by switches the reader owns. What follows is only what the next agent
could not read off the code or the git history.

## What boot-context invokes, and in what order

The handoff asks for this by name, and the suggestion handoff
(`annotate_face_suggestions`) will want it: **there is one list and it is
pure.**

`AA.planEntryCommands(params)` (`commands.js`) turns the URL's params into an
ordered array of command arrays. `app.js`'s `runPendingDeepLink` is now three
lines that run that list; it holds no branching at all. The list is:

| params | commands, in order |
|---|---|
| `trace=1` + `topology` (+ optional `study`) | `["trace", topology, study \|\| ""]` — and nothing else: a scope entry owns the whole scene, so `edge`/`isolate` are **dropped**, not applied on top |
| `topology` (+ optional `edge`, `study`) | `["goto", topology, edge \|\| "", study \|\| ""]` |
| …with `isolate=a,b` | plus `["isolate", "a", "b"]`, **after** `goto` — an explicitly named part beats the one the element derived |
| nothing | `[]` |

Inside those two verbs, the order that matters:

- **`goto`** → `planArrival` (settings + what is already open) → `select-topology`
  → `select-study` → `select-edge` → `filter-element <edge>` → `ghost`/`isolate`
  over the parts that filter resolved → `renderDetail`.
- **`trace`** → `planArrival` → `select-topology` → `select-study` (only when a
  study is named) → set the panel filter from `planScopeFilter` → `ghost`/`isolate`
  the scope's parts → `clearMarks` → one `mark-face` per bound face →
  `renderDetail`.

> **Correction, review 2026-09-21.** Two claims in this section are off against
> the code, both harmlessly but the suggestion handoff is told to rely on this
> list. (1) In `cmdTrace` the `clearMarks` comes **before** the `ghost`/`isolate`,
> not after it (`apps/annotate/app.js`: `state.scene.clearMarks()` sits directly
> under the `setPanelFilter` and above the `AA.exec(["ghost"|"isolate", …])`).
> (2) `runPendingDeepLink` is twelve lines brace to brace, not "three" — a `for` over
> `AA.planEntryCommands` with a `try`/`catch` inside it. The substantive claim
> under (2) is right as written: it branches on nothing the URL carries.

`ghost` vs `isolate` is the **only** place the see-through setting is consulted
at entry; both take the same `planIsolate` transition, so the difference is one
`setGhost` call and nothing else.

## Three decisions the handoff left open

**1. Which verbs the auto-filter switches gate.** Only the two *entry* verbs,
`goto` and `trace`. The manual verbs (`select-topology`, `select-study`,
`select-edge`, `filter-element`, `isolate`) are never gated — a verb typed into
the console or posted by a driver has to do what it says, or the command layer
stops being addressable. `goto` was already documented as "the verb that means
*arriving at* an element", so it was the right place for the gate; a fourth
`enter-context` verb would have meant the postMessage path and the URL path
stopped being the same vocabulary.

**2. What an arrival does when auto-select-topology is off and a *different*
topology is open.** It stops, and says so in the banner. The alternative —
apply the study and the edge anyway — cannot work: those ids name nothing in
the topology the reader is looking at, so `select-study` would throw. Refusing
outright and naming the switch is the only honest answer, and it is the one
case `planArrival` returns `applies: false` for.

**3. Where the transparency toggle lives.** The handoff said "the commands/help
element or the auto-filter menu — agent's call". It is in the help panel, under
**Display**, because that panel is also where the suggestion handoff's own
settings go: transparency and "which faces should I suggest" are both *how the
3D view renders*, while the rail's menu is about *what a link sets up*. Two
groups, two homes, and the panel is a list of groups so adding a third is
adding a third.

## What the suggestion handoff can rely on

- **`AA.planScopeFilter` returns exactly `AA.planPanelFilter`'s shape** (plus a
  `name`, which only a scope has). That is load-bearing and pinned by a check
  that diffs the key sets: the rail's element list, its parts panel and its
  scope bar all read one plan object, so a third kind of scope needs no new
  renderer. If you add a "suggested faces" scope, produce that shape.
- **The help panel is `renderHintPanel()` and is built from `group(title)`
  blocks.** Adding a section is appending one more `group(...)` with
  `settingCheckbox(...)` rows. The bar's `max-height: 45vh; overflow-y: auto`
  already bounds it.
- **Settings are `AA.PREF_KEYS` + a read/write pair per setting**, `store`
  injected, every access wrapped, an unreadable value reading as *not set*.
  Copy that shape rather than touching `localStorage` directly; the guard that
  a key is namespaced `tolstack.annotate.` will fail a new one that is not.
- **Display states already exist and are distinct.** `HIGHLIGHT` (orange) is
  "you just picked this", `MARK_COLOR` (green) is "a binding already attaches
  here", `GHOST_OPACITY` is "see-through body" — all in `scene.js`. A
  *suggested* face needs a fourth, and it must not be either of the first two.

## Gotchas that cost time

- **`scene.js` never resized its renderer.** It sized the drawing buffer once,
  in the constructor, and nothing ever called `setSize` again. That was
  survivable while the host was a fixed grid cell; with a bar that opens and
  closes above it, the canvas's CSS box and its drawing buffer diverge — and
  that is not only cosmetic: `pointerdown` maps client coords to NDC through
  `getBoundingClientRect()`, so a stale buffer makes a click land on the wrong
  face. There is now a `ResizeObserver` and a `resize()`. **The viewer's flyout
  is drag-resizable, so this was already latent there.**
- **A `<summary>` at x = 0 in a padded scrollport loses its disclosure
  triangle.** `list-style-position: outside` draws the marker into the rail's
  10px padding, where it is clipped; the menu looked like a plain label that
  did nothing. `inside` fixes it. Only visible in a screenshot — no assertion
  found it.
- **A mutation witness can be defeated by an `else` branch.** The first version
  of `auto-filter part off` was `if (!on) lift(); else if (...) replay();`, and
  the declared mutation (`if (false) lift()`) *fell through to the replay*,
  whose own `select-topology` clears the scope — so the filter lifted by a
  second route and the tier stayed green. NOT WITNESSED, correctly. The fix was
  in the app, not the test: two independent `if` statements, because turning a
  scope off and turning it back on are different jobs and an `else` makes each
  a silent fallback for the other. **A witness that fails is sometimes telling
  you the code is entangled, not that the guard is wrong.**
- **Running the browser tier from a worktree needs `node_modules`.** It is
  gitignored and lives only in the main checkout. A directory junction
  (`cmd /c mklink /J node_modules C:\workspace\tolstack\node_modules`) works and
  needs no admin — but **delete it before you finish**: a junction left in a
  worktree is a path `git worktree remove` can follow into the main checkout.
  `--repo C:/workspace/tolstack` (forward slashes — bash eats the backslashes)
  is still needed for the projections.

## Two things deliberately left, both filed

- `precedenceNote()` fires on `untraced`, so it tells the reader "a drawing
  already cites this element (confidence: untraced)" on almost every element
  the viewer links to — false, and it prints a schema value.
  `ISSUE_20260921_the_annotators_precedence_note_calls_an_untraced_element_cited.md`.
  The move made it prominent (a full-width band at the top of the canvas) but
  did not create it.
- Topology-scope entry **works** in the annotator and is browser-tested; the
  viewer has no launcher for it, because the toolbar was out of scope.
  `ISSUE_20260921_the_viewer_offers_no_3d_entry_at_topology_scope.md`.
- (And the flyout's `min` width still reserves the retired 320px column:
  `ISSUE_20260921_the_flyout_min_width_still_reserves_the_annotators_retired_third_column.md`.)
