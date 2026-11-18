import {advance,summary,validateWorld,searchHistory} from "./engine.js";
import {saveWorld,clearWorld} from "./storage.js";
let world = null;
self.onmessage = async event => {
  const {id,type,days,meta,query,limit,year,filterType} = event.data;
  try {
    if (type==="init") {
      world = validateWorld(event.data.world);
      if (days>0) advance(world,Math.min(3650,Math.max(0,Math.floor(days))));
      self.postMessage({id,summary:summary(world)});
      return;
    }
    if (!world) throw new Error("Motore non inizializzato");
    if (type==="advance") {
      const result = advance(world,days);
      self.postMessage({id,advanced:result.advanced,summary:summary(world)});
      return;
    }
    if (type==="snapshot") {
      self.postMessage({id,world,summary:summary(world)});
      return;
    }
    if (type==="save") {
      Object.assign(world,meta||{},{lastWallTime:Date.now()});
      await saveWorld(world);
      self.postMessage({id,saved:true,summary:summary(world)});
      return;
    }
    if (type==="history") {
      self.postMessage({id,history:searchHistory(world,{query,limit,year,type:filterType})});
      return;
    }
    if (type==="clear") {
      world = null;
      await clearWorld();
      self.postMessage({id,cleared:true});
      return;
    }
    throw new Error("Comando worker sconosciuto");
  } catch (error) {
    self.postMessage({id,error:error?.message||String(error)});
  }
};
