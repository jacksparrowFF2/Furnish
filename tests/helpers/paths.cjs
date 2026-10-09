const path = require('node:path');
const root = path.resolve(__dirname, '../..');
exports.rootPath = relative => path.join(root, relative);
