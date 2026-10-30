const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const N=require('../src/core/navigation-input.js');
for(const aspect of [.45,1,16/9,32/9]){
 const lens=N.projection(60,aspect);assert.ok(lens.vertical<=75);
 if(aspect>=1)assert.ok(Math.abs(lens.horizontal-60)<1e-10);
}
assert.equal(N.cameraFov(),60);assert.equal(N.setCameraFov(NaN),60);
assert.ok(Math.abs(N.projection(999,1).horizontal-60)<1e-10);
const event=(x,y,extra={})=>({deltaX:x,deltaY:y,deltaMode:0,...extra});
N.setMode('auto');
assert.equal(N.wheel(event(0,120)).kind,'zoom');
assert.equal(N.wheel(event(0,3)).kind,'pan');
assert.equal(N.wheel(event(16,80)).kind,'pan');
assert.equal(N.wheel(event(0,3,{deltaMode:1})).kind,'zoom');
N.setMode('touchpad');assert.equal(N.wheel(event(0,120)).kind,'pan');
assert.ok(N.wheel(event(0,-2,{ctrlKey:true})).factor>1);
assert.ok(N.wheel(event(0,2,{ctrlKey:true})).factor<1);
N.setMode('mouse');assert.equal(N.wheel(event(1,3)).kind,'zoom');
assert.equal(N.wheel(event(0,0)).factor,1);
N.setMode('invalid');assert.equal(N.getMode(),'mouse');
const el={getScreenCTM:()=>({inverse:()=>({a:2,b:0,c:0,d:2})})};
assert.deepEqual(N.panBox([10,20,300,400],el,5,-8),[20,4,300,400]);
// Use production Three vectors and real camera projection without a WebGL context.
(async()=>{
 const html=fs.readFileSync(require.resolve('../index.html'),'utf8'),imports=JSON.parse(html.match(/<script type="importmap">([\s\S]*?)<\/script>/)[1]).imports,T=await import(imports.three);
 // A 1 m object at 2 m projects to the pinhole-model size with the actual lens.
 for(const aspect of [.45,16/9,32/9]){
  const lens=N.projection(60,aspect),c=new T.PerspectiveCamera(lens.vertical,aspect,.05,300);
  const left=new T.Vector3(-.5,0,-2).project(c),right=new T.Vector3(.5,0,-2).project(c);
  assert.ok(Math.abs((right.x-left.x)-1/(2*Math.tan(lens.horizontal*Math.PI/360)))<1e-10);
 }
 const saved=new Map(),stored=vm.createContext({localStorage:{getItem:k=>saved.get(k),setItem:(k,v)=>saved.set(k,v)}});
 vm.runInContext(fs.readFileSync(require.resolve('../src/core/navigation-input.js'),'utf8'),stored);
 stored.FurnishNavigation.setCameraFov(75);assert.equal(stored.FurnishNavigation.cameraFov(),75);
 vm.runInContext(fs.readFileSync(require.resolve('../src/core/navigation-input.js'),'utf8'),stored);assert.equal(stored.FurnishNavigation.cameraFov(),75);
 const handlers={},element={clientHeight:500,addEventListener:(n,fn)=>handlers[n]=fn,removeEventListener:n=>delete handlers[n]};
 const camera=new T.PerspectiveCamera(60,1,.1,100);camera.position.set(0,0,10);camera.lookAt(0,0,0);
 const controls={object:camera,target:new T.Vector3(),enabled:true,enablePan:true,enableZoom:true,minDistance:2,maxDistance:20,minZoom:.5,maxZoom:2,update(){},dispatchEvent(){}};
 const dispose=N.bindOrbit(element,()=>controls);let prevented=0,stopped=0;
 const send=(x,y,extra={})=>handlers.wheel({...event(x,y,extra),preventDefault(){prevented++;},stopImmediatePropagation(){stopped++;}});
 N.setMode('touchpad');send(30,20);assert.ok(camera.position.x>0);assert.ok(camera.position.y<0);assert.equal(camera.position.distanceTo(controls.target),10);
 send(0,-10,{ctrlKey:true});assert.ok(camera.position.distanceTo(controls.target)<10);
 for(let i=0;i<10;i++)send(0,-1000,{ctrlKey:true});assert.ok(Math.abs(camera.position.distanceTo(controls.target)-2)<1e-10);
 controls.enabled=false;const before=camera.position.clone();send(10,10);assert.deepEqual(camera.position,before);
 const ortho=new T.OrthographicCamera(-2,2,2,-2,.1,100);ortho.position.z=10;controls.object=ortho;controls.enabled=true;send(0,-1000,{ctrlKey:true});assert.equal(ortho.zoom,2);
 assert.equal(prevented,stopped);dispose();assert.equal(handlers.wheel,undefined);
 const context=vm.createContext({localStorage:{getItem:()=>{throw Error('denied');},setItem:()=>{throw Error('denied');}}});vm.runInContext(fs.readFileSync(require.resolve('../src/core/navigation-input.js'),'utf8'),context);context.FurnishNavigation.setMode('touchpad');assert.equal(context.FurnishNavigation.getMode(),'touchpad');
 console.log('PASS camera lens and navigation: modes, wheel units, pinch direction, SVG pan, perspective/orthographic limits, disabled controls, disposal and unavailable storage');
})().catch(e=>{console.error(e);process.exitCode=1;});
