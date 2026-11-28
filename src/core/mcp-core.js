/* Fixed automation commands; shared by the desktop transport and live renderer. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.FurnishMcpCore=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const string={type:'string',minLength:1,maxLength:200},revision={type:'string',minLength:1,maxLength:128};
 const edit={type:'object',additionalProperties:false,required:['id'],properties:{id:string,cx:{type:'number'},cy:{type:'number'},rot:{type:'number'},w:{type:'number',exclusiveMinimum:0,maximum:20000},d:{type:'number',exclusiveMinimum:0,maximum:20000},h:{type:'number',minimum:10,maximum:20000}}};
 const schema=(properties,required=[])=>({type:'object',additionalProperties:false,properties,required});
 const write={planId:string,revision,requestId:string};
 const ids={type:'array',minItems:1,maxItems:100,items:string};
 const text=maxLength=>({type:'string',minLength:0,maxLength});
 const productInfo=schema({brand:text(500),model:text(500),sourceUrl:text(4000),priceDate:text(10),price:{type:['number','null'],minimum:0,maximum:1e7},purchaseStatus:{type:'string',enum:['planned','confirmed','ordered','received']},purchaseNote:text(2000)});
 const productCapture=schema({
  title:{type:'string',minLength:1,maxLength:500},shop:text(500),itemCode:text(100),variant:text(500),
  priceFen:{type:['number','null'],minimum:0,maximum:1e9},
  priceScope:{type:'string',enum:['sku','default-selection','page-display','unknown']}
 },['title','priceFen','priceScope']);
 const commonParameters={name:{type:'string',minLength:1,maxLength:80},color:{type:'string',minLength:4,maxLength:9,pattern:'^#(?:[a-fA-F0-9]{3}|[a-fA-F0-9]{4}|[a-fA-F0-9]{6}|[a-fA-F0-9]{8})$'},flip:{type:'boolean'},frontClearance:{type:'number',minimum:0,maximum:3000}};
 const point=schema({x:{type:'number',minimum:-1000000,maximum:1000000},y:{type:'number',minimum:-1000000,maximum:1000000},z:{type:'number',minimum:-100000,maximum:100000}},['x','y','z']);
 const xy=schema({x:point.properties.x,y:point.properties.y},['x','y']);
 const record={type:'object',additionalProperties:true};
 const positive=(minimum,maximum)=>({type:'number',minimum,maximum});
 const list=(items,maxItems,minItems=0)=>({type:'array',items,maxItems,minItems});
 const pick=(...values)=>({type:'string',enum:values});
 const fileName={...string,pattern:'^[^/\\\\:*?"<>|\\u0000-\\u001f]+\\.(?:dxf|json)$'};
 const layerMap=schema({name:string,role:pick('bearing','partition','exterior','window','beam','service'),thickness:positive(60,600)},['name','role']);
 const source={fileName,surveyFileName:{...fileName,pattern:'^[^/\\\\:*?"<>|\\u0000-\\u001f]+\\.json$'},options:schema({
  name:{...string,maxLength:80},mode:pick('centerline','outline'),mmPerUnit:positive(0.001,10000),layers:list(layerMap,100,1),
  closeDoorGaps:{type:'boolean'},windowSill:positive(0,20000),windowHead:positive(1,20000)
 })};
 const surfaceEdit=schema({target:record,sample:schema({asset:{type:['string','null'],minLength:1,maxLength:100},surface:{type:['string','null'],minLength:1,maxLength:100},
  color:{...commonParameters.color,type:['string','null']},sheen:{type:['string','null'],enum:['satin','gloss','matte',null]},useTile:{type:'boolean'},
  grout:{...commonParameters.color,type:['string','null']},doorFinish:{type:['object','null'],additionalProperties:true}})},['target','sample']);
 const command=(name,description,properties,required=[],writing=false)=>({name,description,inputSchema:schema(properties,required),annotations:{readOnlyHint:!writing,destructiveHint:false,...(writing?{idempotentHint:true}:{})}});
 const tools=[
  command('inspect_project_source','预检 .local/mcp-imports 内的 DXF、完整项目或原生量房草稿 JSON。可提交 DXF 图层和单位及量房证据 JSON，返回诊断、几何概要与导入核对键；预检不改变方案。',source,['fileName']),
  command('import_project_source','按同一文件、选项和预检键导入项目或新建可编辑户型。自定义户型独立导入；内置户型的布置恢复需要 replaceBuiltin。confirmStructure 可依据量房证据锁定新建原始结构。',{...write,...source,previewKey:revision,confirmStructure:{type:'boolean'},replaceBuiltin:{type:'boolean'}},['planId','revision','requestId','fileName','previewKey'],true),
  command('check_route','核对连续路径、瓶颈及障碍。给定净宽与模型绝对高度区间，可模拟门扇、产品开合及独立家具使用位置，或排除待搬设备。',{from:xy,to:xy,width:positive(50,6000),depth:positive(50,6000),bottom:positive(-2000,10000),height:positive(50,10000),
   resolution:positive(20,100),doorStates:list(schema({index:positive(0,999),state:pick('open','closed','sweep')},['index','state']),100),useFurnitureIds:ids,
   usePositions:list(schema({id:string,cx:point.properties.x,cy:point.properties.y,rot:{type:'number',minimum:-360,maximum:360}},['id','cx','cy']),30,1),removeFurnitureId:string},['from','to','width','height']),
  command('get_material_surfaces','读取正式场景可编辑表面、现有搭配、预设及样片，使用返回的 target 定位批量编辑；请先将桌面切到 3D。'),
  command('configure_material_surfaces','复用材质工作区批量应用风格和局部表面，支持样片、颜色、光泽、美缝、室内门外观及表面对应采购规格。selection 的 product:null 移除选型；一次撤销保存。',{...write,
   scheme:schema({id:string,scopes:list(pick('cabinet','curtains','furniture','frames','bays','floors'),6,1),palette:record,bodySurface:string,floorMaterials:{type:'boolean'}},['id','scopes']),
   edits:list(surfaceEdit,100,1),selections:list(schema({target:record,product:{...schema({
    name:string,sku:string,sourceUrl:{...text(4000),minLength:1},length:positive(10,20000),width:positive(10,20000),pack:positive(1,10000),waste:positive(0,100),note:text(1000)
   },['name','sku']),type:['object','null']}},['target','product']),100,1)},['planId','revision','requestId'],true),
  {name:'get_current_plan',description:'读取正在运行的 Furnish 桌面窗口当前方案、家具 ID／尺寸／位置、坐标单位、方案列表、保存状态和 revision；electricalPoints 返回与插座清单一致的动态编号、房间、完成地面标高及双控关联。可选完整 work。',inputSchema:schema({includeDetails:{type:'boolean'}}),annotations:{readOnlyHint:true}},
  {name:'copy_design',description:'复制当前布置为新的可编辑方案并进入副本，保留原方案；沿用现有方案创建／保存链。与界面切换相同，清空跨方案撤销栈。先读取当前 revision，重试必须沿用 requestId。',inputSchema:schema({...write,name:{type:'string',minLength:1,maxLength:80}},['planId','revision','requestId','name']),annotations:{readOnlyHint:false,destructiveHint:false,idempotentHint:true}},
  {name:'update_furniture',description:'按家具 ID 批量调整中心 cx/cy、局部宽 w／深 d／机身高 h（mm）和 rot（度）。调用共享 resizeFurniture、mutate、一次撤销及原自动保存；锁定物体／旧 revision／无效整批拒绝。位置为模型坐标，不是屏幕像素，省略值保持原值。先读取 revision；重试沿用 requestId。',inputSchema:schema({...write,updates:{type:'array',minItems:1,maxItems:100,items:edit}},['planId','revision','requestId','updates']),annotations:{readOnlyHint:false,destructiveHint:false,idempotentHint:true}},
  {name:'check_space',description:'对当前桌面方案运行与工作台相同的空间核对，包括家具实体、开启空间和通道；返回问题与未知信息，不移动家具或标记已确认。',inputSchema:schema({focusIds:{type:'array',minItems:1,maxItems:100,items:string}}),annotations:{readOnlyHint:true}}
 ];
 tools.push(
  command('get_presentation','读取方案讲解文字、关联对象、待确认事项、版本及采图状态；图片单独保存在方案中，默认不返回大块图像。',{}),
  command('configure_presentation','更新完整讲解内容、采集指定页的当前正式画布或记录交付版本。沿原mutate一次撤销保存；先get_presentation保留页ID。presentation.pages的capture缺省保留原图、null显式移除，不接受外部图片；不自动编造设计意图或确认结论。',{...write,presentation:{type:'object',additionalProperties:true},capturePageId:string,releaseLabel:{type:'string',minLength:1,maxLength:80}},['planId','revision','requestId'],true),
  command('get_connection_status','只读检查stdio源码与活动桌面工具清单／保存状态是否一致，以及Blender精修工程是否登记；不打开或重启窗口。',{}),
  command('get_product_dossier','读取仓库已有产品asset.json档案及资料版本；不读取任意文件或联网。',{productId:{type:'string',pattern:'^[a-z0-9][a-z0-9-]{0,99}$'}},['productId']),
  command('archive_product_reference','将已采集的来源链接、日期、备注、可选商品标题及人民币页面价、可选原图归档到已有产品档案。capture.priceFen 使用分，未知填 null。须先读取dossierRevision，重试沿用requestId。',{productId:{type:'string',pattern:'^[a-z0-9][a-z0-9-]{0,99}$'},dossierRevision:{type:'string',pattern:'^[a-f0-9]{64}$'},requestId:string,sourceUrl:text(4000),capturedOn:text(10),note:text(10000),capture:productCapture,imageBase64:{type:'string',minLength:1,maxLength:2700000},imageType:{type:'string',enum:['png','jpeg','webp']}},['productId','dossierRevision','requestId'],true),
  command('get_building','读取建筑草稿、结构阶段、墙地完成层和铺贴原始设置及派生平面；未知值不推定为厂家要求。',{}),
  command('configure_building','完整替换已有建筑 draft 或墙地完成层／铺贴，null 清除可选饰面。可替换量房证据附件并将测绘阶段原始结构锁定。先 get_building 保留身份，沿原结构保护、映射与保存。',{...write,
   draft:record,floorFinishes:{...record,type:['object','null']},wallFinishes:{...record,type:['object','null']},wallTiling:{...record,type:['object','null']},
   roomUpdates:list(schema({id:string,name:{...string,maxLength:80},use:string,mat:string,ceilingHeight:{...positive(1000,10000),type:['number','null']}},['id']),100,1),
   surveyFileName:source.surveyFileName,confirmStructure:{type:'boolean'}},['planId','revision','requestId'],true),
  command('compare_designs','只读比较当前户型两个已有可编辑方案的家具增删改、预算及采购总额；不切换或改写方案。',{designIds:{type:'array',minItems:2,maxItems:2,items:string}},['designIds']),
  command('rename_design','通过界面同一方案管理核心重命名当前户型的已有可编辑方案；不恢复历史、不修改方案内容、不可通过家具撤销。',{...write,designId:string,name:{type:'string',minLength:1,maxLength:80}},['planId','revision','requestId','designId','name'],true),
  command('history_action','对当前方案执行一次原有撤销或重做，再等待正式保存；无可用记录时拒绝。',{...write,action:{type:'string',enum:['undo','redo']}},['planId','revision','requestId','action'],true),
  command('export_artifact','导出完整项目、报价CSV、二维SVG/PNG/DXF、成果HTML、施工交底HTML或生产GLB至本机固定 .local/mcp-exports 目录。GLB须先切到3D。交底图册可限制立面、剖面和柜体范围。',{...write,format:pick('project','quote_csv','plan_svg','plan_png','plan_dxf','report_html','handoff_html','scene_glb'),includeCeilings:{type:'boolean'},roomIds:ids,cabinetIds:ids},['planId','revision','requestId','format'],true),
  command('get_cabinet_components','读取组件柜及厨房／洗衣组合中已有v2模块的稳定moduleId、boxId、componentId与实际尺寸；旧结构标记为不可编辑，不自动升级。',{id:string},['id']),
  command('configure_cabinet_components','按稳定模块／柜箱／组件身份编辑，复用柜体核心update或绝对mm位置调整；整组关联设备一并校验，一次撤销保存。',{...write,edits:{type:'array',minItems:1,maxItems:100,items:schema({id:string,moduleId:string,selection:schema({boxId:string,componentId:string,board:{type:'string',enum:['lower','upper']},segmentId:string,boundary:{type:'boolean'}},['boxId']),changes:{type:'object',additionalProperties:true},position:{type:'number'}},['id','moduleId','selection'])}},['planId','revision','requestId','edits'],true),
  command('measure_clearances','复用正式实体／高度裁剪板件读取指定家具四向距离、柜内上下净距与相关空间问题；包络内边距不作为可用空腔。',{id:string,targetIds:ids,rotation:{type:'number',minimum:-360,maximum:360}},['id']),
  command('get_product_info','读取指定家具的来源、品牌型号、价格依据及采购资料；未知值保留未知，不联网或推定厂家规格。',{ids},['ids']),
  command('configure_product_info','批量记录商品来源／品牌型号／价格日期／采购备注及确认单价。价格须由调用者明确确认；页面显示价可先记入备注。沿原采购资料核心，不改尺寸。',{...write,updates:{type:'array',minItems:1,maxItems:100,items:schema({ids,values:productInfo},['ids','values'])}},['planId','revision','requestId','updates'],true),
  command('get_procurement','读取当前预算、材料规格、家具需求、订单、到货与实付汇总及历史关联警告。',{}),
  command('configure_procurement','更新本地订单台账或完整pricing配置。orders按id新增／替换，removeOrderIds显式删除；历史快照须保留，新行从get_procurement读取signature。不会向商家下单付款。',{...write,orders:{type:'array',maxItems:200,items:{type:'object',additionalProperties:true}},removeOrderIds:{type:'array',maxItems:200,items:string},pricing:{type:'object',additionalProperties:true}},['planId','revision','requestId'],true),
  command('switch_design','按get_current_plan返回的designId切换当前户型已有可编辑方案；先保存当前布置，沿界面切换与正式保存链，清空跨方案撤销。不能切换其它户型或恢复历史。同一方案为无变化操作；重试沿用requestId。',{...write,designId:string},['planId','revision','requestId','designId'],true),
  command('list_catalog','查询当前内置及我的家具库；用返回的 catalogKey 新增，不能凭 type 猜型号。',{query:{type:'string',minLength:1,maxLength:200}}),
  command('add_furniture','按 catalogKey 在精确模型中心 cx/cy（mm）新增库条目，含完整关联组合；不自动避让。返回 addedIds，一次撤销，显式保存。',{...write,catalogKey:{type:'string',minLength:1,maxLength:2000},cx:{type:'number'},cy:{type:'number'}},['planId','revision','requestId','catalogKey','cx','cy'],true),
  command('add_furniture_batch','批量新增单件库产品，可同时设置w/d/h/rot及通用、普通产品参数。组合条目与结构动作拒绝；全部校验后一次撤销／保存，addedIds与输入顺序一致。',{...write,items:{type:'array',minItems:1,maxItems:100,items:schema({catalogKey:{type:'string',minLength:1,maxLength:2000},cx:{type:'number'},cy:{type:'number'},w:{type:'number',exclusiveMinimum:0,maximum:20000},d:{type:'number',exclusiveMinimum:0,maximum:20000},h:{type:'number',minimum:10,maximum:20000},rot:{type:'number'},parameters:{type:'object',additionalProperties:true}},['catalogKey','cx','cy'])}},['planId','revision','requestId','items'],true),
  command('get_furniture_parameters','读取家具当前配置及产品规则允许的参数、范围和默认值；cabinet/kitchen 为完整结构替换。',{id:string},['id']),
  command('configure_furniture','批量配置产品参数（安装高度、开合、灯光、柜体等）。parameters 的键须来自 get_furniture_parameters；嵌套对象整体替换，null 删除可选覆盖恢复缺省。整批预演校验后一次撤销／保存。',{...write,updates:{type:'array',minItems:1,maxItems:100,items:schema({id:string,parameters:{type:'object',additionalProperties:true}},['id','parameters'])}},['planId','revision','requestId','updates'],true),
  command('get_camera','读取当前2D/3D模式、生产相机位置／目标（模型 x/y 与绝对离地 z，mm）、实际FOV和视口。',{}),
  command('set_camera','切换2D/3D并控制生产相机。3D支持 whole/top 预设、focusIds 家具／roomId 房间取景或 position+target（模型 x/y、离地 z，mm）；mode 为 orbit/walk，水平FOV40–90。显式FOV关闭当前模式物理校准；相机不写项目或撤销栈。',{...write,view:{type:'string',enum:['2d','3d']},mode:{type:'string',enum:['orbit','walk']},preset:{type:'string',enum:['whole','top']},position:point,target:point,focusIds:{type:'array',minItems:1,maxItems:100,items:string},roomId:string,horizontalFov:{type:'number',minimum:40,maximum:90}},['planId','revision','requestId','view'],true),
  command('take_screenshot','截取当前桌面画布或完整窗口，返回原生PNG图片及相机／revision元数据；等待生产几何与相机稳定。不会下载文件或保存项目。',{target:{type:'string',enum:['viewport','window']}},[]),
  command('get_ceilings','读取当前完整吊顶区域、生产构件、完成面净高及新建截面示例。区域height为模型绝对标高mm；不得将净高直接回写height。',{}),
  command('configure_ceilings','整批新增/替换完整吊顶区域及删除指定区域。regions应从get_ceilings读取后修改；保留已有id/partIds/centerId。核心重新生成生产构件，锁定或无效整批拒绝，一次撤销和正式保存。',{...write,regions:{type:'array',minItems:0,maxItems:100,items:{type:'object',additionalProperties:true}},removeIds:{type:'array',minItems:0,maxItems:100,items:string}},['planId','revision','requestId'],true),
  command('remove_furniture','删除指定家具ID，清理其图层分配；不自动级联删除其它家具。锁定、重复或不存在的ID整批拒绝，一次原撤销和正式保存。',{...write,ids:{type:'array',minItems:1,maxItems:100,items:string}},['planId','revision','requestId','ids'],true),
  command('configure_scene','调整已有三维展示设置：夜景、主灯和低位夜灯开关、日照时间、墙体剖切及观察标注；不改变单盏灯具规格。沿原scene3d保存，一次撤销。',{...write,settings:schema({night:{type:'boolean'},lamps:{type:'boolean'},nightLights:{type:'boolean'},hour:{type:'number',minimum:7,maximum:18},cut:{type:'number',enum:[1.2,2.8]},furn:{type:'boolean'},labels:{type:'boolean'},wallNumbers:{type:'boolean'},clearances:{type:'boolean'}})},['planId','revision','requestId','settings'],true)
 );
 function json(value,depth=0){if(depth>24)throw Error('参数嵌套过深');if(value===null||typeof value==='boolean'||typeof value==='string')return;if(typeof value==='number'&&Number.isFinite(value))return;if(value&&typeof value==='object'){for(const k of Object.keys(value)){if(['__proto__','constructor','prototype'].includes(k))throw Error('不支持的参数键');json(value[k],depth+1);}return;}throw Error('参数须为JSON值');}
 function check(value,s,label){
  if(Array.isArray(s.type)){if(value===null&&s.type.includes('null'))return;return check(value,{...s,type:s.type.find(t=>t!=='null')},label);}
  if(s.enum&&!s.enum.includes(value))throw Error(label+' 选项无效');
  if(s.pattern&&(typeof value!=='string'||!new RegExp(s.pattern).test(value)))throw Error(label+' 格式无效');
  if(s.type==='object'){if(!value||typeof value!=='object'||Array.isArray(value))throw Error(label+' 必须为对象');if(s.additionalProperties===true){json(value);return;}for(const k of Object.keys(value))if(!Object.hasOwn(s.properties,k))throw Error(label+' 不支持字段 '+k);for(const k of s.required||[])if(!Object.hasOwn(value,k))throw Error(label+' 缺少 '+k);for(const k of Object.keys(value))check(value[k],s.properties[k],label+'.'+k);}
  else if(s.type==='array'){if(!Array.isArray(value)||value.length<s.minItems||value.length>s.maxItems)throw Error(label+' 数量无效');value.forEach((v,i)=>check(v,s.items,label+'['+i+']'));}
  else if(s.type==='string'){if(typeof value!=='string'||value.length<s.minLength||value.length>s.maxLength||s.minLength!==0&&!value.trim())throw Error(label+' 字符串无效');}
  else if(s.type==='boolean'){if(typeof value!=='boolean')throw Error(label+' 必须为布尔值');}
  else if(s.type==='number'&&(!Number.isFinite(value)||s.minimum!==undefined&&value<s.minimum||s.exclusiveMinimum!==undefined&&value<=s.exclusiveMinimum||s.maximum!==undefined&&value>s.maximum))throw Error(label+' 数值无效');
 }
 function validate(name,args){const tool=tools.find(t=>t.name===name);if(!tool)throw Error('不支持的 Furnish 工具');check(args,tool.inputSchema,name);if(name==='update_furniture'||name==='configure_furniture'){const ids=new Set();for(const item of args.updates){if(ids.has(item.id)||Object.keys(item).length===1||item.parameters&&!Object.keys(item.parameters).length)throw Error('家具 ID 重复或没有调整字段');ids.add(item.id);}}if(name==='set_camera'){if(!!args.position!==!!args.target||args.preset&&args.position||args.view==='2d'&&Object.keys(args).some(k=>['mode','preset','position','target','focusIds','roomId','horizontalFov'].includes(k)))throw Error('相机预设与显式位姿互斥，位姿须成对；2D不接受3D参数');if([args.preset,args.position,args.focusIds,args.roomId].filter(Boolean).length>1||args.mode==='walk'&&(args.preset||args.focusIds||args.roomId))throw Error('只选择一种取景方式，预设／家具／房间取景需要orbit模式');if(args.position){const p=args.position,t=args.target;if(Math.hypot(p.x-t.x,p.y-t.y,p.z-t.z)<1)throw Error('相机位置与目标不能重合');}}return args;}
 const validateBase=validate;
 function validateCommand(name,args){validateBase(name,args);if(name==='configure_scene'&&!Object.keys(args.settings).length)throw Error('请填写三维展示设置');if(name==='remove_furniture'&&new Set(args.ids).size!==args.ids.length)throw Error('家具 ID 重复');if(name==='configure_ceilings'){const regions=args.regions||[],removed=args.removeIds||[],ids=regions.map(r=>r.id);if(!regions.length&&!removed.length)throw Error('请提供吊顶区域或待删除ID');if(ids.some(id=>typeof id!=='string'||!id)||new Set(ids).size!==ids.length||new Set(removed).size!==removed.length||removed.some(id=>ids.includes(id)))throw Error('吊顶区域 ID 缺失、重复或同时删除');}return args;}
 const validatePrevious=validateCommand;
 function validateExtended(name,args){validatePrevious(name,args);if(name==='get_product_info'&&new Set(args.ids).size!==args.ids.length)throw Error('家具 ID 重复');if(name==='configure_product_info'){const seen=new Set();for(const u of args.updates){if(!Object.keys(u.values).length)throw Error('请填写商品资料');for(const id of u.ids){if(seen.has(id))throw Error('家具 ID 重复');seen.add(id);}const v=u.values;if(v.sourceUrl){let url;try{url=new URL(v.sourceUrl);}catch{throw Error('商品来源须为完整HTTP(S)链接');}if(!['http:','https:'].includes(url.protocol)||url.username||url.password)throw Error('商品来源须为无账号密码的HTTP(S)链接');}if(v.priceDate&&(!/^\d{4}-\d{2}-\d{2}$/.test(v.priceDate)||!Number.isFinite(Date.parse(v.priceDate))||new Date(v.priceDate).toISOString().slice(0,10)!==v.priceDate))throw Error('价格日期须为有效YYYY-MM-DD');}}if(name==='configure_procurement'){const orders=args.orders||[],removed=args.removeOrderIds||[],keys=orders.map(o=>o.id);if(!orders.length&&!removed.length&&!args.pricing)throw Error('请提供订单或pricing');if(keys.some(k=>typeof k!=='string'||!k)||new Set(keys).size!==keys.length||new Set(removed).size!==removed.length||keys.some(k=>removed.includes(k)))throw Error('订单 ID 缺失、重复或同时删除');}return args;}
 const validateInfo=validateExtended;
 function validateCapture(capture,sourceUrl,capturedOn){
  check(capture,productCapture,'capture');
  check(sourceUrl,{...text(4000),minLength:1},'sourceUrl');
  check(capturedOn,{...text(10),minLength:10},'capturedOn');
  if(!/^https?:\/\/[^\s<>\\]+$/i.test(sourceUrl))throw Error('商品来源须为完整HTTP(S)链接');
  validateReferenceSource(sourceUrl,capturedOn);
  if(capture.priceFen!==null&&!Number.isSafeInteger(capture.priceFen))throw Error('页面价格须为整数分');
  if((capture.priceFen===null)!==(capture.priceScope==='unknown'))throw Error('页面价格与价格范围不一致');
 }
 function validateReferenceSource(sourceUrl,capturedOn){
  if(sourceUrl||capturedOn)validateInfo('configure_product_info',{planId:'dossier',revision:'dossier',requestId:'dossier',updates:[{ids:['dossier'],values:{...(sourceUrl?{sourceUrl}:{}),...(capturedOn?{priceDate:capturedOn}:{})}}]});
 }
 function validateAutomation(name,args){validateInfo(name,args);if(name==='archive_product_reference'){
  if(!args.sourceUrl&&!args.note&&!args.imageBase64&&!args.capture)throw Error('请提供资料');
  if(!!args.imageBase64!==!!args.imageType)throw Error('图片内容与类型须同时提供');
  if(args.capture)validateCapture(args.capture,args.sourceUrl,args.capturedOn);
  else validateReferenceSource(args.sourceUrl,args.capturedOn);
 }if(name==='compare_designs'&&args.designIds[0]===args.designIds[1])throw Error('请选择两个不同方案');if(name==='configure_building'&&!['draft','floorFinishes','wallFinishes','wallTiling','roomUpdates','surveyFileName','confirmStructure'].some(k=>Object.hasOwn(args,k)))throw Error('请提供建筑或饰面配置');if(name==='configure_cabinet_components')for(const edit of args.edits){if((edit.changes!==undefined)===(edit.position!==undefined)||edit.changes&&!Object.keys(edit.changes).length)throw Error('每次组件编辑须选择changes或绝对mm的position之一');}return args;}
 function validateCommonParameter(key,value){if(!Object.hasOwn(commonParameters,key))throw Error('不支持的通用参数');check(value,commonParameters[key],key);}
 return {capabilityVersion:4,tools,validate:validateAutomation,validateCapture,commonParameters,validateCommonParameter,maxRequestBytes:3*1024*1024};
});
