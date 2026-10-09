/* Shared browser / Node module; no DOM or application state dependencies. */
(function(root){
'use strict';
// 简 → 繁：先按词替换一字多义的字，再逐字查表（表由 OpenCC s2tw 按本页用到的字生成）
const S2T_PHRASES = [['布置','佈置'],['布局','佈局'],['台面','檯面'],['复制','複製']];
const S2T = new Map(('与與两兩个個为為书書于於仅僅从從价價会會传傳体體余餘侧側倾傾储儲儿兒关關内內写寫净淨准準击擊则則刚剛删刪制製办辦动動势勢区區单單占佔卧臥卫衛厅廳历歷压壓厨廚双雙发發变變叶葉后後吗嗎听聽启啟哑啞围圍图圖圆圓场場坐座块塊垫墊墙牆处處备備复復头頭妆妝婴嬰实實宽寬对對导導层層屉屜属屬岛島带帶干乾并並库庫应應开開当當径徑态態总總悬懸懒懶户戶护護拟擬择擇挂掛挡擋挤擠损損换換据據摆擺摇搖撑撐数數无無时時显顯暂暫机機杂雜杆桿条條来來松鬆构構柜櫃标標栈棧栏欄样樣梁樑棱稜椭橢横橫橱櫥气氣没沒注註浅淺测測浏瀏游遊滚滾满滿灯燈灵靈点點热熱状狀独獨环環现現电電画畫监監盖蓋盘盤砖磚确確离離积積称稱竖豎筑築签籤类類约約级級线線结結绕繞绘繪给給统統继繼绿綠缀綴编編缝縫缩縮网網联聯脚腳获獲虚虛装裝见見视視览覽触觸计計认認让讓议議记記设設识識译譯该該语語请請读讀调調负負败敗质質贴貼赶趕转轉轮輪软軟轴軸轻輕载載较較辅輔辑輯边邊过過这這进進远遠适適选選邻鄰里裡针針钢鋼钮鈕铰鉸铺鋪销銷锁鎖键鍵镜鏡长長门門闭閉闲閒间間阅閱阳陽阴陰阶階随隨隐隱静靜页頁顶頂项項顺順颜顏飘飄飞飛马馬鸟鳥齐齊龙龍东東义義优優伪偽册冊减減凑湊创創别別参參叠疊响響壳殼宁寧将將尽盡帘簾帧幀异異弃棄弹彈强強归歸录錄报報断斷旧舊档檔检檢湾灣码碼础礎笔筆简簡紧緊红紅纵縱组組细細绑綁续續缓緩缘緣艺藝节節范範补補观觀规規词詞试試话話误誤说說贯貫资資迁遷运運还還连連链鏈错錯队隊预預题題饰飾皱皺胶膠执執欧歐纸紙荐薦觉覺证證风風验驗筛篩阵陣肤膚兰蘭号號').match(/../gu).map(p => [...p]));
const s2t = s => S2T_PHRASES.reduce((a, [f, t]) => a.replaceAll(f, t), s).replace(/[\u3400-\u9fff]/g, c => S2T.get(c) || c);
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

function translate(lang,zh,en){return lang==='en'?en:lang==='zht'?s2t(zh):zh;}
function name(lang,text){return lang==='en'?(NAMES_EN[text]??text):lang==='zht'?s2t(text):text;}

const api={namesEn:NAMES_EN,toTraditional:s2t,translate,name};
if(typeof module==='object'&&module.exports)module.exports=api;
else root.FurnishI18n=api;
})(typeof globalThis!=='undefined'?globalThis:this);
