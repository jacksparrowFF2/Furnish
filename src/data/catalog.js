/* Shared browser / Node module; no DOM or application state dependencies. */
(function(root){
'use strict';
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
  {cat:'电器', items:[
    ["stove","燃气灶",750,450,"#dcdcdc",2500],
    ["fridge","冰箱",700,700,"#dfe4e8",4000],
    ["washer","洗衣机",600,600,"#e6ebee",2800,850],
    ["waterheater","电热水器",800,450,"#f4f4f2",1800],
    ["waterheater_flat","扁桶电热水器 60L",700,320,"#fafafa",0,565],
    ["tv","65 寸电视",1450,80,"#1d1d1f",4500],
    ["tv","55 寸电视",1230,80,"#1d1d1f",3000],
    ["fridge","对开门冰箱",910,700,"#c9ced3",7000],
    ["fridge_french_drawer","纯平四门冰箱（双抽屉）",833,595,"#f1f0ed",0,1910],
    ["tv","75 寸电视",1660,80,"#1d1d1f",6000,935],
    ["tv","85 寸电视",1880,90,"#1d1d1f",8500,1060],
    ["tv","100 寸电视",2210,100,"#1d1d1f",15000,1245],
    ["aircon","柜机空调",500,380,"#f6f7f8",6500],
    ["acwall","挂机空调",900,250,"#f6f7f8",3200],
    ["dishwasher","洗碗机",600,600,"#c9ced3",4500],
    ["dryer","烘干机",600,600,"#e6ebee",3800,850],
    ["purifier","空气净化器",400,300,"#f4f4f2",2000],
    ["robot_p20max_tank","石头 P20 Max 水箱版套装",450,450,"#f5f6f5",0,450],
    ["robot_p20max_plumbed","石头 P20 Max 上下水版套装",381,475,"#f5f6f5",0,300],
    ["robot_p20max","石头 P20 Max 扫拖机器人",350,352,"#f5f6f5",0,79.8]
  ]},
  {cat:'柜体', items:[
    ...(typeof module==='object'&&module.exports?require('../core/cabinet-core.js'):root.FurnishCabinet).templates.map(t=>['cabinet',t[1],t[2],t[3],'#f3f1ec',['tv-floor','entry-pegboard','entry-console'].includes(t[0])?undefined:Math.round(t[2]*t[4]/1000),t[4],null,null,t[0]]),
    ["nightstand","床头柜",450,400,"#e8dccb",600],
    ["wardrobe","衣柜",2000,600,"#efe6d8",4500],
    ["wardrobe","衣柜 2.4m",2400,600,"#efe6d8",5400],
    ["wardrobe","小衣柜",1200,550,"#efe6d8",2200],
    ["chest","六斗柜",1200,500,"#e8dccb",1800],
    ["bookshelf","书架",800,300,"#e2cfb4",900],
    ["tvstand","电视柜",2400,400,"#e2cfb4",2200],
    ["shoecab","鞋柜",1000,350,"#efe6d8",1600],
    ["shoecab","玄关柜",1400,380,"#e6dccc",2600],
    ["cabinet","餐边柜",1600,400,"#efe6d8",3200],
    ["vanity","浴室柜",800,500,"#eef1f3",2400],
    ["vanity","双盆浴室柜",1200,500,"#eef1f3",4200],
    ["cabinet","储物柜",1000,400,"#efe6d8",1500],
    ["ovencol","蒸烤箱高柜",600,600,"#efe6d8",9000],
    ["bookshelf","大书架",1600,350,"#e2cfb4",2400]
  ]},
  {cat:'床', items:[
    ["bed","双人床 2.0m",2000,2200,"#c9d6df",4600],
    ["bed","双人床 1.8m",1800,2000,"#c9d6df",3800],
    ["bed","双人床 1.5m",1500,2000,"#d8c7dc",3000],
    ["bed","单人床",1200,2000,"#e8d5b5",1800],
    ["crib","婴儿床",1250,700,"#efe3d0",1200]
  ]},
  {cat:'沙发', items:[
    ["sofa_yeswood_cherry","源氏木语 樱桃木三人沙发 2.16m（梨白）",2160,892,"#eee9df",0,895],
    ["sofa","三人沙发",2400,900,"#b7c4b0",5200],
    ["sofa","双人沙发",1700,880,"#c3cbd6",3600],
    ["cornersofa","转角沙发",2800,1700,"#b7c4b0",7800],
    ["armchair","单人沙发",850,850,"#d6b99a",1800],
    ["beanbag","懒人沙发",800,800,"#e0b98f",600],
    ["armchair","阅读椅",750,800,"#c9a98a",1600]
  ]},
  {cat:'桌 · 台', items:[
    ["dresser","梳妆台",1000,450,"#efe6d8",1500],
    ["desk","书桌",1200,600,"#e2cfb4",1200],
    ["coffeetable","茶几",1300,650,"#e8dccb",1500],
    ["roundtable","圆茶几",800,800,"#e2cfb4",1200],
    ["sidetable","边几",500,500,"#d9c3a3",500],
    ["table","餐桌",1400,800,"#e2cfb4",2400],
    ["table","六人餐桌",1800,900,"#d8c2a2",3600],
    ["roundtable","圆桌",1000,1000,"#e2cfb4",2200],
    ["island","岛台",1800,900,"#e9e5de",6800],
    ["island","大岛台",2400,1000,"#e9e5de",9800],
    ["counter","橱柜台面",1600,600,"#e9e5de",6400],
    ["desk","长书桌",1600,700,"#d8c2a2",2200]
  ]},
  {cat:'椅 · 凳', items:[
    ["chair","椅子",450,480,"#cfc6b8",400],
    ["chair","餐椅",450,480,"#cfc6b8",450],
    ["barstool","吧椅",420,420,"#6b5d4c",500],
    ["officechair","办公椅",620,620,"#4a4f55",1500],
    ["bench","换鞋凳",800,350,"#d9c9a8",600]
  ]},
  {cat:'卫浴 · 水槽', items:[
    ["ksink","水槽",800,450,"#e1e6ea",1500],
    ["toilet","马桶",400,700,"#ffffff",2200],
    ["shower","淋浴房",900,900,"#e4edf2",3500],
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
    ["mirror","穿衣镜",500,60,"#dfe6ea",500]
  ]},
  {cat:'运动 · 乐器', items:[
    ["piano","立式钢琴",1500,600,"#1f1d1b",18000],
    ["treadmill","跑步机",800,1800,"#3a3a3c",3500]
  ]},
  {cat:'门 · 隔断', items:[
    ["slidingdoor","双扇推拉门",1800,120,"#41474b",2800,2100],
    ["tripleslidingdoor","三联动推拉门",2400,90,"#41474b",4800,2400],
    ["tripleslidingwindow","三联动推拉窗",1800,90,"#41474b",0,1500]
  ]},
  {cat:'生活用品', items:[
    ["dryingrack","晾衣架",1400,550,"#cfd6d9",500]
  ]},
];

const TYPE_PRICE = {};
LIB.forEach(c=>c.items.forEach(i=>TYPE_PRICE[i[0]]??=i[5]));

const api={materials:MATS,library:LIB,typePrices:TYPE_PRICE};
if(typeof module==='object'&&module.exports)module.exports=api;
else root.FurnishCatalogData=api;
})(typeof globalThis!=='undefined'?globalThis:this);
