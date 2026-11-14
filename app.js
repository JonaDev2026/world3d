import {createWorld,advance,summary,validateWorld} from "./engine.js";
import {generatePlanet,isLand,terrainAt,latLonOf} from "./planet.js";
import {createGlobe} from "./globe.js";
const $=id=>document.getElementById(id),DB="anno-zero-world",STORE="state";
let world,paused=false,speed=1,worker=null,workerReady=false,latestSummary=null,busy=false,lastSaved=0,eventsSeen=-1,elapsedMs=0,worldMap=null,startGlobe=null,planet=null,chosenStart=null,mapMode="geografia";
const fmt=n=>new Intl.NumberFormat("it-IT").format(n);
function randomPlanetSeed(){const a=new Uint32Array(1);crypto.getRandomValues(a);return a[0]||9041987;}
function makePlanet(){return generatePlanet(randomPlanetSeed(),{w:360,h:180});}
function nearestLand(p,lat,lon){
 let best=-1,bestDot=-2;const a=lat*Math.PI/180,o=lon*Math.PI/180,tx=Math.cos(a)*Math.cos(o),ty=Math.sin(a),tz=-Math.cos(a)*Math.sin(o);
 for(let c=0;c<p.alt.length;c++){if(p.alt[c]<=0||p.terrain[c]===5)continue;const ll=latLonOf(p,c),la=ll.latitude*Math.PI/180,lo=ll.longitude*Math.PI/180,d=tx*Math.cos(la)*Math.cos(lo)+ty*Math.sin(la)+tz*(-Math.cos(la)*Math.sin(lo));if(d>bestDot){bestDot=d;best=c;}}
 return best>=0?latLonOf(p,best):{latitude:0,longitude:0};
}
function ensurePlanet(s){
 if(s.planet&&s.planet.alt&&s.planet.terrain){planet=s.planet;return;}
 planet=makePlanet();
 const home=s.settlements?.[0];
 if(home){const pos=nearestLand(planet,Number(home.latitude)||0,Number(home.longitude)||0);home.latitude=pos.latitude;home.longitude=pos.longitude;}
 s.planet=planet;
}
function showStartWizard(){
 const panel=$("start-wizard");panel.hidden=false;
 if(!planet)planet=makePlanet();
 startGlobe?.dispose();
 startGlobe=createGlobe($("start-globe"),planet,{onPick:point=>{
  if(!isLand(planet,point.latitude,point.longitude)){
   chosenStart=null;$("begin-world").disabled=true;$("start-coordinates").textContent="Acqua: scegli una zona di terraferma";startGlobe.setMarker(NaN,NaN);return;
  }
  const code=terrainAt(planet,point.latitude,point.longitude);
  chosenStart={latitude:point.latitude,longitude:point.longitude,terrainCode:[1,2,3,4,7].includes(code)?code:1};
  startGlobe.setMarker(point.latitude,point.longitude);
  $("start-coordinates").textContent="Terraferma · "+point.latitude.toFixed(2)+"°, "+point.longitude.toFixed(2)+"°";
  $("begin-world").disabled=false;
 }});
 startGlobe.setSun(18,-35);
 $("begin-world").onclick=async()=>{
  if(!chosenStart||world)return;
  world=createWorld(chosenStart);world.planet=planet;
  paused=false;elapsedMs=0;speed=1;
  await runAdvance(0);setPaused(false);panel.hidden=true;startGlobe?.dispose();startGlobe=null;
  initWorldMap(world);render(latestSummary||summary(world));await save();
 };
}
function renderGlobeLegend(items){
 const el=$("map-legend");if(!el)return;
 el.innerHTML=(items||[]).map(item=>'<span><i style="background:'+esc(item.color)+'"></i>'+esc(item.label)+'</span>').join("");
}
function applyMapMode(){
 if(!worldMap)return;
 renderGlobeLegend(worldMap.setMode(mapMode));
}
function updateSimulationMap(s){
 if(!worldMap||!planet)return;
 const palette=["#526fbd","#8b67b4","#3f8e83","#bd8751","#5985a9","#9a6d78","#6e9658"];
 const sites=(s.settlementDetails||[]).filter(st=>Number.isFinite(st.latitude)&&Number.isFinite(st.longitude)).map(st=>({
  id:st.id,name:st.name||"Insediamento senza nome",latitude:st.latitude,longitude:st.longitude,
  population:st.population||0,stores:Number(st.stores)||0,knownArea:Number(st.knownArea)||12,
  polity:s.nationName||(s.polity||"Comunità autonoma"),color:palette[(Math.max(1,st.id)-1)%palette.length]
 }));
 for(const n of s.neighbors||[])if(n.discovered&&Number.isFinite(n.latitude)&&Number.isFinite(n.longitude))sites.push({
  id:"neighbor-"+n.id,name:n.name||"Comunità sconosciuta",latitude:n.latitude,longitude:n.longitude,
  population:n.population||0,stores:n.food||0,knownArea:Number(n.knownArea)||4,
  polity:n.nationName||n.name||"Comunità indipendente",color:n.atWar?"#c84f58":n.allied?"#4385c5":"#9b875d",neighbor:true
 });
 renderGlobeLegend(worldMap.setData({sites}));
 const home=s.settlements?.[0];
 if(home&&Number.isFinite(home.latitude)&&Number.isFinite(home.longitude)&&worldMap.__centered!==true){
  worldMap.focus(home.latitude,home.longitude,2.8,false);worldMap.__centered=true;
 }
}
function initWorldMap(s){
 if(worldMap){updateSimulationMap(s);return;}
 if(!planet)ensurePlanet(s);
 worldMap=createGlobe($("map"),planet,{onPick:point=>{
  const name=point.site?.name||(point.terrain===0?"Oceano":"Territorio naturale");
  $("territory-name").textContent=name;
  $("territory-area").textContent=(point.altitude>0?fmt(point.altitude)+" m":"fondale marino")+" · "+point.latitude.toFixed(1)+"°, "+point.longitude.toFixed(1)+"°";
  const biome=["Oceano","Ghiacci","Tundra","Taiga","Foresta temperata","Prateria","Deserto","Savana","Foresta pluviale","Alta montagna","Lago","Mare basso"][point.biome]||"Territorio";
  worldMap.showPopup(point.latitude,point.longitude,"<strong>"+esc(name)+"</strong><br>"+esc(biome)+"<br>Altitudine: "+fmt(point.altitude)+" m"+(point.river?"<br>Corso d'acqua":""));
 }});
 worldMap.setSun(18,-35);
 document.querySelectorAll("[data-map-mode]").forEach(button=>button.addEventListener("click",()=>{
  mapMode=button.dataset.mapMode;
  document.querySelectorAll("[data-map-mode]").forEach(b=>b.classList.toggle("selected",b===button));
  applyMapMode();
 }));
 updateSimulationMap(s);
}
function openDB(){return new Promise((ok,no)=>{const r=indexedDB.open(DB,1);r.onupgradeneeded=()=>r.result.createObjectStore(STORE);r.onsuccess=()=>ok(r.result);r.onerror=()=>no(r.error);});}
async function load(){const db=await openDB();return new Promise((ok,no)=>{const r=db.transaction(STORE,"readonly").objectStore(STORE).get("world");r.onsuccess=()=>{db.close();ok(r.result||null);};r.onerror=()=>{db.close();no(r.error);};});}
async function save(){if(!world)return;const meta={speed,paused,timeRemainderMs:elapsedMs,lastWallTime:Date.now()};if(worker&&workerReady){const result=await workerRequest({type:"save",meta});latestSummary=result.summary;}else{Object.assign(world,meta);const db=await openDB();await new Promise((ok,no)=>{const tx=db.transaction(STORE,"readwrite");tx.objectStore(STORE).put(world,"world");tx.oncomplete=ok;tx.onerror=()=>no(tx.error);});db.close();}lastSaved=Date.now();$("save-state").textContent="Salvato sul dispositivo";$("last-save").textContent="SALVATO "+new Date(lastSaved).toLocaleTimeString("it-IT",{hour:"2-digit",minute:"2-digit"});}
function esc(t){return String(t??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
function updateClock(s){const fraction=(elapsedMs%60000)/60000,totalSeconds=Math.floor(fraction*86400),hh=String(Math.floor(totalSeconds/3600)).padStart(2,"0"),mm=String(Math.floor(totalSeconds%3600/60)).padStart(2,"0"),ss=String(totalSeconds%60).padStart(2,"0");$("real-clock").textContent=hh+":"+mm+":"+ss;$("real-date").textContent="ORA SIMULATA · CICLO DI 24 ORE";}
function calendarLabel(s){const names=["Gennaio","Febbraio","Marzo","Aprile","Maggio","Giugno","Luglio","Agosto","Settembre","Ottobre","Novembre","Dicembre"],lengths=[31,28,31,30,31,30,31,31,30,31,30,31];let d=((s.day-1)%365)+1,m=0;while(m<11&&d>lengths[m]){d-=lengths[m];m++;}return d+" "+names[m]+" · "+(m<2||m>10?"Inverno":m<5?"Primavera":m<8?"Estate":"Autunno");}
function render(s){
 $("date").textContent=calendarLabel(s)+" · Anno "+s.year;$("calendar-date").textContent="Giorno "+s.day+" del calendario simulato";
 $("population").textContent=fmt(s.population);$("population-change").textContent=(s.dead?fmt(s.dead)+" decessi registrati":"comunità fondatrice")+" · "+fmt(s.workers)+" in età attiva";
 $("settlements").textContent=s.settlements;$("food").textContent=fmt(s.food);$("knowledge").textContent=fmt(s.knowledge);
 $("food-status").textContent=s.food<s.population*2?"scorte critiche":s.food<s.population*10?"riserve limitate":"riserve disponibili";
 $("technology").textContent=s.technology.length+" conoscenze";$("technology").title=s.technology.join(", ");
 const foodPct=Math.min(100,Math.round(s.food/Math.max(1,s.population*12)*100));
 for(const [name,val] of [["health",s.health],["cohesion",s.cohesion],["food",foodPct],["order",s.order]]){$(name+"-value").textContent=val+"%";$(name+"-bar").style.width=val+"%";}
 $("knowledge-value").textContent=fmt(s.knowledge);$("knowledge-bar").style.width=Math.min(100,s.knowledge/100)+"%";
 $("polity").textContent=s.polity;$("belief").textContent=s.religion;const localWeather=s.settlement?.localClimate,humidityLabel=localWeather?(localWeather.humidity>.68?"microclima umido":localWeather.humidity<.3?"microclima arido":"microclima temperato"):"microclima in osservazione";$("climate").textContent=(s.climate?.type!=="normale"?(s.climate.type+" · "+s.climate.days+" giorni"):"Stagione regolare")+" · "+humidityLabel;
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
 updateAtmosphere(s);updateSimulationMap(s);
}
function updateAtmosphere(s){
 const climate=s.climate||{type:"normale",days:0,severity:0},d=((s.day-1)%365)+1,season=d<=91?"Primavera":d<=182?"Estate":d<=273?"Autunno":"Inverno";
 let weather="Tempo mite",weatherIcon="partly_cloudy_day",detail=season+" · condizioni regolari";
 if(climate.days>0){if(climate.type==="siccità"){weather="Siccità";weatherIcon="wb_sunny";detail="Scarsità di pioggia · "+climate.days+" giorni";}else if(climate.type==="alluvione"){weather="Piogge intense";weatherIcon="rainy";detail="Piena e terreni saturi · "+climate.days+" giorni";}else if(climate.type==="inverno rigido"){weather="Freddo intenso";weatherIcon="ac_unit";detail="Inverno anomalo · "+climate.days+" giorni";}}
 else if(season==="Estate"){weather="Sereno";weatherIcon="sunny";}else if(season==="Autunno"){weather="Variabile";weatherIcon="cloud";}else if(season==="Inverno"){weather="Freddo stagionale";weatherIcon="cloudy_snowing";}
 const local=s.settlement?.localClimate;if(local)detail+=" · "+(local.humidity>.68?"umidità elevata":local.humidity<.3?"aria secca":"umidità moderata");
 $("weather-icon").textContent=weatherIcon;$("weather-label").textContent=weather;$("season-label").textContent=detail;
 const phase=(elapsedMs%60000)/60000;let label="Notte",icon="dark_mode";
 if(phase>=.17&&phase<.29){label="Alba";icon="wb_twilight";}else if(phase>=.29&&phase<.72){label="Giorno";icon="light_mode";}else if(phase>=.72&&phase<.84){label="Tramonto";icon="wb_twilight";}
 $("sky-icon").textContent=icon;$("sky-label").textContent=label;$("sky-time").textContent=phase<.17||phase>=.84?"Ore notturne":phase<.29?"Prime luci":phase<.72?"Luce diurna":"Ultima luce";
 const pct=Math.round(phase*100);$("day-progress-label").textContent=pct+"%";$("day-progress-bar").style.width=pct+"%";
 
}
function setPaused(value){paused=value;$("pause").innerHTML=paused?'<span class="material-symbols-rounded">play_arrow</span> Riprendi':'<span class="material-symbols-rounded">pause</span> Pausa';$("status").textContent=paused?"SIMULAZIONE IN PAUSA":"SIMULAZIONE ATTIVA";$("status-dot").parentElement.classList.toggle("paused",paused);}
function workerRequest(payload){return new Promise((resolve,reject)=>{const id=++step.id,handler=e=>{if(e.data.id!==id)return;worker.removeEventListener("message",handler);e.data.error?reject(new Error(e.data.error)):resolve(e.data);};worker.addEventListener("message",handler);worker.postMessage({id,...payload});});}
async function runAdvance(days){if(worker){const result=await workerRequest(workerReady?{type:"advance",days}:{type:"init",world,days});workerReady=true;latestSummary=result.summary;if(result.world)world=result.world;}else{advance(world,days);latestSummary=summary(world);}}
async function step(days){if(busy||paused)return;busy=true;try{await runAdvance(days);render(latestSummary||summary(world));if((latestSummary?.day??world.day)%11===0)await save();}catch(error){console.error(error);$("save-state").textContent="Errore: "+error.message;setPaused(true);}busy=false;}step.id=0;
$("pause").addEventListener("click",()=>setPaused(!paused));
document.querySelectorAll("[data-speed]").forEach(button=>button.addEventListener("click",()=>{speed=Number(button.dataset.speed);document.querySelectorAll("[data-speed]").forEach(item=>item.classList.toggle("selected",item===button));}));
$("save-now").addEventListener("click",()=>save().catch(()=>$("save-state").textContent="Errore salvataggio"));
$("reset-world").addEventListener("click",async()=>{if(busy){$("save-state").textContent="Attendi la fine del ciclo in corso";return;}if(!window.confirm("Vuoi cancellare la civiltà attuale e ricominciare dall’Anno 0? Questa operazione non si può annullare."))return;setPaused(true);try{const db=await openDB();await new Promise((resolve,reject)=>{const tx=db.transaction(STORE,"readwrite");tx.objectStore(STORE).clear();tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);});db.close();world=null;workerReady=false;latestSummary=null;worldMap?.dispose();worldMap=null;planet=null;chosenStart=null;elapsedMs=0;speed=1;setPaused(true);showStartWizard();document.querySelectorAll("[data-speed]").forEach(button=>button.classList.toggle("selected",Number(button.dataset.speed)===1));eventsSeen=-1;$("save-state").textContent="Scegli il nuovo punto di partenza";}catch(error){console.error(error);$("save-state").textContent="Errore durante il riavvio";setPaused(true);}});
window.addEventListener("pagehide",()=>{if(!world)return;const meta={timeRemainderMs:elapsedMs,speed,paused,lastWallTime:Date.now()};if(worker&&workerReady){worker.postMessage({id:++step.id,type:"save",meta});return;}Object.assign(world,meta);try{const request=indexedDB.open(DB,1);request.onsuccess=()=>{const db=request.result,tx=db.transaction(STORE,"readwrite");tx.objectStore(STORE).put(world,"world");tx.oncomplete=()=>db.close();};}catch{}});
async function init(){try{if("Worker"in window)worker=new Worker("./sim-worker.js",{type:"module"});world=await load();if(world){validateWorld(world);ensurePlanet(world);speed=Number(world.speed)||1;paused=Boolean(world.paused);elapsedMs=Number(world.timeRemainderMs)||0;if(!paused){elapsedMs+=Math.max(0,Date.now()-(world.lastWallTime||Date.now()))*speed;const missed=Math.floor(elapsedMs/60000);elapsedMs%=60000;if(missed)await runAdvance(Math.min(missed,3650));}}else{paused=true;showStartWizard();}setPaused(paused);document.querySelectorAll("[data-speed]").forEach(button=>button.classList.toggle("selected",Number(button.dataset.speed)===speed));if(world){initWorldMap(world);render(latestSummary||summary(world));await save();}}catch(error){console.error(error);planet=makePlanet();world=createWorld(nearestLand(planet,0,0));world.planet=planet;elapsedMs=0;initWorldMap(world);render(summary(world));$("save-state").textContent="Nuovo stato: salvataggio precedente non leggibile";}setInterval(()=>{if(!paused){elapsedMs+=1000*speed;if(elapsedMs>=60000&&!busy){const days=Math.floor(elapsedMs/60000);elapsedMs%=60000;step(days);}}if(world){const state=latestSummary||summary(world);updateClock(state);updateAtmosphere(state);}},1000);setInterval(()=>{if(world)save().catch(console.error);},15000);}
init();
