/* Legacy production shapes shared by scene and numeric solids. Geometry retained verbatim. */
(function(root){'use strict';
const syncIdentity=root.FurnishPartIdentity||(typeof require==='function'?require('../core/part-identity.js'):null);
const types=["purifier", "crib", "sidetable", "shower", "bathtub", "floorlamp", "plant", "piano", "treadmill", "dryingrack"];
function rng(seed){return()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
function build(THREE,f,RoundedBoxGeometry){
const P=root.FurnishModelPrimitives||(typeof require==='function'?require('./model-primitives.js'):null),{asMat,sh,mesh,rot,box,rbox,cyl,lathe,rod,tube,blob,ring,rrect,shell,darker,lighter,legs,metal,chrome,hwMat,blackMetal,mirror,ceramic,fabric,woodM,screenMat,glowMat,pull,knob,fronts,vasePts,vase,tableLamp,plate,mat}=P.create(THREE,RoundedBoxGeometry);
const M=v=>v/1000,g=new THREE.Group(),w=M(f.w),d=M(f.d),c=f.color||'#ddd',bz=-d/2,R=rng(Math.round(f.w*7+f.d*13+f.cx+f.cy));
const glassMat=new THREE.MeshPhysicalMaterial({color:0xcfe6ef,roughness:.05,transparent:true,opacity:.28,depthWrite:false,side:THREE.DoubleSide}),frameMat=mat('#5d6166',{roughness:.5,metalness:.4});
switch(f.type){
    case 'purifier': {
      const pm = mat(c, {roughness:.45}), h = .72;
      g.add(syncIdentity.produce("index:site-172",()=>rbox(w, h, d, pm, 0, 0, 0, Math.min(w, d)*.2)), syncIdentity.produce("index:site-173",()=>rbox(w - .05, .006, d - .05, '#8d959b', 0, h - .002, 0, .02)));
      for(let i of syncIdentity.range("index.html:generator-26",0,7,1,false))g.add(syncIdentity.produce("index:site-174",()=>box(w - .07, .004, .006, '#6f777d', 0, h + .002, -d/2 + .05 + i*(d - .1)/6)));
      g.add(syncIdentity.produce("index:site-175",()=>rbox(w - .06, .42, .006, fabric('#c8ccd0'), 0, .06, d/2 - .001, .01)));
      const rg = syncIdentity.produce("index:site-176",()=>new THREE.Mesh(new THREE.TorusGeometry(.03, .004, 8, 32), mat('#101214', {emissive:'#4fb3a5', emissiveIntensity:.8}))); rg.position.set(0, .6, d/2 + .002); g.add(rg);
      break;
    }
    case 'crib': {
      const wm = woodM(c);
      g.add(syncIdentity.produce("index:site-108",()=>rbox(w - .09, .12, d - .09, fabric('#ffffff'), 0, .3, 0, .04)), syncIdentity.produce("index:site-109",()=>box(w - .06, .025, d - .06, wm, 0, .28)));
      syncIdentity.each("index.html:generator-15",[[-1,-1],[1,-1],[-1,1],[1,1]],([a, b]) => g.add(syncIdentity.produce("index:site-110",()=>rbox(.045, .95, .045, wm, a*(w/2 - .022), 0, b*(d/2 - .022), .008)), syncIdentity.produce("index:site-111",()=>blob(.028, .028, .028, wm, a*(w/2 - .022), .97, b*(d/2 - .022), 14))));
      syncIdentity.each("index.html:generator-16",[-1, 1],s => {
        const z = s*(d/2 - .022), x = s*(w/2 - .022);
        g.add(syncIdentity.produce("index:site-112",()=>rbox(w - .05, .035, .03, wm, 0, .88, z, .008)), syncIdentity.produce("index:site-113",()=>rbox(w - .05, .035, .03, wm, 0, .25, z, .008)), syncIdentity.produce("index:site-114",()=>rbox(.03, .035, d - .05, wm, x, .88, 0, .008)), syncIdentity.produce("index:site-115",()=>rbox(.03, .035, d - .05, wm, x, .25, 0, .008)));
        for(let p of syncIdentity.range("index.html:generator-17",-w/2 + .09,w/2 - .05,(.075),false))g.add(syncIdentity.produce("index:site-116",()=>rod([p, .28, z], [p, .88, z], .009, wm, .009, 8)));
        for(let p of syncIdentity.range("index.html:generator-18",-d/2 + .09,d/2 - .05,(.075),false))g.add(syncIdentity.produce("index:site-117",()=>rod([x, .28, p], [x, .88, p], .009, wm, .009, 8)));
      });
      g.add(syncIdentity.produce("index:site-118",()=>rbox(w*.5, .03, d - .14, fabric('#f3d9c9'), w*.12, .42, 0, .015)), syncIdentity.produce("index:site-119",()=>rbox(.3, .06, .2, fabric('#fbfaf7'), -w/2 + .22, .42, 0, .03)));
      const bx = -w*.3 + .1, bear = '#c9a27a';
      g.add(syncIdentity.produce("index:site-120",()=>blob(.05, .06, .045, bear, bx, .5, .12)), syncIdentity.produce("index:site-121",()=>blob(.045, .042, .04, bear, bx, .59, .12)), syncIdentity.produce("index:site-122",()=>blob(.016, .016, .01, bear, bx - .032, .625, .12)), syncIdentity.produce("index:site-123",()=>blob(.016, .016, .01, bear, bx + .032, .625, .12)));
      break;
    }
    case 'sidetable': {
      const r = Math.min(w, d)/2, bm = blackMetal();
      g.add(syncIdentity.produce("index:site-126",()=>lathe([[r*.55, 0], [r*.55, .012], [.03, .035], [.018, .3], [.025, .5], [.08, .52]], bm, 0, 0, 0, 40)), syncIdentity.produce("index:site-127",()=>cyl(r, r*.98, .025, mat(c, {roughness:.35}), 0, .52, 0, 48)));
      g.add(syncIdentity.produce("index:site-128",()=>box(.16, .02, .12, '#4f6b8a', -r*.25, .545, 0)));
      syncIdentity.produce("index:site-129",()=>vase(g, r*.35, .545, -r*.1, .035, .12, '#e9e2d6', R, false));
      break;
    }
    case 'shower': {
      const cm = chrome(), x = -w/4;
      g.add(syncIdentity.produce("index:site-85",()=>rbox(w, .05, d, mat('#f4f4f2', {roughness:.3}), 0, 0, 0, .01)), syncIdentity.produce("index:site-86",()=>box(w*.6, .003, .05, mat('#9aa1a8', {metalness:.8, roughness:.3}), 0, .05, bz + .08)));
      syncIdentity.each("index.html:generator-12",[[w, .01, 0, d/2 - .005], [.01, d, w/2 - .005, 0]],([gw, gd, px, pz]) => { const p = syncIdentity.produce("index:site-87",()=>box(gw, 1.95, gd, glassMat, px, .05, pz)); p.castShadow = false; g.add(p); });
      g.add(syncIdentity.produce("index:site-88",()=>box(.02, 1.95, .02, frameMat, w/2 - .01, .05, d/2 - .01)), syncIdentity.produce("index:site-89",()=>box(.02, 1.95, .03, frameMat, -w/2 + .01, .05, d/2 - .005)), syncIdentity.produce("index:site-90",()=>box(.03, 1.95, .02, frameMat, w/2 - .005, .05, bz + .01)));
      g.add(syncIdentity.produce("index:site-91",()=>box(w, .015, .02, frameMat, 0, 1.985, d/2 - .005)), syncIdentity.produce("index:site-92",()=>box(.02, .015, d, frameMat, w/2 - .005, 1.985, 0)));
      g.add(syncIdentity.produce("index:site-93",()=>rbox(.14, .1, .04, cm, x, 1.0, bz + .02, .01)), syncIdentity.produce("index:site-94",()=>rod([x, 1.1, bz + .03], [x, 1.95, bz + .03], .012, cm)));
      g.add(syncIdentity.produce("index:site-95",()=>tube([[x, 1.95, bz + .03], [x, 2.02, bz + .06], [x, 2.03, bz + .22]], .01, cm)), syncIdentity.produce("index:site-96",()=>rbox(.24, .012, .24, cm, x, 2.02, bz + .25, .004)));
      g.add(rot(syncIdentity.produce("index:site-97",()=>cyl(.015, .02, .2, cm, x + .1, 1.25, bz + .05, 16)), .25), syncIdentity.produce("index:site-98",()=>blob(.03, .012, .03, cm, x + .1, 1.47, bz + .08, 16)));
      g.add(syncIdentity.produce("index:site-99",()=>box(.26, .012, .1, ceramic(), w/2 - .2, 1.2, bz + .05)));
      syncIdentity.each("index.html:generator-13",[['#e6dccd', .03, .18], ['#0e8f83', .025, .15], ['#f4f4f2', .028, .12]],([cc, r, hh], i) => g.add(syncIdentity.produce("index:site-100",()=>cyl(r, r, hh, mat(cc, {roughness:.3}), w/2 - .28 + i*.07, 1.212, bz + .05, 16))));
      break;
    }
    case 'bathtub': {
      const cer = ceramic(), h = .56, t = .07, cm = chrome();
      g.add(syncIdentity.produce("index:site-101",()=>shell(w, d, h, t, .14, cer)), syncIdentity.produce("index:site-102",()=>box(w - .1, .12, d - .1, cer, 0, 0, 0)), syncIdentity.produce("index:site-103",()=>box(w - 2*t + .004, .004, d - 2*t + .004, mat('#bfe0ea', {roughness:.03, transparent:true, opacity:.6}), 0, .4, 0)));
      const fx = w/2 - t/2;
      g.add(syncIdentity.produce("index:site-104",()=>tube([[fx, h - .02, 0], [fx, h + .1, 0], [fx - .06, h + .13, 0], [fx - .13, h + .09, 0]], .014, cm)));
      syncIdentity.each("index.html:generator-14",[-1, 1],s => g.add(syncIdentity.produce("index:site-105",()=>cyl(.02, .02, .04, cm, fx, h, s*.1, 16))));
      g.add(rot(syncIdentity.produce("index:site-106",()=>rbox(.08, .16, .3, cer, -w/2 + t + .06, h - .12, 0, .04)), 0, 0, -.5), syncIdentity.produce("index:site-107",()=>rbox(.22, .05, .16, fabric('#e9e2d6'), fx - .05, h, d/2 - .1, .02)));
      break;
    }
    case 'floorlamp': {
      const r = Math.min(w, d)/2, lm = mat(c, {roughness:.35, metalness:.5});
      g.add(syncIdentity.produce("index:site-130",()=>lathe([[0, 0], [r*.55, 0], [r*.58, .012], [r*.5, .03], [.02, .035]], lm, 0, 0, 0, 40)), syncIdentity.produce("index:site-131",()=>rod([0, .03, 0], [0, 1.36, 0], .011, lm)));
      g.add(syncIdentity.produce("index:site-132",()=>lathe([[r*.85, 0], [r*.55, .36]], glowMat('#f6ecd9', '#ffdca0', .45), 0, 1.22, 0, 48)), syncIdentity.produce("index:site-133",()=>blob(.035, .035, .035, glowMat('#fff', '#ffe2b0', 1.2), 0, 1.36, 0, 12)));
      g.add(syncIdentity.produce("index:site-134",()=>ring(r*.85, .004, lm, 0, 1.22, 0)), syncIdentity.produce("index:site-135",()=>ring(r*.55, .004, lm, 0, 1.58, 0)));
      break;
    }
    case 'plant': {
      const r = Math.min(w, d)/2, H = .9 + r*1.6, pot = mat('#d9d2c5', {roughness:.6}), lm = [mat('#5f8f4e', {roughness:.6, side:THREE.DoubleSide}), mat('#79a862', {roughness:.6, side:THREE.DoubleSide})];
      g.add(syncIdentity.produce("index:site-46",()=>lathe([[0, 0], [r*.4, 0], [r*.44, .02], [r*.54, .36], [r*.57, .4], [r*.52, .4], [r*.5, .37], [0, .37]], pot, 0, 0, 0, 36)), syncIdentity.produce("index:site-47",()=>cyl(r*.49, r*.49, .005, '#4a3a2c', 0, .368, 0, 28)));
      g.add(syncIdentity.produce("index:site-48",()=>rod([0, .37, 0], [.02, H*.62, -.01], .016, '#6b5540', .009)));
      const N = 20 + Math.round(r*36), sc = Math.sqrt(r/.25);
      for(let k of syncIdentity.range("index.html:generator-6",0,N,1,false)){
        const t = k/N, a = k*2.399 + R()*.3, len = (.14 + R()*.08)*(1.1 - t*.4)*sc, s0 = .03 + R()*.08*sc, p = new THREE.Group();
        p.position.set(0, H*(.42 + .58*t), 0); p.rotation.set(0, -a, .1 + t*.5 + R()*.3, 'YXZ');
        const lf = syncIdentity.produce("index:site-49",()=>blob(len/2, .005, len*.27, lm[k % 2], s0 + len/2, 0, 0, 16)); lf.rotation.z = -.3;
        p.add(syncIdentity.produce("index:site-50",()=>box(s0, .005, .005, '#6f8f4a', s0/2, 0, 0)), lf); g.add(p);
      }
      break;
    }
    case 'piano': {
      const pk = mat(c, {roughness:.12, metalness:.1}), bd = d*.5, kz = bz + bd, h = 1.25, kd = d*.22 - .03, iv = mat('#faf8f3', {roughness:.3}), eb = mat('#111', {roughness:.25}), kw = (w - .12)/52;
      g.add(syncIdentity.produce("index:site-177",()=>box(w, h, bd, pk, 0, 0, bz + bd/2)), syncIdentity.produce("index:site-178",()=>rbox(w + .02, .03, bd + .03, pk, 0, h, bz + bd/2 + .01, .008)));
      syncIdentity.each("index.html:generator-27",[-1, 1],s => g.add(syncIdentity.produce("index:site-179",()=>rbox(.06, .13, kd + .06, pk, s*(w/2 - .03), .6, kz + (kd + .06)/2, .01)), syncIdentity.produce("index:site-180",()=>box(.05, .6, .05, pk, s*(w/2 - .08), 0, kz + kd + .01)), syncIdentity.produce("index:site-181",()=>box(.06, .04, d - bd, pk, s*(w/2 - .08), 0, kz + (d - bd)/2))));
      g.add(syncIdentity.produce("index:site-182",()=>box(w - .12, .08, kd + .05, pk, 0, .6, kz + (kd + .05)/2)), syncIdentity.produce("index:site-183",()=>box(w - .12, .1, .03, pk, 0, .68, kz + .015)));
      for(let i of syncIdentity.range("index.html:generator-28",0,52,1,false)){
        const x = -w/2 + .06 + kw*(i + .5); g.add(syncIdentity.produce("index:site-184",()=>box(kw - .0015, .022, kd, iv, x, .68, kz + .03 + kd/2)));
        if (i < 51 && 'ACDFG'.includes('ABCDEFG'[i % 7])) g.add(syncIdentity.produce("index:site-185",()=>box(kw*.58, .02, kd*.62, eb, x + kw/2, .7, kz + .03 + kd*.31)));
      }
      g.add(rot(syncIdentity.produce("index:site-186",()=>box(w*.42, .18, .012, pk, 0, .84, kz + .012)), -.25));
      syncIdentity.each("index.html:generator-29",[-.06, 0, .06],x => g.add(syncIdentity.produce("index:site-187",()=>box(.025, .012, .07, mat('#c9a35a', {metalness:.9, roughness:.3}), x, .05, kz + .03))));
      const mt = syncIdentity.produce("index:site-188",()=>cyl(.0, .05, .2, woodM('#5a3e2b'), w*.3, h + .03, bz + bd/2, 4)); mt.rotation.y = Math.PI/4; g.add(mt);
      g.add(rot(syncIdentity.produce("index:site-189",()=>box(.14, .18, .015, woodM('#c9a27a'), -w*.3, h + .03, bz + .06)), -.15), rot(syncIdentity.produce("index:site-190",()=>box(.11, .14, .002, '#9fb3c2', -w*.3, h + .05, bz + .07)), -.15));
      break;
    }
    case 'treadmill': {
      const tm = mat(c, {roughness:.55}), bm = mat('#2a2a2c', {roughness:.5}), al = mat('#9a9ea3', {metalness:.6, roughness:.4});
      g.add(syncIdentity.produce("index:site-191",()=>rbox(w, .14, d - .25, tm, 0, .03, .125, .03)), syncIdentity.produce("index:site-192",()=>box(w - .16, .006, d - .5, '#141414', 0, .17, .15)));
      syncIdentity.each("index.html:generator-30",[-1, 1],s => g.add(syncIdentity.produce("index:site-193",()=>box(.07, .008, d - .45, al, s*(w/2 - .05), .17, .15))));
      syncIdentity.each("index.html:generator-31",[bz + .06, d/2 - .06],z => syncIdentity.each("index.html:generator-32",[-1, 1],s => g.add(syncIdentity.produce("index:site-194",()=>box(.06, .03, .06, bm, s*(w/2 - .06), 0, z)))));
      g.add(syncIdentity.produce("index:site-195",()=>rbox(w, .22, .32, tm, 0, 0, bz + .16, .05)));
      syncIdentity.each("index.html:generator-33",[-1, 1],s => g.add(syncIdentity.produce("index:site-196",()=>rod([s*(w/2 - .06), .15, bz + .2], [s*(w/2 - .06), 1.15, bz + .3], .025, bm, .022)), syncIdentity.produce("index:site-197",()=>tube([[s*(w/2 - .06), 1.0, bz + .28], [s*(w/2 - .06), 1.0, bz + .5], [s*(w/2 - .07), .97, bz + .62]], .018, bm))));
      const cg = new THREE.Group(); cg.position.set(0, 1.2, bz + .31); cg.rotation.x = -.5;
      cg.add(syncIdentity.produce("index:site-198",()=>rbox(w*.8, .2, .08, bm, 0, -.1, 0, .02)), syncIdentity.produce("index:site-199",()=>box(w*.4, .11, .004, screenMat('#2a5d8f'), 0, -.055, .041))); g.add(cg);
      break;
    }
    case 'dryingrack': {   // 晾衣架：双杆 + 吊杆 + A 字腿
      const barM = metal();
      syncIdentity.each("index.html:generator-36",[bz + .05, d/2 - .05],z => g.add(syncIdentity.produce("index:site-212",()=>rod([-w/2 + .03, 1.34, z], [w/2 - .03, 1.34, z], .013, barM))));
      for(let i of syncIdentity.range("index.html:generator-37",0,6,1,false)){
        const px = -w/2 + .08 + i*(w - .16)/5;
        g.add(syncIdentity.produce("index:site-213",()=>rod([px, 1.34, bz + .05], [px, .58, bz + .05], .008, barM, .008, 8)));
      }
      syncIdentity.each("index.html:generator-38",[-1, 1],s => syncIdentity.each("index.html:generator-39",[bz + .05, d/2 - .05],z =>
        g.add(syncIdentity.produce("index:site-214",()=>rod([s*(w/2 - .06), 0, z], [s*(w/2 - .06), 1.34, z], .016, barM)))));
      break;
    }
}
g.traverse(o=>{if(o.isMesh)o.userData.legacyFurniturePart=o.geometry.type||'structure';});return g;}
const api={types,supported:f=>types.includes(f.type)&&!f.obj,build};if(typeof module==='object'&&module.exports)module.exports=api;else root.FurnishLegacyFurnitureModel=api;
})(typeof globalThis!=='undefined'?globalThis:this);
