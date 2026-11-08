/* Controlled old/new material comparison using actual production constructors.
 * Run verify-art-glass.cjs first to prepare the isolated application copy.
 * Pass a preserved pre-change art-glass-model.js as the only argument. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {pathToFileURL}=require('node:url'),{chromium}=require('playwright');
const root=path.resolve(__dirname,'../..'),run=path.join(root,'output/art-glass-garden-20261108');
async function main(){
 const before=fs.readFileSync(path.resolve(process.argv[2]),'utf8'),after=fs.readFileSync(path.join(root,'src/render/art-glass-model.js'),'utf8');
 fs.mkdirSync(run,{recursive:true});
 const browser=await chromium.launch({headless:true,channel:process.env.FURNISH_BROWSER_CHANNEL||'chrome'}),errors=[];
 try{
  const page=await browser.newPage({viewport:{width:1200,height:1100}});page.on('pageerror',e=>errors.push(e.message));
  await page.context().setOffline(true);await page.goto(pathToFileURL(path.join(root,'output/art-glass-verification/workspace/index.html')).href);
  await page.locator('#repository-loading').waitFor({state:'hidden'});
  const report={sources:{before:crypto.createHash('sha256').update(before).digest('hex'),after:crypto.createHash('sha256').update(after).digest('hex')},views:[]};
  for(const [version,source] of [['before',before],['after',after]]){
   await page.addScriptTag({content:source});
   for(const view of ['front','oblique']){
    const result=await page.evaluate(async({view})=>{
     const T=await import(JSON.parse(document.querySelector('script[type="importmap"]').textContent).imports.three),{RoomEnvironment}=await import('three/addons/environments/RoomEnvironment.js');
     const scene=new T.Scene(),group=new T.Group();scene.background=new T.Color('#dddcd8');scene.add(group);
     const patterns=Object.keys(FurnishProducts.artGlassPatterns),camera=new T.PerspectiveCamera(35,1,.01,30);
     camera.position.set(view==='front'?0:.65,.59,view==='front'?2.15:2.2);camera.lookAt(0,.59,0);
     const renderer=new T.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});renderer.setSize(1000,1000);renderer.setPixelRatio(1);renderer.toneMapping=T.ACESFilmicToneMapping;
     const env=new RoomEnvironment(),pm=new T.PMREMGenerator(renderer),target=pm.fromScene(env,.04);scene.environment=target.texture;
     for(const [i,pattern] of patterns.entries()){
      const f={id:'sample-'+pattern,type:'art_glass_partition',name:pattern,w:240,d:8,h:360,mountHeight:0,artGlassPattern:pattern,color:'#ffffff'},pane=FurnishArtGlassModel.build(T,f);
      pane.position.set((i%3-1)*.29,(2-Math.floor(i/3))*.41,0);pane.userData.fid=f.id;group.add(pane);
      const card=new T.Group();card.position.copy(pane.position);card.position.z=-.12;card.userData.fid='background-'+pattern;
      const back=new T.Mesh(new T.BoxGeometry(.26,.38,.008),new T.MeshStandardMaterial({color:'#d9cbb1'}));back.position.y=.18;card.add(back);
      for(let j=0;j<7;j++){const stripe=new T.Mesh(new T.BoxGeometry(.012,.30,.004),new T.MeshStandardMaterial({color:j%2?'#7eaa97':'#193746'}));stripe.position.set((j-3)*.032,.18,.01);stripe.name='stripe-'+j;card.add(stripe);}
      group.add(card);
     }
     scene.add(new T.HemisphereLight('#ffffff','#777777',1));const sun=new T.DirectionalLight('#ffffff',3);sun.position.set(-1,3,4);scene.add(sun);
     renderer.render(scene,camera);const png=renderer.domElement.toDataURL('image/png');
     const exported=await FurnishBlenderExport.encode(T,{groups:[group],camera,sun});
     const count=renderer.info.render.triangles;
     scene.traverse(o=>{o.geometry?.dispose();for(const m of new Set(Array.isArray(o.material)?o.material:o.material?[o.material]:[])){m.normalMap?.dispose();m.roughnessMap?.dispose();m.dispose();}});
     target.dispose();pm.dispose();env.dispose();renderer.dispose();
     return {png,glb:Array.from(new Uint8Array(exported.buffer)),triangles:count};
    },{view});
    fs.writeFileSync(path.join(run,`${version}-${view}.png`),Buffer.from(result.png.split(',')[1],'base64'));
    fs.writeFileSync(path.join(run,`${version}-${view}.glb`),Buffer.from(result.glb));report.views.push({version,view,triangles:result.triangles});
   }
  }
  assert.deepEqual(errors,[]);report.errors=errors;fs.writeFileSync(path.join(run,'surface-results.json'),JSON.stringify(report,null,2));console.log('PASS offline production old/new front/oblique WebGL and GLB comparison');
 }finally{await browser.close();}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
