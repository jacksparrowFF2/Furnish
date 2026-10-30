/* CLI rejects unsupported profiles/devices before creating jobs or spawning apps. */
'use strict';
const assert=require('node:assert/strict'),{options}=require('../scripts/verify/verify-model-pipeline.cjs');
assert.deepEqual(options(['washer-tg10k60w']),{profile:'washer-tg10k60w',device:'auto'});
assert.deepEqual(options(['washer-tg10k60w','gpu']),{profile:'washer-tg10k60w',device:'gpu'});
for(const args of [[],['fridge'],['washer-tg10k60w','magic'],['washer-tg10k60w','gpu','extra']])assert.throws(()=>options(args),/only this profile is integrated/);
console.log('PASS model pipeline argument boundaries');
