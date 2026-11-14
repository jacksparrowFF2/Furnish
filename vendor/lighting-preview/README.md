# Offline lighting preview

Frozen ESM dependency graph for the isolated HD preview. The main editor keeps its
existing embedded Three.js r160 graph. No npm install, CDN, or network model fetch
is required by the distributed application.

Pinned versions, original/rewritten SHA-256 hashes and the OIDN weights source are
in `manifest.json`. Package licenses and the weights' Apache 2.0 license are
included. JavaScript changes are restricted to local relative import paths,
including the BVH module worker; the Windows reserved basename `aux.wgsl.js` is
published as `furnish-aux.wgsl.js` with matching imports. Application adaptations live in
`src/render/lighting-preview.js`, outside the vendor source.

To reproduce, use a separate directory with the exact package versions in the
manifest, and run `node scripts/vendor-lighting-preview.cjs <node_modules>
<rt_hdr_alb_nrm_small.tza>`. The script verifies versions and the weights hash. Put
the original `OIDN-WEIGHTS-LICENSE.txt` next to the weights. It uses Node builtins
and performs no network access. `tests/test-lighting-preview.cjs` checks all
distributed hashes.
