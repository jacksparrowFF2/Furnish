const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),K=require('../src/core/kitchen-core.js');
const context=vm.createContext({window:{},structuredClone,FurnishKitchen:K});vm.runInContext(fs.readFileSync(require.resolve('../src/ui/kitchen-editor.js'),'utf8'),context);
const original={id:'k',type:'counter',cx:0,cy:0,w:1600,d:600,rot:0,kitchen:K.defaults({w:1600,d:600})},before=JSON.stringify(original),node=v=>({value:String(v),defaultValue:String(v)});
function form(f){
 const fields=Object.fromEntries(['depth','baseHeight','thickness'].map(k=>['#kitchen-'+k,node(f.kitchen[k])]));fields['#kitchen-shape']=node('straight');fields['#kitchen-add']={};
 const rows=f.kitchen.modules.map((m,i)=>({dataset:{kitchenRow:String(i)},fields:{'[data-k-width]':node(Number(m.width.toFixed(2))),'[data-k-role]':node(m.role)},querySelector(key){return this.fields[key]||null;}}));
 return {fields,rows,querySelector:key=>fields[key]||null,querySelectorAll:key=>key==='[data-kitchen-row]'?rows:[]};
}
const root=form(original);let read=context.readKitchenFields(root,original);assert.equal(read.kitchen.modules[0].width,1600/3,'display rounding must not alter saved structure');assert.equal(read.w,1600);
root.fields['#kitchen-baseHeight'].value='900';root.rows[0].fields['[data-k-width]'].value='1000';read=context.readKitchenFields(root,original);
assert.equal(read.kitchen.baseHeight,900,'save reads a typed value before blur');assert.equal(read.kitchen.modules[0].width,1000);assert.equal(JSON.stringify(original),before,'form reading is draft-only');
const saved=K.configure(original,read.kitchen);assert.equal(saved.kitchen.baseHeight,900);assert.equal(saved.w,1000+3200/3);
root.fields['#kitchen-baseHeight'].value='';assert.throws(()=>context.readKitchenFields(root,original),/有效尺寸/);
const corners=form(original);let next,remap;context.bindKitchenForm(corners,original,(fn,map)=>{next=fn(context.readKitchenFields(corners,original));remap=map;});
corners.fields['#kitchen-shape'].value='L-right';corners.fields['#kitchen-shape'].onchange({target:corners.fields['#kitchen-shape']});
assert.equal(next.kitchen.corner,'right');assert.equal(next.kitchen.shape,'L');assert.equal(next.kitchen.modules.length,4);assert.deepEqual([...remap].map(([a,b])=>[a,b]),[ [0,0],[1,1],[2,2] ]);assert.equal(JSON.stringify(original),before);
const devices=[{id:'a',counterLink:{hostId:'k',module:1}},{id:'b',counterLink:{hostId:'k',module:2}}];context.remapKitchenLinks(devices,'k',new Map([[0,0],[2,1]]));assert.equal(devices[0].counterLink,undefined);assert.equal(devices[1].counterLink.module,1);
console.log('PASS shared kitchen form: unblurred values, precision preservation, draft isolation, right corner control and link remapping');
