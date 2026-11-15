const SUPPORTED=["it","en","fr","es"];
let dictionary={},preference="auto";
const originals=new WeakMap(),attributeOriginals=new WeakMap();
function detectLanguage(){const raw=(navigator.languages?.[0]||navigator.language||"it").toLowerCase().split("-")[0];return SUPPORTED.includes(raw)?raw:"en";}
function translatePage(){
 const walker=document.createTreeWalker(document,NodeFilter.SHOW_TEXT);const nodes=[];
 while(walker.nextNode())nodes.push(walker.currentNode);
 for(const node of nodes){if(!originals.has(node))originals.set(node,node.nodeValue);const source=originals.get(node),key=source.trim();node.nodeValue=dictionary[key]?source.replace(key,dictionary[key]):source;}
 document.querySelectorAll("[title],[aria-label]").forEach(el=>{for(const attr of ["title","aria-label"]){if(!attributeOriginals.has(el))attributeOriginals.set(el,{});const saved=attributeOriginals.get(el);if(!(attr in saved))saved[attr]=el.getAttribute(attr);const source=saved[attr];if(dictionary[source])el.setAttribute(attr,dictionary[source]);}});
}
async function load(lang){const response=await fetch(`./locales/${lang}.json`);dictionary=await response.json();translatePage();document.documentElement.lang=lang;}
export async function initI18n(){preference=localStorage.getItem("world3d-language")||"auto";await load(preference==="auto"?detectLanguage():preference);return {get preference(){return preference;},t(key){return dictionary[key]||key;},async setLanguage(value){preference=value;localStorage.setItem("world3d-language",value);await load(value==="auto"?detectLanguage():value);}};}
