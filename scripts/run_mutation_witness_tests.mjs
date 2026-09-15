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
//   node scripts/run_mutation_witness_tests.mjs --only card-layout   # one entry
//   node scripts/run_mutation_witness_tests.mjs --verbose            # show the red
//   node scripts/run_mutation_witness_tests.mjs --list
//
// `--repo` is the worktree escape hatch, same as the two tiers below it:
// data/projections/viewer/ lives only in the MAIN checkout, and the `[real]`
// witnesses are skipped -- and so reported as misses -- without it. It is
// passed straight through to whichever tier a mutation names.
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
// WHAT IT DOES, per entry in scripts/mutation_witnesses.json:
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
// THE SHADOW TREE. `apps/` and `scripts/` are copied to tmp/mutation-witness/
// and the copy is what gets patched; this tree is never written to. The shadow
// has to live INSIDE the repo (tmp/ is gitignored) for one specific reason:
// node resolves `playwright-core` by walking up from the running script's own
// directory, so a shadow under the system temp dir would find no node_modules
// at all. Each run restores the file it patched, so the shadow is left clean.
import { spawn } from "node:child_process";
import { readFileSync, rmSync, cpSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, normalize } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = normalize(join(HERE, ".."));
const SHADOW = join(REPO, "tmp", "mutation-witness");
const TABLE = join(HERE, "mutation_witnesses.json");
// The directories the tiers actually read. apps/ is the app under test and
// scripts/ is the browser runner itself; nothing else in the repo is loaded by
// either tier, and copying data/ (gigabytes, gitignored, main-checkout only)
// would be both wrong and slow -- `--repo` is how a tier reaches that.
const SHADOWED = ["apps", "scripts"];

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
const ONLY = argFlag("--only");
// `--verbose` prints the mutated run's whole output even when the entry passes.
// A miss prints it either way -- this is for reading the red a witness actually
// produces, which is what a lesson or a review writes down.
const VERBOSE = process.argv.includes("--verbose");

const table = JSON.parse(readFileSync(TABLE, "utf8"));
const all = table.mutations;
const chosen = ONLY === null ? all : all.filter((m) => m.id.includes(ONLY));

if (process.argv.includes("--list")) {
  for (const m of all) {
    console.log(`${m.id}\n  tier      ${m.tier}${m.suite ? ` / --only ${JSON.stringify(m.suite)}` : ""}`);
    console.log(`  contract  ${m.contract}`);
    console.log(`  mutation  ${m.file}: ${oneLine(m.find)} -> ${oneLine(m.replace)}`);
    console.log(`  must red  ${m.expect_red}\n`);
  }
  process.exit(0);
}

function oneLine(text) {
  const flat = text.replace(/\s+/g, " ").trim();
  return flat.length > 96 ? flat.slice(0, 93) + "..." : flat;
}

// --- running a tier --------------------------------------------------------
//
// Both tiers report the same two things this file needs: an exit code, and the
// NAME of every check that failed. The fast tier prints `FAIL  <name>`; the
// browser tier prints `    FAIL sub-check: <name>` under the suite that owns
// it. Nothing else in either output is parsed -- a tier is free to print
// whatever else it likes.
const FAST_FAIL = /^FAIL {2}(.+)$/;
const BROWSER_FAIL = /^ {4}FAIL sub-check: (.+)$/;

function tierCommand(mutation) {
  // Always passed: a tier spawned inside the shadow would otherwise resolve its
  // data root to the shadow, which holds no data/ by design.
  const repoArgs = ["--repo", DATA_REPO];
  if (mutation.tier === "fast") {
    return [join(SHADOW, "apps", "viewer", "run_tests.cjs"), ...repoArgs];
  }
  if (mutation.tier === "browser") {
    return [join(SHADOW, "scripts", "run_viewer_browser_tests.mjs"),
            ...repoArgs, "--only", mutation.suite];
  }
  throw new Error(`${mutation.id}: unknown tier ${JSON.stringify(mutation.tier)}`);
}

function runTier(mutation) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, tierCommand(mutation),
      { cwd: SHADOW, stdio: ["ignore", "pipe", "pipe"] });
    let out = "";
    child.stdout.on("data", (d) => { out += d; });
    child.stderr.on("data", (d) => { out += d; });
    child.on("close", (code) => {
      const pattern = mutation.tier === "fast" ? FAST_FAIL : BROWSER_FAIL;
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
  for (const dir of SHADOWED) {
    cpSync(join(REPO, dir), join(SHADOW, dir), { recursive: true });
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

  console.log(`building the shadow tree at ${SHADOW}`);
  buildShadow();

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
      misses.push(mutation.id);
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
      misses.push(mutation.id);
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

    misses.push(mutation.id);
    if (result.code === 0 && result.failures.length === 0) {
      console.log("NOT WITNESSED — the tier stayed GREEN with the mutation applied.");
    } else {
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
    console.log("NOT WITNESSED: " + misses.join(", "));
    console.log("A guard that no longer reddens on its own declared mutation is " +
      "not a guard. Repair the guard, or -- if the app changed so the mutation " +
      "no longer describes a defect -- retire the entry and say why.");
    process.exitCode = 1;
  }
})();

function indent(text) {
  return text.split(/\r?\n/).map((line) => "    | " + line).join("\n");
}
