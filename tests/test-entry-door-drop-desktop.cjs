'use strict';
// The retired template inspector is covered by the current component editor.
// Legacy entry geometry remains covered by its dedicated core regression.
process.argv.push('--builder-editing-only','--desktop-only');
require('./test-cabinet-ui.cjs');
