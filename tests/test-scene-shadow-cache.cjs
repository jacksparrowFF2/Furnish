const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const html=fs.readFileSync(require.resolve('../index.html'),'utf8');
let frames=0,shadowPasses=0;
const renderer={shadowMap:{needsUpdate:true},render(){frames++;if(this.shadowMap.needsUpdate){shadowPasses++;this.shadowMap.needsUpdate=false;}}};
const door={open:false,a0:0,a1:1,cur:0,pivot:{rotation:{y:0}}},sliding={open:false,cur:0,leaves:[{node:{position:{x:0}},closed:0,opened:1}]},curtain={open:false,cur:0,panels:[{node:{position:{x:0},scale:{x:1}},closed:0,opened:1,packScale:.2}]};
const empty={visible:true,traverse(){}},furnG={children:[{userData:{slidingDoor:sliding}},{userData:{curtain}}]};
const ctx=vm.createContext({wallLabelG:{children:[]},renderer,scene:{},camera:{},clock:{getDelta:()=>.05},performance:{now:()=>0},requestAnimationFrame:()=>1,raf:0,anim:null,fly:null,opt:{mode:'orbit',furn:true},orbit:{update(){}},walkCtl:{isLocked:false},touchWalk:false,doors:[door],slidingDoors:[],furnG,clearanceG:empty,elevationG:empty,issueG:empty,selHelper:null,updateSel(){},updateObservation(){},labelRenderer:{render(){}},fitSceneAnnotationLabels(){}});
// The initializer contains a semicolon inside the arrow body.
const start=html.indexOf('const invalidate = '),end=html.indexOf('\n',start);
vm.runInContext('let dirty=false;'+html.slice(start,end)+html.slice(html.indexOf('function animateCurtains(dt){'),html.indexOf('function buildFurniture(f){'))+html.slice(html.indexOf('function loop(){'),html.indexOf('function shot(){')),ctx);
function frame(){ctx.loop();}
vm.runInContext('invalidate()',ctx);frame();assert.equal(shadowPasses,1);
for(let i=0;i<40;i++){vm.runInContext("invalidate({type:'change'})",ctx);frame();}assert.equal(frames,41);assert.equal(shadowPasses,1,'orbit events redraw without redoing static shadows');
door.open=true;frame();assert(door.cur>0);assert.equal(shadowPasses,2);
door.cur=door.a1;sliding.open=true;frame();assert(sliding.leaves[0].node.position.x>0);assert.equal(shadowPasses,3);
sliding.cur=1;curtain.open=true;frame();assert(curtain.panels[0].node.scale.x<1);assert.equal(shadowPasses,4);
curtain.cur=1;vm.runInContext('invalidate(true)',ctx);frame();assert.equal(shadowPasses,5,'explicit geometry/light changes refresh once');
for(let i=0;i<5;i++)frame();assert.equal(shadowPasses,5,'settled scene retains cached shadows');
assert(html.includes('renderer.shadowMap.autoUpdate=false;renderer.shadowMap.needsUpdate=true;'));
console.log('PASS production scene loop: camera-only redraws reuse shadows; swing/sliding doors, curtains and explicit scene changes refresh; settled scene stops drawing');
