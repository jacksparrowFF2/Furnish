/* Shared-model preview: structure picking, constrained drags and dimension overlays. */
(function(root){
 // Shared SVG projection, collision avoidance and dimension-line styling.
 function projectDimensionLabels({THREE,cam,canvas,labels,centerPoint,rulers,rulerPath,occupied=[],blocked=[]}){
  const rect=canvas.getBoundingClientRect(),width=rect.width,height=rect.height,paths=[];
   const project=p=>{const v=p.clone().project(cam);return {x:(v.x+1)*width/2,y:(1-v.y)*height/2,visible:v.z>=-1&&v.z<=1&&Math.abs(v.x)<=1&&Math.abs(v.y)<=1};};
   const center=project(centerPoint);
   const line=(a,b)=>`M${a.x.toFixed(1)},${a.y.toFixed(1)}L${b.x.toFixed(1)},${b.y.toFixed(1)}`;
   // Numbers take priority. Move crowded labels with leaders; omit unreadable dimensions.
   const priority=item=>item.pegPadding?-1:item.drag?-.5:item.column!==undefined?0:item.boardElevation?0.5:item.netDepth||item.netWidth||item.offset>=26?1:item.doorSize?2:3;
   for(const item of [...labels].sort((a,b)=>priority(a)-priority(b))){const {el,point,a,b,offset}=item,p=project(point);let x=p.x,y=p.y,draw='',anchor={x,y};el.hidden=!p.visible;if(el.hidden)continue;
    if(a){const start=project(a),end=project(b),dx=end.x-start.x,dy=end.y-start.y,length=Math.hypot(dx,dy);if(!start.visible||!end.visible||length<14&&!item.pegPadding&&!item.netDepth&&!item.boardElevation){el.hidden=true;continue;}
     if(!(item.netDepth||item.boardElevation)||length>=14){
     const divisor=length||1;let nx=-dy/divisor,ny=dx/divisor;if(nx*(p.x-center.x)+ny*(p.y-center.y)<0){nx=-nx;ny=-ny;}
     const u={x:start.x+nx*offset,y:start.y+ny*offset},v={x:end.x+nx*offset,y:end.y+ny*offset};x=(u.x+v.x)/2;y=(u.y+v.y)/2;anchor={x,y};
     draw=line(start,{x:u.x+nx*4,y:u.y+ny*4})+line(end,{x:v.x+nx*4,y:v.y+ny*4})+line(u,v);
     for(const q of [u,v])draw+=line({x:q.x-dx/divisor*3-nx*3,y:q.y-dy/divisor*3-ny*3},{x:q.x+dx/divisor*3+nx*3,y:q.y+dy/divisor*3+ny*3});
     }
    }
    if(item.pegPadding){const shifts={left:[-135,0],right:[135,0],top:[0,-48],bottom:[0,48]},shift=shifts[item.pegPadding];x=p.x+shift[0];y=p.y+shift[1];anchor={x:p.x,y:p.y};draw=line(project(a),project(b));}
    const ew=el.offsetWidth||Math.max(24,el.textContent.length*7+8),eh=el.offsetHeight||22;
    x=Math.max(ew/2+5,Math.min(width-ew/2-5,x));y=Math.max(eh/2+5,Math.min(height-eh/2-5,y));
    let placed=false;placement:for(const xx of (item.netDepth||item.netWidth||item.netHeight||item.boardElevation?[x,x-100,x+100,x-180,x+180]:[x]))for(const shift of [0,24,-24,48,-48,72,-72]){const yy=y+shift,box={left:xx-ew/2-3,right:xx+ew/2+3,top:yy-eh/2-3,bottom:yy+eh/2+3};if(box.left<2||box.right>width-2||box.top<2||box.bottom>height-2||occupied.concat(item.editable&&!item.drag?blocked:[]).some(o=>box.left<o.right&&box.right>o.left&&box.top<o.bottom&&box.bottom>o.top))continue;occupied.push(box);x=xx;y=yy;placed=true;break placement;}
    if(!placed&&item.column===undefined){el.hidden=true;continue;}
    if(Math.hypot(x-anchor.x,y-anchor.y)>8)draw+=line(anchor,{x,y});
    el.style.left=`${x}px`;el.style.top=`${y}px`;paths.push(draw);
   }

  rulers.setAttribute('viewBox',`0 0 ${width} ${height}`);rulerPath.setAttribute('d',paths.join(''));return project;
 }


 function placementGhost({THREE,scene,box,host,furniture,plan,current,zoneBox}){
  let ghost;const clear=()=>{delete host.dataset.builderDropPreview;if(!ghost)return;scene.remove(ghost);ghost.traverse(o=>{o.geometry?.dispose();if(o.userData.cabinetOwnMaterial)o.material?.dispose();});ghost=null;};
  return {clear,show(value,pick,options){clear();if(!value)return;const B=root.FurnishCabinetBuilder;ghost=root.FurnishCabinetModel.build(THREE,value,box,{doors:'normal',furniture,plan});let position=options?.position;
   if(!position){const anchor=current().cabinet.boxes[0]?.id,a=B.layout(current()).find(p=>p.box.id===anchor),b=B.layout(value).find(p=>p.box.id===anchor);position=a&&b?{x:a.x-b.x,y:a.y-b.y,z:a.z-b.z}:{x:0,y:0,z:0};}
   ghost.position.set(position.x/1000,position.y/1000,position.z/1000);ghost.traverse(o=>{if(!o.isMesh)return;const p=o.userData.cabinetBuilder;o.visible=p?.boxId===pick.boxId&&(!pick.componentId||p.componentId===pick.componentId);o.material=o.material.clone();o.material.transparent=true;o.material.opacity=.45;o.material.depthWrite=false;o.material.color.set('#2d9f76');o.userData.cabinetOwnMaterial=true;});const zone=zoneBox?.(value,pick);if(zone){const wire=new THREE.Box3Helper(zone,0x2d9f76);wire.userData.cabinetOwnMaterial=true;ghost.add(wire);}if(options?.flip){ghost.position.x*=-1;ghost.scale.x=-1;}scene.add(ghost);host.dataset.builderDropPreview=JSON.stringify({position,selected:pick});
  }};
 }
 function componentGesture({THREE,canvas,camera,controls,rayAt,hitAt,infoOf,settings,actions,isPlacing,onState,resetDown,afterEnd}){
  let drag=null;const set=value=>{drag=value;onState(value);};
  function end(cancel=false){if(!drag)return false;const d=drag;set(null);actions.adjust?.(d.pick,d.value,cancel?'cancel':'end');controls().enabled=true;afterEnd?.(d);if(canvas.hasPointerCapture(d.id))canvas.releasePointerCapture(d.id);canvas.style.cursor='';return true;}
  function start(e,pick,point,{part=null,dimensionField=null}={}){const info=infoOf(pick);if(!info)return false;const normal=camera().getWorldDirection(new THREE.Vector3());normal[info.axis]=0;if(normal.lengthSq()<1e-8)normal.set(0,0,1);normal.normalize();const plane=new THREE.Plane().setFromNormalAndCoplanarPoint(normal,point),start=rayAt(e).ray.intersectPlane(plane,new THREE.Vector3());if(!start)return false;e.preventDefault();e.stopImmediatePropagation();resetDown();actions.select?.(pick);if(actions.adjust?.(pick,info.position,'start')===false)return false;set({builder:true,id:e.pointerId,pick,axis:info.axis,direction:info.direction??1,value:info.position,plane,start,x:e.clientX,y:e.clientY,moved:false,threshold:part?5:3,part,dimensionField,size:actions.size?.()});controls().enabled=false;canvas.focus({preventScroll:true});canvas.setPointerCapture(e.pointerId);canvas.style.cursor=info.axis==='y'?'ns-resize':'ew-resize';return true;}
  canvas.addEventListener('pointerdown',e=>{if(e.button!==0||isPlacing?.())return;const hit=hitAt(rayAt(e));if(hit&&!(hit.kind==='multiDoor'&&settings().interaction!=='edit'))start(e,hit.pick,hit.point,{part:hit.part});},true);
  canvas.addEventListener('pointermove',e=>{if(drag?.id!==e.pointerId)return;e.preventDefault();e.stopImmediatePropagation();if(!drag.moved&&Math.hypot(e.clientX-drag.x,e.clientY-drag.y)<drag.threshold)return;drag.moved=true;const pos=rayAt(e).ray.intersectPlane(drag.plane,new THREE.Vector3());if(pos)actions.adjust?.(drag.pick,drag.value+(pos[drag.axis]-drag.start[drag.axis])*1000*drag.direction,'move',{snap:settings().snap&&!e.altKey,clamp:true});},true);
  canvas.addEventListener('pointerup',e=>{if(drag?.id!==e.pointerId)return;e.preventDefault();e.stopImmediatePropagation();const d=drag;end();if(!d.moved){if(d.dimensionField)actions.editDimension?.(d.pick,d.dimensionField);else if(d.part&&settings().doors==='normal'&&settings().interaction==='open')actions.activateDoor?.(d.part);}},true);canvas.addEventListener('pointercancel',()=>end(true),true);canvas.addEventListener('lostpointercapture',()=>{if(drag)end(true);},true);
  canvas.addEventListener('keydown',e=>{if(e.key==='Escape'&&end(true)){e.preventDefault();e.stopPropagation();return;}const pick=actions.selected?.(),info=pick&&infoOf(pick),keys=info?(info.axis==='y'?['ArrowDown','ArrowUp']:['ArrowLeft','ArrowRight']):[];if(!keys.includes(e.key)||drag)return;e.preventDefault();e.stopImmediatePropagation();actions.adjust?.(pick,info.position+(keys.indexOf(e.key)?1:-1)*(e.shiftKey?1:10)*(info.direction??1),'single',{snap:false,clamp:true});});return {start,end};
 }
 function componentDimensions({THREE,current,selected,settings,labelLayer,labels,actions,transform,boxOffset=0,labelsOnly=false}){const B=root.FurnishCabinetBuilder,measures=B.measurements(current);
  function dimensions(){
   if(!settings.dimensions)return;const fmt=v=>Number(v.toFixed(2)),point=(x,y,z)=>transform?transform(x,y,z):new THREE.Vector3(x/1000,y/1000,z/1000),add=(caption,value,a,b,{pick,field,offset=18,...flags}={})=>{const el=document.createElement(field?'button':'span');el.className='cab-dimension';if(field==='boardWidth'&&B.shelfRemovable(current,pick)){el.classList.add('cab-removable-dimension');el.dataset.collisionIgnored=B.shelfCollisionIgnored(current,pick);}el.textContent=`${caption} ${fmt(value)} mm`;if(flags.netWidth)el.dataset.netWidth=value;if(flags.netDepth)el.dataset.netDepth=value;if(flags.netHeight)el.dataset.netHeight=value;if(field){el.type='button';el.classList.add('cab-shelf-dimension');el.dataset.builderDimension=field;el.title='点击在右侧编辑 '+caption;el.onclick=e=>{e.stopPropagation();actions.editDimension?.(pick,field);};if(flags.drag){el.dataset.builderHandle=pick.segmentId;el.title='拖动调整门缝，单击编辑数值';el.onclick=null;el.onpointerdown=e=>{if(e.button===0)actions.startDrag?.(e,pick,a.clone().add(b).multiplyScalar(.5),{dimensionField:field});};}}labelLayer.appendChild(el);labels.push({el,point:a.clone().add(b).multiplyScalar(.5),a,b,offset,editable:!!field,...flags});};
   for(const row of B.layout(current)){const index=current.cabinet.boxes.findIndex(b=>b.id===row.box.id),el=boxLabel('柜箱 '+(boxOffset+index+1),{boxId:row.box.id},actions.select);el.setAttribute('aria-pressed',String(selected?.boxId===row.box.id));labelLayer.appendChild(el);labels.push({el,point:point(row.x,row.y+row.box.h-55,row.z+row.box.d/2+25),column:index});}
   if(labelsOnly)return;
   const all=settings.dimensionScope==='all',p=selected?B.selection(current,selected).component:null;
   if(all||!selected?.componentId){const z=current.d/2+35;add('总外宽',current.w,point(-current.w/2,0,z),point(current.w/2,0,z),{offset:32});add('总外高',current.h,point(-current.w/2,0,z),point(-current.w/2,current.h,z),{offset:42});}
   if(B.horizontalSelection(current,selected)&&!all){const v=B.shelfInfo(current,selected),z=v.front+25,x=v.x;add(B.shelfRemovable(current,selected)?'可拆卸层板宽':'层板宽',v.width,point(x-v.width/2,v.bottom,z),point(x+v.width/2,v.bottom,z),{pick:selected,field:'boardWidth',netWidth:true});add('层板深',v.depth,point(x+v.width*.3,v.bottom,v.back),point(x+v.width*.3,v.bottom,v.front),{netDepth:true});for(const side of ['lower','upper']){const gap=v[side];add(side==='lower'?'下方净高':'上方净高',gap.height,point(x-v.width/2,gap.bottom,z),point(x-v.width/2,gap.top,z),{pick:selected,field:side+'Gap',offset:28,netHeight:true});}add('板底距柜底',v.position,point(x, v.y,z),point(x,v.bottom,z),{pick:selected,field:'shelfPosition',offset:52,boardElevation:true});return;}
   if(p?.kind==='drawerModule'&&!all){const v=B.drawerInfo(current,selected),z=v.front+25;add('抽盒底基准',v.position,point(v.x,v.y,z),point(v.x,v.y+v.position,z),{pick:selected,field:'drawerBottom',offset:32,boardElevation:true});}
   if(p?.kind==='divider'&&!all){const row=B.layout(current).find(v=>v.box.id===selected.boxId),v=B.dividerInfo(current,selected),b=row.box,x=row.x-b.w/2+b.thickness+v.position,z=row.z+b.d/2+25,y=row.y+b.h*.45;add('左侧净宽',v.left,point(x-b.thickness/2-v.left,y,z),point(x-b.thickness/2,y,z),{pick:selected,field:'leftNet',netWidth:true});add('右侧净宽',v.right,point(x+b.thickness/2,y,z),point(x+b.thickness/2+v.right,y,z),{pick:selected,field:'rightNet',netWidth:true});return;}
   if(!all)for(const {label,value,a,b,...g}of B.componentGuides(current,selected))add(label,value,point(...a),point(...b),{...g,boardElevation:true,offset:28});
   for(const m of measures){if(!all&&selected?.boxId&&m.boxId!==selected.boxId||!all&&(p?.bay??selected?.bay)&&m.bay!==(p?.bay??selected.bay))continue;const pick={boxId:m.boxId,bay:m.bay};for(const [i,gap]of m.spaces.entries()){const z=m.front+20; if(!i)add('净宽',m.width,point(m.left,gap.bottom,z),point(m.right,gap.bottom,z),{pick,field:'bayNetWidth',netWidth:true});const id=gap.upperBoard??gap.lowerBoard;add('净高',gap.height,point(m.left,gap.bottom,z),point(m.left,gap.top,z),{...(id?{pick:id,field:gap.upperBoard?'lowerGap':'upperGap'}:{}),netHeight:true});for(const d of gap.depths){const y=d.bottom+Math.min(70,(d.top-d.bottom)/3),x=m.left+m.width*.8;add(d.openFront?'前方开放 · 参考深':'净深',d.depth,point(x,y,d.rear),point(x,y,d.front),{netDepth:true});}}}
  }
  dimensions();
 }
 function boxLabel(caption,pick,select){const el=document.createElement('button');el.type='button';el.className='cab-dimension cab-column-label';el.textContent=caption;el.dataset.builderBoxLabel=pick.boxId;el.title='选择'+caption;el.onclick=e=>{e.stopPropagation();select?.(pick);};return el;}
 // Component cabinets expose production geometry directly; assembly drag/drop
 // uses a front-view placement plane, with the same mm model coordinates.
 function createBuilder({THREE,OrbitControls,box,host,f,actions,background,furniture,plan}){
  const B=root.FurnishCabinetBuilder,settings={dimensions:true,dimensionScope:'current',snap:true,interaction:'open'};
  const renderer=new THREE.WebGLRenderer({antialias:true}),scene=new THREE.Scene(),canvas=renderer.domElement;
  renderer.setPixelRatio(Math.min(devicePixelRatio,2));host.replaceChildren(canvas);scene.background=new THREE.Color(background);scene.add(new THREE.HemisphereLight(0xffffff,0x8f8170,1.5));const light=new THREE.DirectionalLight(0xffffff,1.8);light.position.set(3,5,4);scene.add(light);
  let camera=new THREE.OrthographicCamera(-1,1,1,-1,.01,100),controls=new OrbitControls(camera,canvas),model,ghost,helper,current=f,selected,frame,dead=false,front=true,doorView='hidden';
  const ray=new THREE.Raycaster(),pointer=new THREE.Vector2(),labelLayer=document.createElement('div'),rulers=document.createElementNS('http://www.w3.org/2000/svg','svg'),rulerPath=document.createElementNS('http://www.w3.org/2000/svg','path'),readout=document.createElement('div');let labels=[],measures=[],drag=null,tinted=null;
  labelLayer.className='cab-dimensions';rulers.setAttribute('class','cab-dimension-lines');rulers.appendChild(rulerPath);labelLayer.appendChild(rulers);readout.className='cab-drag-readout';readout.hidden=true;host.append(labelLayer,readout);canvas.tabIndex=0;canvas.setAttribute('aria-label','柜体编辑模型，点击部件；拖动组件定位或调整尺寸，方向键微调，Shift精调，Alt关闭吸附');
  const disposeModel=g=>{if(!g)return;scene.remove(g);g.traverse(o=>{o.geometry?.dispose();if(o.userData.cabinetOwnMaterial)o.material?.dispose();});};
  function zoneBox(value,pick){const B=root.FurnishCabinetBuilder,{box,component}=B.selection(value,pick);if(component?.kind!=='openZone'||pick.board)return null;const row=B.layout(value).find(v=>v.box.id===box.id),bay=B.bays(box).find(v=>v.id===component.bay),zone=B.zoneBounds(box,component);return new THREE.Box3(new THREE.Vector3((row.x+bay.left)/1000,(row.y+zone.bottom)/1000,(row.z-box.d/2)/1000),new THREE.Vector3((row.x+bay.right)/1000,(row.y+zone.top)/1000,(row.z+box.d/2)/1000));}
  const editInfo=pick=>B.componentEditInfo(current,pick);
  function highlight(){if(tinted){tinted.mesh.material=tinted.original;tinted.material.dispose();tinted=null;}if(helper){scene.remove(helper);helper.geometry.dispose();helper.material.dispose();helper=null;}readout.hidden=true;if(!selected||!model)return;const bounds=zoneBox(current,selected)??new THREE.Box3();model.traverse(o=>{const p=o.userData.cabinetBuilder;if(o.isMesh&&p?.boxId===selected.boxId&&(!selected.componentId||p.componentId===selected.componentId)&&(!selected.board||p.board===selected.board)&&(!selected.leafId||p.leafId===selected.leafId)){bounds.union(new THREE.Box3().setFromObject(o));if(B.horizontalSelection(current,selected)&&!tinted){const original=o.material,material=original.clone();material.color.set(0x168de2);o.material=material;tinted={mesh:o,original,material};}}});if(!bounds.isEmpty()){helper=new THREE.Box3Helper(bounds,0x168de2);scene.add(helper);}const v=editInfo(selected);if(v){readout.textContent=`${v.label} ${Number(v.position.toFixed(2))} mm · 拖动或方向键调整 · Shift 1 mm / Alt 不吸附`;readout.hidden=false;}}
  function dimensions(){labelLayer.replaceChildren(rulers);labels=[];labelLayer.hidden=!settings.dimensions;componentDimensions({THREE,current,selected,settings,labelLayer,labels,actions:{...actions,startDrag}});}
  function resize(){const w=host.clientWidth||600,h=host.clientHeight||500;renderer.setSize(w,h);if(front){const size=Math.max(current.h/1000*1.25,current.w/1000/(w/h)*1.25,.8);camera.left=-size*w/h/2;camera.right=size*w/h/2;camera.top=size/2;camera.bottom=-size/2;}else camera.aspect=w/h;camera.updateProjectionMatrix();}
  function fit(){const h=current.h/1000,w=current.w/1000,d=current.d/1000,aspect=(host.clientWidth||600)/(host.clientHeight||500),span=Math.max(w,h,d,w/aspect);controls.target.set(0,h/2,0);camera.position.set(front?0:span*1.5,front?h/2:h*.85,front?Math.max(w,h,d)*3:span*2.6);controls.enableRotate=!front;controls.enableDamping=true;controls.update();resize();}
  function update(value,{reframe=false}={}){const changed=!model||['w','d','h'].some(k=>current[k]!==value[k]);if(tinted){tinted.mesh.material=tinted.original;tinted.material.dispose();tinted=null;}current=value;disposeModel(model);model=root.FurnishCabinetModel.build(THREE,value,box,{doors:doorView,outlines:true,removableHints:true,furniture,plan});scene.add(model);model.updateMatrixWorld(true);measures=B.measurements(value);if(!drag){if(changed||reframe)fit();else resize();}highlight();dimensions();}
  const projectPoint=(x,y)=>{const rect=canvas.getBoundingClientRect();if(!front||x<rect.left||x>rect.right||y<rect.top||y>rect.bottom)return null;pointer.set((x-rect.left)/rect.width*2-1,-(y-rect.top)/rect.height*2+1);ray.setFromCamera(pointer,camera);const out=new THREE.Vector3();return ray.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0,0,1),0),out)?{x:out.x*1000,y:out.y*1000}:null;};
  let down;canvas.onpointerdown=e=>{down=e.button===0?[e.clientX,e.clientY]:null;};canvas.onpointercancel=()=>{down=null;};canvas.onpointerup=e=>{const start=down;down=null;if(!start||Math.hypot(e.clientX-start[0],e.clientY-start[1])>5)return;const rect=canvas.getBoundingClientRect();pointer.set((e.clientX-rect.left)/rect.width*2-1,-(e.clientY-rect.top)/rect.height*2+1);ray.setFromCamera(pointer,camera);const hit=componentHit(ray);if(hit){const data=hit.object.userData;actions?.select?.(data.cabinetBuilder);canvas.focus({preventScroll:true});if(data.cabinetPart&&doorView==='normal'&&settings.interaction==='open')actions?.activateDoor?.(data.cabinetPart);}};
  const rayAt=e=>{const r=canvas.getBoundingClientRect();ray.setFromCamera(new THREE.Vector2((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1),camera);return ray;};
  function endDrag(cancel=false){return gesture.end(cancel);}
  function componentHit(r){
   const actual=r.intersectObject(model,true).find(v=>v.object.isMesh&&!v.object.userData.cabinetIgnorePick&&v.object.userData.cabinetBuilder),data=actual?.object.userData.cabinetBuilder,chosen=selected&&B.selection(current,selected).component;
   if(data&&data.kind!=='box'&&!(chosen?.kind==='openZone'&&!selected.board&&data.componentId===selected.componentId))return actual;
   let best=actual;for(const row of B.layout(current))for(const p of row.box.components.filter(p=>p.kind==='openZone')){const pick={boxId:row.box.id,componentId:p.id},bounds=zoneBox(current,pick),point=r.ray.intersectBox(bounds,new THREE.Vector3());if(!point)continue;const distance=r.ray.origin.distanceTo(point);if(!best||distance<best.distance+.0001)best={point,distance,object:{userData:{cabinetBuilder:pick}}};}return best;
  }
  function startDrag(...args){return gesture.start(...args);}
  const gesture=componentGesture({THREE,canvas,camera:()=>camera,controls:()=>controls,rayAt,hitAt:r=>{const h=componentHit(r),data=h?.object.userData;return data?{pick:data.cabinetBuilder,point:h.point,part:data.cabinetPart?{...data.cabinetPart}:null,kind:B.selection(current,data.cabinetBuilder).component?.kind}:null;},infoOf:editInfo,settings:()=>({...settings,doors:doorView}),actions:{...actions,selected:()=>selected,size:()=>[current.w,current.h,current.d]},isPlacing:actions.isPlacing,onState:value=>drag=value,resetDown:()=>down=null,afterEnd:d=>{if(d.size.some((v,i)=>v!==[current.w,current.h,current.d][i]))fit();}});
  const placingGhost=placementGhost({THREE,scene,box,host,furniture,plan,current:()=>current,zoneBox});
  const observer=new ResizeObserver(resize);observer.observe(host);update(f);function loop(){if(dead)return;frame=requestAnimationFrame(loop);if(!drag)controls.update();renderer.render(scene,camera);if(settings.dimensions){const blocked=[];model.traverse(o=>{if(!o.isMesh||!o.visible||!o.userData.cabinetPart&&!B.horizontalSelection(current,o.userData.cabinetBuilder))return;const b=new THREE.Box3().setFromObject(o),points=[];for(const x of [b.min.x,b.max.x])for(const y of [b.min.y,b.max.y])for(const z of [b.min.z,b.max.z]){const p=new THREE.Vector3(x,y,z).project(camera);points.push({x:(p.x+1)*host.clientWidth/2,y:(1-p.y)*host.clientHeight/2});}blocked.push({left:Math.min(...points.map(p=>p.x))-8,right:Math.max(...points.map(p=>p.x))+8,top:Math.min(...points.map(p=>p.y))-8,bottom:Math.max(...points.map(p=>p.y))+8});});projectDimensionLabels({THREE,cam:camera,canvas,labels,blocked,centerPoint:new THREE.Vector3(0,current.h/2000,0),rulers,rulerPath,occupied:readout.hidden?[]:[{left:8,top:8,right:Math.min(host.clientWidth-8,700),bottom:40}]});}}loop();
  return {update,projectPoint,selectPart:value=>{selected=value;highlight();dimensions();},cancelDrag:()=>endDrag(true),focus:()=>canvas.focus({preventScroll:true}),setView:options=>{Object.assign(settings,options);const next=options.front??front;doorView=options.doors??doorView;const changed=next!==front;if(changed){front=next;controls.dispose();camera=front?new THREE.OrthographicCamera(-1,1,1,-1,.01,100):new THREE.PerspectiveCamera(38,1,.01,100);controls=new OrbitControls(camera,canvas);}update(current,{reframe:changed});},ghost:placingGhost.show,dispose:()=>{dead=true;drag=null;if(tinted){tinted.mesh.material=tinted.original;tinted.material.dispose();tinted=null;}cancelAnimationFrame(frame);observer.disconnect();disposeModel(ghost);disposeModel(model);if(helper){helper.geometry.dispose();helper.material.dispose();}placingGhost.clear();controls.dispose();renderer.dispose();host.replaceChildren();}};
 }
 function create({THREE,OrbitControls,box,host,f,actions,buildDevice=null,background,furniture=[],plan=null,elevation=null}){
  if(f.cabinet?.version===2)return createBuilder({THREE,OrbitControls,box,host,f,actions,background,furniture,plan});
  const C=root.FurnishCabinet,r=new THREE.WebGLRenderer({antialias:true}),sc=new THREE.Scene();let cam=new THREE.PerspectiveCamera(38,1,.01,100);
  r.setPixelRatio(Math.min(devicePixelRatio,2));r.toneMapping=THREE.ACESFilmicToneMapping;host.replaceChildren(r.domElement);
  sc.background=new THREE.Color(background);sc.add(new THREE.HemisphereLight(0xffffff,0x8f8170,1.5));
  const light=new THREE.DirectionalLight(0xffffff,1.8);light.position.set(3,5,4);sc.add(light);
  const cv=r.domElement;cv.tabIndex=0;cv.setAttribute('aria-label',f.kitchen?'厨房三维预览：拖动旋转，触摸板双指平移／捏合缩放，鼠标滚轮缩放':'柜体三维预览：拖动层板或分隔板；方向键微调');
  const readout=document.createElement('div');readout.className='cab-drag-readout';readout.hidden=true;host.appendChild(readout);
  const labelLayer=document.createElement('div');labelLayer.className='cab-dimensions';host.appendChild(labelLayer);
  const selectionLayer=document.createElementNS('http://www.w3.org/2000/svg','svg');selectionLayer.setAttribute('class','cab-selection-outline');selectionLayer.setAttribute('aria-hidden','true');
  const selectionPaths=['halo','edge'].map(role=>{const path=document.createElementNS(selectionLayer.namespaceURI,'path');path.setAttribute('class',`cab-selection-${role}`);selectionLayer.appendChild(path);return path;});host.appendChild(selectionLayer);
  const doorSizes=document.createElement('details');doorSizes.className='cab-door-sizes';host.appendChild(doorSizes);
  const drawerLayer=document.createElement('div');drawerLayer.className='cab-drawer-edit';host.appendChild(drawerLayer);
  const rulers=document.createElementNS('http://www.w3.org/2000/svg','svg'),rulerPath=document.createElementNS('http://www.w3.org/2000/svg','path');rulers.setAttribute('class','cab-dimension-lines');rulers.setAttribute('aria-hidden','true');rulers.appendChild(rulerPath);labelLayer.appendChild(rulers);
  let controls=new OrbitControls(cam,cv),model=null,frame=0,disposed=false,current=f,down=null,selected=null,helper=null,guide=null,tinted=null,drag=null,labels=[];
  let settings={front:false,unfolded:false,doors:'normal',dimensions:true,snap:true,dimensionScope:'all',interaction:'open',focusPart:false},viewHeight=3,activeColumn=null,summary=null,splitRoot=null,splitPanels=[];
  let hatchOutlines=[],hatchEditing=null,shelfEditing=null;
  const hatchBoxPath=document.createElementNS('http://www.w3.org/2000/svg','path'),hatchOpeningPath=document.createElementNS('http://www.w3.org/2000/svg','path');hatchBoxPath.setAttribute('class','cab-hatch-box-outline');hatchOpeningPath.setAttribute('class','cab-hatch-opening-outline');rulers.appendChild(hatchBoxPath);rulers.appendChild(hatchOpeningPath);
  let drawerEdges=[],drawerLabels=[],drawerDrag=null,drawerEditing=null,doorSizeCount=0;
  function setupControls(){controls.enableDamping=true;controls.minDistance=.3;controls.maxDistance=20;controls.enableRotate=!settings.front;}
  setupControls();
  const unbindNavigation=root.FurnishNavigation?.bindOrbit(cv,()=>controls)||(()=>{});
  function clearModel(){if(!model)return;model.traverse(o=>{o.geometry?.dispose();if(o.userData.cabinetOwnMaterial)o.material.dispose();});sc.remove(model);}
  function clearHighlight(){if(tinted){tinted.mesh.material=tinted.original;tinted.material.dispose();tinted=null;}for(const o of [helper,guide])if(o){sc.remove(o);o.geometry.dispose();o.material.dispose();}helper=guide=null;selectionPaths.forEach(path=>path.setAttribute('d',''));}
  function tag(o){const part=o.userData.kitchenShelf,K=root.FurnishKitchen;if(part&&current.kitchen&&['door','open'].includes(current.kitchen.modules[part.module]?.role))return {column:elevation?elevation.indices[part.module]:part.module,shelf:part.shelf,kitchenModule:part.module};return (o.userData.cabinetInspect?.kind==='structure'?o.userData.cabinetInspect:null)||o.userData.cabinetShelf||o.userData.cabinetDivider||o.userData.cabinetBay;}
  function inspectPart(o){
   if(!o)return {kind:'body'};
   const builder=builderPick(o),raw=o.userData.cabinetInspect||o.userData.cabinetPart;if(builder)return {...raw,...builder,kind:raw?.kind??builder.kind};
   let part=o.userData.cabinetInspect||tag(o)||o.userData.cabinetPart;
   if(!part&&current.kitchen){let parent=o;while(parent&&parent.userData.kitchenModule===undefined)parent=parent.parent;if(parent)part={column:parent.userData.kitchenModule};}
   if(!part)return {kind:'body'};
   const kind=part.kind??(part.shelf!==undefined?'shelf':part.drawer!==undefined||part.lid?'drawer':o.userData.cabinetPart?'door':'bay');
   const column=elevation&&(o.userData.cabinetPart||o.userData.cabinetInspect)?(part.column>=elevation.indices.length?elevation.endIndex:elevation.indices[part.column]):part.column;
   return {...part,column,kind,...(o.userData.cabinetDoorSize?{leaf:o.userData.cabinetDoorSize.leaf,...(!current.kitchen?{section:part.section??o.userData.cabinetDoorSize.section}:{})}: {})};
  }
  function selectedMesh(){if(selected?.kind==='body')return model;if(current.kitchen&&selected?.kind==='bay'){let group;const index=elevation?elevation.indices.indexOf(selected.column):selected.column;model?.traverse(o=>{if(o.isGroup&&o.userData.kitchenModule===index)group=o;});if(group)return group;}let mesh;model?.traverse(o=>{if(selected?.kind==='door'&&!o.userData.cabinetDoorSize||selected?.kind==='drawer'&&o.userData.cabinetDrawerBoard!=='front')return;let part=selected?.kind?inspectPart(o):tag(o);const joint=o.userData.cabinetStackedShelf;if(joint&&selected?.shelf!==undefined&&selected.column>=joint.column&&selected.column<joint.column+joint.count&&selected.shelf===joint.shelves[selected.column-joint.column])part={...part,column:selected.column,shelf:selected.shelf};if(o.isMesh&&part&&(selected?.kind?part.kind===selected.kind&&['column','shelf','drawer','lane','divider','leaf','section','lid','assembly','bay'].every(k=>selected[k]===undefined||part[k]===selected[k]):part.column===selected?.column&&part.shelf===selected?.shelf&&part.divider===selected?.divider))mesh=o;});return mesh;}
  function highlight(){
   clearHighlight();selectionLayer.dataset.builderSelection=String(!!selected?.boxId);if(selected?.boxId){const bounds=new THREE.Box3();model?.traverse(o=>{if(!o.isMesh)return;const p=builderPick(o);if(p&&p.boxId===selected.boxId&&p.assembly===selected.assembly&&p.column===selected.column&&(!selected.componentId||p.componentId===selected.componentId)&&(!selected.board||p.board===selected.board))bounds.union(new THREE.Box3().setFromObject(o));});readout.hidden=true;if(!bounds.isEmpty()){helper=new THREE.Box3Helper(bounds,0x168de2);sc.add(helper);}return;}const mesh=selectedMesh();cv.style.cursor=mesh?'grab':'';readout.hidden=!mesh;if(!mesh){selected=null;return;}
   readout.hidden=selected.shelf===undefined&&selected.divider===undefined&&selected.kind!=='structure';
   if(['shelf','structure'].includes(selected.kind)&&mesh.isMesh&&!Array.isArray(mesh.material)){const material=mesh.material.clone();tinted={mesh,original:mesh.material,material};material.color.set(0x168de2);if(material.emissive){material.emissive.set(0x168de2);material.emissiveIntensity=.2;}mesh.material=material;}model.updateMatrixWorld(true);helper=new THREE.BoxHelper(mesh,0x168de2);helper.visible=false;sc.add(helper);
   if(current.kitchen){if(selected.shelf!==undefined&&(selected.kitchenModule!==undefined||selected.column!==undefined)){const K=root.FurnishKitchen,index=elevation?elevation.indices.indexOf(selected.column):selected.kitchenModule??selected.column,m=K.cabinetLayout(current).find(m=>m.index===index),value=K.moduleShelves(m,current.kitchen.baseHeight,K.isWall(current),K.plinth(current))[selected.shelf];readout.textContent=`模块 ${selected.column+1} · 层板 ${selected.shelf+1} · ${value} mm`;}return;}
   if(selected.kind==='body')return;
   if(selected.kind==='structure'){const board=C.structuralBoards(current).find(b=>b.section===selected.section);readout.textContent=board?`${board.label} · 板底 ${Number(board.position.toFixed(2))} mm`:'';return;}
   const {column,shelf,divider}=selected,c=C.config(current),bay=C.layout(current)[column],z=current.d/2000+.025,base=(c.plinth+c.thickness)/1000;
   if(shelf!==undefined){
    const limits=C.shelfLimits(current,column,shelf),geo=new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(bay.center/1000,base+limits.min/1000,z),new THREE.Vector3(bay.center/1000,base+limits.max/1000,z)]);
    guide=new THREE.Line(geo,new THREE.LineBasicMaterial({color:0x168de2,depthTest:false}));guide.renderOrder=9;sc.add(guide);
    readout.textContent=`分区 ${column+1} · 层板 ${shelf+1} · ${c.columns[column].shelves[shelf]} mm`;
   }else if(divider!==undefined)readout.textContent=`分隔板 ${divider+1} · 左模块 ${Math.round(C.moduleWidths(current)[divider])} / 右模块 ${Math.round(C.moduleWidths(current)[divider+1])} mm`;
   else readout.textContent=`分区 ${column+1} · 模块外宽 ${Math.round(C.moduleWidths(current)[column])} mm`;
  }
  // SVG strokes keep their CSS-pixel width; WebGL lines are commonly limited to 1 px.
  function projectSelection(){
   if(!helper)return;const rect=cv.getBoundingClientRect(),positions=helper.geometry.attributes.position,index=helper.geometry.index,paths=[];
   for(let i=0;i<index.count;i+=2){const points=[index.getX(i),index.getX(i+1)].map(j=>new THREE.Vector3().fromBufferAttribute(positions,j).applyMatrix4(helper.matrixWorld).project(cam));
    if(points.some(p=>p.z< -1||p.z>1))continue;
    paths.push(`M${(points[0].x+1)*rect.width/2},${(1-points[0].y)*rect.height/2}L${(points[1].x+1)*rect.width/2},${(1-points[1].y)*rect.height/2}`);
   }
   selectionPaths.forEach(path=>path.setAttribute('d',paths.join('')));
  }
  function shelfGaps(column,shelf){if(typeof shelf==='string'){const board=C.structuralBoards(current).find(b=>b.section===shelf),lower=board.lower,upper=board.upper,down=board.value-board.min,up=board.max-board.value;return {lower:{bottom:board.position-lower,top:board.position,height:lower,min:lower-down*(board.lowerScale??1),max:lower+up*(board.lowerScale??1)},upper:{bottom:board.position+board.thickness,top:board.position+board.thickness+upper,height:upper,min:upper-up*(board.upperScale??1),max:upper+down*(board.upperScale??1)}};}return current.kitchen?root.FurnishKitchen.moduleShelfClearances(current,elevation?elevation.indices.indexOf(column):column,shelf):C.shelfClearances(current,column,shelf);}
  function dimensions(){
   labelLayer.replaceChildren(rulers);labels=[];hatchOutlines=[];hatchBoxPath.setAttribute('d','');hatchOpeningPath.setAttribute('d','');readout.style.top=settings.dimensions?'42px':'12px';
   doorSizes.replaceChildren();doorSizes.hidden=true;doorSizeCount=0;
   const scope=settings.dimensionScope,all=scope==='all',interior=all||['bays','modules','divider'].includes(scope),outer=all||['size','space'].includes(scope),chosen=i=>all||i===(activeColumn??0)||scope==='divider'&&i===(activeColumn??0)+1;
   host.setAttribute('data-dimension-scope',scope);host.setAttribute('data-active-column',String(activeColumn));
   const point=(x,y,z)=>new THREE.Vector3(x*(current.kitchen&&current.flip?-1:1)/1000,y/1000,z/1000),fmt=v=>String(Number(v.toFixed(2)));
   const add=(text,p,options={})=>{const el=document.createElement(options.column===undefined?'span':'button');el.className=options.column===undefined?'cab-dimension':'cab-module-number';el.textContent=text;
    if(options.column!==undefined){el.type='button';el.setAttribute('aria-label',options.title);el.title=options.title;el.onclick=()=>{if(actions.select?.({column:options.column})!==false){activeColumn=options.column;markActive();}};}
    labelLayer.appendChild(el);labels.push({el,point:p,...options});return el;};
   if(current.kitchen&&root.FurnishCabinetAssembly.placementRows(current).length){const A=root.FurnishCabinetAssembly;let offset=0;for(const row of A.placementRows(current)){const ownerColumn=row.module?(elevation?(row.module.index>=elevation.indices.length?elevation.endIndex:elevation.indices[row.module.index]):row.module.index):undefined,pick=selected&&(selected.assembly===row.id||row.module&&selected.column===ownerColumn)?selected:null,own=p=>({...p,...(row.module?{column:elevation?(row.module.index>=elevation.indices.length?elevation.endIndex:elevation.indices[row.module.index]):row.module.index}:{assembly:row.id})});componentDimensions({THREE,current:row.furniture,selected:pick,settings,labelLayer,labels,boxOffset:offset,labelsOnly:settings.dimensionScope==='current'&&!!selected?.boxId&&!pick,transform:(x,y,z)=>{const a=(row.rot??0)*Math.PI/180;return point(row.x+x*Math.cos(a)-z*Math.sin(a),y+row.y,row.z+x*Math.sin(a)+z*Math.cos(a));},actions:{select:p=>actions.select?.(own(p)),editDimension:(p,field)=>actions.editDimension?.(own(p),field),startDrag:(e,p,point,options)=>builderGesture.start(e,own(p),point,options)}});offset+=row.furniture.cabinet.boxes.length;}if(settings.dimensions){const o=A.opening(current);if(o){const el=add('开放区 · 净高 '+fmt(o.h)+' mm',point(o.x,(o.bottom+o.top)/2,o.front+25));el.dataset.builderOpening='';el.style.pointerEvents='auto';el.onclick=()=>actions.select?.({assembly:'@opening',kind:'opening'});el.setAttribute('role','button');el.tabIndex=0;el.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();el.click();}};}for(const m of root.FurnishKitchen.cabinetLayout(current).filter(m=>m.role==='empty')){const el=add('设备位 '+(m.index+1),point(m.x,80,m.y+current.d/2+25));el.className='cab-dimension cab-equipment-label';}}return;}
   const shelfMeasures=(column,shelf,gaps,at)=>{for(const side of ['upper','lower']){const gap=gaps[side],a=at(gap.bottom),b=at(gap.top),caption=side==='upper'?'上方净高':'下方净高',el=add(`${caption} ${fmt(gap.height)}`,a.clone().add(b).multiplyScalar(.5),{a,b,offset:18});
    if(actions.shelfClearance){el.className+=' cab-shelf-dimension';el.setAttribute('data-shelf-clearance',side);el.setAttribute('role','button');el.tabIndex=0;el.title=`${caption} ${fmt(gap.height)} mm，点击编辑`;const edit=e=>{e.preventDefault();e.stopPropagation();openShelfInput(column,shelf,side,el);};el.onclick=edit;el.onkeydown=e=>{if(e.key==='Enter'||e.key===' ')edit(e);};}
   }};
   const measure=(text,a,b,offset=20)=>{if(settings.dimensions)add(text,a.clone().add(b).multiplyScalar(.5),{a,b,offset});};
   // Read the selected production board, so plinths, tier offsets and kitchen
   // module transforms are counted once. Preview y=0 is the whole cabinet base.
   if(settings.dimensions&&interior&&(selected?.shelf!==undefined||selected?.kind==='structure')){
    const mesh=selectedMesh();if(mesh?.isMesh){
     model.updateMatrixWorld(true);const bounds=new THREE.Box3().setFromObject(mesh),height=bounds.min.y*1000;
     if(Number.isFinite(height)&&height>=-1e-6){
      const a=new THREE.Vector3(bounds.min.x,0,bounds.max.z+.025),b=a.clone();b.y=Math.max(0,bounds.min.y);
      const el=add(`板底距柜底 ${fmt(Math.max(0,height))}`,a.clone().add(b).multiplyScalar(.5),{a,b,offset:48,boardElevation:true});
      el.className+=' cab-board-elevation';el.setAttribute('data-board-elevation',String(Math.max(0,height)));
      el.title='从整柜底部量至所选板件下表面（mm），包含底座高度；不含整柜安装离地高度。';
     }
    }
   }
   const depthMeasures=(part,column,at)=>{
    const c=C.config(part),bay=C.layout(part)[column],sections=C.depthSections(part,column,c).filter(v=>v.storage!==false&&v.top>v.bottom&&v.clearDepth>0);
    if(sections.length&&bay.width>0){
     const section=sections[0],y=section.bottom+Math.min(50,(section.top-section.bottom)/4),z=section.front+25,a=at(bay.left,y,z),b=at(bay.left+bay.width,y,z);
     const el=add(`净宽 ${fmt(bay.width)}`,a.clone().add(b).multiplyScalar(.5),{a,b,offset:12,netWidth:true});el.className+=' cab-width-dimension';
     el.setAttribute('data-net-width',String(bay.width));el.setAttribute('data-width-column',String(column));
     el.title=`隔间 ${column+1}净宽 ${fmt(bay.width)} mm：左右侧板／分隔板内表面之间的距离，不含板厚；模块外宽另行标注。`;
    }
    for(const depth of sections){
     const x=bay.left+bay.width*.82,y=depth.bottom+Math.min(100,(depth.top-depth.bottom)*.22),a=at(x,y,depth.rear),b=at(x,y,depth.front),caption=sections.length>1?depth.label+'净深':'净深';
     const el=add(`${caption} ${fmt(depth.clearDepth)}`,a.clone().add(b).multiplyScalar(.5),{a,b,offset:12,netDepth:true});el.className+=' cab-depth-dimension';
     el.setAttribute('data-net-depth',String(depth.clearDepth));el.setAttribute('data-depth-section',depth.section);el.setAttribute('data-depth-back',String(depth.backThickness));el.setAttribute('data-depth-door',String(depth.doorThickness));
     el.title=`隔间 ${column+1} · ${depth.label}净深 ${fmt(depth.clearDepth)} mm：总深 ${fmt(depth.total)} − 后侧退距 ${fmt(depth.rearInset)} − 背板 ${fmt(depth.backThickness)} − 闭合面板 ${fmt(depth.doorThickness)}。正视图保留数值，不绘制重合的深度尺线。`;
    }
   };
   const bounds=C.assemblyBounds(current),actual=bounds??{w:current.w,d:current.d};
   const h=bounds?bounds.h:current.kitchen?(Object.keys(root.FurnishKitchen.assemblyConfig(current)).length?FurnishKitchen.laundryHeight(current):FurnishKitchen.overallHeight(current)):C.height(current),w=actual.w,d=actual.d;
   const isL=current.kitchen?.shape==='L',isU=current.kitchen?.shape==='U',runName=elevation?.title?.replace(/正视$/,'')??(elevation?.run===1?'转角边':'主边');
   summary=null;if(settings.dimensions){summary=document.createElement('div');summary.className='cab-size-summary';summary.textContent=isU?`主边总长 ${fmt(root.FurnishKitchen.runDepth(current,1)+root.FurnishKitchen.runLength(current,0)+root.FurnishKitchen.extension(current,0).length)} · 连接边总长 ${fmt(d)} · 回折边总长 ${fmt(root.FurnishKitchen.runDepth(current,1)+root.FurnishKitchen.runLength(current,2)+root.FurnishKitchen.extension(current,2).length)} · 三边柜深 ${[0,1,2].map(run=>fmt(root.FurnishKitchen.runDepth(current,run))).join("／")} · ${root.FurnishKitchen?.isWall(current)?'柜高':'台面高'} ${fmt(current.kitchen.baseHeight+current.kitchen.thickness)} mm`:isL?`主边总长 ${fmt(w)} · 转角边总长 ${fmt(d)} · 柜深 ${fmt(current.kitchen.depth)} · ${root.FurnishKitchen?.isWall(current)?'柜高':'台面高'} ${fmt(current.kitchen.baseHeight+current.kitchen.thickness)} mm`:elevation?`${runName}总长 ${fmt(w)} · 柜深 ${fmt(current.kitchen.depth)} · ${root.FurnishKitchen?.isWall(current)?'柜高':'台面高'} ${fmt(current.kitchen.baseHeight+current.kitchen.thickness)} mm`:`整体 宽 ${fmt(w)} × 深 ${fmt(d)} × 高 ${fmt(h)} mm`;if(current.cabinet?.sideClosures){const sides=C.sideClosures(current.cabinet);summary.textContent=summary.textContent.replace('整体 宽','柜体 宽')+` · 含侧收口完成宽 ${fmt(w+sides.left+sides.right)} mm`;}labelLayer.appendChild(summary);}
   if(current.kitchen){const K=root.FurnishKitchen;for(const m of K.cabinetLayout(current)){
    const normal=K.runNormal(m),x=m.x+normal[0]*(m.depth??current.kitchen.depth)/2,z=m.y+normal[1]*(m.depth??current.kitchen.depth)/2;
    const end=m.index>=current.kitchen.modules.length,index=elevation?(end?elevation.endIndex:elevation.indices[m.index]):m.index;
    if(end||index===null){const el=add(end?'薄柜':'盲角',point(x,K.moduleHeight(current,m)*.55,z));el.className='cab-blind-label';}
    else if(!K.isLaundry(current))add(String(index+1),point(x,K.moduleHeight(current,m)*.55,z),{column:index,title:`模块 ${index+1} · ${K.moduleRoles(current)[m.role]} · 宽 ${fmt(m.width)} mm`});
    if(interior&&chosen(index)&&current.kitchen.obstacleFit?.depths.some(row=>row.index===m.index))add(`柜深 ${fmt(m.depth)}`,point(x,K.moduleHeight(current,m)*.3,z));
    if(settings.dimensions&&interior&&index===selected?.column&&selected.shelf!==undefined&&!end){const part=K.moduleFurniture(current,m),base=part.cabinet.plinth+part.cabinet.thickness;shelfMeasures(index,selected.shelf,K.moduleShelfClearances(current,m.index,selected.shelf),height=>point(x,base+height,z));}
    if(interior&&chosen(index))measure(`${end?'薄柜宽':index===null?'盲角':'模块外宽'} ${fmt(m.width)}`,point(x-(m.run!==1?m.width/2:0),0,z-(m.run===1?m.width/2:0)),point(x+(m.run!==1?m.width/2:0),0,z+(m.run===1?m.width/2:0)));
    if(settings.dimensions&&interior&&chosen(index)&&scope!=='divider'&&m.role!=='empty'&&index!==null){let group;model.traverse(o=>{if(o.isGroup&&o.userData.kitchenModule===m.index)group=o;});if(group){const part=K.moduleFurniture(current,m);C.layout(part).forEach((_,column)=>depthMeasures(part,column,(x,y,z)=>new THREE.Vector3(x/1000,y/1000,z/1000).applyMatrix4(group.matrixWorld)));}}
   }
   }else{
   const c=C.config(current),base=c.plinth+c.thickness,modules=C.moduleLayout(current);
   C.layout(current).forEach((bay,i)=>{
    add(String(i+1),point(bay.center,(bounds?.bottom??0)+h*.65,(bounds?.front??d/2)+25),{column:i,title:`模块 ${i+1} · 外宽 ${fmt(modules[i].width)} mm`});
    if(settings.dimensions&&interior&&chosen(i)&&scope!=='divider')depthMeasures(current,i,point);
    if(bounds&&c.columns.length===1){if(interior&&chosen(i))measure(`实体宽 ${fmt(w)}`,point(bounds.left,bounds.bottom,bounds.front),point(bounds.right,bounds.bottom,bounds.front));return;}
    if(interior&&chosen(i))measure(`模块外宽 ${fmt(modules[i].width)}`,point(modules[i].left,0,d/2),point(modules[i].right,0,d/2));
    if(!settings.dimensions||!interior||!chosen(i)||scope==='divider')return;
    if(all&&settings.doors==='normal'&&(c.hoodBayHeight!==undefined?!c.columns[0].doorOpen&&!c.columns[2].doorOpen:c.columns[i].door!=='none'&&!c.columns[i].doorOpen&&!(c.columns[i].doorSections&&Object.values(c.columns[i].doorSections).some(s=>s.open))))return;
    if(selected?.column===i&&selected.shelf!==undefined){
     shelfMeasures(i,selected.shelf,C.shelfClearances(current,i,selected.shelf),height=>point(bay.center,base+height,d/2+25));
    }else if(selected?.kind==='structure'&&selected.column===i){if(selected.section!=='counter')shelfMeasures(i,selected.section,shelfGaps(i,selected.section),height=>point(bay.center,height,d/2+25));}else C.spaces(current,i).forEach(gap=>measure(`净高 ${fmt(gap.height)}`,point(bay.center,base+gap.bottom,d/2+25),point(bay.center,base+gap.top,d/2+25),12));
   });
   }
   if(settings.dimensions&&!current.kitchen){
    const results=C.config(current).columns.flatMap((col,i)=>col.pegboardHatch?C.pegboardHatchAlignments(current,i,furniture,plan):[]);
    if(results.length){const legend=document.createElement('div');legend.className='cab-hatch-legend';legend.textContent='青线：电箱投影 · 橙线：检修开口（关闭位置）';labelLayer.appendChild(legend);}
    for(const data of results){
     if(data.pending){const warning=document.createElement('div');warning.className='cab-hatch-legend cab-hatch-warning';warning.textContent=`分区 ${data.column+1}：${data.message}`;labelLayer.appendChild(warning);continue;}
     hatchOutlines.push({box:data.box.map(p=>point(...p)),opening:data.opening.map(p=>point(...p))});
     for(const side of data.sides){const a=point(...side.a),b=point(...side.b),caption={top:'上',bottom:'下',left:'左',right:'右'}[side.side],text=`${caption} 实测 ${fmt(side.actual)} / 设定 ${fmt(side.target)} mm`,el=add(text,a.clone().add(b).multiplyScalar(.5),{a,b,pegPadding:side.side});el.className+=' cab-hatch-margin'+(side.matches?'':' cab-hatch-mismatch');el.setAttribute('data-hatch-margin',side.side);if(data.leaf!==undefined)el.setAttribute('data-hatch-leaf',String(data.leaf));el.setAttribute('data-hatch-actual',String(side.actual));el.setAttribute('data-hatch-target',String(side.target));el.title=`分区 ${data.column+1}，${side.actual<0?'电箱超出开口，尚未完整覆盖':side.matches?'实际余量与设定一致':'实际余量与设定不同'}；电箱外沿至检修开口，不含盖板边缝`;if(actions.hatchMargin&&!current.locked){el.setAttribute('role','button');el.tabIndex=0;el.className+=' cab-hatch-editable';el.title+='；点击输入余量，Enter 应用，Esc 取消';el.onclick=e=>{e.stopPropagation();openHatchInput(data.column,side.side,side.target,el,data.leaf);};el.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();e.stopPropagation();openHatchInput(data.column,side.side,side.target,el,data.leaf);}};}

     }
    }
   }
   if(outer&&bounds){measure(`总宽 ${fmt(w)}`,point(bounds.left,bounds.bottom,bounds.front),point(bounds.right,bounds.bottom,bounds.front),52);measure(`总高 ${fmt(h)}`,point(bounds.left,bounds.bottom,bounds.back),point(bounds.left,bounds.top,bounds.back),36);measure(`总深 ${fmt(d)}`,point(bounds.right,bounds.top,bounds.back),point(bounds.right,bounds.top,bounds.front),26);}
   if(outer&&bounds&&C.movablePegboard(current)){if(bounds.bottom>0)measure(`底部离地 ${fmt(bounds.bottom)}`,point(bounds.right,0,bounds.front),point(bounds.right,bounds.bottom,bounds.front),38);else if(settings.dimensions)add('底部离地 0',point(bounds.right,0,bounds.front));}
   if(outer&&!bounds){if(isL)measure(`主边总长 ${fmt(w)}`,point(-w/2,h,-d/2),point(w/2,h,-d/2),26);
   else if(current.cabinet?.sideClosures){const sides=C.sideClosures(current.cabinet);measure(`完成宽（含侧收口） ${fmt(w+sides.left+sides.right)}`,point(-w/2-sides.left,0,d/2),point(w/2+sides.right,0,d/2),52);}
   else measure(`${elevation?runName+'总长':'总宽'} ${fmt(w)}`,point(-w/2,0,d/2),point(w/2,0,d/2),52);
   measure(`${current.kitchen?(Object.keys(root.FurnishKitchen.assemblyConfig(current)).length?'整柜高':root.FurnishKitchen.isWall(current)?'柜高':'台面高'):'总高'} ${fmt(h)}`,point(-w/2,0,-d/2),point(-w/2,h,-d/2),36);
   measure(`${isL?'转角边总长':'总深'} ${fmt(d)}`,point(w/2,h,-d/2),point(w/2,h,d/2),26);
   if(isL)measure(`柜深 ${fmt(current.kitchen.depth)}`,point(-w/2,h,-d/2),point(-w/2,h,-d/2+current.kitchen.depth),26);
   }
   if(settings.dimensions){
    const rows=[];model?.traverse(o=>{const drawer=!!o.userData.cabinetDrawerSize,size=o.userData.cabinetDoorSize||o.userData.cabinetDrawerSize;if(!size)return;
     const part=o.userData.cabinetPart||{},index=part.column??0,column=elevation?(elevation.indices[index]??elevation.endIndex):index;
     const section={upper:'上柜',lower:'下柜',display:'展示柜',fridgeUpper:'冰箱上柜',storage:''}[size.section??'storage']??size.section,assembly=size.assembly,thin=!assembly&&current.kitchen&&index>=current.kitchen.modules.length;
     const run=thin?(elevation?.run??root.FurnishKitchen.cabinetLayout(current).find(m=>m.index===index).run):null;
     const location=assembly?`洗衣柜${{upper:'吊柜',open:'开放格'}[assembly]??assembly} · 分区 ${index+1}`:thin?`末端薄柜（${elevation?.title?.replace(/正视$/,'')??root.FurnishKitchen.runName(current,run)}）`:`${current.kitchen?'模块':'分区'} ${column===null?'盲角':column+1}`;
     const bay=part.bay===undefined?'':` · 内部分区 ${part.bay+1}`,panel=drawer?(part.lid?'上盖联动抽屉面板':`抽屉 ${part.drawer+1} 面板${part.lane===undefined?'':` · 第 ${part.lane+1} 列`}`):`门 ${size.leaf+1}`,caption=`${location}${bay} ${section} · ${panel}`,text=`宽 ${fmt(size.width)} × 高 ${fmt(size.height)} mm`;
     // The complete list must remain available for unselected bays and end cabinets.
     rows.push(`${caption}：${text}`);
     if(settings.focusPart&&!all&&scope!=='front')return;
     if(!all&&!['size','front'].includes(scope)&&!assembly&&!thin)return;
     if(scope!=='size'&&!assembly&&!thin&&!chosen(column))return;
     if(!all&&settings.focusPart&&['door','drawer'].includes(selected?.kind)){const part=inspectPart(o);if(part.kind!==selected.kind||['column','leaf','drawer','lane','section','lid'].some(key=>selected[key]!==undefined&&part[key]!==selected[key]))return;}
     const pos=o.getWorldPosition(new THREE.Vector3()),label=add(`${fmt(size.width)}×${fmt(size.height)}`,pos,{doorSize:true});label.className='cab-dimension '+(drawer?'cab-drawer-front-dimension':'cab-door-dimension');label.title=`${caption}：${text}`;label.setAttribute(drawer?'data-drawer-width':'data-door-width',String(size.width));label.setAttribute(drawer?'data-drawer-height':'data-door-height',String(size.height));
     if(actions.inspect){const target=inspectPart(o);label.setAttribute('data-cabinet-object',JSON.stringify(target));label.setAttribute('role','button');label.tabIndex=0;label.onclick=()=>actions.inspect(target);label.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();actions.inspect(target);}};}
    });
    doorSizeCount=rows.length;if(rows.length){doorSizes.hidden=!!splitRoot||settings.focusPart&&!all;const heading=document.createElement('summary');heading.textContent=`全部门板／抽屉面板尺寸 · 宽 × 高（mm） · ${rows.length} 块`;doorSizes.appendChild(heading);for(const text of rows){const row=document.createElement('div');row.textContent=text;doorSizes.appendChild(row);}}
   }
   markActive();
  }
  function markActive(){for(const {el,column} of labels)if(column!==undefined)el.setAttribute('aria-pressed',String(column===activeColumn));drawerDimensions();for(const panel of splitPanels)panel.preview.selectPart(selected??(activeColumn===null?null:{column:activeColumn}));}
  function clearSplit(){for(const panel of splitPanels)panel.preview.dispose();splitPanels=[];splitRoot?.remove();splitRoot=null;host.setAttribute('data-unfolded','false');cv.hidden=false;labelLayer.hidden=false;drawerLayer.hidden=false;doorSizes.hidden=!settings.dimensions||!doorSizeCount||settings.focusPart&&settings.dimensionScope!=='all';}
  function syncSplit(){
   if(!settings.unfolded||!settings.front||!['L','U'].includes(current.kitchen?.shape)){if(splitRoot)clearSplit();return;}
   if(!splitRoot){splitRoot=document.createElement('div');splitRoot.className='cab-unfolded';host.appendChild(splitRoot);}
   host.setAttribute('data-unfolded','true');cv.hidden=true;labelLayer.hidden=true;drawerLayer.hidden=true;doorSizes.hidden=true;labelLayer.replaceChildren(rulers);labels=[];summary=null;readout.hidden=true;
   const rows=root.FurnishKitchen.elevationRuns(current);
   while(splitPanels.length>rows.length){const panel=splitPanels.pop();panel.preview.dispose();panel.section.remove();}
   rows.forEach((row,i)=>{
    let panel=splitPanels[i];if(!panel){const section=document.createElement('section'),title=document.createElement('h4'),scroll=document.createElement('div'),surface=document.createElement('div');section.className='cab-elevation';title.textContent=row.title;scroll.className='cab-elevation-scroll';surface.className='cab-elevation-preview';scroll.appendChild(surface);section.appendChild(title);section.appendChild(scroll);splitRoot.appendChild(section);panel={section,surface,meta:{},devices:[],preview:null};splitPanels.push(panel);}
    Object.assign(panel.meta,row);panel.section.children[0].textContent=row.title;
    // Keep every module wide enough to label; narrow screens scroll each run separately.
    const min=Math.min(...row.furniture.kitchen.modules.map(m=>m.width));panel.surface.style.width=`${Math.max(280,Math.ceil(row.furniture.w/min*66+100))}px`;
    panel.devices.splice(0,panel.devices.length,...furniture.filter(v=>v.counterLink?.hostId===current.id).flatMap(v=>{const index=row.indices.indexOf(v.counterLink.module);return index<0?[]:[{...v,counterLink:{...v.counterLink,module:index}}];}));
    const drawerRow=value=>value&&root.FurnishKitchen.elevationRuns(value).find(r=>r.run===panel.meta.run)?.furniture;
    if(!panel.preview)panel.preview=create({THREE,OrbitControls,box,host:panel.surface,f:row.furniture,elevation:panel.meta,furniture:panel.devices,background,actions:{isPlacing:actions.isPlacing,componentInfo:actions.componentInfo,componentAdjust:(...args)=>drawerRow(actions.componentAdjust?.(...args)),editDimension:actions.editDimension,select:part=>actions.select?.(part),...(actions.inspect?{inspect:part=>actions.inspect(part)}:{}),...(actions.activateDoor?{activateDoor:part=>actions.activateDoor(part)}:{}),...(actions.shelfClearance?{shelfClearance:(column,shelf,side,value)=>drawerRow(actions.shelfClearance(column,shelf,side,value))}:{}),...(actions.drawerBoundary?{drawerBoundary:(part,delta,phase)=>drawerRow(actions.drawerBoundary(part,delta,phase)),drawerHeight:(column,tier,value)=>drawerRow(actions.drawerHeight(column,tier,value)),move:(part,value)=>drawerRow(actions.move(part,value))}:{})}});
    else panel.preview.update(row.furniture);
    panel.preview.setView({front:true,dimensions:settings.dimensions,dimensionScope:settings.dimensionScope,doors:settings.doors,interaction:settings.interaction,focusPart:settings.focusPart});panel.preview.selectPart(selected??(activeColumn===null?null:{column:activeColumn}));
   });
  }
  function projectLabels(){
   const rect=cv.getBoundingClientRect(),width=rect.width,height=rect.height,occupied=[],paths=[];
   if(summary)occupied.push({left:8,top:8,right:8+(summary.offsetWidth||width-16),bottom:8+(summary.offsetHeight||24)});
   const overview=host.parentElement?.querySelector?.('.cab-overview');if(overview&&!overview.hidden){const box=overview.getBoundingClientRect();if(box.width&&box.height)occupied.push({left:box.left-rect.left,top:box.top-rect.top,right:box.right-rect.left,bottom:box.bottom-rect.top});}
   const project=projectDimensionLabels({THREE,cam,canvas:cv,labels,centerPoint:new THREE.Vector3(0,(current.kitchen?(Object.keys(root.FurnishKitchen.assemblyConfig(current)).length?FurnishKitchen.laundryHeight(current):FurnishKitchen.overallHeight(current)):C.height(current))/2000,0),rulers,rulerPath,occupied});
   const contour=key=>hatchOutlines.map(row=>{const points=row[key].map(project);return points.every(p=>p.visible)?points.map((p,i)=>`${i?'L':'M'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join('')+'Z':'';}).join('');hatchBoxPath.setAttribute('d',contour('box'));hatchOpeningPath.setAttribute('d',contour('opening'));
   rulers.setAttribute('viewBox',`0 0 ${width} ${height}`);rulerPath.setAttribute('d',paths.join(''));
  }
  function finishShelfInput(commit=true){
   if(!shelfEditing)return true;const edit=shelfEditing;shelfEditing=null;
   if(!commit){edit.form.remove();controls.enabled=true;cv.focus({preventScroll:true});return true;}
   try{
    if(!edit.input.value.trim())throw Error('请填写层板净高');
    const next=actions.shelfClearance(edit.column,edit.shelf,edit.side,Number(edit.input.value));if(!next)throw Error('无法应用层板净高');
    edit.form.remove();controls.enabled=true;update(next);cv.focus({preventScroll:true});return true;
   }catch(e){shelfEditing=edit;controls.enabled=false;edit.message.textContent=e.message;edit.input.setAttribute('aria-invalid','true');edit.input.focus({preventScroll:true});return false;}
  }
  function openShelfInput(column,shelf,side,button){
   if(!finishShelfInput()||!finishHatchInput())return;
   const gap=shelfGaps(column,shelf)[side],caption=side==='upper'?'上方净高':'下方净高',form=document.createElement('form'),label=document.createElement('label'),input=document.createElement('input'),apply=document.createElement('button'),cancel=document.createElement('button'),message=document.createElement('div');
   form.className='cab-hatch-input cab-shelf-input';form.setAttribute('aria-label',`层板${caption}编辑`);label.textContent=caption+' mm';input.type='number';input.step='any';input.min=gap.min;input.max=gap.max;input.value=String(Number(gap.height.toFixed(6)));input.setAttribute('aria-label','预览'+caption+' mm');apply.type='submit';apply.className='btn';apply.textContent='应用净高';cancel.type='button';cancel.className='btn';cancel.textContent='取消修改';message.setAttribute('role','alert');label.appendChild(input);form.appendChild(label);form.appendChild(apply);form.appendChild(cancel);form.appendChild(message);host.appendChild(form);
   form.style.left=`${Math.max(8,Math.min((host.clientWidth||500)-270,parseFloat(button.style.left)||8))}px`;form.style.top=`${Math.max(8,Math.min((host.clientHeight||440)-150,(parseFloat(button.style.top)||40)+18))}px`;
   shelfEditing={column,shelf,side,form,input,message};controls.enabled=false;form.onsubmit=e=>{e.preventDefault();e.stopPropagation();finishShelfInput();};cancel.onclick=e=>{e.stopPropagation();finishShelfInput(false);};form.onkeydown=e=>{e.stopPropagation();if(e.key==='Escape'){e.preventDefault();finishShelfInput(false);}else if(e.key==='Enter'&&e.target===input){e.preventDefault();finishShelfInput();}};input.focus({preventScroll:true});input.select();
  }
  function finishHatchInput(commit=true){
   if(!hatchEditing)return true;const edit=hatchEditing;
   if(!commit){hatchEditing=null;edit.form.remove();controls.enabled=true;return true;}
   try{
    if(!edit.input.value.trim())throw Error('请输入余量');const value=Number(edit.input.value),rule=C.pegboardHatchPadding({padding:Object.fromEntries(root.FurnishProducts.pegboardAssembly.hatch.padding.sides.map(side=>[side,value]))});
    const next=actions.hatchMargin(edit.column,edit.side,rule[edit.side],edit.leaf);if(!next)throw Error('无法应用，请检查余量与板边界');
    hatchEditing=null;edit.form.remove();controls.enabled=true;update(next);return true;
   }catch(e){edit.message.textContent=e.message;edit.input.setAttribute('aria-invalid','true');edit.input.focus({preventScroll:true});return false;}
  }
  function openHatchInput(column,side,value,button,leaf){
   if(!finishHatchInput())return;
   const form=document.createElement('form'),label=document.createElement('label'),input=document.createElement('input'),apply=document.createElement('button'),cancel=document.createElement('button'),message=document.createElement('div'),caption={top:'上',bottom:'下',left:'左',right:'右'}[side];
   form.className='cab-hatch-input';form.setAttribute('aria-label',`分区 ${column+1} · ${caption}余量编辑`);label.textContent=`${caption}余量 mm`;input.type='number';input.step='any';input.min=root.FurnishProducts.pegboardAssembly.hatch.padding.min;input.max=root.FurnishProducts.pegboardAssembly.hatch.padding.max;input.value=String(value);input.setAttribute('aria-label',`预览${caption}余量 mm`);apply.type='submit';apply.textContent='应用余量';cancel.type='button';cancel.textContent='取消修改';message.setAttribute('role','alert');label.appendChild(input);form.appendChild(label);form.appendChild(apply);form.appendChild(cancel);form.appendChild(message);host.appendChild(form);
   form.style.left=`${Math.max(8,Math.min((host.clientWidth||500)-248,parseFloat(button.style.left)||8))}px`;form.style.top=`${Math.max(40,Math.min((host.clientHeight||440)-130,(parseFloat(button.style.top)||40)+18))}px`;
   hatchEditing={column,side,leaf,form,input,message};controls.enabled=false;form.onsubmit=e=>{e.preventDefault();e.stopPropagation();finishHatchInput();};cancel.onclick=e=>{e.stopPropagation();finishHatchInput(false);};input.onkeydown=e=>{e.stopPropagation();if(e.key==='Escape'){e.preventDefault();finishHatchInput(false);}else if(e.key==='Enter'){e.preventDefault();finishHatchInput();}};input.focus({preventScroll:true});input.select();
  }
  function finishDrawerInput(commit=true){
   if(!drawerEditing)return true;const edit=drawerEditing;drawerEditing=null;controls.enabled=true;
   if(commit){const value=Number(edit.input.value),next=edit.input.value.trim()&&Number.isFinite(value)?actions.drawerHeight(edit.column,edit.tier,value):null;if(!next){drawerEditing=edit;controls.enabled=false;edit.input.setAttribute('aria-invalid','true');edit.input.focus({preventScroll:true});return false;}update(next);}
   else{edit.input.remove();edit.button.hidden=false;}return true;
  }
  function endDrawerDrag(cancel){
   if(!drawerDrag)return;const previous=drawerDrag;drawerDrag=null;controls.enabled=true;cv.style.cursor='';if(cv.hasPointerCapture(previous.id))cv.releasePointerCapture(previous.id);
   const next=actions.drawerBoundary(previous.part,0,cancel?'cancel':'end');if(next)update(next);
  }
  function drawerDimensions(){
   // Error feedback can resize the preview. Keep the active input (including
   // invalid text) until it is explicitly applied or cancelled; a layout refresh
   // must not silently discard it and allow Save to bypass validation.
   if(drawerEditing)return;drawerLayer.replaceChildren();drawerEdges=[];drawerLabels=[];const K=root.FurnishKitchen;
   const activeDrawer=current.kitchen&&K.cabinetLayout(current).find(m=>m.role==='drawer'&&(elevation?elevation.indices[m.index]:m.index)===activeColumn),count=activeDrawer?K.drawerHeights(current,activeDrawer).length:0;host.style.minHeight=count>6&&!settings.unfolded?`${count*32+60}px`:'';
   if(!['all','modules'].includes(settings.dimensionScope)||!settings.dimensions||!current.kitchen||current.locked||!actions.drawerBoundary||!actions.drawerHeight||!K.drawerRules(current).boundaryResize)return;
   const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('class','cab-drawer-lines');drawerLayer.appendChild(svg);
   for(const m of K.cabinetLayout(current)){
    const column=elevation?elevation.indices[m.index]:m.index;if(m.role!=='drawer'||column===undefined||column===null||column!==activeColumn)continue;
    const values=K.drawerHeights(current,m),a=m.rot*Math.PI/180,c=Math.cos(a),s=Math.sin(a),flip=current.flip?-1:1,depth=m.depth??current.kitchen.depth;
    const point=(x,y)=>new THREE.Vector3((m.x+x*c-depth/2*s)*flip/1000,y/1000,(m.y+x*s+depth/2*c)/1000),normal=new THREE.Vector3(-s*flip,0,c),closed=!m.drawerOpen?.some(Boolean);let y=K.drawerRules(current).plinth;
    for(let tier=0;tier<values.length;tier++){
     const value=values[tier],button=document.createElement('button'),item={column,tier,button,point:point(m.width/2,y+value/2),otherPoint:point(-m.width/2,y+value/2),normal};button.type='button';button.className='cab-drawer-height';button.dataset.drawerHeight=String(tier);button.dataset.drawerColumn=String(column);button.textContent=`${Number(value.toFixed(2))} mm`;button.title=`${K.drawerLabel(m,tier)}，点击输入高度`;button.setAttribute('aria-label',`模块 ${column+1} 第 ${tier+1} 层高度 ${value} mm，点击输入`);drawerLayer.appendChild(button);drawerLabels.push(item);
     button.onclick=()=>{if(!finishDrawerInput())return;const input=document.createElement('input');input.className='cab-drawer-height-input';input.type='number';input.step='any';input.min=K.drawerMinimum(current,m,tier);input.value=String(value);input.setAttribute('aria-label',`第 ${tier+1} 层高度 mm`);button.hidden=true;drawerLayer.appendChild(input);drawerEditing={column,tier,input,button};controls.enabled=false;input.style.left=button.style.left;input.style.top=button.style.top;input.focus({preventScroll:true});input.select();input.onkeydown=e=>{e.stopPropagation();if(e.key==='Enter'){e.preventDefault();finishDrawerInput();}else if(e.key==='Escape'){e.preventDefault();finishDrawerInput(false);}};input.onblur=()=>finishDrawerInput();};
     y+=value;if(tier===values.length-1||!closed||K.drawerStyle(m)==='dish-basket'&&tier===1)continue;
     const part={column,boundary:tier},g=document.createElementNS('http://www.w3.org/2000/svg','g'),hit=document.createElementNS(g.namespaceURI,'path'),line=document.createElementNS(g.namespaceURI,'path');g.dataset.drawerBoundary=String(tier);g.dataset.drawerColumn=String(column);g.setAttribute('tabindex','0');g.setAttribute('role','slider');g.setAttribute('aria-label',`模块 ${column+1} 抽屉 ${tier+1} 与 ${tier+2} 层分界线，上下拖动调整高度`);g.setAttribute('aria-valuenow',String(value));hit.setAttribute('class','cab-drawer-boundary-hit');line.setAttribute('class','cab-drawer-boundary-line');g.append(hit,line);svg.appendChild(g);
     const itemEdge={part,g,hit,line,left:point(-m.width/2,y),right:point(m.width/2,y),normal};drawerEdges.push(itemEdge);
     g.onpointerdown=e=>{if(e.button!==0||drawerDrag||!finishDrawerInput())return;e.preventDefault();e.stopPropagation();const next=actions.drawerBoundary(part,0,'start');if(!next)return;const plane=new THREE.Plane().setFromNormalAndCoplanarPoint(normal,itemEdge.left),start=rayAt(e).ray.intersectPlane(plane,new THREE.Vector3());if(!start){actions.drawerBoundary(part,0,'cancel');return;}drawerDrag={id:e.pointerId,part,index:m.index,before:next,targets:K.drawerBoundaryTargets(next,m.index,tier),plane,start,x:e.clientX,y:e.clientY};cv.focus({preventScroll:true});controls.enabled=false;cv.setPointerCapture(e.pointerId);cv.style.cursor='ns-resize';};
     g.onkeydown=e=>{if(!['ArrowUp','ArrowDown'].includes(e.key)||drawerDrag)return;e.preventDefault();e.stopPropagation();if(!finishDrawerInput()||!actions.drawerBoundary(part,0,'start'))return;const next=actions.drawerBoundary(part,(e.key==='ArrowUp'?1:-1)*(e.shiftKey?1:10),'move');actions.drawerBoundary(part,0,'end');if(next)update(next);drawerLayer.querySelector(`[data-drawer-boundary="${tier}"][data-drawer-column="${column}"]`)?.focus({preventScroll:true});};
    }
   }
  }
  function projectDrawers(){
   if(!drawerLabels.length)return;const rect=cv.getBoundingClientRect(),width=rect.width,height=rect.height,occupied=[];
   const project=p=>{const v=p.clone().project(cam);return {x:(v.x+1)*width/2,y:(1-v.y)*height/2,visible:v.z>=-1&&v.z<=1};},facing=item=>cam.position.clone().sub(item.point??item.left).dot(item.normal)>0;
   const svg=drawerLayer.querySelector('svg');svg?.setAttribute('viewBox',`0 0 ${width} ${height}`);
   for(const edge of drawerEdges){const a=project(edge.left),b=project(edge.right),visible=facing(edge)&&a.visible&&b.visible;edge.g.style.display=visible?'':'none';const path=`M${a.x},${a.y}L${b.x},${b.y}`;edge.hit.setAttribute('d',path);edge.line.setAttribute('d',path);}
   if(summary)occupied.push({left:8,top:8,right:8+(summary.offsetWidth||width-16),bottom:8+(summary.offsetHeight||24)});
   for(const item of labels.filter(v=>v.column!==undefined&&!v.el.hidden)){const x=parseFloat(item.el.style.left),y=parseFloat(item.el.style.top);occupied.push({left:x-16,right:x+16,top:y-16,bottom:y+16});}
   const visible=[];for(const item of drawerLabels){const a=project(item.point),b=project(item.otherPoint),p=a.x>b.x?a:b,button=item.button,show=p.visible&&facing(item);button.hidden=!show||drawerEditing?.button===button;if(show)visible.push({...item,p,w:button.offsetWidth||82});}
   // Preserve vertical tier order even when short fronts need their labels spread apart.
   visible.sort((a,b)=>a.p.y-b.p.y);let previous=34;
   for(const item of visible){item.y=Math.max(46,item.p.y,previous+32);previous=item.y;}
   if(visible.length){const overflow=Math.max(0,visible.at(-1).y-(height-16));for(const item of visible)item.y-=overflow;}
   let leaders=svg?.querySelector('.cab-drawer-leaders');if(svg&&!leaders){leaders=document.createElementNS(svg.namespaceURI,'path');leaders.setAttribute('class','cab-drawer-leaders');svg.prepend(leaders);}const paths=[];
   for(const item of visible){const {p,w,button}=item,y=item.y;let x;
    for(const dx of [w/2+12,-w/2-12,w*1.5+18,-w*1.5-18]){x=Math.max(w/2+4,Math.min(width-w/2-4,p.x+dx));const box={left:x-w/2-3,right:x+w/2+3,top:y-15,bottom:y+15};if(!occupied.some(b=>box.left<b.right&&box.right>b.left&&box.top<b.bottom&&box.bottom>b.top))break;}
    occupied.push({left:x-w/2-3,right:x+w/2+3,top:y-15,bottom:y+15});button.style.left=`${x}px`;button.style.top=`${y}px`;paths.push(`M${p.x},${p.y}L${x+(x>p.x?-w/2:w/2)},${y}`);if(drawerEditing?.button===button){drawerEditing.input.style.left=`${x}px`;drawerEditing.input.style.top=`${y}px`;}
   }leaders?.setAttribute('d',paths.join(''));projectDrawerSnap(svg,project);
  }
  function drawerSnapDelta(d,point,bypass){
   const raw=Math.round((point.y-d.start.y)*1e6)/1000;d.snap=null;if(bypass||!settings.snap||Math.abs(raw)<1e-8)return raw;
   const rect=cv.getBoundingClientRect(),project=p=>{const v=p.clone().project(cam);return {x:v.x*rect.width/2,y:v.y*rect.height/2};},requested=project(point);let best=root.FurnishKitchen.drawerRules(current).snapPixels,delta=raw;
   for(const target of d.targets){const p=point.clone();p.y=d.start.y+target.delta/1000;const candidate=project(p),distance=Math.hypot(candidate.x-requested.x,candidate.y-requested.y);if(distance<=best){best=distance;delta=target.delta;d.snap=target;}}
   return delta;
  }
  function projectDrawerSnap(svg,project){
   if(!svg)return;if(!drawerDrag?.snap){svg.querySelector('.cab-drawer-snap-guide')?.remove();return;}const K=root.FurnishKitchen,d=drawerDrag,target=d.snap,modules=K.cabinetLayout(current),points=[];
   for(const index of [d.index,target.column]){const m=modules.find(v=>v.index===index),a=m.rot*Math.PI/180,c=Math.cos(a),s=Math.sin(a),depth=m.depth??current.kitchen.depth;for(const x of [-m.width/2,m.width/2])points.push(project(new THREE.Vector3((m.x+x*c-depth/2*s)*(current.flip?-1:1)/1000,target.height/1000,(m.y+x*s+depth/2*c)/1000)));}
   let ends=[points[0],points[1]],distance=0;for(const a of points)for(const b of points){const span=Math.hypot(a.x-b.x,a.y-b.y);if(span>distance){ends=[a,b];distance=span;}}
   let line=svg.querySelector('.cab-drawer-snap-guide');if(!line){line=document.createElementNS(svg.namespaceURI,'path');line.setAttribute('class','cab-drawer-snap-guide');line.setAttribute('aria-label','相邻抽屉层间已对齐');svg.appendChild(line);}line.dataset.targetColumn=String(elevation?elevation.indices[target.column]:target.column);line.dataset.height=String(target.height);line.setAttribute('d',`M${ends[0].x},${ends[0].y}L${ends[1].x},${ends[1].y}`);
  }
  function update(value){current=value;clearHighlight();clearModel();model=value.kitchen?root.FurnishKitchenModel.build(THREE,value,box,{furniture,plan,doors:settings.doors,outlines:true,removableHints:true,previewBlind:elevation?.blind,previewMirror:elevation?.mirror}):root.FurnishCabinetModel.build(THREE,value,box,{doors:settings.doors,outlines:true,furniture,plan});if(value.kitchen?.laundry?.assembly&&buildDevice){const K=root.FurnishKitchen,P=root.FurnishProducts,bays=K.layout(value).filter(m=>m.role==='empty');const devices=furniture.filter(p=>{if(p.laundryHostId===value.id)return true;if(!P.supportsAction(p,'alignLaundryBay')||Math.abs((p.rot||0)-(value.rot||0))>.001)return false;const [x,z]=K.local(value,p.cx,p.cy);return bays.some(b=>Math.abs(x-b.x)+p.w/2<=K.laundryBay(value,b).width/2+.01&&Math.abs(z-b.y)+p.d/2<=K.runDepth(value,b.run)/2+.01)&&(p.mountHeight??0)+P.height(p)<=value.kitchen.baseHeight+K.baseElevation(value)+.01;});for(const device of devices){const bay=bays[0];if(!bay)continue;const aligned=device.laundryHostId===value.id?K.centerLaundryInBay(value,{...device,...value.kitchen.laundry.appliance},bay.index):device,[x,z]=K.local(value,aligned.cx,aligned.cy),washer=buildDevice({...aligned,rot:0,flip:false});washer.position.set(x/1000,(aligned.mountHeight??0)/1000,z/1000);washer.rotation.set(0,0,0);washer.scale.x=Math.abs(washer.scale.x);washer.traverse(o=>o.userData.cabinetIgnorePick=true);model.add(washer);}}if(value.kitchen)model.scale.x=value.flip?-1:1;
   sc.add(model);model.updateMatrixWorld(true);highlight();dimensions();syncSplit();}
  function fit(){
   const bounds=C.assemblyBounds(current),actual=bounds??{w:current.w,d:current.d};
   const h=(bounds?bounds.h+(C.movablePegboard(current)?bounds.bottom:0):current.kitchen?(Object.keys(root.FurnishKitchen.assemblyConfig(current)).length?FurnishKitchen.laundryHeight(current):FurnishKitchen.overallHeight(current)):C.height(current))/1000,w=actual.w/1000,size=Math.max(w,h,actual.d/1000),center=(C.movablePegboard(current)?0:(bounds?.bottom??0))/1000+h/2,cx=bounds?(bounds.left+bounds.right)/2000*(current.kitchen&&current.flip?-1:1):0,cz=bounds?(bounds.back+bounds.front)/2000:0;controls.target.set(cx,center,cz);
   if(settings.front){viewHeight=Math.max(h+(elevation ? .35 : 0),w/(host.clientWidth/host.clientHeight||1))*(elevation?1.15:root.FurnishKitchen.isLaundry(current)?1.25:1.3);cam.position.set(cx,center,cz+Math.max(4,size*3));cam.zoom=1;resize();}
   else if(current.kitchen){const side=(root.FurnishKitchen.cornerSide(current)==='right'?-1:1)*(current.flip?-1:1);if(current.kitchen.shape==='U')cam.position.set(side*size*2,h/2+size*.9,size*.8);else cam.position.set(side*size,h/2+size*.7,size*2);}else cam.position.set(cx+size*1.2,center+size*.6,cz+size*2.4);controls.update();
  }
  function resize(){const width=host.clientWidth||500,height=host.clientHeight||440,aspect=width/height;r.setSize(width,height);if(cam.isOrthographicCamera){if(elevation)viewHeight=Math.max(((Object.keys(root.FurnishKitchen.assemblyConfig(current)).length?FurnishKitchen.laundryHeight(current):FurnishKitchen.overallHeight(current)))/1000+.35,current.w/1000/aspect)*1.15;cam.left=-viewHeight*aspect/2;cam.right=-cam.left;cam.top=viewHeight/2;cam.bottom=-cam.top;}else cam.aspect=aspect;cam.updateProjectionMatrix();if(splitRoot)syncSplit();}
  function rayAt(e){const rect=cv.getBoundingClientRect(),ray=new THREE.Raycaster();ray.setFromCamera(new THREE.Vector2((e.clientX-rect.left)/rect.width*2-1,-(e.clientY-rect.top)/rect.height*2+1),cam);return ray;}
  function hitAt(ray){return ray.intersectObject(model,true).find(h=>h.object.isMesh&&!h.object.userData.cabinetIgnorePick);}
  function apply(part,value,snap=false,phase){
   if(part.kind==='structure'){const row=C.structuralBoards(current).find(b=>b.section===part.section);if(!row)return false;if(snap&&settings.snap)value=Math.round(value/10)*10;value=Math.max(row.position+row.min-row.value,Math.min(row.position+row.max-row.value,value));}
   if(part.shelf!==undefined&&snap&&settings.snap)value=current.kitchen?root.FurnishKitchen.snapModuleShelf(current,part.kitchenModule,part.shelf,value):C.snapShelf(current,part.column,part.shelf,value);
   const next=part.divider!==undefined?actions.divider?.(part.divider,value,phase):actions.move(part,value,phase);if(next){update(next);return true;}return false;
  }
  function endDrag(cancel){if(!drag||drag.builder)return;const previous=drag;drag=null;if(previous.part.divider!==undefined)apply(previous.part,cancel?previous.value:C.widths(current)[previous.part.divider],false,cancel?'cancel':'end');else if(previous.part.kind==='structure')apply(previous.part,previous.value,false,cancel?'cancel':'end');else if(cancel)apply(previous.part,previous.value);controls.enabled=true;cv.style.cursor=selected?'grab':'';if(cv.hasPointerCapture(previous.id))cv.releasePointerCapture(previous.id);}
  cv.addEventListener('pointerdown',e=>{
   if(e.button!==0||drag||actions.isPlacing?.())return;down={x:e.clientX,y:e.clientY,id:e.pointerId};const ray=rayAt(e),hit=hitAt(ray),part=hit&&tag(hit.object);if(!part)return;
   if(part.shelf===undefined&&part.divider===undefined&&part.kind!=='structure')return;
   e.stopImmediatePropagation();e.preventDefault();if(actions.select({...part})===false){down=null;return;}selected={...part};highlight();cv.focus({preventScroll:true});
   const normal=cam.getWorldDirection(new THREE.Vector3());normal.y=0;if(normal.lengthSq()<1e-8)normal.set(0,0,1);normal.normalize();
   const plane=new THREE.Plane().setFromNormalAndCoplanarPoint(normal,hit.point),start=ray.ray.intersectPlane(plane,new THREE.Vector3());if(!start)return;
   drag={id:e.pointerId,part:{...part},value:part.kind==='structure'?C.structuralBoards(current).find(b=>b.section===part.section).position:current.kitchen?root.FurnishKitchen.moduleShelves(current.kitchen.modules[part.kitchenModule],current.kitchen.baseHeight,root.FurnishKitchen.isWall(current),root.FurnishKitchen.plinth(current))[part.shelf]:part.divider!==undefined?C.widths(current)[part.divider]:C.config(current).columns[part.column].shelves[part.shelf],plane,start,x:e.clientX,y:e.clientY};
   if(part.divider!==undefined||part.kind==='structure')apply(part,drag.value,false,'start');
   controls.enabled=false;cv.setPointerCapture(e.pointerId);cv.style.cursor=part.divider!==undefined?'ew-resize':'ns-resize';
  },true);
  cv.addEventListener('pointermove',e=>{
   if(drawerDrag?.id===e.pointerId){e.stopImmediatePropagation();e.preventDefault();const d=drawerDrag;if(!d.moved&&Math.hypot(e.clientX-d.x,e.clientY-d.y)<3)return;d.moved=true;const point=rayAt(e).ray.intersectPlane(d.plane,new THREE.Vector3());if(point){const delta=drawerSnapDelta(d,point,e.altKey),next=actions.drawerBoundary(d.part,delta,'move');if(next)update(next);else d.snap=null;}return;}
   if(!drag||drag.builder||drag.id!==e.pointerId)return;e.stopImmediatePropagation();e.preventDefault();if(Math.hypot(e.clientX-drag.x,e.clientY-drag.y)<3)return;
   // Cabinet geometry stays centred: changing one module by 2 dx moves its divider by dx.
   const point=rayAt(e).ray.intersectPlane(drag.plane,new THREE.Vector3());if(point){const delta=drag.part.divider!==undefined?point.x-drag.start.x:point.y-drag.start.y;apply(drag.part,drag.value+delta*(drag.part.divider!==undefined?2000:1000),!e.altKey,'move');cv.style.cursor=drag.part.divider!==undefined?'ew-resize':'ns-resize';}
  },true);
  cv.addEventListener('pointerup',e=>{
   if(drawerDrag?.id===e.pointerId){e.stopImmediatePropagation();e.preventDefault();endDrawerDrag(false);down=null;return;}
   if(drag?.id===e.pointerId&&!drag.builder){e.stopImmediatePropagation();e.preventDefault();endDrag(false);down=null;return;}
   if(!down||down.id!==e.pointerId||Math.hypot(e.clientX-down.x,e.clientY-down.y)>5)return;down=null;
   const hit=hitAt(rayAt(e)),target=inspectPart(hit?.object),choose=['door','drawer'].includes(target.kind)&&settings.interaction==='open'&&actions.activateDoor?actions.activateDoor:actions.inspect||actions.select;if(choose===actions.activateDoor&&target.boxId)actions.select?.(target);if(choose?.(target)!==false){selected=target;highlight();cv.focus({preventScroll:true});}
  },true);
  cv.addEventListener('pointercancel',e=>{if(drawerDrag?.id===e.pointerId){e.stopImmediatePropagation();endDrawerDrag(true);}if(drag?.id===e.pointerId&&!drag.builder){e.stopImmediatePropagation();endDrag(true);}down=null;},true);
  cv.addEventListener('lostpointercapture',e=>{if(drawerDrag?.id===e.pointerId)endDrawerDrag(true);if(drag?.id===e.pointerId&&!drag.builder)endDrag(true);},true);
  cv.addEventListener('keydown',e=>{
   if(e.key==='Escape'&&drawerDrag){e.preventDefault();e.stopPropagation();endDrawerDrag(true);return;}
   if(e.key==='Escape'&&(drag||selected)){e.preventDefault();e.stopPropagation();if(drag)endDrag(true);else{selected=null;actions.select(null);highlight();}return;}
   const divider=selected?.divider!==undefined,keys=divider?['ArrowLeft','ArrowRight']:['ArrowUp','ArrowDown'];if(!selected||selected.shelf===undefined&&!divider&&selected.kind!=='structure'||!keys.includes(e.key))return;e.preventDefault();e.stopPropagation();if(drag)return;
   const value=selected.kind==='structure'?C.structuralBoards(current).find(b=>b.section===selected.section).position:current.kitchen?root.FurnishKitchen.moduleShelves(current.kitchen.modules[selected.kitchenModule??selected.column],current.kitchen.baseHeight,root.FurnishKitchen.isWall(current),root.FurnishKitchen.plinth(current))[selected.shelf]:divider?C.widths(current)[selected.divider]:C.config(current).columns[selected.column].shelves[selected.shelf];apply(selected,value+((e.key==='ArrowUp'||e.key==='ArrowRight')?1:-1)*(e.shiftKey?1:10));
  });
  const builderPick=o=>{if(!o?.userData.cabinetBuilder)return null;let parent=o,owner;while(parent){if(parent.userData.cabinetAssembly!==undefined){owner={assembly:parent.userData.cabinetAssembly};break;}if(parent.userData.kitchenModule!==undefined){const index=parent.userData.kitchenModule;owner={column:elevation?(index>=elevation.indices.length?elevation.endIndex:elevation.indices[index]):index};break;}parent=parent.parent;}return owner?{...o.userData.cabinetBuilder,...owner}:null;};
  const builderGesture=componentGesture({THREE,canvas:cv,camera:()=>cam,controls:()=>controls,rayAt,hitAt:r=>{const h=r.intersectObject(model,true).find(h=>h.object.isMesh&&builderPick(h.object));const pick=builderPick(h?.object);return pick?{pick,point:h.point,part:h.object.userData.cabinetPart?inspectPart(h.object):null,kind:pick.kind}:null;},infoOf:pick=>{const info=actions.componentInfo?.(pick);return info?{...info,direction:(info.direction??1)*(info.axis==='x'&&current.flip?-1:1)}:null;},settings:()=>settings,actions:{select:actions.select,adjust:actions.componentAdjust,selected:()=>selected,activateDoor:actions.activateDoor,editDimension:actions.editDimension},isPlacing:actions.isPlacing,onState:value=>drag=value,resetDown:()=>down=null});
  const placingGhost=placementGhost({THREE,scene:sc,box,host,furniture,plan,current:()=>current});
  const projectPoint=(x,y)=>{if(splitRoot){for(const panel of splitPanels){const p=panel.preview.projectPoint(x,y);if(p)return {...p,elevation:panel.meta.run};}return null;}const rect=cv.getBoundingClientRect();if(!settings.front||x<rect.left||x>rect.right||y<rect.top||y>rect.bottom)return null;const out=new THREE.Vector3();return rayAt({clientX:x,clientY:y}).ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0,0,1),0),out)?{x:out.x*1000*(current.flip?-1:1),y:out.y*1000}:null;};
  const observer=new ResizeObserver(resize);observer.observe(host);update(f);fit();resize();
  function render(){if(disposed)return;if(!splitRoot){if(!drag&&!drawerDrag)controls.update();r.render(sc,cam);projectSelection();projectLabels();projectDrawers();}frame=requestAnimationFrame(render);}render();
  return {projectPoint,ghost:(value,pick,options)=>{if(splitRoot){for(const panel of splitPanels)panel.preview.ghost(options?.elevation===panel.meta.run?value:null,pick,options);}else placingGhost.show(value,pick,options);},cancelDrag:()=>builderGesture.end(true)||splitPanels.some(p=>p.preview.cancelDrag()),
   update:value=>{const dims=v=>[C.assemblyBounds(v),v.w,v.d,v.kitchen?(Object.keys(root.FurnishKitchen.assemblyConfig(v)).length?FurnishKitchen.laundryHeight(v):FurnishKitchen.overallHeight(v)):v.h,v.kitchen?.shape,v.kitchen?.corner],changed=JSON.stringify(dims(value))!==JSON.stringify(dims(current));update(value);if(changed)fit();},
   selectPart:part=>{const oldPart=JSON.stringify(selected);selected=part;const old=activeColumn;activeColumn=part?.column??null;highlight();if(old!==activeColumn||oldPart!==JSON.stringify(part))dimensions();else markActive();},focus:()=>cv.focus({preventScroll:true}),
   partDimensions:()=>{const mesh=selectedMesh(),size=mesh?.userData.cabinetDoorSize??mesh?.userData.cabinetDrawerSize;return size?{width:size.width,height:size.height}:null;},
   finishShelfInput:()=>finishShelfInput()&&splitPanels.every(panel=>panel.preview.finishShelfInput()),
   finishHatchInput:()=>finishHatchInput(),
   finishDrawerInput:()=>finishDrawerInput()&&splitPanels.every(panel=>panel.preview.finishDrawerInput()),
   setView:options=>{endDrawerDrag(true);endDrag(true);const change=options.front!==undefined&&options.front!==settings.front;settings={...settings,...options};if(change){controls.dispose();cam=settings.front?new THREE.OrthographicCamera(-1,1,1,-1,.01,100):new THREE.PerspectiveCamera(38,1,.01,100);controls=new OrbitControls(cam,cv);setupControls();fit();resize();}update(current);},
   dispose:()=>{placingGhost.clear();unbindNavigation();disposed=true;finishShelfInput(false);finishHatchInput(false);drag=null;drawerDrag=null;drawerEditing=null;cancelAnimationFrame(frame);clearSplit();observer.disconnect();controls.dispose();clearHighlight();clearModel();r.dispose();r.forceContextLoss();cv.remove();selectionLayer.remove();readout.remove();labelLayer.remove();doorSizes.remove();drawerLayer.remove();},
  };
 }
 root.FurnishCabinetPreview={create};
})(typeof globalThis!=='undefined'?globalThis:this);
