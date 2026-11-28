const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const html=fs.readFileSync(require.resolve('../index.html'),'utf8');
let frames=0,shadowPasses=0;
const renderer={shadowMap:{needsUpdate:true},render(){frames++;if(this.shadowMap.needsUpdate){shadowPasses++;this.shadowMap.needsUpdate=false;}}};
const door={open:false,a0:0,a1:1,cur:0,pivot:{rotation:{y:0}}},sliding={open:false,cur:0,leaves:[{node:{position:{x:0}},closed:0,opened:1}]},curtain={open:false,cur:0,panels:[{node:{position:{x:0},scale:{x:1}},closed:0,opened:1,packScale:.2}]};
const empty={visible:true,traverse(){}},furnG={children:[{userData:{slidingDoor:sliding}},{userData:{curtain}}]};
const ctx=vm.createContext({selectionTransform:null,sceneMeasure:null,active:true,projectionPixelRatio:1,devicePixelRatio:1,FurnishDownlightModel:require("../src/render/downlight-model.js"),applyObservationLayers(){},wallLabelG:{children:[]},renderer,renderScene:()=>renderer.render(),scene:{},camera:{},clock:{getDelta:()=>.05},performance:{now:()=>0},requestAnimationFrame:()=>1,raf:0,anim:null,fly:null,opt:{mode:'orbit',furn:true},orbit:{update(){}},walkCtl:{isLocked:false},touchWalk:false,doors:[door],slidingDoors:[],furnG,clearanceG:empty,elevationG:empty,issueG:empty,selHelper:null,updateSel(){},updateObservation(){},labelRenderer:{render(){}},fitSceneAnnotationLabels(){}});
// The initializer contains a semicolon inside the arrow body.
const start=html.indexOf('const invalidate = '),end=html.indexOf('\n',start);
ctx.syncViewportPixelRatio=()=>{};ctx.queueCeilingWash=()=>{};
ctx.refreshElectricalRoom=()=>false;ctx.updateElectricalSwitch=()=>{};
vm.runInContext('let dirty=false;'+html.slice(start,end)+html.slice(html.indexOf('function animateCurtains(dt){'),html.indexOf('function buildFurniture('))+html.slice(html.indexOf('function loop(){'),html.indexOf('function shot(){')),ctx);
function frame(){ctx.loop();}
vm.runInContext('invalidate()',ctx);frame();assert.equal(shadowPasses,1);
for(let i=0;i<40;i++){vm.runInContext("invalidate({type:'change'})",ctx);frame();}assert.equal(frames,41);assert.equal(shadowPasses,1,'orbit events redraw without redoing static shadows');
door.open=true;frame();assert(door.cur>0);assert.equal(shadowPasses,2);
door.cur=door.a1;sliding.open=true;frame();assert(sliding.leaves[0].node.position.x>0);assert.equal(shadowPasses,3);
sliding.cur=1;curtain.open=true;frame();assert(curtain.panels[0].node.scale.x<1);assert.equal(shadowPasses,4);
curtain.cur=1;vm.runInContext('invalidate(true)',ctx);frame();assert.equal(shadowPasses,5,'explicit geometry/light changes refresh once');
for(let i=0;i<5;i++)frame();assert.equal(shadowPasses,5,'settled scene retains cached shadows');
assert(html.includes('renderer.shadowMap.autoUpdate=false;renderer.shadowMap.needsUpdate=true;'));
{
 let now=0,ratio=2,draws=0;
 const listeners={};
 const surface={addEventListener:(name,handler)=>{listeners[name]=handler;}};
 const viewport=vm.createContext({window:surface,cv:surface,devicePixelRatio:2,anim:null,opt:{mode:'orbit'},
  performance:{now:()=>now},PLAN:{id:'custom_mv37igji'},FurnishProgressiveView:{mode:()=>'smooth'},
  materialLook:false,gtaoEnabled:false,bloomEnabled:false,smaaEnabled:false,bloomNight:true,localStorage:{getItem:()=>null},
  renderer:{getPixelRatio:()=>ratio,setPixelRatio:value=>{ratio=value;},domElement:{toDataURL:()=>String(ratio)}},
  renderScene:()=>{draws++;},invalidate(){}});
 const state=html.slice(html.indexOf('let viewportPointer='),html.indexOf('function updateEffectControls(){'));
 const events=html.slice(html.indexOf("  cv.addEventListener('pointerdown',e=>{"),html.indexOf('  sceneMeasure=FurnishSceneMeasure.create'));
 const capture=html.slice(html.indexOf('function viewportCaptureCanvas(){'),html.indexOf('function viewportCaptureAvailable(){'));
 vm.runInContext(state+events+capture,viewport);
 const pointer={isPrimary:true,pointerId:1,button:0,clientX:0,clientY:0};
 const touch=name=>listeners[name](pointer);
 const move=()=>listeners.pointermove({...pointer,clientX:8});
 touch('pointerdown');touch('pointerup');viewport.syncViewportPixelRatio();assert.equal(ratio,2);
 touch('pointerdown');move();viewport.syncViewportPixelRatio();assert.equal(ratio,1.25);
 now=30;touch('pointerup');viewport.syncViewportPixelRatio();assert.equal(ratio,1.25);
 now=120;touch('pointerdown');move();viewport.syncViewportPixelRatio();assert.equal(ratio,1.25);
 now=200;touch('pointerup');viewport.syncViewportPixelRatio();assert.equal(ratio,1.25);
 now=379;viewport.syncViewportPixelRatio();assert.equal(ratio,1.25);
 now=380;viewport.syncViewportPixelRatio();assert.equal(ratio,2);
 touch('pointerdown');move();viewport.syncViewportPixelRatio();touch('pointerup');
 assert.equal(viewport.captureViewportImage(),'2','A settled capture always uses the native buffer');
 assert.equal(draws,1);
 touch('pointerdown');move();viewport.syncViewportPixelRatio();touch('pointerup');
 viewport.bloomNight=false;viewport.syncViewportPixelRatio();assert.equal(ratio,2);
}
console.log('PASS production scene loop: camera-only redraws reuse shadows; swing/sliding doors, curtains and explicit scene changes refresh; settled scene stops drawing');
