/* Y107H03 endpoint rig. mm, +Z front; unlabelled lengths are photo-derived. */
(function(root){
'use strict';
const products=()=>root.FurnishProducts||require('./product-rules.js');
function role(name){
 if(name==='seat-upper'||name==='seat-piping-upper')return 'front-pad';
 if(name==='seat-middle'||name==='seat-piping-middle')return 'middle-pad';
 if(name.startsWith('lumbar'))return name.endsWith('left')?'left-lumbar':'right-lumbar';
 if(name.startsWith('middle-')||name.startsWith('wheel-back-')||name.startsWith('wheel-fork-back-'))return 'middle-frame';
 if(name==='front-rail'||name.startsWith('front-post-')||name.startsWith('metal-runner-')||name.startsWith('front-steel-')||name.startsWith('front-guide-')||name==='front-crossbar'||name.startsWith('wheel-front-')||name.startsWith('wheel-fork-front-'))return 'front-frame';
 return null;
}
function spec(){
 const names=['front-rail','back-rail','back-top-rail','seat-lower','seat-middle','seat-upper','back-cushion','seat-piping-lower','seat-piping-middle','seat-piping-upper','middle-crossbar','front-crossbar'];
 for(const side of ['left','right'])names.push(...['front-post','back-post','side-panel','side-inset','metal-runner','middle-runner','wheel-front','wheel-back','wheel-fork-front','wheel-fork-back','lumbar','lumbar-piping'].map(n=>n+'-'+side));
 for(const stage of ['fixed','middle','front'])for(const side of ['left','right'])for(const face of ['top','bottom','inner','outer'])names.push(stage+'-guide-'+side+'-'+face);
 for(let i=0;i<7;i++)names.push('back-slat-'+i);
 for(let i=0;i<12;i++)for(const prefix of ['steel-slat-','middle-steel-','front-steel-'])names.push(prefix+i);
 return {assetId:'sofa-bed-yeswood-y107h03',prefix:'sofa-bed-v1:',size:[1250,770,838],parts:names.map(name=>({name,identity:'sofa-bed-v1:'+name,role:role(name)})),motions:[
 {role:'middle-frame',axis:'z',pivot:[0,0,0]}, {role:'front-frame',axis:'z',pivot:[0,0,0]},
 {role:'middle-pad',axis:'x',pivot:[0,300,410]}, {role:'front-pad',axis:'x',pivot:[0,350,-180],parent:'middle-pad'},
 {role:'left-lumbar',axis:'x',pivot:[-294,530,-190]}, {role:'right-lumbar',axis:'x',pivot:[294,530,-190]}]};
}
function layout(f){const P=products(),r=P.definition(f).sofaBedMotion,s=[f.w/r.size[0],P.height(f)/r.size[1],f.d/r.size[2]],open=P.value(f,'sofaBedOpen'),travel=2*r.foldLength*s[2];return {s,open,travel,depth:f.d+(open?travel:0),front:f.d/2+(open?travel:0),bedTop:(r.bedBase+r.padThickness)*s[1]};}
function frames(f,phase){const l=layout(f),open=phase??(l.open?1:0);if(open!==0&&open!==1)throw Error('仅支持沙发床收起／展开端态，连续机构轨迹未验证');const s=l.s;
 return spec().motions.map(m=>{let position=m.pivot.map((v,k)=>(v-(m.parent?spec().motions.find(p=>p.role===m.parent).pivot[k]:0))*s[k]),angle=0;
 if(open){if(m.role==='middle-frame')position[2]=l.travel/2;else if(m.role==='front-frame')position[2]=l.travel;else if(m.role.endsWith('-pad'))angle=Math.PI;else {position=[m.pivot[0]*s[0],m.pivot[1]*s[1]-100*s[1],-170*s[2]];}}
 return {role:m.role,parent:m.parent||null,position,angle,axis:m.axis};});
}
function outline(f){const l=layout(f);return [[-f.w/2,-f.d/2],[f.w/2,-f.d/2],[f.w/2,l.front],[-f.w/2,l.front]];}
function openingZones(f){const l=layout(f),a=(f.rot||0)*Math.PI/180,c=Math.cos(a),s=Math.sin(a),world=([x,z])=>{x*=f.flip?-1:1;return [(f.cx||0)+x*c-z*s,(f.cy||0)+x*s+z*c];};return [{kind:'cabinetdrawer',column:0,section:'sofa-bed:operation',poly:[[-f.w/2,f.d/2],[f.w/2,f.d/2],[f.w/2,f.d/2+l.travel],[-f.w/2,f.d/2+l.travel]].map(world),ranges:[[0,Math.max(products().height(f),350*l.s[1]+l.travel)]]}];}
const api={spec,role,layout,frames,outline,openingZones};if(typeof module==='object'&&module.exports)module.exports=api;else root.FurnishSofaBed=api;
})(typeof globalThis!=='undefined'?globalThis:this);
