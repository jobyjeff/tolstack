# Lessons — the models' parts read against the product structure (2026-11-17)

Deliverable: `REVIEW_20261117_the_models_parts_against_the_product_structure.md` (three tables, proposed tree). Docs only; nothing outside `docs/sessions/lessons/` changed. Wall time about 45 minutes, most of it Enovia round trips (each query is a few seconds; the recursive tree walks were 40 s and up).

## How each source was read

- **v2 and aliases:** `topology_vpa_end_stop_v2.json` (`bodies[].parts`, `parts[]`) joined to `part_mesh_aliases.json`. Read JSON with `-X utf8`: the v1 file has a byte cp1252 cannot decode.
- **Meshes:** `data/meshes/*/provenance.json`, matched on `part_id`. `extraction.product_is_assembly`, `n_solids`, `n_leaf_descendants` and `instances[].instance_path` carry the structure. There is no list of leaf names, so a child's identity comes from Enovia, not from the STEP.
- **Enovia:** token was set. Used `enovia_sync.bom.children(client, plm_id)` and `enginering_part_attributes` through `SqlClient`, from a scratch script run with the enovia-sync venv (`-I`, `sys.path` insert). Read-only.
- **Bindings:** copied `data/inbox/feature-identity/` to the scratchpad and ran `feature_identity.fold_with_models` on the copy; counted standing `bound` events and faces per `source_step_sha256`, solids from each mesh's `manifest.json`. Before and after listing of the real directory: identical, 84 files.

## Gotchas (the next reader will hit these)

- **`enovia bom <part>` failed for 215071-001, 215175-002, 215177-001 ("no RELEASED revision")** although all three are released: `dwgname` is the number without the dash suffix (`215071`), the `title` carries `215071-001`. `lookup` finds them by title; `bom` does not. A query by `title` or `dwgname` works.
- **`attrs.identity` is `<plm id> <revision>`**, `bom_forest`'s `catia_parent_name` is the bare plm id. Passing the identity to `children()` returns zero rows silently, which looked like "assembly with no children" until I stripped the revision.
- **Two Enovia identities carry dwgname 216332-001**: the blade bonded assembly (prd-e-03503673) and a Detail "plug, tail stringer" titled `216632-001`. `bom 216332-001` resolves to the plug and reports zero children.
- **Collectors are not physical assemblies** (Enovia: `producttype = 'Collector'`, several IN_WORK). The STEP uses them as grouping nodes (P2/P3-213456-001, P3-214700, prd-e-03372837); whether the model should treat them as assemblies is Jeff's call and Table 2 marks them.
- **Enovia is current, the STEP is the 217755-001 A.1 CW release**: 215175-001 (STEP) vs -002 (the model id, CCW), 215176-001 vs -002, 214820-002 vs -003 differ. The model's `tan_link_mount_215175_002` id has always been drawn from the -001 mesh (the alias notes say so).
- **`fold_with_models` needs the models**: `build_projection(events)` without topologies raises "retracts ... on a different stack key" on the retracted hub axis event.
- A mesh's `manifest.json` records `solid_id` per face but not which child that solid is, so which binding would move to which child on a split is not derivable here.

## Not read

- Which bindings move to which child on a split (above).
- No mesh was opened; solid counts are the extraction's own.
- 215176-00x, 217970-001 and the collectors have no installed mesh read; Table 3 marks them.
- The STEP files themselves were not opened (a 2 GB assembly STEP): structure came from the extraction provenance and Enovia.

## Follow-ups

None filed: the page's three decisions are Jeff's, for the next strategy session; none is a defect. Filed no issue.

## Suite record

See the hand-back report.
