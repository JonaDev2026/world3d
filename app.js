import {createWorld,advance,summary,validateWorld} from "./engine.js";
const $=id=>document.getElementById(id),DB="anno-zero-world",STORE="state";
let world,paused=false,speed=1,worker=null,busy=false,lastSaved=0,eventsSeen=-1,elapsedMs=0;
const fmt=n=>new Intl.NumberFormat("it-IT").format(n);
function openDB(){return new Promise((ok,no)=>{const r=indexedDB.open(DB,1);r.onupgradeneeded=()=>r.result.createObjectStore(STORE);r.onsuccess=()=>ok(r.result);r.onerror=()=>no(r.error);});}
async function load(){const db=await openDB();return new Promise((ok,no)=>{const r=db.transaction(STORE,"readonly").objectStore(STORE).get("world");r.onsuccess=()=>{db.close();ok(r.result||null);};r.onerror=()=>{db.close();no(r.error);};});}
async function save(){if(!world)return;world.lastWallTime=Date.now();world.speed=speed;world.paused=paused;world.timeRemainderMs=elapsedMs;const db=await openDB();await new Promise((ok,no)=>{const tx=db.transaction(STORE,"readwrite");tx.objectStore(STORE).put(world,"world");tx.oncomplete=ok;tx.onerror=()=>no(tx.error);});db.close();lastSaved=Date.now();$("save-state").textContent="Salvato sul dispositivo";$("last-save").textContent="SALVATO "+new Date(lastSaved).toLocaleTimeString("it-IT",{hour:"2-digit",minute:"2-digit"});}
function esc(t){return String(t??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
function updateClock(){const n=new Date();$("real-clock").textContent=n.toLocaleTimeString("it-IT",{hour:"2-digit",minute:"2-digit",second:"2-digit"});$("real-date").textContent=n.toLocaleDateString("it-IT",{weekday:"short",day:"2-digit",month:"short",year:"numeric"});}
function calendarLabel(s){const d=((s.day-1)%365)+1,season=d<=91?"Primavera":d<=182?"Estate":d<=273?"Autunno":"Inverno";return "Giorno "+d+" · "+season;}
function render(s){
 $("date").textContent="Anno "+s.year+" · Giorno "+s.day;$("calendar-date").textContent=calendarLabel(s);
 $("population").textContent=fmt(s.population);$("population-change").textContent=(s.dead?fmt(s.dead)+" decessi registrati":"comunità fondatrice")+" · "+fmt(s.workers)+" in età attiva";
 $("settlements").textContent=s.settlements;$("food").textContent=fmt(s.food);$("knowledge").textContent=fmt(s.knowledge);
 $("food-status").textContent=s.food<s.population*2?"scorte critiche":s.food<s.population*10?"riserve limitate":"riserve disponibili";
 $("technology").textContent=s.technology.length+" conoscenze";$("technology").title=s.technology.join(", ");
 const foodPct=Math.min(100,Math.round(s.food/Math.max(1,s.population*12)*100));
 for(const [name,val] of [["health",s.health],["cohesion",s.cohesion],["food",foodPct],["order",s.order]]){$(name+"-value").textContent=val+"%";$(name+"-bar").style.width=val+"%";}
 $("knowledge-value").textContent=fmt(s.knowledge);$("knowledge-bar").style.width=Math.min(100,s.knowledge/100)+"%";
 $("polity").textContent=s.polity;$("belief").textContent=s.religion;$("climate").textContent=s.climate?.type!=="normale"?(s.climate.type+" · "+s.climate.days+" giorni"):"Stagione regolare";
 $("relations").textContent=s.relations.length?s.relations.join(", "):"Nessun contatto esterno";
 $("laws").textContent=s.laws;$("economy").textContent=s.economy;$("tech-list").textContent=s.technology.join(" · ");
 $("workers").textContent=fmt(s.workers);$("births").textContent=fmt(s.stats.births);$("deaths").textContent=fmt(s.stats.deaths);$("crimes").textContent=fmt(s.stats.crimes);$("wars").textContent=fmt(s.stats.wars);$("epidemics").textContent=fmt(s.stats.epidemics);
 $("institutions").textContent=s.institutions.length?s.institutions.join(", "):"Nessuna istituzione permanente";
 $("leader").textContent=s.leader?s.leader.name+" "+s.leader.family:"Nessuna guida riconosciuta";$("legitimacy").textContent=Math.round(s.leadership?.legitimacy||0)+"%";
 const social=s.social||{inequality:0,tension:0,classes:{poveri:0,lavoratori:s.population,agiati:0,"élite":0}};
 $("inequality").textContent=Math.round(social.inequality*100)+"%";$("tension").textContent=Math.round(social.tension)+"%";
 $("class-poor").textContent=fmt(social.classes?.poveri||0);$("class-workers").textContent=fmt(social.classes?.lavoratori||0);
 $("class-affluent").textContent=fmt(social.classes?.agiati||0);$("class-elite").textContent=fmt(social.classes?.["élite"]||0);
 $("jobs").textContent=Object.entries(s.roles||{}).filter(([,count])=>count>0).map(([role,count])=>role+" "+fmt(count)).join(" · ")||"Attività non ancora specializzate";
 $("event-count").textContent=fmt(s.eventTotal)+" eventi registrati";$("era").textContent=s.year<100?"ERA DELLE ORIGINI":s.year<500?"ERA DEI VILLAGGI":s.year<1500?"ERA DELLE PRIME CITTÀ":"ERA DELLA CRESCITA";
 const home=s.settlement;$("territory-name").textContent=home?.name||"Territorio non ancora nominato";$("territory-area").textContent=fmt(home?.knownArea||0)+" km² conosciuti";
 $("settlement-type").textContent=home?.kind||"—";
 $("settlement-list").textContent=(s.settlementDetails||[]).map(st=>(st.name||"Insediamento senza nome")+" · "+fmt(st.population||0)).join(" | ");
 const newest=s.events[0]?.id||0;if(eventsSeen!==newest){eventsSeen=newest;$("events").innerHTML=s.events.length?s.events.map(e=>'<article class="event"><time>ANNO '+e.year+' · G'+e.day+'</time><div><strong>'+esc(e.title)+'</strong><p>'+esc(e.description)+'</p></div></article>').join(""):'<div class="event empty">La storia deve ancora cominciare.</div>';}
 updateAtmosphere(s);drawMap(s);
}
function updateAtmosphere(s){
 const climate=s.climate||{type:"normale",days:0,severity:0},d=((s.day-1)%365)+1,season=d<=91?"Primavera":d<=182?"Estate":d<=273?"Autunno":"Inverno";
 let weather="Tempo mite",weatherIcon="partly_cloudy_day",detail=season+" · condizioni regolari";
 if(climate.days>0){if(climate.type==="siccità"){weather="Siccità";weatherIcon="wb_sunny";detail="Scarsità di pioggia · "+climate.days+" giorni";}else if(climate.type==="alluvione"){weather="Piogge intense";weatherIcon="rainy";detail="Piena e terreni saturi · "+climate.days+" giorni";}else if(climate.type==="inverno rigido"){weather="Freddo intenso";weatherIcon="ac_unit";detail="Inverno anomalo · "+climate.days+" giorni";}}
 else if(season==="Estate"){weather="Sereno";weatherIcon="sunny";}else if(season==="Autunno"){weather="Variabile";weatherIcon="cloud";}else if(season==="Inverno"){weather="Freddo stagionale";weatherIcon="cloudy_snowing";}
 $("weather-icon").textContent=weatherIcon;$("weather-label").textContent=weather;$("season-label").textContent=detail;
 const phase=(elapsedMs%60000)/60000;let label="Notte",icon="dark_mode";
 if(phase>=.17&&phase<.29){label="Alba";icon="wb_twilight";}else if(phase>=.29&&phase<.72){label="Giorno";icon="light_mode";}else if(phase>=.72&&phase<.84){label="Tramonto";icon="wb_twilight";}
 $("sky-icon").textContent=icon;$("sky-label").textContent=label;$("sky-time").textContent=phase<.17||phase>=.84?"Ore notturne":phase<.29?"Prime luci":phase<.72?"Luce diurna":"Ultima luce";
 const pct=Math.round(phase*100);$("day-progress-label").textContent=pct+"%";$("day-progress-bar").style.width=pct+"%";
 $("map").style.filter=phase<.17||phase>=.84?"brightness(.84) saturate(.86)":phase<.29||phase>=.72?"sepia(.09)":"none";
}
function terrainColor(code,x,y){
 const n=Math.sin(x*12.9898+y*78.233)*43758.5453,noise=(n-Math.floor(n))-.5;
 const colors={0:[165,202,213],1:[222,224,197],2:[174,199,164],3:[195,194,164],4:[174,177,166],5:[125,181,197],6:[102,164,190],7:[177,194,163]};
 const c=colors[code]||colors[0],v=c.map(q=>Math.max(0,Math.min(255,Math.round(q+noise*9))));return "rgb("+v.join(",")+")";
}
function drawMap(s){
 const canvas=$("map"),ctx=canvas.getContext("2d"),geo=s.geography;if(!geo?.terrain)return;
 const w=geo.width,h=geo.height,tw=canvas.width/w,th=canvas.height/h;
 ctx.clearRect(0,0,canvas.width,canvas.height);ctx.fillStyle="#a5cad6";ctx.fillRect(0,0,canvas.width,canvas.height);
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){const code=geo.terrain[y*w+x];ctx.fillStyle=terrainColor(code,x,y);ctx.fillRect(x*tw,y*th,tw+.5,th+.5);}
 ctx.strokeStyle="rgba(255,255,255,.68)";ctx.lineWidth=1.5;
 for(let y=1;y<h-1;y++)for(let x=1;x<w-1;x++){const i=y*w+x;if(geo.terrain[i]===0)continue;const px=x*tw,py=y*th;if(geo.terrain[i-1]===0||geo.terrain[i+1]===0||geo.terrain[i-w]===0||geo.terrain[i+w]===0)ctx.strokeRect(px+.5,py+.5,tw-1,th-1);}
 for(let y=2;y<h-2;y+=2)for(let x=2;x<w-2;x+=2){if(geo.terrain[y*w+x]!==2)continue;const px=x*tw+tw*.5,py=y*th+th*.5;ctx.fillStyle="rgba(67,111,76,.24)";ctx.beginPath();ctx.arc(px,py,tw*.26,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.arc(px+2,py-2,tw*.19,0,Math.PI*2);ctx.fill();}
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){const code=geo.terrain[y*w+x],px=x*tw,py=y*th;if(code===3){ctx.strokeStyle="rgba(125,116,83,.23)";ctx.lineWidth=1;ctx.beginPath();ctx.arc(px+tw*.5,py+th*.55,tw*.27,Math.PI,Math.PI*2);ctx.stroke();}if(code===4){ctx.fillStyle="rgba(104,111,109,.38)";ctx.beginPath();ctx.moveTo(px+tw*.15,py+th*.85);ctx.lineTo(px+tw*.52,py+th*.12);ctx.lineTo(px+tw*.88,py+th*.85);ctx.closePath();ctx.fill();ctx.fillStyle="rgba(248,248,235,.72)";ctx.beginPath();ctx.moveTo(px+tw*.39,py+th*.38);ctx.lineTo(px+tw*.52,py+th*.12);ctx.lineTo(px+tw*.65,py+th*.39);ctx.closePath();ctx.fill();}}
 const sites=s.settlementDetails||[];
 if(sites.length>1){ctx.save();ctx.lineCap="round";ctx.strokeStyle="#fff8df";ctx.lineWidth=5;ctx.setLineDash([8,4]);for(let i=1;i<sites.length;i++){ctx.beginPath();ctx.moveTo((sites[0].x+.5)*tw,(sites[0].y+.5)*th);ctx.lineTo((sites[i].x+.5)*tw,(sites[i].y+.5)*th);ctx.stroke();}ctx.restore();}
 for(const st of sites){const px=(st.x+.5)*tw,py=(st.y+.5)*th;ctx.save();ctx.shadowColor="rgba(25,44,37,.3)";ctx.shadowBlur=8;ctx.fillStyle="#fff";ctx.beginPath();ctx.arc(px,py,9,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;ctx.fillStyle="#397b5a";ctx.beginPath();ctx.arc(px,py,5,0,Math.PI*2);ctx.fill();ctx.restore();if(st.name){ctx.font="600 16px 'Google Sans',sans-serif";const width=ctx.measureText(st.name).width;ctx.fillStyle="rgba(255,255,255,.92)";ctx.beginPath();ctx.roundRect(px+12,py-14,width+18,27,7);ctx.fill();ctx.fillStyle="#263b32";ctx.fillText(st.name,px+21,py+5);}}
 for(const f of geo.features||[]){if(!f.name)continue;const px=(f.x+.5)*tw,py=(f.y+.5)*th;ctx.font="italic 14px 'Google Sans',sans-serif";ctx.fillStyle="#315c69";ctx.fillText(f.name,px+6,py-5);}
 for(const g of s.neighbors||[]){if(!g.discovered)continue;const px=(g.x+.5)*tw,py=(g.y+.5)*th;ctx.fillStyle=g.atWar?"#b85e56":g.allied?"#4e86a7":"#647e68";ctx.beginPath();ctx.arc(px,py,7,0,Math.PI*2);ctx.fill();if(g.name){ctx.font="500 14px 'Google Sans',sans-serif";ctx.fillStyle="#33463d";ctx.fillText(g.name,px+10,py-7);}}
 ctx.fillStyle="rgba(255,255,255,.9)";ctx.beginPath();ctx.roundRect(20,canvas.height-53,115,34,8);ctx.fill();ctx.fillStyle="#40514a";ctx.font="12px 'Google Sans',sans-serif";ctx.fillText("0",30,canvas.height-32);ctx.fillRect(47,canvas.height-35,50,3);ctx.fillText("50 km",101,canvas.height-32);
}
function setPaused(value){paused=value;$("pause").innerHTML=paused?'<span class="material-symbols-rounded">play_arrow</span> Riprendi':'<span class="material-symbols-rounded">pause</span> Pausa';$("status").textContent=paused?"SIMULAZIONE IN PAUSA":"SIMULAZIONE ATTIVA";$("status-dot").parentElement.classList.toggle("paused",paused);}
async function runAdvance(days){if(worker){const id=++step.id;const result=await new Promise((resolve,reject)=>{const handler=e=>{if(e.data.id!==id)return;worker.removeEventListener("message",handler);e.data.error?reject(new Error(e.data.error)):resolve(e.data);};worker.addEventListener("message",handler);worker.postMessage({id,world,days});});world=result.world;}else advance(world,days);}
async function step(days){if(busy||paused)return;busy=true;try{await runAdvance(days);render(summary(world));if(world.day%11===0)await save();}catch(error){console.error(error);$("save-state").textContent="Errore: "+error.message;setPaused(true);}busy=false;}step.id=0;
$("pause").addEventListener("click",()=>setPaused(!paused));
document.querySelectorAll("[data-speed]").forEach(button=>button.addEventListener("click",()=>{speed=Number(button.dataset.speed);document.querySelectorAll("[data-speed]").forEach(item=>item.classList.toggle("selected",item===button));}));
$("save-now").addEventListener("click",()=>save().catch(()=>$("save-state").textContent="Errore salvataggio"));
$("reset-world").addEventListener("click",async()=>{if(busy){$("save-state").textContent="Attendi la fine del ciclo in corso";return;}if(!window.confirm("Vuoi cancellare la civiltà attuale e ricominciare dall’Anno 0? Questa operazione non si può annullare."))return;setPaused(true);try{const db=await openDB();await new Promise((resolve,reject)=>{const tx=db.transaction(STORE,"readwrite");tx.objectStore(STORE).clear();tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);});db.close();world=createWorld();elapsedMs=0;speed=1;setPaused(false);document.querySelectorAll("[data-speed]").forEach(button=>button.classList.toggle("selected",Number(button.dataset.speed)===1));eventsSeen=-1;render(summary(world));await save();$("save-state").textContent="Nuova simulazione · Anno 0";}catch(error){console.error(error);$("save-state").textContent="Errore durante il riavvio";setPaused(true);}});
window.addEventListener("pagehide",()=>{if(!world)return;world.timeRemainderMs=elapsedMs;world.speed=speed;world.paused=paused;world.lastWallTime=Date.now();try{const request=indexedDB.open(DB,1);request.onsuccess=()=>{const db=request.result,tx=db.transaction(STORE,"readwrite");tx.objectStore(STORE).put(world,"world");tx.oncomplete=()=>db.close();};}catch{}});
async function init(){try{if("Worker"in window)worker=new Worker("./sim-worker.js",{type:"module"});world=await load();if(world){validateWorld(world);speed=Number(world.speed)||1;paused=Boolean(world.paused);elapsedMs=Number(world.timeRemainderMs)||0;if(!paused){elapsedMs+=Math.max(0,Date.now()-(world.lastWallTime||Date.now()))*speed;const missed=Math.floor(elapsedMs/60000);elapsedMs%=60000;if(missed)await runAdvance(Math.min(missed,200000));}}else world=createWorld();setPaused(paused);document.querySelectorAll("[data-speed]").forEach(button=>button.classList.toggle("selected",Number(button.dataset.speed)===speed));render(summary(world));await save();}catch(error){console.error(error);world=createWorld();elapsedMs=0;render(summary(world));$("save-state").textContent="Nuovo stato: salvataggio precedente non leggibile";}setInterval(()=>{if(!paused){elapsedMs+=1000*speed;if(elapsedMs>=60000&&!busy){const days=Math.floor(elapsedMs/60000);elapsedMs%=60000;step(days);}}if(world)updateAtmosphere(summary(world));},1000);setInterval(()=>{if(world)save().catch(console.error);},15000);}
updateClock();setInterval(updateClock,1000);init();
