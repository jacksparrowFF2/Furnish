/* Fixed automation commands; shared by the desktop transport and live renderer. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.FurnishMcpCore=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const string={type:'string',minLength:1,maxLength:200},revision={type:'string',minLength:1,maxLength:128};
 const edit={type:'object',additionalProperties:false,required:['id'],properties:{id:string,cx:{type:'number'},cy:{type:'number'},rot:{type:'number'},w:{type:'number',exclusiveMinimum:0,maximum:20000},d:{type:'number',exclusiveMinimum:0,maximum:20000},h:{type:'number',minimum:10,maximum:20000}}};
 const schema=(properties,required=[])=>({type:'object',additionalProperties:false,properties,required});
 const write={planId:string,revision,requestId:string};
 const commonParameters={name:{type:'string',minLength:1,maxLength:80},color:{type:'string',minLength:4,maxLength:9,pattern:'^#(?:[a-fA-F0-9]{3}|[a-fA-F0-9]{4}|[a-fA-F0-9]{6}|[a-fA-F0-9]{8})$'},flip:{type:'boolean'},frontClearance:{type:'number',minimum:0,maximum:3000}};
 const point=schema({x:{type:'number',minimum:-1000000,maximum:1000000},y:{type:'number',minimum:-1000000,maximum:1000000},z:{type:'number',minimum:-100000,maximum:100000}},['x','y','z']);
 const command=(name,description,properties,required=[],writing=false)=>({name,description,inputSchema:schema(properties,required),annotations:{readOnlyHint:!writing,destructiveHint:false,...(writing?{idempotentHint:true}:{})}});
 const tools=[
  {name:'get_current_plan',description:'读取正在运行的 Furnish 桌面窗口当前方案、家具 ID／尺寸／位置、坐标单位、方案列表、保存状态和 revision；可选完整 work。',inputSchema:schema({includeDetails:{type:'boolean'}}),annotations:{readOnlyHint:true}},
  {name:'copy_design',description:'复制当前布置为新的可编辑方案并进入副本，保留原方案；沿用现有方案创建／保存链。与界面切换相同，清空跨方案撤销栈。先读取当前 revision，重试必须沿用 requestId。',inputSchema:schema({...write,name:{type:'string',minLength:1,maxLength:80}},['planId','revision','requestId','name']),annotations:{readOnlyHint:false,destructiveHint:false,idempotentHint:true}},
  {name:'update_furniture',description:'按家具 ID 批量调整中心 cx/cy、局部宽 w／深 d／机身高 h（mm）和 rot（度）。调用共享 resizeFurniture、mutate、一次撤销及原自动保存；锁定物体／旧 revision／无效整批拒绝。位置为模型坐标，不是屏幕像素，省略值保持原值。先读取 revision；重试沿用 requestId。',inputSchema:schema({...write,updates:{type:'array',minItems:1,maxItems:100,items:edit}},['planId','revision','requestId','updates']),annotations:{readOnlyHint:false,destructiveHint:false,idempotentHint:true}},
  {name:'check_space',description:'对当前桌面方案运行与工作台相同的空间核对，包括家具实体、开启空间和通道；返回问题与未知信息，不移动家具或标记已确认。',inputSchema:schema({focusIds:{type:'array',minItems:1,maxItems:100,items:string}}),annotations:{readOnlyHint:true}}
 ];
 tools.push(
  command('list_catalog','查询当前内置及我的家具库；用返回的 catalogKey 新增，不能凭 type 猜型号。',{query:{type:'string',minLength:1,maxLength:200}}),
  command('add_furniture','按 catalogKey 在精确模型中心 cx/cy（mm）新增库条目，含完整关联组合；不自动避让。返回 addedIds，一次撤销，显式保存。',{...write,catalogKey:{type:'string',minLength:1,maxLength:2000},cx:{type:'number'},cy:{type:'number'}},['planId','revision','requestId','catalogKey','cx','cy'],true),
  command('get_furniture_parameters','读取家具当前配置及产品规则允许的参数、范围和默认值；cabinet/kitchen 为完整结构替换。',{id:string},['id']),
  command('configure_furniture','批量配置产品参数（安装高度、开合、灯光、柜体等）。parameters 的键须来自 get_furniture_parameters；嵌套对象整体替换，null 删除可选覆盖恢复缺省。整批预演校验后一次撤销／保存。',{...write,updates:{type:'array',minItems:1,maxItems:100,items:schema({id:string,parameters:{type:'object',additionalProperties:true}},['id','parameters'])}},['planId','revision','requestId','updates'],true),
  command('get_camera','读取当前2D/3D模式、生产相机位置／目标（模型 x/y 与绝对离地 z，mm）、实际FOV和视口。',{}),
  command('set_camera','切换2D/3D并控制生产相机。3D支持 whole/top 预设、focusIds 家具／roomId 房间取景或 position+target（模型 x/y、离地 z，mm）；mode 为 orbit/walk，水平FOV40–90。显式FOV关闭当前模式物理校准；相机不写项目或撤销栈。',{...write,view:{type:'string',enum:['2d','3d']},mode:{type:'string',enum:['orbit','walk']},preset:{type:'string',enum:['whole','top']},position:point,target:point,focusIds:{type:'array',minItems:1,maxItems:100,items:string},roomId:string,horizontalFov:{type:'number',minimum:40,maximum:90}},['planId','revision','requestId','view'],true),
  command('take_screenshot','截取当前桌面画布或完整窗口，返回原生PNG图片及相机／revision元数据；等待生产几何与相机稳定。不会下载文件或保存项目。',{target:{type:'string',enum:['viewport','window']}},[])
 );
 function json(value,depth=0){if(depth>24)throw Error('参数嵌套过深');if(value===null||typeof value==='boolean'||typeof value==='string')return;if(typeof value==='number'&&Number.isFinite(value))return;if(value&&typeof value==='object'){for(const k of Object.keys(value)){if(['__proto__','constructor','prototype'].includes(k))throw Error('不支持的参数键');json(value[k],depth+1);}return;}throw Error('参数须为JSON值');}
 function check(value,s,label){
  if(s.enum&&!s.enum.includes(value))throw Error(label+' 选项无效');
  if(s.pattern&&(typeof value!=='string'||!new RegExp(s.pattern).test(value)))throw Error(label+' 格式无效');
  if(s.type==='object'){if(!value||typeof value!=='object'||Array.isArray(value))throw Error(label+' 必须为对象');if(s.additionalProperties===true){json(value);return;}for(const k of Object.keys(value))if(!Object.hasOwn(s.properties,k))throw Error(label+' 不支持字段 '+k);for(const k of s.required||[])if(!Object.hasOwn(value,k))throw Error(label+' 缺少 '+k);for(const k of Object.keys(value))check(value[k],s.properties[k],label+'.'+k);}
  else if(s.type==='array'){if(!Array.isArray(value)||value.length<s.minItems||value.length>s.maxItems)throw Error(label+' 数量无效');value.forEach((v,i)=>check(v,s.items,label+'['+i+']'));}
  else if(s.type==='string'){if(typeof value!=='string'||value.length<s.minLength||value.length>s.maxLength||!value.trim())throw Error(label+' 字符串无效');}
  else if(s.type==='boolean'){if(typeof value!=='boolean')throw Error(label+' 必须为布尔值');}
  else if(s.type==='number'&&(!Number.isFinite(value)||s.minimum!==undefined&&value<s.minimum||s.exclusiveMinimum!==undefined&&value<=s.exclusiveMinimum||s.maximum!==undefined&&value>s.maximum))throw Error(label+' 数值无效');
 }
 function validate(name,args){const tool=tools.find(t=>t.name===name);if(!tool)throw Error('不支持的 Furnish 工具');check(args,tool.inputSchema,name);if(name==='update_furniture'||name==='configure_furniture'){const ids=new Set();for(const item of args.updates){if(ids.has(item.id)||Object.keys(item).length===1||item.parameters&&!Object.keys(item.parameters).length)throw Error('家具 ID 重复或没有调整字段');ids.add(item.id);}}if(name==='set_camera'){if(!!args.position!==!!args.target||args.preset&&args.position||args.view==='2d'&&Object.keys(args).some(k=>['mode','preset','position','target','focusIds','roomId','horizontalFov'].includes(k)))throw Error('相机预设与显式位姿互斥，位姿须成对；2D不接受3D参数');if([args.preset,args.position,args.focusIds,args.roomId].filter(Boolean).length>1||args.mode==='walk'&&(args.preset||args.focusIds||args.roomId))throw Error('只选择一种取景方式，预设／家具／房间取景需要orbit模式');if(args.position){const p=args.position,t=args.target;if(Math.hypot(p.x-t.x,p.y-t.y,p.z-t.z)<1)throw Error('相机位置与目标不能重合');}}return args;}
 function validateCommonParameter(key,value){if(!Object.hasOwn(commonParameters,key))throw Error('不支持的通用参数');check(value,commonParameters[key],key);}
 return {tools,validate,commonParameters,validateCommonParameter,maxRequestBytes:3*1024*1024};
});
