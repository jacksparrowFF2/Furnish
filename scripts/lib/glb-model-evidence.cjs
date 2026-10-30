'use strict';
const assert=require('node:assert/strict');
const identity=()=>[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1];
function multiply(a,b){const c=new Array(16).fill(0);for(let col=0;col<4;col++)for(let row=0;row<4;row++)for(let k=0;k<4;k++)c[col*4+row]+=a[k*4+row]*b[col*4+k];return c;}
function local(n){if(n.matrix)return n.matrix;const [x,y,z,w]=n.rotation||[0,0,0,1],[sx,sy,sz]=n.scale||[1,1,1],t=n.translation||[0,0,0];return [(1-2*y*y-2*z*z)*sx,(2*x*y+2*z*w)*sx,(2*x*z-2*y*w)*sx,0,(2*x*y-2*z*w)*sy,(1-2*x*x-2*z*z)*sy,(2*y*z+2*x*w)*sy,0,(2*x*z+2*y*w)*sz,(2*y*z-2*x*w)*sz,(1-2*x*x-2*y*y)*sz,0,...t,1];}
function bounds(){return [[Infinity,Infinity,Infinity],[-Infinity,-Infinity,-Infinity]];}
function add(box,p){for(let i=0;i<3;i++){assert(Number.isFinite(p[i]),'Non-finite production vertex');box[0][i]=Math.min(box[0][i],p[i]);box[1][i]=Math.max(box[1][i],p[i]);}}
function inspect(buffer,ids=['model-pilot']){
 assert.equal(buffer.toString('ascii',0,4),'glTF');assert.equal(buffer.readUInt32LE(8),buffer.length);const length=buffer.readUInt32LE(12),doc=JSON.parse(buffer.subarray(20,20+length)),binOffset=28+length,parts=[],whole=bounds();
 function visit(index,parent){const n=doc.nodes[index],matrix=multiply(parent,local(n));
  if(n.mesh!==undefined&&ids.includes(n.extras?.furnishId)){
   const box=bounds();let count=0;const alphas=[],materials=[];
   for(const primitive of doc.meshes[n.mesh].primitives){const accessor=doc.accessors[primitive.attributes.POSITION],view=doc.bufferViews[accessor.bufferView];assert.equal(accessor.componentType,5126);const start=binOffset+(view.byteOffset||0)+(accessor.byteOffset||0),stride=view.byteStride||12;
    for(let j=0;j<accessor.count;j++){const offset=start+j*stride,x=buffer.readFloatLE(offset),y=buffer.readFloatLE(offset+4),z=buffer.readFloatLE(offset+8),p=[matrix[0]*x+matrix[4]*y+matrix[8]*z+matrix[12],matrix[1]*x+matrix[5]*y+matrix[9]*z+matrix[13],matrix[2]*x+matrix[6]*y+matrix[10]*z+matrix[14]];add(box,p);add(whole,p);}count+=accessor.count;
    alphas.push(doc.materials?.[primitive.material]?.pbrMetallicRoughness?.baseColorFactor?.[3]??1);
    materials.push({unlit:!!doc.materials?.[primitive.material]?.extensions?.KHR_materials_unlit});
   }
   parts.push({key:n.extras.furnishPartKey,id:n.extras.furnishId,version:n.extras.furnishPartVersion,kind:n.extras.furnishPartKind,count,bounds:box,alphas,materials});
  }
  for(const child of n.children||[])visit(child,matrix);
 }
 for(const index of doc.scenes[doc.scene||0].nodes)visit(index,identity());
 assert(parts.length,'Missing production model');assert(parts.every(p=>p.key&&p.version===3));assert.equal(new Set(parts.map(p=>p.id+'|'+p.key)).size,parts.length,'Duplicate production identities');
 return {parts,bounds:whole};
}
module.exports={inspect,multiply,local};
