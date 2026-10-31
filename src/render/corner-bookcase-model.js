/* Individually fitted Blender boards; fixed thickness, five equal clear bays. */
(function(root){'use strict';
function build(T,f,options={}){const C=root.FurnishCornerBookcase||require('../core/corner-bookcase-core.js'),A=C.rules(f).profile==='580'?(root.FurnishCornerBookcase580BlenderAsset||require('../data/corner-bookcase-580-blender-asset.js')):(root.FurnishCornerBookcaseBlenderAsset||require('../data/corner-bookcase-blender-asset.js')),refs=new Map(C.reference(C.nominal(f)).map(p=>[p.name,p])),targets=new Map(C.reference(f).map(p=>[p.name,p])),g=new T.Group();
 for(const p of A.parts){const r=refs.get(p.name),t=targets.get(p.name),positions=p.positions.map((v,i)=>{const k=i%3;return (t.center[k]+(v*1000-r.center[k])*t.size[k]/r.size[k])/1000;}),normals=[];
 for(let i=0;i<p.normals.length;i+=3){const n=p.normals.slice(i,i+3).map((v,k)=>v*r.size[k]/t.size[k]),l=Math.hypot(...n);normals.push(...n.map(v=>v/l));}
 const geometry=new T.BufferGeometry(),index=Array.from({length:positions.length/3},(_,i)=>i);
 // L-shaped boards use two conservative rectangular pieces for space queries.
 // These unindexed vertices describe board envelopes, never fill the front notch.
 if(t.shape==='L'){const [w,h,d]=t.size.map(v=>v/1000),[cx,cy,cz]=t.center.map(v=>v/1000),corner=C.outline(f)[3].map(v=>v/1000),boxes=[[-w/2,w/2,-d/2,corner[1]],[-w/2,corner[0],corner[1],d/2]];geometry.solidPieces=boxes.map(([x0,x1,z0,z1])=>{const start=positions.length/3;for(const y of [-h/2,h/2])for(const [x,z]of [[x0,z0],[x1,z0],[x1,z1],[x0,z1]]){positions.push(x+cx,y+cy,z+cz);normals.push(0,1,0);}return {indices:Array.from({length:8},(_,i)=>start+i),faces:[[0,3,2,1],[4,5,6,7],[0,1,5,4],[1,2,6,5],[2,3,7,6],[3,0,4,7]]};});}
 geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));geometry.setAttribute('normal',new T.Float32BufferAttribute(normals,3));geometry.setIndex(index);
 const material=options.wood?options.wood.clone():new T.MeshStandardMaterial({...p.material,color:f.color||p.material.color}),uv=[];const axis=t.size.indexOf(Math.min(...t.size)),axes=[0,1,2].filter(k=>k!==axis);for(let i=0;i<positions.length;i+=3)uv.push(positions[i+axes[0]]*4,positions[i+axes[1]]*4);geometry.setAttribute('uv',new T.Float32BufferAttribute(uv,2));
 const mesh=new T.Mesh(geometry,material);mesh.name=p.name;mesh.userData.cornerBookcasePart=p.name;mesh.userData.furnishStablePart=p.identity;mesh.castShadow=mesh.receiveShadow=true;g.add(mesh);}
 g.userData.furnishAsset=A.id+'@'+A.version;return g;}
const api={build};if(typeof module==='object'&&module.exports)module.exports=api;else root.FurnishCornerBookcaseModel=api;
})(typeof globalThis!=='undefined'?globalThis:this);
