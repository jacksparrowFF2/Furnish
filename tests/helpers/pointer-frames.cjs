// Existing geometry replays inspect the result after each simulated frame.
// Scheduling-specific tests intentionally do not use this adapter.
module.exports=function pointerFrames(context){
 let next=0;const frames=new Map();
 context.requestAnimationFrame=fn=>{frames.set(++next,fn);return next;};
 context.cancelAnimationFrame=id=>frames.delete(id);
 const add=context.svg.addEventListener;
 context.svg.addEventListener=(name,fn)=>add(name,name==='pointermove'?event=>{
  fn(event);const pending=[...frames.values()];frames.clear();for(const callback of pending)callback(0);
 }:fn);
};
