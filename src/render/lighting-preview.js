/* Separate r187 module graph: the r160 editor and its WebGL context stay intact. */
import * as T from '../../vendor/lighting-preview/three/build/three.webgpu.js';
import {GLTFLoader} from '../../vendor/lighting-preview/three/examples/jsm/loaders/GLTFLoader.js';
import {WebGPUPathTracer,OIDNDenoiser} from '../../vendor/lighting-preview/three-gpu-pathtracer/src/webgpu/index.js';
import {GenerateMeshBVHWorker} from '../../vendor/lighting-preview/three-mesh-bvh/src/workers/GenerateMeshBVHWorker.js';
import {initUNetFromURL} from '../../vendor/lighting-preview/oidn-webgpu/dist/oidn.js';
let token=null,renderer=null,tracer=null,scene=null,stopped=false,poll=null;
let live=false,liveCamera=null,viewKey=null,aspect=1,edge=1200,liveVersion=0,paused=false;
function renderLoop(){renderer?.setAnimationLoop(()=>{if(stopped||paused)return;try{tracer.renderSample();}catch(error){fail(error);}});}
function resizeLive(nextEdge){edge=nextEdge;const {width,height}=globalThis.FurnishProgressivePolicy.size(aspect,edge);renderer.setSize(width,height);tracer.reset();}
function updateLiveCamera(data){if(!live||!tracer||!liveCamera)return;
 const valid=a=>Array.isArray(a)&&a.length===16&&a.every(Number.isFinite),c0=data.camera;
 if(!c0||!valid(c0.matrixWorld)||!valid(c0.projectionMatrix)||!Number.isFinite(c0.aspect)||c0.aspect<.1||c0.aspect>10||!Number.isFinite(c0.near)||!Number.isFinite(c0.far))throw Error('相机数据无效');liveVersion++;viewKey=data.viewKey;const c=data.camera;aspect=c.aspect;liveCamera.matrixWorld.fromArray(c.matrixWorld);liveCamera.matrixWorld.decompose(liveCamera.position,liveCamera.quaternion,liveCamera.scale);liveCamera.updateMatrixWorld(true);liveCamera.projectionMatrix.fromArray(c.projectionMatrix);liveCamera.projectionMatrixInverse.copy(liveCamera.projectionMatrix).invert();liveCamera.near=c.near;liveCamera.far=c.far;resizeLive(edge);tracer.updateCamera();paused=false;tracer.pause=false;renderLoop();}
const send=(type,values={})=>parent.postMessage({channel:'furnish-lighting-preview',token,type,...values},location.origin);
const status=message=>send('status',{message});
function stop(){stopped=true;clearInterval(poll);renderer?.setAnimationLoop(null);}
function fail(error){if(stopped)return;console.warn('Furnish HD preview:',error?.stack||error);stop();send('error',{message:String(error?.message||error).slice(0,350)});}
window.addEventListener('pagehide',()=>{stop();tracer?.dispose();if(scene){const resources=new Set();scene.traverse(o=>{if(o.geometry)resources.add(o.geometry);for(const m of [o.material].flat().filter(Boolean)){resources.add(m);for(const v of Object.values(m))if(v?.isTexture)resources.add(v);}});for(const r of resources)r.dispose();}renderer?.dispose();});
async function run(data){
 token=data.token;live=data.mode==='live';viewKey=data.viewKey;aspect=data.aspect;edge=data.edge||1200;if(live)document.body.classList.add('live');const started=performance.now();
 try{
  if(!(data.buffer instanceof ArrayBuffer)||data.buffer.byteLength>512*1024*1024||!Number.isFinite(data.aspect)||data.aspect<.1||data.aspect>10)throw Error('场景数据无效');
  const adapter=await navigator.gpu?.requestAdapter({powerPreference:'high-performance'});if(!adapter||adapter.isFallbackAdapter)throw Error('当前设备未提供可用的 WebGPU，请检查图形驱动或使用 Blender 渲染');
  if(stopped)return;
  const requiredLimits={maxStorageBufferBindingSize:Math.min(adapter.limits.maxStorageBufferBindingSize,536870912),maxBufferSize:Math.min(adapter.limits.maxBufferSize,536870912)};
  renderer=new T.WebGPURenderer({antialias:false,trackTimestamp:true,powerPreference:'high-performance',requiredLimits});renderer.setPixelRatio(1);
  const targetEdge=live?edge:(data.quality==='fine'?1920:1200),{width,height}=globalThis.FurnishProgressivePolicy.size(data.aspect,targetEdge),samples=live?256:(data.quality==='fine'?1024:128);
  renderer.setSize(width,height);renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=data.environment.exposure;renderer.outputColorSpace=T.SRGBColorSpace;document.body.append(renderer.domElement);await renderer.init();
  renderer.backend.device.addEventListener('uncapturederror',e=>{e.preventDefault();fail(e.error);});renderer.backend.device.lost.then(info=>{if(!stopped)fail(Error('图形设备连接中断：'+info.message));});
  if(stopped)return;status('正在读取生产模型…');
  const gltf=await new GLTFLoader().parseAsync(data.buffer,'');if(stopped)return;
  scene=new T.Scene();scene.add(gltf.scene);scene.background=new T.Color(data.environment.background);scene.environment=new T.Color().fromArray(data.environment.world);scene.environmentIntensity=1;
  const camera=gltf.cameras[0];if(!camera)throw Error('场景缺少相机');camera.aspect=data.aspect;camera.updateProjectionMatrix();if(live){camera.removeFromParent();scene.add(camera);liveCamera=camera;}scene.updateMatrixWorld(true);
  // glTF primitives can share BufferAttribute objects across geometries. Worker
  // transfers must own their attribute arrays, otherwise another BVH job can
  // encounter a detached array. Copy only this isolated preview's geometry.
  const privateGeometry=new Map();scene.traverse(o=>{if(o.isMesh){if(!privateGeometry.has(o.geometry))privateGeometry.set(o.geometry,o.geometry.clone());o.geometry=privateGeometry.get(o.geometry);}});for(const geometry of privateGeometry.keys())geometry.dispose();
  const remove=[];scene.traverse(o=>{
   if(o.isLight){if(!o.isDirectionalLight)remove.push(o);else o.intensity/=683;}
   if(o.isMesh&&o.userData.furnishAreaEmitter){o.material=(Array.isArray(o.material)?o.material:[o.material]).map(m=>{const c=m.clone();if(c.emissive){c.emissive.setRGB(0,0,0);c.emissiveIntensity=0;}return c;});if(o.material.length===1)o.material=o.material[0];}
  });for(const o of remove)o.removeFromParent();
  for(const r of data.lighting.rects){const light=new T.RectAreaLight(new T.Color().fromArray(r.color),r.radiance,r.width,r.height);light.position.fromArray(r.position);light.quaternion.setFromRotationMatrix(new T.Matrix4().makeBasis(new T.Vector3().fromArray(r.u),new T.Vector3().fromArray(r.v),new T.Vector3().fromArray(r.normal).negate()));light.visibleToCameraRays=true;scene.add(light);}
  for(const r of data.lighting.spots){const light=new T.SpotLight(new T.Color().fromArray(r.color),r.intensity,r.distance,r.angle,r.penumbra,2);light.position.fromArray(r.position);light.target.position.fromArray(r.target);scene.add(light,light.target);}
  tracer=new WebGPUPathTracer(renderer);tracer.maxBounces=8;tracer.maxTransparentBounces=16;tracer.maxSamples=samples;tracer.minSamples=1;tracer.renderDelay=0;tracer.fadeDuration=0;tracer.asyncCompile=true;
  const denoiser=new OIDNDenoiser({initUNetFromURL,auxWeightsUrl:new URL('../../vendor/lighting-preview/rt_hdr_alb_nrm_small.tza',import.meta.url).href,maxTileSize:512});denoiser.addEventListener('error',e=>fail(e.error));denoiser.addEventListener('progress',e=>status('正在降噪 · '+Math.round(e.progress*100)+'%'));tracer.setDenoiser(denoiser);
  tracer.setBVHWorker(GenerateMeshBVHWorker);tracer.addEventListener('progress',e=>{if(!stopped&&e.stage==='building')status('正在准备场景 · '+Math.round(e.progress*100)+'%');});
  status('正在准备场景…');await tracer.setSceneAsync(scene,camera);if(stopped)return;if(live){updateLiveCamera({camera:data.camera,viewKey:data.viewKey});send('live-ready',{viewKey});}
  tracer.addEventListener('complete',async()=>{
   if(stopped)return;if(live){const version=liveVersion;await renderer.backend.device.queue.onSubmittedWorkDone();if(stopped||version!==liveVersion)return;send('live-complete',{viewKey,samples,frameTime:tracer.frameTime});renderer.setAnimationLoop(null);return;}
   try{await renderer.backend.device.queue.onSubmittedWorkDone();
    const blob=await new Promise(resolve=>renderer.domElement.toBlob(resolve,'image/png'));if(stopped)return;if(!blob)throw Error('无法生成预览图片');
    stop();send('complete',{blob,width,height,samples,seconds:(performance.now()-started)/1000});
   }catch(error){fail(error);}
  });
  let polling=false;poll=setInterval(async()=>{if(polling||stopped)return;polling=true;try{const version=liveVersion,count=await tracer.getSampleCountsAsync();if(!stopped&&version===liveVersion){if(live)send('live-progress',{viewKey,samples:count.avg,frameTime:tracer.frameTime});else status('正在预览 · '+Math.floor(count.avg)+' / '+samples+' 采样');}}catch(error){fail(error);}finally{polling=false;}},1300);
  status('正在编译并开始预览…');renderLoop();
 }catch(error){fail(error);}
}
window.addEventListener('message',e=>{if(e.source!==parent||e.origin!==location.origin||e.data?.channel!=='furnish-lighting-preview'||e.data.type!=='scene'||token!==null)return;run(e.data);});
window.addEventListener('message',e=>{if(e.source!==parent||e.origin!==location.origin||e.data?.channel!=='furnish-lighting-preview'||e.data.token!==token||!live||stopped)return;const d=e.data;try{if(d.type==='pause'){paused=true;if(tracer)tracer.pause=true;renderer?.setAnimationLoop(null);}else if(d.type==='resume'){paused=false;if(tracer)tracer.pause=false;renderLoop();}else if(d.type==='camera')updateLiveCamera(d);else if(d.type==='resize'&&tracer&&[640,1200].includes(d.edge)){liveVersion++;resizeLive(d.edge);paused=false;tracer.pause=false;renderLoop();}}catch(error){fail(error);}});
send('ready');
