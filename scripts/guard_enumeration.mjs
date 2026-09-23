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
//
// The JSON payload is what tests/test_mutation_witnesses.py reads (it spawns
// this file; node is already a hard requirement of that suite through
// tests/test_viewer_js_suite.py). Keeping the enumeration on THIS side rather
// than duplicating the scanners in Python is deliberate: the runner needs the
// same answer, and the runner cannot call the venv interpreter -- venv-win/
// exists only in the main checkout, which is the one situation the tier is
// most often run from a worktree to escape.
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
  fast: { file: "apps/viewer/tests.js", call: "test", skip: "skip" },
  // The annotate app's fast tier, which is both harness and name source --
  // it loads no separate suite. The asymmetry with the row above is real.
  annotate: { file: "apps/annotate/run_tests.cjs", call: "check", skip: null },
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

// HOW MANY GUARDS EACH SOURCE DECLARES, pinned. The number is not decoration
// and it is not documentation: it is the whole gate. Adding a guard moves it,
// and a moved census is red -- in pytest in under a second, and in the tier --
// with a message naming the file to write. That is the one mechanism that
// makes enrolling a guard the job of the session that WROTE the guard, rather
// than of a later enrollment handoff that has to rediscover what the guard was
// for. Six of those ran between 2026-09-15 and 2026-09-22 and the arrival rate
// of unenrolled guards did not move
// (docs/strategy/BRIEF_20260915_mutation_witness_enrollment.md).
//
// Raising a number without writing a spec is a legitimate move -- some guards
// cannot be witnessed, and one of them is measured below -- but it is now a
// line in a diff a reviewer reads, instead of nothing at all.
export const DECLARED_GUARDS = {
  fast: 513,
  annotate: 154,
  browser: 506,
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
    return {
      tier,
      source: GUARD_SOURCES[tier].file,
      declared: mine.length,
      pinned: DECLARED_GUARDS[tier],
      enrollable: mine.filter((g) => g.enrollable).length,
      enrolled: enrolled.length,
      mutations: enrolled.reduce(
        (n, g) => n + spec_of.get(key(tier, g.name)).mutations.length, 0),
    };
  });
  return {
    guards: guards.map((g) => ({
      ...g,
      spec: spec_of.get(key(g.tier, g.name))?.specFile ?? null,
    })),
    specs,
    orphans,
    rows,
    // The pin, answered. Nothing else in this payload is a pass/fail.
    censusHolds: rows.every((r) => r.declared === r.pinned),
  };
}

/** One line per source, for a human. Numbers right-aligned, no chrome. */
export function censusReport(rows) {
  const width = (pick) => Math.max(...rows.map((r) => String(pick(r)).length));
  const w1 = Math.max(...rows.map((r) => r.source.length));
  const w2 = Math.max(width((r) => r.declared), 8);
  return rows.map((r) =>
    `  ${r.source.padEnd(w1)}  ${String(r.enrolled).padStart(w2)} enrolled` +
    ` / ${String(r.enrollable).padStart(w2)} enrollable` +
    ` / ${String(r.declared).padStart(w2)} declared` +
    (r.declared === r.pinned ? "" : `   <-- PINNED AT ${r.pinned}`)).join("\n");
}

if (process.argv[1] && normalize(process.argv[1]) === normalize(fileURLToPath(import.meta.url))) {
  const state = census();
  if (process.argv.includes("--json")) {
    console.log(JSON.stringify({
      sources: GUARD_SOURCES,
      pinned: DECLARED_GUARDS,
      specDir: SPEC_DIR.join("/"),
      specDirReadme: SPEC_DIR_README,
      guards: state.guards,
      rows: state.rows,
      orphans: state.orphans.map((s) => ({
        specFile: s.specFile, tier: s.tier, expect_red: s.expect_red })),
      specNames: Object.fromEntries(
        state.specs.map((s) => [s.specFile, specFileName(s)])),
    }));
  } else {
    console.log(censusReport(state.rows));
  }
}
