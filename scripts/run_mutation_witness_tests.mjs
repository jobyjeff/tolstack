// The MUTATION-WITNESS tier: every guard, checked against the mutation it
// claims to catch.
//
// The other two tiers ask "does the app still behave?". This one asks the
// question a green suite cannot answer on its own -- "would this guard NOTICE
// if it didn't?" -- and it exists because the answer turned out to be no five
// times between 2026-09-11 and 2026-09-15, in five guards filed by five
// different review sessions. The shape is always the same: a guard's witness is
// coupled to an incidental property of the app (a viewport where the document
// happened to be short, a preference that happened to be at its default, a
// measurement that re-derives whatever is on screen), the app changes
// CORRECTLY, the coupling breaks, and the guard goes on passing while
// witnessing nothing. Nothing is red, so nothing announces that the coverage
// left.
//
//   node scripts/run_mutation_witness_tests.mjs                     # npm run test:mutations
//   node scripts/run_mutation_witness_tests.mjs --repo C:\workspace\tolstack  # ...from a worktree
//   node scripts/run_mutation_witness_tests.mjs --only card-layout   # one guard
//   node scripts/run_mutation_witness_tests.mjs --verbose            # show the red
//   node scripts/run_mutation_witness_tests.mjs --list
//   node scripts/run_mutation_witness_tests.mjs --unenrolled         # the gap, and what to write
//
// TWO THINGS FAIL THIS RUN, AND THEY ARE DIFFERENT DEFECTS. A guard that is
// enrolled and does not redden on its own mutation has DECAYED -- somebody
// wrote the witness and the app has since moved out from under it. A guard the
// tree declares and no spec names is UNENROLLED -- nobody ever wrote one. The
// first is a repair, the second is an authoring job, and the summary keeps them
// apart because for eight days they were reported as one word ("NOT WITNESSED")
// and read as the other.
//
// Unenrollment is measured against a pinned census
// (`DECLARED_GUARDS`, scripts/guard_enumeration.mjs) rather than against zero:
// requiring all 1,173 of this repo's guards to carry a spec would fail nothing
// usefully. What the pin buys is that a guard ADDED and not enrolled moves a
// number, and the run says so, naming the file to write. That is the half of
// the enrollment problem no checklist entry ever moved -- five of them are in
// docs/prompts/REVIEW_AGENT.md and the rate did not change
// (docs/strategy/BRIEF_20260915_mutation_witness_enrollment.md).
//
// `--repo` is the worktree escape hatch, same as the tiers below it:
// data/projections/viewer/ lives only in the MAIN checkout, and the `[real]`
// witnesses are skipped -- and so reported as misses -- without it. It is
// passed straight through to whichever NODE tier a mutation names, and it is
// also where the `python` tier's venv interpreter is resolved from, for the
// same reason: venv-win/ is main-checkout-only too.
//
// IT DEFAULTS TO THIS TREE, AND THAT DEFAULT IS LOAD-BEARING. Each tier
// resolves its own data root from the directory the tier's script lives in,
// which here is the SHADOW (below) -- and the shadow, by construction, never
// holds a data/. So without an explicit `--repo` a spawned tier would look for
// the projection inside the shadow and find nothing, no matter which tree the
// run started from: the `[real]` witnesses would be unreachable from the main
// checkout exactly as they are from a worktree. Passing REPO (the tree the
// shadow was copied FROM) is what makes a bare `npm run test:mutations` able to
// witness every entry when it is run where the projection actually is. When the
// projection is not under whatever `--repo` resolves to, the run says so on its
// first line rather than after several minutes of browser.
//
// WHAT IT DOES, per mutation in scripts/mutation_witnesses/:
//
//   1. resolves `find` in the file it names and requires EXACTLY ONE match.
//      Zero matches means the anchor has rotted and the entry is checking
//      nothing; two means the mutation is ambiguous. Either way it fails here
//      rather than quietly patching the wrong line. (tests/test_mutation_
//      witnesses.py runs this same check on every pytest run, with no browser
//      and in under a second, so a rotted anchor is red long before anyone
//      reaches for this file.)
//   2. runs the owning tier CLEAN first, once per distinct (tier, suite), and
//      requires green. Without that a broken tree would let every mutation
//      "witness" trivially.
//   3. patches the shadow copy, runs the tier again, and requires it to go red
//      ON THE DECLARED CHECK -- not merely red. A mutation that reddens some
//      other check is reported as a miss, with the names that did fail, because
//      the entry's claim is about one guard and not about the suite.
//
// THE SHADOW TREE. Everything a tier reads -- `SHADOWED` below, which is the
// list, and the only place it is written down -- is copied to
// tmp/mutation-witness/ and the copy is what gets patched; this tree is never
// written to. The shadow
// has to live INSIDE the repo (tmp/ is gitignored) for one specific reason:
// node resolves `playwright-core` by walking up from the running script's own
// directory, so a shadow under the system temp dir would find no node_modules
// at all. Each run restores the file it patched, so the shadow is left clean.
import { spawn } from "node:child_process";
import { readFileSync, rmSync, cpSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, normalize } from "node:path";
import { census, censusReport, specFileName, SPEC_DIR }
  from "./guard_enumeration.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = normalize(join(HERE, ".."));
const SHADOW = join(REPO, "tmp", "mutation-witness");
// The directories the tiers actually read, as path segments. apps/ is the app
// under test and scripts/ is the browser runner itself. Copying data/
// (gigabytes, gitignored, main-checkout only) would be both wrong and slow --
// `--repo` is how a tier reaches that.
//
// docs/topologies/ is here because a tier reads a TRACKED table out of it:
// apps/annotate/run_tests.cjs resolves part_mesh_aliases.json repo-relatively
// (correctly -- it is tracked, so it is in every worktree) and its two [real]
// checks threw ENOENT inside the shadow, which read as "the tier was red
// before the mutation" and blocked the whole annotate tier from witnessing
// anything, 2026-09-16. Narrow rather than all of docs/ on purpose: 194 KB
// against 5.2 MB, and the next tracked-input directory some tier starts
// reading should have to be named here, where the reason can be written down.
//
// tests/ and tolerance_stack/ are here for the `python` tier (2026-09-18): a
// pytest entry runs ONE test file out of the shadow, and `tests/` is a package
// (tests/__init__.py), so pytest puts the shadow root on sys.path and the test
// module's own `REPO_ROOT = Path(__file__).parent.parent` resolves to the
// shadow. Both are what a Python guard reads -- the test file itself, and the
// package it imports its vocabularies from. A pytest entry may only name a test
// file that reads what is listed here; one that also reads docs/ or data/ is
// red before any mutation, which the runner reports as TIER_ALREADY_RED rather
// than pretending.
//
// docs/tolerance_stacks/ and docs/spec_library/ are the tracked inputs the
// pytest entries on tests/test_viewer_crops.py read -- the stack JSON those
// tests resolve citations out of, and the crop-region registry
// (tolerance_stack/spec_crop_regions.py's REGISTRY_RELPATH). Named one at a
// time, same as docs/topologies/ above, rather than copying all of docs/.
const SHADOWED = [["apps"], ["scripts"], ["docs", "topologies"],
                  ["docs", "tolerance_stacks"], ["docs", "spec_library"],
                  ["tests"], ["tolerance_stack"]];

const argFlag = (name) => {
  const i = process.argv.indexOf(name);
  return i === -1 ? null : process.argv[i + 1];
};
const repoArg = argFlag("--repo");
// Defaults to REPO, never to the shadow -- see the note at the top of the file.
const DATA_REPO = repoArg === null ? REPO : normalize(repoArg);
// The one file whose absence makes every `[real]` witness unreachable: both
// tiers gate their real-data checks on the topology projection resolving.
const PROJECTION = join(DATA_REPO, "data", "projections", "viewer", "topologies.json");
// The `python` tier's interpreter, resolved off DATA_REPO rather than REPO for
// the same reason the projection is: in a worktree the venv exists only in the
// MAIN checkout, and `--repo` is already the flag that names it. The shadow
// never holds a venv -- only what SHADOWED copies -- so this is always an
// out-of-shadow path, and that is fine: pytest is run WITH the shadow as its
// argument, not from inside an installed tree.
const PYTHON = join(DATA_REPO, "venv-win", "Scripts", "python.exe");
// The pytest tier's one forbidden suite. Its harness is the suite that runs
// THIS table's own pairing module, so an entry naming it would have every
// mutation "witnessed" by `test_every_anchor_resolves_to_exactly_one_place`
// going red -- the shadow's copy of the table still declares a `find` the
// shadow's mutated copy of the file no longer contains. That is the pairing
// module correctly reporting an applied mutation, not a guard biting, and it
// would read as coverage for whatever guard the entry claimed.
// tests/test_mutation_witnesses.py refuses it too; this is the half that does
// not need a pytest run to say so.
const SELF_PAIRING_SUITE = "tests/test_mutation_witnesses.py";
const ONLY = argFlag("--only");
// `--verbose` prints the mutated run's whole output even when the entry passes.
// A miss prints it either way -- this is for reading the red a witness actually
// produces, which is what a lesson or a review writes down.
const VERBOSE = process.argv.includes("--verbose");

const STATE = census(REPO);
// One job per MUTATION, flattened out of one spec file per GUARD. The `id` is
// the spec's file name without its extension -- derived from the guard, so it
// is not something anybody chose and not something that can drift from the
// guard it names -- with an ordinal only where a guard declares more than one
// way to break it.
const all = STATE.specs.flatMap((spec) =>
  spec.mutations.map((mutation, i) => ({
    ...mutation,
    tier: spec.tier,
    suite: spec.suite,
    expect_red: spec.expect_red,
    specFile: spec.specFile,
    id: spec.specFile.replace(/\.json$/, "") +
      (spec.mutations.length > 1 ? `#${i + 1}` : ""),
  })));
// `--only` matches the derived id OR the guard's own name, because the name is
// the half a reader has in front of them: it is what the tier printed.
const chosen = ONLY === null
  ? all : all.filter((m) => m.id.includes(ONLY) || m.expect_red.includes(ONLY));

if (process.argv.includes("--list")) {
  for (const m of all) {
    console.log(`${m.id}\n  tier      ${m.tier}${m.suite ? ` / ${JSON.stringify(m.suite)}` : ""}`);
    console.log(`  contract  ${m.contract}`);
    console.log(`  mutation  ${m.file}: ${oneLine(m.find)} -> ${oneLine(m.replace)}`);
    console.log(`  must red  ${m.expect_red}\n`);
  }
  process.exit(0);
}

// The gap, and the file name that closes each line of it. Deliberately a
// separate flag rather than something the full run prints in full: it is ~1,070
// lines long, and the run's own summary needs to stay readable.
if (process.argv.includes("--unenrolled")) {
  console.log(censusReport(STATE.rows) + "\n");
  for (const guard of STATE.guards) {
    if (guard.spec) continue;
    console.log(`${guard.tier}  ${guard.name}`);
    console.log(guard.enrollable
      ? `  write ${SPEC_DIR.join("/")}/${specFileName(
          { tier: guard.tier, expect_red: guard.name })}` +
        (guard.tier === "browser"
          // The one field the enumeration cannot supply: a guard's name is
          // declared once and may be run under more than one suite, so which
          // suite to pay for is the author's call.
          ? '   ("suite": the registry key whose run reaches this guard)' : "")
      : `  NOT ENROLLABLE: ${guard.why}`);
  }
  process.exit(0);
}

function oneLine(text) {
  const flat = text.replace(/\s+/g, " ").trim();
  return flat.length > 96 ? flat.slice(0, 93) + "..." : flat;
}

// --- running a tier --------------------------------------------------------
//
// Every tier reports the same two things this file needs: an exit code, and the
// NAME of every check that failed. Nothing else in any tier's output is parsed
// -- a tier is free to print whatever else it likes.
//
// `tier` IS A VOCABULARY, and this object is the one place it is written on
// this side (CLAUDE.md: a field vocabulary is a module-level constant, never an
// inline literal). `tests/test_mutation_witnesses.py` pairs these keys against
// its own `TIERS`/`CHECK_SOURCE` on every pytest run, so a tier word that
// exists here and nowhere else -- or the reverse -- is red in a second rather
// than after a browser sweep.
//
// A tier word names ONE HARNESS, not a speed. "fast" is the VIEWER's fast
// runner specifically, which is why the annotate app needed a word of its own
// rather than a second meaning for that one: the two are separate harnesses,
// with separate check-name sources and no suite registry in common
// (ISSUE_20260915_the_annotate_fast_tier_cannot_own_a_mutation_witness).
const TIER_HARNESS = {
  // The viewer's fast tier. The harness is run_tests.cjs; the check NAMES live
  // in the tests.js it loads, which is what CHECK_SOURCE points at.
  fast: {
    script: ["apps", "viewer", "run_tests.cjs"],
    fail: /^FAIL {2}(.+)$/,
    suites: false,
  },
  // The annotate app's fast tier -- a second harness, not a second suite of the
  // first. It prints the same `FAIL  <name>` line, and unlike the viewer it is
  // both the harness and where the names are written.
  annotate: {
    script: ["apps", "annotate", "run_tests.cjs"],
    fail: /^FAIL {2}(.+)$/,
    suites: false,
  },
  // The browser tier, whose failures are printed under the suite that owns
  // them -- so an entry names a `suite` and pays for one suite, not all of them.
  browser: {
    script: ["scripts", "run_viewer_browser_tests.mjs"],
    fail: /^ {4}FAIL sub-check: (.+)$/,
    suites: true,
  },
  // The pytest tier (2026-09-18). The one row that is not node, and the one
  // whose `suite` is not a registry key: pytest is handed ONE test file, and
  // the entry's `suite` IS that file, repo-relative. Scoped rather than a whole
  // `-m pytest` run for two reasons -- a full suite reads docs/ and data/,
  // neither of which is in the shadow, and it would include this table's own
  // pairing module (see SELF_PAIRING_SUITE).
  //
  // `expect_red` is therefore a different kind of string here: the TEST
  // FUNCTION's name, off pytest's `FAILED <file>::<name>` summary line, rather
  // than a prose sub-check. An exact identifier, which is the better of the two
  // -- and it is why `tests/test_mutation_witnesses.py` pairs a python entry
  // against its own suite file instead of against a shared CHECK_SOURCE.
  python: {
    // No script: the command is the interpreter plus `-m pytest`. tierCommand
    // reads this flag rather than sniffing for a null `script`.
    script: null,
    interpreter: "python",
    fail: /^FAILED \S+::(\w+)/,
    suites: true,
  },
};

// WHY AN ENTRY MISSED, in words a reader gets at a glance -- and the reason
// this is a vocabulary and not five inline strings.
//
// The summary line used to read `NOT WITNESSED: card-layout-out-of-flow` and
// nothing else: the ENTRY, never the REASON. The reasons are different defects
// with different fixes, and the distinction was already being drawn per entry,
// several screens up, in a sentence. So on 2026-09-14 one session read
// `card-layout-out-of-flow` as "the witness cannot see the difference" and
// repaired the witness; on 2026-09-15 three sessions read the same line, each
// found "the tier never reached the witness" underneath it, and each filed it
// as a new bug (ISSUE_20260915_card_layout_out_of_flow_mutation_reddens_an_
// earlier_check_so_it_is_never_witnessed and its two siblings). The reason
// belongs on the line that gets read.
const MISS = {
  // The `find` no longer resolves: not a failing guard, a guard that stopped
  // being checked.
  ROTTED: "the mutation no longer describes a place in the tree",
  // Nothing was proved either way, because the tier was broken before this
  // entry touched it.
  TIER_ALREADY_RED: "the tier was red before the mutation, so nothing was proved",
  // The mutation applied and the tier shrugged. THE GUARD is the problem.
  BLIND: "the witness cannot see the difference",
  // The tier died before any check could be attributed -- typically the
  // mutation broke the page badly enough to take a later hover or wait down
  // with it. THE HARNESS is the problem, not the guard.
  NEVER_REACHED: "the tier never reached the witness",
  // Some other named check caught it first, so the entry's own claim -- that
  // THIS guard reddens -- is still unproved.
  ATTRIBUTED_ELSEWHERE: "another check reddened, but not the declared one",
};

function harnessFor(mutation) {
  const harness = TIER_HARNESS[mutation.tier];
  if (!harness) {
    throw new Error(`${mutation.id}: unknown tier ${JSON.stringify(mutation.tier)}`);
  }
  return harness;
}

function tierCommand(mutation) {
  const harness = harnessFor(mutation);
  if (harness.interpreter === "python") {
    // No `--repo`: a pytest tier's tree is wherever its test file is, and the
    // file handed over is the SHADOW's copy -- tests/ is a package, so pytest
    // puts the shadow root on sys.path and the module's own REPO_ROOT lands in
    // the shadow with it. `--tb=no` because the only line this file parses is
    // the `FAILED <file>::<name>` summary one; `-p no:cacheprovider` so a run
    // leaves no .pytest_cache behind in the shadow it is about to reuse.
    return {
      command: PYTHON,
      args: ["-m", "pytest", "-q", "--tb=no", "-p", "no:cacheprovider",
             join(SHADOW, ...mutation.suite.split("/"))],
    };
  }
  // Always passed, to every NODE tier: a tier spawned inside the shadow would
  // otherwise resolve its data root to the shadow, which holds no data/ by
  // design. A harness that does not read it ignores it harmlessly -- one code
  // path here is worth more than a per-tier exception, and a harness that
  // learns `--repo` later then works with no change on this side.
  return {
    command: process.execPath,
    args: [join(SHADOW, ...harness.script), "--repo", DATA_REPO,
           ...(harness.suites ? ["--only", mutation.suite] : [])],
  };
}

function runTier(mutation) {
  return new Promise((resolve) => {
    const { command, args } = tierCommand(mutation);
    const child = spawn(command, args,
      { cwd: SHADOW, stdio: ["ignore", "pipe", "pipe"] });
    let out = "";
    child.stdout.on("data", (d) => { out += d; });
    child.stderr.on("data", (d) => { out += d; });
    child.on("close", (code) => {
      const pattern = harnessFor(mutation).fail;
      const failures = out.split(/\r?\n/)
        .map((line) => (line.match(pattern) || [])[1])
        .filter(Boolean);
      resolve({ code, out, failures });
    });
  });
}

// --- the shadow tree -------------------------------------------------------

function buildShadow() {
  rmSync(SHADOW, { recursive: true, force: true });
  mkdirSync(SHADOW, { recursive: true });
  for (const parts of SHADOWED) {
    cpSync(join(REPO, ...parts), join(SHADOW, ...parts), { recursive: true });
  }
}

// Anchors are matched against LF-normalised source, and `find`/`replace` are
// written with "\n" in the table. This repo is checked out with git's CRLF
// translation on, so a multi-line anchor authored as LF matches nothing on
// disk -- which the anchor check reports as a rotted entry, correctly and
// uselessly. Normalising is not cosmetic: it is what lets an entry span more
// than one line at all.
const lf = (text) => text.replace(/\r\n/g, "\n");

/** Apply `mutation` to the shadow; returns a function that undoes it. */
function applyToShadow(mutation) {
  const target = join(SHADOW, ...mutation.file.split("/"));
  const before = readFileSync(target, "utf8");
  writeFileSync(target, lf(before).replace(mutation.find, mutation.replace), "utf8");
  // ...restored byte for byte, line endings included: the shadow is reused by
  // every entry after this one.
  return () => writeFileSync(target, before, "utf8");
}

/** Where `find` resolves in THIS tree -- the anchor check, step 1 above. */
function anchorHits(mutation) {
  const source = lf(readFileSync(join(REPO, ...mutation.file.split("/")), "utf8"));
  return source.split(mutation.find).length - 1;
}

// --- the run ---------------------------------------------------------------

(async () => {
  if (!chosen.length) {
    console.log(`--only ${JSON.stringify(ONLY)} matches no entry. The entries are:` +
      all.map((m) => "\n  " + m.id).join(""));
    process.exitCode = 1;
    return;
  }
  // Not "was --repo given?" but "is the projection actually there?" -- the only
  // question that decides whether a `[real]` witness can run. A default --repo
  // that happens to point at a worktree is the same situation as a mistyped one.
  if (!existsSync(PROJECTION)) {
    console.log(`note: no topology projection under ${DATA_REPO} (looked for ` +
      "data/projections/viewer/topologies.json), so every `[real]` witness will " +
      "be skipped by the tier it runs in and reported as a MISS. " +
      (repoArg === null
        ? "That path is this tree; data/projections/viewer/ lives only in the " +
          "MAIN checkout, so pass --repo <main checkout> (or build the projection)."
        : "That path is the one --repo named.") + "\n");
  }

  // A table defect, not a witness outcome, so it stops the run rather than
  // being counted as a miss -- see SELF_PAIRING_SUITE for why it can never be
  // an honest entry.
  const reentrant = chosen.filter(
    (m) => m.tier === "python" && m.suite === SELF_PAIRING_SUITE);
  if (reentrant.length) {
    console.log(`REFUSED: ${reentrant.map((m) => m.id).join(", ")} declare ` +
      `${SELF_PAIRING_SUITE} as their pytest suite. That module is this table's ` +
      "own pairing half: with a mutation applied to the shadow, its anchor check " +
      "reddens for EVERY entry, so such a witness reads as coverage while " +
      "proving nothing. Point the entry at the test file that holds the guard.");
    process.exitCode = 1;
    return;
  }
  if (chosen.some((m) => m.tier === "python") && !existsSync(PYTHON)) {
    console.log(`note: no interpreter at ${PYTHON}, so every \`python\` witness ` +
      "will be reported as a MISS. " +
      (repoArg === null
        ? "That path is this tree; venv-win/ lives only in the MAIN checkout, " +
          "so pass --repo <main checkout>."
        : "That path is the one --repo named.") + "\n");
  }

  console.log(`building the shadow tree at ${SHADOW}`);
  buildShadow();

  // Each miss carries its REASON, not just its id -- see MISS above.
  const misses = [];
  // One clean run per distinct (tier, suite): step 2 above. Keyed rather than
  // run per entry because three of the declared witnesses share one suite.
  const baselines = new Map();

  for (const mutation of chosen) {
    console.log(`\n--- ${mutation.id}`);

    const hits = anchorHits(mutation);
    if (hits !== 1) {
      console.log(`  ANCHOR ROTTED: ${JSON.stringify(oneLine(mutation.find))} matches ` +
        `${hits} places in ${mutation.file} (expected exactly 1). This entry is ` +
        `checking nothing until its \`find\` is re-pointed at the code it means.`);
      misses.push({ id: mutation.id, why: MISS.ROTTED });
      continue;
    }

    const key = `${mutation.tier}|${mutation.suite || ""}`;
    if (!baselines.has(key)) {
      process.stdout.write(`  clean run of ${key.replace("|", " / ")}... `);
      const clean = await runTier(mutation);
      const green = clean.code === 0 && clean.failures.length === 0;
      console.log(green ? "green" : "RED");
      baselines.set(key, { green, out: clean.out });
    }
    const baseline = baselines.get(key);
    if (!baseline.green) {
      console.log(`  SKIPPED: the tier is already red with NO mutation applied, so ` +
        `nothing this entry does would prove anything. Fix the tier first.`);
      console.log(indent(baseline.out));
      misses.push({ id: mutation.id, why: MISS.TIER_ALREADY_RED });
      continue;
    }

    const undo = applyToShadow(mutation);
    let result;
    try {
      process.stdout.write("  mutated run... ");
      result = await runTier(mutation);
    } finally {
      undo();
    }

    if (result.failures.includes(mutation.expect_red)) {
      console.log(`WITNESSED`);
      console.log(`  ${mutation.file}: ${oneLine(mutation.find)}`);
      console.log(`  reddens: ${mutation.expect_red}`);
      if (VERBOSE) console.log(indent(result.out));
      continue;
    }

    if (result.code === 0 && result.failures.length === 0) {
      misses.push({ id: mutation.id, why: MISS.BLIND });
      console.log("NOT WITNESSED — the tier stayed GREEN with the mutation applied.");
    } else {
      misses.push({ id: mutation.id, why: result.failures.length
        ? MISS.ATTRIBUTED_ELSEWHERE : MISS.NEVER_REACHED });
      console.log("NOT WITNESSED — the tier went red, but not on the declared check.");
      console.log(`  declared: ${mutation.expect_red}`);
      console.log(`  actually failed:` +
        (result.failures.length
          ? result.failures.map((f) => "\n    " + f).join("")
          : " nothing named — the suite ABORTED rather than failing a check."));
      if (!result.failures.length) {
        // Worth saying out loud, because it is a real result wearing a
        // failure's clothes: a mutation that breaks the page badly enough to
        // stop a later hover or wait from ever completing takes its whole suite
        // down as an ERROR, and there is no check name for this tier to
        // attribute it to. The guard IS witnessing -- loudly -- but not in the
        // form an entry can declare. Narrow the mutation until it fails an
        // assertion instead of the harness.
        console.log("  (a mutation that breaks the page itself, rather than one " +
          "behaviour, aborts its suite; this tier can only attribute a NAMED " +
          "failure, so declare a narrower mutation.)");
        console.log(indent(result.out));
      }
    }
  }

  const witnessed = chosen.length - misses.length;
  console.log(`\n${witnessed}/${chosen.length} declared mutations witnessed`);
  if (misses.length) {
    // DECAY. The spec exists and the guard no longer bites -- which is the
    // failure this whole tier was built to find, and a different job from the
    // one below it.
    console.log("NOT WITNESSED — an enrolled guard that no longer reddens:" +
      misses.map((m) => `\n  ${m.id} — ${m.why}`).join(""));
    console.log("A guard that no longer reddens on its own declared mutation is " +
      "not a guard. Repair the guard, or -- if the app changed so the mutation " +
      "no longer describes a defect -- retire the spec and say why.");
    process.exitCode = 1;
  }

  // ...and the second failure class, which is not about any spec that exists.
  console.log("\nenrollment, per guard source:");
  console.log(censusReport(STATE.rows));
  const moved = STATE.rows.filter((r) => r.declared !== r.pinned);
  if (moved.length) {
    console.log("\nNOT ENROLLED — this tree declares guards the census is not " +
      "pinned at:" + moved.map((r) =>
        `\n  ${r.source}: ${r.declared} declared, pinned at ${r.pinned}`).join(""));
    console.log("A guard added without a mutation spec is the enrollment gap " +
      "arriving, and this is the moment it is cheap to close -- the author " +
      "still knows what the guard is for. Run `node " +
      "scripts/run_mutation_witness_tests.mjs --unenrolled` for the file name " +
      `to write under ${SPEC_DIR.join("/")}/, then raise that source's number ` +
      "in DECLARED_GUARDS (scripts/guard_enumeration.mjs). Raising it WITHOUT " +
      "a spec is allowed -- some guards cannot be witnessed -- and is then a " +
      "line in the diff rather than nothing at all.");
    process.exitCode = 1;
  }
  if (STATE.orphans.length) {
    // A renamed guard, seen from the spec's side. Loud here and in pytest,
    // which is the whole point of deriving the file name from the name.
    console.log("\nORPHANED SPECS — these name a guard the tree no longer " +
      "declares:" + STATE.orphans.map((s) =>
        `\n  ${s.specFile}\n    ${s.expect_red}`).join(""));
    process.exitCode = 1;
  }
})();

function indent(text) {
  return text.split(/\r?\n/).map((line) => "    | " + line).join("\n");
}
