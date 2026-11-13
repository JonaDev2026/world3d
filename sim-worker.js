import {advance,summary,validateWorld} from "./engine.js";
self.onmessage=e=>{
 const {id,world,days}=e.data;
 try{const s=validateWorld(world);advance(s,Math.max(0,Math.min(200000,Math.floor(days))));self.postMessage({id,world:s,summary:summary(s)});}
 catch(error){self.postMessage({id,error:error.message});}
};
