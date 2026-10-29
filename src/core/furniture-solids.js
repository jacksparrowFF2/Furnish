/* Read structural meshes from production builders; no second furniture template.
 * Numeric Three adapter, mm at the boundary. Rounded primitives retain a small
 * conservative edge box; curved buffer meshes retain their production vertices. */
(function(root){
 'use strict';
 const adapter=()=>root.FurnishModelSolidRecorder||(typeof require==='function'?require('./model-solid-recorder.js'):null);
 const labels={leg:'凳腿','seat-apron':'座框','seat-end':'端框','shelf-end':'层架端撑','shoe-rod':'鞋架横杆',cushion:'软包',piping:'包边',strap:'织带','strap-top':'上织带','top-substrate':'木台面','white-stone':'岩板','leg-wing':'弯曲腿板','side-inlay':'桌腿中脊','leg-inner-cleat':'内侧横撑','leg-mount-block':'固定块','leg-fastener':'连接件',shelf:'层板','drawer-front':'抽屉前板','drawer-back':'抽屉背板','drawer-bottom':'抽屉底板','drawer-side':'抽屉侧板','finger-rebate':'指扣','shelf-seam':'拼缝'};
 const rule=f=>(root.FurnishProducts||require('./product-rules.js')).definition(f)?.solidModel;
 const supported=f=>!!f&&!f.obj&&!!rule(f);
 const cache=new Map(),worldCache=new Map();
 function parts(f,{furniture=[],plan}={}){
  if(!supported(f))return null;
  const r=rule(f),products=root.FurnishProducts||require('./product-rules.js'),corner=r.sliding?products.slidingCorner(f,furniture,plan):null,key=JSON.stringify([r,corner,f.slidingStackSide,f.slidingOpen,f.slidingTrackOrder,f.floorTrack,f.type,f.w,f.d,f.h,f.mountHeight,f.manifoldLoops,f.manifoldLengths,f.foldingTablePose,f.teaBarUpperOpen,f.teaBarLowerOpen,f.dishwasherDoorOpen,f.fridgeLeftAngle,f.fridgeRightAngle,f.fridgeUpperExtension,f.fridgeLowerExtension,...(r.positionSeed?[f.cx,f.cy]:[])]);let records=cache.get(key);
  if(records){cache.delete(key);cache.set(key,records);}
  if(!records){
   const model=root[r.global]||(typeof require==='function'?require('../render/'+r.module+'-model.js'):null);if(!model)throw Error('家具实体模型未加载：'+r.global);
   const {T,Box,Rounded,point}=adapter(),built=model.build(T,f,r.sliding?{corner}:r.rounded?Rounded:Box);records=[];
   built.traverse(node=>{
    const g=node.geometry;if(!g)return;const data=g.attributes.position.array;if([0,1,2].some(axis=>Math.max(...data.filter((_,i)=>i%3===axis))-Math.min(...data.filter((_,i)=>i%3===axis))<1e-10))return;const a=data,vertices=Array.from({length:a.length/3},(_,i)=>point(node,a.slice(i*3,i*3+3)).map(v=>v*1000)),name=Object.entries(node.userData).find(([key,v])=>key.endsWith('Part')&&typeof v==='string')?.[1]||'结构';
    const add=(vs,faces)=>records.push({vertices:vs,faces,boardName:labels[name]||'结构件',partRole:name,actualBoard:true});
    if(g.userData.bentBoard){
     // Separate the inward bend into narrow convex strips, preserving the void.
     const {rows,cols}=g.userData.bentBoard,offset=rows*cols;
     for(let j=0;j<cols-1;j+=4){const end=Math.min(j+4,cols-1),vs=[];for(let y=0;y<rows;y++)for(const i of [y*cols+j,y*cols+end,offset+y*cols+end,offset+y*cols+j])vs.push(vertices[i]);const faces=[];for(let y=1;y<rows;y++)for(let i=0;i<4;i++)faces.push([(y-1)*4+i,(y-1)*4+(i+1)%4,y*4+(i+1)%4,y*4+i]);faces.push([0,1,2,3],Array.from({length:4},(_,i)=>(rows-1)*4+i));add(vs,faces);}
    }else if(g.solidPieces){for(const piece of g.solidPieces)add(piece.indices.map(i=>vertices[i]),piece.faces);}
    else if(g.faces)add(vertices,g.faces);
    else{const index=g.index||[];add(vertices,Array.from({length:index.length/3},(_,i)=>index.slice(i*3,i*3+3)));}
   });
   cache.set(key,records);if(cache.size>32)cache.delete(cache.keys().next().value);
  }
  // Repeated plan labels, clearances and collisions share immutable world
  // records. Use the production key plus every world transform input.
  const worldKey=JSON.stringify([key,f.cx,f.cy,f.rot,f.flip]);
  if(worldCache.has(worldKey)){const hit=worldCache.get(worldKey);worldCache.delete(worldKey);worldCache.set(worldKey,hit);return hit;}
  const M=root.FurnishCabinetMotion||require('./cabinet-motion.js'),angle=(f.rot||0)*Math.PI/180,c=Math.cos(angle),s=Math.sin(angle);
  const result=records.map((r,i)=>{const vertices=r.vertices.map(([x,y,z])=>{x*=f.flip?-1:1;return [(f.cx||0)+x*c-z*s,y,(f.cy||0)+x*s+z*c];});return {...r,vertices,boardKey:'furniture:'+i,p:M.section({vertices,faces:r.faces},null),vertical:{bottom:Math.min(...vertices.map(v=>v[1])),top:Math.max(...vertices.map(v=>v[1])),source:'production-mesh'}};});
  worldCache.set(worldKey,result);if(worldCache.size>128)worldCache.delete(worldCache.keys().next().value);return result;
 }
 const api={supported,parts};root.FurnishFurnitureSolids=api;if(typeof module==='object'&&module.exports)module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this);
