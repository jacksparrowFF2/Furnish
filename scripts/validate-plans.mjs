#!/usr/bin/env node
/* 户型数据自检：直接读取 src/data/plans.js 数据做几何一致性校验
 * 用法：node validate-plans.mjs   （退出码 0 = 全部通过）
 * 校验项：
 *   1. 墙段/窗/门/推拉门/房间/家具字段合法（坐标递增、尺寸为正）
 *   2. 门窗洞口不与任何墙段实体重叠（外墙应已在洞口处断开）
 *   3. 尺寸标注链每段为正数、链总长 = 计划的对应边长（与墙体投影一致时为最优）
 *   4. 房间多边形面积 > 0、位于画布范围内
 *   5. 默认家具在室内外包盒内
 *   6. 门数据：c/o 为单位正交向量；铰点在门洞角上；关闭的门扇沿门洞方向；入户门恰好一个
 */
import PLANS from '../src/data/plans.js';

const area = poly => Math.abs(poly.reduce((a, p, i) => { const q = poly[(i + 1) % poly.length]; return a + p[0] * q[1] - q[0] * p[1]; }, 0)) / 2;
const overlap = (a, b) => Math.max(0, Math.min(a[2], b[2]) - Math.max(a[0], b[0])) * Math.max(0, Math.min(a[3], b[3]) - Math.max(a[1], b[1]));
const unit = v => Math.abs(Math.hypot(v[0], v[1]) - 1) < 1e-6;

let fails = 0;
const fail = (plan, msg) => { fails++; console.log(`  ✗ ${msg}`); };
const warn = (plan, msg) => console.log(`  ! ${msg}`);

for (const P of PLANS) {
  console.log(`\n■ ${P.id} ${P.name}`);
  const W = P.walls, b = P.bounds;
  // 1. 墙段
  W.forEach((w, i) => {
    if (w[2] <= w[0] || w[3] <= w[1]) fail(P, `墙段#${i} 坐标不递增 [${w}]`);
    if (!'ben'.includes(w[4]) && w[4] !== 'low') fail(P, `墙段#${i} 未知类型 "${w[4]}"`);
  });
  // 2. 门窗洞口与墙段不重叠
  const openings = [
    ...P.wins.map((w, i) => ({ name: `窗#${i}`, rect: w.rect })),
    ...P.doors.map((d, i) => ({ name: `门${d.name}`, rect: d.rect })),
    ...P.slides.map((s, i) => ({ name: `推拉#${i}`, rect: s.rect })),
  ];
  for (const o of openings) {
    const [x0, y0, x1, y1] = o.rect;
    if (x1 <= x0 || y1 <= y0) fail(P, `${o.name} 坐标不递增`);
    for (const w of W) {
      if (overlap(o.rect, w) > 1) fail(P, `${o.name} 与墙段 [${w}] 重叠 ${Math.round(overlap(o.rect, w))}mm²（外墙应在洞口处断开）`);
    }
  }
  // 3. 尺寸链：同侧同向的链必须等长（局部链与总长链互检）
  const xs = W.flatMap(w => [w[0], w[2]]), ys = W.flatMap(w => [w[1], w[3]]);
  const intX0 = Math.min(...xs) + 240, intX1 = Math.max(...xs) - 240;
  const intY0 = Math.min(...ys) + 240, intY1 = Math.max(...ys) - 240;
  for (const d of P.dims) {
    if (d.segs.some(v => !(v > 0))) fail(P, `尺寸链@${d.at} 存在非正分段`);
  }
  const groups = {};
  for (const d of P.dims) {
    const key = `${d.h ? 'h' : 'v'}-${d.at < (d.h ? 0 : 6000) ? 'neg' : 'pos'}`;
    (groups[key] = groups[key] || []).push(d);
  }
  for (const [key, list] of Object.entries(groups)) {
    const spans = list.map(d => Math.round(d.segs.reduce((a, v) => a + v, 0)));
    if (new Set(spans).size > 1) fail(P, `尺寸链组 ${key} 各链总长不一致: ${list.map((d, i) => `@${d.at}=${spans[i]}`).join(', ')}`);
  }
  // 4. 房间
  for (const r of P.rooms) {
    if (area(r.poly) <= 1000) fail(P, `房间「${r.name}」多边形面积异常 ${area(r.poly)}`);
    for (const [x, y] of r.poly) {
      if (x < intX0 - 1 || x > intX1 + 1 || y < intY0 - 1 || y > intY1 + 1) fail(P, `房间「${r.name}」顶点 (${x},${y}) 超出墙内皮范围`);
    }
  }
  // 5. 家具
  for (const f of P.defaults) {
    const { x, y, w, d, r = 0 } = f;
    if (!(w > 0 && d > 0)) fail(P, `家具「${f.n}」尺寸非法`);
    const a = r * Math.PI / 180, c = Math.abs(Math.cos(a)), s = Math.abs(Math.sin(a));
    const hw = w / 2 * c + d / 2 * s, hh = w / 2 * s + d / 2 * c;
    if (x - hw < intX0 - 2 || x + hw > intX1 + 2 || y - hh < intY0 - 2 || y + hh > intY1 + 2)
      warn(P, `家具「${f.n}」包围盒 (${Math.round(x - hw)},${Math.round(y - hh)})~(${Math.round(x + hw)},${Math.round(y + hh)}) 超出墙内皮`);
  }
  // 6. 门向量与入户门
  const entries = P.doors.filter(d => d.entry);
  if (entries.length !== 1) fail(P, `入户门数量 = ${entries.length}，应为 1`);
  for (const d of P.doors) {
    if (!unit(d.c)) fail(P, `门「${d.name}」c 向量非单位向量`);
    if (!unit(d.o)) fail(P, `门「${d.name}」o 向量非单位向量`);
    if (Math.abs(d.c[0] * d.o[0] + d.c[1] * d.o[1]) > 1e-6) fail(P, `门「${d.name}」c 与 o 不垂直`);
    const [x0, y0, x1, y1] = d.rect, [hx, hy] = d.h;
    const onCorner = [x0, x1].includes(hx) && [y0, y1].includes(hy);
    if (!onCorner) fail(P, `门「${d.name}」铰点 (${hx},${hy}) 不在门洞角上`);
    // 关闭状态的门扇（铰点 + c×len）必须落在门洞范围内，否则门扇会画到墙或隔壁房间上
    const ex = hx + d.c[0] * d.len, ey = hy + d.c[1] * d.len;
    if (ex < x0 - 1 || ex > x1 + 1 || ey < y0 - 1 || ey > y1 + 1) fail(P, `门「${d.name}」c 方向朝向门洞外：关闭时门扇端点 (${ex},${ey}) 不在门洞 [${d.rect}] 内`);
  }
  if (!fails) console.log('  ✓ 全部通过');
}
console.log(fails ? `\n共 ${fails} 处问题` : '\n全部户型数据校验通过 ✓');
process.exit(fails ? 1 : 0);
