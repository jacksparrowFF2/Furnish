/* Render settings and jobs are transient; project data and history remain authoritative. */
(function(root){
'use strict';
let session=0,timer=null,quality='preview',device='auto',includeCeilings=false,currentJob=null;
let renderSource='basic',cameraMode='active',sourceChosen=false,ceilingsChosen=false;
const api='/api/furnish/blender';
async function request(route,options={}){
 const response=await fetch(api+route,{cache:'no-store',...options});let value;try{value=await response.json();}catch{throw Error(tr('本地服务尚未提供 Blender 接口，请重新启动 scripts/serve.cjs。','Restart scripts/serve.cjs to enable the Blender API.'));}
 if(!response.ok)throw Error(value.error||'HTTP '+response.status);return value;
}
function openDock(options){
 document.querySelector('#blender-dock')?.remove();
 const dock=document.createElement('section');dock.id='blender-dock';dock.setAttribute('aria-label',options.title);
 const header=document.createElement('div'),title=document.createElement('strong'),close=document.createElement('button');title.textContent=options.title;close.id='blender-dock-close';close.className='btn';close.textContent=tr('关闭','Close');close.type='button';
 header.className='blender-dock-head';close.onclick=()=>{options.onClose();dock.remove();document.querySelector('#vBlender')?.focus();};header.append(title,close);
 const body=document.createElement('div');body.className='blender-dock-body';body.innerHTML=options.body;dock.append(header,body);document.querySelector('#stage').append(dock);options.onOpen();
}
function open(){
 const token=++session;clearTimeout(timer);
 openDock({title:tr('Blender 导出与渲染','Blender export & render'),
  body:`<div class="blender-render"><p>${tr('使用当前相机、墙体剖切和可见图层导出生产模型。定位选中的临时透视剖切不参与导出。','Export production models using the current camera, wall cut and visible layers. Temporary focus clipping is excluded.')}</p>
  <div class="blender-options"><label>${tr('画质','Quality')}<select id="blender-quality"><option value="preview">${tr('预览 · 最长边 960 px · 32 采样','Preview · 960 px · 32 samples')}</option><option value="final">${tr('精细 · 最长边 1920 px · 128 采样','Fine · 1920 px · 128 samples')}</option></select></label>
  <label>${tr('渲染来源','Render source')}<select id="blender-source"><option value="basic">${tr('生产场景 · 基础材质','Production scene · basic materials')}</option><option value="refined" disabled>${tr('已绑定的精修工程','Registered refined project')}</option></select></label>
  <label id="blender-camera-label" hidden>${tr('渲染机位','Render camera')}<select id="blender-camera"><option value="active">${tr('精修工程当前机位','Refined project active camera')}</option><option value="source">${tr('Furnish 当前视角','Current Furnish view')}</option><option value="living">客厅</option><option value="dining">餐厅</option><option value="kitchen">厨房</option><option value="bedroom">主卧</option></select></label>
  <label>${tr('渲染设备','Render device')}<select id="blender-device"><option value="auto">${tr('自动 · 优先 GPU','Auto · prefer GPU')}</option><option value="gpu">${tr('仅 GPU','GPU only')}</option><option value="cpu">CPU</option></select></label>
  <label class="blender-check"><input type="checkbox" id="blender-ceilings">${tr('包含当前可见的顶面与吊顶（室内视角适用）','Include visible ceilings (for interior views)')}</label></div>
  <p class="muted">${tr('精修渲染保留已保存工程的材质、灯光、环境与曝光，并更新当前布局；可使用工程机位或 Furnish 当前视角。修改精修参数后先在 Blender 保存。室内视角使用全高墙与顶面；鸟瞰可关闭顶面。','Refined renders retain saved materials, lighting, world and exposure while updating the current layout. Choose a project camera or the current Furnish view. Save Blender refinements first. Use full walls and ceilings indoors; ceilings can be off for aerial views.')}</p>
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
 function sourceControls(){q('#blender-source').value=renderSource;q('#blender-camera-label').hidden=renderSource!=='refined';q('#blender-quality option[value="final"]').textContent=renderSource==='refined'?tr('精细 · 1920 px · 沿用工程采样','Fine · 1920 px · saved samples'):tr('精细 · 最长边 1920 px · 128 采样','Fine · 1920 px · 128 samples');}
 q('#blender-source').onchange=e=>{renderSource=e.target.value;sourceChosen=true;sourceControls();};q('#blender-camera').value=cameraMode;q('#blender-camera').onchange=e=>cameraMode=e.target.value;
 q('#blender-quality').value=quality;q('#blender-quality').onchange=e=>quality=e.target.value;sourceControls();
 q('#blender-device').value=device;q('#blender-device').onchange=e=>device=e.target.value;
 q('#blender-ceilings').checked=includeCeilings;q('#blender-ceilings').onchange=e=>{includeCeilings=e.target.checked;ceilingsChosen=true;};
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
 async function capture(refined){if(!root.View3D)throw Error('3D unavailable');progress(tr('正在打包场景与纹理…','Packing scene and textures…'));return root.View3D.blenderScene({includeCeilings,expandInstances:refined,includeHidden:refined});}
 async function run(render){
  if(busy)return;busy=true;buttons();
  try{
   const chosenQuality=quality,chosenDevice=device,chosenSource=render?renderSource:'basic',chosenCamera=chosenSource==='refined'?cameraMode:'source',data=await capture(chosenSource==='refined');if(render){const size=FurnishBlenderExport.dimensions(chosenCamera==='source'?data.aspect:4/3,chosenQuality);const job=await request('/jobs?'+new URLSearchParams({...size,quality:chosenQuality,device:chosenDevice,source:chosenSource,camera:chosenCamera}),{method:'POST',headers:{'Content-Type':'model/gltf-binary','X-Furnish-Request':'blender-v1'},body:data.buffer});showJob(job);}
   else{download('Furnish-Blender.glb',new Blob([data.buffer],{type:'model/gltf-binary'}));progress(tr(`已导出 ${data.meshCount} 个实体，可在 Blender 导入 GLB。`,`Exported ${data.meshCount} meshes. Import the GLB in Blender.`));}
  }catch(e){progress(e.message);if(!alive())toast(e.message);}finally{busy=false;buttons();}
 }
 q('#blender-export').onclick=()=>run(false);q('#blender-start').onclick=()=>run(true);
 q('#blender-cancel').onclick=async()=>{if(!currentJob)return;try{clearTimeout(timer);showJob(await request('/jobs/'+currentJob.id+'/cancel',{method:'POST',headers:{'X-Furnish-Request':'blender-v1'}}));}catch(e){progress(e.message);timer=setTimeout(poll,1200);}};
 if(location.protocol==='file:'){q('#blender-service').textContent=tr('离线模式可导出 GLB。一键渲染请通过本地服务打开 Furnish。','Offline mode supports GLB export. Open Furnish through its local service to render.');buttons();return;}
 request('/status').then(status=>{if(!alive())return;available=status.available;const signature=root.View3D?.blenderSyncSignature?.(),matching=status.refinedProject&&signature&&JSON.parse(signature)[0]===status.refinedProject.planId;q('#blender-source option[value="refined"]').disabled=!matching;if(matching&&!sourceChosen){renderSource='refined';if(!ceilingsChosen){includeCeilings=true;q('#blender-ceilings').checked=true;}}if(!matching)renderSource='basic';sourceControls();q('#blender-service').textContent=matching?tr('已绑定精修工程：','Refined project: ')+status.refinedProject.name:available?tr('已找到 Blender。当前户型未绑定精修工程。','Blender found; no refined project registered for this plan.'):tr('未找到 Blender，请检查安装。','Blender not found. Check installation.');showJob(status.job);buttons();}).catch(e=>{if(alive())q('#blender-service').textContent=e.message;});
}
root.FurnishBlenderRender={open};
})(globalThis);
