/* Compatibility entry points; all edits belong to the shared tiling draft. */
(function(){
const open=scope=>FurnishTileWorkspace.open(scope);
window.FurnishWallTilingUI={openList:()=>open({kind:'wall'}),openFace:face=>open({face}),openThickness:()=>open({kind:'wall',section:'finish'}),openHeights:roomId=>open({kind:'wall',roomId,section:'layout'}),openAlignment:roomId=>open({kind:'wall',roomId,section:'layout'}),svgOf:(...args)=>FurnishTileDrawing.wall(...args)};
})();
