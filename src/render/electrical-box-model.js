(function(root){
'use strict';
// Stable authoring-site labels: keep existing labels when moving code; allocate new labels for new sites.
const syncIdentity=root.FurnishPartIdentity||(typeof require==='function'?require('../core/part-identity.js'):null);

function build(T,f){
 const P=root.FurnishProducts||require('../core/product-rules.js'),g=new T.Group(),w=f.w/1000,d=f.d/1000,h=P.height(f)/1000,t=Math.min(.003,w/15,d/8,h/15),bottom=P.value(f,'mountHeight')/1000;
 const body=new T.MeshStandardMaterial({color:f.color||'#eceeea',roughness:.65}),dark=new T.MeshStandardMaterial({color:'#586169',roughness:.8});
 function box(W,H,D,x,y,z,m,part){const mesh=syncIdentity.produce("electrical-box-model:site-1",()=>new T.Mesh(new T.BoxGeometry(W,H,D),m));mesh.position.set(x,y+bottom,z);mesh.userData.electricalBoxPart=part;mesh.castShadow=mesh.receiveShadow=true;g.add(mesh);}
 syncIdentity.produce("electrical-box-model:site-2",()=>box(w,h,t,0,h/2,-d/2+t/2,body,'back'));
 for(const x of syncIdentity.items("electrical-box-model.js:generator-1",[["item-a",-1],["item-b",1]]))syncIdentity.produce("electrical-box-model:site-3",()=>box(t,h,d-t,x*(w-t)/2,h/2,t/2,body,'side'));
 for(const y of syncIdentity.items("electrical-box-model.js:generator-2",[["item-a",t/2],["item-b",h-t/2]]))syncIdentity.produce("electrical-box-model:site-4",()=>box(w-2*t,t,d-t,0,y,t/2,body,'horizontal'));
 syncIdentity.produce("electrical-box-model:site-5",()=>box(w*.94,h*.94,t*.3,0,h/2,d/2-t*.65,dark,'door-seam'));
 syncIdentity.produce("electrical-box-model:site-6",()=>box(w*.92,h*.92,t*.6,0,h/2,d/2-t*.5,body,'door'));
 syncIdentity.produce("electrical-box-model:site-7",()=>box(w*.025,h*.12,t*.2,w*.35,h*.5,d/2-t*.1,dark,'latch'));
 const weak=f.type==='electrical_box_weak';
 for(let i of syncIdentity.range("electrical-box-model.js:generator-3",0,weak?5:1,1,false))syncIdentity.produce("electrical-box-model:site-8",()=>box(w*(weak?.36:.18),h*.012,t*.1,0,h*(weak?.22+i*.035:.76),d/2-t*.05,dark,weak?'vent':'label'));
 return g;
}
// Subtract convex box interiors from wall triangles; interpolate UVs and normals.
// Meshes are world-aligned at this boundary. Box geometry remains the authoritative recess envelope.
function cutMesh(T,mesh,cuts,{wx=v=>v/1000,wz=v=>v/1000}={}){
 if(!cuts.length||!mesh.geometry?.attributes.position)return;
 mesh.updateWorldMatrix(true,false);const bounds=new T.Box3().setFromObject(mesh);cuts=cuts.filter(c=>{const a=c.rot*Math.PI/180,x=wx(c.cx),z=wz(c.cy),W=(Math.abs(Math.cos(a))*c.w+Math.abs(Math.sin(a))*c.d)/2000,D=(Math.abs(Math.sin(a))*c.w+Math.abs(Math.cos(a))*c.d)/2000;return bounds.max.x>=x-W-1e-8&&bounds.min.x<=x+W+1e-8&&bounds.max.z>=z-D-1e-8&&bounds.min.z<=z+D+1e-8&&bounds.max.y>=c.bottom/1000-1e-8&&bounds.min.y<=c.top/1000+1e-8;});if(!cuts.length)return;
 const source=mesh.geometry,geo=source.index?source.toNonIndexed():source.clone(),attrs=Object.entries(geo.attributes).filter(([,a])=>a.itemSize<=4),out=Object.fromEntries(attrs.map(([k])=>[k,[]])),groups=[];
 const position=geo.attributes.position,world=new T.Vector3(),rows=[];
 for(let i=0;i<position.count;i++){world.fromBufferAttribute(position,i).applyMatrix4(mesh.matrixWorld);rows.push({p:[world.x,world.y,world.z],a:Object.fromEntries(attrs.map(([k,a])=>[k,Array.from({length:a.itemSize},(_,j)=>a.array[i*a.itemSize+j])]))});}
 const mix=(a,b,t)=>({p:a.p.map((v,i)=>v+(b.p[i]-v)*t),a:Object.fromEntries(attrs.map(([k])=>[k,a.a[k].map((v,i)=>v+(b.a[k][i]-v)*t)]))});
 function clip(poly,fn,inside){const result=[];for(let i=0;i<poly.length;i++){const a=poly[i],b=poly[(i+1)%poly.length],da=fn(a.p),db=fn(b.p),A=inside?da<=1e-7:da>=1e-7,B=inside?db<=1e-7:db>=1e-7;if(A)result.push(a);if(A!==B)result.push(mix(a,b,da/(da-db)));}return result;}
 const planes=cuts.map(c=>{const a=c.rot*Math.PI/180,C=Math.cos(a),S=Math.sin(a),x=wx(c.cx),z=wz(c.cy);return [p=>(p[0]-x)*C+(p[2]-z)*S-c.w/2000,p=>-(p[0]-x)*C-(p[2]-z)*S-c.w/2000,p=>-(p[0]-x)*S+(p[2]-z)*C-c.d/2000,p=>(p[0]-x)*S-(p[2]-z)*C-c.d/2000,p=>p[1]-c.top/1000,p=>c.bottom/1000-p[1]];});
 for(let i=0;i<rows.length;i+=3){let polys=[rows.slice(i,i+3)];for(const box of planes){const kept=[];for(const poly of polys){if(box.some(fn=>poly.every(v=>fn(v.p)>1e-7))){kept.push(poly);continue;}let remainder=poly;for(const fn of box){const outside=clip(remainder,fn,false);if(outside.length>=3)kept.push(outside);remainder=clip(remainder,fn,true);if(remainder.length<3)break;}}polys=kept;}
  const start=out.position.length/3;for(const poly of polys)for(let j=1;j<poly.length-1;j++)for(const v of [poly[0],poly[j],poly[j+1]])for(const [k] of attrs)out[k].push(...v.a[k]);
  const count=out.position.length/3-start;if(count){const materialIndex=source.groups.find(g=>i>=g.start&&i<g.start+g.count)?.materialIndex||0,last=groups.at(-1);if(last&&last.materialIndex===materialIndex&&last.start+last.count===start)last.count+=count;else groups.push({start,count,materialIndex});}
 }
 const result=new T.BufferGeometry();for(const [k,a] of attrs)result.setAttribute(k,new T.Float32BufferAttribute(out[k],a.itemSize));for(const g of groups)result.addGroup(g.start,g.count,g.materialIndex);mesh.geometry=result;source.dispose();geo.dispose();mesh.userData.recessCut=true;
}
const api={build,cutMesh};if(typeof module==='object'&&module.exports)module.exports=api;else root.FurnishElectricalBoxModel=api;
})(typeof globalThis!=='undefined'?globalThis:this);
