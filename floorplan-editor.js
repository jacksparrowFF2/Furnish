/* Image tracing workspace; shares the existing app's plan, save and undo flow. */
(function () {
  'use strict';
  const copy=v=>JSON.parse(JSON.stringify(v));
  const text=(zh,en)=>tr(zh,en);
  const button=document.createElement('button');
  button.id='tracePlan'; button.className='btn outline'; button.dataset.en='Import DXF / Trace plan'; button.textContent='导入 DXF / 描图';
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
  @media(max-width:700px){.trace-overlay{padding:0}.trace-box{height:100dvh;border-radius:0}.trace-top,.trace-toolbar{padding:8px}.trace-top input{max-width:150px}.trace-toolbar .btn{padding:6px 9px}.trace-hint{padding:7px 10px}.trace-bottom{padding:8px}}
  @media print{.trace-overlay{display:none}}
  `;
  document.head.append(style);
  function openEditor(forceNew=false) {
    if(document.querySelector('.trace-overlay')) return;
    const original=!forceNew && state.architecture?.draft;
    let draft=original?copy(original):{version:1,id:'custom_'+Date.now().toString(36),name:text('我的户型','My floor plan'),width:1000,height:700,image:'',scale:0,walls:[],openings:[]};
    let mode=original?'wall':'calibrate',anchor=null,cursor=null,box=[0,0,draft.width,draft.height],pan=null,loading=false,dirty=false;
    let past=[],future=[];
    const overlay=document.createElement('div');overlay.className='trace-overlay';overlay.innerHTML=`
    <section class="trace-box" role="dialog" aria-modal="true" aria-labelledby="trace-title">
      <div class="trace-top"><h2 id="trace-title">${text('绘制我的户型','Trace my floor plan')}</h2><input id="trace-name" aria-label="${text('户型名称','Plan name')}" maxlength="80" value="${esc(draft.name)}"><button class="btn" id="trace-new">${text('新建','New')}</button><button class="btn" id="trace-close">${text('取消','Cancel')}</button></div>
      <div class="trace-toolbar">
        <button class="btn primary" id="trace-dxf">${text('导入 DXF（推荐）','Import DXF (recommended)')}</button><input type="file" id="trace-dxf-file" accept=".dxf" hidden>
        <button class="btn" id="trace-upload">${text('辅助：导入图片','Image reference')}</button><input type="file" id="trace-file" accept="image/png,image/jpeg,image/webp" hidden>
        <button class="btn" data-trace-mode="calibrate">${text('② 校准比例','② Calibrate')}</button><button class="btn" data-trace-mode="wall">${text('③ 描墙','③ Walls')}</button>
        <button class="btn" data-trace-mode="door">${text('门','Door')}</button><button class="btn" data-trace-mode="window">${text('窗','Window')}</button><button class="btn" data-trace-mode="erase">${text('删除','Erase')}</button>
        <button class="btn" id="trace-undo">${text('撤销','Undo')}</button><button class="btn" id="trace-redo">${text('重做','Redo')}</button><button class="btn" id="trace-fit">${text('适应','Fit')}</button>
      </div>
      <div class="trace-toolbar">
        <label>${text('墙厚','Wall thickness')} <input id="trace-thickness" type="number" min="60" max="600" step="10" value="200"> mm</label>
        <label>${text('墙类型','Wall type')} <select id="trace-kind"><option value="n">${text('非承重','Partition')}</option><option value="e">${text('外墙','Exterior')}</option><option value="b">${text('承重','Bearing')}</option></select></label>
        <label>${text('门窗宽','Opening width')} <input id="trace-length" type="number" min="300" max="6000" step="50" value="900"> mm</label>
        <label><input id="trace-entry" type="checkbox">${text('入户门','Entry door')}</label>
        <label>${text('开启侧','Swing side')} <select id="trace-side"><option value="1">${text('下 / 右','Down / Right')}</option><option value="-1">${text('上 / 左','Up / Left')}</option></select></label>
        <label>${text('底图','Image')} <input id="trace-opacity" type="range" min="0" max="1" step=".1" value=".65"></label>
      </div>
      <p class="trace-hint" id="trace-hint"></p>
      <div class="trace-work"><svg class="trace-canvas" id="trace-canvas" tabindex="0" aria-label="${text('户型描图画布','Floor plan tracing canvas')}"></svg><div class="trace-empty" id="trace-empty"><b>${text('先导入 DXF，或用图片描图','Import DXF, or trace an image')}</b><p>${text('DXF 保留尺寸；图片需要两点校准。文件仅保存在本机。','DXF preserves dimensions; images need calibration. Files stay on this device.')}</p></div></div>
      <div class="trace-bottom"><div class="trace-status" id="trace-status" role="status" aria-live="polite"></div><button class="btn primary" id="trace-finish">${text('生成户型，开始布置','Build plan & furnish')}</button></div>
    </section>`;
    document.body.append(overlay);
    const q=s=>overlay.querySelector(s),canvas=q('#trace-canvas');
    const report=(message,error=false)=>{q('#trace-status').textContent=message;q('#trace-status').classList.toggle('trace-error',error);};
    const checkpoint=()=>{past.push(copy(draft));if(past.length>60)past.shift();future=[];dirty=true;};
    const setMode=m=>{mode=m;anchor=null;cursor=null;render();};
    function render(){
      canvas.setAttribute('viewBox',box.join(' '));
      q('#trace-empty').hidden=!!draft.image||draft.source==='dxf';
      q('#trace-empty').style.display=draft.image||draft.source==='dxf'?'none':'grid';
      q('#trace-undo').disabled=!past.length;q('#trace-redo').disabled=!future.length;
      overlay.querySelectorAll('[data-trace-mode]').forEach(b=>b.classList.toggle('on',b.dataset.traceMode===mode));
      const hints={calibrate:text('在底图上点击一条已知长度的两端，再输入实际长度（mm）。','Click both ends of a known length, then enter its actual length in mm.'),wall:text('沿墙中心线连续点击描墙；自动锁定水平/垂直并吸附端点。Esc 结束一段。闭合外轮廓后加隔墙。','Click along wall centerlines; horizontal/vertical locking and endpoint snapping. Esc ends a chain. Close the outline, then add partitions.'),door:text('点击已有墙段放门。入户门最多一扇；开启侧可在生成后通过属性调整。','Click a wall to place a door. One entry door maximum; adjust its swing later.'),window:text('点击已有墙段放窗；门窗会自动切开墙体洞口。','Click a wall to place a window. Openings cut through the wall.'),erase:text('点击门窗或墙体删除；删除墙体也会移除其门窗。','Click an opening or wall to delete it. Deleting a wall removes its openings.')};
      q('#trace-hint').textContent=hints[mode]+' '+text('滚轮缩放 · 中键或 Alt+拖动平移。第一版支持正交户型，不支持斜墙、庭院或独立柱岛。','Scroll to zoom; middle button or Alt+drag to pan. Orthogonal plans only; no diagonal walls, courtyards or column islands.');
      const s=draft.scale||10, stroke=box[2]/900;
      let html=draft.image?`<image href="${draft.image}" x="0" y="0" width="${draft.width}" height="${draft.height}" opacity="${q('#trace-opacity').value}"/>`:'';
      html+=draft.walls.map(w=>`<line data-w="${esc(w.id)}" x1="${w.a[0]}" y1="${w.a[1]}" x2="${w.b[0]}" y2="${w.b[1]}" stroke="${w.kind==='b'?'#322e29':w.kind==='e'?'#736859':'#a17b54'}" stroke-width="${w.thickness/s}" stroke-linecap="square" opacity=".85"/>`).join('');
      for(const o of draft.openings){const w=draft.walls.find(w=>w.id===o.wall);if(!w)continue;const h=w.a[1]===w.b[1],c=w.a.map((v,i)=>v+(w.b[i]-v)*o.t),l=o.length/s/2;
        html+=`<line data-o="${esc(o.id)}" x1="${c[0]-(h?l:0)}" y1="${c[1]-(h?0:l)}" x2="${c[0]+(h?l:0)}" y2="${c[1]+(h?0:l)}" stroke="${o.kind==='window'?'#267bba':o.entry?'#e75d28':'#139687'}" stroke-width="${w.thickness/s+stroke*2}"/>`;
        html+=`<text x="${c[0]}" y="${c[1]-stroke*8}" text-anchor="middle" font-size="${stroke*12}" fill="#343029">${o.kind==='window'?text('窗','Window'):o.entry?text('入户','Entry'):text('门','Door')} ${o.length}</text>`;
      }
      if(anchor){html+=`<circle cx="${anchor[0]}" cy="${anchor[1]}" r="${stroke*5}" fill="#ef5a24"/>`;if(cursor)html+=`<line x1="${anchor[0]}" y1="${anchor[1]}" x2="${cursor[0]}" y2="${cursor[1]}" stroke="#ef5a24" stroke-width="${stroke*2}" stroke-dasharray="${stroke*6} ${stroke*4}"/>`;}
      canvas.innerHTML=html;
      report(draft.scale?text(`比例 ${draft.scale.toFixed(3)} mm/像素 · ${draft.walls.length} 段墙 · ${draft.openings.length} 处门窗`,`Scale ${draft.scale.toFixed(3)} mm/pixel · ${draft.walls.length} walls · ${draft.openings.length} openings`):text('未校准：导入后请先标定一段已知尺寸。','Not calibrated: mark a known dimension after importing.'));
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
      if(!draft.image&&draft.source!=='dxf')return report(text('请先导入 DXF 或图片。','Import DXF or an image first.'),true);
      const p=position(e);
      if(p[0]<0||p[1]<0||p[0]>draft.width||p[1]>draft.height)return;
      if(mode==='calibrate'){
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
        const v=snapped(p);if(!anchor){anchor=v;cursor=v;render();return;}
        const length=Math.hypot(v[0]-anchor[0],v[1]-anchor[1])*draft.scale,thickness=Number(q('#trace-thickness').value);
        if(length<100)return report(text('墙段至少 100 mm。','Walls must be at least 100 mm.'),true);
        if(!Number.isFinite(thickness)||thickness<60||thickness>600||draft.walls.length>=100)return report(text('墙厚须为 60–600 mm，最多 100 段墙。','Thickness: 60–600 mm; maximum 100 walls.'),true);
        checkpoint();draft.walls.push({id:'w_'+uid(),a:[...anchor],b:v,thickness,kind:q('#trace-kind').value});anchor=v;cursor=v;render();return;
      }
      const hit=nearest(p);if(!hit||hit.d>Math.max(box[2]/60,hit.w.thickness/draft.scale))return report(text('请点击靠近墙中心的位置。','Click near a wall centerline.'),true);
      if(mode==='erase'){
        const o=draft.openings.find(o=>o.wall===hit.w.id&&Math.abs(o.t-hit.t)*Math.hypot(hit.w.b[0]-hit.w.a[0],hit.w.b[1]-hit.w.a[1])*draft.scale<=o.length/2);
        checkpoint();if(o)draft.openings=draft.openings.filter(v=>v.id!==o.id);else{draft.walls=draft.walls.filter(w=>w.id!==hit.w.id);draft.openings=draft.openings.filter(o=>o.wall!==hit.w.id);}render();return;
      }
      const length=Number(q('#trace-length').value),len=Math.hypot(hit.w.b[0]-hit.w.a[0],hit.w.b[1]-hit.w.a[1])*draft.scale,half=length/2;
      if(!Number.isFinite(length)||length<300||length>6000||hit.t*len-half<hit.w.thickness/2||(1-hit.t)*len-half<hit.w.thickness/2)return report(text('门窗宽度无效，或太靠近墙角。','Invalid opening width or too close to a wall corner.'),true);
      if(draft.openings.some(o=>o.wall===hit.w.id&&Math.abs(o.t-hit.t)*len<(o.length+length)/2))return report(text('门窗不能互相重叠。','Openings cannot overlap.'),true);
      const r=FurnishDraft.wallRect(hit.w,draft.scale),axis=hit.w.a[1]===hit.w.b[1]?0:1;
      const center=(hit.w.a[axis]+(hit.w.b[axis]-hit.w.a[axis])*hit.t)*draft.scale,rect=r.slice(0,4);rect[axis]=center-half;rect[axis+2]=center+half;
      if(draft.walls.some(w=>{if(w.id===hit.w.id)return false;const b=FurnishDraft.wallRect(w,draft.scale);return Math.min(b[2],rect[2])-Math.max(b[0],rect[0])>0&&Math.min(b[3],rect[3])-Math.max(b[1],rect[1])>0;}))return report(text('门窗不能跨越隔墙交接处，请换一个位置。','Openings cannot cross a wall junction. Choose another position.'),true);
      const entry=mode==='door'&&q('#trace-entry').checked;if(entry&&draft.openings.some(o=>o.entry))return report(text('已有入户门，请先删除或取消勾选。','An entry door already exists.'),true);
      checkpoint();draft.openings.push({id:'o_'+uid(),wall:hit.w.id,t:hit.t,length,kind:mode,side:Number(q('#trace-side').value),entry});render();
    });
    canvas.addEventListener('pointermove',e=>{if(pan){const p=position(e);box[0]+=pan.p[0]-p[0];box[1]+=pan.p[1]-p[1];render();return;}if(anchor){cursor=mode==='wall'?snapped(position(e)):position(e);render();}});
    const endPan=()=>{pan=null;};canvas.addEventListener('pointerup',endPan);canvas.addEventListener('pointercancel',endPan);
    canvas.addEventListener('wheel',e=>{e.preventDefault();const p=position(e),factor=e.deltaY>0?1.15:1/1.15;if(box[2]*factor<draft.width/30||box[2]*factor>draft.width*5)return;box=[p[0]+(box[0]-p[0])*factor,p[1]+(box[1]-p[1])*factor,box[2]*factor,box[3]*factor];render();},{passive:false});
    overlay.querySelectorAll('[data-trace-mode]').forEach(b=>b.onclick=()=>setMode(b.dataset.traceMode));
    const undoDraft=()=>{if(!past.length)return;future.push(copy(draft));draft=past.pop();anchor=null;dirty=true;render();};
    const redoDraft=()=>{if(!future.length)return;past.push(copy(draft));draft=future.pop();anchor=null;dirty=true;render();};
    q('#trace-undo').onclick=undoDraft;q('#trace-redo').onclick=redoDraft;
    q('#trace-fit').onclick=()=>{box=[0,0,draft.width,draft.height];render();};q('#trace-opacity').oninput=render;
    function key(e){if(!$('#dlg').hidden)return;e.stopImmediatePropagation();
      if(e.key==='Tab'){const controls=[...overlay.querySelectorAll('button,input,select,[tabindex="0"]')].filter(el=>!el.disabled&&el.getClientRects().length);const first=controls[0],last=controls.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}
      if(e.key==='Escape'){e.preventDefault();anchor=null;cursor=null;render();}if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='z'&&!e.target.matches('input,select')){e.preventDefault();e.shiftKey?redoDraft():undoDraft();}}
    document.addEventListener('keydown',key,true);
    function close(){document.removeEventListener('keydown',key,true);overlay.remove();button.focus();}
    function cancel(){if(dirty && !confirm(text('放弃本次尚未生成的描图修改？','Discard unbuilt tracing changes?')))return;close();}
    q('#trace-close').onclick=cancel;
    q('#trace-new').onclick=()=>{if(dirty&&!confirm(text('放弃本次描图并新建？','Discard this draft and start a new plan?')))return;close();openEditor(true);};
    q('#trace-name').oninput=()=>{dirty=true;};
    q('#trace-upload').onclick=()=>q('#trace-file').click();
    q('#trace-file').onchange=async e=>{
      const file=e.target.files[0];e.target.value='';if(!file)return;
      if(!['image/png','image/jpeg','image/webp'].includes(file.type)||file.size>20e6)return report(text('支持 PNG/JPG/WebP，原图最大 20MB。','PNG/JPG/WebP only; maximum source size 20 MB.'),true);
      if(draft.walls.length&&!confirm(text('更换底图会清除本次校准、墙体与门窗。继续？','Replacing the image clears calibration, walls and openings. Continue?')))return;
      loading=true;q('#trace-finish').disabled=true;report(text('正在读取图片…','Loading image…'));
      const url=URL.createObjectURL(file);
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
    q('#trace-dxf-file').onchange=async e=>{
      const file=e.target.files[0];e.target.value='';if(!file)return;
      if(file.size>20e6)return report(text('DXF 文件上限 20MB。','DXF size limit: 20 MB.'),true);
      if(draft.walls.length&&!confirm(text('导入 DXF 会替换本次墙体和门窗。继续？','Import DXF and replace the current walls and openings?')))return;
      loading=true;q('#trace-finish').disabled=true;
      try{
        const bytes=await file.arrayBuffer();let raw=new TextDecoder('utf-8',{fatal:false}).decode(bytes);if(raw.includes('\ufffd'))raw=new TextDecoder('gb18030').decode(bytes);
        const parsed=FurnishDXF.parse(raw);if(!overlay.isConnected)return;
        if(!parsed.layers.length)throw new Error(text('未找到直线或多段线；请在 CAD 中将墙体中心线导出为 LINE / POLYLINE。','No lines or polylines found; export wall centerlines as LINE / POLYLINE.'));
        const options=[[1,'mm'],[10,'cm'],[1000,'m'],[25.4,'inch'],[304.8,'ft']];
        openDialog({title:text('DXF 单位与墙体图层','DXF units & wall layers'),wide:true,
          body:`<p>${text('请选择墙体中心线图层。双线墙轮廓会被当成两堵墙；请先在 CAD 中准备中心线。块 INSERT、弧线、标注和填充不会自动转为墙体。','Select wall CENTERLINE layers. Double-line outlines become two walls; prepare centerlines in CAD first. Blocks, arcs, dimensions and hatches are not converted to walls.')}</p>
          <label>${text('图纸单位（请核对）','Drawing units (verify)')} <select id="dxf-unit">${options.map(([v,label])=>`<option value="${v}" ${parsed.mmPerUnit===v?'selected':''}>${label}</option>`).join('')}</select></label>
          <p>${parsed.mmPerUnit?text(`检测到 INSUNITS=${parsed.unitCode}。`,`Detected INSUNITS=${parsed.unitCode}.`):text('未检测到支持的单位，请手动指定；不能默认假定为 mm。','No supported units found. Specify manually; do not assume mm.')}</p>
          <div class="opts">${parsed.layers.map((l,i)=>`<label class="opt"><input type="checkbox" data-dxf-layer="${i}" ${parsed.layers.length===1&&!l.issues.length?'checked':''}><span><b>${esc(l.name)}</b><small>${l.count} ${text('段','segments')}${l.issues.length?' · '+esc(l.issues[0]):''}</small></span></label>`).join('')}</div>
          <p>${text('忽略的其他实体','Other ignored entities')}: ${esc(Object.entries(parsed.ignored).map(([k,v])=>`${k} × ${v}`).join(', ')||'0')}</p><div class="trace-error" id="dxf-error" role="alert"></div>`,
          actions:[{label:text('取消','Cancel')},{label:text('导入所选墙线','Import selected walls'),cls:'primary',fn:()=>{
            try{
              const layers=[...document.querySelectorAll('[data-dxf-layer]:checked')].map(el=>parsed.layers[Number(el.dataset.dxfLayer)].name);
              const next=FurnishDXF.draft(parsed,{layers,mmPerUnit:Number($('#dxf-unit').value),name:q('#trace-name').value.trim()||file.name.replace(/\.dxf$/i,''),id:draft.id,thickness:Number(q('#trace-thickness').value),kind:q('#trace-kind').value});
              // Validate enclosed rooms before replacing the current draft.
              FurnishDraft.build(next);checkpoint();draft=next;box=[0,0,draft.width,draft.height];setMode('door');return true;
            }catch(error){$('#dxf-error').textContent=text('导入失败：','Import failed: ')+error.message;return false;}
          }}]});$('#dlg').style.zIndex='90';
        if(!parsed.mmPerUnit){const option=document.createElement('option');option.value='';option.textContent=text('请选择单位','Choose units');option.selected=true;$('#dxf-unit').prepend(option);}
      }catch(error){report(text('DXF 读取失败：','DXF could not be read: ')+error.message,true);}finally{loading=false;q('#trace-finish').disabled=false;}
    };
    q('#trace-finish').onclick=()=>{
      draft.name=q('#trace-name').value.trim();
      let plan;
      try{plan=FurnishDraft.build(draft);}catch(error){report(text('无法生成：请检查校准、闭合墙线及门窗位置。详情：','Cannot build: check calibration, closed walls and opening positions. Details: ')+error.message,true);return;}
      const architecture={draft:copy(draft)};
      if(original){
        const before=snap();state.architecture=architecture;state.demolished=[];state.open={};
        state.rooms=Object.fromEntries(plan.rooms.map(r=>[r.id,state.rooms[r.id]||{name:r.name,mat:r.mat}]));
        commit(before);renderAll();fitView();
      }else{
        store.customPlans=store.customPlans||[];store.customPlans.push(copy(draft));PLANS.push(plan);
        store.work[plan.id]=freshWork(plan);store.work[plan.id].architecture=architecture;setPlan(plan.id);
      }
      buildPlanList();close();toast(text(`已生成 ${plan.rooms.length} 个房间，可以开始摆家具。`,`Built ${plan.rooms.length} rooms. Ready to furnish.`));
    };
    render();q('#trace-dxf').focus();
  }
})();
