/* Atomic larger local saves; localStorage remains the compatible quick cache. */
(function(root){
 'use strict';let db=null;
 const opened=new Promise((resolve,reject)=>{if(!root.indexedDB)return reject(Error('IndexedDB unavailable'));const request=root.indexedDB.open('furnish-project-storage',1);request.onupgradeneeded=()=>request.result.createObjectStore('workspace');request.onsuccess=()=>{db=request.result;db.onversionchange=()=>db.close();resolve(db);};request.onerror=()=>reject(request.error);request.onblocked=()=>reject(Error('Local storage upgrade is blocked'));});
 function read(key){return opened.then(database=>new Promise((resolve,reject)=>{const tx=database.transaction('workspace','readonly'),request=tx.objectStore('workspace').get(key);request.onsuccess=()=>{try{resolve(request.result?JSON.parse(request.result):null);}catch(e){reject(e);}};request.onerror=()=>reject(request.error);}));}
 const ready=read('store'),historyReady=read('history');ready.catch(()=>{});historyReady.catch(()=>{});let queue=opened;
 function writeKey(key,value,clear=false){const json=JSON.stringify(value);const task=queue.catch(()=>opened).then(()=>new Promise((resolve,reject)=>{const tx=db.transaction('workspace','readwrite'),objects=tx.objectStore('workspace');if(clear)objects.clear();else objects.put(json,key);tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error||Error('Local save aborted'));}));queue=task;return task;}
 const write=value=>writeKey('store',value),writeHistory=value=>writeKey('history',value),clear=()=>writeKey('',null,true);
 root.FurnishStorage={ready,historyReady,write,writeHistory,clear};
})(window);
