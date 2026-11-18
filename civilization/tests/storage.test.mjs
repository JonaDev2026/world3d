import test from "node:test";
import assert from "node:assert/strict";
import {calculateOfflineCatchUp,loadWorld,saveWorld,clearWorld} from "../storage.js";

test("offline recovery converts elapsed wall time into simulated days",()=>{
  const result=calculateOfflineCatchUp({paused:false,speed:10,pendingDays:.25,lastWallTime:1000},3500);
  assert.equal(result.days,25);
  assert.ok(Math.abs(result.pendingDays-.25)<1e-9);
});

test("paused worlds do not recover elapsed time",()=>{
  const result=calculateOfflineCatchUp({paused:true,speed:30,pendingDays:.6,lastWallTime:1000},9000);
  assert.equal(result.days,0);
  assert.equal(result.pendingDays,.6);
});

test("clock rollback never advances the world",()=>{
  const result=calculateOfflineCatchUp({paused:false,speed:1,pendingDays:.4,lastWallTime:5000},1000);
  assert.equal(result.days,0);
  assert.equal(result.pendingDays,.4);
});
test("offline recovery clamps extreme saved speeds to a bounded maximum",()=>{
  const result=calculateOfflineCatchUp({paused:false,speed:365,pendingDays:0,lastWallTime:1000},2000);
  assert.equal(result.days,60);
});

test("IndexedDB adapter saves, reloads and clears a world checkpoint",async()=>{
  const stores=new Map();
  const fakeIndexedDB={
    open(){
      const request={};
      queueMicrotask(()=>{
        const database={
          objectStoreNames:{contains:name=>stores.has(name)},
          createObjectStore:name=>{stores.set(name,new Map());},
          transaction(name){
            const store=stores.get(name);
            const transaction={
              oncomplete:null,onerror:null,onabort:null,
              objectStore(){
                return {
                  get(key){
                    const result={};
                    queueMicrotask(()=>{result.result=store.get(key);result.onsuccess?.();});
                    return result;
                  },
                  put(value,key){
                    queueMicrotask(()=>{store.set(key,structuredClone(value));transaction.oncomplete?.();});
                  },
                  delete(key){
                    queueMicrotask(()=>{store.delete(key);transaction.oncomplete?.();});
                  }
                };
              }
            };
            return transaction;
          },
          close(){}
        };
        request.result=database;
        if(!database.objectStoreNames.contains("state"))request.onupgradeneeded?.();
        request.onsuccess?.();
      });
      return request;
    }
  };
  const descriptor=Object.getOwnPropertyDescriptor(globalThis,"indexedDB");
  Object.defineProperty(globalThis,"indexedDB",{value:fakeIndexedDB,configurable:true,writable:true});
  try{
    const checkpoint={year:12,day:45,population:[{id:1,alive:true}]};
    assert.equal(await saveWorld(checkpoint),true);
    assert.deepEqual(await loadWorld(),checkpoint);
    assert.equal(await clearWorld(),true);
    assert.equal(await loadWorld(),null);
  }finally{
    if(descriptor)Object.defineProperty(globalThis,"indexedDB",descriptor);
    else delete globalThis.indexedDB;
  }
});
