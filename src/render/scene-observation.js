/* Temporary camera framing and architectural cutaway. World coordinates are metres. */
(function(root){
'use strict';
function corners(THREE,bounds){
 const points=[];for(const x of [bounds.min.x,bounds.max.x])for(const y of [bounds.min.y,bounds.max.y])for(const z of [bounds.min.z,bounds.max.z])points.push(new THREE.Vector3(x,y,z));return points;
}
function fit(THREE,camera,bounds,direction,{width,height,marginX=24,marginY=24,minDistance=1.5}={}){
 if(bounds.isEmpty())return null;
 const t=bounds.getCenter(new THREE.Vector3()),out=direction.clone().normalize();
 if(out.lengthSq()<.01)out.set(0,.2,1).normalize();
 const right=new THREE.Vector3().crossVectors(camera.up,out).normalize();if(right.lengthSq()<.01)right.set(1,0,0);
 const up=new THREE.Vector3().crossVectors(out,right).normalize(),tanY=Math.tan(camera.getEffectiveFOV()*Math.PI/360),tanX=tanY*camera.aspect;
 const sx=Math.max(.1,1-2*marginX/width),sy=Math.max(.1,1-2*marginY/height);
 let distance=minDistance;
 for(const p of corners(THREE,bounds)){
  const q=p.sub(t),z=q.dot(out);
  distance=Math.max(distance,z+Math.abs(q.dot(right))*1.08/(tanX*sx),z+Math.abs(q.dot(up))*1.08/(tanY*sy),z+camera.near+.1);
 }
 return {t,p:t.clone().addScaledVector(out,distance)};
}
function create(THREE){
 const originals=new Map(),plane=new THREE.Plane(),normal=new THREE.Vector3();let signature='';
 function clear(){
  const changed=originals.size>0;
  for(const [mesh,original] of originals){for(const m of new Set(Array.isArray(mesh.material)?mesh.material:[mesh.material]))m.dispose();mesh.material=original;}
  originals.clear();signature='';return changed;
 }
 function update(camera,bounds,architecture){
  camera.getWorldDirection(normal).normalize();
  // Keep architecture behind the nearest point of the target; cut its camera-facing side.
  plane.set(normal, -Math.min(...corners(THREE,bounds).map(p=>p.dot(normal)))+.12);
  const next=[...normal.toArray(),plane.constant].map(v=>v.toFixed(6)).join(',');let changed=next!==signature;signature=next;
  architecture.traverse(mesh=>{
   if(!mesh.isMesh||mesh.userData.walkOnly||mesh.userData.room)return;
   if(originals.has(mesh))return;
   const original=mesh.material,clone=m=>{const copy=m.clone();copy.clippingPlanes=[...(m.clippingPlanes||[]),plane];copy.clipShadows=true;return copy;};
   originals.set(mesh,original);mesh.material=Array.isArray(original)?original.map(clone):clone(original);changed=true;
  });
  return changed;
 }
 function clipped(hit){return originals.has(hit.object)&&plane.distanceToPoint(hit.point)<0;}
 return {clear,update,clipped,material:mesh=>originals.get(mesh)||mesh.material};
}
const api={corners,fit,create};if(typeof module==='object'&&module.exports)module.exports=api;else root.FurnishSceneObservation=api;
})(typeof globalThis!=='undefined'?globalThis:this);
