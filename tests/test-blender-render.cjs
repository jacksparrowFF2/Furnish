'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os'),http=require('node:http'),{EventEmitter}=require('node:events'),vm=require('node:vm');
const B=require('../scripts/blender-server.cjs'),E=require('../src/io/blender-export.js');
function glb(extra={}){const text=JSON.stringify({asset:{version:'2.0'},meshes:[{}],cameras:[{}],...extra}),json=Buffer.from(text+' '.repeat((4-Buffer.byteLength(text)%4)%4)),b=Buffer.alloc(20+json.length);b.writeUInt32LE(0x46546c67);b.writeUInt32LE(2,4);b.writeUInt32LE(b.length,8);b.writeUInt32LE(json.length,12);b.writeUInt32LE(0x4e4f534a,16);json.copy(b,20);return b;}
async function main(){
 assert.equal(B.validateGLB(glb()).asset.version,'2.0');
 for(const b of [Buffer.alloc(5),glb({images:[{uri:'file:///secret.png'}]}),glb({buffers:[{uri:'https://example.com/a.bin'}]}),glb({cameras:[]})])assert.throws(()=>B.validateGLB(b));
 const wrong=glb();wrong.writeUInt32LE(1,8);assert.throws(()=>B.validateGLB(wrong));
 assert.deepEqual(E.dimensions(2,'final'),{width:1920,height:960});assert.deepEqual(E.dimensions(.5,'preview'),{width:480,height:960});
 assert.deepEqual(E.dimensions(5,'preview'),{width:960,height:192});assert.throws(()=>E.dimensions(0,'preview'));assert.throws(()=>E.dimensions(100,'preview'));
 assert(B.candidates({LOCALAPPDATA:'C:/User',PATH:''},'win32').some(p=>p.endsWith('blender-launcher.exe')));
 const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8'),imports=JSON.parse(html.match(/<script type="importmap">([\s\S]*?)<\/script>/)[1]).imports,T=await import(imports.three);
 const group=new T.Group();group.position.set(2,.2,3);group.scale.x=-1;group.rotation.y=Math.PI/2;
 const source=new T.Mesh(new T.BoxGeometry(1,2,3),new T.MeshStandardMaterial({color:'#804020'}));source.userData={cycle:source};source.position.y=1;group.userData.fid='stable-id';group.add(source);
 const hidden=new T.Mesh(source.geometry,source.material);hidden.visible=false;group.add(hidden);
 const ceiling=new T.Mesh(source.geometry,source.material);ceiling.userData={layerObject:'roomCeiling:test'};group.add(ceiling);
 const cam=new T.PerspectiveCamera(45,2,.05,300);cam.position.set(4,5,6);cam.lookAt(0,0,0);
 const original=source.material,serialized=group.matrix.toArray().join(','),copy=E.snapshot(T,{groups:[group],camera:cam});
 assert.equal(copy.meshCount,1);assert.equal(copy.scene.children[0].userData.furnishId,'stable-id');assert(copy.scene.children[0].matrix.equals(source.matrixWorld));assert(copy.scene.children[0].matrix.determinant()<0);assert.notEqual(copy.scene.children[0].geometry,source.geometry);assert.equal(copy.scene.children[1].name,'FurnishCamera');copy.dispose();assert.equal(source.material,original);assert.equal(serialized,new T.Matrix4().identity().toArray().join(','));
 const full=E.snapshot(T,{groups:[group],camera:cam,includeCeilings:true});assert.equal(full.meshCount,2);full.dispose();
 const instances=new T.InstancedMesh(source.geometry,source.material,2);instances.setMatrixAt(1,new T.Matrix4().makeTranslation(2,3,4));const instanced=E.snapshot(T,{groups:[instances],camera:cam});assert(instanced.scene.children[0].isInstancedMesh);assert.deepEqual([...instanced.scene.children[0].instanceMatrix.array],[...instances.instanceMatrix.array]);assert.notEqual(instanced.scene.children[0].instanceMatrix,instances.instanceMatrix);instanced.dispose();
 const scripts=[...html.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/g)],classic=[];
 for(const [,attrs,body]of scripts){if(/importmap/.test(attrs))continue;const src=attrs.match(/src="([^"]+)"/);if(src){assert(fs.existsSync(path.join(__dirname,'..',src[1])));if(!/type="module"/.test(attrs))classic.push(fs.readFileSync(path.join(__dirname,'..',src[1]),'utf8'));}else if(!/type="module"/.test(attrs))classic.push(body);}
 new vm.Script(classic.join('\n;\n'));
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'furnish-blender-')),children=[],killed=[];
 const bridge=B.create(root,{discover:()=>'/fixed/blender-launcher.exe',pollMs:10,startupMs:1000,timeoutMs:3000,kill:pid=>killed.push(pid),spawn(exe,args,options){
  assert.equal(exe,'/fixed/blender-launcher.exe');assert.equal(options.shell,false);assert.equal(options.windowsHide,true);assert(args.includes('--disable-autoexec'));
  const child=new EventEmitter();child.stdout=new EventEmitter();child.stderr=new EventEmitter();child.kill=()=>{};children.push({child,args});setImmediate(()=>child.emit('close',0));return child;
 }});
 const server=http.createServer((req,res)=>bridge.handle(req,res));await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port+'/api/furnish/blender',headers={'X-Furnish-Request':'blender-v1','Content-Type':'model/gltf-binary'};
 async function req(route,options){const r=await fetch(base+route,options);return {status:r.status,data:await r.json()};}
 function report(j,state){fs.writeFileSync(path.join(j.dir,'progress.json'),JSON.stringify({token:j.id,pid:54321,state,message:state,renderDevice:{requested:'auto',type:'GPU',backend:'OPTIX',devices:['Test GPU'],fallback:null}}));}
 const pause=()=>new Promise(r=>setTimeout(r,45));
 try{
  assert.equal((await req('/status')).data.available,true);
  assert.equal((await req('/jobs?quality=preview&width=960&height=640',{method:'POST',headers:{...headers,Origin:'https://evil.example'},body:glb()})).status,403);
  assert.equal((await req('/jobs?quality=preview&width=960&height=640',{method:'POST',body:glb()})).status,403);
  const first=await req('/jobs?quality=preview&width=960&height=640',{method:'POST',headers,body:glb()});assert.equal(first.status,202);const j=bridge.jobs.get(first.data.id);await pause();assert.equal(j.state,'starting','Store launcher exit 0 must not mean completion');
  assert.equal(first.data.device,'auto');assert.equal(children[0].args[children[0].args.indexOf('--device')+1],'auto');
  assert.equal((await req('/jobs?quality=final&width=1920&height=1080',{method:'POST',headers,body:glb()})).status,409);
  report(j,'rendering');await pause();assert.equal(j.state,'rendering');assert.equal((await req('/jobs/'+j.id)).data.renderDevice.backend,'OPTIX');
  fs.writeFileSync(path.join(j.dir,'render.png'),'png');fs.writeFileSync(path.join(j.dir,'scene.blend'),'blend');report(j,'done');await pause();const done=(await req('/jobs/'+j.id)).data;assert.equal(done.state,'done');assert.equal((await fetch('http://127.0.0.1:'+server.address().port+done.blend)).headers.get('content-disposition'),'attachment; filename="furnish-scene.blend"');
  const second=await req('/jobs?quality=preview&width=960&height=640',{method:'POST',headers,body:glb()}),j2=bridge.jobs.get(second.data.id);
  await req('/jobs/'+j2.id+'/cancel',{method:'POST',headers});await pause();assert.equal(j2.state,'cancelling');report(j2,'importing');await pause();assert.equal(j2.state,'cancelled');assert.deepEqual(killed,[54321]);
  const third=await req('/jobs?quality=final&width=1920&height=1080&device=cpu',{method:'POST',headers,body:glb()}),j3=bridge.jobs.get(third.data.id);report(j3,'failed');await pause();assert.equal(j3.state,'failed');assert(children[2].args.includes('128'));assert.equal(children[2].args.at(-1),'cpu');
  assert.equal((await req('/jobs?quality=preview&width=960&height=640&device=arbitrary',{method:'POST',headers,body:glb()})).status,400);
  assert.equal((await req('/jobs/not-a-job')).status,404);
  assert.equal((await req('/jobs?quality=preview&width=99999&height=640',{method:'POST',headers,body:glb()})).status,400);
 }finally{bridge.close();await new Promise(r=>server.close(r));assert.ok(path.resolve(root).startsWith(path.resolve(os.tmpdir())+path.sep));fs.rmSync(root,{recursive:true,force:true});}
 console.log('PASS Blender GLB validation, world transforms/mirror/camera/ceilings, classic loading, Store launcher lifecycle, API origin/parameters/busy/results/failure/cancel');
}
main().catch(e=>{console.error(String(e.stack||e).replace(/data:text\/javascript;base64,[A-Za-z0-9+/=]+/g,'three-r160'));process.exitCode=1;});
