'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),L=require('../src/core/lighting-core.js'),D=require('../src/render/downlight-model.js'),H=require('../src/render/bath-heater-model.js'),E=require('../src/io/blender-export.js');
const near=(a,b)=>assert(Math.abs(a-b)<1e-8,`${a} != ${b}`);
(async()=>{
 const T=await import(JSON.parse(fs.readFileSync(require.resolve('../index.html'),'utf8').match(/<script type="importmap">([\s\S]*?)<\/script>/)[1]).imports.three);
 near(L.photometric(L.radiometric(100)),100);near(L.panel(100,.59,.39)*.59*.39,100/683);assert.throws(()=>L.panel(10,0,1));assert.equal(L.environment(true).exposure,10);
 const scene=new T.Scene(),camera=new T.PerspectiveCamera(),items=[];
 for(let i=0;i<28;i++){
  const f={id:'f'+i,type:'surface_light',w:600,d:400,h:50,mountHeight:2590,color:'#fff'},g=H.build(T,f);g.userData.fid=f.id;g.position.set(i, .06,0);g.rotation.y=i*Math.PI/11;g.scale.x=i%2?-1:1;D.setLights(g,true);scene.add(g);items.push(g);
 }
 const budget=D.limitLights(scene,camera);assert.equal(budget.lights,24);assert.equal(budget.shadows,6);
 const enabled=[];scene.traverse(o=>{if(o.isLight&&o.visible)enabled.push(o);});assert(enabled.every(o=>!L.isFill(o)),'virtual fill never takes the last slot from a direct light');assert(enabled.slice(0,6).every(o=>o.castShadow));
 const canonical=L.collect(T,[scene]);assert.equal(canonical.rects.length,28,'HD sources ignore the raster budget');assert.equal(canonical.spots.length,0,'no punctual area surrogates or virtual bounces');
 for(const r of canonical.rects){near(r.position[1],2.649);near(r.width,.59);near(r.height,.39);near(new T.Vector3().fromArray(r.u).dot(new T.Vector3().fromArray(r.normal)),0);const normal=new T.Vector3().crossVectors(new T.Vector3().fromArray(r.u),new T.Vector3().fromArray(r.v));near(normal.dot(new T.Vector3().fromArray(r.normal)),-1);}
 D.setLights(items[0],false);items[1].visible=false;assert.equal(L.collect(T,[scene]).rects.length,26,'off and hidden fixture negatives');
 const C=require('../src/core/ceiling-core.js'),M=require('../src/render/ceiling-model.js'),c={id:'arc',kind:'profile',name:'Arc emitter',roomId:'r',height:2700,path:C.joinedPath({a:[0,0],b:[4800,0],normal:[0,1]},{a:[4800,0],b:[4800,4800],normal:[-1,0]}),section:C.lowCove()};c.section.light.corner={mode:'arc',radius:200};c.section.light.angle=0;
 const strip=M.build(T,{items:[c]},{wash:false}),rectangles=L.collect(T,[strip]).rects;assert(rectangles.length>2,'curved emitting faces are sampled');for(const r of rectangles){near(new T.Vector3().fromArray(r.u).dot(new T.Vector3().fromArray(r.normal)),0);assert(r.width>0&&r.height>0);}
 assert.equal(L.collect(T,[M.build(T,{items:[c]},{wash:false,lamps:false})]).rects.length,0);
 const lamp=new T.SpotLight('#fff',L.radiometric(169)),target=new T.Object3D();lamp.target=target;lamp.userData.downlightLight=true;lamp.userData.radiometricLight=true;scene.add(lamp,target);D.setLights(lamp,true);D.limitLights(scene,camera,{lights:1});
 const exported=E.snapshot(T,{groups:[scene],camera});const spots=exported.scene.children.filter(o=>o.isSpotLight);assert.equal(spots.length,1,'export ignores raster culling and drops area surrogates');near(spots[0].intensity,169);exported.dispose();D.setLights(lamp,false);assert.equal(L.collect(T,[scene]).spots.length,0);
 const manifest=JSON.parse(fs.readFileSync(path.resolve(__dirname,'../vendor/lighting-preview/manifest.json')));
 for(const f of manifest.files){assert(!/(^|\/)(aux|con|prn|nul|com[1-9]|lpt[1-9])(?=\.|\/|$)/i.test(f.path),'portable Windows filename: '+f.path);const buffer=fs.readFileSync(path.resolve(__dirname,'../vendor/lighting-preview',f.path));assert.equal(crypto.createHash('sha256').update(buffer).digest('hex'),f.sha256,f.path);}
 assert(manifest.files.some(f=>f.path.endsWith('generateMeshBVH.worker.js')));assert(manifest.files.some(f=>f.path.endsWith('.tza')));
 console.log('PASS light-unit roundtrip, real area radiance, primary/shadow budget, rotated/mirrored/floor-datum HD sources, off/hidden negatives, uncapped photometric export, offline dependencies and weights hashes');
})().catch(e=>{console.error(e);process.exitCode=1;});
