/* Advisory volumes in metres, derived from the same checks as the property panel. */
(function(root){
 'use strict';
 function annotation(kind,check,tr=(zh,en)=>zh){
  const mm=n=>Math.floor((n+1e-6)*10)/10;
  const title=`${kind==='top'?tr('顶部','Top'):tr('右侧','Right')} ${check.required} mm`;
  const distance=Number.isFinite(check.gap)?`${tr('实际净距','Actual clearance')} ${mm(check.gap)} mm`:tr('实际净距待核对','Actual clearance unverified');
  const status=check.ok===false?`${tr('不足','Short by')} ${Math.max(.1,Math.ceil((check.required-check.gap-1e-6)*10)/10)} mm`:check.ok===null?tr('待核对','Unverified'):'';
  return {title,distance,status,color:check.ok===false?'#b62b20':check.ok===true?'#087a6d':'#946008'};
 }
 function build(THREE,f,checks,options={}){
  const group=new THREE.Group(),w=f.w/1000,d=f.d/1000,h=(f.h??565)/1000,bottom=(f.mountHeight??1650)/1000;
  group.userData.heaterClearance=f.id;group.rotation.y=-(f.rot||0)*Math.PI/180;
  const volume=(kind,width,height,depth,x,y,check)=>{
   const color=check.ok===false?0xd64532:check.ok===true?0x139687:0xd89a33;
   const geometry=new THREE.BoxGeometry(width,height,depth),material=new THREE.MeshBasicMaterial({color,transparent:true,opacity:check.ok===false?.16:.035,depthWrite:false,side:THREE.DoubleSide});
   const mesh=new THREE.Mesh(geometry,material);mesh.position.set(x,y,0);mesh.userData.cabinetOwnMaterial=true;mesh.userData.clearanceKind=kind;mesh.renderOrder=20;
   const frame=new THREE.LineSegments(new THREE.EdgesGeometry(geometry),new THREE.LineBasicMaterial({color,transparent:true,opacity:check.ok===false?.9:.5,depthWrite:false,depthTest:false}));frame.position.copy(mesh.position);frame.userData.cabinetOwnMaterial=true;frame.userData.clearanceKind=kind;frame.renderOrder=21;
   group.add(mesh,frame);
   if(options.CSS2DObject&&options.document){
    const info=annotation(kind,check,options.tr),el=options.document.createElement('div');el.className='heater-clearance-label';
    Object.assign(el.style,{pointerEvents:'none',background:'rgba(255,255,255,.94)',color:info.color,border:`1px solid ${info.color}`,borderRadius:'6px',padding:'5px 8px',font:'600 12px/1.5 system-ui,sans-serif',whiteSpace:'nowrap',boxShadow:'0 2px 6px #0002'});
    for(const text of [info.title,info.distance,info.status].filter(Boolean)){const line=options.document.createElement('div');line.textContent=text;el.appendChild(line);}
    const label=new options.CSS2DObject(el);label.position.set(kind==='right'?(f.flip?-1:1)*(w/2+width+.08):0,kind==='top'?y+height/2+.12:y,d/2+.06);
    label.center.set(kind==='top'?.5:f.flip?1:0,kind==='top'?1:.5);
    label.userData.clearanceKind=kind;label.renderOrder=22;group.add(label);
   }
  };
  volume('top',w,checks.top.required/1000,d,0,bottom+h+checks.top.required/2000,checks.top);
  volume('right',checks.right.required/1000,h,d,(f.flip?-1:1)*(w/2+checks.right.required/2000),bottom+h/2,checks.right);
  group.traverse(o=>{o.raycast=()=>{};}); // Frames must never intercept furniture picks.
  return group;
 }
 const api={build,annotation};if(typeof module==='object'&&module.exports)module.exports=api;else root.FurnishHeaterClearanceModel=api;
})(typeof globalThis!=='undefined'?globalThis:this);
