---
name: furnish-blender-modeling
description: Use the Codex Blender plugin to measure references, author fixed furniture or appliances, inspect geometry and renders, and verify the resulting Furnish production model. Applies to model creation, substantial visual refinement, and model pipeline checks.
---

Use the plugin's `furnish_model` and `blender_*` tools when available. The repository's product rules, production constructors, and validation documents remain authoritative. Locate the checkout with `furnish_model action=doctor root=<checkout>`; before the first Gateway start, use `action=bind root=<checkout>` to remember it in plugin data, or set FURNISH_ROOT. A per-call root on verification overrides this binding.

Read the checkout's AGENTS.md, docs/ARCHITECTURE.md and docs/DEVELOPMENT-GUIDE.md. For model work also read docs/BLENDER-MODELING-PIPELINE.md and the applicable model document. Preserve dirty files and user layouts. Fixed products use editable Blender sources and GLB/offline publication; custom cabinets retain Furnish's parametric constructors.

## Choose the execution route

- `blender_session action=doctor` starts/checks this plugin's isolated loopback Gateway (default 39878). A GUI connection is ready only when doctor.kind=ok. This is distinct from headless readiness.
- In a dedicated Blender window, load the bundled extension, set its Gateway port to 39878, and Connect. Inspect status for instance/project identity; explicitly attach with `args.instance_id`. Never disable the user's existing BlenderMCP or replace a live scene to make this work. Use a separate factory-startup window/profile if another bridge is active.
- GUI editing uses `blender_py`, `blender_op`, `blender_inspect` and `blender_see`. Write grants and the addon's human pause remain enforced; pause/resume cannot be overridden by the agent. Release the session at completion.
- Long work and environments without GUI use `blender_run action=submit args={kind:"headless",script:...}` or declarative `kind:"render",file:<saved blend>`. Keep the returned job id; status/wait/collect/cancel use that id. Wait is bounded to 30 seconds. Read failed logs before submitting again. Headless scripts use ordinary bpy; the queue does not implicitly preload the GUI K kernel.

Python runs with the local user's permissions. Use isolated copies and explicit artifact directories; this bridge is not a Python sandbox. Existing source .blend files are input snapshots; write revised models to new versions before publication.

## Reference → geometry → appearance

Read docs/BLENDER-VISUAL-REVIEW.md and create a record from docs/templates/MODEL-VISUAL-REVIEW.md. Open actual reference images and key crops before modeling; record their source, SHA256, recognized features and unknowns. Dimensions from annotated drawings and photo estimates are separate. With no physical scale, upstream image measurement returns pixels; do not invent millimeters.

Discover operations using `blender_op op=catalog args={family:...}`. Use returned argument skeletons rather than assuming upstream tool parameter names. Reference measurement, mesh audits, assembly gates, and visual reports are upstream operations through action=plan; their individual dependencies may be unavailable. Read the specific error, do not auto-install unrelated dependencies. For loft/sweep/patch surfaces, read [曲面算法](references/曲面算法.md) for the upstream scope and limitations.

Model recognition points and layered openings first. Preserve stable named parts, material regions, motion pivots and rigid proportions. Match the reference camera; render and actually inspect silhouette, structure, then materials. Address at most three identifying differences each round. Keep same-camera before/after evidence; avoid pixel similarity as a universal acceptance score.

Furnish dimensions are mm, Blender mesh boundaries are m. Preserve +Z front conventions and the project's actual export transforms. Bottom mountHeight is independent of body height and is applied once. Product dimensions, mounting datum and operation clearance remain separate.

## Production verification

Use `furnish_model action=profiles` to select the actual supported profile; `action=verify profile=<id>` runs the existing isolated pipeline asynchronously. It includes applicable author preflight/negative cases, independent publication, real production spatial/state checks, HTTP and offline file export, Blender readback, three camera renders and saved-engine reopen. Parametric profiles retain their route. It does not publish into the working checkout or rewrite the current plan.

Poll `furnish_model action=status id=<id>` and collect the final report/log. A completed job with passed=true is technical verification for that profile only. Reference-image visual acceptance remains not-executed until you open and assess the relevant images. Exporting from the upstream engine does not replace Furnish's independent publisher, product-specific material/part/motion rules or production export checks.

When publishing an authored revision, follow the checkout's existing model-specific entry points; retain the previous valid .blend/GLB/offline asset and fail closed on independent validation. Report size/space, source visual review and production transfer separately, with evidence and remaining simplifications. Do not claim all upstream operations or all Furnish profiles were tested.
