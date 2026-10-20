/* Isolated UI fixtures share the same layer/individual-lock rule as the app. */
const vm=require('node:vm'),fs=require('node:fs'),L=require('../../src/core/layers-core.js');
const helper=fs.readFileSync(require.resolve('../../src/ui/observation-layers.js'),'utf8').split('globalThis.FurnishObservationLayers=')[0];
function createContext(globals){
 const context=vm.createContext(Object.assign(globals,{FurnishLayers:L}));
 if(!context.observationLayer)context.observationLayer=(g,key)=>{if(key.startsWith('roomCeiling:'))g.userData.layerObject=key;return g;};
 vm.runInContext(helper,context);
 return context;
}
module.exports={createContext};
