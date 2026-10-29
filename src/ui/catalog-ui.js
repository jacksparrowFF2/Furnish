/* Search specifications and preview a catalog replacement before committing. */
(function(){
 const P=FurnishProject,D=FurnishDesign;
 const source=it=>({...FurnishProducts.definition(it[0])?.identity,...((store.custom||[]).find(c=>c.id===it[7])||{}),...FurnishKitchen.catalogSpec(it),type:it[0],name:it[1],w:it[2],d:it[3],color:it[4],price:it[5],h:it[6],...(it[9]?{cabinet:FurnishCabinet.preset(it[9]).cabinet}:{}),...(FurnishProducts.supports({type:it[0]},'curtainStyle')?{curtainStyle:it[8]||'double'}:{})});
 function matches(it,q,w,d){return FurnishCatalogData.matches(it,{query:q,maxWidth:w,maxDepth:d},{...source(it),name:nm(it[1])});}
 for(const id of ['catalog-max-w','catalog-max-d'])$('#'+id).oninput=buildLib;
 $('#catalog-use').onchange=e=>{libUI.use=e.target.value;buildLib();};
 $('#catalog-reset').onclick=()=>{resetCatalogFilters();if(libUI.collection==='current')window.FurnishCurrentFurniture?.reset();buildCats();buildLib();};
 document.querySelectorAll('#catalog-collections [data-collection]').forEach(b=>b.onclick=()=>{if(libUI.collection===b.dataset.collection)return;resetCatalogFilters();libUI.collection=b.dataset.collection;if(libUI.collection==='current')window.FurnishCurrentFurniture?.reset();buildCats();buildLib();});
 function details(it){
  const replacementSession=session,c=source(it),h=FurnishCatalogData.itemHeight(it),uses=FurnishCatalogData.itemUses(it).map(id=>{const u=FurnishCatalogData.uses.find(u=>u[0]===id);return tr(u[1],u[2]);}),isArea=FurnishKitchen.isLaundryAreaItem(it),isLaundry=!!c.kitchen?.laundry;
  const row=(label,value)=>`<div><dt>${label}</dt><dd>${esc(value)}</dd></div>`;
  const price=Number.isFinite(c.price)&&(it[7]||c.price>0)?P.purchaseMoney(c.price):tr('未录入','Not recorded');
  const dimensions=`${c.w} × ${c.d} × ${Number.isFinite(h)?h:tr('未录入','Unknown')} mm`;
  const body=`<div class="catalog-spec-preview"><svg viewBox="${-c.w*.6} ${-c.d*.6} ${c.w*1.2} ${c.d*1.2}">${furnSVG(c.type,c.w,c.d,c.color,c)}</svg></div>
    <dl class="catalog-spec">${row(tr('种类','Kind'),nm(FurnishProducts.kind(c)))}${row(tr('初始宽 × 深 × 高','Initial width × depth × height'),dimensions)}${c.brand?row(tr('品牌','Brand'),c.brand):''}${c.model?row(tr('型号／产品名','Model / product name'),c.model):''}${row(tr('参考单价','Reference price'),price)}${uses.length?row(tr('用途','Uses'),uses.join(' · ')):''}${row(tr('条目来源','Source'),it[7]?tr('我的家具','My items'):tr('内置产品库','Built-in library'))}</dl>
    <p class="hint">${tr(isArea?'包含地柜、吊柜、开放格、水槽及独立洗衣机。默认洗衣机居左，可在柜体设计中选择居左或居右。':isLaundry?'仅包含地柜与设备空位，不含水槽、洗衣机及吊柜。默认洗衣机空位居左，可在柜体设计中选择居左或居右。':'此处显示初始参数尺寸，柜体高度为柜身高。安装标高、整体包络和开启预留请查看添加后的属性。',isArea?'Includes base and upper cabinets, open storage, a sink and a separate washer. Washer starts on the left; choose either side in the cabinet designer.':isLaundry?'Base cabinet and appliance bay only; sink, washer and upper cabinets are separate. The bay starts on the left; choose either side in the cabinet designer.':'These are initial parameter dimensions; cabinet height refers to its body. See the placed item’s Properties for mounting elevation, overall bounds and opening clearances.')}</p>`;
  openDialog({title:nm(c.name),body,actions:[{label:tr('关闭','Close')},{label:active()?tr('预览替换','Preview replacement'):tr('添加到方案','Add to plan'),cls:'primary',fn:()=>{
   if(replacementSession&&session!==replacementSession){toast('替换已结束，请关闭规格窗口重新选择');return false;}
   let p=drawingCenter();if(ui.sel?.kind==='room'){const room=ROOMS.find(r=>r.id===ui.sel.id);if(room){const b=bbox(room.poly);p={x:(b[0]+b[2])/2,y:(b[1]+b[3])/2};}}
   addItem(it,p.x,p.y);closeDrawers();
  }}]});
 }
 let session=null,startToken=0;
 const active=()=>!!session;
 function clearOverlay(){
  $('#gReplacement')?.remove();
  document.querySelectorAll('[data-replacement-original]').forEach(el=>el.removeAttribute('data-replacement-original'));
 }
 function valid(){return session&&session.planId===PLAN.id&&session.before===snap()&&selIds().length===1&&selIds()[0]===session.id&&getF(session.id)&&!furnitureLocked(getF(session.id));}
 function cancel(){
  startToken++;
  if(!session)return;
  session=null;clearOverlay();$('#stage').classList.remove('replacing');$('#replacement-banner')?.remove();$('#replacement-panel')?.remove();buildLib();
 }
 function selectionChanged(){if(session&&!valid())cancel();}
 function positionPreview(){
  const panel=$('#replacement-panel'),f=session&&getF(session.id);if(!panel||!f)return;
  const point=svg.createSVGPoint();point.x=f.cx;point.y=f.cy;
  const matrix=$('#gFurn').getScreenCTM();if(!matrix)return;
  const at=point.matrixTransform(matrix),stage=$('#stage').getBoundingClientRect();
  panel.style.left='';panel.style.right='12px';panel.style.top='64px';panel.style.bottom='';
  if(narrow()){
   if(at.y<stage.top+stage.height/2){panel.style.top='auto';panel.style.bottom='120px';}
  }else if(at.x>stage.left+stage.width/2){panel.style.left='12px';panel.style.right='auto';}
 }
 function prepare(){
  if(!valid())throw Error('方案或选择已改变，请重新开始替换');
  if(!session.candidate)throw Error('请先从家具库选择候选家具');
  const previous=JSON.parse(session.before),work=JSON.parse(session.before),index=work.furniture.findIndex(f=>f.id===session.id);
  work.furniture[index]=D.replaceFurniture(work.furniture[index],session.candidate,{anchor:session.anchor});
  normalizeFurnitureEdit(work,previous);
  FurnishLayers.assertEditable(previous,work);P.validateWork(work);
  return work;
 }
 function overlay(next,work){
  clearOverlay();const f=getF(session.id),g=document.createElementNS(svg.namespaceURI,'g');
  g.id='gReplacement';g.setAttribute('data-edit-overlay','replacement');g.setAttribute('pointer-events','none');g.setAttribute('transform',`rotate(${drawingRotation()})`);
  const outline=v=>`<g transform="${furnT(v)}"><rect x="${-v.w/2}" y="${-v.d/2}" width="${v.w}" height="${v.d}" fill="none" stroke="#e16b32" stroke-width="2" stroke-dasharray="6 4" vector-effect="non-scaling-stroke"/></g>`;
  const body=furnSVG(next.type,next.w,next.d,next.color,next,{furniture:work.furniture,plan:P.effectivePlan(PLAN,work)});
  g.innerHTML=`<g transform="${furnT(next)}" opacity=".85"><g transform="scale(${next.flip?-1:1} 1)">${body}</g><rect x="${-next.w/2}" y="${-next.d/2}" width="${next.w}" height="${next.d}" fill="none" stroke="#25877b" stroke-width="2" vector-effect="non-scaling-stroke"/></g>${outline(f)}`;
  svg.append(g);document.querySelectorAll('#gFurn [data-fid]').forEach(el=>{if(el.dataset.fid===f.id)el.setAttribute('data-replacement-original','true');});
 }
 function productCard(f,label,kind){
  const pad=Math.max(f.w,f.d)*.12;
  return `<div class="replacement-product ${kind}"><span class="replacement-product-label">${label}</span><div class="replacement-thumb"><svg aria-hidden="true" viewBox="${-f.w/2-pad} ${-f.d/2-pad} ${f.w+pad*2} ${f.d+pad*2}">${furnSVG(f.type,f.w,f.d,f.color,f)}</svg></div><b title="${esc(nm(f.name))}">${esc(nm(f.name))}</b></div>`;
 }
 function syncCandidateCards(){document.querySelectorAll('#lib .item').forEach(el=>el.classList.toggle('replacement-picked',!!session?.itemKey&&FurnishCatalogData.itemKey(itemOf(el))===session.itemKey));}
 function preview(){
  if(!session)return;clearOverlay();session.preview=null;
  const info=$('#replacement-info'),apply=$('#replacement-apply');apply.disabled=true;
  if(!session.candidate){info.innerHTML=`<div class="replacement-pair">${productCard(getF(session.id),'原家具','original')}<div class="replacement-product replacement-empty"><span class="replacement-product-label">新家具</span><span class="replacement-empty-icon">＋</span><b>等待选择</b></div></div><p class="replacement-empty-copy">从左侧家具库挑选一款，先看看替换效果。</p>`;return;}
  try{
   const work=prepare(),next=work.furniture.find(f=>f.id===session.id),f=getF(session.id);
   const issues=P.spaceCheck(P.effectivePlan(PLAN,work),work.furniture,{focusId:f.id,scanPassages:false});
   const affected=work.furniture.filter(v=>v.id!==f.id&&JSON.stringify(v)!==JSON.stringify(state.furniture.find(o=>o.id===v.id))).length;
   const detached=['counterLink','laundryHostId'].some(k=>f[k]&&!next[k]);
   const oldPrice=priceOf(f),price=session.candidate.price,known=Number.isFinite(price)&&(price>0||session.candidate.id),delta=known&&P.furniturePriceBasis(f,oldPrice)!=='missing'?price-oldPrice:null;
   const format=v=>Number.isFinite(v)?Number(v.toFixed(2)):'未知';
   const rows=[['宽',f.w,next.w],['深',f.d,next.d],['高',FurnishProducts.height(f),FurnishProducts.height(next)]];
   info.innerHTML=`<div class="replacement-pair">${productCard(f,'原家具','original')}${productCard(next,'新家具','candidate')}</div><details class="replacement-specs" ${narrow()?'':'open'}><summary>尺寸与参考价</summary><table class="replacement-dimensions"><caption>尺寸对比 <span>mm</span></caption><thead><tr><th scope="col">尺寸</th><th scope="col">原家具</th><th scope="col"><span aria-hidden="true">→</span></th><th scope="col">新家具</th></tr></thead><tbody>${rows.map(([label,old,value])=>`<tr><th scope="row">${label}</th><td>${format(old)}</td><td class="replacement-arrow">→</td><td class="${old!==value?'replacement-changed':''}">${format(value)}</td></tr>`).join('')}</tbody></table><div class="replacement-price"><span>新参考价<strong>${known?P.purchaseMoney(price):'未录入'}</strong></span>${delta!==null?`<span class="replacement-price-delta">${delta===0?'价格不变':(delta>0?'+':'')+P.purchaseMoney(delta)}</span>`:''}</div></details><div class="replacement-checks">${affected?`<p class="replacement-notice">关联规则将同步调整 ${affected} 件家具，一并撤销。</p>`:''}${detached?'<p class="replacement-notice">原安装关联将解除，请重新核对位置。</p>':''}${issues.length?`<details open><summary>有 ${issues.length} 项需要留意</summary>${issues.map(v=>`<p class="${v.pending?'project-note':'project-error'}">${esc(v.message)}</p>`).join('')}</details>`:'<div class="replacement-check-ok"><span aria-hidden="true">✓</span>本次空间检查未发现问题</div>'}</div>`;
   overlay(next,work);session.preview=next;positionPreview();apply.disabled=false;
  }catch(e){info.textContent=e.message;}
 }
 function choose(it){
  if(!session)return;
  if(!valid()){cancel();return toast('方案或选择已改变，请重新开始替换');}
  if(FurnishKitchen.isLaundryAreaItem(it))return toast('组合洗衣区包含多件家具，请选择单件产品替换');
  session.candidate=source(it);session.itemKey=FurnishCatalogData.itemKey(it);syncCandidateCards();preview();closeDrawers();
  if(narrow()&&session?.preview){
   zoomToBox(groupBox([getF(session.id),session.preview]),1000);
   const p=drawingPoint([session.preview.cx,session.preview.cy]);
   view.x0=p[0]-svg.clientWidth/2/view.s;view.y0=p[1]-svg.clientHeight*.23/view.s;applyView();
  }
 }
 function apply(){
  try{
   const work=prepare(),before=session.before;
   mutate(()=>{if(snap()!==before)throw Error('方案已改变，请重新预览');state.furniture=work.furniture;});
   cancel();toast('已替换家具，可一次撤销恢复',{label:tr('撤销','Undo'),fn:undo});
  }catch(e){if($('#replacement-info'))$('#replacement-info').textContent=e.message;else toast(e.message);}
 }
 function afterRender(){if(!session)return;if(!valid())return cancel();preview();}
 async function replacement(){
  if(selItems().length!==1)return toast('请选择单件家具进行替换');
  const f=selItems()[0];if(furnitureLocked(f))return toast('请先解锁家具及所在图层');
  cancel();const token=startToken;closeFabEditor(false);
  if(is3D())await setView('2d');
  if(token!==startToken||selItems().length!==1||selIds()[0]!==f.id||getF(f.id)!==f)return;
  session={id:f.id,planId:PLAN.id,before:snap(),candidate:null,anchor:'current'};$('#stage').classList.add('replacing');
  resetCatalogFilters();libUI.collection='all';
  buildCats();buildLib();
  $('#libTools').insertAdjacentHTML('afterbegin',`<div id="replacement-banner" role="status"><span class="replacement-mode-dot" aria-hidden="true"></span><div><small>替换模式</small><b title="${esc(nm(f.name))}">${esc(nm(f.name))}</b></div><button class="btn" data-replacement-cancel aria-label="退出替换" title="退出替换">${ico('x')}</button></div>`);
  $('#stage').insertAdjacentHTML('beforeend',`<section id="replacement-panel" aria-label="家具替换预览"><div class="replacement-head"><span class="replacement-head-icon" aria-hidden="true">↔</span><div><h3>替换家具</h3><span>先预览，再决定</span></div><button class="btn" data-replacement-cancel aria-label="关闭替换预览" title="关闭替换预览">${ico('x')}</button></div><div class="replacement-body"><div id="replacement-info" role="status" aria-live="polite"></div><label class="replacement-anchor-label" for="replacement-anchor">定位基准<select id="replacement-anchor"><option value="current">沿用原尺寸调整基准</option><option value="center">中心不动</option><option value="back">背面居中不动</option></select></label><div class="replacement-legend"><span><i class="replacement-old-line"></i>原占地</span><span><i class="replacement-new-line"></i>新家具</span></div><details class="replacement-explainer"><summary>替换后会保留什么？</summary><p>保留编号、朝向与分组；使用新品规格、配色和采购资料，采购状态重置为计划购买。背面基准随旋转变化，不自动贴墙或缩放新品。</p></details></div><div class="replacement-footer"><button class="btn" id="replacement-pick">选择家具</button><button class="btn primary" id="replacement-apply" disabled>确认替换<span aria-hidden="true"> →</span></button><small>确认后可一次撤销恢复</small></div></section>`);
  $('#replacement-anchor').onchange=e=>{session.anchor=e.target.value;preview();};
  $('#replacement-pick').onclick=()=>drawer('lib',true);$('#replacement-apply').onclick=apply;
  preview();drawer('lib',true);
 }
 window.FurnishCatalog={matches,replacement,details,active,isCandidate:it=>!!session?.itemKey&&FurnishCatalogData.itemKey(it)===session.itemKey,choose,afterRender,afterView:positionPreview,selectionChanged,cancel,preferredCategory:()=>session?libAll().find(c=>c.items.some(it=>it[0]===getF(session.id)?.type))?.cat:null};
 document.addEventListener('click',e=>{if(e.target.closest('#replace-furniture,[data-replace-furniture]'))replacement();if(e.target.closest('[data-replacement-cancel]'))cancel();});
 addEventListener('keydown',e=>{if(session&&e.key==='Escape'){e.preventDefault();e.stopImmediatePropagation();cancel();}},true);
})();
