/* Origin-only edits on one production wall, in local facing-wall mm coordinates. */
(function(root){
'use strict';
const floor=()=>root.FurnishFloorOriginPreview||require('./floor-origin-preview.js');
function space(sections){
 const Z=root.FurnishZoneGeometry||require('../core/zone-geometry.js'),polys=sections.map(([a,b,c,d])=>[[a,b],[c,b],[c,d],[a,d]]);
 return Z.outline(Z.decompose(polys,p=>polys.some(poly=>Z.inside(p,poly))));
}
function guides(e,room){
 const lines=[];for(const ring of room.rings)for(let i=0;i<ring.length;i++){
  const a=ring[i],b=ring[(i+1)%ring.length],vertical=Math.abs(a[0]-b[0])<1e-5&&(Math.abs(a[0])<1e-5||Math.abs(a[0]-e.width)<1e-5),ground=Math.abs(a[1]-e.floorZ)<1e-5&&Math.abs(b[1]-e.floorZ)<1e-5;
  if(vertical||ground)lines.push([a,b]);
 }return lines;
}
function snap(e,room,point,project,tolerance=12){
 const lines=guides(e,room),result=floor().snapHandle(room,point,project,tolerance,lines,lines.flat());if(!result?.snapped)return result;
 const corner=Math.min(Math.abs(result.point[0]),Math.abs(result.point[0]-e.width))<1e-5,ground=Math.abs(result.point[1]-e.floorZ)<1e-5;
 return {...result,kind:corner&&ground?'intersection':ground?'floor':'corner'};
}
function create(THREE){
 const originals=new Map();let current=null,room=null,marker=null,anchor=null,outline=null;
 function clear(){for(const [g,array] of originals){const uv=g.getAttribute('uv');if(uv?.array.length===array.length){uv.array.set(array);uv.needsUpdate=true;}}originals.clear();for(const o of [marker,outline])if(o){o.removeFromParent();o.geometry.dispose();o.material.dispose();}current=room=marker=anchor=outline=null;}
 function world(e,point,{wx=v=>v/1000,wz=v=>v/1000}={}){const p=[0,0];p[e.axis]=e.zero+e.dir*point[0];p[e.normal]=e.position+e.face.side*3;return new THREE.Vector3(wx(p[0]),point[1]/1000,wz(p[1]));}
 function update(e,{wallGroup,wx,wz,handlePoint}={}){
  const T=root.FurnishWallTiling||require('../core/wall-tiling-core.js'),W=root.FurnishWallTilingModel||require('./wall-tiling-model.js');
  try{
   if(e.bands)throw Error('此墙已上下分带，请在分带编辑中分别设置各带起铺参数');
   if(![e.position,e.floorZ,e.originZ].every(Number.isFinite))throw Error('请先确定墙面位置、完成地面和起铺标高');
   if(current&&!T.same(current.face,e.face))clear();const meshes=[];wallGroup.traverse(m=>{if(m.userData.wallTiling&&T.same(m.userData.wallTiling,e.face))meshes.push(m);});if(!meshes.length)throw Error('当前场景没有此墙可预览表面，请启用排版、核对完成面，或切换全高墙');
   const sections=meshes.map(m=>m.userData.wallTiling.rect),signature=JSON.stringify(sections);if(!room||signature!==current?.sectionSignature){if(outline){outline.removeFromParent();outline.geometry.dispose();outline.material.dispose();outline=null;}room=space(sections);if(!room.poly.length)throw Error('当前墙面没有可拖动的铺贴区域');}
   current={...e,sections,sectionSignature:signature,height:Math.max(...sections.map(r=>r[3]))};
   for(const m of meshes){if(!originals.has(m.geometry))originals.set(m.geometry,m.geometry.getAttribute('uv').array.slice());W.uv(THREE,m.geometry,T.grid(e),m.userData.wallTiling.rect);}
   if(!marker){marker=new THREE.Mesh(new THREE.RingGeometry(.035,.05,32),new THREE.MeshBasicMaterial({color:'#e8590c',side:THREE.DoubleSide,depthTest:false}));marker.renderOrder=25;marker.userData.wallOriginMarker=true;wallGroup.add(marker);}
   const n=new THREE.Vector3(e.normal===0?e.face.side:0,0,e.normal===1?e.face.side:0);marker.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1),n);
   anchor=floor().anchor(room,{...T.grid(e),origin:[e.layout.offset,e.originZ]},handlePoint);if(!anchor)throw Error('此墙面没有可用起铺手柄');marker.position.copy(world(e,anchor,{wx,wz}));
   if(!outline){const points=room.rings.flatMap(r=>r.flatMap((p,i)=>[world(e,p,{wx,wz}),world(e,r[(i+1)%r.length],{wx,wz})]));outline=new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(points),new THREE.LineBasicMaterial({color:'#087f5b',depthTest:false,transparent:true,opacity:.65}));outline.renderOrder=20;outline.userData.wallOriginMarker=true;wallGroup.add(outline);}
   return {surfaces:meshes.length,origin:[e.layout.offset,e.originZ]};
  }catch(error){clear();throw error;}
 }
 function resizeHandle(camera,height){if(marker&&height)marker.scale.setScalar(Math.max(.01,2*marker.position.distanceTo(camera.position)*Math.tan(camera.fov*Math.PI/360)/height*18/.05));}
 return {update,clear,world,resizeHandle,get elevation(){return current;},get room(){return room;},get handle(){return marker?{point:marker.position.clone(),local:anchor.slice()}:null;},get active(){return originals.size>0;}};
}
const api={create,space,guides,snap};if(typeof module==='object'&&module.exports)module.exports=api;else root.FurnishWallOriginPreview=api;
})(typeof globalThis!=='undefined'?globalThis:this);
