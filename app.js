import {createWorld,advance,summary,validateWorld} from "./engine.js";
const $=id=>document.getElementById(id), DB="anno-zero-world", STORE="state";
let world,paused=false,speed=1,worker=null,busy=false,lastSaved=0,eventsSeen=-1,elapsedMs=0;
const fmt=n=>new Intl.NumberFormat("it-IT").format(n);
function openDB(){return new Promise((ok,no)=>{const r=indexedDB.open(DB,1);r.onupgradeneeded=()=>r.result.createObjectStore(STORE);r.onsuccess=()=>ok(r.result);r.onerror=()=>no(r.error);});}
async function load(){const db=await openDB();return new Promise((ok,no)=>{const r=db.transaction(STORE,"readonly").objectStore(STORE).get("world");r.onsuccess=()=>ok(r.result||null);r.onerror=()=>no(r.error);});}
async function save(){if(!world)return;world.lastWallTime=Date.now();world.speed=speed;world.paused=paused;world.timeRemainderMs=elapsedMs;const db=await openDB();await new Promise((ok,no)=>{const tx=db.transaction(STORE,"readwrite");tx.objectStore(STORE).put(world,"world");tx.oncomplete=ok;tx.onerror=()=>no(tx.error);});lastSaved=Date.now();$("save-state").textContent="Salvato sul dispositivo";$("last-save").textContent="SALVATO "+new Date(lastSaved).toLocaleTimeString("it-IT",{hour:"2-digit",minute:"2-digit"});}
function esc(t){return String(t).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
function render(s){
 $("date").textContent="Anno "+s.year+" · Giorno "+s.day;$("population").textContent=fmt(s.population);$("population-change").textContent=(s.dead?fmt(s.dead)+" decessi storici":"comunità fondatrice")+" · "+fmt(s.workers)+" in età attiva";
 $("settlements").textContent=s.settlements;$("settlement-type").textContent=s.settlement?.kind||"—";$("food").textContent=fmt(s.food);$("food-status").textContent=s.food<s.population*2?"scorte critiche":s.food<s.population*10?"riserve limitate":"riserva comunitaria";
 $("knowledge").textContent=fmt(s.knowledge);$("technology").textContent=s.technology.length+" conoscenze acquisite";$("order").textContent=s.order+"%";$("government").textContent=s.polity;
 const foodPct=Math.min(100,Math.round(s.food/Math.max(1,s.population*12)*100));
 for(const [name,val] of [["health",s.health],["cohesion",s.cohesion],["food",foodPct]]){$(name+"-value").textContent=val+"%";$(name+"-bar").style.width=val+"%";}
 $("knowledge-value").textContent=fmt(s.knowledge);$("knowledge-bar").style.width=Math.min(100,s.knowledge/100)+"%";
 $("polity").textContent=s.polity;$("belief").textContent=s.religion;$("climate").textContent=s.climate&&s.climate.type!=="normale"?s.climate.type+" · "+s.climate.days+" giorni":"Stagione regolare";$("relations").textContent=s.relations.length?s.relations.join(", "):"Nessun contatto esterno";$("laws").textContent=s.laws;$("economy").textContent=s.economy;$("tech-list").textContent=s.technology.join(" · ");$("workers").textContent=fmt(s.workers);$("births").textContent=fmt(s.stats.births);$("deaths").textContent=fmt(s.stats.deaths);$("crimes").textContent=fmt(s.stats.crimes);$("wars").textContent=fmt(s.stats.wars);$("epidemics").textContent=fmt(s.stats.epidemics);$("institutions").textContent=s.institutions.length?s.institutions.join(", "):"Nessuna istituzione permanente";
 $("leader").textContent=s.leader?s.leader.name+" "+s.leader.family:"Nessuna guida riconosciuta";$("legitimacy").textContent=Math.round(s.leadership?.legitimacy||0)+"%";
 const social=s.social||{inequality:0,tension:0,classes:{poveri:0,lavoratori:s.population,agiati:0,"élite":0}};
 $("inequality").textContent=Math.round(social.inequality*100)+"%";$("tension").textContent=Math.round(social.tension)+"%";
 $("class-poor").textContent=fmt(social.classes?.poveri||0);$("class-workers").textContent=fmt(social.classes?.lavoratori||0);
 $("class-affluent").textContent=fmt(social.classes?.agiati||0);$("class-elite").textContent=fmt(social.classes?.["élite"]||0);
 $("jobs").textContent=Object.entries(s.roles||{}).filter(([,count])=>count>0).map(([role,count])=>role+" "+fmt(count)).join(" · ")||"Attività non ancora specializzate";
 $("event-count").textContent=s.eventTotal+" eventi registrati";$("era").textContent=s.year<100?"ERA DELLE ORIGINI":s.year<500?"ERA DEI VILLAGGI":s.year<1500?"ERA DELLE PRIME CITTÀ":"ERA DELLA CRESCITA";
 $("territory-name").textContent=s.settlement?.name||"Territorio";$("territory-area").textContent=(s.settlement?.knownArea||0)+" km² conosciuti";$("settlement-list").textContent=(s.settlementDetails||[]).map(st=>st.name+" · "+fmt(st.population||0)).join(" | ");
 const newest=s.events[0]?.id||0;if(eventsSeen!==newest){eventsSeen=newest;$("events").innerHTML=s.events.length?s.events.map(e=>`<article class="event"><time>ANNO ${e.year} · G${e.day}</time><div><strong>${esc(e.title)}</strong><p>${esc(e.description)}</p></div></article>`).join(""):'<div class="event empty">La storia deve ancora cominciare.</div>';}
 updateAtmosphere(s);
 drawMap(s);
}
function updateAtmosphere(s){
 const climate=s.climate||{type:"normale",days:0,severity:0},day=((s.day-1)%365)+1;
 const season=day<=90?"Primavera":day<=181?"Estate":day<=273?"Autunno":"Inverno";
 let weather="Tempo mite",weatherIcon="partly_cloudy_day",detail=season+" · condizioni regolari";
 if(climate.days>0){
  if(climate.type==="siccità"){weather="Siccità";weatherIcon="wb_sunny";detail="Scarsità di pioggia · "+climate.days+" giorni residui";}
  else if(climate.type==="alluvione"){weather="Piogge intense";weatherIcon="rainy";detail="Piena e terreni saturi · "+climate.days+" giorni residui";}
  else if(climate.type==="inverno rigido"){weather="Freddo intenso";weatherIcon="ac_unit";detail="Inverno anomalo · "+climate.days+" giorni residui";}
 }else if(season==="Estate"){weather="Sereno";weatherIcon="sunny";detail="Estate · condizioni regolari";}
 else if(season==="Autunno"){weather="Variabile";weatherIcon="cloud";detail="Autunno · condizioni regolari";}
 else if(season==="Inverno"){weather="Freddo stagionale";weatherIcon="cloudy_snowing";detail="Inverno · condizioni regolari";}
 $("weather-icon").textContent=weatherIcon;$("weather-label").textContent=weather;$("season-label").textContent=detail;
 const phase=(elapsedMs%60000)/60000;
 let label="Notte",icon="dark_mode",tint="rgba(8,16,38,.32)";
 if(phase>=.17&&phase<.29){label="Alba";icon="wb_twilight";tint="rgba(222,137,91,.13)";}
 else if(phase>=.29&&phase<.72){label="Giorno";icon="light_mode";tint="rgba(239,190,104,.035)";}
 else if(phase>=.72&&phase<.84){label="Tramonto";icon="wb_twilight";tint="rgba(194,103,83,.16)";}
 $("sky-icon").textContent=icon;$("sky-label").textContent=label;
 $("sky-time").textContent=phase<.17?"Ore notturne":phase<.29?"Prime luci":phase<.72?"Luce diurna":phase<.84?"Ultima luce":"Ore notturne";
 const pct=Math.round(phase*100);$("day-progress-label").textContent=pct+"%";$("day-progress-bar").style.width=pct+"%";
 $("map").parentElement.style.setProperty("--sky-tint",tint);$("map").style.filter=phase<.17||phase>=.84?"brightness(.62) saturate(.78)":phase<.29||phase>=.72?"brightness(.84) sepia(.22)":"brightness(1) saturate(1)";
}
function drawMap(s){
 const c=$("map"),x=c.getContext("2d"),w=c.width,h=c.height;x.clearRect(0,0,w,h);x.fillStyle="#252c29";x.fillRect(0,0,w,h);
 for(let i=0;i<17;i++){x.beginPath();for(let a=0;a<=w;a+=12){const y=h*.5+Math.sin(a*.008+i*.55)*38+i*13;a===0?x.moveTo(a,y):x.lineTo(a,y);}x.strokeStyle=i%3===0?"#39443d":"#303a34";x.globalAlpha=.55;x.stroke();}x.globalAlpha=1;
 x.lineCap="round";x.lineJoin="round";x.strokeStyle="#527f8d";x.lineWidth=17;x.beginPath();x.moveTo(0,95);x.bezierCurveTo(230,125,340,265,460,315);x.bezierCurveTo(550,350,650,440,900,490);x.stroke();
 x.lineWidth=10;x.beginPath();x.moveTo(170,620);x.bezierCurveTo(245,500,350,390,460,315);x.stroke();x.lineWidth=8;x.beginPath();x.moveTo(900,70);x.bezierCurveTo(740,130,610,220,460,315);x.stroke();
 x.setLineDash([8,7]);x.strokeStyle="#8f8268";x.lineWidth=2;x.beginPath();x.moveTo(460,315);x.bezierCurveTo(360,270,300,190,240,140);x.moveTo(460,315);x.bezierCurveTo(600,370,670,430,770,470);x.stroke();x.setLineDash([]);
 const fields=s.technology.includes("Agricoltura")?Math.min(28,Math.floor(s.population/8+(s.settlement?.fields||0))):0;for(let i=0;i<fields;i++){const a=330+i%7*31,b=340+Math.floor(i/7)*24;x.fillStyle=i%2?"#68784f":"#778657";x.fillRect(a,b,23,15);x.strokeStyle="#4e603d";for(let j=0;j<3;j++){x.beginPath();x.moveTo(a+4+j*7,b+2);x.lineTo(a+4+j*7,b+13);x.stroke();}}
 const homes=Math.min(70,Math.max(6,Math.floor(s.population/2.2)));for(let i=0;i<homes;i++){const a=i*2.39996,r=22+Math.sqrt(i)*9,px=460+Math.cos(a)*r,py=315+Math.sin(a)*r*.65;x.fillStyle=i%5===0?"#bca77f":"#9d8f70";x.fillRect(px-4,py-3,8,6);x.fillStyle="#51493e";x.beginPath();x.moveTo(px-5,py-3);x.lineTo(px,py-7);x.lineTo(px+5,py-3);x.fill();}
 x.fillStyle="#8fae82";x.beginPath();x.arc(460,315,5,0,Math.PI*2);x.fill();x.font="500 14px 'Google Sans'";x.fillText(s.settlement?.name||"Insediamento",480,309);x.font="14px 'Google Sans'";x.fillStyle="#c4bdc8";x.fillText("CONFLUENZA",480,330);
 for(const st of (s.settlementDetails||[]).slice(1)){const px=460+st.x*.7,py=315+st.y*.7;x.fillStyle="#d0bd91";x.beginPath();x.arc(px,py,4,0,Math.PI*2);x.fill();x.fillStyle="#c4bdc8";x.font="14px 'Google Sans'";x.fillText(st.name+" · "+fmt(st.population||0),px+9,py-6);}for(const g of s.neighbors.filter(q=>q.discovered)){x.fillStyle=g.atWar?"#bd746a":g.allied?"#82a9c4":"#9fb68a";x.beginPath();x.arc(460+g.x*.7,315+g.y*.7,5,0,Math.PI*2);x.fill();}
 
 x.fillStyle="#c4bdc8";x.font="14px 'Google Sans'";x.fillText("N",24,28);x.strokeStyle="#778273";x.beginPath();x.moveTo(28,36);x.lineTo(28,62);x.moveTo(24,42);x.lineTo(28,34);x.lineTo(32,42);x.stroke();
}
function setPaused(v){paused=v;$("pause").textContent=paused?"▶ Riprendi":"Ⅱ Pausa";$("status").textContent=paused?"SIMULAZIONE IN PAUSA":"SIMULAZIONE ATTIVA";$("status-dot").parentElement.classList.toggle("paused",paused);}
async function runAdvance(days){if(worker){const id=++step.id;const result=await new Promise((resolve,reject)=>{const handler=e=>{if(e.data.id!==id)return;worker.removeEventListener("message",handler);e.data.error?reject(new Error(e.data.error)):resolve(e.data);};worker.addEventListener("message",handler);worker.postMessage({id,world,days});});world=result.world;}else advance(world,days);}
async function step(days){if(busy||paused)return;busy=true;try{await runAdvance(days);render(summary(world));if(world.day%11===0)await save();}catch(e){console.error(e);$("save-state").textContent="Errore: "+e.message;setPaused(true);}busy=false;}step.id=0;

document.querySelectorAll("[data-tab]").forEach(tab=>tab.addEventListener("click",()=>{
 const target=tab.dataset.tab;
 document.querySelectorAll("[data-tab]").forEach(item=>{
  const active=item===tab;
  item.classList.toggle("active",active);
  item.setAttribute("aria-selected",String(active));
 });
 document.querySelectorAll("[data-page]").forEach(page=>{
  page.hidden=page.dataset.page!==target;
 });
}));

$("pause").addEventListener("click",()=>setPaused(!paused));
document.querySelectorAll("[data-speed]").forEach(b=>b.addEventListener("click",()=>{speed=Number(b.dataset.speed);document.querySelectorAll("[data-speed]").forEach(q=>q.classList.toggle("selected",q===b));}));
$("save-now").addEventListener("click",()=>save().catch(e=>$("save-state").textContent="Errore salvataggio"));
$("reset-world").addEventListener("click",async()=>{if(busy){$("save-state").textContent="Attendi la fine del ciclo in corso";return;}if(!window.confirm("Vuoi cancellare la civiltà attuale e ricominciare dall’Anno 0? Questa operazione non si può annullare."))return;setPaused(true);try{const db=await openDB();await new Promise((resolve,reject)=>{const tx=db.transaction(STORE,"readwrite");tx.objectStore(STORE).clear();tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);});db.close();world=createWorld();elapsedMs=0;speed=1;setPaused(false);document.querySelectorAll("[data-speed]").forEach(b=>b.classList.toggle("selected",Number(b.dataset.speed)===1));eventsSeen=-1;render(summary(world));await save();$("save-state").textContent="Nuova simulazione · Anno 0";}catch(e){console.error(e);$("save-state").textContent="Errore durante il riavvio";setPaused(true);}});
window.addEventListener("pagehide",()=>{if(world){world.timeRemainderMs=elapsedMs;world.speed=speed;world.paused=paused;world.lastWallTime=Date.now();try{const r=indexedDB.open(DB,1);r.onsuccess=()=>{const tx=r.result.transaction(STORE,"readwrite");tx.objectStore(STORE).put(world,"world");};}catch{}}});
async function init(){try{if("Worker"in window)worker=new Worker("./sim-worker.js",{type:"module"});world=await load();if(world){validateWorld(world);speed=Number(world.speed)||1;paused=Boolean(world.paused);elapsedMs=Number(world.timeRemainderMs)||0;if(!paused){elapsedMs+=Math.max(0,Date.now()-(world.lastWallTime||Date.now()))*speed;const missedDays=Math.floor(elapsedMs/60000);elapsedMs%=60000;if(missedDays)await runAdvance(Math.min(missedDays,200000));}}else world=createWorld();setPaused(paused);document.querySelectorAll("[data-speed]").forEach(b=>b.classList.toggle("selected",Number(b.dataset.speed)===speed));render(summary(world));await save();}catch(e){console.error(e);world=createWorld();elapsedMs=0;render(summary(world));$("save-state").textContent="Nuovo stato: salvataggio precedente non leggibile";}setInterval(()=>{if(!paused){elapsedMs+=1000*speed;if(elapsedMs>=60000&&!busy){const days=Math.floor(elapsedMs/60000);elapsedMs%=60000;step(days);}}if(world)updateAtmosphere(summary(world));},1000);setInterval(()=>{if(world)save().catch(console.error);},15000);}
init();
