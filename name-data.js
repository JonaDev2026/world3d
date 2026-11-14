const SOURCES = [
  ["it","https://raw.githubusercontent.com/kkrypt0nn/wordlists/main/wordlists/languages/italian.txt"],
  ["en","https://raw.githubusercontent.com/kkrypt0nn/wordlists/main/wordlists/languages/english.txt"],
  ["es","https://raw.githubusercontent.com/kkrypt0nn/wordlists/main/wordlists/languages/spanish.txt"],
  ["fr","https://raw.githubusercontent.com/kkrypt0nn/wordlists/main/wordlists/languages/french.txt"],
  ["nl","https://raw.githubusercontent.com/kkrypt0nn/wordlists/main/wordlists/languages/dutch.txt"],
  ["sv","https://raw.githubusercontent.com/kkrypt0nn/wordlists/main/wordlists/languages/swedish.txt"],
  ["pt","https://raw.githubusercontent.com/kkrypt0nn/wordlists/main/wordlists/languages/portuguese.txt"],
  ["pl","https://raw.githubusercontent.com/kkrypt0nn/wordlists/main/wordlists/languages/polish.txt"],
  ["da","https://raw.githubusercontent.com/kkrypt0nn/wordlists/main/wordlists/languages/danish.txt"],
  ["names","https://raw.githubusercontent.com/kkrypt0nn/wordlists/main/wordlists/names/names.txt"],
  ["it-common","https://raw.githubusercontent.com/napolux/paroleitaliane/main/paroleitaliane/1000_parole_italiane_comuni.txt"],
  ["it-names","https://raw.githubusercontent.com/napolux/paroleitaliane/main/paroleitaliane/9000_nomi_propri.txt"]
];
const DB="world3d-name-dictionaries";
function openCache(){return new Promise((resolve,reject)=>{const r=indexedDB.open(DB,1);r.onupgradeneeded=()=>r.result.createObjectStore("files");r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});}
async function cachedText(key,url){
  try{const db=await openCache();const cached=await new Promise((resolve,reject)=>{const r=db.transaction("files","readonly").objectStore("files").get(key);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});if(cached){db.close();return cached;}db.close();}catch{}
  const response=await fetch(url,{cache:"force-cache"});if(!response.ok)throw new Error("Dizionario non disponibile: "+key);const value=await response.text();
  try{const db=await openCache();await new Promise((resolve,reject)=>{const tx=db.transaction("files","readwrite");tx.objectStore("files").put(value,key);tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);});db.close();}catch{}
  return value;
}
function clean(value){return String(value||"").normalize("NFC").trim().replace(/^[^\p{L}]+|[^\p{L}]+$/gu,"");}
function sampleWords(text,limit,seed){
  const source=[...new Set(text.split(/[\r\n\t ]+/).map(clean).filter(w=>w.length>=4&&w.length<=13&&/\p{L}/u.test(w)&&!/[0-9_]/.test(w)).map(w=>w.toLocaleLowerCase()))];
  let state=seed>>>0||1;const next=()=>{state^=state<<13;state^=state>>>17;state^=state<<5;return (state>>>0)/4294967296;};
  const picked=new Set();if(source.length<=limit)return source;
  while(picked.size<limit){picked.add(source[Math.floor(next()*source.length)].toLocaleLowerCase());}
  return [...picked];
}
export async function loadNameData(){
  const results=await Promise.allSettled(SOURCES.map(([key,url])=>cachedText(key,url)));
  const words=[],names=[];
  results.forEach((result,index)=>{
    if(result.status!=="fulfilled")return;
    const key=SOURCES[index][0],value=result.value;
    if(key==="names"||key==="it-names"){names.push(...sampleWords(value,2500,index+71));return;}
    if(key==="it-common"){words.push(...sampleWords(value,900,41));return;}
    words.push(...sampleWords(value,2200,index+101));
  });
  return {words:[...new Set(words)],names:[...new Set(names)]};
}
