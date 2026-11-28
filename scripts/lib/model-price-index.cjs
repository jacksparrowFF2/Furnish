'use strict';
const Catalog=require('../../src/data/catalog.js');
const Products=require('../../src/core/product-rules.js');

// Each entry selects a verified sales specification within its model dossier.
// Amounts and source URLs always come from the capture history.
const fixedOffers=[
  ["acwall-midea-mxc3p","大 1.5 匹 · KFR-35GW/MXC3P"],
  ["aquarium-mijia-2pro","黑色 · 31 L · 标准版单缸"],
  ["armchair","仿棉麻亚麻色，725×900×905 mm，单椅"],
  ["armchair-berlin","Y83H04 · 橡木原木色 · 仿棉麻砂砾白 · 710×850×845 mm 单椅"],
  ["bed-yeswood-y17b02","樱桃木 · 适用 1200×2000 mm 床垫 · 床架"],
  ["bed-yeswood-y83b33","原木色 · 红橡木 · 1.8 米床架"],
  ["cat-tower","通天柱 · 套餐二 · 适用房高 2.1–2.75 m"],
  ["cat-tree","绿叶成荫 · 升级围栏款 · 500×500×1430 mm"],
  ["chair-s05118","白蜡木原木色 0.66 m · 有机皮奶茶色"],
  ["cherry-coffee-table","T209J02 · 樱桃木 · 1.2 米白色岩板 · 1200×650×450 mm"],
  ["corner-bookcase","原木色 · 0.45 米"],
  ["corner-bookcase-580","原木色 · 0.58 米"],
  ["dishwasher","白色 · 磁吸折叠门"],
  ["downlight-labot-ip65","7 W · 全白 · 中性光 4000 K"],
  ["drying-rack-hotata-y024","米粉 · 2.4 米 · 四杆整套"],
  ["drying-rack-hotata-y024-2m","米粉 · 2 米 · 四杆整套"],
  ["fan-x231","FA18-X231 · 40 W"],
  ["freeze-dry-bucket-6l","6 L 真空冻干桶"],
  ["fridge","BCD-520WUFJDPZ(E) · 520 L 云隐白 · 833×595×1910 mm"],
  ["hood","CXW-358-01-JCD10TA · 单烟机"],
  ["litter-box","派派猫 · 灰白大号 · 440×510×400 mm"],
  ["mijia-ceiling-d20","D20 · 9290041692 · 雷达光感 · 单灯"],
  ["mijia-ceiling-d30","D30 · 9290041691 · 单灯"],
  ["mijia-ceiling-d40","D40 · 9290041690 · 单灯"],
  ["mijia-ceiling-l60","L60 · 9290041689 · 单灯"],
  ["mijia-ceiling-l90","L90 单灯 · 原米家吸顶灯套系"],
  ["night-light-mijia-4","米家夜灯 4"],
  ["panel-light","美的 · 24 W 全光谱长灯 · 300×600×35 mm · IP44 白光"],
  ["pet-bowl","原建模来源 SKU 100173178564"],
  ["pet-feeder-mijia-2","5 L · 标准版 · 非可视版"],
  ["pillow-atour-pro4","10 cm · 岩溪蓝枕套＋枕芯 · 单只装"],
  ["se2","SE2 · 热浪系列 · 300×600 mm 安装 · 送安装拆旧"],
  ["shoe-bench","Y83T53 · 80 cm 橡木原木色 · 仿棉麻砂砾白 · 800×300×450 mm"],
  ["side-table","Y102J16 · 樱桃木／鱼肚白 · 680×300×612 mm"],
  ["sofa-bed","Y107H03 · 1.25 米 · 山毛榉原木色／梨白"],
  ["stack-stool","奶油白 · PVC 仿皮革软包高凳 · 370×370×467 mm · 单只"],
  ["storage-bin-deep-large","深柜大号 · 200×280×150 mm · 单只"],
  ["storage-bin-deep-medium","深柜中号 · 150×280×150 mm · 单只"],
  ["storage-bin-deeper-large","加深柜大号 · 200×350×150 mm · 单只"],
  ["storage-bin-deeper-medium","加深柜中号 · 150×350×150 mm · 单只"],
  ["storage-bin-shallow-large","浅柜大号 · 200×210×150 mm · 单只"],
  ["storage-bin-ultradeep-large","超深柜大号 · 200×450×150 mm · 单只"],
  ["storage-bin-ultradeep-medium","超深柜中号 · 150×450×150 mm · 单只"],
  ["storage-toolbox","360×150×115 mm · 1 只"],
  ["tea-bar","白色 · 立式 315×310×1155 mm"],
  ["toolbox-jiabangshou-390","透明大号 · 加大提手 · 390×270×210 mm"],
  ["toolbox-shimoyama-9l","霜山 9 L · 大号 340×240×180 mm"],
  ["toshiba-d232","D232 · 白色 · 23 L 台嵌一体"],
  ["track-socket-bull-gb50k","GN-GB50K · 墨云灰 · 500 mm＋3 个五孔"],
  ["trolley-ikea-raskog-large","灰绿色 · 35×45×77 cm"],
  ["washer-tg10k60w","TG10K60W · 奶油白 · 10 kg 滚筒单洗"],
  ["y52y09","Y52Y09 · 1115×230×750 mm · 六格无底框"],
];

function buildProductPrices(dossiers){
  const result=Object.create(null),byId=new Map(dossiers.map(d=>[d.id,d]));
  const items=Catalog.library.flatMap(c=>c.items);

  function bind(id,variants,{type,name,fields,byColor=false,nominalOnly=false,detail,priceSource}={}){
    const dossier=byId.get(id);
    if(!dossier)throw Error('Missing price dossier: '+id);
    type??=dossier.types.length===1?dossier.types[0]:null;
    if(!type||!dossier.types.includes(type))throw Error('Price type does not match dossier: '+id);
    const stock=items.filter(it=>it[0]===type&&(name?it[1]===name:!Catalog.assemblyMembers(it).length));
    if(stock.length!==1)throw Error('Price binding requires one catalog specification: '+id);
    const item=stock[0];
    const labels=typeof variants==='string'?[variants]:variants;
    const matches=(dossier.productCaptures||[]).filter(row=>labels.includes(row.capture.variant)&&(!priceSource||priceSource(row)));
    if(!matches.length)throw Error('Missing capture for price binding: '+id+' · '+variants);
    const latest=matches.reduce((best,row)=>row.capture.priceFen!==null&&(!best||row.capturedOn>=best.capturedOn)?row:best,null);
    if(!latest)return;
    const {capture,sourceUrl,capturedOn}=latest;
    const panel=fields?.panelVariant?Products.panelOptions[fields.panelVariant]:null;
    const model=panel?.model??Catalog.itemIdentity(item)?.model??null;
    const size=[item[2],panel?.depth??item[3],item[6]??Products.height({type})];
    const offer={size,model,priceFen:capture.priceFen,variant:capture.variant,sourceUrl,capturedOn};
    if(fields)offer.fields=fields;
    if(byColor)offer.color=item[4];
    if(nominalOnly)offer.nominalOnly=true;
    if(detail)offer.detail=detail;
    (result[type]??=[]).push(offer);
  }

  for(const [id,variant] of fixedOffers){
    const options={};
    if(id==='bed-yeswood-y17b02')options.nominalOnly=true;
    if(id==='stack-stool')options.fields={stoolCount:1};
    bind(id,variant,options);
  }
  bind('desk-lamp-mijia-pro',['白色双段灯头 · MJTD07YL','白色 Pro · 双段灯头']);
  bind('litter-bag','四合一混合猫砂 · 2.5 kg 单袋');
  for(const type of ['curtain_mijia_3_pro','curtain_mijia_3_pro_sheer']){
    bind('curtain-mijia-3-pro-motor','白色 · 标准版单套',{type,detail:'标准版硬件，布料与定制轨道另计'});
  }
  bind('robot-p20max','P20 Max · A2950RR · 水箱版',{type:'robot_p20max_tank'});
  bind('robot-p20max','P20 Max · A2950RR · 自动上下水版',{type:'robot_p20max_plumbed'});
  bind('chair-vihals',['白色 905.927.38','白色'],{name:'宜家 VIHALS 维哈斯折叠椅（白色／展开）',byColor:true});
  bind('chair-vihals','绿色',{name:'宜家 VIHALS 维哈斯折叠椅（绿色）',byColor:true});
  bind('yeswood-sofa','Y102H11 · 樱桃木 · 2.16 米三人位 · 梨白',{name:'源氏木语 樱桃木三人沙发 2.16m（梨白）',byColor:true});
  bind('yeswood-sofa','Y102H11 · 樱桃木 · 2.16 米三人位 · 灯芯绒松绿',{name:'源氏木语 樱桃木三人沙发 2.16m（灯芯绒松绿）',byColor:true});

  for(const downlightWatts of Products.fields.downlightWatts.values){
    for(const downlightKelvin of Products.fields.downlightKelvin.values){
      bind('downlight-dl269','DL269 · '+downlightWatts+' W · '+downlightKelvin+' K · 开孔 75–78 mm',
        {fields:{downlightWatts,downlightKelvin},nominalOnly:true});
    }
  }
  for(const [panelVariant,spec] of Object.entries(Products.panelOptions)){
    if(!spec.series)continue;
    const color=spec.color==='white'?'白色':'深空灰';
    if(spec.series==='wireless'){
      bind('panel-xiaomi-wireless',color+' · 无线双开',{fields:{panelVariant},nominalOnly:true});
    }else{
      const productId=spec.series==='2pro'?'25749':'25273';
      const priceSource=row=>{const source=new URL(row.sourceUrl);return source.hostname==='www.mi.com'&&source.searchParams.get('product_id')===productId;};
      bind('panel-xiaomi-switch2',color+' · '+['','单开','双开','三开'][spec.gangs],
        {fields:{panelVariant},nominalOnly:true,priceSource});
    }
  }
  return result;
}

function script(dossiers){
  const rows=Object.entries(buildProductPrices(dossiers));
  const data='{\n'+rows.map(([type,offers])=>'  '+JSON.stringify(type)+':'+JSON.stringify(offers)).join(',\n')+'\n}';
  return '/* Generated by scripts/index-model-assets.cjs from approved dossier captures. */\n'+
    '(function(root){\nconst prices='+data+';\n'+
    "if(typeof module==='object'&&module.exports)module.exports=prices;else root.FurnishArchivedProductPrices=prices;\n})(typeof globalThis!=='undefined'?globalThis:this);\n";
}
module.exports={buildProductPrices,script};
