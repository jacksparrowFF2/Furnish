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
  const style=document.createElement('style');
  style.textContent=`
  .trace-overlay{position:fixed;inset:0;z-index:80;padding:18px;background:rgba(10,8,6,.7);display:flex;align-items:center;justify-content:center}
  .trace-box{width:min(1250px,100%);height:min(850px,96vh);display:flex;flex-direction:column;background:var(--panel);color:var(--ink);border:1px solid var(--line);border-radius:18px;overflow:hidden;box-shadow:var(--shadow-lg)}
  .trace-top,.trace-toolbar,.trace-bottom{display:flex;gap:8px;align-items:center;flex-wrap:wrap;padding:12px 16px;border-bottom:1px solid var(--line)}
  .trace-top h2{font-size:18px;margin:0 auto 0 0}.trace-top input{max-width:240px}
  .trace-toolbar label{display:flex;align-items:center;gap:5px;font-size:12px}.trace-toolbar input[type=number]{width:78px}
  .trace-box input,.trace-box select{padding:7px;border:1px solid var(--line);border-radius:8px;background:var(--card);color:var(--ink);font:inherit}
  .trace-box .btn{border:1px solid var(--line);background:var(--card)}.trace-box .btn.on,.trace-box .primary{background:var(--accent);color:white;border-color:var(--accent)}
  .trace-hint{margin:0;padding:9px 16px;font-size:12px;background:var(--soft);line-height:1.6}
  .trace-work{position:relative;flex:1;min-height:180px;background:#eee9df;overflow:hidden}.trace-canvas{width:100%;height:100%;display:block;touch-action:none;cursor:crosshair}
  .trace-empty{position:absolute;inset:0;display:grid;place-content:center;text-align:center;padding:20px;pointer-events:none;color:#564e44}
  .trace-bottom{border-bottom:0;border-top:1px solid var(--line)}.trace-status{flex:1;font-size:12px;min-width:180px}
  .trace-error{color:var(--danger);white-space:pre-wrap}.trace-input{width:100px!important}
  #trace-properties{max-height:230px;overflow:auto;flex-shrink:0}#trace-properties[hidden]{display:none}
  [data-window-field][hidden],[data-bay-field][hidden],#trace-unlock[hidden]{display:none!important}
  @media(max-width:700px){.trace-overlay{padding:0}.trace-box{height:100dvh;border-radius:0;overflow-y:auto}.trace-top,.trace-toolbar{padding:8px;flex-shrink:0}.trace-top input{max-width:150px}.trace-toolbar .btn{padding:6px 9px}.trace-hint{padding:7px 10px;flex-shrink:0}.trace-work{flex:none;height:300px;min-height:250px}.trace-bottom{padding:8px;position:sticky;bottom:0;background:var(--panel);flex-shrink:0}}
  @media print{.trace-overlay{display:none}}
  `;
  document.head.append(style);
  window.FurnishEditor={open:forceNew=>openEditor(!!forceNew)};
  function openEditor(forceNew=false) {
    if(document.querySelector('.trace-overlay')) return;
    const originalArch=!forceNew&&state.architecture?FurnishProject.architecture(state.architecture):null;
    const original=originalArch?.draft;
    let revisingOriginal=false;let phase=originalArch?.phase||'survey',baseline=originalArch?.baseline?copy(originalArch.baseline):null;
    let draft=original?copy(original):{version:1,id:'custom_'+Date.now().toString(36),name:text('我的户型','My floor plan'),width:1000,height:700,image:'',scale:0,walls:[],openings:[]};
    let mode=original?'wall':'calibrate',anchor=null,cursor=null,box=[0,0,draft.width,draft.height],pan=null,loading=false,dirty=false;
    let past=[],future=[],liveKey='',liveValue='',selectedWall=null,selectedWalls=[],chainGroup='',wallDrag=null;
    const overlay=document.createElement('div');overlay.className='trace-overlay';overlay.innerHTML=`
    <section class="trace-box" role="dialog" aria-modal="true" aria-labelledby="trace-title">
      <div class="trace-top"><h2 id="trace-title">${text('绘制我的户型','Trace my floor plan')}</h2><input id="trace-name" aria-label="${text('户型名称','Plan name')}" maxlength="80" value="${esc(draft.name)}"><button class="btn" id="trace-new">${text('新建','New')}</button><button class="btn" id="trace-close">${text('取消','Cancel')}</button></div>
      <div class="trace-toolbar">
        <button class="btn primary" id="trace-dxf">${text('导入 DXF（推荐）','Import DXF (recommended)')}</button><input type="file" id="trace-dxf-file" accept=".dxf" hidden>
        <button class="btn" id="trace-templates">${text('DXF 模板与规范','DXF templates & guide')}</button><button class="btn" id="trace-upload">${text('辅助：导入图片 / PDF','Image / PDF reference')}</button><input type="file" id="trace-file" accept="image/png,image/jpeg,image/webp,application/pdf,.pdf" hidden>
        <button class="btn" data-trace-mode="calibrate">${text('② 校准比例','② Calibrate')}</button><button class="btn" data-trace-mode="wall">${text('③ 描墙','③ Walls')}</button>
        <button class="btn" data-trace-mode="door">${text('门','Door')}</button><button class="btn" data-trace-mode="window">${text('窗','Window')}</button><button class="btn" data-trace-mode="bay">${text('飘窗','Bay window')}</button><button class="btn" data-trace-mode="properties">${text('墙属性','Wall properties')}</button><button class="btn" id="trace-confirm">${text('确认原始结构并锁定','Confirm original structure')}</button><button class="btn" id="trace-unlock">${text('解锁并重新核对原始结构','Unlock original for correction')}</button><button class="btn" data-trace-mode="erase">${text('删除','Erase')}</button>
        <button class="btn" id="trace-undo">${text('撤销','Undo')}</button><button class="btn" id="trace-redo">${text('重做','Redo')}</button><button class="btn" id="trace-fit">${text('适应','Fit')}</button>
      </div>
      <div class="trace-toolbar">
        <label>${text('新墙／导入默认墙厚','New wall / import default thickness')} <input id="trace-thickness" type="number" min="60" max="600" step="10" value="200"> mm</label>
        <label>${text('墙类型','Wall type')} <select id="trace-kind"><option value="n">${text('非承重','Partition')}</option><option value="e">${text('外墙','Exterior')}</option><option value="b">${text('承重','Bearing')}</option></select></label>
        <label>${text('门窗宽','Opening width')} <input id="trace-length" type="number" min="300" max="6000" step="50" value="900"> mm</label>
        <label data-window-field>窗台高 <input id="trace-window-sill" type="number" min="0" max="2400" value="900"> mm</label><label data-window-field>窗高 <input id="trace-window-height" type="number" min="100" max="2800" value="1500"> mm</label><label data-bay-field>飘窗进深 <input id="trace-bay-depth" type="number" min="200" max="2000" value="600"> mm</label><label data-bay-field>飘窗台高 <input id="trace-bay-height" type="number" min="100" max="1800" value="450"> mm</label><label data-bay-field>飘窗窗顶 <input id="trace-bay-head" type="number" max="2800" value="2400"> mm</label>
        <label><input id="trace-entry" type="checkbox">${text('入户门','Entry door')}</label>
        <label>${text('开启侧','Swing side')} <select id="trace-side"><option value="1">${text('下 / 右','Down / Right')}</option><option value="-1">${text('上 / 左','Up / Left')}</option></select></label>
        <label>${text('底图','Image')} <input id="trace-opacity" type="range" min="0" max="1" step=".1" value=".65"></label>
      </div>
      <p class="trace-hint" id="trace-stage" role="status"></p><p class="trace-hint" id="trace-hint"></p><div id="trace-properties" class="trace-toolbar" hidden></div>
      <div class="trace-work"><svg class="trace-canvas" id="trace-canvas" tabindex="0" aria-label="${text('户型描图画布','Floor plan tracing canvas')}"></svg><div class="trace-empty" id="trace-empty"><b>${text('先导入 DXF，或用图片描图','Import DXF, or trace an image')}</b><p>${text('DXF 保留尺寸；图片需要两点校准。文件仅保存在本机。','DXF preserves dimensions; images need calibration. Files stay on this device.')}</p></div></div>
      <div class="trace-bottom"><div class="trace-status" id="trace-status" role="status" aria-live="polite"></div><button class="btn primary" id="trace-finish">${text('生成户型，开始布置','Build plan & furnish')}</button></div>
    </section>`;
    document.body.append(overlay);
    const q=s=>overlay.querySelector(s),canvas=q('#trace-canvas');
    const report=(message,error=false)=>{q('#trace-status').textContent=message;q('#trace-status').classList.toggle('trace-error',error);};
    const hasBearing=()=>phase==='design'&&draft.walls.some(w=>w.kind==='b'||w.kind==='e');
    const locked=()=>report(text('承重墙已锁定：不能删除、改型或新开／删除门窗。请点击“解锁并重新核对原始结构”，修改后重新确认。','Bearing walls are locked: no deletion, reclassification or opening changes. Create a new plan to re-enter the original structure.'),true);
    const checkpoint=()=>{past.push(copy(draft));if(past.length>60)past.shift();future=[];dirty=true;};
    const setMode=m=>{mode=m;anchor=null;cursor=null;if(m!=='properties'){selectedWall=null;selectedWalls=[];}render();};
    function render(){
      q('#trace-confirm').hidden=phase==='design';q('#trace-unlock').hidden=phase!=='design';overlay.querySelectorAll('[data-window-field]').forEach(el=>el.hidden=mode!=='window');q('#trace-confirm').style.display=phase==='design'?'none':'';overlay.querySelectorAll('[data-bay-field]').forEach(el=>el.hidden=mode!=='bay');
      q('#trace-stage').textContent=(phase==='design'?text('阶段 5：装修设计 · 原始结构已锁定','Stage 5: design · original locked'):draft.scale?text('阶段 4：核对尺寸、分类与已有门窗 → 保存或确认原始结构','Stage 4: verify dimensions, types and openings → save or confirm'):text('阶段 1：选择模板或上传文件 → 单位 → 图层 → 修复预览 → 核对结构','Stage 1: template/file → units → layers → repair preview → verify'))+' · '+(dirty?text('本次编辑未保存','Unsaved edits'):text('无未保存修改','No unsaved edits'));
      q('#trace-properties').hidden=!selectedWall;
      q('#trace-finish').textContent=phase==='survey'?text('保存原始结构（未锁定）','Save original structure (unlocked)'):text('保存装修方案，开始布置','Save design & furnish');
      canvas.setAttribute('viewBox',box.join(' '));
      q('#trace-empty').hidden=!!draft.image||draft.source==='dxf';
      q('#trace-empty').style.display=draft.image||draft.source==='dxf'?'none':'grid';
      q('#trace-undo').disabled=!past.length;q('#trace-redo').disabled=!future.length;
      overlay.querySelectorAll('[data-trace-mode]').forEach(b=>b.classList.toggle('on',b.dataset.traceMode===mode));
      const hints={bay:text('设洞口宽、进深、台高和窗顶，再点击外围墙；外凸方向自动识别。飘窗台不计使用面积，保存后点击任一面窗可编辑尺寸。','Set width, depth and heights, then click a perimeter wall. Bay platforms are excluded from floor area.'),properties:text('点击墙体查看和修改类型、墙厚、位置与长度。确认原始结构后，承重墙和外墙仅可查看。','Click a wall to edit its type, thickness, position and length. Bearing/exterior walls become read-only after confirmation.'),calibrate:text('在底图上点击一条已知长度的两端，再输入实际长度（mm）。','Click both ends of a known length, then enter its actual length in mm.'),wall:text('沿墙中心线连续点击描墙；自动锁定水平/垂直并吸附端点。Esc 结束一段。闭合外轮廓后加隔墙。','Click along wall centerlines; horizontal/vertical locking and endpoint snapping. Esc ends a chain. Close the outline, then add partitions.'),door:text('点击已有墙段放门。入户门最多一扇；开启侧可在生成后通过属性调整。','Click a wall to place a door. One entry door maximum; adjust its swing later.'),window:text('点击已有墙段放窗；门窗会自动切开墙体洞口。','Click a wall to place a window. Openings cut through the wall.'),erase:text('点击门窗或墙体删除；删除墙体也会移除其门窗。','Click an opening or wall to delete it. Deleting a wall removes its openings.')};
      q('#trace-hint').textContent=hints[mode]+' '+(phase==='design'?text('装修阶段：承重墙／外墙锁定；棕色非承重墙可修改。','Design: bearing/exterior walls locked, partitions editable.'):text('原始结构录入：可补录已有门窗和逐墙分类，确认后锁定。','Original survey: record existing openings and wall types, then confirm to lock.'))+' '+text('滚轮缩放 · 中键或 Alt+拖动平移。当前支持正交户型，不支持斜墙、庭院或独立柱岛。','Scroll to zoom; middle button or Alt+drag to pan. Orthogonal plans only; no diagonal walls, courtyards or column islands.');
      const s=draft.scale||10, stroke=box[2]/900;
      let html=draft.image?`<image href="${draft.image}" x="0" y="0" width="${draft.width}" height="${draft.height}" opacity="${q('#trace-opacity').value}"/>`:'';
      html+=draft.walls.map(w=>{const r=FurnishDraft.wallRect(w,s,draft.walls).slice(0,4).map(v=>v/s),color=w.kind==='b'?'#322e29':w.kind==='e'?'#736859':'#a17b54';return `<rect data-w="${esc(w.id)}" x="${r[0]}" y="${r[1]}" width="${r[2]-r[0]}" height="${r[3]-r[1]}" fill="${color}" opacity=".65" stroke="${selectedWalls.includes(w.id)||selectedWall===w.id?'#ef5a24':color}" stroke-width="${stroke*2}"><title>${esc(w.id)} · ${w.kind==='b'?'承重':w.kind==='e'?'外墙':'非承重'} · ${w.thickness} mm</title></rect><line x1="${w.a[0]}" y1="${w.a[1]}" x2="${w.b[0]}" y2="${w.b[1]}" stroke="${color}" stroke-width="${stroke}" stroke-dasharray="${stroke*5} ${stroke*3}" pointer-events="none"/>`;}).join('');
      try{const preview=FurnishDraft.build(draft);for(const r of preview.rooms.filter(v=>v.bayId))html+=`<polygon data-bay="${esc(r.bayId)}" points="${r.poly.map(p=>p.map(v=>v/s).join(',')).join(' ')}" fill="#e2dacb" stroke="#267bba" stroke-width="${stroke*2}" pointer-events="none"/>`;for(const w of preview.wins.filter(v=>v.bayId))html+=`<rect x="${w.rect[0]/s}" y="${w.rect[1]/s}" width="${(w.rect[2]-w.rect[0])/s}" height="${(w.rect[3]-w.rect[1])/s}" fill="#267bba" pointer-events="none"/>`;}catch(e){}
      for(const o of draft.openings){const w=draft.walls.find(w=>w.id===o.wall);if(!w)continue;const h=w.a[1]===w.b[1],c=w.a.map((v,i)=>v+(w.b[i]-v)*o.t),l=o.length/s/2;
        html+=`<line data-o="${esc(o.id)}" x1="${c[0]-(h?l:0)}" y1="${c[1]-(h?0:l)}" x2="${c[0]+(h?l:0)}" y2="${c[1]+(h?0:l)}" stroke="${o.kind==='window'?'#267bba':o.entry?'#e75d28':'#139687'}" stroke-width="${w.thickness/s+stroke*2}"/>`;
        html+=`<text x="${c[0]}" y="${c[1]-stroke*8}" text-anchor="middle" font-size="${stroke*12}" fill="#343029">${o.bay?text('飘窗','Bay window'):o.kind==='window'?text('窗','Window'):o.entry?text('入户','Entry'):text('门','Door')} ${o.length}</text>`;
      }
      if(anchor&&cursor&&mode==='wall')html+=`<text x="${(anchor[0]+cursor[0])/2}" y="${(anchor[1]+cursor[1])/2-stroke*8}" font-size="${stroke*12}" fill="#a33">${Math.round(Math.hypot(cursor[0]-anchor[0],cursor[1]-anchor[1])*s)} mm</text>`;
      if(anchor){html+=`<circle cx="${anchor[0]}" cy="${anchor[1]}" r="${stroke*5}" fill="#ef5a24"/>`;if(cursor)html+=`<line x1="${anchor[0]}" y1="${anchor[1]}" x2="${cursor[0]}" y2="${cursor[1]}" stroke="#ef5a24" stroke-width="${stroke*2}" stroke-dasharray="${stroke*6} ${stroke*4}"/>`;}
      const active=draft.walls.find(w=>w.id===selectedWall);
      if(active&&!(phase==='design'&&['b','e'].includes(active.kind)))html+=['a','b'].map(end=>`<circle data-end="${end}" cx="${active[end][0]}" cy="${active[end][1]}" r="${stroke*6}" fill="#ef5a24" stroke="white" stroke-width="${stroke*2}"><title>拖动端点：保持正交并吸附</title></circle>`).join('');
      canvas.innerHTML=html;
      let live=liveValue;const nextKey=JSON.stringify([draft.walls,draft.openings,draft.scale]);if(nextKey!==liveKey){try{const plan=FurnishDraft.build(draft);live=text(' · '+plan.rooms.filter(r=>r.counted!==false).length+' 个房间 · '+plan.rooms.filter(r=>r.counted!==false).reduce((n,r)=>n+FurnishProject.area(r.poly),0).toFixed(2)+' m²',' · '+plan.rooms.filter(r=>r.counted!==false).length+' rooms');}catch(e){live=text(' · 墙线尚未闭合或门窗冲突',' · Incomplete walls or conflicting openings');}liveKey=nextKey;liveValue=live;}
      report(draft.scale?text(`比例 ${draft.scale.toFixed(3)} mm/像素 · ${draft.walls.length} 段墙 · ${draft.openings.length} 处门窗${live}`,`Scale ${draft.scale.toFixed(3)} mm/pixel · ${draft.walls.length} walls · ${draft.openings.length} openings`):text('未校准：导入后请先标定一段已知尺寸。','Not calibrated: mark a known dimension after importing.'));
    }
    function position(e){const p=canvas.createSVGPoint();p.x=e.clientX;p.y=e.clientY;const m=canvas.getScreenCTM();if(!m)return [0,0];const v=p.matrixTransform(m.inverse());return [v.x,v.y];}
    function snapped(p){
      let v=[Math.round(Math.max(0,Math.min(draft.width,p[0]))*100)/100,Math.round(Math.max(0,Math.min(draft.height,p[1]))*100)/100];
      const radius=box[2]/60;
      const endpoints=draft.walls.flatMap(w=>[w.a,w.b]);
      for(let axis=0;axis<2;axis++){const near=endpoints.filter(a=>Math.abs(a[axis]-v[axis])<radius).sort((a,b)=>Math.abs(a[axis]-v[axis])-Math.abs(b[axis]-v[axis]))[0];if(near)v[axis]=near[axis];}
      if(anchor && mode==='wall'){if(Math.abs(v[0]-anchor[0])>=Math.abs(v[1]-anchor[1]))v[1]=anchor[1];else v[0]=anchor[0];}
      return v;
    }
    function nearest(p){
      return draft.walls.map(w=>{const dx=w.b[0]-w.a[0],dy=w.b[1]-w.a[1],t=Math.max(0,Math.min(1,((p[0]-w.a[0])*dx+(p[1]-w.a[1])*dy)/(dx*dx+dy*dy)));return {w,t,d:Math.hypot(p[0]-w.a[0]-dx*t,p[1]-w.a[1]-dy*t)};}).sort((a,b)=>a.d-b.d)[0];
    }
    canvas.addEventListener('pointerdown',e=>{
      if(loading)return; if(e.button===1||e.altKey){e.preventDefault();pan={p:position(e),box:[...box]};canvas.setPointerCapture(e.pointerId);return;}
      if(e.button!==0)return;e.preventDefault();canvas.focus();
      const end=e.target.dataset.end;if(end&&selectedWall){const w=draft.walls.find(w=>w.id===selectedWall);if(phase==='design'&&['b','e'].includes(w.kind))return locked();wallDrag={end,id:w.id,before:copy(draft)};canvas.setPointerCapture(e.pointerId);return;}
      if(!draft.image&&draft.source!=='dxf')return report(text('请先导入 DXF 或图片。','Import DXF or an image first.'),true);
      const p=position(e);
      if(p[0]<0||p[1]<0||p[0]>draft.width||p[1]>draft.height)return;
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
        const v=snapped(p);if(!anchor){chainGroup='trace_chain_'+uid();anchor=v;cursor=v;render();return;}
        const length=Math.hypot(v[0]-anchor[0],v[1]-anchor[1])*draft.scale,thickness=Number(q('#trace-thickness').value);
        if(length<100)return report(text('墙段至少 100 mm。','Walls must be at least 100 mm.'),true);
        if(!Number.isFinite(thickness)||thickness<60||thickness>600||draft.walls.length>=100)return report(text('墙厚须为 60–600 mm，最多 100 段墙。','Thickness: 60–600 mm; maximum 100 walls.'),true);
        if(phase==='design'&&q('#trace-kind').value!=='n')return report(text('装修阶段只允许新建非承重墙。','Only new partitions are allowed during design.'),true);
        checkpoint();draft.walls.push({id:'w_'+uid(),a:[...anchor],b:v,thickness,kind:q('#trace-kind').value,group:chainGroup});anchor=v;cursor=v;render();return;
      }
      const hit=nearest(p);if(!hit||hit.d>Math.max(box[2]/60,hit.w.thickness/draft.scale))return report(text('请点击靠近墙中心的位置。','Click near a wall centerline.'),true);
      if(mode==='properties'){selectedWalls=e.shiftKey?[...new Set([...selectedWalls,hit.w.id])]:[hit.w.id];return wallProperties(hit.w);}
      if(phase==='design'&&['b','e'].includes(hit.w.kind))return locked();
      if(mode==='erase'){
        const o=draft.openings.find(o=>o.wall===hit.w.id&&Math.abs(o.t-hit.t)*Math.hypot(hit.w.b[0]-hit.w.a[0],hit.w.b[1]-hit.w.a[1])*draft.scale<=o.length/2);
        checkpoint();if(o)draft.openings=draft.openings.filter(v=>v.id!==o.id);else{draft.walls=draft.walls.filter(w=>w.id!==hit.w.id);draft.openings=draft.openings.filter(o=>o.wall!==hit.w.id);}render();return;
      }
      const length=Number(q('#trace-length').value),len=Math.hypot(hit.w.b[0]-hit.w.a[0],hit.w.b[1]-hit.w.a[1])*draft.scale,half=length/2;
      if(!Number.isFinite(length)||length<300||length>6000||hit.t*len-half<hit.w.thickness/2||(1-hit.t)*len-half<hit.w.thickness/2)return report(text('门窗宽度无效，或太靠近墙角。','Invalid opening width or too close to a wall corner.'),true);
      if(draft.openings.some(o=>o.wall===hit.w.id&&Math.abs(o.t-hit.t)*len<(o.length+length)/2))return report(text('门窗不能互相重叠。','Openings cannot overlap.'),true);
      const r=FurnishDraft.wallRect(hit.w,draft.scale,draft.walls),axis=hit.w.a[1]===hit.w.b[1]?0:1;
      const center=(hit.w.a[axis]+(hit.w.b[axis]-hit.w.a[axis])*hit.t)*draft.scale,rect=r.slice(0,4);rect[axis]=center-half;rect[axis+2]=center+half;
      if(draft.walls.some(w=>{if(w.id===hit.w.id)return false;const b=FurnishDraft.wallRect(w,draft.scale,draft.walls);return Math.min(b[2],rect[2])-Math.max(b[0],rect[0])>0&&Math.min(b[3],rect[3])-Math.max(b[1],rect[1])>0;}))return report(text('门窗不能跨越隔墙交接处，请换一个位置。','Openings cannot cross a wall junction. Choose another position.'),true);
      const entry=mode==='door'&&q('#trace-entry').checked;if(entry&&draft.openings.some(o=>o.entry))return report(text('已有入户门，请先删除或取消勾选。','An entry door already exists.'),true);
      const opening={id:'o_'+uid(),wall:hit.w.id,t:hit.t,length,kind:mode==='bay'?'window':mode,side:Number(q('#trace-side').value),entry};if(mode==='window'){opening.sill=Number(q('#trace-window-sill').value);const height=Number(q('#trace-window-height').value);opening.head=opening.sill+height;if(!Number.isFinite(height)||height<100||opening.sill<0||opening.head>2800)return report('窗台高须非负，窗高至少100 mm，窗顶不得超过2800 mm',true);}if(mode==='bay'){opening.bay={depth:Number(q('#trace-bay-depth').value),height:Number(q('#trace-bay-height').value),head:Number(q('#trace-bay-head').value)};try{const test=copy(draft);test.openings.push(opening);FurnishDraft.build(test);}catch(e){return report(e.message,true);}}checkpoint();draft.openings.push(opening);render();
    });
    canvas.addEventListener('pointermove',e=>{if(wallDrag){
      const next=copy(wallDrag.before),w=next.walls.find(w=>w.id===wallDrag.id),old=w[wallDrag.end],other=w[wallDrag.end==='a'?'b':'a'],p=snapped(position(e)),h=w.a[1]===w.b[1];p[h?1:0]=other[h?1:0];
      for(const wall of next.walls)for(const end of ['a','b'])if(wall[end][0]===old[0]&&wall[end][1]===old[1]){if(phase==='design'&&['b','e'].includes(wall.kind))return locked();wall[end]=[...p];}
      try{FurnishDraft.validate(next);if(phase==='design')FurnishProject.assertStructure(baseline,next);draft=next;render();report(text('端点拖动 · 当前长度 ','Endpoint drag · length ')+Math.round(Math.hypot(w.a[0]-w.b[0],w.a[1]-w.b[1])*draft.scale)+' mm');}catch(err){report(err.message,true);}return;
    }if(pan){const p=position(e);box[0]+=pan.p[0]-p[0];box[1]+=pan.p[1]-p[1];render();return;}if(anchor){cursor=mode==='wall'?snapped(position(e)):position(e);render();}});
    const endPan=e=>{pan=null;if(wallDrag){const before=wallDrag.before;wallDrag=null;if(e.type==='pointercancel'){draft=before;}else if(JSON.stringify(before)!==JSON.stringify(draft)){past.push(before);if(past.length>60)past.shift();future=[];dirty=true;}const w=draft.walls.find(w=>w.id===selectedWall);if(w)wallProperties(w);else render();}};canvas.addEventListener('pointerup',endPan);canvas.addEventListener('pointercancel',endPan);
    canvas.addEventListener('wheel',e=>{e.preventDefault();const p=position(e),factor=e.deltaY>0?1.15:1/1.15;if(box[2]*factor<draft.width/30||box[2]*factor>draft.width*5)return;box=[p[0]+(box[0]-p[0])*factor,p[1]+(box[1]-p[1])*factor,box[2]*factor,box[3]*factor];render();},{passive:false});
    overlay.querySelectorAll('[data-trace-mode]').forEach(b=>b.onclick=()=>setMode(b.dataset.traceMode));
    const undoDraft=()=>{if(!past.length)return;future.push(copy(draft));draft=past.pop();anchor=null;selectedWall=null;selectedWalls=[];dirty=true;render();};
    const redoDraft=()=>{if(!future.length)return;past.push(copy(draft));draft=future.pop();anchor=null;selectedWall=null;dirty=true;render();};
    q('#trace-undo').onclick=undoDraft;q('#trace-redo').onclick=redoDraft;
    q('#trace-fit').onclick=()=>{box=[0,0,draft.width,draft.height];try{const plan=FurnishDraft.build(draft),points=plan.rooms.filter(r=>r.bayId).flatMap(r=>r.poly.map(p=>p.map(v=>v/draft.scale)));if(points.length){const x=Math.min(0,...points.map(p=>p[0]))-30,y=Math.min(0,...points.map(p=>p[1]))-30;box=[x,y,Math.max(draft.width,...points.map(p=>p[0]))-x+30,Math.max(draft.height,...points.map(p=>p[1]))-y+30];}}catch(e){}render();};q('#trace-opacity').oninput=render;
    function key(e){if(!$('#dlg').hidden)return;e.stopImmediatePropagation();
      if(e.key==='Tab'){const controls=[...overlay.querySelectorAll('button,input,select,[tabindex="0"]')].filter(el=>!el.disabled&&el.getClientRects().length);const first=controls[0],last=controls.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}
      if(e.key==='Escape'){e.preventDefault();anchor=null;cursor=null;render();}if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='z'&&!e.target.matches('input,select')){e.preventDefault();e.shiftKey?redoDraft():undoDraft();}}
    document.addEventListener('keydown',key,true);
    function showWallPanel(options){
      const panel=q('#trace-properties');panel.hidden=false;panel.innerHTML='<div style="width:100%">'+options.body+'<button class="btn primary" id="wp-apply">'+text('应用墙属性','Apply wall properties')+'</button><button class="btn" id="wp-close">'+text('取消选择','Clear selection')+'</button></div>';
      const action=options.actions.find(a=>a.fn);q('#wp-apply').hidden=!action;q('#wp-apply').onclick=()=>{if(action.fn()!==false){const w=draft.walls.find(w=>w.id===selectedWall);if(w)wallProperties(w);}};
      q('#wp-close').onclick=()=>{selectedWall=null;selectedWalls=[];render();};
    }
    function wallProperties(w){selectedWall=w.id;if(!selectedWalls.includes(w.id))selectedWalls=[w.id];render();
      const readOnly=phase==='design'&&['b','e'].includes(w.kind),h=w.a[1]===w.b[1],length=Math.hypot(w.a[0]-w.b[0],w.a[1]-w.b[1])*draft.scale;
      showWallPanel({title:text('墙体属性','Wall properties'),body:`<p>${readOnly?text('结构已锁定，只能查看。','Structure locked; read-only.'):text('坐标相对于描图画布，单位 mm。正交墙保持原方向；移动后请检查墙线闭合。','Coordinates are relative to the tracing canvas, in mm. Check junctions after moving.')} · ID ${esc(w.id)}</p><label>${text('墙类型','Wall type')} <select id="wp-kind" ${readOnly?'disabled':''}>${[['n',text('非承重','Partition')],['b',text('承重','Bearing')],['e',text('外墙','Exterior')]].map(([v,n])=>`<option value="${v}" ${v===w.kind?'selected':''}>${n}</option>`).join('')}</select></label><div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:12px">${[['x',text('起点 X','Start X'),w.a[0]*draft.scale],['y',text('起点 Y','Start Y'),w.a[1]*draft.scale],['length',text('长度','Length'),length],['thickness',text('墙厚','Thickness'),w.thickness]].map(([id,n,v])=>`<label>${n} (mm) <input id="wp-${id}" type="number" value="${v.toFixed(2)}" ${readOnly?'disabled':''}></label>`).join('')}</div><p id="wp-error" role="alert" class="trace-error"></p>`,actions:[{label:text('关闭','Close')},...(!readOnly?[{label:text('应用墙属性','Apply wall properties'),cls:'primary',fn:()=>{try{const x=Number($('#wp-x').value)/draft.scale,y=Number($('#wp-y').value)/draft.scale,len=Number($('#wp-length').value)/draft.scale,thickness=Number($('#wp-thickness').value),kind=$('#wp-kind').value;if(phase==='design'&&kind!=='n')throw Error(text('装修阶段只能新增／调整非承重墙。','Only partitions can be changed in design mode.'));if(!Number.isFinite(len)||len*draft.scale<100)throw Error(text('墙长至少 100 mm。','Wall length must be at least 100 mm.'));const sign=h?Math.sign(w.b[0]-w.a[0]):Math.sign(w.b[1]-w.a[1]),next=copy(draft),wall=next.walls.find(v=>v.id===w.id);Object.assign(wall,{a:[x,y],b:h?[x+len*sign,y]:[x,y+len*sign],thickness,kind});FurnishDraft.validate(next);checkpoint();draft=next;render();return true;}catch(e){$('#wp-error').textContent=e.message;return false;}}}]:[])]});wallBatchPanel(w);
    }
    function wallBatchPanel(w){
      const members=draft.walls.filter(v=>selectedWalls.includes(v.id)),allLocked=members.some(v=>phase==='design'&&v.kind!=='n');
      q('#trace-properties').insertAdjacentHTML('beforeend',`<div style="width:100%;border-top:1px solid var(--line);padding-top:8px"><b>已选 ${members.length} 段墙</b> · Shift+点击追加墙段 · 虚线为中心线，填充边界为实际墙面。<button class="btn" id="wp-group-select" ${w.group?'':'disabled'}>选择整组折墙</button><button class="btn" id="wp-group-create">将所选墙段编组</button><button class="btn" id="wp-group-clear" ${w.group?'':'disabled'}>取消所选编组</button><label>批量墙厚 mm <input id="wp-batch-thickness" type="number" min="60" max="600" value="${w.thickness}"></label><button class="btn" id="wp-batch-apply" ${allLocked?'disabled':''}>应用到所选墙段</button><small>${allLocked?'所选包含已锁定承重／外墙，不能批量改厚。':'改变墙厚以中心线为基准向两侧展开，位置不变，净面积同步重算。'}</small></div>`);
      q('#wp-group-select').onclick=()=>{selectedWalls=draft.walls.filter(v=>v.group===w.group).map(v=>v.id);wallProperties(w);};
      const apply=values=>{try{const next=FurnishDraft.batchWalls(draft,selectedWalls,values);if(phase==='design')FurnishProject.assertStructure(baseline,next);checkpoint();draft=next;wallProperties(draft.walls.find(v=>v.id===w.id));}catch(e){q('#wp-error').textContent=e.message;}};
      q('#wp-group-create').onclick=()=>apply({group:'wall_group_'+uid()});q('#wp-group-clear').onclick=()=>apply({group:''});q('#wp-batch-apply').onclick=()=>apply({thickness:Number(q('#wp-batch-thickness').value)});
    }
    q('#trace-unlock').onclick=()=>{if(!confirm(text('解锁用于修正原始结构资料，会重新建立结构基线。保留当前墙体、门窗和家具，无需重新导入；保存后旧撤销历史清空。确认修改后请重新锁定。继续？','Unlock to correct the original structure and rebuild its baseline?')))return;phase='survey';baseline=null;revisingOriginal=true;past=[];future=[];dirty=true;setMode('properties');report('原始结构已解锁，可修改墙体与门窗。修改后重新确认并保存。');};
    q('#trace-confirm').onclick=()=>{try{const checked=FurnishDraft.build(draft);if(!confirm(text(`确认原始结构：${checked.rooms.filter(r=>r.counted!==false).length} 个房间，净面积 ${checked.rooms.filter(r=>r.counted!==false).reduce((n,r)=>n+FurnishProject.area(r.poly),0).toFixed(2)} m²，${draft.walls.length} 段墙，${draft.openings.length} 处门窗。已核对尺寸、逐墙分类及已有门窗？确认后承重／外墙锁定；保存与确认是两个步骤。`, 'Verify dimensions, wall types and existing openings. Confirmation locks bearing/exterior walls; saving is a separate step.')))return;baseline=copy(draft);phase='design';past=[];future=[];dirty=true;render();report(text('原始结构已确认。承重墙、外墙和其已有门窗已锁定。保存后即可进行装修设计。','Original structure confirmed. Bearing/exterior walls and existing openings are locked. Save to start designing.'));}catch(e){report(text('无法确认：','Cannot confirm: ')+e.message,true);}};
    function close(){document.removeEventListener('keydown',key,true);overlay.remove();button.focus();}
    function cancel(){if(dirty && !confirm(text('放弃本次尚未生成的描图修改？','Discard unbuilt tracing changes?')))return;close();}
    q('#trace-close').onclick=cancel;
    q('#trace-new').onclick=()=>{if(dirty&&!confirm(text('放弃本次描图并新建？','Discard this draft and start a new plan?')))return;close();openEditor(true);};
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
          const pdfjs=await import('./vendor/pdfjs/pdf.js');pdfjs.GlobalWorkerOptions.workerSrc='./vendor/pdfjs/pdf.worker.js';
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
      openDialog({title:text('DXF 模板与绘图规范','DXF templates & drawing guide'),wide:true,body:`<p>综合示例合并了多墙厚、连续折墙、普通窗和飘窗参考线，单位为毫米。导入墙层后应识别 <b>12 段墙、3 个房间，净面积 21.5912 m²</b>。承重分类仅为演示，需按自己的结构资料核对。</p><ol><li>使用二维正交中心线；支持 LINE、无弧段的 LWPOLYLINE／POLYLINE。外轮廓闭合，隔墙接到中心线，不为门窗断开墙线。弧墙、斜墙、三维实体及块 INSERT 不能直接作为墙导入。</li><li>图层后缀预填墙厚：承重 200、外墙 240、非承重 100／120 mm。可按图层调整，墙属性可逐段或批量修改，允许 60–600 mm。</li><li>中间 100 mm 折墙是一条包含 3 段的多段线；导入后选任一段，再点“选择整组折墙”。各段保留独立坐标、长度和墙厚；拐角按实际墙面连接，120 mm 支墙与它形成 T 形交接。</li><li>下侧外墙包含宽 1200、进深 600 mm 的落地外凸折形，属于真实外轮廓，计入净面积；整条外墙多段线保留编组。请勿把这种外凸轮廓当作抬高飘窗。</li><li>普通窗参考宽 1200 mm，位于 CAD 顶墙 X=1000–2200。导入后点“窗”、设宽 1200，再在顶墙 X=1600 处定位。窗台高度可在主画布窗属性调整，窗顶默认 2400 mm。</li><li>抬高飘窗参考洞宽 1600、外凸 600 mm，位于顶墙 X=3600–5200。只在完整基墙上补录 1600 mm 窗洞；外凸辅助线不自动生成实体；导入后可选“飘窗”，设洞宽1600、进深600、台高450毫米，在顶墙X=4400处录入独立窗台和三面窗，窗台不计使用面积。</li><li>蓝色 FURNISH_WINDOW_GUIDE、青色 FURNISH_BAY_GUIDE 和 FURNISH_ANNOTATION 为辅助图层，导入时不选。CAD 中可查看这些线和说明；导入预览只显示选中的墙线，不会自动生成门窗。</li></ol><p>下载和直接加载使用同一份标准 ASCII DXF。加载后仍需核对单位、图层、修复预览及房间结果。空白模板需先在 CAD 中绘墙，不能直接生成房间。</p>`,actions:[{label:text('关闭','Close')},{label:text('下载综合示例','Download complete example'),href:'furnish-template-complete.dxf',download:'furnish-template-complete.dxf'},{label:text('下载空白模板','Download blank'),href:'furnish-template-blank.dxf',download:'furnish-template-blank.dxf'},{label:text('直接加载综合示例并检查','Load complete example & check'),cls:'primary',fn:()=>{setTimeout(()=>importDXF(new File([FurnishTemplates.complete],'furnish-template-complete.dxf')),0);}}]});$('#dlg').style.zIndex='90';
    };
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
        let candidate=null,repaired=null;
        const friendly=error=>{
          const message=error.message;
          if(message.includes('thickness'))return text('请检查每个所选图层的墙厚（60–600 mm）；多墙厚双线转换暂不支持，请使用中心线模式。','Verify 60–600 mm layer thicknesses; mixed-thickness double lines are unsupported.');
          if(message.includes('No enclosed room'))return text('仍未找到闭合房间。请检查选中的图层；较大的门窗断口需手工补齐中心线。','No closed room found. Check layers; large door/window gaps need manual centerlines.');
          if(message.includes('diagonal')||message.includes('Diagonal'))return text('存在明显斜墙，超过轻微倾斜修复范围。请调整图层或手工修改。','Diagonal walls exceed the repair tolerance. Adjust layers or edit manually.');
          if(message.includes('Cannot safely repair'))return text('所选图层包含弧段或三维实体，当前不能可靠转换。','Selected layers contain curved or 3D entities that cannot be safely converted.')+' '+message;
          if(/3D|Non-planar/.test(message))return text('所选墙图层含非零 Z 高度或非平面实体。请在 CAD 中核对并导出 Z=0 的二维墙中心线。','Selected walls contain elevation/non-planar geometry. Export verified 2D centerlines at Z=0.');
          if(message.includes('Select wall layers'))return text('请选择墙体图层。','Select wall layers.');
          if(message.includes('drawing units')||message.includes('Drawing units')||message.includes('DXF drawing units'))return text('请先确认图纸单位。','Choose drawing units first.');
          return message;
        };
        function previewRepair(){
          candidate=null;repaired=null;$('#dxf-error').textContent='';$('#dxf-report').textContent='';$('#dxf-preview').innerHTML='';
          const downloadButton=$('#dlgActions [data-i="1"]'),importButton=$('#dlgActions [data-i="2"]');downloadButton.disabled=importButton.disabled=true;
          try{
            const layers=[...document.querySelectorAll('[data-dxf-layer]:checked')].map(el=>parsed.layers[Number(el.dataset.dxfLayer)].name),mmPerUnit=Number($('#dxf-unit').value);
            const enabled=$('#dxf-auto-repair').checked;
            $('#dxf-gap').disabled=$('#dxf-angle').disabled=$('#dxf-double').disabled=!enabled;
            const layerThicknesses=Object.fromEntries(layers.map(l=>{const i=parsed.layers.findIndex(v=>v.name===l);return [l,Number($('[data-dxf-thickness="'+i+'"]').value)];}));
            const layerKinds=Object.fromEntries(layers.map(l=>{const i=parsed.layers.findIndex(v=>v.name===l);return [l,$('[data-dxf-kind="'+i+'"]').value];}));
            document.querySelectorAll('[data-dxf-kind]').forEach(el=>{el.disabled=!document.querySelector('[data-dxf-layer="'+el.dataset.dxfKind+'"]').checked;});
            if(layers.some(l=>!['b','n','e'].includes(layerKinds[l])))throw new Error(text('请为每个选中的图层指定墙体类型。','Assign a wall type to every selected layer.'));
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
            const plan=FurnishDraft.build(next);candidate=next;
            $('#dxf-report').textContent+=' '+text(`校验通过：${plan.rooms.filter(r=>r.counted!==false).length} 个闭合房间，净面积 ${plan.rooms.filter(r=>r.counted!==false).reduce((n,r)=>n+FurnishProject.area(r.poly),0).toFixed(2)} m²。下一步：导入后补录门窗并核对结构。`,`Validated: ${plan.rooms.filter(r=>r.counted!==false).length} closed rooms.`);
            downloadButton.disabled=!repaired;importButton.disabled=false;
          }catch(error){candidate=null;$('#dxf-error').textContent=text('尚不能导入：','Cannot import yet: ')+friendly(error);}
        }
        openDialog({title:text('DXF 检查与自动修复','DXF check & automatic repair'),wide:true,
          body:`<p><b>① 文件检查通过 → ② 单位 → ③ 图层与类型 → ④ 修复预览 → ⑤ 导入后核对</b></p><p>${esc(file.name)} · ${(file.size/1024).toFixed(1)} KB · ASCII DXF</p><p>${text('请选择墙体图层，逐层指定墙厚（60–600 mm），不会按承重类型统一厚度。自动处理重复/共线碎段、小接缝和轻微倾斜；双线墙可按指定墙厚转换中心线。输出是所选墙线的兼容 DXF，不改写原文件。','Choose wall layers. Clean duplicates, fragments, small gaps and slight skew. Optionally convert double lines using wall thickness. Output is a compatible wall-only DXF; the original stays intact.')}</p>
          <label>${text('图纸单位（请核对）','Drawing units (verify)')} <select id="dxf-unit">${!parsed.mmPerUnit?`<option value="">${text('请选择单位','Choose units')}</option>`:''}${options.map(([v,label])=>`<option value="${v}" ${parsed.mmPerUnit===v?'selected':''}>${label}</option>`).join('')}</select></label>
          <p>${parsed.mmPerUnit?text(`检测到 INSUNITS=${parsed.unitCode}。`,`Detected INSUNITS=${parsed.unitCode}.`):text('未检测到支持的单位，请手动指定。','No supported units found. Specify manually.')}</p>
          <div class="opts">${parsed.layers.map((l,i)=>{const defaults=FurnishDXF.layerDefaults(l.name),known=defaults.kind;return `<div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap"><label class="opt" style="flex:1"><input type="checkbox" data-dxf-layer="${i}" ${parsed.layers.length===1||known?'checked':''}><span><b>${esc(l.name)}</b><small>${l.count} ${text('段','segments')}${l.issues.length?' · '+esc(l.issues[0]):''}</small></span></label><select data-dxf-kind="${i}" aria-label="${esc(l.name)} ${text('墙类型','wall type')}">${[['',text('请选择类型','Choose type')],['b',text('承重（锁定）','Bearing (locked)')],['n',text('非承重（可修改）','Partition (editable)')],['e',text('外墙','Exterior')]].map(([v,label])=>`<option value="${v}" ${known===v?'selected':''}>${label}</option>`).join('')}</select><label>墙厚 mm <input type="number" data-dxf-thickness="${i}" min="60" max="600" value="${defaults.thickness??q('#trace-thickness').value}" style="width:75px" aria-label="${esc(l.name)} 墙厚 mm"></label></div>`;}).join('')}</div><p>${text('请按结构图逐层指定，不能仅凭墙厚判断承重。确认原始结构后锁定承重墙；黑色为承重，棕色为非承重。','Assign types using structural drawings. Thickness does not establish bearing status. Confirm the original structure to lock bearing walls; black = bearing, brown = partition.')}</p>
          <label class="opt" style="margin-top:12px"><input id="dxf-auto-repair" type="checkbox" checked><span><b>${text('自动修复兼容性','Automatically repair compatibility')}</b><small>${text('统一为 mm，清除重复、合并碎段、修复小接缝和轻微倾斜。','Normalize to mm, deduplicate, merge, close small gaps and align minor skew.')}</small></span></label>
          <div style="display:flex;gap:12px;flex-wrap:wrap;margin:12px 0"><label>${text('接缝容差','Gap tolerance')} <input id="dxf-gap" type="number" min="0" max="100" value="30" style="width:70px"> mm</label><label>${text('扶正角度','Alignment angle')} <input id="dxf-angle" type="number" min="0" max="2" step=".1" value="0.5" style="width:70px"> °</label></div>
          <label class="opt"><input id="dxf-double" type="checkbox"><span><b>${text('双线墙转中心线（可选）','Convert double-line walls (optional)')}</b><small>${text(`按墙厚 ${q('#trace-thickness').value} mm 配对，仅处理能确定的平行墙线；转换会改变轮廓表示，请核对预览。`,`Pair at ${q('#trace-thickness').value} mm wall thickness. Only unambiguous pairs; verify the preview.`)}</small></span></label>
          <p>${text('未转换的其他实体','Other entities not converted')}: ${esc(Object.entries(parsed.ignored).map(([k,v])=>`${k} × ${v}`).join(', ')||'0')}</p>
          <p>${text('块 INSERT、弧墙、三维墙和大断口当前需手工处理。墙体图层不要混入标注、家具或门窗符号。','Blocks, curved/3D walls and large gaps need manual editing. Exclude dimensions, furniture and opening symbols from wall layers.')}</p>
          <p id="dxf-report" role="status" aria-live="polite"></p><div id="dxf-preview"></div><div class="trace-error" id="dxf-error" role="alert"></div>`,
          onOpen:()=>{document.querySelectorAll('#dlgBody input,#dlgBody select').forEach(el=>el.addEventListener('change',previewRepair));previewRepair();},
          actions:[{label:text('取消','Cancel')},{label:text('下载修复后 DXF','Download repaired DXF'),fn:()=>{if(candidate&&repaired)download(file.name.replace(/\.dxf$/i,'')+'-furnish-fixed.dxf',new Blob([FurnishDXFRepair.exportDXF(repaired)],{type:'application/dxf'}));return false;}},{label:text('导入校验后的户型','Import validated plan'),cls:'primary',fn:()=>{if(!candidate)return false;checkpoint();draft=candidate;phase='survey';baseline=null;box=[0,0,draft.width,draft.height];setMode('door');return true;}}]});$('#dlg').style.zIndex='90';
      }catch(error){report(text('DXF 读取失败：','DXF could not be read: ')+error.message,true);}finally{loading=false;q('#trace-finish').disabled=false;}
    };
    q('#trace-finish').onclick=()=>{
      draft.name=q('#trace-name').value.trim();
      let plan;
      try{if(phase==='design'&&baseline)FurnishProject.assertStructure(baseline,draft);plan=FurnishDraft.build(draft);}catch(error){report(text('无法生成：请检查校准、闭合墙线及门窗位置。详情：','Cannot build: check calibration, closed walls and opening positions. Details: ')+error.message,true);return;}
      const architecture={draft:copy(draft),phase,...(baseline?{baseline:copy(baseline)}:{}),...(revisingOriginal?{originalRevisions:[...(originalArch?.originalRevisions||[]),copy(originalArch.baseline||originalArch.draft)].slice(-10)}:originalArch?.originalRevisions?{originalRevisions:copy(originalArch.originalRevisions)}:{})};
      if(original){
        const before=snap();state.open=FurnishProject.remapOpenings(PLAN,plan,state.open);state.architecture=architecture;state.demolished=[];
        state.rooms=FurnishProject.remapRooms(ROOMS,plan.rooms,state.rooms);
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
    render();q('#trace-dxf').focus();
  }
})();
