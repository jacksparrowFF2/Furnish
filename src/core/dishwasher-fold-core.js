/* Mijia folding-door layout rig. mm / +Z front; linkage dimensions are assumptions. */
(function(root){'use strict';
const products=()=>root.FurnishProducts||require('./product-rules.js');
function reference(){
 const parts=[],add=(name,size,center,material='white',role=null,label=name,shape='box')=>parts.push({name,size,center,material,role,label,shape});
 add('shell-back',[550,598,10],[0,299,-170]);
 for(const s of [-1,1])add('shell-side-'+s,[12,598,350],[s*269,299,0]);
 add('shell-bottom',[526,52,350],[0,26,0]);add('shell-top',[526,14,350],[0,591,0]);
 add('inner-back',[504,518,6],[0,314,-161],'inner');
 for(const s of [-1,1])add('inner-side-'+s,[5,504,306],[s*249,314,-5],'inner');
 add('sump',[492,5,306],[0,63.5,-5],'inner');add('inner-ceiling',[492,5,306],[0,568.5,-5],'inner');
 add('plinth',[538,27,7],[0,19.5,171.5]);add('foot-recess',[115,6,1],[0,3,174.4],'dark');
 for(const s of [-1,1])for(const z of [-150,150])add('foot-'+s+'-'+z,[22,3,22],[s*257,1.5,z],'base');
 for(let i=0;i<5;i++)add('steam-outlet-'+i,[.5,2,33],[-274.7,495+i*5,-86],'base',null,'steam-outlet');
 for(const s of [-1,1])add('seal-'+s,[1.5,470,3],[s*254,311,151],'seal');
 add('lower-front',[523,250,16],[0,195,165],'white','lower','lower-front');
 add('upper-front',[523,263.5,16],[0,452.25,165],'white','upper','upper-front');
 add('door-inner',[483,230,2],[0,195,156],'inner','lower');
 add('display',[46,46,1],[0,235,174],'dark','lower','display','disc');
 for(let i=0;i<2;i++)for(let j=0;j<3;j++)add('display-mark-'+i+'-'+j,[7,1,.2],[-7+i*14,223+j*12,174.7],'ink','lower','display-segment');
 for(const x of [-154,-119,-84,84,119,154]){add('control-mark-'+x,[4.6,4.6,.4],[x,235,174.2],'base','lower','control-mark','disc');add('control-label-'+x,[9,.6,.2],[x,227,174.6],'base','lower','control-label');}
 add('release-button',[29,.5,10],[0,597.55,153],'base');
 add('lower-basket',[461,108,304],[0,167,-2],'steel','basket','lower-basket','basket');
 add('upper-basket',[451,67,280],[0,465.5,-3],'steel',null,'upper-basket','basket');
 for(const x of [-199,199])add('upper-runner-'+x,[8,8,291],[x,427,-3],'base',null,'upper-runner');
 for(let i=0;i<6;i++)add('plate-'+i,[5,224,224],[-174+i*28,229,7],'ceramic','basket','plate','plate');
 for(const [i,x]of [-100,-20,60].entries())add('bowl-'+i,[90,48,90],[x,462,-20],'ceramic',null,'bowl','bowl');
 add('spray-arm',[365,9,17],[0,531.5,-10],'base');
 return parts;
}
function spec(){return {size:[550,598,350],parts:reference(),motions:[{role:'lower',axis:'x',pivot:[0,70,175],parent:null},{role:'upper',axis:'x',pivot:[0,320,175],parent:'lower'},{role:'basket',axis:'z',pivot:[0,0,0],parent:null}]};}
function frames(f,phase=products().value(f,'dishwasherDoorOpen')?1:0){
 if(phase!==0&&phase!==1)throw Error('仅支持闭合与折叠展开端态；真实连杆中间轨迹未确认');
 const s=[f.w/550,products().height(f)/598,f.d/350],a=phase*Math.PI/2;
 // Fit each rigid leaf before rotation. Keep the upper hinge at the lower leaf tip.
 return [{role:'lower',parent:null,position:[0,70*s[1],175*s[2]],angle:a},{role:'upper',parent:'lower',position:[0,250*s[1],0],angle:-2*a},{role:'basket',parent:null,position:[0,0,110*s[2]*phase],angle:0}];
}
function partScale(f,part){const s=[f.w/550,products().height(f)/598,f.d/350];if(['lower','upper'].includes(part.role))s[2]=Math.min(s[1],s[2]);return s;}
function vertices(f,part,phase){const s=partScale(f,part),rig=frames(f,phase),origin=spec().motions.find(m=>m.role===part.role)?.pivot||[0,0,0];return [-1,1].flatMap(x=>[-1,1].flatMap(y=>[-1,1].map(z=>{let v=part.center.map((n,k)=>(n+[x,y,z][k]*part.size[k]/2-origin[k])*s[k]),frame=rig.find(m=>m.role===part.role);while(frame){const c=Math.cos(frame.angle),t=Math.sin(frame.angle),[a,b,d]=v;v=[a,b*c-d*t,b*t+d*c].map((n,k)=>n+frame.position[k]);frame=rig.find(m=>m.role===frame.parent);}return v;})));}
function outline(f){const points=reference().flatMap(p=>vertices(f,p).map(v=>[v[0],v[2]])),ps=points.sort((a,b)=>a[0]-b[0]||a[1]-b[1]),cross=(a,b,c)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]),half=arr=>{const out=[];for(const p of arr){while(out.length>1&&cross(out.at(-2),out.at(-1),p)<=1e-8)out.pop();out.push(p);}return out;};return half(ps).slice(0,-1).concat(half(ps.reverse()).slice(0,-1));}
function bounds(f){const ys=reference().flatMap(p=>vertices(f,p).map(v=>v[1]));return {bottom:Math.min(...ys),top:Math.max(...ys)};}
const api={reference,spec,frames,partScale,vertices,outline,bounds};if(typeof module==='object'&&module.exports)module.exports=api;else root.FurnishDishwasherFold=api;
})(typeof globalThis!=='undefined'?globalThis:this);
