'use strict';
// Current production component dragging replaces the retired template inspector.
process.argv.push('--component-edit-only','--http-only');
require('./test-cabinet-ui.cjs');
