/* Tmall 635382906309: photographed side table. All dimensions in mm.
 * Unlabelled construction and 220 mm travel are layout assumptions. */
(function(root){'use strict';
const P=()=>root.FurnishProducts||require('./product-rules.js');
function reference(f={w:680,d:300,h:612}){
 const w=f.w,d=f.d,h=P().height(f)||612,parts=[],post=42.5,edge=28,base=85,shelf=h-237,apron=h-52,left=-w/2+post,right=w/2-post,split=left+(w-85)*270/595;
 const add=(name,size,center,material='wood',role=null,radius=2)=>parts.push({name,size,center,material,role,radius});
 for(const x of [-1,1])for(const z of [-1,1])add('post-'+x+'-'+z,[post,h-20,edge],[x*(w/2-post/2),(h+20)/2,z*(d/2-edge/2)],'wood',null,10);
 add('bottom',[w-85,20,d],[0,75,0]);add('shelf',[w-85,20,d],[0,shelf-10,0]);
 for(const z of [-1,1]){add('base-rail-'+z,[w-85,55,18],[0,47.5,z*(d/2-9)]);add('top-apron-'+z,[w-85,41,18],[0,apron+20.5,z*(d/2-9)]);add('drawer-enclosure-'+z,[split-left,shelf-20-base,18],[(split+left)/2,(base+shelf-20)/2,z*(d/2-9)]);}
 add('stone',[w-42,11,d-24],[0,h-16.5,0],'stone',null,2);
 add('back-lip',[w-85,11,10],[0,h-5.5,-d/2+5]);
 for(const x of [-1,1])add('end-rail-'+x,[21,20,d-56],[x*(w/2-31.5),h-10,0],'wood',null,7);
 add('drawer-divider',[18,shelf-20-base,d-36],[split-9,(base+shelf-20)/2,0]);
 // Drawers pull out of the left short end. Inner box: 240 x 220 x 80 at reference size.
 const depth=(w-85)*240/595,boxStart=-w/2+21,boxEnd=boxStart+depth,insideD=d-80,frontD=insideD+24;
 for(const [i,role]of ['lower','upper'].entries()){
  const lo=base+3+i*(shelf-20-base)/2,hi=base+(i+1)*(shelf-20-base)/2-3,bottom=lo+12;
  add(role+'-front',[18,hi-lo,frontD],[boxStart-9,(lo+hi)/2,0],'wood',role,2);
  add(role+'-bottom',[depth+12,8,insideD+24],[(boxStart+boxEnd+12)/2,bottom-4,0],'wood',role,1);
  for(const z of [-1,1])add(role+'-side-'+z,[depth,80,12],[(boxStart+boxEnd)/2,bottom+40,z*(insideD/2+6)],'wood',role,1);
  add(role+'-back',[12,80,insideD+24],[boxEnd+6,bottom+40,0],'wood',role,1);
 }
 for(const x of [-1,1])for(const z of [-1,1]){add('castor-'+x+'-'+z,[20,20,20],[x*(w/2-48),10,z*(d/2-42)],'dark',null,2);add('castor-stem-'+x+'-'+z,[12,45,12],[x*(w/2-48),42.5,z*(d/2-42)],'dark',null,2);}
 return parts;
}
function travel(f){return Math.max(0,(f.w-85)*270/595-50);}
function phase(f,role){return P().value(f,role==='upper'?'sideTableUpperOpen':'sideTableLowerOpen')?1:0;}
function outline(f){const out=[[-f.w/2,-f.d/2],[f.w/2,-f.d/2],[f.w/2,f.d/2],[-f.w/2,f.d/2]];if(phase(f,'upper')||phase(f,'lower')){out.unshift([-f.w/2-travel(f)+3,-(f.d-56)/2]);out.push([-f.w/2-travel(f)+3,(f.d-56)/2]);}return out;}
function openingZones(f){const a=(f.rot||0)*Math.PI/180,c=Math.cos(a),s=Math.sin(a),world=([x,z])=>{x*=f.flip?-1:1;return [(f.cx||0)+x*c-z*s,(f.cy||0)+x*s+z*c];};return ['lower','upper'].map((role,i)=>{const ps=reference(f).filter(p=>p.role===role),lo=Math.min(...ps.map(p=>p.center[1]-p.size[1]/2)),hi=Math.max(...ps.map(p=>p.center[1]+p.size[1]/2)),back=Math.max(...ps.map(p=>p.center[0]+p.size[0]/2));return {kind:'cabinetdrawer',column:i,section:'side-table:'+role,poly:[[-f.w/2-travel(f)+3,-(f.d-56)/2],[back,-(f.d-56)/2],[back,(f.d-56)/2],[-f.w/2-travel(f)+3,(f.d-56)/2]].map(world),ranges:[[lo,hi]]};});}
function spec(){return {size:[680,612,300],parts:reference(),motions:['lower','upper'].map(role=>({role,axis:'x',pivot:[0,0,0],parent:null}))};}
const api={reference,travel,phase,outline,openingZones,spec};if(typeof module==='object'&&module.exports)module.exports=api;else root.FurnishSideTable=api;
})(typeof globalThis!=='undefined'?globalThis:this);
