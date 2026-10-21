/* Transient publisher; only settled production 3D changes trigger snapshots. */
(function(root){
'use strict';
const base='/api/furnish/blender/sync';let enabled=false,busy=false,timer=null,last='',candidate='',changedAt=0,pointer=false,includeCeilings=true,message='尚未推送',view=null,publishedPlan=null;
document.addEventListener('pointerdown',()=>pointer=true);for(const type of ['pointerup','pointercancel'])document.addEventListener(type,()=>pointer=false);addEventListener('blur',()=>pointer=false);
async function request(route,options={}){const response=await fetch(base+route,{cache:'no-store',...options});let data;try{data=await response.json();}catch{throw Error('本地服务未提供持续同步，请重启 scripts/serve.cjs');}if(!response.ok)throw Error(data.error||'同步请求失败');return data;}
function paint(status){if(!view?.isConnected)return;view.querySelector('[data-sync-message]').textContent=message;view.querySelector('[data-sync-auto]').checked=enabled;view.querySelector('[data-sync-send]').disabled=busy||location.protocol==='file:';if(status){view.querySelector('[data-sync-url]').value=location.origin;view.querySelector('[data-sync-token]').value=status.token;view.querySelector('[data-sync-ack]').textContent=status.ack?`${status.ack.state==='applied'?'Blender 已接收':'Blender 接收失败'}：${status.ack.message}`:status.latest?'等待 Blender 接收最近版本':'尚无同步场景';}}
async function publish(){
 if(busy||pointer||location.protocol==='file:')return;const signature=root.View3D?.blenderSyncSignature?.();if(!signature){message='请进入三维并等待视角稳定';paint();return;}
 busy=true;message='正在打包同步场景…';paint();
 try{const snapshot=await root.View3D.blenderScene({includeCeilings,expandInstances:true,includeHidden:true}),result=await request('/publish',{method:'POST',headers:{'Content-Type':'model/gltf-binary','X-Furnish-Request':'blender-v1'},body:snapshot.buffer});last=signature+'|'+includeCeilings;publishedPlan=result.planId;message=`已推送 ${result.objects} 个实体 · ${new Date(result.created).toLocaleTimeString()}`;paint(await request('/status'));}
 catch(error){message=error.message;paint();}finally{busy=false;paint();}
}
async function tick(){
 if(!enabled){timer=null;return;}
 try{const signature=root.View3D?.blenderSyncSignature?.(),next=signature&&signature+'|'+includeCeilings;
  if(signature&&publishedPlan&&JSON.parse(signature)[0]!==publishedPlan){enabled=false;message='已切换户型，自动推送已停止；请在 Blender 新建文件后重新连接。';paint();return;}
  if(next&&next!==last&&!pointer){if(next!==candidate){candidate=next;changedAt=Date.now();}else if(Date.now()-changedAt>=900)await publish();}
  if(view?.isConnected)paint(await request('/status'));
 }catch(error){message=error.message;paint();}
 if(enabled)timer=setTimeout(tick,1500);
}
function mount(host){
 view=host;host.innerHTML=`<details class="blender-sync"><summary>${tr('持续同步 · 试用','Continuous sync · preview')}</summary><p>${tr('Furnish 更新布局，Blender 插件接收受管理的模型。Blender 材质、灯光和机位可以保留。','Furnish publishes layout changes; the Blender add-on updates managed models while keeping Blender materials, lights and cameras.')}</p><p><a class="btn" href="${base}/addon.zip" download="furnish-sync.zip">${tr('下载 Blender 同步插件','Download Blender sync add-on')}</a></p><label>${tr('本地服务地址','Local server')}<input data-sync-url readonly></label><label>${tr('连接密钥','Connection key')}<input data-sync-token readonly></label><p>${tr('在 Blender 偏好设置安装 ZIP，打开 3D 视图侧栏的 Furnish，填入地址与密钥并连接。','Install the ZIP in Blender Preferences, then open Furnish in the 3D View sidebar, enter the server and key, and connect.')}</p><div class="blender-buttons"><button class="btn" data-sync-send>${tr('立即推送场景','Push scene now')}</button><label><input type="checkbox" data-sync-auto> ${tr('自动推送布局变化','Auto-push layout changes')}</label><label><input type="checkbox" data-sync-ceilings> ${tr('包含当前可见顶面','Include visible ceilings')}</label></div><p data-sync-message role="status"></p><p data-sync-ack role="status"></p><p class="muted">${tr('自动推送仅在三维界面运行；关闭面板后继续，刷新页面后关闭。服务重启需重新复制密钥。Blender 的接收状态与 Furnish 的推送开关分别控制。','Auto-push runs in 3D and continues after this panel closes. Reload turns it off; restart requires a new connection key. Blender receiving and Furnish publishing are controlled separately.')}</p></details>`;
 const q=s=>host.querySelector(s);q('[data-sync-ceilings]').checked=includeCeilings;q('[data-sync-ceilings]').onchange=e=>includeCeilings=e.target.checked;
 q('[data-sync-send]').onclick=publish;q('[data-sync-auto]').onchange=e=>{enabled=e.target.checked;if(enabled){publishedPlan=null;publish();if(!timer)timer=setTimeout(tick,1500);}else{clearTimeout(timer);timer=null;}paint();};
 if(location.protocol==='file:'){message='离线模式可导出 GLB；持续同步需要通过本地服务打开。';for(const el of host.querySelectorAll('button,input'))el.disabled=true;q('a').removeAttribute('href');paint();return;}
 request('/status').then(paint).catch(error=>{message=error.message;paint();});paint();
}
root.FurnishBlenderSync={mount,publish,stop(){enabled=false;clearTimeout(timer);timer=null;paint();},state:()=>({enabled,busy,last,message})};
})(globalThis);
