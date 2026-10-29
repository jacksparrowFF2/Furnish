async(page,V)=>{
 const results=[];
 for(const [mode,url,offline] of [['http',V.baseURL+'index.html',false],['file',V.fileBase+'index.html',true]]){
  const context=await page.context().browser().newContext({viewport:{width:1480,height:1050},offline}),p=await context.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));
  const check=(ok,m)=>{if(!ok)throw Error(mode+': '+m);},field=k=>p.locator(`[data-laundry-value="assembly.sink.${k}"]`),open=async()=>{await p.evaluate(()=>FurnishCabinetEditor.open('basin-joins'));await p.locator('#cab-preview canvas').waitFor();await V.revealCabinetSettings(p);};
  try{
   await p.goto(url);await p.locator('#lib').waitFor();
   await p.evaluate(()=>{let i=0;const at=ROOMS.find(r=>r.name==='客厅').at,f=FurnishKitchen.createLaundryCabinet({id:'basin-joins',cx:at[0],cy:at[1],rot:0,color:'#f3f1ec'},()=>`bj${++i}`,'right')[0];Object.assign(f,{w:1204,d:620});Object.assign(f.kitchen,{depth:600,counterDepth:620,baseHeight:870});f.kitchen.modules[0].width=564;Object.assign(f.kitchen.laundry,{notch:{side:'left',width:170,depth:220},assembly:{sink:{w:300,d:300,module:0,x:0,y:50,sinkNotch:{side:'left',width:100,depth:100}}}});mutate(()=>state.furniture=[f]);});
   await open();check(await field('sinkBowlHeight').inputValue()==='220','legacy inset depth');
   for(const [key,value] of [['w','420'],['d','380'],['sinkBowlHeight','260']]){await field(key).fill(value);await field(key).press('Enter');check(await field(key).inputValue()===value,'draft '+key);}
   await p.locator('#cab-kitchen-open-all').click();await p.waitForTimeout(350);await p.screenshot({path:V.output('playwright/laundry-basin-joins/'+mode+'-production.png')});
   await p.getByRole('button',{name:'保存柜体设计',exact:true}).click();
   const saved=()=>p.evaluate(()=>{const a=getF('basin-joins').kitchen.laundry.assembly.sink;return [a.w,a.d,a.sinkBowlHeight];});check(JSON.stringify(await saved())==='[420,380,260]','saved');
   await p.evaluate(()=>undo());check(JSON.stringify(await saved())==='[300,300,null]','undo');await p.evaluate(()=>redo());await V.waitForCache(p);await p.reload();check(JSON.stringify(await saved())==='[420,380,260]','refresh');
   await p.evaluate(async()=>{const T=await import('three'),f=structuredClone(getF('basin-joins'));delete f.kitchen.laundry.assembly;f.kitchen.laundry.countertop=false;
    const box=(w,h,d,color,x,y,z)=>{const m=new T.Mesh(new T.BoxGeometry(w,h,d),new T.MeshStandardMaterial({color}));m.position.set(x,y+h/2,z);return m;},scene=new T.Scene(),model=FurnishKitchenModel.build(T,f,box);model.traverse(o=>{if(o.userData.cabinetTop)o.visible=false;});scene.background=new T.Color('#eeeae2');scene.add(model,new T.HemisphereLight(0xffffff,0x8f8172,3));const light=new T.DirectionalLight(0xffffff,3);light.position.set(-1,3,2);scene.add(light);
    const camera=new T.PerspectiveCamera(35,1,.01,20);camera.position.set(-1.1,2.3,1.2);camera.lookAt(-.25,.3,-.02);const renderer=new T.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});renderer.setSize(700,700);renderer.render(scene,camera);const image=document.createElement('img');image.id='corner-verify';image.src=renderer.domElement.toDataURL();Object.assign(image.style,{position:'fixed',inset:'0',width:'700px',height:'700px',zIndex:999999});document.body.append(image);renderer.dispose();model.traverse(o=>{o.geometry?.dispose();});});
   await p.locator('#corner-verify').screenshot({path:V.output('playwright/laundry-basin-joins/'+mode+'-corner.png')});await p.locator('#corner-verify').evaluate(el=>el.remove());
   await open();await p.setViewportSize({width:390,height:844});await field('sinkBowlHeight').scrollIntoViewIfNeeded();check(await p.evaluate(()=>document.documentElement.scrollWidth<=390),'narrow overflow');await p.screenshot({path:V.output('playwright/laundry-basin-joins/'+mode+'-narrow.png')});
   check(!errors.length,errors.join(';'));results.push({mode,status:'PASS',errors});
  }finally{await context.close();}
 }
 return results;
}
