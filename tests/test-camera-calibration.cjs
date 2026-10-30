const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const N=require('../src/core/navigation-input.js'),near=(a,b)=>assert.ok(Math.abs(a-b)<1e-9,`${a} != ${b}`);
assert.equal(N.screenPixels(1920,1),1920);assert.equal(N.screenPixels(1280,1.5),1920);assert.equal(N.screenPixels(360,3),1080);
for(const [width,dpr] of [[0,1],[1920,NaN],[Infinity,2],[1920,0],[10,1],[40000,1]])assert.equal(N.screenPixels(width,dpr),null);
const calibration=N.calibrateCamera({widthMm:600,pixels:2400,distanceMm:600});
const p=N.calibratedProjection(calibration,1200,800,2);
near(p.widthMm,600);near(p.heightMm,400);near(p.horizontal,2*Math.atan(.5)*180/Math.PI);
const narrow=N.calibratedProjection(calibration,400,800,2);
near(narrow.widthMm,200);near(narrow.vertical,p.vertical);assert.ok(narrow.horizontal<40,'physical view bypasses manual 40 degree minimum');
const zoomed=N.calibratedProjection(calibration,600,400,4);
near(zoomed.horizontal,p.horizontal);near(zoomed.vertical,p.vertical);
const ruler=N.calibrateCamera({widthMm:100,pixels:400,distanceMm:600});
near(ruler.mmPerPixel,calibration.mmPerPixel);
assert.equal(N.calibratedProjection({...calibration,enabled:false},400,800,2),null);
for(const values of [{widthMm:0,pixels:200,distanceMm:600},{widthMm:600,pixels:0,distanceMm:600},{widthMm:600,pixels:2400,distanceMm:NaN},{widthMm:600,pixels:2400,distanceMm:99}])assert.throws(()=>N.calibrateCamera(values));
for(const dimensions of [[0,800,2],[400,NaN,2],[400,800,0],[400,800,Infinity]])assert.equal(N.calibratedProjection(calibration,...dimensions),null);
assert.equal(N.calibratedProjection(calibration,100000,800,2),null,'extreme FOV is rejected rather than silently clamped');
assert.equal(N.calibratedProjection(calibration,1,1,1),null);
const source=fs.readFileSync(require.resolve('../src/core/navigation-input.js'),'utf8'),saved=new Map();
const context=vm.createContext({localStorage:{getItem:k=>saved.get(k),setItem:(k,v)=>saved.set(k,v),removeItem:k=>saved.delete(k)}});
vm.runInContext(source,context);context.FurnishNavigation.setCameraCalibration(calibration);
const copy=context.FurnishNavigation.cameraCalibration();copy.distanceMm=999;
near(context.FurnishNavigation.cameraCalibration().distanceMm,600);
vm.runInContext(source,context);near(context.FurnishNavigation.cameraCalibration().mmPerPixel,.25);
context.FurnishNavigation.setCameraCalibration({...calibration,enabled:false});vm.runInContext(source,context);assert.equal(context.FurnishNavigation.cameraCalibration().enabled,false);
context.FurnishNavigation.setCameraCalibration(null);vm.runInContext(source,context);assert.equal(context.FurnishNavigation.cameraCalibration(),null);
for(const raw of ['broken','{"enabled":true,"mmPerPixel":-1,"distanceMm":600}']){saved.set('furnish-camera-calibration',raw);vm.runInContext(source,context);assert.equal(context.FurnishNavigation.cameraCalibration(),null);}
const denied=vm.createContext({localStorage:{getItem(){throw Error('denied');},setItem(){throw Error('denied');}}});
vm.runInContext(source,denied);denied.FurnishNavigation.setCameraCalibration(calibration);near(denied.FurnishNavigation.cameraCalibration().distanceMm,600);
(async()=>{
 const imports=JSON.parse(fs.readFileSync(require.resolve('../index.html'),'utf8').match(/<script type="importmap">([\s\S]*?)<\/script>/)[1]).imports,T=await import(imports.three);
 for(const [width,height,dpr] of [[400,800,2],[1200,800,2],[600,400,4]]){
  const f=N.calibratedProjection(calibration,width,height,dpr),camera=new T.PerspectiveCamera(f.vertical,width/height,.05,300);
  const left=new T.Vector3(-.25,0,-2).project(camera),right=new T.Vector3(.25,0,-2).project(camera);
  near((right.x-left.x)/2*f.widthMm,150,'0.5 m object at 2 m appears 150 mm wide at 600 mm eye distance');
 }
 console.log('PASS physical camera calibration: screen/ruler, canvas coverage, zoom, real projected mm, invalid inputs, persistence, toggle and denied storage');
})().catch(e=>{console.error(e);process.exitCode=1;});
