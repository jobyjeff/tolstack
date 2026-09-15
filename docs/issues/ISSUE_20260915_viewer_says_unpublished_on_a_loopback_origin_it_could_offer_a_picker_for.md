---
type: bug
priority: low
status: triaged
area: apps/viewer
reporter: agent
audience: strategy
found_by: docs/sessions/HANDOFF_20260914_surfaces_that_state_something_false.md
strategy: docs/strategy/BRIEF_20260915_origin_posture_and_absent_feature_rule.md
---

# The viewer says "not published on this site" on a loopback origin, where a folder grant would in fact work

`viewer_transport_honest_hosted` (2026-09-14) settled that an `http(s)` page
whose served probe fails gets **no FSA fallback** — the reasoning being that *a
hosted visitor has no tolstack repo to grant*. That reasoning is sound and the
posture is right. The implementation reads the **protocol**, though, and the
reasoning is about the **reader**: on `http://127.0.0.1:...` the reader plainly
does hold the repo, so the sentence "The tolerance-stack data is not published
on this site yet" is a slightly false thing to say to someone sitting at the
machine that holds it, and the picker that would work for them is withheld.

## Why this is being filed rather than fixed

`surfaces_that_state_something_false` (2026-09-15) needed exactly this
distinction for `apps/annotate/`, which has **no `file://` story at all** (File
System Access and a mesh-binary fetch both need a real origin), so a protocol-
only rule would have left that app with no way in on any origin. The shared
decision therefore grew the predicate the annotator needs:

- `VA.isLocalPage(protocol, hostname)` — `file://`, **or** a hostname in
  `VA.LOCAL_HOSTNAMES` — in `apps/viewer/storage/adapter.js`.
- A caller that passes **no hostname** gets the strictest answer, only
  `file://`. `apps/annotate/` passes its hostname; **`apps/viewer/`'s
  `topology_app.js` deliberately does not**, so the viewer's behaviour is
  byte-for-byte what `viewer_transport_honest_hosted` shipped.

That asymmetry is defensible — the viewer's legitimate local page *is*
`file://`, since it is built to run by double-click, so it needs no loopback
carve-out to stay usable — but it is still two sibling apps answering
differently about one origin, and that is a strategy call, not a tactical one
to make while fixing the annotator.

## What a fix would be

One line in `topology_app.js`'s `chooseAdapter`: pass
`hostname: window.location.hostname`. Everything else already exists.

**But check the two tiers that pin the current answer first.** Both reproduce
"hosted" on **loopback**, so neither can tell the two rules apart as written:

- fast tier (`apps/viewer/tests.js`, "an http page whose served probes both
  fail never boots FSA") passes `protocol: "https:"` with no hostname, so it
  would keep passing and stop proving anything about a real hosted origin;
- truth tier (`scripts/run_viewer_browser_tests.mjs`, `testHostedUnpublished`)
  serves from `127.0.0.1` and would go **red**.

The annotator's own hosted check solved this with Chrome's
`--host-resolver-rules=MAP hosted.tolstack.test 127.0.0.1` (`HOSTED_TEST_HOST`
in that file) — a reserved-`.test` name resolved onto the script's own loopback
server, so a page really is on a non-loopback origin with no DNS and no real
host. Reuse it rather than inventing a second technique.

## The prior question, which is why this is `audience: strategy`

Is "hosted" the right axis for the viewer at all? On a loopback origin with a
failing probe there are two honest answers — *this server publishes nothing*
(what it says today) and *this server publishes nothing, but you are standing
next to the repo, so here is a picker* — and which one a reviewer wants may
depend on whether the served mount is expected to be up in dev. Decide that
before spending the one line.
