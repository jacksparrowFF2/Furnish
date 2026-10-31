/* Metadata migration checks: reference integrity, source identity and rejection paths. */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os'),crypto=require('node:crypto');
const M=require('../scripts/lib/model-asset-index.cjs'),I=require('../scripts/index-model-assets.cjs');
const root=path.resolve(__dirname,'..'),index=M.build();
const historicalIds='aluminum-light-channel aquarium-mijia-2pro armchair armchair-berlin cabinet-design-references cat-tree ceiling-lighting chair-s05118 cherry-coffee-table circulation-fan-references corner-bookcase corner-bookcase-580 curtain-references dishwasher downlight-dl269 entry-console entry-pegboard fridge hood litter-box panel-light pet-feeder-mijia-2 robot-p20max se2 secondary-wardrobe shoe-bench shower-arrow side-table sliding-door-references sofa-bed stack-stool tea-bar tv-cabinet-references wardrobe-desk-references washer washer-tg10k60w window-bench-references y52y09 yeswood-sofa'.split(' ');
assert.equal(historicalIds.length,39);assert(historicalIds.every(id=>index.products.some(p=>p.id===id)),'all original dossiers remain present');
const manifests=fs.readdirSync(path.join(root,'assets/models'),{withFileTypes:true}).filter(e=>e.isDirectory()&&fs.existsSync(path.join(root,'assets/models',e.name,'asset.json')));
assert.equal(index.counts.productDossiers,manifests.length);assert.equal(index.counts.blenderModels,index.models.length);assert(index.models.length>=15);
assert.equal(index.counts.referenceImages,index.products.reduce((n,p)=>n+p.references.length,0));assert.equal(index.counts.missingReferences,index.products.reduce((n,p)=>n+p.missingReferences.length,0));
const lining=index.products.find(p=>p.id==='window-lining');assert.deepEqual(lining.types,['quartz_sill','window_surround']);assert.equal(lining.references.length,3);
assert(index.products.filter(p=>historicalIds.includes(p.id)).reduce((n,p)=>n+p.references.length,0)>=130,'historical input coverage retained');
assert.equal(new Set(index.products.map(p=>p.id)).size,index.products.length);
for(const p of index.products){
 assert(!JSON.stringify(p).includes('Users/SPH'));assert(!/"[A-Za-z]:[\\/]/.test(JSON.stringify(p)));
 for(const r of p.references)assert(fs.existsSync(path.join(root,'assets/models',p.id,r.path)));
 for(const r of p.missingReferences){assert.equal(r.status,'not-found-locally');assert(fs.existsSync(path.join(root,r.document)));}
}
for(const m of index.models){assert(index.products.some(p=>p.id===m.profile));assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join(root,m.current.glb))).digest('hex'),m.sourceSha256);}
assert.equal(index.products.find(p=>p.id==='chair-s05118').references.length,6);
assert.equal(index.products.find(p=>p.id==='armchair').references.length,9);
assert.equal(index.products.find(p=>p.id==='sofa-bed').references.filter(r=>r.kind==='product-page-original').length,9);
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'furnish-reference-')),refs=path.join(temp,'references');fs.mkdirSync(refs);const file=path.join(refs,'sample.png'),data=Buffer.from('reference-test');fs.writeFileSync(file,data);
const entry={path:'references/sample.png',sha256:crypto.createHash('sha256').update(data).digest('hex'),bytes:data.length};
try{
 assert.equal(M.referenceFile(temp,entry),file);
 assert.throws(()=>M.referenceFile(temp,{...entry,path:'references/../../outside.png'}),/escapes|Invalid/);
 assert.throws(()=>M.referenceFile(temp,{...entry,path:'C:/outside.png'}),/Invalid/);
 assert.throws(()=>M.referenceFile(temp,{...entry,sha256:'0'.repeat(64)}),/mismatch/);
 assert.throws(()=>M.referenceFile(temp,{...entry,path:'references/missing.png'}),/Missing/);
 assert.throws(()=>M.referenceFile(temp,{...entry,bytes:entry.bytes+1}),/mismatch/);
 const text=Buffer.from('{"source":"example"}\n'),sourceFile=path.join(refs,'source.json'),textEntry={path:'references/source.json',normalization:'utf8-lf',bytes:text.length,sha256:crypto.createHash('sha256').update(text).digest('hex')};
 fs.writeFileSync(sourceFile,text.toString().replace(/\n/g,'\r\n'));M.referenceFile(temp,textEntry);fs.writeFileSync(sourceFile,text);M.referenceFile(temp,textEntry);fs.unlinkSync(sourceFile);
 assert.throws(()=>M.referenceFile(temp,{...entry,normalization:'unknown'}),/Unknown/);
}finally{fs.unlinkSync(file);fs.rmdirSync(refs);fs.rmdirSync(temp);}
assert.throws(()=>require('../scripts/import-model-reference.cjs').importReference('../outside',file),/Invalid/);
const importer=require('../scripts/import-model-reference.cjs').importReference,temporary=fs.mkdtempSync(path.join(os.tmpdir(),'furnish-reference-import-')),productDir=path.join(temporary,'assets/models/test-product');
fs.mkdirSync(productDir,{recursive:true});const manifest=path.join(productDir,'asset.json'),source=path.join(temporary,'sample.png');
fs.writeFileSync(manifest,JSON.stringify({format:1,id:'test-product',references:[]}));fs.writeFileSync(source,Buffer.from('first image content'));
try{
 const first=importer('test-product',source,'user',temporary),before=fs.readFileSync(manifest);assert(first.imported);assert(!importer('test-product',source,'user',temporary).imported);assert(before.equals(fs.readFileSync(manifest)));
 fs.writeFileSync(source,Buffer.from('second image content'));const second=importer('test-product',source,'user',temporary);assert(second.imported);assert.notEqual(first.path,second.path);
 assert.equal(fs.readFileSync(path.join(productDir,first.path),'utf8'),'first image content');assert.equal(JSON.parse(fs.readFileSync(manifest)).references.length,2);
 assert.throws(()=>importer('test-product',source,'unknown',temporary),/Invalid/);
 for(const p of [first.path,second.path])fs.unlinkSync(path.join(productDir,p));
}finally{fs.unlinkSync(manifest);fs.unlinkSync(source);for(const p of ['references/user','references','', '..','../..','../../..'])fs.rmdirSync(path.resolve(productDir,p));}
assert.deepEqual(I.outputs(),I.outputs());I.main('--check');
console.log('PASS original 39 dossiers plus window lining, '+index.counts.referenceImages+' input hashes, '+index.models.length+' model source identities, dynamic counts, missing records, portable paths, deterministic navigation and rejection cases');
