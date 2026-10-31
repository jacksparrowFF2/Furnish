/* Fixed five-bay corner bookcase. Inputs mm; unlabelled details are estimates. */
(function(root){'use strict';
const P=()=>root.FurnishProducts||require('./product-rules.js');
const rules=f=>P().definition(f?.type?f:{type:'bookshelf_yeswood_y00y06'}).cornerBookcase;
function nominal(f){const r=rules(f);return {type:f?.type||'bookshelf_yeswood_y00y06',w:r.width||450,d:r.depth||450,h:1900};}
function outline(f){const x=f.w/2,z=f.d/2,r=rules(f).armRatio,k=2*r-1;return [[-x,-z],[x,-z],[x,z*k],[x*k,z*k],[x*k,z],[-x,z]];}
function reference(f={w:450,d:450,h:1900}){const r=rules(f),t=r.thickness,b=r.base,w=f.w,d=f.d,h=f.h||1900,step=(h-b-t)/5,ax=w*r.armRatio,az=d*r.armRatio,parts=[];
 const add=(name,size,center,shape)=>parts.push({name,size,center,role:null,...(shape?{shape}:{} )});
 for(let i=0;i<6;i++)add('shelf-'+i,[w,t,d],[0,b+t/2+i*step,0],'L');
 add('back-x',[t,h-b-2*t,d],[-w/2+t/2,(h+b)/2,0]);
 add('back-z',[w-t,h-b-2*t,t],[t/2,(h+b)/2,-d/2+t/2]);
 for(let i=0;i<5;i++){const y=b+t+i*step+(step-t)/2;if(i%2===0)add('end-'+i,[ax-t,step-t,t],[-w/2+t+(ax-t)/2,y,d/2-t/2]);else add('end-'+i,[t,step-t,az-t],[w/2-t/2,y,-d/2+t+(az-t)/2]);}
 add('base',[w,b,d],[0,b/2,0],'L');return parts;}
function spec(profile){const f=nominal({type:profile==='580'?'bookshelf_yeswood_y00y06058':'bookshelf_yeswood_y00y06'}),id=profile==='580'?'corner-bookcase-580':'corner-bookcase';return {size:[f.w,f.h,f.d],prefix:id+'-v1:',assetId:profile==='580'?'corner-bookcase-y00y06058':'corner-bookcase-y00y06',outline:outline(f),parts:reference(f),motions:[]};}
const api={outline,reference,nominal,rules,spec};if(typeof module==='object'&&module.exports)module.exports=api;else root.FurnishCornerBookcase=api;
})(typeof globalThis!=='undefined'?globalThis:this);
