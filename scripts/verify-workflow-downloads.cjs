/* Verify files actually downloaded from the synthetic UI acceptance project. */
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict');
const P=require('../src/core/project-core.js'),DXF=require('../src/io/dxf-import.js'),Plans=require('../src/data/plans.js');
const dir=process.argv[2]||path.join(os.homedir(),'Downloads'),read=name=>fs.readFileSync(path.join(dir,name),'utf8');
const payload=P.unpack(JSON.parse(read('custom_workflow_acceptance.furnish.json'))),work=payload.current;
assert.equal(work.pricing.materialSpecs.wood.unit,'pack');assert.equal(work.pricing.materialSpecs.wood.pack,4);assert.equal(work.pricing.materials.wood,500);assert.equal(work.pricing.paintPrice,undefined);
assert.equal(work.architecture.draft.walls.find(w=>w.id==='partition').a[0],450);assert.equal(work.architecture.baseline.walls.find(w=>w.id==='partition').a[0],500);P.assertStructure(work.architecture.baseline,work.architecture.draft);
const chair=work.furniture.find(f=>f.id==='outside_chair');assert.equal(chair.rot,45);assert.equal(chair.flip,true);assert.equal(chair.price,0);assert.equal(chair.purchaseStatus,'ordered');assert.equal(P.review(P.previewPlan(payload,Plans),work).length,0);
const html=read('工具与净距验收 · 装修方案.html'),match=html.match(/<script type="application\/json" id="project-data">([\s\S]*?)<\/script>/);assert(match);const embedded=P.unpack(JSON.parse(match[1]));assert.deepEqual(embedded.current,work);assert(html.includes('材料采购估算'));assert(html.includes('价格依据'));assert(!html.includes('id="gWallNet"'));assert(!html.includes('id="gProposal"'));
const csv=read('报价清单-工具与净距验收.csv');assert(csv.includes('"价格依据"'));assert(csv.includes('"25","箱","500","12500","已确认价"'));assert(csv.includes('"参考价"'));
const dxf=read('工具与净距验收-layout.dxf');assert(dxf.includes('$INSUNITS\r\n70\r\n4'));assert(dxf.includes('驗收')||dxf.includes('验收椅'));DXF.parse(dxf);
console.log('PASS actual UI downloads: net edit, original baseline, packed material prices, procurement metadata, clean report and embedded project, CSV price basis and parsed mm DXF');
