/* Build the pinned, host-independent upstream runtime using Node's built-in TS transform. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),crypto=require('node:crypto');
const plugin=path.resolve(__dirname,'..');
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
function files(root){return fs.readdirSync(root,{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name)).flatMap(e=>e.isDirectory()?files(path.join(root,e.name)):[path.join(root,e.name)]);}
function dataDirectory(env=process.env){
 const repo=path.resolve(plugin,'../..');
 return path.resolve(env.FURNISH_BLENDER_DATA||env.PLUGIN_DATA||(fs.existsSync(path.join(repo,'scripts/blender-server.cjs'))?path.join(repo,'.local/codex-blender'):path.join(os.tmpdir(),'furnish-codex-blender')));
}
function prepare(data=dataDirectory()){
 const [major,minor]=process.versions.node.split('.').map(Number);
 if(major<24||major===24&&minor<9)throw Error('Furnish × Blender needs Node.js >=24.9 (built-in TypeScript transform).');
 const upstream=path.join(plugin,'vendor/dsh'),manifest=JSON.parse(fs.readFileSync(path.join(upstream,'UPSTREAM.json'),'utf8'));
 for(const [name,digest] of Object.entries(manifest.files))if(hash(fs.readFileSync(path.join(upstream,name)))!==digest)throw Error('Pinned upstream source changed: '+name+'; review and update UPSTREAM.json explicitly.');
 const fingerprint=hash(Buffer.from(JSON.stringify(manifest)+process.versions.node));
 const engine=path.join(data,'engine-'+fingerprint.slice(0,16));
 if(!fs.existsSync(path.join(engine,'.ready'))){
  const staging=engine+'.'+process.pid+'.'+crypto.randomUUID();fs.mkdirSync(staging,{recursive:true});
  fs.writeFileSync(path.join(staging,'package.json'),JSON.stringify({type:'module',name:'furnish-blender-engine',version:'1.0.0'}));
  const {stripTypeScriptTypes}=require('node:module');
  for(const folder of ['runtime','config'])for(const file of files(path.join(upstream,folder))){
   const relative=path.relative(upstream,file),dest=path.join(staging,relative.replace(/\.ts$/,'.js'));
   if(file.endsWith('.d.ts'))continue;
   fs.mkdirSync(path.dirname(dest),{recursive:true});
   if(file.endsWith('.ts'))fs.writeFileSync(dest,stripTypeScriptTypes(fs.readFileSync(file,'utf8'),{mode:'transform',sourceUrl:file}));else fs.copyFileSync(file,dest);
  }
  fs.writeFileSync(path.join(staging,'.ready'),fingerprint);
  try{fs.renameSync(staging,engine);}catch(e){if(!fs.existsSync(path.join(engine,'.ready')))throw e;/* Another MCP client completed the same immutable build. */}
 }
 return {engine,fingerprint,manifest,data};
}
function token(data){fs.mkdirSync(data,{recursive:true});const f=path.join(data,'gateway.key');try{fs.writeFileSync(f,crypto.randomBytes(32).toString('hex'),{flag:'wx',mode:0o600});}catch(e){if(e.code!=='EEXIST')throw e;}const t=fs.readFileSync(f,'utf8');if(!/^[a-f0-9]{64}$/.test(t))throw Error('Invalid local Gateway key');return t;}
function gatewayFingerprint(built){return hash(Buffer.concat([Buffer.from(built.fingerprint),fs.readFileSync(path.join(__dirname,'gateway.cjs')),fs.readFileSync(path.join(__dirname,'gui.cjs'))]));}
module.exports={plugin,hash,files,dataDirectory,prepare,token,gatewayFingerprint};
