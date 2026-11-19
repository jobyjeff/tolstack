---
type: chore
priority: med
status: resolved
area: apps/annotate (HTTP transport, first-write grant)
reporter: agent
needs: jeff
ask: In the viewer's 3D pane on port 8000, bind one face, pick the tolerance-stack folder when asked, and check the event file appears
found_by: docs/sessions/HANDOFF_20261028_the_scene_pane_is_one_flyout_that_reads_over_http.md
todo: 20261029T103459_anknms
resolution: verified 2026-11-19 (triage): Jeff wrote 25 binds through the pane (events 0076-0100, 2026-11-12..18, recorded_by annotate-app:jeff); the folder grant in apps/annotate/storage/fsa.js is the only writer, so the first-bind prompt works in a real browser
---

# The served pane's first-bind folder prompt has not been seen in a real browser

`the_scene_pane_is_one_flyout_that_reads_over_http`'s definition of done
includes: *"a bind attempt prompts for the folder once and then writes"*,
served from drawing-checker's 8000 with no grant.

What the branch shows:

- The **fast tier** pins the mechanism with a stub writer
  (`apps/annotate/run_tests.cjs`: "http: the first write asks for the folder
  once and the next …", "with no folder to grant a write says so …").
- The **browser tier** pins the hosted half: a press with no writer answers
  `AA.READ_ONLY_WRITE`.
- **No tier opens the real folder picker.** `showDirectoryPicker` is a native
  dialog that headless Chrome cannot drive, and it needs a real user gesture.
  The tactical lesson's live measurement on drawing-checker's
  `mount_tolstack()` stopped at "the header said 'folder needed'".

So the one path that ends in a written event file is unverified end to end:
the grant asked from inside `existingEventFilenames()`, the projection then
re-read from the folder, and the event written. It also depends on the
browser keeping the click's user activation alive across the awaits before
the picker opens.

**To check, after a batch merge and a projection rebuild** (the pane reads
`kinematic/annotate.json`, which only the rebuilt kinematic projection
writes): open `/tolstack/viewer/topology.html` on 8000, open the 3D pane on a
kinematic study, pick an element and a face, press Bind, choose the
tolerance-stack folder in the picker, and confirm that a new file lands in
`data/inbox/feature-identity/` and the pane's status word turns to "live".
If the picker never opens, or the bind fails with an activation error, file
the message here.

## 2026-11-19 triage sweep -- seen, by use

`data/inbox/feature-identity/` in the main checkout holds events 0076-0100,
all `recorded_by: annotate-app:jeff`, written 2026-11-12 to 2026-11-18. The
pane has one writer, the File System Access folder grant
(`apps/annotate/storage/fsa.js`, `showDirectoryPicker`), so each of those
files went through the path this issue said was unverified. Its todo
(`20261029T103459_anknms`) is stale and can be withdrawn.
