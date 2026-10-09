/* Style rules share the existing room semantics without depending on the UI. */
(function(root){
'use strict';
const inNode = typeof module === 'object' && module.exports;
const presets = inNode ? require('../data/style-presets.js') : root.FurnishStylePresets;
const design = inNode ? require('./design-core.js') : root.FurnishDesign;
const SOFT_T = new Set(['sofa','cornersofa','beanbag','bed','baycushion','bench','chair','barstool','officechair']);
const WOOD_T = new Set(['wardrobe','cabinet','shoecab','dresser','desk','bookshelf','nightstand','coffeetable','tvstand','table','roundtable','sidetable','chest','crib']);

function find(id) { return presets.find(style => style.id === id); }
// The caller owns history and rendering. This function edits only style fields.
function apply(work, rooms, id, custom = false) {
  const style = find(id);
  if (!style) return null;
  work.furniture.forEach(f => {
    if (f.type === 'armchair') f.color = style.pop;
    else if (SOFT_T.has(f.type)) f.color = style.soft;
    else if (WOOD_T.has(f.type)) f.color = style.wood;
    else if (f.type === 'rug' || f.type === 'curtain') f.color = style.textile;
  });
  rooms.forEach(room => {
    const material = design.styleFloor(room, work.rooms[room.id], style, custom);
    if (material) work.rooms[room.id].mat = material;
  });
  work.style = id;
  return style;
}
const api = {find, apply};
if (inNode) module.exports = api;
else root.FurnishStyles = api;
})(typeof globalThis!=='undefined'?globalThis:this);
