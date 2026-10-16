/* The editor preview and the main scene use this same production constructor. */
(function(root){
'use strict';
function build(THREE,data,{wx=v=>v/1000,wz=v=>v/1000,top=Infinity,lamps=true}={}){
 const C=root.FurnishCeiling||require('../core/ceiling-core.js'),group=new THREE.Group();group.name='ceilings';
 const surface=new THREE.MeshStandardMaterial({color:'#f4f1e9',roughness:.95,side:THREE.DoubleSide}),light=new THREE.MeshStandardMaterial({color:'#fff4d8',emissive:'#ffde9e',emissiveIntensity:lamps?1.8:0,roughness:.5});
 const shape=p=>{const s=new THREE.Shape();p.forEach(([x,y],i)=>s[i?'lineTo':'moveTo'](x/1000,y/1000));s.closePath();return s;};
 function mesh(geometry,material,c,part){const m=new THREE.Mesh(geometry,material);m.userData.ceiling={id:c.id,part};m.userData.ceilingOwnMaterial=true;m.castShadow=part!=='light';m.receiveShadow=true;group.add(m);return m;}
 function sweep(c,p,material,part){
  const L=Math.hypot(c.path.b[0]-c.path.a[0],c.path.b[1]-c.path.a[1]),t=c.path.b.map((v,i)=>(v-c.path.a[i])/L),n=c.path.normal;
  const g=new THREE.ExtrudeGeometry(shape(p.map(([u,d])=>[u,-d])),{depth:L/1000,bevelEnabled:false,steps:1});
  const matrix=new THREE.Matrix4().set(n[0],0,t[0],wx(c.path.a[0]),0,1,0,c.height/1000,n[1],0,t[1],wz(c.path.a[1]),0,0,0,1);g.applyMatrix4(matrix);
  // Inward normals can make this basis a reflection; preserve outward winding.
  if(matrix.determinant()<0){const a=g.attributes.position.array;for(const name of ['position','normal','uv']){const attr=g.attributes[name];if(!attr)continue;for(let i=0;i<a.length/3;i+=3)for(let k=0;k<attr.itemSize;k++){const j=(i+1)*attr.itemSize+k,l=(i+2)*attr.itemSize+k,tmp=attr.array[j];attr.array[j]=attr.array[l];attr.array[l]=tmp;}attr.needsUpdate=true;}}
  g.computeBoundingBox();if(g.boundingBox.min.y*1000>=top){g.dispose();return;}mesh(g,material,c,part);
 }
 function cornerSweep(c,p){
  // All section vertices share the same miter station. Only the two open ends
  // are capped, so the cove remains open through the corner.
  const N=p.length,positions=[],indices=[];
  for(let station=0;station<3;station++)for(const [u,d] of p){const q=C.offsetStations(c,u)[station];positions.push(wx(q[0]),(c.height-d)/1000,wz(q[1]));}
  for(let k=0;k<2;k++)for(let i=0;i<N;i++){const j=(i+1)%N,a=k*N+i,b=k*N+j;indices.push(a,b,b+N,a,b+N,a+N);}
  for(const tri of THREE.ShapeUtils.triangulateShape(p.map(([u,d])=>new THREE.Vector2(u,d)),[])){const [a,b,d]=tri.map(i=>p[i]),cross=(b[0]-a[0])*(d[1]-a[1])-(b[1]-a[1])*(d[0]-a[0]);if(Math.sign(cross)!==Math.sign(C.area(p)))[tri[1],tri[2]]=[tri[2],tri[1]];indices.push(tri[2],tri[1],tri[0],2*N+tri[0],2*N+tri[1],2*N+tri[2]);}
  let volume=0;for(let i=0;i<indices.length;i+=3){const a=indices[i]*3,b=indices[i+1]*3,d=indices[i+2]*3;volume+=positions[a]*(positions[b+1]*positions[d+2]-positions[b+2]*positions[d+1])+positions[a+1]*(positions[b+2]*positions[d]-positions[b]*positions[d+2])+positions[a+2]*(positions[b]*positions[d+1]-positions[b+1]*positions[d]);}
  if(volume<0)for(let i=0;i<indices.length;i+=3)[indices[i+1],indices[i+2]]=[indices[i+2],indices[i+1]];
  const indexed=new THREE.BufferGeometry();indexed.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));indexed.setIndex(indices);const g=indexed.toNonIndexed();indexed.dispose();g.computeVertexNormals();g.computeBoundingBox();
  if(g.boundingBox.min.y*1000>=top){g.dispose();return;}mesh(g,surface,c,'section');
 }
 for(const c of data?.items||[]){
  if(c.kind==='profile'){
   const p=c.section.vertices.map(v=>[v.u,v.d]);if(c.path.segments)cornerSweep(c,p);else sweep(c,p,surface,'section');
   if(c.section.light)for(const piece of C.lightLayout(c).pieces){const before=group.children.length;sweep({...c,path:piece.path},C.lightPolygon(c.section.light),light,'light');if(group.children.length>before)group.children.at(-1).userData.ceiling.legId=piece.legId;}
  }else{
   const g=new THREE.ExtrudeGeometry(shape(c.polygon.map(([x,y])=>[x,-y])),{depth:c.thickness/1000,bevelEnabled:false});g.rotateX(-Math.PI/2);
   g.translate(wx(0),c.height/1000,wz(0));if(c.height>=top){g.dispose();continue;}mesh(g,surface,c,'flat');
  }
 }
 if(!group.children.some(m=>m.material===surface))surface.dispose();if(!group.children.some(m=>m.material===light))light.dispose();return group;
}
function preview({THREE,OrbitControls,host,data}){
 const renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,preserveDrawingBuffer:true});renderer.setPixelRatio(Math.min(devicePixelRatio||1,2));renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=.8;host.append(renderer.domElement);
 const scene=new THREE.Scene();scene.background=new THREE.Color('#e8e7e2');scene.add(new THREE.HemisphereLight(0xffffff,0x6b6861,2.5));const sun=new THREE.DirectionalLight(0xffffff,3);sun.position.set(2,5,3);scene.add(sun);
 const group=build(THREE,data),outline=new THREE.LineBasicMaterial({color:'#81796b',transparent:true,opacity:.55});
 for(const mesh of group.children.slice())if(mesh.userData.ceiling.part!=='light')group.add(new THREE.LineSegments(new THREE.EdgesGeometry(mesh.geometry,30),outline));scene.add(group);
 const box=new THREE.Box3().setFromObject(group),center=box.getCenter(new THREE.Vector3()),size=box.getSize(new THREE.Vector3());
 const camera=new THREE.PerspectiveCamera(40,1,.001,100);const profile=data.items.find(c=>c.kind==='profile'),C=root.FurnishCeiling||require('../core/ceiling-core.js'),leg=profile&&C.route(profile)[0],n=leg?.normal||[0,1],t=leg?C.tangent(leg):[1,0];
 const aspect=Math.max(.1,host.clientWidth/Math.max(180,host.clientHeight)),halfFov=Math.atan(Math.tan(Math.PI/9)*Math.min(1,aspect)),distance=Math.max(size.length()/2,.1)/Math.sin(halfFov)*1.15;
 const direction=profile?.path.segments?C.route(profile).reduce((sum,p)=>sum.map((v,i)=>v+p.normal[i]),[0,0]):n.map((v,i)=>v*1.1+t[i]*.85);
 camera.position.copy(center).add(new THREE.Vector3(direction[0],.65,direction[1]).normalize().multiplyScalar(distance));camera.lookAt(center);const controls=new OrbitControls(camera,renderer.domElement);controls.target.copy(center);controls.enableDamping=false;controls.update();
 const draw=()=>renderer.render(scene,camera),resize=()=>{const w=host.clientWidth,h=Math.max(180,host.clientHeight);renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();draw();},observer=new ResizeObserver(resize);observer.observe(host);controls.addEventListener('change',draw);resize();
 return {dispose(){observer.disconnect();controls.dispose();group.traverse(o=>o.geometry?.dispose());const materials=new Set();group.traverse(o=>{if(o.material)materials.add(o.material);});materials.forEach(m=>m.dispose());renderer.dispose();renderer.forceContextLoss();renderer.domElement.remove();}};
}
const api={build,preview};if(typeof module==='object'&&module.exports)module.exports=api;else root.FurnishCeilingModel=api;
})(typeof globalThis!=='undefined'?globalThis:this);
