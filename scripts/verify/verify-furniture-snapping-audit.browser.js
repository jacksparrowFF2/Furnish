async(page,V)=>{
 const results=[],check=(v,m)=>{if(!v)throw Error(m);};
 for(const mode of ['http','file']){
  const ctx=await page.context().browser().newContext({viewport:{width:1500,height:1000},offline:mode==='file'}),p=await ctx.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));
  const screen=async(x,y)=>p.evaluate(([x,y])=>{const q=svg.createSVGPoint(),a=drawingPoint([x,y]);q.x=a[0];q.y=a[1];const b=q.matrixTransform(svg.getScreenCTM());return {x:b.x,y:b.y};},[x,y]);
  try{
   await p.goto((mode==='file'?V.fileBase:V.baseURL)+'index.html');
   await p.evaluate(()=>{window.auditRooms=structuredClone(state.rooms);PLAN={...PLAN,bounds:{x:0,y:0,w:16000,h:14000},walls:[],wins:[],doors:[],slides:[],rooms:[{id:'audit-room',name:'家具吸附复查',at:[4500,3000],mat:'tile800',poly:[[0,0],[16000,0],[16000,14000],[0,14000]]}]};applyPlanData();state=freshWork(PLAN);state.rooms={...window.auditRooms,...state.rooms};ui.layers.furn=ui.layers.guides=ui.layers.wallSnap=true;});
   const types=['bed','sofa','desk','chair','fridge','curtain','aircon_midea_ultra_2hp','block'];let count=0;
   for(const type of types)for(const rot of [0,37,90])for(const flip of [false,true]){
    const setup=await p.evaluate(({type,rot,flip})=>{
     const row=LIB.flatMap(g=>g.items).find(r=>r[0]===type),a=rot*Math.PI/180,c=Math.cos(a),s=Math.sin(a),world=(x,y)=>({x:5000+x*c-y*s,y:5000+x*s+y*c});
     const at=world(1500+row[2]/2,-650),f={id:'audit-move',type,name:row[1],w:row[2],d:row[3],cx:at.x,cy:at.y,rot,flip,color:'#c9b39a'};
     const target=FurnishKitchen.configure({id:'audit-kitchen',type:'counter',cx:5000,cy:5000,w:2400,d:1800,rot,flip,color:'#cedbd3'},{version:1,shape:'L',depth:600,baseHeight:820,thickness:40,modules:[{run:0,width:2400,role:'door'},{run:1,width:1200,role:'door'}]});
     const tv=world(1515,-660);mutate(()=>state.furniture=[f,target,{id:'audit-tv',type:'tv',name:'邻近物体',cx:tv.x,cy:tv.y,w:80,d:200,rot,color:'#222'}]);selectIds([f.id]);renderAll();
     zoomToBox([2500,2500,10500,8500],100);return {cx:f.cx,cy:f.cy,c,s};
    },{type,rot,flip});
    const start=await screen(setup.cx,setup.cy),end=await screen(setup.cx+setup.c*10-setup.s*90,setup.cy+setup.s*10+setup.c*90);
    await p.mouse.move(start.x,start.y);await p.mouse.down();await p.mouse.move(end.x,end.y,{steps:5});await p.waitForFunction(()=>!canvasPointerFrame);
    const moved=await p.evaluate(()=>({cx:getF('audit-move').cx,cy:getF('audit-move').cy,kind:drag?.kind}));check(moved.kind==='move','actual move '+type);
    check(Math.abs((moved.cx-setup.cx)*setup.c+(moved.cy-setup.cy)*setup.s)<1e-4,JSON.stringify({type,rot,flip,setup,moved}));
    if(type==='sofa'&&rot===37&&flip)await p.screenshot({path:V.output('playwright/furniture-snapping-audit/'+mode+'-sofa-mirrored-oblique.png')});
    await p.mouse.up();await p.evaluate(()=>undo());check(await p.evaluate(({cx,cy})=>Math.hypot(getF('audit-move').cx-cx,getF('audit-move').cy-cy)<1e-4,setup),'undo move');await p.evaluate(()=>redo());count++;
   }
   for(const rot of [0,37,90])for(const flip of [false,true]){
    const data=await p.evaluate(({rot,flip})=>{
     const a=rot*Math.PI/180,c=Math.cos(a),s=Math.sin(a),f={id:'audit-ac',type:'aircon_midea_ultra_2hp',name:'曲面空调',cx:4000,cy:4000,w:395,d:436,h:1856,rot,flip,color:'#eee'},anchor={x:f.cx-f.w/2*c+f.d/2*s,y:f.cy-f.w/2*s-f.d/2*c},world=(x,y)=>({x:anchor.x+x*c-y*s,y:anchor.y+x*s+y*c}),at=world(570,390);
     const target={id:'audit-short-edge',type:'block',name:'短边界',cx:at.x,cy:at.y,w:100,d:20,h:500,rot,color:'#b5cec2'};mutate(()=>state.furniture=[f,target]);selectIds([f.id]);renderAll();zoomToBox([3400,3400,4800,4800],100);
     return {c,s,original:f.w};
    },{rot,flip});
    const box=await p.locator('#gSel [data-handle="size"][data-axis="w"] rect').last().boundingBox(),scale=await p.evaluate(()=>view.s),distance=580-data.original,start={x:box.x+box.width/2,y:box.y+box.height/2};
    await p.mouse.move(start.x,start.y);await p.mouse.down();await p.mouse.move(start.x+distance*scale*data.c,start.y+distance*scale*data.s,{steps:5});await p.waitForFunction(()=>!canvasPointerFrame);
    check(await p.evaluate(()=>ui.guides.some(g=>g.line)),'curve resize guide');check(await p.evaluate(()=>FurnishSnapping.nearest(getF('audit-ac'),{furniture:[getF('audit-short-edge')]}).distance<1e-4),'curve touches finite edge');
    if(rot===37&&flip)await p.screenshot({path:V.output('playwright/furniture-snapping-audit/'+mode+'-curved-resize.png')});await p.mouse.up();
   }
   const saved=await p.evaluate(()=>JSON.stringify(state.furniture));await V.waitForCache(p);await p.reload();check(await p.evaluate(()=>JSON.stringify(state.furniture))===saved,'refresh');
   check(!errors.length,errors.join(';'));results.push({mode,passed:true,moveTypes:types,moveGestures:count,rotations:[0,37,90],mirrors:true,curvedResizes:6,checks:['real pointers','finite curve contact','guides','undo/redo','reload']});
  }finally{await ctx.close();}
 }
 return results;
}
