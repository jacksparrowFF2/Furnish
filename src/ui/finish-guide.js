/* Navigation only: the existing floor and wall editors own every mutation. */
(function(){
'use strict';
const G=FurnishFinishGuide,view=()=>G.inspect(FurnishProject.effectivePlan(PLAN,state),state);
let session=null,last='';const forms=new WeakMap();
const mm=n=>Number.isFinite(n)?`${Number(n.toFixed(2))} mm`:'待确定';
function fields(host){return JSON.stringify([...host.querySelectorAll('[data-floor],#fab-floor-enabled,[data-wall-layout],[data-wall-layout-enabled],#wall-height-reference,#wall-height-value')].map(el=>[el.dataset.floor||el.dataset.wallLayout||el.id,el.type==='checkbox'?el.checked:el.value]));}
function navigate(host,fn){
 if(forms.has(host)&&forms.get(host)!==fields(host)){
  const bar=host.querySelector('[data-guide-editor]');bar.querySelector('[data-guide-warning]').hidden=false;
  bar.querySelector('[data-guide-discard]').onclick=fn;bar.querySelector('[data-guide-stay]').onclick=()=>bar.querySelector('[data-guide-warning]').hidden=true;
  bar.querySelector('[data-guide-stay]').focus();return;
 }fn();
}
function attachEditor(host,kind,roomId){
 if(!session||session.plan!==PLAN.id)return;
 const step=kind==='floor'?(view().rows.find(r=>r.id===roomId)?.use==='bathroom'?1:0):kind==='wall-face'?session.step:2;session.step=step;
 const bar=document.createElement('section');bar.className='finish-guide-editor';bar.dataset.guideEditor='';
 bar.innerHTML=`<b>铺贴设定引导 · 第 ${step+1} 步</b><p>${kind==='wall-face'?'在立面核对地面和起铺线；修改后点击「应用此墙排版」保存，再返回核对结果。':step===0?'保留毛坯标高，填写已知层厚或目标完成标高，然后点击「应用地面设置」。':step===1?'选择「低于参考区域」，指定已确定的厨房等参考区域及降低量；找平层留空可自动推算。': '选择「毛坯绝对标高」，输入共用高度，然后应用；关闭墙面不会因此自动启用。'}</p><div class="actions"><button class="btn" data-guide-return>返回本步清单</button><button class="btn" data-guide-forward>${step===3?'返回核对结果':step===2?'查看核对结果':'下一步'}</button></div><div data-guide-warning hidden role="alert"><p>有未应用的输入。可先应用再继续，或放弃本页草稿。</p><div class="actions"><button class="btn" data-guide-stay>继续编辑</button><button class="btn" data-guide-discard>放弃草稿并继续</button></div></div>`;
 host.querySelector('.fab-editor-head').after(bar);forms.set(host,fields(host));
 bar.querySelector('[data-guide-return]').onclick=()=>navigate(host,()=>open(step));
 bar.querySelector('[data-guide-forward]').onclick=()=>navigate(host,()=>open(Math.min(step+1,3)));queueFabPosition();
}
function attachList(kind){
 if(!session||session.plan!==PLAN.id)return;
 const body=document.querySelector('#dlgBody'),bar=document.createElement('div');bar.className='finish-guide-editor';bar.innerHTML=`<b>铺贴设定引导 · ${kind==='wall'?'第 3 步：启用墙面后统一高度':'区域地面'}</b><p>这里的开关立即保存；修改参数需在编辑器内点击应用。</p><button class="btn" data-guide-return>返回引导清单</button>`;body.prepend(bar);bar.querySelector('button').onclick=()=>open(kind==='wall'?2:session.step);
}
function rowHTML(r,step){
 const note=step===0?(r.floorKnown?`完成地面 ${mm(r.finishedZ)}`:r.floorPending):r.referenceReady?`参考 ${view().rows.find(v=>v.id===r.reference)?.name||state.rooms[r.reference]?.name||r.reference}，低 ${mm(r.drop)} → 完成 ${mm(r.finishedZ)}`:r.floorKnown?'完成标高已确定，尚未设置参考高差':r.floorPending;
 return `<div class="finish-guide-row"><div><b>${esc(r.name)}</b><p class="${(step===0?r.floorKnown:r.referenceReady)?'muted':'project-error'}">${esc(note)}</p><small>毛坯 ${mm(r.rawZ)}</small></div><button class="btn" data-guide-floor="${esc(r.id)}">${step===0?'设置地面标高':'设置参考高差'}</button></div>`;
}
function render(){
 const host=document.querySelector('[data-finish-guide]');if(!host||!session||session.plan!==PLAN.id)return;
 const v=view(),key=JSON.stringify([session.step,v]);if(last===key)return;last=key;
 const step=session.step;
 const descriptions=[
  '先确定厨房、阳台等普通区域的完成地面。完成标高＝毛坯标高＋面层厚度＋粘结找平层；也可改用目标标高。数值按实际方案填写，引导不会代填演示值。',
  '再设置卫生间：选择已确定标高的参考区域，录入降低量。5 mm 是可修改的初值，毛坯标高不随高差改变。',
  '最后统一墙砖起铺基准。先在区域列表启用需要的墙面，再按毛坯绝对标高统一高度，避免卫生间地面高差带动砖缝。',
  '核对下表的已保存结果，再逐墙查看立面及空间提示。这里只表示参数状态，不代表已经完成现场施工核对。'
 ];
 const progress=`<nav class="finish-guide-steps" aria-label="铺贴设定步骤">${G.steps.map((s,i)=>`<button class="btn ${i===step?'on':''}" data-guide-step="${i}" ${i===step?'aria-current="step"':''}>${i+1}. ${s}${i<3&&v.ready[i]?' ✓':''}</button>`).join('')}</nav>`;
 let body='';
 if(step<2){const rows=step===0?v.ordinary:v.bathrooms;body=rows.map(r=>rowHTML(r,step)).join('')||`<p class="muted">当前没有${step===0?'厨房或阳台':'卫生间'}区域，此步可跳过。</p>`;}
 else if(step===2){
  body=`<p data-guide-wall-status>${v.uniform?`已统一绝对起铺高度 ${mm(v.commonWallZ)}`:`已启用 ${v.enabledFaces}/${v.availableFaces} 个墙面；${v.allActive?'起铺基准尚未统一为绝对标高':'请先启用需要铺贴的墙面'}`}</p><div class="actions"><button class="btn" data-guide-wall-list>选择墙砖区域</button><button class="btn primary" data-guide-wall-height ${v.availableFaces?'':'disabled'}>设置统一起铺高度</button></div><p class="muted">统一高度保留每墙的尺寸、砖缝、横向起点和开关。不同砖高、砖缝或方向仍可能使后续横缝不齐。</p>`;
 }
 else body=`<div class="finish-guide-table"><table><thead><tr><th>区域</th><th>毛坯</th><th>完成地面</th><th>墙砖起铺</th><th>距完成地面</th></tr></thead><tbody>${v.rows.map(r=>`<tr><th>${esc(r.name)}</th><td>${mm(r.rawZ)}</td><td>${mm(r.finishedZ)}</td><td>${r.enabled?mm(r.wallZ):'未启用'}${r.enabled&&!r.absolute?'（相对地面）':''}<br><small>${r.enabled}/${r.faces} 面</small></td><td>${Number.isFinite(r.wallZ)&&r.floorKnown?mm(r.wallZ-r.finishedZ):'待确定'}</td></tr>`).join('')}</tbody></table></div><p role="status">${v.ready.every(Boolean)?'地面、高差及墙砖绝对起铺基准已确定。':'仍有待确定项，可点击上方步骤返回修改。'}${!v.patternsMatch?' 墙砖竖向尺寸或砖缝不同，后续横缝可能不齐。':''}</p><div class="actions"><button class="btn" data-guide-wall-list>逐墙查看立面</button><button class="btn" data-guide-space>打开空间核对</button></div>`;
 host.innerHTML=`${progress}<h4 tabindex="-1" data-guide-heading>第 ${step+1} 步 · ${G.steps[step]}</h4><p>${descriptions[step]}</p>${body}<div class="actions finish-guide-bottom"><button class="btn" data-guide-back ${step===0?'disabled':''}>上一步</button><button class="btn primary" data-guide-next>${step===3?'关闭引导':'下一步'}</button></div>`;
 host.querySelectorAll('[data-guide-step]').forEach(b=>b.onclick=()=>open(Number(b.dataset.guideStep)));
 host.querySelectorAll('[data-guide-floor]').forEach(b=>b.onclick=()=>{closeDialog();select({kind:'room',id:b.dataset.guideFloor});FurnishFloorFinishUI.openFloating('height');});
 host.querySelector('[data-guide-wall-list]')?.addEventListener('click',()=>FurnishWallTilingUI.openList());
 host.querySelector('[data-guide-wall-height]')?.addEventListener('click',()=>FurnishWallTilingUI.openHeights());
 host.querySelector('[data-guide-space]')?.addEventListener('click',()=>{closeDialog();document.querySelector('#space-status').click();});
 host.querySelector('[data-guide-back]').onclick=()=>open(step-1);
 host.querySelector('[data-guide-next]').onclick=()=>{if(step===3){session=null;closeDialog();}else open(step+1);};
}
function open(step){
 if(!session||session.plan!==PLAN.id)session={plan:PLAN.id,step:step??view().firstPending};else if(step!==undefined)session.step=step;
 session.step=Math.max(0,Math.min(3,session.step));closeFabEditor(false);last='';
 openDialog({title:'地面与墙砖 · 分步设定引导',wide:true,body:'<p class="muted">范围：厨房、卫生间、阳台。点击步骤或按钮进入现有编辑器；仅点击编辑器中的应用按钮才保存参数。退出后再次进入，会按已保存参数重算状态。</p><div data-finish-guide></div>',actions:[{label:'关闭'}],onOpen:render});
 document.querySelector('[data-guide-heading]')?.focus();
}
function afterRender(){if(session&&session.plan!==PLAN.id){session=null;document.querySelectorAll('[data-guide-editor]').forEach(el=>el.remove());return;}render();}
function end(){session=null;document.querySelectorAll('[data-guide-editor]').forEach(el=>el.remove());}
document.addEventListener('click',e=>{if(e.target.closest('[data-finish-guide-open]')){session=null;open();}});
document.addEventListener('pointerdown',e=>{if(session&&e.target===document.querySelector('#dlg'))end();},true);
document.addEventListener('click',e=>{if(session&&e.target.closest('#dlgClose,#dlgActions [data-i],[data-fab-close]'))end();},true);
document.addEventListener('keydown',e=>{if(session&&e.key==='Escape'&&!FurnishFloorFinishUI.picking())end();},true);
window.FurnishFinishGuideUI={open,attachEditor,attachList,afterRender,afterWallHeightApplied:()=>{if(session&&session.plan===PLAN.id)open(3);}};
})();
