'use strict';
// The retired template inspector is covered by the current component editor.
// Legacy entry geometry remains covered by its dedicated core regression.
process.argv.push('--component-edit-only','--desktop-only');
require('./test-cabinet-ui.cjs');
