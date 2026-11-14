process.env.FURNISH_CABINET_UI_FLOW='cabinet-night-contours-ui';
process.env.FURNISH_TEST_PROJECT||=require('../scripts/workspace-files.cjs').create(require('node:path').resolve(__dirname,'..')).info().file;
require('./test-cabinet-ui.cjs');
