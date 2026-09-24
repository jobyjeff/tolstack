"""The claims registry, guarded: every declaration parses, and every declared
value is compared against the source its metric names.

This is the module that keeps :mod:`tests.claims_registry` from being ceremony.
A declaration naming a source and never checked against it is exactly as
unverified as the prose it replaced -- so the registry's value is not the format,
it is :func:`test_every_declared_claim_agrees_with_its_source`, which re-derives
every declared figure from the tree on every run.

**Read what is *not* here.** There is no corpus floor and no "these documents
must declare something" pairing in this file. Both exist, and they live in
``tests/test_tolerance_stack.py``, because this file is a mutation-witness
``python`` tier suite: the runner copies part of the repo into a tree with no
``ARCHITECTURE.md``, no ``README.md`` and no ``docs/*.md``, and a tier that is
red before the mutation proves nothing
(``scripts/mutation_witnesses/README.md``, "The tier words"). So everything here
holds for any tree -- thin or whole -- and the size assertions are made where a
whole tree is guaranteed.
"""

from __future__ import annotations

import json

import pytest

from tests.claims_registry import (
    AGREES, DISAGREES, GIT_TRACKED, METRICS, UNAVAILABLE, Claim, ClaimError,
    CORPUS_EXEMPT_PREFIXES, REPO_ROOT, check, claim_corpus,
    declarations_in_file, declarations_in_json, declarations_in_text,
    declared_claims, text_outside_declarations,
)


def _fence(*body: str) -> str:
    return "\n".join(("```claim", *body, "```"))


# --------------------------------------------------------------------------- #
# 1. the parser -- loud on every malformed shape                              #
# --------------------------------------------------------------------------- #

MALFORMED = {
    "not a key: value line": _fence("metric: traced_ratio", "value 5 of 26"),
    "a nested list": _fence("metric: traced_ratio", "value:", "  - 5 of 26"),
    "an empty value": _fence("metric: traced_ratio", "value:"),
    "a duplicate key": _fence("metric: traced_ratio", "value: 5 of 26",
                              "value: 3 of 26"),
    "no metric": _fence("value: 5 of 26"),
    "an unknown metric": _fence("metric: traced_ration", "value: 5 of 26"),
    "a missing field": _fence("metric: hardware_entry_count", "value: 5"),
    "an unknown field": _fence("metric: traced_ratio", "value: 5 of 26",
                               "sauce: the SOP"),
    "an empty body": "```claim\n```",
    "an unclosed fence": _fence("metric: traced_ratio", "value: 5 of 26")[:-3],
}


@pytest.mark.parametrize("shape", sorted(MALFORMED))
def test_the_parser_refuses_every_malformed_declaration(shape):
    """A declaration this reader cannot parse is a bug in the **document**.

    Never a quiet skip and never a fallback to reading the prose around it: a
    declaration that silently does not parse is the vacuous guard this whole
    change exists to stop building -- the document looks declared, the registry
    finds nothing, and the suite is green about a number nobody checked.
    """
    with pytest.raises(ClaimError) as raised:
        declarations_in_text("d.md", MALFORMED[shape])
    assert "d.md:" in str(raised.value), (
        f"the {shape} error does not name the file and line, and the fix for "
        f"every one of these is an edit to a document: {raised.value}"
    )


def test_a_well_formed_declaration_parses_to_its_metric_and_fields():
    claims = declarations_in_text(
        "d.md", f"Some prose.\n\n{_fence('metric: traced_ratio', 'value: 5 of 26')}\n")
    assert [(c.path, c.line, c.metric, c.fields) for c in claims] == [
        ("d.md", 4, "traced_ratio", {"value": "5 of 26"})]


def test_the_json_carrier_parses_to_the_same_claim_as_the_fence():
    """One format, two carriers. A JSON document has no fence to write, and
    ``hardware_entries.json`` is where this repo's counts actually live."""
    fenced = declarations_in_text(
        "d.md", _fence("metric: hardware_entry_count", "count: workbook",
                       "value: 5"))
    carried = declarations_in_json("d.json", json.dumps(
        {"claims": [{"metric": "hardware_entry_count", "count": "workbook",
                     "value": "5"}]}))
    assert [(c.metric, c.fields) for c in fenced] == \
           [(c.metric, c.fields) for c in carried]


def test_the_json_carrier_refuses_a_shape_it_cannot_read():
    for payload in ({"claims": {"metric": "traced_ratio"}},
                    {"claims": ["metric: traced_ratio"]},
                    {"claims": [{"metric": "hardware_entry_count",
                                 "count": "workbook", "value": 5}]}):
        with pytest.raises(ClaimError):
            declarations_in_json("d.json", json.dumps(payload))


def test_a_declaration_may_be_indented_and_still_be_read():
    """A claim nested under a list item or inside a docstring is a claim.

    ``tolerance_stack/stack.py`` carries one inside :func:`fold`'s docstring,
    indented four spaces; reading only column-zero fences would have made the
    most-read statement of the one-fold rule undeclarable.
    """
    nested = ("- a bullet, and its claim:\n\n"
              "  ```claim\n  metric: traced_ratio\n  value: 5 of 26\n  ```\n")
    assert [c.fields for c in declarations_in_text("d.md", nested)] == [
        {"value": "5 of 26"}]


# --------------------------------------------------------------------------- #
# 2. free prose is never read -- the point of the whole change                #
# --------------------------------------------------------------------------- #

#: Sentences that the prose scans this registry replaced **did** flag, verbatim
#: or near enough, and that no guard reads now. Each one is either a real
#: recorded false positive or the real stale sentence the old scan existed for
#: -- both directions, because "prose is not scanned" has to be true of the
#: sentence the old guard was right about as well as the one it was wrong about.
PROSE_NO_GUARD_READS = (
    # The 2026-09-17 false positive: prose about why one thing differs from
    # three others, recounted against hardware_entries.json's not_library.
    "it is load-bearing for a reason the other three do not have",
    # The 2026-09-15 false positive: a behaviour described with the byte idiom.
    "the viewer's behaviour is byte-for-byte what `viewer_transport_honest_"
    "hosted` shipped",
    # The genuinely stale sentence the traced-ratio scan was built for.
    "The 2026-08-10 change took it from 3 of 26 to 5 by re-citing two elements",
    # The genuinely stale README sentence the hardware-count scan was built for.
    '**Eight of the eleven inline entries say `kind: "workbook"`**, which is '
    "the point: those numbers are slice-1 transcriptions.",
    # The one-fold rule in its absolute, superseded form.
    "Nothing outside `fold()` combines two element values.",
)


@pytest.mark.parametrize("sentence", PROSE_NO_GUARD_READS)
def test_free_prose_stating_a_fact_is_not_read_as_a_claim(sentence):
    """**English stopped being an API.**

    Half of this is the win -- a triage brief's ordinary sentence no longer
    reddens a shared branch -- and half of it is the cost, stated here rather
    than discovered later: the stale sentences the old scans caught are not
    caught by anything now. The trade was made deliberately
    (``REPORT_20260921_bug_pareto.md``, R3; three of the fifteen C2 issues were
    ``master``/``integration`` red, ten were the same failure re-filed) and this
    test is where it is written down, on the real sentences from both sides.
    """
    assert declarations_in_text("d.md", sentence) == []


def test_a_blockquoted_declaration_is_a_quotation_not_a_claim():
    """The one quotation rule left, and it is structural.

    The prose scanners carried four exemptions inferred from the text around a
    match -- a blockquote line, a double-quoted span, a qualifier's reach, a
    free-form block -- and each of the four grew its own blind spot. This one
    is a property of the fence itself: a fence opened behind ``>`` is not a
    declaration, which is how this module's own prose, a lesson and an issue
    show the format without declaring anything.
    """
    quoted = "> ```claim\n> metric: traced_ratio\n> value: 9 of 9\n> ```\n"
    assert declarations_in_text("d.md", quoted) == []


# --------------------------------------------------------------------------- #
# 3. the registry itself                                                      #
# --------------------------------------------------------------------------- #

def test_every_metric_names_a_source_that_exists():
    """A metric's ``source`` is prose for a reader and ``derive`` is the check;
    a source sentence naming a path the tree no longer holds is how the reader
    and the checker come apart."""
    missing = [f"{name}: {rel}"
               for name, metric in METRICS.items()
               for rel in metric.source_paths
               if not (REPO_ROOT / rel).exists()]
    assert missing == [], (
        f"{missing} are named as the sources of a declared metric and are not "
        f"in this tree. Re-point METRICS at where the value is derived from now."
    )


def test_every_metric_declares_the_fields_a_claim_about_it_must_carry():
    for name, metric in METRICS.items():
        assert metric.name == name, f"{name} is keyed under another name"
        assert metric.fields, (
            f"{name} requires no fields, so a claim about it states nothing and "
            f"agrees with everything"
        )
        assert metric.source.strip(), f"{name} names no source"


def test_every_declaration_in_the_tree_parses():
    """The corpus, read. A ``ClaimError`` out of here names the document."""
    declared_claims(REPO_ROOT)          # raises, with <path>:<line>, or passes


def test_every_declared_claim_agrees_with_its_source():
    """**The guard the registry exists for.**

    Every declared value, re-derived from the source its metric names. A source
    this checkout cannot reach -- anything under ``data/``, which is gitignored
    and lives only in the main checkout -- is reported as a skip with its
    reason, never as agreement: a skip riding inside a green total is the one
    thing this repo's test record keeps legislating against.
    """
    claims = declared_claims(REPO_ROOT)
    outcomes = [(c, check(c, REPO_ROOT)) for c in claims]
    wrong = [f"{c}: {o.detail}" for c, o in outcomes if o.status == DISAGREES]
    assert wrong == [], (
        "declared claims disagree with the sources they name:\n  "
        + "\n  ".join(wrong)
        + "\n\nEither the document's figure is stale, or the source moved and "
          "the declaration is the record of what it used to be. Fix the one "
          "that is wrong; do not delete the declaration."
    )
    unreachable = {o.detail for _, o in outcomes if o.status == UNAVAILABLE}
    if unreachable:                      # printed, so a skip is never silent
        print("claims whose source this checkout cannot reach: "
              + "; ".join(sorted(unreachable)))


def test_a_document_that_declares_a_rendered_value_also_states_it():
    """source -> declaration -> sentence, all three links checked.

    A metric marked ``rendered`` has a value distinctive enough to look for
    literally (``5 of 26``), and a document declaring it must also say it in the
    prose a reader sees. Without this the declaration and the paragraph beside
    it drift, which is the same defect one layer along -- and the search is over
    :func:`text_outside_declarations`, because searching the whole file would
    find the declaration and pass against anything.
    """
    unstated = []
    for claim in declared_claims(REPO_ROOT):
        metric = METRICS[claim.metric]
        if not metric.rendered:
            continue
        path = REPO_ROOT / claim.path.split(" [")[0]
        prose = text_outside_declarations(path.read_text(encoding="utf-8"))
        if claim.fields["value"] not in prose:
            unstated.append(f"{claim.location}: {claim.fields['value']!r}")
    assert unstated == [], (
        f"{unstated} declare a value their own prose no longer states. The "
        f"declaration is checked against the source; the sentence beside it is "
        f"what a reader gets, and these two have come apart."
    )


# --------------------------------------------------------------------------- #
# 4. the value check, watched failing -- a guard nobody has watched fail is   #
#    not yet a guard                                                          #
# --------------------------------------------------------------------------- #

#: One declaration per metric that reads a source reachable from any checkout,
#: with a value that is deliberately wrong. The ``data/``-backed metrics are not
#: here: they are ``UNAVAILABLE`` in a worktree, and a witness that only fires
#: in the main checkout is a witness that silently stops witnessing.
WRONG_ON_PURPOSE = (
    ("traced_ratio", {"value": "3 of 26"}),
    ("hardware_entry_count", {"count": "workbook", "value": "8"}),
    ("one_fold_rule", {"exceptions": "thermal_factor"}),
    ("byte_identity", {
        "subject": "docs/topologies/study_pitch_system_end_stop_minus7.json#/selection",
        "against": "docs/topologies/study_pitch_system_end_stop_minus7.json#/transforms",
    }),
)


@pytest.mark.parametrize("metric,fields", WRONG_ON_PURPOSE,
                         ids=[m for m, _ in WRONG_ON_PURPOSE])
def test_a_declared_value_that_disagrees_with_its_source_is_caught(metric, fields):
    """Each metric's deriver, shown going red on a value its source refutes.

    This is the definability bar the brief this handoff descends from set: *a
    mutation of the guarded value reddens it*. Four metrics, four mutations,
    each re-derived rather than compared to a constant in this file -- so a
    metric whose deriver quietly stops reading the tree fails here rather than
    reporting agreement with everything.
    """
    claim = Claim(path="d.md", line=1, metric=metric, fields=dict(fields))
    outcome = check(claim, REPO_ROOT)
    assert outcome.status == DISAGREES, (
        f"{metric} was handed a value its source refutes and came back "
        f"{outcome.status!r} ({outcome.detail}). A deriver that agrees with "
        f"anything is the vacuous guard in a new costume."
    )
    assert outcome.detail, f"{metric} disagreed without saying how"


@pytest.mark.parametrize("metric,fields", WRONG_ON_PURPOSE,
                         ids=[m for m, _ in WRONG_ON_PURPOSE])
def test_the_same_claim_written_correctly_agrees(metric, fields):
    """The other half: a check that fires on everything catches nothing.

    Built by correcting each wrong claim **from the source**, so this can
    neither go vacuous nor go stale as the underlying numbers move.
    """
    from tests.claims_registry import (_derive_hardware_entry_count,
                                       _derive_traced_ratio)

    if metric == "traced_ratio":
        detail = _derive_traced_ratio(
            Claim("d.md", 1, metric, {"value": "-"}), REPO_ROOT).detail
        fields = {"value": detail.rsplit("give ", 1)[-1].strip("'\"")}
    elif metric == "hardware_entry_count":
        detail = _derive_hardware_entry_count(
            Claim("d.md", 1, metric, dict(fields, value="-1")), REPO_ROOT).detail
        fields = dict(fields, value=detail.rsplit(" ", 1)[-1])
    elif metric == "one_fold_rule":
        from tests.test_thermal_exception_list import DECLARED_COMBINING_EXCEPTIONS
        fields = {"exceptions": ", ".join(DECLARED_COMBINING_EXCEPTIONS)}
    else:
        fields = dict(fields, against=fields["subject"])

    outcome = check(Claim("d.md", 1, metric, fields), REPO_ROOT)
    assert outcome.status == AGREES, f"{metric}: {outcome}"


def test_an_unreachable_source_is_a_skip_with_a_reason_not_an_agreement(tmp_path):
    """``data/`` is gitignored and lives only in the main checkout.

    Pointing a deriver at a tree that holds none of its sources must come back
    :data:`UNAVAILABLE` with the reason -- not :data:`AGREES`, which would be a
    guard that passes hardest exactly where it can check least.
    """
    # `mesh_routes` and `smallest_chain` are deliberately absent: both resolve
    # their source through the main checkout's `data/` when the tree they are
    # handed has none, which is how a worktree checks them at all. They are
    # UNAVAILABLE only on a machine with no main checkout, which is not a state
    # this test can produce -- and their skip path is exercised by every
    # worktree run of `test_every_declared_claim_agrees_with_its_source`.
    for metric, fields in (("traced_ratio", {"value": "5 of 26"}),
                           ("hardware_entry_count",
                            {"count": "workbook", "value": "5"}),
                           ("one_fold_rule", {"exceptions": "workbook_corner"})):
        outcome = check(Claim("d.md", 1, metric, fields), tmp_path)
        assert outcome.status == UNAVAILABLE, f"{metric}: {outcome}"
        assert outcome.detail, f"{metric} skipped without saying why"


# --------------------------------------------------------------------------- #
# 5. the corpus -- scope, asserted as a decision rather than an accident      #
# --------------------------------------------------------------------------- #

def test_the_corpus_never_reads_this_module_s_own_fixtures():
    """The one exemption this module is itself the reason for.

    A test for the registry necessarily writes declarations that are
    deliberately wrong -- ``WRONG_ON_PURPOSE`` above is four of them -- so a
    corpus that read ``tests/`` would turn every negative control into a claim
    the registry checks and redden the suite. The one-fold rule scan made the
    same call for the same shape of reason before this module existed.

    The **dated-record** exemptions (``docs/sessions/``, ``docs/issues/``,
    ``docs/reference/``, ``PROVENANCE.md``) are asserted in
    ``tests/test_tolerance_stack.py`` instead: proving an exemption excludes
    something real needs those directories to be present, and this file has to
    stay green in the mutation-witness shadow tree, which holds none of them.
    """
    mode, paths = claim_corpus(REPO_ROOT)
    rel = {p.relative_to(REPO_ROOT).as_posix() for p in paths}
    assert rel, "the claim corpus is EMPTY -- the derivation points somewhere wrong"
    assert "tests/" in CORPUS_EXEMPT_PREFIXES
    assert not any(r.startswith("tests/") for r in rel), (
        "tests/ is in the claim corpus, so the deliberately-wrong declarations "
        "this module carries as fixtures are now claims the registry checks"
    )


def test_the_corpus_falls_back_to_a_walk_only_outside_a_work_tree(tmp_path):
    """The fallback exists for the mutation-witness shadow tree and for a
    ``tmp_path``; it is never how this repo is read. Returned as a mode rather
    than swallowed, so "git was not consulted" can be asserted rather than
    guessed."""
    (tmp_path / "docs").mkdir()
    (tmp_path / "docs" / "d.md").write_text(
        _fence("metric: one_fold_rule", "exceptions: workbook_corner"),
        encoding="utf-8")
    mode, paths = claim_corpus(tmp_path)
    assert mode != GIT_TRACKED and len(paths) == 1, (mode, paths)
    assert [c.metric for c in declared_claims(tmp_path)] == ["one_fold_rule"]


def test_a_tree_nested_inside_a_checkout_walks_rather_than_asking_git():
    """The shadow tree's exact shape, and the reason for the toplevel check.

    ``git -C <a subdirectory> ls-files`` succeeds and answers about the
    *enclosing* repo. For the mutation-witness shadow -- a copy of part of this
    repo under gitignored ``tmp/`` -- that answer is the empty list, which taken
    at face value is a corpus of zero files reported as git-derived: every
    declaration guard green with nothing read. ``docs/`` stands in for it here
    because it is a real nested directory in every checkout, and a walk of it
    must come back non-empty.
    """
    mode, paths = claim_corpus(REPO_ROOT / "docs")
    assert mode != GIT_TRACKED, (
        "a subdirectory of this checkout was read as a git work tree root. "
        "git answers about the enclosing repo from anywhere inside it, so this "
        "is how a nested tree gets an empty corpus and a green report."
    )
    assert paths, "the walk found no documents under docs/"


def test_a_document_outside_every_curated_list_is_still_read(tmp_path):
    """The property a walk has and a hand-kept list does not.

    The traced-ratio scan read a five-entry literal until 2026-09-03 and three
    live documents were *invisible* to it rather than unpaired
    (``ISSUE_20260901_traced_ratio_doc_scan_uses_a_hand_kept_list.md``). A file
    whose name nothing has ever heard of declares a claim here, and the reader
    finds it.
    """
    (tmp_path / "NOTES_NOBODY_CURATED.md").write_text(
        _fence("metric: traced_ratio", "value: 3 of 26"), encoding="utf-8")
    found = declared_claims(tmp_path)
    assert [(c.path, c.metric) for c in found] == [
        ("NOTES_NOBODY_CURATED.md", "traced_ratio")]
    assert check(found[0], REPO_ROOT).status == DISAGREES


def test_declarations_in_file_reads_both_carriers_off_disk(tmp_path):
    (tmp_path / "a.md").write_text(
        _fence("metric: one_fold_rule", "exceptions: workbook_corner"),
        encoding="utf-8")
    (tmp_path / "b.json").write_text(json.dumps(
        {"claims": [{"metric": "one_fold_rule", "exceptions": "workbook_corner"}]}),
        encoding="utf-8")
    assert [c.metric for c in declarations_in_file(tmp_path / "a.md", "a.md")] == \
           [c.metric for c in declarations_in_file(tmp_path / "b.json", "b.json")]


def test_text_outside_declarations_drops_the_block_and_keeps_the_prose():
    text = ("The ratio is 5 of 26.\n\n"
            + _fence("metric: traced_ratio", "value: 5 of 26") + "\n\nAnd on.\n")
    stripped = text_outside_declarations(text)
    assert "metric: traced_ratio" not in stripped
    assert "The ratio is 5 of 26." in stripped and "And on." in stripped
