const F=require('../../src/core/floorplan-core.js'),W=require('../../src/core/work-state.js');
function fixture({openings=false,openingHosts=false,partition=false,reverse=false}={}){
 const d={version:1,id:'custom_finish',name:'完成面验收',source:'dxf',image:'',width:450,height:350,scale:10,walls:[
  {id:'north',a:[100,100],b:[4100,100],kind:'b',thickness:200},
  {id:'east',a:[4100,100],b:[4100,3100],kind:'e',thickness:200},
  {id:'south',a:[4100,3100],b:[100,3100],kind:'n',thickness:200},
  {id:'west',a:[100,3100],b:[100,100],kind:'e',thickness:200}
 ],openings:[]};
 if(partition)d.walls.push({id:'middle',a:[2100,100],b:[2100,3100],kind:'n',thickness:100});
 if(openings||openingHosts)d.openings=[{id:'door',wall:'north',kind:'door',t:.5,length:900,side:1,entry:true},{id:'window',wall:'east',kind:'window',t:.5,length:1200,side:1,entry:false,sill:900,head:2400}];
 if(reverse)for(const w of d.walls)[w.a,w.b]=[w.b,w.a];
 for(const w of d.walls){w.a=w.a.map(v=>v/10);w.b=w.b.map(v=>v/10);}
 if(openingHosts){
  d.id='custom_finish_opening_hosts';d.name='独立门窗墙段完成面验收';
  d.walls=d.walls.flatMap(w=>{
   if(!['north','east'].includes(w.id))return [w];
   const a=w.id==='north'?[110,10]:[410,110],b=w.id==='north'?[310,10]:[410,210];
   return [{...w,id:w.id+'-start',b:a,caps:[0,0]},{...w,a,b,caps:[0,0]},{...w,id:w.id+'-end',a:b,caps:[0,0]}];
  });d.openings.find(o=>o.id==='window').length=1000;d.openings.find(o=>o.id==='door').length=2000;
 }
 const plan=F.build(d),work=W.create({makeId:()=> 'fixture',colorFor:()=> '#ddd',materials:{wood:{},tile800:{}}}).fresh(plan);
 delete work.furnitureDatum; // This fixture represents a pre-datum project.
 work.furniture=[{id:'item',type:'custom',name:'验收柜',cx:500,cy:500,w:500,d:500,h:800,rot:0,color:'#bb9977'}];
 work.measures=[{a:{x:200,y:400},b:{x:4000,y:400}}];return {draft:d,plan,work};
}
module.exports={fixture};
