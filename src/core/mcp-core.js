/* Fixed automation commands; shared by the desktop transport and live renderer. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.FurnishMcpCore=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const string={type:'string',minLength:1,maxLength:200},revision={type:'string',minLength:1,maxLength:128};
 const edit={type:'object',additionalProperties:false,required:['id'],properties:{id:string,cx:{type:'number'},cy:{type:'number'},rot:{type:'number'},w:{type:'number',exclusiveMinimum:0,maximum:20000},d:{type:'number',exclusiveMinimum:0,maximum:20000},h:{type:'number',minimum:10,maximum:20000}}};
 const schema=(properties,required=[])=>({type:'object',additionalProperties:false,properties,required});
 const write={planId:string,revision,requestId:string};
 const tools=[
  {name:'get_current_plan',description:'读取正在运行的 Furnish 桌面窗口当前方案、家具 ID／尺寸／位置、坐标单位、方案列表、保存状态和 revision；可选完整 work。',inputSchema:schema({includeDetails:{type:'boolean'}}),annotations:{readOnlyHint:true}},
  {name:'copy_design',description:'复制当前布置为新的可编辑方案并进入副本，保留原方案；沿用现有方案创建／保存链。与界面切换相同，清空跨方案撤销栈。先读取当前 revision，重试必须沿用 requestId。',inputSchema:schema({...write,name:{type:'string',minLength:1,maxLength:80}},['planId','revision','requestId','name']),annotations:{readOnlyHint:false,destructiveHint:false,idempotentHint:true}},
  {name:'update_furniture',description:'按家具 ID 批量调整中心 cx/cy、局部宽 w／深 d／机身高 h（mm）和 rot（度）。调用共享 resizeFurniture、mutate、一次撤销及原自动保存；锁定物体／旧 revision／无效整批拒绝。位置为模型坐标，不是屏幕像素，省略值保持原值。先读取 revision；重试沿用 requestId。',inputSchema:schema({...write,updates:{type:'array',minItems:1,maxItems:100,items:edit}},['planId','revision','requestId','updates']),annotations:{readOnlyHint:false,destructiveHint:false,idempotentHint:true}},
  {name:'check_space',description:'对当前桌面方案运行与工作台相同的空间核对，包括家具实体、开启空间和通道；返回问题与未知信息，不移动家具或标记已确认。',inputSchema:schema({focusIds:{type:'array',minItems:1,maxItems:100,items:string}}),annotations:{readOnlyHint:true}}
 ];
 function check(value,s,label){
  if(s.type==='object'){if(!value||typeof value!=='object'||Array.isArray(value))throw Error(label+' 必须为对象');for(const k of Object.keys(value))if(!Object.hasOwn(s.properties,k))throw Error(label+' 不支持字段 '+k);for(const k of s.required||[])if(!Object.hasOwn(value,k))throw Error(label+' 缺少 '+k);for(const k of Object.keys(value))check(value[k],s.properties[k],label+'.'+k);}
  else if(s.type==='array'){if(!Array.isArray(value)||value.length<s.minItems||value.length>s.maxItems)throw Error(label+' 数量无效');value.forEach((v,i)=>check(v,s.items,label+'['+i+']'));}
  else if(s.type==='string'){if(typeof value!=='string'||value.length<s.minLength||value.length>s.maxLength||!value.trim())throw Error(label+' 字符串无效');}
  else if(s.type==='boolean'){if(typeof value!=='boolean')throw Error(label+' 必须为布尔值');}
  else if(s.type==='number'&&(!Number.isFinite(value)||s.minimum!==undefined&&value<s.minimum||s.exclusiveMinimum!==undefined&&value<=s.exclusiveMinimum||s.maximum!==undefined&&value>s.maximum))throw Error(label+' 数值无效');
 }
 function validate(name,args){const tool=tools.find(t=>t.name===name);if(!tool)throw Error('不支持的 Furnish 工具');check(args,tool.inputSchema,name);if(name==='update_furniture'){const ids=new Set();for(const item of args.updates){if(ids.has(item.id)||Object.keys(item).length===1)throw Error('家具 ID 重复或没有调整字段');ids.add(item.id);}}return args;}
 return {tools,validate};
});
