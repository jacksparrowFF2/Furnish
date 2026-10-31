async (page,V)=>{
 const results=[],check=(ok,message)=>{if(!ok)throw Error(message);};
 if(V.desktop)return run(page,'desktop');
 for(const mode of ['http','file']){
  const context=await page.context().browser().newContext({viewport:{width:1500,height:950},offline:mode==='file'}),p=await context.newPage();
  try{await p.goto((mode==='file'?V.fileBase:V.baseURL)+'index.html');results.push(await run(p,mode));}finally{await context.close();}
 }
 return results;
 async function run(p,mode){
  const errors=[];p.on('pageerror',e=>errors.push(e.message));
  await p.waitForFunction(()=>typeof repositoryBooting!=='undefined'&&!repositoryBooting);
  await p.evaluate(()=>{
   const b=bbox(ROOMS.find(r=>r.counted!==false).poly);mutate(()=>{state.furniture=[{id:'tv-image-test',type:'tv',name:'自定义画面验收',cx:(b[0]+b[2])/2,cy:(b[1]+b[3])/2,w:1450,d:80,rot:0,color:'#222'}];delete state.objectLayers;});selectIds(['tv-image-test']);
   const apply=FurnishObservationLayers.applyScene;FurnishObservationLayers.applyScene=function(args){window.__tvScene=args.furnG;return apply(args);};
  });
  const png=await p.evaluate(()=>{const c=document.createElement('canvas');c.width=180;c.height=360;const x=c.getContext('2d');x.fillStyle='#2067cf';x.fillRect(0,0,180,180);x.fillStyle='#ee8a21';x.fillRect(0,180,180,180);return c.toDataURL('image/png').split(',')[1];});
  const upload=()=>p.locator('#tv-image-file').setInputFiles({name:'portrait.png',mimeType:'image/png',buffer:Buffer.from(png,'base64')});
  const initial=await p.evaluate(()=>undoStack.length);await upload();await p.waitForFunction(()=>!!getF('tv-image-test').tvImage);
  const saved=await p.evaluate(()=>getF('tv-image-test').tvImage);check(saved.startsWith('data:image/jpeg;base64,'),'image not normalized and embedded');check(await p.evaluate(n=>undoStack.length===n+1,initial),'upload must be one undo step');
  await p.locator('#tv-image-choose').scrollIntoViewIfNeeded();await p.screenshot({path:V.output('playwright/tv-image/'+mode+'-controls.png')});
  await p.evaluate(()=>undo());check(await p.evaluate(()=>!getF('tv-image-test').tvImage),'upload undo');await p.evaluate(()=>redo());check(await p.evaluate(s=>getF('tv-image-test').tvImage===s,saved),'upload redo');
  await p.locator('#tv-image-file').setInputFiles({name:'broken.png',mimeType:'image/png',buffer:Buffer.from('not a png')});await p.waitForFunction(()=>document.querySelector('#tv-image-choose')?.textContent!=='正在处理…');check(await p.evaluate(s=>getF('tv-image-test').tvImage===s,saved),'broken upload replaced current picture');
  await p.evaluate(()=>setView('3d'));await p.waitForFunction(()=>is3D()&&!switching);
  await p.waitForFunction(()=>window.__tvScene?.children.find(g=>g.userData.fid==='tv-image-test')?.children[2]?.material.userData.tvImageReady);
  const pixels=await p.evaluate(()=>{const m=__tvScene.children.find(g=>g.userData.fid==='tv-image-test').children[2].material,c=m.map.image,x=c.getContext('2d');return {left:[...x.getImageData(50,288,1,1).data],top:[...x.getImageData(512,80,1,1).data],bottom:[...x.getImageData(512,500,1,1).data]};});
  check(pixels.left[0]===0&&pixels.left[1]===0&&pixels.left[2]===0,'portrait picture needs black side bars');check(pixels.top[2]>pixels.top[0]+80&&pixels.bottom[0]>pixels.bottom[2]+80,'picture stretched, flipped or blank');
  await p.evaluate(()=>View3D.focusSelection());await p.waitForTimeout(1000);await p.screenshot({path:V.output('playwright/tv-image/'+mode+'-custom.png')});
  const glb=await p.evaluate(async()=>{const result=await View3D.blenderScene(),v=new DataView(result.buffer),json=JSON.parse(new TextDecoder().decode(new Uint8Array(result.buffer,20,v.getUint32(12,true)))),material=json.materials.find(m=>m.name==='Furnish TV picture'),texture=json.textures[material?.pbrMetallicRoughness?.baseColorTexture?.index],image=json.images[texture?.source];return {images:json.images?.length||0,tvEmbedded:Number.isInteger(image?.bufferView)&&!!material?.emissiveTexture};});check(glb.tvEmbedded,'production GLB lost the TV embedded picture');
  await p.evaluate(()=>{const material=__tvScene.children.find(g=>g.userData.fid==='tv-image-test').children[2].material;material.addEventListener('dispose',()=>window.__tvMaterialDisposed=true);material.map.addEventListener('dispose',()=>window.__tvTextureDisposed=true);});
  await p.locator('#tv-image-reset').click();check(await p.evaluate(()=>!getF('tv-image-test').tvImage),'reset default');await p.waitForFunction(()=>window.__tvMaterialDisposed&&window.__tvTextureDisposed);
  await p.evaluate(()=>undo());check(await p.evaluate(s=>getF('tv-image-test').tvImage===s,saved),'reset undo');
  await p.evaluate(()=>setView('2d'));await p.waitForFunction(()=>!switching);
  await p.evaluate(()=>mutate(()=>getF('tv-image-test').locked=true));check(await p.locator('#tv-image-choose').isDisabled(),'locked TV upload enabled');check(await p.locator('#tv-image-reset').isDisabled(),'locked TV reset enabled');await p.evaluate(()=>undo());
  if(V.desktop)await p.evaluate(()=>FurnishRepository.flush());else await V.waitForCache(p);
  await p.reload();await p.waitForFunction(()=>typeof repositoryBooting!=='undefined'&&!repositoryBooting);check(await p.evaluate(s=>getF('tv-image-test')?.tvImage===s,saved),'picture lost on save/reload');
  await p.evaluate(()=>selectIds(['tv-image-test']));await p.setViewportSize({width:390,height:844});check(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'narrow viewport overflow');await p.screenshot({path:V.output('playwright/tv-image/'+mode+'-narrow.png')});
  check(!errors.length,errors.join('\n'));return {mode,passed:true,pixels,glb};
 }
}
