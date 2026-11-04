// A page clock a script can step: Date.now, performance.now and
// requestAnimationFrame, held still until `window.__clock.freeze()` and then
// advanced by hand -- `step(ms)` runs one animation frame, `ms` of page time
// after the last. A transition filmed or sampled this way has frames exactly
// that far apart however slow the machine or the screenshots are, which is
// what makes a "never jumps between two frames" check deterministic instead of
// a race against the frame rate.
//
// Used two ways, both by passing the function itself to the page:
//   page.addInitScript(CLOCK)   before the page's own scripts (scripts/filmstrip.mjs)
//   page.evaluate(CLOCK)        on a page already loaded (the browser tier)
// Playwright's own actionability waits are animation frames too, so while the
// clock is frozen drive the page with dispatched events and
// `waitForFunction(..., { polling: <ms> })`, not with `locator.click()`.
// The page's clock, steerable. Installed before the page's own scripts run, and
// a pass-through until freeze(): the scenario's setup and click use real time
// (Playwright's own actionability checks wait on animation frames), and only the
// filmed part is stepped.
export const CLOCK = () => {
  if (window.__clock) return;
  const realNow = Date.now.bind(Date);
  const realPerf = performance.now.bind(performance);
  const realRaf = window.requestAnimationFrame.bind(window);
  let frozen = false, date = 0, perf = 0, queue = [], id = 1000000;
  Date.now = () => (frozen ? date : realNow());
  performance.now = () => (frozen ? perf : realPerf());
  window.requestAnimationFrame = (fn) => {
    if (!frozen) return realRaf(fn);
    queue.push([++id, fn]);
    return id;
  };
  window.cancelAnimationFrame = ((real) => (n) => {
    queue = queue.filter(([i]) => i !== n);
    return real(n);
  })(window.cancelAnimationFrame.bind(window));
  window.__clock = {
    freeze() { date = realNow(); perf = realPerf(); frozen = true; },
    // One animation frame, `ms` of page time after the last.
    step(ms) {
      date += ms; perf += ms;
      const due = queue; queue = [];
      for (const [, fn] of due) fn(perf);
    },
    thaw() { frozen = false; for (const [, fn] of queue) realRaf(fn); queue = []; },
  };
};

