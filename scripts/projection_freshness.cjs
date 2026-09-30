// IS THE PROJECTION A TIER IS ABOUT TO READ BUILT FROM THIS TREE?
//
// `data/projections/viewer/*` is gitignored, shared by every live worktree and
// rebuilt by hand. A tier that compares a checkout's own tracked files against
// it -- `apps/viewer/fixtures.js` against `results.json`, the annotate app's
// alias table against `topologies.json`, a declared figure against
// `topologies.json` -- is comparing two trees whenever those two are not the
// same one, and when they are not the comparison agrees with itself. On
// 2026-09-24 the batch merge's candidate ran the viewer's `[real]` tier at
// 514/514 against a projection built BEFORE the merge, merged, rebuilt, and
// got 513/514 out of exactly the same code
// (ISSUE_20260924_fixture_shape_drift_is_invisible_until_the_gitignored_
// projection_is_rebuilt).
//
// WHAT THIS MEASURES, exactly -- and the reason that is written out rather than
// summarised. The first version of this check (2026-09-24) lived inside
// apps/viewer/run_tests.cjs and described itself as answering "are the inputs
// it was built from still what is on disk here?", a claim its comment, its
// lesson and its issue all said subsumed "a stale projection, a newer one, a
// divergent branch and an uncommitted edit". `git diff <sha> -- <paths>`
// answers something narrower than that -- do the TRACKED files at `<sha>` still
// have the same CONTENT in the work tree? -- and three inputs that change what
// a rebuild would write sat in the gap, each reporting fresh
// (ISSUE_20260924_the_projection_freshness_pairing_reads_tracked_head_content_only).
// A true check wearing an overreaching description is the defect this module
// was re-opened to fix, so the description is now four questions and a list of
// what is still outside them:
//
//   1. Is the commit the stamp names in this tree at all?      `cat-file -e`
//   2. Did the tree that built it have uncommitted changes?    the stamp's `dirty`
//   3. Do the inputs' TRACKED files still match that commit?   `diff --name-only`
//   4. Does any input DIRECTORY hold an untracked file that a  `ls-files --others`
//      rebuild would glob in?
//
// Still outside it, and not close to catching them: a builder's GITIGNORED
// inputs (`build_viewer_crops.py` reads the datasheet pile under
// `data/inbox/specs/`, so a replaced PDF changes `crops.json` and is invisible
// to every question above -- git has never heard of that file); anything a
// builder reads by path rather than imports; and the builder's environment (a
// PyMuPDF or Python upgrade changes crops and moves nothing in git). Widening
// to any of those is a decision about evidence, not an oversight -- see the
// false-alarm fence below.
//
// THE FALSE-ALARM FENCE. An alarm that is always on is an alarm a reader learns
// to skip, which is the failure `scripts/projection_provenance.py` already
// wrote down (`dirty` once counted untracked files and lit the viewer's banner
// on every build from the documented invocation). So every question above is
// quiet on a clean tree holding a projection rebuilt from it, and the input set
// is as narrow as the derivation allows: the builders' import closure names the
// FILES it reaches under `scripts/`, not the whole directory.
//
// WHERE THIS LIVES. A module, required by apps/viewer/run_tests.cjs and
// runnable on its own, because three more readers still trust the same shared
// projection without asking which tree built it
// (ISSUE_20260924_other_real_tiers_still_read_the_shared_projection_untested_
// for_freshness: apps/annotate/run_tests.cjs' two `[real]` checks and
// tests/claims_registry.py's `smallest_chain` source). That issue asks where
// the ONE implementation should belong and is not answered here; extracting it
// out of the viewer's harness is what keeps the answer cheap either way.
//
//   node scripts/projection_freshness.cjs                       # this checkout
//   node scripts/projection_freshness.cjs --repo C:\workspace\tolstack
//   node scripts/projection_freshness.cjs --inputs              # the input set
//
// `--repo` says where `data/` is (it exists only in the MAIN checkout, so a
// worktree must borrow it); `--tree` says which tree is under test and defaults
// to this file's own checkout. A BORROWED PROJECTION IS STILL PAIRED AGAINST
// THE TREE UNDER TEST -- `--repo` says where the file is, never that its
// contents may be taken on trust.
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const PROJECTION_DIR = ["data", "projections", "viewer"];
// The projection files the viewer's [real] tier reads. A file that is not there
// is not stale: `topologies.json`'s own sub-tier already skips itself when it is
// absent, and `results.json`'s absence is the tier's existing skip.
const PROJECTION_FILES = ["results.json", "topologies.json", "crops.json"];

// `git <args>` in `cwd`, or null if it failed -- same "null covers every cannot
// know" posture projection_provenance.git takes on the write side.
function gitOut(cwd, args) {
  try {
    return execFileSync("git", args, {
      cwd: cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"],
    });
  } catch (_) {
    return null;
  }
}

function lines(text) {
  return String(text || "").split("\n").map((s) => s.trim()).filter(Boolean);
}

function short(sha) {
  return String(sha || "?").slice(0, 12);
}

function readText(treeRoot, rel) {
  try {
    return fs.readFileSync(path.join(treeRoot, ...rel.split("/")), "utf8")
      .replace(/^\uFEFF/, "");
  } catch (_) {
    return null;
  }
}

function isDir(treeRoot, rel) {
  try {
    return fs.statSync(path.join(treeRoot, ...rel.split("/"))).isDirectory();
  } catch (_) {
    return false;
  }
}

function show(names) {
  return names.slice(0, 6).join(", ") +
    (names.length > 6 ? ", and " + (names.length - 6) + " more" : "");
}

// --- the input set ---------------------------------------------------------
//
// Two halves, and NEITHER of them is a list written here. The first is what the
// stamp records (its source directory, and the script that ran); the second is
// that script's own Python import closure, walked out of the tree.
// Hand-writing the second half is the defect this repo keeps paying for: the
// constant that used to sit here called `tolerance_stack` "the one input that is
// NOT derivable from a stamp", and it was not the only one --
// `build_topology_projection.py` imports `build_viewer_projection`,
// `build_viewer_crops` and `projection_provenance`, so an edit to the first of
// those marked `results.json` stale (its own `built_by`) and left
// `topologies.json`, which the same edit also changes, reading fresh.

// Every `import x` / `from x import y` in Python source. Source text rather
// than a real interpreter on purpose: the interpreter lives in `venv-win/`,
// which exists only in the main checkout -- the one situation a tier is most
// often run from a worktree to escape. A name that resolves to no file in this
// tree (`import fitz`) is dropped by `candidates`, so a false positive out of a
// docstring costs nothing.
const IMPORT = /^[ \t]*(?:from[ \t]+([.\w]+)[ \t]+import[ \t]+|import[ \t]+(?=[.\w]))/gm;

/** `{module, names}` per import in `source`; `names` only matters for packages. */
function importsOf(source) {
  const found = [];
  IMPORT.lastIndex = 0;
  let match;
  while ((match = IMPORT.exec(source)) !== null) {
    const after = source.slice(match.index + match[0].length);
    if (!match[1]) {
      // `import a.b, c` -- every comma-separated name on the one line.
      for (const name of after.split("\n")[0].split("#")[0].split(",")) {
        const dotted = name.trim().split(/\s+as\s+/)[0].trim();
        if (/^[.\w]+$/.test(dotted)) found.push({ module: dotted, names: [] });
      }
      continue;
    }
    // The imported-names list, followed to its closing paren where it has one,
    // so a multi-line `from x import (a, b, c)` is one entry. Only the NAMES
    // need that -- the module is captured already, so a list this misreads
    // still contributes the module itself.
    const close = after.indexOf(")");
    const tail = after.startsWith("(") && close !== -1
      ? after.slice(1, close)
      : after.split("\n")[0];
    const names = tail.split(",")
      .map((n) => n.split("#")[0].trim().split(/\s+as\s+/)[0].trim())
      .filter((n) => /^\w+$/.test(n));
    found.push({ module: match[1], names: names });
  }
  return found;
}

// Where a dotted module name imported from `fromRel` could be in THIS tree.
// Two search roots, and both are how the builders are actually run: the
// importing file's own directory (every builder does
// `sys.path.insert(0, str(Path(__file__).parent))`, so its siblings import by
// bare name) and the repo root (where `tolerance_stack/` is).
function candidates(treeRoot, fromRel, dotted) {
  const fromDir = fromRel.indexOf("/") === -1
    ? "" : fromRel.slice(0, fromRel.lastIndexOf("/"));
  let name = dotted;
  let roots = [fromDir, ""];
  if (name.startsWith(".")) {
    // A relative import resolves against the importing module's own package,
    // one level further up per extra leading dot.
    let up = 0;
    while (name[up] === ".") up += 1;
    const parts = fromDir ? fromDir.split("/") : [];
    roots = [parts.slice(0, Math.max(0, parts.length - (up - 1))).join("/")];
    name = name.slice(up);
    if (!name) return [];
  }
  const out = [];
  for (const root of roots) {
    const stem = (root ? root + "/" : "") + name.split(".").join("/");
    out.push(stem + ".py", stem + "/__init__.py");
  }
  return out.filter((rel) => readText(treeRoot, rel) !== null);
}

// The top-level package directory `rel` sits in, or null for a loose module. A
// package is named as a DIRECTORY input rather than as the one module the
// closure resolved: its `__init__.py` runs on import, its siblings are reachable
// by attribute, and a directory is also what makes an untracked new module
// inside it visible (question 4 above). Derived -- a directory is a package if
// it holds `__init__.py` -- so no package name is written down here.
function packageOf(treeRoot, rel) {
  const parts = rel.split("/");
  for (let depth = 1; depth < parts.length; depth += 1) {
    const dir = parts.slice(0, depth).join("/");
    if (readText(treeRoot, dir + "/__init__.py") !== null) return dir;
  }
  return null;
}

/**
 * `entry` plus every repo-local Python module it imports, transitively, as
 * repo-relative POSIX paths -- a loose module as its own file, a module inside
 * a package as that package's directory.
 */
function importClosure(treeRoot, entry) {
  const seen = new Set();
  const queue = [entry];
  const out = new Set();
  while (queue.length) {
    const rel = queue.shift();
    if (seen.has(rel)) continue;
    seen.add(rel);
    const source = readText(treeRoot, rel);
    if (source === null) continue;
    const pkg = packageOf(treeRoot, rel);
    out.add(pkg === null ? rel : pkg);
    for (const { module, names } of importsOf(source)) {
      const hits = candidates(treeRoot, rel, module);
      for (const hit of hits) {
        if (!seen.has(hit)) queue.push(hit);
        // `from pkg import mod`, where a name may be a submodule rather than
        // an attribute.
        if (!hit.endsWith("/__init__.py")) continue;
        const dir = hit.slice(0, -"/__init__.py".length);
        for (const name of names) {
          for (const sub of [dir + "/" + name + ".py",
                             dir + "/" + name + "/__init__.py"]) {
            if (readText(treeRoot, sub) !== null && !seen.has(sub)) queue.push(sub);
          }
        }
      }
    }
  }
  return [...out];
}

/**
 * The repo-relative inputs one projection's stamp names.
 *
 * The KEY the source directory is filed under is the builder's choice --
 * `stacks_dir` for the two viewer projections, `events_dir` for the spec
 * library, and projection_provenance.py calls it "a label for the reader"
 * precisely so it can differ -- so it is found by SHAPE rather than by name: it
 * is the value that is an absolute path inside the recorded repo root.
 * Spelling the key here would be a second copy of a fact Python owns, and it
 * would go quietly wrong the day a fourth builder picks a third word.
 */
function inputsOf(stamp, treeRoot) {
  const root = String(stamp.repo_root || "").replace(/\/+$/, "");
  const inputs = new Set();
  if (root) {
    for (const key of Object.keys(stamp)) {
      const value = stamp[key];
      if (key !== "repo_root" && typeof value === "string" &&
          value.indexOf(root + "/") === 0) {
        inputs.add(value.slice(root.length + 1));
      }
    }
  }
  if (typeof stamp.built_by === "string" && stamp.built_by) {
    for (const rel of importClosure(treeRoot, stamp.built_by)) inputs.add(rel);
  }
  return [...inputs];
}

/** The stamp in the projection at `full`; null for absent/unreadable/unstamped. */
function stampOf(full) {
  try {
    const parsed = JSON.parse(fs.readFileSync(full, "utf8").replace(/^\uFEFF/, ""));
    const stamp = parsed && parsed.provenance;
    return stamp && typeof stamp === "object" ? stamp : null;
  } catch (_) {
    return null;
  }
}

/**
 * Every input path the projections under `dataRoot` name, as one sorted set.
 *
 * Exposed for `scripts/run_mutation_witness_tests.mjs`, which has to hold this
 * set against its own `SHADOWED`: the freshness check runs there with
 * `--work-tree=<shadow>`, and an input present at `<sha>` but absent from the
 * shadow reads as a DELETION -- red on the CLEAN run, with every `fast`-tier
 * witness then reporting `TIER_ALREADY_RED`. That coupling is computed there
 * now rather than rediscovered by hand.
 */
function projectionInputs(dataRoot, treeRoot) {
  const inputs = new Set();
  for (const name of PROJECTION_FILES) {
    const full = path.join(dataRoot, ...PROJECTION_DIR, name);
    if (!fs.existsSync(full)) continue;
    const stamp = stampOf(full);
    if (!stamp) continue;
    for (const rel of inputsOf(stamp, treeRoot)) inputs.add(rel);
  }
  return [...inputs].sort();
}

/**
 * `{fresh, why, paired}` for the projections under `dataRoot`, paired against
 * the tree at `treeRoot`. `why` is the whole message a tier prints.
 */
function projectionFreshness(dataRoot, treeRoot) {
  // `--git-dir` + `--work-tree` rather than a bare `git -C`, and it is
  // load-bearing twice over: a linked worktree's `.git` is a file, and the
  // mutation-witness shadow (tmp/mutation-witness/, a copy of the tracked tree
  // inside the repo) is a directory git would otherwise read straight past to
  // the real working tree. Naming the work tree explicitly is what makes this
  // guard answer for the files the tier is actually reading, and therefore what
  // makes it witnessable at all. `--no-optional-locks` so a run from a shadow
  // cannot write the real checkout's index.
  const gitDir = gitOut(treeRoot, ["rev-parse", "--absolute-git-dir"]);
  if (gitDir === null) {
    return {
      fresh: false,
      paired: [],
      why: "git could not be asked which tree " + treeRoot + " is, so the " +
        "projection under " + dataRoot + " could not be paired with it. A " +
        "[real] comparison against a projection of unknown provenance is not " +
        "a check — see the note at the top of scripts/projection_freshness.cjs.",
    };
  }
  const gitArgs = ["--no-optional-locks", "--git-dir=" + gitDir.trim(),
                   "--work-tree=" + treeRoot];

  const stale = [];
  const paired = [];
  for (const name of PROJECTION_FILES) {
    const full = path.join(dataRoot, ...PROJECTION_DIR, name);
    if (!fs.existsSync(full)) continue;
    const stamp = stampOf(full);
    if (!stamp || typeof stamp.head_sha !== "string" || !stamp.head_sha) {
      stale.push(name + " carries no provenance stamp, so which tree built it " +
        "cannot be established — it was built before stamping, or hand-edited");
      continue;
    }
    const sha = stamp.head_sha;
    // QUESTION 2, asked before git is, because the stamp already carries the
    // one fact that settles it. `dirty` means "tracked content differed from
    // `head_sha`" (projection_provenance.stamp, `--untracked-files=no`) -- i.e.
    // the recorded commit does not identify the code that ran, the projection's
    // contents came from edits that are in no commit, and no amount of diffing
    // against `<sha>` can reach them. Only an explicit `true` is stale: a stamp
    // that could not ask git records `dirty: null` alongside `head_sha: null`,
    // which the unstamped arm above already covers.
    if (stamp.dirty === true) {
      stale.push(name + " was built from " + short(sha) + " by a tree with " +
        "UNCOMMITTED changes (its own stamp says dirty: true), so that commit " +
        "does not identify the code that built it and no comparison against " +
        "the commit can");
      continue;
    }
    if (gitOut(treeRoot, ["cat-file", "-e", sha + "^{commit}"]) === null) {
      stale.push(name + " was built from commit " + short(sha) +
        ", which is not in this tree at all");
      continue;
    }
    const inputs = inputsOf(stamp, treeRoot);
    const missing = inputs.filter(
      (rel) => !fs.existsSync(path.join(treeRoot, ...rel.split("/"))));
    if (missing.length) {
      // The shadow's coupling, diagnosed rather than arriving as an unexplained
      // deletion. run_mutation_witness_tests.mjs refuses to run at all in this
      // state, so reaching this line means some other partial work tree is
      // missing a path the stamp names.
      //
      // Only a STAMP-named path can arrive here: the closure is walked in the
      // work tree under test, so a tree missing `tolerance_stack/` loses it
      // from the input set rather than reporting it absent. That narrowing is
      // silent, and what covers it is the preflight in
      // run_mutation_witness_tests.mjs -- it derives the input set from the
      // FULL checkout and holds it against SHADOWED before any tier runs.
      stale.push(name + " names input(s) that are not in this work tree at " +
        "all: " + show(missing) + ". Against a partial work tree (the " +
        "mutation-witness shadow copies only `SHADOWED`) git reads those as " +
        "deletions; add them to SHADOWED in " +
        "scripts/run_mutation_witness_tests.mjs, or point --tree at a full " +
        "checkout");
      continue;
    }
    const diff = gitOut(treeRoot,
      gitArgs.concat(["diff", "--name-only", sha, "--"], inputs));
    if (diff === null) {
      stale.push(name + ": git could not diff this tree against " + short(sha) +
        ", the commit it was built from");
      continue;
    }
    const changed = lines(diff);
    // QUESTION 4. `git diff` compares the tracked content at `<sha>` against
    // the work tree and has never heard of a file that is in neither, so an
    // authored-but-uncommitted `stack_*.json` is an input the projection was
    // built without and the diff says nothing. Measured: dropping
    // `docs/tolerance_stacks/ZZZ_probe.json` into a worktree left the banner at
    // "projection paired with this tree" and the total at 516/516. Asked of
    // DIRECTORY inputs only, which is the whole of where it can bite -- a
    // builder globs a directory (`stacks_dir.glob("stack_*.json")`), whereas a
    // new module becomes an input only when some tracked file starts importing
    // it, and that edit is in the diff above.
    const dirs = inputs.filter((rel) => isDir(treeRoot, rel));
    let untracked = [];
    if (dirs.length) {
      const others = gitOut(treeRoot, gitArgs.concat(
        ["ls-files", "--others", "--exclude-standard", "--"], dirs));
      if (others === null) {
        stale.push(name + ": git could not be asked whether this tree holds " +
          "untracked files under " + show(dirs) + ", which a rebuild would " +
          "glob in");
        continue;
      }
      untracked = lines(others);
    }
    if (!changed.length && !untracked.length) {
      paired.push(name + " @ " + short(sha));
      continue;
    }
    const reasons = [];
    if (changed.length) {
      reasons.push(changed.length + " of its input file(s) differ in this " +
        "tree: " + show(changed));
    }
    if (untracked.length) {
      reasons.push(untracked.length + " untracked file(s) sit in its input " +
        "director" + (dirs.length === 1 ? "y" : "ies") + ", which a rebuild " +
        "would read: " + show(untracked));
    }
    stale.push(name + " was built from " + short(sha) + ", and " +
      reasons.join("; and "));
  }

  if (!stale.length) return { fresh: true, why: "", paired: paired };
  const head = gitOut(treeRoot, ["rev-parse", "HEAD"]);
  return {
    fresh: false,
    paired: paired,
    why: [
      "the projection this tier reads was NOT built from this tree, so every " +
      "[real] check would be comparing this checkout's fixtures against " +
      "another tree's projection:",
      ...stale.map((line) => "  - " + line),
      "",
      "  projection: " + path.join(dataRoot, ...PROJECTION_DIR).replace(/\\/g, "/"),
      "  this tree:  " + treeRoot.replace(/\\/g, "/") + " @ " + short(head),
      "",
      "A stale projection makes the fixture pairing agree with itself: on " +
      "2026-09-24 the batch merge's candidate reported 514/514 against a " +
      "projection built before the merge and 513/514 out of the same code " +
      "once it was rebuilt.",
      "",
      "Rebuild in the checkout that owns data/ -- never from a worktree, " +
      "which would overwrite the shared artifact for everyone:",
      "    powershell -ExecutionPolicy Bypass -File scripts/rebuild_projections.ps1",
      "then run this tier again against that checkout.",
    ].join("\n"),
  };
}

module.exports = {
  PROJECTION_DIR, PROJECTION_FILES,
  projectionFreshness, projectionInputs, importClosure,
};

// --- the CLI ---------------------------------------------------------------

if (require.main === module) {
  const argv = process.argv.slice(2);
  const flag = (name, fallback) => {
    const at = argv.indexOf(name);
    return at === -1 ? fallback : path.resolve(argv[at + 1]);
  };
  const here = path.resolve(__dirname, "..");
  const dataRoot = flag("--repo", here);
  const treeRoot = flag("--tree", here);
  if (argv.includes("--inputs")) {
    for (const rel of projectionInputs(dataRoot, treeRoot)) console.log(rel);
    process.exit(0);
  }
  const verdict = projectionFreshness(dataRoot, treeRoot);
  if (argv.includes("--json")) {
    console.log(JSON.stringify(verdict, null, 1));
  } else if (verdict.fresh) {
    console.log("projection paired with this tree: " +
      (verdict.paired.join(", ") || "(no projection file is present)"));
  } else {
    console.log(verdict.why);
  }
  process.exit(verdict.fresh ? 0 : 1);
}
