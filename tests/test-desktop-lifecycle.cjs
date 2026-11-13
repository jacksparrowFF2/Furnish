'use strict';
// Exercise the actual main-process listeners, including native-object lifetime races.
const assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const {EventEmitter}=require('node:events');
const source=fs.readFileSync(path.join(__dirname,'../desktop/main.cjs'),'utf8');
const deferred=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return {promise,resolve,reject};};
const tick=()=>new Promise(resolve=>setImmediate(resolve));
async function harness({proxy,load,mcpStart,registration,autoRegister=false,closeFailure=false,platform='win32'}={}){
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
 let menu;
 const electron={app,BrowserWindow:Window,Menu:{buildFromTemplate:v=>v,setApplicationMenu(v){menu=v;}},dialog:{showErrorBox(...v){errors.push(v);},showMessageBox(...args){calls.push('about:'+args.length);}},shell:{}};
 vm.runInNewContext(source,{require(name){if(name==='./diagnostics.cjs')return {start:()=>({record(){},window(){}})};if(name==='electron')return electron;if(name==='./backend.cjs')return {connect:async()=>backend};if(name==='./policy.cjs')return {...require('../desktop/policy.cjs'),workspaceRoot:()=>process.cwd()};if(name===path.join(process.cwd(),'scripts/register-codex-mcp.cjs'))return {preference:()=>autoRegister,connect:()=>registration?.promise||Promise.resolve({registered:true,enabled:true,toolNames:[]})};if(name===path.join(process.cwd(),'scripts/desktop-mcp.cjs'))return {start:()=>{calls.push('mcp.start');return mcpStart?.promise||Promise.resolve({close:async()=>{calls.push('mcp.close');}});}};return require(name);},__dirname:path.join(__dirname,'../desktop'),process:{...process,platform},console:{error:e=>errors.push(String(e))}});
 return {app,ready,closing,windows,errors,calls,get menu(){return menu;},async start(){ready.resolve();await tick();},async finish(){if(platform==='darwin')app.quit();else app.emit('window-all-closed');closing.resolve();await tick();}};
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
 const registration=deferred(),auto=await harness({registration,autoRegister:true});await auto.start();registration.reject(Error('Codex unavailable'));await tick();assert.equal(auto.windows.length,1);assert(!auto.calls.includes('exit'));assert(auto.errors.some(e=>String(e).includes('Codex unavailable')));auto.windows[0].destroy();await auto.finish();
 const bridge=deferred(),optional=await harness({mcpStart:bridge});await optional.start();bridge.reject(Error('MCP bridge unavailable'));await tick();assert(!optional.calls.includes('backend.close'),'An optional MCP startup failure must not close the loaded desktop');assert(!optional.errors.some(e=>Array.isArray(e)&&e[0]==='Furnish 无法启动'));optional.windows[0].destroy();await optional.finish();
 const normal=await harness();await normal.start();normal.windows[0].destroy();await normal.finish();assert.ok(!normal.calls.includes('relaunch'));assert.equal(normal.calls.at(-1),'exit');
 const cleanup=await harness({closeFailure:true});await cleanup.start();cleanup.windows[0].destroy();await cleanup.finish();assert.equal(cleanup.calls.at(-1),'exit');assert.match(cleanup.errors[0],/cleanup failed/);
 const starting=deferred(),m=await harness({mcpStart:starting});await m.start();m.windows[0].destroy();await m.finish();assert(!m.calls.includes('backend.close'));starting.resolve({close:async()=>{m.calls.push('mcp.close');}});await tick();assert(m.calls.indexOf('mcp.close')<m.calls.indexOf('backend.close'));assert.equal(m.calls.at(-1),'exit');assert(!early.calls.includes('mcp.start'));
 const mac=await harness({platform:'darwin'});await mac.start();mac.windows[0].destroy();mac.app.emit('window-all-closed');await tick();assert(!mac.calls.includes('backend.close'));
 mac.menu.find(m=>m.label==='帮助').submenu[0].click();assert(mac.calls.includes('about:1'),'Mac menu remains usable with no window');
 mac.app.emit('activate');await tick();assert.equal(mac.windows.length,2);mac.app.emit('activate');assert.equal(mac.windows.length,2);
 const edit=mac.menu.find(m=>m.label==='编辑').submenu,contents=mac.windows[1].webContents;
 let handled=true;const scripts=[],events=[];contents.executeJavaScript=async code=>{scripts.push(code);const target={matches:()=>!handled,isContentEditable:false,dispatchEvent:event=>events.push(event)};return vm.runInNewContext(code,{document:{activeElement:target},KeyboardEvent:class{constructor(type,options){Object.assign(this,{type},options);}}});};contents.undo=()=>mac.calls.push('native.undo');contents.copy=()=>mac.calls.push('native.copy');
 await edit.find(m=>m.label==='撤销').click();assert(!mac.calls.includes('native.undo'));assert.match(scripts[0],/metaKey:true/);assert.match(scripts[0],/key:"z"/);
 handled=false;await edit.find(m=>m.label==='撤销').click();await edit.find(m=>m.label==='复制').click();assert(mac.calls.includes('native.undo'));assert(mac.calls.includes('native.copy'));
 assert.equal(events.length,1);assert.equal(events[0].metaKey,true);assert.equal(events[0].key,'z');assert.equal(events[0].bubbles,true);
 const popup={isDestroyed:()=>false,webContents:{executeJavaScript:async()=>false,copy:()=>mac.calls.push('popup.copy')}};
 mac.windows[1].constructor.getFocusedWindow=()=>popup;await edit.find(m=>m.label==='复制').click();assert(mac.calls.includes('popup.copy'),'Edit menu must target a focused child window');delete mac.windows[1].constructor.getFocusedWindow;
 mac.windows[1].destroy();mac.app.emit('second-instance');await tick();assert.equal(mac.windows.length,3);mac.windows[2].destroy();await mac.finish();assert.equal(mac.calls.at(-1),'exit');assert.equal(mac.calls.filter(c=>c==='backend.close').length,1);assert.deepEqual(mac.errors,[]);
 console.log('Desktop lifecycle: startup, activation, destroyed reference, queued reopen, early close, aborted/failed load, normal exit and rejected cleanup passed.');
})().catch(e=>{console.error(e);process.exitCode=1;});
