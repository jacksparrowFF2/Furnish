/* One rear-panel control for standalone cabinets and embedded kitchen structures. */
function cabinetBackInput(value,{id='',attributes='',disabled=false,label='背板厚度 mm'}={}){
 const rule=FurnishProducts.cabinetBackPanel;
 return `<label>${label}<input ${id?`id="${id}"`:''} ${attributes} data-cabinet-back-thickness type="number" min="${rule.min}" max="${rule.max}" step="any" value="${value}" ${disabled?'disabled':''}></label>`;
}
function cabinetBackControls(f,c=FurnishCabinet.config(f),{id='cab-back-thickness',inputHtml}={}){
 const C=FurnishCabinet,fmt=n=>Number(n.toFixed(2)),editable=C.backThicknessAvailable(c),kind=c.columns.some(col=>col.pegboard)?'surround':'solid',value=C.backThickness(c,kind);
 const input=inputHtml??cabinetBackInput(value,{id,disabled:!editable});
 return `<section class="cab-part-section" id="${id==='cab-back-thickness'?'cab-depth-info':id+'-info'}" style="grid-column:1/-1"><h4>背板与净深</h4>${input}<div>${editable?'独立于侧板厚度；0表示无背板。':'固定成品模型的背板随产品构造，此处只读。'}</div>${c.columns.some(col=>col.pegboard)?'<div>洞洞板本体沿用原板厚；输入独立厚度后，背板与检修盖板共同采用该值。0时一并移除，开孔与盖板配置保留。</div>':''}${c.columns.map((col,i)=>{const rows=C.depthSections(f,i,c).map(v=>v.storage===false?`<div class="cab-depth-chain">独立洞洞板厚 ${fmt(v.backThickness)} mm；独立板件不定义柜内净深。</div>`:`<div class="cab-depth-chain">隔间 ${i+1} · ${v.label}：总深 ${fmt(v.total)}${v.rearInset?' − 后侧退距 '+fmt(v.rearInset):''} − 背板 ${fmt(v.backThickness)} − ${v.doorThickness?'闭合面板':'面板'} ${fmt(v.doorThickness)} = 净深 ${fmt(v.clearDepth)} mm；${col.shelfInsets?.some(Boolean)?'基准层板深':'层板实体深'} ${fmt(v.shelfDepth)} mm${col.shelfInsets?.some(Boolean)?'；逐层前后退让见层板属性':''}。</div>`).join('');return i?`<details class="cab-help"><summary>隔间 ${i+1} 深度截面</summary>${rows}</details>`:rows;}).join('')}<p class="cab-hint">净深量至实际背板与闭合面板内表面；开放区量至柜体前沿。不同深度与后侧退距分别计算，设备位不虚构背板。墙面、五金和安装预留另行核对。</p></section>`;
}
/* Shared source/reset control; values keep their existing optional persistence semantics. */
function cabinetSettingControl(settings,key,input,inherited,source,disabled=''){
 const own=settings[key]!==undefined;
 return `<div class="cab-setting" data-setting-key="${key}">${input}<div class="cab-setting-source"><span>${own?'单独设置':source}</span><button type="button" class="btn" data-setting-action="${own?'inherit':'pin'}" data-setting-value="${String(own?settings[key]:inherited)}" ${disabled}>${own?'恢复'+source:'单独设置'}</button></div></div>`;
}
/* Same optional front settings for doors, drawer faces and kitchen modules. */
function cabinetFrontAppearance(settings,color,{prefix='',disabled=''}={}){
 const C=FurnishCabinet,shade=settings.finish==='wood'?C.palette.body:color||C.palette.front,field=(key,html,value,source='默认值')=>cabinetSettingControl(settings,key,html,value,source,disabled);
 return `<div class="cab-front-appearance"><p class="cab-hint">外观作用于当前隔间的柜门与抽面；玻璃效果仅用于柜门。</p><div class="form">${field('finish',`<label>面板饰面<select data-${prefix}finish ${disabled}>${[['solid','素色板'],['wood','木色板'],['glass','玻璃柜门']].map(([v,label])=>`<option value="${v}" ${(settings.finish??'solid')===v?'selected':''}>${label}</option>`).join('')}</select></label>`,'solid')}${field('handle',`<label>把手<select data-${prefix}handle ${disabled}>${[['bar','长条'],['knob','圆钮'],['none','无把手']].map(([v,label])=>`<option value="${v}" ${(settings.handle??'bar')===v?'selected':''}>${label}</option>`).join('')}</select></label>`,'bar')}${field('doorColor',`<label>面板颜色<input type="color" data-${prefix}door-color value="${settings.doorColor??shade}" ${disabled}></label>`,shade,settings.finish==='wood'?'材质默认色':'沿用整柜颜色')}</div></div>`;
}
function cabinetViewTools(prefix,{expand=true}={}){return `<label>操作<select id="${prefix}-interaction"><option value="edit">选择编辑</option><option value="open">开合预览</option></select></label><label>标注范围<select id="${prefix}-dimension-mode"><option value="current">当前部件</option><option value="all">全部尺寸</option></select></label>${expand?`<button type="button" class="btn cab-expand" id="${prefix}-expand">放大画布</button>`:''}`;}
