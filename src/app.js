/* ======================= 多语言（中文 / English，默认中文） ======================= */
const LANG_KEY = 'huxing-lang';
const LANGS = ['zh', 'zht', 'en'];             // 简体 / 繁體（台湾用字）/ English
let LANG = (() => { try { const l = localStorage.getItem(LANG_KEY); return LANGS.includes(l) ? l : 'zh'; } catch(e) { return 'zh'; } })();
// 简 → 繁：先按词替换一字多义的字，再逐字查表（表由 OpenCC s2tw 按本页用到的字生成）
const S2T_PHRASES = [['布置','佈置'],['布局','佈局'],['台面','檯面'],['复制','複製']];
const S2T = new Map(('与與两兩个個为為书書于於仅僅从從价價会會传傳体體余餘侧側倾傾储儲儿兒关關内內写寫净淨准準击擊则則刚剛删刪制製办辦动動势勢区區单單占佔卧臥卫衛厅廳历歷压壓厨廚双雙发發变變叶葉后後吗嗎听聽启啟哑啞围圍图圖圆圓场場坐座块塊垫墊墙牆处處备備复復头頭妆妝婴嬰实實宽寬对對导導层層屉屜属屬岛島带帶干乾并並库庫应應开開当當径徑态態总總悬懸懒懶户戶护護拟擬择擇挂掛挡擋挤擠损損换換据據摆擺摇搖撑撐数數无無时時显顯暂暫机機杂雜杆桿条條来來松鬆构構柜櫃标標栈棧栏欄样樣梁樑棱稜椭橢横橫橱櫥气氣没沒注註浅淺测測浏瀏游遊滚滾满滿灯燈灵靈点點热熱状狀独獨环環现現电電画畫监監盖蓋盘盤砖磚确確离離积積称稱竖豎筑築签籤类類约約级級线線结結绕繞绘繪给給统統继繼绿綠缀綴编編缝縫缩縮网網联聯脚腳获獲虚虛装裝见見视視览覽触觸计計认認让讓议議记記设設识識译譯该該语語请請读讀调調负負败敗质質贴貼赶趕转轉轮輪软軟轴軸轻輕载載较較辅輔辑輯边邊过過这這进進远遠适適选選邻鄰里裡针針钢鋼钮鈕铰鉸铺鋪销銷锁鎖键鍵镜鏡长長门門闭閉闲閒间間阅閱阳陽阴陰阶階随隨隐隱静靜页頁顶頂项項顺順颜顏飘飄飞飛马馬鸟鳥齐齊龙龍东東义義优優伪偽册冊减減凑湊创創别別参參叠疊响響壳殼宁寧将將尽盡帘簾帧幀异異弃棄弹彈强強归歸录錄报報断斷旧舊档檔检檢湾灣码碼础礎笔筆简簡紧緊红紅纵縱组組细細绑綁续續缓緩缘緣艺藝节節范範补補观觀规規词詞试試话話误誤说說贯貫资資迁遷运運还還连連链鏈错錯队隊预預题題饰飾皱皺胶膠执執欧歐纸紙荐薦觉覺证證风風验驗筛篩阵陣肤膚兰蘭号號').match(/../gu).map(p => [...p]));
const s2t = s => S2T_PHRASES.reduce((a, [f, t]) => a.replaceAll(f, t), s).replace(/[\u3400-\u9fff]/g, c => S2T.get(c) || c);
const tr = (zh, en) => LANG === 'en' ? en : LANG === 'zht' ? s2t(zh) : zh;
// 内置的房间 / 材料 / 家具名称存的是中文；英文界面下显示译名，用户自己改过的名称原样显示
const NAMES_EN = {
  '三室两厅两卫':'3BR · 2LR · 2BA', '两室两厅一卫 · 96㎡':'2BR · 2LR · 1BA · 96m²', '一室一厅 · 54㎡':'1BR · 1LR · 54m²',
  '横厅三居两卫 · 128㎡':'Wide-living 3BR · 2BA · 128m²', '两室一厅 · 59㎡':'2BR · 1LR · 59m²',
  '三室两厅一卫 · 95㎡':'3BR · 2LR · 1BA · 95m²', '四室两厅两卫 · 129㎡':'4BR · 2LR · 2BA · 129m²', '开间一居 · 42㎡':'Studio · 42m²',
  '次卧二':'Second Bedroom Ⅱ', '客卧一体':'Studio Living', '生活阳台':'Utility Balcony',
  '灯饰 · 布艺':'Lighting & Textile', '吊灯':'Pendant Lamp', '餐厅吊灯':'Dining Pendant', '窗帘 2.4m':'Curtains 2.4m', '窗帘 3m':'Curtains 3m',
  '装饰画 横':'Wall Art', '装饰画 小':'Small Wall Art', '穿衣镜':'Mirror', '换鞋凳':'Bench', '晾衣架':'Drying Rack', '六斗柜':'Chest of Drawers',
  '主卧室':'Master Bedroom', '次卧室':'Second Bedroom', '次卧':'Second Bedroom', '主卫浴':'Master Bath', '小孩房':"Kids' Room", '客卫浴':'Guest Bath', '洗衣阳台':'Laundry Balcony',
  '衣帽间':'Walk-in Closet', '书房':'Study',
  '子女房':"Children's Room", '厨房':'Kitchen', '餐厅':'Dining', '过道':'Hallway', '客厅':'Living Room', '休闲阳台':'Leisure Balcony',
  '主卧飘窗':'Master Bay Window', '子女房飘窗':"Children's Bay Window",
  '橡木地板':'Oak Flooring', '胡桃木地板':'Walnut Flooring', '800 地砖':'800 Tile', '600 地砖':'600 Tile', '大理石':'Marble',
  '300 防滑砖':'300 Anti-slip Tile', '水磨石':'Terrazzo', '满铺地毯':'Wall-to-wall Carpet',
  '卧室':'Bedroom', '餐厨':'Dining & Kitchen', '卫浴':'Bathroom', '家电':'Appliances', '书房 · 休闲':'Study & Leisure',
  '双人床 1.8m':'Double Bed 1.8m', '双人床 1.5m':'Double Bed 1.5m', '双人床':'Double Bed', '单人床':'Single Bed', '婴儿床':'Crib',
  '床头柜':'Nightstand', '衣柜':'Wardrobe', '小衣柜':'Small Wardrobe', '梳妆台':'Dresser', '书桌':'Desk', '椅子':'Chair',
  '书架':'Bookshelf', '飘窗垫':'Bay Cushion', '三人沙发':'3-Seat Sofa', '双人沙发':'Loveseat', '转角沙发':'Corner Sofa',
  '单人沙发':'Armchair', '懒人沙发':'Beanbag', '茶几':'Coffee Table', '边几':'Side Table', '电视柜':'TV Stand', '地毯':'Rug',
  '鞋柜':'Shoe Cabinet', '玄关柜':'Entry Cabinet', '落地灯':'Floor Lamp', '绿植':'Plant', '大绿植':'Large Plant',
  '餐桌':'Dining Table', '六人餐桌':'6-Seat Dining Table', '圆桌':'Round Table', '餐椅':'Dining Chair', '岛台':'Kitchen Island',
  '吧椅':'Bar Stool', '橱柜台面':'Kitchen Counter', '燃气灶':'Gas Stove', '水槽':'Sink', '冰箱':'Fridge', '餐边柜':'Sideboard',
  '马桶':'Toilet', '浴室柜':'Vanity', '双盆浴室柜':'Double Vanity', '淋浴房':'Shower', '淋浴区':'Shower Area', '浴缸':'Bathtub',
  '洗衣机':'Washer', '洗衣池':'Laundry Sink', '电热水器':'Water Heater', '储物柜':'Storage Cabinet', '65 寸电视':'65" TV',
  '55 寸电视':'55" TV', '对开门冰箱':'French-door Fridge', '柜机空调':'Floor AC', '挂机空调':'Wall AC', '洗碗机':'Dishwasher',
  '蒸烤箱高柜':'Oven Tower', '烘干机':'Dryer', '空气净化器':'Air Purifier', '长书桌':'Long Desk', '办公椅':'Office Chair',
  '大书架':'Large Bookshelf', '双人床 2.0m':'Double Bed 2.0m', '衣柜 2.4m':'Wardrobe 2.4m', '圆茶几':'Round Coffee Table', '大岛台':'Large Island',
  '我的家具':'My Items', '客餐厅':'Living & Dining', '老人房':'Senior Room', '次卫':'Second Bath', '起居室':'Living Space',
  '两室两厅两卫 · 91㎡':'2BR · 2LR · 2BA · 91m²', '三室一厅一卫 · 80㎡':'3BR · 1LR · 1BA · 80m²', '四室两厅三卫 · 141㎡':'4BR · 2LR · 3BA · 141m²', '小开间 · 35㎡':'Micro Studio · 35m²',
  '小孩房门':"Kids' Room Door", '老人房门':'Senior Room Door', '次卫门':'Second Bath Door', '卫浴门':'Bathroom Door', '家具':'Item', '书房门':'Study Door', '衣帽间门':'Closet Door', '立式钢琴':'Upright Piano', '跑步机':'Treadmill', '阅读椅':'Reading Chair', '茶桌':'Tea Table', '休闲椅':'Lounge Chair',
};
const nm = s => LANG === 'en' ? (NAMES_EN[s] ?? s) : LANG === 'zht' ? s2t(s) : s;
// 静态文案：元素上写 data-en / data-en-title，中文原文首次切换时存进 dataset
function applyStaticLang(){
  document.documentElement.lang = {zh:'zh-CN', zht:'zh-TW', en:'en'}[LANG];
  document.title = tr('户型装修设计', 'Floor Plan Designer');
  document.querySelectorAll('[data-en]').forEach(el => { el.dataset.zh ??= el.textContent; el.textContent = tr(el.dataset.zh, el.dataset.en); });
  document.querySelectorAll('[data-en-title]').forEach(el => { el.dataset.zhTitle ??= el.title; el.title = tr(el.dataset.zhTitle, el.dataset.enTitle); });
  document.querySelectorAll('[data-en-placeholder]').forEach(el => { el.dataset.zhPh ??= el.placeholder; el.placeholder = tr(el.dataset.zhPh, el.dataset.enPlaceholder); });
  document.querySelectorAll('#langSel [data-lang]').forEach(b => { const on = b.dataset.lang === LANG; b.classList.toggle('on', on); b.setAttribute('aria-pressed', on); });
}

const PLANS = FurnishPlans;
let WALLS, WINS, DOORS, SLIDES, ROOMS, BOUNDS, PLAN;
function applyPlanData(){
  ({walls:WALLS, wins:WINS, doors:DOORS, slides:SLIDES, rooms:ROOMS, bounds:BOUNDS} = PLAN);
  DOORS.forEach(d => d._base ??= {h:[...d.h], c:[...d.c], o:[...d.o]});   // 切换户型时保留原始方向，不能把当前覆盖值当成原值
  WINS.forEach(w => { w._sill0 ??= w.sill; w._head0 ??= w.head??2.4; });ROOMS.filter(r=>r.counted===false).forEach(r=>r._height0??=r.height??.45);
}
// 门窗调整存于 state.open（可撤销/随方案保存），套用到 PLAN 数据的运行时副本上
function applyOpeningOverrides(){
  if (!state) return;                                                  // renderAll 前必然已初始化
  DOORS.forEach(d => { if (d._base) Object.assign(d, {h:[...d._base.h], c:[...d._base.c], o:[...d._base.o]}); });
  WINS.forEach(w => { if (w._sill0 !== undefined) {w.sill = w._sill0;w.head=w._head0;} });
  ROOMS.filter(r=>r.counted===false&&r._height0!==undefined).forEach(r=>r.height=r._height0);
  const o = state.open;
  if (!o) return;
  Object.entries(o.d || {}).forEach(([i, v]) => { const d = DOORS[+i]; if (d) Object.assign(d, JSON.parse(JSON.stringify(v))); });
  Object.entries(o.w || {}).forEach(([i, v]) => { const w = WINS[+i]; if (w) {if(typeof v==='number')w.sill=v;else if(v&&Number.isFinite(v.sill)&&Number.isFinite(v.head)){w.sill=v.sill;w.head=v.head;}if(w.bayGroup){const room=ROOMS.find(r=>r.id===w.bayGroup);if(room)room.height=w.sill;}} });
}
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
  {cat:'卧室', items:[
    ['bed','双人床 2.0m',2000,2200,'#c9d6df',4600],['bed','双人床 1.8m',1800,2000,'#c9d6df',3800],['bed','双人床 1.5m',1500,2000,'#d8c7dc',3000],
    ['bed','单人床',1200,2000,'#e8d5b5',1800],['crib','婴儿床',1250,700,'#efe3d0',1200],['nightstand','床头柜',450,400,'#e8dccb',600],
    ['wardrobe','衣柜',2000,600,'#efe6d8',4500],['wardrobe','衣柜 2.4m',2400,600,'#efe6d8',5400],['wardrobe','小衣柜',1200,550,'#efe6d8',2200],
    ['dresser','梳妆台',1000,450,'#efe6d8',1500],['desk','书桌',1200,600,'#e2cfb4',1200],['chest','六斗柜',1200,500,'#e8dccb',1800],
    ['chair','椅子',450,480,'#cfc6b8',400],['bookshelf','书架',800,300,'#e2cfb4',900],['baycushion','飘窗垫',520,1800,'#e7dccd',600]]},
  {cat:'客厅', items:[
    ['sofa','三人沙发',2400,900,'#b7c4b0',5200],['sofa','双人沙发',1700,880,'#c3cbd6',3600],['cornersofa','转角沙发',2800,1700,'#b7c4b0',7800],
    ['armchair','单人沙发',850,850,'#d6b99a',1800],['beanbag','懒人沙发',800,800,'#e0b98f',600],['coffeetable','茶几',1300,650,'#e8dccb',1500],
    ['roundtable','圆茶几',800,800,'#e2cfb4',1200],['sidetable','边几',500,500,'#d9c3a3',500],['tvstand','电视柜',2400,400,'#e2cfb4',2200],
    ['rug','地毯',2400,1700,'#d9cbb8',900],['shoecab','鞋柜',1000,350,'#efe6d8',1600],['shoecab','玄关柜',1400,380,'#e6dccc',2600],
    ['floorlamp','落地灯',450,450,'#3d3a34',600],['plant','绿植',500,500,'#a9c39b',200],['plant','大绿植',700,700,'#9dbb8c',450],
    ['dryingrack','晾衣架',1400,550,'#cfd6d9',500]]},
  {cat:'餐厨', items:[
    ['table','餐桌',1400,800,'#e2cfb4',2400],['table','六人餐桌',1800,900,'#d8c2a2',3600],['roundtable','圆桌',1000,1000,'#e2cfb4',2200],
    ['chair','餐椅',450,480,'#cfc6b8',450],['island','岛台',1800,900,'#e9e5de',6800],['island','大岛台',2400,1000,'#e9e5de',9800],
    ['barstool','吧椅',420,420,'#6b5d4c',500],['counter','橱柜台面',1600,600,'#e9e5de',6400],['stove','燃气灶',750,450,'#dcdcdc',2500],
    ['ksink','水槽',800,450,'#e1e6ea',1500],['fridge','冰箱',700,700,'#dfe4e8',4000],['cabinet','餐边柜',1600,400,'#efe6d8',3200]]},
  {cat:'卫浴', items:[
    ['toilet','马桶',400,700,'#ffffff',2200],['vanity','浴室柜',800,500,'#eef1f3',2400],['vanity','双盆浴室柜',1200,500,'#eef1f3',4200],
    ['shower','淋浴房',900,900,'#e4edf2',3500],['bathtub','浴缸',1600,750,'#eef3f6',4800],['washer','洗衣机',600,600,'#e6ebee',2800],
    ['waterheater','电热水器',800,450,'#f4f4f2',1800],['cabinet','储物柜',1000,400,'#efe6d8',1500]]},
  {cat:'家电', items:[
    ['tv','65 寸电视',1450,80,'#1d1d1f',4500],['tv','55 寸电视',1230,80,'#1d1d1f',3000],['fridge','对开门冰箱',910,700,'#c9ced3',7000],
    ['aircon','柜机空调',500,380,'#f6f7f8',6500],['acwall','挂机空调',900,250,'#f6f7f8',3200],['dishwasher','洗碗机',600,600,'#c9ced3',4500],
    ['ovencol','蒸烤箱高柜',600,600,'#efe6d8',9000],['dryer','烘干机',600,600,'#e6ebee',3800],['purifier','空气净化器',400,300,'#f4f4f2',2000]]},
  {cat:'书房 · 休闲', items:[
    ['desk','长书桌',1600,700,'#d8c2a2',2200],['officechair','办公椅',620,620,'#4a4f55',1500],['bookshelf','大书架',1600,350,'#e2cfb4',2400],
    ['piano','立式钢琴',1500,600,'#1f1d1b',18000],['treadmill','跑步机',800,1800,'#3a3a3c',3500],['armchair','阅读椅',750,800,'#c9a98a',1600]]},
  {cat:'灯饰 · 布艺', items:[
    ['pendant','吊灯',700,700,'#e8dfc8',900],['pendant','餐厅吊灯',900,900,'#d9cdb2',1200],
    ['curtain','窗帘 2.4m',2400,180,'#c9d3da',1500],['curtain','窗帘 3m',3000,180,'#b9c4cc',1900],
    ['wallart','装饰画 横',1500,60,'#8a7a5e',800],['wallart','装饰画 小',900,60,'#a08a66',400],
    ['mirror','穿衣镜',500,60,'#dfe6ea',500],['bench','换鞋凳',800,350,'#d9c9a8',600]]},
];
// 自定义家具保存在本机（store.custom），在家具库中显示为「我的家具」分类；条目多带 [6]=高度 mm、[7]=自定义 id
const CUSTOM_CAT = '我的家具';
const libAll = () => store.custom?.length
  ? [...LIB, {cat:CUSTOM_CAT, items:store.custom.map(c => [c.shape === 'round' ? 'customround' : 'custom', c.name, c.w, c.d, c.color, c.price, c.h, c.id])}]
  : LIB;
const typeColor = t => { for (const c of LIB) for (const i of c.items) if (i[0]===t) return i[4]; return '#d9d2c5'; };
const TYPE_PRICE = {};
LIB.forEach(c => c.items.forEach(i => TYPE_PRICE[i[0]] ??= i[5]));
const libItem = f => { if(['custom','customround'].includes(f.type)){const c=FurnishDesign.catalogSource(f,store.custom||[]);return c?[c.shape==='round'?'customround':'custom',c.name,c.w,c.d,c.color,c.price,c.h,c.id]:null;} for (const c of libAll()) for (const i of c.items) if (i[0] === f.type && i[1] === f.name) return i; return null; };
// 单价：家具上手动填写的优先，其次是同名库存条目，最后按类型估算
const priceOf = f => f.price ?? f.referencePrice ?? libItem(f)?.[5] ?? TYPE_PRICE[f.type] ?? 0;

let _n = 1;
const uid = () => 'f' + Date.now().toString(36) + (_n++);
// 文字标注配色：[底色, 字色]
const NOTE_COLORS = {accent:['#ef5a24','#fff'], teal:['#0e8f83','#fff'], ink:['#2a2622','#fff'], paper:['#fffaf0','#2a2622']};
const F = (type,name,cx,cy,w,d,rot=0,color) => ({id:uid(),type,name,cx,cy,w,d,rot,color:color||typeColor(type)});

/* ======================= 存储 v2：每个户型独立工作槽 + 多命名方案 ======================= */
function freshWork(p){
  const rooms = {}; p.rooms.forEach(r => rooms[r.id] = {name:r.name, mat:r.mat,use:FurnishDesign.inferUse(r)});
  return {furniture:p.defaults.map(f => F(f.t, f.n, f.x, f.y, f.w, f.d, f.r || 0, f.c)), rooms, demolished:[], measures:[], notes:[], open:{}, ...(p.customDraft ? {architecture:{draft:p.customDraft,phase:'survey'}} : {})};
}
function fixWork(s, p){
  if (s.architecture) {
    const plan = FurnishDraft.build(s.architecture.draft);
    if (plan.id !== p.id) throw new Error('Custom plan identity mismatch');
    s.architecture = FurnishProject.architecture({...s.architecture,draft:plan.customDraft}); p = plan;
  }
  const d = freshWork(p);
  s.rooms = Object.assign(d.rooms, s.rooms || {});
  p.rooms.forEach(r=>{const v=s.rooms[r.id];s.rooms[r.id]={name:typeof v?.name==='string'?v.name.slice(0,80):r.name,mat:MATS[v?.mat]?v.mat:r.mat,use:FurnishDesign.inferUse(r,v)};});
  s.demolished = s.demolished || []; s.measures = s.measures || []; s.open = s.open || {};
  s.notes = FurnishDesign.restoreNotes((Array.isArray(s.notes)?s.notes:[]).filter(n=>n&&typeof n.text==='string'&&n.text.trim()&&[n.x,n.y].every(v=>typeof v==='number'&&Number.isFinite(v)||typeof v==='string'&&v.trim()&&Number.isFinite(Number(v)))).slice(0,2000).map(n=>({...n,text:n.text.slice(0,120)})),uid);
  s.furniture = sanitizeFurn(s.furniture, p);
  s.scene3d = FurnishDesign.sceneSettings(s.scene3d);
  return s;
}
// 修复缺字段的旧数据，但保留有效坐标；范围外家具由用户主动移回。
function sanitizeFurn(list, p){
  return FurnishDesign.restoreFurniture(list,{makeId:uid,colorFor:typeColor});
}
const STORE = 'huxing-design-v2';
function loadStore(){
  try { const s = JSON.parse(localStorage.getItem(STORE)); if (s && s.v === 2) return s; } catch(e) {}
  const st = {v:2, planId:PLANS[0].id, work:{}, designs:[]};
  try {   // 迁移旧版（v1）数据到第一套户型
    const old = JSON.parse(localStorage.getItem('huxing-design-v1'));
    if (old && Array.isArray(old.furniture)) st.work[PLANS[0].id] = fixWork(old, PLANS[0]);
  } catch(e) {}
  return st;
}
let store = loadStore();
// Validate and rebuild user plans; never trust serialized rendering geometry.
store.customPlans = (Array.isArray(store.customPlans) ? store.customPlans : []).filter(d => {
  try { const draft = store.work[d.id]?.architecture?.draft || d; const p = FurnishDraft.build(draft); if (p.id !== d.id || PLANS.some(q => q.id === p.id)) return false; PLANS.push(p); return true; }
  catch(e) { console.warn('Skipped invalid custom plan', e.message); return false; }
});
let customArchDraft = null, customArchPlanId = '';
function syncCustomArchitecture(){
  if (!state.architecture) return;
  if (state.architecture.draft === customArchDraft && PLAN.id === customArchPlanId) return;
  const p = FurnishDraft.build(state.architecture.draft);
  if (p.id !== PLAN.id) throw new Error('Custom plan identity mismatch');
  Object.assign(PLAN, p); applyPlanData();
  state.rooms = Object.fromEntries(p.rooms.map(r => [r.id, state.rooms[r.id] || {name:r.name, mat:r.mat}]));
  customArchDraft = state.architecture.draft; customArchPlanId = PLAN.id;
  renderOpenings(); renderDims(); window.View3D?.replan();
}
function registerCustomWork(work){
  if (!work.architecture) return;
  const p = FurnishDraft.build(work.architecture.draft);
  if (work.plan && work.plan !== p.id) throw new Error('Custom plan identity mismatch');
  work.architecture = FurnishProject.architecture({...work.architecture,draft:p.customDraft}); work.plan = p.id;
  if (!PLANS.some(q => q.id === p.id)) {
    PLANS.push(p); store.customPlans.push(p.customDraft);
  }
}

/* ======================= 主题（2D 画布调色板；外壳颜色见 CSS 变量） ======================= */
const PAL_LIGHT = {
  paper:'#f5f2ea', grid1:'#e6dfd2', grid2:'#d6ccba',
  wallB:'#26241f', wallE:'#8f897d', wallN:'#a7a195', wallLow:'#e9e3d8', wallLowLine:'#8f897d',
  sill:'#e2dacb', sillLine:'#b9b0a0', winFill:'#f7fbfd', winLine:'#4f7394',
  ink:'#3d3a34', text:'#4a443c', dim:'#7d7160', label:'#2b2824', labelSub:'#7d7366', halo:'#fbf9f4',
  demFill:'rgba(198,91,58,.12)', leaf:'#fff',
};
const PAL_DARK = {
  paper:'#121110', grid1:'#1f1c18', grid2:'#2b2722',
  wallB:'#e8e0d0', wallE:'#59534a', wallN:'#6d665b', wallLow:'#3d382f', wallLowLine:'#8f897d',
  sill:'#3d382f', sillLine:'#7a7264', winFill:'#2a3138', winLine:'#5b7d96',
  ink:'#cfc6b6', text:'#d8d0c0', dim:'#9b9183', label:'#efe8dc', labelSub:'#9b9183', halo:'#121110',
  demFill:'rgba(198,91,58,.2)', leaf:'#3a352d',
};
let PAL = PAL_LIGHT;

const PX_MM = 25.4 / 96;                       // 1 CSS px = 0.2646 mm
const COARSE = matchMedia('(pointer:coarse)').matches;   // iPad / 手机等触屏为主的设备
const TAP = COARSE ? 9 : 4;                    // 手指按下后移动超过该像素才算拖动
const narrow = () => matchMedia('(max-width:1100px)').matches;
const $ = s => document.querySelector(s);
const ico = (n, cls = '') => `<svg class="i ${cls}" aria-hidden="true"><use href="#i-${n}"/></svg>`;
const svg = $('#plan');


/* ======================= 状态 / 历史 / 存储 ======================= */
PLAN = PLANS.find(p => p.id === store.planId) || PLANS[0];
applyPlanData();
let state = store.work[PLAN.id] || (store.work[PLAN.id] = freshWork(PLAN));
state.open = state.open || {};   // 旧版本存档补默认字段
const ui = {tool:'select', sel:null, mA:null, mCur:null, guides:null, marq:null, ptr:null, tab:'overview',
  layers:{dims:true, labels:true, furn:true, notes:true, grid:false, bearing:false, wallSnap:true, guides:true, clear:true, collide:true}, grid:10};
// 图层与编辑辅助设置跨会话记住
const UI_KEY = 'huxing-ui';
try { const u = JSON.parse(localStorage.getItem(UI_KEY)) || {};
  Object.keys(ui.layers).forEach(k => { if (typeof u.layers?.[k] === 'boolean') ui.layers[k] = u.layers[k]; });
  if ([1, 10, 50, 100].includes(u.grid)) ui.grid = u.grid;
  if (['overview', 'list', 'quote'].includes(u.tab)) ui.tab = u.tab;
} catch(e) {}
const saveUI = () => { try { localStorage.setItem(UI_KEY, JSON.stringify({layers:ui.layers, grid:ui.grid, tab:ui.tab})); } catch(e) {} };
let view = {x0:0, y0:0, s:.06};
const undoStack = [], redoStack = [];

// 自动保存：存储空间不足时先清掉历史快照再试；仍失败则明确提示（以前静默失败，刷新后布置会「消失」）
let saveErr = false, savedAt = store.updatedAt||0, storageWiping = false, savePending=false;
function save(){
  if(storageWiping)return;
  store.updatedAt=Math.max(Date.now(),(store.updatedAt||0)+1);
  store.work[PLAN.id] = state;
  const json = JSON.stringify(store);
  try { localStorage.setItem(STORE, json); saveErr = false; }
  catch(e){
    try { localStorage.removeItem('huxing-history'); localStorage.setItem(STORE, json); saveErr = false; }
    catch(e2){ saveErr = true; }
  }
  const version=store.updatedAt,cached=!saveErr;savePending=!cached;
  window.FurnishStorage.write(store).then(()=>{if(store.updatedAt===version){saveErr=false;savePending=false;syncSaved();}}).catch(()=>{if(store.updatedAt===version){saveErr=!cached;savePending=false;syncSaved();if(saveErr)toast(tr('自动保存失败，请立即导出项目文件备份。','Autosave failed; export a project file now.'));}});
  savedAt = Date.now(); syncSaved();
}
function syncSaved(){
  const el = $('#saved'); if (!el || !savedAt) return;
  el.title=state.architecture?.phase==='survey'?tr('已保存录入数据，原始结构尚未确认锁定。','Survey saved; original structure is not confirmed.'):tr('已保存当前方案；原始基线由结构确认单独保护。','Design saved; original baseline is separately protected.');
  if(savePending)el.title=tr('正在写入本地项目存储。','Writing the local project save.');else if(saveErr)el.title=tr('自动保存未完成，请导出项目文件备份。','Autosave failed; export a project backup.');
  el.classList.toggle('err', saveErr&&!savePending);
  el.innerHTML = savePending ? tr('正在保存…','Saving…') : saveErr ? ico('warn') + tr('未保存', 'Not saved')
    : ico('check') + tr('已自动保存 ', 'Saved ') + new Date(savedAt).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'});
}
const snap = () => JSON.stringify(state);
function commit(before){ undoStack.push(before); if (undoStack.length > 150) undoStack.shift(); redoStack.length = 0; save(); snapshot(false,JSON.parse(before),'编辑前'); }
function mutate(fn){ const b = snap(); fn(); commit(b); renderAll(); }
function undo(){ if (!undoStack.length) return toast(tr('没有可撤销的操作', 'Nothing to undo')); redoStack.push(snap()); state = JSON.parse(undoStack.pop()); syncCutClipboard();validateSel(); save(); renderAll(); }
function redo(){ if (!redoStack.length) return; undoStack.push(snap()); state = JSON.parse(redoStack.pop()); syncCutClipboard();validateSel(); save(); renderAll(); }
function validateSel(){ if (ui.sel?.kind==='furn' && !getF(ui.sel.id)) ui.sel = null; }
const getF = id => state.furniture.find(f => f.id === id);

/* ======================= 几何工具 ======================= */
const area = poly => Math.abs(poly.reduce((a,p,i) => { const q = poly[(i+1)%poly.length]; return a + p[0]*q[1] - q[0]*p[1]; }, 0)) / 2 / 1e6;
const perim = poly => poly.reduce((a,p,i) => { const q = poly[(i+1)%poly.length]; return a + Math.hypot(q[0]-p[0], q[1]-p[1]); }, 0) / 1000;
const bbox = poly => { const xs = poly.map(p=>p[0]), ys = poly.map(p=>p[1]); return [Math.min(...xs),Math.min(...ys),Math.max(...xs),Math.max(...ys)]; };
function aabb(f){ const a = f.rot*Math.PI/180, c = Math.abs(Math.cos(a)), s = Math.abs(Math.sin(a)); return {hw:f.w/2*c + f.d/2*s, hh:f.w/2*s + f.d/2*c}; }
const fmt = (n, d=2) => n.toFixed(d);
const norm = a => ((Math.round(a) % 360) + 360) % 360;
const snapRects = () => WALLS.filter((w,i) => !state.demolished.includes('w'+i)).map(w => w.slice(0,4)).concat(WINS.map(w => w.rect));

/* ======================= 家具几何：房间归属 / 旋转矩形碰撞 ======================= */
const inPoly = (x, y, poly) => { let c = false;
  for (let i = 0, j = poly.length-1; i < poly.length; j = i++){ const [xi,yi] = poly[i], [xj,yj] = poly[j];
    if ((yi > y) !== (yj > y) && x < (xj-xi)*(y-yi)/(yj-yi) + xi) c = !c; }
  return c; };
const roomAt = (x, y) => ROOMS.find(r => inPoly(x, y, r.poly)) || null;
const wallBox = () => { const xs = WALLS.flatMap(w => [w[0], w[2]]), ys = WALLS.flatMap(w => [w[1], w[3]]); return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)]; };
// 家具中心落在外墙外包盒之外 = 在户型外（通常看不到，清单里标出并可一键移回）
const isOutside = f => { const [x0,y0,x1,y1] = wallBox(); return f.cx < x0 || f.cx > x1 || f.cy < y0 || f.cy > y1; };
function corners(f){
  const a = f.rot*Math.PI/180, c = Math.cos(a), s = Math.sin(a), hw = f.w/2, hd = f.d/2;
  return [[-hw,-hd],[hw,-hd],[hw,hd],[-hw,hd]].map(([x,y]) => [f.cx + x*c - y*s, f.cy + x*s + y*c]);
}
// 分离轴定理判断两个旋转矩形是否重叠；重叠不足 5mm（刚好贴边）不算
function obbOverlap(a, b){
  const A = corners(a), B = corners(b);
  for (const P of [A, B]) for (let i = 0; i < 2; i++){
    const nx = P[i+1][1] - P[i][1], ny = P[i][0] - P[i+1][0], L = Math.hypot(nx, ny) || 1;
    const pa = A.map(p => (p[0]*nx + p[1]*ny)/L), pb = B.map(p => (p[0]*nx + p[1]*ny)/L);
    if (Math.max(...pa) <= Math.min(...pb) + 5 || Math.max(...pb) <= Math.min(...pa) + 5) return false;
  }
  return true;
}
// 不参与碰撞检查：地毯、墙挂 / 吊装、台面上的设备、绿植（枝叶可伸到家具上方）；椅子推进桌下也属正常
const NOCOLLIDE = new Set(['rug','pendant','acwall','wallart','curtain','mirror','tv','stove','ksink','dishwasher','plant']);
const SEATS = new Set(['chair','barstool','officechair','armchair']), TABLES = new Set(['table','roundtable','desk','island']);
function collisions(){
  const L = state.furniture.filter(f => !NOCOLLIDE.has(f.type)), out = [];
  const box = L.map(aabb);
  for (let i = 0; i < L.length; i++) for (let j = i+1; j < L.length; j++){
    const a = L[i], b = L[j];
    if (Math.abs(a.cx-b.cx) >= box[i].hw+box[j].hw || Math.abs(a.cy-b.cy) >= box[i].hh+box[j].hh) continue;   // 外包盒快速排除
    if ((SEATS.has(a.type) && TABLES.has(b.type)) || (SEATS.has(b.type) && TABLES.has(a.type))) continue;
    if (obbOverlap(a, b)) out.push([a.id, b.id]);
  }
  return out;
}
const groupBox = items => { let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  items.forEach(f => { const {hw, hh} = aabb(f); x0 = Math.min(x0, f.cx-hw); y0 = Math.min(y0, f.cy-hh); x1 = Math.max(x1, f.cx+hw); y1 = Math.max(y1, f.cy+hh); });
  return [x0, y0, x1, y1]; };

/* ======================= 颜色 / 材质图案 ======================= */
function hex2rgb(h){ h = h.replace('#',''); if (h.length===3) h = h.split('').map(c=>c+c).join(''); const n = parseInt(h,16); return [(n>>16)&255,(n>>8)&255,n&255]; }
function shade(h,k){ const f = v => Math.max(0,Math.min(255,Math.round(k>1 ? v+(255-v)*(k-1)*2 : v*k))); return '#'+hex2rgb(h).map(v=>f(v).toString(16).padStart(2,'0')).join(''); }

function buildDefs(){
  const plank = (id,base,line) => `<pattern id="m-${id}" patternUnits="userSpaceOnUse" width="1800" height="360">
      <rect width="1800" height="360" fill="${base}"/>
      <path d="M0 0H1800M0 180H1800M1200 0V180M600 180V360" stroke="${line}" stroke-width="10"/>
      <path d="M100 70Q500 60 900 85T1700 75M200 260Q700 250 1100 275T1750 262" stroke="${line}" stroke-width="5" fill="none" opacity=".45"/></pattern>`;
  const tile = (id,size,base,line) => `<pattern id="m-${id}" patternUnits="userSpaceOnUse" width="${size}" height="${size}">
      <rect width="${size}" height="${size}" fill="${base}"/><path d="M0 0H${size}M0 0V${size}" stroke="${line}" stroke-width="10"/></pattern>`;
  $('#defs').innerHTML =
    plank('wood','#dcc09a','#bf9d70') + plank('walnut','#a57c56','#80593a') +
    tile('tile800',800,'#ece7de','#d3cabb') + tile('tile600',600,'#e2e6e3','#c4cbc6') + tile('antislip',300,'#d6dbd7','#b3bab4') +
    `<pattern id="m-marble" patternUnits="userSpaceOnUse" width="1200" height="1200">
      <rect width="1200" height="1200" fill="#f3f0ea"/><path d="M0 0H1200M0 0V1200" stroke="#dcd5c8" stroke-width="10"/>
      <path d="M-50 300C250 260 380 520 700 470S1100 640 1260 600M200 1200C300 950 520 980 640 820" stroke="#d6cfc2" stroke-width="12" fill="none"/></pattern>
    <pattern id="m-terrazzo" patternUnits="userSpaceOnUse" width="500" height="500">
      <rect width="500" height="500" fill="#e8e1d5"/>
      <circle cx="60" cy="80" r="22" fill="#b9a58c"/><circle cx="310" cy="140" r="16" fill="#8fa3a0"/><circle cx="190" cy="330" r="26" fill="#c9b7a2"/>
      <circle cx="420" cy="400" r="18" fill="#a88f76"/><circle cx="90" cy="440" r="12" fill="#8fa3a0"/><circle cx="440" cy="40" r="10" fill="#b9a58c"/></pattern>
    <pattern id="m-carpet" patternUnits="userSpaceOnUse" width="120" height="120">
      <rect width="120" height="120" fill="#c9c3d3"/><circle cx="30" cy="30" r="8" fill="#bab3c6"/><circle cx="90" cy="90" r="8" fill="#bab3c6"/></pattern>
    <pattern id="clash" patternUnits="userSpaceOnUse" width="120" height="120" patternTransform="rotate(45)">
      <rect width="120" height="120" fill="rgba(214,69,50,.12)"/><path d="M0 0V120" stroke="#d64532" stroke-width="28" opacity=".55"/></pattern>
    <pattern id="grid" patternUnits="userSpaceOnUse" width="1000" height="1000">
      <path d="M500 0V1000M0 500H1000" stroke="${PAL.grid1}" stroke-width="8"/><path d="M0 0V1000M0 0H1000" stroke="${PAL.grid2}" stroke-width="14"/></pattern>`;
}

/* ======================= 家具图例 ======================= */
const ST = () => `stroke="${PAL.ink}" stroke-width="1" vector-effect="non-scaling-stroke"`;
const rc = (x,y,w,h,f,ex='') => `<rect x="${x}" y="${y}" width="${Math.max(0,w)}" height="${Math.max(0,h)}" fill="${f}" ${ST()} ${ex}/>`;
const ec = (cx,cy,rx,ry,f,ex='') => `<ellipse cx="${cx}" cy="${cy}" rx="${Math.max(0,rx)}" ry="${Math.max(0,ry)}" fill="${f}" ${ST()} ${ex}/>`;
const ln = (x1,y1,x2,y2,ex='') => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" ${ST()} ${ex}/>`;
const pa = (d,f='none',ex='') => `<path d="${d}" fill="${f}" ${ST()} ${ex}/>`;
const DASH = 'stroke-dasharray="4 3"';

function furnSVG(t,w,d,c){
  const x = -w/2, y = -d/2, m = Math.min(w,d);
  switch (t){
    case 'bed': {
      let s = rc(x,y,w,d,'#fbf8f2','rx="30"') + rc(x,y,w,Math.min(90,d*.05),shade(c,.62),'rx="20"');
      const ph = Math.min(360,d*.18), py = y+150;
      if (w >= 1300){ const pw = (w-240)/2; s += rc(x+80,py,pw,ph,'#fff','rx="70"') + rc(x+160+pw,py,pw,ph,'#fff','rx="70"'); }
      else s += rc(x+80,py,w-160,ph,'#fff','rx="70"');
      const by = py+ph+110, bh = y+d-15-by;
      s += rc(x+15,by,w-30,bh,c,'rx="40"') + pa(`M${x+15} ${by+300}H${x+w-15}`,'none',DASH);
      s += pa(`M${x+w-15-Math.min(420,w*.3)} ${by}L${x+w-15} ${by}L${x+w-15} ${by+Math.min(420,w*.3)}Z`, shade(c,1.12));
      return s;
    }
    case 'sofa': case 'armchair': {
      const b = d*.24, a = Math.min(200,w*.13), n = t==='armchair' ? 1 : (w>2200 ? 3 : 2), cw = (w-2*a)/n, dk = shade(c,.85);
      let s = rc(x,y,w,d,dk,'rx="60"');
      for (let i=0;i<n;i++) s += rc(x+a+i*cw,y+b,cw,d-b-40,c,'rx="40"');
      return s + rc(x,y,w,b,dk,'rx="50"') + rc(x,y,a,d,dk,'rx="50"') + rc(x+w-a,y,a,d,dk,'rx="50"');
    }
    case 'cornersofa': {
      const k = Math.min(950,d*.56,w*.4), b = 220, dk = shade(c,.85);
      let s = pa(`M${x} ${y}H${x+w}V${y+k}H${x+k}V${y+d}H${x}Z`, dk);
      const cw = (w-b-200)/2;
      s += rc(x+b,y+b,cw,k-b-30,c,'rx="40"') + rc(x+b+cw,y+b,cw,k-b-30,c,'rx="40"') + rc(x+b,y+k,k-b-30,d-k-200,c,'rx="40"');
      return s + rc(x,y,w,b,dk,'rx="50"') + rc(x,y,b,d,dk,'rx="50"') + rc(x+w-200,y,200,k,dk,'rx="50"') + rc(x,y+d-200,k,200,dk,'rx="50"');
    }
    case 'nightstand': return rc(x,y,w,d,c,'rx="30"') + `<circle r="${m*.24}" fill="#fff6dd" ${ST}/>` + `<circle r="${m*.08}" fill="${shade(c,.8)}" ${ST}/>`;
    case 'wardrobe': {
      let s = rc(x,y,w,d,c) + ln(x+50,0,x+w-50,0);
      for (let hx = x+160; hx < x+w-100; hx += 180) s += ln(hx-45,-d*.28,hx+45,d*.28,'opacity=".6"');
      return s;
    }
    case 'cabinet': case 'shoecab': return rc(x,y,w,d,c) + ln(x,y+d,x+w,y);
    case 'dresser': return rc(x,y,w,d,c,'rx="20"') + rc(x+w*.2,y,w*.6,55,'#dfe9ee') + ec(0,d/2+180,160,140,shade(c,.9));
    case 'desk': return rc(x,y,w,d,c,'rx="20"') + rc(-w*.18,y+50,w*.36,45,'#555') + rc(-w*.14,y+d*.45,w*.28,d*.28,'#f4f4f4','rx="10"');
    case 'chair': return rc(x+25,y+d*.16,w-50,d*.84-10,c,'rx="60"') + rc(x,y,w,d*.2,shade(c,.78),'rx="40"');
    case 'bookshelf': { let s = rc(x,y,w,d,c); for (let bx = x+400; bx < x+w-50; bx += 400) s += ln(bx,y,bx,y+d); return s; }
    case 'baycushion': return rc(x,y,w,d,c,'rx="60"') + rc(x+60,y+80,w-120,Math.min(300,d*.2),'#fff','rx="60"') + rc(x+60,y+d-80-Math.min(300,d*.2),w-120,Math.min(300,d*.2),'#fff','rx="60"');
    case 'coffeetable': return rc(x,y,w,d,c,'rx="80"') + rc(x+60,y+60,w-120,d-120,shade(c,1.06),'rx="50"');
    case 'tvstand': return rc(x,y,w,d,c) + rc(x+w*.15,y+30,w*.7,55,'#3a3a3a');
    case 'rug': return rc(x,y,w,d,c,'rx="40" fill-opacity=".6"') + rc(x+90,y+90,w-180,d-180,'none','rx="30" stroke-dasharray="3 3" opacity=".6"');
    case 'plant': {
      let s = `<circle r="${m/2}" fill="${c}" fill-opacity=".85" ${ST}/>`;
      for (let k=0;k<8;k++) s += `<ellipse cx="0" cy="${-m*.27}" rx="${m*.1}" ry="${m*.21}" transform="rotate(${k*45})" fill="${shade(c,.8)}" ${ST}/>`;
      return s + `<circle r="${m*.1}" fill="#8a6a4a" ${ST}/>`;
    }
    case 'table': return rc(x,y,w,d,c,'rx="30"') + rc(x+50,y+50,w-100,d-100,'none','rx="20" opacity=".4"');
    case 'roundtable': return ec(0,0,w/2,d/2,c) + ec(0,0,w/2-50,d/2-50,'none','opacity=".4"');
    case 'counter': return rc(x,y,w,d,c) + ln(x,y+d-40,x+w,y+d-40,DASH);
    case 'stove': {
      let s = rc(x,y,w,d,'#2f2f2f','rx="20"'); const r = m*.26;
      const pts = w/d > 1.4 ? [[-w/4,0],[w/4,0]] : [[-w/4,-d/4],[w/4,-d/4],[-w/4,d/4],[w/4,d/4]];
      pts.forEach(([px,py]) => s += `<circle cx="${px}" cy="${py}" r="${r}" fill="none" stroke="#bbb" stroke-width="1" vector-effect="non-scaling-stroke"/><circle cx="${px}" cy="${py}" r="${r*.45}" fill="#666"/>`);
      return s;
    }
    case 'ksink': return rc(x,y,w,d,c,'rx="20"') + rc(x+w*.06,y+d*.18,w*.42,d*.66,'#fff','rx="50"') + rc(x+w*.52,y+d*.18,w*.42,d*.66,'#fff','rx="50"') + `<circle cx="0" cy="${y+d*.09}" r="22" fill="#999"/>`;
    case 'fridge': return rc(x,y,w,d,c,'rx="30"') + ln(x,y+d*.14,x+w,y+d*.14) + ln(0,y+d*.14,0,y+d) + rc(-70,y+d*.5,40,d*.25,'#aab') + rc(30,y+d*.5,40,d*.25,'#aab');
    case 'toilet': return rc(x+w*.04,y,w*.92,d*.27,c,'rx="30"') + ec(0,y+d*.27+d*.36,w*.47,d*.36,c) + ec(0,y+d*.27+d*.4,w*.3,d*.24,'#eef4f7');
    case 'vanity': return rc(x,y,w,d,c,'rx="20"') + ec(0,y+d*.57,Math.min(w*.32,260),d*.28,'#fff') + `<circle cx="0" cy="${y+d*.17}" r="26" fill="#999"/>`;
    case 'shower': return rc(x,y,w,d,c) + ln(x,y,x+w,y+d,DASH) + ln(x+w,y,x,y+d,DASH) + `<circle r="45" fill="#fff" ${ST}/>`;
    case 'bathtub': return rc(x,y,w,d,c,'rx="40"') + rc(x+80,y+80,w-160,d-160,'#fff',`rx="${m*.33}"`) + `<circle cx="${x+w-260}" cy="0" r="35" fill="#ccc" ${ST}/>`;
    case 'washer': case 'dryer': return rc(x,y,w,d,c,'rx="30"') + rc(x,y,w,d*.14,shade(c,.9)) + `<circle cy="${d*.06}" r="${m*.34}" fill="#fff" ${ST}/><circle cy="${d*.06}" r="${m*.24}" fill="${t==='dryer'?'#e9dccb':'#cfdde4'}" ${ST}/>`;
    case 'crib': {
      let s = rc(x,y,w,d,c,'rx="20"') + rc(x+45,y+45,w-90,d-90,'#fff','rx="20"');
      for (let sx = x+90; sx < x+w-60; sx += 90) s += ln(sx,y,sx,y+45,'opacity=".5"') + ln(sx,y+d-45,sx,y+d,'opacity=".5"');
      return s;
    }
    case 'beanbag': return ec(0,0,w/2,d/2,c) + ec(-w*.04,-d*.06,w*.3,d*.28,shade(c,1.12),'opacity=".9"');
    case 'sidetable': return ec(0,0,w/2,d/2,c) + ec(0,0,w*.12,d*.12,'none','opacity=".5"');
    case 'floorlamp': return `<circle r="${m*.5}" fill="#fff6dd" fill-opacity=".85" ${ST}/>` + `<circle r="${m*.32}" fill="none" ${ST} ${DASH}/>` + `<circle r="${m*.07}" fill="${c}" ${ST}/>`;
    case 'island': return rc(x,y,w,d,c) + ln(x,y+d-250,x+w,y+d-250,DASH);
    case 'barstool': return `<circle r="${m/2}" fill="${c}" ${ST}/><circle r="${m*.3}" fill="${shade(c,1.15)}" ${ST}/>`;
    case 'waterheater': return rc(x,y,w,d,c,`rx="${d/2}" ${DASH}`) + ln(x+w*.2,0,x+w*.8,0,DASH);
    case 'tv': return rc(x,y,w,d,c,'rx="10"') + rc(x+w*.3,y+d,w*.4,Math.min(40,d),'#666');
    case 'aircon': return rc(x,y,w,d,c,'rx="30"') + ln(x+40,y+d*.72,x+w-40,y+d*.72) + ln(x+40,y+d*.86,x+w-40,y+d*.86);
    case 'acwall': {
      let s = rc(x,y,w,d,c,`rx="30" ${DASH}`);
      [.25,.5,.75].forEach(k => s += ln(x+w*k,y+d,x+w*k,y+d+200,`${DASH} opacity=".6"`));
      return s;
    }
    case 'dishwasher': return rc(x,y,w,d,c,'rx="15"') + ln(x,y+d-70,x+w,y+d-70) + rc(x+w*.3,y+d-45,w*.4,25,'#888');
    case 'ovencol': return rc(x,y,w,d,c) + ln(x,y,x+w,y+d) + ln(x+w,y,x,y+d);
    case 'purifier': return rc(x,y,w,d,c,'rx="60"') + rc(x+45,y+45,w-90,d-90,'none',`rx="40" ${DASH}`);
    case 'officechair': {
      let s = '';
      for (let k = 0; k < 5; k++) s += `<line x1="0" y1="0" x2="0" y2="${m*.48}" transform="rotate(${k*72+36})" stroke="#555" stroke-width="2" vector-effect="non-scaling-stroke"/>`;
      return s + rc(x+w*.12,y+d*.22,w*.76,d*.66,c,'rx="80"') + rc(x+w*.15,y+d*.04,w*.7,d*.16,shade(c,.78),'rx="40"')
        + rc(x+w*.02,y+d*.3,w*.1,d*.45,shade(c,.7),'rx="30"') + rc(x+w*.88,y+d*.3,w*.1,d*.45,shade(c,.7),'rx="30"');
    }
    case 'piano': {
      let s = rc(x,y,w,d*.55,c,'rx="10"') + rc(x+40,y+d*.55,w-80,d*.4,shade(c,1.4),'rx="10"');
      const kx = x+90, kw = w-180, kd = d*.2;
      s += rc(kx,y+d*.55,kw,kd,'#faf8f3');
      for (let i = 1; i < 26; i++) s += ln(kx+kw*i/26,y+d*.55,kx+kw*i/26,y+d*.55+kd,'opacity=".5"');
      return s;
    }
    case 'treadmill': return rc(x,y,w,d,c,'rx="50"') + rc(x+90,y+320,w-180,d-400,'#1c1c1e','rx="25"') + rc(x,y,w,230,shade(c,1.4),'rx="40"');
    case 'pendant': return `<circle r="${m*.44}" fill="none" ${ST()} stroke-dasharray="5 4"/>` + ec(0,0,m*.3,m*.3,c) + ec(0,0,m*.17,m*.17,shade(c,1.15));
    case 'curtain': {
      const folds = Math.max(4, Math.round(w/300));
      let s = `<line x1="${x}" y1="${y}" x2="${x+w}" y2="${y}" stroke="#6b5d4c" stroke-width="7" vector-effect="non-scaling-stroke"/>` + rc(x,y,w,d,c,'rx="8"');
      for (let i = 0; i < folds; i++) s += `<path d="M${x+w*(i+.5)/folds} ${y+8}V${y+d}" stroke="${shade(c,.82)}" stroke-width="9" vector-effect="non-scaling-stroke"/>`;
      return s;
    }
    case 'wallart': return rc(x,y,w,d,c) + `<rect x="${x+w*.1}" y="${y+d*.22}" width="${w*.8}" height="${d*.56}" fill="none" ${ST()} stroke-dasharray="7 4"/>`;
    case 'mirror': return rc(x,y,w,d,c,'rx="14"')
      + `<line x1="${x+w*.28}" y1="${y+d*.15}" x2="${x+w*.68}" y2="${y+d*.85}" stroke="#fff" stroke-width="9" opacity=".7" vector-effect="non-scaling-stroke"/>`
      + `<line x1="${x+w*.44}" y1="${y+d*.1}" x2="${x+w*.78}" y2="${y+d*.58}" stroke="#fff" stroke-width="5" opacity=".5" vector-effect="non-scaling-stroke"/>`;
    case 'dryingrack': {
      let s = ln(x,y,x+w,y);
      for (let i = 0; i < 6; i++) s += ln(x+w*(i+.35)/6, y, x+w*(i+.35)/6, y+d*.9);
      return s + pa(`M${x+w*.05} ${y+d}L${x+w*.2} ${y}M${x+w*.95} ${y+d}L${x+w*.8} ${y}`,'none');
    }
    case 'bench': return rc(x,y+d*.2,w,d*.8,c,'rx="22"') + ln(x+w*.15,y+d*.2,x+w*.1,y+d) + ln(x+w*.85,y+d*.2,x+w*.9,y+d);
    case 'chest': {
      let s = rc(x,y,w,d,c) + ln(x,y+d*.33,x+w,y+d*.33) + ln(x,y+d*.66,x+w,y+d*.66);
      [.17,.5,.83].forEach(k => s += `<circle cx="0" cy="${y+d*k}" r="${Math.min(26,d*.06)}" fill="${shade(c,.8)}" ${ST()}/>`);
      return s;
    }
    case 'custom': return rc(x,y,w,d,c,'rx="16"') + rc(x+40,y+40,Math.max(0,w-80),Math.max(0,d-80),'none','rx="10" opacity=".35"');
    case 'customround': return ec(0,0,w/2,d/2,c) + ec(0,0,w*.35,d*.35,'none','opacity=".35"');
    default: return rc(x,y,w,d,c);
  }
}

/* ======================= 渲染 ======================= */
const NOLABEL = ['plant','floorlamp','sidetable','barstool','beanbag'];
function renderRooms(){
  let s = '';
  ROOMS.forEach(r => s += `<polygon class="room" data-room="${r.id}" points="${r.poly.map(p=>p.join(',')).join(' ')}" fill="url(#m-${state.rooms[r.id].mat})"/>`);
  const sill = ([a,b,c,d], extra='') => `<rect x="${a}" y="${b}" width="${c-a}" height="${d-b}" fill="${PAL.sill}" stroke="${PAL.sillLine}" stroke-width="1" vector-effect="non-scaling-stroke" ${extra}/>`;
  DOORS.forEach((d,i) => s += sill(d.rect, `class="sill pick" data-door="${i}"`));
  SLIDES.forEach((d,i) => s += sill(d.rect, `class="sill pick" data-slide="${i}"`));
  $('#gRooms').innerHTML = s;
}

// 绘制顺序与数组顺序无关的层级：地毯永远在最下，吊灯在最上（半透明）——避免复制出的地毯盖住其他家具
const ZCLS = t => t === 'rug' ? 0 : t === 'pendant' ? 2 : 1;
const drawOrder = () => state.furniture.map((f, i) => [f, i]).sort((a, b) => ZCLS(a[0].type) - ZCLS(b[0].type) || a[1] - b[1]).map(p => p[0]);
const furnT = f => `translate(${f.cx} ${f.cy}) rotate(${f.rot})`;
let clashIds = new Set();
function renderFurn(){
  const g = $('#gFurn');
  g.setAttribute('display', ui.layers.furn ? 'inline' : 'none');
  clashIds = new Set(collisions().flat());
  g.innerHTML = drawOrder().map(f => {
    const fs = Math.max(80, Math.min(170, Math.min(f.w,f.d)*.2));
    const label = Math.min(f.w,f.d) >= 380 && !NOLABEL.includes(f.type)
      ? `<text transform="rotate(${-f.rot})" font-size="${fs}" text-anchor="middle" dominant-baseline="central" fill="${PAL.text}" opacity=".8" pointer-events="none">${esc(nm(f.name))}</text>` : '';
    const body = furnSVG(f.type,f.w,f.d,f.color), flip = f.flip ? `<g transform="scale(-1 1)">${body}</g>` : body;
    const clash = ui.layers.collide && clashIds.has(f.id)
      ? `<rect data-edit-overlay="clash" x="${-f.w/2}" y="${-f.d/2}" width="${f.w}" height="${f.d}" fill="url(#clash)" stroke="#d64532" stroke-width="1.5" vector-effect="non-scaling-stroke" pointer-events="none"/>` : '';
    // 锁定标记：固定 150mm 的小锁，随家具一起摆放但保持正向
    const lock = f.locked ? `<g data-edit-overlay="lock" transform="translate(${f.w/2-110} ${-f.d/2+110}) rotate(${-f.rot})" pointer-events="none"><circle r="95" fill="${PAL.halo}" stroke="${PAL.ink}" stroke-width="1" vector-effect="non-scaling-stroke"/>
      <rect x="-45" y="-12" width="90" height="62" rx="12" fill="${PAL.ink}"/><path d="M-28 -12v-18a28 28 0 0 1 56 0v18" fill="none" stroke="${PAL.ink}" stroke-width="16"/></g>` : '';
    return `<g class="furn${f.locked ? ' locked' : ''}" data-fid="${f.id}" transform="${furnT(f)}"${f.type === 'pendant' ? ' opacity=".6"' : ''}>${flip}${clash}${label}${lock}</g>`;
  }).join('');
  syncFurnBadge(); syncEmpty();
}
// 一件家具都没有时，画布中央给出下一步建议
function syncEmpty(){
  const el = $('#emptyHint'), show = !state.furniture.length && ui.layers.furn && !state.architecture;
  if (el.hidden === !show) return;
  el.hidden = !show;
  if (show) el.innerHTML = `<div class="eh-ico">${ico('box')}</div><b>${tr('画布还是空的', 'This plan is empty')}</b>
    <p>${tr('从左侧家具库点击或拖入家具，或者一键恢复本户型的推荐布置。', 'Click or drag furniture from the library, or restore the recommended layout for this plan.')}</p>
    <div class="actions"><button class="btn primary" data-act="defaults">${ico('reset')}${tr('恢复推荐布置', 'Restore layout')}</button>
    <button class="btn" data-act="cmd">${ico('search')}${tr('搜索家具', 'Search furniture')}</button></div>`;
}
// 家具图层被关掉时给出醒目提示，避免误以为家具「消失」
function syncFurnBadge(){ const b = $('#furnHidden'); if (b) b.hidden = ui.layers.furn; }

function renderWalls(){
  $('#gWalls').innerHTML = WALLS.map((w,i) => {
    const [x0,y0,x1,y1,k] = w, id = 'w'+i, dem = state.demolished.includes(id);
    let fill = k==='b' ? (ui.layers.bearing ? '#c8553c' : PAL.wallB) : k==='low' ? PAL.wallLow : k==='e' ? PAL.wallE : PAL.wallN;
    let ex = k==='low' ? `stroke="${PAL.wallLowLine}" stroke-width="1" vector-effect="non-scaling-stroke"` : ['b','e'].includes(k)?`stroke="${PAL.paper}" stroke-width="1.2" stroke-dasharray="${k==='b'?'3 2':'12 3'}" vector-effect="non-scaling-stroke"`:'';
    if (dem){ fill = PAL.demFill; ex = 'stroke="#c65b3a" stroke-width="1.2" stroke-dasharray="5 3" vector-effect="non-scaling-stroke"'; }
    return `<rect class="wall" data-wall="${id}" x="${x0}" y="${y0}" width="${x1-x0}" height="${y1-y0}" fill="${fill}" ${ex}><title>${k==='b'?tr('承重墙 · 点线','Bearing · dotted'):k==='e'?tr('外墙 · 长虚线','Exterior · dashed'):tr('非承重墙 · 实线','Partition · solid')} · ${tr('点击查看属性','Click for properties')}</title></rect>`;
  }).join('');
}

function offsetBayPath(points,d){
 const normals=points.slice(1).map((p,i)=>{const a=points[i],len=Math.hypot(p[0]-a[0],p[1]-a[1]);return [-(p[1]-a[1])/len,(p[0]-a[0])/len];});
 return points.map((p,i)=>{const a=normals[Math.max(0,i-1)],b=normals[Math.min(i,normals.length-1)],n=i===0||i===points.length-1?b:[a[0]+b[0],a[1]+b[1]];return [p[0]+n[0]*d,p[1]+n[1]*d];});
}
function bayAssembly(win){const group=WINS.filter(w=>win.bayId?w.bayId===win.bayId:win.bayGroup?w.bayGroup===win.bayGroup:w===win),left=group.find(w=>w.bayPart==='left'),right=group.find(w=>w.bayPart==='right');if(left?.frameLine&&right?.frameLine){const line=[left.frameLine[0],left.frameLine[1],right.frameLine[1],right.frameLine[0]];return {group,line,outline:offsetBayPath(line,30).concat(offsetBayPath(line,-30).reverse())};}return {group};}
function renderOpenings(){
  const WS = `stroke="${PAL.winLine}" stroke-width="1" vector-effect="non-scaling-stroke"`;
  let s = '';
  const drawnBays=new Set();
  WINS.forEach((win, wi) => {const [x0,y0,x1,y1]=win.rect;
    if(win.bayId&&win.frameLine){s+=`<rect x="${x0}" y="${y0}" width="${x1-x0}" height="${y1-y0}" fill="transparent" class="pick" data-win="${wi}"/>`;if(!drawnBays.has(win.bayId)){drawnBays.add(win.bayId);const assembly=bayAssembly(win);s+=`<polygon points="${assembly.outline.map(p=>p.join(',')).join(' ')}" fill="${PAL.winFill}" ${WS} pointer-events="none"/>`;for(const offset of [-10,10])s+=`<polyline points="${offsetBayPath(assembly.line,offset).map(p=>p.join(',')).join(' ')}" fill="none" ${WS} stroke-linejoin="miter" pointer-events="none"/>`;}return;}
    const w = x1-x0, h = y1-y0;
    s += `<rect x="${x0}" y="${y0}" width="${w}" height="${h}" fill="${PAL.winFill}" class="pick" data-win="${wi}" ${WS}/>`;
    if (w >= h) [1/3,2/3].forEach(t => s += `<line x1="${x0}" y1="${y0+h*t}" x2="${x1}" y2="${y0+h*t}" ${WS}/>`);
    else [1/3,2/3].forEach(t => s += `<line x1="${x0+w*t}" y1="${y0}" x2="${x0+w*t}" y2="${y1}" ${WS}/>`);
  });
  const DS = `stroke="${PAL.ink}" stroke-width="1" vector-effect="non-scaling-stroke"`;
  DOORS.forEach(d => {
    const [hx,hy] = d.h, L = d.len, T = 40;
    const ox = hx + d.o[0]*L, oy = hy + d.o[1]*L, cx = hx + d.c[0]*L, cy = hy + d.c[1]*L;
    const sweep = d.o[0]*d.c[1] - d.o[1]*d.c[0] > 0 ? 1 : 0;
    const col = d.entry ? '#ef5a24' : PAL.ink;
    s += `<polygon points="${hx},${hy} ${ox},${oy} ${ox+d.c[0]*T},${oy+d.c[1]*T} ${hx+d.c[0]*T},${hy+d.c[1]*T}" fill="${PAL.leaf}" stroke="${col}" stroke-width="${d.entry?1.8:1}" vector-effect="non-scaling-stroke"/>`;
    s += `<path d="M${ox} ${oy}A${L} ${L} 0 0 ${sweep} ${cx} ${cy}" fill="none" ${DS} stroke-dasharray="5 3" opacity=".7"/>`;
  });
  SLIDES.forEach(({rect:[x0,y0,x1,y1],v}) => {
    if (v){ const L = y1-y0, m = (x0+x1)/2; s += `<rect x="${m-45}" y="${y0}" width="40" height="${L*.55}" fill="${PAL.leaf}" ${DS}/><rect x="${m+5}" y="${y1-L*.55}" width="40" height="${L*.55}" fill="${PAL.leaf}" ${DS}/>`; }
    else { const L = x1-x0, m = (y0+y1)/2; s += `<rect x="${x0}" y="${m-45}" width="${L*.55}" height="40" fill="${PAL.leaf}" ${DS}/><rect x="${x1-L*.55}" y="${m+5}" width="${L*.55}" height="40" fill="${PAL.leaf}" ${DS}/>`; }
  });
  // 入户标识：箭头由 entry 门自动推导（o 指向室内，箭头在门外一侧）
  const ed = DOORS.find(d => d.entry);
  if (ed){
    const [rx0,ry0,rx1,ry1] = ed.rect, cx = (rx0+rx1)/2, cy = (ry0+ry1)/2, [ox,oy] = ed.o;
    const tip = [cx - ox*350, cy - oy*350], tail = [tip[0] - ox*1000, tip[1] - oy*1000];
    const px = oy, py = -ox;                                   // 垂直于行进方向
    const a1 = [tip[0] - ox*200 + px*155, tip[1] - oy*200 + py*155];
    const a2 = [tip[0] - ox*200 - px*155, tip[1] - oy*200 - py*155];
    const ap = [tip[0] + ox*50, tip[1] + oy*50];
    const anchor = Math.abs(ox) > .5 ? 'start' : 'end';
    s += `<path d="M${tail[0]} ${tail[1]}L${tip[0]} ${tip[1]}M${a1[0]} ${a1[1]}L${ap[0]} ${ap[1]}L${a2[0]} ${a2[1]}" fill="none" stroke="#ef5a24" stroke-width="2" vector-effect="non-scaling-stroke"/>
        <text x="${tail[0] + px*160}" y="${tail[1] + py*160}" font-size="200" text-anchor="${anchor}" fill="#ef5a24">${tr('入户','Entry')}</text>`;
  }
  $('#gOpen').innerHTML = s;
}

function renderLabels(){
  const g = $('#gLabels');
  g.setAttribute('display', ui.layers.labels ? 'inline' : 'none');
  g.innerHTML = ROOMS.filter(r => r.at).map(r => {
    const [x,y] = r.at, halo = `stroke="${PAL.halo}" stroke-width="45" paint-order="stroke" stroke-linejoin="round"`;
    return `<text x="${x}" y="${y}" font-size="250" font-weight="600" text-anchor="middle" fill="${PAL.label}" ${halo}>${esc(nm(state.rooms[r.id].name))}</text>
      <text x="${x}" y="${y+260}" font-size="175" text-anchor="middle" fill="${PAL.labelSub}" ${halo}>${fmt(area(r.poly))} m²</text>`;
  }).join('');
}

function renderDims(){
  const DC = PAL.dim, LS = `stroke="${DC}" stroke-width="1" vector-effect="non-scaling-stroke"`, TK = `stroke="${DC}" stroke-width="2" vector-effect="non-scaling-stroke"`;
  const txt = (x,y,v,rot) => `<text x="${x}" y="${y}" font-size="${v<400?140:200}" text-anchor="middle" fill="${DC}" ${rot?`transform="rotate(-90 ${x} ${y})"`:''}>${v}</text>`;
  const chain = (horiz, at, start, segs) => {
    const pts = [start]; segs.forEach(v => pts.push(pts[pts.length-1]+v));
    let s = horiz ? `<line x1="${pts[0]}" y1="${at}" x2="${pts.at(-1)}" y2="${at}" ${LS}/>` : `<line x1="${at}" y1="${pts[0]}" x2="${at}" y2="${pts.at(-1)}" ${LS}/>`;
    pts.forEach(p => s += horiz
      ? `<line x1="${p}" y1="${at-170}" x2="${p}" y2="${at+170}" ${LS}/><line x1="${p-80}" y1="${at+80}" x2="${p+80}" y2="${at-80}" ${TK}/>`
      : `<line x1="${at-170}" y1="${p}" x2="${at+170}" y2="${p}" ${LS}/><line x1="${at-80}" y1="${p+80}" x2="${at+80}" y2="${p-80}" ${TK}/>`);
    segs.forEach((v,i) => { const mid = (pts[i]+pts[i+1])/2; s += horiz ? txt(mid, at-70, v) : txt(at-70, mid, v, true); });
    return s;
  };
  const g = $('#gDims');
  g.innerHTML = PLAN.dims.map(d => chain(d.h, d.at, d.start, d.segs)).join('');
  g.setAttribute('display', ui.layers.dims ? 'inline' : 'none');
}

function renderGrid(){
  stageEl.classList.toggle('has-grid', ui.layers.grid);
  $('#gGrid').innerHTML = `<rect x="-20000" y="-20000" width="55000" height="55000" fill="${ui.layers.grid ? 'url(#grid)' : 'transparent'}" data-bg="1"/>`;
}

function renderMeasure(){
  const k = 1/view.s, fs = 12*k;
  const one = (a,b,tmp) => {
    const L = Math.hypot(b.x-a.x, b.y-a.y); if (L < 1) return '';
    let ang = Math.atan2(b.y-a.y, b.x-a.x)*180/Math.PI; if (ang > 90 || ang < -90) ang += 180;
    const mx = (a.x+b.x)/2, my = (a.y+b.y)/2, nx = -(b.y-a.y)/L*5*k, ny = (b.x-a.x)/L*5*k;
    const col = tmp ? '#0e8f83' : '#ef5a24', S = `stroke="${col}" stroke-width="1.5" vector-effect="non-scaling-stroke"`;
    return `<line x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}" ${S}/>
      <line x1="${a.x-nx}" y1="${a.y-ny}" x2="${a.x+nx}" y2="${a.y+ny}" ${S}/><line x1="${b.x-nx}" y1="${b.y-ny}" x2="${b.x+nx}" y2="${b.y+ny}" ${S}/>
      <text x="${mx}" y="${my-5*k}" font-size="${fs}" text-anchor="middle" fill="${col}" font-weight="600" transform="rotate(${ang} ${mx} ${my})"
        stroke="${PAL.halo}" stroke-width="${3.5*k}" paint-order="stroke">${Math.round(L)} mm</text>`;
  };
  let s = state.measures.map(m => one(m.a,m.b)).join('');
  if (ui.mA && ui.mCur) s += one(ui.mA, ui.mCur, true);
  if (ui.mA) s += `<circle cx="${ui.mA.x}" cy="${ui.mA.y}" r="${3*k}" fill="#0e8f83"/>`;
  $('#gMeasure').innerHTML = s;
}

const ACC = '#ef5a24', TEAL = '#0e8f83';
function renderSel(){
  const k = 1/view.s, ids = selIds(); let s = '';
  const A = `stroke="${ACC}" vector-effect="non-scaling-stroke"`;
  const halo = w => `stroke="${PAL.halo}" stroke-width="${w*k}" paint-order="stroke"`;
  if (ids.length > 1){
    const items = selItems();
    items.forEach(f => s += `<g transform="${furnT(f)}" pointer-events="none"><rect x="${-f.w/2}" y="${-f.d/2}" width="${f.w}" height="${f.d}" fill="rgba(239,90,36,.1)" ${A} stroke-width="1.5"/></g>`);
    const [x0,y0,x1,y1] = groupBox(items), p = 8*k;
    s += `<rect x="${x0-p}" y="${y0-p}" width="${x1-x0+2*p}" height="${y1-y0+2*p}" fill="none" ${A} stroke-width="1.2" stroke-dasharray="6 4" pointer-events="none"/>
      <text x="${(x0+x1)/2}" y="${y1+p+18*k}" font-size="${12*k}" text-anchor="middle" fill="${ACC}" font-weight="600" pointer-events="none" ${halo(3)}>${tr(`已选 ${items.length} 件`, `${items.length} selected`)} · ${Math.round(x1-x0)} × ${Math.round(y1-y0)}</text>`;
  } else if (ids.length === 1){
    const f = getF(ids[0]);
    if (f){
      // 触屏上手柄更大、离家具更远，并各带一圈透明的大热区；锁定的家具不显示手柄
      const p = 5*k, hs = COARSE ? 1.7 : 1, ro = (COARSE ? 40 : 26)*k, hit = (COARSE ? 24 : 11)*k;
      const sx = f.w/2+p, sy = f.d/2+p;
      s += `<g transform="${furnT(f)}">
        <rect x="${-f.w/2-p}" y="${-f.d/2-p}" width="${f.w+2*p}" height="${f.d+2*p}" fill="none" ${A} stroke-width="1.5" stroke-dasharray="5 3" pointer-events="none"/>`;
      if (!f.locked) s += `
        <line x1="0" y1="${-f.d/2-p}" x2="0" y2="${-f.d/2-ro}" ${A} stroke-width="1" pointer-events="none"/>
        <circle data-handle="rot" cx="0" cy="${-f.d/2-ro}" r="${hit}" fill="transparent"/>
        <circle data-handle="rot" cx="0" cy="${-f.d/2-ro}" r="${6*hs*k}" fill="#fff" ${A} stroke-width="1.5"><title>${tr('拖动旋转（Shift 自由角度）','Drag to rotate (Shift for free angle)')}</title></circle>
        <circle data-handle="size" cx="${sx}" cy="${sy}" r="${hit}" fill="transparent"/>
        <rect data-handle="size" x="${sx-5*hs*k}" y="${sy-5*hs*k}" width="${10*hs*k}" height="${10*hs*k}" fill="${ACC}"><title>${tr('拖动调整尺寸','Drag to resize')}</title></rect>`;
      s += `</g>`;
      const {hh} = aabb(f);
      s += `<text x="${f.cx}" y="${f.cy+hh+24*k}" font-size="${12*k}" text-anchor="middle" fill="${ACC}" font-weight="600" pointer-events="none" ${halo(3)}>${f.locked ? tr('已锁定 · ', 'Locked · ') : ''}${f.w} × ${f.d}</text>`;
      if (ui.layers.clear && (!drag || drag.kind === 'move')) s += clearanceSVG(f, k);
    }
  } else if (ui.sel?.kind === 'note' && noteBox[ui.sel.id]){
    const [x0,y0,x1,y1] = noteBox[ui.sel.id], p = 6*k;
    s += `<rect x="${x0-p}" y="${y0-p}" width="${x1-x0+2*p}" height="${y1-y0+2*p}" rx="${(y1-y0)/2+p}" fill="none" ${A} stroke-width="1.5" stroke-dasharray="5 3" pointer-events="none"/>`;
  } else if (['door','slide','win'].includes(ui.sel?.kind)){
    const o=(ui.sel.kind==='door'?DOORS:ui.sel.kind==='slide'?SLIDES:WINS)[ui.sel.id];if(o){if(ui.sel.kind==='win'&&(o.bayId||o.bayGroup)){const assembly=bayAssembly(o),r=assembly.group.map(w=>w.rect),x0=Math.min(...r.map(q=>q[0])),y0=Math.min(...r.map(q=>q[1])),x1=Math.max(...r.map(q=>q[2])),y1=Math.max(...r.map(q=>q[3]));if(assembly.outline)s+=`<polygon data-bay-selection="whole" points="${assembly.outline.map(p=>p.join(',')).join(' ')}" fill="rgba(239,90,36,.1)" ${A} stroke-width="2" pointer-events="none"/>`;else for(const q of r)s+=`<rect data-bay-selection="whole" x="${q[0]}" y="${q[1]}" width="${q[2]-q[0]}" height="${q[3]-q[1]}" fill="none" ${A} stroke-width="2" pointer-events="none"/>`;s+=`<rect x="${x0-60}" y="${y0-60}" width="${x1-x0+120}" height="${y1-y0+120}" fill="none" ${A} stroke-width="1" stroke-dasharray="5 4" pointer-events="none"/><text x="${(x0+x1)/2}" y="${y1+60+16*k}" text-anchor="middle" fill="${ACC}" font-size="${12*k}" ${halo(3)} pointer-events="none">整组飘窗 · 三面窗同步编辑</text>`;}else{const [x0,y0,x1,y1]=o.rect;s+=`<rect x="${x0-60}" y="${y0-60}" width="${x1-x0+120}" height="${y1-y0+120}" fill="none" ${A} stroke-width="3" pointer-events="none"/>`;}}
  } else if (ui.sel?.kind === 'wall'){
    const selected=ui.sel.wallIds?.length?WALLS.filter((_,i)=>ui.sel.wallIds.includes(PLAN.wallRefs?.[i])):[WALLS[Number(ui.sel.id.slice(1))]];for(const w of selected.filter(Boolean))s+=`<rect x="${w[0]}" y="${w[1]}" width="${w[2]-w[0]}" height="${w[3]-w[1]}" fill="none" ${A} stroke-width="3" pointer-events="none"/>`;
  } else if (ui.sel?.kind === 'room'){
    const r = ROOMS.find(r => r.id === ui.sel.id);
    s += `<polygon points="${r.poly.map(p=>p.join(',')).join(' ')}" fill="rgba(239,90,36,.08)" stroke="${ACC}" stroke-width="2" vector-effect="non-scaling-stroke" pointer-events="none"/>`;
  }
  // 拖动时的对齐参考线
  (ui.guides || []).forEach(g => s += g.v
    ? `<line x1="${g.x}" y1="${g.a}" x2="${g.x}" y2="${g.b}" stroke="#d6336c" stroke-width="1" stroke-dasharray="4 3" vector-effect="non-scaling-stroke" pointer-events="none"/>`
    : `<line x1="${g.a}" y1="${g.y}" x2="${g.b}" y2="${g.y}" stroke="#d6336c" stroke-width="1" stroke-dasharray="4 3" vector-effect="non-scaling-stroke" pointer-events="none"/>`);
  if (ui.marq){
    const [a, b] = ui.marq;
    s += `<rect x="${Math.min(a.x,b.x)}" y="${Math.min(a.y,b.y)}" width="${Math.abs(b.x-a.x)}" height="${Math.abs(b.y-a.y)}" fill="rgba(47,93,98,.08)" stroke="${TEAL}" stroke-width="1" stroke-dasharray="5 3" vector-effect="non-scaling-stroke" pointer-events="none"/>`;
  }
  $('#gSel').innerHTML = s;
}
// 选中家具到四周墙面（含窗）的净距：沿 ±X / ±Y 找最近的、与家具投影有重叠的墙段
function clearanceSVG(f, k){
  const {hw, hh} = aabb(f), L = f.cx-hw, R = f.cx+hw, T = f.cy-hh, B = f.cy+hh, rects = snapRects();
  const near = (dir) => {
    let best = Infinity;
    for (const r of rects){
      if (dir === 'r' && r[0] >= R - 1 && r[1] < B && r[3] > T) best = Math.min(best, r[0] - R);
      if (dir === 'l' && r[2] <= L + 1 && r[1] < B && r[3] > T) best = Math.min(best, L - r[2]);
      if (dir === 'b' && r[1] >= B - 1 && r[0] < R && r[2] > L) best = Math.min(best, r[1] - B);
      if (dir === 't' && r[3] <= T + 1 && r[0] < R && r[2] > L) best = Math.min(best, T - r[3]);
    }
    return best;
  };
  const S = `stroke="${TEAL}" stroke-width="1" vector-effect="non-scaling-stroke" pointer-events="none"`, fs = 11*k;
  const txt = (x, y, v) => `<text x="${x}" y="${y}" font-size="${fs}" text-anchor="middle" dominant-baseline="central" fill="${TEAL}" font-weight="600" stroke="${PAL.halo}" stroke-width="${3*k}" paint-order="stroke" pointer-events="none">${Math.round(v)}</text>`;
  const tick = (x1, y1, x2, y2) => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" ${S}/>`;
  let s = '';
  for (const d of ['l', 'r', 't', 'b']){
    const v = near(d); if (!(v > 2 && v < 4000)) continue;
    const t = 4*k;
    if (d === 'l' || d === 'r'){ const x1 = d === 'l' ? L - v : R, x2 = x1 + v, y = f.cy;
      s += tick(x1, y, x2, y) + tick(x1, y-t, x1, y+t) + tick(x2, y-t, x2, y+t) + txt((x1+x2)/2, y - 9*k, v); }
    else { const y1 = d === 't' ? T - v : B, y2 = y1 + v, x = f.cx;
      s += tick(x, y1, x, y2) + tick(x-t, y1, x+t, y1) + tick(x-t, y2, x+t, y2) + txt(x + 16*k, (y1+y2)/2, v); }
  }
  return s;
}

// 文字标注：按平面尺寸（mm）绘制，随缩放 / 打印 / 导出一起变化；底色胶囊 + 左侧定位点
const noteBox = {};
function renderNotes(){
  const g = $('#gNotes');
  g.setAttribute('display', ui.layers.notes ? 'inline' : 'none');
  g.innerHTML = (state.notes || []).map(n => {
    const fs = 210*n.size, w = [...n.text].reduce((a, c) => a + (/[\u2e80-\uffff]/.test(c) ? 1 : .58), 0)*fs + fs*1.3, h = fs*1.75;
    const [bg, fg] = NOTE_COLORS[n.color] || NOTE_COLORS.accent, x0 = n.x - fs*.5, y0 = n.y - h/2;
    noteBox[n.id] = [x0, y0, x0 + w, y0 + h];
    return `<g class="note" data-note="${n.id}">
      <rect x="${x0}" y="${y0}" width="${w}" height="${h}" rx="${h/2}" fill="${bg}" stroke="${n.color === 'paper' ? '#2a2622' : 'none'}" stroke-width="1" vector-effect="non-scaling-stroke"/>
      <circle cx="${n.x}" cy="${n.y}" r="${fs*.2}" fill="${fg}" opacity=".9"/>
      <text x="${n.x + fs*.45}" y="${n.y}" font-size="${fs}" font-weight="700" dominant-baseline="central" fill="${fg}">${esc(n.text)}</text></g>`;
  }).join('');
}
function renderAll(){
  window.FurnishDesignUI?.clearPlacementGuide();
  syncCustomArchitecture();
  applyOpeningOverrides(); ui.guides = null;
  renderGrid(); renderRooms(); renderFurn(); renderWalls(); renderLabels(); renderMeasure(); renderNotes(); renderSel(); renderPanel(); updateHeader();
  window.View3D?.sync();
  window.FurnishWorkspace?.afterRender();
}

function updateHeader(){
  const tot = ROOMS.filter(r => r.counted !== false).reduce((a,r) => a + area(r.poly), 0);
  $('#subtitle').textContent = tr(`套内使用面积约 ${fmt(tot)} m² · 尺寸单位 mm${PLAN.note ? ' · ' + PLAN.note : ''}`,
    `Net floor area ≈ ${fmt(tot)} m² · Units: mm${PLAN.noteEn ? ' · ' + PLAN.noteEn : ''}`);
  const stage=state.architecture?.phase==='survey'?'原始结构录入 · 未锁定':state.architecture?'装修设计 · 结构已锁定':'示例布局';
  const brand = document.querySelector('.brand b'), bz = `${nm(PLAN.name)} · ${stage}`, be = `${PLAN.en||PLAN.name} · ${state.architecture?.phase==='survey'?'Survey (unlocked)':'Design'}`;
  brand.dataset.zh = bz; brand.dataset.en = be; brand.textContent = brand.title = tr(bz, be);
  $('#undo').disabled = !undoStack.length; $('#redo').disabled = !redoStack.length;
  const n = selIds().length;
  $('#selInfo').innerHTML = n ? `<b>${tr(`已选 ${n} 件`, `${n} selected`)}</b>` : '';
}

/* ======================= 右侧面板 ======================= */
const esc = s => String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

function renderPanel(){
  renderFab();
  const p = $('#panel'), ids = selIds();
  if (ids.length > 1){ p.innerHTML = multiPanel(selItems()); return; }
  if (ui.sel?.kind === 'furn'){ const f = getF(ui.sel.id); if (f){ p.innerHTML = furnPanel(f); bindFurnPanel(f); return; } }
  if (ui.sel?.kind === 'wall' && window.FurnishWorkspace){ window.FurnishWorkspace.wallPanel(ui.sel.id,p); return; }
  if (ui.sel?.kind === 'room'){ p.innerHTML = roomPanel(ROOMS.find(r => r.id === ui.sel.id)); bindRoomPanel(); return; }
  if (ui.sel?.kind === 'door' || ui.sel?.kind === 'slide'){ p.innerHTML = openingPanel(ui.sel); bindOpeningPanel(ui.sel); return; }
  if (ui.sel?.kind === 'win'){ if(window.FurnishWorkspace?.bayPanel(ui.sel.id,p)||window.FurnishWorkspace?.windowPanel(ui.sel.id,p))return; p.innerHTML = winPanel(ui.sel.id); bindWinPanel(ui.sel.id); return; }
  if (ui.sel?.kind === 'note'){ const n = getNote(ui.sel.id); if (n){ p.innerHTML = notePanel(n); return; } }
  const lost = state.furniture.filter(isOutside).length, clashN = collisions().length;
  const tab = (k, icon, zh, en, n, warn) => `<button class="tab ${ui.tab === k ? 'on' : ''}" data-tab="${k}">${ico(icon)}${tr(zh, en)}${n != null ? `<span class="n ${warn ? 'warn' : ''}">${n}</span>` : ''}</button>`;
  p.innerHTML = `<div class="tabs" role="tablist">${tab('overview', 'chart', '概览', 'Overview')}${tab('list', 'list', '清单', 'Items', state.furniture.length, lost || clashN)}${tab('quote', 'coin', '报价', 'Quote')}</div>`
    + (ui.tab === 'list' ? listPanel() : ui.tab === 'quote' ? quotePanel() : overviewPanel());
  if (ui.tab === 'overview') bindOverview();
}

// 全屋预算：地面（含 5% 损耗）+ 墙面乳胶漆（周长×层高，扣门窗洞口，含 10% 损耗，28 元/m²）+ 家具家电参考价
function budget(){ return FurnishProject.estimate(FurnishProject.effectivePlan(PLAN,state),state,MATS,priceOf); }
const yen = v => '¥' + Math.round(v).toLocaleString();

function alertsHTML(){
  const lost = state.furniture.filter(isOutside).length, clashN = collisions().length;
  let s = '';
  if (saveErr) s += `<div class="alert">${ico('warn')}<span>${tr('自动保存失败（浏览器存储空间不足）。请导出方案 JSON 备份。', 'Autosave failed (storage full). Export the plan JSON as a backup.')}</span></div>`;
  if (lost) s += `<div class="alert">${ico('warn')}<span>${tr(`${lost} 件家具在户型外，画面上可能看不到`, `${lost} item(s) are outside the plan and may be off-screen`)}</span><button class="btn" data-act="rescue">${tr('移回', 'Bring back')}</button></div>`;
  if (clashN) s += `<div class="alert">${ico('warn')}<span>${tr(`${clashN} 处家具互相重叠`, `${clashN} furniture overlap(s)`)}</span><button class="btn" data-act="clash">${tr('选中', 'Select')}</button></div>`;
  return s;
}

function overviewPanel(){
  const B = budget();
  const rows = ROOMS.map(r => {
    const st = state.rooms[r.id];
    return `<tr class="click" data-room="${r.id}"><td><span class="sw" style="background:${MATS[st.mat].sw}"></span>${esc(nm(st.name))}${r.counted===false?' <span class="muted">*</span>':''}</td>
      <td class="r">${fmt(area(r.poly))} m²</td></tr>`;
  }).join('');
  const maxMat = Math.max(...B.mats.map(m => m.a));
  const matRows = B.mats.map(({m,a,c}) => `<tr><td><span class="sw" style="background:${MATS[m].sw}"></span>${nm(MATS[m].name)}</td><td class="r">${fmt(a,1)} m²</td><td class="r">${yen(c)}</td></tr>
      <tr class="barrow"><td colspan="3"><div class="cbar"><i style="width:${Math.max(4, a/maxMat*100).toFixed(1)}%;background:${MATS[m].sw}"></i></div></td></tr>`).join('');
  const demLen = state.architecture?FurnishProject.quantities(PLAN,state.architecture).removed:state.demolished.map(id => WALLS[+id.slice(1)]).reduce((a,w) => a + Math.max(w[2]-w[0], w[3]-w[1]), 0) / 1000;
  const locked = state.furniture.filter(f => f.locked).length;
  return `${alertsHTML() ? `<section>${alertsHTML()}</section>` : ''}
  <section class="hero"><h3>${tr('全屋预算粗估','Whole-home Budget')} <small>${tr('参考价，仅供估算','reference prices')}</small></h3>
    <table>
      <tr><td>${tr(`地面材料（含 ${B.settings.floorWaste}% 损耗）`,`Flooring (incl. ${B.settings.floorWaste}% waste)`)}</td><td class="r">${fmt(B.counted.reduce((a,r) => a + area(r.poly), 0),1)} m²</td><td class="r">${yen(B.floor)}</td></tr>
      <tr><td>${tr(`墙面乳胶漆（含 ${B.settings.paintWaste}% 损耗）`,`Wall paint (incl. ${B.settings.paintWaste}% waste)`)}</td><td class="r">${fmt(B.paintQuantity,1)} m²</td><td class="r">${yen(B.paint)}</td></tr>
      <tr><td>${tr('家具家电','Furniture & appliances')}</td><td class="r">${state.furniture.length} ${tr('件','pcs')}</td><td class="r">${yen(B.furn)}</td></tr>
      <tr><td>${tr('装修工程','Renovation')}</td><td class="r">${B.extra.length} ${tr('项','items')}</td><td class="r">${yen(B.renovation)}</td></tr>
    </table>
    <div class="total"><span>${tr('粗估合计','Estimated total')}</span><b>${yen(B.total)}</b></div>
    <div class="comp" title="${tr('预算构成','Budget breakdown')}"><i class="c1" style="flex:${B.floor}"></i><i class="c2" style="flex:${B.paint}"></i><i class="c3" style="flex:${B.furn || .0001}"></i><i style="background:#8b78b5;flex:${B.renovation || .0001}"></i></div>
    <div class="comp-l"><span><i class="c1"></i>${tr('地面','Floors')} ${Math.round(B.total?B.floor/B.total*100:0)}%</span><span><i class="c2"></i>${tr('墙面','Walls')} ${Math.round(B.total?B.paint/B.total*100:0)}%</span><span><i class="c3"></i>${tr('家具','Furniture')} ${Math.round(B.total?B.furn/B.total*100:0)}%</span><span><i style="background:#8b78b5"></i>${tr('工程','Renovation')} ${Math.round(B.total?B.renovation/B.total*100:0)}%</span></div>
    <div class="actions"><button class="btn" data-tab="quote">${ico('coin')}${tr('报价明细','Quote details')}</button><button class="btn" data-act="csv">${ico('download')}${tr('导出 CSV','Export CSV')}</button></div></section>
  <section><h3>${tr('风格方案','Style Presets')} <small>${tr('一键统一家具配色与地面','recolor furniture & floors in one click')}</small></h3>${stylesHTML()}</section>
  <section><h3>${tr('房间面积','Room Areas')} <small>${tr('点击查看 / 更换地面','Click to view / change flooring')}</small></h3>
    <table>${rows}</table>
    <div class="total"><span>${tr('套内使用面积','Net floor area')}</span><b>${fmt(B.tot)} m²</b></div>
    <div class="muted note">${tr('* 飘窗不计入使用面积；面积按墙体内净尺寸计算','* Bay windows are excluded; areas use net inner wall dimensions')}</div></section>
  <section><h3>${tr('地面材料估算','Flooring Estimate')} <small>${tr('含 5% 损耗','incl. 5% waste')}</small></h3>
    <table>${matRows}</table>
    <div class="total"><span>${tr('地面材料合计','Flooring total')}</span><b>${yen(B.floor)}</b></div>
    <div class="muted note">${tr(`墙面面积 ${fmt(B.wallArea,1)} m²（周长×2.8m）已扣门窗洞口；乳胶漆按 28 元/m² 估算`, `Wall ${fmt(B.wallArea,1)} m² (perimeter×2.8m) minus openings; paint at ¥28/m²`)}</div></section>
  <section><h3>${tr('方案统计','Plan Stats')}</h3>
    <div class="stats"><div><small>${tr('家具数量','Furniture')}</small><span class="big">${state.furniture.length}</span>${locked ? ` <small>${tr(`其中 ${locked} 件锁定`, `${locked} locked`)}</small>` : ''}</div>
      <div><small>${tr('拆除墙体','Walls removed')}</small><span class="big">${fmt(demLen,1)}</span> m</div></div>
    <div class="actions"><button class="btn" id="clearMeasure">${tr('清除测量','Clear measures')} (${state.measures.length})</button>
      <button class="btn" data-act="reset">${ico('reset')}${tr('重置…','Reset…')}</button>
      <button class="btn danger" data-act="clearFurn">${tr('清空布置','Clear layout')}</button></div></section>
  <section><h3>${tr('常用操作','Quick Tips')}</h3><div class="kbd">
    ${COARSE ? tr(`<kbd>点 / 拖家具库</kbd><span>添加家具</span><kbd>长按家具</kbd><span>弹出操作菜单（复制 / 镜像 / 锁定…）</span><kbd>框选工具</kbd><span>拖出矩形一次选中多件</span><kbd>双指</kbd><span>缩放、平移画面</span>`,
      `<kbd>Tap / drag library</kbd><span>Add furniture</span><kbd>Long-press item</kbd><span>Action menu (copy / mirror / lock…)</span><kbd>Box tool</kbd><span>Drag to select several</span><kbd>2 fingers</kbd><span>Zoom and pan</span>`)
    : tr(`<kbd>右键</kbd><span>家具 / 画布操作菜单</span><kbd>Shift+点击</kbd><span>多选，或 Shift+拖动框选</span><kbd>Ctrl C / V</kbd><span>复制 / 粘贴到指针处</span><kbd>空格+拖动</kbd><span>平移画面</span><kbd>R · H · L</kbd><span>旋转 · 镜像 · 锁定</span>`,
      `<kbd>Right-click</kbd><span>Item / canvas menu</span><kbd>Shift+click</kbd><span>Multi-select, or Shift+drag to box</span><kbd>Ctrl C / V</kbd><span>Copy / paste at pointer</span><kbd>Space+drag</kbd><span>Pan</span><kbd>R · H · L</kbd><span>Rotate · mirror · lock</span>`)}
  </div><div class="actions"><button class="btn" data-act="help">${ico('kbd')}${tr('全部快捷键','All shortcuts')}</button></div></section>`;
}
function bindOverview(){
  document.querySelectorAll('#panel tr[data-room]').forEach(tr => tr.onclick = () => { select({kind:'room', id:tr.dataset.room}); if (is3D()) window.View3D.flyToRoom(tr.dataset.room); });
  $('#clearMeasure').onclick = () => state.measures.length && mutate(() => state.measures = []);
}

// 清单：按所在房间分组；户型外 / 不在任何房间内的家具单独列出
function listPanel(){
  const groups = new Map(ROOMS.map(r => [r.id, []])); groups.set('__none', []); groups.set('__out', []);
  state.furniture.forEach(f => { const r = isOutside(f) ? null : roomAt(f.cx, f.cy); groups.get(isOutside(f) ? '__out' : r ? r.id : '__none').push(f); });
  const ids = new Set(selIds());
  const row = f => `<div class="irow ${ids.has(f.id) ? 'on' : ''} ${clashIds.has(f.id) ? 'clash' : ''}" data-focus="${f.id}" title="${tr('点击定位', 'Click to locate')}">
      <span class="sw" style="background:${esc(f.color)}"></span><span class="nm">${clashIds.has(f.id) ? '⚠ ' : ''}${esc(nm(f.name))}</span><small>${f.w}×${f.d}</small>
      <button class="ib ${f.locked ? 'on' : ''}" data-lockid="${f.id}" title="${f.locked ? tr('解锁', 'Unlock') : tr('锁定', 'Lock')}">${ico(f.locked ? 'lock' : 'unlock')}</button></div>`;
  let s = '';
  groups.forEach((list, k) => {
    if (!list.length) return;
    const title = k === '__out' ? `<span style="color:var(--danger)">${tr('户型外（画面上可能看不到）', 'Outside the plan (may be off-screen)')}</span>`
      : k === '__none' ? tr('墙上 / 门口等（不在房间内）', 'On walls / in doorways') : esc(nm(state.rooms[k].name));
    s += `<div class="ghd"><span>${title} · ${list.length}</span>${k === '__out' ? `<button class="ib" data-act="rescue" title="${tr('全部移回', 'Bring all back')}">${ico('target')}</button>` : ''}</div>${list.map(row).join('')}`;
  });
  return `<section>${alertsHTML()}
    <div class="actions" style="margin:0 0 8px"><button class="btn" data-act="selAll">${tr('全选','Select all')} (Ctrl+A)</button><button class="btn" data-act="custom">${ico('plus')}${tr('自定义家具','Custom item')}</button></div>
    ${s || `<div class="muted">${tr('还没有家具：从左侧家具库点击或拖入。', 'No furniture yet — click or drag from the library.')}</div>`}</section>`;
}

// 报价和采购清单按真实规格、品牌型号及状态区分。
function quoteRows(){
  const B = budget(), purchases=FurnishProject.procurement(FurnishProject.effectivePlan(PLAN,state),state,priceOf);
  const rows = purchases.items.sort((a,b)=>b.total-a.total).map(f=>[tr('家具家电','Furniture'),nm(f.name)+([f.brand,f.model].filter(Boolean).length?' · '+[f.brand,f.model].filter(Boolean).join(' '):''),`${f.w}×${f.d}${f.h?'×'+f.h:''} · ${FurnishProject.purchaseStates[f.status]}`,f.quantity,tr('件','pcs'),f.price,f.total]);
  B.mats.forEach(({m, quantity, price, c}) => rows.push([tr('地面', 'Flooring'), nm(MATS[m].name), `${B.settings.floorWaste}%`, +quantity.toFixed(2), 'm²', price, c]));
  rows.push([tr('墙面', 'Walls'), tr('乳胶漆', 'Latex paint'), `${B.settings.paintWaste}%`, +B.paintQuantity.toFixed(2), 'm²', B.settings.paintPrice, B.paint]);
  B.extra.forEach(r=>rows.push([tr('装修工程','Renovation'),r.name,r.source==='manual'?tr('手填工程量','Manual quantity'):tr('随户型自动计算','Auto quantity'),+r.quantity.toFixed(2),r.unit,r.price,r.total]));
  return {rows, B};
}
function quotePanel(){
  const {rows, B} = quoteRows();
  let cat = '', s = '';
  rows.forEach(r => { if (r[0] !== cat){ cat = r[0]; s += `<tr class="sub"><td colspan="3">${esc(cat)}</td></tr>`; }
    s += `<tr><td>${esc(r[1])}<br><small class="muted">${esc(r[2])}</small></td><td class="num">${r[3]} ${r[4]}<br><small class="muted">@ ${yen(r[5])}</small></td><td class="num">${yen(r[6])}</td></tr>`; });
  return `<section><h3>${tr('报价明细','Quote')} <small>${tr('参考价，可在家具属性中改单价','reference prices — edit unit price in item properties')}</small></h3>
    <table class="qt">${s}</table>
    <div class="total"><span>${tr('家具家电','Furniture')}</span><b>${yen(B.furn)}</b></div>
    <div class="total"><span>${tr('地面 + 墙面','Floors + walls')}</span><b>${yen(B.floor + B.paint)}</b></div>
    <div class="total"><span>${tr('装修工程','Renovation')}</span><b>${yen(B.renovation)}</b></div>
    <div class="total" style="font-size:16px"><span>${tr('合计','Total')}</span><b>${yen(B.total)}</b></div>
    <div class="actions"><button class="btn" data-act="csv">${ico('download')}${tr('导出 CSV（Excel 可打开）','Export CSV (opens in Excel)')}</button></div></section>`;
}
function exportCSV(){
  const {rows, B} = quoteRows();
  const head = [tr('类别','Category'), tr('名称','Item'), tr('规格','Spec'), tr('数量','Qty'), tr('单位','Unit'), tr('单价','Unit price'), tr('小计','Subtotal')];
  const lines = [head, ...rows.map(r => [...r.slice(0, 5), Math.round(r[5]), Math.round(r[6])]), [], ['', tr('合计','Total'), '', '', '', '', Math.round(B.total)]];
  download(`${tr('报价清单','quote')}-${nm(PLAN.name)}.csv`, new Blob([FurnishProject.csv(lines)], {type:'text/csv;charset=utf-8'}));
}

// 底部浮动工具条：触屏没有键盘，常用操作都放在这里
function renderFab(){
  const fab = $('#fab'), ids = selIds(), f = ids.length === 1 && getF(ids[0]), r = ui.sel?.kind === 'room' && ROOMS.find(r => r.id === ui.sel.id);
  if (!ids.length && !r){ fab.classList.remove('show'); return; }
  const b = (act, icon, label, cls = '') => `<button class="btn ${cls}" data-act="${act}" title="${label}">${ico(icon)}</button>`;
  fab.innerHTML = ids.length
    ? `<span class="name">${f ? esc(nm(f.name)) : tr(`已选 ${ids.length} 件`, `${ids.length} selected`)}</span>`
      + b('rotL', 'rotL', tr('逆时针 90°', 'Rotate left')) + b('rotR', 'rotR', tr('顺时针 90°', 'Rotate right')) + b('flip', 'flip', tr('镜像', 'Mirror'))
      + b('lock', selItems().every(x => x.locked) ? 'lock' : 'unlock', tr('锁定 / 解锁', 'Lock / unlock')) + b('dup', 'copy', tr('复制一份', 'Duplicate')) + b('del', 'trash', tr('删除', 'Delete'), 'danger')
      + `<span class="sep"></span><button class="btn narrow-only" data-act="prop">${tr('属性','Properties')}</button><button class="btn" data-act="done">${tr('完成','Done')}</button>`
    : `<span class="name">${esc(nm(state.rooms[r.id].name))}</span><button class="btn" data-act="roomFurn">${tr('选中房间内家具','Select its furniture')}</button><button class="btn narrow-only" data-act="prop">${tr('地面 / 属性','Floor / Properties')}</button><button class="btn" data-act="done">${tr('完成','Done')}</button>`;
  fab.classList.add('show');
}

function clearLayout(){
  const n = state.furniture.length;
  if (!n) return toast(tr('当前没有布置任何家具', 'There is no furniture to clear'));
  openDialog({title:tr('清空布置','Clear layout'),body:`<p>${tr(`确定清空 ${n} 件家具／家电吗？会先保留恢复点，也可撤销。墙体、材料和测量线会保留。`,`Remove ${n} furniture/appliance items? A recovery point is saved first; you can also undo. Walls, materials and measurements are retained.`)}</p>`,actions:[{label:tr('取消','Cancel')},{label:tr('确认清空布置','Clear layout'),cls:'danger',fn:()=>{snapshot(true,state,'清空布置前');ui.sel=null;mutate(()=>state.furniture=[]);toast(tr('已清空布置','Layout cleared'),{label:tr('撤销','Undo'),fn:undo});return true;}}]});
}

/* 侧栏开合：which = 'lib' | 'panel' | null，open 不传则切换。
 * 宽屏：侧栏在布局中收起 / 展开（记住选择）；窄屏：侧栏是浮层抽屉，一次只开一个，which = null 表示全部关闭 */
const PANES = 'huxing-panes';
const panes = (() => { try { return JSON.parse(localStorage.getItem(PANES)) || {}; } catch(e) { return {}; } })();
function drawer(which, open){
  const app = $('.app'), els = {lib:$('aside.lib'), panel:$('aside.right')}, n = narrow();
  if (n){
    Object.entries(els).forEach(([k, el]) => el.classList.toggle('open', k === which && (open ?? !el.classList.contains('open'))));
  } else {
    Object.values(els).forEach(el => el.classList.remove('open'));
    if (which){
      const k = which === 'lib' ? 'hideLib' : 'hidePanel';
      panes[k] = open === undefined ? !panes[k] : !open;
      try { localStorage.setItem(PANES, JSON.stringify(panes)); } catch(e) {}
    }
  }
  app.classList.toggle('hide-lib', !!panes.hideLib); app.classList.toggle('hide-panel', !!panes.hidePanel);
  syncPaneBtns();
}
function syncPaneBtns(){
  const els = {lib:$('aside.lib'), panel:$('aside.right')}, n = narrow();
  const vis = k => n ? els[k].classList.contains('open') : !panes[k === 'lib' ? 'hideLib' : 'hidePanel'];
  $('#tgLib').classList.toggle('on', vis('lib')); $('#tgPanel').classList.toggle('on', vis('panel'));
  $('#tgLib').title = vis('lib') ? tr('收起家具库 ( [ )', 'Hide library ( [ )') : tr('展开家具库 ( [ )', 'Show library ( [ )');
  $('#tgPanel').title = vis('panel') ? tr('收起属性面板 ( ] )', 'Hide properties ( ] )') : tr('展开属性面板 ( ] )', 'Show properties ( ] )');
  $('#stage').classList.toggle('drawer-panel', n && vis('panel'));   // 属性抽屉盖住画面时让出底部工具条
}
function closeDrawers(){ if (narrow()) drawer(null); }

function roomPanel(r){
  const st = state.rooms[r.id], a = area(r.poly), [x0,y0,x1,y1] = bbox(r.poly), inside = state.furniture.filter(f => inPoly(f.cx, f.cy, r.poly));
  const mats = Object.entries(MATS).map(([k,m]) => `<button class="mat ${k===st.mat?'on':''}" data-mat="${k}"><i style="background:${m.sw}"></i><span>${nm(m.name)}<small>¥${m.price}/m²</small></span></button>`).join('');
  return `<section><h3>${tr('房间','Room')}</h3>
    <div class="form"><label class="full">${tr('名称','Name')}<input id="rName" maxlength="80" value="${esc(nm(st.name))}"></label><label class="full">${tr('房间用途','Room use')}<select id="rUse" ${r.counted===false?'disabled':''}>${Object.entries(FurnishDesign.uses).filter(([id])=>r.counted===false?id==='bay':id!=='bay').map(([id,n])=>`<option value="${id}" ${FurnishDesign.inferUse(r,st)===id?'selected':''}>${tr(...n)}</option>`).join('')}</select></label></div>
    <p class="muted">${tr('风格方案按用途匹配地面，修改名称不会改变已设置的用途。','Styles use room purpose; renaming preserves the selected purpose.')}</p>
    <div class="stats mt">
      <div><small>${tr('使用面积','Floor area')}</small><span class="big">${fmt(a)}</span> m²</div>
      <div><small>${tr('周长','Perimeter')}</small><span class="big">${fmt(perim(r.poly),1)}</span> m</div>
      <div><small>${tr('开间','Width')}</small><span class="big">${x1-x0}</span> mm</div>
      <div><small>${tr('进深','Depth')}</small><span class="big">${y1-y0}</span> mm</div></div>
    <div class="muted">${tr(`墙面面积（层高 2.8m，未扣门窗）约 ${fmt(perim(r.poly)*2.8,1)} m²`, `Wall area (2.8m ceiling, openings not deducted) ≈ ${fmt(perim(r.poly)*2.8,1)} m²`)}</div></section>
  <section><h3>${tr('地面材料','Flooring')}</h3><div class="mats">${mats}</div>
    <div class="total"><span>${tr('材料估价','Estimated cost')}</span><b>${yen(a*(state.pricing?.materials?.[st.mat]??MATS[st.mat].price)*(1+FurnishProject.pricing(state.pricing).floorWaste/100))}</b></div></section>
  <section><h3>${tr('房间内家具','Furniture in room')} <small>${tr(`${inside.length} 件 · ${yen(inside.reduce((s,f) => s + priceOf(f), 0))}`, `${inside.length} items · ${yen(inside.reduce((s,f) => s + priceOf(f), 0))}`)}</small></h3>
    ${inside.map(f => `<div class="irow ${clashIds.has(f.id) ? 'clash' : ''}" data-focus="${f.id}"><span class="sw" style="background:${esc(f.color)}"></span><span class="nm">${esc(nm(f.name))}</span><small>${f.w}×${f.d}</small></div>`).join('') || `<div class="muted">${tr('暂无','None')}</div>`}
    <div class="actions">${inside.length ? `<button class="btn" data-act="roomFurn">${tr('全部选中','Select all')}</button>` : ''}
      <button class="btn" data-act="roomReset">${ico('reset')}${tr('恢复默认名称与地面','Reset name & floor')}</button>
      <button class="btn" data-act="home">${tr('← 返回总览','← Back to overview')}</button></div></section>`;
}
function bindRoomPanel(){
  const id = ui.sel.id;
  $('#rName').onchange = e => mutate(() => state.rooms[id].name = e.target.value.trim() || state.rooms[id].name);
  $('#rUse').onchange = e => mutate(() => state.rooms[id].use = e.target.value);
  document.querySelectorAll('#panel [data-mat]').forEach(b => b.onclick = () => mutate(() => state.rooms[id].mat = b.dataset.mat));
}

const SWATCHES = ['#ffffff','#efe6d8','#e2cfb4','#d6b99a','#a57c56','#c9d6df','#c3cbd6','#d8c7dc','#b7c4b0','#9dbb8c','#cfc6b8','#8a7a5e','#4a4f55','#1f1d1b'];
function furnPanel(f){
  const r = isOutside(f) ? null : roomAt(f.cx, f.cy), custom = f.type === 'custom' || f.type === 'customround', lk = f.locked ? 'disabled' : '';
  const clashWith = collisions().filter(p => p.includes(f.id)).map(p => getF(p[0] === f.id ? p[1] : p[0])).filter(Boolean);
  const btn = (act, icon, label, on) => `<button class="btn ${on ? 'on' : ''}" data-act="${act}" title="${label}" aria-label="${label}">${ico(icon)}</button>`;
  const pad = Math.max(f.w, f.d)*.1;
  return `<section><div class="fhead"><div class="fthumb"><svg viewBox="${-f.w/2-pad} ${-f.d/2-pad} ${f.w+2*pad} ${f.d+2*pad}">${f.flip ? `<g transform="scale(-1 1)">${furnSVG(f.type,f.w,f.d,f.color)}</g>` : furnSVG(f.type,f.w,f.d,f.color)}</svg></div>
      <div><b>${esc(nm(f.name))}</b><small>${f.w} × ${f.d} mm · ${yen(priceOf(f))}</small>${f.locked ? `<span class="tag">${ico('lock')}${tr('已锁定','Locked')}</span>` : ''}</div></div>
    <h3>${tr('家具属性','Furniture')}</h3>
    ${isOutside(f) ? `<div class="alert">${ico('warn')}<span>${tr('这件家具在户型外','This item is outside the plan')}</span><button class="btn" data-act="rescueOne">${tr('移回','Bring back')}</button></div>` : ''}
    ${clashWith.length ? `<div class="alert">${ico('warn')}<span>${tr('与以下家具重叠：','Overlaps: ')}${clashWith.map(g => esc(nm(g.name))).join('、')}</span></div>` : ''}
    <div class="form">
      <label class="full">${tr('名称','Name')}<input id="fName" value="${esc(nm(f.name))}"></label>
      <label>${tr('宽','Width')} (mm)<input type="number" id="fW" value="${f.w}" min="50" step="10" ${lk}></label>
      <label>${tr('深','Depth')} (mm)<input type="number" id="fD" value="${f.d}" min="50" step="10" ${lk}></label>
      <label>${tr('中心','Center')} X (mm)<input type="number" id="fX" value="${Math.round(f.cx)}" step="10" ${lk}></label>
      <label>${tr('中心','Center')} Y (mm)<input type="number" id="fY" value="${Math.round(f.cy)}" step="10" ${lk}></label>
      <label>${tr('旋转','Rotation')} (°)<input type="number" id="fR" value="${f.rot}" step="15" ${lk}></label>
      <label>${tr('单价','Unit price')} (¥)<input type="number" id="fP" value="${Math.round(priceOf(f))}" min="0" step="50"></label>
      ${custom ? `<label>${tr('高度','Height')} (mm)<input type="number" id="fH" value="${f.h || 800}" min="10" step="10"></label>` : ''}
      <label class="${custom ? '' : 'full'}">${tr('颜色','Color')}<input type="color" id="fC" value="${f.color}"></label>
    </div>
    <div class="swatches">${SWATCHES.map(c => `<button data-sw="${c}" class="${c === f.color ? 'on' : ''}" style="background:${c}" title="${c}"></button>`).join('')}</div>
    <div class="muted desc">${tr('占地','Footprint')} ${fmt(f.w*f.d/1e6)} m² · ${tr('位于','In')} ${r ? esc(nm(state.rooms[r.id].name)) : isOutside(f) ? tr('户型外','outside') : tr('墙边 / 门口','wall / doorway')}</div>
    ${window.FurnishDesignUI?.placementPanel(f)||''}
    <div class="iconrow">
      ${btn('rotL', 'rotL', tr('逆时针 90°（Shift+R）','Rotate left (Shift+R)'))}${btn('rotR', 'rotR', tr('顺时针 90°（R）','Rotate right (R)'))}
      ${btn('flip', 'flip', tr('左右镜像（H）','Mirror (H)'), f.flip)}${btn('lock', f.locked ? 'lock' : 'unlock', tr('锁定 / 解锁（L）','Lock / unlock (L)'), f.locked)}
      ${btn('front', 'front', tr('置于顶层','Bring to front'))}${btn('toBack', 'back', tr('置于底层','Send to back'))}
    </div>
    <div class="actions">
      <button class="btn" data-act="dup">${ico('copy')}${tr('复制','Duplicate')}</button>
      <button class="btn" id="full-product-details">完整家具资料</button><button class="btn" id="replace-furniture">查找并替换</button><button class="btn" data-act="resetItem">${ico('reset')}${tr('恢复默认','Reset item')}</button>
      <button class="btn" data-act="zoom">${ico('target')}${tr('定位','Zoom to')}</button>
      <button class="btn danger" data-act="del">${ico('trash')}${tr('删除','Delete')}</button>
      <button class="btn" data-act="home">${tr('← 返回','← Back')}</button>
    </div></section>
  <section class="muted small">${tr('拖动家具移动（会对齐其他家具并显示参考线）；拖上方圆点旋转、右下角方块改尺寸；Shift+点击可多选，右键查看更多操作。', 'Drag to move (snaps to other items with guides); drag the top dot to rotate, the corner square to resize; Shift+click to multi-select, right-click for more.')}</section>`;
}
function bindFurnPanel(f){
  window.FurnishDesignUI?.bindPlacement(f);$('#full-product-details').onclick=()=>FurnishWorkspace.open('products');
  const upd = (fn) => mutate(() => { const g = getF(f.id); if (g) fn(g); });
  const num = (id, fn) => { const el = $(id); if (el) el.onchange = e => {const v=Number(e.target.value);try{if(!e.target.value.trim()||!Number.isFinite(v))throw Error('请输入有效数字');if(['#fW','#fD','#fH','#fX','#fY','#fR'].includes(id)&&getF(f.id).locked)throw Error('家具已锁定，请先解锁');upd(g=>fn(g,v));}catch(error){toast(error.message);renderPanel();}}; };
  $('#fName').onchange = e => upd(g => g.name = e.target.value.trim() || g.name);
  num('#fW', (g,v) => Object.assign(g,FurnishDesign.resizeFurniture(g,{w:Math.round(v)})));
  num('#fD', (g,v) => Object.assign(g,FurnishDesign.resizeFurniture(g,{d:Math.round(v)})));
  num('#fX', (g,v) => g.cx = v); num('#fY', (g,v) => g.cy = v); num('#fR', (g,v) => g.rot = norm(v));
  num('#fP', (g,v) => g.price = Math.max(0, Math.round(v)));
  num('#fH', (g,v) => Object.assign(g,FurnishDesign.resizeFurniture(g,{h:Math.round(v)})));
  $('#fC').onchange = e => upd(g => g.color = e.target.value);
  document.querySelectorAll('#panel [data-sw]').forEach(b => b.onclick = () => upd(g => g.color = b.dataset.sw));
}
function multiPanel(items){
  const [x0,y0,x1,y1] = groupBox(items), btn = (act, icon, label) => `<button class="btn" data-act="${act}" title="${label}" aria-label="${label}">${ico(icon)}</button>`;
  const lockedAll = items.every(f => f.locked), cost = items.reduce((a, f) => a + priceOf(f), 0);
  return `<section><h3>${tr(`已选 ${items.length} 件家具`, `${items.length} items selected`)}</h3>
    <div class="stats"><div><small>${tr('整体尺寸','Group size')}</small><span class="big mid">${Math.round(x1-x0)} × ${Math.round(y1-y0)}</span></div>
      <div><small>${tr('参考价合计','Reference total')}</small><span class="big mid">${yen(cost)}</span></div></div>
    ${window.FurnishDesignUI?.groupPlacementPanel(items)||''}
    <div class="lbl">${tr('对齐','Align')}</div>
    <div class="iconrow">${btn('al','al',tr('左对齐','Align left'))}${btn('ac','ac',tr('水平居中','Align centers horizontally'))}${btn('ar','ar',tr('右对齐','Align right'))}${btn('at','at',tr('顶对齐','Align top'))}${btn('am','am',tr('垂直居中','Align middles'))}${btn('ab','ab',tr('底对齐','Align bottom'))}</div>
    <div class="lbl">${tr('分布 · 尺寸 · 变换','Distribute · size · transform')}</div>
    <div class="iconrow">${btn('dh','dh',tr('水平等距分布','Distribute horizontally'))}${btn('dv','dv',tr('垂直等距分布','Distribute vertically'))}${btn('match','size',tr('统一为主选中项的尺寸','Match size of the primary item'))}${btn('rotL','rotL',tr('整组逆时针 90°','Rotate group left'))}${btn('rotR','rotR',tr('整组顺时针 90°','Rotate group right'))}${btn('flip','flip',tr('镜像','Mirror'))}</div>
    <div class="actions">
      <button class="btn" data-act="lock">${ico(lockedAll ? 'unlock' : 'lock')}${lockedAll ? tr('解锁','Unlock') : tr('锁定','Lock')}</button>
      <button class="btn" data-act="dup">${ico('copy')}${tr('复制','Duplicate')}</button>
      <button class="btn" data-act="zoom">${ico('target')}${tr('定位','Zoom to')}</button>
      <button class="btn danger" data-act="del">${ico('trash')}${tr('删除','Delete')}</button>
      <button class="btn" data-act="home">${tr('取消选择','Deselect')}</button></div></section>
  <section><h3>${tr('选中项','Selection')}</h3>
    ${items.map(f => `<div class="irow ${f.id === ui.sel.id ? 'on' : ''}" data-focus="${f.id}"><span class="sw" style="background:${esc(f.color)}"></span><span class="nm">${f.locked ? ico('lock') + ' ' : ''}${esc(nm(f.name))}</span><small>${f.w}×${f.d}</small></div>`).join('')}
    <div class="muted note">${tr('高亮项为主选中项（统一尺寸的基准）。Shift+点击可增减选择。','The highlighted item is primary (used by Match size). Shift+click to add/remove.')}</div></section>`;
}

/* ======================= 风格方案：一键统一家具配色与地面 ======================= */
const STYLES = [
  {id:'natural', zh:'原木', en:'Natural Oak', soft:'#cdbfa8', wood:'#d9bf98', textile:'#e7dccd', pop:'#9db08a', floor:['wood', 'wood']},
  {id:'cream', zh:'奶油', en:'Cream', soft:'#efe3cf', wood:'#e8dcc6', textile:'#f5ecdc', pop:'#d9b99a', floor:['tile800', 'wood']},
  {id:'nordic', zh:'北欧', en:'Nordic', soft:'#c9d3da', wood:'#e2d3bc', textile:'#dfe6ea', pop:'#8fa8ba', floor:['wood', 'wood']},
  {id:'industrial', zh:'工业', en:'Industrial', soft:'#6b6b6e', wood:'#8a6f5a', textile:'#7b7f84', pop:'#c0623a', floor:['terrazzo', 'walnut']},
  {id:'chinese', zh:'新中式', en:'New Chinese', soft:'#c2ae93', wood:'#6b4f3a', textile:'#e8dfc8', pop:'#8a3b2e', floor:['marble', 'walnut']},
  {id:'morandi', zh:'莫兰迪', en:'Morandi', soft:'#a3b1a8', wood:'#cbbfb2', textile:'#c4b8c9', pop:'#b8a0a0', floor:['tile800', 'carpet']},
];
const SOFT_T = new Set(['sofa','cornersofa','beanbag','bed','baycushion','bench','chair','barstool','officechair']);
const WOOD_T = new Set(['wardrobe','cabinet','shoecab','dresser','desk','bookshelf','nightstand','coffeetable','tvstand','table','roundtable','sidetable','chest','crib']);
const BED_ROOMS = /master|child|kid|elder|bedroom|study|closet|bed/;
const LIVE_ROOMS = /living|dining|hall|studio/;
function styleFloorFor(room,settings,style){
  return FurnishDesign.styleFloor(room,settings,style,!!PLAN.customDraft);
}
function applyStyle(id){
  const st = STYLES.find(s => s.id === id); if (!st) return;
  mutate(() => {
    state.furniture.forEach(f => {
      if (f.type === 'armchair') f.color = st.pop;
      else if (SOFT_T.has(f.type)) f.color = st.soft;
      else if (WOOD_T.has(f.type)) f.color = st.wood;
      else if (f.type === 'rug' || f.type === 'curtain') f.color = st.textile;
    });
    ROOMS.forEach(r => {const material=styleFloorFor(r,state.rooms[r.id],st);if(material)state.rooms[r.id].mat=material;});
    state.style = id;
  });
  toast(tr(`已应用「${st.zh}」风格：家具配色与客厅 / 卧室地面已更新`, `Applied "${st.en}": furniture colors and living / bedroom floors updated`), {label:tr('撤销', 'Undo'), fn:undo});
}
const stylesHTML = () => `<div class="styles">${STYLES.map(s => `<button class="stcard ${state.style === s.id ? 'on' : ''}" data-style="${s.id}" title="${tr('应用风格', 'Apply style')}">
  <span class="stsw">${[s.soft, s.wood, s.textile, s.pop, MATS[s.floor[0]].sw].map(c => `<i style="background:${c}"></i>`).join('')}</span><b>${tr(s.zh, s.en)}</b></button>`).join('')}</div>`;

/* ======================= 命令面板（Ctrl+K） ======================= */
let cmdItems = [], cmdSel = 0;
function cmdSource(){
  // 中英文名都参与搜索，与当前界面语言无关（中文界面下也能搜 "sofa"）
  const EN = s => NAMES_EN[s] ?? s;
  const A = (icon, zh, en, run, key = '') => ({g:tr('命令', 'Actions'), icon, zh, en, run, key});
  const items = [
    A('box', '切换 2D / 3D', 'Toggle 2D / 3D', () => setView(is3D() ? '2d' : '3d'), 'T'),
    A('grid', '打开户型库', 'Open floor plan gallery', openPlans),
    A('reset', '重置…', 'Reset…', openReset),
    A('kbd', '快捷键与操作', 'Shortcuts & controls', openHelp, '?'),
    A('plus', '新建自定义家具', 'New custom item', openCustom),
    A('fit', '适应窗口', 'Fit to window', fitView, 'F'),
    A('cursor', '全选家具', 'Select all furniture', selectAll, 'Ctrl A'),
    A('marquee', '框选工具', 'Box select tool', () => setTool('marquee'), 'B'),
    A('ruler', '测量工具', 'Measure tool', () => setTool('measure'), 'M'),
    A('wall', '拆改墙体', 'Demolish walls', () => setTool('demolish'), 'X'),
    A('note', '文字标注', 'Text note tool', () => setTool('note'), 'N'),
    A(curTheme() === 'dark' ? 'sun' : 'moon', curTheme() === 'dark' ? '切换为亮色主题' : '切换为暗色主题', curTheme() === 'dark' ? 'Switch to light theme' : 'Switch to dark theme', () => setTheme(curTheme() === 'dark' ? 'light' : 'dark')),
    A('eye', ui.layers.furn ? '隐藏家具图层' : '显示家具图层', ui.layers.furn ? 'Hide furniture layer' : 'Show furniture layer', () => setLayer('furn', !ui.layers.furn)),
    A('warn', ui.layers.collide ? '关闭碰撞检查' : '开启碰撞检查', ui.layers.collide ? 'Turn off collision check' : 'Turn on collision check', () => setLayer('collide', !ui.layers.collide)),
    A('download', '导出图片', 'Export image', exportPNG), A('download', '导出报价清单 CSV', 'Export quote CSV', exportCSV),
    A('download', '导出方案 JSON', 'Export plan JSON', () => $('#exportJson').click()), A('file', '打印平面图', 'Print plan', () => window.print()),
    A('copy', '复制分享链接', 'Copy share link', () => $('#shareLink').click()), A('full', '全屏', 'Fullscreen', toggleFullscreen, 'Shift F'),
    A('trash', '清空布置', 'Clear layout', clearLayout),
  ];
  STYLES.forEach(s => items.push({g:tr('风格', 'Styles'), icon:'palette', zh:`应用风格：${s.zh}`, en:`Apply style: ${s.en}`, run:() => applyStyle(s.id)}));
  PLANS.forEach(p => items.push({g:tr('户型', 'Plans'), icon:'home', zh:`切换户型：${p.name}`, en:`Switch plan: ${p.en}`, run:() => setPlan(p.id), key:p.id === PLAN.id ? tr('当前', 'current') : ''}));
  ROOMS.forEach(r => items.push({g:tr('房间', 'Rooms'), icon:'target', zh:`定位房间：${state.rooms[r.id].name}`, en:`Go to room: ${EN(state.rooms[r.id].name)}`,
    run:() => { select({kind:'room', id:r.id}); if (is3D()) window.View3D.flyToRoom(r.id); else zoomToBox(bbox(r.poly), 400); }, key:`${fmt(area(r.poly), 1)} m²`}));
  libAll().forEach(c => c.items.forEach(it => items.push({g:tr('添加家具', 'Add furniture'), icon:'plus', zh:`添加：${it[1]}`, en:`Add: ${EN(it[1])}`, run:() => {
    const p = ui.sel?.kind === 'room' ? (b => ({x:(b[0]+b[2])/2, y:(b[1]+b[3])/2}))(bbox(ROOMS.find(r => r.id === ui.sel.id).poly))
      : is3D() ? (r => window.View3D.groundAt(r.left + r.width/2, r.top + r.height/2))($('#stage').getBoundingClientRect()) : null;
    addItem(it, p?.x ?? view.x0 + svg.clientWidth/2/view.s, p?.y ?? view.y0 + svg.clientHeight/2/view.s); }, key:`${it[2]}×${it[3]}`})));
  state.furniture.forEach(f => items.push({g:tr('已摆放', 'Placed'), icon:'target', zh:`定位：${f.name}`, en:`Locate: ${EN(f.name)}`, run:() => focusItem(f.id), key:`${f.w}×${f.d}`}));
  return items;
}
function openCmd(){
  closeCtx(); closeDialog();
  cmdItems = cmdSource(); $('#cmd').hidden = false;
  const inp = $('#cmdIn'); inp.value = ''; renderCmd(); inp.focus();
}
function closeCmd(){ $('#cmd').hidden = true; }
function renderCmd(){
  const q = $('#cmdIn').value.trim().toLowerCase(), words = q.split(/\s+/).filter(Boolean);
  const hay = it => (it.zh + ' ' + it.en + ' ' + s2t(it.zh)).toLowerCase();
  let list = cmdItems.map((it, i) => ({it, i, h:hay(it)})).filter(o => words.every(w => o.h.includes(w)));
  if (!q) list = list.filter(o => o.it.g === tr('命令', 'Actions') || o.it.g === tr('风格', 'Styles'));
  // 名称开头命中的排前面（如输入「沙发」时「添加：三人沙发」在「定位：…」之前不重要，开头匹配优先）
  list.sort((a, b) => (b.h.includes(':' + q) || b.h.includes('：' + q)) - (a.h.includes(':' + q) || a.h.includes('：' + q)) || a.i - b.i);
  list = list.slice(0, 80); cmdSel = Math.min(cmdSel, Math.max(0, list.length - 1));
  let g = '', s = '';
  list.forEach((o, n) => { if (o.it.g !== g){ g = o.it.g; s += `<div class="cmd-g">${esc(g)}</div>`; }
    s += `<button class="cmd-it ${n === cmdSel ? 'on' : ''}" data-ci="${o.i}" data-n="${n}" role="option">${ico(o.it.icon)}<span>${esc(tr(o.it.zh, o.it.en))}</span>${o.it.key ? `<kbd>${esc(o.it.key)}</kbd>` : ''}</button>`; });
  $('#cmdList').innerHTML = s || `<div class="cmd-empty">${tr('没有匹配的结果', 'No results')}</div>`;
  $('#cmdList .cmd-it.on')?.scrollIntoView({block:'nearest'});
}
function runCmd(i){ const it = cmdItems[i]; closeCmd(); if (it) it.run(); }
$('#cmdIn').addEventListener('input', () => { cmdSel = 0; renderCmd(); });
$('#cmdIn').addEventListener('keydown', e => {
  const n = $('#cmdList').querySelectorAll('.cmd-it').length;
  if (e.key === 'ArrowDown' || e.key === 'ArrowUp'){ e.preventDefault(); cmdSel = (cmdSel + (e.key === 'ArrowDown' ? 1 : -1) + n) % Math.max(1, n); renderCmd(); }
  else if (e.key === 'Enter'){ e.preventDefault(); const b = $('#cmdList .cmd-it.on'); if (b) runCmd(+b.dataset.ci); }
  else if (e.key === 'Escape'){ e.preventDefault(); closeCmd(); }
});
$('#cmdList').addEventListener('click', e => { const b = e.target.closest('.cmd-it'); if (b) runCmd(+b.dataset.ci); });
$('#cmdList').addEventListener('pointermove', e => { const b = e.target.closest('.cmd-it'); if (b && +b.dataset.n !== cmdSel){ cmdSel = +b.dataset.n; $('#cmdList .cmd-it.on')?.classList.remove('on'); b.classList.add('on'); } });
$('#cmd').addEventListener('pointerdown', e => { if (e.target.id === 'cmd') closeCmd(); });
$('#cmdBtn').onclick = () => openCmd();

/* ======================= 文字标注 ======================= */
const getNote = id => (state.notes || []).find(n => n.id === id);
function openNoteEditor(note, at){
  const cur = note || {text:'', color:'accent', size:1};
  openDialog({title:note ? tr('编辑标注', 'Edit note') : tr('添加标注', 'Add note'), body:`
    <div class="form"><label class="full">${tr('文字（最多 40 字）', 'Text (max 40 chars)')}<input id="nT" maxlength="40" value="${esc(cur.text)}" placeholder="${tr('如：此处预留插座 / 吊顶高度 2.6m', 'e.g. outlet here / ceiling 2.6m')}"></label></div>
    <div class="lbl">${tr('颜色', 'Color')}</div><div class="chiprow" id="nC">${Object.entries(NOTE_COLORS).map(([k, [bg]]) => `<button class="btn chip ${cur.color === k ? 'on' : ''}" data-c="${k}"><i class="ndot" style="background:${bg}"></i>${tr({accent:'朱红', teal:'青绿', ink:'墨色', paper:'纸白'}[k], {accent:'Vermilion', teal:'Teal', ink:'Ink', paper:'Paper'}[k])}</button>`).join('')}</div>
    <div class="lbl">${tr('字号', 'Size')}</div><div class="chiprow" id="nS">${[[0.8, '小', 'S'], [1, '中', 'M'], [1.4, '大', 'L']].map(([v, zh, en]) => `<button class="btn chip ${cur.size === v ? 'on' : ''}" data-s="${v}">${tr(zh, en)}</button>`).join('')}</div>`,
    onOpen:() => ['#nC', '#nS'].forEach(g => $(g).onclick = e => { const b = e.target.closest('.btn'); if (!b) return; $(g).querySelectorAll('.btn').forEach(x => x.classList.toggle('on', x === b)); }),
    actions:[...(note ? [{label:tr('删除', 'Delete'), cls:'danger left', fn:() => deleteNote(note.id)}] : []), {label:tr('取消', 'Cancel')},
      {label:tr('保存', 'Save'), cls:'primary', fn:() => {
        const text = $('#nT').value.trim(); if (!text){ toast(tr('请输入标注文字', 'Enter some text')); return false; }
        const color = $('#nC .on')?.dataset.c || 'accent', size = +($('#nS .on')?.dataset.s || 1);
        if (note) mutate(() => Object.assign(getNote(note.id), {text, color, size}));
        else { if((state.notes||[]).length>=2000){toast(tr('每个方案最多 2000 条文字标注。','Up to 2000 text notes per design.'));return false;}const n = {id:uid(), x:Math.round(at.x), y:Math.round(at.y), text, color, size}; mutate(() => (state.notes ||= []).push(n)); select({kind:'note', id:n.id}); }
      }}]});
}
function deleteNote(id){ ui.sel = null; mutate(() => state.notes = state.notes.filter(n => n.id !== id)); toast(tr('已删除标注', 'Note deleted'), {label:tr('撤销', 'Undo'), fn:undo}); }
function notePanel(n){
  return `<section><h3>${tr('文字标注', 'Note')}</h3>
    <div class="notecard" style="--nb:${NOTE_COLORS[n.color][0]};--nf:${NOTE_COLORS[n.color][1]}">${esc(n.text)}</div>
    <div class="muted desc">${tr('位置', 'Position')} X ${n.x} · Y ${n.y} mm · ${tr('拖动可移动，双击可编辑', 'drag to move, double-click to edit')}</div>
    <div class="actions"><button class="btn" data-act="editNote">${ico('note')}${tr('编辑', 'Edit')}</button>
      <button class="btn danger" data-act="delNote">${ico('trash')}${tr('删除', 'Delete')}</button>
      <button class="btn" data-act="home">${tr('← 返回总览', '← Back')}</button></div></section>`;
}

// 面板 / 浮动工具条 / 右键菜单共用的操作表
const ACT = {
  rotR:() => rotateSel(90), rotL:() => rotateSel(-90), flip:flipSel, lock:lockSel, dup:duplicateSel, del:deleteSel,
  copy:() => copySel(false), cut:() => copySel(true), paste:() => paste(ui.ctxAt), front:() => orderSel(true), toBack:() => orderSel(false),
  resetItem:resetItemSel, zoom:zoomSel, match:matchSizeSel, selAll:selectAll,
  spaceCheck:()=>{FurnishWorkspace.open('space');$('#space-run').click();},
  al:() => alignSel('l'), ac:() => alignSel('c'), ar:() => alignSel('r'), at:() => alignSel('t'), am:() => alignSel('m'), ab:() => alignSel('b'),
  dh:() => distributeSel('h'), dv:() => distributeSel('v'),
  home:() => select(null), done:() => { select(null); closeDrawers(); }, prop:() => drawer('panel', true),
  rescue:() => rescueOutside(), rescueOne:() => rescueOutside(selIds()), clash:() => { const ids = [...new Set(collisions().flat())]; selectIds(ids); if (ids.length) zoomSel(); },
  clearFurn:clearLayout, reset:() => openReset(), help:() => openHelp(), csv:exportCSV, custom:() => openCustom(), fit:() => fitView(),
  roomFurn:() => { const r = ROOMS.find(r => r.id === (ui.sel?.kind === 'room' ? ui.sel.id : ui.ctxRoom)); if (r) selectIds(state.furniture.filter(f => inPoly(f.cx, f.cy, r.poly)).map(f => f.id)); },
  roomSel:() => select({kind:'room', id:ui.ctxRoom}),
  defaults:() => { mutate(() => state.furniture = freshWork(PLAN).furniture); toast(tr('已恢复推荐布置', 'Recommended layout restored'), {label:tr('撤销', 'Undo'), fn:undo}); },
  cmd:() => openCmd(), plans:() => openPlans(), addNote:() => openNoteEditor(null, ui.ctxAt),
  editNote:() => { const n = getNote(ui.sel?.id); if (n) openNoteEditor(n); }, delNote:() => { if (ui.sel?.kind === 'note') deleteNote(ui.sel.id); },
  style:el => applyStyle(el.dataset.style),
  roomReset:() => { const id = ui.sel?.kind === 'room' && ui.sel.id, r = ROOMS.find(r => r.id === id); if (r) mutate(() => state.rooms[id] = {name:r.name, mat:r.mat,use:FurnishDesign.inferUse(r)}); },
};
function runAct(el){ const a = el.dataset.act; if (ACT[a]){ ACT[a](el); return true; } return false; }
// 事件委托：面板内容每次重绘，不必逐个绑定
$('#panel').addEventListener('click', e => {
  const t = e.target;
  const tab = t.closest('[data-tab]'); if (tab){ ui.tab = tab.dataset.tab; saveUI(); if (ui.sel) select(null); else renderPanel(); $('#panel').scrollTop = 0; return; }
  const lk = t.closest('[data-lockid]'); if (lk){ e.stopPropagation(); const f = getF(lk.dataset.lockid); if (f) mutate(() => { if (f.locked) delete f.locked; else f.locked = true; }); return; }
  const act = t.closest('[data-act]'); if (act){ runAct(act); return; }
  const st = t.closest('[data-style]'); if (st){ applyStyle(st.dataset.style); return; }
  const fo = t.closest('[data-focus]'); if (fo) focusItem(fo.dataset.focus);
});
$('#fab').addEventListener('click', e => { const b = e.target.closest('[data-act]'); if (b) runAct(b); });
$('#emptyHint').addEventListener('click', e => { const b = e.target.closest('[data-act]'); if (b) runAct(b); });

/* 门窗属性：门可换开启方向 / 铰链侧（写入 state.open，随方案保存并同步 3D）；窗可调窗台高 */
function openingPanel(sel){
  const isDoor = sel.kind === 'door';
  const d = isDoor ? DOORS[sel.id] : SLIDES[sel.id];
  const [x0,y0,x1,y1] = d.rect, w = Math.max(x1-x0, y1-y0);
  return `<section><h3>${isDoor ? tr('平开门','Swing Door') : tr('推拉门','Sliding Door')}</h3>
    <div class="stats">
      <div><small>${tr('名称','Name')}</small><span class="val">${esc(nm(d.name || (isDoor ? '门' : '推拉门')))}</span></div>
      <div><small>${tr('洞口宽','Opening width')}</small><span class="big">${w}</span> mm</div></div>
    ${isDoor ? `<div class="actions">
      <button class="btn" id="oFlip">${tr('换开启方向','Flip swing')}</button>
      <button class="btn" id="oHinge">${tr('换铰链侧','Swap hinge')}</button>
      <button class="btn" id="oReset">${tr('重置','Reset')}</button></div>
    <div class="muted desc">${tr('调整会同步到 3D 场景与漫游碰撞，随方案自动保存，可撤销。','Changes sync to 3D and walk collision; autosaved and undoable.')}</div>` : ''}
    <div class="actions"><button class="btn" id="oback">${tr('← 返回总览','← Back')}</button></div></section>`;
}
function bindOpeningPanel(sel){
  const upd = fn => mutate(() => { state.open.d = state.open.d || {}; fn(state.open.d); });
  if (sel.kind === 'door'){
    $('#oFlip').onclick = () => upd(o => { const d = DOORS[sel.id];
      o[sel.id] = {h:[...d.h], c:[...d.c], o:[-d.o[0], -d.o[1]]}; });
    $('#oHinge').onclick = () => upd(o => { const d = DOORS[sel.id], [x0,y0,x1,y1] = d.rect;
      const long = (x1-x0) >= (y1-y0);
      const nh = long ? [d.h[0] === x0 ? x1 : x0, d.h[1]] : [d.h[0], d.h[1] === y0 ? y1 : y0];
      o[sel.id] = {h:nh, c:[-d.c[0], -d.c[1]], o:[...d.o]}; });
    $('#oReset').onclick = () => upd(o => { delete o[sel.id]; });
  }
  $('#oback').onclick = () => select(null);
}
function winPanel(i){
 const w=WINS[i],width=Math.round(Math.max(w.rect[2]-w.rect[0],w.rect[3]-w.rect[1])),height=Math.round(((w.head??2.4)-w.sill)*1000);
 return `<section><h3>窗尺寸</h3><p>窗宽 ${width} mm · 窗高 ${height} mm</p><div class="form"><label class="full">窗台高 mm<input type="number" id="wSill" min="0" max="2400" step="1" value="${Math.round(w.sill*1000)}"></label><label class="full">窗高 mm<input type="number" id="wHeight" min="100" max="2800" step="1" value="${height}"></label></div><p>${w.bayGroup?'同一飘窗的三面窗与窗台高度同步调整。':''}内置布局窗宽按预设图纸定义；导入自定义户型可编辑窗宽。</p><p id="wError" role="alert"></p><div class="actions"><button class="btn primary" id="wApply">应用尺寸</button><button class="btn" id="wReset">重置</button><button class="btn" id="wback">返回总览</button></div></section>`;
}
function bindWinPanel(i){
 $('#wApply').onclick=()=>{const sill=Number($('#wSill').value)/1000,height=Number($('#wHeight').value)/1000;if(!Number.isFinite(sill)||!Number.isFinite(height)||sill<0||sill>2.4||height<.1||sill+height>2.8){$('#wError').textContent='窗高至少100 mm，窗顶不得超过2800 mm';return;}mutate(()=>{state.open.w=state.open.w||{};const group=WINS[i].bayGroup;WINS.forEach((w,j)=>{if(j===i||group&&w.bayGroup===group)state.open.w[j]={sill,head:sill+height};});});};
 $('#wReset').onclick=()=>mutate(()=>{state.open.w=state.open.w||{};const group=WINS[i].bayGroup;WINS.forEach((w,j)=>{if(j===i||group&&w.bayGroup===group)delete state.open.w[j];});});$('#wback').onclick=()=>select(null);
}

/* ======================= 选择（支持多选） ======================= */
// ui.sel = {kind:'furn', id:主选中, ids:[全部选中]}；单选时 ids 可省略
const selIds = () => ui.sel?.kind === 'furn' ? (ui.sel.ids || [ui.sel.id]) : [];
const selItems = () => selIds().map(getF).filter(Boolean);
function select(sel){ ui.sel = sel; closeCtx(); renderSel(); renderPanel(); updateHeader(); }
function selectIds(ids, primary){
  ids = [...new Set(ids)].filter(id => getF(id));
  select(ids.length ? {kind:'furn', id:ids.includes(primary) ? primary : ids[ids.length-1], ids} : null);
}
function toggleSel(id){ const ids = selIds(); selectIds(ids.includes(id) ? ids.filter(x => x !== id) : [...ids, id]); }
function selectAll(){ selectIds(state.furniture.map(f => f.id)); }
// 锁定的家具不参与移动 / 旋转 / 删除等操作
function movable(items){
  const n = items.filter(f => f.locked).length;
  if (n) toast(tr(`${n} 件家具已锁定，未作修改（L 解锁）`, `${n} locked item(s) left unchanged (L to unlock)`));
  return items.filter(f => !f.locked);
}

/* ======================= 编辑操作 ======================= */
function rotateSel(d){
  const items = movable(selItems()); if (!items.length) return;
  mutate(() => {
    if (items.length === 1){ items[0].rot = norm(items[0].rot + d); return; }
    // 多选：整组绕外包盒中心旋转
    const [x0,y0,x1,y1] = groupBox(items), cx = (x0+x1)/2, cy = (y0+y1)/2, a = d*Math.PI/180, c = Math.cos(a), s = Math.sin(a);
    items.forEach(f => { const dx = f.cx-cx, dy = f.cy-cy; f.cx = Math.round(cx + dx*c - dy*s); f.cy = Math.round(cy + dx*s + dy*c); f.rot = norm(f.rot + d); });
  });
}
function deleteSel(){
  if (ui.sel?.kind === 'note') return deleteNote(ui.sel.id);
  const all = selItems(); if (!all.length) return;
  const items = movable(all); if (!items.length) return;
  const ids = new Set(items.map(f => f.id));
  ui.sel = null; mutate(() => state.furniture = state.furniture.filter(f => !ids.has(f.id)));
  toast(items.length === 1 ? tr(`已删除「${nm(items[0].name)}」`, `Deleted "${nm(items[0].name)}"`) : tr(`已删除 ${items.length} 件家具`, `Deleted ${items.length} items`),
    {label:tr('撤销', 'Undo'), fn:undo});
}
function flipSel(){ const items = movable(selItems()); if (items.length) mutate(() => items.forEach(f => { if (f.flip) delete f.flip; else f.flip = true; })); }
function lockSel(){
  const items = selItems(); if (!items.length) return;
  const lock = !items.every(f => f.locked);
  mutate(() => items.forEach(f => { if (lock) f.locked = true; else delete f.locked; }));
  toast(lock ? tr('已锁定：不会被误拖动或删除', 'Locked: protected from moves and deletes') : tr('已解锁', 'Unlocked'));
}
function orderSel(top){
  const ids = new Set(selIds()); if (!ids.size) return;
  mutate(() => { const a = state.furniture.filter(f => ids.has(f.id)), b = state.furniture.filter(f => !ids.has(f.id)); state.furniture = top ? [...b, ...a] : [...a, ...b]; });
}
// 恢复库中默认尺寸与颜色（自定义家具按「我的家具」中的定义）
function resetItemSel(){
  const items=movable(selItems());if(!items.length)return;
  let values;try{values=items.map(f=>{const it=libItem(f);return it?{f,value:{...FurnishDesign.resizeFurniture(f,{w:it[2],d:it[3],...(it[6]!==undefined?{h:it[6]}:{})}),color:it[4]}}:null;}).filter(Boolean);}catch(e){return toast(e.message);}
  if(!values.length)return toast(tr('找不到明确的原始规格，请在家具资料中手动编辑。','Original specifications unavailable; edit the product manually.'));
  mutate(()=>values.forEach(({f,value})=>{Object.assign(f,value);delete f.flip;delete f.price;}));
  toast(tr('已恢复默认尺寸、颜色与参考价格'+(values.length<items.length?'；来源不明确的家具已跳过。':''),'Default specifications restored; unresolved sources skipped.'));
}
// 对齐 / 分布 / 等尺寸（多选）：以外包盒为准，锁定的家具作为参照不动
function alignSel(mode){
  const all = selItems(); if (all.length < 2) return toast(tr('请先选择至少 2 件家具', 'Select at least 2 items first'));
  const items = movable(all), [x0,y0,x1,y1] = groupBox(all);
  mutate(() => items.forEach(f => { const {hw, hh} = aabb(f);
    if (mode === 'l') f.cx = x0 + hw; if (mode === 'r') f.cx = x1 - hw; if (mode === 'c') f.cx = (x0+x1)/2;
    if (mode === 't') f.cy = y0 + hh; if (mode === 'b') f.cy = y1 - hh; if (mode === 'm') f.cy = (y0+y1)/2;
    f.cx = Math.round(f.cx); f.cy = Math.round(f.cy); }));
}
function distributeSel(axis){
  const all = selItems(); if (all.length < 3) return toast(tr('等距分布需要至少 3 件家具', 'Distribute needs at least 3 items'));
  const h = axis === 'h', key = f => h ? f.cx - aabb(f).hw : f.cy - aabb(f).hh, size = f => h ? 2*aabb(f).hw : 2*aabb(f).hh;
  const items = [...all].sort((a, b) => key(a) - key(b)), first = items[0], last = items[items.length-1];
  const gap = (key(last) + size(last) - key(first) - items.reduce((a, f) => a + size(f), 0)) / (items.length - 1);
  if (items.some(f => f.locked)) return toast(tr('含锁定家具，无法分布', 'Cannot distribute locked items'));
  mutate(() => { let p = key(first);
    items.forEach(f => { const s = size(f); if (h) f.cx = Math.round(p + s/2); else f.cy = Math.round(p + s/2); p += s + gap; }); });
}
function matchSizeSel(){
  const main = getF(ui.sel?.id), items = movable(selItems()).filter(f => f !== main);
  if (!main || !items.length) return;
  let values;try{values=items.map(f=>FurnishDesign.resizeFurniture(f,{w:main.w,d:main.d}));}catch(e){return toast(e.message);}
  mutate(() => items.forEach((f,i) => Object.assign(f,values[i])));
  toast(tr(`已统一为 ${main.w} × ${main.d}`, `Matched to ${main.w} × ${main.d}`));
}
// 剪贴板：复制时记录相对整组中心的位置，粘贴到指针处（或在原位置偏移）
let clip = null;
function syncCutClipboard(){if(clip?.cut&&clip.movePlan===PLAN.id)clip.cutMoved=clip.items.some(f=>getF(f.id));}
function copySel(cut, quiet){
  const selected=selItems(),items=cut?selected.filter(f=>!f.locked):selected;if(!items.length){if(cut)movable(selected);return;}
  const [x0,y0,x1,y1] = groupBox(items);
  clip = {cx:(x0+x1)/2, cy:(y0+y1)/2, items:JSON.parse(JSON.stringify(items)),cut:!!cut};
  if (cut) deleteSel(); else if (!quiet) toast(tr(`已复制 ${items.length} 件 · Ctrl+V 粘贴`, `Copied ${items.length} · Ctrl+V to paste`));
}
function paste(at){
  if (!clip) return toast(tr('剪贴板为空：先选中家具按 Ctrl+C', 'Clipboard is empty — select items and press Ctrl+C'));
  const step=(clip.pastes||0)+1,p=at||{x:clip.cx+300*step,y:clip.cy+300*step};
  let result;try{result=FurnishDesign.pasteFurniture(clip,p,BOUNDS,uid,2000-state.furniture.length,state.furniture.map(f=>f.id));}catch(e){return toast(e.message);}
  const news=result.items;
  mutate(() => state.furniture.push(...news));
  if(clip.cut)clip.cutMoved=true;if(result.moved)clip.movePlan=PLAN.id;
  if(!at)clip.pastes=step;
  selectIds(news.map(f => f.id));
  const pasted=result.moved?tr('已移动家具，保留原编号和采购进度。','Furniture moved; identity and purchase progress retained.'):tr('已添加家具副本，采购状态为待选型。','Copies added with planned purchase status.');
  if(result.oversized)toast(pasted+' '+tr('整组尺寸超出户型范围，已保留相对位置；请缩小尺寸或拆分布置。','The group exceeds plan bounds; its layout was preserved. Resize or split the group.'));
  else if(result.adjusted)toast(pasted+' '+tr('已将整组移入户型范围，保留相对位置；请核对墙体和房间边界。','Group moved within plan bounds without changing its layout; check walls and room boundaries.'));
  else toast(pasted);
}
function duplicateSel(){ if (!selIds().length) return; const keep = clip; copySel(false, true); paste(); clip = keep; }
function zoomToBox([x0,y0,x1,y1], pad = 700){
  if (is3D()) return;
  const W = svg.clientWidth, H = svg.clientHeight, w = x1-x0+2*pad, h = y1-y0+2*pad;
  view.s = Math.max(.012, Math.min(.4, Math.min(W/w, H/h)));
  view.x0 = (x0+x1)/2 - W/2/view.s; view.y0 = (y0+y1)/2 - H/2/view.s; applyView();
}
function zoomSel(){
  const items = selItems();
  if (items.length) return zoomToBox(groupBox(items));
  if (ui.sel?.kind === 'room') return zoomToBox(bbox(ROOMS.find(r => r.id === ui.sel.id).poly), 400);
  fitView();
}
function focusItem(id){
  const f = getF(id); if (!f) return;
  selectIds([id]);
  if (is3D()){ const r = roomAt(f.cx, f.cy); if (r) window.View3D.flyToRoom(r.id); }
  else zoomToBox(groupBox([f]), 1800);
}
// 把在户型外的家具移回：放到最大房间中央再推离墙体
function rescueOutside(ids){
  const lost = state.furniture.filter(f => (ids ? ids.includes(f.id) : true) && isOutside(f));
  if (!lost.length) return toast(tr('没有在户型外的家具', 'No furniture outside the plan'));
  const home = ROOMS.filter(r => r.counted !== false).sort((a, b) => area(b.poly) - area(a.poly))[0], [x0,y0,x1,y1] = bbox(home.poly);
  mutate(() => lost.forEach((f, i) => { f.cx = Math.round((x0+x1)/2 + (i % 4)*150); f.cy = Math.round((y0+y1)/2 + Math.floor(i/4)*150); pushOut(f); }));
  selectIds(lost.map(f => f.id));
  toast(tr(`已将 ${lost.length} 件家具移回「${nm(state.rooms[home.id].name)}」`, `Moved ${lost.length} item(s) back into "${nm(state.rooms[home.id].name)}"`));
}

// 放下 / 拖完的家具若压在墙 / 窗上，沿位移最小的方向推出，刚好贴墙。
// 只在家具中心原本所在的房间内推移，推不开（如家具比房间还大）就保持原位——宁可压墙，也不能被推到墙外「消失」
function pushOut(f){
  const ox = f.cx, oy = f.cy, home = roomAt(ox, oy);
  const okAt = (x, y) => home ? inPoly(x, y, home.poly) : !!roomAt(x, y);
  for (let n = 0; n < 6; n++){
    const {hw, hh} = aabb(f);
    let worst = null, wa = 1;
    for (const r of snapRects()){
      const ix = Math.min(f.cx+hw, r[2]) - Math.max(f.cx-hw, r[0]), iy = Math.min(f.cy+hh, r[3]) - Math.max(f.cy-hh, r[1]);
      if (ix > 1 && iy > 1 && ix*iy > wa){ wa = ix*iy; worst = r; }
    }
    if (!worst) return true;
    const r = worst, best = [[r[0]-hw, f.cy], [r[2]+hw, f.cy], [f.cx, r[1]-hh], [f.cx, r[3]+hh]]
      .filter(([x, y]) => okAt(x, y))
      .sort((p, q) => Math.hypot(p[0]-f.cx, p[1]-f.cy) - Math.hypot(q[0]-f.cx, q[1]-f.cy))[0];
    if (!best) break;
    f.cx = Math.round(best[0]); f.cy = Math.round(best[1]);
  }
  if (Math.hypot(f.cx-ox, f.cy-oy) > Math.max(f.w, f.d)){ f.cx = ox; f.cy = oy; }   // 推得太远 = 不合理，撤回
  return false;
}
function addItem(it, x, y){
  if(state.furniture.length>=2000)return toast(tr('每个方案最多 2000 件家具。','Up to 2000 furniture items per design.'));
  const [type,name,w,d,color,price,h] = it, f = F(type,name,Math.round(x/10)*10,Math.round(y/10)*10,w,d,0,color);
  if (type === 'custom' || type === 'customround'){ f.price = price; f.h = h; }   // 自定义家具删除定义后仍保留单价与高度
  if(it[7]){const c=store.custom?.find(c=>c.id===it[7]);if(c)Object.assign(f,{catalogId:c.id,catalogSnapshot:FurnishDesign.catalogSnapshot(c),brand:c.brand||'',model:c.model||'',sourceUrl:c.sourceUrl||'',priceDate:c.priceDate||'',frontClearance:c.frontClearance??600,purchaseStatus:'planned',purchaseNote:c.purchaseNote||'',...(c.obj?{obj:JSON.parse(JSON.stringify(c.obj))}:{})});}
  pushOut(f);
  mutate(() => state.furniture.push(f));
  selectIds([f.id]);
  pushRecent(it);
  toast(tr(`已添加「${name}」${w}×${d}`, `Added "${nm(name)}" ${w}×${d}`), {label:tr('撤销', 'Undo'), fn:undo});
}
function toggleWall(id){
  if(state.architecture)return window.FurnishWorkspace.demolish(id);
  const w = WALLS[+id.slice(1)];
  if (w[4]==='b') return toast(tr('承重墙（黑色）不可拆除', 'Load-bearing walls (black) cannot be removed'));
  if (w[4]==='e') return toast(tr('外墙属于建筑外围护结构，不建议拆除', 'Exterior walls are part of the building envelope and should not be removed'));
  const on = state.demolished.includes(id);
  mutate(() => state.demolished = on ? state.demolished.filter(x => x!==id) : [...state.demolished, id]);
  toast(on ? tr('已恢复墙体', 'Wall restored') : tr(`已标记拆除 ${Math.max(w[2]-w[0], w[3]-w[1])} mm 墙体`, `Marked ${Math.max(w[2]-w[0], w[3]-w[1])} mm of wall for removal`));
}

function setTool(t){
  ui.tool = t; ui.mA = null; ui.mCur = null;
  svg.setAttribute('class', 'tool-' + t);
  document.querySelectorAll('#tools .btn').forEach(b => b.classList.toggle('on', b.dataset.tool === t));
  syncModeHint();
  renderMeasure();
}
function syncModeHint(){
  const hints = {select:'',
    marquee:COARSE ? tr('拖出矩形框选多件家具 · 点家具可直接拖动 · 点「选择」退出', 'Drag a box to select several items · drag an item to move it · tap "Select" to exit')
      : tr('拖出矩形框选家具 · Shift 追加 · 拖动已选家具可整组移动 · Esc 退出', 'Drag a box to select · Shift adds · drag a selected item to move the group · Esc exits'),
    measure:COARSE ? tr('按住拖出测量线，或依次点两点 · 靠近墙面自动吸附 · 点「选择」退出', 'Hold and drag a line, or tap two points · snaps to walls · tap "Select" to exit')
      : tr('点击两点（或按住拖动）测量距离 · 靠近墙面自动吸附 · Shift 锁定水平/垂直 · Esc 取消', 'Click two points (or drag) to measure · snaps to walls · Shift locks horizontal/vertical · Esc cancels'),
    note:tr('点击平面图任意位置添加文字标注 · 点已有标注可编辑 · 选择工具下可拖动', 'Click anywhere on the plan to add a note · click a note to edit it · drag notes with the Select tool'),
    demolish:tr('点击灰色非承重墙标记拆除，再次点击恢复 · 黑色承重墙不可拆', 'Click a grey non-bearing wall to remove it, click again to restore · black bearing walls cannot be removed')};
  const h = $('#modehint'); h.textContent = hints[ui.tool]; h.classList.toggle('show', !!hints[ui.tool]);
}

/* ======================= 视图 ======================= */
// 滚轮 / 平移 / 双指缩放每帧可能触发多次事件，合并到下一帧只刷新一次
let viewRaf = 0;
const stageEl = $('#stage');
function queueView(){ if (!viewRaf) viewRaf = requestAnimationFrame(() => { viewRaf = 0; applyView(); }); }
function applyView(){
  if (viewRaf){ cancelAnimationFrame(viewRaf); viewRaf = 0; }
  const W = svg.clientWidth, H = svg.clientHeight;
  svg.setAttribute('viewBox', `${view.x0} ${view.y0} ${W/view.s} ${H/view.s}`);
  const ratio = 1/(view.s*PX_MM);
  $('#ratio').textContent = $('#hudRatio').textContent = '1:' + Math.round(ratio);
  const nice = [100,200,500,1000,2000,5000].find(v => v*view.s >= 60) || 5000;
  $('#sbBar').style.width = nice*view.s + 'px';
  $('#sbText').textContent = nice >= 1000 ? `${nice/1000} m` : `${nice} mm`;
  // 画布点阵与平面坐标对齐（1 m 一点，过密 / 过疏时按 2 倍调整），平移缩放时一起移动
  let gs = 1000*view.s; while (gs < 16) gs *= 2; while (gs > 64) gs /= 2;
  const off = v => (((-v*view.s) % gs) + gs) % gs + 'px';
  stageEl.style.setProperty('--gs', gs + 'px'); stageEl.style.setProperty('--gx', off(view.x0)); stageEl.style.setProperty('--gy', off(view.y0));
  renderSel(); renderMeasure();
}
function fitView(){
  const W = svg.clientWidth, H = svg.clientHeight;
  view.s = Math.min(W/BOUNDS.w, H/BOUNDS.h);
  view.x0 = BOUNDS.x - (W/view.s - BOUNDS.w)/2; view.y0 = BOUNDS.y - (H/view.s - BOUNDS.h)/2;
  applyView();
}
function zoomAt(ns, mx, my){
  ns = Math.max(.012, Math.min(2, ns));
  const px = view.x0 + mx/view.s, py = view.y0 + my/view.s;
  view.s = ns; view.x0 = px - mx/ns; view.y0 = py - my/ns; queueView();
}
const zoomCenter = k => zoomAt(view.s*k, svg.clientWidth/2, svg.clientHeight/2);
const setRatio = r => zoomAt(1/(r*PX_MM), svg.clientWidth/2, svg.clientHeight/2);

function toMM(e){
  const pt = svg.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY;
  return pt.matrixTransform(svg.getScreenCTM().inverse());
}

/* ======================= 吸附 ======================= */
// 移动吸附：网格步长 → 贴墙 → 对齐其他家具的边缘 / 中线（取最近者），并记录要画的参考线
function snapMove(f, cx, cy, skip){
  const st = ui.grid; let nx = Math.round(cx/st)*st, ny = Math.round(cy/st)*st;
  const {hw, hh} = aabb(f), tol = 10/view.s;
  let bx = tol, by = tol, gx = null, gy = null;
  if (ui.layers.wallSnap) for (const r of snapRects()){
    if (!(r[3] < cy-hh-tol || r[1] > cy+hh+tol)) for (const ex of [r[0], r[2]]) for (const c of [ex+hw, ex-hw]) if (Math.abs(c-cx) < bx){ bx = Math.abs(c-cx); nx = c; }
    if (!(r[2] < cx-hw-tol || r[0] > cx+hw+tol)) for (const ey of [r[1], r[3]]) for (const c of [ey+hh, ey-hh]) if (Math.abs(c-cy) < by){ by = Math.abs(c-cy); ny = c; }
  }
  if (ui.layers.guides) for (const o of state.furniture){
    if (o.id === f.id || skip?.has(o.id) || Math.abs(o.cx - cx) > 6000 || Math.abs(o.cy - cy) > 6000) continue;   // 只与附近家具对齐
    const B = aabb(o);
    for (const v of [o.cx-B.hw, o.cx, o.cx+B.hw]) for (const m of [-hw, 0, hw]){ const c = v - m; if (Math.abs(c-cx) < bx){ bx = Math.abs(c-cx); nx = c; gx = {x:v, o, B}; } }
    for (const v of [o.cy-B.hh, o.cy, o.cy+B.hh]) for (const m of [-hh, 0, hh]){ const c = v - m; if (Math.abs(c-cy) < by){ by = Math.abs(c-cy); ny = c; gy = {y:v, o, B}; } }
  }
  ui.guides = [];
  if (gx) ui.guides.push({v:true, x:gx.x, a:Math.min(ny-hh, gx.o.cy-gx.B.hh) - 150, b:Math.max(ny+hh, gx.o.cy+gx.B.hh) + 150});
  if (gy) ui.guides.push({v:false, y:gy.y, a:Math.min(nx-hw, gy.o.cx-gy.B.hw) - 150, b:Math.max(nx+hw, gy.o.cx+gy.B.hw) + 150});
  return [Math.round(nx), Math.round(ny)];
}
function snapPoint(p, shift){
  let x = Math.round(p.x/10)*10, y = Math.round(p.y/10)*10;
  const tol = 8/view.s; let bx = tol, by = tol;
  for (const r of snapRects()){
    for (const ex of [r[0], r[2]]) if (Math.abs(ex-p.x) < bx){ bx = Math.abs(ex-p.x); x = ex; }
    for (const ey of [r[1], r[3]]) if (Math.abs(ey-p.y) < by){ by = Math.abs(ey-p.y); y = ey; }
  }
  if (shift && ui.mA){ if (Math.abs(x-ui.mA.x) > Math.abs(y-ui.mA.y)) y = ui.mA.y; else x = ui.mA.x; }
  return {x, y};
}

/* ======================= 指针交互 ======================= */
let drag = null, pinch = null;
const cxEl = $('#cx'), cyEl = $('#cy'), hoverEl = $('#hover');
let hoverRoom = '';
const setText = (el, s) => { if (el.textContent !== s) el.textContent = s; };
const touches = new Map();                     // 当前按在平面图上的手指
const svgXY = (x, y) => { const r = svg.getBoundingClientRect(); return [x - r.left, y - r.top]; };
function pinchInfo(){
  const [a, b] = [...touches.values()];
  return {d:Math.max(1, Math.hypot(b.x-a.x, b.y-a.y)), c:svgXY((a.x+b.x)/2, (a.y+b.y)/2)};
}
// 结束当前拖动：移动过的家具记入撤销栈
let lpT = 0, spaceDown = false;
function endDrag(cancel){
  clearTimeout(lpT);
  const d = drag; drag = null; svg.classList.remove('panning');
  if (!d) return;
  if (d.kind === 'measure'){
    if (cancel){ ui.mA = ui.mCur = null; renderMeasure(); return; }
    if (d.moved && ui.mA && ui.mCur && Math.hypot(ui.mCur.x-ui.mA.x, ui.mCur.y-ui.mA.y) > 20){
      const a = ui.mA, b = ui.mCur; ui.mA = ui.mCur = null; mutate(() => state.measures.push({a, b}));
    }
    renderMeasure(); return;                   // 没拖动：保留起点，等第二次点击
  }
  if (d.kind === 'marq'){
    const m = ui.marq; ui.marq = null;
    if (cancel || !d.moved || !m){ if (!cancel && !d.add) select(null); else renderSel(); return; }
    const x0 = Math.min(m[0].x, m[1].x), x1 = Math.max(m[0].x, m[1].x), y0 = Math.min(m[0].y, m[1].y), y1 = Math.max(m[0].y, m[1].y);
    const hit = ui.layers.furn ? state.furniture.filter(f => { const {hw, hh} = aabb(f); return f.cx+hw > x0 && f.cx-hw < x1 && f.cy+hh > y0 && f.cy-hh < y1; }).map(f => f.id) : [];
    selectIds(d.add ? [...d.base, ...hit] : hit);
    return;
  }
  if (d.kind === 'pan'){
    if (!cancel && !d.moved && !d.quiet && ui.tool !== 'measure') select(d.room ? {kind:'room', id:d.room} : (d.keep ? ui.sel : null));
    return;
  }
  if (d.kind === 'locked') return;
  if (d.kind === 'note'){ if (d.moved){ commit(d.before); renderAll(); } return; }
  if (d.moved){
    if (d.kind !== 'move' || d.ids.length === 1){   // 单件拖完自动推离墙体（与新增家具同一规则）；整组移动保持队形
      const f = getF(d.id);
      if (f){ const ox = f.cx, oy = f.cy; pushOut(f); if (Math.hypot(f.cx-ox, f.cy-oy) > 60) toast(tr('已自动避开墙体', 'Moved off the wall automatically')); }
    }
    commit(d.before); renderAll();
  }
}
// 触屏长按：弹出与右键相同的操作菜单
function startLongPress(e){
  clearTimeout(lpT);
  const x = e.clientX, y = e.clientY, target = e.target;
  lpT = setTimeout(() => { if (drag && !drag.moved && !pinch){ drag = null; navigator.vibrate?.(12); openCtx(x, y, target); } }, 550);
}

svg.addEventListener('pointerdown', e => {
  if (e.button === 2) return;
  closeCtx(); closeDrawers(); document.querySelectorAll('details.menu').forEach(m => m.open = false);
  if (e.pointerType !== 'mouse'){
    touches.set(e.pointerId, {x:e.clientX, y:e.clientY});
    svg.setPointerCapture(e.pointerId);
    if (touches.size >= 2){                    // 第二根手指落下：取消单指操作，进入双指缩放 / 平移
      clearTimeout(lpT);
      endDrag(drag?.kind === 'measure' || drag?.kind === 'pan' || drag?.kind === 'marq');
      const {d, c} = pinchInfo();
      pinch = {d, c, s:view.s, px:view.x0 + c[0]/view.s, py:view.y0 + c[1]/view.s};
      return;
    }
  }
  if (pinch) return;
  const p = toMM(e), t = e.target, base = {sx:e.clientX, sy:e.clientY, moved:false};
  // 中键或按住空格：任何工具下都直接平移画面
  if (e.button === 1 || spaceDown){ e.preventDefault(); drag = {kind:'pan', ...base, x0:view.x0, y0:view.y0, quiet:true}; svg.setPointerCapture(e.pointerId); return; }
  if (ui.tool === 'measure'){
    const q = snapPoint(p, e.shiftKey);
    if (!ui.mA){ ui.mA = q; ui.mCur = q; drag = {kind:'measure', ...base}; svg.setPointerCapture(e.pointerId); }
    else { const a = ui.mA; ui.mA = null; ui.mCur = null; if (Math.hypot(q.x-a.x, q.y-a.y) > 20) mutate(() => state.measures.push({a, b:q})); }
    renderMeasure(); return;
  }
  if (ui.tool === 'note'){                     // 标注工具：点已有标注编辑，点空白处新建
    const ne = t.closest('[data-note]');
    if (ne){ select({kind:'note', id:ne.dataset.note}); openNoteEditor(getNote(ne.dataset.note)); }
    else openNoteEditor(null, p);
    return;
  }
  const h = t.closest('[data-handle]'), fEl = ui.layers.furn && t.closest('[data-fid]'), picking = ui.tool === 'select' || ui.tool === 'marquee';
  const nEl = ui.layers.notes && t.closest('[data-note]');
  if (h && selIds().length === 1){
    drag = {kind:h.dataset.handle, id:selIds()[0], ...base, before:snap()};
  } else if (ui.tool === 'demolish' && t.closest('[data-wall]')){
    toggleWall(t.closest('[data-wall]').dataset.wall); return;
  } else if (picking && nEl){
    const n = getNote(nEl.dataset.note); select({kind:'note', id:n.id});
    drag = {kind:'note', id:n.id, ...base, ox:p.x-n.x, oy:p.y-n.y, before:snap()};
  } else if (picking && fEl){
    const id = fEl.dataset.fid;
    if (e.shiftKey || e.metaKey || e.ctrlKey){ toggleSel(id); return; }       // 修饰键 + 点击：加入 / 移出选择
    if (!selIds().includes(id)) selectIds([id]); else if (ui.sel.id !== id) selectIds(selIds(), id);
    const items = selItems(), f = getF(id);
    drag = items.some(g => g.locked) ? {kind:'locked', ...base}
      : {kind:'move', id, ids:items.map(g => g.id), start:Object.fromEntries(items.map(g => [g.id, [g.cx, g.cy]])), ...base, ox:p.x-f.cx, oy:p.y-f.cy, before:snap()};
    if (e.pointerType !== 'mouse') startLongPress(e);
  } else if (ui.tool === 'select' && t.closest('[data-door],[data-slide],[data-win]')){
    const de = t.closest('[data-door]'), se = t.closest('[data-slide]'), we = t.closest('[data-win]');
    select(de ? {kind:'door', id:+de.dataset.door} : se ? {kind:'slide', id:+se.dataset.slide} : {kind:'win', id:+we.dataset.win});
    drag = {kind:'pan', ...base, x0:view.x0, y0:view.y0, keep:true};   // 选中后仍可直接拖动画布
  } else if (ui.tool === 'select' && t.closest('[data-wall]')){
    const id=t.closest('[data-wall]').dataset.wall,ref=PLAN.wallRefs?.[Number(id.slice(1))];const wallIds=ref?(e.shiftKey&&ui.sel?.kind==='wall'?[...new Set([...(ui.sel.wallIds||[]),ref])]:[ref]):[];select({kind:'wall',id,wallIds}); return;
  } else if (ui.tool === 'marquee' || (ui.tool === 'select' && e.shiftKey && e.pointerType === 'mouse')){
    drag = {kind:'marq', ...base, a:p, add:e.shiftKey, base:selIds()};
  } else {
    const room = t.closest('[data-room]');
    drag = {kind:'pan', ...base, x0:view.x0, y0:view.y0, room:room && room.dataset.room};
    if (e.pointerType !== 'mouse') startLongPress(e);
  }
  svg.setPointerCapture(e.pointerId);
});

svg.addEventListener('pointermove', e => {
  if (touches.has(e.pointerId)) touches.set(e.pointerId, {x:e.clientX, y:e.clientY});
  if (pinch){
    if (touches.size < 2) return;
    const {d, c} = pinchInfo(), ns = Math.max(.012, Math.min(2, pinch.s * d / pinch.d));
    view.s = ns; view.x0 = pinch.px - c[0]/ns; view.y0 = pinch.py - c[1]/ns; queueView();
    return;
  }
  const p = toMM(e);
  ui.ptr = p;
  setText(cxEl, Math.round(p.x) + ' mm'); setText(cyEl, Math.round(p.y) + ' mm');
  if (!drag){
    const room = e.target.closest?.('[data-room]')?.dataset.room || '';
    if (room !== hoverRoom){
      hoverRoom = room;
      hoverEl.innerHTML = room ? `<b>${esc(nm(state.rooms[room].name))}</b> ${fmt(area(ROOMS.find(r => r.id === room).poly))} m²` : '';
    }
    if (ui.tool === 'measure' && ui.mA){ ui.mCur = snapPoint(p, e.shiftKey); renderMeasure(); }
    return;
  }
  const far = Math.hypot(e.clientX-drag.sx, e.clientY-drag.sy) >= TAP;
  if (far) clearTimeout(lpT);
  if (drag.kind === 'measure'){
    if (far) drag.moved = true;
    ui.mCur = snapPoint(p, e.shiftKey); renderMeasure(); return;
  }
  if (drag.kind === 'pan'){
    if (!drag.moved && !far) return;
    drag.moved = true; svg.classList.add('panning');
    view.x0 = drag.x0 - (e.clientX-drag.sx)/view.s; view.y0 = drag.y0 - (e.clientY-drag.sy)/view.s; queueView(); return;
  }
  if (drag.kind === 'marq'){
    if (!drag.moved && !far) return;
    drag.moved = true; ui.marq = [drag.a, p]; renderSel(); return;
  }
  if (drag.kind === 'note'){
    if (!drag.moved && !far) return;
    const n = getNote(drag.id); if (!n) return;
    drag.moved = true; n.x = Math.round((p.x - drag.ox)/ui.grid)*ui.grid; n.y = Math.round((p.y - drag.oy)/ui.grid)*ui.grid;
    renderNotes(); renderSel(); return;
  }
  if (drag.kind === 'locked'){
    if (far && !drag.warned){ drag.warned = true; toast(tr('已锁定的家具不能移动（L 或面板中解锁）', 'Locked items cannot be moved (press L or unlock in the panel)')); }
    return;
  }
  const f = getF(drag.id); if (!f) return;
  if (!drag.moved && !far) return;             // 轻点家具不应让它抖动一下
  drag.moved = true;
  if (drag.kind === 'move'){
    // 以按住的那件为基准吸附，整组按同一位移移动；限制在画布范围内，防止拖丢
    const b = BOUNDS, [sx, sy] = snapMove(f, p.x-drag.ox, p.y-drag.oy, new Set(drag.ids));
    const dx = Math.max(b.x, Math.min(b.x + b.w, sx)) - drag.start[f.id][0], dy = Math.max(b.y, Math.min(b.y + b.h, sy)) - drag.start[f.id][1];
    // 拖动中只更新被拖家具的位姿，不重建全部家具
    drag.ids.forEach(id => { const g = getF(id); if (!g) return;
      g.cx = drag.start[id][0] + dx; g.cy = drag.start[id][1] + dy;
      document.querySelector(`#gFurn [data-fid="${id}"]`)?.setAttribute('transform', furnT(g)); });
    renderSel(); return;
  }
  if (drag.kind === 'rot'){
    let a = Math.atan2(p.y-f.cy, p.x-f.cx)*180/Math.PI + 90;
    f.rot = norm(e.shiftKey ? a : Math.round(a/15)*15);
  } else if (drag.kind === 'size'){
    const a = f.rot*Math.PI/180, c = Math.cos(a), s = Math.sin(a);
    const dx = p.x-f.cx, dy = p.y-f.cy, lx = dx*c + dy*s, ly = -dx*s + dy*c;
    const ax = -f.w/2, ay = -f.d/2;
    const nw = Math.max(100, Math.round((lx-ax)/10)*10), nd = Math.max(100, Math.round((ly-ay)/10)*10);
    const mx = ax + nw/2, my = ay + nd/2;
    f.cx += mx*c - my*s; f.cy += mx*s + my*c; f.w = nw; f.d = nd;
    renderFurn();                              // 尺寸变了，图例需要重画
  }
  document.querySelector(`#gFurn [data-fid="${f.id}"]`)?.setAttribute('transform', furnT(f));
  renderSel();
});

function onPointerEnd(e){
  touches.delete(e.pointerId);
  if (pinch){ if (touches.size < 2) pinch = null; return; }   // 双指结束后，剩下的手指不再触发操作
  endDrag(e.type === 'pointercancel');
}
svg.addEventListener('pointerup', onPointerEnd);
svg.addEventListener('pointercancel', onPointerEnd);
svg.addEventListener('pointerleave', () => { if (!drag) ui.ptr = null; });
// 阻止 iPad Safari 把双指手势当成整页缩放
['gesturestart','gesturechange','gestureend'].forEach(t => document.addEventListener(t, e => e.preventDefault()));

svg.addEventListener('wheel', e => {
  e.preventDefault();
  const r = svg.getBoundingClientRect();
  zoomAt(view.s*Math.exp(-e.deltaY*(e.ctrlKey ? .01 : .0015)), e.clientX-r.left, e.clientY-r.top);
}, {passive:false});
svg.addEventListener('dblclick', e => {
  const ne = e.target.closest('[data-note]');
  if (ui.tool === 'select' && ne) openNoteEditor(getNote(ne.dataset.note));
  else if (ui.tool === 'select' && e.target.closest('[data-fid]')) rotateSel(90);
});
svg.addEventListener('contextmenu', e => {
  e.preventDefault();
  if (ui.tool === 'measure'){ ui.mA = null; renderMeasure(); return; }
  if (drag?.moved) return;
  openCtx(e.clientX, e.clientY, e.target);
});

/* ======================= 键盘 ======================= */
document.addEventListener('keydown', e => {
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k'){ e.preventDefault(); $('#cmd').hidden ? openCmd() : closeCmd(); return; }
  if (!$('#cmd').hidden) return;                                                  // 命令面板自己处理按键
  if (!$('#dlg').hidden){ if (e.key === 'Escape') closeDialog(); return; }        // 对话框打开时只响应 Esc
  if (!$('#ctx').hidden && e.key === 'Escape'){ closeCtx(); return; }
  if (e.target.matches('input,select,textarea')) return;
  if (window.View3D?.walking()) return;
  const mod = e.metaKey || e.ctrlKey, k = e.key.toLowerCase();
  if (mod && k === 'z'){ e.preventDefault(); e.shiftKey ? redo() : undo(); return; }
  if (mod && k === 'y'){ e.preventDefault(); redo(); return; }
  if (mod && k === 'd'){ e.preventDefault(); duplicateSel(); return; }
  if (mod && k === 'a'){ e.preventDefault(); selectAll(); return; }
  if (mod && (k === 'c' || k === 'x')){ if (selIds().length){ e.preventDefault(); copySel(k === 'x'); } return; }
  if (mod && k === 'v'){ e.preventDefault(); paste(!is3D() && ui.ptr ? ui.ptr : null); return; }
  if (mod) return;
  if (e.key === ' ' && !is3D()){ e.preventDefault(); if (!spaceDown){ spaceDown = true; svg.classList.add('space'); } return; }
  if (e.key === '?'){ openHelp(); return; }
  if (k === '[' || k === ']'){ drawer(k === '[' ? 'lib' : 'panel'); return; }
  if (k === 'f' && e.shiftKey){ toggleFullscreen(); return; }
  if (k === 't') setView(is3D() ? '2d' : '3d');
  else if (is3D() && ['v','b','m','x','n','f','z','+','=','-'].includes(k)) return;
  else if (k === 'n') setTool('note');
  else if (k === 'v') setTool('select');
  else if (k === 'b') setTool('marquee');
  else if (k === 'm') setTool('measure');
  else if (k === 'x') setTool('demolish');
  else if (k === 'f') fitView();
  else if (k === 'z') zoomSel();
  else if (k === 'r') rotateSel(e.shiftKey ? -90 : 90);
  else if (k === 'h') flipSel();
  else if (k === 'l') lockSel();
  else if (k === 'delete' || k === 'backspace'){ e.preventDefault(); deleteSel(); }
  else if (k === 'escape'){ if (ui.mA){ ui.mA = null; renderMeasure(); } else { if (ui.tool !== 'select') setTool('select'); select(null); } }
  else if (k.startsWith('arrow') && selIds().length){
    e.preventDefault(); const st = e.shiftKey ? 100 : 10, items = movable(selItems()); if (!items.length) return;
    const dx = k === 'arrowleft' ? -st : k === 'arrowright' ? st : 0, dy = k === 'arrowup' ? -st : k === 'arrowdown' ? st : 0;
    mutate(() => items.forEach(f => { f.cx += dx; f.cy += dy; }));
  }
  else if (k === '+' || k === '=') zoomCenter(1.25);
  else if (k === '-') zoomCenter(.8);
});
const endSpace = () => { spaceDown = false; svg.classList.remove('space'); };
document.addEventListener('keyup', e => { if (e.key === ' ') endSpace(); });
addEventListener('blur', endSpace);

/* ======================= 右键 / 长按菜单 ======================= */
function openCtx(x, y, target){
  const fEl = ui.layers.furn && target?.closest?.('[data-fid]'), nEl = ui.layers.notes && target?.closest?.('[data-note]');
  ui.ctxAt = toMM({clientX:x, clientY:y});
  if (nEl){
    select({kind:'note', id:nEl.dataset.note});
    const b = (act, icon, zh, en, cls = '') => `<button role="menuitem" data-act="${act}" class="${cls}">${ico(icon)}<span>${tr(zh, en)}</span></button>`;
    return showCtx(x, y, `<div class="cap">${esc(getNote(nEl.dataset.note).text)}</div>` + b('editNote', 'note', '编辑标注', 'Edit note') + '<div class="sep"></div>' + b('delNote', 'trash', '删除标注', 'Delete note', 'danger'));
  }
  ui.ctxRoom = target?.closest?.('[data-room]')?.dataset.room || roomAt(ui.ctxAt.x, ui.ctxAt.y)?.id || null;
  if (fEl && !selIds().includes(fEl.dataset.fid)) selectIds([fEl.dataset.fid]);
  const items = fEl ? selItems() : [], n = items.length, locked = n && items.every(f => f.locked);
  const it = (act, icon, zh, en, key = '', o = {}) => `<button role="menuitem" data-act="${act}" ${o.dis ? 'disabled' : ''} class="${o.cls || ''}">${ico(icon)}<span>${tr(zh, en)}</span>${key ? `<kbd>${key}</kbd>` : ''}</button>`;
  const sep = '<div class="sep"></div>';
  let h;
  if (n){
    h = `<div class="cap">${n > 1 ? tr(`已选 ${n} 件`, `${n} selected`) : esc(nm(items[0].name))}</div>`
      + it('copy', 'copy', '复制', 'Copy', 'Ctrl+C') + it('cut', 'cut', '剪切', 'Cut', 'Ctrl+X') + it('dup', 'copy', '创建副本', 'Duplicate', 'Ctrl+D') + sep
      + it('rotR', 'rotR', '顺时针旋转 90°', 'Rotate right 90°', 'R') + it('rotL', 'rotL', '逆时针旋转 90°', 'Rotate left 90°', '⇧R')
      + it('flip', 'flip', '左右镜像', 'Mirror', 'H') + it('lock', locked ? 'unlock' : 'lock', locked ? '解锁' : '锁定', locked ? 'Unlock' : 'Lock', 'L') + sep
      + (n > 1 ? it('al', 'al', '左对齐', 'Align left') + it('at', 'at', '顶对齐', 'Align top') + it('dh', 'dh', '水平等距分布', 'Distribute horizontally') + it('match', 'size', '统一尺寸', 'Match size') + sep : '')
      + it('front', 'front', '置于顶层', 'Bring to front') + it('toBack', 'back', '置于底层', 'Send to back')
      + it('resetItem', 'reset', '恢复默认尺寸与颜色', 'Reset size & color') + it('zoom', 'target', '缩放到所选', 'Zoom to selection', 'Z')
      + sep + it('del', 'trash', '删除', 'Delete', 'Del', {cls:'danger'});
  } else {
    h = it('paste', 'paste', '粘贴到此处', 'Paste here', 'Ctrl+V', {dis:!clip}) + it('selAll', 'box', '全选家具', 'Select all furniture', 'Ctrl+A', {dis:!state.furniture.length});
    if (ui.ctxRoom) h += sep + `<div class="cap">${esc(nm(state.rooms[ui.ctxRoom].name))}</div>`
      + it('roomSel', 'home', '房间属性 / 更换地面', 'Room properties / flooring') + it('roomFurn', 'box', '选中房间内全部家具', 'Select furniture in this room');
    h += sep + it('addNote', 'note', '在此添加标注', 'Add a note here', 'N') + it('cmd', 'search', '命令面板', 'Command palette', 'Ctrl K')
      + it('fit', 'fit', '适应窗口', 'Fit to window', 'F') + it('reset', 'reset', '重置…', 'Reset…') + it('help', 'kbd', '快捷键', 'Shortcuts', '?');
  }
  showCtx(x, y, h);
}
function showCtx(x, y, h){
  const m = $('#ctx'); m.innerHTML = h; m.hidden = false;
  const r = m.getBoundingClientRect();
  m.style.left = Math.max(8, Math.min(x, innerWidth - r.width - 8)) + 'px';
  m.style.top = Math.max(8, Math.min(y, innerHeight - r.height - 8)) + 'px';
}
function closeCtx(){ const m = $('#ctx'); if (m && !m.hidden) m.hidden = true; }
$('#ctx').addEventListener('click', e => { const b = e.target.closest('[data-act]'); if (!b || b.disabled) return; closeCtx(); runAct(b); });
$('#ctx').addEventListener('contextmenu', e => e.preventDefault());
document.addEventListener('pointerdown', e => { if (!e.target.closest?.('#ctx')) closeCtx(); }, true);
addEventListener('resize', closeCtx);

/* ======================= 对话框 ======================= */
let dialogReturnFocus=null;
function openDialog({title, body, actions = [], wide = false, onOpen}){
  if($('#dlg').hidden)dialogReturnFocus=document.activeElement;
  $('#dlgTitle').textContent = title; $('#dlgBody').innerHTML = body;
  $('#dlg .dlg-box').classList.toggle('wide', wide);
  const A = $('#dlgActions');
  A.innerHTML = actions.map((a, i) => a.href ? `<a class="btn ${a.cls || ''}" data-i="${i}" href="${esc(a.href)}" download="${esc(a.download||'')}">${a.label}</a>` : `<button class="btn ${a.cls || ''}" data-i="${i}">${a.label}</button>`).join(''); A.hidden = !actions.length;
  A.onclick = e => { const b = e.target.closest('[data-i]'); if (!b) return; const a = actions[+b.dataset.i]; if(a.href)return; if (a.fn?.() !== false) closeDialog(); };
  $('#dlg').hidden = false; closeCtx();
  onOpen?.();
  ($('#dlgBody input:not([type=checkbox])') || A.querySelector('.primary') || $('#dlgClose')).focus();
}
function closeDialog(){ $('#dlg').hidden = true; $('#dlgBody').innerHTML = '';const target=dialogReturnFocus?.isConnected&&dialogReturnFocus.getClientRects().length?dialogReturnFocus:$('#projectWorkspace');dialogReturnFocus=null;target?.focus({preventScroll:true}); }
$('#dlgClose').onclick = closeDialog;
$('#dlg').addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();e.stopPropagation();closeDialog();return;}if(e.key!=='Tab')return;const nodes=[...$('#dlg').querySelectorAll('button,a[href],input,select,textarea,[tabindex]')].filter(el=>!el.disabled&&el.tabIndex>=0&&el.getClientRects().length);const first=nodes[0],last=nodes.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}e.stopPropagation();});
$('#dlg').addEventListener('pointerdown', e => { if (e.target.id === 'dlg') closeDialog(); });
$('#dlgBody').addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.matches('input')){ e.preventDefault(); $('#dlgActions .primary')?.click(); } });

// 重置中心：按需恢复家具 / 房间 / 墙体 / 门窗 / 测量 / 视图，一步撤销
function openReset(){
  const o = (k, zh, en, szh, sen, on) => `<label class="opt"><input type="checkbox" data-r="${k}" ${on ? 'checked' : ''}><span><b>${tr(zh, en)}</b><small>${tr(szh, sen)}</small></span></label>`;
  const nDem = state.demolished.length, nOpen = Object.keys(state.open.d || {}).length + Object.keys(state.open.w || {}).length;
  const nRoom = ROOMS.filter(r => state.rooms[r.id].name !== r.name || state.rooms[r.id].mat !== r.mat).length;
  openDialog({title:tr('重置', 'Reset'), body:`<p>${tr(`户型「${nm(PLAN.name)}」：勾选要恢复的内容。操作可用「撤销」找回。`, `Plan "${nm(PLAN.name)}": choose what to restore. You can Undo afterwards.`)}</p><div class="opts">
      ${o('furn', '家具布置', 'Furniture layout', `恢复为该户型的默认布置（当前 ${state.furniture.length} 件）`, `Restore the default layout (currently ${state.furniture.length} items)`, true)}
      ${o('rooms', '房间名称与地面材料', 'Room names & flooring', `${nRoom} 个房间有改动`, `${nRoom} room(s) changed`, nRoom > 0)}
      ${o('walls', '拆改的墙体', 'Demolished walls', `${nDem} 段墙体已标记拆除`, `${nDem} wall segment(s) marked for removal`, nDem > 0)}
      ${o('open', '门窗调整', 'Door & window changes', `${nOpen} 处开启方向 / 窗台高改动`, `${nOpen} swing / sill change(s)`, nOpen > 0)}
      ${o('meas', '测量线与文字标注', 'Measurements & notes', `${state.measures.length} 条测量 · ${(state.notes || []).length} 条标注`, `${state.measures.length} measure(s) · ${(state.notes || []).length} note(s)`, false)}
      ${o('view', '视图与显示设置', 'View & display settings', '适应窗口；恢复默认图层、编辑辅助与移动步长', 'Fit to window; default layers, aids and grid step', true)}
    </div>`,
    actions:[
      {label:tr('清除本机全部数据…', 'Erase all local data…'), cls:'danger left', fn:wipeAll},
      {label:tr('取消', 'Cancel')},
      {label:tr('恢复所选', 'Restore selected'), cls:'primary', fn:() => {
        const on = k => $(`#dlgBody [data-r="${k}"]`).checked, any = ['furn','rooms','walls','open','meas'].some(on);
        if (!any && !on('view')){ toast(tr('请至少勾选一项', 'Select at least one item')); return false; }
        if (any){
          snapshot(true,state,'重置前');const before = snap(), d = freshWork(PLAN);
          if (on('furn')){ state.furniture = d.furniture; delete state.style; }
          if (on('rooms')) state.rooms = d.rooms;
          if (on('walls')) state.demolished = [];
          if (on('open')) state.open = {};
          if (on('meas')){ state.measures = []; state.notes = []; }
          ui.sel = null; commit(before); renderAll();
        }
        if (on('view')){
          Object.assign(ui.layers, {dims:true, labels:true, furn:true, notes:true, grid:false, bearing:false, wallSnap:true, guides:true, clear:true, collide:true}); ui.grid = 10;
          saveUI(); syncLayerBtns(); setTool('select'); renderDims(); renderAll(); fitView();
        }
        toast(tr('已恢复所选内容', 'Restored'), any ? {label:tr('撤销', 'Undo'), fn:undo} : null);
      }},
    ]});
}
function wipeAll(){
  openDialog({title:tr('清除本机全部数据','Erase local data'),body:`<p>${tr('将清除本浏览器的户型、布置、命名方案、恢复记录和自定义家具，无法撤销。请先导出需要保留的项目。','All locally saved projects, designs, recovery points and custom furniture will be erased. Export any projects you want to keep first.')}</p><p id="wipe-error" class="project-error" role="alert"></p>`,actions:[{label:tr('取消','Cancel')},{label:tr('确认清除全部数据','Erase all data'),cls:'danger',fn:()=>{storageWiping=true;$('#dlgActions').querySelectorAll('button').forEach(b=>b.disabled=true);window.FurnishStorage.clear().then(()=>{['huxing-design-v2','huxing-design-v1','huxing-history','huxing-recent','huxing-panes',UI_KEY].forEach(k=>localStorage.removeItem(k));location.reload();}).catch(e=>{storageWiping=false;$('#wipe-error').textContent=tr('清除未完成：','Erase failed: ')+e.message;$('#dlgActions').querySelectorAll('button').forEach(b=>b.disabled=false);});return false;}}]});return false;
}

function openHelp(){
  const g = (title, rows) => `<h4>${title}</h4>` + rows.map(([k, zh, en]) => `<div><span>${tr(zh, en)}</span><kbd>${k}</kbd></div>`).join('');
  openDialog({title:tr('快捷键与操作', 'Shortcuts & Controls'), wide:true, body:`<div class="keys">
    ${g(tr('工具与视图', 'Tools & view'), [['V','选择 / 移动','Select / move'],['B','框选','Box select'],['M','测量（Shift 水平/垂直）','Measure (Shift = straight)'],['X','拆改非承重墙','Demolish walls'],['N','文字标注','Text note'],['Ctrl+K','命令面板：搜索一切','Command palette'],
      ['T','切换 2D / 3D','Toggle 2D / 3D'],['F','适应窗口','Fit to window'],['Z','缩放到所选','Zoom to selection'],['+ / −','放大 / 缩小','Zoom in / out'],
      [tr('空格+拖动','Space+drag'),'平移画面（也可用中键）','Pan (or middle mouse)'],['[ / ]','收起 / 展开左右面板','Toggle side panels'],['Shift+F','全屏','Fullscreen'],['Esc','取消选择 / 退出工具','Deselect / exit tool']])}
    ${g(tr('编辑', 'Editing'), [['Ctrl+Z','撤销','Undo'],['Ctrl+Shift+Z','重做','Redo'],['Ctrl+C / X / V','复制 / 剪切 / 粘贴到指针处','Copy / cut / paste at pointer'],['Ctrl+D','创建副本','Duplicate'],
      ['Ctrl+A','全选家具','Select all'],['Delete','删除','Delete'],['R / Shift+R','旋转 90°','Rotate 90°'],['H','左右镜像','Mirror'],['L','锁定 / 解锁','Lock / unlock'],
      [tr('方向键','Arrows'),'微调 10mm（Shift 100mm）','Nudge 10mm (Shift 100mm)']])}
    ${g(tr('鼠标 / 触屏', 'Mouse / touch'), [[tr('Shift+点击','Shift+click'),'加入 / 移出选择','Add / remove from selection'],[tr('Shift+拖动','Shift+drag'),'在空白处框选','Box select on empty space'],
      [tr('右键 / 长按','Right-click / long-press'),'操作菜单','Action menu'],[tr('双击家具','Double-click'),'旋转 90°','Rotate 90°'],[tr('拖顶部圆点','Top dot'),'旋转（Shift 任意角度）','Rotate (Shift = free)'],
      [tr('拖右下方块','Corner square'),'调整宽深','Resize'],[tr('双指','2 fingers'),'缩放 / 平移','Zoom / pan']])}
    ${g(tr('3D 漫游', '3D walk'), [['W A S D','移动','Move'],['Shift','快走','Run'],['E','开关正前方的门','Toggle door ahead'],['Esc','暂停','Pause']])}
  </div>`});
}

// 自定义家具：任意名称 / 尺寸 / 形状 / 高度 / 颜色 / 单价，保存到「我的家具」
function openCustom(){
  const f = (id, zh, en, attrs, full) => `<label class="${full ? 'full' : ''}">${tr(zh, en)}<input id="${id}" ${attrs}></label>`;
  openDialog({title:tr('新建自定义家具', 'New custom item'), body:`<p>${tr('保存到家具库的「我的家具」分类，可反复添加；3D 中显示为对应尺寸的方块或圆柱。', 'Saved to "My Items" in the library for reuse; shown in 3D as a box or cylinder of that size.')}</p>
    <div class="form">
      ${f('cN', '名称', 'Name', `value="${tr('定制柜', 'Custom cabinet')}" maxlength="24"`, true)}
      ${f('cW', '宽 (mm)', 'Width (mm)', 'type="number" value="1200" min="50" step="10"')}
      ${f('cD', '深 (mm)', 'Depth (mm)', 'type="number" value="450" min="50" step="10"')}
      ${f('cH', '高 (mm)', 'Height (mm)', 'type="number" value="900" min="10" step="10"')}
      <label>${tr('形状', 'Shape')}<select id="cS"><option value="rect">${tr('矩形', 'Rectangle')}</option><option value="round">${tr('圆形 / 椭圆', 'Round / oval')}</option></select></label>
      ${f('cC', '颜色', 'Color', 'type="color" value="#d9c9a8"')}
      ${f('cP', '参考单价 (¥)', 'Unit price (¥)', 'type="number" value="1500" min="0" step="50"')}
    </div>`,
    actions:[{label:tr('取消', 'Cancel')}, {label:tr('保存并添加', 'Save & add'), cls:'primary', fn:() => {
      const v = id => $('#' + id).value, n = id => Math.round(+v(id));
      const c = {id:'c' + uid(), name:v('cN').trim().slice(0,80) || tr('自定义家具', 'Custom item'), w:n('cW'), d:n('cD'), h:n('cH'), shape:v('cS'), color:v('cC'), price:Math.max(0, n('cP') || 0)};
      if (!(c.w >= 50 && c.d >= 50 && c.w <= 20000 && c.d <= 20000 && c.h > 0 && c.h <= 20000 && c.price <= 1e7)){ toast(tr('尺寸需在 50–20000 mm 之间', 'Size must be 50–20000 mm')); return false; }
      if((store.custom||[]).length>=500)return toast(tr('家具库最多 500 个自定义条目。','Up to 500 custom catalog entries.'));
      (store.custom ||= []).push(c); save();
      libUI.cat = CUSTOM_CAT; libUI.q = ''; $('#libSearch').value = ''; buildCats(); buildLib();
      const it = libAll().at(-1).items.at(-1);
      const p = ui.sel?.kind === 'room' ? (b => ({x:(b[0]+b[2])/2, y:(b[1]+b[3])/2}))(bbox(ROOMS.find(r => r.id === ui.sel.id).poly))
        : {x:view.x0 + svg.clientWidth/2/view.s, y:view.y0 + svg.clientHeight/2/view.s};
      addItem(it, p.x, p.y);
    }}]});
}

/* ======================= 家具库 ======================= */
const itemCard = (it, ci, ii) => { const [t,n,w,d,col,price,,cid] = it, pad = Math.max(w,d)*.08, source=cid?store.custom.find(c=>c.id===cid):null;
  return `<div class="item ${cid ? 'custom' : ''}" data-key="${ci}:${ii}" title="${tr('点击添加，或拖到平面图中的指定位置', 'Click to add, or drag onto the plan')}${price ? ` · ¥${price}` : ''}">
    ${cid ? `<button class="del" style="z-index:1" data-cdel="${cid}" title="${tr('从「我的家具」删除', 'Remove from My Items')}">${ico('x')}</button>` : ''}
    <svg viewBox="${-w/2-pad} ${-d/2-pad} ${w+2*pad} ${d+2*pad}">${furnSVG(t,w,d,col)}</svg><b>${esc(nm(n))}</b><small>${w}×${d}${source?`×${source.h}`:''}</small>${source&&(source.brand||source.model)?`<small>${esc([source.brand,source.model].filter(Boolean).join(' · '))}</small>`:''}</div>`; };
function buildLib(){
  const q = libUI.q.trim().toLowerCase();
  let html = (libUI.cat === 'all' && !q && !$('#catalog-max-w')?.value && !$('#catalog-max-d')?.value) ? recentsHTML() : '';
  libAll().forEach((c, ci) => {
    if (!q && libUI.cat !== 'all' && libUI.cat !== c.cat) return;
    const cards = c.items.map((it, ii) => ({it, ii}))
      .filter(({it}) => window.FurnishCatalog ? FurnishCatalog.matches(it,q,Number($('#catalog-max-w')?.value),Number($('#catalog-max-d')?.value)) : !q || nm(it[1]).toLowerCase().includes(q) || it[1].toLowerCase().includes(q))
      .map(({it, ii}) => itemCard(it, ci, ii)).join('');
    if (!cards) return;
    html += `<h4>${nm(c.cat)}</h4><div class="lib-grid">${cards}</div>`;
  });
  $('#lib').innerHTML = (html || `<div class="hint">${tr('没有匹配的家具', 'No matching furniture')}</div>`) +
    `<div class="hint">${tr(
    `家具按真实尺寸（mm）绘制。${COARSE ? '点一下放到画面中央，或按住向右拖到平面图 / 3D 地面上的指定位置（上下滑动为滚动列表）。' : '点击添加到画面中央，或直接拖到平面图 / 3D 地面上。'}添加后可在右侧修改宽深与颜色。`,
    `Furniture is drawn at real size (mm). ${COARSE ? 'Tap to place at the center, or hold and drag right onto the plan / 3D floor (swipe up/down to scroll).' : 'Click to add at the center, or drag onto the plan / 3D floor.'} Edit size and color in the right panel afterwards.`)}</div>`;
  document.querySelectorAll('#lib .item').forEach(el => el.addEventListener('pointerdown', e => {
    if (e.button || e.target.closest('.del')) return;
    libDrag = {el, id:e.pointerId, sx:e.clientX, sy:e.clientY, it:itemOf(el), ghost:null};
  }));
  document.querySelectorAll('#lib [data-cdel]').forEach(b => b.onclick = e => {
    e.stopPropagation();
    openDialog({title:tr('删除家具库条目','Delete catalog item'),body:'<p>'+tr('已摆放家具会保留。可识别来源的家具也会保留原始规格与参考价格。','Placed furniture and identified original specifications are retained.')+'</p>',actions:[{label:tr('取消','Cancel')},{label:tr('删除库条目','Delete catalog item'),cls:'danger',fn:()=>{
      const c=store.custom.find(c=>c.id===b.dataset.cdel);
      const retain=work=>{for(const f of work?.furniture||[])if(FurnishDesign.catalogSource(f,store.custom)===c){f.catalogId=c.id;f.catalogSnapshot=FurnishDesign.catalogSnapshot(c);}};
      if(c){[state,...Object.values(store.work||{}),...(store.designs||[]).map(d=>d.work),...hist.map(h=>h.data)].forEach(retain);for(const stack of [undoStack,redoStack])for(let i=0;i<stack.length;i++){const work=JSON.parse(stack[i]);retain(work);stack[i]=JSON.stringify(work);}persistHistory();}store.custom=store.custom.filter(c=>c.id!==b.dataset.cdel);save();if(!store.custom.length&&libUI.cat===CUSTOM_CAT)libUI.cat='all';buildCats();buildLib();return true;
    }}]});
  });
}
const itemOf = el => { const [ci, ii] = el.dataset.key.split(':').map(Number); return libAll()[ci].items[ii]; };

// 家具库拖放：用 pointer 事件实现（iPad 上 HTML5 拖放不可靠）。
// 列表设置了 touch-action:pan-y，竖向滑动交给浏览器滚动（会触发 pointercancel），横向拖动才开始拖放。
let libDrag = null;
// 屏幕坐标 → 户型坐标（mm）。2D 取平面图坐标，3D 取射线与地面的交点；s = 该处每 mm 的屏幕像素数
function dropPoint(x, y){
  const r = $('#stage').getBoundingClientRect();
  if (x < r.left || x > r.right || y < r.top || y > r.bottom) return null;
  if (document.elementFromPoint(x, y)?.closest('aside.open,#fab,#walkOverlay,#joy,#walkExit')) return null;
  if (is3D()) return window.View3D?.groundAt(x, y) || null;
  const p = toMM({clientX:x, clientY:y}); return {x:p.x, y:p.y, s:view.s};
}
addEventListener('pointermove', e => {
  if (!libDrag || e.pointerId !== libDrag.id) return;
  const {it} = libDrag;
  if (!libDrag.ghost){
    if (Math.hypot(e.clientX-libDrag.sx, e.clientY-libDrag.sy) < TAP) return;
    const g = libDrag.ghost = document.createElement('div'); g.id = 'ghost';
    g.innerHTML = `<svg viewBox="${-it[2]/2} ${-it[3]/2} ${it[2]} ${it[3]}">${furnSVG(it[0],it[2],it[3],it[4])}</svg>`;
    document.body.appendChild(g); libDrag.el.classList.add('dragging');
  }
  // 幽灵图按落点处的比例显示真实大小（3D 中近大远小）
  const g = libDrag.ghost, s = Math.max(dropPoint(e.clientX, e.clientY)?.s || (is3D() ? .05 : view.s), .02);
  Object.assign(g.style, {width:Math.max(28, it[2]*s)+'px', height:Math.max(20, it[3]*s)+'px', left:e.clientX+'px', top:e.clientY+'px'});
  const lib = $('aside.lib');
  if (narrow() && lib.classList.contains('open') && e.clientX > lib.getBoundingClientRect().right) drawer(null);   // 拖出抽屉后自动收起
});
function endLibDrag(e, ok){
  if (!libDrag || e.pointerId !== libDrag.id) return;
  const d = libDrag; libDrag = null;
  d.el.classList.remove('dragging');
  if (d.ghost){
    d.ghost.remove();
    if (!ok) return;
    const p = dropPoint(e.clientX, e.clientY);
    if (p) addItem(d.it, p.x, p.y);
    else if (is3D() && e.clientX > $('#stage').getBoundingClientRect().left) toast(tr('请拖到地面上', 'Drop it on the floor'));
    return;
  }
  if (!ok) return;
  // 轻点：放到选中房间中心，否则放到画面中心（3D 取屏幕中心对应的地面位置）
  let p = null;
  if (ui.sel?.kind === 'room'){ const b = bbox(ROOMS.find(r => r.id===ui.sel.id).poly); p = {x:(b[0]+b[2])/2, y:(b[1]+b[3])/2}; }
  else if (is3D()){ const r = $('#stage').getBoundingClientRect(); p = window.View3D.groundAt(r.left + r.width/2, r.top + r.height/2); }
  if (!p) p = {x:view.x0 + svg.clientWidth/2/view.s, y:view.y0 + svg.clientHeight/2/view.s};
  addItem(d.it, p.x, p.y);
  closeDrawers();
}
addEventListener('pointerup', e => endLibDrag(e, true));
addEventListener('pointercancel', e => endLibDrag(e, false));

/* ======================= 导入导出 ======================= */
function download(name, blob){ const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000); }
function exportPNG(){
  if (is3D()) return window.View3D.shot();
  const clone = svg.cloneNode(true), W = 3200, H = Math.round(W*BOUNDS.h/BOUNDS.w);
  clone.setAttribute('viewBox', `${BOUNDS.x} ${BOUNDS.y} ${BOUNDS.w} ${BOUNDS.h}`);
  clone.setAttribute('width', W); clone.setAttribute('height', H);
  clone.querySelector('#gSel').innerHTML = '';
  clone.querySelector('#gGrid').innerHTML = `<rect x="-20000" y="-20000" width="55000" height="55000" fill="${ui.layers.grid?'url(#grid)':PAL.paper}"/>`;
  const bg = document.createElementNS('http://www.w3.org/2000/svg','rect');
  Object.entries({x:-20000,y:-20000,width:55000,height:55000,fill:PAL.paper}).forEach(([k,v]) => bg.setAttribute(k,v));
  clone.insertBefore(bg, clone.querySelector('#gGrid'));
  const img = new Image();
  img.onload = () => {
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    cv.getContext('2d').drawImage(img, 0, 0, W, H);
    cv.toBlob(b => download(tr('户型装修方案', 'floor-plan-design') + '.png', b));
  };
  img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(new XMLSerializer().serializeToString(clone));
}

/* ======================= 杂项 ======================= */
// 提示条；act = {label, fn} 时带一个操作按钮（如「撤销」），显示更久
let toastT;
function toast(msg, act){
  const t = $('#toast'); t.textContent = msg; t.classList.toggle('act', !!act);
  if (act){ const b = document.createElement('button'); b.textContent = act.label; b.onclick = () => { t.classList.remove('show', 'act'); act.fn(); }; t.appendChild(b); }
  t.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show', 'act'), act ? 5000 : 1800);
}

/* ======================= 户型切换 ======================= */
function setPlan(id){
  const p = PLANS.find(q => q.id === id);
  if (!p || p.id === PLAN.id) return;
  PLAN = p; applyPlanData();
  store.planId = p.id;
  state = store.work[p.id] || (store.work[p.id] = freshWork(p));
  state.open = state.open || {}; state.furniture = sanitizeFurn(state.furniture, p);
  undoStack.length = 0; redoStack.length = 0; ui.sel = null; ui.mA = null; ui.mCur = null; hoverRoom = '';
  save();
  buildDefs(); buildLib(); renderOpenings(); renderDims(); fitView(); renderAll(); buildPlanList(); renderDesigns();
  window.View3D?.replan();
  toast(tr(`已切换到「${nm(p.name)}」`, `Switched to "${nm(p.name)}"`));
}
function planThumb(p){
  let xs = [], ys = [];
  p.walls.forEach(w => { xs.push(w[0], w[2]); ys.push(w[1], w[3]); });
  const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys), pad = 140;
  const rooms = p.rooms.filter(r => r.counted !== false)
    .map(r => `<polygon points="${r.poly.map(q => q.join(',')).join(' ')}" fill="#cbbFa8" opacity=".5"/>`).join('');
  const walls = p.walls.map(w =>
    `<rect x="${w[0]}" y="${w[1]}" width="${w[2]-w[0]}" height="${w[3]-w[1]}" fill="${w[4]==='b' ? '#2b2824' : w[4]==='e' ? '#57514a' : '#9b9285'}" stroke="#eee" stroke-width="15" stroke-dasharray="${w[4]==='b'?'30 20':w[4]==='e'?'100 30':''}"/>`).join('');
  return `<svg viewBox="${x0-pad} ${y0-pad} ${x1-x0+2*pad} ${y1-y0+2*pad}" preserveAspectRatio="xMidYMid meet" aria-hidden="true">${rooms}${walls}</svg>`;
}
function buildPlanList(){
  const c = $('#planCnt'); if (c) c.textContent = PLANS.length;
  renderGallery();
}
// 户型库：按居室筛选的卡片画廊（户型多了以后下拉菜单不好找）
const CN_NUM = {一:1, 两:2, 二:2, 三:3, 四:4, 五:5};
const bedsOf = p => p.customDraft?p.rooms.filter(r=>FurnishDesign.inferUse(r,(p.id===PLAN.id?state:store.work[p.id])?.rooms?.[r.id])==='bedroom').length:/开间/.test(p.name)?0:CN_NUM[(p.name.match(/([一两二三四五])室/)||[])[1]]??(/三居/.test(p.name)?3:1);
const bathsOf = p => p.customDraft?p.rooms.filter(r=>FurnishDesign.inferUse(r,(p.id===PLAN.id?state:store.work[p.id])?.rooms?.[r.id])==='bathroom').length:CN_NUM[(p.name.match(/([一两二三])卫/)||[])[1]]??1;
const netOf = p => p.rooms.filter(r => r.counted !== false).reduce((a, r) => a + area(r.poly), 0);
let galleryF = 'all';
function openPlans(){ openDialog({title:tr('户型库', 'Floor Plans'), wide:true, body:'<div class="actions" style="margin:0 0 14px"><button class="btn primary" id="gallery-new">导入 DXF／图片 · 新建户型</button><button class="btn" id="gallery-import">加载户型／项目文件</button></div><p>导出文件可发送给其他用户；在此加载后继续编辑。自定义户型可删除，内置示例保留。</p><div id="gallery"></div>', onOpen:()=>{renderGallery();$('#gallery-new').onclick=()=>{closeDialog();window.FurnishEditor.open(true);};$('#gallery-import').onclick=()=>window.FurnishWorkspace.importProject();}}); }
function renderGallery(){
  const el = $('#gallery'); if (!el) return;
  const F = [['all', '全部', 'All'], ['1', '开间 · 一居', 'Studio · 1BR'], ['2', '两居', '2BR'], ['3', '三居', '3BR'], ['4', '四居及以上', '4BR+']];
  const ok = p => galleryF === 'all' || (galleryF === '1' ? bedsOf(p) <= 1 : galleryF === '4' ? bedsOf(p) >= 4 : bedsOf(p) === +galleryF);
  const list = PLANS.filter(ok).sort((a, b) => netOf(a) - netOf(b));
  el.innerHTML = `<div class="chiprow gfil">${F.map(([k, zh, en]) => `<button class="btn chip ${galleryF === k ? 'on' : ''}" data-gf="${k}">${tr(zh, en)} <small>${PLANS.filter(p => k === 'all' || (k === '1' ? bedsOf(p) <= 1 : k === '4' ? bedsOf(p) >= 4 : bedsOf(p) === +k)).length}</small></button>`).join('')}</div>
    <div class="ggrid">${list.map(p => { const n = store.work[p.id]?.furniture?.length, on = p.id === PLAN.id;
      return `<article class="gentry"><button class="gcard ${on ? 'on' : ''}" data-plan="${p.id}">
        <div class="gthumb">${planThumb(p)}${on ? `<i class="gcur">${tr('当前', 'Current')}</i>` : ''}</div>
        <b>${esc(nm(p.name))}</b>
        <div class="gtags"><span>${bedsOf(p) ? tr(`${bedsOf(p)} 室`, `${bedsOf(p)} BR`) : tr('开间', 'Studio')}</span><span>${tr(`${bathsOf(p)} 卫`, `${bathsOf(p)} BA`)}</span><span>${netOf(p).toFixed(1)} m²</span></div>
        <small>${n != null ? tr(`已布置 ${n} 件 · 自动保存`, `${n} items · autosaved`) : tr('默认布置', 'Default layout')}</small></button><div class="actions"><button class="btn" data-plan-export="${p.id}">导出</button>${p.id.startsWith('custom_')?`<button class="btn" data-plan-delete="${p.id}">删除</button>`:''}</div></article>`; }).join('')}</div>`;
  el.querySelectorAll('[data-gf]').forEach(b => b.onclick = () => { galleryF = b.dataset.gf; renderGallery(); });
  el.querySelectorAll('[data-plan-export]').forEach(b=>b.onclick=()=>window.FurnishWorkspace.exportPlan(b.dataset.planExport));
  el.querySelectorAll('[data-plan-delete]').forEach(b=>b.onclick=()=>confirmLibraryDelete(b.dataset.planDelete,b));
  el.querySelectorAll('[data-plan]').forEach(b => b.onclick = () => { closeDialog(); setPlan(b.dataset.plan); });
}
function confirmLibraryDelete(id,button){
 const p=PLANS.find(p=>p.id===id);if(!p||!id.startsWith('custom_'))return;
 document.querySelectorAll('.gallery-delete-confirm').forEach(el=>{const actions=el.parentElement.querySelector('.actions');actions.hidden=false;actions.style.display='';el.parentElement.querySelector('.gcard').disabled=false;el.remove();});
 const card=button.closest('.gentry'),actions=button.parentElement,open=card.querySelector('.gcard');actions.hidden=true;actions.style.display='none';open.disabled=true;
 const panel=document.createElement('div');panel.className='gallery-delete-confirm';panel.setAttribute('role','group');panel.setAttribute('aria-label','确认删除户型');
 const designs=store.designs.filter(d=>d.planId===id).length;
 panel.innerHTML=`<h4>删除「${esc(p.name)}」？</h4><p>将移除此户型及其布置${designs?`、${designs} 份命名方案`:''}和历史快照。其他户型不受影响。导出文件可用于重新加载。</p><div class="actions"><button class="btn" data-delete-cancel>取消</button><button class="btn" data-delete-backup>导出备份</button><button class="btn danger" data-delete-confirm>确认删除</button></div>`;card.append(panel);
 const cancel=()=>{panel.remove();actions.hidden=false;actions.style.display='';open.disabled=false;button.focus({preventScroll:true});};
 panel.querySelector('[data-delete-cancel]').onclick=cancel;panel.querySelector('[data-delete-backup]').onclick=()=>window.FurnishWorkspace.exportPlan(id);panel.querySelector('[data-delete-confirm]').onclick=()=>deleteLibraryPlan(id);
 panel.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();e.stopPropagation();cancel();}});panel.querySelector('[data-delete-cancel]').focus({preventScroll:true});panel.scrollIntoView({block:'nearest'});
}
function deleteLibraryPlan(id){
 const p=PLANS.find(p=>p.id===id);if(!p||!id.startsWith('custom_'))return;
 if(PLAN.id===id)setPlan(PLANS.find(p=>p.id!==id).id);
 PLANS.splice(PLANS.findIndex(p=>p.id===id),1);store.customPlans=store.customPlans.filter(p=>p.id!==id);delete store.work[id];store.designs=store.designs.filter(d=>d.planId!==id);hist=hist.filter(h=>h.planId!==id);persistHistory();save();buildPlanList();renderDesigns();renderHist();
}
$('#planBtn').onclick = () => openPlans();

/* ======================= 主题 ======================= */
const THEME_KEY = 'huxing-theme';
function curTheme(){ return document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light'; }
function setTheme(t){
  document.documentElement.dataset.theme = t;
  try { localStorage.setItem(THEME_KEY, t); } catch(e) {}
  const meta = document.querySelector('meta[name="theme-color"]'); if (meta) meta.content = t === 'dark' ? '#0c0b09' : '#1b1916';
  PAL = t === 'dark' ? PAL_DARK : PAL_LIGHT;
  const b = $('#themeBtn'), q = $('#themeQuick'), next = t === 'dark' ? tr('亮色', 'Light') : tr('暗色', 'Dark');
  b.innerHTML = ico(t === 'dark' ? 'sun' : 'moon') + next; b.classList.toggle('on', t === 'dark');
  q.innerHTML = ico(t === 'dark' ? 'sun' : 'moon'); q.title = tr(`切换为${next}主题`, `Switch to ${next.toLowerCase()} theme`);
  buildDefs(); renderAll();
  window.View3D?.retheme();
}
$('#themeBtn').onclick = $('#themeQuick').onclick = () => setTheme(curTheme() === 'dark' ? 'light' : 'dark');

/* ======================= 多命名方案 ======================= */
function renderDesigns(){
  const box = $('#designList'); if (!box) return;
  const list = store.designs.filter(d => d.planId === PLAN.id);
  box.innerHTML = list.length ? list.map(d =>
    `<div class="dsn"><button class="btn" data-dload="${d.id}" title="${tr('载入此方案', 'Load this design')}">${esc(d.name)}</button>
     <button class="btn danger" data-ddel="${d.id}" title="${tr('删除方案', 'Delete design')}" aria-label="${tr('删除方案', 'Delete design')}">×</button></div>`).join('')
    : `<div class="muted empty">${tr('暂无已保存方案', 'No saved designs yet')}</div>`;
  box.querySelectorAll('[data-dload]').forEach(b => b.onclick = () => {
    const d = store.designs.find(x => x.id === b.dataset.dload); if (!d) return;
    let next;try{next=fixWork(JSON.parse(JSON.stringify(d.work)),PLAN);if(state.architecture)next.architecture=FurnishProject.protectOriginal(state.architecture,next.architecture);}catch(error){return toast(error.message);}
    snapshot(true,state,'载入命名方案前');const before = snap(); state = next; ui.sel = null;
    commit(before); renderAll(); $('#fileMenu').open = false;
    toast(tr(`已载入「${d.name}」`, `Loaded "${d.name}"`));
  });
  box.querySelectorAll('[data-ddel]').forEach(b => b.onclick = () => {
    window.FurnishDesignUI?.editDesign('delete',b.dataset.ddel);
  });
  box.insertAdjacentHTML('beforeend',`<button class="btn" id="manageDesigns">${tr('管理命名方案','Manage saved designs')}</button>`);
  $('#manageDesigns').onclick=()=>{window.FurnishDesignUI?.designs();$('#fileMenu').open=false;};
}
$('#saveDesign').onclick = () => {
  const def = tr('方案 ', 'Design ') + new Date().toLocaleDateString();
  const name = prompt(tr('方案名称：', 'Design name:'), def); if (!name) return;
  if(name.length>80||store.designs.filter(d=>d.planId===PLAN.id).length>=100)return toast(tr('方案名称最多 80 字，每个户型最多 100 份命名方案。','Names up to 80 characters; up to 100 designs per plan.'));
  store.designs.push({id:'d'+Date.now().toString(36), name, planId:PLAN.id, ts:Date.now(), work:JSON.parse(JSON.stringify(state))});
  save(); renderDesigns(); toast(tr('已保存当前布置', 'Design saved'));
};

/* ======================= 历史快照（防误操作，跨会话） ======================= */
const HIST_KEY = 'huxing-history';
let hist = (() => { try { const h = JSON.parse(localStorage.getItem(HIST_KEY)); return FurnishProject.historyEntries(Array.isArray(h) ? h : []); } catch(e) { return []; } })();
let lastSnap = 0;
let historySaveErr = false;
function persistHistory(){
  const version=hist;
  let cached=true;try{localStorage.setItem(HIST_KEY,JSON.stringify(hist));}catch(e){cached=false;}
  historySaveErr=!cached;
  window.FurnishStorage?.writeHistory(hist).then(()=>{if(hist===version)historySaveErr=false;}).catch(()=>{if(hist===version)historySaveErr=!cached;});
}
window.FurnishStorage?.historyReady.then(saved=>{
  if(!Array.isArray(saved)||storageWiping)return;
  const valid=saved.filter(h=>{try{FurnishProject.validateWork(h.data);return true;}catch(e){return false;}});
  hist=FurnishProject.historyEntries([...hist,...valid]);renderHist();
}).catch(()=>{});
function snapshot(force,data=state,reason='自动快照',planId=PLAN.id){
  if(storageWiping)return;
  const now = Date.now();
  if (!force && now - lastSnap < 30000) return;     // 节流：30 秒内只存一次（force 用于导入/重置等大动作）
  lastSnap = now;
  hist=FurnishProject.recoveryEntry(hist,planId,data,reason,now);persistHistory();
  renderHist();
}
function renderHist(){
  const box = $('#histList'); if (!box) return;
  const list = hist.filter(h => h.planId === PLAN.id);
  box.innerHTML = list.length ? list.map(h =>
    `<div class="dsn"><button class="btn" data-hload="${h.ts}" title="${tr('恢复此快照', 'Restore this snapshot')}">${new Date(h.ts).toLocaleString()} · ${h.n}${tr(' 件', ' items')}</button></div>`).join('')
    : `<div class="muted empty">${tr('暂无历史快照', 'No snapshots yet')}</div>`;
  box.querySelectorAll('[data-hload]').forEach(b => b.onclick = () => {
    const h = hist.find(x => x.ts === +b.dataset.hload); if (!h) return;
    window.FurnishDesignUI?.previewRecovery(h.ts);$('#fileMenu').open=false;
  });
}

/* ======================= 分享链接（方案编码进 URL，客户打开即还原） ======================= */
const b64url = {
  enc: bytes => { let s = ''; for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
    return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); },
  dec: str => { const s = str.replace(/-/g, '+').replace(/_/g, '/'); const bin = atob(s + '='.repeat((4 - s.length % 4) % 4));
    return Uint8Array.from(bin, c => c.charCodeAt(0)); },
};
async function compressJSON(json){
  const src = new TextEncoder().encode(json);
  if ('CompressionStream' in window){
    const out = await new Response(new Blob([src]).stream().pipeThrough(new CompressionStream('deflate-raw'))).arrayBuffer();
    return 'z' + b64url.enc(new Uint8Array(out));
  }
  return 'r' + b64url.enc(src);
}
async function decompressJSON(str){
  const raw = b64url.dec(str.slice(1));
  const out = str[0] === 'z'
    ? await new Response(new Blob([raw]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).arrayBuffer()
    : raw.buffer;
  return new TextDecoder().decode(out);
}
$('#shareLink').onclick = async () => {
  if (state.architecture) return toast(tr('自定义户型请导出方案 JSON 分享（含图纸与墙体）', 'Export custom plans as JSON to share the drawing and walls'));
  const v = await compressJSON(JSON.stringify(state));
  const url = location.href.split('#')[0] + '#p=' + PLAN.id + '&v=' + v;
  try { await navigator.clipboard.writeText(url); toast(tr('分享链接已复制，发给客户打开即可还原', 'Share link copied')); }
  catch(e){ prompt(tr('复制分享链接：', 'Copy share link:'), url); }
  $('#fileMenu').open = false;
  snapshot(true);
};
let lastHash = '';
const loadFromHash = async () => {   // 从分享链接载入（新标签打开或同页粘贴均可）
  const m = location.hash.match(/^#p=(\w+)&v=(.+)$/);
  if (!m || m[0] === lastHash) return;
  lastHash = m[0];
  try {
    const work = JSON.parse(await decompressJSON(m[2]));
    const lockedOriginal=store.work[m[1]]?.architecture;if(lockedOriginal?.phase==='design')work.architecture=FurnishProject.protectOriginal(lockedOriginal,work.architecture);
    registerCustomWork(work);
    const plan = PLANS.find(p => p.id === m[1]);
    if (!plan || !Array.isArray(work.furniture)) throw 0;
    const before = PLAN.id === plan.id && state && Array.isArray(state.furniture) ? snap() : null;
    snapshot(true,state,'加载分享前');
    PLAN = plan; applyPlanData(); store.planId = plan.id;
    state = fixWork(work, plan); store.work[plan.id] = state; save();
    if (before){ commit(before); } else { undoStack.length = 0; redoStack.length = 0; }
    ui.sel = null;
    buildDefs(); buildLib(); renderOpenings(); renderDims(); fitView(); renderAll(); buildPlanList(); renderDesigns();
    window.View3D?.replan();
    history.replaceState(null, '', location.pathname + location.search);   // 载入后清掉 hash，之后的编辑走自动保存
    toast(tr('已载入分享的方案', 'Shared design loaded'));
  } catch(e) { toast(tr('分享链接无效', 'Invalid share link')); }
};
addEventListener('hashchange', loadFromHash);
loadFromHash();

/* ======================= 打印 ======================= */
let printTheme = null;
addEventListener('beforeprint', () => {
  printTheme = curTheme();
  if (printTheme === 'dark') setTheme('light');           // 打印输出固定用浅色
  const b = PLAN.bounds;
  svg.setAttribute('viewBox', `${b.x} ${b.y} ${b.w} ${b.h}`);
  // 打印抬头：方案名 + 面积表
  const tot = ROOMS.filter(r => r.counted !== false).reduce((a,r) => a + area(r.poly), 0);
  $('#printHead').innerHTML = `<h2>${esc(nm(PLAN.name))} · ${tr('装修方案','Design')}</h2>
    <div class="sub">${new Date().toLocaleString()} · ${tr('套内使用面积','Net area')} ≈ ${fmt(tot)} m² · ${tr('家具','Items')} ${state.furniture.length}${tr(' 件','')}</div>
    <table>${ROOMS.map(r => `<tr><td style="padding-right:16px">${esc(nm(state.rooms[r.id].name))}${r.counted === false ? ' *' : ''}</td><td style="text-align:right">${fmt(area(r.poly))} m²</td></tr>`).join('')}</table>`;
});
addEventListener('afterprint', () => { if (printTheme === 'dark') setTheme('dark'); printTheme = null; applyView(); });
$('#printPlan').onclick = () => window.print();

/* ======================= 家具库：搜索 / 分类 / 最近使用 ======================= */
const libUI = {q:'', cat:'all'};
const RECENT_KEY = 'huxing-recent';
const recentKey = n => typeof n==='string'?'legacy:'+n:n.catalogId?'catalog:'+n.catalogId:n.type+':'+n.name;
const findItem = n => { const matches=[];libAll().forEach((c,ci)=>c.items.forEach((it,ii)=>{if(typeof n==='string'?it[1]===n:n.catalogId?it[7]===n.catalogId:it[0]===n.type&&it[1]===n.name)matches.push([ci,ii]);}));return matches.length===1?matches[0]:null; };
let recents = (() => { try { const r=JSON.parse(localStorage.getItem(RECENT_KEY));return Array.isArray(r)?r.filter(n=>n&&(typeof n==='string'||typeof n==='object')&&findItem(n)).slice(0,8):[]; }catch(e){return [];} })();
function recentsHTML(){
  const L=libAll(),cards=recents.map(findItem).filter(Boolean).map(([ci,ii])=>itemCard(L[ci].items[ii],ci,ii)).join('');
  return cards?'<div id="recentSec"><h4>'+tr('最近使用','Recent')+'</h4><div class="lib-grid">'+cards+'</div></div>':'';
}
function pushRecent(it){
  const entry={type:it[0],name:it[1],...(it[7]?{catalogId:it[7]}:{})};
  recents=[entry,...recents.filter(n=>recentKey(n)!==recentKey(entry))].slice(0,8);
  try{localStorage.setItem(RECENT_KEY,JSON.stringify(recents));}catch(e){}
  const sec=$('#recentSec');if(sec)sec.outerHTML=recentsHTML();else if(libUI.cat==='all'&&!libUI.q.trim())buildLib();
}
function buildCats(){
  const cats = ['all', ...libAll().map(c => c.cat)];
  if (!cats.includes(libUI.cat)) libUI.cat = 'all';
  $('#libCats').innerHTML = cats.map(c => `<button class="btn ${libUI.cat === c ? 'on' : ''}" data-cat="${c}">${c === 'all' ? tr('全部', 'All') : nm(c)}</button>`).join('');
  document.querySelectorAll('#libCats [data-cat]').forEach(b => b.onclick = () => { libUI.cat = b.dataset.cat; buildCats(); buildLib(); });
}


/* ======================= 2D / 3D 切换 ======================= */
let viewMode = '2d', switching = false;
const is3D = () => viewMode === '3d';
const TIPS = () => COARSE
  ? {'2d':tr('点或拖动家具库添加 · 单指拖动平移 · 双指缩放 · 选中家具后底部工具条可旋转 / 复制 / 删除', 'Tap or drag from the library · 1 finger pans · pinch zooms · bottom bar rotates / duplicates / deletes'),
     '3d':tr('单指旋转 · 双指缩放 / 平移 · 点家具或地面编辑 · 点门开关', '1 finger orbits · 2 fingers zoom / pan · tap furniture or floor to edit · tap doors to open')}
  : {'2d':tr('拖动左侧家具到平面图 · 滚轮缩放 · 拖动空白处平移 · T 切换 3D', 'Drag furniture onto the plan · scroll to zoom · drag empty space to pan · T for 3D'),
     '3d':tr('3D 场景与平面方案实时同步 · 右侧面板修改会立即生效 · T 返回 2D', '3D stays in sync with the plan · panel edits apply instantly · T for 2D')};
async function setView(m){
  if (m === viewMode || switching) return;
  if (!window.View3D) return toast(tr('当前浏览器不支持 3D 场景', '3D is not supported in this browser'));
  switching = true; document.body.classList.add('busy');
  try {
    if (m === '3d'){
      // three.js 按需加载：首次进入 3D 时才解析引擎（约 0.7 MB），2D 启动不受影响
      const slow = setTimeout(() => toast(tr('正在加载 3D 引擎…', 'Loading 3D engine…')), 200);
      try { await window.View3D.load(); } finally { clearTimeout(slow); }
      viewMode = m;
      if (ui.tool !== 'select') setTool('select'); ui.mA = null; document.body.classList.add('m3d'); await window.View3D.enter();
    } else { viewMode = m; document.body.classList.remove('m3d'); await window.View3D.exit(); applyView(); }
    $('#tip').textContent = TIPS()[m];
  } catch(e) {
    console.error(e);
    viewMode = '2d'; document.body.classList.remove('m3d');
    toast(tr('3D 引擎加载失败', 'Failed to load the 3D engine'));
  } finally { switching = false; document.body.classList.remove('busy'); }
}
document.querySelectorAll('.menu-pop .btn').forEach(b => b.addEventListener('click', () => b.closest('details').open = false));
document.querySelectorAll('#viewSeg .btn').forEach(b => b.onclick = () => setView(b.dataset.view));
['pointerenter', 'pointerdown', 'focusin'].forEach(t => $('#viewSeg').addEventListener(t, () => window.View3D?.load().catch(() => {}), {once:true}));

document.querySelectorAll('#tools .btn').forEach(b => b.onclick = () => setTool(b.dataset.tool));
function setLayer(k, v){
  ui.layers[k] = v; saveUI(); syncLayerBtns();
  if (k === 'dims') $('#gDims').setAttribute('display', ui.layers.dims ? 'inline' : 'none');
  else if (k === 'clear') renderSel();
  else if (k !== 'wallSnap' && k !== 'guides') renderAll();
}
function syncLayerBtns(){
  document.querySelectorAll('[data-layer]').forEach(b => b.classList.toggle('on', !!ui.layers[b.dataset.layer]));
  document.querySelectorAll('[data-grid]').forEach(b => b.classList.toggle('on', +b.dataset.grid === ui.grid));
}
document.querySelectorAll('[data-layer]').forEach(b => b.onclick = () => setLayer(b.dataset.layer, !ui.layers[b.dataset.layer]));
document.querySelectorAll('[data-grid]').forEach(b => b.onclick = () => { ui.grid = +b.dataset.grid; saveUI(); syncLayerBtns(); });
$('#furnHidden').onclick = () => setLayer('furn', true);
$('#resetBtn').onclick = $('#resetMenu').onclick = () => openReset();
$('#helpBtn').onclick = () => openHelp();
$('#addCustom').onclick = () => openCustom();
$('#exportCsv').onclick = exportCSV;
$('#zoomIn').onclick = () => zoomCenter(1.25);
$('#zoomOut').onclick = () => zoomCenter(.8);
// 点比例在常用出图比例间循环（取比当前更小的下一档，到头回到最大）
$('#hudRatio').onclick = () => { const cur = 1/(view.s*PX_MM), steps = [50, 60, 100, 200]; setRatio(steps.find(r => r > cur + 1) || steps[0]); };
$('#fit').onclick = fitView;
$('#s60').onclick = () => { setRatio(60); toast(tr('已按 1:60 显示（与原始户型图同比例）', 'Showing at 1:60 (same scale as the original plan)')); };
$('#s100').onclick = () => setRatio(100);
$('#undo').onclick = undo; $('#redo').onclick = redo;
$('#clearAll').onclick = clearLayout;

/* 全屏：标准 API + Safari（iPad）的 webkit 前缀版本 */
const fsEl = () => document.fullscreenElement || document.webkitFullscreenElement;
function toggleFullscreen(){
  const de = document.documentElement;
  if (fsEl()) (document.exitFullscreen || document.webkitExitFullscreen).call(document);
  else {
    const req = de.requestFullscreen || de.webkitRequestFullscreen;
    if (!req) return toast(tr('当前浏览器不支持网页全屏，可在 Safari 中「添加到主屏幕」后以全屏方式打开', 'Fullscreen is not supported here — in Safari, use "Add to Home Screen" to open it fullscreen'));
    Promise.resolve(req.call(de)).catch(() => toast(tr('无法进入全屏', 'Could not enter fullscreen')));
  }
}
function syncFullscreen(){
  const on = !!fsEl(), b = $('#fullscreen');
  b.title = (on ? tr('退出全屏', 'Exit fullscreen') : tr('全屏', 'Fullscreen')) + ' (Shift+F)';
  b.setAttribute('aria-pressed', on);
}
$('#fullscreen').onclick = toggleFullscreen;
['fullscreenchange', 'webkitfullscreenchange'].forEach(t => document.addEventListener(t, syncFullscreen));
// 已从主屏幕以独立 App 方式打开时本就是全屏，隐藏按钮
if (navigator.standalone || matchMedia('(display-mode: standalone)').matches) $('#fullscreen').hidden = true;
$('#tgLib').onclick = () => drawer('lib');
$('#tgPanel').onclick = () => drawer('panel');
// 菜单在顶栏偏左（如户型菜单、折行后的文件菜单）时改为左对齐，避免弹出层超出屏幕
document.querySelectorAll('details.menu').forEach(m => m.addEventListener('toggle', () => {
  if (!m.open) return;
  const pop = m.querySelector('.menu-pop'); pop.classList.remove('pop-left');
  if (pop.getBoundingClientRect().left < 8) pop.classList.add('pop-left');
}));
// 触屏上点菜单以外的地方收起下拉菜单
document.addEventListener('pointerdown', e => { document.querySelectorAll('details.menu').forEach(m => { if (m.open && !m.contains(e.target)) m.open = false; }); });
matchMedia('(max-width:1100px)').addEventListener('change', () => drawer(null));
drawer(null);                                  // 恢复上次的面板收起状态
$('#exportPng').onclick = exportPNG;
$('#exportJson').onclick = () => download(tr('户型装修方案', 'floor-plan-design') + '-' + PLAN.id + '.json',
  new Blob([JSON.stringify({plan:PLAN.id, name:PLAN.name, ...state}, null, 2)], {type:'application/json'}));
$('#importJson').onclick = () => $('#fileIn').click();
$('#fileIn').onchange = e => {
  const file = e.target.files[0]; if (!file) return;
  file.text().then(txt => {
    try {
      if (file.size > 30e6) throw 'size';
      const s = JSON.parse(txt);
      if(s.architecture&&s.plan&&s.plan!==s.architecture.draft?.id)throw Error('方案户型编号与原始结构不一致');
      const lockedOriginal=store.work[s.architecture?.draft?.id||s.plan]?.architecture;if(lockedOriginal?.phase==='design')s.architecture=FurnishProject.protectOriginal(lockedOriginal,s.architecture);
      if (!Array.isArray(s.furniture) || s.furniture.length > 2000) throw 0;
      const meshItems=s.furniture.filter(f=>f?.obj);if(meshItems.length)FurnishProject.validateWork({furniture:meshItems.map(f=>({...f,id:f.id||uid(),rot:typeof f.rot==='number'?f.rot:0}))});
      FurnishProject.validateWork({...s,furniture:[]});
      const target=s.architecture?FurnishDraft.build(s.architecture.draft):s.plan?PLANS.find(p=>p.id===s.plan):PLAN;if(!target)throw Error('文件引用了不存在的户型');
      const total=s.furniture.length,prepared=fixWork(s,target);if(total&&!prepared.furniture.length)throw Error('文件没有可加载的有效家具');
      const checked=FurnishProject.validateWork(prepared);FurnishProject.validatePlanWork(target,checked);
      snapshot(true,state,'加载旧方案前');registerCustomWork(checked);if(target.id!==PLAN.id)setPlan(target.id);
      const b=snap();state=checked;ui.sel=null;commit(b);renderAll();
      const skipped = total - state.furniture.length;
      toast(tr(`方案已导入：${state.furniture.length} 件家具`, `Imported ${state.furniture.length} items`)
        + (skipped ? tr(`，跳过 ${skipped} 条无效数据`, `, skipped ${skipped} invalid`) : ''), {label:tr('撤销', 'Undo'), fn:undo});
    }
    catch(err){ toast(err === 'size' ? tr('文件过大（上限 30MB）', 'File too large (max 30MB)') : tr('无法加载：', 'Cannot load: ')+(err?.message||tr('文件格式不正确','Invalid file format'))); }
  });
  e.target.value = '';
};
$('#libSearch').addEventListener('input', e => { libUI.q = e.target.value; buildLib(); });
// 横竖屏切换、表头换行等都会改变画布尺寸；尺寸从 0 恢复（如首次布局）时重新适应窗口
// 其余尺寸变化（收起 / 展开面板等）保持画面中心不动
let lastW = 0, lastH = 0;
new ResizeObserver(() => {
  const w = svg.clientWidth, h = svg.clientHeight; if (!w) return;
  if (!lastW) fitView();
  else { view.x0 -= (w - lastW)/2/view.s; view.y0 -= (h - lastH)/2/view.s; applyView(); }
  lastW = w; lastH = h;
}).observe(svg);

function setLang(l){
  LANG = l; try { localStorage.setItem(LANG_KEY, l); } catch(e) {}
  applyStaticLang(); syncFullscreen(); syncModeHint(); syncPaneBtns();
  buildCats(); buildLib(); buildPlanList(); renderDesigns(); renderHist(); renderOpenings(); renderAll(); syncSaved();
  setTheme(curTheme());
  $('#tip').textContent = TIPS()[viewMode];
  window.View3D?.relang();
}

$('#langSel').onclick = e => { const l = e.target.closest('[data-lang]')?.dataset.lang; if (l && l !== LANG) setLang(l); };

applyStaticLang(); syncFullscreen();
setTheme((() => { try { return localStorage.getItem(THEME_KEY); } catch(e) { return null; } })() ||
  (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'));
applyPlanData(); state.furniture = sanitizeFurn(state.furniture, PLAN);
syncLayerBtns(); buildCats(); buildLib(); buildPlanList(); renderOpenings(); renderDims();
$('#tip').textContent = TIPS()['2d'];
fitView(); renderAll(); renderDesigns(); syncSaved();
