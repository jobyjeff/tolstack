---
type: chore
priority: med
status: open
area: issues/viewer
reporter: agent
found_by: docs/sessions/active/HANDOFF_20261117_the_map_is_the_only_drawing_and_classic_retires.md
---

# Open issues that name the retired rails, leaders, respine or Classic — for one triage pass

Handoff `the_map_is_the_only_drawing_and_classic_retires` (2026-11-17) retired
the rails drawing ("Classic"), the Map · Classic switch, the respine
animation, the DAG↔grid and DAG↔3D leaders, the rails' zoom box, the length
modes, the colour overlays, group fill, graph width, Parts: Blocks/On the
rails, body collapse, the joint glyphs and the pose film. The DAG region draws
the map for every model; the grid, the tree, the 3D pane and the Preview are
unchanged.

The open (or triaged, or deferred) issues below mention one of those words.
Many describe a defect in something that no longer exists and can be closed
without action; some name a grid, Preview or 3D behaviour that survives and
stay open; a few describe a wish the map now has to answer instead. That is a
judgement per issue, made with the triage budget, so this handoff did not make
it -- except two it closed because the handoff named one and the other's
subject was Classic itself
(`ISSUE_20261114_the_dag_still_lays_out_for_a_grid_beside_it_that_has_its_own_region_now`,
`ISSUE_20261117_design_classics_rotary_glyph_arrow_is_crossed_by_a_chord_at_row_pitch`).

One thing the handoff could not reach, since `apps/annotate/` was fenced
out: the scene still posts `annotate:anchors` (and answers `model anchors`)
for the seam leaders, and the shell no longer reads it
(`docs/ANNOTATION_SURFACE.md`, the anchors paragraph). Harmless; whether the
scene stops posting it is the next annotate handoff's call.

The list is a keyword match (`tv__rails`, `respine`, `jog zone`, `classic`,
`length mode`, `leader(s)`, `the rails`, `seam`), so it over-reaches: an
annotate issue about the scene's own leader is here too.

| Issue | Title |
| --- | --- |
| `ISSUE_20260910_classic_stacks_have_no_3d_launch.md` | Classic (loose) stacks have no 3D launch — the annotator navigates topologies only |
| `ISSUE_20260910_leader_grid_part_runs_repeat.md` | A part revisited by the walk gets one merged row per RUN — decide whether split runs need a visual tie |
| `ISSUE_20260914_two_active_handoffs_each_turn_the_others_real_tier_red.md` | Two active handoffs that each add a projection field turn each other's `[real]` tier red |
| `ISSUE_20260915_the_grid_cross_fades_through_a_respine_instead_of_moving_its_rows.md` | The grid cross-fades through a respine; its rows do not move |
| `ISSUE_20260915_the_per_element_respine_fade_is_no_longer_reachable_from_the_page.md` | `VA.tweenAlpha`'s per-element fade can no longer be reached by any click — keep it, or retire it? |
| `ISSUE_20260916_the_grip_reachability_checks_inherit_their_stage_from_an_earlier_block.md` | The four grip-reachability sub-checks are non-vacuous only because an earlier block left the jog zone open |
| `ISSUE_20260917_both_apps_render_one_theme_and_no_mechanism_exists_for_a_second.md` | "Contrast holds in both themes" has nothing to hold in: both apps render one theme, and no mechanism for a s |
| `ISSUE_20260918_a_worktree_could_run_the_real_tier_against_the_main_checkout_instead_of_only_failing_on_it.md` | A worktree could RUN the `[real]` tier against the main checkout instead of only failing on it — and that, |
| `ISSUE_20260918_the_annotators_reader_facing_copy_is_scanned_in_its_markup_only_never_as_rendered.md` | The annotator's reader-facing copy is scanned in its MARKUP only — most of its words are written by app.js |
| `ISSUE_20260918_the_type_scale_guards_confidence_token_list_is_an_unpaired_hand_copy_of_va_confidences.md` | `CONFIDENCE_TOKENS` is a hand-copy of `VA.CONFIDENCES`, and the guard it parametrizes goes SILENT — not re |
| `ISSUE_20260922_forty_five_browser_check_names_are_interpolated_so_no_guard_behind_them_can_be_enrolled.md` | 45 of the browser tier's 51 template-literal check names carry a live number, so no guard behind one of them |
| `ISSUE_20260930_projection_inputs_reads_a_git_failure_as_no_stamped_projection.md` | `projectionInputs` returns an empty set when git cannot be asked, and the preflight reads that as "no stampe |
| `ISSUE_20260930_the_readmes_as_allocated_baseline_is_a_hand_copy_of_a_test_literal.md` | The README's as-allocated crossing baseline (20 / 12 / 52) is a hand copy of a test literal, and the layout  |
| `ISSUE_20261022_the_annotate_real_tier_reads_the_main_checkout_from_a_worktree_with_no_staleness_check.md` | The annotator's `[real]` checks silently read the main checkout from a worktree, so `tests/test_annotate_js_ |
| `ISSUE_20261022_the_default_test_tier_runs_past_its_ten_minute_budget.md` | The default pytest tier runs 12 minutes against a 10-minute budget |
| `ISSUE_20261026_respine_and_refit_browser_checks_miss_their_frame_under_load.md` | Respine and re-fit browser checks miss their frame when the box is loaded |
| `ISSUE_20261026_the_product_graph_is_past_the_exact_column_search_and_crosses_itself.md` | The one product graph is past the exact column search, and its DAG crosses itself |
| `ISSUE_20261027_design_the_planar_and_clearance_glyphs_read_alike_and_body_names_sit_on_the_rails.md` | Design: the planar and clearance glyphs read alike, and body names sit on the rails |
| `ISSUE_20261027_leaders_across_the_seam_cross_each_other_where_dot_order_and_anchor_order_disagree.md` | Leaders across the seam cross each other where dot order and anchor order disagree |
| `ISSUE_20261027_no_real_topology_switch_since_the_fold.md` | No real topology to switch to: three browser checks lost their live subject |
| `ISSUE_20261027_on_the_kinematic_page_most_of_the_lit_sets_leaders_across_the_seam_are_out_of_view_at_rest.md` | On the kinematic page most of the lit set's leaders across the seam are out of view at rest |
| `ISSUE_20261027_the_scene_to_shell_mapping_stops_at_a_body_and_ignores_hover.md` | The scene-to-shell mapping stops at a body, and ignores hover |
| `ISSUE_20261027_the_travel_sub_stack_crosses_four_bodies_so_it_cannot_fold_into_one_bar_inside_one.md` | The travel sub-stack crosses four bodies, so it cannot fold into one bar inside one body |
| `ISSUE_20261028_a_row_the_band_moves_sideways_jumps_to_its_new_column_on_the_first_frame.md` | A row the band moves sideways jumps to its new column on the first frame |
| `ISSUE_20261028_the_per_study_layout_the_builder_emits_has_no_reader_since_the_band.md` | The per-study layout the builder emits has no reader, and the band makes it obsolete |
| `ISSUE_20261028_the_seam_dot_clip_lost_both_its_witnesses_when_the_band_began_fitting_the_box.md` | The seam's dot clip lost both of its witnesses when the band began fitting the box |
| `ISSUE_20261029_compact_density_fit_witness_is_masked_by_the_arrival_check.md` | The compact-density Fit witness reddens a different check than the one it declares |
| `ISSUE_20261029_four_3d_pane_nav_gesture_checks_fail_together_when_the_bodies_resolve_late.md` | Four 3D-pane nav gesture checks fail together when the bodies resolve late |
| `ISSUE_20261029_the_respine_rebuilds_the_pane_every_frame.md` | The respine tween rebuilds the whole pane on every frame |
| `ISSUE_20261029_three_d_pane_nav_body_checks_fail_in_a_loaded_full_run.md` | "3D pane follows the selection" fails four nav-body sub-checks in a loaded full run |
| `ISSUE_20261030_a_wheel_zoom_repaints_the_whole_topology_pane_on_every_wheel_event.md` | A wheel zoom repaints the whole topology pane on every wheel event, and nobody has timed it |
| `ISSUE_20261030_both_of_jeffs_leader_screenshot_rows_still_have_one_end_with_no_leg_into_the_scene.md` | Both of Jeff's leader screenshot rows still have one end with no leg into the scene |
| `ISSUE_20261103_the_contact_suggestions_real_test_pairs_this_tree_with_a_projection_built_from_another.md` | The contact-suggestions `[real]` test pairs this tree's topology with a projection built from another tree |
| `ISSUE_20261103_the_gas_spring_mesh_sits_at_another_stroke_from_the_plate.md` | The gas spring's mesh sits 51.54 mm from the plate it is pinned to |
| `ISSUE_20261104_at_1600_wide_the_product_graphs_rails_leave_the_grid_a_59px_slit.md` | At 1600×1000 the product graph's rails leave the grid a 59px slit, and no grid row can be clicked |
| `ISSUE_20261104_clear_point_falls_back_to_a_synthetic_event_without_saying_so.md` | clearPoint falls back to a synthetic event without saying so, so a grid row no pointer can reach still passe |
| `ISSUE_20261104_the_click_never_moves_the_drawing_check_never_clicks_a_grid_row.md` | The "a click never moves the drawing sideways" check never clicks a grid row |
| `ISSUE_20261104_the_first_row_zoom_check_wheels_above_the_drawing.md` | The first-row zoom check wheels above the drawing, so it never zooms |
| `ISSUE_20261104_the_kinematic_stack_has_no_by_reach_sort.md` | The kinematic stack has no "by reach" sort |
| `ISSUE_20261105_a_nav_scene_row_rebuilt_under_a_resting_pointer_drops_the_scenes_hover_light.md` | A nav scene row rebuilt under a resting pointer drops the scene's hover light until the pointer moves |
| `ISSUE_20261105_folding_the_piston_heads_and_cover_into_their_bodies_widens_and_tangles_the_dag_walk.md` | Folding the piston heads and cover into their bodies widens and tangles the DAG walk |
| `ISSUE_20261105_the_suite_file_unit_page_times_out_loading_at_the_start_of_a_loaded_run.md` | "suite file://" times out loading its page at the start of a loaded full run |
| `ISSUE_20261106_a_part_the_kinematic_stack_visits_twice_is_two_blocks.md` | A part the kinematic stack visits twice is two blocks |
| `ISSUE_20261106_a_rail_side_pins_leader_crosses_its_own_blocks_chords.md` | A rail-side pin's leader crosses its own block's chords |
| `ISSUE_20261106_the_block_column_search_costs_half_a_second_on_a_studys_first_paint.md` | The block column search costs half a second on a study's first paint |
| `ISSUE_20261106_the_changed_since_witness_gate_overruns_its_merge_budget_by_the_entry_the_cap_let_start.md` | The `--changed-since` witness gate overruns its merge budget by the entry the cap let start |
| `ISSUE_20261106_the_contribution_length_mode_leaves_the_stop_position_terms_unscaled.md` | The contribution length mode draws the linkage to scale and floors the stop's own terms |
| `ISSUE_20261106_the_u10h_grip_budget_crosses_itself_more_as_blocks_than_on_the_rails.md` | The U10H grip budget crosses itself more as blocks than on the rails |
| `ISSUE_20261106_the_viewer_browser_tier_ran_51_minutes_against_the_merge_budget.md` | The viewer browser TRUTH tier ran 50 m 54 s, recorded against the merge budget |
| `ISSUE_20261106_the_witness_gate_ran_43_minutes_wall_with_the_browser_slot_contended.md` | The witness gate ran 43 minutes of wall time while the browser slot was contended |
| `ISSUE_20261108_the_page_trails_the_3d_pane_by_its_draw_time_at_full_pace.md` | The kinematic page trails the 3D pane by its own per-frame draw time at the pane's full pace |
| `ISSUE_20261109_design_a_long_body_name_runs_past_its_container_and_under_the_rails.md` | Design: a long body name runs past its DAG container's right edge, with rails drawn through it |
| `ISSUE_20261109_design_the_end_stop_model_at_rest_frames_a_close_up_in_a_tall_pane.md` | Design: the end-stop model at rest frames a close-up of one large part in a tall pane |
| `ISSUE_20261109_the_3d_pane_follows_the_selection_suite_fails_a_different_set_of_sub_checks_each_run.md` | "3D pane follows the selection" fails a different set of sub-checks each run |
| `ISSUE_20261109_the_annotate_model_suites_fake_bindings_reader_loses_a_race_to_the_real_bindings_projection.md` | The "annotate model in the scene" suite's fake bindings reader can lose a race to the real bindings projecti |
| `ISSUE_20261109_the_grid_beside_the_open_pane_and_the_new_line_weights_revert_green_in_every_tier.md` | The grid beside the open 3D pane, and the new line weights, revert green in every tier |
| `ISSUE_20261109_the_kinematic_page_view_settings_survive_a_reload_check_is_intermittent.md` | The kinematic page's "View settings survive a reload" checks are intermittent |
| `ISSUE_20261109_two_of_the_end_stop_models_joint_nodes_have_no_leader_in_the_sweep.md` | Two of the end-stop model's joint nodes have no leader in the sweep |
| `ISSUE_20261110_the_faces_layer_repeats_the_marks_legend_under_every_selected_feature.md` | The faces layer repeats the marks' legend under every selected feature |
| `ISSUE_20261111_a_feature_the_newest_sweep_does_not_carry_opens_to_an_empty_body.md` | A feature the newest sweep does not carry opens to an empty body |
| `ISSUE_20261111_renderscenetree_and_the_marks_legend_are_tested_but_the_app_no_longer_draws_them.md` | `VA.renderSceneTree` and the marks legend are tested but the app no longer draws them |
| `ISSUE_20261114_reworded_browser_guards_of_the_fixed_shell_carry_no_spec.md` | The fixed shell's reworded browser guards carry no mutation spec |
| `ISSUE_20261116_small_findings_of_the_map_and_binding_flow_walk.md` | Small findings of the 2026-11-16 walk (the map and the binding flow) |
| `ISSUE_20261117_leaders_across_the_seam_flakes_on_integration_in_three_different_sub_checks.md` | "Leaders across the seam" flakes on integration, in three different sub-checks |
| `ISSUE_20261117_the_annotate_rail_holds_still_take_checks_flake_in_the_whole_browser_tier.md` | The "annotate rail holds still" Take checks flake in the whole browser tier |
| `ISSUE_20261117_topology_file_reload_restore_of_column_width_flakes_in_the_whole_browser_tier.md` | `topology file://`'s reload restore of column width flakes in the whole browser tier |
