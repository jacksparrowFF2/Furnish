const assert=require('node:assert/strict'),fs=require('node:fs');
const C=require('../src/core/cabinet-core.js'),R=require('../src/core/product-rules.js'),D=require('../src/core/design-core.js'),P=require('../src/core/project-core.js'),M=require('../src/core/cabinet-motion.js'),G=require('../src/core/layout-geometry.js'),Model=require('../src/render/cabinet-model.js');
const type='bookshelf_yeswood_y52y09',f={...C.preset('book-y52y09-low'),type,id:'bookcase',cx:2000,cy:2000,rot:0};
const entries=require('../src/data/catalog.js').library.flatMap(g=>g.items).filter(i=>i[0]===type);
assert.equal(entries.length,1);assert.deepEqual([f.w,f.d,R.height({type})],[1115,230,750]);assert.equal(entries[0][5],undefined);
assert.equal(C.config(f).plinth,0);assert.equal(C.config(f).columns.length,3);assert(C.config(f).columns.every(c=>c.door==='none'&&c.shelves.length===1&&c.drawers.length===0));
assert(C.config(f).columns.every(c=>c.shelves[0]===348),'equal upper and lower clear heights after shelf thickness');
const round=P.unpack(JSON.parse(JSON.stringify(P.pack({planId:'test',current:{furniture:[f]},designs:[{name:'书柜',work:{furniture:[f]}}],catalog:[]}))));assert.deepEqual(round.current.furniture,[f]);
let restored=[f];for(let i=0;i<3;i++)restored=D.restoreFurniture(restored,{makeId:()=> 'copy',colorFor:()=> '#ccc'});assert.deepEqual(restored,[f]);
assert.equal(D.replaceFurniture(f,{type:'desk',name:'桌子',w:1400,d:600,color:'#aaa',h:750}).cabinet,undefined);
const plan={id:'room',rooms:[{id:'room',poly:[[0,0],[5000,0],[5000,5000],[0,5000]]}],walls:[],doors:[],beams:[],ceilingHeight:3000};
for(const rot of [0,37,90])for(const flip of [false,true]){
 const a={...f,rot,flip},parts=M.solidParts(a,{furniture:[a]});assert.equal(parts.length,12);assert.equal(G.bodyParts(a,plan,[a]).length,12);
 const beam={id:'beam',poly:[[1000,1000],[3000,1000],[3000,3000],[1000,3000]],topHeight:1100};
 const hits=bottom=>P.spaceCheck({...plan,beams:[{...beam,...(bottom===undefined?{}:{bottomHeight:bottom})}]},[a],{scanPassages:false}).filter(i=>i.kind==='beam');
 assert.equal(hits(750).length,0);assert(hits(749.9).some(i=>!i.pending));assert(hits(undefined).some(i=>i.pending));
}
// Numeric section comes from the real production boards, not the outer box.
const solids=M.solidParts(f,{furniture:[f]});assert(solids.every(p=>p.vertical.top<=750.001));
(async()=>{
 const html=fs.readFileSync(require.resolve('../index.html'),'utf8'),imports=JSON.parse(html.match(/<script type="importmap">([\s\S]*?)<\/script>/)[1]).imports,T=await import(imports.three);
 const build=item=>Model.buildRaw(T,item,(w,h,d,color,x,y,z)=>{const m=new T.Mesh(new T.BoxGeometry(w,h,d),new T.MeshStandardMaterial({color}));m.position.set(x,y+h/2,z);return m;});
 const near=(a,b)=>assert(Math.abs(a-b)<2e-6,`${a} != ${b}`);
 for(const item of [f,D.resizeFurniture(f,{w:1500,d:300,h:900})]){
  const o=build(item),bounds=new T.Box3().setFromObject(o),size=bounds.getSize(new T.Vector3());near(bounds.min.y,0);near(size.x,item.w/1000);near(size.y,item.h/1000);near(size.z,item.d/1000);
  o.traverse(m=>{if(m.isMesh)for(const a of Object.values(m.geometry.attributes))assert(a.array.every(Number.isFinite));});
 }
 const o=build(f);o.updateMatrixWorld(true);
 for(const bay of C.layout(f))for(const y of [.18,.56]){const hit=new T.Raycaster(new T.Vector3(bay.center/1000,y,.5),new T.Vector3(0,0,-1)).intersectObject(o,true);assert(hit.length);assert(hit[0].point.z<-.09,'six actual open cubbies reach the back panel');}
 const shelf=new T.Raycaster(new T.Vector3(0,.38,.5),new T.Vector3(0,0,-1)).intersectObject(o,true);assert(shelf[0].point.z>0,'middle shelf is solid');
 const before=C.config({...f,type:'bookshelf',cabinet:undefined});assert.equal(before.columns[0].shelves.length,5,'generic old bookcase unchanged');
 console.log('PASS Y52Y09: production cubbies and bounds, actual solids, scaling, rotation/mirror, contact/overlap/unknown height, defaults, restoration and project roundtrip');
})().catch(e=>{console.error(e);process.exitCode=1;});
