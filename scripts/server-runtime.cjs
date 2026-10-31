/* Backend source fingerprint, including lazy CommonJS dependencies. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
function sources(entry){
 const base=path.dirname(entry),sources=new Map();
 function visit(file){
  file=require.resolve(file);if(sources.has(file))return;
  const bytes=fs.readFileSync(file);sources.set(file,bytes);
  if(path.extname(file)!=='.js'&&path.extname(file)!=='.cjs')return;
  for(const match of bytes.toString('utf8').matchAll(/\brequire\(\s*['"](\.[^'"]+)['"]\s*\)/g))visit(path.resolve(path.dirname(file),match[1]));
 }
 visit(entry);
 // Production models are loaded lazily by type, so literal require() traversal
 // alone misses a changed mesh/asset until that model is first requested.
 const scan=dir=>{if(!fs.existsSync(dir))return;for(const e of fs.readdirSync(dir,{withFileTypes:true})){const f=path.join(dir,e.name);if(e.isDirectory())scan(f);else if(/\.(?:c?js)$/.test(e.name))visit(f);}};
 for(const name of ['core','data','render'])scan(path.resolve(base,'../src',name));
 return sources;
}
function fingerprint(entry,files=sources(entry)){
 const base=path.dirname(entry);
 const hash=crypto.createHash('sha256');
 for(const [file,bytes] of [...files].sort(([a],[b])=>a.localeCompare(b)))hash.update(path.relative(base,file)).update('\0').update(bytes).update('\0');
 return hash.digest('hex');
}
function watch(entry){
 let files,stamp,hash;
 const signature=()=>{const paths=new Set(files?.keys()||[]),base=path.dirname(entry);const scan=dir=>{if(!fs.existsSync(dir))return;for(const e of fs.readdirSync(dir,{withFileTypes:true})){const f=path.join(dir,e.name);if(e.isDirectory())scan(f);else if(/\.(?:c?js)$/.test(e.name))paths.add(f);}};for(const name of ['core','data','render'])scan(path.resolve(base,'../src',name));return [...paths].sort().map(f=>{try{const s=fs.statSync(f);return [f,s.size,s.mtimeMs,s.ctimeMs,s.ino];}catch{return [f,null];}});};
 return ()=>{const next=JSON.stringify(signature());if(!files||next!==stamp){files=sources(entry);hash=fingerprint(entry,files);stamp=JSON.stringify(signature());}return hash;};
}
function validate(entry){for(const [file,bytes]of sources(entry))if(/\.(?:c?js)$/.test(file)){
 const code=bytes.toString('utf8').replace(/^#![^\n]*/, '');
 try{new (require('node:vm').Script)(require('node:module').wrap(code),{filename:file});continue;}catch{/* It can be a valid ES module, including import.meta or top-level await. */}
 {
  // Browser production previews can be ES modules; checking them as CommonJS
  // would incorrectly block a valid backend update. This parses without loading.
  const r=require('node:child_process').spawnSync(process.execPath,['--input-type=module','--check'],{input:code,encoding:'utf8',env:{...process.env,ELECTRON_RUN_AS_NODE:'1'},maxBuffer:64000,windowsHide:true});
  if(r.error||r.status!==0)throw Error(file+': '+(r.error?.message||r.stderr));
 }
}}
const ownerFile=(root,owner)=>path.join(root,'.local','server-runtime','stopped-'+owner+'.json');
const validOwner=owner=>typeof owner==='string'&&/^[a-f0-9-]{36}$/.test(owner);
function ownerStopped(root,owner){return validOwner(owner)&&fs.existsSync(ownerFile(root,owner));}
function stopOwner(root,owner){if(!validOwner(owner))throw Error('Invalid backend owner');const file=ownerFile(root,owner);fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,JSON.stringify({owner,stoppedAt:Date.now()}));}
function request(url,{method='GET',token,timeoutMs=2500}={}){return new Promise(resolve=>{
 let settled=false;
 const done=value=>{if(!settled){settled=true;clearTimeout(timer);resolve(value);}};
 const req=require('node:http').request(url,{method,headers:token?{'X-Furnish-Restart':token}:{}},res=>{
  if(res.statusCode!==200){res.destroy();done(null);return;}
  let size=0,chunks=[];
  res.on('data',chunk=>{size+=chunk.length;if(size>256*1024){res.destroy();done(null);}else chunks.push(chunk);});
  res.on('error',()=>done(null));
  res.on('end',()=>{try{done(JSON.parse(Buffer.concat(chunks).toString('utf8')));}catch{done(null);}});
 });
 const timer=setTimeout(()=>{done(null);req.destroy();},timeoutMs);
 req.on('error',()=>done(null));req.end();
});}
module.exports={fingerprint,watch,validate,ownerStopped,stopOwner,request};
