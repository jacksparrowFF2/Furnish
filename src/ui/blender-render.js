/* Render settings and jobs are transient; project data and history remain authoritative. */
(function(root){
'use strict';
let session=0,timer=null,quality='preview',device='auto',includeCeilings=false,currentJob=null;
const api='/api/furnish/blender';
async function request(route,options={}){
 const response=await fetch(api+route,{cache:'no-store',...options});let value;try{value=await response.json();}catch{throw Error(tr('本地服务尚未提供 Blender 接口，请重新启动 scripts/serve.cjs。','Restart scripts/serve.cjs to enable the Blender API.'));}
 if(!response.ok)throw Error(value.error||'HTTP '+response.status);return value;
}
function open(){
 const token=++session;clearTimeout(timer);
 openDialog({title:tr('Blender 导出与渲染','Blender export & render'),wide:true,
  body:`<div class="blender-render"><p>${tr('使用当前相机、墙体剖切和可见图层导出生产模型。定位选中的临时透视剖切不参与导出。','Export production models using the current camera, wall cut and visible layers. Temporary focus clipping is excluded.')}</p>
  <div class="blender-options"><label>${tr('画质','Quality')}<select id="blender-quality"><option value="preview">${tr('预览 · 最长边 960 px · 32 采样','Preview · 960 px · 32 samples')}</option><option value="final">${tr('精细 · 最长边 1920 px · 128 采样','Fine · 1920 px · 128 samples')}</option></select></label>
  <label>${tr('渲染设备','Render device')}<select id="blender-device"><option value="auto">${tr('自动 · 优先 GPU','Auto · prefer GPU')}</option><option value="gpu">${tr('仅 GPU','GPU only')}</option><option value="cpu">CPU</option></select></label>
  <label class="blender-check"><input type="checkbox" id="blender-ceilings">${tr('包含当前可见的顶面与吊顶（室内视角适用）','Include visible ceilings (for interior views)')}</label></div>
  <p class="muted">${tr('鸟瞰建议保留顶面关闭；完整墙体请先在“显示”中选“全高墙”。自动模式优先 GPU，不可用时回退 CPU；仅 GPU 模式失败会明确报错。材质和布光效果可能与三维预览不同。','Keep ceilings off for aerial views; select Full walls in View for full-height architecture. Auto prefers GPU and falls back to CPU; GPU-only failures are reported. Materials and lighting may differ from the preview.')}</p>
  <p id="blender-service" role="status">${tr('正在检测本地 Blender…','Checking local Blender…')}</p>
  <div class="blender-buttons"><button class="btn" id="blender-export">${tr('导出 Blender 场景 GLB','Export GLB for Blender')}</button><button class="btn primary" id="blender-start" disabled>${tr('一键渲染','Render')}</button><button class="btn" id="blender-cancel" hidden>${tr('取消渲染','Cancel render')}</button></div>
  <p id="blender-progress" role="status" aria-live="polite"></p><p id="blender-device-result"></p><div id="blender-result"></div><div id="blender-sync-host"></div>
  <details><summary>${tr('使用说明','Instructions')}</summary><p>${tr('GLB 可在 Blender 的“文件 → 导入 → glTF 2.0”打开。内嵌纹理、相机和基础灯光；导入后将活动相机设为 FurnishCamera。','In Blender, use File → Import → glTF 2.0. Textures, camera and basic lights are embedded; set FurnishCamera as the active camera.')}</p><p>${tr('一键渲染需要通过本地服务打开 Furnish：node scripts/serve.cjs --open。支持 Blender 4.2+，包括商店版 blender-launcher.exe；自定义位置可通过 FURNISH_BLENDER 环境变量设置。','For one-click rendering, open Furnish through node scripts/serve.cjs --open. Blender 4.2+ is supported, including the Store launcher; set FURNISH_BLENDER for a custom executable.')}</p><p>${tr('关闭此面板后任务继续运行，重新打开可查看结果。服务重启后任务列表清空，文件保留在 .local/blender-renders。','Jobs continue when this panel closes. Reopen to see results. Restarting the service clears the job list; files remain in .local/blender-renders.')}</p></details></div>`,
  actions:[{label:tr('关闭','Close')}],onClose:()=>{if(token===session){session++;clearTimeout(timer);}},onOpen:()=>bind(token)});
}
function bind(token){
 const box=document.querySelector('.blender-render'),q=s=>box.querySelector(s),alive=()=>token===session&&box.isConnected;
 root.FurnishBlenderSync?.mount(q('#blender-sync-host'));
 let available=false,busy=false;
 const progress=text=>{if(alive())q('#blender-progress').textContent=text;};
 const running=()=>!!currentJob&&['starting','importing','rendering','cancelling'].includes(currentJob.state);
 const buttons=()=>{if(!alive())return;q('#blender-export').disabled=busy;q('#blender-start').disabled=busy||!available||running();q('#blender-cancel').hidden=!running();q('#blender-cancel').disabled=currentJob?.state==='cancelling';};
 q('#blender-quality').value=quality;q('#blender-quality').onchange=e=>quality=e.target.value;
 q('#blender-device').value=device;q('#blender-device').onchange=e=>device=e.target.value;
 q('#blender-ceilings').checked=includeCeilings;q('#blender-ceilings').onchange=e=>includeCeilings=e.target.checked;
 function showJob(job){
  if(!alive())return;currentJob=job;buttons();if(!job)return;
  progress(job.message||job.state);const actual=job.renderDevice;q('#blender-device-result').textContent=actual?`${actual.backend} · ${actual.devices?.join(', ')||'CPU'}${actual.fallback?' · '+actual.fallback:''}`:'';const result=q('#blender-result');result.replaceChildren();
  if(job.state==='done'){
   const img=document.createElement('img');img.src=job.image;img.alt=tr('Blender 渲染结果','Blender render');result.append(img);
   for(const [href,label,name]of [[job.image,tr('下载图片','Download image'),'furnish-render.png'],[job.blend,tr('下载 Blender 工程','Download Blender project'),'furnish-scene.blend'],[job.scene,tr('下载本次场景','Download scene'),'furnish-scene.glb']]){const a=document.createElement('a');a.href=href;a.textContent=label;a.download=name;a.className='btn';result.append(a);}
  }
  if(running())timer=setTimeout(poll,1200);
 }
 async function poll(){if(!alive()||!currentJob)return;try{showJob(await request('/jobs/'+currentJob.id));}catch(e){progress(e.message);timer=setTimeout(poll,4000);}}
 async function capture(){if(!root.View3D)throw Error('3D unavailable');progress(tr('正在打包场景与纹理…','Packing scene and textures…'));return root.View3D.blenderScene({includeCeilings});}
 async function run(render){
  if(busy)return;busy=true;buttons();
  try{
   const chosenQuality=quality,chosenDevice=device,data=await capture();if(render){const size=FurnishBlenderExport.dimensions(data.aspect,chosenQuality);const job=await request('/jobs?'+new URLSearchParams({...size,quality:chosenQuality,device:chosenDevice}),{method:'POST',headers:{'Content-Type':'model/gltf-binary','X-Furnish-Request':'blender-v1'},body:data.buffer});showJob(job);}
   else{download('Furnish-Blender.glb',new Blob([data.buffer],{type:'model/gltf-binary'}));progress(tr(`已导出 ${data.meshCount} 个实体，可在 Blender 导入 GLB。`,`Exported ${data.meshCount} meshes. Import the GLB in Blender.`));}
  }catch(e){progress(e.message);if(!alive())toast(e.message);}finally{busy=false;buttons();}
 }
 q('#blender-export').onclick=()=>run(false);q('#blender-start').onclick=()=>run(true);
 q('#blender-cancel').onclick=async()=>{if(!currentJob)return;try{clearTimeout(timer);showJob(await request('/jobs/'+currentJob.id+'/cancel',{method:'POST',headers:{'X-Furnish-Request':'blender-v1'}}));}catch(e){progress(e.message);timer=setTimeout(poll,1200);}};
 if(location.protocol==='file:'){q('#blender-service').textContent=tr('离线模式可导出 GLB。一键渲染请通过本地服务打开 Furnish。','Offline mode supports GLB export. Open Furnish through its local service to render.');buttons();return;}
 request('/status').then(status=>{if(!alive())return;available=status.available;q('#blender-service').textContent=available?tr('已找到 Blender，可启动渲染。','Blender found. Ready to render.'):tr('未找到 Blender。安装后重启服务，或设置 FURNISH_BLENDER 指向 blender.exe／商店启动别名。','Blender not found. Restart after installing, or set FURNISH_BLENDER to Blender or its Store launcher.');showJob(status.job);buttons();}).catch(e=>{if(alive())q('#blender-service').textContent=e.message;});
}
root.FurnishBlenderRender={open};
})(globalThis);
