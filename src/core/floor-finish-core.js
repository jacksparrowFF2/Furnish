/* Floor finishes, elevations and rectangular grids in survey mm. No state writes. */
(function(root){
'use strict';
const finite=n=>typeof n==='number'&&Number.isFinite(n),clone=v=>JSON.parse(JSON.stringify(v));
const Z=()=>root.FurnishZoneGeometry||require('./zone-geometry.js');
const tiled=mat=>['tile800','tile600','antislip','marble'].includes(mat);
function validate(data){
 if(data===undefined)return;
 if(!data||data.version!==1||Object.keys(data).some(k=>!['version','areas'].includes(k))||!data.areas||Array.isArray(data.areas)||typeof data.areas!=='object'||Object.keys(data.areas).length>500)throw Error('地面完成面数据无效');
 for(const [id,s] of Object.entries(data.areas)){
  if(!id||id.length>200||['__proto__','prototype','constructor'].includes(id)||!s||typeof s!=='object'||Array.isArray(s)||Object.keys(s).some(k=>!['rawZ','tileThickness','baseThickness','mode','targetZ','reference','drop','layout'].includes(k)))throw Error('地面区域设置无效');
  for(const k of ['rawZ','targetZ'])if(s[k]!==undefined&&(!finite(s[k])||Math.abs(s[k])>20000))throw Error('毛坯／目标标高须为 −20000–20000 mm');
  for(const k of ['tileThickness','baseThickness','drop'])if(s[k]!==undefined&&(!finite(s[k])||s[k]<0||s[k]>1000))throw Error('地面厚度／降低量须为 0–1000 mm；未知请留空');
  if(!['layers','level','reference'].includes(s.mode))throw Error('地面标高模式无效');
  if(s.reference!==undefined&&(typeof s.reference!=='string'||!s.reference||s.reference.length>200||s.reference===id))throw Error('请选择其它区域作为标高参考');
  if(s.layout!==undefined){const l=s.layout;
   if(!l||Object.keys(l).some(k=>!['width','height','gap','angle','origin'].includes(k))||!['width','height'].every(k=>finite(l[k])&&l[k]>=20&&l[k]<=6000)||!finite(l.gap)||l.gap<0||l.gap>50||!finite(l.angle)||Math.abs(l.angle)>360||!Array.isArray(l.origin)||l.origin.length!==2||!l.origin.every(n=>finite(n)&&Math.abs(n)<=1e6))throw Error('砖尺寸须为 20–6000 mm，砖缝 0–50 mm，方向 −360–360°，起铺点须为有效原图坐标');
  }
 }
 return data;
}
function defaults(room,setting={}){
 const mat=setting.mat||room.mat,size=mat==='tile600'?600:mat==='antislip'?300:800;
 return {rawZ:0,mode:setting.use==='bathroom'?'reference':'layers',...(setting.use==='bathroom'?{drop:5}:{}),...(tiled(mat)?{layout:{width:size,height:size,gap:2,angle:0,origin:[...(room.at||room.poly[0])]}}:{})};
}
function derive(plan,work){
 validate(work.floorFinishes);if(!work.floorFinishes)return plan;
 const areas=Object.create(null),pending=[],records=work.floorFinishes.areas,rooms=(root.FurnishWallFinish||require('./wall-finish-core.js')).spatial(plan).rooms.filter(r=>r.counted!==false);
 function resolve(id,trail=[]){
  if(areas[id])return areas[id];const s=records[id],room=rooms.find(r=>r.id===id);
  if(!s||!room)return null;
  if(trail.includes(id))return {id,pending:'地面标高参考形成循环'};
  const a={id,rawZ:s.rawZ,tileThickness:s.tileThickness,baseThickness:s.baseThickness,layout:tiled(work.rooms?.[id]?.mat||room.mat)?s.layout:undefined,room};
  let target;
  if(s.mode==='reference'){
   const ref=resolve(s.reference,[...trail,id]);target=finite(ref?.finishedZ)&&finite(s.drop)?ref.finishedZ-s.drop:undefined;
   if(!finite(target))a.pending='参考区域标高／降低量未确定，或参考关联需核对';
  }else if(s.mode==='level')target=s.targetZ;
  if(s.mode==='layers'){if([s.rawZ,s.tileThickness,s.baseThickness].every(finite))a.finishedZ=s.rawZ+s.tileThickness+s.baseThickness;}
  else if([target,s.rawZ,s.tileThickness].every(finite)){
   const base=target-s.rawZ-s.tileThickness;a.requiredBase=base;
   if(base<0)a.pending='目标标高低于毛坯地面加砖厚，所需粘结找平层为负值';
   else if(finite(s.baseThickness)&&Math.abs(s.baseThickness-base)>1e-6)a.pending='已录入粘结找平层与目标标高冲突；请核对或留空后按目标推算';
   else {a.baseThickness=base;a.finishedZ=target;}
  }
  if(!finite(a.finishedZ))a.pending=a.pending||'毛坯标高／地面层厚度或目标标高尚未确定';
  areas[id]=a;return a;
 }
 for(const id of Object.keys(records)){
  const a=resolve(id);if(!a)pending.push({id,message:'地面原区域已变化或移除，请重新关联／移除设置'});else if(a.pending)pending.push({id,message:a.pending});
 }
 const signature=Object.values(areas).map(a=>[a.id,a.rawZ,a.finishedZ,a.pending]);
 return {...plan,floorFinish:{areas,pending,signature}};
}
function at(plan,point){
 const matches=(plan.rooms||[]).filter(r=>r.counted!==false&&Z().inside(point,r.poly));
 return matches.map(r=>plan.floorFinish?.areas[r.id]||{id:r.id,finishedZ:0,legacy:true,room:r});
}
function transform(layout,point,inverse=false){
 const a=layout.angle*Math.PI/180,c=Math.cos(a),s=Math.sin(a),[x,y]=point;
 if(inverse){const u=x-layout.origin[0],v=y-layout.origin[1];return [c*u+s*v,-s*u+c*v];}
 return [layout.origin[0]+c*x-s*y,layout.origin[1]+s*x+c*y];
}
// The finite cell iterator is for export/verification; rendering uses the same
// analytical grid, without enumerating millions of tiny tiles.
function cells(room,layout,limit=20000){
 const points=(room.rings||[room.poly]).flat().map(p=>transform(layout,p,true)),px=layout.width+layout.gap,py=layout.height+layout.gap;
 const x0=Math.floor(Math.min(...points.map(p=>p[0]))/px),x1=Math.floor(Math.max(...points.map(p=>p[0]))/px),y0=Math.floor(Math.min(...points.map(p=>p[1]))/py),y1=Math.floor(Math.max(...points.map(p=>p[1]))/py);
 if((x1-x0+1)*(y1-y0+1)>limit)throw Error('砖块数量超过导出计算上限；请增大砖尺寸或缩小区域');
 const result=[];
 for(let x=x0;x<=x1;x++)for(let y=y0;y<=y1;y++){
  const poly=[[x*px,y*py],[x*px+layout.width,y*py],[x*px+layout.width,y*py+layout.height],[x*px,y*py+layout.height]].map(p=>transform(layout,p));
  const pieces=Z().decompose([...(room.rings||[room.poly]),poly],p=>Z().inside(p,room.poly)&&Z().inside(p,poly));
  if(pieces.length)result.push({x,y,polys:pieces});
 }return result;
}
function onlyChange(a,b){const strip=v=>{const c=clone(v);delete c.floorFinishes;return JSON.stringify(c);};return strip(a)===strip(b);}
function overlaps(a,b){
 const box=p=>[Math.min(...p.map(v=>v[0])),Math.min(...p.map(v=>v[1])),Math.max(...p.map(v=>v[0])),Math.max(...p.map(v=>v[1]))],x=box(a),y=box(b);
 if(x[2]<=y[0]||y[2]<=x[0]||x[3]<=y[1]||y[3]<=x[1])return false;
 return Z().area(Z().decompose([a,b],p=>Z().inside(p,a)&&Z().inside(p,b)))>1e-4;
}
function checks(plan,furniture){
 const data=plan.floorFinish;if(!data)return [];const issues=data.pending.map(p=>({kind:'floorfinish',id:'floor-'+p.id,roomId:p.id,name:'地面完成面',pending:true,message:p.message}));
 const G=root.FurnishGeometry||require('./layout-geometry.js'),D=root.FurnishDesign||require('./design-core.js');
 for(const a of Object.values(data.areas))if(finite(a.finishedZ)&&a.finishedZ>=(a.room.ceilingHeight??plan.ceilingHeight??2800))issues.push({kind:'floorheight',id:'floor-'+a.id,roomId:a.id,name:a.room.name,message:'完成地面达到或超过天花标高，请核对毛坯基准与层厚'});
 for(const f of furniture){
  const areas=Object.values(data.areas).filter(a=>G.footprints(f).some(p=>overlaps(p,a.room.poly))),known=areas.filter(a=>finite(a.finishedZ)),v=D.furnitureVerticalBounds(f);
  if(!areas.length)continue;
  if(!v||areas.some(a=>!finite(a.finishedZ)))issues.push({kind:'floorheight',id:f.id,name:f.name,pending:true,message:'家具或所跨区域高度未知，地面净高待核对'});
  else for(const a of known)if(v.bottom<a.finishedZ-1e-6)issues.push({kind:'floorheight',id:f.id,roomId:a.id,name:f.name,message:`家具底部低于 ${a.room.name} 完成地面 ${Number((a.finishedZ-v.bottom).toFixed(2))} mm；原高度保持，请人工核对安装`});
  const levels=(plan.rooms||[]).filter(r=>r.counted!==false&&G.footprints(f).some(p=>overlaps(p,r.poly))).map(r=>data.areas[r.id]?.finishedZ??(data.areas[r.id]?undefined:0)).filter(finite);
  if(levels.length&&Math.max(...levels)-Math.min(...levels)>1e-6&&v?.bottom<=Math.max(...levels)+5)issues.push({kind:'floorlevel',id:f.id,name:f.name,message:'家具支承范围跨越不同地面标高，请核对支脚与安装'});
 }
 for(const [i,d] of (plan.doors||[]).entries()){
  const r=d.rect,near=[[(r[0]+r[2])/2,r[1]-1],[(r[0]+r[2])/2,r[3]+1],[r[0]-1,(r[1]+r[3])/2],[r[2]+1,(r[1]+r[3])/2]].flatMap(p=>at(plan,p));
  if(near.some(a=>!a.legacy))issues.push({kind:'floor-door',id:'floor-door-'+i,doorIndex:i,name:d.name||'门',pending:true,message:'地面标高已设置；门扇底部与门槛实际标高未录入，请核对门底净空及高差'});
 }
 return issues;
}
const api={validate,defaults,derive,at,transform,cells,checks,onlyChange,tiled,has:w=>!!w?.floorFinishes};
if(typeof module==='object'&&module.exports)module.exports=api;else root.FurnishFloorFinish=api;
})(typeof globalThis!=='undefined'?globalThis:this);
