'use strict';
// Exercise the actual main-process listeners, including native-object lifetime races.
const assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const {EventEmitter}=require('node:events');
const source=fs.readFileSync(path.join(__dirname,'../desktop/main.cjs'),'utf8');
const deferred=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return {promise,resolve,reject};};
const tick=()=>new Promise(resolve=>setImmediate(resolve));
async function harness({proxy,load,mcpStart,closeFailure=false}={}){
 const ready=deferred(),closing=deferred(),windows=[],errors=[],calls=[];
 const app=new EventEmitter();Object.assign(app,{isPackaged:false,setPath(){},getPath(){return '/profile';},requestSingleInstanceLock(){return true;},whenReady(){return ready.promise;},relaunch(){calls.push('relaunch');},quit(){const event={preventDefault(){this.prevented=true;}};app.emit('will-quit',event);if(!event.prevented)calls.push('exit');}});
 const backend={url:'http://127.0.0.1:8765/',close(){calls.push('backend.close');return closeFailure?Promise.reject(Error('cleanup failed')):closing.promise;}};
 class Window extends EventEmitter{
  constructor(){super();this.destroyed=false;this.minimized=true;windows.push(this);const session=new EventEmitter();session.setProxy=()=>proxy?.promise||Promise.resolve();session.setPermissionRequestHandler=session.setPermissionCheckHandler=()=>{};this.webContents=new EventEmitter();this.webContents.session=session;this.webContents.setWindowOpenHandler=()=>{};}
  isDestroyed(){return this.destroyed;}
  check(name){if(this.destroyed)throw Error('Object has been destroyed');calls.push(name);}
  isMinimized(){this.check('isMinimized');return this.minimized;}
  restore(){this.check('restore');this.minimized=false;}
  show(){this.check('show');} focus(){this.check('focus');} setTitle(){this.check('title');}
  loadURL(){this.check('loadURL');return load?.promise||Promise.resolve();}
  destroy(){this.destroyed=true;this.emit('closed');}
 }
 const electron={app,BrowserWindow:Window,Menu:{buildFromTemplate:v=>v,setApplicationMenu(){}},dialog:{showErrorBox(...v){errors.push(v);}},shell:{}};
 vm.runInNewContext(source,{require(name){if(name==='electron')return electron;if(name==='./backend.cjs')return {connect:async()=>backend};if(name==='./policy.cjs')return {workspaceRoot:()=>process.cwd()};if(name===path.join(process.cwd(),'scripts/desktop-mcp.cjs'))return {start:()=>{calls.push('mcp.start');return mcpStart?.promise||Promise.resolve({close:async()=>{calls.push('mcp.close');}});}};return require(name);},__dirname:path.join(__dirname,'../desktop'),process,console:{error:e=>errors.push(String(e))}});
 return {app,ready,closing,windows,errors,calls,async start(){ready.resolve();await tick();},async finish(){app.emit('window-all-closed');closing.resolve();await tick();}};
}
(async()=>{
 const h=await harness();h.app.emit('second-instance');await h.start();const win=h.windows[0];
 h.app.emit('second-instance');assert.deepEqual(h.calls.slice(-4),['isMinimized','restore','show','focus']);
 win.emit('ready-to-show');win.destroy();
 h.app.emit('second-instance'); // closed reference must already be cleared, before will-quit
 win.emit('page-title-updated',{preventDefault(){}},'late title');
 h.app.emit('window-all-closed');h.app.emit('second-instance');h.app.emit('second-instance');await tick();
 assert.equal(h.calls.filter(x=>x==='backend.close').length,1);assert.ok(!h.calls.includes('relaunch'));
 h.closing.resolve();await tick();assert.deepEqual(h.calls.slice(-2),['relaunch','exit']);assert.deepEqual(h.errors,[]);
 const p=deferred(),early=await harness({proxy:p});await early.start();early.windows[0].destroy();await early.finish();p.resolve();await tick();assert.ok(!early.calls.includes('loadURL'));assert.deepEqual(early.errors,[]);
 const l=deferred(),loading=await harness({load:l});await loading.start();loading.windows[0].destroy();loading.windows[0].emit('ready-to-show');l.reject(Error('ERR_ABORTED'));await tick();await loading.finish();assert.deepEqual(loading.errors,[]);assert.ok(!loading.calls.includes('show'));
 const bad=deferred(),failed=await harness({load:bad});await failed.start();bad.reject(Error('real load failure'));await tick();assert.ok(failed.errors.some(e=>Array.isArray(e)&&e[1]==='real load failure'));failed.closing.resolve();await tick();
 const normal=await harness();await normal.start();normal.windows[0].destroy();await normal.finish();assert.ok(!normal.calls.includes('relaunch'));assert.equal(normal.calls.at(-1),'exit');
 const cleanup=await harness({closeFailure:true});await cleanup.start();cleanup.windows[0].destroy();await cleanup.finish();assert.equal(cleanup.calls.at(-1),'exit');assert.match(cleanup.errors[0],/cleanup failed/);
 const starting=deferred(),m=await harness({mcpStart:starting});await m.start();m.windows[0].destroy();await m.finish();assert(!m.calls.includes('backend.close'));starting.resolve({close:async()=>{m.calls.push('mcp.close');}});await tick();assert(m.calls.indexOf('mcp.close')<m.calls.indexOf('backend.close'));assert.equal(m.calls.at(-1),'exit');assert(!early.calls.includes('mcp.start'));
 console.log('Desktop lifecycle: startup, activation, destroyed reference, queued reopen, early close, aborted/failed load, normal exit and rejected cleanup passed.');
})().catch(e=>{console.error(e);process.exitCode=1;});
