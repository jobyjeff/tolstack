"""Fixtures every test module under ``tests/`` can ask for.

``browser_slot``: the machine's one browser slot, taken the first time a test
that starts a Chrome is set up and held to the end of the session
(``tests/browser_slot.py``).
"""
from tests.browser_slot import browser_slot  # noqa: F401 -- a fixture, used by name
