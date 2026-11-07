/* Temporary surface measurements. World coordinates are metres, readouts are mm.
 * Reads production meshes; never edits the design or its 2D measurement records. */
(function(root){
'use strict';
function create({THREE,stage,canvas,camera,hitAt,available,navigationHeld,invalidate,tr,onStart}){
 const ns='http://www.w3.org/2000/svg',button=document.getElementById('vMeasure');
 const overlay=document.createElementNS(ns,'svg');overlay.classList.add('scene-measure-overlay');overlay.setAttribute('aria-hidden','true');stage.append(overlay);
 const panel=document.createElement('section');panel.className='scene-measure-panel';panel.hidden=true;
 panel.innerHTML=`<b>${tr('3D 测量','3D measurement')}</b><output aria-live="polite"></output><small></small><div class="actions"><button class="btn" data-back>${tr('重选终点','Reselect end')}</button><button class="btn" data-clear>${tr('清除','Clear')}</button><button class="btn" data-close>${tr('退出 (Esc)','Exit (Esc)')}</button></div>`;stage.append(panel);
 let enabled=false,a=null,b=null,hover=null,down=null;
 const fmt=v=>String(Math.round(v*1000));
 function status(){
  panel.querySelector('output').textContent=b?`${tr('直线','Distance')} ${fmt(a.distanceTo(b))} mm · ${tr('水平','Horizontal')} ${fmt(Math.hypot(b.x-a.x,b.z-a.z))} mm · ${tr('高差','Height difference')} ${fmt(Math.abs(b.y-a.y))} mm`:a?tr('请选择终点','Choose the end point'):tr('请选择起点','Choose the start point');
  panel.querySelector('small').textContent=tr('点实体表面，靠近顶点自动吸附。拖动旋转／滚轮缩放。结果临时显示，不保存；再次点选开始新测量。','Click surfaces; nearby vertices snap. Drag to orbit / scroll to zoom. Temporary result, not saved; click again for a new measurement.');
  panel.querySelector('[data-back]').disabled=!b;panel.querySelector('[data-clear]').disabled=!a;
 }
 function clear(){a=b=hover=null;down=null;status();update();}
 function set(value){
  if(value&&!available())return;
  enabled=!!value;if(enabled)onStart();else clear();panel.hidden=!enabled;
  button.classList.toggle('on',enabled);button.setAttribute('aria-pressed',String(enabled));canvas.style.cursor=enabled?'crosshair':'';status();update();invalidate();
 }
 function project(p){const v=p.clone().project(camera);return {x:(v.x+1)*stage.clientWidth/2,y:(1-v.y)*stage.clientHeight/2,shown:v.z>=-1&&v.z<=1};}
 function point(e){
  const hit=hitAt(e);if(!hit)return null;
  const pos=hit.object.geometry?.attributes.position,mouse={x:e.clientX-stage.getBoundingClientRect().left,y:e.clientY-stage.getBoundingClientRect().top};
  let best=hit.point.clone(),limit=10,snapped=false;
  // Only vertices on the picked face plane may attract the cursor: a back-side
  // or hidden vertex must not replace the surface the user actually pointed at.
  if(pos&&hit.face){const normal=hit.face.normal.clone().applyMatrix3(new THREE.Matrix3().getNormalMatrix(hit.object.matrixWorld)).normalize();
   for(let i=0;i<pos.count;i++){const v=new THREE.Vector3().fromBufferAttribute(pos,i).applyMatrix4(hit.object.matrixWorld);if(Math.abs(v.clone().sub(hit.point).dot(normal))>.0001)continue;const p=project(v),distance=Math.hypot(p.x-mouse.x,p.y-mouse.y);if(p.shown&&distance<limit){best=v;limit=distance;snapped=true;}}
  }
  if(snapped){
   // Sample just inside the picked face: a ray exactly through a silhouette
   // vertex can miss both triangles because of floating-point edge rounding.
   const probe=best.clone().lerp(hit.point,.02),screen=project(probe),r=stage.getBoundingClientRect(),check=hitAt({clientX:r.left+screen.x,clientY:r.top+screen.y});
   if(!check||check.point.distanceTo(probe)>.0001){best=hit.point.clone();snapped=false;}
  }
  return {p:best,snapped};
 }
 function update(){
  button.disabled=!available();
  if(enabled&&!available()){set(false);return;}
  overlay.replaceChildren();if(!enabled)return;
  const add=(tag,attrs,text)=>{const el=document.createElementNS(ns,tag);for(const [k,v]of Object.entries(attrs))el.setAttribute(k,v);if(text)el.textContent=text;overlay.append(el);};
  const end=b||hover?.p,pa=a&&project(a),pb=end&&project(end);
  if(pa?.shown&&pb?.shown){add('line',{x1:pa.x,y1:pa.y,x2:pb.x,y2:pb.y});const x=Math.max(60,Math.min(stage.clientWidth-60,(pa.x+pb.x)/2)),y=Math.max(22,Math.min(stage.clientHeight-12,(pa.y+pb.y)/2-12));add('text',{x,y,'text-anchor':'middle'},`${fmt(a.distanceTo(end))} mm`);}
  for(const p of [pa,pb])if(p?.shown)add('circle',{cx:p.x,cy:p.y,r:5});
  if(!b&&hover?.snapped&&pb?.shown)add('rect',{x:pb.x-7,y:pb.y-7,width:14,height:14});
 }
 stage.addEventListener('pointerdown',e=>{if(enabled&&e.target===canvas){down=null;if(e.isPrimary!==false&&e.button===0&&!navigationHeld()&&!e.shiftKey&&!e.altKey&&!e.ctrlKey&&!e.metaKey)down={id:e.pointerId,x:e.clientX,y:e.clientY,moved:false};}},true);
 stage.addEventListener('pointermove',e=>{if(!enabled||e.target!==canvas)return;if(down&&down.id===e.pointerId&&Math.hypot(e.clientX-down.x,e.clientY-down.y)>5)down.moved=true;hover=point(e);update();},true);
 stage.addEventListener('pointerup',e=>{
  if(!enabled||e.target!==canvas||e.button!==0)return;
  const d=down;down=null;
  // Block selection, doors and furniture movement, while OrbitControls can
  // still finish its pointer gesture on the canvas.
  if(d&&d.id===e.pointerId&&!d.moved&&Math.hypot(e.clientX-d.x,e.clientY-d.y)<=5){const next=point(e);if(next){if(!a||b){a=next.p;b=null;}else if(a.distanceTo(next.p)>.0001)b=next.p;hover=next;status();update();}}
 },true);
 // OrbitControls installs pointerup dynamically on pointerdown; let it finish
 // normally. The production tap handler checks active() before editing items.
 canvas.addEventListener('dblclick',e=>{if(enabled){e.preventDefault();e.stopImmediatePropagation();}},true);
 canvas.addEventListener('pointercancel',()=>{down=null;});
 canvas.addEventListener('pointerleave',()=>{hover=null;update();});
 button.onclick=()=>set(!enabled);
 panel.querySelector('[data-close]').onclick=()=>set(false);panel.querySelector('[data-clear]').onclick=clear;
 panel.querySelector('[data-back]').onclick=()=>{b=null;hover=null;status();update();};
 for(const name of ['pointerdown','pointerup','dblclick','wheel'])panel.addEventListener(name,e=>e.stopPropagation());
 window.addEventListener('keydown',e=>{
  if(!available()||!document.getElementById('dlg').hidden||e.target.closest('input,select,textarea,[contenteditable="true"]')||e.ctrlKey||e.metaKey||e.altKey)return;
  const key=e.key.toLowerCase();if(key==='m'){e.preventDefault();e.stopImmediatePropagation();if(!e.repeat)set(!enabled);}
  else if(enabled&&['escape','v','delete','backspace'].includes(key)){e.preventDefault();e.stopImmediatePropagation();if(key==='delete'||key==='backspace')clear();else set(false);}
 },true);
 return {active:()=>enabled,set,clear,update};
}
root.FurnishSceneMeasure={create};
})(globalThis);
