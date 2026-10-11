/* Shared-model preview: structure picking, constrained drags and dimension overlays. */
(function(root){
 function create({THREE,OrbitControls,box,host,f,actions,background}){
  const C=root.FurnishCabinet,r=new THREE.WebGLRenderer({antialias:true}),sc=new THREE.Scene();let cam=new THREE.PerspectiveCamera(38,1,.01,100);
  r.setPixelRatio(Math.min(devicePixelRatio,2));r.toneMapping=THREE.ACESFilmicToneMapping;host.replaceChildren(r.domElement);
  sc.background=new THREE.Color(background);sc.add(new THREE.HemisphereLight(0xffffff,0x8f8170,1.5));
  const light=new THREE.DirectionalLight(0xffffff,1.8);light.position.set(3,5,4);sc.add(light);
  const cv=r.domElement;cv.tabIndex=0;cv.setAttribute('aria-label','柜体三维预览：拖动层板或分隔板；方向键微调');
  const readout=document.createElement('div');readout.className='cab-drag-readout';readout.hidden=true;host.appendChild(readout);
  const labelLayer=document.createElement('div');labelLayer.className='cab-dimensions';host.appendChild(labelLayer);
  let controls=new OrbitControls(cam,cv),model=null,frame=0,disposed=false,current=f,down=null,selected=null,helper=null,guide=null,drag=null,labels=[];
  let settings={front:false,doors:'normal',dimensions:true,snap:true},viewHeight=3;
  function setupControls(){controls.enableDamping=true;controls.minDistance=.3;controls.maxDistance=20;controls.enableRotate=!settings.front;}
  setupControls();
  function clearModel(){if(!model)return;model.traverse(o=>{o.geometry?.dispose();if(o.userData.cabinetOwnMaterial)o.material.dispose();});sc.remove(model);}
  function clearHighlight(){for(const o of [helper,guide])if(o){sc.remove(o);o.geometry.dispose();o.material.dispose();}helper=guide=null;}
  function tag(o){return o.userData.cabinetShelf||o.userData.cabinetDivider||o.userData.cabinetBay;}
  function selectedMesh(){let mesh;model?.traverse(o=>{const part=tag(o);if(o.isMesh&&part&&part.column===selected?.column&&part.shelf===selected?.shelf&&part.divider===selected?.divider)mesh=o;});return mesh;}
  function highlight(){
   clearHighlight();const mesh=selectedMesh();cv.style.cursor=mesh?'grab':'';readout.hidden=!mesh;if(!mesh){selected=null;return;}
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
   labelLayer.replaceChildren();labels=[];if(!settings.dimensions)return;
   const c=C.config(current),base=c.plinth+c.thickness;
   const add=(text,x,y,z)=>{const el=document.createElement('span');el.className='cab-dimension';el.textContent=text;labelLayer.appendChild(el);labels.push({el,point:new THREE.Vector3(x/1000,y/1000,z/1000)});};
   C.layout(current).forEach((bay,i)=>{
    add(`宽 ${Math.round(bay.width)}`,bay.center,c.plinth-20,current.d/2+30);
    if(settings.doors==='normal'&&c.columns[i].door!=='none'&&!c.columns[i].doorOpen)return;
    C.spaces(current,i).forEach(gap=>add(`净高 ${Math.round(gap.height)}`,bay.center,base+(gap.top+gap.bottom)/2,current.d/2+25));
   });
  }
  function projectLabels(){const rect=cv.getBoundingClientRect();for(const {el,point} of labels){const p=point.clone().project(cam);el.hidden=p.z< -1||p.z>1||Math.abs(p.x)>1||Math.abs(p.y)>1;el.style.left=`${(p.x+1)*rect.width/2}px`;el.style.top=`${(1-p.y)*rect.height/2}px`;}}
  function update(value){current=value;clearModel();model=root.FurnishCabinetModel.build(THREE,value,box,{doors:settings.doors,outlines:true});sc.add(model);model.updateMatrixWorld(true);highlight();dimensions();}
  function fit(){
   const h=C.height(current)/1000,w=current.w/1000,size=Math.max(w,h,current.d/1000);controls.target.set(0,h/2,0);
   if(settings.front){viewHeight=Math.max(h,w/(host.clientWidth/host.clientHeight||1))*1.35;cam.position.set(0,h/2,Math.max(4,size*3));cam.zoom=1;resize();}
   else cam.position.set(size*1.1,h/2+size*.5,size*2.1);controls.update();
  }
  function resize(){const width=host.clientWidth||500,height=host.clientHeight||440,aspect=width/height;r.setSize(width,height);if(cam.isOrthographicCamera){cam.left=-viewHeight*aspect/2;cam.right=-cam.left;cam.top=viewHeight/2;cam.bottom=-cam.top;}else cam.aspect=aspect;cam.updateProjectionMatrix();}
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
   const hit=hitAt(rayAt(e)),part=hit?.object.userData.cabinetPart,bay=hit?.object.userData.cabinetBay;if(part)actions.toggle(part.column,part.drawer,part.lid);else if(bay&&actions.select({...bay})!==false){selected={...bay};highlight();cv.focus({preventScroll:true});}
  },true);
  cv.addEventListener('pointercancel',e=>{if(drag?.id===e.pointerId){e.stopImmediatePropagation();endDrag(true);}down=null;},true);
  cv.addEventListener('lostpointercapture',e=>{if(drag?.id===e.pointerId)endDrag(true);},true);
  cv.addEventListener('keydown',e=>{
   if(e.key==='Escape'&&(drag||selected)){e.preventDefault();e.stopPropagation();if(drag)endDrag(true);else{selected=null;actions.select(null);highlight();}return;}
   const divider=selected?.divider!==undefined,keys=divider?['ArrowLeft','ArrowRight']:['ArrowUp','ArrowDown'];if(!selected||selected.shelf===undefined&&!divider||!keys.includes(e.key))return;e.preventDefault();e.stopPropagation();if(drag)return;
   const value=divider?C.widths(current)[selected.divider]:C.config(current).columns[selected.column].shelves[selected.shelf];apply(selected,value+((e.key==='ArrowUp'||e.key==='ArrowRight')?1:-1)*(e.shiftKey?1:10));
  });
  const observer=new ResizeObserver(resize);observer.observe(host);update(f);fit();resize();
  function render(){if(disposed)return;if(!drag)controls.update();r.render(sc,cam);projectLabels();frame=requestAnimationFrame(render);}render();
  return {
   update:value=>{const changed=JSON.stringify([value.w,value.d,value.h])!==JSON.stringify([current.w,current.d,current.h]);update(value);if(changed)fit();},
   selectShelf:part=>{selected=part;highlight();},focus:()=>cv.focus({preventScroll:true}),
   setView:options=>{endDrag(true);const change=options.front!==undefined&&options.front!==settings.front;settings={...settings,...options};if(change){controls.dispose();cam=settings.front?new THREE.OrthographicCamera(-1,1,1,-1,.01,100):new THREE.PerspectiveCamera(38,1,.01,100);controls=new OrbitControls(cam,cv);setupControls();fit();resize();}update(current);},
   dispose:()=>{disposed=true;drag=null;cancelAnimationFrame(frame);observer.disconnect();controls.dispose();clearHighlight();clearModel();r.dispose();r.forceContextLoss();cv.remove();readout.remove();labelLayer.remove();},
  };
 }
 root.FurnishCabinetPreview={create};
})(typeof globalThis!=='undefined'?globalThis:this);
