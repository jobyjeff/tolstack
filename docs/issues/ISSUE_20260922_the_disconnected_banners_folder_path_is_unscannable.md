---
type: feature
priority: low
status: open
area: apps/viewer
reporter: agent
audience: strategy
found_by: docs/sessions/HANDOFF_20260921_policy_free_brief_residues.md
---

# The disconnected banner's folder path is the one absolute workstation path the reader-facing scan cannot hold

`apps/viewer/views/banner.js`'s `VA.STATE.DISCONNECTED` arm renders:

> Connect the tolstack repo folder (C:\workspace\tolstack) to load the stacks.
> Read-only.

`C:\` is on the shared ban list
(`apps/viewer/reader_facing_bans.js`, "an absolute workstation path"), so when
`HANDOFF_20260921_policy_free_brief_residues` enrolled the banner in the
reader-facing-copy scan, the `DISCONNECTED` and `NEEDS_REGRANT` states had to be
left out of the walk. The exclusion is named in the test's own comment; this
issue is its owner.

## Why it is not simply a defect to fix

It is the only banned string on any viewer surface that is arguably a real
affordance rather than leaked internals: the sentence is naming the folder a
reader has to pick in the File System Access picker, and a reader who picks the
wrong folder gets the "no projection" banner with no way to tell why. Deleting
the path makes the one control on that banner harder to satisfy.

That makes it a copy/design question, not a residue — hence `audience: strategy`:

- Is `C:\workspace\tolstack` even right for a reader who is not Jeff? It is one
  workstation's layout, hard-coded. A reader with a clone elsewhere is being told
  the wrong path.
- Does naming a folder belong in banner copy at all, or in the picker's own
  `startIn`/`id` hints (which the FSA API can carry)?
- It interacts with
  `BRIEF_20260915_origin_posture_and_absent_feature_rule.md`, which is already
  open on what a no-FSA surface should say — the same banner, the same arm.

## The mechanical consequence, until it is decided

Four banner states are scanned; two are not. Any new leak in the
`DISCONNECTED` / `NEEDS_REGRANT` copy is caught by nothing. Whatever is decided,
the outcome should end with those two states enrolled in the same walk as the
other four.

> **Added by `review/policy_free_brief_residues`, 2026-09-22: there is a THIRD
> unscanned state, and it is the box this whole rule came from.** The
> stale-pair alarm (`provenance()`, the box Jeff pasted into PowerShell on
> 2026-09-10) is not among the six surfaces the new walk holds — it needs
> `mismatchedCrops()` to render, and no entry in the `surfaces` list supplies
> it. It is not unguarded: `apps/viewer/tests.js` (~3383, "the banner refuses
> to present a mismatched pair as current") runs the **local**
> `noCommandsOrPaths` helper over its whole text. But that helper is three
> strings (`.py`, `venv-win`, `\`) rather than the shared
> `ReaderFacingBans.BANNED`, so the stale box is the one banner state the
> widened ban list never sees — no field names, no checksums, no `data/`, no
> `window.*`.
>
> Measured while reviewing: the walk's exemption list
> `OPENED_BY_THE_READER = ["div.banner__source__body", "div.banner__stale-detail"]`
> is half dead for the same reason. Emptying it reddens the walk (the
> Data-source fold legitimately prints the resolved stacks-dir, so the first
> entry is load-bearing); dropping only `div.banner__stale-detail` leaves
> `480/480`, because nothing in the list renders that box. So the second
> exemption exempts nothing today and pre-authorises its detail body for
> whoever adds the state later.
>
> One seventh `surfaces` entry — `{connection: READY, results: FIXTURE.results,
> crops: mismatchedCrops()}` — closes both halves and makes the existing
> exemption honest instead of speculative. Recorded here because this issue
> already owns the question "which banner states are in the walk".
