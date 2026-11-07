'use strict';
// Reuse the same source-copy, offline and packaged-EXE isolation harness.
process.argv.push('--parameters-only');
require('./test-cabinet-back-components-ui.cjs');
