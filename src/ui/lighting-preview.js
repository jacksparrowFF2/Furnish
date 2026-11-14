/* A transient snapshot viewer. Never writes a plan or replaces the editor renderer. */
(function(root){
'use strict';
let current=null,quality='preview';
function open(){
 if(current){current.dock.querySelector('button').focus();return;}
 const dock=document.createElement('section');dock.id='lighting-preview';dock.setAttribute('aria-label','灯光高清预览');
 dock.innerHTML='<div class="lighting-head"><strong>灯光高清预览</strong><button class="btn" type="button" id="lighting-close">关闭</button></div><div class="lighting-body"><p class="muted">使用当前视角、灯光开关、墙体剖切和可见图层。可继续编辑；画面改变后需重新预览。</p><div class="lighting-controls"><select id="lighting-quality" aria-label="预览画质"><option value="preview">快速 · 1200 px · 128 采样</option><option value="fine">高清 · 1920 px · 1024 采样</option></select><button class="btn primary" id="lighting-start">重新预览</button><button class="btn" id="lighting-stop" disabled>停止</button><a class="btn" id="lighting-download" hidden download="Furnish-灯光预览.png">下载图片</a></div><p id="lighting-status" role="status" aria-live="polite">正在准备…</p><div id="lighting-image"><img alt="渐进光追灯光预览" hidden></div><p class="muted">渐进光追 · 自动降噪。主灯与灯带的未知光通量采用规划估值，画面用于比较氛围，不作为照度验收。</p></div>';
 document.querySelector('#stage').append(dock);
 const q=s=>dock.querySelector(s),s={dock,frame:null,token:0,busy:false,signature:null,url:null,closed:false};current=s;
 const status=value=>q('#lighting-status').textContent=value;
 function clearURL(){if(s.url)URL.revokeObjectURL(s.url);s.url=null;q('#lighting-download').hidden=true;}
 function stop(message){s.token++;s.busy=false;clearTimeout(s.loadingTimer);s.frame?.remove();s.frame=null;q('#lighting-stop').disabled=true;q('#lighting-start').disabled=false;if(message)status(message);}
 function stale(){stop('画面已改变 · 旧预览已过期，请重新预览。');q('#lighting-image').classList.add('stale');q('#lighting-download').hidden=true;s.signature=null;}
 function receive(e){
  if(e.source!==s.frame?.contentWindow||e.origin!==location.origin||e.data?.channel!=='furnish-lighting-preview'||e.data.type!=='ready'&&e.data.token!==s.token)return;
  const data=e.data;
  if(data.type==='ready'){clearTimeout(s.loadingTimer);const ready=s.ready;s.ready=null;ready?.();}
  else if(data.type==='status'&&typeof data.message==='string')status(data.message);
  else if(data.type==='error'){stop('预览未完成：'+data.message+'。可继续编辑或使用 Blender 渲染。');}
  else if(data.type==='complete'&&data.blob instanceof Blob){
   if(root.View3D.highQualitySignature()!==s.signature){stale();return;}
   clearURL();s.url=URL.createObjectURL(data.blob);const img=q('img');img.src=s.url;img.hidden=false;q('#lighting-download').href=s.url;q('#lighting-download').hidden=false;
   stop(`已完成 · ${data.width} × ${data.height} · ${data.samples} 采样 · ${data.seconds.toFixed(1)} 秒`);
  }
 }
 window.addEventListener('message',receive);
 async function start(){
  stop();clearURL();q('img').hidden=true;q('#lighting-image').classList.remove('stale');
  const token=s.token;s.busy=true;q('#lighting-stop').disabled=false;q('#lighting-start').disabled=true;status('正在打包当前场景与纹理…');
  s.signature=root.View3D.highQualitySignature();
  if(!s.signature){stop('请先进入三维，等待视角稳定后重新预览。');return;}
  try{
   const data=await root.View3D.highQualityScene();
   if(s.closed||s.token!==token)return;
   if(data.signature!==s.signature||root.View3D.highQualitySignature()!==s.signature){stale();return;}
   const frame=document.createElement('iframe');s.frame=frame;frame.title='渐进光追画面';frame.src='src/render/lighting-preview.html';frame.setAttribute('allow','webgpu');
   s.ready=()=>{if(s.token!==token)return;frame.contentWindow.postMessage({channel:'furnish-lighting-preview',type:'scene',token,buffer:data.buffer,lighting:data.lighting,environment:data.environment,aspect:data.aspect,quality},location.origin,[data.buffer]);};
   q('#lighting-image').append(frame);status('正在初始化高清预览…');
   s.loadingTimer=setTimeout(()=>{if(s.token===token)stop('预览组件未能加载，请刷新 Furnish 后重试。');},30000);
  }catch(error){if(!s.closed&&s.token===token)stop(error.message);}
 }
 q('#lighting-quality').value=quality;q('#lighting-quality').onchange=e=>{quality=e.target.value;if(s.busy||s.url)stale();};
 q('#lighting-start').onclick=start;q('#lighting-stop').onclick=()=>stop('已停止，可重新预览。');
 const timer=setInterval(()=>{if(s.signature&&root.View3D.highQualitySignature()!==s.signature)stale();},600);
 q('#lighting-close').onclick=()=>{s.closed=true;stop();clearURL();clearInterval(timer);window.removeEventListener('message',receive);dock.remove();current=null;document.querySelector('#vLightingPreview')?.focus();};
 if(location.protocol==='file:'){status('高清预览请通过 Furnish 桌面程序或本地服务打开。当前仍可编辑与导出 GLB。');q('#lighting-start').disabled=true;return;}
 start();
}
root.FurnishLightingPreview={open};
})(globalThis);
