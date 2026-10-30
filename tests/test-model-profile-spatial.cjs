/* Exercise production spatial entry points for each declared model, without DOM fixtures. */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),profiles=require('../scripts/lib/model-profiles.cjs').profiles(),G=require('../src/core/layout-geometry.js'),S=require('../src/core/snapping.js'),J=require('../src/core/project-core.js');
const selected=process.argv[2]?profiles.filter(p=>p.id===process.argv[2]):profiles;assert(selected.length,'Unknown verification model');
const results=[];
for(const profile of selected){
 const cases=[];
 for(const [state,source]of [['nominal',profile.fixture],['alternate',profile.alternate]])for(const [rot,flip]of [[0,false],[37,true]]){
  const f={...source,rot,flip},text=JSON.stringify(f);J.validateWork({furniture:[f]});
  const parts=G.bodyParts(f,undefined,[f]);assert(parts.length,profile.id+' has no spatial body');
  assert(parts.every(p=>p.p.length>=3&&p.p.flat().every(Number.isFinite)),profile.id+' invalid spatial contour');
  const points=parts.flatMap(p=>p.p),[x0,y0,x1,y1]=G.bbox(points),known=parts.filter(p=>p.vertical&&Number.isFinite(p.vertical.bottom)&&Number.isFinite(p.vertical.top));assert(known.length,profile.id+' has no known production height');
  const bottom=Math.min(...known.map(p=>p.vertical.bottom)),top=Math.max(...known.map(p=>p.vertical.top));
  const barrier={id:'barrier',type:'block',cx:x1+150,cy:(y0+y1)/2,w:100,d:y1-y0+2000,h:Math.max(20000,top+1000),mountHeight:0,rot:0};
  const right=S.directional(f,{furniture:[f,barrier]}).r;assert(right&&Number.isFinite(right.distance),profile.id+' lost directional distance');assert(right.distance>=0,profile.id+' invalid gap');
  assert(!G.volumeOverlap(f,barrier,undefined,[f,barrier]),profile.id+' false external collision');
  const enclosing={...barrier,id:'enclosing',cx:(x0+x1)/2,cy:(y0+y1)/2,w:x1-x0+1000,d:y1-y0+1000};
  const contained=S.directional(f,{furniture:[f,enclosing]});assert(Object.values(contained).some(v=>v?.containedBoundary),profile.id+' lost containment measurement');
  assert(G.volumeOverlap(f,enclosing,undefined,[f,enclosing]),profile.id+' containment incorrectly exempted from collision');
  const above={...enclosing,id:'above',mountHeight:top+100,h:100};assert(!G.volumeOverlap(f,above,undefined,[f,above]),profile.id+' separated heights collide');
  // Place a tiny obstacle within an actual recorded polygon at its own height.
  let penetrating=false;
  for(const part of known){if(part.vertical.top-part.vertical.bottom<.01)continue;const [a,b,c,d]=G.bbox(part.p);for(const [u,v]of [[.5,.5],[.2,.2],[.8,.2],[.2,.8],[.8,.8]]){const probe={id:'probe',type:'block',cx:a+(c-a)*u,cy:b+(d-b)*v,w:1,d:1,h:.01,mountHeight:(part.vertical.bottom+part.vertical.top)/2,rot:0};if(G.volumeOverlap(f,probe,undefined,[f,probe])){penetrating=true;break;}}if(penetrating)break;}
  assert(penetrating,profile.id+' failed actual solid penetration test');
  const restored=J.unpack(J.pack({planId:'model-verification',current:{furniture:[f]},designs:[{name:'roundtrip',work:{furniture:[f]}}],catalog:[]})).current.furniture[0];
  assert.deepEqual(restored,f,profile.id+' project drift');assert.equal(JSON.stringify(f),text,'Spatial checks changed input');
  cases.push({state,rot,flip,parts:parts.length,bottom,top,externalDistance:right.distance,penetration:true,heightSeparation:true,projectRoundtrip:true});
 }
 results.push({id:profile.id,passed:true,cases});console.log('PASS spatial '+profile.id);
}
if(process.env.FURNISH_MODEL_SPATIAL_REPORT)fs.writeFileSync(process.env.FURNISH_MODEL_SPATIAL_REPORT,JSON.stringify({passed:true,results},null,2));
