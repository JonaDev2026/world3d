import {createWorld,advance,summary,validateWorld} from "./engine.js";
const $=id=>document.getElementById(id), DB="anno-zero-world", STORE="state";
let world,paused=false,speed=1,worker=null,busy=false,lastSaved=0,eventsSeen=-1;
const fmt=n=>new Intl.NumberFormat("it-IT").format(n);
function openDB(){return new Promise((ok,no)=>{const r=indexedDB.open(DB,1);r.onupgradeneeded=()=>r.result.createObjectStore(STORE);r.onsuccess=()=>ok(r.result);r.onerror=()=>no(r.error);});}
async function load(){const db=await openDB();return new Promise((ok,no)=>{const r=db.transaction(STORE,"readonly").objectStore(STORE).get("world");r.onsuccess=()=>ok(r.result||null);r.onerror=()=>no(r.error);});}
async function save(){if(!world)return;world.lastWallTime=Date.now();world.speed=speed;world.paused=paused;const db=await openDB();await new Promise((ok,no)=>{const tx=db.transaction(STORE,"readwrite");tx.objectStore(STORE).put(world,"world");tx.oncomplete=ok;tx.onerror=()=>no(tx.error);});lastSaved=Date.now();$("save-state").textContent="Salvato sul dispositivo";$("last-save").textContent="SALVATO "+new Date(lastSaved).toLocaleTimeString("it-IT",{hour:"2-digit",minute:"2-digit"});}
function esc(t){return String(t).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
function render(s){
 $("date").textContent="Anno "+s.year+" · Giorno "+s.day;$("population").textContent=fmt(s.population);$("population-change").textContent=(s.dead?fmt(s.dead)+" decessi storici":"comunità fondatrice")+" · "+fmt(s.workers)+" in età attiva";
 $("settlements").textContent=s.settlements;$("settlement-type").textContent=s.settlement?.kind||"—";$("food").textContent=fmt(s.food);$("food-status").textContent=s.food<s.population*2?"scorte critiche":s.food<s.population*10?"riserve limitate":"riserva comunitaria";
 $("knowledge").textContent=fmt(s.knowledge);$("technology").textContent=s.technology.length+" conoscenze acquisite";$("order").textContent=s.order+"%";$("government").textContent=s.polity;
 const foodPct=Math.min(100,Math.round(s.food/Math.max(1,s.population*12)*100));
 for(const [name,val] of [["health",s.health],["cohesion",s.cohesion],["food",foodPct]]){$(name+"-value").textContent=val+"%";$(name+"-bar").style.width=val+"%";}
 $("knowledge-value").textContent=fmt(s.knowledge);$("knowledge-bar").style.width=Math.min(100,s.knowledge/100)+"%";
 $("polity").textContent=s.polity;$("belief").textContent=s.religion;$("relations").textContent=s.relations.length?s.relations.join(", "):"Nessun contatto esterno";$("laws").textContent=s.laws;$("economy").textContent=s.economy;$("tech-list").textContent=s.technology.join(" · ");$("workers").textContent=fmt(s.workers);
 $("event-count").textContent=s.eventTotal+" eventi registrati";$("era").textContent=s.year<100?"ERA DELLE ORIGINI":s.year<500?"ERA DEI VILLAGGI":s.year<1500?"ERA DELLE PRIME CITTÀ":"ERA DELLA CRESCITA";
 $("territory-name").textContent=s.settlement?.name||"Territorio";$("territory-area").textContent=(s.settlement?.knownArea||0)+" km² conosciuti";
 const newest=s.events[0]?.id||0;if(eventsSeen!==newest){eventsSeen=newest;$("events").innerHTML=s.events.length?s.events.map(e=>`<article class="event"><time>ANNO ${e.year} · G${e.day}</time><div><strong>${esc(e.title)}</strong><p>${esc(e.description)}</p></div></article>`).join(""):'<div class="event empty">La storia deve ancora cominciare.</div>';}
 drawMap(s);
}
function drawMap(s){
 const c=$("map"),x=c.getContext("2d"),w=c.width,h=c.height;x.clearRect(0,0,w,h);x.fillStyle="#e8ede4";x.fillRect(0,0,w,h);
 for(let i=0;i<17;i++){x.beginPath();for(let a=0;a<=w;a+=12){const y=h*.5+Math.sin(a*.008+i*.55)*38+i*13;a===0?x.moveTo(a,y):x.lineTo(a,y);}x.strokeStyle=i%3===0?"#d1dacb":"#dce4d7";x.globalAlpha=.55;x.stroke();}x.globalAlpha=1;
 x.lineCap="round";x.lineJoin="round";x.strokeStyle="#75a9b2";x.lineWidth=17;x.beginPath();x.moveTo(0,95);x.bezierCurveTo(230,125,340,265,460,315);x.bezierCurveTo(550,350,650,440,900,490);x.stroke();
 x.lineWidth=10;x.beginPath();x.moveTo(170,620);x.bezierCurveTo(245,500,350,390,460,315);x.stroke();x.lineWidth=8;x.beginPath();x.moveTo(900,70);x.bezierCurveTo(740,130,610,220,460,315);x.stroke();
 x.setLineDash([8,7]);x.strokeStyle="#b4a98c";x.lineWidth=2;x.beginPath();x.moveTo(460,315);x.bezierCurveTo(360,270,300,190,240,140);x.moveTo(460,315);x.bezierCurveTo(600,370,670,430,770,470);x.stroke();x.setLineDash([]);
 const fields=s.technology.includes("Agricoltura")?Math.min(28,Math.floor(s.population/8+(s.settlement?.fields||0))):0;for(let i=0;i<fields;i++){const a=330+i%7*31,b=340+Math.floor(i/7)*24;x.fillStyle=i%2?"#8b9664":"#a1a06a";x.fillRect(a,b,23,15);x.strokeStyle="#6f7c53";for(let j=0;j<3;j++){x.beginPath();x.moveTo(a+4+j*7,b+2);x.lineTo(a+4+j*7,b+13);x.stroke();}}
 const homes=Math.min(70,Math.max(6,Math.floor(s.population/2.2)));for(let i=0;i<homes;i++){const a=i*2.39996,r=22+Math.sqrt(i)*9,px=460+Math.cos(a)*r,py=315+Math.sin(a)*r*.65;x.fillStyle=i%5===0?"#c7b48d":"#a99b7b";x.fillRect(px-4,py-3,8,6);x.fillStyle="#665b4a";x.beginPath();x.moveTo(px-5,py-3);x.lineTo(px,py-7);x.lineTo(px+5,py-3);x.fill();}
 x.fillStyle="#657b5c";x.beginPath();x.arc(460,315,5,0,Math.PI*2);x.fill();x.font="500 14px 'DM Sans'";x.fillText(s.settlement?.name||"Insediamento",480,309);x.font="10px 'DM Mono'";x.fillStyle="#63705f";x.fillText("CONFLUENZA",480,326);
 for(const st of s.settlements.slice(1)){x.fillStyle="#d0bd91";x.beginPath();x.arc(460+st.x*.7,315+st.y*.7,4,0,Math.PI*2);x.fill();}for(const g of s.neighbors.filter(q=>q.discovered)){x.fillStyle=g.atWar?"#bd746a":"#9fb68a";x.beginPath();x.arc(460+g.x*.7,315+g.y*.7,5,0,Math.PI*2);x.fill();}
 
 x.fillStyle="#778273";x.font="10px 'DM Mono'";x.fillText("N",24,28);x.strokeStyle="#778273";x.beginPath();x.moveTo(28,36);x.lineTo(28,62);x.moveTo(24,42);x.lineTo(28,34);x.lineTo(32,42);x.stroke();
}
function setPaused(v){paused=v;$("pause").textContent=paused?"▶ Riprendi":"Ⅱ Pausa";$("status").textContent=paused?"SIMULAZIONE IN PAUSA":"SIMULAZIONE ATTIVA";$("status-dot").parentElement.classList.toggle("paused",paused);}
async function runAdvance(days){if(worker){const id=++step.id;const result=await new Promise((resolve,reject)=>{const handler=e=>{if(e.data.id!==id)return;worker.removeEventListener("message",handler);e.data.error?reject(new Error(e.data.error)):resolve(e.data);};worker.addEventListener("message",handler);worker.postMessage({id,world,days});});world=result.world;}else advance(world,days);}
async function step(days){if(busy||paused)return;busy=true;try{await runAdvance(days);render(summary(world));if(world.day%11===0)await save();}catch(e){console.error(e);$("save-state").textContent="Errore: "+e.message;setPaused(true);}busy=false;}step.id=0;
$("pause").addEventListener("click",()=>setPaused(!paused));
document.querySelectorAll("[data-speed]").forEach(b=>b.addEventListener("click",()=>{speed=Number(b.dataset.speed);document.querySelectorAll("[data-speed]").forEach(q=>q.classList.toggle("selected",q===b));}));
$("save-now").addEventListener("click",()=>save().catch(e=>$("save-state").textContent="Errore salvataggio"));
window.addEventListener("pagehide",()=>{if(world){world.lastWallTime=Date.now();try{const r=indexedDB.open(DB,1);r.onsuccess=()=>{const tx=r.result.transaction(STORE,"readwrite");tx.objectStore(STORE).put(world,"world");};}catch{}}});
async function init(){try{if("Worker"in window)worker=new Worker("./sim-worker.js",{type:"module"});world=await load();if(world){validateWorld(world);speed=Number(world.speed)||1;paused=Boolean(world.paused);const elapsed=Math.max(0,Math.floor((Date.now()-(world.lastWallTime||Date.now()))/1000));if(!paused&&elapsed)await runAdvance(Math.min(elapsed*speed,200000));}else world=createWorld();setPaused(paused);document.querySelectorAll("[data-speed]").forEach(b=>b.classList.toggle("selected",Number(b.dataset.speed)===speed));render(summary(world));await save();}catch(e){console.error(e);world=createWorld();render(summary(world));$("save-state").textContent="Nuovo stato: salvataggio precedente non leggibile";}setInterval(()=>{if(!paused)step(speed);},1000);setInterval(()=>{if(world)save().catch(console.error);},15000);}
init();
