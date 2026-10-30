'use strict';
const {app,BrowserWindow,Menu,dialog,shell}=require('electron');
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {workspaceRoot,localPage,externalPage}=require('./policy.cjs');
const {connect}=require('./backend.cjs');
const appRoot=app.isPackaged?path.dirname(process.execPath):path.resolve(__dirname,'..');
let root,backend,mainWindow,quitting=false,reopenRequested=false;
try{
 const file=path.join(appRoot,'furnish-desktop.json');
 root=workspaceRoot({appRoot,config:fs.existsSync(file)?JSON.parse(fs.readFileSync(file,'utf8')):null,override:process.env.FURNISH_DESKTOP_ROOT});
 const id=crypto.createHash('sha256').update(root.toLowerCase()).digest('hex').slice(0,16);
 app.setPath('userData',process.env.FURNISH_DESKTOP_PROFILE||path.join(app.getPath('appData'),'Furnish','desktop',id));
}catch(e){app.whenReady().then(()=>{dialog.showErrorBox('Furnish 无法启动',e.message);app.exit(1);});}
const preferences={nodeIntegration:false,contextIsolation:true,sandbox:true,webSecurity:true};
function attach(win){
 win.on('page-title-updated',(event,title)=>{event.preventDefault();if(!win.isDestroyed())win.setTitle('Furnish · '+title);});
 win.webContents.setWindowOpenHandler(({url})=>{
  if(localPage(url,backend.url)||url==='about:blank'||url.startsWith('blob:'+backend.url))return {action:'allow',overrideBrowserWindowOptions:{webPreferences:preferences,autoHideMenuBar:true}};
  if(externalPage(url))shell.openExternal(url).catch(()=>{});
  return {action:'deny'};
 });
 win.webContents.on('will-navigate',(event,url)=>{if(!localPage(url,backend.url)&&url!=='about:blank'&&!url.startsWith('blob:'+backend.url)){event.preventDefault();if(externalPage(url))shell.openExternal(url).catch(()=>{});}});
 win.webContents.on('did-create-window',child=>attach(child));
 win.webContents.on('will-prevent-unload',event=>{
  // The existing beforeunload handler starts flushing. Keep its veto by default.
  const choice=dialog.showMessageBoxSync(win,{type:'warning',title:'设计尚未写入文件',message:'仍有设计正在保存，或文件保存遇到冲突。',detail:'建议继续编辑，等保存完成或导出项目后再关闭。直接关闭会保留桌面缓存，下次启动继续按原恢复规则处理。',buttons:['继续编辑','保留缓存并关闭'],defaultId:0,cancelId:0});
  if(choice===1)event.preventDefault();
 });
}
async function createWindow(){
 const win=mainWindow=new BrowserWindow({title:'Furnish',width:1440,height:960,minWidth:360,minHeight:480,show:false,backgroundColor:'#f6f2eb',icon:path.join(root,'assets/icons/icon-512.png'),webPreferences:preferences});
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
if(root){
 if(!app.requestSingleInstanceLock())app.quit();
 else{
  app.on('second-instance',()=>{
   if(quitting){reopenRequested=true;return;}
   const win=mainWindow;if(!win||win.isDestroyed())return;
   if(win.isMinimized())win.restore();win.show();win.focus();
  });
  app.whenReady().then(async()=>{
   backend=await connect({root,executable:process.execPath,port:Number(process.env.FURNISH_PORT||8765)});
   Menu.setApplicationMenu(Menu.buildFromTemplate([
    {label:'Furnish',submenu:[{label:'打开工作目录',click:()=>shell.openPath(root)},{label:'在浏览器中打开',click:()=>shell.openExternal(backend.url)},{type:'separator'},{role:'quit',label:'退出'}]},
    {label:'视图',submenu:[{role:'reload',label:'刷新'},{role:'togglefullscreen',label:'全屏'},{role:'toggleDevTools',label:'开发者工具'}]},
    {label:'帮助',submenu:[{label:'关于 Furnish',click:()=>dialog.showMessageBox(mainWindow,{title:'Furnish 桌面版',message:'Furnish 本地装修设计',detail:'工作目录：'+root+'\n在“保存／导出 → 保存位置与历史备份”查看或修改正式文件位置。\n桌面缓存：'+app.getPath('userData')+'\nElectron '+process.versions.electron+'；离线可用。',buttons:['确定']})}]}
   ]));
   await createWindow();
  }).catch(e=>{console.error(e.stack||e);dialog.showErrorBox('Furnish 无法启动',e.message);app.quit();});
  app.on('window-all-closed',()=>app.quit());
  app.on('will-quit',event=>{if(backend&&!quitting){
   event.preventDefault();quitting=true;
   // Keep the instance lock until the owned backend stops; queue a quick reopen.
   Promise.resolve().then(()=>backend.close()).catch(e=>console.error(e.stack||e)).finally(()=>{
    if(reopenRequested)app.relaunch();
    app.quit();
   });
  }});
 }
}
