'use strict';
// Reuse the same source-copy, offline and packaged-EXE isolation harness.
process.argv.push('--component-parity-only');
require('./test-cabinet-ui.cjs');
