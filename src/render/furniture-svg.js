/* Browser / Node module with explicit inputs and no app state or DOM. */
(function(root){
'use strict';
function hex2rgb(h){ h = h.replace('#',''); if (h.length===3) h = h.split('').map(c=>c+c).join(''); const n = parseInt(h,16); return [(n>>16)&255,(n>>8)&255,n&255]; }
function shade(h,k){ const f = v => Math.max(0,Math.min(255,Math.round(k>1 ? v+(255-v)*(k-1)*2 : v*k))); return '#'+hex2rgb(h).map(v=>f(v).toString(16).padStart(2,'0')).join(''); }

function render(t,w,d,c,PAL,f,context={}){
  // Bind helpers to this call's palette so switching themes cannot retain ink.
  const ST = () => `stroke="${PAL.ink}" stroke-width="1" vector-effect="non-scaling-stroke"`;
const rc = (x,y,w,h,f,ex='') => `<rect x="${x}" y="${y}" width="${Math.max(0,w)}" height="${Math.max(0,h)}" fill="${f}" ${ST()} ${ex}/>`;
const ec = (cx,cy,rx,ry,f,ex='') => `<ellipse cx="${cx}" cy="${cy}" rx="${Math.max(0,rx)}" ry="${Math.max(0,ry)}" fill="${f}" ${ST()} ${ex}/>`;
const ln = (x1,y1,x2,y2,ex='') => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" ${ST()} ${ex}/>`;
const pa = (d,f='none',ex='') => `<path d="${d}" fill="${f}" ${ST()} ${ex}/>`;
const DASH = 'stroke-dasharray="4 3"';


  const x = -w/2, y = -d/2, m = Math.min(w,d);
  if(f?.cabinet?.boxConstruction==='independent'){
    const C=typeof module==='object'&&module.exports?require('../core/cabinet-core.js'):root.FurnishCabinet,t=f.cabinet.thickness,p=C.endPanels(f.cabinet);
    return C.moduleLayout(f).map(b=>`<g data-independent-box="true">${rc(b.left,y,b.width,d,c)}${ln(b.left+t,y,b.left+t,y+d)}${ln(b.right-t,y,b.right-t,y+d)}</g>`).join('')+(p.left?rc(x,y,p.left,d,shade(c,.85),'data-end-panel="left"'):'')+(p.right?rc(w/2-p.right,y,p.right,d,shade(c,.85),'data-end-panel="right"'):'');
  }
  const assembly=(typeof module==='object'&&module.exports?require('../core/product-rules.js'):root.FurnishProducts).assemblyBounds(f);if(assembly)return rc(assembly.left,assembly.back,assembly.w,assembly.d,c);
  if(f?.type==='kitchenwall'&&f.cabinet?.hoodBayHeight!==undefined){const C=typeof module==='object'&&module.exports?require('../core/cabinet-core.js'):root.FurnishCabinet,bay=C.hoodBay(f);return rc(x,y,w,d,c)+rc(bay.left,y,bay.width,bay.depth,'none',DASH)+`<text x="${bay.center}" y="0" text-anchor="middle" dominant-baseline="central" font-size="60" fill="${PAL.ink}">烟机嵌合区</text>`;}
  if(f?.kitchen){const K=typeof module==='object'&&module.exports?require('../core/kitchen-core.js'):root.FurnishKitchen;const blinds=K.cornerLayout(f);const stone=K.isWall(f)||!K.hasCountertop(f)?[...K.cabinetLayout(f).filter(m=>m.role!=='empty'),...blinds].map(m=>rc(m.x-m.w/2,m.y-m.d/2,m.w,m.d,c)).join(''):f.kitchen.shape==='U'||f.kitchen.obstacleFit?.cuts.length||K.laundryCut(f).length?`<path d="${K.topGeometry(f).rings.map(r=>'M'+r.map(p=>p.join(',')).join('L')+'Z').join('')}" fill="${c}" fill-rule="evenodd" ${ST()}/>`:K.slabs(f).map(s=>rc(s.x-s.w/2,s.y-s.d/2,s.w,s.d,c)).join('');return stone+blinds.map(b=>rc(b.x-b.w/2+18,b.y-b.d/2+18,b.w-36,b.d-36,'none',DASH)+`<text x="${b.x}" y="${b.y}" text-anchor="middle" dominant-baseline="central" font-size="60" fill="${PAL.ink}">转角空腔</text>`).join('')+K.cabinetLayout(f).map(m=>rc(m.x-m.w/2+2,m.y-m.d/2+2,m.w-4,m.d-4,'none',m.role==='empty'?DASH:'')+`<text x="${m.x}" y="${m.y}" text-anchor="middle" dominant-baseline="central" font-size="70" fill="${PAL.ink}">${m.index>=f.kitchen.modules.length?'薄柜':K.moduleRoles(f)[m.role]}</text>`).join('')+K.laundrySideBoards(f).map(b=>rc(b.x-b.w/2,b.y-b.d/2,b.w,b.d,c)).join('')+K.laundryParts(f).filter(p=>p.key==='sink').map(({furniture:p})=>{const [sx,sy]=K.local(f,p.cx,p.cy),path=(w,d)=>'M'+K.notchedRing(w,d,(typeof module==='object'&&module.exports?require('../core/product-rules.js'):root.FurnishProducts).vesselSink(p)?undefined:p.sinkNotch).map(v=>v.join(',')).join('L')+'Z';return `<g data-laundry-basin="true" transform="translate(${sx} ${sy})">${pa(path(p.w,p.d),p.color||c)}${pa(path(p.w-40,p.d-40),'#fff')}</g>`;}).join('');}
  if(f?.cabinet?.sideboard){
    const C=typeof module==='object'&&module.exports?require('../core/cabinet-core.js'):root.FurnishCabinet,s=f.cabinet.sideboard,bays=C.layout(f),t=f.cabinet.thickness;
    return bays.map((bay,i)=>{const left=bay.left-t,right=bay.left+bay.width+t,col=f.cabinet.columns[i];return col.fridgeBay?rc(left,y,right-left,s.fridgeDepth??d,'none',DASH)+ln(left,y+(s.fridgeDepth??d),right,y+(s.fridgeDepth??d),DASH):rc(left,y,right-left,s.lowerDepth,c)+rc(left,y,right-left,s.upperDepth,shade(c,.85))+ln(left,y+s.lowerDepth,right,y+s.lowerDepth);}).join('');
  }
  if(f?.cabinet?.columns.some(col=>col.top==='drawer')){
    const C=typeof module==='object'&&module.exports?require('../core/cabinet-core.js'):root.FurnishCabinet,bays=C.layout(f);
    let s=rc(x,y,w,d,c);
    f.cabinet.columns.forEach((col,i)=>{const bay=bays[i];if(i)s+=ln(bay.left-f.cabinet.thickness/2,y,bay.left-f.cabinet.thickness/2,y+d);if(col.top==='drawer'&&col.cableGap){s+=rc(bay.left,y,bay.width,col.cableGap,shade(c,.55));const cut=Math.min(15,d*.05),n=Math.min(120,bay.width*.35);s+=pa(`M${bay.center-n/2-15} ${y+col.cableGap}L${bay.center-n/2} ${y+col.cableGap+cut}H${bay.center+n/2}L${bay.center+n/2+15} ${y+col.cableGap}Z`,shade(c,.55));}});
    return s;
  }
  switch (t){
    case 'heating_manifold': {
      const m=(root.FurnishProducts||require('../core/product-rules.js')).manifoldLayout({...f,type:t,w,d}),inlet=m.inlet,k=d/140;
      // True top view: vertical risers project to circles; both headers share Z.
      let svg=[inlet+28,w/2-28].map(x=>rc(x-7,-70*k,14,8*k,'#a5aaa5')).join('');
      for(const length of [m.lengths.upper,m.lengths.lower]){const start=inlet-length+18;svg+=rc(start,-28*k,inlet-start,36*k,'#aeb8b1','rx="8"')+ec(start,-10*k,18,18*k,'#aeb8b1');}
      svg+=rc(inlet-22,-34*k,42,48*k,c)+rc(inlet+20,-29*k,m.railWidth-40,38*k,c)+ec(w/2-23,-10*k,23,23*k,c);
      for(const z of [-42,25])for(let i=0;i<m.loops;i++){const x=inlet+65+i*m.pitch;svg+=rc(x-7,Math.min(-10,z)*k,14,Math.abs(z+10)*k,'#a5aaa5')+ec(x,z*k,12,12*k,'#303635')+rc(x-14.5,(z+19.5)*k,29,11*k,'#bb3931');}
      svg+=rc(inlet-18,-10*k,20,75*k,'#a5aaa5')+rc(inlet-14,60*k,12,10*k,'#254f9d');
      return `<g data-manifold-plan="top">${svg}</g>`;
    }
    case 'electrical_box_strong': case 'electrical_box_weak': return rc(x,y,w,d,c)+rc(x+w*.06,y+d*.72,w*.88,d*.22,'#697681');
    case 'block': return rc(x,y,w,d,c);
    case 'cat_tree': return rc(x,y,w,d,'#dfbd7d','rx="12"')+rc(-w*.19,-d*.4,w*.66,d*.64,c)+rc(-w*.02,d*.23,w*.34,d*.24,'#dfbd7d')+ec(-w*.21,-d*.27,w*.21,d*.21,'#eee7d2')+ec(w*.13,-d*.26,w*.21,d*.21,'#d7e2df')+ec(-w*.314,d*.19,w*.186,d*.186,'#dfbd7d')+ln(w*.01,d*.34,w*.29,d*.34)+ln(w*.01,d*.43,w*.29,d*.43);
    case 'pet_feeder_mijia_2': return rc(-w*.45,-d*.07,w*.9,d*.57,c,`rx="${w*.11}"`)+rc(-w*.42,d*.03,w*.84,d*.44,'#b6b9b7',`rx="${w*.08}"`)+rc(x,y,w,d*220/324,c,`rx="${w*37/220}"`)+rc(-w*.27,-d*.30,w*.15,d*.07,shade(c,.9),'rx="4"')+ln(-w*.31,d*58/324,w*.31,d*58/324);
    case 'litter_box': {
      let s=rc(x,y,w,d,c,`rx="${m*.16}"`)+rc(x+w*.04,y+d*.04,w*.92,d*.92,shade(c,.86),`rx="${m*.13}"`);
      for(let i=1;i<22;i++)s+=ln(x+w*.08+i*w*.038,y+d*.12,x+w*.08+i*w*.038,y+d*.88,'stroke-opacity=".4"');
      return s+rc(-w*.18,-d*.18,w*.36,d*.30,c,`rx="${m*.035}"`)+ln(-w*.24,d*.48,w*.24,d*.48,'stroke-width="3"');
    }
    case 'pipebox': {
      const P=typeof module==='object'&&module.exports?require('../core/product-rules.js'):root.FurnishProducts;
      return P.pipeBoxPanels({...f,type:t,w,d}).map(b=>rc(b.x-b.w/2,b.z-b.d/2,b.w,b.d,c)).join('');
    }
    case 'aquarium_mijia_2pro': return rc(x,y,w,d,'#b8d8dc')
      +rc(x+w*.018,y+d*.02,w*.964,d*.96,'#b9d9d4')
      +rc(x,y,w,d*.27,c)+rc(x+w*.02,y+d*.27,w*.96,d*.035,'#6d9cbd')
      +rc(x+w*.20,y+d*.065,w*.13,d*.055,'#080b0e')
      +ec(w*.17,d*.09,w*.13,d*.12,'#668e53')
      +pa(`M${-w*.29} ${d*.31}Q${-w*.05} ${-d*.04} ${w*.26} ${d*.08}`,'none','stroke-width="6"')
      +ln(x,y+d,w/2,y+d,'stroke-width="3"');
    case 'robot_p20max': return ec(0,0,w/2,d/2,c)+ec(0,-d*.115,w*.07,d*.068,shade(c,.8))+rc(-w*.09,d*.455,w*.18,d*.035,'#20272b','rx="4"');
    case 'robot_p20max_tank': {
      let s=rc(x,y,w,d,'#9ca7ad',`rx="${w*.24}"`)+rc(x+w*.035,y+d*.015,w*.93,d*.91,c,`rx="${w*.26}"`)
        +rc(x+w*.095,y+d*.06,w*.81,d*.79,shade(c,1.04),`rx="${w*.24}"`)
        +rc(-w*.075,d*.332,w*.15,d*.008,'#b4d8e8','rx="2"');
      for(const k of [-1,1]){const tx=k*w*.293;s+=rc(tx-w*.047,d*.34,w*.094,d*.12,'#69757d','rx="3"');for(let i=0;i<8;i++)s+=ln(tx-w*.04,d*(.345+i*.015),tx+w*.04,d*(.345+i*.015),'opacity=".55"');}
      return s;
    }
    case 'robot_p20max_plumbed': {
      const tank=false,rx=w*.04;
      return rc(x,y,w,d,c,`rx="${rx}"`)+rc(x+w*.06,y+d*.035,w*.88,d*.62,shade(c,1.04),`rx="${rx*.8}"`)
        +ln(x+w*.12,y+d*.18,x+w*.88,y+d*.18)
        +ec(0,d*.13,w*(tank?.389:.459),d*(tank?.391:.371),shade(c,.91),DASH)
        +rc(-w*.07,d*.475,w*.14,d*.018,'#20272b','rx="3"');
    }
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
    case 'sofa_yeswood_cherry': {
      const a=w*.085,b=d*.245,wood='#b77749',cw=(w-2*a)/2;
      let s=rc(x,y,w,d,wood,'rx="16"');
      for(let i=0;i<2;i++)s+=rc(x+a+i*cw+5,y+b,cw-10,d-b-16,c,'rx="40"')+rc(x+a+i*cw+5,y+12,cw-10,b-20,c,'rx="35"');
      return s+rc(x+w*.016,y+25,a-w*.024,d-50,c,'rx="35"')+rc(x+w-a+w*.008,y+25,a-w*.024,d-50,c,'rx="35"');
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
    case 'nightstand': return rc(x,y,w,d,c,'rx="30"') + `<circle r="${m*.24}" fill="#fff6dd" ${ST()}/>` + `<circle r="${m*.08}" fill="${shade(c,.8)}" ${ST()}/>`;
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
    case 'bench_yeswood_oak': return rc(x,y,w,d,c,`rx="${w*.015}"`)+rc(-w*372.5/800,y,w*745/800,d,'#d7d1c5',`rx="${w*.0175}" ry="${d*14/300}"`)+[-1,1].map(s=>ln(s*w*300/800,y+d*.06,s*w*300/800,y+d*.94)).join('');
    case 'coffeetable_yeswood_cherry': return rc(x,y,w,d,c,`rx="${w*.05}" ry="${d*60/650}"`)+rc(x+w*.003,y+d*.005,w*.994,d*.99,'#f5f5f1',`rx="${w*.049}" ry="${d*59/650}"`);
    case 'coffeetable': return rc(x,y,w,d,c,'rx="80"') + rc(x+60,y+60,w-120,d-120,shade(c,1.06),'rx="50"');
    case 'tvstand': return rc(x,y,w,d,c) + rc(x+w*.15,y+30,w*.7,55,'#3a3a3a');
    case 'rug': return rc(x,y,w,d,c,'rx="40" fill-opacity=".6"') + rc(x+90,y+90,w-180,d-180,'none','rx="30" stroke-dasharray="3 3" opacity=".6"');
    case 'plant': {
      let s = `<circle r="${m/2}" fill="${c}" fill-opacity=".85" ${ST()}/>`;
      for (let k=0;k<8;k++) s += `<ellipse cx="0" cy="${-m*.27}" rx="${m*.1}" ry="${m*.21}" transform="rotate(${k*45})" fill="${shade(c,.8)}" ${ST()}/>`;
      return s + `<circle r="${m*.1}" fill="#8a6a4a" ${ST()}/>`;
    }
    case 'table_folding_1100': case 'table_folding_1200': case 'table_folding_1300': {
      const P=typeof module==='object'&&module.exports?require('../core/product-rules.js'):root.FurnishProducts,item={...f,type:t,w,d},s=P.foldingTableGeometry(item),outline=P.foldingTableOutline(item),chord=z=>w*Math.sqrt(Math.max(0,1-(2*z/s.fullDepth)**2))/2;
      return `<g data-folding-table="${s.pose}">${pa('M'+outline.map(p=>p.join(',')).join('L')+'Z','#f4f3ee')}${(s.pose==='round'?[-s.backCut,s.cut]:s.pose==='single'?[-s.backCut]:[]).map(z=>ln(-chord(z),z+s.offset,chord(z),z+s.offset,'opacity=".5"')).join('')}</g>`;
    }
    case 'table': return rc(x,y,w,d,c,'rx="30"') + rc(x+50,y+50,w-100,d-100,'none','rx="20" opacity=".4"');
    case 'roundtable': return ec(0,0,w/2,d/2,c) + ec(0,0,w/2-50,d/2-50,'none','opacity=".4"');
    case 'counter': return rc(x,y,w,d,c) + ln(x,y+d-40,x+w,y+d-40,DASH);
    case 'rangehood_fotile_jcd10ta': {const P=typeof module==='object'&&module.exports?require('../core/product-rules.js'):root.FurnishProducts,s=P.hoodInstallation(f||{type:t,w,d});return rc(x,y,w,d,'#202225') + rc(-s.coverWidth/2,s.coverOffset-s.coverDepth/2,s.coverWidth,s.coverDepth,'#45474a') + ln(x,y+d*.9,x+w,y+d*.9) + rc(-w*.12,y+d*.7,w*.24,d*.05,'#a87c38');}
    case 'stove_fotile_th36b': {
      let s=rc(x,y,w,d,'#111214','rx="8"');
      for(const px of [-w*.265,w*.265])s+=rc(px-w*.145,-d*.36,w*.29,d*.58,'#252629','rx="6"')+ec(px,-d*.07,d*.145,d*.145,'#55575a')+ec(px,-d*.07,d*.08,d*.08,'#131416')+ln(px-w*.145,-d*.07,px+w*.145,-d*.07)+ln(px,-d*.36,px,d*.22);
      return s+ec(-w*.062,d*.31,d*.036,d*.036,'#bfc0c1')+ec(w*.062,d*.31,d*.036,d*.036,'#bfc0c1');
    }
    case 'stove': {
      let s = rc(x,y,w,d,'#2f2f2f','rx="20"'); const r = m*.26;
      const pts = w/d > 1.4 ? [[-w/4,0],[w/4,0]] : [[-w/4,-d/4],[w/4,-d/4],[-w/4,d/4],[w/4,d/4]];
      pts.forEach(([px,py]) => s += `<circle cx="${px}" cy="${py}" r="${r}" fill="none" stroke="#bbb" stroke-width="1" vector-effect="non-scaling-stroke"/><circle cx="${px}" cy="${py}" r="${r*.45}" fill="#666"/>`);
      return s;
    }
    case 'sink_arrow_680': case 'sink_arrow_750': return rc(x,y,w,d,c,'rx="12"')+rc(x+20,y+20,w-40,d-39,'#454d50','rx="20"')+rc(w*.17,y+20,w*.3,d*.22,c,'rx="12"')+rc(x+w*.12,y+d*.42,w*.28,d*.30,'#a3a8a9','rx="12"')+`<circle cx="${w*.32}" cy="${y+d*.10}" r="15" fill="#aeb4b6"/>`+ln(w*.32,y+d*.10,w*.32,y+d*.48);
    case 'ksink': if(f?.sinkStyle==='vessel')return rc(x,y,w,d,c,'rx="20"')+rc(x+15,y+15,w-30,d-30,'#fff','rx="12"')+`<circle cx="0" cy="0" r="20" fill="#aaa"/>`;if(f?.sinkNotch){const K=typeof module==='object'&&module.exports?require('../core/kitchen-core.js'):root.FurnishKitchen;return pa('M'+K.notchedRing(w,d,f.sinkNotch).map(p=>p.join(',')).join('L')+'Z',c)+pa('M'+K.notchedRing(w-40,d-40,f.sinkNotch).map(p=>p.join(',')).join('L')+'Z','#fff');}return rc(x,y,w,d,c,'rx="20"') + rc(x+w*.06,y+d*.18,w*.42,d*.66,'#fff','rx="50"') + rc(x+w*.52,y+d*.18,w*.42,d*.66,'#fff','rx="50"') + `<circle cx="0" cy="${y+d*.09}" r="22" fill="#999"/>`;
    case 'fridge_french_drawer': return rc(x,y,w,d,c) + rc(x,y+d*.92,w,d*.08,shade(c,.9)) + ln(0,y+d*.92,0,y+d);
    case 'fridge': return rc(x,y,w,d,c,'rx="30"') + ln(x,y+d*.14,x+w,y+d*.14) + ln(0,y+d*.14,0,y+d) + rc(-70,y+d*.5,40,d*.25,'#aab') + rc(30,y+d*.5,40,d*.25,'#aab');
    case 'toilet': return rc(x+w*.04,y,w*.92,d*.27,c,'rx="30"') + ec(0,y+d*.27+d*.36,w*.47,d*.36,c) + ec(0,y+d*.27+d*.4,w*.3,d*.24,'#eef4f7');
    case 'vanity': return rc(x,y,w,d,c,'rx="20"') + ec(0,y+d*.57,Math.min(w*.32,260),d*.28,'#fff') + `<circle cx="0" cy="${y+d*.17}" r="26" fill="#999"/>`;
    case 'shower_arrow_cream': return rc(-w*.476,y,w*.952,d*.25,c,'rx="12"') + rc(-w*.381,y+d*.553,w*.762,d*.447,c,`rx="18" ${DASH}`) + rc(-w*.03,y+d*.12,w*.06,d*.657,c,'rx="5"') + ln(-w*.17,y,-w*.17,y+d*.045) + ln(w*.17,y,w*.17,y+d*.045);
    case 'shower': return rc(x,y,w,d,c) + ln(x,y,x+w,y+d,DASH) + ln(x+w,y,x,y+d,DASH) + `<circle r="45" fill="#fff" ${ST()}/>`;
    case 'bathtub': return rc(x,y,w,d,c,'rx="40"') + rc(x+80,y+80,w-160,d-160,'#fff',`rx="${m*.33}"`) + `<circle cx="${x+w-260}" cy="0" r="35" fill="#ccc" ${ST()}/>`;
    case 'washer': case 'dryer': return rc(x,y,w,d,c,'rx="30"') + rc(x,y,w,d*.14,shade(c,.9)) + `<circle cy="${d*.06}" r="${m*.34}" fill="#fff" ${ST()}/><circle cy="${d*.06}" r="${m*.24}" fill="${t==='dryer'?'#e9dccb':'#cfdde4'}" ${ST()}/>`;
    case 'crib': {
      let s = rc(x,y,w,d,c,'rx="20"') + rc(x+45,y+45,w-90,d-90,'#fff','rx="20"');
      for (let sx = x+90; sx < x+w-60; sx += 90) s += ln(sx,y,sx,y+45,'opacity=".5"') + ln(sx,y+d-45,sx,y+d,'opacity=".5"');
      return s;
    }
    case 'beanbag': return ec(0,0,w/2,d/2,c) + ec(-w*.04,-d*.06,w*.3,d*.28,shade(c,1.12),'opacity=".9"');
    case 'sidetable': return ec(0,0,w/2,d/2,c) + ec(0,0,w*.12,d*.12,'none','opacity=".5"');
    case 'panel_light_300x600': return `<rect x="${-w/2}" y="${-d/2}" width="${w}" height="${d}" fill="${c}" ${ST()}/><rect x="${-w/2+3}" y="${-d/2+3}" width="${Math.max(1,w-6)}" height="${Math.max(1,d-6)}" fill="#fff4e4" ${ST()}/>`;
    case 'bath_heater_aopu_se2': return `<rect x="${-w/2}" y="${-d/2}" width="${w}" height="${d}" rx="${w*.025}" fill="${c}" ${ST()}/><rect x="${-w*.2}" y="${-d*.475}" width="${w*.675}" height="${d*.95}" rx="${w*.018}" fill="#fffef5" ${ST()}/>${Array.from({length:5},(_,i)=>`<path d="M ${w*(-.45+i*.032)} ${-d*.455} V ${d*.455}" stroke="#767c80" stroke-linecap="round" stroke-width="${w*.018}"/>`).join('')}<circle cx="${-w*.235}" cy="${-d*.425}" r="${w*.036}" fill="#343b40"/><path d="M ${-w*.235} ${d*.32} v ${d*.025}" stroke="#f38840" stroke-width="${w*.013}"/>`;
    case 'bath_heater_300x600': return `<rect x="${-w/2}" y="${-d/2}" width="${w}" height="${d}" fill="${c}" ${ST()}/><rect x="${-w*.38}" y="${d*.19}" width="${w*.76}" height="${d*.22}" fill="#666d70" ${ST()}/>${Array.from({length:8},(_,i)=>`<path d="M ${-w*.38} ${d*(.21+i*.026)} H ${w*.38}" stroke="${c}" stroke-width="${Math.max(1,d*.008)}"/>`).join('')}<rect x="${-w*.38}" y="${-d*.4}" width="${w*.76}" height="${d*.48}" fill="#fafbf6" ${ST()}/>`;
    case 'downlight_philips_dl269': return `<ellipse rx="${w/2}" ry="${d/2}" fill="${c}" ${ST()}/><ellipse rx="${w*.32}" ry="${d*.32}" fill="#fff5dd" ${ST()}/><path d="M ${-w*.12} 0 H ${w*.12} M 0 ${-d*.12} V ${d*.12}" ${ST()}/>`;
    case 'floorlamp': return `<circle r="${m*.5}" fill="#fff6dd" fill-opacity=".85" ${ST()}/>` + `<circle r="${m*.32}" fill="none" ${ST()} ${DASH}/>` + `<circle r="${m*.07}" fill="${c}" ${ST()}/>`;
    case 'island': return rc(x,y,w,d,c) + ln(x,y+d-250,x+w,y+d-250,DASH);
    case 'barstool': return `<circle r="${m/2}" fill="${c}" ${ST()}/><circle r="${m*.3}" fill="${shade(c,1.15)}" ${ST()}/>`;
    case 'waterheater': return rc(x,y,w,d,c,`rx="${d/2}" ${DASH}`) + ln(x+w*.2,0,x+w*.8,0,DASH);
    case 'waterheater_flat': return rc(x,y,w,d,c,`rx="${d*.3}" ${DASH}`)
      + rc(x+w*.02,y+d*.12,w*.025,d*.76,'#aeb0b2',`rx="${d*.06}"`)
      + rc(x+w*.955,y+d*.12,w*.025,d*.76,'#aeb0b2',`rx="${d*.06}"`)
      + rc(-w*.42,y+d*.84,w*.84,d*.1,'#17191c',`rx="${d*.04}"`);
    case 'tv': return rc(-w*.3,y,w*.6,d*.6,'#333','data-tv-part="rear"') + rc(x,y+d*.6,w,d*.4,c,'rx="4" data-tv-part="panel"');
    case 'aircon_midea_ultra_2hp': {const P=root.FurnishProducts||(typeof require==='function'?require('../core/product-rules.js'):null),unit={type:t,w,d},pts=P.planBodyOutline(unit,64),outline=P.planOutline(unit);return pa('M'+outline.map(p=>p.join(',')).join('L')+'Z',c)+pa('M'+pts.slice(23,42).map(p=>[p[0]*.96,p[1]*.96].join(',')).join('L'),'none')+rc(-w*.23,d*.45,w*.46,d*.027,'#11191e',`rx="${w*.025}"`);}
    case 'aircon': return rc(x,y,w,d,c,'rx="30"') + ln(x+40,y+d*.72,x+w-40,y+d*.72) + ln(x+40,y+d*.86,x+w-40,y+d*.86);
    case 'acwall': {
      let s = rc(x,y,w,d,c,`rx="30" ${DASH}`);
      [.25,.5,.75].forEach(k => s += ln(x+w*k,y+d,x+w*k,y+d+200,`${DASH} opacity=".6"`));
      return s;
    }
    case 'dishwasher_mijia_countertop': {
      const spec=(typeof module==='object'&&module.exports?require('../core/product-rules.js'):root.FurnishProducts).definition(t).foldDoor,open=f?.dishwasherDoorOpen,reach=d*(spec.openDepth-spec.nominalDepth)/spec.nominalDepth;
      return rc(x,y,w,d,c,'rx="10"')+ln(x+w*.04,y+d*.94,x+w*.96,y+d*.94)+rc(-w*.035,y+d*.91,w*.07,d*.03,shade(c,.8))+(open?`<g data-dishwasher-fold="open">${rc(x+w*.025,y+d,w*.95,reach,shade(c,.94),'rx="6"')}${ln(x+w*.04,y+d+reach*.93,x+w*.96,y+d+reach*.93)}${ec(0,y+d+reach*.56,w*.042,w*.042,'#303436')}</g>`:'');
    }
    case 'dishwasher': return rc(x,y,w,d,c,'rx="15"') + ln(x,y+d-70,x+w,y+d-70) + rc(x+w*.3,y+d-45,w*.4,25,'#888');
    case 'ovencol': return rc(x,y,w,d,c) + ln(x,y,x+w,y+d) + ln(x+w,y,x,y+d);
    case 'water_purifier_mijia_1200g': return rc(x,y,w,d,c,`rx="${Math.min(w*.16,d*.06)}"`) + ln(x+w*.08,y+d*.94,x+w*.92,y+d*.94);
    case 'tea_table_800': return rc(x,y,w,d,c)+rc(x+w*.025,y+d*.06,w*.60,d*.88,'#202521')+Array.from({length:18},(_,i)=>ln(x+w*(.045+i*.032),y+d*.12,x+w*(.045+i*.032),y+d*.87)).join('')+rc(x+w*.64,y+d*.06,w*.335,d*.88,'#101817')+[-.21,.175].map(z=>ec(w*251/800,d*z,w*57/800,d*57/400,'#c9ddda')+ec(w*251/800,d*z,w*40/800,d*40/400,'#aeb8b3')+ec(w*309/800,d*z,w*23/800,d*43/400,'none')).join('')+Array.from({length:6},(_,i)=>ec(w*(-315+i*72)/800,d*115/400,w*24/800,d*24/400,'#26483e')) .join('')+ec(-w*310/800,-d*94/400,w*31/800,d*31/400,'#26483e')+ec(-w*152/800,-d*80/400,w*41/800,d*41/400,'#26483e')+ec(-w*19/800,-d*86/400,w*33/800,d*33/400,'#26483e')+ln(x,y+d*.985,-x,y+d*.985);
    case 'tea_bar_mijia_pro': return rc(x,y,w,d,c,`rx="${w*.06}"`)+rc(x+w*.07,y+d*.02,w*.86,d*.14,'#afc5cc',`rx="${w*.02}"`)+rc(x,y+d*.15,w,d*.85,c,`rx="${w*.06}"`)+rc(x+w*.14,y+d*.92,w*.72,d*.05,'#172126','rx="3"')+`<circle cx="${w*58/315}" cy="${d*35/310}" r="${Math.min(w,d)*.20}" fill="#d7e4e5" stroke="${PAL.ink}" stroke-width="2"/>`+rc(w*.38,-d*.12,w*.10,d*.23,'none','rx="5"')+ln(-w*.32,d*.15,-w*.21,d*.15)+((typeof module==='object'&&module.exports?require('../core/product-rules.js'):root.FurnishProducts).teaBarDoors(f||{type:t,w,d}).filter(d=>d.open).map(d=>pa('M'+d.poly.map(p=>p.join(',')).join('L')+'Z',c)).join(''));
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
    case 'slidingdoor': case 'telescopicdoor20': case 'doubleslidingdoor': case 'tripleslidingdoor': case 'tripleslidingwindow': {
      const products=root.FurnishProducts||(typeof require==='function'?require('../core/product-rules.js'):null);
      if(products?.definition(t)?.telescopic){
        const item=f||{type:t,w,d},corner=products.slidingCorner(item,context.furniture,context.plan),layout=products.slidingLayout(item,corner);
        // The top rail is visible in a plan projection: omitting it makes the
        // staggered leaves appear disconnected. Parent applies furniture mirroring.
        const railFill=shade(c,1.15),rail=pa('M'+layout.railOutline.map(p=>p.join(' ')).join('L')+'Z',railFill,`data-sliding-track="top" style="stroke:${railFill}"`);
        const floor=products.value(item,'floorTrack')?layout.floorTracks.map(t=>ln(t.start,t.z,t.end,t.z,`data-sliding-floor-track="${t.leafIndex}" style="stroke:#c5c8c4;stroke-dasharray:6 4"`)).join(''):'';
        return rail+floor+layout.leaves.map((source,i)=>{const leaf={...source,x:products.value(item,'slidingOpen')?source.opened:source.x};return '<g data-sliding-leaf="'+i+'">'+rc(leaf.x-leaf.width/2,leaf.z-layout.leafDepth/2,leaf.width,layout.leafDepth,c)+rc(leaf.x-leaf.width/2+layout.edge,leaf.z-layout.leafDepth/6,leaf.width-2*layout.edge,layout.leafDepth/3,products.slidingGlass.planColor)+'</g>';}).join('');
      }
      const n=t==='slidingdoor'?2:3;
      let s=rc(x,y,w,d,c);
      for(let i=0;i<n;i++)s+=rc(x+i*w/n,y+d*(i+.15)/n,w/n,d*.65/n,products.slidingGlass.planColor)+ln(x+i*w/n+w/n*.85,y+d*(i+.15)/n,x+i*w/n+w/n*.85,y+d*(i+.8)/n);
      return s;
    }
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


const api={render,shade};
if(typeof module==='object'&&module.exports)module.exports=api;
else root.FurnishFurnitureSVG=api;
})(typeof globalThis!=='undefined'?globalThis:this);
