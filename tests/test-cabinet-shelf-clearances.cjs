const assert=require('node:assert/strict'),C=require('../src/core/cabinet-core.js'),P=require('../src/core/project-core.js'),D=require('../src/core/design-core.js');
const near=(a,b)=>assert(Math.abs(a-b)<1e-6,`${a} != ${b}`);
const round=f=>P.unpack(P.pack({planId:'demo',current:{furniture:[f]},designs:[],catalog:[]})).current.furniture[0];
let count=0;
for(const [id] of C.templates){
 const f={id:'cab',type:C.templateType(id),cx:1000,cy:1000,rot:0,...C.preset(id)},before=JSON.stringify(f);
 C.config(f).columns.forEach((col,column)=>col.shelves.forEach((position,shelf)=>{
  const gaps=C.shelfClearances(f,column,shelf),limits=C.shelfLimits(f,column,shelf);
  near(gaps.lower.top,position);near(gaps.upper.bottom,position+gaps.thickness);
  for(const side of ['upper','lower']){
   const gap=gaps[side];
   if(limits.min>limits.max)return; // Some historical special templates have no movable interval.
   for(const value of [gap.min,gap.max,(gap.min+gap.max)/2+.125].filter(v=>v>=gap.min&&v<=gap.max)){
    const next=C.editShelfClearance(f,column,shelf,side,value),fresh=C.shelfClearances(next,column,shelf);
    near(fresh[side].height,value);near(fresh.upper.height+fresh.lower.height,gaps.upper.height+gaps.lower.height);
    assert.equal(next.h,f.h);assert.equal(next.w,f.w);assert.equal(next.d,f.d);
    next.cabinet.columns.forEach((v,i)=>v.shelves.forEach((h,j)=>{if(i!==column||j!==shelf)near(h,C.config(f).columns[i].shelves[j]);}));
    assert.deepEqual(round(next),next);
    const restore=x=>D.restoreFurniture([x],{makeId:()=>'',colorFor:()=>''})[0];
    assert.deepEqual(restore(restore(round(next))),restore(round(next)),'repeated recovery does not drift');
    for(const rot of [0,37,90])for(const flip of [false,true])near(C.shelfClearances({...next,rot,flip},column,shelf)[side].height,value);
    count++;
   }
   assert.throws(()=>C.editShelfClearance(f,column,shelf,side,gap.min-.01),/净高/);
   assert.throws(()=>C.editShelfClearance(f,column,shelf,side,gap.max+.01),/净高/);
   assert.throws(()=>C.editShelfClearance(f,column,shelf,side,NaN),/净高/);
  }
 }));
 assert.equal(JSON.stringify(f),before,'immutable '+id);
}
const attached={id:'a',type:'cabinet',...C.preset('pantry500')};attached.cabinet.columns[0].doorBottom=attached.cabinet.columns[0].shelves[0]+attached.cabinet.thickness;
const gap=C.shelfClearances(attached,0,0),moved=C.editShelfClearance(attached,0,0,'lower',gap.lower.height+1.25);
near(moved.cabinet.columns[0].doorBottom,moved.cabinet.columns[0].shelves[0]+moved.cabinet.thickness);
assert.throws(()=>C.editShelfClearance(attached,0,0,'bad',100));
console.log(`PASS ${count} shelf clearance edits: actual adjacent faces, both directions, thresholds, fractional mm, unchanged neighbors, special bands, mirror/rotation and project recovery`);

(async()=>{
 const fs=require('node:fs'),vm=require('node:vm'),imports=JSON.parse(fs.readFileSync(require.resolve('../index.html'),'utf8').match(/<script type="importmap">([\s\S]*?)<\/script>/)[1]).imports,T=await import(imports.three);
 const ctx=vm.createContext({FurnishCabinet:C,FurnishPartIdentity:require('../src/core/part-identity.js')});
 vm.runInContext(fs.readFileSync(require.resolve('../src/render/cabinet-model.js'),'utf8'),ctx);
 const box=(w,h,d,color,x,y,z)=>{const mesh=new T.Mesh(new T.BoxGeometry(w,h,d),new T.MeshStandardMaterial({color}));mesh.position.set(x,y+h/2,z);return mesh;};
 for(const id of ['pantry500','sideboard-open','sideboard-wall','entry-pegboard']){
  if(!C.templates.some(t=>t[0]===id))continue;
  const f={type:C.templateType(id),...C.preset(id)},col=f.cabinet.columns.findIndex(c=>c.shelves.length);if(col<0)continue;
  const gap=C.shelfClearances(f,col,0),next=C.editShelfClearance(f,col,0,'upper',(gap.upper.min+gap.upper.max)/2+.125),fresh=C.shelfClearances(next,col,0),model=ctx.FurnishCabinetModel.build(T,next,box);model.updateMatrixWorld(true);let shelf;
  model.traverse(o=>{if(o.isMesh&&o.userData.cabinetShelf?.column===col&&o.userData.cabinetShelf.shelf===0)shelf=o;});assert(shelf,id+' production shelf');
  const bounds=new T.Box3().setFromObject(shelf),base=next.cabinet.plinth+next.cabinet.thickness;
  near(bounds.min.y*1000,base+fresh.position);near(bounds.max.y*1000,base+fresh.position+fresh.thickness);
  model.traverse(o=>{o.geometry?.dispose();});
 }
 console.log('PASS production shelf faces match edited clearances');
})().catch(e=>{console.error(e);process.exitCode=1;});
