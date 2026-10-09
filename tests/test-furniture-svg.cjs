const assert = require('node:assert/strict');
const renderer = require('../src/render/furniture-svg.js');
const {library} = require('../src/data/catalog.js');
const light = Object.freeze({ink:'#3d3a34'});
const dark = Object.freeze({ink:'#efe6d8'});
const nightstand = renderer.render('nightstand',450,400,'#e8dccb',light);
assert.match(nightstand,/<circle[^>]*stroke="#3d3a34"/);
assert.match(renderer.render('nightstand',450,400,'#e8dccb',dark),/<circle[^>]*stroke="#efe6d8"/);
assert.equal(renderer.render('nightstand',450,400,'#e8dccb',light),nightstand);
assert.match(renderer.render('customround',800,600,'#abcdef',light),/rx="400" ry="300"/);
assert.match(renderer.render('future-item',800,600,'#abcdef',light),/width="800" height="600"/);
let count=0;
for(const category of library) for(const [type,,w,d,color] of category.items) {
  for(const palette of [light,dark]) {
    const svg=renderer.render(type,w,d,color,palette);
    assert(svg.length>0,type);
    assert(!/NaN|undefined|\$\{|=>/.test(svg),`Invalid SVG interpolation: ${type}`);
    assert.equal(svg,renderer.render(type,w,d,color,palette));
    count++;
  }
}
console.log(`PASS ${count} catalog/theme renderings, palette isolation, custom dimensions and stroke regression`);
