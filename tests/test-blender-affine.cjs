'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const E=require('../src/io/blender-export.js');
(async()=>{
 const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8'),imports=JSON.parse(html.match(/<script type="importmap">([\s\S]*?)<\/script>/)[1]).imports,T=await import(imports.three);
 const parent=new T.Group();parent.userData.fid='affine';parent.scale.set(-1.2,.8,1.1);parent.rotation.y=.57;parent.position.set(2,1,-3);
 const geometry=new T.BoxGeometry(.7,.4,.9),material=new T.MeshStandardMaterial(),mesh=new T.Mesh(geometry,material);mesh.rotation.set(.17,.23,.31);parent.add(mesh);
 const instanced=new T.InstancedMesh(geometry,material,2);instanced.setMatrixAt(1,new T.Matrix4().makeRotationZ(.4).setPosition(1,2,3));parent.add(instanced);parent.updateWorldMatrix(true,true);
 const original=[...geometry.attributes.position.array],camera=new T.PerspectiveCamera(45,1,.05,300);
 for(const expandInstances of [false,true]){
  const copy=E.snapshot(T,{groups:[parent],camera,expandInstances}),output=copy.scene.children.filter(o=>o.isMesh);assert.equal(output.length,3,'sheared instances must expand even for ordinary export');
  for(let i=0;i<output.length;i++){
   const source=i===0?mesh:instanced,local=new T.Matrix4();if(i>0)instanced.getMatrixAt(i-1,local);const world=new T.Matrix4().multiplyMatrices(source.matrixWorld,local),target=output[i],p=new T.Vector3(),q=new T.Quaternion(),s=new T.Vector3();target.matrix.decompose(p,q,s);const trs=new T.Matrix4().compose(p,q,s);
   assert(target.matrix.elements.every((v,k)=>Math.abs(v-trs.elements[k])<1e-7),'object transform must survive Blender TRS decomposition');assert(target.matrix.determinant()<0,'mirror remains on the object');
   for(let j=0;j<geometry.attributes.position.count;j++){const expected=new T.Vector3().fromBufferAttribute(geometry.attributes.position,j).applyMatrix4(world),actual=new T.Vector3().fromBufferAttribute(target.geometry.attributes.position,j).applyMatrix4(target.matrix);assert(actual.distanceTo(expected)<1e-6,'world vertices preserve the production affine geometry');}
  }
  copy.dispose();assert.deepEqual([...geometry.attributes.position.array],original,'export leaves production vertices unchanged');
 }
 console.log('PASS Blender affine world geometry, mirrored TRS, sheared instance expansion and source isolation');
})().catch(e=>{console.error(String(e.stack||e).replace(/data:text\/javascript;base64,[A-Za-z0-9+/=]+/g,'three-r160'));process.exitCode=1;});
