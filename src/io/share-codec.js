(function(root){
  'use strict';
  function create({CompressionStream:compress=root.CompressionStream,DecompressionStream:decompress=root.DecompressionStream}={}){
    const enc=bytes=>{let s='';for(let i=0;i<bytes.length;i+=0x8000)s+=String.fromCharCode(...bytes.subarray(i,i+0x8000));return btoa(s).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');};
    const dec=str=>{if(!/^[A-Za-z0-9_-]+$/.test(str))throw Error('Invalid share encoding');const s=str.replace(/-/g,'+').replace(/_/g,'/');return Uint8Array.from(atob(s+'='.repeat((4-s.length%4)%4)),c=>c.charCodeAt(0));};
    async function encode(json){
      const src=new TextEncoder().encode(json);
      if(compress){try{const out=await new Response(new Blob([src]).stream().pipeThrough(new compress('deflate-raw'))).arrayBuffer();return 'z'+enc(new Uint8Array(out));}catch(e){/* Older engines may not support deflate-raw. */}}
      return 'r'+enc(src);
    }
    async function decode(str){
      if(!/^[rz]/.test(str))throw Error('Invalid share format');
      const raw=dec(str.slice(1));
      if(str[0]==='z'&&!decompress)throw Error('Compressed shares are unavailable');
      const out=str[0]==='z'?await new Response(new Blob([raw]).stream().pipeThrough(new decompress('deflate-raw'))).arrayBuffer():raw;
      return new TextDecoder().decode(out);
    }
    return {encode,decode};
  }
  function createLoader({decode,prepare,apply,onError}){
    let generation=0,pending='';
    async function load(hash){
      if(hash&&hash===pending)return;
      const token=++generation;pending=hash;
      const match=hash.match(/^#p=(\w+)&v=(.+)$/);
      try{
        if(!match)return;
        const work=JSON.parse(await decode(match[2]));
        if(token!==generation)return;
        const ready=prepare(work,match[1]);
        apply(ready);
      }catch(e){if(token===generation)onError(e);}
      finally{if(token===generation)pending='';}
    }
    return {load};
  }
  const api={create,createLoader};
  if(typeof module==='object'&&module.exports)module.exports=api;else root.FurnishShare=api;
})(typeof globalThis!=='undefined'?globalThis:this);
