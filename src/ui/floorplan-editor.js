/* Image tracing workspace; shares the existing app's plan, save and undo flow. */
(function () {
  'use strict';
  const copy=v=>JSON.parse(JSON.stringify(v));
  const text=(zh,en)=>tr(zh,en);


  const button=document.createElement('button');
  button.id='tracePlan'; button.className='btn outline'; button.dataset.en='Edit floor plan'; button.textContent='编辑户型';
  $('#planBtn').after(button);
  button.onclick=()=>openEditor();
  const menuButton=document.createElement('button');
  menuButton.id='editTracedPlan';menuButton.className='btn';menuButton.dataset.en='Edit traced plan / New plan';menuButton.textContent='编辑自定义户型 / 新建';
  $('#importJson').after(menuButton);menuButton.onclick=()=>{ $('#fileMenu').open=false;openEditor(); };

  window.FurnishEditor={open:forceNew=>openEditor(!!forceNew)};
  function openEditor(forceNew=false) {
    if(document.querySelector('.trace-overlay')) return;
    if(!forceNew&&!state.architecture&&!window.FurnishWorkspace.copyBuiltin())return;
    const originalArch=!forceNew&&state.architecture?FurnishProject.architecture(state.architecture):null;
    const original=originalArch?.draft;
    let revisingOriginal=false;let phase=originalArch?.phase||'survey',baseline=originalArch?.baseline?copy(originalArch.baseline):null;
    let draft=original?copy(original):{version:1,id:'custom_'+Date.now().toString(36),name:text('我的户型','My floor plan'),width:1000,height:700,image:'',scale:0,walls:[],openings:[]};
    let mode=original?'opening':'calibrate',anchor=null,cursor=null,box=[0,0,draft.width,draft.height],pan=null,loading=false,dirty=false;
    let zoneParent=null,areaPoints=[],areaParent=null,selectedArea=null,areaDrag=null,rectDrag=null,areaSnap=null,vertexAction=null,livePlan=null;
    let splitTarget=null,pathEndOnBoundary=false,regionFocus=null,pathDrag=null,splitOrthogonal=false,boundaryBase=null,boundaryPast=[],boundaryFuture=[];
    const zoneModes=['zone','zone-rect','zone-poly','zone-edit','zone-split-path'];
    // Content keys also detect wall drawing, which mutates the draft in place.
    const planCache=new Map();
    function cachedBuild(input){
      const key=JSON.stringify({...input,image:''});
      if(planCache.has(key)){const entry=planCache.get(key);if(entry.error)throw entry.error;return entry.plan;}
      let entry;try{entry={plan:FurnishDraft.build(input)};}catch(error){entry={error};}
      planCache.set(key,entry);if(planCache.size>6)planCache.delete(planCache.keys().next().value);
      if(entry.error)throw entry.error;return entry.plan;
    }
    let moveFrame=null,pendingMove=null,wallSnap=null;
    function cancelMove(){if(moveFrame!==null)window.cancelAnimationFrame(moveFrame);moveFrame=null;pendingMove=null;}
    function flushMove(){const event=pendingMove;cancelMove();if(event)movePointer(event);}
    let past=[],future=[],liveKey='',liveValue='',selectedWall=null,selectedWalls=[],chainGroup='',wallDrag=null,selectedOpening=null,openingDrag=null,pendingOpening=null;
    const overlay=document.createElement('div');overlay.className='trace-overlay';overlay.innerHTML=`
    <section class="trace-box" role="dialog" aria-modal="true" aria-labelledby="trace-title">
      <div class="trace-top"><h2 id="trace-title">${text('编辑户型','Edit floor plan')}</h2><input id="trace-name" aria-label="${text('户型名称','Plan name')}" maxlength="80" value="${esc(draft.name)}"><button class="btn" id="trace-new">${text('新建','New')}</button><button class="btn" id="trace-close">${text('取消','Cancel')}</button></div>
      <div class="trace-toolbar trace-tools">
        <button class="btn" data-trace-mode="opening">${text('门窗选择／拖动','Select / drag openings')}</button><button class="btn" data-trace-mode="properties">${text('墙属性','Wall properties')}</button><details class="trace-menu trace-area-tools"><summary class="btn">新建功能区 ▾</summary><div class="trace-menu-content"><button class="btn" data-trace-mode="zone">直线划分</button><button class="btn" data-trace-mode="zone-rect">绘制矩形</button><button class="btn" data-trace-mode="zone-poly">绘制多边形</button><small>已有区域的拆分、合并和改名，在右侧选择区域后操作。</small></div></details><button class="btn" data-trace-mode="zone-edit">调整功能区边界</button><button class="btn" data-trace-mode="wall">${text('描墙','Draw walls')}</button>
        <details class="trace-menu"><summary class="btn">${text('添加门窗','Add opening')}</summary><div class="trace-menu-content"><button class="btn" data-trace-mode="door">${text('添加门','Add door')}</button><button class="btn" data-trace-mode="window">${text('添加窗','Add window')}</button><button class="btn" data-trace-mode="bay">${text('添加飘窗','Add bay window')}</button></div></details>
        <button class="btn" data-trace-mode="erase">${text('删除','Erase')}</button><span class="trace-tool-spacer"></span><button class="btn" id="trace-undo">${text('撤销','Undo')}</button><button class="btn" id="trace-redo">${text('重做','Redo')}</button><button class="btn" id="trace-fit">${text('适应','Fit')}</button>
        <details class="trace-menu" ${original?'':'open'}><summary class="btn">${text('导入与底图','Import / reference')}</summary><div class="trace-menu-content"><button class="btn primary" id="trace-dxf">${text('导入 DXF','Import DXF')}</button><input type="file" id="trace-dxf-file" accept=".dxf" hidden><button class="btn" id="trace-templates">${text('DXF 模板与规范','DXF templates & guide')}</button><button class="btn" id="trace-upload">${text('导入图片／PDF','Image / PDF reference')}</button><input type="file" id="trace-file" accept="image/png,image/jpeg,image/webp,application/pdf,.pdf" hidden><button class="btn" data-trace-mode="calibrate">${text('校准图片比例','Calibrate image')}</button><label id="trace-image-setting">底图透明度 <input id="trace-opacity" type="range" min="0" max="1" step=".1" value=".65"></label><small>替换图纸将重新录入墙体；已有户型通常直接选择门窗或墙体编辑。</small></div></details>
      </div>
      <p class="trace-hint" id="trace-stage" role="status"></p>
      <div class="trace-layout">
      <div class="trace-work"><svg class="trace-canvas" id="trace-canvas" tabindex="0" aria-label="${text('户型描图画布','Floor plan tracing canvas')}"></svg><div class="trace-empty" id="trace-empty"><b>${text('先导入 DXF，或用图片描图','Import DXF, or trace an image')}</b><p>${text('DXF 保留尺寸；图片需要两点校准。文件仅保存在本机。','DXF preserves dimensions; images need calibration. Files stay on this device.')}</p></div></div>
        <aside class="trace-sidebar" aria-label="户型属性与工具设置"><h3 id="trace-sidebar-title">属性</h3><p class="trace-hint" id="trace-hint"></p>
      <div class="trace-toolbar" id="trace-settings">
        <label data-trace-setting="wall">墙厚 <input id="trace-thickness" type="number" min="60" max="600" step="10" value="200"> mm</label>
        <label data-trace-setting="wall">墙类型 <select id="trace-kind"><option value="n">非承重</option><option value="e">外墙</option><option value="b">承重</option></select></label>
        <label data-trace-setting="door window bay">洞口宽 <input id="trace-length" type="number" min="300" max="6000" step="50" value="900"> mm</label>
        <label data-window-field>窗台高 <input id="trace-window-sill" type="number" min="0" max="2400" value="900"> mm</label><label data-window-field>窗高 <input id="trace-window-height" type="number" min="100" max="2800" value="1500"> mm</label><label data-window-field>窗顶高（距地面） <input id="trace-window-head" type="number" max="2800" value="2400"> mm</label><label data-bay-field>飘窗类型 <select id="trace-bay-type"><option value="three-sided">三面玻璃飘窗（向外新增）</option><option value="recessed">正面窗飘窗（已有凹口／两侧实墙）</option></select></label><label data-bay-field>飘窗进深 <input id="trace-bay-depth" type="number" min="200" max="2000" value="600"> mm</label><label data-bay-field>飘窗台高 <input id="trace-bay-height" type="number" min="100" max="1800" value="450"> mm</label><label data-bay-field>窗户高度 <input id="trace-bay-window-height" type="number" min="100" max="2800" value="1950"> mm</label><label data-bay-field>窗顶高（距地面） <input id="trace-bay-head" type="number" max="2800" value="2400"> mm</label>
        <label data-trace-setting="door">门的类型 <select id="trace-door-type"><option value="single">单扇平开门</option><option value="double">对开门</option></select></label><label data-trace-setting="door"><input id="trace-entry" type="checkbox">入户门</label><label data-trace-setting="door">向内侧 <select id="trace-side"><option value="1">下／右</option><option value="-1">上／左</option></select></label><small data-trace-setting="door">保存户型后，选中门可切换向内开／向外开。</small>
      </div>
          <p id="trace-selection-empty">尚未选择墙体或门窗</p><div id="trace-properties" class="trace-toolbar" hidden></div>
        </aside>
      </div>
      <div class="trace-bottom"><div class="trace-status" id="trace-status" role="status" aria-live="polite"></div><button class="btn" id="trace-confirm">${text('确认原始结构并锁定','Confirm original structure')}</button><button class="btn" id="trace-unlock">${text('解锁并重新核对','Unlock original for correction')}</button><button class="btn primary" id="trace-finish">${text('生成户型，开始布置','Build plan & furnish')}</button></div>
    </section>`;
    document.body.append(overlay);
    const q=s=>overlay.querySelector(s),canvas=q('#trace-canvas');
    const splitTool=document.createElement('button');splitTool.className='btn';splitTool.dataset.traceMode='zone-split-path';splitTool.textContent='折线拆分区域';q('[data-trace-mode="zone-edit"]').after(splitTool);splitTool.hidden=true;splitTool.style.display='none';
    const areaHUD=document.createElement('div');areaHUD.id='area-live-hud';areaHUD.hidden=true;areaHUD.setAttribute('role','status');areaHUD.style.cssText='position:absolute;left:12px;top:12px;max-width:90%;padding:8px 12px;background:rgba(255,255,255,.94);border:1px solid #d2dbd5;border-radius:8px;color:#284139;font-size:13px;line-height:1.6;pointer-events:none;z-index:1';canvas.after(areaHUD);
    const report=(message,error=false)=>{q('#trace-status').textContent=message;q('#trace-status').classList.toggle('trace-error',error);};
    const hasBearing=()=>phase==='design'&&draft.walls.some(w=>w.kind==='b'||w.kind==='e');
    const locked=()=>report(text('承重墙已锁定：不能删除、改型或新开／删除门窗。请点击“解锁并重新核对原始结构”，修改后重新确认。','Bearing walls are locked: no deletion, reclassification or opening changes. Create a new plan to re-enter the original structure.'),true);
    const checkpoint=()=>{past.push(copy(draft));if(past.length>60)past.shift();future=[];dirty=true;};
    const setMode=m=>{if(boundaryBase)return report('请先应用或取消边界预览，再切换工具。',true);pathDrag=null;splitTarget=null;pathEndOnBoundary=false;vertexAction=null;areaSnap=null;areaPoints=[];areaParent=null;selectedArea=null;rectDrag=null;pendingOpening=null;selectedOpening=null;mode=m;anchor=null;cursor=null;wallSnap=null;if(m!=='properties'){selectedWall=null;selectedWalls=[];}render();};
    function render(){cancelMove();closeVertexMenu();
      const committedDraft=draft;if(pendingOpening)draft=pendingOpening.next;try{
      q('#trace-settings').hidden=!['wall','door','window','bay'].includes(mode);overlay.querySelectorAll('[data-trace-setting]').forEach(el=>el.hidden=!el.dataset.traceSetting.split(' ').includes(mode));q('#trace-image-setting').hidden=!draft.image;q('#trace-finish').disabled=!!pendingOpening||!!boundaryBase||mode==='zone-split-path'&&areaPoints.length>0;
      q('#trace-confirm').hidden=phase==='design';q('#trace-unlock').hidden=phase!=='design';overlay.querySelectorAll('[data-window-field]').forEach(el=>el.hidden=mode!=='window');q('#trace-confirm').style.display=phase==='design'?'none':'';overlay.querySelectorAll('[data-bay-field]').forEach(el=>el.hidden=mode!=='bay');
      q('#trace-stage').textContent=(phase==='design'?'装修设计 · 结构已锁定':'原始结构 · 未锁定')+' · '+(boundaryBase?'边界预览未应用':pendingOpening?'尺寸预览未确认':dirty?'修改未保存':'已保存');
      q('#trace-properties').hidden=!selectedWall&&!selectedOpening;q('#trace-selection-empty').hidden=!!selectedWall||!!selectedOpening||['wall','door','window','bay','calibrate','erase'].includes(mode);q('#trace-sidebar-title').textContent=selectedWall?'墙体属性':selectedOpening?'门窗属性':['wall','door','window','bay'].includes(mode)?'新增设置':'属性与操作';
      q('#trace-finish').textContent=phase==='survey'?text('保存原始结构（未锁定）','Save original structure (unlocked)'):text('保存装修方案，开始布置','Save design & furnish');
      canvas.setAttribute('viewBox',box.join(' '));
      q('#trace-empty').hidden=!!draft.image||draft.source==='dxf';
      q('#trace-empty').style.display=draft.image||draft.source==='dxf'?'none':'grid';
      q('#trace-undo').disabled=boundaryBase?!boundaryPast.length:!past.length;q('#trace-redo').disabled=boundaryBase?!boundaryFuture.length:!future.length;
      overlay.querySelectorAll('[data-trace-mode]').forEach(b=>b.classList.toggle('on',b.dataset.traceMode===mode));
      const hints={'zone-rect':'在空间内按住鼠标拖出矩形，松开后设置名称和用途；区域不能重叠或越过实际墙体。','zone-poly':'依次点击多边形顶点，点击起点或“完成多边形”闭合；支持斜边和凹多边形。Esc 取消。','zone-edit':'先选区域，再拖动橙色控制点或边中点。自动吸附墙面，Shift 可暂时关闭吸附。',zone:'先在要划分的空间内点击分界起点，再点击第二点确定水平或垂直方向；分界自动延伸到区域边缘，不添加实际墙体。可继续细分，或在下方删除分界。',opening:'点击门窗查看位置与尺寸；拖动主体沿墙移动，拖动橙色端点调整宽度。',bay:text('选择飘窗类型并设置尺寸，再点击外围墙。正面窗类型沿已有墙段向室内生成台面，保留两侧实墙；已有窗请在门窗属性中转换。进深从窗所在墙内表面量到台面前沿，台面不计使用面积。','Set width, depth and heights, then click a perimeter wall. Bay platforms are excluded from floor area.'),properties:text('点击墙体修改属性，拖动墙体对齐实际墙角（蓝圈）；拖端点可贴合另一面墙的实际表面，最短 50 mm。Shift 暂停吸附。确认原始结构后，承重墙和外墙仅可查看。','Click a wall to edit its type, thickness, position and length. Bearing/exterior walls become read-only after confirmation.'),calibrate:text('在底图上点击一条已知长度的两端，再输入实际长度（mm）。','Click both ends of a known length, then enter its actual length in mm.'),wall:text('沿墙中心线连续点击描墙，最短 50 mm；自动保持水平／垂直，吸附端点、墙角及另一面墙的实际表面。Shift 暂停吸附，Esc 结束一段。','Click along wall centerlines; horizontal/vertical locking and endpoint snapping. Esc ends a chain. Close the outline, then add partitions.'),door:text('点击已有墙段放门。入户门最多一扇；开启侧可在生成后通过属性调整。','Click a wall to place a door. One entry door maximum; adjust its swing later.'),window:text('点击已有墙段放窗；门窗会自动切开墙体洞口。','Click a wall to place a window. Openings cut through the wall.'),erase:text('点击门窗或墙体删除；删除墙体也会移除其门窗。','Click an opening or wall to delete it. Deleting a wall removes its openings.')};
      q('#trace-hint').textContent=hints[mode];
      if(mode==='zone-split-path')q('#trace-hint').textContent=splitTarget?(pathEndOnBoundary?'连线已选好，不再继续创建点。绿色端点可拖动重选；按 Enter 或点击“完成折线拆分”设置名称和用途。Esc 保留连线并停止预览。':'在所选区域外边界点击起点，依次点击折点，再点击外边界终点；直接连接两点时只需点击起点和终点。优先吸附已有控制点；绿色点可拖动重选。折线不能跨墙、孔洞或自交。Esc 取消。'):'先点击要拆分的区域，或在下方选择“折线拆分”；再从外边界绘制折线到另一处外边界。';
      const s=draft.scale||10, stroke=box[2]/900;
      let html=draft.image?`<image href="${draft.image}" x="0" y="0" width="${draft.width}" height="${draft.height}" opacity="${q('#trace-opacity').value}"/>`:'';
      try{const zones=cachedBuild(boundaryBase||draft).rooms;for(const r of zones)if(zoneModes.includes(mode)||r.zone)html+=`<path data-zone-room="${esc(r.id)}" ${r.areaId?'data-area="'+esc(r.areaId)+'"':''} d="${(r.rings||[r.poly]).map(p=>'M'+p.map(p=>p.map(v=>v/s).join(',')).join('L')+'Z').join(' ')}" fill-rule="evenodd" fill="${r.zone?'#a1cfba':'#dfe8ee'}" fill-opacity=".25" stroke="${r.id===regionFocus?'#1688cc':r.zone?'#139687':'none'}" stroke-dasharray="${stroke*6} ${stroke*4}" stroke-width="${stroke}"/><text pointer-events="none" x="${r.at[0]/s}" y="${r.at[1]/s}" text-anchor="middle" font-size="${stroke*12}">${esc(regionSetting(r).name)} · ${FurnishProject.area(r.poly).toFixed(2)} m²</text>`;}catch(e){}
      html+=draft.walls.map(w=>{const r=FurnishDraft.wallRect(w,s,draft.walls).slice(0,4).map(v=>v/s),color=w.kind==='b'?'#322e29':w.kind==='e'?'#736859':'#a17b54';return `<rect data-w="${esc(w.id)}" x="${r[0]}" y="${r[1]}" width="${r[2]-r[0]}" height="${r[3]-r[1]}" fill="${color}" opacity=".65" stroke="${selectedWalls.includes(w.id)||selectedWall===w.id?'#ef5a24':color}" stroke-width="${stroke*2}"><title>${esc(w.id)} · ${w.kind==='b'?'承重':w.kind==='e'?'外墙':'非承重'} · ${w.thickness} mm</title></rect><line x1="${w.a[0]}" y1="${w.a[1]}" x2="${w.b[0]}" y2="${w.b[1]}" stroke="${color}" stroke-width="${stroke}" stroke-dasharray="${stroke*5} ${stroke*3}" pointer-events="none"/>`;}).join('');
      try{const preview=cachedBuild(boundaryBase||draft);for(const r of preview.rooms.filter(v=>v.bayId))html+=`<polygon data-bay="${esc(r.bayId)}" points="${r.poly.map(p=>p.map(v=>v/s).join(',')).join(' ')}" fill="#e2dacb" stroke="#267bba" stroke-width="${stroke*2}" pointer-events="none"/>`;for(const w of preview.wins.filter(v=>v.bayId))html+=`<rect x="${w.rect[0]/s}" y="${w.rect[1]/s}" width="${(w.rect[2]-w.rect[0])/s}" height="${(w.rect[3]-w.rect[1])/s}" fill="#267bba" pointer-events="none"/>`;}catch(e){}
      for(const o of draft.openings){const w=draft.walls.find(w=>w.id===o.wall);if(!w)continue;const h=w.a[1]===w.b[1],c=w.a.map((v,i)=>v+(w.b[i]-v)*o.t),l=o.length/s/2;
        html+=`<line data-o="${esc(o.id)}" x1="${c[0]-(h?l:0)}" y1="${c[1]-(h?0:l)}" x2="${c[0]+(h?l:0)}" y2="${c[1]+(h?0:l)}" stroke="${o.kind==='window'?'#267bba':o.entry?'#e75d28':'#139687'}" stroke-width="${w.thickness/s+stroke*2}" style="cursor:${mode==='opening'?'ew-resize':'pointer'}"/>`;
        html+=`<text pointer-events="none" x="${c[0]}" y="${c[1]-stroke*8}" text-anchor="middle" font-size="${stroke*12}" fill="#343029">${o.bay?text('飘窗','Bay window'):o.kind==='window'?text('窗','Window'):o.entry?text('入户','Entry'):text('门','Door')} ${o.length}</text>`;
      }
      const chosen=draft.openings.find(o=>o.id===selectedOpening);
      for(const b of draft.beams||[]){const v=FurnishDraft.beamVertical(b,FurnishProject.ceilingHeight(state));html+=`<polygon data-beam="${esc(b.id)}" points="${b.poly.map(p=>p.join(',')).join(' ')}" fill="#9467bd" fill-opacity="0.22" stroke="#9467bd" stroke-dasharray="${stroke*8} ${stroke*5}" stroke-width="${stroke*2}" style="cursor:pointer"><title>${esc(b.name)} · 点击设置梁厚；${v?`梁底离地 ${v.bottom} mm / 梁厚 ${v.top-v.bottom} mm${v.assumed?' · 默认示意待核对':''}`:'高度待核对'}</title></polygon>`;}
      // Service points are references: keep zone fills and boundaries visible through them.
      for(const m of draft.markers||[]){const color=m.kind==='gas'?'#c35b20':'#087c9c';html+=`<g data-service="${esc(m.id)}"><title>${esc(m.name)} · ${esc(m.sourceLayer||'DXF')} · 竖管占位 Ø${FurnishDraft.serviceDiameter(m)} mm，不限制功能区边界</title><circle cx="${m.at[0]}" cy="${m.at[1]}" r="${FurnishDraft.serviceDiameter(m)/2/s}" fill="${zoneModes.includes(mode)?'none':'white'}" stroke="${color}" stroke-width="${stroke*2}"/><text x="${m.at[0]+FurnishDraft.serviceDiameter(m)/2/s+stroke*3}" y="${m.at[1]}" font-size="${stroke*12}" fill="${color}">${esc(m.name)}</text></g>`;}
      if(chosen){const w=draft.walls.find(w=>w.id===chosen.wall),axis=w.a[1]===w.b[1]?0:1,c=w.a.map((v,i)=>v+(w.b[i]-v)*chosen.t);if(!(phase==='design'&&w.kind!=='n'))html+=[-1,1].map(end=>{const p=[...c];p[axis]+=end*chosen.length/s/2;return `<circle data-o="${esc(chosen.id)}" data-opening-end="${end}" cx="${p[0]}" cy="${p[1]}" r="${stroke*6}" fill="#ef5a24" stroke="white" stroke-width="${stroke*2}"/>`;}).join('');}
      if(anchor&&cursor&&mode==='wall')html+=`<text x="${(anchor[0]+cursor[0])/2}" y="${(anchor[1]+cursor[1])/2-stroke*8}" font-size="${stroke*12}" fill="#a33">${Math.round(Math.hypot(cursor[0]-anchor[0],cursor[1]-anchor[1])*s)} mm</text>`;
      if(anchor&&cursor&&mode==='wall'&&Math.hypot(cursor[0]-anchor[0],cursor[1]-anchor[1])*s>=FurnishDraft.minWallLength){const w={id:'trace_preview',a:anchor,b:cursor,thickness:Number(q('#trace-thickness').value),kind:q('#trace-kind').value},r=FurnishDraft.wallRect(w,s,[...draft.walls,w]).map(v=>v/s);html+=`<rect x="${r[0]}" y="${r[1]}" width="${r[2]-r[0]}" height="${r[3]-r[1]}" fill="#ef5a24" fill-opacity=".2" stroke="#ef5a24" stroke-width="${stroke}" pointer-events="none"/>`;}
      if(anchor){html+=`<circle cx="${anchor[0]}" cy="${anchor[1]}" r="${stroke*5}" fill="#ef5a24"/>`;if(cursor)html+=`<line x1="${anchor[0]}" y1="${anchor[1]}" x2="${cursor[0]}" y2="${cursor[1]}" stroke="#ef5a24" stroke-width="${stroke*2}" stroke-dasharray="${stroke*6} ${stroke*4}"/>`;}
      const active=draft.walls.find(w=>w.id===selectedWall);
      if(active&&!(phase==='design'&&['b','e'].includes(active.kind)))html+=['a','b'].map(end=>`<circle data-end="${end}" cx="${active[end][0]}" cy="${active[end][1]}" r="${stroke*6}" fill="#ef5a24" stroke="white" stroke-width="${stroke*2}"><title>拖动端点：保持正交并吸附</title></circle>`).join('');
      if(selectedOpening&&q('#op-reference').value&&typeof openingDimensionSVG==='function')html+=openingDimensionSVG(FurnishDraft.openingDimension(draft,selectedOpening,q('#op-reference').value),s,stroke*12);
      if(rectDrag&&cursor){const a=rectDrag.start,b=cursor;html+=`<rect x="${Math.min(a[0],b[0])}" y="${Math.min(a[1],b[1])}" width="${Math.abs(b[0]-a[0])}" height="${Math.abs(b[1]-a[1])}" fill="#139687" fill-opacity=".18" stroke="#139687" stroke-width="${stroke*2}" pointer-events="none"/>`;}
      if(mode==='zone-split-path'&&splitTarget){const r=cachedBuild(draft).rooms.find(r=>r.id===splitTarget),z=draft.zones?.find(z=>z.id===splitTarget),points=z?.poly||(r?.poly||[]).map(p=>p.map(v=>v/s));for(const [i,p]of points.entries())html+=`<circle data-split-vertex="${i}" cx="${p[0]}" cy="${p[1]}" r="${stroke*6}" fill="#1688cc" stroke="white" stroke-width="${stroke*2}"/><text x="${p[0]+stroke*8}" y="${p[1]-stroke*8}" fill="#1688cc" font-size="${stroke*12}" pointer-events="none">${i+1}</text>`;}
      if(areaPoints.length){const points=[...areaPoints,...(cursor?[cursor]:[])];html+=`<polyline points="${points.map(p=>p.join(',')).join(' ')}" fill="none" stroke="#139687" stroke-width="${stroke*2}" pointer-events="none"/>`;for(const p of areaPoints)html+=`<circle cx="${p[0]}" cy="${p[1]}" r="${stroke*4}" fill="#139687" ${mode==='zone-split-path'?'data-path-point="'+areaPoints.indexOf(p)+'"':'pointer-events="none"'}/>`;}
      if(mode==='zone-split-path'&&splitTarget){const r=cachedBuild(draft).rooms.find(r=>r.id===splitTarget);if(r)html+=`<path d="${(r.rings||[r.poly]).map(ring=>'M'+ring.map(p=>p.map(v=>v/s).join(',')).join('L')+'Z').join(' ')}" fill="none" stroke="#1688cc" stroke-width="${stroke*3}" pointer-events="none"/>`;}
      if(mode==='zone-edit'){
        for(const [index,z]of (draft.zoneSplits||[]).entries())try{const parent=cachedBuild({...draft,zoneSplits:draft.zoneSplits.slice(0,index),zones:[]}).rooms.find(r=>r.id===z.parent),axis=z.axis,along=1-axis,edge=z.at*s,values=[];
          for(let i=0;i<parent.poly.length;i++){const a=parent.poly[i],b=parent.poly[(i+1)%parent.poly.length];if(a[axis]!==b[axis]&&edge>=Math.min(a[axis],b[axis])&&edge<=Math.max(a[axis],b[axis]))values.push(a[along]+(b[along]-a[along])*(edge-a[axis])/(b[axis]-a[axis]));}
          const sorted=[...new Set(values)].sort((a,b)=>a-b);for(let i=1;i<sorted.length;i++){const p=[0,0];p[axis]=edge;p[along]=(sorted[i-1]+sorted[i])/2;if(!inPoly(p[0],p[1],parent.poly))continue;const a=[...p],b=[...p];a[along]=sorted[i-1];b[along]=sorted[i];html+=`<line data-zone-split="${esc(z.id)}" x1="${a[0]/s}" y1="${a[1]/s}" x2="${b[0]/s}" y2="${b[1]/s}" stroke="#139687" stroke-width="${stroke*4}" stroke-dasharray="${stroke*7} ${stroke*4}"/><circle data-zone-split="${esc(z.id)}" cx="${p[0]/s}" cy="${p[1]/s}" r="${stroke*5}" fill="#ef5a24"/>`;}
        }catch(e){}
        const selected=draft.zones?.find(z=>z.id===selectedArea);if(selected)for(let i=0;i<selected.poly.length;i++){const a=selected.poly[i],b=selected.poly[(i+1)%selected.poly.length];html+=`<line data-area="${esc(selected.id)}" x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}" stroke="#ef5a24" stroke-width="${stroke*2}"/><circle data-area-edge="${i}" cx="${(a[0]+b[0])/2}" cy="${(a[1]+b[1])/2}" r="${stroke*4}" fill="#ef5a24" stroke="white" stroke-width="${stroke}"/><circle data-area-vertex="${i}" cx="${a[0]}" cy="${a[1]}" r="${stroke*6}" fill="#ef5a24" stroke="white" stroke-width="${stroke*2}"/>`;}
      }
      if(mode==='zone-edit'){const z=draft.zones?.find(z=>z.id===selectedArea);if(z)for(const [i,p]of z.poly.entries())html+=`<text x="${p[0]+stroke*8}" y="${p[1]-stroke*8}" font-size="${stroke*12}" fill="#b84714" stroke="white" stroke-width="${stroke*2}" paint-order="stroke" pointer-events="none">${i+1}</text>`;}
      if(mode==='zone-edit'){const z=draft.zones?.find(z=>z.id===selectedArea);if(z)for(const [i,a]of z.poly.entries()){const b=z.poly[(i+1)%z.poly.length],length=Math.hypot(b[0]-a[0],b[1]-a[1]);html+=`<text data-area-length="${i}" x="${(a[0]+b[0])/2}" y="${(a[1]+b[1])/2-stroke*10}" font-size="${stroke*15}" text-anchor="middle" fill="#b84714" stroke="white" stroke-width="${stroke*2}" paint-order="stroke" pointer-events="none">${(length*s).toFixed(1)} mm</text>`;}}
      canvas.innerHTML=html;
      if(wallSnap)canvas.insertAdjacentHTML('beforeend',`<g data-wall-snap="${wallSnap.kind}" pointer-events="none"><circle cx="${wallSnap.point[0]}" cy="${wallSnap.point[1]}" r="${stroke*7}" fill="none" stroke="#1688cc" stroke-width="${stroke*2}"/><text x="${wallSnap.point[0]+stroke*10}" y="${wallSnap.point[1]-stroke*10}" font-size="${stroke*12}" fill="#1688cc" stroke="white" stroke-width="${stroke*2}" paint-order="stroke">${wallSnap.kind==='face'?'墙面':'墙角'}已吸附</text></g>`);
      if(areaSnap)canvas.insertAdjacentHTML('beforeend',`<circle cx="${areaSnap.point[0]}" cy="${areaSnap.point[1]}" r="${stroke*7}" fill="none" stroke="#1688cc" stroke-width="${stroke*2}" pointer-events="none"><title>${areaSnap.label}</title></circle>`);
      if(areaSnap?.guides)for(const guide of areaSnap.guides){const a=[...guide.from],b=[...areaSnap.point];a[guide.axis]=b[guide.axis];canvas.insertAdjacentHTML('beforeend',`<line data-alignment-guide="${guide.axis}" x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}" stroke="#1688cc" stroke-width="${stroke}" stroke-dasharray="${stroke*5} ${stroke*3}" pointer-events="none"/>`);}
      let live=liveValue;const stable=boundaryBase||draft,nextKey=JSON.stringify([stable.walls,stable.openings,stable.scale,stable.zoneSplits,stable.zones,stable.regionSettings]);if(nextKey!==liveKey){try{const plan=cachedBuild(boundaryBase||draft);livePlan=plan;live=text(' · '+plan.rooms.filter(r=>r.counted!==false).length+' 个房间 · '+plan.rooms.filter(r=>r.counted!==false).reduce((n,r)=>n+FurnishProject.area(r.poly),0).toFixed(2)+' m²',' · '+plan.rooms.filter(r=>r.counted!==false).length+' rooms');}catch(e){livePlan=null;live=text(' · 墙线尚未闭合或门窗冲突',' · Incomplete walls or conflicting openings');}liveKey=nextKey;liveValue=live;}
      if(zoneModes.includes(mode)){
        q('#trace-properties').hidden=false;q('#trace-selection-empty').hidden=true;
        q('#trace-properties').innerHTML=(draft.zoneSplits||[]).map(z=>`<div><b>${esc(z.parts.map(p=>p.name).join(' / '))}</b><button class="btn" data-zone-remove="${esc(z.id)}">删除分界</button></div>`).join('')+(mode==='zone-poly'?`<button class="btn primary" id="area-complete" ${areaPoints.length<3?'disabled':''}>完成多边形</button><button class="btn" id="area-cancel">取消绘制</button>`:'');
        q('#trace-properties').querySelectorAll('[data-area-select]').forEach(b=>b.onclick=()=>selectRegionBoundary(b.dataset.areaSelect));
        if(livePlan){
          const rooms=livePlan.rooms.filter(r=>r.counted!==false),active=rooms.find(r=>r.id===(splitTarget||selectedArea||regionFocus))||rooms[0];
          if(active){regionFocus=active.id;q('#trace-sidebar-title').textContent='功能区';
            q('#trace-properties').insertAdjacentHTML('beforeend',`<section class="trace-region-card"><label class="trace-region-picker">当前区域<select id="region-picker" aria-label="选择功能区">${rooms.map(r=>`<option value="${esc(r.id)}" ${r.id===active.id?'selected':''}>${esc(regionSetting(r).name)} · ${FurnishProject.area(r.poly).toFixed(2)} m²</option>`).join('')}</select></label><div class="trace-region-summary"><b>${esc(regionSetting(active).name)}</b><strong>${FurnishProject.area(active.poly).toFixed(3)} <small>m²</small></strong></div><small>在图中点击区域，或从上方切换。</small><div class="trace-region-actions"><button class="btn" data-region-name="${esc(active.id)}">名称／用途</button><button class="btn primary" data-region-boundary="${esc(active.id)}">调整边界</button><button class="btn" data-region-split="${esc(active.id)}">折线拆分</button><button class="btn" data-region-merge="${esc(active.id)}">合并相邻区域</button></div><details class="trace-region-more"><summary>更多操作</summary><p>删除划分后恢复为未划分空间，实际墙体和全屋面积保留。</p><button class="btn danger" data-region-remove="${esc(active.id)}">删除区域划分</button></details></section>`);
            q('#region-picker').onchange=()=>{if(boundaryBase){render();return report('请先应用或取消边界预览。',true);}regionFocus=q('#region-picker').value;selectedArea=null;if(mode==='zone-split-path'){splitTarget=regionFocus;areaPoints=[];pathEndOnBoundary=false;}render();};
            q('#trace-properties').querySelector('[data-region-name="'+active.id+'"]').onclick=()=>regionNameDialog(active.id);
            q('#trace-properties').querySelector('[data-region-boundary="'+active.id+'"]').onclick=()=>selectRegionBoundary(active.id);
            q('#trace-properties').querySelector('[data-region-split="'+active.id+'"]').onclick=()=>{setMode('zone-split-path');splitTarget=active.id;regionFocus=active.id;render();};
            q('#trace-properties').querySelector('[data-region-merge="'+active.id+'"]').onclick=()=>mergeRegionDialog(active.id);
            q('#trace-properties').querySelector('[data-region-remove="'+active.id+'"]').onclick=()=>{try{const next=FurnishDraft.removeRegion(draft,active.id);checkpoint();draft=next;regionFocus=null;setMode('zone-edit');}catch(e){report(e.message,true);}};
          }
        }
        if(mode==='zone-split-path') {const target=livePlan?.rooms.find(r=>r.id===splitTarget),ready=areaPoints.length>=2&&pathEndOnBoundary,step=!target?'先选择要拆分的区域':!areaPoints.length?'第 1 步：点击蓝色边界设置起点':!ready?'第 2 步：点击折点，再点击蓝色边界设置终点':'第 3 步：完成拆分并设置名称／用途';q('#trace-properties').insertAdjacentHTML('beforeend',`<label class="trace-orthogonal"><input type="checkbox" id="area-path-orthogonal" ${splitOrthogonal?'checked':''}> 直角切割（水平／垂直）</label><p id="area-path-status" role="status">${areaSnap?esc(areaSnap.label)+'<br>':''}${target?'正在拆分：'+esc(regionSetting(target).name)+' · ':''}${step}</p><button class="btn primary" id="area-path-complete" ${ready?'':'disabled'} title="${step}">${ready?'完成折线拆分':!target?'请先选择区域':!areaPoints.length?'等待边界起点':'等待边界终点'}</button><button class="btn" id="area-path-cancel">退出折线拆分</button>`);q('#area-path-orthogonal').onchange=()=>{splitOrthogonal=q('#area-path-orthogonal').checked;cursor=null;render();};q('#area-path-complete').onclick=completeRegionPath;q('#area-path-cancel').onclick=()=>setMode('zone-edit');}
        if(mode==='zone-edit'&&selectedArea){q('#trace-properties').insertAdjacentHTML('beforeend','<button class="btn primary" id="area-boundary-apply">应用边界</button><button class="btn" id="area-boundary-cancel">取消边界调整</button><p>增删点和拖动均为预览，应用时检查最终区域；不合规时可继续调整。</p><button class="btn" id="area-precision">精确边界尺寸</button><small>共用边界联动调整；拖动时吸附墙面和顶点。按住 Shift 暂停吸附。尺寸坐标以画布左上角为原点，单位 mm。</small>');q('#area-boundary-apply').onclick=applyBoundaryPreview;q('#area-boundary-cancel').onclick=()=>{if(boundaryBase){draft=boundaryBase;boundaryBase=null;boundaryPast=[];boundaryFuture=[];areaDrag=null;areaSnap=null;render();}};q('#area-precision').onclick=areaPrecision;}
        if(mode==='zone-edit'&&selectedArea)q('#trace-properties').insertAdjacentHTML('beforeend',`<small id="area-vertex-hint">双击橙色边增加控制点；双击橙色控制点删除。也可右键打开就地菜单。拖动控制点形成折线，删除后连接前后两点。</small>`);
        if(mode==='zone-edit'&&livePlan){const rooms=livePlan.rooms.filter(r=>r.counted!==false),snap=areaSnap?`${areaSnap.label} · X ${(areaSnap.point[0]*s).toFixed(1)} / Y ${(areaSnap.point[1]*s).toFixed(1)} mm`:areaDrag?.shift?'吸附已暂停（Shift）':areaDrag?'未吸附':'拖动时显示吸附提示';q('#trace-properties').insertAdjacentHTML('beforeend',`<details class="trace-region-areas"><summary>全屋面积明细</summary>${rooms.map(r=>`<div data-live-area="${esc(r.id)}">${esc(regionSetting(r).name)} <b>${FurnishProject.area(r.poly).toFixed(3)}</b> m²</div>`).join('')}<div id="area-live-total">全屋合计 ${rooms.reduce((n,r)=>n+FurnishProject.area(r.poly),0).toFixed(6)} m²</div><p id="area-snap-status" role="status">${esc(snap)}</p></details>`);}
        if(boundaryBase){q('#region-picker').disabled=true;q('#area-precision').disabled=true;q('#trace-properties').querySelectorAll('[data-region-name],[data-region-boundary],[data-region-split],[data-region-merge],[data-region-remove]').forEach(b=>b.disabled=true);}q('#trace-properties').querySelectorAll('[data-area-remove]').forEach(b=>b.onclick=()=>{try{const next=FurnishDraft.removeZone(draft,b.dataset.areaRemove);checkpoint();draft=next;selectedArea=null;render();}catch(e){report(e.message,true);}});
        if(q('#area-complete'))q('#area-complete').onclick=completePolygon;if(q('#area-cancel'))q('#area-cancel').onclick=()=>{areaPoints=[];cursor=null;render();};
        q('#trace-properties').querySelectorAll('[data-zone-remove]').forEach(b=>{const button=document.createElement('button');button.className='btn';button.textContent='精确分界位置';button.onclick=()=>splitPrecision(b.dataset.zoneRemove);b.before(button);});
        q('#trace-properties').querySelectorAll('[data-zone-remove]').forEach(b=>b.onclick=()=>{try{const next=FurnishDraft.removeZoneSplit(draft,b.dataset.zoneRemove);checkpoint();draft=next;anchor=null;zoneParent=null;render();}catch(e){report(e.message,true);}});
      }
      areaHUD.hidden=mode!=='zone-edit'||!livePlan;if(!areaHUD.hidden){const rooms=livePlan.rooms.filter(r=>r.counted!==false),changed=new Set((draft.zones||[]).filter(z=>z.id===selectedArea||areaDrag&&JSON.stringify(z.poly)!==JSON.stringify(areaDrag.before.zones?.find(o=>o.id===z.id)?.poly)).map(z=>z.id)),snap=areaSnap?.label||(areaDrag?.shift?'吸附暂停（Shift）':areaDrag?'未吸附':'墙面／顶点吸附已启用');areaHUD.innerHTML=rooms.filter(r=>changed.has(r.id)).map(r=>`${esc(regionSetting(r).name)} <b>${FurnishProject.area(r.poly).toFixed(3)} m²</b>`).join(' · ')+`<div>全屋 ${rooms.reduce((n,r)=>n+FurnishProject.area(r.poly),0).toFixed(6)} m² · ${esc(snap)}</div>`;}
      report(boundaryBase?'边界预览未应用 · 面积显示上次已应用结果 · 完成调整后点击“应用边界”':draft.scale?`${draft.walls.length} 段墙 · ${draft.openings.length} 处门窗${draft.markers?.length?' · '+draft.markers.length+' 处水气点位':''}${live}${areaDrag?' · 边界联动调整中 · '+(areaSnap?.label|| (areaDrag.shift?'吸附暂停':'未吸附')):''}`:'导入图纸后开始录入；图片需先校准比例。');
      }finally{draft=committedDraft;}
    }
    function position(e){const p=canvas.createSVGPoint();p.x=e.clientX;p.y=e.clientY;const m=canvas.getScreenCTM();if(!m)return [0,0];const v=p.matrixTransform(m.inverse());return [v.x,v.y];}
    function wallSnapRadius(){const m=canvas.getScreenCTM();return m?12/Math.hypot(m.a,m.b):box[2]/100;}
    function snapped(p,e={}){
      let v=[Math.round(Math.max(0,Math.min(draft.width,p[0]))*100)/100,Math.round(Math.max(0,Math.min(draft.height,p[1]))*100)/100];
      const fixed=wallDrag?wallDrag.before.walls.find(w=>w.id===wallDrag.id)[wallDrag.end==='a'?'b':'a']:anchor;
      const axis=wallDrag?(wallDrag.before.walls.find(w=>w.id===wallDrag.id).a[1]===wallDrag.before.walls.find(w=>w.id===wallDrag.id).b[1]?0:1):fixed?(Math.abs(v[0]-fixed[0])>=Math.abs(v[1]-fixed[1])?0:1):null;
      if(fixed&&axis!==null)v[1-axis]=fixed[1-axis];
      const raw=[...v],radius=wallSnapRadius(),endpoints=draft.walls.filter(w=>w.id!==wallDrag?.id).flatMap(w=>[w.a,w.b]);wallSnap=null;
      if(e.shiftKey)return v;
      if(!fixed){const near=endpoints.map(p=>({p,d:Math.hypot(p[0]-v[0],p[1]-v[1])})).filter(p=>p.d<=radius).sort((a,b)=>a.d-b.d)[0];if(near)return [...near.p];}
      else {
        const wall=wallDrag?{...copy(wallDrag.before.walls.find(w=>w.id===wallDrag.id)),[wallDrag.end]:v}:{id:'trace_preview',a:[...fixed],b:v,thickness:Number(q('#trace-thickness').value),kind:q('#trace-kind').value};
        if(Math.hypot(wall.b[0]-wall.a[0],wall.b[1]-wall.a[1])>1e-6){wallSnap=FurnishDraft.snapWall(wallDrag?.before||draft,wall,{radius,mode:wallDrag?.end||'b'});if(wallSnap)return [...wallSnap.wall[wallDrag?.end||'b']];}
      }
      for(let k=0;k<2;k++){if(fixed&&k!==axis)continue;const near=endpoints.filter(a=>Math.abs(a[k]-v[k])<=radius&&(!fixed||Math.abs(a[k]-fixed[k])*draft.scale>=FurnishDraft.minWallLength-1e-6)).sort((a,b)=>Math.abs(a[k]-v[k])-Math.abs(b[k]-v[k]))[0];if(near)v[k]=near[k];}
      if(fixed&&Math.hypot(v[0]-fixed[0],v[1]-fixed[1])*draft.scale<FurnishDraft.minWallLength)return raw;
      return v;
    }
    function nearest(p){
      return draft.walls.map(w=>{const dx=w.b[0]-w.a[0],dy=w.b[1]-w.a[1],t=Math.max(0,Math.min(1,((p[0]-w.a[0])*dx+(p[1]-w.a[1])*dy)/(dx*dx+dy*dy)));return {w,t,d:Math.hypot(p[0]-w.a[0]-dx*t,p[1]-w.a[1]-dy*t)};}).sort((a,b)=>a.d-b.d)[0];
    }
    function boundaryPoly(z,type,i,target){
      const poly=copy(z.poly),a=z.poly[i];
      if(type==='vertex'){const rect=poly.length===4&&poly.every((a,i)=>{const b=poly[(i+1)%4];return a[0]===b[0]||a[1]===b[1];});if(rect){for(const p of poly)for(const axis of [0,1])if(p[axis]===a[axis])p[axis]=target[axis];}else poly[i]=target;}
      else{const j=(i+1)%poly.length,b=z.poly[j],len=Math.hypot(b[0]-a[0],b[1]-a[1]),n=[-(b[1]-a[1])/len,(b[0]-a[0])/len],mid=a.map((v,k)=>(v+b[k])/2),distance=target.reduce((v,p,k)=>v+(p-mid[k])*n[k],0);for(const k of [i,j])poly[k]=z.poly[k].map((v,axis)=>v+n[axis]*distance);}
      return poly.map(p=>p.map(v=>Math.round(v*draft.scale*1e6)/1e6/draft.scale));
    }
    function snapBoundary(target,drag,e){
      areaSnap=null;if(e.shiftKey)return target;
      const z=drag.before.zones.find(z=>z.id===drag.id),i=drag.index,a=z.poly[i],b=z.poly[(i+1)%z.poly.length],length=Math.hypot(b[0]-a[0],b[1]-a[1]),n=[-(b[1]-a[1])/length,(b[0]-a[0])/length],radius=8/Math.hypot(canvas.getScreenCTM().a,canvas.getScreenCTM().b),candidates=[];
      const onMoving=p=>drag.type==='vertex'?Math.hypot(p[0]-a[0],p[1]-a[1])<1e-6:Math.abs((p[0]-a[0])*n[0]+(p[1]-a[1])*n[1])<1e-6;
      const walls=drag.physical||=(cachedBuild(boundaryBase||drag.before).physicalRooms||[]).flatMap(r=>(r.rings||[r.poly]).map(poly=>poly.map(p=>p.map(v=>v/drag.before.scale))));
      const vertices=[...walls.flat(),...(drag.before.zones||[]).flatMap(o=>o.poly).filter(p=>!onMoving(p))];
      const add=(point,label)=>{const distance=Math.hypot(point[0]-target[0],point[1]-target[1]);if(distance<=radius)candidates.push({point,label,distance});};
      for(const p of vertices){if(drag.type==='vertex')add(p,'顶点吸附');else{const t=(p[0]-target[0])*n[0]+(p[1]-target[1])*n[1];add(target.map((v,k)=>v+t*n[k]),'顶点对齐');}}
      for(const poly of walls)for(let k=0;k<poly.length;k++){const p=poly[k],q=poly[(k+1)%poly.length],dx=q[0]-p[0],dy=q[1]-p[1],l2=dx*dx+dy*dy;if(drag.type==='edge'&&Math.abs(dx*n[0]+dy*n[1])>1e-5)continue;const t=Math.max(0,Math.min(1,((target[0]-p[0])*dx+(target[1]-p[1])*dy)/l2));add([p[0]+t*dx,p[1]+t*dy],'墙面吸附');}
      candidates.sort((a,b)=>(drag.type==='vertex'?Number(b.label==='顶点吸附')-Number(a.label==='顶点吸附'):0)||a.distance-b.distance);areaSnap=candidates[0]||null;
      if(drag.type==='vertex'&&areaSnap?.label!=='顶点吸附'){
        const aligned=alignPoint(areaSnap?.point||target,vertices.filter(p=>!onMoving(p)),radius);
        if(aligned.guides.length)areaSnap=aligned;
      }
      return areaSnap?areaSnap.point:target;
    }
    function alignPoint(target,vertices,radius){
      const point=[...target],guides=[];
      for(const axis of [0,1]){const near=vertices.map(p=>({p,d:Math.abs(p[axis]-target[axis])})).filter(v=>v.d<=radius).sort((a,b)=>a.d-b.d)[0];if(near){point[axis]=near.p[axis];guides.push({axis,from:near.p});}}
      return {point,guides,label:guides.length===2?'水平／垂直对齐':guides[0]?.axis===0?'垂直对齐':'水平对齐'};
    }
    function areaPrecision(){
      const base=copy(draft),z=base.zones.find(z=>z.id===selectedArea);if(!z)return;
      openDialog({title:'精确边界尺寸',body:`<label>调整对象 <select id="area-dimension-part">${z.poly.map((p,i)=>`<option value="edge:${i}">边 ${i+1} · 长 ${ (Math.hypot(p[0]-z.poly[(i+1)%z.poly.length][0],p[1]-z.poly[(i+1)%z.poly.length][1])*base.scale).toFixed(2)} mm</option><option value="vertex:${i}">顶点 ${i+1}</option>`).join('')}</select></label><div id="area-dimension-fields"></div><p>共用边界的相邻区域同步修改。正向偏移沿边的左法线；X 向右、Y 向下，坐标原点为画布左上角。</p><p id="area-dimension-error" class="trace-error" role="alert"></p>`,actions:[{label:'取消'},{label:'应用精确尺寸',cls:'primary',fn:()=>{try{const [type,index]=$('#area-dimension-part').value.split(':'),i=Number(index),a=z.poly[i],b=z.poly[(i+1)%z.poly.length],read=id=>{const el=$('#'+id);if(!el.value.trim()||!Number.isFinite(Number(el.value)))throw Error('请输入有效尺寸');return Number(el.value)/base.scale;};let target;if(type==='vertex')target=[read('area-dimension-x'),read('area-dimension-y')];else{const len=Math.hypot(b[0]-a[0],b[1]-a[1]),distance=read('area-dimension-offset');target=[(a[0]+b[0])/2-(b[1]-a[1])/len*distance,(a[1]+b[1])/2+(b[0]-a[0])/len*distance];}const next=FurnishDraft.editZoneBoundary(base,z.id,boundaryPoly(z,type,i,target),type==='edge'?{edge:i}:{});checkpoint();draft=next;render();return true;}catch(e){$('#area-dimension-error').textContent=e.message;return false;}}}]});$('#dlg').style.zIndex='90';
      const fields=()=>{const [type,index]=$('#area-dimension-part').value.split(':'),i=Number(index),p=z.poly[i],b=z.poly[(i+1)%z.poly.length],nx=p[1]-b[1],ny=b[0]-p[0],direction=(Math.abs(nx)>1e-6?(nx>0?'右':'左'):'')+(Math.abs(ny)>1e-6?(ny>0?'下':'上'):'');$('#area-dimension-fields').innerHTML=type==='edge'?`<label>法线偏移 mm（正值向${direction}）<input id="area-dimension-offset" type="number" step="0.1" value="0"></label><small>边 ${i+1} 连接顶点 ${i+1} 与 ${(i+1)%z.poly.length+1}。</small>`:`<label>X mm <input id="area-dimension-x" type="number" step="0.1" value="${p[0]*base.scale}"></label><label>Y mm <input id="area-dimension-y" type="number" step="0.1" value="${p[1]*base.scale}"></label>`;};$('#area-dimension-part').onchange=fields;fields();
    }
    function splitPrecision(id){
      const base=copy(draft),z=base.zoneSplits.find(z=>z.id===id);if(!z)return;
      openDialog({title:'精确分界位置',body:`<label>分界 ${z.axis?'Y':'X'} 坐标 mm <input id="split-dimension" type="number" step="0.1" value="${z.at*base.scale}"></label><p>坐标原点为画布左上角。两侧区域同步调整，名称与用途保持对应。</p><p id="split-dimension-error" class="trace-error" role="alert"></p>`,actions:[{label:'取消'},{label:'应用精确位置',cls:'primary',fn:()=>{try{const el=$('#split-dimension');if(!el.value.trim()||!Number.isFinite(Number(el.value)))throw Error('请输入有效坐标');const next=FurnishDraft.editZoneSplit(base,id,Number(el.value)/base.scale);checkpoint();draft=next;render();return true;}catch(e){$('#split-dimension-error').textContent=e.message;return false;}}}]});$('#dlg').style.zIndex='90';
    }
    var vertexMenu=null;
    function closeVertexMenu(){if(vertexMenu){vertexMenu.remove();vertexMenu=null;}}
    function applyBoundaryPreview(){
      if(!boundaryBase)return true;
      try{FurnishDraft.build(draft);const base=boundaryBase,next=copy(draft),changed=(next.zones||[]).filter(z=>z.id!==selectedArea&&JSON.stringify(z.poly)!==JSON.stringify(base.zones?.find(o=>o.id===z.id)?.poly));
        if(changed.length){const G=FurnishZoneGeometry,old=(base.zones||[]).map(z=>G.ringPath(z.rings||[z.poly])),now=(next.zones||[]).map(z=>G.ringPath(z.rings||[z.poly])),covered=(p,rs)=>rs.some(r=>G.inside(p,r));if(G.area(G.decompose([...old,...now],p=>covered(p,old)!==covered(p,now)))*draft.scale*draft.scale>.1)throw Error('共用边界产生缝隙或改变相邻区域覆盖范围，请继续调整控制点');}
        draft=base;checkpoint();draft=next;boundaryBase=null;boundaryPast=[];boundaryFuture=[];render();report('边界已应用，名称和用途保持不变。');return true;
      }catch(e){render();report('边界尚未应用：'+e.message+'。请调整控制点后再次应用。',true);return false;}
    }
    function editVertexAt(e){
      const z=draft.zones?.find(z=>z.id===selectedArea);if(mode!=='zone-edit'||!z)return;
      const p=position(e),radius=6/Math.hypot(canvas.getScreenCTM().a,canvas.getScreenCTM().b),near=z.poly.findIndex(a=>Math.hypot(a[0]-p[0],a[1]-p[1])<=radius),vertex=e.target.dataset.areaVertex??(near>=0?String(near):undefined);
      try{boundaryBase ||=copy(draft);let next;
        if(vertex!==undefined)next=FurnishDraft.deleteZoneVertex(draft,z.id,Number(vertex),{preview:true});
        else{const p=position(e),hits=z.poly.map((a,i)=>{const b=z.poly[(i+1)%z.poly.length],dx=b[0]-a[0],dy=b[1]-a[1],t=Math.max(0,Math.min(1,((p[0]-a[0])*dx+(p[1]-a[1])*dy)/(dx*dx+dy*dy)));return {i,t,d:Math.hypot(p[0]-a[0]-t*dx,p[1]-a[1]-t*dy)};}).sort((a,b)=>a.d-b.d),hit=hits[0];if(hit.d>10/Math.hypot(canvas.getScreenCTM().a,canvas.getScreenCTM().b))return;next=FurnishDraft.insertZoneVertex(draft,z.id,hit.i,hit.t,{preview:true});}
        boundaryPast.push(copy(draft));if(boundaryPast.length>60)boundaryPast.shift();boundaryFuture=[];draft=next;areaDrag=null;areaSnap=null;render();report(vertex!==undefined?'控制点已删除，前后两点已连接；可继续调整后应用。':'控制点已增加，可拖动新点形成折线，完成后应用。');
      }catch(err){const blocked=vertex!==undefined&&/超出原空间|跨越实际墙体|与其他功能区重叠/.test(err.message);report(blocked?'不能删除 '+(Number(vertex)+1)+' 号控制点：删除后会直连前后两点，这条边跨越墙体、其他房间或区域。请先移动相邻控制点。':'未应用：'+err.message,true);}finally{closeVertexMenu();}
    }
    canvas.addEventListener('dblclick',e=>{if(mode!=='zone-edit'||!selectedArea)return;e.preventDefault();editVertexAt(e);});
    canvas.addEventListener('contextmenu',e=>{
      if(mode!=='zone-edit'||!selectedArea)return;
      const vertex=e.target.dataset.areaVertex,edge=e.target.dataset.areaEdge;
      if(vertex===undefined&&edge===undefined&&e.target.dataset.area!==selectedArea)return;
      e.preventDefault();closeVertexMenu();vertexMenu=document.createElement('div');vertexMenu.className='trace-vertex-menu';vertexMenu.setAttribute('role','menu');
      vertexMenu.style.left=Math.max(8,Math.min(e.clientX,window.innerWidth-180))+'px';vertexMenu.style.top=Math.max(8,Math.min(e.clientY,window.innerHeight-60))+'px';
      const button=document.createElement('button');button.className='btn';button.setAttribute('role','menuitem');button.textContent=vertex!==undefined?'删除控制点':'增加控制点';button.onclick=()=>editVertexAt(e);vertexMenu.append(button);overlay.append(vertexMenu);button.focus();
    });
    function splitBoundarySnap(p){
      const r=cachedBuild(draft).rooms.find(r=>r.id===splitTarget);if(!r)return null;
      const z=draft.zones?.find(z=>z.id===splitTarget),outer=(r.rings||[r.poly]).find(poly=>FurnishZoneGeometry.signed(poly)>0),points=z?.poly||outer.map(p=>p.map(v=>v/draft.scale));
      const radius=12/Math.hypot(canvas.getScreenCTM().a,canvas.getScreenCTM().b),vertex=points.map((point,i)=>({point:[...point],i,d:Math.hypot(point[0]-p[0],point[1]-p[1])})).sort((a,b)=>a.d-b.d)[0];
      if(vertex.d<=radius)return {...vertex,label:'已吸附 '+(vertex.i+1)+' 号控制点',boundary:true};
      const edge=points.map((a,i)=>{const b=points[(i+1)%points.length],dx=b[0]-a[0],dy=b[1]-a[1],t=Math.max(0,Math.min(1,((p[0]-a[0])*dx+(p[1]-a[1])*dy)/(dx*dx+dy*dy))),point=[a[0]+dx*t,a[1]+dy*t];return {point,d:Math.hypot(point[0]-p[0],point[1]-p[1])};}).sort((a,b)=>a.d-b.d)[0];
      return {...edge,label:'已吸附边界',boundary:edge.d<=radius};
    }
    function splitPathSnap(p,e={}){
      if(!splitOrthogonal||!areaPoints.length){const hit=splitBoundarySnap(p);if(!hit||hit.boundary||e.shiftKey)return hit;const vertices=[...(draft.zones||[]).flatMap(z=>z.poly),...areaPoints],aligned=alignPoint(p,vertices,8/Math.hypot(canvas.getScreenCTM().a,canvas.getScreenCTM().b));return aligned.guides.length?{...aligned,boundary:false}:hit;}
      const last=areaPoints.at(-1),axis=Math.abs(p[0]-last[0])>=Math.abs(p[1]-last[1])?0:1,point=[...p];point[1-axis]=last[1-axis];
      const r=cachedBuild(draft).rooms.find(r=>r.id===splitTarget),z=draft.zones?.find(z=>z.id===splitTarget),outer=(r.rings||[r.poly]).find(poly=>FurnishZoneGeometry.signed(poly)>0),points=z?.poly||outer.map(p=>p.map(v=>v/draft.scale)),fixed=1-axis,candidates=[];
      for(let i=0;i<points.length;i++){const a=points[i],b=points[(i+1)%points.length],delta=b[fixed]-a[fixed];if(Math.abs(delta)<1e-9){if(Math.abs(a[fixed]-point[fixed])<1e-6){const q=[...point];q[axis]=Math.max(Math.min(a[axis],b[axis]),Math.min(Math.max(a[axis],b[axis]),point[axis]));candidates.push(q);}continue;}const t=(point[fixed]-a[fixed])/delta;if(t>=0&&t<=1){const q=[...point];q[axis]=a[axis]+t*(b[axis]-a[axis]);candidates.push(q);}}
      const nearest=candidates.sort((a,b)=>Math.hypot(a[0]-point[0],a[1]-point[1])-Math.hypot(b[0]-point[0],b[1]-point[1]))[0],radius=12/Math.hypot(canvas.getScreenCTM().a,canvas.getScreenCTM().b);
      if(nearest&&Math.hypot(nearest[0]-point[0],nearest[1]-point[1])<=radius)return {point:nearest,boundary:true,label:'直角切割 · 已吸附边界'};
      return {point,boundary:false,label:'直角切割'};
    }
    function orthogonalDrag(i,next){
      const points=copy(pathDrag.before);points[i]=[...next];
      for(const axis of [0,1]){const queue=[i],seen=new Set(queue);while(queue.length){const k=queue.shift();for(const n of [k-1,k+1])if(n>=0&&n<points.length&&!seen.has(n)&&Math.abs(pathDrag.before[k][axis]-pathDrag.before[n][axis])<1e-6){seen.add(n);points[n][axis]=next[axis];queue.push(n);}}}
      const ends=pathDrag.ended?[0,points.length-1]:[0];
      for(let pass=0;pass<4;pass++)for(const k of ends){const hit=splitBoundarySnap(points[k]);if(!hit.boundary)return null;for(const axis of [0,1]){const value=hit.point[axis],queue=[k],seen=new Set(queue);while(queue.length){const n=queue.shift();points[n][axis]=value;for(const m of [n-1,n+1])if(m>=0&&m<points.length&&!seen.has(m)&&Math.abs(pathDrag.before[n][axis]-pathDrag.before[m][axis])<1e-6){seen.add(m);queue.push(m);}}}}
      for(const k of ends){const hit=splitBoundarySnap(points[k]);if(!hit.boundary||Math.hypot(hit.point[0]-points[k][0],hit.point[1]-points[k][1])>1e-6)return null;}
      if(points.some((p,k)=>points.some((q,n)=>n!==k&&Math.hypot(q[0]-p[0],q[1]-p[1])*draft.scale<.01)))return null;
      return points;
    }
    canvas.addEventListener('pointerdown',e=>{
      closeVertexMenu();if(loading)return;if(pendingOpening){pendingOpening=null;render();} if(e.button===1||e.altKey){e.preventDefault();pan={p:position(e),box:[...box]};canvas.setPointerCapture(e.pointerId);return;}
      if(e.button!==0)return;e.preventDefault();canvas.focus();
      if(e.target.closest?.('[data-service],[data-beam]'))return;
      if(mode==='zone-edit'){
        const vertex=e.target.dataset.areaVertex,edge=e.target.dataset.areaEdge,split=e.target.dataset.zoneSplit;
        if(vertexAction){const z=draft.zones?.find(z=>z.id===selectedArea);if(!z)return;try{let next;
          if(vertexAction==='delete'){if(vertex===undefined)return report('请点击橙色顶点。');next=FurnishDraft.deleteZoneVertex(draft,z.id,Number(vertex));}
          else{if(vertex!==undefined)return report('请点击边的内部，不能重复增加现有顶点。');const p=position(e),edges=z.poly.map((a,i)=>{const b=z.poly[(i+1)%z.poly.length],dx=b[0]-a[0],dy=b[1]-a[1],t=Math.max(0,Math.min(1,((p[0]-a[0])*dx+(p[1]-a[1])*dy)/(dx*dx+dy*dy)));return {i,t,d:Math.hypot(p[0]-a[0]-t*dx,p[1]-a[1]-t*dy)};}).sort((a,b)=>a.d-b.d),hit=edges[0],radius=10/Math.hypot(canvas.getScreenCTM().a,canvas.getScreenCTM().b);if(hit.d>radius)return report('请点击选中区域的橙色边。');next=FurnishDraft.insertZoneVertex(draft,z.id,hit.i,hit.t);}
          checkpoint();draft=next;vertexAction=null;areaSnap=null;render();report('顶点修改已应用；共用边界、名称和用途保持对应。');
        }catch(err){report('未应用：'+err.message,true);}return;}
        if(vertex!==undefined||edge!==undefined||split){const z=split?draft.zoneSplits.find(z=>z.id===split):draft.zones.find(z=>z.id===selectedArea);if(!z)return;
          areaDrag={id:z.id,type:split?'split':vertex!==undefined?'vertex':'edge',index:Number(vertex??edge),before:copy(draft),start:position(e)};canvas.setPointerCapture(e.pointerId);return;}
        const roomId=e.target.dataset.zoneRoom;if(roomId){selectRegionBoundary(roomId);return;}const nextArea=e.target.dataset.area||null;if(nextArea!==selectedArea){selectedArea=nextArea;regionFocus=nextArea||regionFocus;render();}return;
      }
      const openingId=e.target.dataset.o;
      if(mode==='opening'){
        if(!openingId){selectedOpening=null;render();return;}
        selectedOpening=openingId;selectedWall=null;selectedWalls=[];openingProperties();
        const o=draft.openings.find(v=>v.id===openingId),w=draft.walls.find(v=>v.id===o.wall);if(phase==='design'&&w.kind!=='n')return locked();
        openingDrag={id:o.id,before:copy(draft),start:position(e),end:Number(e.target.dataset.openingEnd)||0};canvas.setPointerCapture(e.pointerId);return;
      }
      const end=e.target.dataset.end;if(end&&selectedWall){const w=draft.walls.find(w=>w.id===selectedWall);if(phase==='design'&&['b','e'].includes(w.kind))return locked();wallDrag={end,id:w.id,before:copy(draft)};canvas.setPointerCapture(e.pointerId);return;}
      if(!draft.image&&draft.source!=='dxf')return report(text('请先导入 DXF 或图片。','Import DXF or an image first.'),true);
      const p=position(e);
      if(p[0]<0||p[1]<0||p[0]>draft.width||p[1]>draft.height)return;
      if(mode==='zone-split-path'){
        if(e.target.dataset.pathPoint!==undefined){pathDrag={index:Number(e.target.dataset.pathPoint),before:copy(areaPoints),ended:pathEndOnBoundary};canvas.setPointerCapture(e.pointerId);return;}
        try{const plan=cachedBuild(draft);if(!splitTarget){const r=plan.rooms.find(r=>r.counted!==false&&inPoly(p[0]*draft.scale,p[1]*draft.scale,r.poly));if(!r)throw Error('请先选择要拆分的区域');splitTarget=r.id;render();return;}
          const hit=splitPathSnap(p,e),boundary=hit.boundary;areaSnap=boundary||hit.guides?.length?hit:null;
          if(!areaPoints.length&&!boundary)throw Error('请在蓝色外边界点击折线起点');if(pathEndOnBoundary)return report('起点和终点已选定，请点击“完成折线拆分”。');if(areaPoints.length>=100)throw Error('折线最多 100 个点');const point=hit.point&&(boundary||splitOrthogonal||hit.guides?.length)?hit.point:p;if(areaPoints.some(q=>Math.hypot(q[0]-point[0],q[1]-point[1])*draft.scale<.01))throw Error('请选另一个点，不能重复使用同一控制点');areaPoints.push([...point]);pathEndOnBoundary=boundary&&areaPoints.length>1;cursor=null;render();
        }catch(err){report('未应用：'+err.message,true);}return;
      }
      if(mode==='zone-rect'){
        try{rectDrag={start:p,parent:areaParentAt(p)};cursor=p;canvas.setPointerCapture(e.pointerId);render();}catch(e){report(e.message,true);}return;
      }
      if(mode==='zone-poly'){
        try{if(!areaPoints.length)areaParent=areaParentAt(p);
          if(areaPoints.length>=3&&Math.hypot(p[0]-areaPoints[0][0],p[1]-areaPoints[0][1])<box[2]/120){completePolygon();return;}
          if(!areaPoints.length||Math.hypot(p[0]-areaPoints.at(-1)[0],p[1]-areaPoints.at(-1)[1])>box[2]/1000){if(areaPoints.length>=100)throw Error('多边形最多 100 个顶点');areaPoints.push(p);}cursor=p;render();
        }catch(e){report(e.message,true);}return;
      }
      if(mode==='zone'){
        if(!draft.scale)return report('请先完成户型与比例。',true);
        if(!anchor){try{const room=cachedBuild({...draft,zones:[]}).rooms.find(r=>r.counted!==false&&inPoly(p[0]*draft.scale,p[1]*draft.scale,r.poly));if(!room)return report('请在要划分的房间或功能区内部点击。',true);zoneParent=room.id;anchor=p;cursor=p;render();}catch(e){report(e.message,true);}return;}
        if(Math.hypot(p[0]-anchor[0],p[1]-anchor[1])*draft.scale<100)return report('两点至少相距 100 mm。',true);
        const axis=Math.abs(p[0]-anchor[0])>=Math.abs(p[1]-anchor[1])?1:0,definition={id:'zone_'+uid(),parent:zoneParent,axis,at:Math.round(anchor[axis]*1e6)/1e6,parts:[{name:'客厅',use:'living'},{name:'餐厅',use:'dining'}]};
        anchor=null;cursor=null;
        try{const next=FurnishDraft.splitZone(draft,definition),rooms=cachedBuild(next).rooms.filter(r=>r.splitId===definition.id);zoneDialog(definition,rooms);}catch(e){render();report(e.message,true);}return;
      }
      if(mode==='calibrate'){
        if(hasBearing())return locked();
        if(draft.source==='dxf')return report(text('DXF 已按导入单位校准，无需图片校准。','DXF is calibrated using drawing units.'),true);
        if(!anchor){anchor=p;cursor=p;render();return;}
        const distance=Math.hypot(p[0]-anchor[0],p[1]-anchor[1]);if(distance<5)return report(text('请选相距更远的两点。','Choose points further apart.'),true);
        const a=[...anchor];anchor=null;
        openDialog({title:text('校准实际尺寸','Calibrate actual length'),body:`<p>${text('输入两点之间的实际长度，单位 mm。建议选择较长的已知尺寸。重新校准会更新所有墙体位置与房间面积。','Enter the actual distance in mm. Use a long known dimension. Recalibrating updates wall positions and room areas.')}</p><input id="trace-mm" type="number" min="100" max="100000" value="4000"><div id="trace-cal-error" class="trace-error" role="alert"></div>`,actions:[{label:text('取消','Cancel')},{label:text('应用比例','Apply scale'),cls:'primary',fn:()=>{const mm=Number($('#trace-mm').value),scale=mm/distance;if(!Number.isFinite(mm)||mm<100||mm>100000||Math.max(draft.width,draft.height)*scale>100000){$('#trace-cal-error').textContent=text('尺寸无效，图纸范围不能超过 100 米。','Invalid length; the image extent cannot exceed 100 m.');return false;}checkpoint();draft.scale=scale;draft.calibration={a,b:p,mm};setMode('wall');}}]});
        // Calibration dialog sits above the tracing workspace.
        $('#dlg').style.zIndex='90';return;
      }
      if(!draft.scale)return report(text('请先校准比例。','Calibrate first.'),true);
      if(mode==='wall'){
        const v=snapped(p,e);if(!anchor){chainGroup='trace_chain_'+uid();anchor=v;cursor=v;render();return;}
        const length=Math.hypot(v[0]-anchor[0],v[1]-anchor[1])*draft.scale,thickness=Number(q('#trace-thickness').value);
        if(length<FurnishDraft.minWallLength-1e-6)return report(text('墙段至少 50 mm。','Walls must be at least 50 mm.'),true);
        if(!Number.isFinite(thickness)||thickness<60||thickness>600||draft.walls.length>=100)return report(text('墙厚须为 60–600 mm，最多 100 段墙。','Thickness: 60–600 mm; maximum 100 walls.'),true);
        if(phase==='design'&&q('#trace-kind').value!=='n')return report(text('装修阶段只允许新建非承重墙。','Only new partitions are allowed during design.'),true);
        try{let next=copy(draft);next.walls.push({id:'w_'+uid(),a:[...anchor],b:v,thickness,kind:q('#trace-kind').value,group:chainGroup});if(next.zones?.length)next=FurnishDraft.fitZonesToWalls(next);checkpoint();draft=next;anchor=v;cursor=v;render();}catch(error){report(error.message,true);}return;
      }
      const hit=nearest(p);if(!hit||hit.d>Math.max(box[2]/60,hit.w.thickness/draft.scale))return report(text('请点击靠近墙中心的位置。','Click near a wall centerline.'),true);
      if(mode==='properties'){
        const w=draft.walls.find(w=>w.id===e.target.closest('[data-w]')?.dataset.w)||hit.w;
        selectedWalls=e.shiftKey?[...new Set([...selectedWalls,w.id])]:[w.id];wallProperties(w);
        if(!e.shiftKey&&!(phase==='design'&&['b','e'].includes(w.kind))){wallDrag={id:w.id,type:'move',start:p,before:copy(draft),client:[e.clientX,e.clientY]};canvas.setPointerCapture(e.pointerId);}return;
      }
      if(phase==='design'&&['b','e'].includes(hit.w.kind))return locked();
      if(mode==='erase'){
        const o=draft.openings.find(o=>o.wall===hit.w.id&&Math.abs(o.t-hit.t)*Math.hypot(hit.w.b[0]-hit.w.a[0],hit.w.b[1]-hit.w.a[1])*draft.scale<=o.length/2);
        try{let next=copy(draft);if(o)next.openings=next.openings.filter(v=>v.id!==o.id);else{next.walls=next.walls.filter(w=>w.id!==hit.w.id);next.openings=next.openings.filter(o=>o.wall!==hit.w.id);if(next.zones?.length)next=FurnishDraft.fitZonesToWalls(next);}checkpoint();draft=next;render();}catch(error){report(error.message,true);}return;
      }
      const length=Number(q('#trace-length').value),len=Math.hypot(hit.w.b[0]-hit.w.a[0],hit.w.b[1]-hit.w.a[1])*draft.scale,half=length/2;
      if(!Number.isFinite(length)||length<300||length>6000||hit.t*len-half<hit.w.thickness/2||(1-hit.t)*len-half<hit.w.thickness/2)return report(text('门窗宽度无效，或太靠近墙角。','Invalid opening width or too close to a wall corner.'),true);
      if(draft.openings.some(o=>o.wall===hit.w.id&&Math.abs(o.t-hit.t)*len<(o.length+length)/2))return report(text('门窗不能互相重叠。','Openings cannot overlap.'),true);
      const r=FurnishDraft.wallRect(hit.w,draft.scale,draft.walls),axis=hit.w.a[1]===hit.w.b[1]?0:1;
      const center=(hit.w.a[axis]+(hit.w.b[axis]-hit.w.a[axis])*hit.t)*draft.scale,rect=r.slice(0,4);rect[axis]=center-half;rect[axis+2]=center+half;
      if(draft.walls.some(w=>{if(w.id===hit.w.id)return false;const b=FurnishDraft.wallRect(w,draft.scale,draft.walls);return Math.min(b[2],rect[2])-Math.max(b[0],rect[0])>0&&Math.min(b[3],rect[3])-Math.max(b[1],rect[1])>0;}))return report(text('门窗不能跨越隔墙交接处，请换一个位置。','Openings cannot cross a wall junction. Choose another position.'),true);
      const entry=mode==='door'&&q('#trace-entry').checked;if(entry&&draft.openings.some(o=>o.entry))return report(text('已有入户门，请先删除或取消勾选。','An entry door already exists.'),true);
      const opening={id:'o_'+uid(),wall:hit.w.id,t:hit.t,length,kind:mode==='bay'?'window':mode,side:Number(q('#trace-side').value),entry,...(mode==='door'?{doorType:q('#trace-door-type').value}:{})};if(mode==='window'){opening.sill=Number(q('#trace-window-sill').value);const height=Number(q('#trace-window-height').value);opening.head=opening.sill+height;if(!Number.isFinite(height)||height<100||opening.sill<0||opening.head>2800)return report('窗台高须非负，窗高至少100 mm，窗顶不得超过2800 mm',true);}if(mode==='bay'){opening.bay={type:q('#trace-bay-type').value,depth:Number(q('#trace-bay-depth').value),height:Number(q('#trace-bay-height').value),head:Number(q('#trace-bay-head').value)};try{const test=copy(draft);test.openings.push(opening);cachedBuild(test);}catch(e){return report(e.message,true);}}checkpoint();draft.openings.push(opening);render();
    });
    function movePointer(e){
      if(pathDrag){const i=pathDrag.index,p=position(e),hit=splitBoundarySnap(p),endpoint=i===0||pathDrag.ended&&i===areaPoints.length-1;if(endpoint&&!hit.boundary)return;const next=hit.boundary?hit.point:p;if(areaPoints.some((q,k)=>k!==i&&Math.hypot(q[0]-next[0],q[1]-next[1])*draft.scale<.01))return;if(splitOrthogonal){const points=orthogonalDrag(i,next);if(!points)return;areaPoints=points;}else areaPoints[i]=[...next];areaSnap=hit.boundary?hit:null;cursor=null;render();return;}
      if(mode==='zone-split-path'&&pathEndOnBoundary){if(cursor){cursor=null;render();}return;}
      if(mode==='zone-split-path'&&splitTarget&&!pathEndOnBoundary){const p=position(e),hit=splitPathSnap(p,e);areaSnap=hit.boundary||hit.guides?.length?hit:null;cursor=areaPoints.length?(splitOrthogonal||hit.boundary||hit.guides?.length?hit.point:p):null;render();return;}

      if(areaDrag){areaDrag.shift=e.shiftKey;const before=areaDrag.before,p=position(e),delta=p.map((v,i)=>v-areaDrag.start[i]);if(!areaDrag.moved&&Math.hypot(...delta)*Math.hypot(canvas.getScreenCTM().a,canvas.getScreenCTM().b)<3)return;areaDrag.moved=true;if(areaDrag.type!=='split')boundaryBase ||=copy(before);try{
        if(areaDrag.type==='split'){const z=before.zoneSplits.find(z=>z.id===areaDrag.id);let at=z.at+delta[z.axis];if(!e.shiftKey){const radius=8/Math.hypot(canvas.getScreenCTM().a,canvas.getScreenCTM().b),points=(cachedBuild(before).physicalRooms||[]).flatMap(r=>r.poly.map(p=>p[z.axis]/before.scale)).concat((before.zones||[]).flatMap(o=>o.poly.map(p=>p[z.axis]))),near=points.filter(v=>Math.abs(v-at)<radius&&Math.abs(v-z.at)>1e-6).sort((a,b)=>Math.abs(a-at)-Math.abs(b-at))[0];if(near!==undefined)at=near;}draft=FurnishDraft.editZoneSplit(before,z.id,at);}
        else{const z=before.zones.find(z=>z.id===areaDrag.id),i=areaDrag.index,a=z.poly[i],b=z.poly[(i+1)%z.poly.length],origin=areaDrag.type==='vertex'?a:a.map((v,k)=>(v+b[k])/2),target=snapBoundary(origin.map((v,k)=>v+delta[k]),areaDrag,e);
          draft=FurnishDraft.editZoneBoundary(before,z.id,boundaryPoly(z,areaDrag.type,i,target),areaDrag.type==='edge'?{edge:i,preview:true}:{preview:true});
        }areaDrag.error=null;render();
      }catch(err){areaDrag.error=err.message;areaSnap=null;render();report('未应用，显示最后有效边界：'+err.message,true);}return;}
      if(rectDrag){cursor=position(e);render();return;}if(areaPoints.length){cursor=position(e);render();return;}
      if(openingDrag){
      const o=openingDrag.before.openings.find(v=>v.id===openingDrag.id),w=draft.walls.find(v=>v.id===o.wall),axis=w.a[1]===w.b[1]?0:1,p=position(e),delta=(p[axis]-openingDrag.start[axis])*draft.scale;
      const values=openingDrag.end?{length:Math.round(o.length+delta*openingDrag.end),t:o.t+delta/2/((w.b[axis]-w.a[axis])*draft.scale)}:{t:o.t+delta/((w.b[axis]-w.a[axis])*draft.scale)};
      try{draft=FurnishDraft.editOpening(openingDrag.before,o.id,values);openingDrag.error=null;render();report('门窗拖动中 · 宽 '+Math.round(draft.openings.find(v=>v.id===o.id).length)+' mm');}catch(err){openingDrag.error=err.message;report('未应用：'+err.message,true);}return;
    }if(wallDrag){
      const next=copy(wallDrag.before),w=next.walls.find(w=>w.id===wallDrag.id);wallSnap=null;
      if(wallDrag.type==='move'){
        if(!wallDrag.moved&&Math.hypot(e.clientX-wallDrag.client[0],e.clientY-wallDrag.client[1])<3)return;wallDrag.moved=true;
        const p=position(e),delta=p.map((v,k)=>v-wallDrag.start[k]);for(const end of ['a','b'])w[end]=w[end].map((v,k)=>v+delta[k]);
        if(!e.shiftKey){wallSnap=FurnishDraft.snapWall(next,w,{radius:wallSnapRadius()});if(wallSnap)Object.assign(w,wallSnap.wall);}
      }else{
        const old=w[wallDrag.end],p=snapped(position(e),e);
        for(const wall of next.walls)for(const end of ['a','b'])if(wall[end][0]===old[0]&&wall[end][1]===old[1]){if(phase==='design'&&['b','e'].includes(wall.kind))return locked();wall[end]=[...p];}
      }
      try{FurnishDraft.validate(next);if(phase==='design')FurnishProject.assertStructure(baseline,next);draft=next.zones?.length?FurnishDraft.fitZonesToWalls(next):next;render();report((wallSnap?(wallSnap.kind==='face'?'墙面':'墙角')+'已吸附 · ':e.shiftKey?'吸附暂停（Shift） · ':'墙体拖动 · ')+'当前长度 '+(Math.hypot(w.a[0]-w.b[0],w.a[1]-w.b[1])*draft.scale).toFixed(2)+' mm');}catch(err){wallSnap=null;render();report(err.message,true);}return;
    }if(pan){const p=position(e);box[0]+=pan.p[0]-p[0];box[1]+=pan.p[1]-p[1];render();return;}if(anchor){cursor=mode==='wall'?snapped(position(e),e):position(e);render();}}
    canvas.addEventListener('pointermove',e=>{
      if(!window.requestAnimationFrame)return movePointer(e);
      if(!pathDrag&&!areaDrag&&!rectDrag&&!openingDrag&&!wallDrag&&!pan&&!anchor&&!areaPoints.length&&mode!=='zone-split-path')return;
      pendingMove=e;if(moveFrame===null)moveFrame=window.requestAnimationFrame(flushMove);
    });
    const endPan=e=>{if(e.type==='pointercancel')cancelMove();else flushMove();pan=null;if(pathDrag){if(e.type==='pointercancel'){areaPoints=pathDrag.before;pathEndOnBoundary=pathDrag.ended;}pathDrag=null;cursor=null;render();return;}
      if(areaDrag&&areaDrag.type!=='split'){if(!areaDrag.moved){areaDrag=null;return;}if(e.type==='pointercancel')draft=areaDrag.before;else if(JSON.stringify(draft)!==JSON.stringify(areaDrag.before)){boundaryPast.push(areaDrag.before);if(boundaryPast.length>60)boundaryPast.shift();boundaryFuture=[];}areaDrag=null;areaSnap=null;render();return;}if(areaDrag){const before=areaDrag.before,error=areaDrag.error;if(!error&&JSON.stringify(before)===JSON.stringify(draft)){areaDrag=null;areaSnap=null;return;}areaDrag=null;areaSnap=null;if(e.type==='pointercancel'||error)draft=before;else if(JSON.stringify(before)!==JSON.stringify(draft)){past.push(before);if(past.length>60)past.shift();future=[];dirty=true;}render();if(error)report('未应用，已恢复原边界：'+error,true);return;}
      if(rectDrag){const r=rectDrag,end=position(e);rectDrag=null;cursor=null;if(e.type==='pointercancel'){render();return;}try{const a=r.start,poly=[[Math.min(a[0],end[0]),Math.min(a[1],end[1])],[Math.max(a[0],end[0]),Math.min(a[1],end[1])],[Math.max(a[0],end[0]),Math.max(a[1],end[1])],[Math.min(a[0],end[0]),Math.max(a[1],end[1])]];createArea(poly,r.parent);}catch(err){render();report(err.message,true);}return;}
      if(openingDrag){const before=openingDrag.before,error=openingDrag.error;openingDrag=null;if(e.type==='pointercancel')draft=before;else if(JSON.stringify(before)!==JSON.stringify(draft)){past.push(before);if(past.length>60)past.shift();future=[];dirty=true;}openingProperties();if(error&&e.type!=='pointercancel')report('未应用：'+error,true);}if(wallDrag){const before=wallDrag.before;wallDrag=null;wallSnap=null;if(e.type==='pointercancel'){draft=before;}else if(JSON.stringify(before)!==JSON.stringify(draft)){past.push(before);if(past.length>60)past.shift();future=[];dirty=true;}const w=draft.walls.find(w=>w.id===selectedWall);if(w)wallProperties(w);else render();}};canvas.addEventListener('pointerup',endPan);canvas.addEventListener('pointercancel',endPan);
    canvas.addEventListener('wheel',e=>{e.preventDefault();const action=FurnishNavigation.wheel(e);if(action.kind==='pan'){box=FurnishNavigation.panBox(box,canvas,action.x,action.y);render();return;}const p=position(e),factor=1/action.factor;if(box[2]*factor<draft.width/30||box[2]*factor>draft.width*5)return;box=[p[0]+(box[0]-p[0])*factor,p[1]+(box[1]-p[1])*factor,box[2]*factor,box[3]*factor];render();},{passive:false});
    overlay.querySelectorAll('[data-trace-mode]').forEach(b=>b.onclick=()=>{setMode(b.dataset.traceMode);overlay.querySelectorAll('.trace-menu').forEach(menu=>menu.open=false);});
    const undoDraft=()=>{if(boundaryBase){if(!boundaryPast.length)return;boundaryFuture.push(copy(draft));draft=boundaryPast.pop();areaDrag=null;areaSnap=null;render();return;}if(!past.length)return;vertexAction=null;areaSnap=null;wallSnap=null;future.push(copy(draft));draft=past.pop();pendingOpening=null;anchor=null;areaPoints=[];pathEndOnBoundary=false;rectDrag=null;selectedArea=null;selectedOpening=null;selectedWall=null;selectedWalls=[];dirty=true;render();};
    const redoDraft=()=>{if(boundaryBase){if(!boundaryFuture.length)return;boundaryPast.push(copy(draft));draft=boundaryFuture.pop();areaDrag=null;areaSnap=null;render();return;}if(!future.length)return;vertexAction=null;areaSnap=null;wallSnap=null;past.push(copy(draft));draft=future.pop();pendingOpening=null;anchor=null;areaPoints=[];pathEndOnBoundary=false;rectDrag=null;selectedArea=null;selectedOpening=null;selectedWall=null;dirty=true;render();};
    q('#trace-undo').onclick=undoDraft;q('#trace-redo').onclick=redoDraft;
    q('#trace-fit').onclick=()=>{box=[0,0,draft.width,draft.height];try{const plan=cachedBuild(draft),points=plan.rooms.filter(r=>r.bayId).flatMap(r=>r.poly.map(p=>p.map(v=>v/draft.scale)));if(points.length){const x=Math.min(0,...points.map(p=>p[0]))-30,y=Math.min(0,...points.map(p=>p[1]))-30;box=[x,y,Math.max(draft.width,...points.map(p=>p[0]))-x+30,Math.max(draft.height,...points.map(p=>p[1]))-y+30];}}catch(e){}render();};q('#trace-opacity').oninput=render;
    linkWindowHeightInputs(q('#trace-window-sill'),q('#trace-window-height'),q('#trace-window-head'));
    linkWindowHeightInputs(q('#trace-bay-height'),q('#trace-bay-window-height'),q('#trace-bay-head'));
    function key(e){if(!$('#dlg').hidden)return;e.stopImmediatePropagation();
      if(mode==='zone-split-path'&&pathEndOnBoundary&&areaPoints.length>=2&&!e.target.matches('input,select,textarea')){if(e.key==='Escape'){e.preventDefault();pathDrag=null;cursor=null;areaSnap=null;render();report('连线已保留，可按 Enter 或点击“完成折线拆分”确认。');return;}if(e.key==='Enter'){e.preventDefault();completeRegionPath();return;}}
      if(e.key==='Tab'){const controls=[...overlay.querySelectorAll('button,input,select,[tabindex="0"]')].filter(el=>!el.disabled&&el.getClientRects().length);const first=controls[0],last=controls.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}
      if(e.key==='Escape'){e.preventDefault();cancelMove();wallSnap=null;if(wallDrag){draft=wallDrag.before;wallDrag=null;const w=draft.walls.find(w=>w.id===selectedWall);if(w)wallProperties(w);else render();return;}if(boundaryBase){draft=boundaryBase;boundaryBase=null;boundaryPast=[];boundaryFuture=[];areaDrag=null;render();return;}pathDrag=null;closeVertexMenu();vertexAction=null;if(pendingOpening){pendingOpening=null;openingProperties();return;}if(areaDrag){draft=areaDrag.before;areaDrag=null;areaSnap=null;}rectDrag=null;areaPoints=[];pathEndOnBoundary=false;areaParent=null;anchor=null;cursor=null;if(mode==='zone-split-path')setMode('zone-edit');else render();}if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='z'&&!e.target.matches('input,select')){e.preventDefault();e.shiftKey?redoDraft():undoDraft();}}
    document.addEventListener('keydown',key,true);
    function areaParentAt(p){const plan=cachedBuild({...draft,zones:[]}),r=plan.rooms.find(r=>r.counted!==false&&inPoly(p[0]*draft.scale,p[1]*draft.scale,r.poly));if(!r)throw Error('请在可用的空间内部开始绘制。');return r.id;}
    function regionSetting(r){const explicit=draft.regionSettings?.find(s=>s.id===r.id);if(explicit)return {name:explicit.name,use:explicit.use};const existing=original&&state.rooms[r.id];return {name:existing?.name||r.name,use:existing?.use||r.use||FurnishDesign.inferUse(r)};}
    function selectRegionBoundary(id){if(boundaryBase)return report('请先应用或取消边界预览。',true);try{const room=cachedBuild(draft).rooms.find(r=>r.id===id),result=FurnishDraft.editableRegion(draft,id,'area_'+uid(),regionSetting(room));if(result.id!==id){checkpoint();draft=result.draft;}setMode('zone-edit');selectedArea=result.id;regionFocus=result.id;render();}catch(e){report(e.message,true);}}
    function regionNameDialog(id){const r=cachedBuild(draft).rooms.find(r=>r.id===id),setting=regionSetting(r);openDialog({title:'区域名称与用途',body:`<label>名称 <input id="region-edit-name" maxlength="80" value="${esc(setting.name)}"></label><label>用途 <select id="region-edit-use">${regionUseOptions(setting.use)}</select></label><p id="region-edit-error" class="trace-error" role="alert"></p>`,actions:[{label:'取消'},{label:'保存名称与用途',cls:'primary',fn:()=>{try{const next=FurnishDraft.setRegionSetting(draft,id,{name:$('#region-edit-name').value.trim(),use:$('#region-edit-use').value});checkpoint();draft=next;render();return true;}catch(e){$('#region-edit-error').textContent=e.message;return false;}}}]});$('#dlg').style.zIndex='90';}
    const regionUseOptions=use=>Object.entries(FurnishDesign.uses).filter(([k])=>k!=='bay').map(([k,n])=>`<option value="${k}" ${k===use?'selected':''}>${tr(...n)}</option>`).join('');
    function splitRoomNames(sourceId){
      const occupied=new Set(cachedBuild(draft).rooms.filter(r=>r.counted!==false&&r.id!==sourceId).map(r=>regionSetting(r).name.trim().replace(/\s+/g,'')));
      const names=[];for(let n=1;names.length<2;n++){const name='房间 '+n;if(!occupied.has(name.replace(/\s+/g,''))){names.push(name);occupied.add(name.replace(/\s+/g,''));}}return names;
    }
    function completeRegionPath(){
      if(areaPoints.length<2||!pathEndOnBoundary)return;try{const source=cachedBuild(draft).rooms.find(r=>r.id===splitTarget),setting=regionSetting(source),names=splitRoomNames(source.id),definition={line:copy(areaPoints),ids:['area_'+uid(),'area_'+uid()],parts:[1,2].map(i=>({name:names[i-1],use:setting.use,mat:state.rooms[source.id]?.mat||source.mat,materialExplicit:true}))},next=FurnishDraft.splitRegion(draft,splitTarget,definition),parts=cachedBuild(next).rooms.filter(r=>definition.ids.includes(r.id));
        openDialog({title:'拆分后的名称与用途',body:`<p>原区域 ${esc(setting.name)}：${FurnishProject.area(source.poly).toFixed(6)} m²。折线只划分功能，不添加墙体。</p>${definition.ids.map((id,i)=>`<fieldset><legend>区域 ${i+1} · ${FurnishProject.area(parts.find(r=>r.id===id).poly).toFixed(6)} m²</legend><label>名称 <input id="path-name-${i}" maxlength="80" value="${esc(definition.parts[i].name)}"></label><label>用途 <select id="path-use-${i}">${regionUseOptions(setting.use)}</select></label></fieldset>`).join('')}<p id="path-error" class="trace-error" role="alert"></p>`,actions:[{label:'取消',fn:()=>{areaPoints=[];pathEndOnBoundary=false;cursor=null;render();}},{label:'确认折线拆分',cls:'primary',fn:()=>{try{definition.parts=[0,1].map(i=>({name:$('#path-name-'+i).value.trim(),use:$('#path-use-'+i).value}));const next=FurnishDraft.splitRegion(draft,splitTarget,definition);checkpoint();draft=next;areaPoints=[];cursor=null;splitTarget=null;mode='zone-edit';selectedArea=definition.ids[0];render();return true;}catch(e){$('#path-error').textContent=e.message;return false;}}}]});$('#dlg').style.zIndex='90';
      }catch(err){report('未应用：'+err.message,true);}
    }
    function mergeRegionDialog(id){
      try{const base=copy(draft),plan=cachedBuild(base),room=plan.rooms.find(r=>r.id===id),others=plan.rooms.filter(r=>r.id!==id&&r.counted!==false&&(r.parentRoom||r.id)===(room?.parentRoom||room?.id));if(!room||!FurnishDraft.adjacentRegions(base,id).length)throw Error('该区域没有可合并的共边邻区');const first=regionSetting(room),mergedId='area_'+uid();
        const setting=r=>({...regionSetting(r),mat:state.rooms[r.id]?.mat||r.mat}),selected=()=>[room,...others.filter(r=>$('#merge-region-'+r.id).checked)],definition=()=>({id:mergedId,name:$('#merge-name').value.trim(),use:$('#merge-use').value,mat:$('#merge-mat').value});
        openDialog({title:'合并相邻区域',body:`<p>当前区域：${esc(first.name)}。勾选多个区域，须通过共边连通。</p><fieldset id="merge-regions"><legend>合并区域</legend>${others.map(r=>`<label><input type="checkbox" id="merge-region-${esc(r.id)}" data-merge-region="${esc(r.id)}"> ${esc(regionSetting(r).name)} · ${FurnishProject.area(r.poly).toFixed(6)} m²</label>`).join('')}</fieldset>${['name','use','mat'].map(k=>`<label>保留${{name:'名称',use:'用途',mat:'地面材料'}[k]}来源 <select id="merge-source-${k}"></select></label>`).join('')}<label>合并后名称 <input id="merge-name" maxlength="80" value="${esc(first.name)}"></label><label>合并后用途 <select id="merge-use">${regionUseOptions(first.use)}</select></label><label>合并后地面材料 <select id="merge-mat">${Object.entries(MATS).map(([k,m])=>`<option value="${esc(k)}">${esc(nm(m.name))}</option>`).join('')}</select></label><p id="merge-area" aria-live="polite"></p><svg id="merge-preview" role="img" aria-label="合并边界预览（包含孔洞）" style="width:100%;height:230px;background:#f3f5f7"></svg><p id="merge-error" class="trace-error" role="alert"></p>`,actions:[{label:'取消'},{label:'确认合并区域',cls:'primary',fn:()=>{try{const next=FurnishDraft.mergeRegions(base,selected().map(r=>r.id),definition());checkpoint();draft=next;areaPoints=[];cursor=null;splitTarget=null;mode='zone-edit';selectedArea=mergedId;render();return true;}catch(e){$('#merge-error').textContent=e.message;return false;}}}]});$('#dlg').style.zIndex='90';
        const preview=()=>{const svg=$('#merge-preview');svg.innerHTML='';$('#merge-area').textContent='';try{const next=FurnishDraft.mergeRegions(base,selected().map(r=>r.id),definition()),merged=cachedBuild(next).rooms.find(r=>r.id===mergedId),rings=merged.rings||[merged.poly],points=rings.flat(),xs=points.map(p=>p[0]),ys=points.map(p=>p[1]),x=Math.min(...xs),y=Math.min(...ys),w=Math.max(...xs)-x,h=Math.max(...ys)-y,pad=Math.max(w,h)*.06;svg.setAttribute('viewBox',`${x-pad} ${y-pad} ${w+2*pad} ${h+2*pad}`);svg.innerHTML=`<path d="${rings.map(r=>'M '+r.map(p=>p.join(',')).join(' L ')+' Z').join(' ')}" fill="#99d5b9" fill-rule="evenodd" stroke="#16754b" stroke-width="${Math.max(w,h)/180}"/>`;$('#merge-area').textContent=`${selected().length} 个区域 · 合并后面积 ${FurnishProject.area(merged.poly).toFixed(6)} m² · ${rings.length-1} 个孔洞`;$('#merge-error').textContent='';}catch(e){$('#merge-error').textContent=e.message;}};
        const sources=()=>{const rows=selected();for(const k of ['name','use','mat']){const el=$('#merge-source-'+k),old=el.value;el.innerHTML=rows.map(r=>`<option value="${esc(r.id)}">${esc(setting(r).name)}</option>`).join('');el.value=rows.some(r=>r.id===old)?old:id;$('#merge-'+k).value=setting(rows.find(r=>r.id===el.value))[k];}preview();};
        for(const k of ['name','use','mat']){$('#merge-source-'+k).onchange=()=>{$('#merge-'+k).value=setting(selected().find(r=>r.id===$('#merge-source-'+k).value))[k];preview();};$('#merge-'+k).oninput=preview;}
        $('#merge-regions').querySelectorAll('input').forEach(el=>el.onchange=sources);sources();
      }catch(err){report('未应用：'+err.message,true);}
    }
    function completePolygon(){if(areaPoints.length<3)return;try{createArea(areaPoints,areaParent);areaPoints=[];cursor=null;}catch(e){report(e.message,true);}}
    function createArea(poly,parent){
      const definition={id:'area_'+uid(),parent,poly:copy(poly),name:'客厅',use:'living'},next=FurnishDraft.addZone(draft,definition),room=cachedBuild(next).rooms.find(r=>r.id===definition.id);
      openDialog({title:'指定功能区名称与用途',body:`<p>区域面积：${FurnishProject.area(room.poly).toFixed(2)} m²。其余面积仍保留在原空间中。</p><label>名称 <input id="area-name" maxlength="80" value="客厅"></label><label>用途 <select id="area-use">${Object.entries(FurnishDesign.uses).filter(([k])=>k!=='bay').map(([k,n])=>`<option value="${k}" ${k==='living'?'selected':''}>${tr(...n)}</option>`).join('')}</select></label><p id="area-error" class="trace-error" role="alert"></p>`,actions:[{label:'取消',fn:()=>{areaPoints=[];cursor=null;render();}},{label:'保存指定功能区',cls:'primary',fn:()=>{try{definition.name=$('#area-name').value.trim();definition.use=$('#area-use').value;const next=FurnishDraft.addZone(draft,definition);checkpoint();draft=next;areaPoints=[];selectedArea=definition.id;mode='zone-edit';render();return true;}catch(e){$('#area-error').textContent=e.message;return false;}}}]});$('#dlg').style.zIndex='90';
    }
    function zoneDialog(definition,rooms){
      const labels=definition.axis?['上侧区域','下侧区域']:['左侧区域','右侧区域'];
      openDialog({title:text('功能区名称与用途','Functional area names & uses'),body:`<p>分界只用于功能区与面积统计；墙体、门窗和顶部房梁保持原样。</p>${rooms.map((r,i)=>`<fieldset><legend>${labels[i]} · ${FurnishProject.area(r.poly).toFixed(2)} m²</legend><label>名称 <input id="zone-name-${i}" maxlength="80" value="${definition.parts[i].name}"></label><label>用途 <select id="zone-use-${i}">${Object.entries(FurnishDesign.uses).filter(([k])=>k!=='bay').map(([k,n])=>`<option value="${k}" ${k===definition.parts[i].use?'selected':''}>${tr(...n)}</option>`).join('')}</select></label></fieldset>`).join('')}<p id="zone-error" role="alert" class="trace-error"></p>`,actions:[{label:text('取消','Cancel'),fn:()=>{render();}},{label:text('保存功能区','Save functional areas'),cls:'primary',fn:()=>{try{definition.parts=[0,1].map(i=>({name:$('#zone-name-'+i).value.trim(),use:$('#zone-use-'+i).value}));const next=FurnishDraft.splitZone(draft,definition);checkpoint();draft=next;render();return true;}catch(e){$('#zone-error').textContent=e.message;return false;}}}]});$('#dlg').style.zIndex='90';
    }
    function openingProperties(){
      const o=draft.openings.find(v=>v.id===selectedOpening);if(!o){selectedOpening=null;render();return;}
      const base=copy(draft),w=draft.walls.find(v=>v.id===o.wall),readonly=phase==='design'&&w.kind!=='n',refs=FurnishDraft.openingReferences(draft,o.id),ref=refs.find(r=>r.id===o.reference)||refs[0];
      q('#trace-properties').innerHTML=`<label>参考墙面<select id="op-reference">${refs.map(r=>`<option value="${esc(r.id)}" ${r.id===ref?.id?'selected':''}>${esc(r.label)}</option>`).join('')}</select></label><label>洞口边缘距墙面 mm<input id="op-position" type="number" min="0" step="1" value="${Math.round(ref?.distance||0)}"></label><label>洞口宽 mm<input id="op-width" type="number" min="300" max="6000" value="${o.length}"></label>${o.kind==='window'?`<label>窗类型<select id="op-type"><option value="plain" ${!o.bay?'selected':''}>普通窗</option><option value="recessed" ${o.bay?.type==='recessed'?'selected':''}>正面窗飘窗（已有凹口／两侧实墙）</option><option value="three-sided" ${o.bay&&o.bay.type!=='recessed'?'selected':''}>三面玻璃飘窗（向外新增）</option></select></label><label>飘窗进深 mm<input id="op-depth" type="number" min="200" max="2000" value="${o.bay?.depth??600}"></label><small>正面窗类型从现有墙内表面向室内生成台面，宽度按墙段内轮廓裁切；进深请实测。</small>`:''}${o.kind==='window'?`<label>窗台高 mm<input id="op-sill" type="number" value="${o.bay?.height??o.sill??900}"></label><label>窗户高度 mm<input id="op-height" type="number" min="100" value="${(o.bay?.head??o.head??2400)-(o.bay?.height??o.sill??900)}"></label><label>窗顶高（距地面）mm<input id="op-head" type="number" max="2800" value="${o.bay?.head??o.head??2400}"></label><small>窗户高度 = 窗顶高 − 窗台高，两项自动联动；修改窗台高时保持窗户高度。</small>`:''}<button class="btn primary" id="op-apply">确认修改</button><button class="btn" id="op-cancel">取消预览</button><small>${readonly?'结构已锁定，请解锁核对。':'输入即时预览，确认后记录；绿色为参考墙面与净距。'}</small>`;
      q('#trace-properties').querySelectorAll('input,select,#op-apply').forEach(el=>el.disabled=readonly);
      const read=()=>{if(readonly)throw Error('原始结构已锁定');const ids=['op-position','op-width',...(o.kind==='window'?['op-sill','op-height','op-head',...(q('#op-type').value==='plain'?[]:['op-depth'])]:[])];if(ids.some(id=>q('#'+id).value.trim()===''))throw Error('请输入完整尺寸');const values=FurnishDraft.openingPlacement(base,o.id,q('#op-reference').value,Number(q('#op-position').value),Number(q('#op-width').value));if(o.kind==='window'){const height=Number(q('#op-height').value);if(!Number.isFinite(height)||height<100)throw Error('窗高至少100 mm');values.sill=Number(q('#op-sill').value);values.head=values.sill+height;values.bay=q('#op-type').value==='plain'?undefined:{type:q('#op-type').value,depth:Number(q('#op-depth').value),height:values.sill,head:values.head};}const next=FurnishDraft.editOpening(base,o.id,values);if(phase==='design')FurnishProject.assertStructure(baseline,next);return next;};
      const preview=()=>{try{pendingOpening={next:read(),before:base};render();report('尺寸预览中 · 确认修改后记录，取消可恢复。');}catch(err){pendingOpening=null;render();report('未应用：'+err.message,true);}};
      ['op-position','op-width',...(o.kind==='window'?['op-sill','op-height','op-head',...(q('#op-type').value==='plain'?[]:['op-depth'])]:[])].forEach(id=>q('#'+id).oninput=preview);
      if(o.kind==='window'){linkWindowHeightInputs(q('#op-sill'),q('#op-height'),q('#op-head'));q('#op-type').onchange=preview;q('#op-depth').oninput=preview;}
      q('#op-reference').onchange=()=>{const ref=FurnishDraft.openingReferences(pendingOpening?.next||base,o.id).find(r=>r.id===q('#op-reference').value);if(ref)q('#op-position').value=String(Math.round(ref.distance));preview();};
      q('#op-apply').onclick=()=>{try{const next=read();pendingOpening=null;checkpoint();draft=next;openingProperties();report('门窗修改已确认，保存户型后同步主画布。');}catch(err){report('未应用：'+err.message,true);}};
      q('#op-cancel').onclick=()=>{pendingOpening=null;openingProperties();};render();
    }
    function showWallPanel(options){
      const panel=q('#trace-properties');panel.hidden=false;panel.innerHTML='<div style="width:100%">'+options.body+'<button class="btn primary" id="wp-apply">'+text('应用墙属性','Apply wall properties')+'</button><button class="btn" id="wp-close">'+text('取消选择','Clear selection')+'</button></div>';
      const action=options.actions.find(a=>a.fn);q('#wp-apply').hidden=!action;q('#wp-apply').onclick=()=>{if(action.fn()!==false){const w=draft.walls.find(w=>w.id===selectedWall);if(w)wallProperties(w);}};
      q('#wp-close').onclick=()=>{selectedWall=null;selectedWalls=[];render();};
    }
    function wallProperties(w){selectedWall=w.id;if(!selectedWalls.includes(w.id))selectedWalls=[w.id];render();
      const readOnly=phase==='design'&&['b','e'].includes(w.kind),h=w.a[1]===w.b[1],length=Math.hypot(w.a[0]-w.b[0],w.a[1]-w.b[1])*draft.scale;
      showWallPanel({title:text('墙体属性','Wall properties'),body:`<p>${readOnly?text('结构已锁定，只能查看。','Structure locked; read-only.'):text('坐标相对于描图画布，单位 mm。正交墙保持原方向；移动后请检查墙线闭合。','Coordinates are relative to the tracing canvas, in mm. Check junctions after moving.')}</p><label>${text('墙类型','Wall type')} <select id="wp-kind" ${readOnly?'disabled':''}>${[['n',text('非承重','Partition')],['b',text('承重','Bearing')],['e',text('外墙','Exterior')],['low',text('矮墙','Low wall')]].map(([v,n])=>`<option value="${v}" ${v===w.kind?'selected':''}>${n}</option>`).join('')}</select></label><div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:12px">${[['x',text('起点 X','Start X'),w.a[0]*draft.scale],['y',text('起点 Y','Start Y'),w.a[1]*draft.scale],['length',text('长度','Length'),length],['thickness',text('墙厚','Thickness'),w.thickness]].map(([id,n,v])=>`<label>${n} (mm) <input id="wp-${id}" type="number" ${id==='length'?'min="50" step="0.01"':''} value="${v.toFixed(2)}" ${readOnly?'disabled':''}></label>`).join('')}</div><p id="wp-error" role="alert" class="trace-error"></p>`,actions:[{label:text('关闭','Close')},...(!readOnly?[{label:text('应用墙属性','Apply wall properties'),cls:'primary',fn:()=>{try{const x=Number($('#wp-x').value)/draft.scale,y=Number($('#wp-y').value)/draft.scale,len=Number($('#wp-length').value)/draft.scale,thickness=Number($('#wp-thickness').value),kind=$('#wp-kind').value;if(phase==='design'&&kind!=='n')throw Error(text('装修阶段只能新增／调整非承重墙。','Only partitions can be changed in design mode.'));if(!Number.isFinite(len)||len*draft.scale<FurnishDraft.minWallLength-1e-6)throw Error(text('墙长至少 50 mm。','Wall length must be at least 50 mm.'));const sign=h?Math.sign(w.b[0]-w.a[0]):Math.sign(w.b[1]-w.a[1]),next=copy(draft),wall=next.walls.find(v=>v.id===w.id);Object.assign(wall,{a:[x,y],b:h?[x+len*sign,y]:[x,y+len*sign],thickness,kind});FurnishDraft.validate(next);const fitted=next.zones?.length?FurnishDraft.fitZonesToWalls(next):next;if(phase==='design')FurnishProject.assertStructure(baseline,fitted);checkpoint();draft=fitted;render();return true;}catch(e){$('#wp-error').textContent=e.message;return false;}}}]:[])]});wallBatchPanel(w);
    }
    function wallBatchPanel(w){
      const members=draft.walls.filter(v=>selectedWalls.includes(v.id)),allLocked=members.some(v=>phase==='design'&&v.kind!=='n');
      q('#trace-properties').insertAdjacentHTML('beforeend',`<div style="width:100%;border-top:1px solid var(--line);padding-top:8px"><b>已选 ${members.length} 段墙</b> · Shift+点击追加墙段 · 虚线为中心线，填充边界为实际墙面。<button class="btn" id="wp-group-select" ${w.group?'':'disabled'}>选择整组折墙</button><button class="btn" id="wp-group-create">将所选墙段编组</button><button class="btn" id="wp-group-clear" ${w.group?'':'disabled'}>取消所选编组</button><label>批量墙厚 mm <input id="wp-batch-thickness" type="number" min="60" max="600" value="${w.thickness}"></label><button class="btn" id="wp-batch-apply" ${allLocked?'disabled':''}>应用到所选墙段</button><small>${allLocked?'所选包含已锁定承重／外墙，不能批量改厚。':'改变墙厚以中心线为基准向两侧展开，位置不变，净面积同步重算。'}</small></div>`);
      q('#wp-group-select').onclick=()=>{selectedWalls=draft.walls.filter(v=>v.group===w.group).map(v=>v.id);wallProperties(w);};
      const apply=values=>{try{const next=FurnishDraft.batchWalls(draft,selectedWalls,values);if(phase==='design')FurnishProject.assertStructure(baseline,next);checkpoint();draft=next;wallProperties(draft.walls.find(v=>v.id===w.id));}catch(e){q('#wp-error').textContent=e.message;}};
      q('#wp-group-create').onclick=()=>apply({group:'wall_group_'+uid()});q('#wp-group-clear').onclick=()=>apply({group:''});q('#wp-batch-apply').onclick=()=>apply({thickness:Number(q('#wp-batch-thickness').value)});
    }
    q('#trace-unlock').onclick=()=>{if(!confirm(text('解锁用于修正原始结构资料，会重新建立结构基线。保留当前墙体、门窗和家具，无需重新导入；保存后旧撤销历史清空。确认修改后请重新锁定。继续？','Unlock to correct the original structure and rebuild its baseline?')))return;phase='survey';baseline=null;revisingOriginal=true;past=[];future=[];dirty=true;setMode('properties');report('原始结构已解锁，可修改墙体与门窗。修改后重新确认并保存。');};
    q('#trace-confirm').onclick=()=>{if(boundaryBase)return report('请先应用或取消边界预览。',true);if(pendingOpening)return report('请先确认或取消门窗预览。',true);try{const checked=cachedBuild(draft);if(!confirm(text(`确认原始结构：${checked.rooms.filter(r=>r.counted!==false).length} 个房间，净面积 ${checked.rooms.filter(r=>r.counted!==false).reduce((n,r)=>n+FurnishProject.area(r.poly),0).toFixed(2)} m²，${draft.walls.length} 段墙，${draft.openings.length} 处门窗。已核对尺寸、逐墙分类及已有门窗？确认后承重／外墙锁定；保存与确认是两个步骤。`, 'Verify dimensions, wall types and existing openings. Confirmation locks bearing/exterior walls; saving is a separate step.')))return;baseline=copy(draft);phase='design';past=[];future=[];dirty=true;render();report(text('原始结构已确认。承重墙、外墙和其已有门窗已锁定。保存后即可进行装修设计。','Original structure confirmed. Bearing/exterior walls and existing openings are locked. Save to start designing.'));}catch(e){report(text('无法确认：','Cannot confirm: ')+e.message,true);}};
    function close(){cancelMove();planCache.clear();document.removeEventListener('keydown',key,true);overlay.remove();button.focus();}
    let exitPrompt=null;
    function requestExit(next){
      cancelMove();if(!dirty&&!boundaryBase&&!pendingOpening&&!areaPoints.length){next();return;}
      if(exitPrompt)return;
      const prompt=exitPrompt=document.createElement('section');prompt.id='trace-exit-prompt';prompt.className='trace-exit-prompt';prompt.setAttribute('role','region');prompt.setAttribute('aria-label','退出编辑');
      prompt.innerHTML='<div><b>还有未保存的修改</b><p>继续编辑可保留当前修改；放弃后返回上次保存的布局。</p></div><button class="btn primary" id="trace-exit-continue">继续编辑</button><button class="btn danger" id="trace-exit-discard">放弃修改并退出</button>';
      q('.trace-bottom').before(prompt);q('#trace-exit-continue').onclick=()=>{prompt.remove();exitPrompt=null;canvas.focus();};q('#trace-exit-discard').onclick=next;q('#trace-exit-continue').focus();
    }
    function cancel(){requestExit(close);}
    q('#trace-close').onclick=cancel;
    q('#trace-new').onclick=()=>requestExit(()=>{close();openEditor(true);});
    q('#trace-name').oninput=()=>{dirty=true;render();};
    q('#trace-upload').onclick=()=>q('#trace-file').click();
    q('#trace-file').onchange=async e=>{
      const file=e.target.files[0];e.target.value='';if(!file)return;
      if(!['image/png','image/jpeg','image/webp','application/pdf'].includes(file.type)&&!file.name.toLowerCase().endsWith('.pdf')||file.size>20e6)return report(text('支持 PNG/JPG/WebP/PDF，原图最大 20MB。','PNG/JPG/WebP only; maximum source size 20 MB.'),true);
      if(hasBearing())return locked();
      if(draft.walls.length&&!confirm(text('更换底图会清除本次校准、墙体与门窗。继续？','Replacing the image clears calibration, walls and openings. Continue?')))return;
      loading=true;q('#trace-finish').disabled=true;report(text('正在读取图片…','Loading image…'));
      let pdfDocument=null,pdfTask=null,source=file;
      if(file.type==='application/pdf'||file.name.toLowerCase().endsWith('.pdf')){
        try{
          if(location.protocol==='file:')throw Error(text('PDF 导入请通过本地服务打开页面（如当前 127.0.0.1）；图片和 DXF 可直接离线打开。','Open via a local server for PDF imports; images and DXF also work from local files.'));
          const pdfjs=await import('../../vendor/pdfjs/pdf.js');pdfjs.GlobalWorkerOptions.workerSrc='./vendor/pdfjs/pdf.worker.js';
          pdfTask=pdfjs.getDocument({data:new Uint8Array(await file.arrayBuffer()),isEvalSupported:false,useSystemFonts:true,cMapUrl:new URL('./vendor/pdfjs/cmaps/',location.href).href,cMapPacked:true,standardFontDataUrl:new URL('./vendor/pdfjs/standard_fonts/',location.href).href,wasmUrl:new URL('./vendor/pdfjs/wasm/',location.href).href});pdfDocument=await pdfTask.promise;
          let pageNumber=1;if(pdfDocument.numPages>1){const answer=prompt(text('PDF 共 '+pdfDocument.numPages+' 页，请选择户型页码：','PDF has '+pdfDocument.numPages+' pages. Select page:'),'1');if(answer===null){await pdfTask.destroy();loading=false;q('#trace-finish').disabled=false;return;}pageNumber=Number(answer);if(!Number.isInteger(pageNumber)||pageNumber<1||pageNumber>pdfDocument.numPages)throw Error('PDF 页码无效');}
          const page=await pdfDocument.getPage(pageNumber),initial=page.getViewport({scale:1}),viewport=page.getViewport({scale:Math.min(2,1600/Math.max(initial.width,initial.height))}),cv=document.createElement('canvas');cv.width=Math.ceil(viewport.width);cv.height=Math.ceil(viewport.height);await page.render({canvasContext:cv.getContext('2d'),viewport,background:'rgb(255,255,255)'}).promise;source=await new Promise(resolve=>cv.toBlob(resolve,'image/png'));if(!source)throw Error('PDF 页面渲染失败');await pdfTask.destroy();pdfDocument=null;
        }catch(error){await pdfTask?.destroy();loading=false;q('#trace-finish').disabled=false;return report(text('PDF 读取失败：','PDF import failed: ')+error.message,true);}
      }
      const url=URL.createObjectURL(source);
      try{
        const image=new Image();image.src=url;await image.decode();if(!overlay.isConnected)return;
        if(image.naturalWidth*image.naturalHeight>80000000)throw new Error('Image too large');
        const ratio=Math.min(1,1600/Math.max(image.naturalWidth,image.naturalHeight)),cv=document.createElement('canvas');cv.width=Math.max(1,Math.round(image.naturalWidth*ratio));cv.height=Math.max(1,Math.round(image.naturalHeight*ratio));
        const ctx=cv.getContext('2d');ctx.fillStyle='white';ctx.fillRect(0,0,cv.width,cv.height);ctx.drawImage(image,0,0,cv.width,cv.height);
        let data=cv.toDataURL('image/jpeg',.8);if(data.length>1000000)data=cv.toDataURL('image/jpeg',.5);if(data.length>1000000)throw new Error('Image too large');
        checkpoint();Object.assign(draft,{width:cv.width,height:cv.height,image:data,source:'image',scale:0,walls:[],openings:[]});delete draft.calibration;box=[0,0,draft.width,draft.height];setMode('calibrate');
      }catch(err){report(text('图片读取失败，请换用较小的有效图片。','Could not load image; try a smaller valid image.'),true);}finally{URL.revokeObjectURL(url);loading=false;q('#trace-finish').disabled=false;}
    };
    q('#trace-dxf').onclick=()=>q('#trace-dxf-file').click();
    q('#trace-dxf-file').onchange=async e=>{const file=e.target.files[0];e.target.value='';if(file)await importDXF(file);};
    q('#trace-templates').onclick=()=>{
      openDialog({title:text('DXF 模板与绘图规范','DXF templates & drawing guide'),wide:true,body:`<p>综合示例合并了多墙厚、连续折墙、普通窗和飘窗参考线，单位为毫米。导入墙层后应识别 <b>12 段墙、3 个房间，净面积 21.5912 m²</b>。承重分类仅为演示，需按自己的结构资料核对。</p><ol><li>使用二维正交中心线；支持 LINE、无弧段的 LWPOLYLINE／POLYLINE。外轮廓闭合，隔墙接到中心线，不为门窗断开墙线。弧墙、斜墙、三维实体及块 INSERT 不能直接作为墙导入。</li><li>图层后缀预填墙厚：承重 200、外墙 240、非承重 100／120 mm。可按图层调整，墙属性可逐段或批量修改，允许 60–600 mm。</li><li>中间 100 mm 折墙是一条包含 3 段的多段线；导入后选任一段，再点“选择整组折墙”。各段保留独立坐标、长度和墙厚；拐角按实际墙面连接，120 mm 支墙与它形成 T 形交接。</li><li>下侧外墙包含宽 1200、进深 600 mm 的落地外凸折形，属于真实外轮廓，计入净面积；整条外墙多段线保留编组。请勿把这种外凸轮廓当作抬高飘窗。</li><li>普通窗参考宽 1200 mm，位于 CAD 顶墙 X=1000–2200。导入后点“窗”、设宽 1200，再在顶墙 X=1600 处定位。窗台高度可在主画布窗属性调整，窗顶默认 2400 mm。</li><li>抬高飘窗参考洞宽 1600、外凸 600 mm，位于顶墙 X=3600–5200。只在完整基墙上补录 1600 mm 窗洞；外凸辅助线不自动生成实体；导入后可选“飘窗”，设洞宽1600、进深600、台高450毫米，在顶墙X=4400处录入独立窗台和三面窗，窗台不计使用面积。</li><li>蓝色 FURNISH_WINDOW_GUIDE、青色 FURNISH_BAY_GUIDE 和 FURNISH_ANNOTATION 为辅助图层，导入时不选。CAD 中可查看这些线和说明；导入预览只显示选中的墙线，不会自动生成门窗。</li></ol><p>下载和直接加载使用同一份标准 ASCII DXF。加载后仍需核对单位、图层、修复预览及房间结果。空白模板需先在 CAD 中绘墙，不能直接生成房间。</p>`,actions:[{label:text('关闭','Close')},{label:text('下载综合示例','Download complete example'),href:'templates/furnish-template-complete.dxf',download:'furnish-template-complete.dxf'},{label:text('下载空白模板','Download blank'),href:'templates/furnish-template-blank.dxf',download:'furnish-template-blank.dxf'},{label:text('直接加载综合示例并检查','Load complete example & check'),cls:'primary',fn:()=>{setTimeout(()=>importDXF(new File([FurnishTemplates.complete],'furnish-template-complete.dxf')),0);}}]});$('#dlg').style.zIndex='90';
    };
    async function supplementDXF(raw){
      try{
        const parsed=FurnishDXF.parse(raw),layers=parsed.inventory||parsed.layers;
        let candidate=null;
        openDialog({title:'DXF 图层补导入',wide:true,body:`<p>复用首次导入的坐标与当前标定，只追加梁及水气点位。墙、门窗、功能区和家具保持现状。已导入的相同实体不会重复添加。</p><div class="project-grid">${layers.map((l,i)=>`<label>${esc(l.name)} <select data-append-layer="${i}"><option value="">不追加</option><option value="beam">房梁</option>${['drain','gas'].includes(FurnishDXF.layerRole(l.name).role)?'<option value="service">水气点位</option>':''}</select></label>`).join('')}</div><button class="btn" id="dxf-append-preview">预览追加</button><p id="dxf-append-result" role="status"></p><svg id="dxf-append-svg" style="width:100%;height:280px"></svg>`,actions:[{label:'取消'},{label:'重新选择 DXF 文件',fn:()=>{supplementFile.click();return false;}},{label:'确认追加到户型草稿',cls:'primary',fn:()=>{if(!candidate)$('#dxf-append-preview').click();if(!candidate){$('#dxf-append-result').focus();return false;}checkpoint();draft=candidate;box=[0,0,draft.width,draft.height];render();return true;}}]});$('#dlg').style.zIndex='90';
        document.querySelectorAll('[data-append-layer]').forEach(s=>s.onchange=()=>{candidate=null;$('#dxf-append-result').textContent='选择已变化，请重新预览';$('#dxf-append-svg').innerHTML='';});
        $('#dxf-append-preview').onclick=()=>{
          candidate=null;
          try{
            const beamLayers=[],serviceLayers=[];
            document.querySelectorAll('[data-append-layer]').forEach(s=>{if(s.value)(s.value==='beam'?beamLayers:serviceLayers).push(layers[Number(s.dataset.appendLayer)].name);});
            if(!beamLayers.length&&!serviceLayers.length)throw Error('请先选择要追加的图层');
            candidate=FurnishDXFOutline.append(draft,parsed,{beamLayers,serviceLayers});candidate.sourceDXF=raw;
            $('#dxf-append-result').textContent=`新增 ${(candidate.beams?.length||0)-(draft.beams?.length||0)} 根梁、${(candidate.markers?.length||0)-(draft.markers?.length||0)} 处点位。确认后还需点击编辑器底部保存按钮。`;
            const svg=$('#dxf-append-svg');svg.setAttribute('viewBox',`0 0 ${draft.width} ${draft.height}`);
            svg.innerHTML=draft.walls.map(w=>`<line x1="${w.a[0]}" y1="${w.a[1]}" x2="${w.b[0]}" y2="${w.b[1]}" stroke="#888" stroke-width="${w.thickness/draft.scale}"/>`).join('')+state.furniture.map(f=>`<rect x="${(f.cx-f.w/2)/draft.scale}" y="${(f.cy-f.d/2)/draft.scale}" width="${f.w/draft.scale}" height="${f.d/draft.scale}" transform="rotate(${f.rot||0} ${f.cx/draft.scale} ${f.cy/draft.scale})" fill="#b7cedb" opacity=".6"/>`).join('')+(candidate.beams||[]).map(b=>`<polygon points="${b.poly.map(p=>p.join(',')).join(' ')}" fill="#9467bd" fill-opacity="0.22" stroke="#9467bd" stroke-width="2" vector-effect="non-scaling-stroke"/>`).join('')+(candidate.markers||[]).map(m=>`<circle cx="${m.at[0]}" cy="${m.at[1]}" r="${FurnishDraft.serviceDiameter(m)/2/draft.scale}" fill="${m.kind==='gas'?'#c35b20':'#087c9c'}"/>`).join('');
          }catch(e){candidate=null;$('#dxf-append-result').textContent=e.message;}
        };
      }catch(e){report(e.message,true);}
    }
    function serviceDialog(id){
      const m=draft.markers?.find(v=>v.id===id);if(!m)return;
      openDialog({title:'水气管道位置与直径',body:`<p>${esc(m.name)} · 坐标相对户型画布左上角，单位 mm。竖管从地面贯穿所在空间净高。</p><div class="project-grid"><label>X 坐标 mm <input id="service-x" type="number" value="${m.at[0]*draft.scale}"></label><label>Y 坐标 mm <input id="service-y" type="number" value="${m.at[1]*draft.scale}"></label><label>直径 mm <input id="service-diameter" type="number" min="10" max="2000" value="${FurnishDraft.serviceDiameter(m)}"></label></div><p id="service-error" role="alert"></p>`,actions:[{label:'取消'},{label:'确认修改',cls:'primary',fn:()=>{try{const inputs=['service-x','service-y','service-diameter'].map(id=>$('#'+id).value);if(inputs.some(v=>v.trim()===''))throw Error('请输入完整坐标与直径');const next=FurnishDraft.editService(draft,m.id,...inputs.map(Number));checkpoint();draft=next;render();return true;}catch(e){$('#service-error').textContent=e.message;return false;}}}]});$('#dlg').style.zIndex='90';
    }
    function beamDialog(id){
      const b=draft.beams?.find(v=>v.id===id);if(!b)return;const roof=FurnishProject.ceilingHeight(state),v=FurnishDraft.beamVertical(b,roof),attached=b.ceilingThickness!==undefined||!FurnishDraft.beamVertical(b);
      openDialog({title:'房梁厚度与离地距离',body:`<p>${esc(b.name)} · ${esc(b.id)}</p><label><input id="beam-follow-roof" type="checkbox" ${attached?'checked':''}> 顶部贴房顶，跟随全屋层高 ${roof} mm</label><div class="project-grid"><label>梁厚 mm<input id="beam-thickness" type="number" min="1" max="20000" value="${v?v.top-v.bottom:FurnishDraft.beamDefaults.thickness}"></label><label>梁顶离地 mm<input id="beam-roof-top" type="number" min="1" max="20000" value="${v?.top??roof}"></label></div><p><output id="beam-bottom-distance"></output></p><p>未录入的梁默认厚度 ${FurnishDraft.beamDefaults.thickness} mm，仅为示意，需按实测调整。确认后还需保存户型。</p><p id="beam-editor-error" role="alert"></p>`,actions:[{label:'取消'},{label:'确认梁设置',cls:'primary',fn:()=>{try{const thickness=$('#beam-thickness').value.trim(),top=$('#beam-roof-top').value.trim();if(!thickness||!top)throw Error('请输入完整梁厚和梁顶高度');const next=$('#beam-follow-roof').checked?FurnishDraft.editCeilingBeam(draft,b.id,Number(thickness),roof):FurnishDraft.editBeam(draft,b.id,Number(top)-Number(thickness),Number(top));checkpoint();draft=next;render();return true;}catch(e){$('#beam-editor-error').textContent=e.message;return false;}}}]});$('#dlg').style.zIndex='90';
      const update=()=>{$('#beam-editor-error').textContent='';const follow=$('#beam-follow-roof').checked;$('#beam-roof-top').disabled=follow;if(follow)$('#beam-roof-top').value=String(roof);const thickness=Number($('#beam-thickness').value),top=Number($('#beam-roof-top').value);$('#beam-bottom-distance').textContent=Number.isFinite(thickness)&&thickness>0&&Number.isFinite(top)&&top>=thickness?`梁底面距地面 ${top-thickness} mm`:'梁厚须为正数且不超过梁顶离地高度';};
      ['beam-thickness','beam-roof-top'].forEach(id=>$('#'+id).oninput=update);$('#beam-follow-roof').onchange=update;update();
    }
    const beamButton=document.createElement('button');beamButton.className='btn';beamButton.id='trace-beams';beamButton.textContent='房梁高度';q('#trace-dxf').after(beamButton);
    beamButton.onclick=()=>{openDialog({title:'编辑房梁',body:(draft.beams||[]).map(b=>{const v=FurnishDraft.beamVertical(b,FurnishProject.ceilingHeight(state));return `<button class="btn" data-edit-beam="${esc(b.id)}">${esc(b.name)} · ${esc(b.id)} · ${v?`梁底离地 ${v.bottom} mm`:'待核对'}</button>`;}).join('')||'<p>尚未导入房梁，请使用 DXF 图层补导入。</p>',actions:[{label:'关闭'}]});$('#dlg').style.zIndex='90';document.querySelectorAll('[data-edit-beam]').forEach(button=>button.onclick=()=>beamDialog(button.dataset.editBeam));};
    canvas.addEventListener('click',e=>{const id=e.target.closest('[data-beam]')?.dataset.beam;if(id)beamDialog(id);});
    const serviceButton=document.createElement('button');serviceButton.className='btn';serviceButton.id='trace-services';serviceButton.textContent='水气管道';q('#trace-dxf').after(serviceButton);
    serviceButton.onclick=()=>{openDialog({title:'编辑水气管道',body:(draft.markers||[]).map(m=>`<button class="btn" data-edit-service="${esc(m.id)}">${esc(m.name)} · Ø${FurnishDraft.serviceDiameter(m)} mm</button>`).join('')||'<p>尚未导入水气点位。</p>',actions:[{label:'关闭'}]});$('#dlg').style.zIndex='90';document.querySelectorAll('[data-edit-service]').forEach(b=>b.onclick=()=>serviceDialog(b.dataset.editService));};
    canvas.addEventListener('click',e=>{const id=e.target.closest('[data-service]')?.dataset.service;if(id)serviceDialog(id);});
    const supplementButton=document.createElement('button');supplementButton.className='btn';supplementButton.id='trace-dxf-supplement';supplementButton.textContent='DXF 图层补导入';q('#trace-dxf').after(supplementButton);
    const supplementFile=document.createElement('input');supplementFile.type='file';supplementFile.accept='.dxf';supplementFile.hidden=true;supplementFile.id='trace-dxf-supplement-file';supplementButton.after(supplementFile);
    supplementButton.disabled=!original||draft.source!=='dxf';
    supplementButton.onclick=()=>draft.sourceDXF?supplementDXF(draft.sourceDXF):supplementFile.click();
    supplementFile.onchange=async()=>{const f=supplementFile.files[0];supplementFile.value='';if(!f)return;if(f.size>20e6)return report('DXF 文件上限 20MB。',true);const bytes=await f.arrayBuffer();let raw=new TextDecoder('utf-8').decode(bytes);if(raw.includes('\ufffd'))raw=new TextDecoder('gb18030').decode(bytes);if(overlay.isConnected)await supplementDXF(raw);};
    async function importDXF(file){
      if(file.size>20e6)return report(text('DXF 文件上限 20MB。','DXF size limit: 20 MB.'),true);
      if(hasBearing())return locked();
      if(draft.walls.length&&!confirm(text('导入 DXF 会替换本次墙体和门窗。继续？','Import DXF and replace the current walls and openings?')))return;
      loading=true;q('#trace-finish').disabled=true;
      try{
        const bytes=await file.arrayBuffer();let raw=new TextDecoder('utf-8',{fatal:false}).decode(bytes);if(raw.includes('\ufffd'))raw=new TextDecoder('gb18030').decode(bytes);
        const parsed=FurnishDXF.parse(raw);if(!overlay.isConnected)return;
        if(!parsed.layers.length)throw new Error(text('未找到墙线。空白模板需先在 CAD 中绘制闭合墙中心线，再导出 ASCII DXF（LINE / LWPOLYLINE / POLYLINE）上传。','No wall lines found. Draw closed wall centerlines in the blank template before exporting ASCII DXF and uploading.'));
        const options=[[1,'mm'],[10,'cm'],[1000,'m'],[25.4,'inch'],[304.8,'ft']];
        const roleLabel=role=>({beam:text('顶部房梁','Overhead beam'),wall:text('墙体候选','Wall candidate'),window:text('窗位参考','Window reference'),bay:text('飘窗参考','Bay reference'),door:text('门位参考','Door reference'),drain:text('下水点位','Drain point'),gas:text('燃气点位','Gas point'),reference:text('辅助参考','Reference'),unknown:text('用途待指定','Unclassified')})[role];
        const warningLabel=w=>{
          if(w.code==='overlapping-layers')return text(`「${w.layers.join('」与「')}」有 ${w.count} 对重合边。可能是同一墙轮廓的重复标注，需核对类型与几何。`,`Layers ${w.layers.join(' / ')} have ${w.count} overlapping edge pairs; verify duplicate profiles and classifications.`);
          if(w.code==='overlap-limit')return text('图纸较大，跨层重合检查达到上限；需人工核对剩余部分。','Cross-layer overlap inspection reached its limit; review remaining geometry manually.');
          if(w.code==='wall-profiles')return text(`「${w.layer}」有 ${w.count} 个疑似墙体轮廓，直接作为中心线可能把墙内部误认成房间。需转换中心线；复杂轮廓不能靠统一墙厚可靠转换。`,`Layer ${w.layer}: ${w.count} possible wall profiles; importing edges as centerlines can create false rooms. Complex profiles require manual conversion.`);
          if(w.code==='reference-as-wall')return text(`「${w.layer}」名称表示门窗或辅助参考。选为墙体不会生成门窗，需核对用途。`,`Layer ${w.layer} suggests openings/reference geometry. Selecting it as walls does not create openings.`);
          return text(`「${w.layer}」有 ${w.count} 个未转换的几何实体（圆、弧、块或填充等）。请确认其不属于需要导入的墙体。`,`Layer ${w.layer}: ${w.count} geometry entities will be omitted. Verify these are not required walls.`);
        };
        function sourcePreview(layers){
          const segments=parsed.records.flatMap(r=>r.segments.map(s=>({...s,layer:r.layer}))),limit=10000;
          if(!segments.length)return;
          let x0=Infinity,y0=Infinity,x1=-Infinity,y1=-Infinity;
          for(const s of segments)for(const p of [s.a,s.b]){x0=Math.min(x0,p[0]);y0=Math.min(y0,p[1]);x1=Math.max(x1,p[0]);y1=Math.max(y1,p[1]);}
          const pad=Math.max(x1-x0,y1-y0)*.04+1;
          const paths=segments.slice(0,limit).map(s=>{const role=FurnishDXF.layerRole(s.layer),selected=layers.includes(s.layer),color=role.role==='window'||role.role==='bay'?'#1674c4':role.kind==='b'?'#222':'#a26b36';return `<line x1="${s.a[0]}" y1="${-s.a[1]}" x2="${s.b[0]}" y2="${-s.b[1]}" stroke="${color}" opacity="${selected?1:.35}" stroke-width="2" vector-effect="non-scaling-stroke"><title>${esc(s.layer)}</title></line>`;}).join('');
          $('#dxf-source-preview').innerHTML=`<svg role="img" aria-label="${text('DXF 原图图层预览','DXF source layers')}" viewBox="${x0-pad} ${-y1-pad} ${x1-x0+pad*2} ${y1-y0+pad*2}" style="width:100%;height:260px;background:#f4f0e8;border-radius:10px">${paths}</svg><small>${text('原图可解析线条：蓝色门窗参考，黑色承重候选，棕色其他；未选层淡显。预览不代表已生成墙体或门窗。','Source lines: blue window references, black bearing candidates, brown others; unselected layers faded. This is not a converted plan.')}${segments.length>limit?text(' 预览仅显示前 10000 段。',' Preview limited to 10000 segments.'):''}</small>`;
        }
        let candidate=null,repaired=null;
        const hasProfiles=FurnishDXF.inspect(parsed).layers.some(l=>l.role==='wall'&&l.profiles>0),suggestOutlines=hasProfiles&&parsed.layers.some(l=>FurnishDXF.layerRole(l.name).role==='window');
        const friendly=error=>{
          const message=error.message;
          if(message.includes('thickness'))return text('请检查每个所选图层的墙厚（60–600 mm）；多墙厚双线转换暂不支持，请使用中心线模式。','Verify 60–600 mm layer thicknesses; mixed-thickness double lines are unsupported.');
          if(message.includes('No enclosed room'))return text('仍未找到闭合房间。请检查选中的图层；较大的门窗断口需手工补齐中心线。','No closed room found. Check layers; large door/window gaps need manual centerlines.');
          if(message.includes('diagonal')||message.includes('Diagonal'))return text('存在明显斜墙，超过轻微倾斜修复范围。请调整图层或手工修改。','Diagonal walls exceed the repair tolerance. Adjust layers or edit manually.');
          if(message.includes('Cannot safely repair'))return text('所选图层包含弧段或三维实体，当前不能可靠转换。','Selected layers contain curved or 3D entities that cannot be safely converted.')+' '+message;
          if(/3D|Non-planar/.test(message))return text('所选墙图层含非零 Z 高度或非平面实体。请在 CAD 中核对并导出 Z=0 的二维墙中心线。','Selected walls contain elevation/non-planar geometry. Export verified 2D centerlines at Z=0.');
          if(message.includes('Select wall layers'))return text('请选择墙体图层。','Select wall layers.');
          if(message.includes('drawing units')||message.includes('Drawing units')||message.includes('DXF drawing units'))return text('请先确认图纸单位。','Choose drawing units first.');
          if(message.includes('Conflicting wall types'))return text('重合墙线被指定为不同墙类型。请检查原图的墙体轮廓与图层重叠；不能自动用非承重类型覆盖承重类型。','Coincident lines have conflicting wall types. Check overlapping layers and wall profiles; bearing classification cannot be silently overwritten.');
          if(message.includes('4–100'))return text('转换后需有 4–100 段墙中心线。轮廓边线可能超限，孤立承重墙也不能构成整套户型。请先整理中心线。','Conversion requires 4–100 wall centerlines. Profile edges may exceed the limit; isolated bearing walls do not form a complete plan.');
          return message;
        };
        function previewRepair(){
          candidate=null;repaired=null;$('#dxf-error').textContent='';$('#dxf-report').textContent='';$('#dxf-preview').innerHTML='';
          const downloadButton=$('#dlgActions [data-i="1"]'),importButton=$('#dlgActions [data-i="2"]');downloadButton.disabled=importButton.disabled=true;
          try{
            const layers=[...document.querySelectorAll('[data-dxf-layer]:checked')].map(el=>parsed.layers[Number(el.dataset.dxfLayer)].name),mmPerUnit=Number($('#dxf-unit').value);
            const enabled=$('#dxf-auto-repair').checked;
            const outlineMode=$('#dxf-mode').value==='outlines';
            sourcePreview(layers);
            const inspection=FurnishDXF.inspect(parsed,{layers,mmPerUnit});
            $('#dxf-diagnostics').textContent=inspection.warnings.map(warningLabel).join('\n');
            const needsReview=!outlineMode&&inspection.warnings.some(w=>w.code!=='wall-profiles'||!enabled||!$('#dxf-double').checked);
            $('#dxf-source-review').hidden=!needsReview;
            $('#dxf-source-review').style.display=needsReview?'':'none';
            $('#dxf-gap').disabled=$('#dxf-angle').disabled=$('#dxf-double').disabled=!enabled||outlineMode;
            $('#dxf-auto-repair').disabled=outlineMode;
            $('#dxf-outline-options').hidden=!outlineMode;
            $('#dxf-outline-options').style.display=outlineMode?'':'none';
            if(outlineMode)$('#dxf-diagnostics').textContent=text('轮廓模式按实际填充区域处理共享边；墙厚由局部几何测得，不使用下方统一墙厚。请勾选完整墙层并核对类型。','Profile mode treats shared edges as boundaries and measures local thickness. Select all wall layers and verify types.');
            const layerThicknesses=Object.fromEntries(layers.map(l=>{const i=parsed.layers.findIndex(v=>v.name===l);return [l,Number($('[data-dxf-thickness="'+i+'"]').value)];}));
            const layerKinds=Object.fromEntries(layers.map(l=>{const i=parsed.layers.findIndex(v=>v.name===l);return [l,$('[data-dxf-kind="'+i+'"]').value];}));
            document.querySelectorAll('[data-dxf-kind]').forEach(el=>{el.disabled=!document.querySelector('[data-dxf-layer="'+el.dataset.dxfKind+'"]').checked;});
            if(layers.some(l=>!(outlineMode?['b','n','e','beam']:['b','n','e']).includes(layerKinds[l])))throw new Error(text('请为每个选中的图层指定墙体类型。','Assign a wall type to every selected layer.'));
            if(needsReview&&!$('#dxf-source-confirm').checked)throw new Error(text('请先核对图层诊断。墙体轮廓应先转换中心线；确认后才能继续尝试当前线条。','Review source diagnostics first. Convert wall profiles to centerlines before proceeding with these lines.'));
            if(outlineMode){
              const windowLayers=[...document.querySelectorAll('[data-dxf-window]:checked')].map(el=>parsed.layers[Number(el.dataset.dxfWindow)].name);
              const serviceLayers=[...document.querySelectorAll('[data-dxf-service]:checked')].map(el=>parsed.inventory[Number(el.dataset.dxfService)].name);
              $('#dxf-unconverted-layers').textContent=(parsed.inventory||[]).filter(l=>!parsed.layers.some(v=>v.name===l.name)).map(l=>`${l.name}: ${Object.entries(l.types).map(([k,v])=>`${k} × ${v}`).join(', ')} · ${serviceLayers.includes(l.name)?text('保留点位','points preserved'):text('未转换','omitted')}`).join('；');
              const beamLayers=layers.filter(l=>layerKinds[l]==='beam');
              const result=FurnishDXFOutline.convert(parsed,{layers:layers.filter(l=>!beamLayers.includes(l)),beamLayers,mmPerUnit,layerKinds,windowLayers,serviceLayers,closeDoorGaps:$('#dxf-door-gaps').checked,windowSill:Number($('#dxf-window-sill').value),windowHead:Number($('#dxf-window-head').value),name:q('#trace-name').value.trim()||file.name.replace(/\.dxf$/i,''),id:draft.id});
              const plan=cachedBuild(result.draft);candidate=result.draft;
              const t=candidate.sourceTransform,rectSVG=(r,color,opacity)=>`<rect x="${r[0]}" y="${-r[3]}" width="${r[2]-r[0]}" height="${r[3]-r[1]}" fill="${color}" opacity="${opacity}"/>`;
              $('#dxf-preview').innerHTML=`<svg role="img" aria-label="${text('轮廓转换与窗洞预览','Outline conversion and opening preview')}" viewBox="${t.x0-t.pad} ${-t.y1-t.pad} ${candidate.width*candidate.scale} ${candidate.height*candidate.scale}" style="width:100%;height:300px;background:#f4f0e8;border-radius:10px">${result.rectangles.map(v=>rectSVG(v.rect,v.opening?(v.opening.kind==='window'?'#1674c4':'#139687'):v.kind==='b'?'#222':'#a26b36',.75)).join('')}${candidate.beams.map(b=>{const p=b.poly.map(p=>[p[0]*candidate.scale+t.x0-t.pad,-(t.y1+t.pad-p[1]*candidate.scale)].join(',')).join(' ');return `<polygon points="${p}" fill="#9467bd" fill-opacity="0.22" stroke="#9467bd" stroke-dasharray="8 5" stroke-width="2" vector-effect="non-scaling-stroke"/>`;}).join('')}${candidate.markers.map(m=>{const x=m.at[0]*candidate.scale+t.x0-t.pad,y=t.y1+t.pad-m.at[1]*candidate.scale;return `<circle cx="${x}" cy="${-y}" r="${m.radius}" fill="white" stroke="${m.kind==='gas'?'#c35b20':'#087c9c'}" stroke-width="2" vector-effect="non-scaling-stroke"/>`;}).join('')}</svg>`;
              const s=result.stats;$('#dxf-report').textContent=text(`轮廓转换通过：${s.polygons} 个墙轮廓 → ${candidate.walls.length} 段中心线（保留实际局部墙厚）；${s.beams} 个房梁（保留投影，不参与房间分割）、${s.windows} 个窗洞、${candidate.markers.length} 处水气点位、${plan.rooms.length} 个房间，净面积 ${plan.rooms.reduce((n,r)=>n+FurnishProject.area(r.poly),0).toFixed(2)} m²。轻微倾斜最大调整 ${s.maxShift.toFixed(2)} mm。${s.doors} 个门洞由断口推导，位置和开启方向待核对；窗台／窗顶采用本次输入值，仍需核对实际高度。`,`Converted ${s.polygons} wall profiles into ${candidate.walls.length} bands with local thickness; ${s.windows} windows, ${candidate.markers.length} service points, ${plan.rooms.length} rooms. ${s.doors} inferred door gaps require review; verify entered window heights.`);
              downloadButton.disabled=true;importButton.disabled=false;return;
            }
            let source=parsed,selected=layers;
            if(enabled){repaired=FurnishDXFRepair.repair(parsed,{layers,mmPerUnit,thickness:Number(q('#trace-thickness').value),gapTolerance:Number($('#dxf-gap').value),angleTolerance:Number($('#dxf-angle').value),doubleLines:$('#dxf-double').checked,layerKinds,layerThicknesses});source=repaired.parsed;selected=source.layers.map(l=>l.name);}
            const next=FurnishDXF.draft(source,{layers:selected,mmPerUnit:enabled?1:mmPerUnit,name:q('#trace-name').value.trim()||file.name.replace(/\.dxf$/i,''),id:draft.id,thickness:Number(q('#trace-thickness').value),kind:q('#trace-kind').value,layerKinds,...(!enabled?{layerThicknesses}:{})});
            if(repaired){
              const s=repaired.stats;
              $('#dxf-report').textContent=text(`墙线 ${s.input} → ${s.output} 段；合并重复/共线 ${s.merged} 次，扶正 ${s.axisAligned} 段，吸附 ${s.snapped} 个坐标；双线配对 ${s.pairs} 组，移除封口 ${s.caps} 段。小接缝最大坐标调整 ${s.maxShift.toFixed(2)} mm（双线转换另计）。`,`Wall lines ${s.input} → ${s.output}; ${s.merged} merges, ${s.axisAligned} aligned, ${s.snapped} coordinates snapped; ${s.pairs} wall pairs, ${s.caps} caps removed. Maximum cleanup coordinate shift ${s.maxShift.toFixed(2)} mm (centerline conversion separate).`);
              const all=repaired.original.concat(repaired.lines),xs=all.flatMap(s=>[s.a[0],s.b[0]]),ys=all.flatMap(s=>[s.a[1],s.b[1]]),x0=Math.min(...xs),x1=Math.max(...xs),y0=Math.min(...ys),y1=Math.max(...ys),pad=Math.max(x1-x0,y1-y0)*.04+1;
              const paths=(lines,color)=>lines.map(s=>`<line x1="${s.a[0]}" y1="${-s.a[1]}" x2="${s.b[0]}" y2="${-s.b[1]}" stroke="${color}" stroke-width="2" vector-effect="non-scaling-stroke"/>`).join('');
              $('#dxf-preview').innerHTML=`<svg role="img" aria-label="${text('DXF 修复前后对照','DXF repair comparison')}" viewBox="${x0-pad} ${-y1-pad} ${x1-x0+pad*2} ${y1-y0+pad*2}" style="width:100%;height:220px;background:#f4f0e8;border-radius:10px">${paths(repaired.original,'#aaa')}${paths(repaired.lines,'#e45e2b')}</svg><small>${text('灰色：原线 · 橙色：修复后的墙中心线。请核对户型结构和尺寸。','Grey: original; orange: repaired centerlines. Verify layout and dimensions.')}</small>`;
              if(repaired.warnings.some(w=>w.code==='ambiguous-pairs'))throw new Error(text('双线配对存在歧义，已停止导入。请缩小图层范围，或关闭双线转换并手工处理。','Ambiguous double-line pairing blocks import. Narrow the layers or edit manually.'));
              if(repaired.warnings.some(w=>w.code==='no-pairs'))$('#dxf-report').textContent+=' '+text('未找到可确定的双线配对，墙线保持原样。','No unambiguous wall pairs found; lines retained.');
            }
            const plan=cachedBuild(next);candidate=next;
            $('#dxf-report').textContent+=' '+text(`校验通过：${plan.rooms.filter(r=>r.counted!==false).length} 个闭合房间，净面积 ${plan.rooms.filter(r=>r.counted!==false).reduce((n,r)=>n+FurnishProject.area(r.poly),0).toFixed(2)} m²。下一步：导入后补录门窗并核对结构。`,`Validated: ${plan.rooms.filter(r=>r.counted!==false).length} closed rooms.`);
            downloadButton.disabled=!repaired;importButton.disabled=false;
          }catch(error){candidate=null;$('#dxf-error').textContent=text('尚不能导入：','Cannot import yet: ')+friendly(error);}
        }
        openDialog({title:text('DXF 检查与自动修复','DXF check & automatic repair'),wide:true,
          body:`<p><b>① 文件检查通过 → ② 单位 → ③ 图层与类型 → ④ 修复预览 → ⑤ 导入后核对</b></p><p>${esc(file.name)} · ${(file.size/1024).toFixed(1)} KB · ASCII DXF</p><p>${text('请选择墙体图层，逐层指定墙厚（60–600 mm），不会按承重类型统一厚度。自动处理重复/共线碎段、小接缝和轻微倾斜；双线墙可按指定墙厚转换中心线。输出是所选墙线的兼容 DXF，不改写原文件。','Choose wall layers. Clean duplicates, fragments, small gaps and slight skew. Optionally convert double lines using wall thickness. Output is a compatible wall-only DXF; the original stays intact.')}</p>
          <label>${text('图纸单位（请核对）','Drawing units (verify)')} <select id="dxf-unit">${!parsed.mmPerUnit?`<option value="">${text('请选择单位','Choose units')}</option>`:''}${options.map(([v,label])=>`<option value="${v}" ${parsed.mmPerUnit===v?'selected':''}>${label}</option>`).join('')}</select></label>
          <p>${parsed.mmPerUnit?text(`检测到 INSUNITS=${parsed.unitCode}。`,`Detected INSUNITS=${parsed.unitCode}.`):text('未检测到支持的单位，请手动指定。','No supported units found. Specify manually.')}</p>
          <label>${text('墙体表示方式','Wall geometry')} <select id="dxf-mode"><option value="centerlines" ${suggestOutlines?'':'selected'}>${text('墙中心线／简单双线','Centerlines / simple pairs')}</option><option value="outlines" ${suggestOutlines?'selected':''}>${text('墙轮廓 → 中心线与窗洞','Wall profiles → bands and openings')}</option></select></label>
          <div id="dxf-outline-options"><p>${text('轮廓模式保留几何中的局部墙厚与端面。共享轮廓边不再作为独立墙；窗位矩形补齐基墙并创建窗洞。','Profile mode retains local thickness and end faces. Shared boundary edges are not separate walls; rectangular windows create base walls and openings.')}</p>${parsed.layers.map((l,i)=>FurnishDXF.layerRole(l.name).role==='window'?`<label class="opt"><input type="checkbox" data-dxf-window="${i}" checked><span>${esc(l.name)} · ${text('自动生成窗洞','Generate windows')}</span></label>`:'').join('')}${(parsed.inventory||[]).map((l,i)=>['drain','gas'].includes(FurnishDXF.layerRole(l.name).role)?`<label class="opt"><input type="checkbox" data-dxf-service="${i}" checked><span>${esc(l.name)} · ${text('保留点位与源图层','Preserve points and source layer')}</span></label>`:'').join('')}<label>${text('窗台高','Window sill')} <input id="dxf-window-sill" type="number" value="900" min="0" max="2400" style="width:75px"> mm</label> <label>${text('窗顶高','Window head')} <input id="dxf-window-head" type="number" value="2400" min="1" max="2800" style="width:75px"> mm</label><label class="opt"><input id="dxf-door-gaps" type="checkbox" checked><span>${text('将同线墙端间 600–1400 mm 的断口生成待核对门洞（不补成实墙）','Infer reviewed door openings between collinear faces, 600–1400 mm')}</span></label></div>
          <div id="dxf-source-preview"></div>
          <div class="opts">${parsed.layers.map((l,i)=>{const defaults=FurnishDXF.layerDefaults(l.name),role=FurnishDXF.layerRole(l.name),known=defaults.kind||role.kind,reference=['window','bay','door','reference'].includes(role.role);return `<div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap"><label class="opt" style="flex:1"><input type="checkbox" data-dxf-layer="${i}" ${!reference&&(parsed.layers.length===1||known)?'checked':''}><span><b>${esc(l.name)}</b><small>${l.count} ${text('段','segments')} · ${roleLabel(role.role)}${reference?text('（不自动生成门窗）',' (no automatic openings)'):''}${l.issues.length?' · '+esc(l.issues[0]):''}</small></span></label><select data-dxf-kind="${i}" aria-label="${esc(l.name)} ${text('墙类型','wall type')}">${[['',text('请选择类型','Choose type')],['b',text('承重（锁定）','Bearing (locked)')],['n',text('非承重（可修改）','Partition (editable)')],['e',text('外墙','Exterior')],['beam',text('房梁（不分割房间，仅轮廓模式）','Overhead beam (outline mode only)')]].map(([v,label])=>`<option value="${v}" ${known===v?'selected':''}>${label}</option>`).join('')}</select><label>墙厚 mm <input type="number" data-dxf-thickness="${i}" min="60" max="600" value="${defaults.thickness??q('#trace-thickness').value}" style="width:75px" aria-label="${esc(l.name)} 墙厚 mm"></label></div>`;}).join('')}</div><p>${text('图层名称只预填用途建议，仍需按结构资料核对。「房屋」不默认等于非承重墙；不能仅凭墙厚判断承重。','Layer names only suggest intent; verify structural documents. A general house layer is not assumed to be non-bearing.')}</p>
          <p id="dxf-diagnostics" role="status" style="white-space:pre-line;color:#a34b19"></p><label id="dxf-source-review" class="opt" hidden><input id="dxf-source-confirm" type="checkbox"><span>${text('我已核对：本次线条可作为墙中心线，未转换实体与参考层不属于需要导入的墙体。','I verified these lines are usable wall centerlines and omitted/reference entities are not required walls.')}</span></label>
          <p id="dxf-unconverted-layers">${esc((parsed.inventory||[]).filter(l=>!parsed.layers.some(v=>v.name===l.name)).map(l=>`${l.name}: ${Object.entries(l.types).map(([k,v])=>`${k} × ${v}`).join(', ')} · ${text('仅参考，未转换','reference only, omitted')}`).join('；'))}</p>
          <label class="opt" style="margin-top:12px"><input id="dxf-auto-repair" type="checkbox" checked><span><b>${text('自动修复兼容性','Automatically repair compatibility')}</b><small>${text('统一为 mm，清除重复、合并碎段、修复小接缝和轻微倾斜。','Normalize to mm, deduplicate, merge, close small gaps and align minor skew.')}</small></span></label>
          <div style="display:flex;gap:12px;flex-wrap:wrap;margin:12px 0"><label>${text('接缝容差','Gap tolerance')} <input id="dxf-gap" type="number" min="0" max="100" value="30" style="width:70px"> mm</label><label>${text('扶正角度','Alignment angle')} <input id="dxf-angle" type="number" min="0" max="2" step=".1" value="0.5" style="width:70px"> °</label></div>
          <label class="opt"><input id="dxf-double" type="checkbox"><span><b>${text('双线墙转中心线（可选）','Convert double-line walls (optional)')}</b><small>${text(`按墙厚 ${q('#trace-thickness').value} mm 配对，仅处理能确定的平行墙线；转换会改变轮廓表示，请核对预览。`,`Pair at ${q('#trace-thickness').value} mm wall thickness. Only unambiguous pairs; verify the preview.`)}</small></span></label>
          <p>${text('未转换的其他实体','Other entities not converted')}: ${esc(Object.entries(parsed.ignored).map(([k,v])=>`${k} × ${v}`).join(', ')||'0')}</p>
          <p>${text('块 INSERT、弧墙、三维墙和大断口当前需手工处理。墙体图层不要混入标注、家具或门窗符号。','Blocks, curved/3D walls and large gaps need manual editing. Exclude dimensions, furniture and opening symbols from wall layers.')}</p>
          <p id="dxf-report" role="status" aria-live="polite"></p><div id="dxf-preview"></div><div class="trace-error" id="dxf-error" role="alert"></div>`,
          onOpen:()=>{document.querySelectorAll('#dlgBody input,#dlgBody select').forEach(el=>el.addEventListener('change',()=>{if(el.id!=='dxf-source-confirm')$('#dxf-source-confirm').checked=false;previewRepair();}));previewRepair();},
          actions:[{label:text('取消','Cancel')},{label:text('下载修复后 DXF','Download repaired DXF'),fn:()=>{if(candidate&&repaired)download(file.name.replace(/\.dxf$/i,'')+'-furnish-fixed.dxf',new Blob([FurnishDXFRepair.exportDXF(repaired)],{type:'application/dxf'}));return false;}},{label:text('导入校验后的户型','Import validated plan'),cls:'primary',fn:()=>{if(!candidate)return false;checkpoint();candidate.sourceDXF=raw;draft=candidate;phase='survey';baseline=null;box=[0,0,draft.width,draft.height];setMode('door');return true;}}]});$('#dlg').style.zIndex='90';
      }catch(error){report(text('DXF 读取失败：','DXF could not be read: ')+error.message,true);}finally{loading=false;q('#trace-finish').disabled=false;}
    };
    q('#trace-finish').onclick=()=>{if(boundaryBase)return report('请先应用或取消边界预览。',true);
      if(pendingOpening)return report('请先确认或取消门窗预览。',true);
      draft.name=q('#trace-name').value.trim();
      let plan;
      try{if(phase==='design'&&baseline)FurnishProject.assertStructure(baseline,draft);if(draft.zones?.length&&original&&JSON.stringify(draft.walls)!==JSON.stringify(original.walls)){const next=FurnishDraft.fitZonesToWalls(draft);if(JSON.stringify(next.zones)!==JSON.stringify(draft.zones)){checkpoint();draft=next;}}plan=FurnishDraft.build(draft);}catch(error){report(text('无法生成：请检查校准、闭合墙线及门窗位置。详情：','Cannot build: check calibration, closed walls and opening positions. Details: ')+error.message,true);return;}
      const architecture={draft:copy(draft),phase,...(baseline?{baseline:copy(baseline)}:{}),...(revisingOriginal?{originalRevisions:[...(originalArch?.originalRevisions||[]),copy(originalArch.baseline||originalArch.draft)].slice(-10)}:originalArch?.originalRevisions?{originalRevisions:copy(originalArch.originalRevisions)}:{})};
      if(original){
        const before=snap();state.open=FurnishProject.remapOpenings(PLAN,plan,state.open);state.architecture=architecture;state.demolished=[];
        state.rooms=FurnishProject.remapRooms(ROOMS,plan.rooms,state.rooms);
        for(const r of plan.rooms){const explicit=draft.regionSettings?.find(s=>s.id===r.id);if(explicit&&state.rooms[r.id])Object.assign(state.rooms[r.id],{name:explicit.name,use:explicit.use});}
        if(revisingOriginal||originalArch.phase==='survey'&&phase==='design'){
          // Confirmation is a history boundary: undo must never unlock the baseline.
          undoStack.length=redoStack.length=0;save();snapshot();
        }else commit(before);
        renderAll();fitView();
      }else{
        store.customPlans=store.customPlans||[];store.customPlans.push(copy(draft));PLANS.push(plan);
        store.work[plan.id]=freshWork(plan);store.work[plan.id].architecture=architecture;setPlan(plan.id);
      }
      buildPlanList();close();toast(text(`已生成 ${plan.rooms.filter(r=>r.counted!==false).length} 个房间，可以开始摆家具。`,`Built ${plan.rooms.filter(r=>r.counted!==false).length} rooms. Ready to furnish.`));
    };
    render();q(original?'#trace-canvas':'#trace-dxf').focus();
  }
})();
