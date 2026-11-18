const DB_NAME = "anno-zero-civilization";
const STORE_NAME = "state";
export function calculateOfflineCatchUp(world,now=Date.now()) {
  const pending = Math.max(0,Number(world?.pendingDays)||0);
  if (!world || world.paused) return {days:0,pendingDays:pending};
  const speed = Math.max(1,Math.min(60,Number(world.speed)||1));
  const last = Number(world.lastWallTime)||now;
  const elapsedSeconds = Math.max(0,now-last)/1000;
  const total = pending+elapsedSeconds*speed;
  const days = Math.floor(total);
  return {days,pendingDays:total-days};
}
function openDatabase() {
  return new Promise((resolve,reject)=>{
    const request = indexedDB.open(DB_NAME,1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) request.result.createObjectStore(STORE_NAME);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
export async function loadWorld() {
  const database = await openDatabase();
  return new Promise((resolve,reject)=>{
    const request = database.transaction(STORE_NAME,"readonly").objectStore(STORE_NAME).get("world");
    request.onsuccess = () => { database.close(); resolve(request.result||null); };
    request.onerror = () => { database.close(); reject(request.error); };
  });
}
export async function saveWorld(world) {
  const database = await openDatabase();
  return new Promise((resolve,reject)=>{
    const transaction = database.transaction(STORE_NAME,"readwrite");
    transaction.objectStore(STORE_NAME).put(world,"world");
    transaction.oncomplete = () => { database.close(); resolve(true); };
    transaction.onerror = () => { const error=transaction.error; database.close(); reject(error); };
    transaction.onabort = () => { const error=transaction.error; database.close(); reject(error||new Error("Salvataggio annullato")); };
  });
}
export async function clearWorld() {
  const database = await openDatabase();
  return new Promise((resolve,reject)=>{
    const transaction = database.transaction(STORE_NAME,"readwrite");
    transaction.objectStore(STORE_NAME).delete("world");
    transaction.oncomplete = () => { database.close(); resolve(true); };
    transaction.onerror = () => { const error=transaction.error; database.close(); reject(error); };
  });
}
