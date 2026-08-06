"""``python -m tolerance_stack`` -- rebuild the spec-library projection.

The only executable entry point in the repo, and it does exactly one thing:
wipe-and-rebuild ``data/projections/spec_library/library.json`` from the events
in ``docs/spec_library/events/``, then print the intake queue's derived state.
There is still no pipeline and no CLI for stacks -- a projection needs a rebuild
command by the forge data convention, and a stack does not.
"""

from tolerance_stack.spec_library import main

if __name__ == "__main__":
    raise SystemExit(main())
