const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const {rootPath}=require('./helpers/paths.cjs');
const source=fs.readFileSync(rootPath('src/ui/canvas-interactions.js'),'utf8');
for(const kind of ['move','rot','size','note']){
  let commits=0,renders=0;
  const original={furniture:[{id:'f',cx:100,cy:200,w:400,d:500,rot:0}],notes:[{id:'n',x:10,y:20,text:'note'}]};
  const changed=structuredClone(original);changed.furniture[0].cx=999;changed.notes[0].x=999;
  const context=vm.createContext({state:changed,store:{work:{test:changed}},PLAN:{id:'test'},ui:{guides:[{x:1}]},
    svg:{classList:{remove(){}}},clearTimeout(){},renderAll(){renders++;},commit(){commits++;}});
  vm.runInContext(source,context); // Declarations must load without DOM initialization.
  context.before=JSON.stringify(original);context.kind=kind;
  vm.runInContext("drag={kind,id:'f',ids:['f'],moved:true,before};endDrag(true);",context);
  assert.equal(JSON.stringify(context.state),JSON.stringify(original));
  assert.equal(context.store.work.test,context.state);
  assert.equal(context.ui.guides,null);assert.equal(commits,0);assert.equal(renders,1);
  assert.equal(vm.runInContext('drag',context),null);
  vm.runInContext('endDrag(true);',context);assert.equal(renders,1); // Repeated end is harmless.
}
console.log('PASS cancelled move, rotation, resize and note restore work without a commit');
