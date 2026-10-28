'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),C=require('../src/core/ceiling-core.js'),M=require('../src/render/ceiling-model.js');
(async()=>{
 const T=await import(JSON.parse(fs.readFileSync(require.resolve('../index.html'),'utf8').match(/<script type="importmap">([\s\S]*?)<\/script>/)[1]).imports.three);
 const item={id:'panels',kind:'flat',polygon:[[0,0],[1240,0],[1240,1840],[0,1840]],height:2500,thickness:8,aluminum:C.aluminumDefaults()},data={items:[item]},saved=JSON.stringify(data),group=M.build(T,data),display=M.createDisplay(T),camera=new T.PerspectiveCamera(),meshes=group.children.slice(),original=meshes.map(m=>({material:m.material,geometry:Array.from(m.geometry.attributes.position.array),token:m.userData.furnishStablePart}));
 const panel=meshes.find(m=>m.userData.ceiling.part==='panel'),backing=meshes.find(m=>m.userData.ceiling.part==='panel-backing');
 assert.equal(panel.material.polygonOffsetFactor,-2);assert.equal(panel.material.polygonOffsetUnits,-4);
 panel.material.clippingPlanes=[new T.Plane(new T.Vector3(1,0,0),0)];
 camera.position.set(0,5,0);assert(display.update(group,camera,'ghost'));assert.equal(panel.material.opacity,.25);assert.equal(panel.material.depthWrite,false);assert.equal(panel.material.side,T.FrontSide);assert.equal(panel.castShadow,false);assert.equal(backing.visible,false);assert(panel.children.some(o=>o.isLineSegments&&o.visible));
 assert.equal(display.update(group,camera,'ghost'),false,'steady camera does not invalidate shadow map');const originalPlane=original[meshes.indexOf(panel)].material.clippingPlanes[0];originalPlane.constant=1;assert.equal(panel.material.clippingPlanes[0],originalPlane,'camera clipping plane stays live in cached transparent material');assert(panel.children.every(o=>o.material.clippingPlanes===panel.material.clippingPlanes),'panel outlines share focus clipping');
 camera.position.y=2;assert(display.update(group,camera,'ghost'));assert.equal(panel.material,original[meshes.indexOf(panel)].material);assert.equal(panel.material.opacity,1);assert.equal(backing.visible,true);assert.equal(panel.castShadow,true);assert(panel.children.every(o=>!o.visible));
 camera.position.y=5;display.update(group,camera,'solid');assert.equal(panel.material.opacity,1);display.update(group,camera,'hidden');assert(meshes.every(m=>!m.visible));
 display.restore();panel.visible=false;display.update(group,camera,'ghost');assert.equal(panel.visible,false,'display never reveals a hidden layer');display.restore();assert.equal(panel.visible,false);panel.visible=true;
 // Independent heights, including an exactly coplanar camera, use actual bounds.
 panel.geometry.computeBoundingBox();camera.position.y=panel.geometry.boundingBox.max.y;display.update(group,camera,'ghost');assert.equal(panel.material.opacity,1);camera.position.y+=.001;display.update(group,camera,'ghost');assert.equal(panel.material.opacity,.25);
 display.restore();for(let i=0;i<meshes.length;i++){assert.equal(meshes[i].material,original[i].material);assert.deepEqual(Array.from(meshes[i].geometry.attributes.position.array),original[i].geometry);assert.equal(meshes[i].userData.furnishStablePart,original[i].token);}assert.equal(JSON.stringify(data),saved);
 const ghosts=new Set();display.update(group,camera,'ghost');for(const m of meshes)if(m.material.transparent)ghosts.add(m.material);let disposed=0;for(const m of ghosts)m.addEventListener('dispose',()=>disposed++);display.clear();assert.equal(disposed,ghosts.size);assert(meshes.every(m=>!m.children.length));assert.equal(panel.material.opacity,1);
 // Light strips and diffusers belong to the ceiling, including when lamps are off.
 const region={id:'lit-ring',name:'灯槽吊顶',style:'ring',polygon:[[0,0],[3800,0],[3800,2800],[0,2800]],height:2400,thickness:12,center:true,sections:C.sectionPreset('up')};
 for(const lamps of [true,false]){
  const lit=M.build(T,C.assemblySample(region),{lamps}),view=M.createDisplay(T),originals=lit.children.filter(m=>m.isMesh).map(m=>({m,material:m.material,visible:m.visible,geometry:m.geometry,shadow:m.castShadow}));
  assert(originals.some(({m})=>m.userData.ceiling.part==='light'));assert(originals.some(({m})=>m.userData.ceiling.part==='diffuser'));
  camera.position.y=6;view.update(lit,camera,'ghost');assert(originals.filter(({m})=>['light','diffuser'].includes(m.userData.ceiling.part)).every(({m})=>m.visible),'ghost keeps luminous faces');
  view.update(lit,camera,'hidden');assert(originals.every(({m})=>!m.visible),'hidden excludes strips and diffusers as well as ceiling bodies');
  view.restore();for(const {m,material,visible,geometry,shadow}of originals){assert.equal(m.material,material);assert.equal(m.visible,visible);assert.equal(m.geometry,geometry);assert.equal(m.castShadow,shadow);}
  view.update(lit,camera,'solid');assert(originals.every(({m})=>m.visible));const strip=originals.find(({m})=>m.userData.ceiling.part==='light').m;strip.visible=false;view.update(lit,camera,'hidden');view.update(lit,camera,'ghost');assert.equal(strip.visible,false,'restoration respects layer-hidden luminous faces');view.clear();
 }
 console.log('PASS ceiling display: 25% top view, solid underside, hidden/layers, depth/shadows, exact height, stable geometry/identity, restoration and disposal');
})().catch(e=>{console.error(e);process.exitCode=1;});
