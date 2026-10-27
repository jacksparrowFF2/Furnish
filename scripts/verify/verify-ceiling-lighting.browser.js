async(page,V)=>{
 const results=[];
 for(const mode of ['http','file']){
  const context=await page.context().browser().newContext({viewport:{width:1440,height:1000},offline:mode==='file'}),p=await context.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));p.on('console',m=>{if(m.type()==='error'&&/Shader Error|VALIDATE_STATUS/.test(m.text()))errors.push(m.text());});
  try{
   await p.goto((mode==='file'?V.fileBase:V.baseURL)+'index.html');
   const setting=async selector=>{const control=p.locator(selector),menu=p.locator('details:has([data-t="lamps"])>summary');if(!await control.isVisible())await menu.click();await control.click();if(await menu.evaluate(el=>el.parentElement.open))await menu.click();};
   // Import a read-only snapshot of the current workspace through project UI.
   await p.evaluate(()=>{const input=document.createElement('input');input.type='file';input.id='strip-workspace';input.hidden=true;document.body.append(input);});
   await p.locator('#strip-workspace').setInputFiles(V.root+'/projects/workspace.furnish.json');
   await p.getByRole('button',{name:'工作台',exact:true}).click();await p.getByRole('button',{name:'备份／加载项目',exact:true}).click();
   await p.evaluate(async()=>{const raw=JSON.parse(await document.querySelector('#strip-workspace').files[0].text()),w=raw.workspace,packed=FurnishProject.pack({planId:w.planId,current:w.work[w.planId],designs:[],catalog:w.custom||[]}),transfer=new DataTransfer();transfer.items.add(new File([JSON.stringify(packed)],'lighting.furnish.json',{type:'application/json'}));const input=document.querySelector('#pr-file');input.files=transfer.files;input.dispatchEvent(new Event('change',{bubbles:true}));});
   await p.locator('#pr-restore-confirm').click();await p.locator('#dlg').waitFor({state:'hidden'});
   await p.evaluate(()=>{window.stripBuilds=[];window.stripBefore=true;const build=FurnishCeilingModel.build,wash=FurnishCeilingModel.applyWash;FurnishCeilingModel.build=(T,data,options={})=>{window.stripOptions=options;return build(T,data,options);};FurnishCeilingModel.applyWash=(T,g)=>{if(!window.stripBefore)wash(T,g);const lights=[];g.traverse(o=>{if(o.userData.ceilingStripLight)lights.push(o);});window.stripBuilds.push({lamps:window.stripOptions?.lamps,count:lights.length});};});
   await p.locator('[data-view="3d"]').click();await p.waitForFunction(()=>window.stripBuilds.length>0);await p.waitForTimeout(1500);
   if(!await p.locator('[data-t="night"]').evaluate(el=>el.classList.contains('on')))await setting('[data-t="night"]');
   await p.waitForTimeout(500);await p.screenshot({path:V.output('playwright/ceiling-lighting/'+mode+'-before.png')});
   await p.evaluate(()=>window.stripBefore=false);
   const toggle=()=>setting('[data-t="lamps"]');
   if(await p.locator('[data-t="lamps"]').evaluate(el=>el.classList.contains('on')))await toggle();await toggle();await p.waitForTimeout(1500);
   const enabled=await p.evaluate(()=>window.stripBuilds.at(-1));if(!enabled.count)throw Error('Current workspace has no active strip illumination');
   await p.screenshot({path:V.output('playwright/ceiling-lighting/'+mode+'-after.png')});
   await toggle();await p.waitForTimeout(300);if(await p.evaluate(()=>window.stripBuilds.at(-1).count)!==0)throw Error('Lamps off retained strip lights');
   await toggle();await p.waitForTimeout(300);if(await p.evaluate(()=>window.stripBuilds.at(-1).count)!==enabled.count)throw Error('Toggle changed light count');
   await setting('[data-cut="1.2"]');await p.waitForTimeout(300);if(await p.evaluate(()=>window.stripBuilds.at(-1).count)!==0)throw Error('Cut retained strip lights');
   await p.evaluate(async()=>{
    const T=await import('three'),C=FurnishCeiling,scene=new T.Scene(),renderer=new T.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});renderer.setSize(1200,800);renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1;renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;scene.background=new T.Color('#232323');
    const material=new T.MeshStandardMaterial({color:'#d4cfc5',roughness:.95}),box=(w,h,d,x,y,z)=>{const m=new T.Mesh(new T.BoxGeometry(w,h,d),material);m.position.set(x,y,z);m.castShadow=m.receiveShadow=true;scene.add(m);return m;};
    box(4.8,.1,3.6,2.4,-.05,1.8);box(4.8,2.7,.1,2.4,1.35,-.05);box(.1,2.7,3.6,4.85,1.35,1.8);box(.1,2.7,3.6,-.05,1.35,1.8);
    const polygon=[[0,0],[4800,0],[4800,3600],[0,3600]],profile={id:'reference',kind:'profile',roomId:'r',name:'reference',height:2700,path:{closed:true,join:'miter',segments:C.boundaryPaths({poly:polygon})},section:C.lowCove()},roof={id:'roof',kind:'flat',roomId:'r',name:'roof',height:2700,thickness:12,polygon};
    const group=FurnishCeilingModel.build(T,{version:1,items:[profile,roof]});scene.add(group);scene.add(new T.HemisphereLight('#fff9ef','#a6a29a',1.1));
    // Restrained daylight for a reference-like neutral room, not a black box.
    const daylight=new T.DirectionalLight('#eef4ff',.7);daylight.position.set(1,2,4);scene.add(daylight);
    const camera=new T.PerspectiveCamera(65,1.5,.03,50);camera.position.set(1.1,1.25,3.25);camera.lookAt(2.5,2,0);renderer.render(scene,camera);
    const host=document.createElement('div');host.id='strip-reference-render';host.style='position:fixed;inset:0;background:#232323;z-index:100000;display:grid;place-items:center';host.append(renderer.domElement);document.body.append(host);
    window.referenceLighting={scene,renderer,group,camera};
   });
   await p.locator('#strip-reference-render canvas').screenshot({path:V.output('playwright/ceiling-lighting/'+mode+'-interior.png')});
   await p.evaluate(()=>{referenceLighting.renderer.dispose();referenceLighting.renderer.forceContextLoss();document.querySelector('#strip-reference-render').remove();});
   if(errors.length)throw Error(errors.join('\n'));results.push({mode,passed:true,lights:enabled.count,offAndCut:true,screenshotBeforeAfter:true});
  }finally{await context.close();}
 }
 return results;
}
