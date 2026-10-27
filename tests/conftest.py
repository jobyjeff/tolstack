"""Fixtures every test module under ``tests/`` can ask for.

``browser_slot``: the machine's one browser slot, taken the first time a test
that starts a Chrome is set up and held to the end of the session
(``tests/browser_slot.py``).
"""
from tests.browser_slot import browser_slot  # noqa: F401 -- a fixture, used by name


def pytest_collection_modifyitems(config, items):
    """The default tier leaves out ``@pytest.mark.sweep`` unless it was asked for.

    Asked for = a ``-m`` expression of any kind (``-m sweep`` is the sweep's own
    run), or the test's file named on the command line. A bare ``pytest -q`` is
    neither, so the two minutes-long runner-lock cases (201 s and 34 s, measured
    2026-10-22) stay out of the tier every handoff runs. Done here rather than as
    ``addopts = -m "not sweep"`` because that would deselect them even when their
    file is named explicitly.
    """
    if config.option.markexpr:
        return
    from pathlib import Path

    named = {Path(str(a).split("::")[0]).resolve() for a in config.args}
    kept, dropped = [], []
    for item in items:
        if item.get_closest_marker("sweep") and Path(str(item.path)).resolve() not in named:
            dropped.append(item)
        else:
            kept.append(item)
    if dropped:
        config.hook.pytest_deselected(items=dropped)
        items[:] = kept
