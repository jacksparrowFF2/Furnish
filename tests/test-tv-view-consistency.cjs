const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const R=require('../src/core/product-rules.js'),SVG=require('../src/render/furniture-svg.js');
(async()=>{
 const html=fs.readFileSync(require.resolve('../index.html'),'utf8'),imports=JSON.parse(html.match(/<script type="importmap">([\s\S]*?)<\/script>/)[1]).imports,T=await import(imports.three);
 const {RoundedBoxGeometry}=await import('data:text/javascript;base64,'+Buffer.from(Buffer.from(imports['three/addons/geometries/RoundedBoxGeometry.js'].split(',')[1],'base64').toString().replace("from 'three'","from '"+imports.three+"'")).toString('base64'));
 const ctx=require("./helpers/layer-context.cjs").createContext(Object.assign({FurnishDownlightModel:require("../src/render/downlight-model.js"),FurnishPartIdentity:require("../src/core/part-identity.js"),syncIdentity:require("../src/core/part-identity.js")},{THREE:T,RoundedBoxGeometry,mat:(color,options={})=>new T.MeshStandardMaterial({color,...options}),FurnishProducts:R,FurnishCabinet:require('../src/core/cabinet-core.js'),M:v=>v/1000,wx:v=>v/1000,wz:v=>v/1000,rng:()=>()=>.5,FurnishSlidingOpeningModel:require('../src/render/sliding-opening-model.js'),FurnishManifoldModel:require('../src/render/manifold-model.js'),FurnishBasicFurnitureModel:require('../src/render/basic-furniture-model.js'),FurnishModelPrimitives:require('../src/render/model-primitives.js'),FurnishApplianceModel:require('../src/render/appliance-model.js')}));
 ctx.FurnishArmchairModel=require('../src/render/armchair-model.js');
 ctx.FurnishSofaBedModel=require('../src/render/sofa-bed-model.js');
 vm.runInContext(html.slice(html.indexOf('const primitives ='),html.indexOf('/* ======================= 建筑')),ctx);
 const near=(a,b)=>assert(Math.abs(a-b)<2e-6,`${a} versus ${b}`);
 const entries=require('../src/data/catalog.js').library.flatMap(c=>c.items).filter(i=>i[0]==='tv');
 for(const e of [...entries,['tv','自定义尺寸',1800,160,'#222']])for(const rot of [0,37,90,180,270])for(const flip of [false,true]){
  const f={id:'tv',type:'tv',name:e[1],w:e[2],d:e[3],color:e[4],cx:0,cy:0,rot,flip},before=JSON.stringify(f);ctx.f=f;
  const o=vm.runInContext('buildFurniture(f)',ctx),bounds=new T.Box3().setFromObject(o),vertical=R.vertical(f);
  near(bounds.min.y,vertical.bottom/1000);near(bounds.max.y,vertical.top/1000);near(o.rotation.y,-rot*Math.PI/180);assert.equal(o.scale.x,flip?-1:1);
  // SVG part rectangles and actual production mesh projections have identical local extents.
  const svg=SVG.render('tv',f.w,f.d,f.color,{ink:'#333'},f),rects=[...svg.matchAll(/<rect ([^>]+)>/g)].map(m=>Object.fromEntries([...m[1].matchAll(/([\w-]+)="([^"]*)"/g)].map(a=>[a[1],a[2]])));
  assert.equal(rects.length,2);
  o.rotation.y=0;o.scale.x=1;o.updateMatrixWorld(true);
  rects.forEach((r,i)=>{const b=new T.Box3().setFromObject(o.children[i]);near(b.min.x,Number(r.x)/1000);near(b.max.x,(Number(r.x)+Number(r.width))/1000);near(b.min.z,Number(r.y)/1000);near(b.max.z,(Number(r.y)+Number(r.height)+(i===1?-Math.min(2,f.d*.04):0))/1000);});
  const panel=new T.Box3().setFromObject(o.children[1]),rear=new T.Box3().setFromObject(o.children[0]),glass=new T.Box3().setFromObject(o.children[2]);
  near(rear.min.z,-f.d/2000);near(rear.max.z,panel.min.z);near(glass.max.z,f.d/2000);assert(glass.min.z>=panel.max.z-2e-6);
  assert.equal(JSON.stringify(f),before);
 }
 console.log('PASS TV: all catalog sizes, custom depth, production/SVG part alignment, rotation/mirror, vertical envelope, unchanged inputs');
})().catch(e=>{console.error(e);process.exitCode=1;});
