const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),K=require('../src/core/kitchen-core.js'),C=require('../src/core/cabinet-core.js');
(async()=>{
 const imports=JSON.parse(fs.readFileSync(require.resolve('../index.html'),'utf8').match(/<script type="importmap">([\s\S]*?)<\/script>/)[1]).imports,T=await import(imports.three),ctx=vm.createContext({FurnishKitchen:K,FurnishCabinet:C});
 for(const name of ['cabinet-model','kitchen-model'])vm.runInContext(fs.readFileSync(require.resolve('../src/render/'+name+'.js'),'utf8'),ctx);
 const box=(w,h,d,color,x,y,z)=>{const mesh=new T.Mesh(new T.BoxGeometry(w,h,d),new T.MeshStandardMaterial({color}));mesh.position.set(x,y+h/2,z);return mesh;};let cases=0;
 for(const shape of ['straight','L','U'])for(const run of shape==='straight'?[0]:shape==='L'?[0,1]:[0,1,2])for(const rot of [0,37,90])for(const flip of [false,true]){
  const host=K.configure({id:'top',type:'counter',cx:3000,cy:3000,rot,flip,w:1200,d:600,color:'#ddd'},{version:1,shape,depth:600,baseHeight:820,thickness:40,modules:[{run:0,width:1200,role:run===0?'sink':'door'},...(shape==='straight'?[]:[{run:1,width:1200,role:run===1?'sink':'door'}]),...(shape==='U'?[{run:2,width:1200,role:run===2?'sink':'door'}]:[])]});
  const items=K.normalize([host,K.attach({id:'sink',type:'sink_arrow_750',cx:3000,cy:3000,w:750,d:450,rot:0},host,run)]),sink=items[1],m=K.layout(host)[run],a=m.rot*Math.PI/180,[cx,cy]=K.world(host,m.x+200*Math.cos(a),m.y+200*Math.sin(a)),moved=K.moveLinkedSink(sink,host,cx,cy);
  const models=[sink,moved].map(f=>{const model=ctx.FurnishKitchenModel.build(T,host,box,{furniture:[f]});model.updateMatrixWorld(true);return model;});
  const stone=(model,u)=>{const [x,z]=K.local(host,...K.world(sink,u,0));return new T.Raycaster(new T.Vector3(x/1000,2,z/1000),new T.Vector3(0,-1,0)).intersectObject(model,true).some(hit=>hit.object.userData.kitchenSlab);};
  assert(!stone(models[0],-300)&&stone(models[1],-300),'old opening fills with production stone');
  assert(stone(models[0],500)&&!stone(models[1],500),'new opening cuts production stone');
  for(const model of models)model.traverse(o=>{o.geometry?.dispose();if(o.material)for(const mat of Array.isArray(o.material)?o.material:[o.material])mat.dispose();});cases++;
 }
 console.log(`PASS ${cases} production kitchen ray cases: old hole fills, offset hole opens across straight/L/U runs, rotations and mirrors`);
})().catch(e=>{console.error(e);process.exitCode=1;});
