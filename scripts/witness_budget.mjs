// The mutation-witness run's wall-clock budget: what order to run the selected
// entries in, when to stop launching them, and how to say so.
//
// Pure on purpose -- the clock and the entry runner are handed in -- so
// `tests/test_mutation_witnesses.py` can drive the real loop with a fake clock
// instead of a browser. `scripts/run_mutation_witness_tests.mjs` is the only
// importer.
//
// THE DECISION (2026-10-27, Jeff): the merge gate's job is to catch a witness
// THIS merge decayed, and a decayed witness is a test-quality defect with no
// product exposure, so one the gate did not reach is the scheduled sweep's
// (docs/prompts/WITNESS_SWEEP.md) on a day's latency -- not a reason to hold the
// merge train. A capped run is a COMPLETE run of what it reached, never a failure.

/** The default cap, minutes. `--full` (the sweep) and `--budget-min 0` have none. */
export const DEFAULT_BUDGET_MIN = 30;

/** Fast node tiers run first, then python, then every tier that starts a Chrome. */
export function tierRank(entry, startsBrowser) {
  if (startsBrowser(entry.tier)) return 2;
  return entry.tier === "python" ? 1 : 0;
}

/**
 * The selection in the order that makes the unreached remainder the expensive
 * tail: fast, python, then browser; within a rank grouped by suite so one
 * suite's clean baseline is paid once. Stable, so ties keep registry order.
 */
export function orderForBudget(entries, startsBrowser) {
  return entries
    .map((entry, index) => ({ entry, index, rank: tierRank(entry, startsBrowser) }))
    .sort((a, b) => a.rank - b.rank
      || (a.entry.suite || "").localeCompare(b.entry.suite || "")
      || a.index - b.index)
    .map(({ entry }) => entry);
}

/**
 * Launch the next entry? Not once the elapsed time plus this tier's running mean
 * per-entry time would cross the budget. A tier with nothing measured yet has a
 * mean of 0, so its first entry launches while any budget is left.
 */
export function mayLaunch({ elapsedSec, meanSec, budgetMin }) {
  if (!(budgetMin > 0)) return true;
  return elapsedSec + meanSec <= budgetMin * 60;
}

/** `35m03s`, or `41s` under a minute. */
export function formatWall(sec) {
  const whole = Math.round(sec);
  const m = Math.floor(whole / 60);
  const s = whole % 60;
  return m ? `${m}m${String(s).padStart(2, "0")}s` : `${s}s`;
}

/** The capped run's last line: all four numbers, one line. */
export function summaryLine({ witnessed, reached, selected, wallSec, left }) {
  return `${witnessed}/${reached} witnessed, ${reached}/${selected} reached in ` +
    `${formatWall(wallSec)}; ${left} left to the sweep`;
}

/** The `left to the sweep` note for one unreached entry. */
export function leftLine(entry) {
  return `left to the sweep (budget): ${entry.id} [${entry.tier}, ${entry.suite || "-"}]`;
}

/**
 * Runs `entries` (already ordered) one at a time through `runEntry`, stopping
 * the launching -- never the entry in flight -- when the budget would be crossed.
 * `runEntry(entry)` resolves to `{ witnessed: boolean }`; `now()` is seconds.
 * Returns `{ results: [{entry, seconds, witnessed}], left: [entry] }`.
 */
export async function runWithBudget(entries, { budgetMin, now, runEntry }) {
  const t0 = now();
  const results = [];
  const spent = new Map();   // tier -> { total, n }
  let i = 0;
  for (; i < entries.length; i += 1) {
    const entry = entries[i];
    const tally = spent.get(entry.tier);
    const meanSec = tally ? tally.total / tally.n : 0;
    if (!mayLaunch({ elapsedSec: now() - t0, meanSec, budgetMin })) break;
    const started = now();
    const outcome = await runEntry(entry);
    const seconds = now() - started;
    const t = spent.get(entry.tier) || { total: 0, n: 0 };
    spent.set(entry.tier, { total: t.total + seconds, n: t.n + 1 });
    results.push({ entry, seconds, witnessed: outcome.witnessed });
  }
  return { results, left: entries.slice(i), wallSec: now() - t0 };
}

/** The `n` slowest results, slowest first. */
export function slowest(results, n = 15) {
  return [...results].sort((a, b) => b.seconds - a.seconds).slice(0, n);
}

/**
 * The exit code of the witnessing half of a run: 1 only on a real miss among the
 * entries REACHED. What was left to the sweep is deliberately not an argument.
 */
export function exitCodeFor({ misses }) {
  return misses > 0 ? 1 : 0;
}

/**
 * Every value of every `--only` in `argv`, in order. The flag may repeat; a value
 * is never split here -- see `resolveOnly`, which knows what the entries are.
 */
export function onlyValues(argv) {
  const out = [];
  argv.forEach((arg, i) => {
    if (arg === "--only" && i + 1 < argv.length) out.push(argv[i + 1]);
  });
  return out;
}

/** Does `entry` answer to `term`: its derived id, or the guard's own name. */
export function matchesOnly(entry, term) {
  return entry.id.includes(term) || entry.expect_red.includes(term);
}

/**
 * The `--only` terms to select by: each value as written when it matches anything
 * (so the single-substring form, and a guard name that itself contains a comma,
 * are unchanged), and otherwise split on commas, so `--only a,b` names two. A
 * term that matches nothing stays a term, and the caller reports it.
 */
export function resolveOnly(entries, values) {
  const terms = [];
  for (const value of values) {
    const pieces = entries.some((e) => matchesOnly(e, value))
      ? [value] : value.split(",").map((p) => p.trim()).filter(Boolean);
    terms.push(...(pieces.length ? pieces : [value]));
  }
  return terms;
}

/** The entries any term selects, in registry order. */
export function selectOnly(entries, terms) {
  return entries.filter((e) => terms.some((t) => matchesOnly(e, t)));
}

/** The terms that select nothing: a typo a several-guard run must not swallow. */
export function unmatchedOnly(entries, terms) {
  return terms.filter((t) => !entries.some((e) => matchesOnly(e, t)));
}

/**
 * The run's cap in minutes: none for `--full`, the flag's number when given, else
 * the default. NaN or negative comes back as-is for the caller to refuse.
 */
export function resolveBudgetMin({ full, arg }) {
  return full ? 0 : arg === null || arg === undefined ? DEFAULT_BUDGET_MIN : Number(arg);
}
