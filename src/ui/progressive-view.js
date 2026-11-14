/* Default progressive observation. The existing canvas keeps all editing input and picking. */
(function(root){'use strict';
let current=null,mode='auto';try{mode=localStorage.getItem('furnish-observation-v1')==='smooth'?'smooth':'auto';}catch{}
function enter(){if(current)return;const host=document.querySelector('#view3d');if(!host)return;
 const bar=document.createElement('div');bar.id='progressive-controls';bar.innerHTML='<select aria-label="三维观察画质" id="progressive-mode"><option value="auto">自动 · 渐进高清</option><option value="smooth">流畅观察</option></select><span id="progressive-status" role="status"></span><button class="btn" id="progressive-retry" hidden>重试高清</button>';host.append(bar);
 const s={bar,host,frame:null,token:0,active:true,blocked:false,held:false,quiet:performance.now(),sceneKey:null,viewKey:null,sentView:null,building:false,ready:false,policy:FurnishProgressivePolicy.performancePolicy(),pause:false};current=s;
 const status=t=>bar.querySelector('#progressive-status').textContent=t,post=(type,body={})=>s.frame?.contentWindow.postMessage({channel:'furnish-lighting-preview',token:s.token,type,...body},location.origin);
 function hide(){if(s.frame)s.frame.hidden=true;}
 function dispose(){s.token++;s.frame?.remove();s.frame=null;s.ready=false;s.building=false;s.sceneKey=null;s.sentView=null;s.pending=null;clearTimeout(s.watchdog);}
 function fallback(reason){dispose();s.blocked=true;bar.dataset.state='fallback';status('流畅观察 · '+reason);bar.querySelector('#progressive-retry').hidden=false;}
 function interact(e){if(e.type==='pointerdown')s.held=true;s.quiet=performance.now();hide();if(s.frame){s.pause=true;post('pause');}}
 function release(){s.held=false;s.quiet=performance.now();}
 host.addEventListener('pointerdown',interact,true);host.addEventListener('wheel',interact,{capture:true,passive:true});window.addEventListener('pointerup',release,true);window.addEventListener('pointercancel',release,true);
 function retry(){dispose();s.blocked=false;s.quiet=performance.now();s.policy=FurnishProgressivePolicy.performancePolicy();bar.querySelector('#progressive-retry').hidden=true;status('准备渐进预览…');}
 const select=bar.querySelector('select');select.value=mode;select.onchange=()=>{mode=select.value;try{localStorage.setItem('furnish-observation-v1',mode);}catch{}retry();};bar.querySelector('#progressive-retry').onclick=()=>{mode='auto';select.value=mode;try{localStorage.setItem('furnish-observation-v1',mode);}catch{}retry();};
 async function build(state){dispose();const token=s.token;s.building=true;s.sceneKey=state.sceneKey;bar.dataset.state='preparing';status('准备渐进预览…');s.policy.reset();
  try{const data=await root.View3D.progressiveScene();if(!s.active||s.token!==token)return;const fresh=root.View3D.progressiveState();if(!fresh||fresh.sceneKey!==state.sceneKey){dispose();s.quiet=performance.now();return;}
   const frame=document.createElement('iframe');frame.id='progressive-frame';frame.title='渐进高清观察';frame.setAttribute('allow','webgpu');frame.src='src/render/lighting-preview.html';frame.hidden=true;s.frame=frame;s.pending={...data,mode:'live',token,viewKey:fresh.viewKey,camera:fresh.camera,edge:s.policy.sample({now:0,samples:0}).edge};s.pending.sceneKey=fresh.sceneKey;s.sentView=fresh.viewKey;s.viewKey=fresh.viewKey;host.prepend(frame);s.watchdog=setTimeout(()=>{if(s.token===token)fallback('初始化超时');},90000);
  }catch(error){if(s.token!==token||!s.active)return;const now=root.View3D.progressiveState();if(!now||now.sceneKey!==state.sceneKey){dispose();s.quiet=performance.now();}else fallback(error.message||'设备不可用');}
 }
 function receive(e){if(e.source!==s.frame?.contentWindow||e.origin!==location.origin||e.data?.channel!=='furnish-lighting-preview')return;const d=e.data;if(d.type==='ready'){const data=s.pending;if(!data)return;s.pending=null;s.frame.contentWindow.postMessage({channel:'furnish-lighting-preview',type:'scene',...data},location.origin,[data.buffer]);return;}if(d.token!==s.token)return;if(d.type==='error'){fallback(d.message||'设备不可用');return;}if(d.type==='live-ready'){s.ready=true;s.building=false;s.policy.reset();if(s.held||performance.now()-s.quiet<250){s.pause=true;post('pause');}}
  if(d.type==='status'&&!s.ready)status(d.message);
  if(d.type==='live-progress'||d.type==='live-complete'){
   const state=root.View3D.progressiveState();if(!state||state.editing||state.sceneKey!==s.sceneKey||state.viewKey!==d.viewKey||s.held||performance.now()-s.quiet<180)return;
   if(d.samples>=1){clearTimeout(s.watchdog);s.frame.dataset.viewKey=d.viewKey;s.frame.hidden=false;bar.dataset.state='progressive';status(d.type==='live-complete'||d.samples>=256?'渐进高清 · 已收敛':`渐进高清 · ${Math.floor(d.samples)} 采样`);}
   const decision=s.policy.sample({now:performance.now(),samples:d.samples,frameTime:d.frameTime});if(decision.action==='reduce'){s.policy.reset();hide();post('resize',{edge:decision.edge});status('正在降低预览分辨率…');}else if(decision.action==='fallback')fallback('当前采样速度较低');
  }
 }
 window.addEventListener('message',receive);
 function tick(){if(!s.active)return;const light=document.querySelector('.scene-light'),a=bar.getBoundingClientRect(),b=light?.getClientRects().length?light.getBoundingClientRect():null,top=b&&a.left<b.right+8&&a.right>b.left-8?Math.max(12,b.bottom-host.getBoundingClientRect().top+8):12;if(bar.style.top!==top+'px')bar.style.top=top+'px';if(mode==='smooth'){if(s.frame||s.building)dispose();status('流畅观察');bar.dataset.state='smooth';return;}if(s.blocked)return;
  if(location.protocol==='file:'){fallback('直接打开文件；桌面可启用高清');return;}if(!navigator.gpu){fallback('设备不支持 WebGPU');return;}
  if(document.hidden||document.querySelector('#lighting-preview')){if(s.frame||s.building)dispose();status(document.hidden?'已暂停':'独立出图中');s.quiet=performance.now();return;}
  const state=root.View3D.progressiveState();if(!state){hide();s.quiet=performance.now();if(s.frame){s.pause=true;post('pause');}return;}
  if(state.editing){hide();s.quiet=performance.now();if(s.frame){s.pause=true;post('pause');}status('编辑中 · 结束后自动高清');return;}
  if(state.sceneKey!==s.sceneKey&&s.frame){dispose();s.quiet=performance.now();status('场景已更新，准备重采样…');}
  if(s.viewKey!==state.viewKey){s.viewKey=state.viewKey;s.quiet=performance.now();hide();if(s.frame){s.pause=true;post('pause');}}
  if(s.held||performance.now()-s.quiet<250)return;
  if(!s.frame&&!s.building){build(state);return;}
  if(s.ready&&s.sentView!==state.viewKey){s.sentView=state.viewKey;s.pause=false;s.policy.reset();post('camera',{camera:state.camera,viewKey:state.viewKey});status('渐进高清 · 重新采样…');}
  else if(s.ready&&s.pause){s.pause=false;post('resume');}
 }
 const timer=setInterval(tick,160);s.close=()=>{s.active=false;dispose();clearInterval(timer);host.removeEventListener('pointerdown',interact,true);host.removeEventListener('wheel',interact,true);window.removeEventListener('pointerup',release,true);window.removeEventListener('pointercancel',release,true);window.removeEventListener('message',receive);bar.remove();};status('准备渐进预览…');tick();
}
function exit(){current?.close();current=null;}
root.FurnishProgressiveView={enter,exit};
})(globalThis);
