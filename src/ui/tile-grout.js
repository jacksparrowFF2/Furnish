/* Old callers now select the same shared draft; no separate colour commit. */
(function(){
window.FurnishTileGroutUI={open:(roomId,kind)=>FurnishTileWorkspace.open({roomId,kind,section:'grout'}),openUnified:(scope={})=>FurnishTileWorkspace.open({roomIds:scope.ids,kinds:scope.kinds,all:true,section:'grout'})};
})();
