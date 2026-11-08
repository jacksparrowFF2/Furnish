/* Portable asset metadata derived from production rules and the verification inventory. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'../..'),P=require('../../src/core/product-rules.js'),C=require('../../src/data/catalog.js');
const docs={'pet-bowl':'PET-SUPPLIES.md','litter-bag':'PET-SUPPLIES.md',
 'cat-tower':'CAT-TOWER-JD-10141711472484.md',
 'fan-x231':'FAN-AIRMATE-FA18-X231.md',
 'chair-vihals':'CHAIR-IKEA-VIHALS.md',
 'chair-s05118':'CHAIR-YESWOOD-S05118.md','sofa-bed':'SOFA-BED-YESWOOD-Y107H03.md',se2:'BATH-HEATER-AOPU-SE2.md',y52y09:'BOOKCASE-YESWOOD-Y52Y09.md',fridge:'FRIDGE-BLENDER-MOTION.md',dishwasher:'DISHWASHER-BLENDER-FOLD.md',hood:'HOOD-BLENDER-MOTION.md',washer:'WASHER-BLENDER-MOTION.md','washer-tg10k60w':'WASHER-LITTLESWAN-TG10K60W.md','side-table':'SIDE-TABLE-TMALL-635382906309.md',armchair:'ARMCHAIR-YESWOOD-TMALL-1013742104698.md','armchair-berlin':'ARMCHAIR-YESWOOD-BERLIN.md','stack-stool':'STACK-STOOL-CITYLONG-370.md','corner-bookcase':'CORNER-BOOKCASE-YESWOOD-Y00Y06.md','corner-bookcase-580':'CORNER-BOOKCASE-YESWOOD-Y00Y06058.md'
};
const supplies=require('./storage-supply-specs.json');for(const id of Object.keys(supplies))docs[id]='STORAGE-CABINET-2400.md';
const garments=require('./garment-photo-specs.json');for(const id of Object.keys(garments))docs[id]='GARMENT-PHOTO-CARDS.md';
docs['storage-bin-shallow-large']='STORAGE-BINS-LANJIAOLUO.md';
docs['storage-bin-deep-medium']='STORAGE-BINS-LANJIAOLUO.md';
docs['storage-bin-deep-large']='STORAGE-BINS-LANJIAOLUO.md';
docs['storage-bin-deeper-medium']='STORAGE-BINS-LANJIAOLUO.md';
docs['storage-bin-deeper-large']='STORAGE-BINS-LANJIAOLUO.md';
docs['storage-bin-ultradeep-medium']='STORAGE-BINS-LANJIAOLUO.md';
docs['storage-bin-ultradeep-large']='STORAGE-BINS-LANJIAOLUO.md';
docs['toolbox-jiabangshou-390']='TOOLBOX-JIABANGSHOU-390.md';
docs['cat-food-2kg']='CAT-FOOD-2KG.md';
docs['beverage-can-330']=docs['beverage-can-500']='BEVERAGE-CANS.md';
const hash=f=>crypto.createHash('sha256').update(fs.readFileSync(path.join(root,f))).digest('hex');
const textHash=f=>crypto.createHash('sha256').update(fs.readFileSync(path.join(root,f),'utf8').replace(/\r\n/g,'\n')).digest('hex');
const rel=f=>path.relative(root,f).split(path.sep).join('/');
function referenceFile(directory,entry){
 if(typeof entry.path!=='string'||!entry.path.startsWith('references/')||entry.path.includes('\\')||entry.path.split('/').some(p=>!p||p==='.'||p==='..'))throw Error('Invalid reference path');
 const file=path.resolve(directory,entry.path),boundary=path.resolve(directory)+path.sep;
 if(!file.startsWith(boundary))throw Error('Reference escapes product directory');
 if(!/^[a-f0-9]{64}$/.test(entry.sha256)||!fs.existsSync(file)||!fs.statSync(file).isFile())throw Error('Missing or invalid reference: '+entry.path);
 if(entry.normalization!==undefined&&entry.normalization!=='utf8-lf')throw Error('Unknown reference normalization');
 const raw=fs.readFileSync(file),data=entry.normalization==='utf8-lf'?Buffer.from(raw.toString('utf8').replace(/\r\n/g,'\n')):raw;
 if(data.length!==entry.bytes||crypto.createHash('sha256').update(data).digest('hex')!==entry.sha256)throw Error('Reference hash mismatch: '+entry.path);
 return file;
}
function dossiers(){
 const products=[];
 for(const entry of fs.readdirSync(path.join(root,'assets/models'),{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name))){
  if(!entry.isDirectory())continue;
  const directory=path.join(root,'assets/models',entry.name),file=path.join(directory,'asset.json');if(!fs.existsSync(file))continue;
  const product=JSON.parse(fs.readFileSync(file,'utf8'));
  if(product.format!==1||product.id!==entry.name||!Array.isArray(product.references)||!Array.isArray(product.types)||!Array.isArray(product.missingReferences))throw Error('Invalid product dossier: '+entry.name);
  const paths=new Set();for(const r of [...product.references,...(product.supportingFiles||[])]){referenceFile(directory,r);if(paths.has(r.path))throw Error('Duplicate reference: '+r.path);paths.add(r.path);}
  for(const f of [product.document,...(product.validation||[])].filter(Boolean)){
   if(path.isAbsolute(f)||f.includes('\\')||f.split('/').includes('..')||!fs.existsSync(path.join(root,f)))throw Error('Invalid dossier link: '+f);
  }
  function inspect(dir){if(!fs.existsSync(dir))return;for(const e of fs.readdirSync(dir,{withFileTypes:true})){const f=path.join(dir,e.name);if(e.isDirectory())inspect(f);else if(/\.(?:png|jpe?g|webp|avif)$/i.test(e.name)&&!paths.has(path.relative(directory,f).split(path.sep).join('/')))throw Error('Unlisted reference image: '+f);}}
  inspect(path.join(directory,'references'));
  products.push({...product,manifest:rel(file),readme:rel(path.join(directory,'README.md'))});
 }
 return products;
}
function build(){
 const profiles=require('./model-profiles.cjs').profiles(),assets=profiles.filter(p=>p.asset),models=[];
 for(const p of assets){
  const runtime=require(path.join(root,p.asset.runtime));if(hash(p.asset.glb)!==runtime.sourceSha256)throw Error('Source mismatch: '+p.id);
  const current=new Set([p.asset.blend,p.asset.glb]),files=[];
  function walk(dir){for(const e of fs.readdirSync(dir,{withFileTypes:true})){const file=path.join(dir,e.name);if(e.isDirectory())walk(file);else if(/\.(blend|glb)$/i.test(e.name)){const filePath=rel(file);files.push({path:filePath,role:current.has(filePath)?'published-source':e.name==='material-studio.blend'?'material-studio':'retained-other',sha256:hash(filePath),bytes:fs.statSync(file).size});}}}
  walk(supplies[p.id]?path.dirname(path.dirname(path.join(root,p.asset.glb))):path.join(root,'assets/models',p.id));
  const modelModule=P.definition(p.fixture)?.solidModel?.module,constructor=modelModule?'src/render/'+modelModule+'-model.js':null;
  const author=garments[p.id]?'scripts/blender-model-garment-photos.py':['beverage-can-330','beverage-can-500'].includes(p.id)?'scripts/blender-model-beverage-can-printed.py':p.id==='cat-food-2kg'?'scripts/blender-model-cat-food-2kg.py':supplies[p.id]?'scripts/blender-model-storage-supply.py':['pet-bowl','litter-bag'].includes(p.id)?'scripts/blender-model-pet-supplies.py':'scripts/blender-model-'+(p.id.startsWith('washer')?'washer':p.id==='corner-bookcase-580'?'corner-bookcase':p.id)+'.py';
  models.push({profile:p.id,type:p.type,name:p.fixture.name,sizeMm:[p.fixture.w,p.fixture.d,p.fixture.h],parts:p.asset.parts,runtimeVersion:runtime.version,runtime:{path:p.asset.runtime,sha256:textHash(p.asset.runtime),normalization:'utf8-lf'},sourceSha256:runtime.sourceSha256,current:{blend:p.asset.blend,glb:p.asset.glb},document:'docs/'+docs[p.id],constructor:constructor&&fs.existsSync(path.join(root,constructor))?constructor:null,author:fs.existsSync(path.join(root,author))?author:null,files:files.sort((a,b)=>a.path.localeCompare(b.path))});
 }
 const catalog=C.library.flatMap(c=>c.items.map(i=>({category:c.cat,type:i[0],name:i[1],w:i[2],d:i[3],h:i[6]??P.height({type:i[0]}),module:P.definition(i[0])?.solidModel?.module||'index-inline'})));
 const parametric=profiles.filter(p=>!p.asset).map(p=>({id:p.id,type:p.type,name:p.fixture.name,module:P.definition(p.fixture)?.solidModel?.module||'index-inline'}));
 for(const m of models)for(const file of [m.current.blend,m.current.glb,m.runtime.path,m.document,m.constructor,m.author].filter(Boolean))if(!fs.existsSync(path.join(root,file)))throw Error('Missing asset dependency: '+file);
 const products=dossiers();for(const m of models){const product=products.find(p=>p.id===m.profile);if(!product)throw Error('Missing product dossier: '+m.profile);m.dossier=product.manifest;m.references=product.references.map(r=>'assets/models/'+m.profile+'/'+r.path);}
 return {format:2,description:'Generated repository index; paths relative to repository root. This is metadata, not the application loading manifest.',counts:{blenderModels:models.length,parametricVerificationConfigurations:parametric.length,verificationConfigurations:profiles.length,catalogEntries:catalog.length,catalogTypes:new Set(catalog.map(i=>i.type)).size,productDossiers:products.length,referenceImages:products.reduce((n,p)=>n+p.references.length,0),missingReferences:products.reduce((n,p)=>n+p.missingReferences.length,0)},models,products,parametric,catalog};
}
module.exports={build,docs,dossiers,referenceFile};
