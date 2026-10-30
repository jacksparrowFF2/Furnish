/* Verification inventory, not application product rules. Parameters come from production cores. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'../..'),P=require('../../src/core/product-rules.js'),C=require('../../src/data/catalog.js'),B=require('../../src/core/cabinet-core.js'),K=require('../../src/core/kitchen-core.js');
// First split catalog (a03d325): original generic types are excluded unless their
// later model-specific adaptation is explicitly listed below.
const originalTypes=new Set('bed crib nightstand wardrobe dresser desk chest chair bookshelf baycushion sofa cornersofa armchair beanbag coffeetable roundtable sidetable tvstand rug shoecab floorlamp plant dryingrack table island barstool counter stove ksink fridge cabinet toilet vanity shower bathtub washer waterheater tv aircon acwall dishwasher ovencol dryer purifier officechair piano treadmill pendant curtain wallart mirror bench'.split(' '));
const assetTypes={se2:'bath_heater_aopu_se2',y52y09:'bookshelf_yeswood_y52y09',fridge:'fridge_french_drawer',dishwasher:'dishwasher_mijia_countertop',hood:'rangehood_fotile_jcd10ta',washer:'washer','washer-tg10k60w':'washer_littleswan_tg10k60w','side-table':'sidetable_tmall_635382906309',armchair:'armchair_yeswood_y09hs','armchair-berlin':'armchair_yeswood_berlin','stack-stool':'stool_citylong_370'};
const suites={
 se2:['blender-appliance-asset','bath-heater-se2'],y52y09:['blender-bookcase-asset','bookcase-y52y09'],fridge:['blender-fridge-motion','fridge-project-v31'],dishwasher:['blender-dishwasher-asset','dishwasher-project-v32','dishwasher-clearances'],hood:['blender-hood-asset','hood-project-v33'],washer:['blender-washer-asset','washer-project-v35'],'washer-tg10k60w':['blender-washer-materials','blender-washer-tg10k60w','washer-front-confirmation','washer-project-v35'],'side-table':['side-table','side-table-project-v36'],armchair:['armchair'],'armchair-berlin':['armchair-berlin'],'stack-stool':['stack-stool'],
 block:['block'],panel_light_300x600:['panel-light'],bath_heater_300x600:['bath-heater-se2'],downlight_philips_dl269:['downlight'],heating_manifold:['manifold','manifold-zero-gap'],electrical_box_strong:['electrical-box'],electrical_box_weak:['electrical-box'],aquarium_mijia_2pro:['aquarium'],stove_fotile_th36b:['fotile'],waterheater_flat:['waterheater-flat','waterheater-furniture-clearances'],aircon_midea_ultra_2hp:['aircon-midea'],water_purifier_mijia_1200g:['water-purifier'],tea_bar_mijia_pro:['tea-bar'],robot_p20max_tank:['robot-vacuum'],robot_p20max_plumbed:['robot-vacuum'],robot_p20max:['robot-vacuum'],pipebox:['pipebox'],sofa_yeswood_cherry:['yeswood-sofa'],coffeetable_yeswood_cherry:['cherry-coffee-table'],tea_table_800:['tea-table'],bench_yeswood_oak:['shoe-bench'],shower_arrow_cream:['shower-arrow'],cat_tree:['cat-tree'],pet_feeder_mijia_2:['pet-feeder'],litter_box:['litter-box'],mirror:['mirror'],tv:['tv-view-consistency']
};
const copy=o=>JSON.parse(JSON.stringify(o));
assetTypes['corner-bookcase']='bookshelf_yeswood_y00y06';suites['corner-bookcase']=['corner-bookcase'];
suites.tripleslidingwindow=['telescopic-floor-tracks'];
function testsFor(id,type){
 const list=suites[id]||suites[type]||(type.startsWith('table_folding_')?['folding-table']:type.startsWith('sink_arrow_')?['sink','sink-plan-snapping']:P.definition(type)?.covering||type==='curtain'?['window-coverings','window-covering-mount']:type.startsWith('pocketdoor_')?['pocket-door','wide-pocket-door','pocket-identities']:P.definition(type)?.telescopic||type==='slidingdoor'?['telescopic-20','telescopic-floor-tracks']:B.supported({type})?['cabinet-model','cabinet-interior-distances']:[]);
 if(id==='block')list.splice(0,list.length,'block-placeholder');
 if(type==='curtain'&&!list.includes('curtain-height'))list.push('curtain-height');
 for(const name of list)if(!fs.existsSync(path.join(root,'tests/test-'+name+'.cjs')))throw Error('Missing model suite: '+id+'/'+name);
 return list;
}
function itemFixture(item){const f={type:item[0],name:item[1],w:item[2],d:item[3],color:item[4],...P.initial({type:item[0],w:item[2],d:item[3]})};if(item[6])f.h=item[6];if(!f.h)f.h=P.height(f);if(item[8])f.curtainStyle=item[8];return f;}
function operate(f){
 f=copy(f);const d=P.definition(f)||{};
 if(d.fridgeMotion)Object.assign(f,{fridgeLeftAngle:100,fridgeRightAngle:100,fridgeUpperExtension:1,fridgeLowerExtension:1});
 else if(d.washerMotion)f.washerDoorAngle=110;
 else if(f.type==='dishwasher_mijia_countertop')f.dishwasherDoorOpen=true;
 else if(f.type==='rangehood_fotile_jcd10ta')f.hoodPanelOpen=true;
 else if(f.type==='sidetable_tmall_635382906309')Object.assign(f,{sideTableUpperOpen:true,sideTableLowerOpen:true});
 else if(f.type==='stool_citylong_370')f.stoolCount=4;
 else if(d.family==='folding-table')return P.editFoldingTablePose(f,'capsule');
 else if(f.type==='tea_bar_mijia_pro')Object.assign(f,{teaBarUpperOpen:true,teaBarLowerOpen:true});
 else if(d.covering||f.type==='curtain')f.curtainOpen=1;
 else if(P.supports(f,'slidingOpen'))f.slidingOpen=!P.value(f,'slidingOpen');
 if(f.cabinet){for(const col of f.cabinet.columns){if(col.door!=='none'){col.doorOpen=true;col.doorAngle=90;}for(const drawer of col.drawers||[])drawer.open=true;if(col.top==='drawer')col.topOpen=true;}}
 if(f.kitchen){for(const m of f.kitchen.modules){m.doorOpen=true;for(const dr of m.drawers||[])if(typeof dr==='object')dr.open=true;}}
 if(f.kitchen){
  for(let i=0;i<f.kitchen.modules.length;i++)if(f.kitchen.modules[i].role==='drawer')for(let j=0;j<K.drawerHeights(f,f.kitchen.modules[i]).length;j++)f=K.toggle(f,i,j,true);
  if(f.kitchen.laundry?.assembly)for(const part of K.laundryParts(f))if(part.key!=='sink'&&part.furniture.cabinet)f.kitchen.laundry.assembly[part.key].cabinet=operate(part.furniture).cabinet;
 }
 return f;
}
function sourceFiles(profile){
 const runtime='src/data/'+profile+'-blender-asset.js',asset=require(path.join(root,runtime)),base=path.join(root,'assets/models',profile),files=[];
 const walk=dir=>{for(const entry of fs.readdirSync(dir,{withFileTypes:true})){const file=path.join(dir,entry.name);if(entry.isDirectory())walk(file);else if(entry.name===profile+'-v1.glb')files.push(file);}};walk(base);
 const glb=files.find(file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex')===asset.sourceSha256);
 if(!glb||!fs.existsSync(glb.replace(/\.glb$/,'.blend')))throw Error('Cannot locate published author source: '+profile);
 return {runtime,glb:path.relative(root,glb).replaceAll('\\','/'),blend:path.relative(root,glb.replace(/\.glb$/,'.blend')).replaceAll('\\','/'),parts:asset.parts.length,id:asset.id,productionIdentity:profile==='y52y09'?'cabinet-boards':'direct',prefixes:[...new Set(asset.parts.map(p=>p.identity.slice(0,p.identity.indexOf(':')+1)))]};
}
function profiles(){
 const items=C.library.flatMap(c=>c.items),byType=new Map(items.map(i=>[i[0],i])),out=[];
 for(const [id,type]of Object.entries(assetTypes)){const f=itemFixture(byType.get(type));if(id==='y52y09')Object.assign(f,B.preset('book-y52y09-low'),{type});out.push({id,type,route:'blender',fixture:f,asset:sourceFiles(id),tests:testsFor(id,type)});}
 for(const [type,item]of byType)if(!originalTypes.has(type)&&!Object.values(assetTypes).includes(type))out.push({id:type,type,route:'parametric',fixture:itemFixture(item),tests:testsFor(type,type)});
 for(const [id,type]of [['mirror','mirror'],['curtain-single','curtain'],['curtain-double','curtain'],['tv-75','tv'],['tv-85','tv'],['tv-100','tv']]){
  const item=items.find(i=>i[0]===type&&(type==='tv'?i[1].startsWith(id.slice(3)):type==='curtain'?i[8]===id.slice(8):true));
  out.push({id,type,route:'parametric',fixture:itemFixture(item),tests:testsFor(id,type),origin:'later adaptation of original type'});
 }
 // Explicit templates carry their real board layout; the original generic
 // furniture entry is not substituted for the user's later custom cabinetry.
 for(const [template]of B.templates){if(template==='book-y52y09-low')continue;const f=B.preset(template),type=template.startsWith('wardrobe')?'wardrobe':template.startsWith('tv')?'tvstand':template==='shoe'?'shoecab':template==='book'?'bookshelf':template==='chest'?'chest':template==='wall'?'kitchenwall':'cabinet';
  out.push({id:'cabinet--'+template,type,route:'parametric',fixture:{...f,type},tests:['cabinet-model','cabinet-interior-distances',...(template==='entry-pegboard'?['entry-pegboard']:template==='entry-console'?['entry-console']:template==='tv-floor'?['tv-floor']:[])]});
 }
 for(const side of ['left','right']){
  const f=K.configure({type:'counter',name:'洗衣柜',color:'#f3f1ec'},K.laundryPreset());out.push({id:'laundry--'+side,type:'counter',route:'parametric',fixture:{...f,flip:side==='left'},tests:['laundry-cabinet','laundry-area']});
  let n=0;const full=K.createLaundryCabinet({id:'model-pilot',type:'counter',cx:0,cy:0,rot:0,color:'#f3f1ec'},()=> 'laundry-member-'+(++n),side);out.push({id:'laundry-area--'+side,type:'counter',route:'parametric',fixture:full[0],companions:full.slice(1),tests:['laundry-cabinet','laundry-area']});
 }
 const kitchen=K.configure({type:'counter',name:'高低柜组合',w:1800,d:600,color:'#f3f1ec'}, {...K.defaults({w:1800,d:600}),modules:[{run:0,width:600,role:'tall',height:2200},{run:0,width:600,role:'door'},{run:0,width:600,role:'drawer'}]});
 out.push({id:'kitchen--tall',type:'counter',route:'parametric',fixture:kitchen,tests:['kitchen-tall','kitchen']});
 for(const shape of ['L','U']){const modules=[{run:0,width:900,role:'hob'},{run:0,width:600,role:'drawer'},{run:1,width:700,role:'door'},{run:1,width:500,role:'door'},...(shape==='U'?[{run:2,width:900,role:'sink'}]:[])],f=K.configure({id:'model-pilot',name:shape+'形厨房',type:'counter',cx:0,cy:0,rot:0,color:'#f3f1ec'},{version:1,shape,depth:600,counterDepth:630,baseHeight:820,thickness:20,modules});out.push({id:'kitchen--'+shape,type:'counter',route:'parametric',fixture:f,tests:['kitchen-u','kitchen-resize','kitchen-corner-fit']});}
 const vessel=items.find(i=>i[10]==='vessel-sink');out.push({id:'sink--vessel',type:'ksink',route:'parametric',fixture:{...itemFixture(vessel),...K.catalogSpec(vessel)},tests:['sink','sink-surface','laundry-resize-vessel']});
 for(const p of out){p.fixture={id:'model-pilot',cx:0,cy:0,rot:0,flip:false,...p.fixture};if(!p.fixture.h)p.fixture.h=P.height(p.fixture);p.fixture=copy(p.fixture);if(P.definition(p.fixture)?.ceilingPanel||p.type==='downlight_philips_dl269')p.detailView='underside';p.resizePolicy=p.type==='tv'?'coupled-screen':'independent';p.alternate=operate(p.fixture);p.alternateKind=p.id==='stack-stool'?'nested-stack':JSON.stringify(p.fixture)!==JSON.stringify(p.alternate)?'operating':'back';for(const name of p.tests)if(!fs.existsSync(path.join(root,'tests/test-'+name+'.cjs')))throw Error('Missing suite '+name);}
 return out;
}
module.exports={profiles,sourceFiles,operate,originalTypes,assetTypes};
