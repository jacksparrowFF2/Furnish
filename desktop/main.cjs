'use strict';
const {app,BrowserWindow,Menu,dialog,shell}=require('electron');
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {applicationRoot,workspaceRoot,localPage,externalPage}=require('./policy.cjs');
const {connect}=require('./backend.cjs');
const appRoot=applicationRoot({packaged:app.isPackaged,executable:process.execPath,sourceRoot:path.resolve(__dirname,'..')});
let root,backend,mcpStarting,mainWindow,quitting=false,reopenRequested=false;
let diagnostics={record(){},window(){}};
try{
 const file=path.join(appRoot,'furnish-desktop.json');
 root=workspaceRoot({appRoot,config:fs.existsSync(file)?JSON.parse(fs.readFileSync(file,'utf8')):null,override:process.env.FURNISH_DESKTOP_ROOT});
 const id=crypto.createHash('sha256').update(process.platform==='win32'?root.toLowerCase():root).digest('hex').slice(0,16);
 app.setPath('userData',process.env.FURNISH_DESKTOP_PROFILE||path.join(app.getPath('appData'),'Furnish','desktop',id));
 diagnostics=require('./diagnostics.cjs').start({root,app});
}catch(e){app.whenReady().then(()=>{dialog.showErrorBox('Furnish 无法启动',e.message);app.exit(1);});}
const preferences={nodeIntegration:false,contextIsolation:true,sandbox:true,webSecurity:true};
const preparingUnload=new WeakSet(),resumingClose=new WeakSet();
let resumingQuit=false;
function isWorkspace(win){
 if(!win||win.isDestroyed())return false;
 const url=win.webContents.getURL();
 return localPage(url,backend.url)&&['/','/index.html'].includes(new URL(url).pathname);
}
async function checkUnload(win,method){
 let timer;
 const timeout=20000,deadline=Date.now()+timeout;
 try{
  return await Promise.race([
   win.webContents.executeJavaScript(`window.FurnishDesktopUnload?.${method}(${deadline})`),
   new Promise(resolve=>{timer=setTimeout(()=>resolve({mode:'timeout',message:'等待超过 '+timeout/1000+' 秒，保存可能仍在进行。'}),timeout);})
  ]);
 }finally{clearTimeout(timer);}
}
async function finishUnload(win,action,proceed){
 if(preparingUnload.has(win))return;
 preparingUnload.add(win);
 try{
  const result=await checkUnload(win,'prepare');
  if(!isWorkspace(win))return;
  // An older page may lack the hook. Its beforeunload guard still applies.
  if(!result||result.mode==='ready'){proceed();return;}
  const conflict=result.mode==='conflict';
  const choice=await dialog.showMessageBox(win,{type:'warning',title:'设计尚未写入文件',
   message:conflict?'检测到保存冲突，已停止写入':result.mode==='timeout'?'还在等待保存完成':'设计保存未完成',
   detail:result.message+'\n\n继续编辑可保留当前窗口。选择保留恢复缓存后'+action+'，下次打开时会按原规则恢复或提供恢复副本。',
   buttons:['继续编辑','保留恢复缓存并'+action],defaultId:0,cancelId:0});
  if(choice.response!==1||!isWorkspace(win))return;
  const cached=await checkUnload(win,'preserve');
  if(!isWorkspace(win))return;
  if(cached?.mode==='ready')proceed();
  else await dialog.showMessageBox(win,{type:'warning',title:'尚未'+action,message:'无法确认最新编辑已保留在恢复缓存中',detail:'当前窗口仍然打开。你可以继续保存，或先导出完整项目。',buttons:['确定']});
 }catch(e){
  diagnostics.record('unload-error',{action,message:e.message});
  if(!win.isDestroyed())await dialog.showMessageBox(win,{type:'warning',title:'尚未'+action,message:'无法确认设计是否保存',detail:'当前窗口仍然打开。你可以继续保存，或先导出完整项目。',buttons:['确定']});
 }finally{preparingUnload.delete(win);}
}
function refreshWindow(win){
 if(!win||win.isDestroyed())return;
 const reload=()=>win.webContents.reload();
 if(isWorkspace(win))void finishUnload(win,'刷新',reload);
 else reload();
}
function attach(win){
 win.on('page-title-updated',(event,title)=>{event.preventDefault();if(!win.isDestroyed())win.setTitle('Furnish · '+title);});
 win.webContents.setWindowOpenHandler(({url})=>{
  if(localPage(url,backend.url)||url==='about:blank'||url.startsWith('blob:'+backend.url))return {action:'allow',overrideBrowserWindowOptions:{webPreferences:preferences,autoHideMenuBar:true}};
  if(externalPage(url))shell.openExternal(url).catch(()=>{});
  return {action:'deny'};
 });
 win.webContents.on('will-navigate',(event,url)=>{if(!localPage(url,backend.url)&&url!=='about:blank'&&!url.startsWith('blob:'+backend.url)){event.preventDefault();if(externalPage(url))shell.openExternal(url).catch(()=>{});}});
 win.webContents.on('did-create-window',child=>attach(child));
 win.on('close',event=>{
  if(resumingClose.delete(win)||!isWorkspace(win))return;
  event.preventDefault();
  void finishUnload(win,'关闭',()=>{resumingClose.add(win);win.close();});
 });
 win.webContents.on('will-prevent-unload',()=>{
  // Direct navigation and older pages still get the renderer's veto.
  void dialog.showMessageBox(win,{type:'warning',title:'设计尚未写入文件',message:'页面仍有待保存的编辑',detail:'请等待顶部保存状态更新，然后在桌面菜单使用“视图 → 刷新”，或再次关闭窗口。',buttons:['继续编辑']});
 });
}
async function createWindow(){
 const win=mainWindow=new BrowserWindow({title:'Furnish',width:1440,height:960,minWidth:360,minHeight:480,show:false,backgroundColor:'#f6f2eb',icon:path.join(root,'assets/icons/icon-512.png'),webPreferences:preferences});
 diagnostics.window(win);
 win.once('closed',()=>{if(mainWindow===win)mainWindow=null;});
 attach(win);
 // All application requests are local; do not route them through a system proxy.
 await win.webContents.session.setProxy({mode:'direct'});
 if(win.isDestroyed()||quitting)return;
 const permissionAllowed=(permission,url)=>localPage(url,backend.url)&&['fullscreen','pointerLock','clipboard-sanitized-write','persistent-storage','loopback-network'].includes(permission);
 win.webContents.session.setPermissionRequestHandler((contents,permission,callback,details)=>callback(permissionAllowed(permission,details.requestingUrl||contents.getURL())));
 win.webContents.session.setPermissionCheckHandler((_contents,permission,origin)=>permissionAllowed(permission,origin));
 win.webContents.session.on('will-download',(_event,item)=>{
  item.setSaveDialogOptions({title:'保存 Furnish 导出文件'});
  item.once('done',(_e,state)=>{if(state==='interrupted')dialog.showErrorBox('文件未保存','导出下载被中断，请重试。');});
 });
 win.once('ready-to-show',()=>{if(!win.isDestroyed()&&!quitting)win.show();});
 try{await win.loadURL(backend.url);}catch(e){if(!win.isDestroyed()&&!quitting)throw e;}
}
function ensureMcp(){
 if(process.env.FURNISH_MCP_DISABLE==='1')return Promise.reject(Error('MCP 已被 FURNISH_MCP_DISABLE 禁用，请移除该设置后重新启动 Furnish。'));
 if(mcpStarting)return mcpStarting;
 mcpStarting=require(path.join(root,'scripts/desktop-mcp.cjs')).start({root,dispatch:async(name,args)=>{
    const win=mainWindow;if(quitting||!win||win.isDestroyed())throw Error('Furnish 主窗口尚未就绪');
    const page=new URL(win.webContents.getURL());if(page.origin!==new URL(backend.url).origin||!['/','/index.html'].includes(page.pathname))throw Error('Furnish 主窗口未处于正式项目页面');
    let staged=null;
    if(name==='inspect_project_source'||name==='import_project_source'||name==='configure_building'&&args.surveyFileName){
     const {readStagedSource}=require(path.join(root,'scripts/mcp-artifacts.cjs'));
     try{staged={source:args.fileName?readStagedSource(root,args.fileName,args.fileName.endsWith('.dxf')?20e6:30e6):null,
      evidence:args.surveyFileName?readStagedSource(root,args.surveyFileName,500000):null};}
     catch(error){staged={error:error.message};}
    }
    const result=await win.webContents.executeJavaScript(`(async()=>{if(!window.FurnishMcp)throw Error('Furnish 页面尚未加载 MCP 接口，请刷新');return window.FurnishMcp.execute(${JSON.stringify(name)},${JSON.stringify(args)},${JSON.stringify(staged)});})()`);
    if(name==='export_artifact'){const {artifact,...metadata}=result;return {...metadata,artifact:require(path.join(root,'scripts/mcp-artifacts.cjs')).writeArtifact(root,args.requestId,artifact)};}
    if(name==='take_screenshot'){
     const picture=await win.webContents.capturePage(result.screenshotTarget==='window'?undefined:result.viewport);
     if(picture.isEmpty())throw Error('桌面截图为空，请恢复窗口后重试');
     const after=await win.webContents.executeJavaScript("window.FurnishMcp.execute('get_camera',{})");
     if(after.revision!==result.revision||after.view!==result.view||JSON.stringify(after.camera)!==JSON.stringify(result.camera)||JSON.stringify(after.planView)!==JSON.stringify(result.planView)||JSON.stringify(after.viewport)!==JSON.stringify(result.viewport))throw Error('截图期间方案或视角变化，请重试');
     return {...result,image:{mimeType:'image/png',data:picture.toPNG().toString('base64'),...picture.getSize()}};
    }
    return result;
   }}).catch(error=>{mcpStarting=null;throw error;});return mcpStarting;
}
const codexSetup=()=>require(path.join(root,'scripts/register-codex-mcp.cjs'));
let setupBusy=false;
async function configureCodex({register=true,automatic=false,show=true}={}){
 if(setupBusy)return;setupBusy=true;
 try{
  await ensureMcp();
  const result=await codexSetup().connect({root,executable:process.execPath,electron:true,register,automatic});
  const menu=Menu.getApplicationMenu?.()?.getMenuItemById('mcp-auto-register');if(menu)menu.checked=codexSetup().preference(root);
  if(show){const options={type:result.enabled===false?'warning':'info',title:'Furnish MCP 与 Codex',message:result.message,detail:'本机 MCP 端点：已启动\n'+(result.toolNames.length?'新连接工具：'+result.toolNames.join('、'):'')+'\n当前 Codex 聊天的工具清单由 Codex 管理；若仍显示旧工具，请在 Codex 设置中重载 MCP。',buttons:['确定']};if(mainWindow&&!mainWindow.isDestroyed())await dialog.showMessageBox(mainWindow,options);else await dialog.showMessageBox(options);}
  return result;
 }catch(e){if(show)dialog.showErrorBox('Codex MCP 连接未完成',e.message);else console.error('Codex MCP: '+e.message);}
 finally{setupBusy=false;}
}
function codexMenu(){return {label:'MCP',submenu:[
 {label:'注册并连接 Codex（MCP）',click:()=>configureCodex({automatic:true})},
 {label:'检查 Codex 注册与工具',click:()=>configureCodex({register:false})},
 {id:'mcp-auto-register',label:'启动时检查 Codex 注册',type:'checkbox',checked:codexSetup().preference(root),click:item=>{try{codexSetup().setAutomatic(root,item.checked);if(item.checked)configureCodex();}catch(e){item.checked=!item.checked;dialog.showErrorBox('MCP 设置未保存',e.message);}}}
]};}

// macOS menu accelerators consume key events. Route canvas commands through the
// existing keyboard/mutate chain, while native text fields keep native editing.
async function macEdit(action,key,shiftKey=false){
 const win=BrowserWindow.getFocusedWindow?.()||mainWindow;if(!win||win.isDestroyed())return;
 try{
  const handled=await win.webContents.executeJavaScript(`(()=>{const target=document.activeElement||document.body;if(target.matches('input,textarea,select')||target.isContentEditable)return false;target.dispatchEvent(new KeyboardEvent('keydown',{key:${JSON.stringify(key)},metaKey:true,shiftKey:${shiftKey},bubbles:true,cancelable:true}));return true;})()`,true);
  if(!handled&&!win.isDestroyed())win.webContents[action]();
 }catch(e){diagnostics.record('menu-edit-error',{message:e.message});}
}
function macEditMenu(){return {label:'编辑',submenu:[
 {label:'撤销',accelerator:'Cmd+Z',click:()=>macEdit('undo','z')},
 {label:'重做',accelerator:'Cmd+Shift+Z',click:()=>macEdit('redo','z',true)},
 {type:'separator'},
 ...[['剪切','cut','x'],['复制','copy','c'],['粘贴','paste','v'],['全选','selectAll','a']].map(([label,action,key])=>({label,accelerator:'Cmd+'+key.toUpperCase(),click:()=>macEdit(action,key)}))
]};}
function activateMainWindow(){
 if(quitting||!backend)return;
 const win=mainWindow;
 if(win&&!win.isDestroyed()){if(win.isMinimized())win.restore();win.show();win.focus();return;}
 createWindow().catch(e=>{dialog.showErrorBox('Furnish 无法打开窗口',e.message);app.quit();});
}
function aboutFurnish(){
 const options={title:'Furnish 桌面版',message:'Furnish 本地装修设计',detail:'工作目录：'+root+'\n在“保存／导出 → 保存位置与历史备份”查看或修改正式文件位置。\n桌面缓存：'+app.getPath('userData')+'\nElectron '+process.versions.electron+'；离线可用。',buttons:['确定']};
 return mainWindow&&!mainWindow.isDestroyed()?dialog.showMessageBox(mainWindow,options):dialog.showMessageBox(options);
}

if(root){
 if(!app.requestSingleInstanceLock())app.quit();
 else{
  app.on('second-instance',()=>{
   if(quitting){reopenRequested=true;return;}
   const win=mainWindow;if(!win||win.isDestroyed()){if(process.platform==='darwin')activateMainWindow();return;}
   if(win.isMinimized())win.restore();win.show();win.focus();
  });
  app.whenReady().then(async()=>{
   backend=await connect({root,executable:process.execPath,port:Number(process.env.FURNISH_PORT||8765)});
   Menu.setApplicationMenu(Menu.buildFromTemplate([
    {label:'Furnish',submenu:[{label:'打开工作目录',click:()=>shell.openPath(root)},{label:'在浏览器中打开',click:()=>shell.openExternal(backend.url)},{type:'separator'},{role:'quit',label:'退出'}]},
    ...(process.platform==='darwin'?[macEditMenu()]:[]),
    codexMenu(),
    {label:'视图',submenu:[{label:'刷新',accelerator:'CmdOrCtrl+R',click:(_item,win)=>refreshWindow(win||mainWindow)},{role:'togglefullscreen',label:'全屏'},{role:'toggleDevTools',label:'开发者工具'}]},
    {label:'帮助',submenu:[{label:'关于 Furnish',click:aboutFurnish}]}
   ]));
   await createWindow();
   if(quitting||!mainWindow||mainWindow.isDestroyed())return;
   if(process.env.FURNISH_MCP_DISABLE!=='1'){
    try{await ensureMcp();if(codexSetup().preference(root))configureCodex({show:false});}
    catch(e){diagnostics.record('mcp-start-error',{message:e.message});console.error('Furnish MCP 未启动，桌面继续运行，可从 MCP 菜单重试：'+e.message);}
   }
  }).catch(e=>{diagnostics.record('startup-error',{message:e.message});console.error(e.stack||e);dialog.showErrorBox('Furnish 无法启动',e.message);app.quit();});
  app.on('window-all-closed',()=>{if(process.platform!=='darwin')app.quit();});
  app.on('activate',activateMainWindow);
  app.on('before-quit',event=>{
   const win=mainWindow;
   if(resumingQuit||quitting||!isWorkspace(win))return;
   event.preventDefault();
   void finishUnload(win,'退出',()=>{
    resumingQuit=true;resumingClose.add(win);
    try{app.quit();}finally{resumingQuit=false;resumingClose.delete(win);}
   });
  });
  app.on('will-quit',event=>{if(backend&&!quitting){
   event.preventDefault();quitting=true;
   // Keep the instance lock until the owned backend stops; queue a quick reopen.
   Promise.resolve(mcpStarting).then(mcp=>mcp?.close()).catch(e=>console.error(e.stack||e)).then(()=>backend.close()).catch(e=>console.error(e.stack||e)).finally(()=>{
    if(reopenRequested)app.relaunch();
    app.quit();
   });
  }});
 }
}
