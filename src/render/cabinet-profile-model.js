/* Production renderer for editable physical component profiles. */
(function(root){
 'use strict';
 const identity=root.FurnishPartIdentity||(typeof require==='function'?require('../core/part-identity.js'):null);
 function build(T,f,box,{options={}}={}){
  const B=root.FurnishCabinetBuilder||require('../core/cabinet-builder-core.js'),P=root.FurnishCabinetProfiles||require('../core/cabinet-component-profiles.js'),out=new T.Group();
  const shape=data=>{const s=new T.Shape();for(const c of data.commands){if(c[0]==='M')s.moveTo(c[1]/1000,c[2]/1000);if(c[0]==='L')s.lineTo(c[1]/1000,c[2]/1000);if(c[0]==='Z')s.closePath();if(c[0]==='A')s.absarc(c[1]/1000,c[2]/1000,c[3]/1000,c[4],c[5],c[6]);}s.holes=data.holes.map(shape);return s;};
  for(const row of B.derived(f))for(const p of row.box.components.filter(p=>p.profile)){
   if(options.doors==='hidden'&&p.kind==='multiDoor')continue;const container=new T.Group(),groups=new Map(),bay=row.maps.findIndex(m=>m.bay===p.bay),column=row.column+Math.max(0,bay);container.position.set(row.x/1000,row.y/1000,row.z/1000);out.add(container);
   for(const [i,part]of P.transformed(row.box,p).entries())identity.produce('profile:'+row.box.id+':'+p.id+':'+i,()=>{
    const g=part.geometry,mesh=box(...(g.kind==='box'?g.size.map(n=>n/1000):[.001,.001,.001]),part.material.color,0,0,0);if(g.kind==='sphere'){mesh.geometry.dispose();mesh.geometry=new T.SphereGeometry(g.radius/1000,g.widthSegments,g.heightSegments);}else if(g.kind==='shape'){mesh.geometry.dispose();mesh.geometry=new T.ExtrudeGeometry(shape(g.shape),{depth:g.depth/1000,bevelEnabled:false,curveSegments:g.curveSegments});if(g.angle)mesh.geometry.rotateX(g.angle);}
    mesh.material=mesh.material.clone();if((p.kind==='multiDoor'||B.drawerAppearance(p)&&part.metadata.cabinetDrawerBoard==='front')&&part.material.color===p.profile.baseline.color&&f.color)mesh.material.color?.set?.(f.color);for(const key of ['transparent','opacity','roughness','metalness','depthWrite','emissiveIntensity'])if(part.material[key]!==undefined)mesh.material[key]=part.material[key];if(part.material.emissive)mesh.material.emissive=new T.Color(part.material.emissive);if(options.doors==='ghost'&&p.kind==='multiDoor')Object.assign(mesh.material,{transparent:true,opacity:.15,depthWrite:false});
    Object.assign(mesh.userData,part.metadata,{cabinetOwnMaterial:true,cabinetBuilder:{boxId:row.box.id,componentId:p.id,kind:p.kind}});if(part.metadata.furnishBoardSize&&g.kind==='box')mesh.userData.furnishBoardSize=g.size.map(n=>n/1000);const m=part.motion;let parent=container,position=part.position;
    if(m){const key=[m.axis,m.section,m.leaf,m.drawer,m.lane,m.lid].join(':');if(!groups.has(key)){const group=new T.Group(),section=p.kind==='multiDoor'?(m.segmentId??p.segments[0].id):'storage';group.position.set(...m.pivot.map(n=>n/1000));group.userData.motion={kind:m.axis==='z'?'cabinetdrawer':'cabinetdoor',column,section,leaf:m.leaf,axis:m.axis,...(m.axis==='z'?{travel:m.travel/1000,closedZ:m.pivot[2]/1000}:{angle:m.angle})};if(m.axis==='z')group.position.z+=m.travel*m.phase/1000;else group.rotation[m.axis]=m.angle*m.phase;const pick={column,componentId:p.id,section,...(m.axis==='z'?m.lid?{lid:true}:{drawer:0,lane:m.lane}:{leaf:m.leaf,leafId:m.leafId})};group.userData.cabinetPart=pick;container.add(group);groups.set(key,group);}parent=groups.get(key);position=part.position.map((n,j)=>n-m.pivot[j]);mesh.userData.cabinetPart={...parent.userData.cabinetPart};}
    mesh.position.set(...position.map(n=>n/1000));parent.add(mesh);return mesh;
   });
  }const asset=root.FurnishBookcaseAssetModel||(typeof require==='function'?require('./bookcase-asset-model.js'):null);asset?.apply(T,out);return out;
 }
 root.FurnishCabinetProfileModel={build};if(typeof module==='object'&&module.exports)module.exports={build};
})(typeof globalThis!=='undefined'?globalThis:this);
