import {advance,summary,validateWorld} from "./engine.js";
const DB="anno-zero-world",STORE="state";
let world=null;
function persist(meta={}){
 return new Promise((resolve,reject)=>{
  if(!world){reject(new Error("Nessuno stato nel worker"));return;}
  Object.assign(world,meta,{lastWallTime:Date.now()});
  const request=indexedDB.open(DB,1);
  request.onupgradeneeded=()=>request.result.createObjectStore(STORE);
  request.onerror=()=>reject(request.error);
  request.onsuccess=()=>{
   const db=request.result,tx=db.transaction(STORE,"readwrite");
   tx.objectStore(STORE).put(world,"world");
   tx.oncomplete=()=>{db.close();resolve();};
   tx.onerror=()=>{const error=tx.error;db.close();reject(error);};
  };
 });
}
self.onmessage=async e=>{
 const {id,type,days}=e.data;
 try{
  if(type==="init"){world=validateWorld(e.data.world);advance(world,Math.max(0,Math.min(3650,Math.floor(days||0))));self.postMessage({id,summary:summary(world)});return;}
  if(type==="advance"){if(!world)throw new Error("Worker non inizializzato");advance(world,Math.max(0,Math.min(3650,Math.floor(days||0))));self.postMessage({id,summary:summary(world)});return;}
  if(type==="snapshot"){if(!world)throw new Error("Nessuno stato nel worker");self.postMessage({id,world,summary:summary(world)});return;}
  if(type==="save"){await persist(e.data.meta||{});self.postMessage({id,saved:true,summary:summary(world)});return;}
  if(type==="clear"){world=null;self.postMessage({id,cleared:true});return;}
  throw new Error("Comando worker sconosciuto");
 }catch(error){self.postMessage({id,error:error.message});}
};