/* One-wall origin drafts; only the existing wall editor's mutate path saves. */
(function(){
'use strict';
const T=FurnishWallTiling,P=FurnishProject;
async function open(face){
 const p=P.effectivePlan(PLAN,state),current=T.faces(p,state).find(f=>T.same(f,face)),record=current&&T.record(state,current);
 if(!record||record.enabled===false)return toast('请先启用并应用此墙排版');
 const e=T.elevation(p,state,current);if(![e.position,e.floorZ,e.originZ].every(Number.isFinite)||!e.sections.length)return toast('请先核对墙面厚度、完成地面与起铺标高');
 closeDialog();closeFabEditor(false);select({kind:'room',id:current.roomId});drawer('panel',false);const planId=PLAN.id;
 if(!is3D())await setView('3d');if(PLAN.id!==planId||!is3D()||switching)return;
 const layout={...e.layout},saved=[layout.offset,layout.startHeight],scene=document.querySelector('#view3d');let frame=0,focusFrame=0,drag=null,pending=null,hint=null;
 const host=mountFabEditor('wall-origin3d',`${state.rooms[current.roomId]?.name||''} · 墙砖独立起点`, `<section data-wall-origin3d-editor><p>拖动橙色圆环，在绿色轮廓内独立调整此墙。靠近墙角竖线或墙地交线12像素内吸附，沿线继续拖动，拉开恢复自由调整。</p>${record.followFloor?'<p class="muted">此墙当前自动跟随地砖。应用独立起点后仅此墙改为手动，取消保留原关联。</p>':''}<div class="form"><label>沿墙偏移 mm<input data-wall-origin="offset" type="number" step="any" value="${saved[0]}"></label><label>${layout.reference==='floor'?'距完成地面':'绝对起铺标高'} mm<input data-wall-origin="startHeight" type="number" step="any" value="${saved[1]}"></label></div><div class="actions"><button class="btn" data-wall-origin-focus>正对此墙</button><button class="btn" data-wall-origin-reset>恢复原起点</button></div><p role="status" data-wall-origin-status></p><p class="project-error" role="alert" data-wall-origin-error></p><div class="actions"><button class="btn" data-fab-close>取消</button><button class="btn primary" data-wall-origin-apply>应用此墙起点</button></div><p class="muted">仅改变此墙的横向和竖向起点；砖规格、厚度、地面和其它墙面保持。拖动时镜头固定，Esc撤回本次拖动；门窗洞口不可落点。绿色轮廓及前方墙体剖切仅供临时观察。</p></section>`,{allowCanvas:event=>event?.type==='keydown'?!!drag:true,dispose});
 const field=k=>host.querySelector(`[data-wall-origin="${k}"]`),status=host.querySelector('[data-wall-origin-status]'),error=host.querySelector('[data-wall-origin-error]'),read=()=>({...layout,...Object.fromEntries(['offset','startHeight'].map(k=>[k,field(k).value.trim()===''?NaN:Number(field(k).value)]))});
 const label=k=>k==='intersection'?'已吸附墙角与地面交点；':k==='corner'?'已吸附墙角竖线，可上下拖动；':k==='floor'?'已吸附墙地交线，可沿线拖动；':'';
 function consume(event){event.preventDefault();event.stopImmediatePropagation();}
 function generate(){cancelAnimationFrame(frame);frame=0;try{const values=read(),result=View3D.previewWallOrigin(current,values,hint);if(!result)throw Error('三维场景尚未就绪');error.textContent='';host.dataset.origin=JSON.stringify([values.offset,values.startHeight]);status.textContent='此墙已实时重排，待应用；地面与其它墙面保持。';}catch(ex){View3D.clearWallOriginPreview();delete host.dataset.origin;error.textContent=ex.message;status.textContent='输入无效，已恢复保存的墙砖排版。';}}
 function flush(){if(!pending)return;const next=pending;pending=null;hint=next.point;field('offset').value=Number(next.values[0].toFixed(2));field('startHeight').value=Number(next.values[1].toFixed(2));generate();if(drag){drag.kind=next.kind;status.textContent=label(next.kind)+'拖动中：此墙实时重排，松手保留预览，Esc撤回。';}}
 function move(event){
  if(!drag){if(event.target.tagName==='CANVAS')event.target.style.cursor=View3D.wallOriginHandleHit(event.clientX,event.clientY)?'grab':'';return;}
  if(event.pointerId!==drag.pid){consume(event);return;}consume(event);if(!drag.moved&&Math.hypot(event.clientX-drag.x,event.clientY-drag.y)<3)return;
  const at=View3D.wallOriginDragPoint(event.clientX,event.clientY,drag.anchor.map((v,i)=>v-[drag.start.u,drag.start.z][i]));if(!at)return;
  const delta=[at.u-drag.start.u,at.z-drag.start.z];drag.moved=true;pending={point:drag.anchor.map((v,i)=>v+delta[i]),values:drag.before.map((v,i)=>v+delta[i]),kind:at.snapKind};if(!frame)frame=requestAnimationFrame(flush);
 }
 function finish(cancel=false,restore=true){
  if(!drag)return;const d=drag;cancelAnimationFrame(frame);frame=0;if(!cancel)flush();drag=null;pending=null;delete host.dataset.dragging;scene.classList.remove('wall-origin-dragging');d.canvas.style.cursor='';View3D.lockFloorOriginDrag(false);if(d.canvas.hasPointerCapture(d.pid))d.canvas.releasePointerCapture(d.pid);
  if(cancel&&restore){hint=d.hint;field('offset').value=d.before[0];field('startHeight').value=d.before[1];generate();status.textContent='已撤回本次拖动，保留拖动前草稿。';}else if(restore)status.textContent=label(d.kind)+'此墙拖动预览已保留，待应用。';
 }
 function down(event){
  if(drag){consume(event);return;}if(event.target.tagName!=='CANVAS'||event.button!==0||event.isPrimary===false)return;
  const handle=View3D.wallOriginHandleHit(event.clientX,event.clientY);if(!handle)return;consume(event);View3D.lockFloorOriginDrag(true);const start=View3D.wallOriginDragPoint(event.clientX,event.clientY,undefined,{start:true});if(!start){View3D.lockFloorOriginDrag(false);return;}
  drag={pid:event.pointerId,canvas:event.target,x:event.clientX,y:event.clientY,start,anchor:handle.point,before:[Number(field('offset').value),Number(field('startHeight').value)],hint:hint?.slice()};event.target.setPointerCapture(event.pointerId);host.dataset.dragging='true';scene.classList.add('wall-origin-dragging');status.textContent='拖动此墙起点，靠近墙角竖线与墙地交线可吸附。';
 }
 function end(event){if(drag&&event.pointerId===drag.pid){consume(event);if(event.type==='pointerup')move(event);finish(event.type!=='pointerup');}}
 function escape(event){if(event.key==='Escape'&&drag){consume(event);finish(true);}}
 function blur(){finish(true);}
 function dispose(){cancelAnimationFrame(frame);cancelAnimationFrame(focusFrame);finish(true,false);scene.removeEventListener('pointerdown',down,true);scene.removeEventListener('pointermove',move,true);for(const type of ['pointerup','pointercancel','lostpointercapture'])scene.removeEventListener(type,end,true);document.removeEventListener('keydown',escape,true);window.removeEventListener('blur',blur);scene.classList.remove('wall-origin-dragging');scene.querySelector('canvas')?.style.removeProperty('cursor');View3D.clearWallOriginPreview();}
 for(const input of host.querySelectorAll('[data-wall-origin]'))input.oninput=()=>{hint=null;cancelAnimationFrame(frame);frame=requestAnimationFrame(generate);};
 host.querySelector('[data-wall-origin-focus]').onclick=()=>View3D.focusWallOrigin();host.querySelector('[data-wall-origin-reset]').onclick=()=>{hint=null;field('offset').value=saved[0];field('startHeight').value=saved[1];generate();};
 host.querySelector('[data-wall-origin-apply]').onclick=()=>{try{const next=T.edit(state,P.effectivePlan(PLAN,state),current,{layout:read(),followFloor:false});closeFabEditor(false);if(JSON.stringify(next.wallTiling)!==JSON.stringify(state.wallTiling))mutate(()=>state.wallTiling=next.wallTiling);toast('此墙独立起铺点已应用，可一次撤销');}catch(ex){error.textContent=ex.message;}};
 scene.addEventListener('pointerdown',down,true);scene.addEventListener('pointermove',move,true);for(const type of ['pointerup','pointercancel','lostpointercapture'])scene.addEventListener(type,end,true);document.addEventListener('keydown',escape,true);window.addEventListener('blur',blur);generate();focusFrame=requestAnimationFrame(()=>{focusFrame=0;if(host.isConnected)View3D.focusWallOrigin();});
}
window.FurnishWallOriginUI={open};
})();
