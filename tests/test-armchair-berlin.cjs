'use strict';
// Run the shared production/space/roundtrip checks for the independent Berlin asset.
process.argv.push('--berlin');
require('./test-armchair.cjs');
