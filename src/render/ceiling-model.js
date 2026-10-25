/* The editor preview and the main scene use this same production constructor. */
(function(root){
'use strict';
// Stable authoring-site labels: keep existing labels when moving code; allocate new labels for new sites.
const syncIdentity=root.FurnishPartIdentity||(typeof require==='function'?require('../core/part-identity.js'):null);

function build(THREE,data,{wx=v=>v/1000,wz=v=>v/1000,top=Infinity,lamps=true,bodies=[]}={}){
 const C=root.FurnishCeiling||require('../core/ceiling-core.js'),group=new THREE.Group();group.name='ceilings';
 const surface=new THREE.MeshStandardMaterial({color:'#f4f1e9',roughness:.95,side:THREE.DoubleSide}),light=new THREE.MeshStandardMaterial({color:'#fff4d8',emissive:'#ffde9e',emissiveIntensity:lamps?1.8:0,roughness:.5});
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
   const p=c.section.vertices.map(v=>[v.u,v.d]);if(c.path.segments)syncIdentity.produce("ceiling-model.js:generator-call-1",()=>ringSweep(c,p,C.offsetStations(c,0).map((_,k)=>p.map(([u])=>C.offsetStations(c,u)[k])),surface,'section'));else syncIdentity.produce("ceiling-model.js:generator-call-2",()=>sweep(c,p,surface,'section'));
   for(const plate of syncIdentity.records("ceiling-model.js:generator-2",C.endCaps(c).plates)){const m=syncIdentity.produce("ceiling-model.js:generator-call-3",()=>sweep({...c,path:plate.path},plate.section,surface,'end-cap'));if(m)m.userData.ceiling.end=plate.end;}
   if(c.section.light){const layout=C.lightLayout(c);if(layout.continuous){const material=lightMaterial(layout),m=syncIdentity.produce("ceiling-model.js:generator-call-4",()=>ringSweep(c,C.lightPolygon(c.section.light),layout.continuous.rings,material,'light'));if(m)m.userData.ceiling.mode=layout.continuous.closed?'miter-ring':'arc';}else for(const piece of syncIdentity.records("ceiling-model.js:generator-3",layout.pieces)){const before=group.children.length;syncIdentity.produce("ceiling-model.js:generator-call-5",()=>sweep({...c,path:piece.path},C.lightPolygon(c.section.light),light,'light'));if(group.children.length>before)group.children.at(-1).userData.ceiling.legId=piece.legId;}}
  }else{
   const outline=shape(c.polygon.map(([x,y])=>[x,-y]));
   for(const h of C.downlightHoles(c,bodies)){const hole=new THREE.Path();hole.absellipse(h.x/1000,-h.y/1000,h.r/1000,h.r/1000,0,Math.PI*2,false,0);outline.holes.push(hole);}
   const g=new THREE.ExtrudeGeometry(outline,{depth:c.thickness/1000,bevelEnabled:false,curveSegments:32});g.rotateX(-Math.PI/2);
   g.translate(wx(0),c.height/1000,wz(0));if(c.height>=top){g.dispose();continue;}syncIdentity.produce("ceiling-model:site-4",()=>mesh(g,surface,c,'flat'));
  }
 }
 if(!group.children.some(m=>m.material===surface))surface.dispose();if(!group.children.some(m=>m.material===light))light.dispose();if(conflictLight&&!group.children.some(m=>m.material===conflictLight))conflictLight.dispose();return group;
}
function preview({THREE,OrbitControls,host,data,focusLight=false,focusEnd=null}){
 const renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,preserveDrawingBuffer:true});renderer.setPixelRatio(Math.min(devicePixelRatio||1,2));renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=.8;host.append(renderer.domElement);
 const scene=new THREE.Scene();scene.background=new THREE.Color('#e8e7e2');scene.add(new THREE.HemisphereLight(0xffffff,0x6b6861,2.5));const sun=new THREE.DirectionalLight(0xffffff,3);sun.position.set(2,5,3);scene.add(sun);
 const group=syncIdentity.produce("ceiling-model.js:generator-call-6",()=>build(THREE,data)),outline=new THREE.LineBasicMaterial({color:'#81796b',transparent:true,opacity:.55});
 for(const mesh of group.children.slice())if(mesh.userData.ceiling.part!=='light')group.add(new THREE.LineSegments(new THREE.EdgesGeometry(mesh.geometry,30),outline));scene.add(group);
 const C=root.FurnishCeiling||require('../core/ceiling-core.js'),profile=data.items.find(c=>c.kind==='profile'),arc=focusLight&&profile&&C.lightLayout(profile).continuous,plate=focusEnd&&profile&&C.endCaps(profile).plates.find(p=>p.end===focusEnd);
 let endBox=null,endDirection=null;if(plate){const legs=C.route(profile),index=focusEnd==='start'?0:legs.length-1,leg=legs[index],L=Math.hypot(leg.b[0]-leg.a[0],leg.b[1]-leg.a[1]),t=C.tangent(leg),travel=Math.min(L,Math.max(80,plate.thickness+plate.lightGap+40)),points=[];for(const [u,d] of plate.section)for(const s of [0,travel]){const q=C.pointAt(profile,u,focusEnd==='start'?s:L-s,index);points.push(new THREE.Vector3(q[0]/1000,(profile.height-d)/1000,q[1]/1000));}endBox=new THREE.Box3().setFromPoints(points).expandByScalar(.025);endDirection=t.map((v,i)=>v*(focusEnd==='start'?1:-1)+leg.normal[i]*.8);}
 const box=endBox||(arc?new THREE.Box3().setFromPoints(arc.rings.slice(1,-1).flatMap(ring=>ring.map((q,i)=>new THREE.Vector3(q[0]/1000,(profile.height-C.lightPolygon(profile.section.light)[i][1])/1000,q[1]/1000)))).expandByScalar(.03):new THREE.Box3().setFromObject(group)),center=box.getCenter(new THREE.Vector3()),size=box.getSize(new THREE.Vector3());
 const camera=new THREE.PerspectiveCamera(40,1,.001,100);const leg=profile&&C.route(profile)[0],n=leg?.normal||[0,1],t=leg?C.tangent(leg):[1,0];
 const aspect=Math.max(.1,host.clientWidth/Math.max(180,host.clientHeight)),halfFov=Math.atan(Math.tan(Math.PI/9)*Math.min(1,aspect)),distance=Math.max(size.length()/2,.1)/Math.sin(halfFov)*1.15;
 const direction=endDirection||(profile?.path.segments&&!profile.path.closed?C.route(profile).reduce((sum,p)=>sum.map((v,i)=>v+p.normal[i]),[0,0]):n.map((v,i)=>v*1.1+t[i]*.85));
 camera.position.copy(center).add(new THREE.Vector3(direction[0],arc||plate?1.4:.65,direction[1]).normalize().multiplyScalar(distance));camera.lookAt(center);const controls=new OrbitControls(camera,renderer.domElement);controls.target.copy(center);controls.enableDamping=false;controls.update();
 const unbindNavigation=root.FurnishNavigation?.bindOrbit(renderer.domElement,()=>controls)||(()=>{});
 const draw=()=>renderer.render(scene,camera),resize=()=>{const w=host.clientWidth,h=Math.max(180,host.clientHeight);renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();draw();},observer=new ResizeObserver(resize);observer.observe(host);controls.addEventListener('change',draw);resize();
 return {dispose(){unbindNavigation();observer.disconnect();controls.dispose();group.traverse(o=>o.geometry?.dispose());const materials=new Set();group.traverse(o=>{if(o.material)materials.add(o.material);});materials.forEach(m=>m.dispose());renderer.dispose();renderer.forceContextLoss();renderer.domElement.remove();}};
}
const api={build,preview};if(typeof module==='object'&&module.exports)module.exports=api;else root.FurnishCeilingModel=api;
})(typeof globalThis!=='undefined'?globalThis:this);
