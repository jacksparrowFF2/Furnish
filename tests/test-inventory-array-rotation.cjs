'use strict';
const assert=require('node:assert/strict'),D=require('../src/core/design-core.js'),P=require('../src/core/product-rules.js'),R=require('../src/core/product-pose.js'),G=require('../src/core/layout-geometry.js'),J=require('../src/core/project-core.js');
const copy=v=>JSON.parse(JSON.stringify(v)),near=(a,b)=>assert(Math.abs(a-b)<.00002,`${a} != ${b}`),vector=(a,b)=>a.forEach((v,i)=>near(v,b[i]));let id=0;const uid=()=>`rotation-${++id}`;
function fixture(type,flip=false){const f={id:'first',type,w:250,d:220,h:80,cx:5000,cy:6000,mountHeight:2000,rot:37,flip,color:'#ddd'};let w=D.applyInventoryArray({furniture:[f]},f.id,{memberIds:[f.id],arrayId:'array'},uid);return D.applyInventoryArray(w,f.id,{count:7,columns:2,rows:2,gapX:13,gapZ:17,gapY:11,pattern:'stagger',angle:90},uid);}
function geometry(a,b){assert.equal(a.length,b.length);for(let i=0;i<a.length;i++){vector(R.frame(a[i]).center,R.frame(b[i]).center);near(a[i].rot,b[i].rot);assert.deepEqual(a[i].pose3D,b[i].pose3D);const pa=G.bodyParts(a[i]),pb=G.bodyParts(b[i]);assert.equal(pa.length,pb.length);for(let j=0;j<pa.length;j++){const points=p=>p.vertices||[p.vertical.bottom,p.vertical.top].flatMap(z=>p.p.map(([x,y])=>[x,z,y]));const va=points(pa[j]),vb=points(pb[j]);assert.equal(va.length,vb.length);va.forEach((v,k)=>vector(v,vb[k]));}}}
for(const type of ['cat_litter_yanxuan_25kg','wet_wipes_pack_170','block'])for(const flip of [false,true])for(const rotationAxis of ['x','y','z'])for(const angle of [37,90,-90,180]){
 const original=fixture(type,flip),pivot=[5000,6000,2400],rotation={rotationAxis,angle,pivot:rotationAxis==='z'?pivot.slice(0,2):pivot},rotated={furniture:D.transformFurniture(original.furniture,rotation)},snapshot=copy(rotated);
 // Idempotent edits must preserve every production vertex after a rigid rotation.
 const same=D.applyInventoryArray(rotated,'first',{count:7},uid);geometry(same.furniture,rotated.furniture);assert.deepEqual(rotated,snapshot);
 for(const patch of [{count:9},{gapX:23,gapZ:29,gapY:19},{columns:3,rows:1,pattern:'grid'}]){
  const edited=D.applyInventoryArray(rotated,'first',patch,uid),expected=D.transformFurniture(D.applyInventoryArray(original,'first',patch,uid).furniture,rotation);geometry(edited.furniture,expected);geometry(D.applyInventoryArray(edited,'first',patch,uid).furniture,edited.furniture);
 }
 const yaw=D.applyInventoryArray(rotated,'first',{angle:180},uid);vector(R.frame(yaw.furniture[0]).center,R.frame(rotated.furniture[0]).center);geometry(D.applyInventoryArray(yaw,'first',{count:7},uid).furniture,yaw.furniture);
 const packed=J.pack({planId:'rotation',current:yaw,designs:[{name:'tilted',work:yaw}],catalog:[]}),restored=J.unpack(packed).current;geometry(D.applyInventoryArray(restored,'first',{count:7},uid).furniture,yaw.furniture);
}
// Multiple non-commuting rotations and subsequent world yaw retain their basis.
let compound=fixture('cat_litter_yanxuan_25kg');for(const [rotationAxis,angle] of [['x',45],['y',70],['z',29]])compound={furniture:D.transformFurniture(compound.furniture,{rotationAxis,angle})};geometry(D.applyInventoryArray(compound,'first',{count:7},uid).furniture,compound.furniture);
// Growing a downward-facing lattice lifts the entire group, preserving its pitch.
let down=fixture('block');down={furniture:D.transformFurniture(down.furniture,{rotationAxis:'x',angle:180})};const lowest=Math.min(...down.furniture.map(P.bottomHeight));down.furniture=down.furniture.map(f=>P.editBottomHeight(f,P.bottomHeight(f)-lowest));const grown=D.applyInventoryArray(down,'first',{count:20},uid);near(Math.min(...grown.furniture.map(P.bottomHeight)),0);assert(grown.furniture.every(f=>P.bottomHeight(f)>=0));geometry(D.applyInventoryArray(grown,'first',{count:20},uid).furniture,grown.furniture);
console.log('PASS rotated inventory lattices: XYZ/compound rotations, mirrored yaw, production vertices, count/spacing/layout/yaw edits, no drift, floor lift and project roundtrip');
