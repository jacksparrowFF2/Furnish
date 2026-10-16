'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os'),vm=require('node:vm'),{spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'..'),temporaryParent=fs.realpathSync(os.tmpdir());
const temporary=fs.mkdtempSync(path.join(temporaryParent,'furnish-preview-checkout-'));
function run(script){const result=spawnSync(process.execPath,[path.join(temporary,'scripts',script)],{cwd:temporary,encoding:'utf8'});if(result.error)throw result.error;assert.equal(result.status,0,result.stderr||result.stdout);}
try{
 // Copy maintained inputs only. Existing ignored previews must not hide dependencies.
 for(const name of ['scripts','src','styles','assets','templates'])fs.cpSync(path.join(root,name),path.join(temporary,name),{recursive:true});
 fs.copyFileSync(path.join(root,'index.html'),path.join(temporary,'index.html'));
 assert.equal(fs.existsSync(path.join(temporary,'output')),false);
 // This generator used to require an already-generated sibling viewer.
 run('preview-entry-console.cjs');
 assert.ok(fs.existsSync(path.join(temporary,'output/entry-pegboard/preview.html')));
 run('generate-previews.cjs');
 const expected=['aquarium/preview.html','dishwasher/preview.html','entry-console/preview.html','entry-pegboard/preview.html','folding-table/preview.html','fotile/hob.html','fotile/hood.html','fotile/preview.html','fridges/preview.html','laundry-stack/preview.html','plan-height-order/preview.html','robot-p20max/preview.html','shower-arrow/preview.html','sideboard/preview.html','sink/preview.html','telescopic/preview.html','tv-floor/preview.html','waterheater-flat-preview.html','yeswood-sofa/preview.html'];
 for(const name of expected){
  const file=path.join(temporary,'output',name),html=fs.readFileSync(file,'utf8'),classic=[];
  assert.ok(!html.includes('<!-- FURNISH_IMPORT_MAP -->'),name+' contains an unexpanded template');
  for(const [,attrs,source] of html.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/g)){
   if(/importmap/.test(attrs)){const map=JSON.parse(source);assert.ok(map.imports.three.startsWith('data:'),name+' lost its offline engine');continue;}
   const src=attrs.match(/\bsrc="([^"]+)"/);
   if(src){const target=path.resolve(path.dirname(file),src[1]);assert.ok(fs.existsSync(target),name+' missing '+src[1]);if(!/type="module"/.test(attrs))classic.push(fs.readFileSync(target,'utf8'));}
   else if(/type="module"/.test(attrs)){const result=spawnSync(process.execPath,['--input-type=module','--check'],{input:source,encoding:'utf8'});assert.equal(result.status,0,name+': '+result.stderr);}
   else classic.push(source);
  }
  new vm.Script(classic.join('\n;\n'),{filename:name});
  for(const [,link] of html.matchAll(/\bhref="([^"]+)"/g)){if(/^(?:https?:|data:|#)/.test(link))continue;assert.ok(fs.existsSync(path.resolve(path.dirname(file),link)),name+' has a broken local link: '+link);}
 }
 // Migrated viewers must also generate when index contains only the engine map.
 // Deliberately remove every furniture source marker and constructor.
 const engine=fs.readFileSync(path.join(temporary,'index.html'),'utf8').match(/<script type="importmap">[\s\S]*?<\/script>/)[0];
 fs.writeFileSync(path.join(temporary,'index.html'),'<!doctype html>'+engine);
 run('preview-fridges.cjs');run('preview-waterheater-flat.cjs');
 for(const name of ['fridges/preview.html','waterheater-flat-preview.html']){
  const source=fs.readFileSync(path.join(temporary,'output',name),'utf8');
  assert.ok(source.includes('appliance-model.js'),name+' missing production module');
  assert.ok(!source.includes('function buildFurniture(')&&!source.includes('FURNISH_MODEL'),name+' still contains copied application code');
 }
 console.log('PASS clean-checkout generation of 19 previews, independent appliance viewers without index model code, standalone dependency recovery, offline engines, script syntax and local links');
}finally{
 // Only delete the unique test checkout under the resolved system temp directory.
 assert.ok(path.resolve(temporary).startsWith(temporaryParent+path.sep));
 assert.ok(path.basename(temporary).startsWith('furnish-preview-checkout-'));
 fs.rmSync(temporary,{recursive:true,force:true});
}
