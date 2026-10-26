/* Work creation and legacy restoration, independent of browser state. */
(function(root){
  'use strict';
  const inNode = typeof module === 'object' && module.exports;
  const design = inNode ? require('./design-core.js') : root.FurnishDesign;
  const draft = inNode ? require('./floorplan-core.js') : root.FurnishDraft;
  const project = inNode ? require('./project-core.js') : root.FurnishProject;

  function create({makeId, colorFor, materials}){
    function fresh(plan){
      const rooms = {};
      plan.rooms.forEach(room => rooms[room.id] = {name:room.name, mat:room.mat, use:design.inferUse(room)});
      return {
        furniture:(root.FurnishFurnitureUpgrade||require('./furniture-upgrade.js')).upgradeList(plan.defaults.map(f => ({id:makeId(), type:f.t, name:f.n,
          cx:f.x, cy:f.y, w:f.w, d:f.d, rot:f.r || 0, color:f.c || colorFor(f.t),...(f.t==='counter'?design.products().initial({type:'counter',w:f.w,d:f.d}):{})}))).furniture,
        rooms, furnitureDatum:design.products().furnitureDatum.default, demolished:[], measures:[], notes:[], open:{},
        ...(plan.customDraft ? {architecture:{draft:plan.customDraft, phase:'survey'}} : {}),
      };
    }
    function restoreFurniture(list,work){
      return design.restoreFurniture(list, {makeId, colorFor,onUpgrade:added=>{if(work)(root.FurnishFurnitureUpgrade||require('./furniture-upgrade.js')).inheritLayers(work,added);}});
    }
    // Preserve the caller's work object and extra project fields, as before.
    function restore(work, plan){
      (root.FurnishLayers||require('./layers-core.js')).validate(work.objectLayers);
      design.products().validateDatum(work);
      if(work.tilePresets!==undefined)(root.FurnishTilePresets||require('./tile-preset-core.js')).validate(work.tilePresets);
      if(work.tileGrout!==undefined)(root.FurnishTileGrout||require('./tile-grout-core.js')).validate(work.tileGrout);
      (root.FurnishWallFinish||require('./wall-finish-core.js')).validate(work.wallFinishes);
      (root.FurnishFloorFinish||require('./floor-finish-core.js')).validate(work.floorFinishes);
      if(work.wallTiling!==undefined)(root.FurnishWallTiling||require('./wall-tiling-core.js')).validate(work.wallTiling);
      if(work.ceilings)Object.assign(work,(root.FurnishCeiling||require('./ceiling-core.js')).upgradeWork(work));(root.FurnishCeiling||require('./ceiling-core.js')).validate(work.ceilings);
      if(work.purchaseOrders!==undefined)(root.FurnishPurchasing||require('./purchasing-core.js')).validate(work.purchaseOrders);
      if(work.drawing!==undefined)(root.FurnishDrawing||require('./drawing-core.js')).settings(work.drawing);
      if(work.architecture){
        const rebuilt = draft.build(work.architecture.draft);
        if(rebuilt.id !== plan.id) throw new Error('Custom plan identity mismatch');
        work.architecture = project.architecture({...work.architecture, draft:rebuilt.customDraft});
        plan = rebuilt;
      }
      work.rooms = Object.assign(fresh(plan).rooms, work.rooms || {});
      plan.rooms.forEach(room => {
        const value = work.rooms[room.id];
        work.rooms[room.id] = {
          name:typeof value?.name === 'string' ? value.name.slice(0,80) : room.name,
          mat:materials[value?.mat] ? value.mat : room.mat,
          use:design.inferUse(room,value),
          ...(value?.ceilingHeight!==undefined?{ceilingHeight:project.ceilingHeight({ceilingHeight:value.ceilingHeight})}:{}),
        };
      });
      work.demolished = work.demolished || [];
      work.measures = work.measures || [];
      work.open = work.open || {};
      const coordinate = value => typeof value === 'number' && Number.isFinite(value)
        || typeof value === 'string' && value.trim() && Number.isFinite(Number(value));
      work.notes = design.restoreNotes((Array.isArray(work.notes) ? work.notes : [])
        .filter(note => note && typeof note.text === 'string' && note.text.trim() && [note.x,note.y].every(coordinate))
        .slice(0,2000).map(note => ({...note, text:note.text.slice(0,120)})), makeId);
      work.furniture = design.normalizeLaundryStacks(restoreFurniture(work.furniture,work));
      if(!work.wallFinishes&&!work.floorFinishes&&!work.wallTiling&&!work.ceilings&&work.furniture.some(f=>f.kitchen?.autoAvoid))(root.FurnishKitchen||(inNode?require('./kitchen-core.js'):null)).normalizeObstacles(work.furniture,project.effectivePlan(plan,work));
      if(work.furniture.some(f=>(Array.isArray(f.cabinet?.columns)&&f.cabinet.columns.some(col=>col?.pegboardHatch?.mode==='auto'))))(root.FurnishCabinet||require('./cabinet-core.js')).normalizePegboardHatches(work.furniture,project.effectivePlan(plan,work),{editable:f=>!f.locked&&!(root.FurnishLayers||require('./layers-core.js')).locked(work,(root.FurnishLayers||require('./layers-core.js')).furnitureKey(f))});
      work.scene3d = design.sceneSettings(work.scene3d);
      return work;
    }
    function prepareShared(work,plan,lockedOriginal){
      // Complete normalization and validation before application state changes.
      const next=restore(project.validateWork(work),plan);
      if(lockedOriginal?.phase==='design')next.architecture=project.protectOriginal(lockedOriginal,next.architecture);
      project.validatePlanWork(plan,next);
      return next;
    }
    return {fresh, restore, restoreFurniture, prepareShared};
  }
  const api = {create};
  if(inNode) module.exports = api;
  else root.FurnishWork = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
