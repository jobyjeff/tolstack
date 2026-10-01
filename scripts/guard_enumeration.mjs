// THE ENUMERATION OF GUARDS -- the one place this repo answers "what guards
// does the tree declare, and which of them is witnessed?"
//
// Until 2026-09-23 those were two hand-kept lists. A guard lived in
// apps/viewer/tests.js; its mutation witness lived in a row of a single JSON
// table, joined to the guard by a hand-written `id` that named neither. The
// consequence was not that the table went wrong -- it was that "this guard has
// no witness" was a fact NOBODY COULD COMPUTE. It could only be noticed, by a
// reviewer, one guard at a time, and then written down in an issue
// (`docs/issues/` held fourteen of those at once). Six enrollment handoffs in
// eight days moved the number and never the rate.
//
// So the two lists become one enumeration: the guard declarations IN THE TREE
// are the source, and an entry under scripts/mutation_witnesses/ is a MUTATION
// SPEC attached to one of them. What each side owns:
//
//   derived   which guards exist, what they are called, which tier runs them,
//             and therefore the file name its spec must be written at
//   authored  the mutation itself -- the file, the exact snippet, the broken
//             version. Nothing can derive that; it is the honest residue, and
//             it is the whole of what enrolling a guard now costs.
//
// A renamed guard is therefore a LOUD orphan rather than a silent one: its
// spec's derived file name no longer matches any declaration, and
// tests/test_mutation_witnesses.py says so in under a second, naming the file
// to rename it to. That is `expect_red`'s old weakness closed -- it used to be
// checked by counting substrings of the check source, so a name that resolved
// inside a COMMENT resolved, and a name that had been reworded produced
// nothing until somebody spent a browser sweep on it.
//
//   node scripts/guard_enumeration.mjs            # the census, for a reader
//   node scripts/guard_enumeration.mjs --json     # the payload, for a machine
//   node scripts/guard_enumeration.mjs --executed # ...and run the two fast
//                                                 # tiers, to pair the scan
//                                                 # against what they ran
//
// The JSON payload is what tests/test_mutation_witnesses.py reads (it spawns
// this file; node is already a hard requirement of that suite through
// tests/test_viewer_js_suite.py). Keeping the enumeration on THIS side rather
// than duplicating the scanners in Python is deliberate: the runner needs the
// same answer, and the runner cannot call the venv interpreter -- venv-win/
// exists only in the main checkout, which is the one situation the tier is
// most often run from a worktree to escape.
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, normalize } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));
export const REPO = normalize(join(HERE, ".."));

// WHERE A GUARD IS DECLARED, per tier word. This is the same vocabulary
// `TIER_HARNESS` in run_mutation_witness_tests.mjs keys on -- that object says
// how to RUN a tier, this one says how to READ its guard names out of the tree
// -- and tests/test_mutation_witnesses.py pairs the two key sets on every
// pytest run. A field vocabulary is a module-level constant and never an
// inline literal (CLAUDE.md).
//
// `call` is the function a guard declaration is written as, and it is matched
// only where it is NOT a method (`errors.push(...)` is not a check; a bare
// `push(...)` inside a browser suite is). `skip` is a second call spelling
// carrying the same name for the arm of a guard that did not run -- only the
// `call` arm can ever print a FAIL line, so a `skip` occurrence is not a
// declaration and is passed over.
export const GUARD_SOURCES = {
  // The viewer's fast tier. Note the file is NOT the harness
  // (apps/viewer/run_tests.cjs): the harness runs the names, the suite it
  // loads declares them.
  fast: {
    file: "apps/viewer/tests.js", call: "test", skip: "skip",
    runner: "apps/viewer/run_tests.cjs",
  },
  // The annotate app's fast tier, which is both harness and name source --
  // it loads no separate suite. The asymmetry with the row above is real.
  annotate: {
    file: "apps/annotate/run_tests.cjs", call: "check", skip: null,
    runner: "apps/annotate/run_tests.cjs",
  },
  // The browser tier. Every suite opens `const push = (name, cond) =>
  // checks.push({ name, cond: !!cond });` and then calls that closure, so the
  // declaration is a BARE `push(`; the `checks.push(` inside the closure is a
  // method call and is passed over by the same rule that skips `errors.push(`.
  //
  // `printed` is that tier's second declaration shape, and it exists for
  // exactly one guard: the dispatch loop's own check that a suite reports the
  // registry key it was handed. It sits ABOVE every suite, so it has no
  // `push` closure to call and writes the tier's failure line itself. Keyed on
  // that line rather than on the one call site, because the line is what the
  // runner parses -- a second hand-written FAIL would be enumerated too.
  browser: {
    file: "scripts/run_viewer_browser_tests.mjs",
    call: "push",
    skip: null,
    printed: "FAIL sub-check: ",
    // ...and the one source whose scan cannot be paired against a run. Two
    // independent reasons, and the second is the one that matters: even with
    // unlimited time the relation would not be EQUALITY.
    //   cost      it needs a real Chrome and several minutes, so it cannot sit
    //             inside `pytest -q` the way the two fast runners do.
    //   relation  a declared name may be RUN BY MORE THAN ONE SUITE (which is
    //             why a browser spec has to name its `suite` by hand), and
    //             most of its template names interpolate a live number (see
    //             `interpolated` below), so the string the tier prints is not
    //             the string the scan read. Set equality between "declared"
    //             and "executed" is false here by construction, not by cost.
    // So the browser row is pinned (count, enrollable, digest) like the other
    // two and is NOT pair-checked, and `CENSUS_LIMITS.browser_scan_unverified`
    // is what says so out loud on every census.
    runner: null,
  },
  // `python` is deliberately absent, and the absence is a statement: pytest
  // has no one file its guards are written in, and -- unlike the three above
  // -- the set of python guards a witness could ever name is not cheaply
  // computable. A python entry may only name a suite the SHADOW can run (one
  // that reads nothing outside SHADOWED), and deciding that for a given test
  // file means running it. So a python guard is enrollable and enrolled the
  // same way as any other, and it is not censused.
  // ISSUE_20260923_the_guard_census_cannot_see_a_pytest_guard.md
};

// WHAT EACH SOURCE DECLARES, pinned. Not decoration and not documentation: it
// is the whole gate. Adding a guard moves it, and a moved census is red -- in
// pytest in under a second, and in the tier -- with a message naming the file
// to write. That is the one mechanism that makes enrolling a guard the job of
// the session that WROTE the guard, rather than of a later enrollment handoff
// that has to rediscover what the guard was for. Six of those ran between
// 2026-09-15 and 2026-09-22 and the arrival rate of unenrolled guards did not
// move (docs/strategy/BRIEF_20260915_mutation_witness_enrollment.md).
//
// Raising a number without writing a spec is a legitimate move -- some guards
// cannot be witnessed, and the census counts those separately -- but it is now a
// line in a diff a reviewer reads, instead of nothing at all.
//
// THREE VALUES PER SOURCE, not one, since 2026-09-30. Until then the pin was a
// bare cardinality standing in for a SET, and three ways of arriving unenrolled
// moved no number at all
// (ISSUE_20260923_the_guard_census_pins_a_count_not_a_set_so_three_arrivals_are_silent).
// Each value closes a different one:
//
//   declared    how many guards the source declares. The readable half, and
//               the only one whose failure message can say anything useful on
//               its own ("516 declared, pinned at 517").
//   enrollable  how many of those a spec could ever name. It moves when a
//               SECOND declaration of an existing name appears: `enumerateGuards`
//               folds the two into one unattributable guard, so `declared`
//               holds still while an already-enrolled guard slides into the
//               population no entry can witness. Nothing pinned this before.
//   names       a digest of the sorted name set. This is the one that makes
//               the pin a SET rather than a count: one guard deleted and one
//               added in the same change leaves `declared` at 516 and moves
//               this. Sorted, so reordering a file is not a diff; twelve hex
//               characters, so the churn of a guard rename is one line and not
//               a merge conflict in a 516-name manifest (the option rejected
//               here -- see the lesson for the churn argument).
//
// The cost of the digest is that it says the set MOVED and not WHICH name
// moved; `CENSUS_LIMITS.digest_names_no_name` states that, and
// `node scripts/run_mutation_witness_tests.mjs --unenrolled` is what names the
// guard that needs a spec, which is the actionable half anyway.
export const DECLARED_GUARDS = {
  fast: { declared: 522, enrollable: 522, names: "39b4c947682b" },
  annotate: { declared: 169, enrollable: 169, names: "2be7ec32b331" },
  browser: { declared: 521, enrollable: 490, names: "88715dea6f9a" },
};

// WHAT THIS CENSUS STILL CANNOT SEE, computed nowhere and stated here, printed
// by every census run and pinned key-for-key by
// tests/test_mutation_witnesses.py.
//
// A gate with known bypasses is worth having; an UNDOCUMENTED one is not. Each
// of the three arrivals the 2026-09-30 pass closed had been sitting in the
// mechanism since it was built, invisible until a reviewer went looking -- so
// what is left over is emitted by the tooling rather than left in a review
// report for the next reviewer to rediscover.
export const CENSUS_LIMITS = {
  python_not_censused:
    "the `python` tier is not censused at all: pytest has no one file its " +
    "guards are written in, so a pytest guard can arrive unenrolled and move " +
    "nothing here (ISSUE_20260923_the_guard_census_cannot_see_a_pytest_guard)",
  browser_scan_unverified:
    "the browser source's scan is pinned but never paired against a run -- " +
    "the tier needs a real Chrome, and its declared names are templates one " +
    "suite or two may print, so `declared == executed` is false there by " +
    "construction. A browser guard written in a shape the scan does not match " +
    "is therefore still invisible in both directions",
  incomplete_run_pairs_one_way:
    "a fast tier that reports a SKIP ran a SUBSET, so only `everything that " +
    "ran was declared` is checked and `everything declared ran` is not. This " +
    "is the normal state in a worktree, where data/ is gitignored and the " +
    "viewer's [real] tier has no projection -- tests/test_viewer_js_suite.py " +
    "is the red that says so for the viewer; the annotate tier has no such " +
    "gate (ISSUE_20260918_the_annotate_js_suite_is_run_by_no_gate)",
  digest_names_no_name:
    "the `names` pin says the guard set moved, never which name moved -- run " +
    "`node scripts/run_mutation_witness_tests.mjs --unenrolled` for the guards " +
    "with no spec",
  pin_raised_without_a_spec:
    "raising a pin instead of writing a spec is allowed and is not detected " +
    "as anything: it is a line in a diff and a reviewer is the only check on it",
};

// The directory of mutation specs -- one file per witnessed guard, named for
// the guard it witnesses. One file rather than one table because the table was
// a collision surface: `HANDOFF_20260921_policy_free_brief_residues` shipped
// four guards and enrolled none of them, for the stated reason that the
// enrolling handoff was live in a sibling worktree and two agents editing one
// JSON file would have collided. Two agents enrolling two guards now touch two
// files that cannot collide, because neither of them chose the name.
export const SPEC_DIR = ["scripts", "mutation_witnesses"];

// Everything under SPEC_DIR that is NOT a spec. The prose that used to be the
// table's `about` block lives in the README beside them.
export const SPEC_DIR_README = "README.md";

/** Source text, LF-normalised -- the repo is checked out with CRLF on. */
export function sourceOf(repoRoot, relative) {
  return readFileSync(join(repoRoot, ...relative.split("/")), "utf8")
    .replace(/\r\n/g, "\n");
}

// A name too long for one source line is written as adjacent literals --
// `"the bar carries that one sentence " +\n  "and nothing else"` -- so the
// name a reader sees printed exists nowhere in the file as one string.
// Closing the seams before scanning is what makes the scan work at all; it
// deliberately misrepresents the file's text, joining exactly what the JS
// engine joins, and so is only ever used to read a NAME.
const SEAMS = [/"\s*\+\s*"/g, /`\s*\+\s*`/g];

/** `sourceOf` with every adjacent-literal seam closed. */
export function joinedSource(repoRoot, relative) {
  return SEAMS.reduce((text, seam) => text.replace(seam, ""), sourceOf(repoRoot, relative));
}

/**
 * Every guard declaration in `text`, as `{name, interpolated, at}`.
 *
 * A declaration is `<call>(` -- not preceded by a `.` or a word character, so
 * a method of the same name is not one -- whose first argument is a string or
 * template literal. `skipCall` is the same, and its occurrences are recorded
 * so the caller can subtract them.
 */
function declarationsIn(text, call, skipCall) {
  const found = [];
  const pattern = new RegExp(
    String.raw`(^|[^.\w$])(` + call + (skipCall ? "|" + skipCall : "") +
    String.raw`)\(\s*(?:"((?:[^"\\\n]|\\.)*)"|\x60([^\x60]*)\x60)`, "gm");
  for (const m of text.matchAll(pattern)) {
    const raw = m[3] !== undefined ? m[3] : m[4];
    found.push({
      name: unescapeLiteral(raw),
      // A template literal that interpolates resolves to a different string on
      // every run, so no entry can declare it: the runner compares the printed
      // name for EQUALITY. Measured, not assumed -- 46 of the browser tier's
      // 54 template names carry a live number
      // (ISSUE_20260922_forty_five_browser_check_names_are_interpolated_...).
      interpolated: m[4] !== undefined && raw.includes("${"),
      skipped: m[2] === skipCall,
      at: m.index,
    });
  }
  return found;
}

/**
 * Every guard whose name is written into the tier's failure line directly.
 *
 * Same shape as `declarationsIn`, so the caller cannot tell them apart -- the
 * literal is found with its seams already closed, which is the only reason a
 * name spread over four `" + "` continuations reads as one string here.
 */
function printedIn(text, marker) {
  const found = [];
  const pattern = new RegExp(
    String.raw`"\s*` + marker.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") +
    String.raw`((?:[^"\\\n]|\\.)*)"`, "g");
  for (const m of text.matchAll(pattern)) {
    found.push({ name: unescapeLiteral(m[1]), interpolated: false,
                 skipped: false, at: m.index });
  }
  return found;
}

/** The two escapes a check name actually uses. Not a JS string parser. */
function unescapeLiteral(raw) {
  return raw.replace(/\\(["\\`])/g, "$1");
}

/**
 * Every guard the tree declares, per tier.
 *
 * `enrollable` is false where no entry could ever name the guard, and `why`
 * says which of the two reasons it is. Both are computed rather than listed:
 * a population whose enrollment cost is infinite used only to show up as an
 * author transcribing a paste-ready row and finding pytest red.
 */
export function enumerateGuards(repoRoot = REPO) {
  const out = [];
  for (const [tier, source] of Object.entries(GUARD_SOURCES)) {
    const text = joinedSource(repoRoot, source.file);
    const declared = declarationsIn(text, source.call, source.skip)
      .filter((d) => !d.skipped)
      .concat(source.printed ? printedIn(text, source.printed) : []);
    const timesNamed = new Map();
    for (const d of declared) timesNamed.set(d.name, (timesNamed.get(d.name) || 0) + 1);
    for (const d of declared) {
      const twice = timesNamed.get(d.name) > 1;
      out.push({
        tier,
        source: source.file,
        name: d.name,
        enrollable: !d.interpolated && !twice,
        why: d.interpolated
          ? "its name is built by interpolation, so it is a different string on every run"
          : twice
            ? `its name is declared ${timesNamed.get(d.name)} times, so a red cannot be attributed to it`
            : null,
      });
    }
  }
  // Deduplicate the twice-declared ones down to one row each: the enumeration
  // is of GUARDS, and two declarations of one name are one unattributable
  // guard, not two.
  const seen = new Set();
  return out.filter((g) => {
    const key = `${g.tier}\u0000${g.name}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * A guard name SET, as twelve hex characters.
 *
 * Sorted before hashing, so moving a guard within its file is not a diff and
 * only the membership of the set is pinned. Twelve characters rather than the
 * whole digest because this is read and retyped by people: it has to fit on
 * the line it is pinned on, and 48 bits is far more collision headroom than a
 * set that changes a few times a week will ever spend.
 */
export function guardNameDigest(names) {
  // NUL-joined, not space-joined: a guard name is a prose sentence, so any
  // separator a name could itself contain would let two different sets hash
  // alike. The same separator the census keys (tier, name) on.
  return createHash("sha256")
    .update([...names].sort().join("\u0000"))
    .digest("hex").slice(0, 12);
}

// THE LINE SHAPE BOTH FAST RUNNERS PRINT, and the one this file parses to find
// out which guards a tier ACTUALLY RAN. `apps/viewer/run_tests.cjs` and
// `apps/annotate/run_tests.cjs` each print `PASS  <name>` / `FAIL  <name>`,
// two spaces, with any detail indented under it; a tier that could not run
// prints `SKIP  <name>` instead, and that run is a subset.
//
// `run_mutation_witness_tests.mjs`'s `TIER_HARNESS` holds the FAIL half of the
// same shape, for its own purposes. The two copies are paired on every pytest
// run through the runner PATH -- `GUARD_SOURCES[tier].runner` against that
// object's `script` -- rather than by sharing a regex, because the two files
// cannot import each other: the runner already imports this one.
export const RESULT_LINE = /^(?:PASS|FAIL) {2}(.+)$/;
export const SKIP_LINE = /^SKIP {2}(.+)$/;
// The runner's own arithmetic: `<ran - failed>/<ran> passed`, possibly with a
// skipped-tier clause after it. Read so the parse above is CHECKED against the
// runner's count rather than trusted -- see `pairExecuted`.
export const TOTAL_LINE = /^(\d+)\/(\d+) passed/;

/** Run one source's tier and return its stdout, or the reason it did not. */
function runTier(repoRoot, runner) {
  const proc = spawnSync(
    process.execPath, [join(repoRoot, ...runner.split("/"))],
    { cwd: repoRoot, encoding: "utf8", maxBuffer: 1 << 26, timeout: 300000 });
  if (proc.error) return { stdout: "", failure: String(proc.error.message) };
  if (typeof proc.stdout !== "string") {
    return { stdout: "", failure: `${runner} printed nothing on stdout` };
  }
  return { stdout: proc.stdout.replace(/\r\n/g, "\n"), failure: null };
}

/**
 * The scan, paired against what the tier actually ran.
 *
 * THIS IS WHAT MAKES THE SCANNER FALSIFIABLE. Everything else here trusts
 * `declarationsIn` to have found every guard: the pin says how many the scan
 * found, never whether the scan is right. A guard written in a shape the regex
 * does not match -- `test('…')` in single quotes, or a name handed in by a
 * helper or a loop -- is invisible in BOTH directions at once: not censused,
 * therefore not enrollable, therefore never printed by `--unenrolled`.
 * Measured 2026-09-23: zero such declarations exist, which is a fact with a
 * shelf life and not a property of the mechanism.
 *
 * A reviewer established this pairing by hand on 2026-09-23 -- 516/516 and
 * 151/151, exact agreement twice. This is that measurement made to happen on
 * every run instead of once.
 *
 * Note what is NOT read: the exit code. A guard that ran and FAILED still ran,
 * and whether the fast tiers are green is `tests/test_viewer_js_suite.py`'s
 * question rather than this one. This function asks only *which names the tier
 * put on its own output*, so a legitimately red suite does not also produce a
 * spurious census failure -- and so spawning the annotate runner here does not
 * quietly become the gate
 * ISSUE_20260918_the_annotate_js_suite_is_run_by_no_gate.md is still open for.
 *
 * Two directions, and only one of them survives an incomplete run:
 *
 *   ran but not declared   always checked. A subset run is still a subset, so
 *                          a name the tier printed that the scan never found
 *                          is a scanner miss whatever else was skipped.
 *   declared but not run   checked only when the tier reported no SKIP. From a
 *                          worktree the viewer's [real] tier has no projection
 *                          and ~94 checks do not run at all, so this direction
 *                          would say nothing there but "you are in a worktree"
 *                          -- which pytest already says, once, through
 *                          tests/test_viewer_js_suite.py.
 */
export function pairExecuted(repoRoot = REPO) {
  const guards = enumerateGuards(repoRoot);
  return Object.entries(GUARD_SOURCES).map(([tier, source]) => {
    const declared = new Set(
      guards.filter((g) => g.tier === tier).map((g) => g.name));
    const row = {
      tier, source: source.file, runner: source.runner,
      declared: declared.size, paired: false, complete: false,
      executed: null, ranNotDeclared: [], declaredNotRun: [], ranTwice: [],
      skipped: [], failure: null,
    };
    if (!source.runner) return row;
    const { stdout, failure } = runTier(repoRoot, source.runner);
    if (failure) return { ...row, failure };

    const ran = [];
    for (const line of stdout.split("\n")) {
      const hit = RESULT_LINE.exec(line);
      if (hit) ran.push(hit[1]);
      const skip = SKIP_LINE.exec(line);
      if (skip) row.skipped.push(skip[1]);
    }
    // The parse, checked against the runner's own arithmetic before anything
    // is concluded from it. A scan that finds nothing satisfies every subset
    // test there is; and a FAIL whose error text begins a line with `PASS  `
    // would otherwise be read as a guard nobody declared.
    const totals = [...stdout.matchAll(new RegExp(TOTAL_LINE.source, "gm"))];
    const reported = totals.length ? Number(totals[totals.length - 1][2]) : null;
    if (reported !== ran.length) {
      return { ...row, failure:
        `read ${ran.length} PASS/FAIL lines out of ${source.runner}, which ` +
        `reports ${reported === null ? "no total line at all" : reported + " ran"}` +
        ". The line shape this file parses (RESULT_LINE) and the one that " +
        "runner prints have parted company, so the pairing would be measuring " +
        "its own parse." };
    }

    const counted = new Map();
    for (const name of ran) counted.set(name, (counted.get(name) || 0) + 1);
    return {
      ...row,
      paired: true,
      complete: row.skipped.length === 0,
      executed: ran.length,
      ranNotDeclared: [...counted.keys()].filter((n) => !declared.has(n)).sort(),
      ranTwice: [...counted].filter(([, n]) => n > 1).map(([name]) => name).sort(),
      declaredNotRun: row.skipped.length
        ? [] : [...declared].filter((n) => !counted.has(n)).sort(),
    };
  });
}

/** Every way one source's pairing came out wrong, in words. */
export function pairingFaults(row) {
  const faults = row.failure ? [row.failure] : [];
  for (const name of row.ranNotDeclared) {
    faults.push(`ran, and the scan never found it: ${JSON.stringify(name)}`);
  }
  for (const name of row.ranTwice) {
    faults.push("ran more than once, so a red cannot be attributed to it: " +
      JSON.stringify(name));
  }
  for (const name of row.declaredNotRun) {
    faults.push(`the scan found it and the tier never ran it: ${JSON.stringify(name)}`);
  }
  return faults;
}

/**
 * The file name a spec for this guard must be written at.
 *
 * Derived, and derived HERE only -- the Python half reads it out of this
 * file's `--json` rather than reimplementing it, because two slug functions
 * that agree today is the same bug as two hand-kept lists that agree today.
 * The trailing digest is what makes the name unique when the readable part is
 * truncated, and what makes a reworded guard's spec land at a different name
 * instead of silently keeping the old one.
 *
 * THE UNIT IS THE GUARD, NOT THE MUTATION, and that is why a spec file holds a
 * LIST of mutations. Five guards in the table this replaced were named by more
 * than one entry -- three ways to break the topology switch, two to break the
 * command-table ban -- because a guard worth witnessing is often worth
 * witnessing from more than one direction. Keying the file on the guard alone
 * keeps the name fully derived (nothing in it is chosen, so nothing in it can
 * collide), and makes "this guard has n mutations" the thing a reader sees
 * rather than n rows that happen to share a string.
 */
export function specFileName({ tier, expect_red }) {
  // The digest covers the tier and the guard's NAME and nothing else. NOT the
  // suite: a browser guard's name is declared once in the source and may be run
  // by two suites, so the enumeration -- which reads declarations -- cannot know
  // which suite a given guard belongs to. Keying on what the enumeration CAN see
  // is what lets `--unenrolled` print the exact file name to write for a guard
  // that has no spec yet, which is the difference between a census and an
  // instruction. (Measured before it was relied on: no two specs in the table
  // this replaced shared a tier and a name while differing in suite.)
  const digest = createHash("sha256")
    .update(`${tier}\u0000${expect_red}`)
    .digest("hex").slice(0, 8);
  return `${tier}__${slug(expect_red, 56)}__${digest}.json`;
}

function slug(text, cap) {
  const flat = text.toLowerCase().replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return (flat.length > cap ? flat.slice(0, cap).replace(/-+$/, "") : flat) || "unnamed";
}

/** Every mutation spec on disk, each carrying the file it was read from. */
export function readSpecs(repoRoot = REPO) {
  const dir = join(repoRoot, ...SPEC_DIR);
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter((n) => n.endsWith(".json")).sort()
    .map((name) => ({
      ...JSON.parse(readFileSync(join(dir, name), "utf8")),
      specFile: name,
    }));
}

/**
 * The enumeration and the specs, joined.
 *
 * `enrolled` is a guard with a spec, `unenrolled` a guard without one and
 * `orphans` a spec naming a guard the tree does not declare -- which is what a
 * rename looks like from here, and the whole reason the join exists.
 */
export function census(repoRoot = REPO) {
  const guards = enumerateGuards(repoRoot);
  const specs = readSpecs(repoRoot);
  const key = (tier, name) => `${tier}\u0000${name}`;
  const declared = new Map(guards.map((g) => [key(g.tier, g.name), g]));
  const spec_of = new Map();
  const orphans = [];
  for (const spec of specs) {
    const k = key(spec.tier, spec.expect_red);
    // A `python` entry names no censused source, so it can never be an orphan
    // here; its pairing is against its own suite file, in the Python half.
    if (spec.tier !== "python" && !declared.has(k)) {
      orphans.push(spec);
      continue;
    }
    spec_of.set(k, spec);
  }
  const rows = Object.keys(GUARD_SOURCES).map((tier) => {
    const mine = guards.filter((g) => g.tier === tier);
    const enrolled = mine.filter((g) => spec_of.has(key(tier, g.name)));
    const pin = DECLARED_GUARDS[tier];
    return {
      tier,
      source: GUARD_SOURCES[tier].file,
      declared: mine.length,
      // `pinned` stays the bare count it always was, and the two new pins sit
      // beside it under their own names: `scripts/run_mutation_witness_tests.mjs`
      // reads `r.declared !== r.pinned` off these rows.
      pinned: pin.declared,
      enrollable: mine.filter((g) => g.enrollable).length,
      pinnedEnrollable: pin.enrollable,
      names: guardNameDigest(mine.map((g) => g.name)),
      pinnedNames: pin.names,
      enrolled: enrolled.length,
      mutations: enrolled.reduce(
        (n, g) => n + spec_of.get(key(tier, g.name)).mutations.length, 0),
    };
  }).map((row) => ({
    // The line to paste back when a pin moves, carried on the row so the
    // remedy is written HERE -- where the literal it replaces lives -- and not
    // re-derived by every reader that has to print one.
    ...row, pinLine: pinLine(row),
  }));
  return {
    guards: guards.map((g) => ({
      ...g,
      spec: spec_of.get(key(g.tier, g.name))?.specFile ?? null,
    })),
    specs,
    orphans,
    rows,
    // The pins, answered -- all three of them, per source. Nothing else in
    // this payload is a pass/fail.
    censusHolds: rows.every((r) => !pinsMoved(r).length),
  };
}

/** Every pin of one source that its tree no longer agrees with, in words. */
export function pinsMoved(row) {
  const moved = [];
  if (row.declared !== row.pinned) {
    moved.push(`${row.declared} declared, pinned at ${row.pinned}`);
  }
  if (row.enrollable !== row.pinnedEnrollable) {
    moved.push(`${row.enrollable} enrollable, pinned at ${row.pinnedEnrollable}` +
      " -- a guard has moved into or out of the population no spec can name, " +
      "which `declared` alone does not show");
  }
  if (row.names !== row.pinnedNames) {
    moved.push(`the guard NAME SET is ${row.names}, pinned at ${row.pinnedNames}` +
      (row.declared === row.pinned
        ? " -- the count did not move, so this is a guard swapped for another " +
          "or a guard renamed"
        : ""));
  }
  return moved;
}

/** The line to paste back into DECLARED_GUARDS, for the source that moved. */
export function pinLine(row) {
  return `  ${row.tier}: { declared: ${row.declared}, ` +
    `enrollable: ${row.enrollable}, names: "${row.names}" },`;
}

/** One line per source, for a human. Numbers right-aligned, no chrome. */
export function censusReport(rows) {
  const width = (pick) => Math.max(...rows.map((r) => String(pick(r)).length));
  const w1 = Math.max(...rows.map((r) => r.source.length));
  const w2 = Math.max(width((r) => r.declared), 8);
  return rows.map((r) => {
    const moved = pinsMoved(r);
    return `  ${r.source.padEnd(w1)}  ${String(r.enrolled).padStart(w2)} enrolled` +
      ` / ${String(r.enrollable).padStart(w2)} enrollable` +
      ` / ${String(r.declared).padStart(w2)} declared` +
      moved.map((why) => `\n  ${" ".repeat(w1)}  <-- ${why}`).join("");
  }).join("\n");
}

/** What the census cannot see, for a human. One line per limit. */
export function limitsReport() {
  return Object.entries(CENSUS_LIMITS)
    .map(([key, why]) => `  ${key}\n${wrap(why, 72, "    ")}`).join("\n");
}

function wrap(text, cap, indent) {
  const lines = [];
  let line = indent;
  for (const word of text.split(" ")) {
    if (line.length > indent.length && line.length + 1 + word.length > cap) {
      lines.push(line);
      line = indent;
    }
    line += (line.length > indent.length ? " " : "") + word;
  }
  return lines.concat(line).join("\n");
}

/** The pairing of scan against run, for a human. */
export function pairingReport(pairs) {
  return pairs.map((p) => {
    const faults = pairingFaults(p);
    if (!p.runner) {
      return `  ${p.source}\n    not paired against a run -- see ` +
        "CENSUS_LIMITS.browser_scan_unverified";
    }
    const how = p.complete
      ? `${p.executed} ran, ${p.declared} declared, both directions checked`
      : `${p.executed} of ${p.declared} ran (${p.skipped.length} SKIP), so only ` +
        "`everything that ran was declared` was checked";
    return `  ${p.source}\n    ${p.failure ? "COULD NOT PAIR" : how}` +
      faults.map((f) => `\n    <-- ${f}`).join("");
  }).join("\n");
}

if (process.argv[1] && normalize(process.argv[1]) === normalize(fileURLToPath(import.meta.url))) {
  const state = census();
  // The pairing runs the two fast tiers, so it is opt-in on BOTH modes rather
  // than something every reader of the census pays a few seconds for.
  const pairs = process.argv.includes("--executed") ? pairExecuted() : null;
  if (process.argv.includes("--json")) {
    console.log(JSON.stringify({
      sources: GUARD_SOURCES,
      pinned: DECLARED_GUARDS,
      limits: CENSUS_LIMITS,
      specDir: SPEC_DIR.join("/"),
      specDirReadme: SPEC_DIR_README,
      guards: state.guards,
      rows: state.rows,
      pairs,
      orphans: state.orphans.map((s) => ({
        specFile: s.specFile, tier: s.tier, expect_red: s.expect_red })),
      specNames: Object.fromEntries(
        state.specs.map((s) => [s.specFile, specFileName(s)])),
    }));
  } else {
    console.log(censusReport(state.rows));
    const moved = state.rows.filter((r) => pinsMoved(r).length);
    if (moved.length) {
      console.log("\nthe pins to write back into DECLARED_GUARDS:");
      console.log(moved.map(pinLine).join("\n"));
    }
    if (pairs) {
      console.log("\nthe scan, paired against what the tier ran:");
      console.log(pairingReport(pairs));
    }
    // ALWAYS printed, pairing or no pairing. The honest limits are not a
    // verbose mode: the three arrivals closed on 2026-09-30 had each been
    // sitting in this mechanism unnamed until a reviewer went looking, and a
    // gate whose bypasses are only in a review report grows a fourth.
    console.log("\nwhat this census cannot see:");
    console.log(limitsReport());
  }
}
