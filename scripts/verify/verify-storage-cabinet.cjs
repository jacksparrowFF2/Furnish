/* A read-only MCP snapshot, transformed into an isolated production studio. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const V=require('../lib/browser-verification.cjs'),F=require('../lib/model-browser-fixture.cjs');
(async()=>{
 const root=path.resolve(process.argv[2]),out=path.resolve(process.argv[3]);assert.notEqual(root,V.projectRoot);const scene=JSON.parse(fs.readFileSync(path.join(out,'scene.json')));
 if(!fs.existsSync(path.join(root,'index.html'))){fs.mkdirSync(root,{recursive:true});for(const name of ['index.html','manifest.webmanifest','src','styles','vendor','scripts','templates'])fs.cpSync(path.join(V.projectRoot,name),path.join(root,name),{recursive:true});}
 const server=await V.staticServer(root);process.env.FURNISH_VERIFY_ROOT=root;process.env.FURNISH_VERIFY_URL=server.baseURL;const browser=await V.launch();
 try{
  const page=await browser.newPage({viewport:{width:1200,height:1000}});await page.goto(server.baseURL+'index.html');await F.install(page,{fixture:scene[0],companions:scene.slice(1)});
  const views=[{id:'front',position:[0,1.35,4.8],target:[0,1.175,0]},{id:'oblique',position:[3.2,2.25,4.8],target:[0,1.175,0]}];const evidence=[];
  for(const view of views){const file=path.join(out,view.id+'.glb'),geometry=await F.capture(page,file,view);assert(scene.every(f=>geometry.parts.some(p=>p.id===f.id)));evidence.push({view,geometry});}
  fs.writeFileSync(path.join(out,'production.json'),JSON.stringify({passed:true,source:'MCP read-only snapshot; transformed studio copy; doors opened only in studio',scene,evidence},null,2));
 }finally{await browser.close();await server.close();}
 for(const id of ['front','oblique'])await require('./verify-model-render.cjs').render(root,path.join(out,id+'.glb'),path.join(out,id),'gpu',{width:1200,height:1200});
 console.log('PASS cabinet snapshot: all furniture IDs retained in production exports and GPU front/oblique views');
})().catch(e=>{console.error(e);process.exitCode=1;});
