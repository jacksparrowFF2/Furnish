/* Local order/receipt/payment records. No network or application state. */
(function(root){
'use strict';
const clone=v=>JSON.parse(JSON.stringify(v)),number=v=>typeof v==='number'&&Number.isFinite(v),fail=m=>{throw Error(m);},text=(v,max)=>typeof v==='string'&&v.length<=max;
const units={item:'件',m2:'m²',piece:'片',pack:'箱',lot:'项'};
const cents=v=>Math.round((v+Number.EPSILON)*100)/100;
const lineTotal=l=>cents(l.quantity*l.unitPrice),cash=v=>number(v)&&Math.abs(v-cents(v))<1e-6;
function orderTotal(o){return cents(o.lines.reduce((n,l)=>n+lineTotal(l),0)+o.shipping-o.discount);}
function validate(input){
 if(!Array.isArray(input)||input.length>200)fail('采购订单最多 200 张');const ids=new Set();let count=0;
 for(const o of input){
  if(!o||typeof o!=='object'||Array.isArray(o)||Object.keys(o).some(k=>!['id','number','date','vendor','note','shipping','discount','paid','lines'].includes(k))||!text(o.id,200)||!o.id||ids.has(o.id)||!text(o.number,80)||!text(o.vendor,120)||!text(o.note,1000)||!text(o.date,10))fail('采购订单编号或资料无效');ids.add(o.id);
  if(o.date&&(!/^\d{4}-\d{2}-\d{2}$/.test(o.date)||!Number.isFinite(Date.parse(o.date))||new Date(o.date).toISOString().slice(0,10)!==o.date))fail('订单日期无效');
  if(!Array.isArray(o.lines)||!o.lines.length||o.lines.length>200||(count+=o.lines.length)>2000)fail('每单须有 1–200 行，全部订单最多 2000 行');
  for(const l of o.lines){if(!l||Object.keys(l).some(k=>!['kind','target','name','signature','unit','quantity','received','unitPrice'].includes(k))||!['furniture','material','other'].includes(l.kind)||!text(l.target,200)||l.kind!=='other'&&!l.target||!text(l.name,120)||!l.name.trim()||!text(l.signature,100000)||!Object.hasOwn(units,l.unit)||l.kind==='furniture'&&l.unit!=='item'||l.kind==='material'&&!['m2','piece','pack'].includes(l.unit)||l.kind==='other'&&l.unit!=='lot')fail('订单关联项目或单位无效');
   if(!number(l.quantity)||l.quantity<=0||l.quantity>1e6||!number(l.received)||l.received<0||l.received>l.quantity||l.unit!=='m2'&&(!Number.isInteger(l.quantity)||!Number.isInteger(l.received))||!cash(l.unitPrice)||l.unitPrice<0||l.unitPrice>1e7)fail('订单数量、到货量或单价无效；金额保留两位小数');
  }
  if([o.shipping,o.discount,o.paid].some(v=>!cash(v)||v<0||v>1e14)||orderTotal(o)<0||o.paid>orderTotal(o)+1e-6)fail('运费、优惠或实付金额无效；金额保留两位小数，实付不能超过订单总额');
 }
 return clone(input);
}
function signature(value){const stable=v=>Array.isArray(v)?v.map(stable):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,stable(v[k])])):v;return 'v1:'+JSON.stringify(stable(value));}
function relink(line,target){
 const next=target?{kind:target.kind,target:target.target,name:target.name,signature:target.signature,unit:target.unit}:{kind:'other',target:'',name:line.name,signature:'',unit:'lot'};
 if(next.unit!==line.unit)fail('关联单位不同，请保留历史行并新增订单行，按实际订单填写新单位数量和单价');
 return {...clone(line),...next};
}
function demand(plan,work,materials,priceOf=f=>f.price??f.referencePrice??0){
 const P=root.FurnishProject||require('./project-core.js'),K=root.FurnishKitchen||require('./kitchen-core.js'),C=root.FurnishCabinet||require('./cabinet-core.js'),D=root.FurnishDesign||require('./design-core.js'),items=work.furniture.map(f=>{const light=D.products().downlightSpec(f);return ({kind:'furniture',target:f.id,name:f.name+(light?` · ${light.watts}W / ${light.kelvin}K`:''),unit:'item',quantity:1,price:priceOf(f),signature:signature({type:f.type,brand:f.brand||'',model:f.model||'',w:f.w,d:f.d,h:f.h??null,...(light?{downlight:light}:{}),cabinet:f.cabinet?(D.products().modelError(f)?f.cabinet:C.specification(f)):null,kitchen:f.kitchen?(D.products().modelError(f)?f.kitchen:K.specification(f)):null})});});
 for(const m of P.materialBreakdown(plan,work,materials,priceOf))items.push({kind:'material',target:m.m,name:materials[m.m].name,unit:m.procurement.unit,quantity:m.procurement.quantity,price:m.price,signature:signature({unit:m.procurement.unit,length:m.procurement.spec?.length??null,width:m.procurement.spec?.width??null,pack:m.procurement.spec?.pack??null})});
 return items;
}
function summary(plan,work,materials,priceOf){
 const orders=validate(work.purchaseOrders||[]),items=demand(plan,work,materials,priceOf).map(d=>({...d,ordered:0,received:0})),map=new Map(items.map(d=>[d.kind+':'+d.target,d])),warnings=[];let orderedAmount=0,paid=0;
 for(const o of orders){orderedAmount+=orderTotal(o);paid+=o.paid;for(const [lineIndex,l] of o.lines.entries()){if(l.kind==='other')continue;const d=map.get(l.kind+':'+l.target);if(!d||d.unit!==l.unit||d.signature!==l.signature){warnings.push({orderId:o.id,lineIndex,name:l.name,reason:!d?'missing':d.unit!==l.unit?'unit':'changed'});continue;}d.ordered+=l.quantity;d.received+=l.received;}}
 for(const d of items){d.remaining=Math.max(0,d.quantity-d.ordered);d.awaiting=Math.max(0,d.ordered-d.received);d.excess=Math.max(0,d.ordered-d.quantity);}
 const P=root.FurnishProject||require('./project-core.js'),budget=P.estimate(plan,work,materials,priceOf).total;
 return {orders,items,warnings,orderedAmount,paid,outstanding:Math.max(0,orderedAmount-paid),budget,balance:budget-paid,remainingEstimate:items.reduce((n,d)=>n+d.remaining*d.price,0)};
}
const api={units,lineTotal,orderTotal,validate,signature,relink,demand,summary};if(typeof module==='object'&&module.exports)module.exports=api;else root.FurnishPurchasing=api;
})(typeof globalThis!=='undefined'?globalThis:this);
