/* One local scene channel. Blender reads immutable revisions using a per-service token. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const MAX=256*1024*1024;
function zipAddon(source){
 const name=Buffer.from('furnish_sync/__init__.py'),data=Buffer.from(source);let crc=0xffffffff;
 for(const b of data){crc^=b;for(let i=0;i<8;i++)crc=(crc>>>1)^((crc&1)?0xedb88320:0);}crc=(crc^0xffffffff)>>>0;
 const local=Buffer.alloc(30);local.writeUInt32LE(0x04034b50);local.writeUInt16LE(20,4);local.writeUInt32LE(crc,14);local.writeUInt32LE(data.length,18);local.writeUInt32LE(data.length,22);local.writeUInt16LE(name.length,26);
 const central=Buffer.alloc(46);central.writeUInt32LE(0x02014b50);central.writeUInt16LE(20,4);central.writeUInt16LE(20,6);central.writeUInt32LE(crc,16);central.writeUInt32LE(data.length,20);central.writeUInt32LE(data.length,24);central.writeUInt16LE(name.length,28);
 const end=Buffer.alloc(22);end.writeUInt32LE(0x06054b50);end.writeUInt16LE(1,8);end.writeUInt16LE(1,10);end.writeUInt32LE(central.length+name.length,12);end.writeUInt32LE(local.length+name.length+data.length,16);
 return Buffer.concat([local,name,data,central,name,end]);
}
function create(root,{validateGLB}){
 const directory=path.join(root,'.local','blender-sync'),token=crypto.randomBytes(24).toString('hex');let latest=null,ack=null,publishing=false;
 try{const saved=JSON.parse(fs.readFileSync(path.join(directory,'latest.json'),'utf8'));if(/^[a-f0-9]{64}$/.test(saved.revision))latest=saved;}catch{/* First run. */}
 function safeDirectory(){fs.mkdirSync(directory,{recursive:true});if(!fs.realpathSync(directory).startsWith(fs.realpathSync(root)+path.sep))throw Error('同步目录不能指向项目以外');}
 function publish(buffer){
  if(publishing)throw Object.assign(Error('正在发布另一场景，请稍后重试'),{status:409});publishing=true;
  try{
   if(buffer.length>MAX)throw Object.assign(Error('场景上限 256 MB'),{status:413});const scene=validateGLB(buffer),meta=scene.scenes?.[0]?.extras?.furnish;
   if(meta?.syncSchema!==1||meta.unit!=='m'||!/^[-\w.]{1,128}$/.test(meta.planId)||!Array.isArray(meta.originMm)||meta.originMm.length!==2||!meta.originMm.every(v=>Number.isFinite(v)&&Math.abs(v)<1e9))throw Error('场景缺少有效的同步标识／坐标基准');
   if(meta.partIdentity!==undefined&&![2,3].includes(meta.partIdentity))throw Error('不支持的部件身份版本');
   const parts=new Set(),ids=new Set();for(const node of scene.nodes||[])if(node.mesh!==undefined){const id=node.extras?.furnishObjectId;if(typeof id!=='string'||!id||id.length>512||ids.has(id)||node.extensions?.EXT_mesh_gpu_instancing)throw Error('同步实体标识重复／缺失，或实例尚未展开');ids.add(id);if(node.extras?.furnishPartVersion>=2&&node.extras.furnishPartVersion!==meta.partIdentity)throw Error('部件身份与传输版本不一致');if(meta.partIdentity>=2){const e=node.extras,key=JSON.stringify([e.furnishId||e.layerObject||'',e.furnishPartKey]);if(e.furnishPartVersion!==meta.partIdentity||typeof e.furnishPartKey!=='string'||!e.furnishPartKey||e.furnishPartKey.length>4096||!Number.isSafeInteger(e.furnishPartCount)||e.furnishPartCount<1||e.furnishPartCount>1000000||e.furnishPartAmbiguous||parts.has(key))throw Error('新版生产部件身份缺失／重复或数量无效');if(e.furnishPreviousPartKey!==undefined&&(meta.partIdentity!==3||typeof e.furnishPreviousPartKey!=='string'||!e.furnishPreviousPartKey||e.furnishPreviousPartKey.length>4096||!Number.isSafeInteger(e.furnishPreviousPartCount)||e.furnishPreviousPartCount<1||e.furnishPreviousPartCount>1000000))throw Error('旧部件升级别名无效');parts.add(key);}}
   if(!ids.size)throw Error('没有可同步的实体');
   const revision=crypto.createHash('sha256').update(buffer).digest('hex');if(latest?.revision===revision)return latest;
   safeDirectory();const file=path.join(directory,revision+'.glb');if(!fs.existsSync(file))fs.writeFileSync(file,buffer,{flag:'wx'});
   const next={protocol:meta.partIdentity||1,revision,planId:meta.planId,plan:meta.plan||meta.planId,originMm:meta.originMm,bytes:buffer.length,objects:ids.size,created:new Date().toISOString()};
   const temp=path.join(directory,'latest-'+crypto.randomUUID()+'.tmp');fs.writeFileSync(temp,JSON.stringify(next));fs.renameSync(temp,path.join(directory,'latest.json'));latest=next;ack=null;return next;
  }finally{publishing=false;}
 }
 async function body(req,max=MAX){let size=0;const chunks=[];for await(const b of req){size+=b.length;if(size>max)throw Object.assign(Error('同步请求过大'),{status:413});chunks.push(b);}return Buffer.concat(chunks);}
 async function handle(req,res){
  const route=new URL(req.url,'http://localhost').pathname;if(!route.startsWith('/api/furnish/blender/sync/'))return false;
  const reply=(code,value)=>{res.writeHead(code,{'Content-Type':'application/json;charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(value));};
  try{
   if(route.endsWith('/status')&&req.method==='GET'){reply(200,{protocol:1,token,latest,ack});return true;}
   if(route.endsWith('/addon.zip')&&req.method==='GET'){const zip=zipAddon(fs.readFileSync(path.join(root,'scripts/blender-sync-addon.py')));res.writeHead(200,{'Content-Type':'application/zip','Content-Length':zip.length,'Content-Disposition':'attachment; filename="furnish-sync.zip"','Cache-Control':'no-store'});res.end(zip);return true;}
   if(route.endsWith('/publish')&&req.method==='POST'){
    if(req.headers['x-furnish-request']!=='blender-v1'||req.headers['content-type']!=='model/gltf-binary')throw Object.assign(Error('无效的场景发布请求'),{status:403});reply(200,publish(await body(req)));return true;
   }
   if(req.headers['x-furnish-sync']!==token)throw Object.assign(Error('同步连接密钥无效，请在 Furnish 复制最新密钥'),{status:403});
   if(route.endsWith('/manifest')&&req.method==='GET'){reply(200,{protocol:1,latest});return true;}
   if(route.endsWith('/ack')&&req.method==='POST'){
    if(req.headers['content-type']!=='application/json')throw Error('需要 JSON 状态');const value=JSON.parse((await body(req,4096)).toString('utf8'));
    if(value.revision!==latest?.revision||!['applied','failed'].includes(value.state))throw Error('过期或无效的接收状态');ack={revision:value.revision,state:value.state,message:String(value.message||'').slice(0,1000),received:new Date().toISOString()};reply(200,{ok:true});return true;
   }
   const match=route.match(/\/scene\/([a-f0-9]{64})$/);if(match&&req.method==='GET'){
    const file=path.join(directory,match[1]+'.glb');if(!fs.existsSync(file)){reply(404,{error:'同步版本不存在'});return true;}res.writeHead(200,{'Content-Type':'model/gltf-binary','Content-Length':fs.statSync(file).size,'Cache-Control':'no-store'});fs.createReadStream(file).on('error',()=>res.destroy()).pipe(res);return true;
   }
   reply(404,{error:'同步接口不存在'});
  }catch(e){reply(e.status||400,{error:e.message});}return true;
 }
 return {handle,publish,status:()=>({latest,ack,token})};
}
module.exports={create,zipAddon};
