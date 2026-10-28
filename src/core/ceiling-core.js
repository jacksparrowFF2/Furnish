/* Millimetre ceiling regions, component sections and production boundary sweeps. */
(function(root){
'use strict';
const clone=v=>JSON.parse(JSON.stringify(v)),finite=v=>typeof v==='number'&&Number.isFinite(v),fail=m=>{throw Error(m);};
const rules=()=> (root.FurnishProducts||require('./product-rules.js')).ceiling;
const zones=()=>root.FurnishZoneGeometry||(typeof require==='function'?require('./zone-geometry.js'):null);
const eps=()=>rules().epsilon;
// Direct inputs use the exact guard. Derived differences additionally account
// for floating-point cancellation at their operands' scale, without rounding data.
const solid=(v,scale=0)=>finite(v)&&v>0&&v<=rules().max&&(v>=rules().min-eps()||scale>0&&Math.abs(v-(rules().min-eps()))<=Number.EPSILON*Math.max(1,scale)*4);
const point=p=>Array.isArray(p)&&p.length===2&&p.every(v=>finite(v)&&Math.abs(v)<=1e7);
const key=v=>typeof v==='string'&&/^[a-zA-Z0-9_-]{1,200}$/.test(v);
const cross=(a,b,c)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
const area=p=>p.reduce((s,a,i)=>{const b=p[(i+1)%p.length];return s+a[0]*b[1]-a[1]*b[0];},0)/2;
const distance=(a,b)=>Math.hypot(b[0]-a[0],b[1]-a[1]);
function onSegment(p,a,b){const len=distance(a,b);return len>0&&Math.abs(cross(a,b,p))/len<=eps()&&p.every((v,i)=>v>=Math.min(a[i],b[i])-eps()&&v<=Math.max(a[i],b[i])+eps());}
function intersects(a,b,c,d){
 const ab=distance(a,b),cd=distance(c,d),x=cross(a,b,c)/ab,y=cross(a,b,d)/ab,z=cross(c,d,a)/cd,w=cross(c,d,b)/cd;
 return (x>eps()&&y< -eps()||x< -eps()&&y>eps())&&(z>eps()&&w< -eps()||z< -eps()&&w>eps())||onSegment(c,a,b)||onSegment(d,a,b)||onSegment(a,c,d)||onSegment(b,c,d);
}
function polygon(p,label='轮廓'){
 if(!Array.isArray(p)||p.length<3||p.length>rules().maxVertices||!p.every(point))fail(label+'需要3～128个有效节点');
 for(let i=0;i<p.length;i++){
  const a=p[i],b=p[(i+1)%p.length];if(!solid(distance(a,b),Math.max(...a.map(Math.abs),...b.map(Math.abs))))fail(label+'边长须在0.1～20000 mm范围内');
  const prev=p[(i+p.length-1)%p.length];if(onSegment(prev,a,b)||onSegment(b,prev,a))fail(label+'不能折返或重叠');
  for(let j=i+1;j<p.length;j++){if(j===i+1||i===0&&j===p.length-1)continue;if(intersects(a,b,p[j],p[(j+1)%p.length]))fail(label+'不能自交或自接触');}
 }
 if(Math.abs(area(p))<eps()*eps())fail(label+'不能为零面积');return p;
}
function inside(p,poly,boundary=true){
 if(poly.some((a,i)=>onSegment(p,a,poly[(i+1)%poly.length])))return boundary;
 let yes=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++)if((poly[i][1]>p[1])!==(poly[j][1]>p[1])&&p[0]<(poly[j][0]-poly[i][0])*(p[1]-poly[i][1])/(poly[j][1]-poly[i][1])+poly[i][0])yes=!yes;return yes;
}
function lowCove(values={}){
 const q={...rules().lowCove,...values},D=q.drop,P=q.projection,B=q.back,T=q.bottom,F=q.front,L=q.lip;
 if(Object.keys(q).some(k=>!Object.hasOwn(rules().lowCove,k))||![D,P,B,T,F,L].every(v=>solid(v))||!solid(P-B-F,Math.max(P,B,F))||!solid(L-T,Math.max(L,T))||!solid(D-L,Math.max(D,L)))fail('低灯槽尺寸须为0.1～20000 mm，槽腔净宽、挡边有效高度和上方开口须有效');
 const coordinates=[[0,0],[B,0],[B,D-T],[P-F,D-T],[P-F,D-L],[P,D-L],[P,D],[0,D]];
 return {vertices:coordinates.map(([u,d],i)=>({id:'v'+i,u,d})),light:clone(rules().light),template:{kind:'lowCove',values:q}};
}
// Presets are expanded into ordinary production sections, never new saved types.
function plainSoffit(values={}){
 const q={...rules().soffit,...values},D=q.drop,P=q.projection,B=q.back,T=q.bottom,F=q.front;
 if(Object.keys(q).some(k=>!Object.hasOwn(rules().soffit,k))||![D,P,B,T,F].every(solidValue=>solid(solidValue))||!solid(P-B-F)||!solid(D-T))fail('普通边吊的宽度、下吊和板厚须有效，内部净宽和净高须大于0');
 // Two full-height returns and a bottom board: no open cove, strip or housing.
 return {material:'gypsum',vertices:[[0,0],[B,0],[B,D-T],[P-F,D-T],[P-F,0],[P,0],[P,D],[0,D]].map(([u,d],i)=>({id:'v'+i,u,d}))};
}
function plainSoffitValues(s){
 if(!s||s.template||s.light||s.diffuser||s.vertices?.length!==8||!s.vertices.every(v=>v&&finite(v.u)&&finite(v.d)))return null;
 const v=s.vertices,q={drop:v[6].d,projection:v[6].u,back:v[1].u,bottom:v[6].d-v[2].d,front:v[6].u-v[3].u};
 try{return plainSoffit(q).vertices.every((p,i)=>Math.abs(p.u-v[i].u)<=eps()&&Math.abs(p.d-v[i].d)<=eps())?q:null;}catch{return null;}
}
function sectionPreset(kind){
 if(kind==='plain')return [{name:'普通边吊 · 无灯槽',section:plainSoffit()}];
 if(kind==='up'||kind==='upMount'){const gypsum=lowCove(rules().sectionPresets.wide);delete gypsum.light;gypsum.material='gypsum';return [{name:'石膏边吊',section:gypsum},{name:'上发光型材 · 含柔光板',section:upChannel(kind==='upMount'?{mountDetail:true}:{})}];}
 if(!['low','wide','wash'].includes(kind))fail('未知截面样式');
 const body=lowCove(rules().sectionPresets[kind==='low'?'low':'wide']),q=body.template.values;
 body.material='gypsum';delete body.light;
 if(kind!=='wash')return [{name:'石膏灯槽',section:body}];
 delete body.light;const h=rules().washChannel,u=q.projection-q.front-h.gap-h.width,d=q.drop-q.bottom,top=d-h.height,w=h.clearWidth+2*h.wall;
 const points=[[u,top],[u+h.wall,top],[u+h.wall,d-h.wall],[u+w-h.wall,d-h.wall],[u+w-h.wall,top],[u+w,top],[u+w,d-h.wall],[u+h.width,d-h.wall],[u+h.width,d],[u,d]];
 const housing={material:'aluminum',vertices:points.map(([u,d],i)=>({id:'channel'+i,u,d})),light:{...rules().light,u:u+w/2,d:d-h.wall}};
 section(housing);return [{name:'石膏灯槽',section:body},{name:'洗顶灯槽型材（示意）',section:housing}];
}
function upChannel(values={}){
 const q={...rules().upChannel,...values};if(Object.keys(q).some(k=>!Object.hasOwn(rules().upChannel,k)))fail('上发光型材参数无效');
 const positive=['width','bodyWidth','opening','height','wall','rail','wingThickness','diffuserThickness','lightWidth','lightThickness','mountProjection','mountHeight','mountBridge','mountFootHeight'];
 if(!positive.every(k=>solid(q[k]))||!['u','d','diffuserInset'].every(k=>finite(q[k])&&q[k]>=0&&q[k]<=rules().max)||!['rotation','lightOffsetU','lightOffsetD','lightAngle'].every(k=>finite(q[k])&&Math.abs(q[k])<=rules().max)||Math.abs(q.rotation)>360||Math.abs(q.lightAngle)>360||typeof q.diffuserEnabled!=='boolean'||typeof q.lightEnabled!=='boolean'||typeof q.mirrorU!=='boolean'||typeof q.mirrorD!=='boolean'||typeof q.mountDetail!=='boolean')fail('灯槽尺寸须为有效毫米数值');
 if(!solid(q.width-q.bodyWidth)||!solid(q.bodyWidth-2*q.wall-q.opening)||!solid(q.height-q.wall-q.rail)||q.wingThickness>q.height||q.diffuserInset+q.diffuserThickness>q.rail+eps()||!q.mirrorD&&q.d<q.height)fail('型材主体、槽口、翼边或柔光板尺寸不匹配');
 if(q.mountDetail&&(!['mountProjection','mountHeight','mountBridge','mountFootHeight'].every(k=>solid(q[k]))||!solid(q.mountProjection-q.wall)||!solid(q.mountBridge-q.wall/2)||!solid(q.mountHeight-q.mountBridge-q.wall/2)||!solid(q.height-q.mountHeight-q.mountFootHeight)||!solid(q.mountFootHeight-q.wingThickness)||!solid(q.bodyWidth-q.mountProjection-2*q.wall-q.opening)))fail('安装卡槽的凸出、立边、连接横肋或下挡边尺寸不匹配');
 q.rotation=((q.rotation+180)%360+360)%360-180;const u=q.u,d=q.d,top=d-q.height,B=q.bodyWidth-(q.mountDetail?q.mountProjection:0),L=(B-q.opening)/2,T=q.wall;
 let points=[[u,top],[u+L,top],[u+L,top+q.rail],[u+T,top+q.rail],[u+T,d-T],[u+B-T,d-T],[u+B-T,top+q.rail],[u+B-L,top+q.rail],[u+B-L,top],[u+B,top],[u+B,d-q.wingThickness],[u+q.width,d-q.wingThickness],[u+q.width,d],[u,d]];
 if(q.mountDetail){const E=u+q.bodyWidth,H=top+q.mountHeight,A=top+q.mountBridge-T/2,Z=top+q.mountBridge+T/2;points=[...points.slice(0,10),[u+B,A],[E-T,A],[E-T,top],[E,top],[E,H],[E-T,H],[E-T,Z],[u+B,Z],[u+B,d-q.wingThickness],[E-T,d-q.wingThickness],[E-T,d-q.mountFootHeight],[E,d-q.mountFootHeight],[E,d-q.wingThickness],[u+q.width,d-q.wingThickness],[u+q.width,d],[u,d]];}
 const result={vertices:points.map(([u,d],i)=>({id:'channel'+i,u,d})),material:'aluminum',template:{kind:'upChannel',values:q}};
 if(q.diffuserEnabled){const x=u+L,y=top+q.diffuserInset;result.diffuser={vertices:[[x,y],[x+q.opening,y],[x+q.opening,y+q.diffuserThickness],[x,y+q.diffuserThickness]].map(([u,d],i)=>({id:'diffuser'+i,u,d}))};}
 if(q.lightEnabled)result.light={u:u+B/2+q.lightOffsetU,d:d-T+q.lightOffsetD,angle:q.lightAngle,width:q.lightWidth,thickness:q.lightThickness};
 if(q.rotation||q.mirrorU||q.mirrorD){const rotated=transformRawSection(result,{angle:q.rotation,mirrorU:q.mirrorU,mirrorD:q.mirrorD,pivot:[u,d]});Object.assign(result,rotated);result.template={kind:'upChannel',values:q};}if(!q.mountDetail)for(const k of ['mountDetail','mountProjection','mountHeight','mountBridge','mountFootHeight'])delete q[k];if(!q.rotation)delete result.template.values.rotation;for(const k of ['mirrorU','mirrorD'])if(!q[k])delete result.template.values[k];polygon(result.vertices.map(v=>[v.u,v.d]),'型材截面');return result;
}
function sectionContours(s){return [s.vertices,...(s.diffuser?[s.diffuser.vertices]:[])];}
function sectionPoints(s){return sectionContours(s).flat();}
function rotateUD(p,pivot,angle){const a=angle*Math.PI/180,c=Math.cos(a),s=Math.sin(a),x=p[0]-pivot[0],y=p[1]-pivot[1];return [pivot[0]+x*c-y*s,pivot[1]+x*s+y*c];}
function transformRawSection(input,{du=0,dd=0,angle=0,pivot=[0,0],mirrorU=false,mirrorD=false}={}){const s=clone(input),point=v=>{const a=[mirrorU?2*pivot[0]-v.u:v.u,mirrorD?2*pivot[1]-v.d:v.d],p=rotateUD(a,pivot,angle);return {...v,u:p[0]+du,d:p[1]+dd};};s.vertices=s.vertices.map(point);if(s.diffuser)s.diffuser.vertices=s.diffuser.vertices.map(point);if(s.light){const a=s.light.angle*Math.PI/180;s.light=point(s.light);s.light.angle=((Math.atan2((mirrorD?-1:1)*Math.sin(a),(mirrorU?-1:1)*Math.cos(a))*180/Math.PI+angle+180)%360+360)%360-180;}delete s.template;return s;}
function channelValues(s){if(s?.template?.kind!=='upChannel')return null;const q=clone(s.template.values);q.lightEnabled=!!s.light;if(s.light){let p=rotateUD([s.light.u,s.light.d],[q.u,q.d],-(q.rotation||0));p=[q.mirrorU?2*q.u-p[0]:p[0],q.mirrorD?2*q.d-p[1]:p[1]];const a=(s.light.angle-(q.rotation||0))*Math.PI/180;Object.assign(q,{lightWidth:s.light.width,lightThickness:s.light.thickness,lightAngle:Math.atan2((q.mirrorD?-1:1)*Math.sin(a),(q.mirrorU?-1:1)*Math.cos(a))*180/Math.PI,lightOffsetU:p[0]-q.u-(q.bodyWidth-(q.mountDetail?q.mountProjection:0))/2,lightOffsetD:p[1]-q.d+q.wall});}return q;}
function mirrorSection(input,axis){if(!['u','d'].includes(axis))fail('请选择左右或上下镜像');const points=sectionPoints(input),us=points.map(v=>v.u),ds=points.map(v=>v.d),pivot=[(Math.min(...us)+Math.max(...us))/2,(Math.min(...ds)+Math.max(...ds))/2],q=channelValues(input);let result;if(q){const patch={...q,rotation:-(q.rotation||0)};if(axis==='u'){patch.u=2*pivot[0]-q.u;patch.mirrorU=!q.mirrorU;}else{patch.d=2*pivot[1]-q.d;patch.mirrorD=!q.mirrorD;}result=upChannel(patch);}else result=transformRawSection(input,{pivot,mirrorU:axis==='u',mirrorD:axis==='d'});section(result);return result;}
function sectionMeasurements(s){const q=channelValues(s),points=sectionPoints(s),us=points.map(v=>v.u),ds=points.map(v=>v.d),minU=Math.min(...us),minD=Math.min(...ds),maxU=Math.max(...us),maxD=Math.max(...ds);if(!q)return [{key:'width',label:'整体宽',value:maxU-minU,a:[minU,maxD],b:[maxU,maxD],normal:[0,1],gap:20},{key:'height',label:'整体高',value:maxD-minD,a:[maxU,minD],b:[maxU,maxD],normal:[1,0],gap:20}];const coreWidth=q.bodyWidth-(q.mountDetail?q.mountProjection:0),at=(u,d)=>rotateUD([q.u+(q.mirrorU?-u:u),q.d+(q.mirrorD?-d:d)],[q.u,q.d],q.rotation||0),origin=at(0,0),vector=(u,d)=>{const p=at(u,d);return p.map((v,i)=>v-origin[i]);};return [{key:'width',label:'总宽',value:q.width,a:at(0,0),b:at(q.width,0),normal:vector(0,1),gap:22},{key:'bodyWidth',label:'主体宽',value:q.bodyWidth,a:at(0,-q.height),b:at(q.bodyWidth,-q.height),normal:vector(0,-1),gap:22},{key:'opening',label:'槽口宽',value:q.opening,a:at((coreWidth-q.opening)/2,-q.height*.45),b:at((coreWidth+q.opening)/2,-q.height*.45),normal:vector(0,-1),gap:0},{key:'height',label:'高度',value:q.height,a:at(q.width,-q.height),b:at(q.width,0),normal:vector(1,0),gap:22}];}
function transformSection(input,{du=0,dd=0,angle=0,pivot}={}){if(![du,dd,angle].every(finite))fail('截面位移和角度无效');const q=channelValues(input),points=sectionPoints(input),origin=pivot||[points.reduce((s,p)=>s+p.u,0)/points.length,points.reduce((s,p)=>s+p.d,0)/points.length];let result;if(q){const a=rotateUD([q.u,q.d],origin,angle),rotation=(((q.rotation||0)+angle+180)%360+360)%360-180;result=upChannel({...q,u:a[0]+du,d:a[1]+dd,rotation});}else result=transformRawSection(input,{du,dd,angle,pivot:origin});section(result);return result;}
function snapSectionMove(input,du,dd,references,radius){const anchors=[...input.vertices],candidates=[],add=(from,to,kind)=>{const x=to[0]-from[0],y=to[1]-from[1],distance=Math.hypot(x,y);if(distance<=radius)candidates.push({x,y,distance,from,to,kind});};for(const v of anchors){const at=[v.u+du,v.d+dd];for(const poly of references){for(let i=0;i<poly.length;i++){add(at,poly[i],'vertex');add(at,zones().projectSegment(at,poly[i],poly[(i+1)%poly.length]).point,'edge');}}}candidates.sort((a,b)=>a.distance-b.distance||Number(a.kind==='edge')-Number(b.kind==='edge'));const hit=candidates[0],x=hit?du+hit.x:Math.round(du),y=hit?dd+hit.y:Math.round(dd);return {section:transformSection(input,{du:x,dd:y}),hit,du:x,dd:y};}
function snapSectionAngle(angle,references){const step=rules().sectionRotationStep,candidates=[Math.round(angle/step)*step];for(const poly of references)for(let i=0;i<poly.length;i++){const b=poly[(i+1)%poly.length],a=poly[i],v=Math.atan2(b[1]-a[1],b[0]-a[0])*180/Math.PI;for(let k=-8;k<=8;k++)candidates.push(v+k*90);}const nearest=candidates.sort((a,b)=>Math.abs(a-angle)-Math.abs(b-angle))[0];return Math.abs(nearest-angle)<=rules().sectionRotationTolerance?{angle:nearest,snapped:true}:{angle,snapped:false};}

function centerLayout({height,thickness,sections,centerConnection,center},base){
 const inset=Math.max(0,...sections.flatMap(s=>sectionPoints(s.section).map(v=>v.u))),mode=centerConnection?.mode||'flush';
 if(mode==='flush')return {mode,height,inset,overlap:0};
 if(mode==='independent')return {mode,height:centerConnection.height,inset:centerConnection.inset,overlap:0};
 const source=sections[centerConnection.sectionIndex],q=channelValues(source?.section);if(!q){if(center===false)return {mode,height,inset,overlap:0,inactive:true};fail('中央平顶的翼边参照已变化，请重新选择连接方式');}if(center!==false&&(Math.abs(q.rotation||0)>eps()||q.mirrorU||q.mirrorD))fail('镜像或旋转后的灯槽不能作为水平翼边连接，请关闭中央平顶或改用独立连接');
 return {mode,height:base-q.d-thickness,inset:q.u+q.bodyWidth,overlap:q.width-q.bodyWidth,contactD:q.d,contactEnd:q.u+q.width,sectionIndex:centerConnection.sectionIndex};
}
// One section has one owner; lighting is only authored on channel sections.
function sectionRole(s){return s.material==='aluminum'||s.template?.kind==='upChannel'?'channel':'gypsum';}

function componentPresets(family){const p=rules().componentPresets[family];if(!p)fail('请选择边吊或灯槽');return clone(p);}
function componentPreset(family,kind){
 if(!componentPresets(family).some(p=>p.id===kind))fail('未知部件预设');
 if(family==='gypsum'){const item=clone(sectionPreset(kind)[0]);delete item.section.light;item.section.material='gypsum';item.name=componentPresets(family).find(p=>p.id===kind).name;return item;}
 const item=clone(sectionPreset(kind)[1]);item.section.material='aluminum';item.name=componentPresets(family).find(p=>p.id===kind).name;return item;
}
function sectionActive(r,s){return r.channelEnabled!==false||sectionRole(s.section)!=='channel';}
function setChannelEnabled(region,enabled){if(typeof enabled!=='boolean')fail('灯槽启用状态无效');const next=stableRegionParts(clone(region));if(enabled)delete next.channelEnabled;else next.channelEnabled=false;regionItems(next);return next;}
function stableRegionParts(r){if(!r.partIds)r.partIds=r.sections.map((_,i)=>r.id+(r.style==='ring'?'_part_':'_section_')+i);if(!r.centerId)r.centerId=r.id+'_part_'+(r.style==='ring'?r.sections.length:0);return r;}
function duplicateRegion(region,id){const next=clone(region);next.id=id;delete next.partIds;delete next.centerId;return stableRegionParts(next);}
function nextRegionPartId(r){let n=0,id;do{id=r.id+'_section_'+n++;}while(r.partIds.includes(id)||id===r.centerId);return id;}
function replaceAssemblyPart(region,family,kind){
 const r=stableRegionParts(clone(region)),old=r.sections.findIndex((s,i)=>sectionRole(s.section,i)===family),item=componentPreset(family,kind),info=assemblyInfo(r);
 if(family==='channel'&&info.gypsum){const source=assemblyInfo({height:0,thickness:r.thickness,sections:sectionPreset(kind),center:false}),du=info.gypsum.projection-source.gypsum.projection,dd=info.gypsum.drop-info.gypsum.bottom-source.gypsum.drop+source.gypsum.bottom;item.section=transformSection(item.section,{du,dd});}
 if(old<0){r.partIds.push(nextRegionPartId(r));r.sections.push(item);}else r.sections[old]=item;
 if(r.centerConnection?.mode==='flange'){const i=r.sections.findIndex(s=>s.section.template?.kind==='upChannel');if(i<0)delete r.centerConnection;else r.centerConnection.sectionIndex=i;}
 regionItems(r);return r;
}
function removeAssemblyPart(region,index){
 const r=stableRegionParts(clone(region));if(!Number.isInteger(index)||index<0||index>=r.sections.length)fail('请选择要删除的截面');
 const info=assemblyInfo(r),central=info.center;r.sections.splice(index,1);r.partIds.splice(index,1);r.sections.forEach((s,i)=>{if(!s.section.material)s.section.material=sectionRole(region.sections[i>=index?i+1:i].section,i>=index?i+1:i)==='channel'?'aluminum':'gypsum';});
 const bottom=Math.max(0,...r.sections.flatMap(s=>sectionPoints(s.section).map(v=>v.d)));r.height=info.base-bottom;
 if(r.centerConnection?.mode==='flange'){if(r.centerConnection.sectionIndex===index)r.centerConnection={mode:'independent',height:central.height,inset:central.inset};else if(r.centerConnection.sectionIndex>index)r.centerConnection.sectionIndex--;}
 // Keep a flush center at its real saved elevation when the controlling part leaves.
 if(r.center&&r.height!==region.height&&(!r.centerConnection||r.centerConnection.mode==='flush'))r.centerConnection={mode:'independent',height:central.height,inset:central.inset};
 regionItems(r);return r;
}
function setPresetExcluded(data,family,kind,excluded=true){
 componentPreset(family,kind);const next=clone(data||{version:1,items:[]}),key=family+':'+kind,keys=new Set(next.excludedPresets||[]);if(excluded)keys.add(key);else keys.delete(key);if(keys.size)next.excludedPresets=[...keys].sort();else delete next.excludedPresets;validate(next);return next;
}
function requiresV25(work){return !!work?.ceilings?.regions?.some(r=>r.channelEnabled!==undefined);}
function requiresV24(work){return !!work?.ceilings?.excludedPresets?.length||!!work?.ceilings?.regions?.some(r=>!r.sections.length||r.partIds!==undefined||r.centerId!==undefined);}
function assemblyInfo(r){const gypsumIndex=r.sections.findIndex((s,i)=>sectionRole(s.section,i)==='gypsum'&&(s.section.template?.kind==='lowCove'||plainSoffitValues(s.section))),channelIndex=r.sections.findIndex(s=>s.section.template?.kind==='upChannel'),gypsum=gypsumIndex>=0?clone(r.sections[gypsumIndex].section.template?.values||plainSoffitValues(r.sections[gypsumIndex].section)):null,channel=channelIndex>=0?channelValues(r.sections[channelIndex].section):null,bottom=Math.max(0,...r.sections.flatMap(s=>sectionPoints(s.section).map(v=>v.d))),base=r.height+bottom;return {gypsumIndex,channelIndex,gypsum,channel,bottom,base,center:centerLayout(r,base)};}
function editAssembly(region,{gypsum,channel,centerConnection,addChannel=false,replaceChannelIndex}={}){
 const r=clone(region),gi=r.sections.findIndex(s=>s.section.template?.kind==='lowCove'||plainSoffitValues(s.section)),ci=r.sections.findIndex(s=>s.section.template?.kind==='upChannel'),before=gi>=0?r.sections[gi].section.template?.values||plainSoffitValues(r.sections[gi].section):null;let q=ci>=0?channelValues(r.sections[ci].section):null;
 if(gypsum){if(!before)fail('当前石膏为自绘轮廓，请使用高级截面编辑或选择参数化预设');const old=r.sections[gi].section,next=(plainSoffitValues(old)?plainSoffit:lowCove)({...before,...gypsum});if(old.light)next.light=clone(old.light);else delete next.light;if(old.material)next.material=old.material;r.sections[gi].section=next;}
 const current=gi>=0?r.sections[gi].section.template?.values||plainSoffitValues(r.sections[gi].section):null;
 if(q&&gypsum){q.u+=current.projection-before.projection;q.d+=current.drop-current.bottom-before.drop+before.bottom;}
 if(channel||addChannel){if(!q){if(!addChannel)fail('当前型材为自绘轮廓，请选择上发光预设');if(r.sections.length>1&&replaceChannelIndex===undefined)fail('请先选择上发光预设，避免覆盖已有自绘型材');if(replaceChannelIndex!==undefined&&(!Number.isInteger(replaceChannelIndex)||replaceChannelIndex<0||replaceChannelIndex>=r.sections.length||replaceChannelIndex===gi))fail('请选择需要替换的灯槽截面');q={...rules().upChannel,u:current?.projection??rules().upChannel.u,d:current?current.drop-current.bottom:rules().upChannel.d};}
  const patch={...channel};delete patch.offsetU;delete patch.offsetD;Object.assign(q,patch);if(channel?.offsetU!==undefined)q.u=(current?.projection??0)+channel.offsetU;if(channel?.offsetD!==undefined)q.d=(current?current.drop-current.bottom:0)+channel.offsetD;
 }
 if(q){const item={name:ci>=0?r.sections[ci].name:'上发光型材 · 含柔光板',section:upChannel(q)};if(ci>=0)r.sections[ci]=item;else if(replaceChannelIndex!==undefined){r.sections[replaceChannelIndex]=item;if(gi>=0)delete r.sections[gi].section.light;}else{if(gi>=0)delete r.sections[gi].section.light;r.sections.push(item);}}
 if(centerConnection!==undefined)r.centerConnection=clone(centerConnection);return r;
}
function reuseAssembly(target,source){if(!source||!Array.isArray(source.sections)||!source.sections.length||source.sections.length>rules().maxSections||!finite(source.height)||!finite(target.height))fail('请选择有效的已建截面');const next=clone(target);next.sections=clone(source.sections);if(next.partIds){while(next.partIds.length<next.sections.length)next.partIds.push(nextRegionPartId(next));next.partIds.length=next.sections.length;}next.center=source.center===true;if(source.channelEnabled===undefined)delete next.channelEnabled;else next.channelEnabled=source.channelEnabled;if(source.centerConnection){next.centerConnection=clone(source.centerConnection);if(next.centerConnection.mode==='independent')next.centerConnection.height+=target.height-source.height;}else delete next.centerConnection;regionItems(next);return next;}
function assemblySample(r,length=600){
 const info=assemblyInfo(r),path={a:[0,0],b:[length,0],normal:[0,1]},items=r.sections.map((s,i)=>({s,i})).filter(({s})=>sectionActive(r,s)).map(({s,i})=>({id:'assembly_section_'+i,kind:'profile',name:s.name,roomId:'assembly_sample',height:info.base,path:clone(path),section:clone(s.section)}));
 if(r.center)items.push({id:'assembly_flat',kind:'flat',name:'中央平顶 · 样段截断',roomId:'assembly_sample',height:info.center.height,thickness:r.thickness,polygon:[[0,info.center.inset],[length,info.center.inset],[length,info.center.inset+350],[0,info.center.inset+350]]});
 validate({version:1,items});return {items,pending:items.filter(c=>c.kind==='profile').flatMap(c=>lightIssues(c.section).map(message=>({id:c.id,message})))};
}
// A closed sweep uses intersections of adjacent offset lines at every corner.
// Concave/sloping boundaries use the same stations in meshes and occupancy.
function designRegion(room,{style,height,thickness=rules().flatThickness,sections=sectionPreset('low'),center=true,centerConnection,aluminum,channelEnabled},makeId){
 if(!['none','flat','ring','aluminum'].includes(style))fail('请选择吊顶样式');
 if(style==='none')return [];
 const poly=regionBoundary(room);polygon(poly,'吊顶区域');
 const makeFlat=(p,z=height)=>({id:makeId('flat'),kind:'flat',roomId:room.id,name:(room.name+' · 平面吊顶').slice(0,80),height:z,thickness,polygon:clone(p)});
 if(style==='flat'||style==='aluminum'){const item=makeFlat(poly);if(style==='aluminum'){item.name=(room.name+' · 300×600铝扣板').slice(0,80);item.aluminum=clone(aluminum||aluminumDefaults());}const items=[item];validate({version:1,items});return items;}
 const paths=boundaryPaths(room),path={closed:true,join:'miter',segments:paths.map((p,i)=>({...p,id:'edge'+i}))};
 if(!Array.isArray(sections))fail('请先创建截面');if(!sections.length)return center?[makeFlat(centerConnection?.mode==='independent'?roomInsetBoundary(room,centerConnection.inset):poly,centerConnection?.mode==='independent'?centerConnection.height:height)]:[];
 sections.forEach(s=>section(s.section));
 const bottom=Math.max(...sections.flatMap(s=>sectionPoints(s.section).map(v=>v.d))),base=height+bottom;
 const items=sections.map((s,index)=>({s,index})).filter(({s})=>channelEnabled!==false||sectionRole(s.section)!=='channel').map(({s,index})=>({id:makeId('profile',index),kind:'profile',roomId:room.id,name:(room.name+' · '+s.name).slice(0,80),height:base,path:clone(path),section:clone(s.section)}));
 const connection=centerLayout({height,thickness,sections,centerConnection,center},base),inner=items.length?closedOffset(items[0],connection.inset):roomInsetBoundary(room,connection.inset);
 if(center)items.push(makeFlat(inner,connection.height));
 validate({version:1,items});
 // Reuse real occupancy, including the full centre-panel thickness.
 if(center&&checks({ceilings:{items:items.filter(c=>c.kind==='profile')}},[{f:{id:'center',name:'中央平顶'},p:inner,vertical:{bottom:connection.height,top:connection.height+thickness}}]).length)fail('中央平顶与截面实体相交，请修改连接方式、截面或板厚');
 return items;
}
function sameValue(a,b){if(typeof a==='number'&&typeof b==='number')return Math.abs(a-b)<=eps();if(a===b)return true;if(!a||!b||typeof a!=='object'||typeof b!=='object'||Array.isArray(a)!==Array.isArray(b))return false;const ka=Object.keys(a).sort(),kb=Object.keys(b).sort();return ka.length===kb.length&&ka.every((k,i)=>k===kb[i]&&sameValue(a[k],b[k]));}
// Merge only coplanar plain boards. Keep one region identity and its saved recipe.
function mergeFlatRegions(work,ids,{sourceId=ids?.[0]}={}){
 validate(work.ceilings);
 if(!Array.isArray(ids)||ids.length<2||new Set(ids).size!==ids.length)fail('请选择至少两个不同的平顶区域');
 const regions=ids.map(id=>work.ceilings?.regions?.find(r=>r.id===id));
 if(regions.some(r=>!r))fail('要合并的吊顶区域不存在');
 if(regions.some(r=>r.style!=='flat'))fail('只能合并平面吊顶区域，沿边吊顶和铝扣板请分别编辑');
 const source=regions.find(r=>r.id===sourceId);if(!source)fail('请选择所选区域中的名称与构造来源');
 if(regions.some(r=>!sameValue(r.height,source.height)||!sameValue(r.thickness,source.thickness)))fail('平顶底标高和板厚须相同，请先统一后再合并');
 const G=zones(),polys=regions.map(r=>r.polygon),overlap=(a,b)=>G.area(G.decompose([a,b],p=>G.inside(p,a)&&G.inside(p,b)))>.0001;
 const reached=new Set([0]),queue=[0];while(queue.length){const i=queue.shift();polys.forEach((p,j)=>{if(!reached.has(j)&&(G.adjacent([polys[i]],[p])||overlap(polys[i],p))){reached.add(j);queue.push(j);}});}
 if(reached.size!==regions.length)fail('所选平顶须共边相邻或重叠，不能仅顶点接触或分离');
 const pieces=G.decompose(polys,p=>polys.some(poly=>G.inside(p,poly))),outline=G.outline(pieces);
 if(outline.rings.length!==1)fail('合并结果须为单一无孔区域；当前不支持带孔平顶');
 const merged={...clone(source),polygon:outline.rings[0]};polygon(merged.polygon,'合并后的平顶区域');
 const difference=G.area(G.decompose([...polys,merged.polygon],p=>polys.some(poly=>G.inside(p,poly))!==G.inside(p,merged.polygon)));
 if(difference>.1||Math.abs(G.area(pieces)-Math.abs(area(merged.polygon)))>.1)fail('合并覆盖范围校验失败，未应用修改');
 const next=clone(work);next.ceilings.regions=next.ceilings.regions.filter(r=>!ids.includes(r.id)||r.id===sourceId);next.ceilings.items=next.ceilings.items.filter(c=>!ids.includes(c.regionId)||c.regionId===sourceId);
 return setRegion(next,merged);
}
function validateRegion(r){
 if(!r||Object.keys(r).some(k=>!['id','name','polygon','style','height','thickness','sections','center','centerConnection','aluminum','partIds','centerId','channelEnabled'].includes(k))||!key(r.id)||typeof r.name!=='string'||!r.name.trim()||r.name.length>80||!['none','flat','ring','aluminum'].includes(r.style)||!finite(r.height)||r.height<0||r.height>rules().max||!solid(r.thickness)||typeof r.center!=='boolean'||!Array.isArray(r.sections)||r.sections.length>rules().maxSections)fail('吊顶独立区域、样式或尺寸无效');
 if(r.channelEnabled!==undefined&&typeof r.channelEnabled!=='boolean')fail('灯槽启用状态无效');if(r.aluminum!==undefined)validateAluminum(r.aluminum);if(r.partIds!==undefined&&(!Array.isArray(r.partIds)||r.partIds.length!==r.sections.length||r.partIds.some(id=>!key(id))||new Set(r.partIds).size!==r.partIds.length))fail('吊顶截面身份无效');if(r.centerId!==undefined&&(!key(r.centerId)||r.partIds?.includes(r.centerId)))fail('中央平顶身份无效');
 polygon(r.polygon,'吊顶独立区域');for(const s of r.sections){if(!s||Object.keys(s).some(k=>!['name','section'].includes(k))||typeof s.name!=='string'||!s.name.trim()||s.name.length>80)fail('吊顶区域截面名称无效');section(s.section);}
 if(r.centerConnection!==undefined){const c=r.centerConnection;if(!c||Object.keys(c).some(k=>!['mode','sectionIndex','height','inset'].includes(k))||!['flush','flange','independent'].includes(c.mode))fail('中央平顶连接方式无效');if(c.mode==='flange'&&(!Number.isInteger(c.sectionIndex)||c.sectionIndex<0||c.sectionIndex>=r.sections.length||r.center!==false&&!channelValues(r.sections[c.sectionIndex]?.section)))fail('请选择实际的上发光型材翼边');if(c.mode==='independent'&&(!finite(c.height)||c.height<0||c.height>rules().max||!finite(c.inset)||c.inset<0||c.inset>rules().max))fail('中央平顶独立标高或边距无效');}
 return r;
}
function regionItems(r){validateRegion(r);let i=0;return designRegion({id:r.id,name:r.name,poly:r.polygon},r,(kind,index)=>kind==='flat'&&r.centerId?r.centerId:kind==='profile'&&r.partIds?r.partIds[index]:r.id+'_part_'+i++).map(c=>{delete c.roomId;return {...c,regionId:r.id};});}
function setRegion(work,r){const next=clone(work);validateRegion(r);const data=next.ceilings||{version:1,items:[]},regions=clone(data.regions||[]),i=regions.findIndex(v=>v.id===r.id);if(i<0)regions.push(clone(r));else regions[i]=clone(r);next.ceilings={...data,regions,items:[...data.items.filter(c=>c.regionId!==r.id),...regionItems(r)]};validate(next.ceilings);return next;}
function removeRegion(work,id){const next=clone(work);if(!next.ceilings?.regions?.some(r=>r.id===id))fail('吊顶独立区域不存在');next.ceilings.regions=next.ceilings.regions.filter(r=>r.id!==id);next.ceilings.items=next.ceilings.items.filter(c=>c.regionId!==id);if(!next.ceilings.regions.length)delete next.ceilings.regions;if(!next.ceilings.items.length&&!next.ceilings.regions&&!next.ceilings.excludedPresets?.length)delete next.ceilings;return next;}
function section(s){
 if(!s||!Array.isArray(s.vertices))fail('缺少吊顶截面');const ids=new Set();
 for(const v of s.vertices){if(!v||!key(v.id)||ids.has(v.id)||![v.u,v.d].every(n=>finite(n)&&n>=0&&n<=rules().max))fail('截面节点编号须唯一，坐标须为0～20000 mm');ids.add(v.id);}
 polygon(s.vertices.map(v=>[v.u,v.d]),'截面');
 if(s.material!==undefined&&!['gypsum','aluminum'].includes(s.material))fail('吊顶截面材质无效');
 if(s.diffuser){if(Object.keys(s.diffuser).some(k=>k!=='vertices')||!Array.isArray(s.diffuser.vertices)||s.diffuser.vertices.some(v=>!key(v.id)||![v.u,v.d].every(n=>finite(n)&&n>=0&&n<=rules().max)))fail('柔光板截面无效');polygon(s.diffuser.vertices.map(v=>[v.u,v.d]),'柔光板');}
 if(s.template){if(!['lowCove','upChannel'].includes(s.template.kind)||!s.template.values)fail('截面模板无效');const generated=s.template.kind==='lowCove'?lowCove(s.template.values):upChannel(s.template.values),expected=generated.vertices;if(expected.length!==s.vertices.length||expected.some((v,i)=>['id','u','d'].some(k=>v[k]!==s.vertices[i][k]))||!sameValue(s.diffuser,generated.diffuser))fail('截面模板尺寸与轮廓不一致');}
 if(s.light!==undefined){const l=s.light;if(!l||![l.u,l.d,l.angle].every(finite)||Math.abs(l.u)>rules().max||Math.abs(l.d)>rules().max||Math.abs(l.angle)>360||!solid(l.width)||!solid(l.thickness))fail('发光位置须在±20000 mm内，朝向在±360°内，灯带宽厚须为0.1～20000 mm');}
 if(s.light?.cornerSetback!==undefined&&(!finite(s.light.cornerSetback)||s.light.cornerSetback<0||s.light.cornerSetback>rules().max))fail('转角额外退让须为0～20000 mm');
 if(s.light?.corner!==undefined){const c=s.light.corner;if(!c||Object.keys(c).some(k=>!['mode','radius'].includes(k))||!['segmented','arc'].includes(c.mode)||!solid(c.radius))fail('灯带转角模式无效，中心线半径须为0.1～20000 mm');}
 return s;
}
function lightPolygon(l){const r=l.angle*Math.PI/180,n=[Math.cos(r),Math.sin(r)],t=[-n[1],n[0]];return [[-1,0],[1,0],[1,1],[-1,1]].map(([w,h])=>[l.u+t[0]*w*l.width/2+n[0]*h*l.thickness,l.d+t[1]*w*l.width/2+n[1]*h*l.thickness]);}
function lightIssues(s){
 const issues=[],body=s.vertices.map(v=>[v.u,v.d]),diff=s.diffuser?.vertices.map(v=>[v.u,v.d]);
 if(diff){const overlap=intersection(body,diff);if(overlap.length>=3&&Math.abs(area(overlap))>eps()**2)issues.push('柔光板与型材实体相交，请调整尺寸或位置');}
 if(!s.light)return issues;const p=lightPolygon(s.light),overlap=intersection(body,p);
 if(overlap.length>=3&&Math.abs(area(overlap))>eps()**2)issues.push('灯带实体与截面相交，请调整发光位置或朝向');
 else if(!body.some((a,i)=>onSegment(p[0],a,body[(i+1)%body.length])&&onSegment(p[1],a,body[(i+1)%body.length])))issues.push('灯带当前为自由位置，安装承托待核对');
 if(diff){const overlap=intersection(diff,p);if(overlap.length>=3&&Math.abs(area(overlap))>eps()**2)issues.push('灯带与柔光板实体相交，请调整发光位置');}
 return issues;
}
function route(c){return c.path.segments||[{id:'leg0',...c.path}];}
function tangent(p){const L=distance(p.a,p.b);return p.b.map((v,i)=>(v-p.a[i])/L);}
function samePath(a,b){return distance(a.a,b.a)<=eps()&&distance(a.b,b.b)<=eps()&&distance(a.normal,b.normal)<=eps()||distance(a.a,b.b)<=eps()&&distance(a.b,b.a)<=eps()&&distance(a.normal,b.normal)<=eps();}
function joinedPath(first,second){
 let a=clone(first),b=clone(second);if(distance(a.b,b.a)>eps()){
  if(distance(a.b,b.b)<=eps())[b.a,b.b]=[b.b,b.a];
  else if(distance(a.a,b.a)<=eps())[a.a,a.b]=[a.b,a.a];
  else if(distance(a.a,b.b)<=eps()){[a.a,a.b]=[a.b,a.a];[b.a,b.b]=[b.b,b.a];}
  else fail('请选择共享一个墙角的相邻边界');
 }
 const dot=(u,v)=>u[0]*v[0]+u[1]*v[1],ta=tangent(a),tb=tangent(b);
 if(Math.abs(dot(ta,tb))>eps()||Math.abs(dot(ta,b.normal)+1)>eps()||Math.abs(dot(tb,a.normal)-1)>eps())fail('连续转角目前支持区域内侧90°相邻墙；凹角或斜角请分开设计');
 return {segments:[{...a,id:'leg0'},{...b,id:'leg1'}],join:'miter'};
}
function offsetStations(c,u){
 if(c.path.closed){const legs=route(c),out=legs.map((p,i)=>{const before=legs[(i+legs.length-1)%legs.length],a=before.normal,b=p.normal,den=1+a[0]*b[0]+a[1]*b[1];if(den<eps())fail('区域边界转角接近折返，不能生成拼角');return p.a.map((v,k)=>v+(a[k]+b[k])*u/den);});return [...out,clone(out[0])];}
 const legs=route(c),first=legs[0],last=legs.at(-1),out=[first.a.map((v,i)=>v+first.normal[i]*u)];
 if(legs.length===2){const t=tangent(first);out.push(first.b.map((v,i)=>v+(first.normal[i]-t[i])*u));}
 out.push(last.b.map((v,i)=>v+last.normal[i]*u));return out;
}
function closedOffset(c,u){
 const legs=route(c),poly=offsetStations(c,u).slice(0,-1),base=legs.map(p=>p.a);polygon(poly,'回型内侧边界');
 if(Math.sign(area(poly))!==Math.sign(area(base)))fail('截面宽度占满区域，无法保留回型内侧');
 for(let i=0;i<legs.length;i++){const t=tangent(legs[i]);if((poly[(i+1)%poly.length][0]-poly[i][0])*t[0]+(poly[(i+1)%poly.length][1]-poly[i][1])*t[1]<rules().min-eps())fail('截面宽度占满短边，请减小凸出或调整区域');}
 const Z=zones(),outside=Z.area(Z.decompose([base,poly],p=>Z.inside(p,poly)&&!Z.inside(p,base)));if(outside>.01)fail('回型内侧超出区域或窄处相交，请减小截面宽度');return poly;
}
function legFootprint(c,index,us){const lo=offsetStations(c,Math.min(...us)),hi=offsetStations(c,Math.max(...us));return [lo[index],lo[index+1],hi[index+1],hi[index]];}
function hull(points){const p=points.map(v=>v.slice()).sort((a,b)=>a[0]-b[0]||a[1]-b[1]),half=a=>{const out=[];for(const p of a){while(out.length>1&&cross(out.at(-2),out.at(-1),p)<=0)out.pop();out.push(p);}return out;};return [...half(p).slice(0,-1),...half(p.reverse()).slice(0,-1)];}
function compactLightRadius(light){const R=Math.max(rules().corner.lightRadius,Math.max(...lightPolygon(light).map(p=>p[0]-light.u))+rules().corner.compactInnerRadius);if(!solid(R))fail('当前灯带宽厚不能采用小圆角，请先减小宽厚');return R;}
function endOpening(c){
 const v=c.section.vertices,body=v.map(p=>[p.u,p.d]),candidates=[];
 for(let i=0;i<v.length;i++){
  const a=v[i],b=v[(i+1)%v.length],before=v[(i+v.length-1)%v.length],after=v[(i+2)%v.length];if(Math.abs(a.d-b.d)>eps()||!solid(Math.abs(a.u-b.u),Math.max(a.u,b.u)))continue;
  const mid=(a.u+b.u)/2;if(inside([mid,a.d-.0001],body,false)||!inside([mid,a.d+.0001],body,false))continue;
  if(Math.abs(before.u-a.u)>eps()||Math.abs(after.u-b.u)>eps()||!solid(a.d-before.d,Math.max(a.d,before.d))||!solid(b.d-after.d,Math.max(b.d,after.d)))continue;
  const u0=Math.min(a.u,b.u),u1=Math.max(a.u,b.u),top=Math.max(before.d,after.d),bottom=a.d;if(!solid(bottom-top,Math.max(bottom,top)))continue;
  candidates.push([[u0,top],[u1,top],[u1,bottom],[u0,bottom]]);
 }
 return candidates.length===1?candidates[0]:null;
}
function endCaps(c){
 if(c.path.closed)return {plates:[],pending:[]};
 const active=['start','end'].filter(end=>c.ends?.[end]?.enabled).map(end=>[end,c.ends[end]]),pending=[],plates=[];if(!active.length)return {plates,pending};const section=endOpening(c),legs=route(c);
 if(!section)return {plates,pending:['端板槽口无法唯一识别，请保留水平槽底及两侧竖向挡边，再更新收口']};
 if(legs.length===1&&active.length===2&&!solid(distance(legs[0].a,legs[0].b)-active.reduce((s,[,v])=>s+v.thickness,0),distance(legs[0].a,legs[0].b)))return {plates,pending:['两端端板占满直线路径，请减小板厚']};
 for(const [end,config] of active){
  const leg=end==='start'?legs[0]:legs.at(-1),L=distance(leg.a,leg.b),t=tangent(leg),reserve=legs.length===2?Math.max(...section.map(p=>p[0])):0;
  if(!solid(L-reserve-config.thickness,L)){pending.push(`${end==='start'?'起端':'末端'}端板侵入转角或占满路径，请减小板厚`);continue;}
  const a=end==='start'?clone(leg.a):leg.b.map((v,i)=>v-t[i]*config.thickness),b=end==='start'?leg.a.map((v,i)=>v+t[i]*config.thickness):clone(leg.b),path={a,b,normal:clone(leg.normal)},footprint=[a.map((v,i)=>v+leg.normal[i]*section[0][0]),b.map((v,i)=>v+leg.normal[i]*section[0][0]),b.map((v,i)=>v+leg.normal[i]*section[1][0]),a.map((v,i)=>v+leg.normal[i]*section[1][0])];
  plates.push({end,section:clone(section),path,footprint,thickness:config.thickness,lightGap:config.lightGap,innerPoint:clone(end==='start'?b:a)});
 }
 return {plates,pending};
}
function endRetreats(c){const caps=endCaps(c),offsets={start:0,end:0};for(const p of caps.plates)offsets[p.end]=p.thickness+p.lightGap;return {offsets,pending:caps.pending};}
function continuousLight(c){
 const l=c.section.light,p=lightPolygon(l),legs=route(c),R=l.corner.radius,H=l.u+R,pending=[],none=()=>({pieces:[],pending,continuous:null}),ends=endRetreats(c);
 if(ends.pending.length){pending.push('端板收口尚未生成，灯带内侧退让待核对');return none();}
 if(legs.length!==2){pending.push('连续绕角需要两段L形路径');return none();}
 const minRadius=R-Math.max(...p.map(v=>v[0]-l.u));if(!solid(minRadius,Math.max(R,...p.map(v=>Math.abs(v[0])),Math.abs(l.u)))){pending.push('连续灯带内缘半径不足0.1 mm，请增大绕角半径或减小灯带宽厚');return none();}
 const lengths=legs.map(p=>distance(p.a,p.b));if(H<0||lengths.some((L,i)=>!solid(L-H-ends.offsets[i===0?'start':'end'],L))){pending.push('连续绕角或端板退让占满路径，转角两侧须各保留至少0.1 mm直段');return none();}
 const t=tangent(legs[0]),n=legs[0].normal,J=legs[0].b,O=J.map((v,i)=>v+(n[i]-t[i])*H),outer=Math.max(...p.map(v=>H-v[0])),angle=Math.min(rules().corner.arcMaxAngle*Math.PI/180,2*Math.acos(Math.max(-1,1-rules().corner.arcChordError/outer))),steps=Math.min(rules().corner.arcMaxSegments,Math.max(8,2*Math.ceil(Math.PI/2/angle/2)));
 const at=(q,theta)=>O.map((v,i)=>v+(t[i]*Math.sin(theta)-n[i]*Math.cos(theta))*(H-q));
 const rings=[p.map(([q])=>legs[0].a.map((v,i)=>v+n[i]*q+t[i]*ends.offsets.start))],centerline=[pointAt(c,l.u,ends.offsets.start)];
 for(let k=0;k<=steps;k++){const theta=k*Math.PI/2/steps;rings.push(p.map(([q])=>at(q,theta)));centerline.push(at(l.u,theta));}
 const lastT=tangent(legs[1]);rings.push(p.map(([q])=>legs[1].b.map((v,i)=>v+legs[1].normal[i]*q-lastT[i]*ends.offsets.end)));centerline.push(legs[1].b.map((v,i)=>v+legs[1].normal[i]*l.u-lastT[i]*ends.offsets.end));
 const minIndex=p.reduce((best,v,i)=>v[0]<p[best][0]?i:best,0),maxIndex=p.reduce((best,v,i)=>v[0]>p[best][0]?i:best,0),footprints=rings.slice(1).map((ring,i)=>[rings[i][minIndex],ring[minIndex],ring[maxIndex],rings[i][maxIndex]]);
 // On either half of a convex 90-degree miter the nearest wall coordinate is
 // H-(H-q)*cos(theta), theta in [0,pi/4]. Its swept (q,d) projection is exactly
 // the convex hull of the initial and midpoint light sections, not a center ray.
 const mid=p.map(([q,d])=>[H-(H-q)*Math.SQRT1_2,d]),envelope=hull([...p,...mid]),body=c.section.vertices.map(v=>[v.u,v.d]),overlap=intersection(body,envelope);
 if(overlap.length>=3&&Math.abs(area(overlap))>eps()**2)pending.push('连续转角灯带实体与槽腔边界相交，请调整半径、发光位置或截面');
 else if(!lightIssues(c.section).length){const support=[p[0],p[1],mid[0],mid[1]];if(!body.some((a,i)=>support.every(v=>onSegment(v,a,body[(i+1)%body.length]))))pending.push('连续转角灯带承托不完整，请核对槽底或调整发光位置');}
 return {pieces:[],pending,continuous:{rings,footprints,centerline,radius:R,steps,innerRadius:minRadius}};
}
function lightLayout(c){
 if(c.path.closed&&c.section.light){const p=lightPolygon(c.section.light);try{for(const u of new Set(p.map(v=>v[0])))closedOffset(c,u);const rings=offsetStations(c,p[0][0]).map((_,i)=>p.map(([u])=>offsetStations(c,u)[i])),footprints=route(c).map((_,i)=>legFootprint(c,i,p.map(v=>v[0])));return {pieces:[],pending:lightIssues(c.section),continuous:{closed:true,rings,footprints}};}catch(e){return {pieces:[],pending:['闭合灯带暂未生成：'+e.message]};}}
 if(!c.section.light)return {pieces:[],pending:[]};if(c.section.light.corner?.mode==='arc')return continuousLight(c);const legs=route(c),pending=[],pieces=[],p=lightPolygon(c.section.light),maxU=Math.max(...p.map(v=>v[0])),extra=c.section.light.cornerSetback??rules().corner.lightSetback,ends=endRetreats(c);
 if(ends.pending.length)return {pieces,pending:['端板收口尚未生成，灯带内侧退让待核对']};
 for(let i=0;i<legs.length;i++){
  const leg=legs[i],L=distance(leg.a,leg.b),start=legs.length===2&&i===1?maxU+extra:ends.offsets.start,end=legs.length===2&&i===0?L-maxU-extra:L-ends.offsets.end;
  if(!solid(end-start,L)){pending.push(`第${i+1}段灯带转角退让后长度不足，暂不生成此段灯带`);continue;}
  const t=tangent(leg);pieces.push({legId:leg.id,path:{a:leg.a.map((v,k)=>v+t[k]*start),b:leg.a.map((v,k)=>v+t[k]*end),normal:clone(leg.normal)}});
 }
 let join=null;if(legs.length===2&&pieces.length===2){const l=c.section.light,center=(Math.min(...p.map(v=>v[0]))+maxU)/2;join=pieces.map((piece,i)=>{const a=i===0?piece.path.b:piece.path.a;return a.map((v,k)=>v+piece.path.normal[k]*center);});}
 return {pieces,pending,join};
}
function sample(c){
 if(c.path.closed)return clone(c);
 const out=clone(c),legs=route(out),offset=end=>out.ends?.[end]?.enabled?out.ends[end].thickness+out.ends[end].lightGap:0,drop=end=>{if(out.ends){delete out.ends[end];if(!Object.keys(out.ends).length)delete out.ends;}};if(legs.length===1){const original=distance(out.path.a,out.path.b),L=Math.min(Math.max(600,offset('start')+100),original);if(L<original-eps()&&offset('end')>=original-L-eps())return out;out.path.b=pointAt(out,0,L);if(L<original-eps())drop('end');return out;}
 // A wide section or large light setback needs a longer sample to represent
 // the valid source; trimming every route to 600 would invent a short-arm error.
 const light=out.section.light,need=Math.max(600,Math.max(...out.section.vertices.map(v=>v.u))+100,light?(light.corner?.mode==='arc'?light.u+light.corner.radius:Math.max(...lightPolygon(light).map(p=>p[0]))+(light.cornerSetback??0))+100:0);
 const t0=tangent(legs[0]),t1=tangent(legs[1]),original0=distance(legs[0].a,legs[0].b),original1=distance(legs[1].a,legs[1].b),L0=Math.min(need,original0),L1=Math.min(need,original1);if(L0<original0-eps()&&offset('start')>=original0-L0-eps()||L1<original1-eps()&&offset('end')>=original1-L1-eps())return out;legs[0].a=legs[0].b.map((v,i)=>v-t0[i]*L0);legs[1].b=legs[1].a.map((v,i)=>v+t1[i]*L1);if(L0<original0-eps())drop('start');if(L1<original1-eps())drop('end');return out;
}
function validate(data){
 if(data===undefined)return;if(!data||data.version!==1||!Array.isArray(data.items)||data.items.length>rules().maxItems)fail('吊顶数据版本或数量无效');if(data.excludedPresets!==undefined&&(!Array.isArray(data.excludedPresets)||new Set(data.excludedPresets).size!==data.excludedPresets.length||data.excludedPresets.some(k=>typeof k!=='string'||!Object.entries(rules().componentPresets).some(([family,presets])=>presets.some(p=>family+':'+p.id===k)))))fail('吊顶预设删除记录无效');const ids=new Set();
 const regions=data.regions===undefined?[]:data.regions;if(!Array.isArray(regions)||regions.length>rules().maxRegions)fail('吊顶独立区域数量无效');const regionIds=new Set();for(const r of regions){validateRegion(r);if(regionIds.has(r.id))fail('吊顶独立区域编号重复');regionIds.add(r.id);}
 for(const c of data.items){
  if(!c||!key(c.id)||ids.has(c.id)||!(c.regionId!==undefined?key(c.regionId)&&regionIds.has(c.regionId)&&c.roomId===undefined:key(c.roomId))||typeof c.name!=='string'||!c.name.trim()||c.name.length>80||!finite(c.height)||c.height<0||c.height>rules().max)fail('吊顶编号、区域、名称或标高无效');ids.add(c.id);
  if(c.attachment!==undefined||c.basePolygon!==undefined)fail('旧版平顶固定关系已停用，请使用区域部件连接');
  if(c.ends!==undefined&&c.kind!=='profile')fail('端板收口仅支持沿边截面造型');
  if(c.aluminum!==undefined&&c.kind!=='flat')fail('铝扣板仅支持平面吊顶');
  if(c.kind==='profile'){
   if(c.ends!==undefined){if(!c.ends||typeof c.ends!=='object'||Array.isArray(c.ends)||Object.keys(c.ends).some(k=>!['start','end'].includes(k)))fail('端板收口只支持起端和末端');for(const e of Object.values(c.ends))if(!e||Object.keys(e).some(k=>!['enabled','thickness','lightGap'].includes(k))||typeof e.enabled!=='boolean'||!solid(e.thickness)||!finite(e.lightGap)||e.lightGap<0||e.lightGap>rules().max)fail('端板厚度须为0.1～20000 mm，灯带内侧退让须为0～20000 mm');}
   section(c.section);if(!c.path||c.path.closed!==undefined&&c.path.closed!==true||c.path.closed&&!c.path.segments||c.path.segments!==undefined&&(!Array.isArray(c.path.segments)||(c.path.closed?c.path.segments.length<3||c.path.segments.length>rules().maxVertices:c.path.segments.length!==rules().corner.maxLegs)||c.path.a!==undefined||c.path.b!==undefined||c.path.join!=='miter'))fail('吊顶路径分段或拼角无效');
   const legs=route(c),legIds=new Set();for(const p of legs){if(!p||!point(p.a)||!point(p.b)||!point(p.normal)||!solid(distance(p.a,p.b))||Math.abs(Math.hypot(...p.normal)-1)>eps())fail('吊顶路径和朝向无效');const t=tangent(p);if(Math.abs(t[0]*p.normal[0]+t[1]*p.normal[1])>eps())fail('路径朝向必须垂直于路径');if(!key(p.id)||legIds.has(p.id))fail('路径分段编号无效或重复');legIds.add(p.id);}
   if(c.path.closed){if(c.ends!==undefined)fail('闭合回型没有开放端，不能设置端板');const base=legs.map(p=>p.a);polygon(base,'回型边界');const sign=Math.sign(area(base));for(let i=0;i<legs.length;i++){const p=legs[i],t=tangent(p);if(distance(p.b,legs[(i+1)%legs.length].a)>eps()||distance(p.normal,[-t[1]*sign,t[0]*sign])>eps())fail('闭合回型须首尾相接且朝向区域内部');}for(const u of new Set(sectionPoints(c.section).map(v=>v.u)))closedOffset(c,u);}
   else if(legs.length===2){if(distance(legs[0].b,legs[1].a)>eps())fail('L形路径必须首尾相接');joinedPath(legs[0],legs[1]);const maxU=Math.max(...c.section.vertices.map(v=>v.u));if(legs.some(p=>!solid(distance(p.a,p.b)-maxU,distance(p.a,p.b))))fail('截面凸出占满短边，转角后须保留至少0.1 mm有效长度');}
   if(sectionPoints(c.section).some(v=>c.height-v.d< -eps()))fail('吊顶截面不能低于测量基准地面');
  }else if(c.kind==='flat'){
   polygon(c.polygon,'平顶边界');if(!solid(c.thickness)||c.height+c.thickness>rules().max)fail('平顶板厚或顶部标高无效');
   if(c.aluminum!==undefined){validateAluminum(c.aluminum);if(c.thickness<2)fail('铝扣板模型构造厚度至少2 mm');aluminumGrid(c);}
  }else fail('吊顶类型无效');
 }
 for(const r of regions){const expected=regionItems(r),actual=data.items.filter(c=>c.regionId===r.id);if(actual.length!==expected.length||expected.some(e=>!actual.some(c=>c.id===e.id&&sameValue(c,e))))fail('吊顶区域配置与生成构件不一致，请重新生成区域');}
 return data;
}
function boundaryRing(input){
 const p=clone(input);if(!Array.isArray(p)||!p.every(point))fail('区域边界节点无效');while(p.length>3&&distance(p[0],p.at(-1))<=eps())p.pop();polygon(p,'区域边界');return p;
}
function regionBoundary(room){if(room.rings?.length>1)fail('首版平顶暂不支持带孔或多片区域，请先划分区域');return boundaryRing(room.rings?.[0]||room.poly);}
function roomInsetBoundary(room,inset){
 if(!finite(inset)||inset<0||inset>rules().max)fail('统一退让须为0～'+rules().max+' mm');if(room.rings?.length>1)fail('统一退让暂不支持带孔或多片房间，请先划分区域');const poly=regionBoundary(room);if(inset===0)return poly;
 try{const path={closed:true,join:'miter',segments:boundaryPaths({poly}).map((p,i)=>({...p,id:'edge'+i}))};return closedOffset({path},inset);}catch{fail('该距离无法生成有效的退让边界，请减小尺寸或调整参考房间');}
}
function boundaryPaths(room){
 return (room.rings?.length?room.rings:[room.poly]).flatMap(ring=>{const poly=boundaryRing(ring);return poly.map((a,i)=>{
  const b=poly[(i+1)%poly.length],L=distance(a,b),t=b.map((v,k)=>(v-a[k])/L),mid=a.map((v,k)=>(v+b[k])/2);let n=[-t[1],t[0]];
  if(!inside(mid.map((v,k)=>v+n[k]*.0001),room.poly,false))n=n.map(v=>-v);
  if(!inside(mid.map((v,k)=>v+n[k]*.0001),room.poly,false))fail('区域边界内侧无法确定，请先核对区域轮廓');
  return {a:clone(a),b:clone(b),normal:n};
 });});
}
function pointAt(c,u,s=0,index=0){const p=route(c)[index],t=tangent(p);return p.a.map((v,i)=>v+p.normal[i]*u+t[i]*s);}
function footprint(c,u=sectionPoints(c.section).map(v=>v.u)){return [...offsetStations(c,Math.min(...u)),...offsetStations(c,Math.max(...u)).reverse()];}
function convex(p){let sign=0;for(let i=0;i<p.length;i++){const x=cross(p[i],p[(i+1)%p.length],p[(i+2)%p.length]);if(Math.abs(x)<=eps())continue;if(sign&&Math.sign(x)!==sign)return false;sign=Math.sign(x);}return true;}
function clip(p,a,n,u){
 const out=[],value=v=>(v[0]-a[0])*n[0]+(v[1]-a[1])*n[1]-u;
 for(let i=0;i<p.length;i++){const v=p[i],w=p[(i+1)%p.length],x=value(v),y=value(w);if(x>=-eps())out.push(clone(v));if(x>eps()&&y< -eps()||x< -eps()&&y>eps()){const t=x/(x-y);out.push(v.map((q,k)=>q+(w[k]-q)*t));}}
 return out.filter((p,i)=>distance(p,out[(i+out.length-1)%out.length])>eps());
}
function assemblyIssues(r){const out=[];if(r.style!=='ring')return out;for(let i=0;i<r.sections.length;i++)for(let j=i+1;j<r.sections.length;j++){const a=r.sections[i],b=r.sections[j];if(!sectionActive(r,a)||!sectionActive(r,b))continue;if(sectionContours(a.section).some(A=>sectionContours(b.section).some(B=>overlapArea(A.map(v=>[v.u,v.d]),B.map(v=>[v.u,v.d]))>eps()**2)))out.push(a.name+'与'+b.name+'实体相交，请核对相对位置');}return out;}
function resolve(data){
 validate(data);const items=clone(data?.items||[]),pending=[];for(const r of data?.regions||[])for(const message of assemblyIssues(r))pending.push({id:r.id,message});
 for(let i=0;i<items.length;i++){
  const c=items[i];if(c.kind==='profile')for(const message of [...endCaps(c).pending,...lightIssues(c.section),...lightLayout(c).pending])pending.push({id:c.id,message});
 }
 return {items,pending,...(data?.regions?{regions:clone(data.regions)}:{})};
}
function edit(work,item){const next=clone(work);next.ceilings=next.ceilings||{version:1,items:[]};const i=next.ceilings.items.findIndex(c=>c.id===item.id);if(i<0)next.ceilings.items.push(clone(item));else next.ceilings.items[i]=clone(item);validate(next.ceilings);return next;}

function overlapArea(a,b){const Z=zones();return Z.area(Z.decompose([a,b],p=>Z.inside(p,a)&&Z.inside(p,b)));}
// Readouts use finished floors; saved architectural elevations stay absolute.
function heightMeasurements(plan,polygon,bottoms){
 const levels=Array.isArray(bottoms)?bottoms:[bottoms],lo=Math.min(...levels),hi=Math.max(...levels),rooms=(plan.rooms||[]).filter(r=>r.counted!==false&&(r.polys||[r.poly]).some(p=>overlapArea(polygon,p)>.01));
 const floors=rooms.map(r=>plan.floorFinish?.areas?.[r.id]?.finishedZ??(plan.floorFinish?.areas?.[r.id]?null:0)),roofs=rooms.map(r=>r.ceilingHeight??(root.FurnishProject||require('./project-core.js')).ceilingHeight(plan)),range=values=>values.length&&values.every(finite)?{min:Math.min(...values),max:Math.max(...values)}:null,floor=range(floors);
 return {floor,aboveFloor:range(floors.flatMap(z=>finite(z)&&finite(lo)&&finite(hi)?[lo-z,hi-z]:[null])),roofGap:range(roofs.flatMap(z=>finite(z)&&finite(lo)&&finite(hi)?[z-hi,z-lo]:[null]))};
}
function regionContext(plan,r){
 const rooms=(plan.rooms||[]).filter(room=>room.counted!==false),Z=zones(),polys=rooms.flatMap(room=>room.polys||[room.poly]),outside=polys.length?Z.area(Z.decompose([r.polygon,...polys],p=>Z.inside(p,r.polygon)&&!polys.some(poly=>Z.inside(p,poly)))):Math.abs(area(r.polygon));
 const heights=rooms.filter(room=>(room.polys||[room.poly]).some(poly=>overlapArea(r.polygon,poly)>.01)).map(room=>room.ceilingHeight);
 return {outside:outside>.01,height:heights.length&&heights.every(finite)?Math.min(...heights):undefined};
}
function derive(plan,work){
 if(!work.ceilings)return plan;const data=resolve(work.ceilings),contexts=new Map();
 for(const r of data.regions||[])if(r.style!=='none'){const context=regionContext(plan,r);contexts.set(r.id,context);if(context.outside)data.pending.push({id:r.id,message:r.name+'：吊顶区域超出可用空间或跨越墙体，请核对边界'});}
 for(const c of data.items){
  const independent=c.regionId&&(data.regions||[]).find(r=>r.id===c.regionId),r=independent?{poly:independent.polygon,ceilingHeight:contexts.get(c.regionId)?.height}:plan.rooms.find(r=>r.id===c.roomId);
  if(!r){data.pending.push({id:c.id,message:'原区域已变化，请重新关联吊顶'});continue;}
  const pieces=c.kind==='profile'?route(c).map((_,i)=>legFootprint(c,i,sectionPoints(c.section).map(v=>v.u))):[c.polygon];
  if(pieces.some(poly=>poly.some(p=>!inside(p,r.poly))))data.pending.push({id:c.id,message:'吊顶超出当前区域，请核对边界'});
  const light=c.kind==='profile'&&c.section.light?lightPolygon(c.section.light):[],top=c.kind==='profile'?c.height-Math.min(...sectionPoints(c.section).map(v=>v.d),...light.map(p=>p[1])):c.height+c.thickness;
  if(light.length){const layout=lightLayout(c),polys=layout.continuous?.footprints||layout.pieces.map(piece=>footprint({...c,path:piece.path},light.map(p=>p[0])));if(polys.some(poly=>poly.some(p=>!inside(p,r.poly))))data.pending.push({id:c.id,message:'灯带超出当前区域，请核对发光位置'});}
  if(light.some(p=>c.height-p[1]< -eps()))data.pending.push({id:c.id,message:'灯带低于测量基准地面，请核对发光位置'});
  if(!finite(r.ceilingHeight))data.pending.push({id:c.id,message:'原顶高度待核对'});else if(top>r.ceilingHeight+eps())data.pending.push({id:c.id,message:'吊顶或灯带超过当前原顶高度'});
 }
 return {...plan,ceilings:data};
}
function onlyChange(a,b){const strip=v=>{const c=clone(v);delete c.ceilings;return JSON.stringify(c);};return strip(a)===strip(b);}
function intersection(subject,boundary){let out=subject,sign=area(boundary)>0?1:-1;for(let i=0;i<boundary.length&&out.length;i++){const a=boundary[i],b=boundary[(i+1)%boundary.length],L=distance(a,b);out=clip(out,a,[-(b[1]-a[1])*sign/L,(b[0]-a[0])*sign/L],0);}return out;}
// Derived holes only: a standard lamp rim must meet the actual flat bottom.
function downlightHoles(c,bodies){
 if(c.kind!=='flat')return [];
 const P=root.FurnishProducts||require('./product-rules.js'),seen=new Set(),holes=[];
 for(const {f,vertical} of bodies){
  if(seen.has(f.id))continue;seen.add(f.id);const spec=!f.obj&&P.definition(f)?.downlight;
  if(!spec||!vertical||Math.abs(f.w-spec.diameter)>eps()||Math.abs(f.d-spec.diameter)>eps()||Math.abs(P.height(f)-P.definition(f).height)>eps()||Math.abs(vertical.bottom+spec.rim-c.height)>eps())continue;
  const r=spec.cutout/2,center=[f.cx,f.cy];if(!inside(center,c.polygon,false))continue;
  const edgeDistance=(a,b)=>{const dx=b[0]-a[0],dy=b[1]-a[1],t=Math.max(0,Math.min(1,((center[0]-a[0])*dx+(center[1]-a[1])*dy)/(dx*dx+dy*dy)));return Math.hypot(center[0]-a[0]-t*dx,center[1]-a[1]-t*dy);};
  // Keep the whole trim supported, not just the hole centre.
  if(c.polygon.some((a,i)=>edgeDistance(a,c.polygon[(i+1)%c.polygon.length])<spec.diameter/2-eps()))continue;
  holes.push({id:f.id,x:f.cx,y:f.cy,r});
 }
 return holes.filter(h=>!holes.some(o=>o!==h&&Math.hypot(o.x-h.x,o.y-h.y)<o.r+h.r-eps()));
}
function fitDownlight(plan,f,furniture=[]){
 const P=root.FurnishProducts||require('./product-rules.js'),spec=P.definition(f)?.downlight;
 if(!spec||f.obj)fail('当前对象不支持筒灯安装');
 const base=P.floorBase(plan,f,furniture),choices=[];
 if(!base.known)fail('家具基准地面标高未知，请先核对');
 for(const c of plan.ceilings?.items||[]){
  const bottom=c.height-spec.rim,mountHeight=bottom-base.z;
  if(mountHeight<0||mountHeight>20000)continue;
  const holes=downlightHoles(c,[{f,vertical:{bottom,top:bottom+P.height(f)}}]);
  if(holes.length&&!panelReplacements(c,installationBodies(plan,furniture.filter(v=>v.id!==f.id))).some(s=>circleInSlot(holes[0],s.cell)))choices.push(mountHeight);
 }
 if(choices.length!==1)fail(choices.length?'所在位置有多个平顶，请手动填写安装高度':'当前位置没有可完整容纳标准筒灯的平顶');
 return choices[0];
}
function installationBodies(plan,furniture){const D=root.FurnishDesign||require('./design-core.js');return furniture.map(f=>({f,vertical:D.furnitureVerticalBounds(f,plan,furniture)}));}
function circleInSlot(h,cell){const p=[h.x,h.y];return inside(p,cell)||cell.some((a,i)=>{const b=cell[(i+1)%cell.length],dx=b[0]-a[0],dy=b[1]-a[1],t=Math.max(0,Math.min(1,((p[0]-a[0])*dx+(p[1]-a[1])*dy)/(dx*dx+dy*dy)));return Math.hypot(p[0]-a[0]-t*dx,p[1]-a[1]-t*dy)<h.r+eps();});}
function panelSlot(c,row,col,grid=aluminumGrid(c)){
 const {start,pitch,count,inner}=grid;if(row<0||col<0||row>=count[1]||col>=count[0])return null;
 const x=start[0]+col*pitch[0],y=start[1]+row*pitch[1],cell=[[x,y],[x+pitch[0],y],[x+pitch[0],y+pitch[1]],[x,y+pitch[1]]].map(grid.toWorld),center=grid.toWorld([x+pitch[0]/2,y+pitch[1]/2]);
 return {id:'panel_'+(row+grid.index[1])+'_'+(col+grid.index[0]),row,col,cell,cx:center[0],cy:center[1],full:Math.abs(overlapArea(cell,inner)-pitch[0]*pitch[1])<.01};
}
// A ceiling panel device removes one complete nominal cell, including its seams/backing.
// Position, orientation, elevation and other installed devices are rechecked on every derivation.
function panelReplacements(c,bodies){
 if(c.kind!=='flat'||!c.aluminum)return [];const P=root.FurnishProducts||require('./product-rules.js'),grid=aluminumGrid(c),entries=new Map(),out=[],lamps=downlightHoles(c,bodies);
 for(const {f,vertical}of bodies){if(f.obj||!P.definition(f)?.ceilingPanel)continue;const old=entries.get(f.id);if(old){old.vertical=old.vertical&&vertical?{bottom:Math.min(old.vertical.bottom,vertical.bottom),top:Math.max(old.vertical.top,vertical.top)}:null;}else entries.set(f.id,{f,vertical:vertical&&{...vertical}});}
 for(const {f,vertical}of entries.values()){
  const spec=P.definition(f).ceilingPanel;
  if(!vertical||Math.abs(vertical.bottom+spec.rim-c.height)>eps()||P.height(f)<=spec.rim||Math.abs(f.w-spec.width)>eps()||Math.abs(f.d-spec.length)>eps())continue;
  const angle=(((f.rot||0)-c.aluminum.direction)%180+180)%180;if(Math.min(angle,180-angle)>eps())continue;
  const local=grid.toLocal([f.cx,f.cy]),col=Math.floor((local[0]-grid.start[0])/grid.pitch[0]),row=Math.floor((local[1]-grid.start[1])/grid.pitch[1]),slot=panelSlot(c,row,col,grid);
  if(!slot?.full||Math.hypot(slot.cx-f.cx,slot.cy-f.cy)>spec.alignment||lamps.some(h=>circleInSlot(h,slot.cell)))continue;
  out.push({...slot,fid:f.id});
 }
 return out.filter(a=>!out.some(b=>b.fid!==a.fid&&b.id===a.id));
}
function fitCeilingPanel(plan,f,furniture=[]){
 const P=root.FurnishProducts||require('./product-rules.js'),spec=!f.obj&&P.definition(f)?.ceilingPanel;if(!spec)fail('当前设备不支持整板替换');
 if(Math.abs(f.w-spec.width)>eps()||Math.abs(f.d-spec.length)>eps()||P.height(f)<=spec.rim)fail('请恢复300×600 mm标准面板尺寸和有效机身高度后安装');
 const ceilings=(plan.ceilings?.items||[]).filter(c=>c.kind==='flat'&&c.aluminum&&inside([f.cx,f.cy],c.polygon));if(ceilings.length!==1)fail(ceilings.length?'当前位置有多个铝扣板区域，请先调整区域或设备位置':'请先将设备放到铝扣板区域内');
 const c=ceilings[0],grid=aluminumGrid(c),slots=[];for(let row=0;row<grid.count[1];row++)for(let col=0;col<grid.count[0];col++){const x=grid.start[0]+(col+.5)*grid.pitch[0],y=grid.start[1]+(row+.5)*grid.pitch[1];slots.push({row,col,distance:Math.hypot(grid.toWorld([x,y])[0]-f.cx,grid.toWorld([x,y])[1]-f.cy)});}slots.sort((a,b)=>a.distance-b.distance||a.row-b.row||a.col-b.col);
 const others=installationBodies(plan,furniture.filter(v=>v.id!==f.id)),occupied=panelReplacements(c,others);
 for(const {row,col}of slots){const slot=panelSlot(c,row,col,grid);if(!slot.full||occupied.some(s=>s.id===slot.id))continue;const candidate={...clone(f),cx:slot.cx,cy:slot.cy,rot:((c.aluminum.direction+Math.round(((f.rot||0)-c.aluminum.direction)/180)*180)%360+360)%360},base=P.floorBase(plan,candidate,furniture);if(!base.known)fail('家具基准地面标高未知，请先核对');candidate.mountHeight=c.height-spec.rim-base.z;if(candidate.mountHeight<0||candidate.mountHeight>rules().max)continue;
  if(panelReplacements(c,[...others,{f:candidate,vertical:{bottom:c.height-spec.rim,top:c.height-spec.rim+P.height(f)}}]).some(s=>s.fid===f.id))return candidate;
 }
 fail('区域内没有可替换的完整空闲300×600铝扣板；裁切板、收边或已安装筒灯／整板设备的格子不能替换');
}
function checks(plan,bodies){
 const out=(plan.ceilings?.pending||[]).map(p=>({kind:'ceiling',id:p.id,ceilingId:p.id,name:'吊顶',pending:true,message:p.message}));
 const apertures=new Map((plan.ceilings?.items||[]).map(c=>[c.id,downlightHoles(c,bodies)])),replacements=new Map((plan.ceilings?.items||[]).map(c=>[c.id,panelReplacements(c,bodies)]));
 const P=root.FurnishProducts||require('./product-rules.js'),seenDevices=new Set();for(const {f}of bodies)if(!f.obj&&P.definition(f)?.ceilingPanel&&!seenDevices.has(f.id)){seenDevices.add(f.id);if(![...replacements.values()].some(slots=>slots.some(s=>s.fid===f.id)))out.push({kind:'ceiling',id:f.id,ceilingId:'panel-installation',name:f.name,pending:true,at:[f.cx,f.cy],message:f.name+'未替换完整铝扣板：请使用整板安装，核对300×600尺寸、方向、标高及格内筒灯／整板设备占用'});}
 // Prepare invariant section sweeps once per ceiling, not once per furniture
 // board. Bounds only reject disjoint candidates; the original exact section
 // intersection still decides every possible hit, including unknown heights.
 const bounds=poly=>[Math.min(...poly.map(p=>p[0])),Math.min(...poly.map(p=>p[1])),Math.max(...poly.map(p=>p[0])),Math.max(...poly.map(p=>p[1]))];
 const disjoint=(a,b)=>a[2]<b[0]-eps()||b[2]<a[0]-eps()||a[3]<b[1]-eps()||b[3]<a[1]-eps();
 for(const c of plan.ceilings?.items||[]){
 const sections=c.kind==='flat'?[]:sectionContours(c.section).map(vertices=>{
  const outline=vertices.map(v=>[v.u,v.d]),bottom=c.height-Math.max(...vertices.map(v=>v.d)),top=c.height-Math.min(...vertices.map(v=>v.d));
  return {outline,bottom,top,legs:route(c).map((leg,i)=>{const poly=legFootprint(c,i,outline.map(v=>v[0]));return {leg,poly,box:bounds(poly)};})};
 });
 const caps=c.kind==='flat'?[]:endCaps(c).plates.map(plate=>({...plate,box:bounds(plate.footprint),bottom:c.height-Math.max(...plate.section.map(p=>p[1])),top:c.height-Math.min(...plate.section.map(p=>p[1]))}));
 const flatBox=c.kind==='flat'?bounds(c.polygon):null,flatConvex=c.kind==='flat'&&convex(c.polygon);
 for(const {f,p,vertical} of bodies){
  const box=bounds(p),separated=(bottom,top,tolerance=eps())=>vertical&&Math.min(vertical.top,top)-Math.max(vertical.bottom,bottom)<=tolerance;
  let hit=false;
  if(c.kind==='flat'){
   if(separated(c.height,c.height+c.thickness)||disjoint(box,flatBox))continue;
   if(apertures.get(c.id).some(h=>h.id===f.id))continue;
   const slots=replacements.get(c.id);if(slots.some(s=>s.fid===f.id))continue;
   if(slots.length){const Z=zones(),cuts=slots.map(s=>s.cell),remaining=Z.decompose([c.polygon,p,...cuts],q=>Z.inside(q,c.polygon)&&Z.inside(q,p)&&!cuts.some(cut=>Z.inside(q,cut)));if(Z.area(remaining)<=eps()**2)continue;}
   if(flatConvex){const overlap=intersection(p,c.polygon);if(overlap.length<3||Math.abs(area(overlap))<=eps()**2)continue;}else if(overlapArea(c.polygon,p)<=eps()**2)continue;
   hit=!vertical||Math.min(vertical.top,c.height+c.thickness)-Math.max(vertical.bottom,c.height)>eps();
  }else{
   // Section contact is decided by clipped area, so retain even sub-epsilon
   // height overlap and the clipper's numerical boundary allowance.
   for(const {outline,bottom,top,legs} of sections){if(separated(bottom,top,-eps()))continue;for(const {leg,poly:footprint,box:legBox} of legs){
    if(disjoint(box,legBox))continue;
    const poly=intersection(p,footprint);if(poly.length<3||Math.abs(area(poly))<=eps()**2)continue;
    const us=poly.map(v=>(v[0]-leg.a[0])*leg.normal[0]+(v[1]-leg.a[1])*leg.normal[1]),u0=Math.min(...us),u1=Math.max(...us),d0=vertical?c.height-vertical.top:-rules().max,d1=vertical?c.height-vertical.bottom:rules().max;
    const overlap=intersection(outline,[[u0,d0],[u1,d0],[u1,d1],[u0,d1]]);if(overlap.length>=3&&Math.abs(area(overlap))>eps()**2){hit=true;break;}
   }
   if(hit)break;}
   if(!hit)for(const plate of caps){if(separated(plate.bottom,plate.top)||disjoint(box,plate.box))continue;const poly=intersection(p,plate.footprint);if(poly.length<3||Math.abs(area(poly))<=eps()**2)continue;hit=true;break;}
  }
  if(hit)out.push({kind:'ceiling',id:f.id,ceilingId:c.id,name:f.name,pending:!vertical,at:[f.cx,f.cy],message:`${f.name}与${c.name}${vertical?'实体相交':'投影重叠，家具高度未知，待核对'}`});
 }
 }
 return out;
}
// Gaps and edge trim are visual details, never collision exemptions.
function aluminumDefaults(){const {direction,gap,trim}=rules().aluminum;return {direction,gap,trim};}
function validateAluminum(a){if(!a||Object.keys(a).some(k=>!['direction','gap','trim','origin'].includes(k))||!finite(a.direction)||Math.abs(a.direction)>rules().aluminum.maxAngle||!finite(a.gap)||a.gap<.2||a.gap>5||!finite(a.trim)||a.trim<0||a.trim>100||a.origin!==undefined&&!point(a.origin))fail('铝扣板角度须为−360～360°，拼缝0.2～5 mm，收边0～100 mm，起铺点须为有效毫米坐标');}
function aluminumGrid(c){
 const a=c.aluminum,poly=c.polygon,paths=boundaryPaths({poly}),inner=a.trim?closedOffset({path:{closed:true,segments:paths}},a.trim):clone(poly),turn=((a.direction%180)+180)%180,swapped=turn>=90,angle=(swapped?turn-90:turn)*Math.PI/180,cos=Math.cos(angle),sin=Math.sin(angle),toLocal=p=>[p[0]*cos+p[1]*sin,-p[0]*sin+p[1]*cos],toWorld=p=>[p[0]*cos-p[1]*sin,p[0]*sin+p[1]*cos],local=inner.map(toLocal),min=[0,1].map(i=>Math.min(...local.map(p=>p[i]))),max=[0,1].map(i=>Math.max(...local.map(p=>p[i]))),r=rules().aluminum,pitch=swapped?[r.length,r.width]:[r.width,r.length];
 let count,start,index=[0,0];
 if(a.origin){const origin=toLocal(a.origin);index=min.map((v,i)=>Math.floor((v-origin[i]+eps())/pitch[i]));const end=max.map((v,i)=>Math.ceil((v-origin[i]-eps())/pitch[i]));count=end.map((v,i)=>v-index[i]);start=origin.map((v,i)=>v+index[i]*pitch[i]);}
 else{count=min.map((v,i)=>Math.ceil((max[i]-v)/pitch[i]));start=min.map((v,i)=>(v+max[i]-count[i]*pitch[i])/2);}
 if(count.some(n=>n<1)||count[0]*count[1]>r.maxPanels)fail('铝扣板区域过大，请拆分为较小区域');
 return {inner,pitch,count,start,index,toLocal,toWorld,origin:a.origin?clone(a.origin):toWorld(start)};
}
function aluminumBasis(c){const {origin,inner,pitch}=aluminumGrid(c);return {origin,inner,pitch};}
function aluminumLayout(c){
 validateAluminum(c.aluminum);const grid=aluminumGrid(c),Z=zones(),{inner,pitch,count,start}=grid,panels=[];
 for(let row=0;row<count[1];row++)for(let col=0;col<count[0];col++){
  const x=start[0]+col*pitch[0],y=start[1]+row*pitch[1],g=c.aluminum.gap/2,rect=[[x+g,y+g],[x+pitch[0]-g,y+g],[x+pitch[0]-g,y+pitch[1]-g],[x+g,y+pitch[1]-g]].map(grid.toWorld),polygons=Z.decompose([inner,rect],p=>Z.inside(p,inner)&&Z.inside(p,rect));
  if(polygons.length){const slot=panelSlot(c,row,col,grid);panels.push({id:slot.id,row,col,full:slot.full,cell:slot.cell,polygons:Z.outline(polygons).rings});}
 }
 const trim=c.aluminum.trim?Z.decompose([c.polygon,inner],p=>Z.inside(p,c.polygon)&&!Z.inside(p,inner)):[];return {...grid,panels,trim,stats:{whole:panels.filter(p=>p.full).length,cut:panels.filter(p=>!p.full).length}};
}
function signature(data,furniture=[]){const P=root.FurnishProducts||require('./product-rules.js'),panelDevices=furniture.some(f=>!f.obj&&P.definition(f)?.ceilingPanel);return data?data.items.map(({name,...geometry})=>{const g=clone(geometry);if(!panelDevices)delete g.aluminum;else if(g.aluminum)g.aluminum={direction:g.aluminum.direction,trim:g.aluminum.trim,...(g.aluminum.origin?{origin:clone(g.aluminum.origin)}:{})};if(g.section){delete g.section.template;delete g.section.material;}return g;}):null;}
function shift(work,offset){if(!work.ceilings)return;for(const r of work.ceilings.regions||[]){r.polygon=r.polygon.map(p=>p.map(v=>v+offset));if(r.aluminum?.origin)r.aluminum.origin=r.aluminum.origin.map(v=>v+offset);}for(const c of work.ceilings.items){if(c.aluminum?.origin)c.aluminum.origin=c.aluminum.origin.map(v=>v+offset);if(c.kind==='profile'){for(const p of route(c))for(const k of ['a','b'])p[k]=p[k].map(v=>v+offset);if(!c.path.segments){c.path.a=c.path.a.map(v=>v+offset);c.path.b=c.path.b.map(v=>v+offset);}}else c.polygon=c.polygon.map(p=>p.map(v=>v+offset));}}
function requiresV6(work){return !!work?.ceilings?.items.some(c=>c.kind==='profile'&&(c.path?.segments||c.section?.light?.cornerSetback!==undefined));}
function requiresV7(work){return !!work?.ceilings?.items.some(c=>c.section?.light?.corner!==undefined);}
function requiresV8(work){return !!work?.ceilings?.items.some(c=>c.ends!==undefined);}
function requiresV17(work){return work?.ceilings?.regions!==undefined||work?.ceilings?.items?.some(c=>c.regionId!==undefined||c.path?.closed===true)===true;}
function requiresV20(work){return (work?.ceilings?.regions||[]).some(r=>r.center===false&&r.centerConnection?.mode==='flange'&&!channelValues(r.sections[r.centerConnection.sectionIndex]?.section))||[...(work?.ceilings?.items||[]).filter(c=>c.kind==='profile').map(c=>c.section),...(work?.ceilings?.regions||[]).flatMap(r=>r.sections.map(s=>s.section))].some(s=>s?.template?.kind==='upChannel'&&(s.template.values.mirrorU!==undefined||s.template.values.mirrorD!==undefined));}
function requiresV19(work){return [...(work?.ceilings?.items||[]).filter(c=>c.kind==='profile').map(c=>c.section),...(work?.ceilings?.regions||[]).flatMap(r=>r.sections.map(s=>s.section))].some(s=>s?.template?.kind==='upChannel'&&s.template.values.rotation!==undefined);}
function requiresV18(work){const sections=[...(work?.ceilings?.items||[]).filter(c=>c.kind==='profile').map(c=>c.section),...(work?.ceilings?.regions||[]).flatMap(r=>r.sections.map(s=>s.section))];return !!work?.ceilings?.regions?.some(r=>r.centerConnection!==undefined)||sections.some(s=>s?.template?.kind==='upChannel'||s?.diffuser!==undefined||s?.material!==undefined);}
function requiresV21(work){return !!work?.ceilings?.regions?.some(r=>r.style==='aluminum'||r.aluminum!==undefined)||!!work?.ceilings?.items?.some(c=>c.aluminum!==undefined);}
function requiresV23(work){return [...(work?.ceilings?.items||[]).filter(c=>c.kind==='profile').map(c=>c.section),...(work?.ceilings?.regions||[]).flatMap(r=>r.sections.map(s=>s.section))].some(s=>s?.template?.kind==='upChannel'&&Object.keys(s.template.values).some(k=>k.startsWith('mount')));}
function requiresV22(work){return [...(work?.ceilings?.regions||[]),...(work?.ceilings?.items||[])].some(c=>c.aluminum&&(c.aluminum.origin!==undefined||![0,90].includes(c.aluminum.direction)));}
const api={heightMeasurements,sectionActive,setChannelEnabled,requiresV25,duplicateRegion,stableRegionParts,sectionRole,componentPresets,componentPreset,replaceAssemblyPart,removeAssemblyPart,setPresetExcluded,requiresV24,plainSoffit,plainSoffitValues,reuseAssembly,requiresV23,requiresV22,aluminumBasis,panelReplacements,fitCeilingPanel,requiresV21,aluminumDefaults,aluminumLayout,requiresV20,mirrorSection,sectionMeasurements,requiresV19,transformSection,snapSectionMove,snapSectionAngle,rotateUD,roomInsetBoundary,assemblyIssues,assemblySample,upChannel,sectionContours,sectionPoints,channelValues,centerLayout,assemblyInfo,editAssembly,requiresV18,sameValue,requiresV17,validateRegion,regionItems,setRegion,removeRegion,closedOffset,regionContext,sectionPreset,designRegion,fitDownlight,downlightHoles,rules,lowCove,section,validate,polygon,area,inside,lightPolygon,lightIssues,route,tangent,samePath,joinedPath,offsetStations,legFootprint,compactLightRadius,endOpening,endCaps,lightLayout,sample,regionBoundary,boundaryPaths,pointAt,footprint,resolve,edit,derive,onlyChange,checks,signature,shift,requiresV6,requiresV7,requiresV8};
api.mergeFlatRegions=mergeFlatRegions;
if(typeof module==='object'&&module.exports)module.exports=api;else root.FurnishCeiling=api;
})(typeof globalThis!=='undefined'?globalThis:this);
