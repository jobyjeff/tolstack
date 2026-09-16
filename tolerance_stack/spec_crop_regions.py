"""Declared crop regions for spec-pile documents: which rect on which page.

A spec-pile citation names a *document* and a *sheet* and nothing finer -- the
pile is append-only and the filename is the identity, so there is no zone to pin
and no export to re-read (``scripts/build_viewer_crops.py``'s ``spec_pile``
rule). The consequence a reader sees is that a fastener card shows a whole
photocopied sheet carrying a table of sixty-four rows, when the citation is
about one of them.

This module is the sanctioned way to say where the row is: a **registry** of
per-document declared regions, tracked at ``docs/spec_library/crop_regions.json``
and consumed by the crop builder. Option B of the 2026-09-14 strategy session,
and it is a registry rather than a rect on each citation for two reasons: a
region is reused (the dash-13 row band is cited by three stacks today), and the
``source_ref`` schema stays untouched.

The alias-table precedent (``docs/topologies/part_mesh_aliases.json``,
2026-09-10) is the shape to hold in mind: **declared configuration, never fuzzy
matching.** A region is not found by searching the page -- somebody looked at the
sheet, recorded the rect with the verb
(``scripts/record_spec_crop_region.py``), and wrote down what it shows. That
``shows`` string is the entry's evidence, and this repo's one rule applies to
placement as much as to values: a crop that claims to be the cited row and is
not is a wrong number wearing the right format.

Matching a citation to a region
-------------------------------

Candidates are the regions declared for the **same document and the same page**
the citation names. Among those:

1. a region one of whose declared ``match`` strings occurs in the citation's
   where-ref text (:func:`where_ref_text`) wins -- **longest matched string
   wins** if several do, the same tie-break ``callout_needles`` uses one file
   over, because a longer declared string is the more specific claim;
2. if two *different* regions tie on that longest match the answer is
   **ambiguous**, and ambiguous resolves to no region at all;
3. if nothing matched and the page carries exactly **one** region, that region
   is it -- a document whose page has one declared region has said what the page
   is about;
4. otherwise there is no region, and the caller keeps the whole-sheet crop it
   would have taken anyway. A missing region is a gap to record, never a reason
   to guess a rect.

Page contexts: the crop, when the region is the highlight
---------------------------------------------------------

A region alone answered "which rect is the cited row" and cropped exactly that.
Jeff, 2026-09-15, on the rect this file's first twelve entries declare: the
bolt-grip crop "is just four numbers with no context for what they mean" -- a
row band carries no column headers and no figure, so a reader who did not
already know the table cannot tell what the four numbers are. So a page may
also declare **one context**: the wider rect that gets cropped (the whole table
with its headers, and the figure the columns refer to), inside which the matched
region becomes a highlight box rather than the crop itself. "This is actually
similar to the old style where most of the entire page is included."

A context is recorded exactly like a region -- by hand, with a ``shows`` that is
its evidence -- and is per ``(document, page)``: at most one, because it answers
"what does a reader of this sheet need to see", which has one answer per sheet.
A page with a context and no matching region crops the context and highlights
nothing, which is honest; a page with a region and no context crops the region,
exactly as before.

Stdlib only, like every other module in this package.
"""

from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

SCHEMA = "joby.tolerance_stack/spec_crop_regions/v0"

#: The registry's home, repo-relative. Tracked: a region is configuration a
#: reviewer reads, not derived state.
REGISTRY_RELPATH = Path("docs") / "spec_library" / "crop_regions.json"

#: The ``source_ref`` fields whose text a declared ``match`` string is tested
#: against, in this order, plus the element's ``hardware_ref``. A module-level
#: constant and not an inline literal, because a field vocabulary that lives in
#: two places is this repo's most-repeated defect -- ``docs/prompts/REVIEW_AGENT.md``,
#: "Documented vocabularies drifting from the seeded data".
WHERE_REF_FIELDS: Tuple[str, ...] = ("cell", "view", "callout")

#: Why a citation ended up with the region it did -- the whole vocabulary, so a
#: consumer can switch on it totally. ``declared_match`` and ``sole_region``
#: carry a region; ``no_region``, ``no_match`` and ``ambiguous_match`` do not.
RESOLUTIONS: Tuple[str, ...] = (
    "declared_match",
    "sole_region",
    "no_region",
    "no_match",
    "ambiguous_match",
)


class RegistryError(ValueError):
    """A registry file, or an entry in it, that cannot be trusted as written."""


# ---------------------------------------------------------------------------
# the entries
# ---------------------------------------------------------------------------


@dataclass(frozen=True)
class CropRegion:
    """One declared rect on one page of one spec-pile document.

    ``rect`` is ``(x0, y0, x1, y1)`` in **PDF points, origin top-left** -- the
    PyMuPDF convention, and the same one ``crops.json`` already reports as
    ``rect_pt``, so a recorded region and a rendered crop are read in one
    coordinate system.
    """

    document: str
    page: int
    label: str
    rect: Tuple[float, float, float, float]
    match: Tuple[str, ...]
    shows: str
    recorded: str
    recorded_by: str

    def __post_init__(self) -> None:
        for name in ("document", "label", "shows", "recorded", "recorded_by"):
            if not str(getattr(self, name) or "").strip():
                raise RegistryError(f"a crop region needs a {name}")
        if not isinstance(self.page, int) or isinstance(self.page, bool) or self.page < 1:
            raise RegistryError(
                f"{self.label!r}: page {self.page!r} is not a sheet number"
            )
        if len(self.rect) != 4 or any(
            not isinstance(v, (int, float)) or isinstance(v, bool) for v in self.rect
        ):
            raise RegistryError(f"{self.label!r}: rect must be four numbers")
        x0, y0, x1, y1 = self.rect
        if x1 <= x0 or y1 <= y0:
            raise RegistryError(
                f"{self.label!r}: rect {list(self.rect)} is empty or inverted -- "
                f"it must read (x0, y0, x1, y1) with x0 < x1 and y0 < y1"
            )
        if not self.match:
            raise RegistryError(
                f"{self.label!r}: a region declares the citation text it answers "
                f"to -- `match` may repeat the label, but it may not be empty"
            )
        for needle in self.match:
            if not str(needle or "").strip():
                raise RegistryError(f"{self.label!r}: an empty match string matches everything")

    @property
    def key(self) -> Tuple[str, int, str]:
        return (self.document, self.page, self.label)

    @classmethod
    def from_dict(cls, raw: Dict[str, Any]) -> "CropRegion":
        unknown = set(raw) - {
            "document", "page", "label", "rect", "match", "shows", "recorded",
            "recorded_by",
        }
        if unknown:
            raise RegistryError(
                f"crop region {raw.get('label')!r} carries unknown field(s) "
                f"{sorted(unknown)} -- a field this reader drops is a claim "
                f"nothing checks"
            )
        rect = raw.get("rect")
        if not isinstance(rect, (list, tuple)):
            raise RegistryError(f"crop region {raw.get('label')!r} names no rect")
        match = raw.get("match")
        if isinstance(match, str) or not isinstance(match, (list, tuple)):
            raise RegistryError(
                f"crop region {raw.get('label')!r}: `match` is a list of strings"
            )
        return cls(
            document=raw.get("document", ""),
            page=raw.get("page", 0),
            label=raw.get("label", ""),
            rect=tuple(float(v) for v in rect),  # type: ignore[arg-type]
            match=tuple(str(m) for m in match),
            shows=raw.get("shows", ""),
            recorded=raw.get("recorded", ""),
            recorded_by=raw.get("recorded_by", ""),
        )

    def to_dict(self) -> Dict[str, Any]:
        return {
            "document": self.document,
            "page": self.page,
            "label": self.label,
            "rect": [round(float(v), 2) for v in self.rect],
            "match": list(self.match),
            "shows": self.shows,
            "recorded": self.recorded,
            "recorded_by": self.recorded_by,
        }


@dataclass(frozen=True)
class CropContext:
    """The rect a sheet's crop is taken from, inside which a region highlights.

    Same coordinates and the same recording discipline as :class:`CropRegion`,
    and deliberately no ``match``: a context is not chosen by a citation's text,
    it is the one answer this sheet has to "what does a reader need to see" (see
    the module docstring). Declaring more than one for a page is refused by
    :class:`CropRegionRegistry`.
    """

    document: str
    page: int
    label: str
    rect: Tuple[float, float, float, float]
    shows: str
    recorded: str
    recorded_by: str

    def __post_init__(self) -> None:
        for name in ("document", "label", "shows", "recorded", "recorded_by"):
            if not str(getattr(self, name) or "").strip():
                raise RegistryError(f"a crop context needs a {name}")
        if not isinstance(self.page, int) or isinstance(self.page, bool) or self.page < 1:
            raise RegistryError(
                f"{self.label!r}: page {self.page!r} is not a sheet number"
            )
        if len(self.rect) != 4 or any(
            not isinstance(v, (int, float)) or isinstance(v, bool) for v in self.rect
        ):
            raise RegistryError(f"{self.label!r}: rect must be four numbers")
        x0, y0, x1, y1 = self.rect
        if x1 <= x0 or y1 <= y0:
            raise RegistryError(
                f"{self.label!r}: rect {list(self.rect)} is empty or inverted -- "
                f"it must read (x0, y0, x1, y1) with x0 < x1 and y0 < y1"
            )

    @classmethod
    def from_dict(cls, raw: Dict[str, Any]) -> "CropContext":
        unknown = set(raw) - {
            "document", "page", "label", "rect", "shows", "recorded", "recorded_by",
        }
        if unknown:
            raise RegistryError(
                f"crop context {raw.get('label')!r} carries unknown field(s) "
                f"{sorted(unknown)} -- a field this reader drops is a claim "
                f"nothing checks"
            )
        rect = raw.get("rect")
        if not isinstance(rect, (list, tuple)):
            raise RegistryError(f"crop context {raw.get('label')!r} names no rect")
        return cls(
            document=raw.get("document", ""),
            page=raw.get("page", 0),
            label=raw.get("label", ""),
            rect=tuple(float(v) for v in rect),  # type: ignore[arg-type]
            shows=raw.get("shows", ""),
            recorded=raw.get("recorded", ""),
            recorded_by=raw.get("recorded_by", ""),
        )

    def to_dict(self) -> Dict[str, Any]:
        return {
            "document": self.document,
            "page": self.page,
            "label": self.label,
            "rect": [round(float(v), 2) for v in self.rect],
            "shows": self.shows,
            "recorded": self.recorded,
            "recorded_by": self.recorded_by,
        }


@dataclass(frozen=True)
class CropRegionRegistry:
    """Every declared region and page context, plus the notes that say why the
    file exists."""

    regions: Tuple[CropRegion, ...] = ()
    contexts: Tuple[CropContext, ...] = ()
    title: str = ""
    notes: Tuple[str, ...] = ()

    def __post_init__(self) -> None:
        pages: Dict[Tuple[str, int], CropContext] = {}
        for context in self.contexts:
            key = (context.document, context.page)
            if key in pages:
                raise RegistryError(
                    f"{context.document} sheet {context.page} declares two crop "
                    f"contexts ({pages[key].label!r} and {context.label!r}) -- a "
                    f"sheet has one answer to what a reader needs to see"
                )
            pages[key] = context
        seen: Dict[Tuple[str, int, str], CropRegion] = {}
        for region in self.regions:
            if region.key in seen:
                raise RegistryError(
                    f"two regions on {region.document} sheet {region.page} are "
                    f"both labelled {region.label!r} -- a label is how a citation "
                    f"names one"
                )
            seen[region.key] = region
        for document, page in {(r.document, r.page) for r in self.regions}:
            needles: Dict[str, str] = {}
            for region in self.for_page(document, page):
                for needle in region.match:
                    key = needle.strip().lower()
                    if key in needles:
                        raise RegistryError(
                            f"{document} sheet {page}: {region.label!r} and "
                            f"{needles[key]!r} both match {needle!r}, so no "
                            f"citation carrying it could ever resolve"
                        )
                    needles[key] = region.label

    def for_page(self, document: str, page: int) -> List[CropRegion]:
        """The regions declared for this document's page, in file order."""
        return [r for r in self.regions if r.document == document and r.page == page]

    def context_for(self, document: str, page: int) -> Optional[CropContext]:
        """The one context declared for this document's page, or ``None``.

        At most one exists -- the constructor refuses a second -- so this is a
        lookup, not a choice.
        """
        for context in self.contexts:
            if context.document == document and context.page == page:
                return context
        return None

    def to_dict(self) -> Dict[str, Any]:
        return {
            "schema": SCHEMA,
            "title": self.title,
            "notes": list(self.notes),
            "contexts": [c.to_dict() for c in self.contexts],
            "regions": [r.to_dict() for r in self.regions],
        }


def load(path: str | Path) -> CropRegionRegistry:
    """Read a registry file. Raises rather than degrading to empty.

    A registry that cannot be parsed is not the same fact as a registry with no
    entries: the first is a broken file and the second is a document nobody has
    recorded a region for yet, and silently turning one into the other is how a
    crop quietly goes back to being a whole sheet.
    """
    raw = json.loads(Path(path).read_text(encoding="utf-8"))
    schema = raw.get("schema")
    if schema != SCHEMA:
        raise RegistryError(
            f"{path} declares schema {schema!r}, not {SCHEMA!r}"
        )
    regions = raw.get("regions")
    if not isinstance(regions, list):
        raise RegistryError(f"{path} has no `regions` list")
    # `contexts` is additive (2026-09-15, handoff viewer_reference_crops_in_context):
    # absent means "no sheet declares a context", which is what every registry
    # written before that date says, and the crop falls back to the region rect
    # exactly as it did then. A `contexts` that is present but not a list is a
    # broken file, not an empty one -- same reading as `regions` above.
    contexts = raw.get("contexts")
    if contexts is not None and not isinstance(contexts, list):
        raise RegistryError(f"{path} has a `contexts` key that is not a list")
    return CropRegionRegistry(
        regions=tuple(CropRegion.from_dict(r) for r in regions),
        contexts=tuple(CropContext.from_dict(c) for c in (contexts or [])),
        title=str(raw.get("title") or ""),
        notes=tuple(str(n) for n in (raw.get("notes") or [])),
    )


def dumps(registry: CropRegionRegistry) -> str:
    """The on-disk text for ``registry`` -- one writer, so the file's formatting
    is the verb's and never a hand-edit's."""
    return json.dumps(registry.to_dict(), indent=2, ensure_ascii=False) + "\n"


def append(registry: CropRegionRegistry, region: CropRegion) -> CropRegionRegistry:
    """``registry`` plus ``region``, at the end. The constructor does the
    refusing -- duplicate label, colliding match string -- so there is one place
    a bad entry is caught and both the verb and a hand-written file hit it."""
    return CropRegionRegistry(
        regions=registry.regions + (region,),
        contexts=registry.contexts,
        title=registry.title,
        notes=registry.notes,
    )


def append_context(
    registry: CropRegionRegistry, context: CropContext
) -> CropRegionRegistry:
    """``registry`` plus ``context``. The constructor does the refusing -- a
    second context on one sheet -- for the same reason :func:`append` leaves it
    there."""
    return CropRegionRegistry(
        regions=registry.regions,
        contexts=registry.contexts + (context,),
        title=registry.title,
        notes=registry.notes,
    )


# ---------------------------------------------------------------------------
# matching a citation to a region
# ---------------------------------------------------------------------------


def where_ref_text(source_ref: Any, hardware_ref: Optional[str] = None) -> str:
    """The citation text a declared ``match`` string is tested against.

    :data:`WHERE_REF_FIELDS` in order, then the element's ``hardware_ref``,
    joined by a separator no citation field contains. Deliberately **not** the
    element's ``note``: a note is an argument about the value, it runs to
    paragraphs, and matching a region against a paragraph is how a region starts
    answering to citations nobody meant it for.

    Accepts the raw dict read off parsed JSON or a
    :class:`tolerance_stack.stack.SourceRef`, the same two shapes
    ``build_viewer_crops.croppable`` accepts and for the same reason.
    """
    if not source_ref:
        return str(hardware_ref or "")
    parts: List[str] = []
    for name in WHERE_REF_FIELDS:
        value = (source_ref.get(name) if isinstance(source_ref, dict)
                 else getattr(source_ref, name, None))
        if value:
            parts.append(str(value))
    if hardware_ref:
        parts.append(str(hardware_ref))
    return " | ".join(parts)


@dataclass(frozen=True)
class RegionResolution:
    """Which region a citation got, and why -- including why it got none.

    ``context`` is the page's declared context (:class:`CropContext`) if it has
    one, and is filled in **independently of** ``region``: it is a fact about the
    sheet, not about this citation, so a resolution that found no region still
    carries it and a crop of the context is still taken.
    """

    how: str
    region: Optional[CropRegion] = None
    matched: Optional[str] = None
    why: str = ""
    context: Optional[CropContext] = None

    def __post_init__(self) -> None:
        if self.how not in RESOLUTIONS:
            raise RegistryError(f"{self.how!r} is not one of {list(RESOLUTIONS)}")


def resolve(
    registry: CropRegionRegistry,
    document: str,
    page: int,
    text: str,
) -> RegionResolution:
    """Pick the declared region for one citation, or say honestly that there is
    none. See the module docstring for the four rules; this is the only place
    they are written.

    Every answer carries the page's declared ``context`` too, whether or not a
    region was found -- see :class:`RegionResolution`."""
    context = registry.context_for(document, page)
    candidates = registry.for_page(document, page)
    if not candidates:
        return RegionResolution(
            how="no_region",
            context=context,
            why=f"no crop region is declared for {document} sheet {page}",
        )

    haystack = (text or "").lower()
    hits: List[Tuple[int, CropRegion, str]] = []
    for region in candidates:
        best: Optional[str] = None
        for needle in region.match:
            probe = needle.strip().lower()
            if probe and probe in haystack and (best is None or len(probe) > len(best)):
                best = needle.strip()
        if best is not None:
            hits.append((len(best), region, best))

    if hits:
        longest = max(length for length, _, _ in hits)
        winners = [(region, needle) for length, region, needle in hits if length == longest]
        if len(winners) > 1:
            return RegionResolution(
                how="ambiguous_match",
                context=context,
                why=(
                    f"this citation matches {len(winners)} declared regions on "
                    f"{document} sheet {page} "
                    f"({', '.join(sorted(r.label for r, _ in winners))}) -- "
                    f"which row it means is not declared, so no region is used"
                ),
            )
        region, needle = winners[0]
        return RegionResolution(
            how="declared_match",
            region=region,
            matched=needle,
            context=context,
            why=f"the citation names {needle!r}",
        )

    if len(candidates) == 1:
        return RegionResolution(
            how="sole_region",
            region=candidates[0],
            context=context,
            why=(
                f"the only region declared for {document} sheet {page}, and this "
                f"citation names that sheet"
            ),
        )
    return RegionResolution(
        how="no_match",
        context=context,
        why=(
            f"{len(candidates)} regions are declared for {document} sheet {page} "
            f"and this citation's where-ref text names none of them"
        ),
    )
