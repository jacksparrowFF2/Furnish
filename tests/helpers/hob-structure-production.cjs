'use strict';
// Read actual production vertices, including the installed hob datum and moving
// drawer groups. No cabinet envelope or panel footprint stands in for the body.
function production(T,KitchenModel,FotileModel,Motion,K,Products,f,stove){
 const box=(w,h,d,color,x,y,z)=>{const n=new T.Mesh(new T.BoxGeometry(w,h,d),new T.MeshStandardMaterial({color}));n.position.set(x,y+h/2,z);return n;};
 const base=K.baseElevation(f),model=KitchenModel.build(T,Products.elevationSource(f),box,{furniture:K.relativeDevices([f,stove],base),outlines:false}),hob=FotileModel.build(T,stove);
 const pose=(g,v,bottom=0)=>{g.position.x=v.cx/1000;g.position.z=v.cy/1000;g.position.y+=bottom/1000;g.rotation.y=-(v.rot??0)*Math.PI/180;g.scale.x*=v.flip?-1:1;g.updateMatrixWorld(true);};pose(model,f,base);pose(hob,stove);
 const rows=(g,filter)=>{const out=[];g.traverse(n=>{if(!n.isMesh||!filter(n))return;const a=n.geometry.getAttribute('position'),vertices=[];for(let i=0;i<a.count;i++){const v=new T.Vector3().fromBufferAttribute(a,i).applyMatrix4(n.matrixWorld);vertices.push([v.x*1000,v.y*1000,v.z*1000]);}const ys=vertices.map(v=>v[1]),vertical={bottom:Math.min(...ys),top:Math.max(...ys)};out.push({key:n.userData.furnishPartToken,metadata:n.userData,vertices,vertical,p:Motion.section({vertices})});});return out;};
 const boards=rows(model,n=>{for(let p=n;p;p=p.parent)if(p.userData.kitchenModule===2)return true;return false;}),appliance=rows(hob,n=>['embedded-body','glass-panel'].includes(n.userData.fotilePart));
 for(const root of [model,hob])root.traverse(n=>{n.geometry?.dispose();if(n.material)for(const m of Array.isArray(n.material)?n.material:[n.material])m.dispose?.();});return {boards,appliance};
}
module.exports=production;
