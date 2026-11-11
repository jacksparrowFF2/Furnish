# Provenance and licenses

The host-independent engine under `vendor/dsh/runtime/` and its configuration are adapted from [sixtysevenlf/dsh-blender-plugin](https://github.com/sixtysevenlf/dsh-blender-plugin), commit `68513f23e068eaa36cd958af9ba9aa068c64752b` (package version 3.1.0-alpha.1). The BSD-3-Clause copyright and disclaimer are preserved in `vendor/dsh/LICENSE`. Original source file headers remain intact.

The complete bundled Blender extension source and zip are under `vendor/dsh/extension/`, licensed GPL-3.0-or-later. `extension/LICENSE` and `extension/NOTICE` retain the license and the MIT notice for code derived from ahujasid/blender-mcp. The extension source is shipped alongside the zip; it is not rebadged or modified by this adapter.

The upstream surface algorithm reference and modeling skill notices are preserved under `skills/furnish-blender-modeling/` with their MIT LICENSE and NOTICE.md. The Codex workflow entry point is newly written for Furnish.

The new Codex adapter in `mcp/` is licensed under the BSD-3-Clause terms in `LICENSE`. It does not import the DSH/Cordis host, TUI, tool-renderer or attachment service packages. The upstream wire header names are retained as protocol compatibility, not a DSH runtime dependency.

## Local engine changes

`runtime/core/queue/spawn-executor.ts` differs from the pinned upstream source:

- Set `--python-exit-code 1` for render and headless jobs so Python exceptions produce failed queue receipts even when Blender normally exits 0.
- Put `--disable-autoexec` before loading input .blend snapshots.
- Apply `--factory-startup` before loading an input .blend, preserving its scene/camera while excluding user startup files and enabled addons from isolated jobs.

`UPSTREAM.json` records the original hash and adapted hash of each changed source. All other vendored source files remain unchanged. No endorsement by upstream authors is implied.
