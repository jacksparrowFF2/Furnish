/* CLI rejects unsupported profiles/devices before creating jobs or spawning apps. */
'use strict';
const assert=require('node:assert/strict'),{options}=require('../scripts/verify/verify-model-pipeline.cjs');
assert.deepEqual(options(['washer-tg10k60w']),{profile:'washer-tg10k60w',device:'auto'});
assert.deepEqual(options(['washer-tg10k60w','gpu']),{profile:'washer-tg10k60w',device:'gpu'});
assert.deepEqual(options(['all','gpu']),{profile:'all',device:'gpu'});
assert.deepEqual(options(['fridge,corner-bookcase']),{profile:'fridge,corner-bookcase',device:'auto'});
for(const args of [[],['unknown-model'],['washer-tg10k60w','magic'],['washer-tg10k60w','gpu','extra']])assert.throws(()=>options(args),/Usage:/);
const registry=require('../scripts/lib/model-profiles.cjs'),profiles=registry.profiles(),catalog=require('../src/data/catalog.js');
assert.equal(new Set(profiles.map(p=>p.id)).size,profiles.length);
for(const type of new Set(catalog.library.flatMap(c=>c.items.map(i=>i[0]))))if(!registry.originalTypes.has(type))assert(profiles.some(p=>p.type===type),'Missing later catalog model: '+type);
for(const p of profiles){assert(p.tests.length,'Missing structure suite: '+p.id);assert(p.fixture.w>0&&p.fixture.d>0);}
const fs=require('node:fs');for(const f of fs.readdirSync(require('node:path').join(__dirname,'../src/data')).filter(f=>f.endsWith('-blender-asset.js')))assert(profiles.some(p=>p.asset?.runtime==='src/data/'+f),'Unregistered imported asset: '+f);
console.log('PASS pipeline CLI, original-type exclusions, all added catalog types and all imported asset coverage');
