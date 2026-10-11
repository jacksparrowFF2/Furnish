/* Shared Three.js cabinet construction. box uses bottom-based vertical coordinates. */
(function(root){
 function build(THREE,f,box,options={}){
  const C=root.FurnishCabinet,c=C.config(f),h=C.height(f)/1000,w=f.w/1000,d=f.d/1000,t=c.thickness/1000,p=c.plinth/1000,g=new THREE.Group(),color=f.color||'#efe6d8';
  const add=(parent,W,H,D,x,y,z,shade=color)=>{const mesh=box(W,H,D,shade,x,y,z);parent.add(mesh);return mesh;};
  add(g,w,p||.001,d-.04,0,0,-.02,'#60574c');
  add(g,w,t,d,0,p,0);add(g,w,t,d,0,h-t,0);
  const bays=C.layout(f),inner=h-p-2*t;
  bays.forEach((bay,i)=>{
   add(g,bay.width/1000,h-p-2*t,t,bay.center/1000,p+t,-d/2+t/2).userData.cabinetBay={column:i};
   const wall=add(g,t,h-p-2*t,d,bay.left/1000-t/2,p+t,0);if(i)wall.userData.cabinetDivider={divider:i-1,column:i-1};
  });
  add(g,t,h-p-2*t,d,w/2-t/2,p+t,0);
  c.columns.forEach((col,i)=>{
   const cw=bays[i].width/1000,x=bays[i].center/1000,base=p+t;
   const handle=col.handle||'bar',faceColor=col.doorColor||(col.finish==='wood'?'#b9946d':color);
   const handleMesh=(parent,X,Y,Z,vertical=false)=>{if(handle==='none')return;const mesh=add(parent,handle==='knob'?.025:vertical?.012:Math.min(.14,cw*.4),handle==='knob'?.025:vertical?.15:.012,.025,X,Y,Z,'#71685d');if(handle==='knob'){mesh.geometry.dispose();mesh.geometry=new THREE.SphereGeometry(.0125,12,8);}};
   col.shelves.forEach((y,j)=>{add(g,cw,t,d-2*t,x,base+y/1000,-t/2).userData.cabinetShelf={column:i,shelf:j};});
   let y=base;
   col.drawers.forEach((drawer,j)=>{
    const dh=drawer.height/1000,node=new THREE.Group();node.position.z=drawer.open?d*.7*(drawer.extension??1):0;
    add(node,cw-.004,dh-.004,t,x,y,d/2-t/2);
    add(node,cw-.02,.012,d-3*t,x,y+.012,-t);
    for(const side of [-1,1])add(node,t,dh-.03,d-3*t,x+side*(cw/2-t),y+.024,-t);
    add(node,cw-.02,dh-.03,t,x,y+.024,-d/2+2*t);
    handleMesh(node,x,y+dh*.7,d/2+.012);
    node.traverse(o=>o.userData.cabinetPart={column:i,drawer:j});g.add(node);y+=dh;
   });
   if(col.door==='none'||options.doors==='hidden')return;
   const count=col.door==='double'?2:1,leafW=cw/count,dh=inner-(y-base);
   for(let j=0;j<count;j++){
    const right=col.door==='right'||col.door==='double'&&j===1,center=x-cw/2+leafW*(j+.5),pivot=new THREE.Group();
    pivot.position.set(center+(right?1:-1)*leafW/2,y,d/2);pivot.rotation.y=col.doorOpen?(right?1:-1)*(col.doorAngle??99)*Math.PI/180:0;
    const local=(right?-1:1)*leafW/2;
    const face=add(pivot,leafW-.004,dh-.004,t,local,0,0,faceColor);
    if(col.finish==='glass'||options.doors==='ghost'){face.material=face.material.clone();face.userData.cabinetOwnMaterial=true;face.material.transparent=true;face.material.opacity=options.doors==='ghost'?.15:.32;face.material.depthWrite=false;face.material.roughness=.15;}
    handleMesh(pivot,local+(right?-1:1)*(leafW/2-.04),dh*.5,.025,true);
    if(options.doors==='ghost')pivot.traverse(o=>o.userData.cabinetIgnorePick=true);
    pivot.traverse(o=>o.userData.cabinetPart={column:i});g.add(pivot);
   }
  });
  if(options.outlines)g.traverse(o=>{if(o.isMesh){const edges=new THREE.LineSegments(new THREE.EdgesGeometry(o.geometry),new THREE.LineBasicMaterial({color:0x82776b,transparent:true,opacity:.55}));edges.userData.cabinetOwnMaterial=true;o.add(edges);}});
  return g;
 }
 root.FurnishCabinetModel={build};
})(typeof globalThis!=='undefined'?globalThis:this);
