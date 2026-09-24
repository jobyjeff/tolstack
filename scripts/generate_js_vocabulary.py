"""Write ``apps/viewer/vocab.gen.js`` from the Python definitions.

    venv-win/Scripts/python.exe scripts/generate_js_vocabulary.py
    venv-win/Scripts/python.exe scripts/generate_js_vocabulary.py --check

``--check`` writes nothing and exits **1** with a unified diff when the file on
disk is not what this script would write. That is the whole pairing between the
two languages now: it is red when Python moved and nobody regenerated, and red
when somebody hand-edited the generated file.
``tests/test_js_vocabulary_is_generated.py`` runs it in-process.

What it does NOT decide is *which* vocabularies exist or where they live --
``scripts/js_vocabulary.py`` owns that, and its docstring carries the argument
for generating rather than pairing. This script is the renderer and nothing
more.

Where the file lands, and why not ``apps/shared/``
--------------------------------------------------

``apps/viewer/vocab.gen.js``, loaded by the annotator as
``../viewer/vocab.gen.js``. That app already reaches across the same boundary
for three other shared modules (``storage/adapter.js``, ``reader_facing_bans.js``,
``warning_icon.js``), so this is the established shape rather than a new one --
and a new ``apps/shared/`` directory would be **unreachable from the browser
tier**: ``scripts/run_viewer_browser_tests.mjs`` serves ``test.html`` from a
server rooted at ``apps/viewer`` and answers 403 to anything above it, so a
``../shared/...`` script tag is a silently unloaded module in exactly the tier
that exists to catch silently unloaded modules.

Line endings
------------

The rendered text uses ``\\n``; it is written in text mode, so on Windows it
lands CRLF like every other file in a tree checked out with ``core.autocrlf=true``,
and ``--check`` reads it back in text mode too. Everything inside a line --
trailing whitespace included -- is compared exactly.
"""

from __future__ import annotations

import argparse
import difflib
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

import js_vocabulary as V  # noqa: E402 -- resolved from scripts/

REPO_ROOT = Path(__file__).resolve().parent.parent
OUTPUT = REPO_ROOT / "apps" / "viewer" / "vocab.gen.js"

#: Repo-relative, for every message this script and its test print.
OUTPUT_REL = "apps/viewer/vocab.gen.js"
GENERATOR_REL = "scripts/generate_js_vocabulary.py"
REGISTRY_REL = "scripts/js_vocabulary.py"

#: Where a line of rendered JS is allowed to reach before the word list wraps.
WIDTH = 78


HEADER = f"""// GENERATED FILE -- DO NOT EDIT BY HAND.
//
// Every word below is read out of the Python definition named above it by
// {REGISTRY_REL} and rendered here by {GENERATOR_REL}.
// Both apps read their vocabularies from this module; neither holds a copy of
// one. Twenty-six hand copies and three pairing test modules were retired for
// it on 2026-09-23 -- {REGISTRY_REL}'s docstring is the argument.
//
// To change a word: change the PYTHON definition, then regenerate. The
// generation step is the first one scripts/rebuild_projections.ps1 runs.
// tests/test_js_vocabulary_is_generated.py regenerates and compares, so a
// Python edit nobody regenerated and a hand edit to this file are the same
// red test.
(function (root) {{
  "use strict";

  // The runtime below is the generator's fixed template, not content. It lives
  // in the generated file rather than in a hand-written sibling so that each
  // page needs ONE extra <script> tag; edit it in {GENERATOR_REL}.
  function namespace(app, words) {{
    Object.keys(words).forEach(function (name) {{
      Object.freeze(words[name]);
    }});
    Object.freeze(words);

    function list(name) {{
      if (!Object.prototype.hasOwnProperty.call(words, name)) {{
        throw new Error("vocab: the generated module has no " + app + " " +
          "vocabulary named " + JSON.stringify(name) + ". It carries: " +
          Object.keys(words).join(", ") + ".");
      }}
      return words[name];
    }}

    // A rendered table, keyed by a generated vocabulary. The per-value copy --
    // the sentence a reader sees, the "what would close it" line -- stays
    // hand-authored in the app and is this function's second argument; the KEY
    // SET is the vocabulary's, compared here. So a value Python can emit that
    // the page has no branch for, and a branch for a value Python cannot emit,
    // both throw AT LOAD, before anything renders -- which is what the old
    // set-pairing tests could only say after the fact, and what no test could
    // say at all about a key attached from outside the literal.
    //
    // The returned table is frozen: adding a key later (`VA.GAP_KINDS.x = {{}}`,
    // `Object.assign(VA.GAP_KINDS, ...)`) throws in strict mode, which every
    // app file is. That was the one hole the retired scanner documented and
    // could not close.
    function table(name, entries) {{
      var expected = list(name);
      var missing = expected.filter(function (word) {{
        return !Object.prototype.hasOwnProperty.call(entries, word);
      }});
      var extra = Object.keys(entries).filter(function (key) {{
        return expected.indexOf(key) === -1;
      }});
      if (missing.length || extra.length) {{
        throw new Error("vocab: the " + app + " table for " + name +
          " has drifted from the generated vocabulary." +
          (missing.length ? " No entry for: " + missing.join(", ") + "." : "") +
          (extra.length ? " Entry for a word Python cannot emit: " +
            extra.join(", ") + "." : "") +
          " The words come from the Python definition named beside " + name +
          " in {OUTPUT_REL}; teach the table the value, or delete the branch.");
      }}
      return Object.freeze(entries);
    }}

    return {{ WORDS: words, list: list, table: table }};
  }}
"""

FOOTER = """})(window.TolstackVocab = window.TolstackVocab || {});
"""


def render_words(words: tuple, indent: str, lead: int = 0) -> str:
    """``["a", "b"]``, wrapped onto continuation lines at :data:`WIDTH`.

    ``lead`` is what already sits on the first line before the ``[`` -- the key
    name and its colon -- so the wrap decision is made against the line a reader
    actually sees.
    """
    items = [json.dumps(word) for word in words]
    one_line = "[" + ", ".join(items) + "]"
    if len(indent) + lead + len(one_line) <= WIDTH:
        return one_line
    lines: list[str] = []
    current = ""
    for i, item in enumerate(items):
        piece = item + ("," if i < len(items) - 1 else "")
        candidate = (current + " " + piece).strip()
        if current and len(indent) + 2 + len(candidate) > WIDTH:
            lines.append(current)
            current = piece
        else:
            current = candidate
    lines.append(current)
    body = ("\n" + indent + "  ").join(lines)
    return "[\n" + indent + "  " + body + "\n" + indent + "]"


def render_namespace(app: str) -> str:
    """One ``namespace("<app>", { ... })`` block, comments and all."""
    lines = [f'  root.{app} = namespace("{app}", {{']
    for i, vocabulary in enumerate(V.for_app(app)):
        if i:
            lines.append("")
        for chunk in wrap_comment(vocabulary.where, "    // "):
            lines.append(chunk)
        words = tuple(vocabulary.read())
        if not words:
            raise SystemExit(
                f"{vocabulary.app}.{vocabulary.name} read back empty from "
                f"{vocabulary.where} -- an empty vocabulary would make every "
                f"table that names it accept anything. Nothing was written."
            )
        lead = len(vocabulary.name) + 2  # "NAME: "
        lines.append(f"    {vocabulary.name}: "
                     f"{render_words(words, '    ', lead)},")
    lines.append("  });")
    return "\n".join(lines)


def wrap_comment(text: str, prefix: str) -> list[str]:
    """``text`` as ``//`` lines, wrapped at :data:`WIDTH`."""
    out: list[str] = []
    current = prefix
    for word in text.split():
        candidate = current + ("" if current == prefix else " ") + word
        if len(candidate) > WIDTH and current != prefix:
            out.append(current)
            current = prefix + word
        else:
            current = candidate
    out.append(current)
    return out


def render() -> str:
    """The whole file, LF-terminated."""
    blocks = [render_namespace(app) for app in V.APPS]
    return HEADER + "\n" + "\n\n".join(blocks) + "\n" + FOOTER


def diff(expected: str, actual: str) -> str:
    return "".join(difflib.unified_diff(
        actual.splitlines(keepends=True),
        expected.splitlines(keepends=True),
        fromfile=f"{OUTPUT_REL} (on disk)",
        tofile=f"{OUTPUT_REL} (regenerated)",
    ))


def check(path: Path = OUTPUT) -> str:
    """``""`` when the file on disk matches, else a unified diff of the drift."""
    expected = render()
    if not path.exists():
        return (f"{OUTPUT_REL} does not exist. Run {GENERATOR_REL}.\n")
    return diff(expected, path.read_text(encoding="utf-8"))


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--check", action="store_true",
        help="write nothing; exit 1 with a diff if the file is out of date")
    args = parser.parse_args(argv)

    if args.check:
        drift = check()
        if drift:
            sys.stdout.write(drift)
            print(f"\n{OUTPUT_REL} is out of date. Regenerate it:"
                  f"\n  venv-win/Scripts/python.exe {GENERATOR_REL}")
            return 1
        print(f"{OUTPUT_REL} is up to date.")
        return 0

    text = render()
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(text, encoding="utf-8")
    vocabularies = len(V.VOCABULARIES)
    words = sum(len(v.read()) for v in V.VOCABULARIES)
    print(f"wrote {OUTPUT_REL}: {vocabularies} vocabularies, {words} words")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
