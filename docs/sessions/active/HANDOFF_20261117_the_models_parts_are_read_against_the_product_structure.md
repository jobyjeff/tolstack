---
priority: med
depends_on: []
model: sonnet
hitl: false
---

# HANDOFF 2026-11-17 — the_models_parts_are_read_against_the_product_structure: one table for Jeff — each part of the end-stop model against what its STEP file and Enovia say it is made of

Source: Jeff, 2026-11-17: "ready to start building out the model in more
detail? All the correct assembly structures …". Today v2
(`docs/topologies/topology_vpa_end_stop_v2.json`) has 15 parts and two of them
are assemblies with children (the pitch link and the tangential link, each
with its bearings). The other part numbers are drawn as single parts, and at
least some are not: 213668-002's mesh is `machined_213668`
(`docs/topologies/part_mesh_aliases.json`), a machined detail, while the model
speaks of that mount's bushings. Nobody has laid the model's parts beside the
real structure, so the next strategy session cannot say which assemblies to
author. This handoff measures; it authors nothing in the model.

Baseline: `master`. Runs beside the chain that starts with
`the_map_is_portrait_as_jeff_drew_it` and shares no file with it. Scope:
`docs/sessions/lessons/` only (the page, the lesson). Do NOT edit
`docs/topologies/`, `tolerance_stack/`, `apps/` or any other repo. Read-only
everywhere else, including Enovia.

## Deliverables

1. **`docs/sessions/lessons/REVIEW_20261117_the_models_parts_against_the_product_structure.md`**
   — a page Jeff reads in two minutes: three lines on top (what the model
   gets right, what it flattens, what he must decide), then tables, no
   paragraphs.
   **Table 1, one row per v2 part** (15 rows, in the model's tree order by
   body):
   - part number and name as the model has them, and its body;
   - the mesh it draws (`part_mesh_aliases.json` → `mesh_part_id` →
     `C:\workspace\tolstack\data\meshes\<sha>\provenance.json`): the source
     STEP's file name, and whether that STEP is one solid or several (a
     detail or an assembly), with the solid count;
   - what Enovia says the part number is and what it contains (item 2);
   - the children the model gives it today;
   - how many bindings in Jeff's log sit on that mesh today (fold a **copy**
     of `C:\workspace\tolstack\data\inbox\feature-identity\`; never write
     there) — a split of that mesh into detail and children re-keys them.
   **Table 2, the assemblies the model does not have**: each real assembly
   (from the STEP files and Enovia) whose members are in v2 — its number, its
   members, and whether the members all move as one rigid body in the model or
   are spread over two (an assembly spread over two bodies cannot be a
   `parent` in the model as it stands: a child is in its parent's body).
   **Table 3, the parts the real structure has between these and that v2
   leaves out on purpose** (bushings, bearings, fasteners, washers — v2's
   `notes` names the omissions; v1 has many of them): which would become a
   child of which part.
   End with **a proposed part tree per body**, as an indented list, marking
   each line "in the model", "would be added", or "needs a mesh split".
2. **Enovia, as far as it can be read.** A suggestion, not a requirement:
   `C:\workspace\enovia-sync` reads the product structure
   (`enovia_sync/bom.py`, `children(client, plm_id)`; read that repo's
   `CLAUDE.md` for how a client is made; the token is the environment
   variable `DATABRICKS_SQL_TOKEN`; the propeller of SN102 is
   `prd-e-04421542`). Read-only queries only. If the token is not set or the
   query fails, write "Enovia not read: <the reason>" in that column, finish
   the page from the STEP files and v1's part list, and say so in the top
   three lines. Do not ask Jeff for a token and do not stop.
3. **No guessing.** A part number whose structure neither source shows is a
   row that says so.

## Definition of done

- The page exists with the three tables and the proposed tree; every cell
  names where it came from (a file path, a query, or "not read").
- Nothing outside `docs/sessions/lessons/` changed; the feature-identity file
  count is the same before and after (record both).
- Lesson (`docs/sessions/lessons/LESSONS_20261117_the_models_parts_are_read_against_the_product_structure.md`):
  how each source was read, what could not be, and how long it took.
