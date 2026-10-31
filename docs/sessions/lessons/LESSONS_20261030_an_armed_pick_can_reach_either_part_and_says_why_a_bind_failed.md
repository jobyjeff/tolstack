# Lessons 2026-10-30 — an_armed_pick_can_reach_either_part_and_says_why_a_bind_failed

## What changed

- **Part switch.** `cmdArm` now keeps every named part with an installed mesh
  (`armed.parts`, `armed.active`; `parts[0]` still the default). Both meshes are
  loaded at arm time so the switch is instant. A two-part end's armed row says
  `picking on <part>` and carries a `Pick on <other part>` button
  (`tree-row__switch-part`) that runs the new verb `arm part <partId>`;
  the pick filter, solid/ghost display, framing and state line follow. A
  one-part end is unchanged (generic line, no button).
- **Failure words.** `AA.classifyBindFailure` / `AA.bindFailureWords`
  (`apps/annotate/storage/adapter.js`) map a storage error to one of four fixed
  lines (no grant, read-only, name collision, other). The raw text goes to
  `console.error` and the row's / banner's hover.

## Sites

- Reached: the armed row's state line, and every other annotate surface that
  printed a storage error behind a verb — the bind form's `Bind failed`,
  `Correction failed`, `Accept/Reject failed` and `Record failed` banners
  (through `setWriteFailure`).
- Left alone, deliberately: the many `setBanner(err.message, "error")` sites
  (loads, exec verbs, scene errors) — those are not storage *writes*, their text
  is a verb/parse message the reader needs verbatim, and `Connect failed`
  (the grant picker itself) still prints the raw message.

## Gotchas

- The browser check for the switch first failed because it asserted the hub's
  ray returns `null`. With the filter on the blade, the ray correctly *passes
  through* the hub and hits whatever is behind it; the assertion is "does not
  return the hub".
- A worktree can run the browser tier by junctioning the main checkout's
  `node_modules` (gitignored) and passing `--repo C:/workspace/tolstack`.

## Option 1's truth table

Only `hub blade-1 root bearing bore` (`[hub, blade_root]`) was exercised: its
face is on the hub (first part), so the default was right and the switch reaches
the blade root. I did **not** survey the other 13 ambiguous two-part nodes in
the real app, so no wrong-default node is recorded here.
