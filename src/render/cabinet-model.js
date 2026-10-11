/* Shared Three.js cabinet construction. box uses bottom-based vertical coordinates. */
(function(root){
 function build(THREE,f,box){
  const C=root.FurnishCabinet,c=C.config(f),h=C.height(f)/1000,w=f.w/1000,d=f.d/1000,t=c.thickness/1000,p=c.plinth/1000,g=new THREE.Group(),color=f.color||'#efe6d8';
  const add=(parent,W,H,D,x,y,z,shade=color)=>{const mesh=box(W,H,D,shade,x,y,z);parent.add(mesh);return mesh;};
  add(g,w,p||.001,d-.04,0,0,-.02,'#60574c');
  add(g,w,t,d,0,p,0);add(g,w,t,d,0,h-t,0);
  add(g,w,h-p-2*t,t,0,p+t,-d/2+t/2);
  const bays=C.layout(f),inner=h-p-2*t;
  bays.forEach(bay=>add(g,t,h-p-2*t,d,bay.left/1000-t/2,p+t,0));
  add(g,t,h-p-2*t,d,w/2-t/2,p+t,0);
  c.columns.forEach((col,i)=>{
   const cw=bays[i].width/1000,x=bays[i].center/1000,base=p+t;
   col.shelves.forEach((y,j)=>{add(g,cw,t,d-2*t,x,base+y/1000,-t/2).userData.cabinetShelf={column:i,shelf:j};});
   let y=base;
   col.drawers.forEach((drawer,j)=>{
    const dh=drawer.height/1000,node=new THREE.Group();node.position.z=drawer.open?d*.7:0;
    add(node,cw-.004,dh-.004,t,x,y,d/2-t/2);
    add(node,cw-.02,.012,d-3*t,x,y+.012,-t);
    for(const side of [-1,1])add(node,t,dh-.03,d-3*t,x+side*(cw/2-t),y+.024,-t);
    add(node,cw-.02,dh-.03,t,x,y+.024,-d/2+2*t);
    add(node,Math.min(.14,cw*.4),.012,.025,x,y+dh*.7,d/2+.012,'#71685d');
    node.traverse(o=>o.userData.cabinetPart={column:i,drawer:j});g.add(node);y+=dh;
   });
   if(col.door==='none')return;
   const count=col.door==='double'?2:1,leafW=cw/count,dh=inner-(y-base);
   for(let j=0;j<count;j++){
    const right=col.door==='right'||col.door==='double'&&j===1,center=x-cw/2+leafW*(j+.5),pivot=new THREE.Group();
    pivot.position.set(center+(right?1:-1)*leafW/2,y,d/2);pivot.rotation.y=col.doorOpen?(right?1:-1)*Math.PI*.55:0;
    const local=(right?-1:1)*leafW/2;
    add(pivot,leafW-.004,dh-.004,t,local,0,0);
    add(pivot,.012,Math.min(.15,dh*.4),.026,local+(right?-1:1)*(leafW/2-.04),dh*.5,d>0?.025:0,'#71685d');
    pivot.traverse(o=>o.userData.cabinetPart={column:i});g.add(pivot);
   }
  });return g;
 }
 root.FurnishCabinetModel={build};
})(typeof globalThis!=='undefined'?globalThis:this);
