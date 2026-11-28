/* DL269: reference envelope; unmarked reflector and spring details are visual estimates. */
(function(root){
'use strict';
const products=()=>root.FurnishProducts||require('../core/product-rules.js');
const lighting=()=>root.FurnishLighting||require('../core/lighting-core.js');
const ceilingAreas=()=>root.FurnishBathHeaterModel||require('./bath-heater-model.js');
const supported=f=>!!products().definition(f)?.downlight&&!f.obj;
function build(T,f){
 if(products().definition(f).downlight.asset)return buildAsset(T,f);
 const result=new T.Group(),body=new T.Group();result.add(body);
 const spec=products().downlightSpec(f);
 body.position.y=products().value(f,'mountHeight')/1000;
 const white=new T.MeshStandardMaterial({color:f.color||'#f4f4f0',roughness:.38,metalness:.2,side:T.DoubleSide});
 const black=new T.MeshStandardMaterial({color:'#303237',roughness:.7}),silver=new T.MeshStandardMaterial({color:'#b8bcc0',metalness:.8,roughness:.3});
 const glow=new T.MeshStandardMaterial({color:spec.color,emissive:spec.color,emissiveIntensity:1.5,roughness:.55});
 glow.userData.downlightEmitter=true;
 const add=(geometry,material,name,y=0)=>{const m=new T.Mesh(geometry,material);m.position.y=y;m.name=name;m.userData.furnishPartSource='downlight:'+name;m.userData.furnishStablePart='downlight:'+name;m.castShadow=m.receiveShadow=true;m.userData.ceilingOwnMaterial=true;body.add(m);return m;};
 // All authored dimensions are mm before the boundary scale below.
 const profile=[[35,45],[35,15],[35,2],[42.5,2],[42.5,0],[35,0],[27.5,34]];
 add(new T.LatheGeometry(profile.map(([x,y])=>new T.Vector2(x,y)),64),white,'housing-and-reflector');
 add(new T.CylinderGeometry(35,35,1,64),white,'rear-cap',44.5);
 add(new T.CylinderGeometry(27.5,27.5,.6,64),glow,'recessed-diffuser',34);
 for(const side of [-1,1]){
  const clip=add(new T.BoxGeometry(3,23,10),black,'spring-cover-'+side,18);clip.position.x=side*36.2;
  const spring=add(new T.TorusGeometry(3,.6,6,16),silver,'spring-'+side,35);spring.position.x=side*36;
 }
 body.scale.set(f.w/85/1000,products().height(f)/45/1000,f.d/85/1000);
 // Photometric approximation: uniform cone, variant flux over the documented 100° beam.
 const angle=spec.beam*Math.PI/360,intensity=spec.lumens/(2*Math.PI*(1-Math.cos(angle)));
 const lamp=new T.SpotLight(spec.color,lighting().radiometric(intensity),12,angle,.3,2),target=new T.Object3D();
 lamp.userData.radiometricLight=true;
 const lightGroup=new T.Group();lightGroup.position.y=products().value(f,'mountHeight')/1000;
 lamp.position.y=-.001;target.position.y=-1;lamp.target=target;lamp.userData.downlightLight=true;lamp.castShadow=true;lamp.shadow.mapSize.set(512,512);lamp.shadow.bias=-.0001;lightGroup.add(lamp,target);result.add(lightGroup);
 return result;
}
function buildAsset(T,f){
 const P=products(),def=P.definition(f).downlight,spec=P.downlightSpec(f),asset=root.FurnishLabotIP65Asset||(typeof require==='function'?require('../data/downlight-labot-ip65-blender-asset.js'):null);
 const g=(root.FurnishStaticAssetModel||require('./static-asset-model.js')).build(T,asset,{...f,h:P.height(f)},P.value(f,'mountHeight'));
 if(!T.SpotLight||!T.Object3D)return g;
 const mesh=g.children.find(o=>o.name==='diffuser'),radius=def.emitterRadius*f.w/85/1000,base=P.value(f,'mountHeight')/1000,emitter=base+def.emitterHeight*P.height(f)/45/1000;
 const angle=spec.beam*Math.PI/360,intensity=spec.previewLumens/(2*Math.PI*(1-Math.cos(angle))),radiance=lighting().panel(intensity,2*radius,2*radius);
 mesh.material.emissive.set(spec.color);mesh.material.emissiveIntensity=radiance;Object.assign(mesh.material.userData,{downlightEmitter:true,emissionOn:radiance});
 (g.userData.lightingRects||=[]).push({name:'diffuser',position:[0,emitter,0],width:2*radius,height:2*radius,u:[1,0,0],v:[0,0,-1],normal:[0,-1,0],radiance,color:spec.color,material:mesh.material});
 const lamp=new T.SpotLight(spec.color,lighting().radiometric(intensity),12,angle,.3,2),target=new T.Object3D();lamp.position.set(0,emitter-.0005,0);target.position.set(0,emitter-1,0);lamp.target=target;Object.assign(lamp.userData,{downlightLight:true,radiometricLight:true});lamp.castShadow=true;lamp.shadow.mapSize.set(512,512);lamp.shadow.bias=-.0001;g.add(lamp,target);return g;
}
function setLights(group,on,{night=false,nightLights=on}={}){
 const pathOn=nightLights&&night;
 group?.traverse(o=>{
  const flags=o.userData,material=o.material,emission=material?.userData;
  if(flags.downlightLight||flags.ceilingPanelLight){
   flags.previewLightEnabled=on;
   o.visible=on&&flags.panelSample!=='tile';
  }
  if(flags.pathLight)o.visible=flags.previewLightEnabled=pathOn;
  if(emission?.downlightEmitter||emission?.ceilingPanelEmitter)material.emissiveIntensity=on?(emission.emissionOn??1.5):0;
  if(emission?.pathLightEmitter)material.emissiveIntensity=pathOn?.8:0;
 });
}
// Trial presses affect the raster frame only. Exports and scene settings keep
// the original lighting state, including when the renderer throws.
function withPreviewLights(group,overrides,draw){
 const restore=[];
 try{
  for(const fixture of group.children){
   const enabled=overrides.get(fixture.userData.fid);
   if(enabled===undefined)continue;
   fixture.traverse(o=>{
    const flags=o.userData,material=o.material,emission=material?.userData;
    if(flags.downlightLight||flags.ceilingPanelLight){
     const {visible,castShadow}=o,previous=flags.previewLightEnabled;
     restore.push(()=>{o.visible=visible;o.castShadow=castShadow;if(previous===undefined)delete flags.previewLightEnabled;else flags.previewLightEnabled=previous;});
     flags.previewLightEnabled=enabled;
     o.visible=enabled&&flags.panelSample!=='tile';
    }
    if(emission?.downlightEmitter||emission?.ceilingPanelEmitter){
     const previous=material.emissiveIntensity;
     restore.push(()=>{material.emissiveIntensity=previous;});
     material.emissiveIntensity=enabled?(emission.emissionOn??1.5):0;
    }
   });
  }
  return draw();
 }finally{for(let i=restore.length-1;i>=0;i--)restore[i]();}
}
// WebGL forward lighting compiles every enabled light into each material. Keep
// a bounded local preview; emissive faces and all production geometry remain.
function limitLights(scene,camera,{lights=24,shadows=6,maxFragmentUniforms=1024,maxTextures=16}={},panelRoom){
 lights=Math.min(lights,Math.max(1,Math.floor((maxFragmentUniforms-128)/16)));shadows=Math.min(shadows,Math.max(0,maxTextures-8));
 const candidates=[];scene.updateMatrixWorld(true);const eye=camera.getWorldPosition(camera.position.clone());
 scene.traverse(o=>{if(!o.isLight||!(o.userData.downlightLight||o.userData.ceilingPanelLight||o.userData.pathLight||o.userData.ceilingStripLight))return;
  o.userData.previewShadowRequested??=o.castShadow;let visible=o.userData.previewLightEnabled!==false,owner=o.parent;
  for(let p=o.parent;p;p=p.parent){if(!p.visible)visible=false;if(p.userData.fid||p.userData.ceiling)owner=p;}
  if(visible&&o.intensity>0)candidates.push({o,owner,hadShadow:o.castShadow,distance:o.getWorldPosition(eye.clone()).distanceToSquared(eye)});
  o.visible=false;o.castShadow=false;
 });
 const ordered=lighting().prioritize(candidates);
 const local=panelRoom?ordered.filter(({owner})=>owner.userData.floorBase?.roomId===panelRoom):[];
 const fullPanel=local.find(({o})=>o.userData.panelSample==='full');
 const capacity=Math.min(lights,shadows);
 const panel=fullPanel&&capacity?(capacity>=4?local.filter(({o,owner})=>
  owner===fullPanel.owner&&o.userData.panelSample==='tile'):[fullPanel]):[];
 // Select either a full-face shadow or four locally occluded portions of
 // that face. The light emitted is the same in both cases.
 const task=panel.length&&capacity>panel.length?local.find(({o})=>
  o.userData.ceilingPanelLight&&o.userData.areaSurrogate&&!o.userData.panelSample):null;
 const reserved=task?[...panel,task]:panel;
 const spans=ordered.filter(({o})=>o.userData.coveSpan).slice(0,capacity-reserved.length);
 const remaining=ordered.filter(c=>!c.o.userData.coveSpan&&c!==task&&
  c.o.userData.panelSample!=='tile'&&!(panel.length&&c===fullPanel));
 const active=reserved.concat(spans,remaining.slice(0,lights-reserved.length-spans.length));
 let shadowCount=0,coveShadowAdded=false,panelShadowAdded=false;
 for(const {o,hadShadow} of active){
  o.visible=true;
  o.castShadow=!!o.userData.previewShadowRequested&&shadowCount<shadows;
  if(o.castShadow){
   shadowCount++;
   panelShadowAdded||=!hadShadow&&(o.userData.ceilingArea||reserved.some(c=>c.o===o));
  }
  if(o.userData.coveSpan){
   root.FurnishCoveLightModel.orientSpan(o);
   coveShadowAdded||=o.castShadow&&!hadShadow;
  }
  if(o.userData.ceilingArea)ceilingAreas().orientArea(o);
 }
 return {candidates:candidates.length,lights:active.length,shadows:shadowCount,coveShadowAdded,panelShadowAdded};
}
const api={supported,build,setLights,withPreviewLights,limitLights};if(typeof module==='object'&&module.exports)module.exports=api;else root.FurnishDownlightModel=api;
})(typeof globalThis!=='undefined'?globalThis:this);
