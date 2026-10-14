/* Shared-model preview: structure picking, constrained drags and dimension overlays. */
(function(root){
 function create({THREE,OrbitControls,box,host,f,actions,background,furniture=[],plan=null,elevation=null}){
  const C=root.FurnishCabinet,r=new THREE.WebGLRenderer({antialias:true}),sc=new THREE.Scene();let cam=new THREE.PerspectiveCamera(38,1,.01,100);
  r.setPixelRatio(Math.min(devicePixelRatio,2));r.toneMapping=THREE.ACESFilmicToneMapping;host.replaceChildren(r.domElement);
  sc.background=new THREE.Color(background);sc.add(new THREE.HemisphereLight(0xffffff,0x8f8170,1.5));
  const light=new THREE.DirectionalLight(0xffffff,1.8);light.position.set(3,5,4);sc.add(light);
  const cv=r.domElement;cv.tabIndex=0;cv.setAttribute('aria-label',f.kitchen?'厨房三维预览：拖动旋转，滚轮缩放':'柜体三维预览：拖动层板或分隔板；方向键微调');
  const readout=document.createElement('div');readout.className='cab-drag-readout';readout.hidden=true;host.appendChild(readout);
  const labelLayer=document.createElement('div');labelLayer.className='cab-dimensions';host.appendChild(labelLayer);
  const rulers=document.createElementNS('http://www.w3.org/2000/svg','svg'),rulerPath=document.createElementNS('http://www.w3.org/2000/svg','path');rulers.setAttribute('class','cab-dimension-lines');rulers.setAttribute('aria-hidden','true');rulers.appendChild(rulerPath);labelLayer.appendChild(rulers);
  let controls=new OrbitControls(cam,cv),model=null,frame=0,disposed=false,current=f,down=null,selected=null,helper=null,guide=null,drag=null,labels=[];
  let settings={front:false,unfolded:false,doors:'normal',dimensions:true,snap:true},viewHeight=3,activeColumn=null,summary=null,splitRoot=null,splitPanels=[];
  function setupControls(){controls.enableDamping=true;controls.minDistance=.3;controls.maxDistance=20;controls.enableRotate=!settings.front;}
  setupControls();
  function clearModel(){if(!model)return;model.traverse(o=>{o.geometry?.dispose();if(o.userData.cabinetOwnMaterial)o.material.dispose();});sc.remove(model);}
  function clearHighlight(){for(const o of [helper,guide])if(o){sc.remove(o);o.geometry.dispose();o.material.dispose();}helper=guide=null;}
  function tag(o){return o.userData.cabinetShelf||o.userData.cabinetDivider||o.userData.cabinetBay;}
  function selectedMesh(){let mesh;model?.traverse(o=>{const part=tag(o);if(o.isMesh&&part&&part.column===selected?.column&&part.shelf===selected?.shelf&&part.divider===selected?.divider)mesh=o;});return mesh;}
  function highlight(){
   clearHighlight();const mesh=selectedMesh();cv.style.cursor=mesh?'grab':'';readout.hidden=!mesh;if(!mesh){selected=null;return;}
   readout.hidden=selected.shelf===undefined&&selected.divider===undefined;
   model.updateMatrixWorld(true);helper=new THREE.BoxHelper(mesh,0x168de2);helper.material.depthTest=false;helper.renderOrder=10;sc.add(helper);
   const {column,shelf,divider}=selected,c=C.config(current),bay=C.layout(current)[column],z=current.d/2000+.025,base=(c.plinth+c.thickness)/1000;
   if(shelf!==undefined){
    const limits=C.shelfLimits(current,column,shelf),geo=new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(bay.center/1000,base+limits.min/1000,z),new THREE.Vector3(bay.center/1000,base+limits.max/1000,z)]);
    guide=new THREE.Line(geo,new THREE.LineBasicMaterial({color:0x168de2,depthTest:false}));guide.renderOrder=9;sc.add(guide);
    readout.textContent=`分区 ${column+1} · 层板 ${shelf+1} · ${c.columns[column].shelves[shelf]} mm`;
   }else if(divider!==undefined)readout.textContent=`分隔板 ${divider+1} · 左 ${Math.round(bay.width)} / 右 ${Math.round(C.widths(current)[divider+1])} mm`;
   else readout.textContent=`分区 ${column+1} · 净宽 ${Math.round(bay.width)} mm`;
  }
  function dimensions(){
   labelLayer.replaceChildren(rulers);labels=[];readout.style.top=settings.dimensions?'42px':'12px';
   const point=(x,y,z)=>new THREE.Vector3(x*(current.kitchen&&current.flip?-1:1)/1000,y/1000,z/1000),fmt=v=>String(Number(v.toFixed(2)));
   const add=(text,p,options={})=>{const el=document.createElement(options.column===undefined?'span':'button');el.className=options.column===undefined?'cab-dimension':'cab-module-number';el.textContent=text;
    if(options.column!==undefined){el.type='button';el.setAttribute('aria-label',options.title);el.title=options.title;el.onclick=()=>{if(actions.select?.({column:options.column})!==false){activeColumn=options.column;markActive();}};}
    labelLayer.appendChild(el);labels.push({el,point:p,...options});return el;};
   const measure=(text,a,b,offset=20)=>{if(settings.dimensions)add(text,a.clone().add(b).multiplyScalar(.5),{a,b,offset});};
   const h=current.kitchen?current.kitchen.baseHeight+current.kitchen.thickness:C.height(current),w=current.w,d=current.d;
   const isL=current.kitchen?.shape==='L',runName=elevation?.run===1?'转角边':'主边';
   summary=null;if(settings.dimensions){summary=document.createElement('div');summary.className='cab-size-summary';summary.textContent=isL?`主边总长 ${fmt(w)} · 转角边总长 ${fmt(d)} · 柜深 ${fmt(current.kitchen.depth)} · 台面高 ${fmt(h)} mm`:elevation?`${runName}总长 ${fmt(w)} · 柜深 ${fmt(current.kitchen.depth)} · 台面高 ${fmt(h)} mm`:`整体 宽 ${fmt(w)} × 深 ${fmt(d)} × 高 ${fmt(h)} mm`;labelLayer.appendChild(summary);}
   if(current.kitchen){const K=root.FurnishKitchen;for(const m of K.layout(current)){
    const normal=m.run===0?[0,1]:[K.cornerSide(current)==='right'?-1:1,0],x=m.x+normal[0]*current.kitchen.depth/2,z=m.y+normal[1]*current.kitchen.depth/2;
    const index=elevation?elevation.indices[m.index]:m.index;
    if(index===null){const el=add('盲角',point(x,h*.55,z));el.className='cab-blind-label';}
    else add(String(index+1),point(x,h*.55,z),{column:index,title:`模块 ${index+1} · ${K.roles[m.role]} · 宽 ${fmt(m.width)} mm`});
    measure(`${index===null?'盲角':'宽'} ${fmt(m.width)}`,point(x-(m.run===0?m.width/2:0),0,z-(m.run===1?m.width/2:0)),point(x+(m.run===0?m.width/2:0),0,z+(m.run===1?m.width/2:0)));
   }}else{
   const c=C.config(current),base=c.plinth+c.thickness;
   C.layout(current).forEach((bay,i)=>{
    add(String(i+1),point(bay.center,h*.65,d/2+25),{column:i,title:`分区 ${i+1} · 净宽 ${fmt(bay.width)} mm`});
    measure(`净宽 ${fmt(bay.width)}`,point(bay.left,0,d/2),point(bay.left+bay.width,0,d/2));
    if(!settings.dimensions)return;
    if(settings.doors==='normal'&&(c.hoodBayHeight!==undefined?!c.columns[0].doorOpen&&!c.columns[2].doorOpen:c.columns[i].door!=='none'&&!c.columns[i].doorOpen))return;
    C.spaces(current,i).forEach(gap=>measure(`净高 ${fmt(gap.height)}`,point(bay.center,base+gap.bottom,d/2+25),point(bay.center,base+gap.top,d/2+25),12));
   });
   }
   if(isL)measure(`主边总长 ${fmt(w)}`,point(-w/2,h,-d/2),point(w/2,h,-d/2),26);
   else measure(`${elevation?runName+'总长':'总宽'} ${fmt(w)}`,point(-w/2,0,d/2),point(w/2,0,d/2),52);
   measure(`${current.kitchen?'台面高':'总高'} ${fmt(h)}`,point(-w/2,0,-d/2),point(-w/2,h,-d/2),36);
   measure(`${isL?'转角边总长':'总深'} ${fmt(d)}`,point(w/2,h,-d/2),point(w/2,h,d/2),26);
   if(isL)measure(`柜深 ${fmt(current.kitchen.depth)}`,point(-w/2,h,-d/2),point(-w/2,h,-d/2+current.kitchen.depth),26);
   markActive();
  }
  function markActive(){for(const {el,column} of labels)if(column!==undefined)el.setAttribute('aria-pressed',String(column===activeColumn));for(const panel of splitPanels)panel.preview.selectShelf(activeColumn===null?null:{column:activeColumn});}
  function clearSplit(){for(const panel of splitPanels)panel.preview.dispose();splitPanels=[];splitRoot?.remove();splitRoot=null;host.setAttribute('data-unfolded','false');cv.hidden=false;labelLayer.hidden=false;}
  function syncSplit(){
   if(!settings.unfolded||!settings.front||current.kitchen?.shape!=='L'){if(splitRoot)clearSplit();return;}
   if(!splitRoot){splitRoot=document.createElement('div');splitRoot.className='cab-unfolded';host.appendChild(splitRoot);}
   host.setAttribute('data-unfolded','true');cv.hidden=true;labelLayer.hidden=true;labelLayer.replaceChildren(rulers);labels=[];summary=null;readout.hidden=true;
   const rows=root.FurnishKitchen.elevationRuns(current);
   rows.forEach((row,i)=>{
    let panel=splitPanels[i];if(!panel){const section=document.createElement('section'),title=document.createElement('h4'),scroll=document.createElement('div'),surface=document.createElement('div');section.className='cab-elevation';title.textContent=row.title;scroll.className='cab-elevation-scroll';surface.className='cab-elevation-preview';scroll.appendChild(surface);section.appendChild(title);section.appendChild(scroll);splitRoot.appendChild(section);panel={section,surface,meta:{},devices:[],preview:null};splitPanels.push(panel);}
    Object.assign(panel.meta,row);
    // Keep every module wide enough to label; narrow screens scroll each run separately.
    const min=Math.min(...row.furniture.kitchen.modules.map(m=>m.width));panel.surface.style.width=`${Math.max(280,Math.ceil(row.furniture.w/min*66+100))}px`;
    panel.devices.splice(0,panel.devices.length,...furniture.filter(v=>v.counterLink?.hostId===current.id).flatMap(v=>{const index=row.indices.indexOf(v.counterLink.module);return index<0?[]:[{...v,counterLink:{...v.counterLink,module:index}}];}));
    if(!panel.preview)panel.preview=create({THREE,OrbitControls,box,host:panel.surface,f:row.furniture,elevation:panel.meta,furniture:panel.devices,background,actions:{select:part=>actions.select?.(part),toggle:(index,...args)=>{const original=panel.meta.indices[index];if(original!==null)actions.toggle(original,...args);}}});
    else panel.preview.update(row.furniture);
    panel.preview.setView({front:true,dimensions:settings.dimensions});panel.preview.selectShelf(activeColumn===null?null:{column:activeColumn});
   });
  }
  function projectLabels(){
   const rect=cv.getBoundingClientRect(),width=rect.width,height=rect.height,occupied=[],paths=[];
   if(summary)occupied.push({left:8,top:8,right:8+(summary.offsetWidth||width-16),bottom:8+(summary.offsetHeight||24)});
   const project=p=>{const v=p.clone().project(cam);return {x:(v.x+1)*width/2,y:(1-v.y)*height/2,visible:v.z>=-1&&v.z<=1&&Math.abs(v.x)<=1&&Math.abs(v.y)<=1};};
   const center=project(new THREE.Vector3(0,(current.kitchen?current.kitchen.baseHeight+current.kitchen.thickness:C.height(current))/2000,0));
   const line=(a,b)=>`M${a.x.toFixed(1)},${a.y.toFixed(1)}L${b.x.toFixed(1)},${b.y.toFixed(1)}`;
   // Numbers take priority. Move crowded labels with leaders; omit unreadable dimensions.
   const priority=item=>item.column!==undefined?0:item.offset>=26?1:2;
   for(const item of [...labels].sort((a,b)=>priority(a)-priority(b))){const {el,point,a,b,offset}=item,p=project(point);let x=p.x,y=p.y,draw='',anchor={x,y};el.hidden=!p.visible;if(el.hidden)continue;
    if(a){const start=project(a),end=project(b),dx=end.x-start.x,dy=end.y-start.y,length=Math.hypot(dx,dy);if(!start.visible||!end.visible||length<14){el.hidden=true;continue;}
     let nx=-dy/length,ny=dx/length;if(nx*(p.x-center.x)+ny*(p.y-center.y)<0){nx=-nx;ny=-ny;}
     const u={x:start.x+nx*offset,y:start.y+ny*offset},v={x:end.x+nx*offset,y:end.y+ny*offset};x=(u.x+v.x)/2;y=(u.y+v.y)/2;anchor={x,y};
     draw=line(start,{x:u.x+nx*4,y:u.y+ny*4})+line(end,{x:v.x+nx*4,y:v.y+ny*4})+line(u,v);
     for(const q of [u,v])draw+=line({x:q.x-dx/length*3-nx*3,y:q.y-dy/length*3-ny*3},{x:q.x+dx/length*3+nx*3,y:q.y+dy/length*3+ny*3});
    }
    const ew=el.offsetWidth||Math.max(24,el.textContent.length*7+8),eh=el.offsetHeight||22;
    x=Math.max(ew/2+5,Math.min(width-ew/2-5,x));y=Math.max(eh/2+5,Math.min(height-eh/2-5,y));
    let placed=false;for(const shift of [0,24,-24,48,-48,72,-72]){const yy=y+shift,box={left:x-ew/2-3,right:x+ew/2+3,top:yy-eh/2-3,bottom:yy+eh/2+3};if(box.top<2||box.bottom>height-2||occupied.some(o=>box.left<o.right&&box.right>o.left&&box.top<o.bottom&&box.bottom>o.top))continue;occupied.push(box);y=yy;placed=true;break;}
    if(!placed&&item.column===undefined){el.hidden=true;continue;}
    if(Math.hypot(x-anchor.x,y-anchor.y)>8)draw+=line(anchor,{x,y});
    el.style.left=`${x}px`;el.style.top=`${y}px`;paths.push(draw);
   }
   rulers.setAttribute('viewBox',`0 0 ${width} ${height}`);rulerPath.setAttribute('d',paths.join(''));
  }
  function update(value){current=value;clearModel();model=value.kitchen?root.FurnishKitchenModel.build(THREE,value,box,{furniture,plan,previewBlind:elevation?.blind,previewMirror:elevation?.mirror}):root.FurnishCabinetModel.build(THREE,value,box,{doors:settings.doors,outlines:true,furniture,plan});if(value.kitchen)model.scale.x=value.flip?-1:1;
   if(C.hoodBay(value)&&root.FurnishFotileModel)for(const hood of furniture.filter(f=>C.hoodBayFit(value,f)?.fits)){
    const node=root.FurnishFotileModel.build(THREE,hood),a=(value.rot||0)*Math.PI/180,dx=hood.cx-value.cx,dy=hood.cy-value.cy;node.position.set((dx*Math.cos(a)+dy*Math.sin(a))*(value.flip?-1:1)/1000,-root.FurnishProducts.value(value,'mountHeight')/1000,(-dx*Math.sin(a)+dy*Math.cos(a))/1000);node.traverse(o=>o.userData.cabinetIgnorePick=true);model.add(node);
   }
   sc.add(model);model.updateMatrixWorld(true);highlight();dimensions();syncSplit();}
  function fit(){
   const h=(current.kitchen?current.kitchen.baseHeight+current.kitchen.thickness:C.height(current))/1000,w=current.w/1000,bottom=C.hoodBay(current)?Math.min(0,new THREE.Box3().setFromObject(model).min.y):0,size=Math.max(w,h-bottom,current.d/1000),center=(h+bottom)/2;controls.target.set(0,center,0);
   if(settings.front){viewHeight=Math.max(h-bottom+(elevation ? .35 : 0),w/(host.clientWidth/host.clientHeight||1))*(elevation?1.15:1.6);cam.position.set(0,center,Math.max(4,size*3));cam.zoom=1;resize();}
   else if(current.kitchen){const side=(root.FurnishKitchen.cornerSide(current)==='right'?-1:1)*(current.flip?-1:1);cam.position.set(side*size,h/2+size*.7,size*2);}else cam.position.set(size*1.2,h/2+size*.6,size*2.4);controls.update();
  }
  function resize(){const width=host.clientWidth||500,height=host.clientHeight||440,aspect=width/height;r.setSize(width,height);if(cam.isOrthographicCamera){if(elevation)viewHeight=Math.max((current.kitchen.baseHeight+current.kitchen.thickness)/1000+.35,current.w/1000/aspect)*1.15;cam.left=-viewHeight*aspect/2;cam.right=-cam.left;cam.top=viewHeight/2;cam.bottom=-cam.top;}else cam.aspect=aspect;cam.updateProjectionMatrix();if(splitRoot)syncSplit();}
  function rayAt(e){const rect=cv.getBoundingClientRect(),ray=new THREE.Raycaster();ray.setFromCamera(new THREE.Vector2((e.clientX-rect.left)/rect.width*2-1,-(e.clientY-rect.top)/rect.height*2+1),cam);return ray;}
  function hitAt(ray){return ray.intersectObject(model,true).find(h=>h.object.isMesh&&!h.object.userData.cabinetIgnorePick);}
  function apply(part,value,snap=false){
   if(part.shelf!==undefined&&snap&&settings.snap)value=C.snapShelf(current,part.column,part.shelf,value);
   const next=part.divider!==undefined?actions.divider?.(part.divider,value):actions.move(part,value);if(next){update(next);return true;}return false;
  }
  function endDrag(cancel){if(!drag)return;const previous=drag;drag=null;if(cancel)apply(previous.part,previous.value);controls.enabled=true;cv.style.cursor=selected?'grab':'';if(cv.hasPointerCapture(previous.id))cv.releasePointerCapture(previous.id);}
  cv.addEventListener('pointerdown',e=>{
   if(e.button!==0||drag)return;down={x:e.clientX,y:e.clientY,id:e.pointerId};const ray=rayAt(e),hit=hitAt(ray),part=hit&&tag(hit.object);if(!part)return;
   if(part.shelf===undefined&&part.divider===undefined)return;
   e.stopImmediatePropagation();e.preventDefault();if(actions.select({...part})===false){down=null;return;}selected={...part};highlight();cv.focus({preventScroll:true});
   const normal=cam.getWorldDirection(new THREE.Vector3());normal.y=0;if(normal.lengthSq()<1e-8)normal.set(0,0,1);normal.normalize();
   const plane=new THREE.Plane().setFromNormalAndCoplanarPoint(normal,hit.point),start=ray.ray.intersectPlane(plane,new THREE.Vector3());if(!start)return;
   drag={id:e.pointerId,part:{...part},value:part.divider!==undefined?C.widths(current)[part.divider]:C.config(current).columns[part.column].shelves[part.shelf],plane,start,x:e.clientX,y:e.clientY};
   controls.enabled=false;cv.setPointerCapture(e.pointerId);cv.style.cursor=part.divider!==undefined?'ew-resize':'ns-resize';
  },true);
  cv.addEventListener('pointermove',e=>{
   if(!drag||drag.id!==e.pointerId)return;e.stopImmediatePropagation();e.preventDefault();if(Math.hypot(e.clientX-drag.x,e.clientY-drag.y)<3)return;
   const point=rayAt(e).ray.intersectPlane(drag.plane,new THREE.Vector3());if(point){const delta=drag.part.divider!==undefined?point.x-drag.start.x:point.y-drag.start.y;apply(drag.part,drag.value+delta*1000,!e.altKey);cv.style.cursor=drag.part.divider!==undefined?'ew-resize':'ns-resize';}
  },true);
  cv.addEventListener('pointerup',e=>{
   if(drag?.id===e.pointerId){e.stopImmediatePropagation();e.preventDefault();endDrag(false);down=null;return;}
   if(!down||down.id!==e.pointerId||Math.hypot(e.clientX-down.x,e.clientY-down.y)>5)return;down=null;
   const hit=hitAt(rayAt(e)),part=hit?.object.userData.cabinetPart,bay=hit?.object.userData.cabinetBay;if(part)actions.toggle(part.column,part.drawer,part.lid,part.lane,part.section);else if(bay&&actions.select({...bay})!==false){selected={...bay};highlight();cv.focus({preventScroll:true});}
  },true);
  cv.addEventListener('pointercancel',e=>{if(drag?.id===e.pointerId){e.stopImmediatePropagation();endDrag(true);}down=null;},true);
  cv.addEventListener('lostpointercapture',e=>{if(drag?.id===e.pointerId)endDrag(true);},true);
  cv.addEventListener('keydown',e=>{
   if(e.key==='Escape'&&(drag||selected)){e.preventDefault();e.stopPropagation();if(drag)endDrag(true);else{selected=null;actions.select(null);highlight();}return;}
   const divider=selected?.divider!==undefined,keys=divider?['ArrowLeft','ArrowRight']:['ArrowUp','ArrowDown'];if(!selected||selected.shelf===undefined&&!divider||!keys.includes(e.key))return;e.preventDefault();e.stopPropagation();if(drag)return;
   const value=divider?C.widths(current)[selected.divider]:C.config(current).columns[selected.column].shelves[selected.shelf];apply(selected,value+((e.key==='ArrowUp'||e.key==='ArrowRight')?1:-1)*(e.shiftKey?1:10));
  });
  const observer=new ResizeObserver(resize);observer.observe(host);update(f);fit();resize();
  function render(){if(disposed)return;if(!splitRoot){if(!drag)controls.update();r.render(sc,cam);projectLabels();}frame=requestAnimationFrame(render);}render();
  return {
   update:value=>{const dims=v=>[v.w,v.d,v.kitchen?v.kitchen.baseHeight+v.kitchen.thickness:v.h,v.kitchen?.shape,v.kitchen?.corner],changed=JSON.stringify(dims(value))!==JSON.stringify(dims(current));update(value);if(changed)fit();},
   selectShelf:part=>{selected=part;activeColumn=part?.column??null;highlight();markActive();},focus:()=>cv.focus({preventScroll:true}),
   setView:options=>{endDrag(true);const change=options.front!==undefined&&options.front!==settings.front;settings={...settings,...options};if(change){controls.dispose();cam=settings.front?new THREE.OrthographicCamera(-1,1,1,-1,.01,100):new THREE.PerspectiveCamera(38,1,.01,100);controls=new OrbitControls(cam,cv);setupControls();fit();resize();}update(current);},
   dispose:()=>{disposed=true;drag=null;cancelAnimationFrame(frame);clearSplit();observer.disconnect();controls.dispose();clearHighlight();clearModel();r.dispose();r.forceContextLoss();cv.remove();readout.remove();labelLayer.remove();},
  };
 }
 root.FurnishCabinetPreview={create};
})(typeof globalThis!=='undefined'?globalThis:this);
