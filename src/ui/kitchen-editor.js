/* Classic script; form shared by quick properties and draft-only cabinet design. */
function kitchenForm(f,prefix='kitchen'){
 const K=FurnishKitchen,k=f.kitchen,disabled=f.locked?'disabled':'',shape=k.shape==='L'&&K.cornerSide(f)==='right'?'L-right':k.shape;
 return `<section><h3>厨房地柜与连续台面</h3><label class="kitchen-overlay-label">柜门盖板方式<select id="${prefix}-overlay" ${disabled}>${[['full','全盖'],['half','半盖'],['inset','无盖（内嵌）']].map(([v,label])=>`<option value="${v}" ${(k.doorOverlay??'full')===v?'selected':''}>${label}</option>`).join('')}</select></label><div class="form"><label>台面形状<select id="${prefix}-shape" ${disabled}><option value="straight" ${shape==='straight'?'selected':''}>一字形</option><option value="L" ${shape==='L'?'selected':''}>L 形（左转角）</option><option value="L-right" ${shape==='L-right'?'selected':''}>L 形（右转角）</option></select></label>${[['depth','柜深',300,1200],['counterDepth','台面深',k.depth,k.depth+100],['baseHeight','地柜高（不含台面）',400,1200],['thickness','台面板厚',10,100],['dropHeight','下挂高度（低于板底）',0,100]].map(([key,label,min,max])=>`<label ${key==='dropHeight'&&!['square','reverse'].includes(K.edgeStyle(f))?'hidden':''}>${label} mm<input id="${prefix}-${key}" type="number" min="${min}" max="${max}" value="${key==='counterDepth'?K.counterDepth(f):key==='dropHeight'?K.dropHeight(f):k[key]}" ${disabled}></label>`).join('')}</div><label>台面下挂样式<select id="${prefix}-edge-style" ${disabled}>${Object.entries(K.edgeStyles).map(([v,label])=>`<option value="${v}" ${K.edgeStyle(f)===v?'selected':''}>${label}</option>`).join('')}</select></label><p class="muted">后沿齐柜体，前沿挑出 ${K.counterDepth(f)-k.depth} mm；前沿总高 ${k.thickness+K.dropHeight(f)} mm。台面顶高 ${k.baseHeight+k.thickness} mm；转角预留 ${k.shape==='L'?k.depth:0} mm 盲角，不重复放柜。整体 ${Number(f.w.toFixed(2))} × ${Number(f.d.toFixed(2))} mm，由模块长度决定。左右按面对产品正面理解，整体旋转／镜像后随家具方向变化。</p>${k.modules.map((m,i)=>`<div class="form" data-kitchen-row="${i}"><label>模块 ${i+1} 功能<select data-k-role ${disabled}>${Object.entries(K.roles).map(([key,label])=>`<option value="${key}" ${m.role===key?'selected':''}>${label}</option>`).join('')}</select></label><label>模块宽 mm<input data-k-width type="number" min="150" max="3000" value="${Number(m.width.toFixed(2))}" ${disabled}></label>${k.shape==='L'?`<label>所在边<select data-k-run ${disabled}><option value="0" ${m.run===0?'selected':''}>主边</option><option value="1" ${m.run===1?'selected':''}>转角边</option></select></label>`:''}<button class="btn" data-k-remove="${i}" ${disabled}>删除模块</button>${m.role!=='empty'?`<div class="cab-kitchen-opening">${m.role==='drawer'?[0,1,2].map(j=>`<button type="button" class="btn" data-k-toggle="${i}" data-k-drawer="${j}" ${disabled}>${m.drawerOpen?.[j]?'收回':'拉出'}抽屉 ${j+1}</button>`).join(''):`<button type="button" class="btn" data-k-toggle="${i}" ${disabled}>${m.doorOpen?'关闭柜门':'打开柜门'}</button>`}</div>`:''}</div>`).join('')}<button class="btn" id="${prefix}-add" ${disabled}>添加主边模块</button>${k.shape==='L'?`<button class="btn" id="${prefix}-add-return" ${disabled}>添加转角边模块</button>`:''}<p class="muted">地柜采用功能模板：门柜带层板，抽屉柜为三层，水槽／灶台柜不设普通层板；结构板 18 mm、底座 100 mm。设备空位仅铺台面。水槽／灶具和吊柜另行添加；开孔及结构为布局草模，非加工或厂家安装要求。</p></section>`;
}
function bindKitchenForm(root,f,change,prefix='kitchen'){
 const K=FurnishKitchen,q=s=>root.querySelector(s),all=s=>root.querySelectorAll(s);
 const overlay=q('#'+prefix+'-overlay');if(overlay)overlay.onchange=e=>change(g=>{g.kitchen.doorOverlay=e.target.value;return K.configure(g,g.kitchen);});
 for(const key of ['depth','counterDepth','baseHeight','thickness','dropHeight']){const input=q('#'+prefix+'-'+key);if(input)input.onchange=e=>change(g=>{g.kitchen[key]=Number(e.target.value);return K.configure(g,g.kitchen);});}
 const style=q('#'+prefix+'-edge-style');if(style)style.onchange=e=>change(g=>{g.kitchen.edgeStyle=e.target.value;return K.configure(g,g.kitchen);});
 q('#'+prefix+'-shape').onchange=e=>{
  const value=e.target.value,isL=value!=='straight',remap=new Map();let index=0;
  f.kitchen.modules.forEach((m,i)=>{if(isL||m.run===0)remap.set(i,index++);});
  change(g=>{const k=g.kitchen;k.shape=isL?'L':'straight';if(value==='L-right')k.corner='right';else delete k.corner;if(isL&&!k.modules.some(m=>m.run===1))k.modules.push({run:1,width:600,role:'door'});if(!isL)k.modules=k.modules.filter(m=>m.run===0);return K.configure(g,k);},remap);
 };
 all('[data-kitchen-row]').forEach(row=>{const i=Number(row.dataset.kitchenRow);for(const [selector,key] of [['[data-k-width]','width'],['[data-k-role]','role'],['[data-k-run]','run']]){const el=row.querySelector(selector);if(el)el.onchange=e=>change(g=>{g.kitchen.modules[i][key]=key==='role'?e.target.value:Number(e.target.value);return K.configure(g,g.kitchen);});}});
 all('[data-k-remove]').forEach(el=>el.onclick=()=>{const removed=Number(el.dataset.kRemove),remap=new Map(f.kitchen.modules.map((m,i)=>[i,i<removed?i:i-1]).filter(([i])=>i!==removed));change(g=>{g.kitchen.modules.splice(removed,1);return K.configure(g,g.kitchen);},remap);});
 all('[data-k-toggle]').forEach(el=>el.onclick=()=>change(g=>K.toggle(g,Number(el.dataset.kToggle),el.dataset.kDrawer===undefined?undefined:Number(el.dataset.kDrawer))));
 for(const [id,run] of [['#'+prefix+'-add',0],['#'+prefix+'-add-return',1]]){const el=q(id);if(el)el.onclick=()=>change(g=>{g.kitchen.modules.push({run,width:600,role:'door'});return K.configure(g,g.kitchen);});}
}
function remapKitchenLinks(list,hostId,remap){
 if(!remap)return;for(const device of list.filter(v=>v.counterLink?.hostId===hostId)){const index=remap.get(device.counterLink.module);if(index===undefined)delete device.counterLink;else device.counterLink.module=index;}
}
function readKitchenFields(root,f,prefix='kitchen'){
 const next=structuredClone(f),k=next.kitchen;
 const overlay=root.querySelector('#'+prefix+'-overlay');if(overlay&&overlay.value!==(k.doorOverlay??'full'))k.doorOverlay=overlay.value;
 const number=(el,previous)=>{if(!el.value.trim())throw Error('请输入有效尺寸');return el.value===el.defaultValue?previous:Number(el.value);};
 for(const key of ['depth','counterDepth','baseHeight','thickness','dropHeight']){const el=root.querySelector('#'+prefix+'-'+key);if(el){const value=number(el,k[key]);if(value!==undefined)k[key]=value;}}
 const style=root.querySelector('#'+prefix+'-edge-style');if(style&&style.value!==(k.edgeStyle??'plain'))k.edgeStyle=style.value;
 root.querySelectorAll('[data-kitchen-row]').forEach(row=>{const i=Number(row.dataset.kitchenRow),m=k.modules[i];m.width=number(row.querySelector('[data-k-width]'),m.width);m.role=row.querySelector('[data-k-role]').value;const run=row.querySelector('[data-k-run]');if(run)m.run=Number(run.value);});
 return next;
}
function hoodBayControls(f){
 const C=FurnishCabinet,disabled=f.locked?'disabled':'',bay=C.hoodBay(f);
 if(f.type==='kitchenwall')return bay?`<section><h3>抽油烟机嵌合区</h3><div class="form"><label>中部净宽 mm<input id="hood-bay-width" type="number" min="100" value="${bay.width}" ${disabled}></label><label>嵌合净高 mm<input id="hood-bay-height" type="number" min="80" value="${bay.height}" ${disabled}></label></div><p class="muted">左右储物区对称，中部底部／背部让空，上方保留储物。净深 ${bay.depth} mm；整组左右对开门覆盖内部三个区域；详细设计可调整层板和门板。</p><button class="btn" id="hood-bay-remove" ${disabled}>移除嵌合区（恢复底板与背板）</button></section>`:`<button class="btn" id="hood-bay-enable" ${disabled}>增加中部烟机嵌合区（重设为对开门烟机柜）</button><p class="muted">初始净宽 500、净高 175 mm，左右储物均分、外部一组对开门；会重设内部结构，可撤销。尺寸为现有烟机草模初值，需按实物调整。</p>`;
 const hosts=state.furniture.filter(g=>!FurnishProducts.modelError(g)&&C.hoodBay(g));if(!hosts.length)return '';
 return `<section><h3>吊柜嵌合定位</h3><div class="form"><label class="full">目标厨房吊柜<select id="hood-bay-target" ${disabled}>${hosts.map(g=>`<option value="${esc(g.id)}">${esc(g.name)} · ${C.hoodBay(g).width} mm 中部净宽</option>`).join('')}</select></label></div><button class="btn" id="hood-center-bay" ${disabled}>在嵌合区左右居中</button><button class="btn" id="hood-flush-bay" ${disabled}>居中并与吊柜底部齐平安装</button><p class="muted">左右居中仅沿柜宽移动；齐平安装同时对齐背部、朝向及主机上沿高度。移动或调整吊柜后可再次定位。嵌合按装饰罩草模检查，不代表厂家安装预留。</p></section>`;
}
function kitchenPanel(f){
 const K=FurnishKitchen,disabled=f.locked?'disabled':'';
 if(f.type==='counter')return f.kitchen?kitchenForm(f):`<button class="btn" id="kitchen-convert" ${disabled}>转换为模块厨房（移除自动吊柜）</button><p class="muted">旧组合保持原显示；转换可撤销，吊柜需另行添加。</p>`;
 if(f.type==='rangehood_fotile_jcd10ta')return hoodBayControls(f)+ `<div class="form"><label>烟机底部离地 mm<input id="kitchen-mount" type="number" min="0" max="20000" value="${FurnishProducts.value(f,'mountHeight')}" ${disabled}></label><label>面板状态<select id="hood-panel" ${disabled}><option value="closed" ${!FurnishProducts.value(f,'hoodPanelOpen')?'selected':''}>闭合（默认）</option><option value="open" ${FurnishProducts.value(f,'hoodPanelOpen')?'selected':''}>开启</option></select></label></div><p class="muted">上沿转轴翻出；开启角度按图片近似，用于外观展示。800±50 mm 是面板顶部至灶台的资料标注，实际安装需复核。</p>`;
 if(f.type==='kitchenwall')return hoodBayControls(f)+ `<div class="form"><label>设备底部离地 mm<input id="kitchen-mount" type="number" min="0" max="20000" value="${FurnishProducts.value(f,'mountHeight')}" ${disabled}></label></div>`;
 if(K.isDevice(f)){
  const targets=[];for(const host of state.furniture.filter(h=>h.kitchen&&!FurnishProducts.modelError(h)))for(const m of K.layout(host))if(m.role===(f.type==='ksink'?'sink':'hob'))targets.push({host,m});
  return `${f.type==='stove_fotile_th36b'?`<div class="form"><label>灶具面板基准离地 mm<input id="hob-elevation" type="number" min="0" max="2000" value="${FurnishProducts.value(f,'counterElevation')}" ${disabled} ${f.counterLink?'disabled':''}></label></div>`:''}<div class="form"><label class="full">关联台面模块<select id="kitchen-link" ${disabled}><option value="">独立放置</option>${targets.map(({host,m})=>`<option value="${esc(host.id)}:${m.index}" ${f.counterLink?.hostId===host.id&&f.counterLink.module===m.index?'selected':''}>${esc(host.name)} · 模块 ${m.index+1}（${m.width} mm）</option>`).join('')}</select></label></div><p class="muted">关联后居中并随厨房移动、旋转、镜像及台面高度变化。直接移动设备会解除关联；TH36B-T 默认开孔 660×350 mm（资料允许 630–680×330–370）；其他设备为外包减 30 mm 草模。调整尺寸仅用于布局，需按实物复核。</p>`;
 }
 return '';
}
function bindKitchenPanel(f){
 const K=FurnishKitchen,change=(fn,remap)=>{try{const current=getF(f.id);if(current.locked)throw Error('请先解锁');const next=fn(current.kitchen?readKitchenFields($('#panel'),current):structuredClone(current));mutate(()=>{state.furniture[state.furniture.findIndex(v=>v.id===f.id)]=next;remapKitchenLinks(state.furniture,f.id,remap);});}catch(e){toast(e.message);renderPanel();}};
 const hoodEnable=$('#hood-bay-enable');if(hoodEnable)hoodEnable.onclick=()=>change(g=>FurnishCabinet.configureHoodBay(g));
 const hoodRemove=$('#hood-bay-remove');if(hoodRemove)hoodRemove.onclick=()=>change(g=>{delete g.cabinet.hoodBayHeight;return FurnishCabinet.validate(g);});
 for(const key of ['width','height']){const input=$('#hood-bay-'+key);if(input)input.onchange=()=>change(g=>FurnishCabinet.configureHoodBay(g,Number($('#hood-bay-width').value),Number($('#hood-bay-height').value)));}
 for(const flush of [false,true]){const button=$(flush?'#hood-flush-bay':'#hood-center-bay');if(button)button.onclick=()=>change(g=>FurnishCabinet.centerHoodInBay(getF($('#hood-bay-target').value),g,flush));}
 const convert=$('#kitchen-convert');if(convert)convert.onclick=()=>change(g=>K.configure(g,K.defaults(g)));
 if(f.kitchen)bindKitchenForm($('#panel'),f,change);
 const mount=$('#kitchen-mount');if(mount)mount.onchange=e=>change(g=>{g.mountHeight=FurnishProducts.validateField(g,'mountHeight',Number(e.target.value));return g;});
 const panel=$('#hood-panel');if(panel)panel.onchange=e=>change(g=>{g.hoodPanelOpen=FurnishProducts.validateField(g,'hoodPanelOpen',e.target.value==='open');return g;});
 const elevation=$('#hob-elevation');if(elevation)elevation.onchange=e=>change(g=>{g.counterElevation=FurnishProducts.validateField(g,'counterElevation',Number(e.target.value));return g;});
 const link=$('#kitchen-link');if(link)link.onchange=e=>change(g=>{if(!e.target.value){delete g.counterLink;return g;}const at=e.target.value.lastIndexOf(':'),host=getF(e.target.value.slice(0,at)),index=Number(e.target.value.slice(at+1));if(state.furniture.some(v=>v.id!==g.id&&v.counterLink?.hostId===host.id&&v.counterLink.module===index))throw Error('该模块已关联设备');return K.attach(g,host,index);});
}
(function(){
 let preview=null,generation=0;
 function dispose(){generation++;preview?.dispose();preview=null;}
 function open(id){
  const original=getF(id);if(!original?.kitchen)return;if(original.locked)return toast('柜体已锁定，请先解锁');
  window.FurnishCabinetEditor.dispose();const token=generation,planId=PLAN.id,before=JSON.stringify(original),K=FurnishKitchen;
  let draft=structuredClone(original),linkMap=new Map(original.kitchen.modules.map((m,i)=>[i,i]));const previewFurniture=[];
  const error=message=>{const el=$('#cab-kitchen-error');if(el)el.textContent=message;};
  let page='size',active=0;
  function toggle(index,drawer){try{draft=K.toggle(K.configure(draft,readKitchenFields($('#cab-kitchen-fields'),draft,'cab-kitchen').kitchen),index,drawer);active=index;page='modules';refresh();error('');}catch(e){error(e.message);}}
  function arrange(){
   const root=$('#cab-kitchen-fields'),section=root.firstElementChild,overall=document.createElement('section'),modules=document.createElement('section'),front=document.createElement('section');
   overall.dataset.kPage='size';modules.dataset.kPage='modules';front.dataset.kPage='front';
   const rows=Array.from(section.querySelectorAll('[data-kitchen-row]')),overlay=section.querySelector('.kitchen-overlay-label');
   front.innerHTML='<h3>门板与铰链</h3>';front.append(overlay);front.insertAdjacentHTML('beforeend','<p class="cab-hint">全盖覆盖外侧板前沿；半盖覆盖半个板厚；无盖将门板嵌入柜体。模块内部仍采用功能模板。</p>');
   overall.append(section.querySelector('h3'),section.querySelector('.form'),section.querySelector('select[id$="-edge-style"]').closest('label'),section.querySelector('p'));
   modules.innerHTML='<h3>当前模块</h3>';rows.forEach(row=>modules.append(row));
   for(const button of Array.from(section.querySelectorAll('button[id]')))modules.append(button);
   const help=section.querySelector('p');if(help){const notes=document.createElement('details');notes.className='cab-help';notes.innerHTML='<summary>模块结构说明</summary>';notes.append(help);overall.append(notes);}
   section.replaceChildren(overall,modules,front);
   $('#cab-kitchen-picker').innerHTML=`<label>当前模块<select id="cab-kitchen-active">${draft.kitchen.modules.map((m,i)=>`<option value="${i}" ${i===active?'selected':''}>模块 ${i+1} · ${FurnishKitchen.roles[m.role]} · ${Number(m.width.toFixed(1))} mm</option>`).join('')}</select></label>`;
   show();
  }
  function show(){document.querySelectorAll('[data-k-page]').forEach(el=>el.hidden=el.dataset.kPage!==page);document.querySelectorAll('[data-kitchen-row]').forEach(el=>el.hidden=Number(el.dataset.kitchenRow)!==active);$('#cab-kitchen-picker').hidden=page!=='modules';$('#cab-kitchen-space').hidden=page!=='space';document.querySelectorAll('[data-k-tab]').forEach(el=>{const on=el.dataset.kTab===page;el.classList.toggle('on',on);el.setAttribute('aria-selected',String(on));});}
  function refresh(){
   const fields=$('#cab-kitchen-fields');fields.innerHTML=kitchenForm(draft,'cab-kitchen');
   active=Math.min(active,draft.kitchen.modules.length-1);arrange();
   bindKitchenForm(fields,draft,(fn,remap)=>{try{const next=fn(readKitchenFields(fields,draft,'cab-kitchen'));draft=next;if(remap)linkMap=new Map([...linkMap].filter(([,i])=>remap.has(i)).map(([old,i])=>[old,remap.get(i)]));refresh();error('');}catch(e){refresh();error(e.message);}},'cab-kitchen');
   previewFurniture.splice(0,previewFurniture.length,...structuredClone(state.furniture));previewFurniture[previewFurniture.findIndex(f=>f.id===id)]=draft;remapKitchenLinks(previewFurniture,id,linkMap);K.normalize(previewFurniture);
   preview?.update(draft);
   const issues=FurnishProject.spaceCheck(FurnishProject.effectivePlan(PLAN,state),previewFurniture,{focusId:id,scanPassages:false});
   $('#cab-kitchen-space').innerHTML=`<h3>房间位置空间核对</h3>${issues.length?issues.map(v=>`<p class="muted">${esc(v.message)}</p>`).join(''):'<p class="muted">当前规则未发现冲突；安装与开孔仍需按实物核对。</p>'}`;
  }
  openDialog({title:tr('柜体详细设计','Cabinet designer'),wide:true,body:`<div class="cab-editor"><div class="cab-visual"><div class="cab-view-controls"><button class="btn" id="cab-kitchen-front">正视预览</button><label><input type="checkbox" id="cab-kitchen-dimensions" checked>模块尺寸</label></div><div id="cab-preview" aria-label="厨房柜体三维预览"></div><p class="muted">拖动旋转、滚轮缩放。使用房间生产模型；尺寸以局部正面显示。</p><div class="cab-kitchen-opening"><button type="button" class="btn" id="cab-kitchen-open-all">全部打开</button><button type="button" class="btn" id="cab-kitchen-close-all">全部关闭</button></div><p id="cab-kitchen-error" class="project-error" role="alert"></p></div><div class="cab-fields"><div class="cab-tabs" role="tablist" aria-label="厨房设计步骤">${[['size','整体尺寸'],['modules','功能模块'],['front','门板与铰链'],['space','空间核对']].map(([v,label])=>`<button type="button" role="tab" data-k-tab="${v}" aria-selected="${v==='size'}">${label}</button>`).join('')}</div><div id="cab-kitchen-picker"></div><div id="cab-kitchen-fields"></div><div id="cab-kitchen-space"></div></div></div>`,actions:[{label:tr('取消','Cancel')},{label:tr('保存柜体设计','Save cabinet'),cls:'primary',fn:()=>{
   try{draft=K.configure(draft,readKitchenFields($('#cab-kitchen-fields'),draft,'cab-kitchen').kitchen);const current=getF(id);if(PLAN.id!==planId||!current||JSON.stringify(current)!==before)throw Error('柜体已变更，请重新打开编辑器');if(current.locked)throw Error('柜体已锁定');mutate(()=>{state.furniture[state.furniture.findIndex(f=>f.id===id)]=structuredClone(draft);remapKitchenLinks(state.furniture,id,linkMap);});return true;}catch(e){error(e.message);return false;}
  }}],onOpen:()=>{
   refresh();const all=open=>{try{draft=K.configure(draft,readKitchenFields($('#cab-kitchen-fields'),draft,'cab-kitchen').kitchen);draft.kitchen.modules.forEach((m,i)=>{if(m.role==='empty')return;if(m.role==='drawer')for(let j=0;j<3;j++)draft=K.toggle(draft,i,j,open);else draft=K.toggle(draft,i,undefined,open);});refresh();error('');}catch(e){error(e.message);}};$('#cab-kitchen-open-all').onclick=()=>all(true);$('#cab-kitchen-close-all').onclick=()=>all(false);$('#cab-kitchen-picker').onchange=e=>{try{draft=K.configure(draft,readKitchenFields($('#cab-kitchen-fields'),draft,'cab-kitchen').kitchen);active=Number(e.target.value);refresh();}catch(e){error(e.message);}};document.querySelectorAll('[data-k-tab]').forEach(el=>el.onclick=()=>{try{draft=K.configure(draft,readKitchenFields($('#cab-kitchen-fields'),draft,'cab-kitchen').kitchen);page=el.dataset.kTab;refresh();}catch(e){error(e.message);}});let front=false;$('#cab-kitchen-front').onclick=()=>{front=!front;$('#cab-kitchen-front').textContent=front?'透视预览':'正视预览';preview?.setView({front});};$('#cab-kitchen-dimensions').onchange=e=>preview?.setView({dimensions:e.target.checked});
   const host=$('#cab-preview');host.textContent='正在加载三维预览…';View3D.cabinetPreview(host,draft,{furniture:previewFurniture,toggle}).then(p=>{if(token!==generation||!host.isConnected)p.dispose();else{preview=p;p.update(draft);p.setView({front,dimensions:$('#cab-kitchen-dimensions').checked});}}).catch(e=>{if(token===generation&&host.isConnected)host.textContent='三维预览加载失败，可继续编辑：'+e.message;});
  }});
 }
 window.FurnishKitchenEditor={open,dispose};
})();
