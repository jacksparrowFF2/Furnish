/* Production floor layer solids in metres; grid UVs use the original mm datum. */
(function(root){
'use strict';
function material(THREE,layout,{color='#e8e2d8'}={}){
 const canvas=document.createElement('canvas');canvas.width=canvas.height=1024;const c=canvas.getContext('2d');
 c.fillStyle='#aaa69d';c.fillRect(0,0,1024,1024);c.fillStyle=/^#[0-9a-f]{3,8}$/i.test(color)?color:'#e8e2d8';
 c.fillRect(0,0,1024*layout.width/(layout.width+layout.gap),1024*layout.height/(layout.height+layout.gap));
 const map=new THREE.CanvasTexture(canvas);map.wrapS=map.wrapT=THREE.RepeatWrapping;map.colorSpace=THREE.SRGBColorSpace;map.flipY=false;
 return new THREE.MeshStandardMaterial({map,roughness:.65});
}
function uv(THREE,geometry,layout,{wx=v=>v/1000,wz=v=>v/1000}={}){
 const attr=geometry.attributes.position,out=[],a=layout.angle*Math.PI/180,c=Math.cos(a),s=Math.sin(a),x0=wx(layout.origin[0]),z0=wz(layout.origin[1]);
 for(let i=0;i<attr.count;i++){const x=(attr.getX(i)-x0)*1000,y=(attr.getZ(i)-z0)*1000;out.push((c*x+s*y)/(layout.width+layout.gap),(-s*x+c*y)/(layout.height+layout.gap));}
 geometry.setAttribute('uv',new THREE.Float32BufferAttribute(out,2));return geometry;
}
function layers(THREE,room,area,{wx=v=>v/1000,wz=v=>v/1000}={}){
 if(!Number.isFinite(area?.finishedZ))return null;
 const group=new THREE.Group();let bottom=area.rawZ;
 for(const [layer,height,color] of [['base',area.baseThickness,'#aaa397'],['tile',area.tileThickness,'#e3ddd2']]){
  if(height>0){
   const shapes=(room.polys||[room.poly]).map(poly=>{const s=new THREE.Shape();poly.forEach(([x,y],i)=>s[i?'lineTo':'moveTo'](wx(x),-wz(y)));return s;});
   const geo=new THREE.ExtrudeGeometry(shapes,{depth:height/1000,bevelEnabled:false});geo.rotateX(-Math.PI/2);
   const mesh=new THREE.Mesh(geo,new THREE.MeshStandardMaterial({color,roughness:1,polygonOffset:true,polygonOffsetFactor:1,polygonOffsetUnits:1}));mesh.position.y=bottom/1000;
   mesh.userData.floorLayer={roomId:room.id,layer,bottom,top:bottom+height};mesh.receiveShadow=true;group.add(mesh);
  }bottom+=height;
 }
 return group;
}
const api={material,uv,layers};if(typeof module==='object'&&module.exports)module.exports=api;else root.FurnishFloorFinishModel=api;
})(typeof globalThis!=='undefined'?globalThis:this);
