/* Draft-only detailed cabinet editor; save is one undoable application mutation. */
(function(){
 let preview=null,generation=0;
 function dispose(){generation++;preview?.dispose();preview=null;}
 function open(id){
  const original=getF(id);if(!FurnishCabinet.supported(original))return;
  if(original.locked)return toast(tr('柜体已锁定，请先解锁','Unlock the cabinet before editing'));
  dispose();const token=generation,planId=PLAN.id,before=JSON.stringify(original);
  let draft={...JSON.parse(before),h:FurnishCabinet.height(original),cabinet:FurnishCabinet.config(original)},selected=null;
  const error=message=>{const el=$('#cab-error');if(el)el.textContent=message;};
  const number=(key,label,value,min,max)=>`<label>${label}<input data-cab-number="${key}" type="number" min="${min}" max="${max}" step="any" value="${Number(value.toFixed(2))}"></label>`;
  function form(){
   const c=draft.cabinet,values=FurnishCabinet.widths(draft);
   $('#cab-form').innerHTML=`<label>${tr('常用模板（替换当前结构）','Template (replace structure)')}<select id="cab-template"><option value="">${tr('自定义当前柜体','Current cabinet')}</option>${FurnishCabinet.templates.map(t=>`<option value="${t[0]}">${esc(t[1])} · ${t[2]}×${t[3]}×${t[4]}</option>`).join('')}</select></label>
    <div class="form">${number('w',tr('宽 mm','Width mm'),draft.w,150,6000)}${number('d',tr('深 mm','Depth mm'),draft.d,150,1200)}${number('h',tr('高 mm','Height mm'),draft.h,200,3200)}${number('thickness',tr('板厚 mm','Panel mm'),c.thickness,12,30)}${number('plinth',tr('底座高 mm','Base mm'),c.plinth,0,250)}${number('columns',tr('分区数','Bay count'),c.columns.length,1,12)}</div>
    <label>${tr('柜体颜色','Color')}<input type="color" id="cab-color" value="${draft.color}"></label>
    <p class="muted">${tr('层板位置从柜内底板上表面计高；抽屉从下向上排列。尺寸均为 mm。修改高度会按比例调整内部结构。','Shelves are measured from the inside bottom. Drawers stack bottom to top. All dimensions are mm; changing height scales the interior.')}</p>
    <p class="muted">${tr('修改某个分区净宽会更新柜体总宽；修改总宽会按比例调整分区。改变分区数后重新均分。','Changing a bay width updates total width. Changing total width scales bays proportionally. Changing bay count redistributes widths equally.')}</p>
    ${c.columns.map((col,i)=>`<fieldset data-cab-column="${i}"><legend>${tr('分区','Bay')} ${i+1} · ${Number(values[i].toFixed(2))} mm ${tr('净宽','clear width')}</legend>
     <label>${tr('分区净宽 mm','Bay clear width mm')}<input data-bay-width type="number" min="100" max="6000" step="1" value="${Number(values[i].toFixed(2))}"></label>
     <label>${tr('柜门','Doors')}<select data-door>${[['none','开放格','Open'],['left','左铰链单门','Left hinge'],['right','右铰链单门','Right hinge'],['double','双门','Double doors']].map(([v,zh,en])=>`<option value="${v}" ${col.door===v?'selected':''}>${tr(zh,en)}</option>`).join('')}</select></label>
     <label>${tr('层板位置（逗号分隔，清空即移除）','Shelf elevations (comma separated; empty removes)')}<input data-shelves value="${col.shelves.join(', ')}" placeholder="300, 650, 1000"></label>
     <div class="cab-shelf-buttons">${col.shelves.map((v,j)=>`<button type="button" class="btn ${selected?.column===i&&selected?.shelf===j?'on':''}" data-select-column="${i}" data-select-shelf="${j}">${tr('层板','Shelf')} ${j+1} · ${v} mm</button>`).join('')}</div>
     <label>${tr('抽屉高度（逗号分隔，清空即移除）','Drawer heights (comma separated; empty removes)')}<input data-drawers value="${col.drawers.map(v=>v.height).join(', ')}" placeholder="150, 180"></label>
     <div class="actions">${col.door!=='none'?`<button class="btn" type="button" data-toggle-column="${i}">${col.doorOpen?tr('关闭柜门','Close doors'):tr('打开柜门','Open doors')}</button>`:''}${col.drawers.map((v,j)=>`<button class="btn" type="button" data-toggle-column="${i}" data-toggle-drawer="${j}">${v.open?tr('收回','Close'):tr('拉出','Open')} ${tr('抽屉','drawer')} ${j+1}</button>`).join('')}</div></fieldset>`).join('')}`;
  }
  function read(){
   const next=JSON.parse(JSON.stringify(draft)),c=next.cabinet,oldWidths=FurnishCabinet.widths(draft),editedWidths=[];
   document.querySelectorAll('[data-cab-number]').forEach(el=>{if(!el.value.trim())throw Error(tr('请填写尺寸','Enter dimensions'));const k=el.dataset.cabNumber,v=Number(el.value);if(k!=='columns'){if(['w','d','h'].includes(k))next[k]=v;else c[k]=v;}});
   // Scale heights before applying explicitly edited interior values below.
   if(next.h!==draft.h){const ratio=(next.h-c.plinth-2*c.thickness)/(draft.h-draft.cabinet.plinth-2*draft.cabinet.thickness);c.columns.forEach(col=>{col.shelves=col.shelves.map(v=>Math.round(v*ratio));col.drawers=col.drawers.map(v=>({...v,height:Math.round(v.height*ratio)}));});}
   const list=el=>el.value.trim()?el.value.split(/[,，]/).map(v=>{if(!v.trim())throw Error('请输入逗号分隔的有效数字');return Number(v.trim());}):[];
   document.querySelectorAll('[data-cab-column]').forEach(el=>{const index=+el.dataset.cabColumn,col=c.columns[index],old=draft.cabinet.columns[index];col.door=el.querySelector('[data-door]').value;
    const width=el.querySelector('[data-bay-width]');if(!width.value.trim()||!Number.isFinite(Number(width.value)))throw Error('请输入有效的分区净宽');editedWidths[index]=Number(width.value);
    const shelves=list(el.querySelector('[data-shelves]')),drawers=list(el.querySelector('[data-drawers]'));
    if(next.h===draft.h||JSON.stringify(shelves)!==JSON.stringify(old.shelves))col.shelves=shelves;
    if(next.h===draft.h||JSON.stringify(drawers)!==JSON.stringify(old.drawers.map(v=>v.height)))col.drawers=drawers.map((height,j)=>({height,open:old.drawers[j]?.open||false}));
   });
   const count=Number($('[data-cab-number="columns"]').value);if(!Number.isInteger(count)||count<1||count>12)throw Error('分区数须为 1–12 的整数');
   c.columns=Array.from({length:count},(_,i)=>c.columns[i]||{door:'left',doorOpen:false,shelves:[],drawers:[]});next.color=$('#cab-color').value;
   if(count!==draft.cabinet.columns.length)c.columns.forEach(col=>delete col.width);
   else if(editedWidths.some((v,i)=>Math.abs(v-oldWidths[i])>.01)){
    c.columns.forEach((col,i)=>col.width=Math.abs(editedWidths[i]-oldWidths[i])>.01?editedWidths[i]:oldWidths[i]);
    next.w=c.columns.reduce((n,col)=>n+col.width,0)+(count+1)*c.thickness;
   }else FurnishCabinet.scaleWidths(draft,next);
   return FurnishCabinet.validate(next);
  }
  function selectionStatus(){
   const status=$('#cab-selection');if(!status)return;
   if(!selected){status.textContent=tr('打开柜门后，点击层板并上下拖动；选中后 ↑↓ 调整 10 mm，Shift + ↑↓ 调整 1 mm。','Open the doors, then select and drag a shelf vertically. Arrow keys move 10 mm; Shift + arrows move 1 mm.');return;}
   try{const {column,shelf}=selected,value=draft.cabinet.columns[column].shelves[shelf],limits=FurnishCabinet.shelfLimits(draft,column,shelf);status.textContent=tr(`分区 ${column+1} · 层板 ${shelf+1} · ${value} mm（可调 ${limits.min}–${limits.max} mm）`,`Bay ${column+1} · Shelf ${shelf+1} · ${value} mm (range ${limits.min}–${limits.max} mm)`);}catch{selected=null;selectionStatus();}
  }
  function refresh(){if(selected){try{FurnishCabinet.shelfLimits(draft,selected.column,selected.shelf);}catch{selected=null;}}form();preview?.update(draft);preview?.selectShelf(selected);selectionStatus();error('');}
  function selectShelf(part){try{draft=read();selected=part;refresh();return true;}catch(e){error(e.message);return false;}}
  function moveShelf(part,value){try{
   draft=FurnishCabinet.moveShelf(draft,part.column,part.shelf,value);selected=part;
   const field=$(`[data-cab-column="${part.column}"] [data-shelves]`);if(field)field.value=draft.cabinet.columns[part.column].shelves.join(', ');
   const b=$(`[data-select-column="${part.column}"][data-select-shelf="${part.shelf}"]`);if(b)b.textContent=tr(`层板 ${part.shelf+1} · ${draft.cabinet.columns[part.column].shelves[part.shelf]} mm`,`Shelf ${part.shelf+1} · ${draft.cabinet.columns[part.column].shelves[part.shelf]} mm`);
   selectionStatus();error('');return draft;
  }catch(e){error(e.message);return null;}}
  function toggle(column,drawer){try{draft=FurnishCabinet.toggle(read(),column,drawer);refresh();}catch(e){error(e.message);}}
  openDialog({title:tr('柜体详细设计','Cabinet designer'),wide:true,body:`<div class="cab-editor"><div class="cab-visual"><div id="cab-preview" aria-label="${tr('可旋转的柜体三维预览','Rotatable cabinet preview')}"></div><p class="muted">${tr('拖动层板调高度 · 拖动其他位置旋转 · 滚轮缩放','Drag a shelf to adjust height · drag elsewhere to orbit · scroll to zoom')}</p><p id="cab-selection" role="status" aria-live="polite" class="cab-selection"></p><div class="actions"><button class="btn" id="cab-open-all">${tr('全部打开','Open all')}</button><button class="btn" id="cab-close-all">${tr('全部关闭','Close all')}</button></div></div><div id="cab-form"></div></div><p id="cab-error" role="alert" class="project-error"></p>`,actions:[{label:tr('取消','Cancel')},{label:tr('保存柜体设计','Save cabinet'),cls:'primary',fn:()=>{
   try{const next=read(),current=getF(id);if(PLAN.id!==planId||!current||JSON.stringify(current)!==before)throw Error(tr('柜体已变更，请重新打开编辑器','Cabinet changed; reopen the editor'));if(current.locked)throw Error('柜体已锁定');mutate(()=>Object.assign(current,next));return true;}catch(e){error(e.message);return false;}
  }}],onOpen:()=>{
   form();selectionStatus();$('#cab-form').onchange=e=>{try{
    if(e.target.id==='cab-template'&&e.target.value){const p=FurnishCabinet.preset(e.target.value);draft={...draft,...p};selected=null;refresh();}
    else{draft=read();refresh();}
   }catch(err){error(err.message);}};
   $('#cab-form').onclick=e=>{const shelf=e.target.closest('[data-select-shelf]');if(shelf){selectShelf({column:+shelf.dataset.selectColumn,shelf:+shelf.dataset.selectShelf});preview?.focus();return;}const b=e.target.closest('[data-toggle-column]');if(b)toggle(+b.dataset.toggleColumn,b.dataset.toggleDrawer===undefined?undefined:+b.dataset.toggleDrawer);};
   const all=open=>{try{draft=read();draft.cabinet.columns.forEach(col=>{col.doorOpen=open;col.drawers.forEach(v=>v.open=open);});refresh();}catch(e){error(e.message);}};
   $('#cab-open-all').onclick=()=>all(true);$('#cab-close-all').onclick=()=>all(false);
   const host=$('#cab-preview');host.textContent=tr('正在加载三维预览…','Loading preview…');
   View3D.cabinetPreview(host,draft,{toggle,select:selectShelf,move:moveShelf}).then(p=>{if(token!==generation||!host.isConnected)p.dispose();else{preview=p;p.update(draft);p.selectShelf(selected);}}).catch(e=>{if(token===generation&&host.isConnected)host.textContent=tr('三维预览加载失败，可继续编辑：','Preview unavailable; editing remains available: ')+e.message;});
  }});
 }
 function toggleScene(id,part){const f=getF(id);if(!f||f.locked)return;try{const next=FurnishCabinet.toggle(f,part.column,part.drawer);mutate(()=>Object.assign(f,next));}catch(e){toast(e.message);}}
 window.FurnishCabinetEditor={open,dispose,toggleScene};
})();
