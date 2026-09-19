// Every string this repo's web apps must never print at a reader, with what
// each one IS. Test support, not app code -- nothing under apps/ loads this
// except the two suites, the same posture `fixtures.js` and `tests.js` take by
// living here.
//
// WHY IT IS A FILE OF ITS OWN, and it is the whole finding behind this file:
// the list lived inside `apps/viewer/tests.js` from the day it was written
// (viewer_component_names_and_reference_copy, 2026-09-15) and so covered ONE
// app. `apps/annotate/` -- which is embedded beside the viewer in the flyout,
// and which a reader meets with nothing selected -- was reachable by no scan
// of any kind, and shipped a placeholder reading `command, e.g. isolate
// machined_213668 (window.AnnotateApp.exec)` and a panel label reading
// `parts (data/meshes/)` for as long as those surfaces have existed
// (ISSUE_20260917_the_annotators_console_and_parts_label_print_code_at_the_
// reader). A guard that covers one of two apps is not a narrow guard; it is a
// guard whose scope nobody has stated.
//
// It lives in `apps/viewer/` rather than `tests/` for one mechanical reason:
// `apps/viewer/test.html` runs this same suite in a real browser over both
// `file://` and an http server ROOTED AT apps/viewer (scripts/run_viewer_
// browser_tests.mjs forbids paths outside it), so a shared file one directory
// up is a 403 there. `apps/annotate/run_tests.cjs` reads it across the app
// boundary the way it already reads `../viewer/storage/adapter.js`.
//
// Classic script; node-safe under the vm sandbox.
(function (root) {
  "use strict";

  // Not a style preference -- each entry is a class of thing a reader cannot
  // act on, and every literal here had a live instance on the day it was
  // added. An entry is a STRING or a REGEXP: a literal can only catch what
  // someone has already written down, and a shape catches the ones nobody has
  // written yet. That is not hypothetical -- VA.exportRunsLine printed four
  // bare drawing-checker run ids straight past the literal list for as long as
  // it existed, because no literal in it spells a run id and none could.
  var BANNED = [
    ["sha256", "an algorithm's name -- nothing a reader can act on"],
    ["source_ref", "a field name out of the schema"],
    ["crop_key", "a field name out of the schema"],
    ["crops.json", "an internal artifact's filename"],
    // Added 2026-09-18, and the reason it was not here is the finding:
    // `VA.VALUES_STATUSES.inline.text()` said *"CTE transcribed INLINE in
    // materials.json"* on every live thermal stack, and no literal in this
    // list spelled it. It is exactly the class `crops.json` above is -- a file
    // a reader of this page has no way to open and nothing to do with.
    ["materials.json", "an internal artifact's filename"],
    ["C:/", "an absolute workstation path"],
    ["C:\\", "an absolute workstation path, the other way round"],
    ["build_viewer_crops.py", "a terminal command for the reader to type"],
    ["venv-win", "a terminal command for the reader to type"],
    // A repo-relative path into a directory the reader has no shell in which
    // to look at -- and `data/` is gitignored, so it is a directory that does
    // not exist at all on a machine that has only cloned the repo. Added
    // 2026-09-18 with the widening to apps/annotate/, where the parts panel's
    // own label read `parts (data/meshes/)`.
    ["data/", "a repo-relative path into a directory the reader cannot open"],
    // An internal module path, as copy. `window.AnnotateApp.exec` was in the
    // annotator's command-box placeholder; the shape catches the viewer's
    // namespace too, and any object path a future surface leaks.
    [/\bwindow\.[A-Za-z]+\b/,
     "an internal module path -- nothing a reader of a page can address"],
    [/\b\d{8}_\d{6}\b/,
     "a drawing-checker run id -- an internal artifact's address, and a " +
     "shape, so an id nobody has written yet is caught too"],
    // 24 hex characters, not twelve: the sentence said "twelve" from the day
    // it was written (viewer_component_names_and_reference_copy) while the
    // pattern has always required 24, and a failure message that misdescribes
    // its own rule sends the reader looking for a shorter string than the one
    // on their page. 24 is the floor because a sha256 is 64 and nothing
    // shorter in this projection is a checksum.
    [/\b[0-9a-f]{24,}\b/,
     "a checksum's own digits -- twenty-four hex characters are not " +
     "something a reader of this page can do anything with"],
  ];

  // A literal OR a shape; returns the string actually FOUND, never the
  // pattern, because "renders /\b\d{8}_\d{6}\b/" tells a reader nothing about
  // which id is on their page.
  function found(text, entry) {
    return typeof entry[0] === "string"
      ? (String(text).indexOf(entry[0]) === -1 ? null : entry[0])
      : (String(text).match(entry[0]) || [null])[0];
  }

  root.ReaderFacingBans = { BANNED: BANNED, found: found };
})(typeof window === "undefined" ? this : window);
