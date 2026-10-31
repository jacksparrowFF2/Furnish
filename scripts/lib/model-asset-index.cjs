/* Portable asset metadata derived from production rules and the verification inventory. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'../..'),P=require('../../src/core/product-rules.js'),C=require('../../src/data/catalog.js');
const docs={
 'chair-s05118':'CHAIR-YESWOOD-S05118.md','sofa-bed':'SOFA-BED-YESWOOD-Y107H03.md',se2:'BATH-HEATER-AOPU-SE2.md',y52y09:'BOOKCASE-YESWOOD-Y52Y09.md',fridge:'FRIDGE-BLENDER-MOTION.md',dishwasher:'DISHWASHER-BLENDER-FOLD.md',hood:'HOOD-BLENDER-MOTION.md',washer:'WASHER-BLENDER-MOTION.md','washer-tg10k60w':'WASHER-LITTLESWAN-TG10K60W.md','side-table':'SIDE-TABLE-TMALL-635382906309.md',armchair:'ARMCHAIR-YESWOOD-TMALL-1013742104698.md','armchair-berlin':'ARMCHAIR-YESWOOD-BERLIN.md','stack-stool':'STACK-STOOL-CITYLONG-370.md','corner-bookcase':'CORNER-BOOKCASE-YESWOOD-Y00Y06.md','corner-bookcase-580':'CORNER-BOOKCASE-YESWOOD-Y00Y06058.md'
};
const hash=f=>crypto.createHash('sha256').update(fs.readFileSync(path.join(root,f))).digest('hex');
const rel=f=>path.relative(root,f).split(path.sep).join('/');
function build(){
 const profiles=require('./model-profiles.cjs').profiles(),assets=profiles.filter(p=>p.asset),models=[];
 for(const p of assets){
  const runtime=require(path.join(root,p.asset.runtime));if(hash(p.asset.glb)!==runtime.sourceSha256)throw Error('Source mismatch: '+p.id);
  const current=new Set([p.asset.blend,p.asset.glb]),files=[];
  function walk(dir){for(const e of fs.readdirSync(dir,{withFileTypes:true})){const file=path.join(dir,e.name);if(e.isDirectory())walk(file);else if(/\.(blend|glb)$/i.test(e.name)){const filePath=rel(file);files.push({path:filePath,role:current.has(filePath)?'published-source':e.name==='material-studio.blend'?'material-studio':'retained-other',sha256:hash(filePath),bytes:fs.statSync(file).size});}}}
  walk(path.join(root,'assets/models',p.id));
  const modelModule=P.definition(p.fixture)?.solidModel?.module,constructor=modelModule?'src/render/'+modelModule+'-model.js':null;
  const author='scripts/blender-model-'+(p.id.startsWith('washer')?'washer':p.id==='corner-bookcase-580'?'corner-bookcase':p.id)+'.py';
  models.push({profile:p.id,type:p.type,name:p.fixture.name,sizeMm:[p.fixture.w,p.fixture.d,p.fixture.h],parts:p.asset.parts,runtimeVersion:runtime.version,runtime:{path:p.asset.runtime,sha256:hash(p.asset.runtime)},sourceSha256:runtime.sourceSha256,current:{blend:p.asset.blend,glb:p.asset.glb},document:'docs/'+docs[p.id],constructor:constructor&&fs.existsSync(path.join(root,constructor))?constructor:null,author:fs.existsSync(path.join(root,author))?author:null,files:files.sort((a,b)=>a.path.localeCompare(b.path))});
 }
 const catalog=C.library.flatMap(c=>c.items.map(i=>({category:c.cat,type:i[0],name:i[1],w:i[2],d:i[3],h:i[6]??P.height({type:i[0]}),module:P.definition(i[0])?.solidModel?.module||'index-inline'})));
 const parametric=profiles.filter(p=>!p.asset).map(p=>({id:p.id,type:p.type,name:p.fixture.name,module:P.definition(p.fixture)?.solidModel?.module||'index-inline'}));
 for(const m of models)for(const file of [m.current.blend,m.current.glb,m.runtime.path,m.document,m.constructor,m.author].filter(Boolean))if(!fs.existsSync(path.join(root,file)))throw Error('Missing asset dependency: '+file);
 return {format:1,description:'Generated repository index; paths relative to repository root. This is metadata, not the application loading manifest.',counts:{blenderModels:models.length,parametricVerificationConfigurations:parametric.length,verificationConfigurations:profiles.length,catalogEntries:catalog.length,catalogTypes:new Set(catalog.map(i=>i.type)).size},models,parametric,catalog};
}
module.exports={build,docs};
