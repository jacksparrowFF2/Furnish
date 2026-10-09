/* Production syntax, regression tests and built-in plan validation. */
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const vm = require('node:vm');
const {spawnSync} = require('node:child_process');
const root = path.resolve(__dirname, '..');
function run(args) {
  const result = spawnSync(process.execPath, args, {cwd:root, encoding:'utf8'});
  if (result.error) throw result.error;
  if (result.status !== 0) {
    process.stdout.write(result.stdout || '');
    process.stderr.write(result.stderr || '');
    process.exit(result.status || 1);
  }
}
function filesIn(dir) {
  return fs.readdirSync(dir, {withFileTypes:true}).flatMap(entry => {
    const file = path.join(dir, entry.name);
    return entry.isDirectory() ? filesIn(file) : [file];
  });
}
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
for (const match of html.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/g)) {
  const attrs = match[1];
  if (/src=|importmap/.test(attrs)) continue;
  if (/type="module"/.test(attrs)) {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'furnish-check-'));
    const file = path.join(dir, 'view3d.mjs');
    try { fs.writeFileSync(file, match[2]); run(['--check', file]); }
    finally { fs.unlinkSync(file); fs.rmdirSync(dir); }
  } else new vm.Script(match[2]);
}
// Fail early on broken local script, stylesheet and icon references.
for (const match of html.matchAll(/<(?:script|link)\b[^>]*(?:src|href)="([^"]+)"/g)) {
  if (/^(?:https?:|data:)/.test(match[1])) continue;
  if (!fs.existsSync(path.join(root, match[1]))) throw Error('Missing asset: ' + match[1]);
}
const sources = filesIn(path.join(root, 'src'));
for (const file of [...sources, ...filesIn(__dirname), ...filesIn(path.join(root,'tests'))].filter(f => /\.(?:js|cjs|mjs)$/.test(f))) run(['--check',file]);
for (const file of filesIn(path.join(root,'tests')).filter(f => /^test-.*\.cjs$/.test(path.basename(f))).sort()) {
  run([file]); console.log('PASS ' + path.relative(root,file));
}
run([path.join(__dirname,'validate-plans.mjs')]);
console.log('PASS 12 built-in plans, local assets and all production syntax checks');
