/* The editor preview and the main scene use this same production constructor. */
(function(root){
'use strict';
// Stable authoring-site labels: keep existing labels when moving code; allocate new labels for new sites.
const syncIdentity=root.FurnishPartIdentity||(typeof require==='function'?require('../core/part-identity.js'):null);

function build(THREE,data,{wx=v=>v/1000,wz=v=>v/1000,top=Infinity,lamps=true,bodies=[]}={}){
 const C=root.FurnishCeiling||require('../core/ceiling-core.js'),group=new THREE.Group();group.name='ceilings';
 const surface=new THREE.MeshStandardMaterial({color:'#f4f1e9',roughness:.95,side:THREE.DoubleSide}),light=new THREE.MeshStandardMaterial({color:'#fff4d8',emissive:'#ffde9e',emissiveIntensity:lamps?1.8:0,roughness:.5});
 // A flush finished ceiling wins the depth tie with a structural beam underside.
 // Raster depth bias keeps the saved height and production vertices unchanged.
 const flatSurface=surface.clone();flatSurface.polygonOffset=true;flatSurface.polygonOffsetFactor=-1;flatSurface.polygonOffsetUnits=-1;
 const panelSurface=flatSurface.clone();panelSurface.color.set('#f5f5f0');panelSurface.roughness=.48;panelSurface.metalness=.12;
 // At whole-home camera distances the 0.5 mm top separation can quantize
 // to one depth value. Give the panel a distinct raster priority over backing.
 panelSurface.polygonOffsetFactor=-2;panelSurface.polygonOffsetUnits=-4;
 const seamSurface=flatSurface.clone();seamSurface.color.set('#aaa99f');seamSurface.roughness=.85;
 const aluminum=new THREE.MeshStandardMaterial({color:'#a7afb3',metalness:.65,roughness:.35,side:THREE.DoubleSide}),diffuser=new THREE.MeshStandardMaterial({color:'#f6f7ef',emissive:'#fff1d2',emissiveIntensity:lamps ? .22 : 0,roughness:.65,transparent:true,opacity:.8,side:THREE.DoubleSide}),diffuserOff=diffuser.clone();diffuserOff.emissiveIntensity=0;
 let conflictLight=null;const lightMaterial=layout=>{if(!layout.pending.some(m=>m.includes('相交')))return light;if(!conflictLight){conflictLight=light.clone();conflictLight.color.set('#e96842');conflictLight.emissive.set('#e35030');conflictLight.emissiveIntensity=lamps?1:0;}return conflictLight;};
 const shape=p=>{const s=new THREE.Shape();p.forEach(([x,y],i)=>s[i?'lineTo':'moveTo'](x/1000,y/1000));s.closePath();return s;};
 function mesh(geometry,material,c,part){const m=syncIdentity.produce("ceiling-model:site-1",()=>new THREE.Mesh(geometry,material));m.userData.ceiling={id:c.id,part};m.userData.ceilingOwnMaterial=true;m.castShadow=part!=='light';m.receiveShadow=true;group.add(m);return m;}
 function sweep(c,p,material,part){
  const L=Math.hypot(c.path.b[0]-c.path.a[0],c.path.b[1]-c.path.a[1]),t=c.path.b.map((v,i)=>(v-c.path.a[i])/L),n=c.path.normal;
  const g=new THREE.ExtrudeGeometry(shape(p.map(([u,d])=>[u,-d])),{depth:L/1000,bevelEnabled:false,steps:1});
  const matrix=new THREE.Matrix4().set(n[0],0,t[0],wx(c.path.a[0]),0,1,0,c.height/1000,n[1],0,t[1],wz(c.path.a[1]),0,0,0,1);g.applyMatrix4(matrix);
  // Inward normals can make this basis a reflection; preserve outward winding.
  if(matrix.determinant()<0){const a=g.attributes.position.array;for(const name of ['position','normal','uv']){const attr=g.attributes[name];if(!attr)continue;for(let i=0;i<a.length/3;i+=3)for(let k=0;k<attr.itemSize;k++){const j=(i+1)*attr.itemSize+k,l=(i+2)*attr.itemSize+k,tmp=attr.array[j];attr.array[j]=attr.array[l];attr.array[l]=tmp;}attr.needsUpdate=true;}}
  g.computeBoundingBox();if(g.boundingBox.min.y*1000>=top){g.dispose();return;}return syncIdentity.produce("ceiling-model:site-2",()=>mesh(g,material,c,part));
 }
 function ringSweep(c,p,rings,material,part){
  // Shared rings have no internal caps. This represents both the mitered cove
  // and a single connected straight/arc/straight light body.
  const N=p.length,positions=[],indices=[];
  for(const ring of rings)for(let i=0;i<N;i++){const q=ring[i];positions.push(wx(q[0]),(c.height-p[i][1])/1000,wz(q[1]));}
  for(let k=0;k<rings.length-1;k++)for(let i=0;i<N;i++){const j=(i+1)%N,a=k*N+i,b=k*N+j;indices.push(a,b,b+N,a,b+N,a+N);}
  const end=(rings.length-1)*N;if(!c.path.closed)for(const tri of THREE.ShapeUtils.triangulateShape(p.map(([u,d])=>new THREE.Vector2(u,d)),[])){const [a,b,d]=tri.map(i=>p[i]),cross=(b[0]-a[0])*(d[1]-a[1])-(b[1]-a[1])*(d[0]-a[0]);if(Math.sign(cross)!==Math.sign(C.area(p)))[tri[1],tri[2]]=[tri[2],tri[1]];indices.push(tri[2],tri[1],tri[0],end+tri[0],end+tri[1],end+tri[2]);}
  let volume=0;for(let i=0;i<indices.length;i+=3){const a=indices[i]*3,b=indices[i+1]*3,d=indices[i+2]*3;volume+=positions[a]*(positions[b+1]*positions[d+2]-positions[b+2]*positions[d+1])+positions[a+1]*(positions[b+2]*positions[d]-positions[b]*positions[d+2])+positions[a+2]*(positions[b]*positions[d+1]-positions[b+1]*positions[d]);}
  if(volume<0)for(let i=0;i<indices.length;i+=3)[indices[i+1],indices[i+2]]=[indices[i+2],indices[i+1]];
  const indexed=new THREE.BufferGeometry();indexed.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));indexed.setIndex(indices);const g=indexed.toNonIndexed();indexed.dispose();g.computeVertexNormals();g.computeBoundingBox();
  if(g.boundingBox.min.y*1000>=top){g.dispose();return;}return syncIdentity.produce("ceiling-model:site-3",()=>mesh(g,material,c,part));
 }
 for(const c of syncIdentity.records("ceiling-model.js:generator-1",data?.items||[])){
  if(c.kind==='profile'){
   const p=c.section.vertices.map(v=>[v.u,v.d]),bodyMaterial=c.section.material==='aluminum'?aluminum:surface;if(c.path.segments)syncIdentity.produce("ceiling-model.js:generator-call-1",()=>ringSweep(c,p,C.offsetStations(c,0).map((_,k)=>p.map(([u])=>C.offsetStations(c,u)[k])),bodyMaterial,'section'));else syncIdentity.produce("ceiling-model.js:generator-call-2",()=>sweep(c,p,bodyMaterial,'section'));
   if(c.section.diffuser){const p=c.section.diffuser.vertices.map(v=>[v.u,v.d]),material=c.section.light&&lamps?diffuser:diffuserOff;syncIdentity.produce("ceiling-model.js:generator-call-7",()=>c.path.segments?ringSweep(c,p,C.offsetStations(c,0).map((_,k)=>p.map(([u])=>C.offsetStations(c,u)[k])),material,'diffuser'):sweep(c,p,material,'diffuser'));}
   for(const plate of syncIdentity.records("ceiling-model.js:generator-2",C.endCaps(c).plates)){const m=syncIdentity.produce("ceiling-model.js:generator-call-3",()=>sweep({...c,path:plate.path},plate.section,surface,'end-cap'));if(m)m.userData.ceiling.end=plate.end;}
   if(c.section.light){const layout=C.lightLayout(c);if(layout.continuous){const material=lightMaterial(layout),m=syncIdentity.produce("ceiling-model.js:generator-call-4",()=>ringSweep(c,C.lightPolygon(c.section.light),layout.continuous.rings,material,'light'));if(m)m.userData.ceiling.mode=layout.continuous.closed?'miter-ring':'arc';}else for(const piece of syncIdentity.records("ceiling-model.js:generator-3",layout.pieces)){const before=group.children.length;syncIdentity.produce("ceiling-model.js:generator-call-5",()=>sweep({...c,path:piece.path},C.lightPolygon(c.section.light),light,'light'));if(group.children.length>before)group.children.at(-1).userData.ceiling.legId=piece.legId;}}
  }else{
   if(c.aluminum){
    if(c.height>=top)continue;
    const layout=C.aluminumLayout(c),replacements=C.panelReplacements(c,bodies),holes=C.downlightHoles(c,bodies),holePolys=holes.map(h=>Array.from({length:64},(_,i)=>[h.x+h.r*Math.cos(i*Math.PI/32),h.y+h.r*Math.sin(i*Math.PI/32)])).concat(replacements.map(s=>s.cell));
    function panelMesh(polygons,bottom,material,part,token){
     const positions=[],normals=[];
     for(const poly of polygons){
      const relevant=holePolys.filter(h=>{const xs=poly.map(p=>p[0]),ys=poly.map(p=>p[1]),hx=h.map(p=>p[0]),hy=h.map(p=>p[1]);return Math.min(...hx)<=Math.max(...xs)&&Math.max(...hx)>=Math.min(...xs)&&Math.min(...hy)<=Math.max(...ys)&&Math.max(...hy)>=Math.min(...ys);}),Z=root.FurnishZoneGeometry||(typeof require==='function'?require('../core/zone-geometry.js'):null),pieces=relevant.length?Z.decompose([poly,...relevant],p=>Z.inside(p,poly)&&!relevant.some(h=>Z.inside(p,h))):[poly];
      for(const piece of pieces){const g=new THREE.ExtrudeGeometry(shape(piece.map(([x,y])=>[x,-y])),{depth:(c.thickness-bottom-(part==='panel-backing'?.5:0))/1000,bevelEnabled:false});g.rotateX(-Math.PI/2);g.translate(wx(0),(c.height+bottom)/1000,wz(0));positions.push(...g.attributes.position.array);normals.push(...g.attributes.normal.array);g.dispose();}
     }
     if(!positions.length)return;const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3));const m=syncIdentity.produce('ceiling-aluminum:'+part,()=>mesh(g,material,c,part));m.userData.furnishStablePart='aluminum:'+token;return m;
    }
    panelMesh([c.polygon],1.2,seamSurface,'panel-backing','backing');
    panelMesh(layout.trim,0,panelSurface,'panel-trim','trim');
    for(const panel of syncIdentity.records('ceiling-aluminum:panels',layout.panels.filter(p=>!replacements.some(s=>s.id===p.id))))panelMesh(panel.polygons,.35,panelSurface,'panel',panel.id);
    continue;
   }
   const outline=shape(c.polygon.map(([x,y])=>[x,-y]));
   for(const h of C.downlightHoles(c,bodies)){const hole=new THREE.Path();hole.absellipse(h.x/1000,-h.y/1000,h.r/1000,h.r/1000,0,Math.PI*2,false,0);outline.holes.push(hole);}
   const g=new THREE.ExtrudeGeometry(outline,{depth:c.thickness/1000,bevelEnabled:false,curveSegments:32});g.rotateX(-Math.PI/2);
   g.translate(wx(0),c.height/1000,wz(0));if(c.height>=top){g.dispose();continue;}syncIdentity.produce("ceiling-model:site-4",()=>mesh(g,flatSurface,c,'flat'));
  }
 }
 for(const material of [surface,flatSurface,panelSurface,seamSurface,light,aluminum,diffuser,diffuserOff,conflictLight])if(material&&!group.children.some(m=>m.material===material))material.dispose();return group;
}
function preview({THREE,OrbitControls,host,data,focusLight=false,focusEnd=null,focusAssembly=false,bodies=[]}){
 const renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,preserveDrawingBuffer:true});renderer.setPixelRatio(Math.min(devicePixelRatio||1,2));renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=.8;host.append(renderer.domElement);
 const scene=new THREE.Scene();scene.background=new THREE.Color('#e8e7e2');scene.add(new THREE.HemisphereLight(0xffffff,0x6b6861,2.5));const sun=new THREE.DirectionalLight(0xffffff,3);sun.position.set(2,5,3);scene.add(sun);const underside=new THREE.DirectionalLight(0xffffff,2);underside.position.set(-2,-5,1);scene.add(underside);underside.visible=data.items.some(c=>c.aluminum);
 function makeGroup(value){const group=syncIdentity.produce("ceiling-model.js:generator-call-6",()=>build(THREE,value,{bodies})),outline=new THREE.LineBasicMaterial({color:'#81796b',transparent:true,opacity:.55});for(const mesh of group.children.slice())if(mesh.userData.ceiling.part!=='light'&&!mesh.userData.ceiling.part.startsWith('panel'))group.add(new THREE.LineSegments(new THREE.EdgesGeometry(mesh.geometry,30),outline));if(!group.children.some(o=>o.material===outline))outline.dispose();
  const core=root.FurnishCeiling||(typeof require==='function'?require('../core/ceiling-core.js'):null),P=root.FurnishProducts||(typeof require==='function'?require('../core/product-rules.js'):null),ids=new Set(value.items.flatMap(c=>[...core.downlightHoles(c,bodies).map(h=>h.id),...core.panelReplacements(c,bodies).map(s=>s.fid)])),seen=new Set();
  for(const {f,vertical}of bodies){if(!ids.has(f.id)||seen.has(f.id)||!vertical)continue;seen.add(f.id);const builder=P.definition(f)?.ceilingPanel?root.FurnishBathHeaterModel:root.FurnishDownlightModel;if(!builder)continue;const model=builder.build(THREE,f);model.position.set(f.cx/1000,(vertical.bottom-P.value(f,'mountHeight'))/1000,f.cy/1000);model.rotation.y=-(f.rot||0)*Math.PI/180;model.scale.x=f.flip?-1:1;group.add(model);}
  return group;}
 function release(group){const materials=new Set();group.traverse(o=>{o.geometry?.dispose();if(o.material)materials.add(o.material);});materials.forEach(m=>m.dispose());}
 let group=makeGroup(data);scene.add(group);
 const C=root.FurnishCeiling||require('../core/ceiling-core.js'),profile=data.items.find(c=>c.kind==='profile'),arc=focusLight&&profile&&C.lightLayout(profile).continuous,plate=focusEnd&&profile&&C.endCaps(profile).plates.find(p=>p.end===focusEnd);
 let endBox=null,endDirection=null;if(plate){const legs=C.route(profile),index=focusEnd==='start'?0:legs.length-1,leg=legs[index],L=Math.hypot(leg.b[0]-leg.a[0],leg.b[1]-leg.a[1]),t=C.tangent(leg),travel=Math.min(L,Math.max(80,plate.thickness+plate.lightGap+40)),points=[];for(const [u,d] of plate.section)for(const s of [0,travel]){const q=C.pointAt(profile,u,focusEnd==='start'?s:L-s,index);points.push(new THREE.Vector3(q[0]/1000,(profile.height-d)/1000,q[1]/1000));}endBox=new THREE.Box3().setFromPoints(points).expandByScalar(.025);endDirection=t.map((v,i)=>v*(focusEnd==='start'?1:-1)+leg.normal[i]*.8);}
 function framingBox(value,group){if(focusAssembly){const source=value.items.find(c=>c.kind==='profile'&&c.section.template?.kind==='upChannel');if(source){const pointsUD=C.sectionPoints(source.section),us=pointsUD.map(v=>v.u),ds=pointsUD.map(v=>v.d),leg=C.route(source)[0],L=Math.hypot(leg.b[0]-leg.a[0],leg.b[1]-leg.a[1]),points=[];for(const u of [Math.min(...us)-20,Math.max(...us)+90])for(const along of [L/2-Math.min(75,L/4),L/2+Math.min(75,L/4)])for(const d of [Math.min(...ds)-15,Math.max(...ds)+35]){const p=C.pointAt(source,u,along);points.push(new THREE.Vector3(p[0]/1000,(source.height-d)/1000,p[1]/1000));}return new THREE.Box3().setFromPoints(points);}}return new THREE.Box3().setFromObject(group);}
 const box=endBox||(arc?new THREE.Box3().setFromPoints(arc.rings.slice(1,-1).flatMap(ring=>ring.map((q,i)=>new THREE.Vector3(q[0]/1000,(profile.height-C.lightPolygon(profile.section.light)[i][1])/1000,q[1]/1000)))).expandByScalar(.03):framingBox(data,group)),center=box.getCenter(new THREE.Vector3()),size=box.getSize(new THREE.Vector3());
 const camera=new THREE.PerspectiveCamera(40,1,.03,100);const leg=profile&&C.route(profile)[0],n=leg?.normal||[0,1],t=leg?C.tangent(leg):[1,0];
 const aspect=Math.max(.1,host.clientWidth/Math.max(180,host.clientHeight)),halfFov=Math.atan(Math.tan(Math.PI/9)*Math.min(1,aspect)),distance=Math.max(size.length()/2,.1)/Math.sin(halfFov)*1.15;
 const direction=endDirection||(profile?.path.segments&&!profile.path.closed?C.route(profile).reduce((sum,p)=>sum.map((v,i)=>v+p.normal[i]),[0,0]):n.map((v,i)=>v*1.1+t[i]*.85));
 camera.position.copy(center).add(new THREE.Vector3(direction[0],data.items.some(c=>c.aluminum)?-1.8:arc||plate?1.4:.65,direction[1]).normalize().multiplyScalar(distance));camera.lookAt(center);const controls=new OrbitControls(camera,renderer.domElement);controls.target.copy(center);controls.enableDamping=false;controls.update();
 const unbindNavigation=root.FurnishNavigation?.bindOrbit(renderer.domElement,()=>controls)||(()=>{});
 const draw=()=>renderer.render(scene,camera),resize=()=>{const w=host.clientWidth,h=Math.max(180,host.clientHeight);renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();draw();},observer=new ResizeObserver(resize);observer.observe(host);controls.addEventListener('change',draw);resize();
 return {update(value){const oldBox=framingBox(data,group),oldCenter=oldBox.getCenter(new THREE.Vector3()),next=makeGroup(value),box=framingBox(value,next),center=box.getCenter(new THREE.Vector3()),delta=center.clone().sub(oldCenter),oldSize=oldBox.getSize(new THREE.Vector3()).length(),newSize=box.getSize(new THREE.Vector3()).length();scene.remove(group);release(group);group=next;data=value;underside.visible=data.items.some(c=>c.aluminum);scene.add(group);camera.position.add(delta);controls.target.add(delta);if(newSize>oldSize*1.35&&oldSize>0)camera.position.sub(controls.target).multiplyScalar(newSize/oldSize).add(controls.target);controls.update();draw();},dispose(){unbindNavigation();observer.disconnect();controls.dispose();release(group);renderer.dispose();renderer.forceContextLoss();renderer.domElement.remove();}};
}
// View-only overrides. Restore before layers/clipping/export inspect the scene;
// neither production geometry nor saved materials are changed by this mode.
function createDisplay(THREE){
 const overrides=new Map(),materials=new Map(),outlines=new Map(),states=new Map(),position=new THREE.Vector3(),bounds=new THREE.Box3();
 function restore(){for(const [m,s]of overrides){m.material=s.material;m.visible=s.visible;m.castShadow=s.castShadow;m.renderOrder=s.renderOrder;}overrides.clear();for(const line of outlines.values())line.visible=false;}
 function clear(){restore();for(const m of materials.values())m.dispose();materials.clear();for(const line of outlines.values()){line.removeFromParent();line.geometry.dispose();line.material.dispose();}outlines.clear();states.clear();}
 function update(group,camera,mode='solid'){
  restore();camera.getWorldPosition(position);group.updateWorldMatrix(true,true);let changed=false;
  group.traverse(m=>{
   const part=m.userData.ceiling?.part;if(!m.isMesh||!part)return;
   if(!m.geometry.boundingBox)m.geometry.computeBoundingBox();bounds.copy(m.geometry.boundingBox).applyMatrix4(m.matrixWorld);
   const luminous=part==='light'||part==='diffuser',above=mode==='ghost'&&position.y>bounds.max.y,hidden=mode==='hidden'&&!luminous||above&&part==='panel-backing',ghost=above&&!luminous&&!hidden,next=hidden?'hidden':ghost?'ghost':'solid';
   if(states.get(m)!==next){states.set(m,next);changed=true;}
   if(next==='solid')return;
   overrides.set(m,{material:m.material,visible:m.visible,castShadow:m.castShadow,renderOrder:m.renderOrder});
   if(hidden){m.visible=false;return;}
   let material=materials.get(m.material);if(!material){material=m.material.clone();material.transparent=true;material.opacity=.25;material.depthWrite=false;material.side=THREE.FrontSide;material.onBeforeCompile=m.material.onBeforeCompile;material.customProgramCacheKey=m.material.customProgramCacheKey;materials.set(m.material,material);}
   m.material=material;m.castShadow=false;m.renderOrder=1;
   if(part==='panel'||part==='panel-trim'){
    let line=outlines.get(m);if(!line){
     const edges=new THREE.EdgesGeometry(m.geometry),a=edges.attributes.position.array,vertices=[];m.geometry.computeBoundingBox();const top=m.geometry.boundingBox.max.y;
     for(let i=0;i<a.length;i+=6)if(Math.abs(a[i+1]-top)<1e-5&&Math.abs(a[i+4]-top)<1e-5)vertices.push(...a.slice(i,i+6));edges.dispose();
     const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));line=new THREE.LineSegments(g,new THREE.LineBasicMaterial({color:'#81796b',transparent:true,opacity:.45,depthWrite:false}));line.renderOrder=2;line.userData.ceilingViewHelper=true;m.add(line);outlines.set(m,line);
    }line.material.clippingPlanes=material.clippingPlanes;line.visible=true;
   }
  });return changed;
 }
 return {restore,clear,update};
}
const api={build,preview,createDisplay};if(typeof module==='object'&&module.exports)module.exports=api;else root.FurnishCeilingModel=api;
})(typeof globalThis!=='undefined'?globalThis:this);
