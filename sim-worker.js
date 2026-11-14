import {advance,summary,validateWorld} from "./engine.js";
let world=null;
self.onmessage=e=>{
 const {id,type,days}=e.data;
 try{
  if(type==="init"){world=validateWorld(e.data.world);advance(world,Math.max(0,Math.min(3650,Math.floor(days||0))));self.postMessage({id,summary:summary(world)});return;}
  if(type==="advance"){if(!world)throw new Error("Worker non inizializzato");advance(world,Math.max(0,Math.min(3650,Math.floor(days||0))));self.postMessage({id,summary:summary(world)});return;}
  if(type==="snapshot"){if(!world)throw new Error("Nessuno stato nel worker");self.postMessage({id,world,summary:summary(world)});return;}
  if(type==="clear"){world=null;self.postMessage({id,cleared:true});return;}
  throw new Error("Comando worker sconosciuto");
 }catch(error){self.postMessage({id,error:error.message});}
};