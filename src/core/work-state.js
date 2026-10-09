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
        furniture:plan.defaults.map(f => ({id:makeId(), type:f.t, name:f.n,
          cx:f.x, cy:f.y, w:f.w, d:f.d, rot:f.r || 0, color:f.c || colorFor(f.t)})),
        rooms, demolished:[], measures:[], notes:[], open:{},
        ...(plan.customDraft ? {architecture:{draft:plan.customDraft, phase:'survey'}} : {}),
      };
    }
    function restoreFurniture(list){
      return design.restoreFurniture(list, {makeId, colorFor});
    }
    // Preserve the caller's work object and extra project fields, as before.
    function restore(work, plan){
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
      work.furniture = restoreFurniture(work.furniture);
      work.scene3d = design.sceneSettings(work.scene3d);
      return work;
    }
    return {fresh, restore, restoreFurniture};
  }
  const api = {create};
  if(inNode) module.exports = api;
  else root.FurnishWork = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
