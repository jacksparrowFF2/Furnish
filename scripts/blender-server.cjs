/* Loopback-only, fixed-script Blender jobs. Never accepts executable paths or Python from HTTP. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),cp=require('node:child_process');
const LIMIT=256*1024*1024;
const refinedProjects=require('./blender-project.cjs');
function candidates(env=process.env,platform=process.platform){
 const list=[];if(env.FURNISH_BLENDER)list.push(env.FURNISH_BLENDER);
 if(platform==='win32'){
  const scoop=env.SCOOP||(env.USERPROFILE&&path.join(env.USERPROFILE,'scoop'));
  if(scoop)list.push(path.join(scoop,'apps/blender/current/blender.exe'));
 }
 if(platform==='win32'&&env.LOCALAPPDATA)list.push(path.join(env.LOCALAPPDATA,'Microsoft/WindowsApps/blender-launcher.exe'));
 for(const dir of (env.PATH||env.Path||'').split(path.delimiter).filter(Boolean))list.push(path.join(dir,platform==='win32'?'blender.exe':'blender'));
 if(platform==='win32')for(const base of [env.ProgramFiles&&path.join(env.ProgramFiles,'Blender Foundation'),env.LOCALAPPDATA&&path.join(env.LOCALAPPDATA,'Programs/Blender Foundation')].filter(Boolean)){
  try{for(const name of fs.readdirSync(base).sort((a,b)=>b.localeCompare(a,undefined,{numeric:true})))if(/^Blender/i.test(name))list.push(path.join(base,name,'blender.exe'));}catch{/* Optional installation directory. */}
 }
 return [...new Set(list)];
}
function findBlender(env=process.env){for(const file of candidates(env)){
 try{if(fs.statSync(file).isFile())return file;}catch{/* Store execution aliases cannot be followed with stat. */}
 try{if(process.platform==='win32'&&path.basename(file).toLowerCase()==='blender-launcher.exe'&&fs.lstatSync(file).isSymbolicLink())return file;}catch{/* Not installed. */}
 }return null;}
function validateGLB(buffer){
 if(buffer.length<20||buffer.readUInt32LE(0)!==0x46546c67||buffer.readUInt32LE(4)!==2||buffer.readUInt32LE(8)!==buffer.length)throw Error('无效的 GLB 场景');
 const length=buffer.readUInt32LE(12);if(buffer.readUInt32LE(16)!==0x4e4f534a||length%4||20+length>buffer.length)throw Error('无效的 GLB 数据块');
 const json=JSON.parse(buffer.subarray(20,20+length).toString('utf8'));
 if(json.asset?.version!=='2.0'||!Array.isArray(json.meshes)||!json.meshes.length||!json.cameras?.length)throw Error('场景需要实体和相机');
 // The worker may read only the uploaded file, never referenced paths or URLs.
 for(const row of [...(json.buffers||[]),...(json.images||[])])if(row.uri!==undefined&&!/^data:(?:image\/(?:png|jpeg)|application\/octet-stream);base64,[A-Za-z0-9+/=\r\n]*$/.test(row.uri))throw Error('场景必须内嵌所有纹理和几何');
 return json;
}
function create(root,{discover=findBlender,spawn=cp.spawn,kill=pid=>process.kill(pid),pollMs=700,startupMs=90000,timeoutMs=30*60*1000}={}){
 const sync=require('./blender-sync-server.cjs').create(root,{validateGLB});
 const jobs=new Map(),base=path.join(root,'.local','blender-renders'),script=path.join(root,'scripts','blender-render.py');let accepting=false;
 function publicJob(j){return {id:j.id,state:j.state,message:j.message,width:j.width,height:j.height,quality:j.quality,device:j.device,source:j.source,camera:j.camera,renderInfo:j.renderInfo||null,renderDevice:j.renderDevice||null,created:j.created,...(j.state==='done'?{image:`/api/furnish/blender/jobs/${j.id}/image`,blend:`/api/furnish/blender/jobs/${j.id}/blend`,scene:`/api/furnish/blender/jobs/${j.id}/scene`}:{})};}
 function finish(j,state,message){j.state=state;j.message=message;clearInterval(j.timer);j.timer=null;}
 function stop(j,state,message){
  // Store launcher may exit before Blender. The fixed worker reports its own PID.
  if(j.pid)try{kill(j.pid);}catch{/* Already exited. */}
  try{j.child?.kill();}catch{/* Already exited. */}
  finish(j,state,message);
 }
 function readProgress(j){try{const p=JSON.parse(fs.readFileSync(path.join(j.dir,'progress.json'),'utf8'));if(p.token!==j.id||!Number.isInteger(p.pid)||p.pid<=0)return null;return p;}catch{return null;}}
 function tick(j){
  const p=readProgress(j);if(p){j.pid=p.pid;j.renderDevice=p.renderDevice||null;j.renderInfo=p.renderInfo||null;
   if(p.state==='done'){if(!fs.existsSync(path.join(j.dir,'render.png'))||!fs.existsSync(path.join(j.dir,'scene.blend')))return finish(j,'failed','Blender 未生成完整结果');return finish(j,'done',String(p.message||'渲染完成').slice(0,500));}
   if(p.state==='failed')return finish(j,'failed',String(p.message).slice(-3000));
   if(p.state==='cancelled')return finish(j,'cancelled','已取消渲染');
   j.state=p.state==='rendering'?'rendering':'importing';j.message=String(p.message||(p.state==='rendering'?'正在使用 Cycles 渲染':'正在导入场景')).slice(0,500);
  }
  const elapsed=Date.now()-j.started;
  if(j.cancelRequested&&j.pid)return stop(j,'cancelled','已取消渲染');
  if(j.cancelRequested){j.state='cancelling';j.message='正在取消';}
  if(elapsed>timeoutMs)return stop(j,'failed','渲染超时（30 分钟），请降低画质后重试');
  if(!p&&elapsed>startupMs)return stop(j,'failed','Blender 未启动后台任务，请检查安装或 FURNISH_BLENDER 设置');
  if(j.exitCode!==undefined&&j.exitCode!==0)return stop(j,'failed','Blender 退出：'+j.exitCode+'\n'+j.log.slice(-1500));
 }
 async function start(buffer,{width,height,quality,device='auto',source='basic',camera='source'}){
  if(accepting||[...jobs.values()].some(j=>['starting','importing','rendering','cancelling'].includes(j.state)))throw Object.assign(Error('已有渲染任务，请等待完成或取消'),{status:409});
  accepting=true;
  try{
   const gltf=validateGLB(buffer),project=source==='refined'?refinedProjects.read(root):null;
   if(!['basic','refined'].includes(source)||!['source','active','living','dining','kitchen','bedroom'].includes(camera)||source==='basic'&&camera!=='source')throw Error('渲染来源或机位无效');
   if(source==='refined'&&(!project||gltf.scenes?.[0]?.extras?.furnish?.planId!==project.planId))throw Error('没有为当前户型绑定精修工程');
   if(source==='refined'&&(gltf.scenes?.[0]?.extras?.furnish?.syncSchema!==1||gltf.nodes.some(n=>n.extensions?.EXT_mesh_gpu_instancing)))throw Error('精修渲染需要带稳定标识且已展开实例的同步场景');
   if(!['auto','gpu','cpu'].includes(device)||!['preview','final'].includes(quality)||!Number.isInteger(width)||!Number.isInteger(height)||width<64||height<64||width>1920||height>1920||width*height>1920*1920)throw Error('渲染参数无效');
   const executable=discover();if(!executable)throw Object.assign(Error('未找到 Blender。请安装 Blender 4.2+，或设置 FURNISH_BLENDER 后重启本地服务。'),{status:503});
   fs.mkdirSync(base,{recursive:true});if(!fs.realpathSync(base).startsWith(fs.realpathSync(root)+path.sep))throw Error('渲染目录不能指向项目以外');
   const id=crypto.randomUUID(),dir=path.join(base,id);fs.mkdirSync(dir);fs.writeFileSync(path.join(dir,'scene.glb'),buffer,{flag:'wx'});
   if(project)fs.copyFileSync(project.file,path.join(dir,'template.blend'));
   const j={id,dir,quality,device,source,camera,width,height,created:new Date().toISOString(),started:Date.now(),state:'starting',message:source==='refined'?'正在加载精修工程副本':'正在启动 Blender',log:'',pid:null};jobs.set(id,j);
   // Keep bounded in-memory history; generated files remain for the user.
   for(const [key,old]of jobs)if(jobs.size>16&&!old.timer&&old!==j)jobs.delete(key);
   const args=['--background','--factory-startup','--disable-autoexec','--python-exit-code','1','--python',script,'--','--input',path.join(dir,'scene.glb'),'--output',path.join(dir,'render.png'),'--blend',path.join(dir,'scene.blend'),'--progress',path.join(dir,'progress.json'),'--token',id,'--width',String(width),'--height',String(height),'--samples',quality==='final'?'128':'32','--device',device];
   if(project)args.push('--template',path.join(dir,'template.blend'),'--camera',camera,'--quality',quality);
   try{
    j.child=spawn(executable,args,{cwd:root,windowsHide:true,shell:false,stdio:['ignore','pipe','pipe']});
    for(const stream of [j.child.stdout,j.child.stderr])stream?.on('data',b=>{j.log=(j.log+b.toString()).slice(-12000);});
    j.child.on('error',e=>finish(j,'failed','无法启动 Blender：'+e.message));
    j.child.on('close',code=>{j.exitCode=code;});
    j.timer=setInterval(()=>tick(j),pollMs);j.timer.unref?.();
   }catch(e){finish(j,'failed',e.message);}
   return publicJob(j);
  }finally{accepting=false;}
 }
 async function handle(req,res){
  const url=new URL(req.url,'http://localhost');if(!url.pathname.startsWith('/api/furnish/blender'))return false;
  const reply=(code,data)=>{res.writeHead(code,{'Content-Type':'application/json;charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(data));};
  try{
   const host=req.headers.host||'',origin=req.headers.origin;
   if(!/^(127\.0\.0\.1|localhost):\d+$/.test(host)||origin&&origin!=='http://'+host||req.headers['sec-fetch-site']==='cross-site')throw Object.assign(Error('仅允许本机同源访问'),{status:403});
   if(await sync.handle(req,res))return true;
   if(req.method==='GET'&&url.pathname==='/api/furnish/blender/status'){const executable=discover(),project=refinedProjects.read(root);reply(200,{available:!!executable,executable,refinedProject:project?{name:project.name,planId:project.planId}:null,job:[...jobs.values()].reverse().map(publicJob)[0]||null});return true;}
   if(req.method==='POST'&&req.headers['x-furnish-request']!=='blender-v1')throw Object.assign(Error('无效的渲染请求'),{status:403});
   if(req.method==='POST'&&url.pathname==='/api/furnish/blender/jobs'){
    if(req.headers['content-type']!=='model/gltf-binary')throw Error('需要 GLB 场景');
    if(Number(req.headers['content-length'])>LIMIT)throw Object.assign(Error('场景上限 256 MB'),{status:413});
    let size=0;const chunks=[];for await(const chunk of req){size+=chunk.length;if(size>LIMIT)throw Object.assign(Error('场景上限 256 MB'),{status:413});chunks.push(chunk);}
    reply(202,await start(Buffer.concat(chunks),{quality:url.searchParams.get('quality'),width:Number(url.searchParams.get('width')),height:Number(url.searchParams.get('height')),device:url.searchParams.get('device')||'auto',source:url.searchParams.get('source')||'basic',camera:url.searchParams.get('camera')||'source'}));return true;
   }
   const match=url.pathname.match(/^\/api\/furnish\/blender\/jobs\/([a-f0-9-]{36})(?:\/(image|blend|scene|cancel))?$/),j=match&&jobs.get(match[1]);
   if(!j){reply(404,{error:'渲染任务不存在或服务已重启'});return true;}
   if(req.method==='GET'&&!match[2])reply(200,publicJob(j));
   else if(req.method==='POST'&&match[2]==='cancel'){
    if(j.timer){j.cancelRequested=true;fs.writeFileSync(path.join(j.dir,'cancel'),'');if(j.pid)stop(j,'cancelled','已取消渲染');else{j.state='cancelling';j.message='正在取消';}}
    reply(200,publicJob(j));
   }else if(req.method==='GET'&&['image','blend','scene'].includes(match[2])&&j.state==='done'){
    const files={image:['render.png','image/png'],blend:['scene.blend','application/octet-stream'],scene:['scene.glb','model/gltf-binary']},[name,type]=files[match[2]];
    const file=path.join(j.dir,name);if(!fs.existsSync(file))throw Error('结果文件已移除');
    res.writeHead(200,{'Content-Type':type,'Content-Length':fs.statSync(file).size,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Content-Disposition':`${match[2]==='image'?'inline':'attachment'}; filename="furnish-${name}"`});fs.createReadStream(file).on('error',()=>res.destroy()).pipe(res);
   }else reply(405,{error:'不支持的请求'});
  }catch(e){reply(e.status||400,{error:e.message});}return true;
 }
 return {handle,start,jobs,close(){for(const j of jobs.values())if(j.timer){j.cancelRequested=true;fs.writeFileSync(path.join(j.dir,'cancel'),'');const p=readProgress(j);if(p)j.pid=p.pid;if(p?.state==='done'||p?.state==='failed'||p?.state==='cancelled'){finish(j,p.state,p.message);continue;}if(j.pid)stop(j,'cancelled','服务已关闭');}}};
}
module.exports={create,findBlender,candidates,validateGLB};
