/* Isolated UI fixtures share the same layer/individual-lock rule as the app. */
const vm=require('node:vm'),fs=require('node:fs'),L=require('../../src/core/layers-core.js');
const helper=fs.readFileSync(require.resolve('../../src/ui/observation-layers.js'),'utf8').split('globalThis.FurnishObservationLayers=')[0];
const propertySource=fs.readFileSync(require.resolve('../../src/ui/property-panel.js'),'utf8'),heightBinding=propertySource.slice(propertySource.indexOf('function linkWindowHeightInputs('),propertySource.indexOf('function bindWinPanel('));
function createContext(globals){
 // New production dispatchers are real modules, not no-op stubs. Older focused
 // VM fixtures must see the same registered model entries as the browser.
 for(const [name,file]of Object.entries({FurnishStackStoolModel:'stack-stool',FurnishCornerBookcaseModel:'corner-bookcase',FurnishSofaBedModel:'sofa-bed',FurnishArmchairModel:'armchair'}))if(!(name in globals))globals[name]=require('../../src/render/'+file+'-model.js');
 const defaults={FurnishPartIdentity:require("../../src/core/part-identity.js"),syncIdentity:require("../../src/core/part-identity.js"),FurnishProducts:require('../../src/core/product-rules.js'),FurnishGeometry:require('../../src/core/layout-geometry.js'),FurnishBayWindows:require('../../src/core/bay-window-core.js')};for(const [key,value]of Object.entries(defaults))if(!(key in globals))globals[key]=value;
 const context=vm.createContext(Object.assign(globals,{FurnishLayers:L}));
 if(!context.observationLayer)context.observationLayer=(g,key)=>{if(key.startsWith('roomCeiling:'))g.userData.layerObject=key;return g;};
 vm.runInContext(helper,context);
 if(!context.linkWindowHeightInputs)vm.runInContext(heightBinding,context);
 return context;
}
module.exports={createContext};
