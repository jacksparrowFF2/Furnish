/* Shared production geometry. Metres in/out; y is the bottom unless documented. */
(function(root){
'use strict';
// Stable authoring-site labels: keep existing labels when moving code; allocate new labels for new sites.
const syncIdentity=root.FurnishPartIdentity||(typeof require==='function'?require('../core/part-identity.js'):null);

function create(THREE,RoundedBoxGeometry,mat=(color,options={})=>new THREE.MeshStandardMaterial({color,...options})){
const asMat = m => typeof m === 'string' ? mat(m) : m;
const sh = o => { o.castShadow = o.receiveShadow = true; return o; };
const mesh = (geo, m) => sh(syncIdentity.produce("model-primitives:site-1",()=>new THREE.Mesh(geo, asMat(m))));
const rot = (o, x = 0, y = 0, z = 0) => { o.rotation.set(x, y, z); return o; };
function box(w, h, d, m, x = 0, y = 0, z = 0){
  const o = syncIdentity.produce("model-primitives:site-2",()=>mesh(new THREE.BoxGeometry(w, h, d), m)); o.position.set(x, y + h/2, z); return o;
}
function rbox(w, h, d, m, x = 0, y = 0, z = 0, r = .04){
  const o = syncIdentity.produce("model-primitives:site-3",()=>mesh(new RoundedBoxGeometry(w, h, d, 3, Math.min(r, w/2-.001, h/2-.001, d/2-.001)), m)); o.position.set(x, y + h/2, z); return o;
}
function cyl(rt, rb, h, m, x = 0, y = 0, z = 0, seg = 28){
  const o = syncIdentity.produce("model-primitives:site-4",()=>mesh(new THREE.CylinderGeometry(rt, rb, h, seg), m)); o.position.set(x, y + h/2, z); return o;
}
// 旋转体：pts = [[半径, 高度], …] 自下而上，y = 底面
function lathe(pts, m, x = 0, y = 0, z = 0, seg = 40){
  const o = syncIdentity.produce("model-primitives:site-5",()=>mesh(new THREE.LatheGeometry(pts.map(([r, h]) => new THREE.Vector2(Math.max(r, 1e-4), h)), seg), m)); o.position.set(x, y, z); return o;
}
// 两点之间的圆杆，r0 在 a 端、r1 在 b 端（收分椅腿、斜撑）
function rod(a, b, r0, m, r1 = r0, seg = 12){
  const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b), o = syncIdentity.produce("model-primitives:site-6",()=>mesh(new THREE.CylinderGeometry(r1, r0, A.distanceTo(B), seg), m));
  o.position.copy(A).add(B).multiplyScalar(.5); o.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), B.sub(A).normalize()); return o;
}
// 沿曲线的圆管（水龙头、扶手、灯臂）
const tube = (pts, r, m, seg = 40) => syncIdentity.produce("model-primitives:site-7",()=>mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map(p => new THREE.Vector3(...p)), false, 'centripetal'), seg, r, 10), m));
// 椭球（靠垫、叶片、豆袋），y = 中心
function blob(rx, ry, rz, m, x = 0, y = 0, z = 0, seg = 24){
  const o = syncIdentity.produce("model-primitives:site-8",()=>mesh(new THREE.SphereGeometry(1, seg, Math.round(seg*.7)), m)); o.scale.set(rx, ry, rz); o.position.set(x, y, z); return o;
}
// 水平圆环，y = 中心
function ring(R, r, m, x = 0, y = 0, z = 0){ const o = syncIdentity.produce("model-primitives:site-9",()=>mesh(new THREE.TorusGeometry(R, r, 10, 48), m)); o.rotation.x = Math.PI/2; o.position.set(x, y, z); return o; }
function rrect(w, d, r){
  const s = new THREE.Shape(), x = -w/2, y = -d/2; r = Math.min(r, w/2 - .001, d/2 - .001);
  s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r); s.lineTo(x + w, y + d - r); s.quadraticCurveTo(x + w, y + d, x + w - r, y + d);
  s.lineTo(x + r, y + d); s.quadraticCurveTo(x, y + d, x, y + d - r); s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y); return s;
}
// 中空圆角框（浴缸、水槽沿、椅背框）：外 w×d、壁厚 t、高 h
function shell(w, d, h, t, r, m, x = 0, y = 0, z = 0){
  const s = syncIdentity.produce("model-primitives:site-10",()=>rrect(w, d, r)); s.holes.push(syncIdentity.produce("model-primitives:site-11",()=>rrect(w - 2*t, d - 2*t, Math.max(.004, r - t))));
  const geo = new THREE.ExtrudeGeometry(s, {depth:h, bevelEnabled:false, curveSegments:10}); geo.rotateX(-Math.PI/2);
  const o = syncIdentity.produce("model-primitives:site-12",()=>mesh(geo, m)); o.position.set(x, y, z); return o;
}
const darker = (hex, k = .8) => '#' + new THREE.Color(hex).multiplyScalar(k).getHexString();
const lighter = (hex, k = .2) => '#' + new THREE.Color(hex).lerp(new THREE.Color('#ffffff'), k).getHexString();
// 四条收分腿：inset 为距边距离，r 为腿底半径（顶部略粗）
const legs = (g, w, d, h, m, inset = .05, r = .02) => syncIdentity.each("model-primitives.js:generator-1",[[-1,-1],[1,-1],[-1,1],[1,1]],([a, b]) => g.add(syncIdentity.produce("model-primitives:site-13",()=>rod([a*(w/2-inset), 0, b*(d/2-inset)], [a*(w/2-inset), h, b*(d/2-inset)], r*.7, m, r))));
const metal = () => mat('#cfd2d4', {metalness:.9, roughness:.25});
const chrome = () => mat('#eef0f2', {metalness:1, roughness:.08});
const hwMat = () => mat('#b9b3a8', {metalness:.85, roughness:.3});
const blackMetal = () => mat('#2b2b2d', {metalness:.6, roughness:.4});
const mirror = () => mat('#dfeaee', {metalness:.55, roughness:.06});
const ceramic = (o = {}) => mat('#fbfbf9', {roughness:.12, ...o});
const fabric = c => mat(c, {roughness:.96});
const woodM = c => mat(c, {roughness:.55});
const screenMat = (glow = '#1a2636') => mat('#0b0e13', {roughness:.1, metalness:.3, emissive:glow, emissiveIntensity:.35});
const glowMat = (c = '#fff4dc', e = '#ffdca0', k = .5) => mat(c, {emissive:e, emissiveIntensity:k, roughness:.9, side:THREE.DoubleSide});

// 拉手：y 为拉手中心，z 为门板正面
function pull(g, len, vert, x, y, z){
  const m = hwMat(), o = new THREE.Group();
  o.add(vert ? syncIdentity.produce("model-primitives:site-14",()=>box(.01, len, .01, m, 0, -len/2, .028)) : syncIdentity.produce("model-primitives:site-15",()=>box(len, .01, .01, m, 0, -.005, .028)));
  syncIdentity.each("model-primitives.js:generator-2",[-1, 1],s => o.add(vert ? syncIdentity.produce("model-primitives:site-16",()=>box(.008, .008, .028, m, 0, s*(len/2 - .015) - .004, .014)) : syncIdentity.produce("model-primitives:site-17",()=>box(.008, .008, .028, m, s*(len/2 - .015), -.004, .014))));
  o.position.set(x, y, z); g.add(o);
}
function knob(g, x, y, z){ const k = syncIdentity.produce("model-primitives:site-18",()=>cyl(.011, .014, .02, hwMat(), x, y - .01, z + .01, 16)); k.rotation.x = Math.PI/2; g.add(k, syncIdentity.produce("model-primitives:site-19",()=>blob(.014, .014, .008, hwMat(), x, y, z + .022, 12))); }
// 柜门 / 抽屉面板：x0..x0+w、y0..y0+h 区域内 nx 列 × ny 行，正面朝 +z（z = 柜体正面）
// hd：'bar' 金属拉手 | 'knob' 圆钮 | 'edge' 顶部隐形拉槽 | 'none'；hy：门拉手中心高度（null = 面板中部）
function fronts(g, x0, y0, w, h, z, nx, ny, m, hd = 'bar', hy = null){
  const gap = .005, pw = w/nx, ph = h/ny, fz = z + .018;
  g.add(syncIdentity.produce("model-primitives:site-20",()=>box(w, h, .002, '#2a2724', x0 + w/2, y0, z + .001)));                     // 缝隙里透出的暗色
  for(let i of syncIdentity.range("model-primitives.js:generator-3",0,nx,1,false))for(let j of syncIdentity.range("model-primitives.js:generator-4",0,ny,1,false)){
    const cx = x0 + pw*(i + .5), yb = y0 + ph*j, drawer = ph < .4 && pw >= ph;
    g.add(syncIdentity.produce("model-primitives:site-21",()=>rbox(pw - gap, ph - gap, .018, m, cx, yb + gap/2, z + .009, .003)));
    if (hd === 'none') continue;
    if (hd === 'edge'){ g.add(syncIdentity.produce("model-primitives:site-22",()=>box(pw - .05, .01, .006, '#3c3a37', cx, yb + ph - gap - .018, fz))); continue; }
    if (drawer){ hd === 'knob' ? syncIdentity.produce("model-primitives:site-23",()=>knob(g, cx, yb + ph/2, fz)) : syncIdentity.produce("model-primitives:site-24",()=>pull(g, Math.min(.3, pw*.45), false, cx, yb + ph/2, fz)); continue; }
    const len = Math.min(.45, ph*.35), hx = nx === 1 ? cx + pw/2 - .045 : (i % 2 ? cx - pw/2 + .04 : cx + pw/2 - .04);
    const y = Math.min(yb + ph - .05 - len/2, Math.max(yb + .05 + len/2, hy ?? yb + ph/2));
    hd === 'knob' ? syncIdentity.produce("model-primitives:site-25",()=>knob(g, hx, y, fz)) : syncIdentity.produce("model-primitives:site-26",()=>pull(g, len, true, hx, y, fz));
  }
}
const vasePts = (r, h) => [[0, 0], [r*.65, 0], [r, h*.32], [r*.92, h*.62], [r*.42, h*.86], [r*.5, h]];
function vase(g, x, y, z, r, h, c, R, flowers = true){
  g.add(syncIdentity.produce("model-primitives:site-27",()=>lathe(vasePts(r, h), mat(c, {roughness:.35, side:THREE.DoubleSide}), x, y, z, 32)));
  if (!flowers) return;
  const cols = ['#f3e6d8', '#e8b4a0', '#f6d27a', '#ffffff'];
  for(let k of syncIdentity.range("model-primitives.js:generator-5",0,5,1,false)){
    const a = k*1.26 + R()*.4, s = .03 + R()*.05, top = [x + Math.cos(a)*s, y + h + .12 + R()*.14, z + Math.sin(a)*s];
    g.add(syncIdentity.produce("model-primitives:site-28",()=>rod([x, y + h*.6, z], top, .003, '#6f8f4a', .003, 6)), syncIdentity.produce("model-primitives:site-29",()=>blob(.022, .018, .022, cols[k % 4], ...top, 12)));
  }
}
function tableLamp(g, x, y, z, s = 1){
  g.add(syncIdentity.produce("model-primitives:site-30",()=>lathe([[0, 0], [.06*s, 0], [.075*s, .05*s], [.08*s, .12*s], [.055*s, .2*s], [.018*s, .25*s], [.012*s, .3*s]], ceramic({roughness:.3}), x, y, z, 32)));
  g.add(syncIdentity.produce("model-primitives:site-31",()=>lathe([[.13*s, 0], [.1*s, .18*s]], glowMat('#f6ecd9', '#ffdca0', .35), x, y + .26*s, z, 40)), syncIdentity.produce("model-primitives:site-32",()=>blob(.03*s, .03*s, .03*s, glowMat('#fff', '#ffe2b0', 1), x, y + .31*s, z, 12)));
}
const plate = (g, r, x, y, z) => g.add(syncIdentity.produce("model-primitives:site-33",()=>lathe([[0, 0], [r*.6, 0], [r*.72, .008], [r, .02]], ceramic({side:THREE.DoubleSide}), x, y, z, 32)));
return {mat,asMat,sh,mesh,rot,box,rbox,cyl,lathe,rod,tube,blob,ring,rrect,shell,darker,lighter,legs,metal,chrome,hwMat,blackMetal,mirror,ceramic,fabric,woodM,screenMat,glowMat,pull,knob,fronts,vasePts,vase,tableLamp,plate};
}
const api={create};if(typeof module==='object'&&module.exports)module.exports=api;else root.FurnishModelPrimitives=api;
})(typeof globalThis!=='undefined'?globalThis:this);
