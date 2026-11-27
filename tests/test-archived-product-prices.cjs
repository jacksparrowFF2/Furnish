'use strict';
const assert=require('node:assert/strict');
const Catalog=require('../src/data/catalog.js');
const Products=require('../src/core/product-rules.js');
const Project=require('../src/core/project-core.js');
const Generator=require('../scripts/lib/model-price-index.cjs');
const {products:dossiers}=require('../assets/models/index.json');
const prices=require('../src/data/archived-product-prices.js');
const entries=Catalog.library.flatMap(category=>category.items);

function stock(type,tag=''){
  const item=entries.find(row=>row[0]===type&&row[1].includes(tag));
  assert(item,type+' '+tag);
  const [,name,w,d,color,,h]=item;
  const f={id:type,type,name,w,d,color,h:h??Products.height({type}),cx:1000,cy:1200,rot:0};
  return {...f,...Products.initial(f),...Catalog.itemIdentity(item)};
}
const price=f=>Project.archivedFurniturePrice(f)?.priceFen;

assert.deepEqual(JSON.parse(JSON.stringify(Generator.buildProductPrices(dossiers))),prices);
const table=stock('sidetable_tmall_635382906309');
assert.equal(price(table),95600);
assert.equal(price({...table,name:'改名后的边几',rot:90,mountHeight:170}),95600);
assert.equal(price({...table,model:'其他型号'}),undefined);
assert.equal(price({...table,obj:true}),undefined);
assert.equal(price({...table,catalogId:'user-catalog'}),undefined);
assert.equal(price({...table,type:'sidetable'}),undefined);
const legacy={...stock('washer_littleswan_tg10k60w'),w:600,d:600};
assert.equal(price(legacy),354007,'saved model identity survives placement resizing');
assert.equal(price({...legacy,model:undefined}),undefined,'a resized legacy item needs a fixed model identity');
assert.equal(price({...legacy,h:undefined,w:595,d:560,model:undefined}),354007,'legacy nominal item has a type default height');

const light=stock('downlight_philips_dl269');
for(const kelvin of [3000,4000,6500]){
  assert.equal(price({...light,downlightWatts:5,downlightKelvin:kelvin}),3051);
  assert.equal(price({...light,downlightWatts:7,downlightKelvin:kelvin}),3731);
}
assert.equal(price({...light,w:180}),undefined);

const basePanel=stock('panel_bull_g12');
const panel=key=>Products.editPanelVariant(basePanel,key);
assert.equal(price(panel('xiaomi-2-1-white')),7900);
assert.equal(price(panel('xiaomi-2-1-grey')),8490);
assert.equal(price(panel('xiaomi-2pro-1-white')),12900);
assert.equal(price(panel('xiaomi-wireless-2-grey')),6490);
assert.equal(price(panel('socket5-diagonal')),undefined,'ten-pack cannot price one panel');
assert.equal(price({...panel('xiaomi-wireless-2-grey'),w:120}),undefined);

const green=stock('chair_ikea_vihals','绿色'),white=stock('chair_ikea_vihals','白色');
assert.match(Project.archivedFurniturePrice(green).sourceUrl,/80592753/);
assert.match(Project.archivedFurniturePrice({...white,foldingChairFolded:true}).sourceUrl,/90592738/);
assert.match(Project.archivedFurniturePrice({...green,model:undefined}).sourceUrl,/80592753/);
assert.equal(price(stock('cat_litter_yanxuan_25kg')),1890,'single bag excludes carton price');
assert.equal(price(stock('robot_p20max')),undefined,'the robot alone excludes its kit');
assert.equal(price(stock('robot_p20max_tank')),309900);
assert.match(Project.archivedFurniturePrice(stock('robot_p20max_plumbed')).variant,/上下水/);
assert.equal(price(stock('medicine_box_reference')),undefined,'similar procurement example is not the exact model');
assert.equal(price(stock('garment_down_long_photo')),undefined,'wardrobe placeholder is not a procurement item');
assert.equal(price({...stock('stool_citylong_370'),stoolCount:2}),undefined,'single-stool offer excludes a stack');
assert.equal(price(stock('bed_yeswood_y17b02','箱体床')),359700);
assert.equal(price(stock('bed_yeswood_y17b02','床品组合')),undefined,'bed-frame offer excludes the catalog bundle envelope');

const later=structuredClone(dossiers);
const history=later.find(d=>d.id==='side-table').productCaptures;
const observed={...history.at(-1),capturedOn:'2026-11-28',capture:{...history.at(-1).capture,priceFen:0}};
history.push(observed,{...observed,capture:{...observed.capture,variant:'另一规格 · 整套',priceFen:999}});
assert.equal(Generator.buildProductPrices(later)[table.type][0].priceFen,0,'latest exact record preserves an observed zero');
assert.equal(price(table),95600,'checking an update does not mutate the shipped price data');

const manual={...table,price:0,referencePrice:123.45};
const payload=Project.unpack(Project.pack({planId:'p',current:{furniture:[manual]},designs:[{name:'已填写单价',work:{furniture:[manual]}}],catalog:[]}));
assert.equal(payload.current.furniture[0].price,0);
assert.equal(payload.designs[0].work.furniture[0].referencePrice,123.45);
assert.equal(price(payload.current.furniture[0]),95600);
assert.equal(Project.furniturePriceBasis(manual,0),'confirmed');
assert(!Object.hasOwn(table,'price')&&!Object.hasOwn(table,'referencePrice'));
console.log('PASS generated archive provenance, exact panel/downlight/colour and sale-unit matching, legacy identities, and manual prices through project round trips');
