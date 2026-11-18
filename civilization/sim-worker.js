import {advance,summary,validateWorld,searchHistory} from "./engine.js";
import {saveWorld,clearWorld} from "./storage.js";

let world = null;

export async function handleWorkerMessage(
  event,
  postMessage = message => self.postMessage(message),
  storageAdapter = {saveWorld,clearWorld}
) {
  const {id,type,days,meta,query,limit,year,filterType} = event.data || {};
  try {
    if (type==="init") {
      world = validateWorld(event.data.world);
      if (days>0) advance(world,Math.min(3650,Math.max(0,Math.floor(days))));
      postMessage({id,summary:summary(world)});
      return;
    }
    if (!world) throw new Error("Motore non inizializzato");
    if (type==="advance") {
      const result = advance(world,days);
      postMessage({id,advanced:result.advanced,summary:summary(world)});
      return;
    }
    if (type==="snapshot") {
      postMessage({id,world,summary:summary(world)});
      return;
    }
    if (type==="save") {
      Object.assign(world,meta||{},{lastWallTime:Date.now()});
      await storageAdapter.saveWorld(world);
      postMessage({id,saved:true,summary:summary(world)});
      return;
    }
    if (type==="history") {
      postMessage({id,history:searchHistory(world,{query,limit,year,type:filterType})});
      return;
    }
    if (type==="clear") {
      world = null;
      await storageAdapter.clearWorld();
      postMessage({id,cleared:true});
      return;
    }
    throw new Error("Comando worker sconosciuto");
  } catch (error) {
    postMessage({id,error:error?.message||String(error)});
  }
}

if (typeof self!=="undefined") {
  self.onmessage = event => { void handleWorkerMessage(event); };
}
