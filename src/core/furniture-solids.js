/* Read structural meshes from production builders; no second furniture template.
 * Numeric Three adapter, mm at the boundary. Rounded primitives retain a small
 * conservative edge box; curved buffer meshes retain their production vertices. */
(function(root){
 'use strict';
 class Vector{constructor(x=0,y=0,z=0){this.set(x,y,z);}set(x,y,z){Object.assign(this,{x,y,z});return this;}sub(v){this.x-=v.x;this.y-=v.y;this.z-=v.z;return this;}cross(v){const {x,y,z}=this;return this.set(y*v.z-z*v.y,z*v.x-x*v.z,x*v.y-y*v.x);}dot(v){return this.x*v.x+this.y*v.y+this.z*v.z;}}
 class Node{constructor(geometry){this.geometry=geometry;this.isMesh=!!geometry;this.children=[];this.userData={};this.position=new Vector();this.rotation=new Vector();this.scale=new Vector(1,1,1);}add(...nodes){for(const n of nodes){n.parent=this;this.children.push(n);}return this;}traverse(fn){fn(this);this.children.forEach(n=>n.traverse(fn));}}
 class Attribute{constructor(array,size){this.array=array;this.itemSize=size;}}
 class Geometry{constructor(){this.attributes={};this.userData={};}setAttribute(k,v){this.attributes[k]=v;return this;}setIndex(v){this.index=v;return this;}computeVertexNormals(){}}
 class Box extends Geometry{constructor(w,h,d){super();this.setAttribute('position',new Attribute([-1,1].flatMap(y=>[[-1,-1],[1,-1],[1,1],[-1,1]].flatMap(([x,z])=>[x*w/2,y*h/2,z*d/2])),3));this.setIndex([0,1,2,0,2,3,4,6,5,4,7,6,...[0,1,2,3].flatMap(i=>[i,(i+1)%4,i+4,(i+1)%4,(i+1)%4+4,i+4])]);}}
 class Cylinder extends Geometry{constructor(top,bottom,height,segments=20){super();this.setAttribute('position',new Attribute([[-height/2,bottom],[height/2,top]].flatMap(([y,r])=>Array.from({length:segments},(_,i)=>[Math.sin(i*2*Math.PI/segments)*r,y,Math.cos(i*2*Math.PI/segments)*r]).flat()),3));this.setIndex(Array.from({length:segments},(_,i)=>[i,(i+1)%segments,i+segments,(i+1)%segments,(i+1)%segments+segments,i+segments]).flat());}}
 class Material{constructor(){this.color={multiplyScalar(){}};}clone(){return new Material();}}
 function point(node,position,stop){let [x,y,z]=position;for(let n=node;n&&n!==stop;n=n.parent){x*=n.scale.x;y*=n.scale.y;z*=n.scale.z;for(const axis of ['z','y','x']){const a=n.rotation[axis],c=Math.cos(a),s=Math.sin(a);if(axis==='z')[x,y]=[x*c-y*s,x*s+y*c];if(axis==='y')[x,z]=[x*c+z*s,-x*s+z*c];if(axis==='x')[y,z]=[y*c-z*s,y*s+z*c];}x+=n.position.x;y+=n.position.y;z+=n.position.z;}return [x,y,z];}
 const T={Group:Node,Mesh:Node,Vector3:Vector,BufferGeometry:Geometry,Float32BufferAttribute:Attribute,BoxGeometry:Box,CylinderGeometry:Cylinder,MeshStandardMaterial:Material,DataTexture:class{},Box3:class{setFromObject(node){const vertices=[];node.traverse(n=>{if(n.geometry)for(let i=0,a=n.geometry.attributes.position.array;i<a.length;i+=3)vertices.push(point(n,a.slice(i,i+3),node.parent));});this.min=new Vector(...[0,1,2].map(i=>Math.min(...vertices.map(v=>v[i]))));this.max=new Vector(...[0,1,2].map(i=>Math.max(...vertices.map(v=>v[i]))));return this;}}};
 const labels={leg:'凳腿','seat-apron':'座框','seat-end':'端框','shelf-end':'层架端撑','shoe-rod':'鞋架横杆',cushion:'软包',piping:'包边',strap:'织带','strap-top':'上织带','top-substrate':'木台面','white-stone':'岩板','leg-wing':'弯曲腿板','side-inlay':'桌腿中脊','leg-inner-cleat':'内侧横撑','leg-mount-block':'固定块','leg-fastener':'连接件',shelf:'层板','drawer-front':'抽屉前板','drawer-back':'抽屉背板','drawer-bottom':'抽屉底板','drawer-side':'抽屉侧板','finger-rebate':'指扣','shelf-seam':'拼缝'};
 const rule=f=>(root.FurnishProducts||require('./product-rules.js')).definition(f)?.solidModel;
 const supported=f=>!!f&&!f.obj&&!!rule(f);
 const cache=new Map();
 function parts(f){
  if(!supported(f))return null;
  const r=rule(f),key=JSON.stringify([r,f.w,f.d,f.h]);let records=cache.get(key);
  if(!records){
   const model=root[r.global]||(typeof require==='function'?require('../render/'+r.module+'-model.js'):null);if(!model)throw Error('家具实体模型未加载：'+r.global);
   const built=model.build(T,f,Box);records=[];
   built.traverse(node=>{
    const g=node.geometry;if(!g)return;const a=g.attributes.position.array,vertices=Array.from({length:a.length/3},(_,i)=>point(node,a.slice(i*3,i*3+3)).map(v=>v*1000)),name=node.userData.shoeBenchPart||node.userData.cherryCoffeePart||'结构';
    const add=(vs,faces)=>records.push({vertices:vs,faces,boardName:labels[name]||'结构件',actualBoard:true});
    if(g.userData.bentBoard){
     // Separate the inward bend into narrow convex strips, preserving the void.
     const {rows,cols}=g.userData.bentBoard,offset=rows*cols;
     for(let j=0;j<cols-1;j+=4){const end=Math.min(j+4,cols-1),vs=[];for(let y=0;y<rows;y++)for(const i of [y*cols+j,y*cols+end,offset+y*cols+end,offset+y*cols+j])vs.push(vertices[i]);const faces=[];for(let y=1;y<rows;y++)for(let i=0;i<4;i++)faces.push([(y-1)*4+i,(y-1)*4+(i+1)%4,y*4+(i+1)%4,y*4+i]);faces.push([0,1,2,3],Array.from({length:4},(_,i)=>(rows-1)*4+i));add(vs,faces);}
    }else{const index=g.index||[];add(vertices,Array.from({length:index.length/3},(_,i)=>index.slice(i*3,i*3+3)));}
   });
   cache.set(key,records);if(cache.size>32)cache.delete(cache.keys().next().value);
  }
  const M=root.FurnishCabinetMotion||require('./cabinet-motion.js'),angle=(f.rot||0)*Math.PI/180,c=Math.cos(angle),s=Math.sin(angle);
  return records.map((r,i)=>{const vertices=r.vertices.map(([x,y,z])=>{x*=f.flip?-1:1;return [(f.cx||0)+x*c-z*s,y,(f.cy||0)+x*s+z*c];});return {...r,vertices,boardKey:'furniture:'+i,p:M.section({vertices,faces:r.faces},null),vertical:{bottom:Math.min(...vertices.map(v=>v[1])),top:Math.max(...vertices.map(v=>v[1])),source:'production-mesh'}};});
 }
 const api={supported,parts};root.FurnishFurnitureSolids=api;if(typeof module==='object'&&module.exports)module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this);
