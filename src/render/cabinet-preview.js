/* Independent Three.js preview with shelf picking, constrained dragging and keyboard edits. */
(function(root){
 function create({THREE,OrbitControls,box,host,f,actions,background}){
  const C=root.FurnishCabinet,r=new THREE.WebGLRenderer({antialias:true}),sc=new THREE.Scene(),cam=new THREE.PerspectiveCamera(38,1,.01,100);
  r.setPixelRatio(Math.min(devicePixelRatio,2));r.toneMapping=THREE.ACESFilmicToneMapping;host.replaceChildren(r.domElement);
  sc.background=new THREE.Color(background);sc.add(new THREE.HemisphereLight(0xffffff,0x8f8170,1.5));
  const light=new THREE.DirectionalLight(0xffffff,1.8);light.position.set(3,5,4);sc.add(light);
  const cv=r.domElement;cv.tabIndex=0;cv.setAttribute('aria-label','柜体三维预览：点击并拖动层板；方向键调整层板高度');
  const readout=document.createElement('div');readout.className='cab-drag-readout';readout.hidden=true;host.appendChild(readout);
  const controls=new OrbitControls(cam,cv);controls.enableDamping=true;controls.minDistance=.3;controls.maxDistance=20;
  let model=null,frame=0,disposed=false,current=f,down=null,selected=null,helper=null,guide=null,drag=null;
  function clearModel(){if(!model)return;model.traverse(o=>o.geometry?.dispose());sc.remove(model);}
  function clearHighlight(){for(const o of [helper,guide])if(o){sc.remove(o);o.geometry.dispose();o.material.dispose();}helper=guide=null;}
  function shelfMesh(){let mesh;model?.traverse(o=>{const part=o.userData.cabinetShelf;if(o.isMesh&&part&&part.column===selected?.column&&part.shelf===selected?.shelf)mesh=o;});return mesh;}
  function highlight(){
   clearHighlight();const mesh=shelfMesh();cv.style.cursor=mesh?'grab':'';readout.hidden=!mesh;if(!mesh){selected=null;return;}
   model.updateMatrixWorld(true);helper=new THREE.BoxHelper(mesh,0x168de2);helper.material.depthTest=false;helper.renderOrder=10;sc.add(helper);
   const {column,shelf}=selected,limits=C.shelfLimits(current,column,shelf),c=C.config(current),bay=C.layout(current)[column],z=current.d/2000+.025,base=(c.plinth+c.thickness)/1000;
   const geo=new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(bay.center/1000,base+limits.min/1000,z),new THREE.Vector3(bay.center/1000,base+limits.max/1000,z)]);
   guide=new THREE.Line(geo,new THREE.LineBasicMaterial({color:0x168de2,depthTest:false}));guide.renderOrder=9;sc.add(guide);
   readout.textContent=`分区 ${column+1} · 层板 ${shelf+1} · ${c.columns[column].shelves[shelf]} mm`;
  }
  function update(value){current=value;clearModel();model=root.FurnishCabinetModel.build(THREE,value,box);sc.add(model);highlight();}
  function fit(){const h=C.height(current)/1000,size=Math.max(current.w/1000,h,current.d/1000);controls.target.set(0,h/2,0);cam.position.set(size*1.4,h/2+size*.6,size*2.5);controls.update();}
  function resize(){const width=host.clientWidth||500,height=host.clientHeight||440;r.setSize(width,height);cam.aspect=width/height;cam.updateProjectionMatrix();}
  function rayAt(e){const rect=cv.getBoundingClientRect(),ray=new THREE.Raycaster();ray.setFromCamera(new THREE.Vector2((e.clientX-rect.left)/rect.width*2-1,-(e.clientY-rect.top)/rect.height*2+1),cam);return ray;}
  function applyHeight(part,value){const next=actions.move(part,value);if(next){update(next);return true;}return false;}
  function endDrag(cancel){
   if(!drag)return;const previous=drag;drag=null;if(cancel)applyHeight(previous.part,previous.height);
   controls.enabled=true;cv.style.cursor=selected?'grab':'';if(cv.hasPointerCapture(previous.id))cv.releasePointerCapture(previous.id);
  }
  // Capture before OrbitControls sees a shelf press, so shelf dragging never rotates the camera.
  cv.addEventListener('pointerdown',e=>{
   if(e.button!==0||drag)return;
   down={x:e.clientX,y:e.clientY,id:e.pointerId};const ray=rayAt(e),hit=ray.intersectObject(model,true).find(h=>h.object.isMesh);
   if(!hit?.object.userData.cabinetShelf)return;
   const part={...hit.object.userData.cabinetShelf};e.stopImmediatePropagation();e.preventDefault();
   if(actions.select(part)===false){down=null;return;}selected=part;highlight();cv.focus({preventScroll:true});
   const normal=cam.getWorldDirection(new THREE.Vector3());normal.y=0;if(normal.lengthSq()<1e-8)normal.set(0,0,1);normal.normalize();
   const plane=new THREE.Plane().setFromNormalAndCoplanarPoint(normal,hit.point),start=ray.ray.intersectPlane(plane,new THREE.Vector3());
   if(!start)return;drag={id:e.pointerId,part,height:C.config(current).columns[part.column].shelves[part.shelf],plane,startY:start.y,x:e.clientX,y:e.clientY};
   controls.enabled=false;cv.setPointerCapture(e.pointerId);cv.style.cursor='ns-resize';
  },true);
  cv.addEventListener('pointermove',e=>{
   if(!drag||drag.id!==e.pointerId)return;e.stopImmediatePropagation();e.preventDefault();
   if(Math.hypot(e.clientX-drag.x,e.clientY-drag.y)<3)return;
   const point=rayAt(e).ray.intersectPlane(drag.plane,new THREE.Vector3());if(point){applyHeight(drag.part,drag.height+(point.y-drag.startY)*1000);cv.style.cursor='ns-resize';}
  },true);
  cv.addEventListener('pointerup',e=>{
   if(drag?.id===e.pointerId){e.stopImmediatePropagation();e.preventDefault();endDrag(false);down=null;return;}
   if(!down||down.id!==e.pointerId||Math.hypot(e.clientX-down.x,e.clientY-down.y)>5)return;down=null;
   const hit=rayAt(e).intersectObject(model,true).find(h=>h.object.isMesh),part=hit?.object.userData.cabinetPart;if(part)actions.toggle(part.column,part.drawer);
  },true);
  cv.addEventListener('pointercancel',e=>{if(drag?.id===e.pointerId){e.stopImmediatePropagation();endDrag(true);}down=null;},true);
  cv.addEventListener('lostpointercapture',e=>{if(drag?.id===e.pointerId)endDrag(true);},true);
  cv.addEventListener('keydown',e=>{
   if(e.key==='Escape'&&(drag||selected)){e.preventDefault();e.stopPropagation();if(drag)endDrag(true);else{selected=null;actions.select(null);highlight();}return;}
   if(!selected||!['ArrowUp','ArrowDown'].includes(e.key))return;e.preventDefault();e.stopPropagation();
   if(drag)return;const value=C.config(current).columns[selected.column].shelves[selected.shelf];applyHeight(selected,value+(e.key==='ArrowUp'?1:-1)*(e.shiftKey?1:10));
  });
  const observer=new ResizeObserver(resize);observer.observe(host);update(f);fit();resize();
  function render(){if(disposed)return;if(!drag)controls.update();r.render(sc,cam);frame=requestAnimationFrame(render);}render();
  return {
   update:value=>{const changed=JSON.stringify([value.w,value.d,value.h])!==JSON.stringify([current.w,current.d,current.h]);update(value);if(changed)fit();},
   selectShelf:part=>{selected=part;highlight();},focus:()=>cv.focus({preventScroll:true}),
   dispose:()=>{disposed=true;drag=null;cancelAnimationFrame(frame);observer.disconnect();controls.dispose();clearHighlight();clearModel();r.dispose();r.forceContextLoss();cv.remove();readout.remove();},
  };
 }
 root.FurnishCabinetPreview={create};
})(typeof globalThis!=='undefined'?globalThis:this);
