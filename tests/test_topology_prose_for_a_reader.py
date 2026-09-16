"""The topology documents' own prose, against the surface that renders it.

Added 2026-09-15 by handoff ``viewer_component_names_and_reference_copy``, off
Jeff's review of the live pitch-link topology. Two of his five items are claims
about strings that live in ``docs/topologies/*.json`` rather than in the viewer:

* **the component column printed part ids.** "2nd line ``bolt_nas6403u11d``
  appears to be some type of internal id that is meaningless to user. Actually
  just realized this is what's used in the main table -- replace these with a
  concise human friendly name (NAS6403U11D Shoulder Bolt is fine)." The viewer
  prints ``parts[].name`` now (``VA.componentLabel``, apps/viewer/topology.js),
  which moved the problem here: a name that ran to eighty characters was the
  reason the id was printed in the first place.
* **"Balloon 5X in DETAIL B per the referenced element's source_ref" / "see the
  referenced element's own gap note"** -- "internal field names and dead-end
  references; either render the actual reference (drawing + sheet + a link) or
  say nothing." Those two were ``parts[].note`` on this topology, rendered
  verbatim on the component hover card.

So this file guards the DOCUMENTS, and apps/viewer/tests.js guards the
rendering. The split is not arbitrary: the viewer's own words are its to
choose, and a document's words are the record -- the viewer renders a note
verbatim, so a note written for whoever maintains the schema reaches a reader
who cannot use it, and no amount of view code can fix that from the outside.

**Deliberately NOT covered: ``docs/tolerance_stacks/stack_*.json``.** A stack
element's ``source_ref.note`` is the written argument behind a value, addressed
to a reviewer reading the provenance record; seven of them name a field or a
checksum, and rewriting a citation's argument is authoring in the value record,
not a copy pass. Filed as
``docs/issues/ISSUE_20260915_stack_citation_notes_name_schema_fields_on_a_reading_surface.md``.

**Deliberately NOT an extension of the title rule.** ``docs/SOP_TOLERANCE_STACK.md``'s
"Titling an artifact" governs ``title``; whether ``name`` should come under it
is ``docs/issues/ISSUE_20260914_element_and_edge_names_are_not_under_the_title_rule.md``,
an open authoring question. What is pinned below is the 2026-09-15 pass's own
result -- the shapes that were actually there and were actually removed -- so
that they cannot come back unnoticed while that question is undecided.
"""

from __future__ import annotations

import json
import re
from pathlib import Path

import pytest

REPO_ROOT = Path(__file__).resolve().parent.parent
TOPOLOGY_DIR = REPO_ROOT / "docs" / "topologies"

#: The four parts Jeff was reading, pinned by value, plus the two members
#: `stack_fable_audit` added to the same joint on the same day (restyled to
#: this convention when the two branches met in review). This is the one place
#: in the suite that says what a component cell reads for them; the JS tiers
#: pin that the cell prints ``name`` and nothing else.
PITCH_LINK_PART_NAMES = {
    "bolt_nas6403u11d": "NAS6403U11D hex-head bolt",
    "bushing_214820_002": "214820-002 plain bushing",
    "spherical_bearing_pitch_link": "pitch-link spherical bearing (unconfirmed)",
    "flanged_bushing_nas77a3_015a": "NAS77A3-015A flanged bushing",
    "pitch_plate_215197": "215197 pitch plate",
    "washer_nas1149v0332h": "NAS1149V0332H flat washer",
}

#: Every string a rendered note must not carry, with what it is. Each had a
#: live instance on 2026-09-15; the pattern, not the instance, is the rule.
BANNED_IN_RENDERED_PROSE = (
    (re.compile(r"\bsource_ref\b"),
     "a schema field name",
     "eight notes pointed at a citation by the field the pointer lives in "
     "rather than by the document it names"),
    (re.compile(r"\bcrop_key\b|\bcrops\.json\b|\bdimension_ref\b"),
     "a schema field or an internal artifact's filename",
     "the same shape as source_ref -- plumbing, on a reading surface"),
    (re.compile(r"\bsha256\b", re.I),
     "an algorithm's name",
     "nothing a reader of the viewer can act on; the viewer's own copy "
     "dropped it in the same pass"),
    (re.compile(r"[A-Za-z]:[\\/]|\bdocs/[a-z_]+/[a-z0-9_]+\.json\b|\bvenv-win\b"),
     "a workstation path or a repo-relative file path",
     "three pitch_system notes named stack_vpa_output_to_pitch_plate.json by "
     "path; a reader of the hover card cannot open it"),
)

#: Long enough for a part number plus a short noun phrase with one qualifier
#: (the longest authored name is 'actuator piston (output rod end)', 32, and
#: '208510-007 variable pitch actuator', 34), short enough that the grid's
#: 150px component column truncates a name only occasionally rather than
#: always -- which is the state Jeff read.
MAX_PART_NAME_CHARS = 44


def topology_documents():
    paths = sorted(TOPOLOGY_DIR.glob("topology_*.json"))
    # A scan that silently finds nothing passes against anything.
    assert len(paths) == 5, f"expected five topologies, found {len(paths)}"
    return [(p.relative_to(REPO_ROOT).as_posix(),
             json.loads(p.read_text(encoding="utf-8"))) for p in paths]


def rendered_prose():
    """(where, field, text) for every authored string the viewer renders.

    ``parts``/``nodes``/``edges`` each carry a ``name`` and a ``note``, and the
    grid, the preview pane and the hover cards render all six.
    """
    out = []
    for rel, data in topology_documents():
        for kind in ("parts", "nodes", "edges"):
            for item in data.get(kind, []):
                for field in ("name", "note"):
                    value = item.get(field)
                    if isinstance(value, str) and value:
                        out.append((f"{rel}:{kind}/{item['id']}", field, value))
    assert len(out) > 100, f"the prose scan found only {len(out)} strings"
    return out


PROSE = rendered_prose()


@pytest.mark.parametrize("where,field,text", PROSE,
                         ids=[f"{w}.{f}" for w, f, _ in PROSE])
def test_a_rendered_string_is_written_for_a_reader(where, field, text):
    for pattern, what, why in BANNED_IN_RENDERED_PROSE:
        hit = pattern.search(text)
        assert hit is None, (
            f"{where}: {field} carries {what} ({hit.group(0)!r}).\n"
            f"  {field}: {text!r}\n"
            f"  why this is banned: {why}\n"
            f"  The viewer renders this string verbatim (the component hover "
            f"card, the preview pane). Name the document and sheet the "
            f"citation points at, or the element it belongs to in words -- "
            f"the fact stays, only who it is addressed to changes."
        )


def test_the_four_pitch_link_parts_read_as_human_names():
    """Jeff's own example, on the document he was reading."""
    path = TOPOLOGY_DIR / "topology_pitch_link_to_pitch_plate.json"
    parts = {p["id"]: p for p in json.loads(path.read_text(encoding="utf-8"))["parts"]}
    assert set(parts) == set(PITCH_LINK_PART_NAMES), (
        "the pitch-link topology's parts changed; update PITCH_LINK_PART_NAMES "
        "and check the grid still reads like Jeff's example"
    )
    for part_id, expected in PITCH_LINK_PART_NAMES.items():
        assert parts[part_id]["name"] == expected, (
            f"{part_id}: the component column reads {parts[part_id]['name']!r}.\n"
            f"  expected: {expected!r}\n"
            f"  Jeff, 2026-09-15: 'replace these with a concise human friendly "
            f"name (NAS6403U11D Shoulder Bolt is fine)'. The nomenclature comes "
            f"off the 217755 parts list, recorded in "
            f"docs/tolerance_stacks/hardware_entries.json under "
            f"assembly_status.nomenclature -- not invented here."
        )
        # And the id is nowhere in it: an id is a deep-link handle, and the
        # whole complaint was that one was being read as a name.
        assert part_id not in parts[part_id]["name"]


@pytest.mark.parametrize("rel,data", topology_documents(),
                         ids=[rel for rel, _ in topology_documents()])
def test_a_part_name_fits_the_column_that_renders_it(rel, data):
    for part in data.get("parts", []):
        name = part["name"]
        assert len(name) <= MAX_PART_NAME_CHARS, (
            f"{rel}:{part['id']}: the name is {len(name)} characters, over "
            f"{MAX_PART_NAME_CHARS}.\n  name: {name!r}\n"
            f"  The grid's component column renders this (150px). What the "
            f"name sheds goes into `note`, which the hover card shows in full "
            f"-- demoted, not deleted."
        )
        assert " -- " not in name, (
            f"{rel}:{part['id']}: the name bolts a clause on with a dash.\n"
            f"  name: {name!r}\n"
            f"  A noun phrase needs none; the qualification is `note` material."
        )
