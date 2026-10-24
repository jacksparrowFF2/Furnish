/* Shared production models extracted unchanged from the application scene. */
(function(root){'use strict';
// Stable authoring-site labels: keep existing labels when moving code; allocate new labels for new sites.
const syncIdentity=root.FurnishPartIdentity||(typeof require==='function'?require('../core/part-identity.js'):null);

const types=["bed","sofa","armchair","cornersofa","dresser","desk","chair","coffeetable","table","roundtable","island","barstool","officechair","bench"];
function rng(seed){return()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
function build(THREE,f,RoundedBoxGeometry,options={}){
const P=root.FurnishModelPrimitives||(typeof require==='function'?require('./model-primitives.js'):null),primitives=options.primitives||P.create(THREE,RoundedBoxGeometry),{asMat,sh,mesh,rot,box,rbox,cyl,lathe,rod,tube,blob,ring,rrect,shell,darker,lighter,legs,metal,chrome,hwMat,blackMetal,mirror,ceramic,fabric,woodM,screenMat,glowMat,pull,knob,fronts,vasePts,vase,tableLamp,plate,mat}=primitives;
const M=v=>v/1000,g=new THREE.Group(),w=M(f.w),d=M(f.d),c=f.color||'#ddd',bz=-d/2,R=rng(Math.round(f.w*7+f.d*13+f.cx+f.cy));
switch(f.type){
    case 'bed': {
      const fr = woodM('#8d7258'), fab = fabric(c), fh = .3, mt = .22, top = fh + mt, n = Math.max(3, Math.round(w/.28)), sw = (w - .04)/n;
      g.add(syncIdentity.produce("basic-furniture-model:site-1",()=>box(w - .12, .06, d - .14, '#4a3e33', 0, 0, .03)), syncIdentity.produce("basic-furniture-model:site-2",()=>rbox(w, fh - .06, d - .08, fr, 0, .06, .04, .015)));        // 内缩踢脚 + 床箱
      g.add(syncIdentity.produce("basic-furniture-model:site-3",()=>rbox(w, 1.08, .06, fr, 0, 0, bz + .03, .012)));                                                                 // 床头板
      for(let i of syncIdentity.range("basic-furniture-model.js:generator-1",0,n,1,false))g.add(syncIdentity.produce("basic-furniture-model:site-4",()=>rbox(sw - .006, .62, .06, fabric(darker(c, .8)), -w/2 + .02 + sw*(i + .5), .42, bz + .08, .025)));   // 竖向软包
      const md = d - .13, dd = md*.66, dz = d/2 - .015 - dd/2;
      g.add(syncIdentity.produce("basic-furniture-model:site-5",()=>rbox(w - .06, mt, md, '#f6f3ee', 0, fh, bz + .11 + md/2, .07)));                                              // 床垫
      g.add(syncIdentity.produce("basic-furniture-model:site-6",()=>rbox(w + .02, .27, dd, fab, 0, top - .2, dz, .04)), syncIdentity.produce("basic-furniture-model:site-7",()=>rbox(w + .024, .06, .22, fabric('#fbfaf7'), 0, top + .025, dz - dd/2 + .11, .025)));   // 被子 + 翻边
      g.add(syncIdentity.produce("basic-furniture-model:site-8",()=>rbox(w + .05, .285, .42, fabric(darker(c, .62)), 0, top - .205, d/2 - .35, .03)));                               // 床尾巾
      const np = w >= 1.3 ? 2 : 1, pw = (w - .16 - (np-1)*.06)/np;
      for(let i of syncIdentity.range("basic-furniture-model.js:generator-2",0,np,1,false)){
        const x = -w/2 + .08 + pw/2 + i*(pw + .06);
        g.add(rot(syncIdentity.produce("basic-furniture-model:site-9",()=>rbox(pw, .15, .42, fabric('#ffffff'), x, top - .01, bz + .34, .07)), -.28), rot(syncIdentity.produce("basic-furniture-model:site-10",()=>rbox(pw*.62, .3, .1, fabric(i ? '#efe7da' : darker(c, .7)), x, top, bz + .54, .045)), -.3));
      }
      break;
    }
    case 'sofa': case 'armchair': {
      const fab = fabric(c), dk = fabric(darker(c, .88)), a = Math.min(.18, w*.14), n = f.type === 'armchair' ? 1 : (w > 2.2 ? 3 : 2), cw = (w - 2*a)/n, bd = Math.min(.2, d*.24), lh = .12, sd = d - bd - .02;
      syncIdentity.produce("basic-furniture-model.js:generator-call-1",()=>legs(g, w, d, lh, woodM('#3a3027'), .07, .018));
      g.add(syncIdentity.produce("basic-furniture-model:site-11",()=>rbox(w, .16, d, dk, 0, lh, 0, .03)), syncIdentity.produce("basic-furniture-model:site-12",()=>rbox(w, .73, bd, dk, 0, lh, bz + bd/2, .06)));
      syncIdentity.each("basic-furniture-model.js:generator-3",[-1, 1],s => g.add(syncIdentity.produce("basic-furniture-model:site-13",()=>rbox(a, .5, d, dk, s*(w/2 - a/2), lh, 0, .07))));
      for(let i of syncIdentity.range("basic-furniture-model.js:generator-4",0,n,1,false)){
        const x = -w/2 + a + cw/2 + i*cw;
        g.add(syncIdentity.produce("basic-furniture-model:site-14",()=>rbox(cw - .012, .15, sd, fab, x, lh + .16, bz + bd + sd/2, .055)), rot(syncIdentity.produce("basic-furniture-model:site-15",()=>rbox(cw - .03, .44, .16, fab, x, lh + .3, bz + bd + .08, .07)), -.16));
      }
      if (n > 1) syncIdentity.each("basic-furniture-model.js:generator-5",[-1, 1],s => g.add(rot(syncIdentity.produce("basic-furniture-model:site-16",()=>rbox(.42, .42, .12, fabric(s < 0 ? '#ece5d8' : darker(c, .7)), s*(w/2 - a - .26), lh + .32, bz + bd + .22, .06)), -.3, s*-.25)));
      else g.add(rot(syncIdentity.produce("basic-furniture-model:site-17",()=>rbox(.4, .26, .1, fabric('#ece5d8'), 0, lh + .33, bz + bd + .2, .05)), -.25));
      break;
    }
    case 'cornersofa': {
      const k = Math.min(.95, d*.56, w*.4), b = .2, fab = fabric(c), dk = fabric(darker(c, .88)), lh = .1, sw = (w - b - .2)/2;
      syncIdentity.each("basic-furniture-model.js:generator-6",[[-w/2+.07, bz+.07], [w/2-.07, bz+.07], [w/2-.07, bz+k-.07], [-w/2+.07, d/2-.07], [-w/2+k-.07, d/2-.07], [-w/2+k-.07, bz+k-.07]],([x, z]) => g.add(syncIdentity.produce("basic-furniture-model:site-18",()=>rod([x, 0, z], [x, lh, z], .012, woodM('#3a3027'), .018))));
      g.add(syncIdentity.produce("basic-furniture-model:site-19",()=>rbox(w, .18, k, dk, 0, lh, bz + k/2, .03)), syncIdentity.produce("basic-furniture-model:site-20",()=>rbox(k, .18, d - k + .02, dk, -w/2 + k/2, lh, bz + k + (d - k)/2 - .01, .03)));
      g.add(syncIdentity.produce("basic-furniture-model:site-21",()=>rbox(w, .72, b, dk, 0, lh, bz + b/2, .06)), syncIdentity.produce("basic-furniture-model:site-22",()=>rbox(b, .72, d, dk, -w/2 + b/2, lh, 0, .06)), syncIdentity.produce("basic-furniture-model:site-23",()=>rbox(.2, .5, k, dk, w/2 - .1, lh, bz + k/2, .07)), syncIdentity.produce("basic-furniture-model:site-24",()=>rbox(k, .5, .2, dk, -w/2 + k/2, lh, d/2 - .1, .07)));
      for(let i of syncIdentity.range("basic-furniture-model.js:generator-7",0,2,1,false)){
        const x = -w/2 + b + sw/2 + i*sw;
        g.add(syncIdentity.produce("basic-furniture-model:site-25",()=>rbox(sw - .012, .15, k - b - .02, fab, x, lh + .18, bz + b + (k - b)/2, .055)), rot(syncIdentity.produce("basic-furniture-model:site-26",()=>rbox(sw - .04, .42, .16, fab, x, lh + .3, bz + b + .07, .07)), -.16));
      }
      g.add(syncIdentity.produce("basic-furniture-model:site-27",()=>rbox(k - b - .02, .15, d - k - .22, fab, -w/2 + b + (k - b)/2, lh + .18, bz + k + (d - k - .2)/2, .055)));
      const L = d - .2 - b - .18, nl = Math.max(1, Math.round(L/.75));
      for(let i of syncIdentity.range("basic-furniture-model.js:generator-8",0,nl,1,false))g.add(rot(syncIdentity.produce("basic-furniture-model:site-28",()=>rbox(.16, .42, L/nl - .03, fab, -w/2 + b + .07, lh + .3, bz + b + .18 + L/nl*(i + .5), .07)), 0, 0, .16));
      g.add(rot(syncIdentity.produce("basic-furniture-model:site-29",()=>rbox(.42, .42, .12, fabric('#ece5d8'), -w/2 + b + .3, lh + .34, bz + b + .24, .06)), -.35, .6), rot(syncIdentity.produce("basic-furniture-model:site-30",()=>rbox(.4, .4, .12, fabric(darker(c, .7)), w/2 - .5, lh + .34, bz + b + .2, .06)), -.3, -.25));
      break;
    }
    case 'dresser': {
      const wm = woodM(c), r = Math.min(.34, w*.3);
      syncIdentity.each("basic-furniture-model.js:generator-9",[[-1,-1],[1,-1],[-1,1],[1,1]],([a, b]) => g.add(syncIdentity.produce("basic-furniture-model:site-31",()=>rod([a*(w/2 - .04), 0, b*(d/2 - .04)], [a*(w/2 - .05), .58, b*(d/2 - .05)], .012, wm, .02))));
      g.add(syncIdentity.produce("basic-furniture-model:site-32",()=>box(w - .04, .14, d - .04, wm, 0, .58)), syncIdentity.produce("basic-furniture-model:site-33",()=>rbox(w, .03, d, wm, 0, .72, 0, .008)));
      syncIdentity.produce("basic-furniture-model.js:generator-call-2",()=>fronts(g, -w/2 + .03, .585, w - .06, .13, d/2 - .02, 2, 1, wm, 'knob'));
      const mr = syncIdentity.produce("basic-furniture-model:site-34",()=>new THREE.Mesh(new THREE.TorusGeometry(r, .018, 12, 64), woodM(darker(c, .7)))); mr.position.set(0, .77 + r, bz + .04); sh(mr);
      const mg = syncIdentity.produce("basic-furniture-model:site-35",()=>new THREE.Mesh(new THREE.CircleGeometry(r, 64), mirror())); mg.position.set(0, .77 + r, bz + .035);
      g.add(mr, mg, syncIdentity.produce("basic-furniture-model:site-36",()=>box(.08, .03, .06, woodM(darker(c, .7)), 0, .75, bz + .04)));
      syncIdentity.each("basic-furniture-model.js:generator-10",[['#e7c9b5', .03, .09], ['#b9d0d8', .025, .12], ['#f0e3cf', .02, .07]],([cc, rr, hh], i) => g.add(syncIdentity.produce("basic-furniture-model:site-37",()=>cyl(rr, rr, hh, mat(cc, {roughness:.15, transparent:true, opacity:.8}), w*.25 + i*.06, .75, .02))));
      g.add(syncIdentity.produce("basic-furniture-model:site-38",()=>rbox(.16, .06, .1, woodM('#6b543f'), -w*.28, .75, .03, .01)));
      const sz = d/2 + .25;
      syncIdentity.each("basic-furniture-model.js:generator-11",[[-1,-1],[1,-1],[-1,1],[1,1]],([a, b]) => g.add(syncIdentity.produce("basic-furniture-model:site-39",()=>rod([a*.13, 0, sz + b*.13], [a*.12, .4, sz + b*.12], .01, wm, .014))));
      g.add(syncIdentity.produce("basic-furniture-model:site-40",()=>rbox(.34, .08, .34, fabric('#e8ddd0'), 0, .4, sz, .035)));
      break;
    }
    case 'desk': {
      const tm = woodM(c), bm = blackMetal();
      g.add(syncIdentity.produce("basic-furniture-model:site-41",()=>rbox(w, .025, d, tm, 0, .72, 0, .006)));
      syncIdentity.each("basic-furniture-model.js:generator-12",[-1, 1],s => {
        const x = s*(w/2 - .06);
        g.add(syncIdentity.produce("basic-furniture-model:site-42",()=>box(.03, .72, .03, bm, x, 0, d/2 - .06)), syncIdentity.produce("basic-furniture-model:site-43",()=>box(.03, .72, .03, bm, x, 0, bz + .06)), syncIdentity.produce("basic-furniture-model:site-44",()=>box(.03, .03, d - .1, bm, x, 0, 0)), syncIdentity.produce("basic-furniture-model:site-45",()=>box(.03, .03, d - .1, bm, x, .69, 0)));
      });
      g.add(syncIdentity.produce("basic-furniture-model:site-46",()=>box(w - .12, .04, .015, bm, 0, .66, bz + .06)), syncIdentity.produce("basic-furniture-model:site-47",()=>box(.4, .09, d - .12, tm, w/2 - .32, .63, 0)));
      syncIdentity.produce("basic-furniture-model:site-48",()=>pull(g, .16, false, w/2 - .32, .675, d/2 - .06));
      const my = .745, mz = bz + .15;
      g.add(syncIdentity.produce("basic-furniture-model:site-49",()=>rbox(.22, .012, .16, bm, 0, my, mz, .004)), syncIdentity.produce("basic-furniture-model:site-50",()=>rod([0, my, mz - .02], [0, my + .2, mz - .03], .012, bm)));
      g.add(syncIdentity.produce("basic-furniture-model:site-51",()=>rbox(.62, .37, .02, '#1d1d1f', 0, my + .12, mz - .04, .006)), syncIdentity.produce("basic-furniture-model:site-52",()=>box(.6, .33, .002, screenMat('#27405c'), 0, my + .15, mz - .029)));
      g.add(syncIdentity.produce("basic-furniture-model:site-53",()=>rbox(.42, .015, .13, '#e8e8ea', 0, my, .06, .004)), syncIdentity.produce("basic-furniture-model:site-54",()=>rbox(.4, .004, .11, '#d2d2d6', 0, my + .014, .06, .002)), syncIdentity.produce("basic-furniture-model:site-55",()=>blob(.03, .015, .05, '#e8e8ea', .3, my + .012, .07, 16)));
      const lx = -w/2 + .15, lz = bz + .12;
      g.add(syncIdentity.produce("basic-furniture-model:site-56",()=>cyl(.07, .075, .02, bm, lx, my, lz, 28)), syncIdentity.produce("basic-furniture-model:site-57",()=>tube([[lx, my + .02, lz], [lx, my + .3, lz + .03], [lx + .12, my + .42, lz + .1]], .008, bm)));
      const hd = syncIdentity.produce("basic-furniture-model:site-58",()=>cyl(.02, .06, .1, bm, lx + .14, my + .34, lz + .12, 24)); hd.rotation.x = .5; g.add(hd);
      g.add(syncIdentity.produce("basic-furniture-model:site-59",()=>cyl(.04, .038, .09, ceramic({roughness:.3}), w/2 - .15, my, .05, 20)), syncIdentity.produce("basic-furniture-model:site-60",()=>rbox(.2, .015, .28, '#3b5566', -w/2 + .3, my, .1, .004)));
      break;
    }
    case 'chair': {
      const lw = woodM('#6b543f'), fab = fabric(c), sy = .44;
      syncIdentity.each("basic-furniture-model.js:generator-13",[[-1, 1], [1, 1]],([s]) => g.add(syncIdentity.produce("basic-furniture-model:site-61",()=>rod([s*(w/2 - .04), 0, d/2 - .05], [s*(w/2 - .05), sy, d/2 - .07], .012, lw, .018))));
      syncIdentity.each("basic-furniture-model.js:generator-14",[-1, 1],s => g.add(syncIdentity.produce("basic-furniture-model:site-62",()=>rod([s*(w/2 - .04), 0, bz + .03], [s*(w/2 - .05), .86, bz + .07], .012, lw, .018))));
      g.add(syncIdentity.produce("basic-furniture-model:site-63",()=>box(w - .08, .025, .02, lw, 0, .15, d/2 - .06)), syncIdentity.produce("basic-furniture-model:site-64",()=>box(w - .08, .025, .02, lw, 0, .15, bz + .05)));
      syncIdentity.each("basic-furniture-model.js:generator-15",[-1, 1],s => g.add(syncIdentity.produce("basic-furniture-model:site-65",()=>box(.02, .025, d - .12, lw, s*(w/2 - .045), .18, 0))));
      g.add(syncIdentity.produce("basic-furniture-model:site-66",()=>box(w - .06, .04, d - .1, lw, 0, sy - .03, 0)), syncIdentity.produce("basic-furniture-model:site-67",()=>rbox(w - .04, .05, d - .08, fab, 0, sy, .005, .022)));
      g.add(rot(syncIdentity.produce("basic-furniture-model:site-68",()=>rbox(w - .08, .15, .025, lw, 0, .66, bz + .065, .012)), -.12), rot(syncIdentity.produce("basic-furniture-model:site-69",()=>box(w - .08, .025, .02, lw, 0, .52, bz + .055)), -.12));
      break;
    }
    case 'coffeetable': {
      const tm = mat(c, {roughness:.35}), lw = woodM('#3a3027');
      syncIdentity.each("basic-furniture-model.js:generator-16",[[-1,-1],[1,-1],[-1,1],[1,1]],([a, b]) => g.add(syncIdentity.produce("basic-furniture-model:site-70",()=>rod([a*(w/2 - .05), 0, b*(d/2 - .05)], [a*(w/2 - .07), .365, b*(d/2 - .07)], .012, lw, .02))));
      g.add(syncIdentity.produce("basic-furniture-model:site-71",()=>rbox(w, .035, d, tm, 0, .365, 0, .015)), syncIdentity.produce("basic-furniture-model:site-72",()=>rbox(w - .12, .02, d - .12, woodM(darker(c, .85)), 0, .12, 0, .006)));
      g.add(syncIdentity.produce("basic-furniture-model:site-73",()=>box(.3, .03, .22, '#0e8f83', w*.2, .14, 0)), syncIdentity.produce("basic-furniture-model:site-74",()=>box(.26, .025, .19, '#d9b36c', w*.2, .17, .01)));
      g.add(syncIdentity.produce("basic-furniture-model:site-75",()=>rbox(.38, .015, .24, woodM('#6b543f'), -w*.2, .4, 0, .006)), syncIdentity.produce("basic-furniture-model:site-76",()=>box(.22, .025, .16, '#e6dccd', -w*.22, .415, 0)));
      g.add(syncIdentity.produce("basic-furniture-model:site-77",()=>lathe([[0, 0], [.025, 0], [.035, .07], [.034, .08]], ceramic({side:THREE.DoubleSide}), -w*.12, .415, .06, 20)));
      syncIdentity.produce("basic-furniture-model:site-78",()=>vase(g, w*.24, .4, -.05, .055, .18, '#e9e2d6', R));
      break;
    }
    case 'table': {
      const tm = mat(c, {roughness:.4}), lw = woodM(darker(c, .55)), ns = Math.max(1, Math.round(w/.62)), top = .75;
      syncIdentity.each("basic-furniture-model.js:generator-17",[[-1,-1],[1,-1],[-1,1],[1,1]],([a, b]) => g.add(syncIdentity.produce("basic-furniture-model:site-79",()=>rod([a*(w/2 - .08), 0, b*(d/2 - .08)], [a*(w/2 - .1), .715, b*(d/2 - .1)], .016, lw, .026))));
      g.add(syncIdentity.produce("basic-furniture-model:site-80",()=>rbox(w, .035, d, tm, 0, .715, 0, .012)), syncIdentity.produce("basic-furniture-model:site-81",()=>box(w - .22, .07, d - .22, lw, 0, .645)));
      g.add(syncIdentity.produce("basic-furniture-model:site-82",()=>box(w*.7, .003, .32, fabric('#b9a58c'), 0, top, 0)));
      for(let i of syncIdentity.range("basic-furniture-model.js:generator-18",0,ns,1,false))syncIdentity.each("basic-furniture-model.js:generator-19",[-1, 1],s => {
        const x = -w/2 + w/ns*(i + .5), z = s*(d/2 - .17);
        g.add(syncIdentity.produce("basic-furniture-model:site-83",()=>box(.38, .003, .28, fabric('#e7dfd1'), x, top, z))); syncIdentity.produce("basic-furniture-model:site-84",()=>plate(g, .12, x, top + .003, z));
        g.add(syncIdentity.produce("basic-furniture-model:site-85",()=>cyl(.03, .026, .1, mat('#dfeef3', {transparent:true, opacity:.35, roughness:.05}), x + .15, top + .003, z - s*.1, 16)));
      });
      syncIdentity.produce("basic-furniture-model:site-86",()=>vase(g, 0, top + .003, 0, .06, .2, '#e9e2d6', R));
      break;
    }
    case 'roundtable': {
      const b = Math.min(.25, w*.3), lw = woodM('#4a3e33'), top = .75;
      g.add(syncIdentity.produce("basic-furniture-model:site-87",()=>lathe([[b, 0], [b, .015], [b*.8, .035], [.06, .12], [.045, .35], [.05, .6], [.12, .69], [.18, .715]], lw, 0, 0, 0, 40)), syncIdentity.produce("basic-furniture-model:site-88",()=>cyl(w/2, w/2, .035, mat(c, {roughness:.4}), 0, .715, 0, 64)));
      for(let k of syncIdentity.range("basic-furniture-model.js:generator-20",0,4,1,false)){ const a = k*Math.PI/2 + .4, rr = w/2 - .17; syncIdentity.produce("basic-furniture-model:site-89",()=>plate(g, .11, Math.cos(a)*rr, top, Math.sin(a)*rr)); }
      syncIdentity.produce("basic-furniture-model:site-90",()=>vase(g, 0, top, 0, .05, .18, '#e9e2d6', R));
      break;
    }

    case 'island': {
      const cm = mat(c, {roughness:.45}), stone = mat('#dcd7cf', {roughness:.2}), cd = d - .3, n = Math.max(1, Math.round((w - .1)/.6)), cab = new THREE.Group(), fz = cd/2 - .03;
      cab.add(syncIdentity.produce("basic-furniture-model:site-91",()=>box(w - .12, .1, cd - .08, '#4a4641', 0, 0, -.04)), syncIdentity.produce("basic-furniture-model:site-92",()=>box(w - .1, .74, cd - .03, cm, 0, .1, -.015)));
      syncIdentity.produce("basic-furniture-model.js:generator-call-3",()=>fronts(cab, -w/2 + .05, .64, w - .1, .2, fz, n, 1, cm, 'bar')); syncIdentity.produce("basic-furniture-model.js:generator-call-4",()=>fronts(cab, -w/2 + .05, .1, w - .1, .54, fz, n, 1, cm, 'bar', .56));
      cab.rotation.y = Math.PI; cab.position.z = bz + cd/2; g.add(cab);                    // 柜门朝 -z，+z 侧留出吧台挑空
      g.add(syncIdentity.produce("basic-furniture-model:site-93",()=>rbox(w, .05, d, stone, 0, .84, 0, .006)));
      syncIdentity.each("basic-furniture-model.js:generator-21",[-1, 1],s => g.add(syncIdentity.produce("basic-furniture-model:site-94",()=>box(.04, .84, d, stone, s*(w/2 - .02), 0, 0))));             // 瀑布式侧板
      g.add(syncIdentity.produce("basic-furniture-model:site-95",()=>lathe([[0, 0], [.06, 0], [.14, .06], [.15, .07]], mat('#6b543f', {roughness:.5, side:THREE.DoubleSide}), w*.22, .89, 0, 32)));
      for(let k of syncIdentity.range("basic-furniture-model.js:generator-22",0,4,1,false))g.add(syncIdentity.produce("basic-furniture-model:site-96",()=>blob(.04, .04, .04, ['#d98c4a', '#9fbf5a', '#b5463a', '#e6c14f'][k], w*.22 + Math.cos(k*1.6)*.05, .935 + (k === 3 ? .04 : 0), Math.sin(k*1.6)*.05, 14)));
      syncIdentity.produce("basic-furniture-model:site-97",()=>vase(g, -w*.25, .89, -.05, .05, .22, '#e9e2d6', R));
      break;
    }
    case 'barstool': {
      const r = Math.min(w, d)/2, bm = blackMetal(), sy = .7;
      syncIdentity.each("basic-furniture-model.js:generator-23",[[1,1],[1,-1],[-1,1],[-1,-1]],([a, b]) => g.add(syncIdentity.produce("basic-furniture-model:site-98",()=>rod([a*r*.72, 0, b*r*.72], [a*r*.4, sy, b*r*.4], .011, bm))));
      g.add(syncIdentity.produce("basic-furniture-model:site-99",()=>ring(Math.SQRT2*r*(.72 - .32*.4), .008, bm, 0, .28, 0)), syncIdentity.produce("basic-furniture-model:site-100",()=>cyl(r*.55, r*.55, .02, bm, 0, sy - .01, 0, 32)));
      g.add(syncIdentity.produce("basic-furniture-model:site-101",()=>lathe([[0, 0], [r*.85, 0], [r*.95, .02], [r*.97, .045], [r*.9, .07], [0, .075]], mat(c, {roughness:.6}), 0, sy, 0, 40)));
      break;
    }
    case 'officechair': {
      const r = Math.min(w, d)*.46, dk = darker(c, .75), bm = mat('#2b2b2d', {roughness:.45}), cm = chrome();
      for(let k of syncIdentity.range("basic-furniture-model.js:generator-24",0,5,1,false)){
        const a = k*Math.PI*2/5, tx = Math.sin(a)*r*.95, tz = Math.cos(a)*r*.95;
        g.add(syncIdentity.produce("basic-furniture-model:site-102",()=>rod([0, .1, 0], [tx, .07, tz], .022, bm, .014, 10)), syncIdentity.produce("basic-furniture-model:site-103",()=>cyl(.008, .008, .03, bm, tx, .04, tz, 8)), rot(syncIdentity.produce("basic-furniture-model:site-104",()=>cyl(.026, .026, .03, '#111', tx, .026 - .015, tz, 16)), 0, a, Math.PI/2));
      }
      g.add(syncIdentity.produce("basic-furniture-model:site-105",()=>cyl(.05, .06, .05, bm, 0, .08, 0, 20)), syncIdentity.produce("basic-furniture-model:site-106",()=>cyl(.025, .025, .22, cm, 0, .12, 0, 16)), syncIdentity.produce("basic-furniture-model:site-107",()=>cyl(.036, .036, .12, bm, 0, .12, 0, 16)), syncIdentity.produce("basic-furniture-model:site-108",()=>rbox(.22, .05, .22, bm, 0, .34, .02, .01)));
      g.add(syncIdentity.produce("basic-furniture-model:site-109",()=>rbox(w*.78, .03, d*.72, bm, 0, .38, .04, .01)), syncIdentity.produce("basic-furniture-model:site-110",()=>rbox(w*.8, .08, d*.74, fabric(c), 0, .4, .05, .035)));
      g.add(syncIdentity.produce("basic-furniture-model:site-111",()=>tube([[0, .36, 0], [0, .38, bz + .12], [0, .6, bz + .07]], .02, bm)));
      const bf = syncIdentity.produce("basic-furniture-model:site-112",()=>shell(w*.72, .6, .03, .025, .08, bm)); bf.rotation.x = Math.PI/2 - .12; bf.position.set(0, .88, bz + .06); g.add(bf);
      g.add(rot(syncIdentity.produce("basic-furniture-model:site-113",()=>box(w*.68, .56, .006, mat(dk, {roughness:.85, transparent:true, opacity:.88, side:THREE.DoubleSide}), 0, .6, bz + .085)), -.12), rot(syncIdentity.produce("basic-furniture-model:site-114",()=>rbox(w*.5, .08, .03, fabric(c), 0, .66, bz + .11, .015)), -.12));
      g.add(syncIdentity.produce("basic-furniture-model:site-115",()=>rod([-.05, 1.14, bz + .025], [-.05, 1.22, bz + .015], .008, bm)), syncIdentity.produce("basic-furniture-model:site-116",()=>rod([.05, 1.14, bz + .025], [.05, 1.22, bz + .015], .008, bm)), syncIdentity.produce("basic-furniture-model:site-117",()=>rbox(w*.45, .12, .05, fabric(dk), 0, 1.2, bz + .02, .025)));
      syncIdentity.each("basic-furniture-model.js:generator-25",[-1, 1],s => g.add(syncIdentity.produce("basic-furniture-model:site-118",()=>box(.035, .22, .035, bm, s*w*.4, .42, .04)), syncIdentity.produce("basic-furniture-model:site-119",()=>rbox(.07, .03, d*.4, bm, s*w*.4, .63, .04, .012))));
      break;
    }
    case 'bench': {   // 换鞋凳
      syncIdentity.produce("basic-furniture-model.js:generator-call-5",()=>legs(g, w, d, .3, woodM('#5a4a3b'), .06, .015));
      g.add(syncIdentity.produce("basic-furniture-model:site-120",()=>rbox(w, .1, d, fabric(c), 0, .3, 0, .028)));
      g.add(syncIdentity.produce("basic-furniture-model:site-121",()=>rbox(w*.9, .04, d*.85, fabric(darker(c, .85)), 0, .4, 0, .012)));
      break;
    }
}
g.traverse(o=>{if(o.isMesh)o.userData.basicFurniturePart=o.geometry.type||'structure';});return g;}
const api={types,supported:f=>types.includes(f.type)&&!f.obj,build};root.FurnishBasicFurnitureModel=api;if(typeof module==='object'&&module.exports)module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this);
