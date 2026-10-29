/* Shared browser / Node module; no DOM or application state dependencies. */
(function(root){
'use strict';
const products=typeof module==='object'&&module.exports?require('../core/product-rules.js'):root.FurnishProducts;
const cabinets=typeof module==='object'&&module.exports?require('../core/cabinet-core.js'):root.FurnishCabinet;
const MATS = {
  wood:    {name:'橡木地板', price:320, sw:'#d8b88a'},
  walnut:  {name:'胡桃木地板', price:380, sw:'#9b7250'},
  tile800: {name:'800 地砖', price:220, sw:'#ebe6dc'},
  tile600: {name:'600 地砖', price:160, sw:'#dfe3e1'},
  marble:  {name:'大理石', price:650, sw:'#f1eee8'},
  antislip:{name:'300 防滑砖', price:140, sw:'#d3d8d4'},
  terrazzo:{name:'水磨石', price:280, sw:'#e6dfd3'},
  carpet:  {name:'满铺地毯', price:200, sw:'#c9c3d3'},
};
// 家具库：[类型, 名称, 宽, 深, 颜色, 参考单价 ¥]
const LIB = [
  {cat:'占位体', items:[
    ['block','方块占位体',1000,1000,'#a8b6c4',undefined,products.height({type:'block'})]
  ]},
  {cat:'电器', items:[
    ['panel_light_300x600','厨房平板灯 · 300×600 · 24W',300,600,'#f5f5f2',undefined,products.height({type:'panel_light_300x600'})],
    ['bath_heater_aopu_se2','奥普 SE2 风暖浴霸',300,600,'#f5f5f3',undefined,products.height({type:'bath_heater_aopu_se2'})],
    ['bath_heater_300x600','风暖浴霸 · 300×600通用占位',300,600,'#f5f5f0',undefined,products.height({type:'bath_heater_300x600'})],
    ["downlight_philips_dl269","飞利浦品焕筒灯 DL269",85,85,"#f4f4f0",undefined,45],
    ['heating_manifold','地暖分水器（路数可调）',products.definition('heating_manifold').manifold.width,products.definition('heating_manifold').manifold.depth,'#c6a258',undefined,products.height({type:'heating_manifold'})],
    ['electrical_box_strong','强电箱（尺寸自定）',300,120,'#eceeea',undefined,400],
    ['electrical_box_weak','弱电箱（尺寸自定）',400,120,'#eceeea',undefined,400],
    ["aquarium_mijia_2pro","米家智能鱼缸 2 Pro",505,292,"#191c20",0,products.height({type:"aquarium_mijia_2pro"})],
    ["stove_fotile_th36b","方太燃气灶 TH36B-T",750,440,"#111214",0,products.height({type:"stove_fotile_th36b"})],
    ["rangehood_fotile_jcd10ta","方太抽油烟机 JCD10TA",900,350,"#111214",0,products.height({type:"rangehood_fotile_jcd10ta"})],
    ["stove","燃气灶",750,450,"#dcdcdc",2500],
    ["fridge","冰箱",700,700,"#dfe4e8",4000],
    ["washer","洗衣机",600,600,"#e6ebee",2800,products.height({type:"washer"})],
    ["waterheater","电热水器",800,450,"#f4f4f2",1800],
    ["waterheater_flat","扁桶电热水器 60L",700,320,"#fafafa",0,products.height({type:"waterheater_flat"})],
    ["tv","65 寸电视",1450,80,"#1d1d1f",4500],
    ["tv","55 寸电视",1230,80,"#1d1d1f",3000],
    ["fridge","对开门冰箱",910,700,"#c9ced3",7000],
    ["fridge_french_drawer","纯平四门冰箱（双抽屉）",833,595,"#f1f0ed",0,products.height({type:"fridge_french_drawer"})],
    ["tv","75 寸电视",1660,80,"#1d1d1f",6000,935],
    ["tv","85 寸电视",1880,90,"#1d1d1f",8500,1060],
    ["tv","100 寸电视",2210,100,"#1d1d1f",15000,1245],
    ["aircon","柜机空调",500,380,"#f6f7f8",6500],
    ["aircon_midea_ultra_2hp","美的酷省电 Ultra 立式空调 · 2匹室内机",395,436,"#e5e7e8",0,products.height({type:"aircon_midea_ultra_2hp"})],
    ["acwall","挂机空调",900,250,"#f6f7f8",3200],
    ["dishwasher","洗碗机",600,600,"#c9ced3",4500],
    ["dishwasher_mijia_countertop","米家台面洗碗机 · 5套",550,350,"#f4f3ef",0,products.height({type:"dishwasher_mijia_countertop"})],
    ["dryer","烘干机",600,600,"#e6ebee",3800,products.height({type:"dryer"})],
    ["water_purifier_mijia_1200g","米家净水器 2 · 1200G",163,445,"#f6f6f4",0,products.height({type:"water_purifier_mijia_1200g"})],
    ["tea_bar_mijia_pro","米家智能茶吧机 Pro 立式",315,310,"#eeefec",0,products.height({type:"tea_bar_mijia_pro"})],
    ["purifier","空气净化器",400,300,"#f4f4f2",2000],
    ["robot_p20max_tank","石头 P20 Max 水箱版套装",450,450,"#f5f6f5",0,450],
    ["robot_p20max_plumbed","石头 P20 Max 上下水版套装",381,475,"#f5f6f5",0,300],
    ["robot_p20max","石头 P20 Max 扫拖机器人",350,352,"#f5f6f5",0,79.8]
  ]},
  {cat:'柜体', items:[
    ["pipebox","管道包覆柜",400,300,"#f3f1ec",0,products.height({type:"pipebox"})],
    ["cabinet","收纳柜",1000,450,"#f3f1ec",1800,1800,null,null,"storage"],
    ["nightstand","床头柜",450,400,"#e8dccb",600],
    ["wardrobe","衣柜",2000,600,"#efe6d8",4500],
    ["chest","六斗柜",1200,500,"#e8dccb",1800],
    ["bookshelf","书架",800,300,"#e2cfb4",900],
    ["bookshelf_yeswood_y52y09","源氏木语 Y52Y09 · 750高六格书柜",1115,230,"#c49b70",undefined,750,null,null,'book-y52y09-low'],
    ["tvstand","电视柜",2400,400,"#e2cfb4",2200],
    ["shoecab","鞋柜",1000,350,"#efe6d8",1600],
    ["cabinet","餐边柜",1600,400,"#efe6d8",3200],
  ]},
  {cat:'床', items:[
    ["bed","双人床 2.0m",2000,2200,"#c9d6df",4600],
    ["bed","双人床 1.8m",1800,2000,"#c9d6df",3800],
    ["bed","双人床 1.5m",1500,2000,"#d8c7dc",3000],
    ["bed","单人床",1200,2000,"#e8d5b5",1800],
    ["crib","婴儿床",1250,700,"#efe3d0",1200]
  ]},
  {cat:'沙发', items:[
    ["sofa_yeswood_cherry","源氏木语 樱桃木三人沙发 2.16m（梨白）",2160,892,"#eee9df",0,products.height({type:"sofa_yeswood_cherry"})],
    ["sofa","三人沙发",2400,900,"#b7c4b0",5200],
    ["sofa","双人沙发",1700,880,"#c3cbd6",3600],
    ["cornersofa","转角沙发",2800,1700,"#b7c4b0",7800],
    ["armchair","单人沙发",850,850,"#d6b99a",1800],
    ["beanbag","懒人沙发",800,800,"#e0b98f",600],
    ["armchair","阅读椅",750,800,"#c9a98a",1600]
  ]},
  {cat:'桌 · 台', items:[
    ["coffeetable_yeswood_cherry","源氏木语 樱桃木茶几 · 1.2m（白色岩板）",1200,650,"#bd7846",0,products.height({type:"coffeetable_yeswood_cherry"})],
    ["tea_table_800","藤编移动茶台 · 80cm",800,400,"#68432e",0,products.height({type:"tea_table_800"})],
    ["dresser","梳妆台",1000,450,"#efe6d8",1500],
    ["desk","书桌",1200,600,"#e2cfb4",1200],
    ["coffeetable","茶几",1300,650,"#e8dccb",1500],
    ["roundtable","圆茶几",800,800,"#e2cfb4",1200],
    ["sidetable","边几",500,500,"#d9c3a3",500],
    ["table","餐桌",1400,800,"#e2cfb4",2400],
    ["table_folding_1100","源氏木语折叠餐桌 · 1100款",1100,1100,"#bd925f",0,760],
    ["table_folding_1200","源氏木语折叠餐桌 · 1200款",1200,1200,"#bd925f",0,760],
    ["table_folding_1300","源氏木语折叠餐桌 · 1300款",1305,1305,"#bd925f",0,760],
    ["table","六人餐桌",1800,900,"#d8c2a2",3600],
    ["roundtable","圆桌",1000,1000,"#e2cfb4",2200],
    ["island","岛台",1800,900,"#e9e5de",6800],
    ["island","大岛台",2400,1000,"#e9e5de",9800],
    ["desk","长书桌",1600,700,"#d8c2a2",2200]
  ]},
  {cat:'阳台柜', items:[
    ['counter','完整阳台洗衣柜',1340,630,'#f3f1ec',undefined,undefined,null,null,null,'laundry-area-left'],
    ['counter','基础洗衣机柜',1340,630,'#f3f1ec',undefined,undefined,null,null,null,'laundry-left'],
    ['ksink','阳台定制水槽（可设异形缺角）',600,500,'#e8e6df',undefined],
    ['ksink','阳台台上盆 · 圆角单盆',560,400,'#f5f4ef',undefined,undefined,undefined,undefined,undefined,'vessel-sink']
  ]},
  {cat:'厨房', items:[
    ["counter","橱柜台面",1600,600,"#e9e5de",6400],
    ["kitchenwall","厨房吊柜",800,350,"#e9e5de",undefined,700],
    ["ovencol","蒸烤箱高柜",600,600,"#efe6d8",9000]
  ]},
  {cat:'椅 · 凳', items:[
    ["bench_yeswood_oak","源氏木语 橡木软包换鞋凳 · 80cm",800,300,"#bd925f",0,products.height({type:"bench_yeswood_oak"})],
    ["chair","椅子",450,480,"#cfc6b8",400],
    ["chair","餐椅",450,480,"#cfc6b8",450],
    ["barstool","吧椅",420,420,"#6b5d4c",500],
    ["officechair","办公椅",620,620,"#4a4f55",1500],
    ["bench","换鞋凳",800,350,"#d9c9a8",600]
  ]},
  {cat:'卫浴 · 水槽', items:[
    ["vanity","浴室柜",800,500,"#eef1f3",2400],
    ["vanity","双盆浴室柜",1200,500,"#eef1f3",4200],
    ["ksink","水槽",800,450,"#e1e6ea",1500],
    ["sink_arrow_680","箭牌日式集渣水槽 · 680",680,450,"#85898a",0,products.height({type:'sink_arrow_680'})],
    ["sink_arrow_750","箭牌日式集渣水槽 · 750",750,450,"#85898a",0,products.height({type:'sink_arrow_750'})],
    ["toilet","马桶",400,700,"#ffffff",2200],
    ["shower","淋浴房",900,900,"#e4edf2",3500],
    ["shower_arrow_cream","箭牌 奶油白壁挂花洒 AE34129ZMKW-P2",420,515,"#eee7d8",0,products.height({type:"shower_arrow_cream"})],
    ["bathtub","浴缸",1600,750,"#eef3f6",4800]
  ]},
  {cat:'灯具', items:[
    ["floorlamp","落地灯",450,450,"#3d3a34",600],
    ["pendant","吊灯",700,700,"#e8dfc8",900],
    ["pendant","餐厅吊灯",900,900,"#d9cdb2",1200]
  ]},
  {cat:'布艺', items:[
    ["baycushion","飘窗垫",520,1800,"#e7dccd",600],
    ["rug","地毯",2400,1700,"#d9cbb8",900],
    ["curtain","窗帘 2.4m",2400,180,"#c9d3da",1500],
    ["curtain","窗帘 3m",3000,180,"#b9c4cc",1900],
    ["curtain","单开窗帘 2.4m",2400,180,"#c9d3da",1500,2400,null,"single"],
    ["curtain","双开窗帘 2.4m",2400,180,"#c9d3da",1500,2400,null,"double"]
  ]},
  {cat:'装饰', items:[
    ["plant","绿植",500,500,"#a9c39b",200],
    ["plant","大绿植",700,700,"#9dbb8c",450],
    ["wallart","装饰画 横",1500,60,"#8a7a5e",800],
    ["wallart","装饰画 小",900,60,"#a08a66",400],
    ["mirror","穿衣镜",500,60,"#dfe6ea",500,1650]
  ]},
  {cat:'运动 · 乐器', items:[
    ["piano","立式钢琴",1500,600,"#1f1d1b",18000],
    ["treadmill","跑步机",800,1800,"#3a3a3c",3500]
  ]},
  {cat:'门 · 隔断', items:[
    ["pocketdoor_double","双侧口袋门隔断 · 布局草模",2800,160,"#c5b59d",undefined,2640],
    ["pocketdoor_triple","单侧三联动口袋门 · 布局草模",2800,220,"#c5b59d",undefined,2640],
    ["slidingdoor","双扇推拉门",1800,120,"#41474b",2800,2100],
    ["telescopicdoor20","2+0 同向联动门 · 超白玻璃",1800,products.definition('telescopicdoor20').telescopic.defaultDepth,"#41474b",0,2400],
    ["doubleslidingdoor","双联动推拉门",1800,90,"#41474b",0,2400],
    ["tripleslidingdoor","三联动推拉门",2400,90,"#41474b",4800,2400],
    ["tripleslidingwindow","三联动推拉窗",1800,90,"#41474b",0,1500]
  ]},
  {cat:'生活用品', items:[
    ["cat_tree","猫爬架 · 绿叶成荫围栏款",500,500,"#75a533",0,products.height({type:"cat_tree"})],
    ["pet_feeder_mijia_2","米家智能宠物喂食器 2",220,324,"#efeee8",0,products.height({type:"pet_feeder_mijia_2"})],
    ["litter_box","封闭式猫砂盆",440,510,"#eeede5",0,products.height({type:"litter_box"})],
    ["dryingrack","晾衣架",1400,550,"#cfd6d9",500]
  ]},
];

const TYPE_PRICE = {};
LIB.forEach(c=>c.items.forEach(i=>TYPE_PRICE[i[0]]??=i[5]));

// Hidden historical specifications still serve placed items' price and size reset.
const retiredItems=[
 // Historical names keep their exact specifications and side when old projects look them up.
    ['counter','完整阳台洗衣区 · 左洗衣机',1340,630,'#f3f1ec',undefined,undefined,null,null,null,'laundry-area-left'],
    ['counter','完整阳台洗衣区 · 右洗衣机',1340,630,'#f3f1ec',undefined,undefined,null,null,null,'laundry-area-right'],
    ['counter','洗衣机柜 · 左洗衣机／右水槽',1340,630,'#f3f1ec',undefined,undefined,null,null,null,'laundry-left'],
    ['counter','洗衣机柜 · 水槽与设备空位',1340,630,'#f3f1ec',undefined,undefined,null,null,null,'laundry'],

 ...cabinets.templates.filter(t=>t[0]!=='storage').map(t=>['cabinet',t[1],t[2],t[3],'#f3f1ec',['tv-floor','entry-pegboard','entry-console','sideboard-wall','sideboard-fridge'].includes(t[0])?undefined:Math.round(t[2]*t[4]/1000),t[4],null,null,t[0]]),
 ['wardrobe','衣柜 2.4m',2400,600,'#efe6d8',5400],
 ['wardrobe','小衣柜',1200,550,'#efe6d8',2200],
 ['shoecab','玄关柜',1400,380,'#e6dccc',2600],
 ['cabinet','储物柜',1000,400,'#efe6d8',1500],
 ['bookshelf','大书架',1600,350,'#e2cfb4',2400]
];
const findItem=(type,name)=>LIB.flatMap(c=>c.items).find(i=>i[0]===type&&i[1]===name)||retiredItems.find(i=>i[0]===type&&i[1]===name)||null;
// Browsing is a derived view: historical specifications and price precedence stay unchanged.
const categoryNames={'阳台柜':'洗衣 · 家政','厨房':'厨房橱柜','门 · 隔断':'门窗 · 隔断','生活用品':'宠物'};
const petTypes=new Set(['aquarium_mijia_2pro','cat_tree','pet_feeder_mijia_2','litter_box']);
function browseLibrary(){
 const groups=new Map();
 for(const c of LIB)for(const it of c.items){
  const cat=petTypes.has(it[0])?'宠物':it[0]==='dryingrack'?'洗衣 · 家政':categoryNames[c.cat]||c.cat;
  if(!groups.has(cat))groups.set(cat,[]);groups.get(cat).push(it);
 }
 // Keep the familiar category order, even when an early item moved to Pets.
 return [...LIB.map(c=>categoryNames[c.cat]||c.cat)].filter((c,i,a)=>a.indexOf(c)===i&&groups.has(c)).map(cat=>({cat,items:groups.get(cat)}));
}
const uses=[['living','客厅','Living'],['bedroom','卧室','Bedroom'],['dining','餐厅','Dining'],['study','书房','Study'],['kitchen','厨房','Kitchen'],['laundry','洗衣家政','Laundry'],['bathroom','卫浴','Bathroom'],['entry','玄关','Entry'],['pet','宠物','Pets']];
const useTypes={
 living:['sofa','sofa_yeswood_cherry','cornersofa','armchair','beanbag','coffeetable','coffeetable_yeswood_cherry','roundtable','sidetable','tea_table_800','tea_bar_mijia_pro','tv','tvstand','aircon','aircon_midea_ultra_2hp','acwall','purifier','plant','rug','floorlamp'],
 bedroom:['bed','crib','nightstand','wardrobe','chest','dresser','curtain','mirror','acwall'],
 dining:['table','table_folding_1100','table_folding_1200','table_folding_1300','roundtable','chair','barstool','island','cabinet','pendant'],
 study:['desk','chair','officechair','bookshelf','bookshelf_yeswood_y52y09','armchair','floorlamp'],
 kitchen:['panel_light_300x600','stove','stove_fotile_th36b','rangehood_fotile_jcd10ta','fridge','fridge_french_drawer','dishwasher','dishwasher_mijia_countertop','water_purifier_mijia_1200g','ksink','sink_arrow_680','sink_arrow_750','ovencol','kitchenwall','island'],
 laundry:['washer','dryer','dryingrack','robot_p20max','robot_p20max_tank','robot_p20max_plumbed'],
 bathroom:['bath_heater_aopu_se2','bath_heater_300x600','vanity','toilet','shower','shower_arrow_cream','bathtub','waterheater','waterheater_flat'],
 entry:['electrical_box_strong','electrical_box_weak','shoecab','bench_yeswood_oak','bench','mirror'],pet:[...petTypes]
};
function itemUses(it){
 const result=uses.filter(([id])=>useTypes[id].includes(it[0])).map(([id])=>id);
 if(it[0]==='counter')result.push(String(it[10]||'').startsWith('laundry')?'laundry':'kitchen');
 if(it[0]==='ksink'&&LIB.find(c=>c.cat==='阳台柜').items.includes(it))result.push('laundry');
 return result;
}
const itemKey=it=>JSON.stringify(it[7]?['custom',it[7]]:[it[0],it[1]]);
function itemHeight(it){
 const f={type:it[0],name:it[1],w:it[2],d:it[3],h:it[6]};
 return products.height(f)??(cabinets.supported(f)?cabinets.height(f):undefined);
}
function matches(it,{query='',maxWidth=0,maxDepth=0,use='all'}={},extra={}){
 const identity=products.definition(it[0])?.identity||{};
 const text=[it[1],...itemUses(it).map(id=>uses.find(u=>u[0]===id).slice(1).join(' ')),identity.brand,identity.model,extra.name,extra.brand,extra.model].join(' ').toLowerCase();
 return query.trim().toLowerCase().split(/\s+/).every(word=>text.includes(word))&&(!maxWidth||it[2]<=maxWidth)&&(!maxDepth||it[3]<=maxDepth)&&(use==='all'||itemUses(it).includes(use));
}
const api={materials:MATS,library:LIB,typePrices:TYPE_PRICE,findItem,browseLibrary,uses,itemUses,itemKey,itemHeight,matches};
if(typeof module==='object'&&module.exports)module.exports=api;
else root.FurnishCatalogData=api;
})(typeof globalThis!=='undefined'?globalThis:this);
