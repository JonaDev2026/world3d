import {createWorld,advance,summary,validateWorld,refreshWorldNames} from "./engine.js";
import {initLanguages} from "./languages.js";
import {loadNameData} from "./name-data.js";
import {loadCesium,createWorldMap} from "./cesium-map.js";
const $=id=>document.getElementById(id),DB="anno-zero-world",STORE="state";
let world,paused=false,speed=1,worker=null,workerReady=false,latestSummary=null,busy=false,lastSaved=0,eventsSeen=-1,elapsedMs=0,realMinuteMs=0,pendingDays=0,worldMap=null,startMap=null,chosenStart=null,mapMode="politica";
const fmt=n=>new Intl.NumberFormat("it-IT").format(n);
let nameData={words:[],names:[]};
initLanguages();
async function showStartWizard(){
 const panel=$("start-wizard");panel.hidden=false;
 try{
  startMap=await createWorldMap("start-map",[12,18],{view:"3d",zoom:19000000});
  startMap.onSelect(({longitude,latitude,isLand})=>{
   if(!isLand){chosenStart=null;$("begin-world").disabled=true;$("start-coordinates").textContent="Punto in acqua: scegli una zona di terraferma";return;}
   chosenStart={longitude:Number(longitude.toFixed(5)),latitude:Number(latitude.toFixed(5)),terrainCode:1};
   startMap.setMarker(chosenStart.longitude,chosenStart.latitude);
   $("start-coordinates").textContent="Terraferma · "+chosenStart.latitude.toFixed(3)+"°, "+chosenStart.longitude.toFixed(3)+"°";$("begin-world").disabled=false;
  });
 }catch(error){console.error("Cartina non disponibile:",error);chosenStart={longitude:12.5,latitude:42,terrainCode:1};$("start-coordinates").textContent="Cartina non disponibile · punto iniziale predefinito in Italia";$("begin-world").disabled=false;}
 $("begin-world").addEventListener("click",async()=>{
  if(!chosenStart||world)return;
  world=createWorld({...chosenStart,nameWords:nameData.words,personalNames:nameData.names,familyNames:nameData.familyNames});refreshWorldNames(world);paused=false;elapsedMs=0;realMinuteMs=0;pendingDays=0;speed=1;
  await runAdvance(0);setPaused(false);panel.hidden=true;startMap?.destroy();startMap=null;
  await initWorldMap(world);render(latestSummary||summary(world));await save();
 },{once:true});
}
function mapFeatures(s){
 const home=s.settlements?.[0],originLat=Number(home?.latitude)||0,originLon=Number(home?.longitude)||0;
 const project=(x,y,latValue,lonValue)=>{
  if(Number.isFinite(latValue)&&Number.isFinite(lonValue))return [lonValue,latValue];
  const lat=Math.max(-84,Math.min(84,originLat-(Number(y||0)-Number(home?.y||0))*.18));
  const lon=((originLon+(Number(x||0)-Number(home?.x||0))*.18/Math.max(.18,Math.cos(lat*Math.PI/180))+540)%360)-180;
  return [lon,lat];
 };
 const circle=(center,radiusKm)=>{
  const coords=[],lat0=center[1]*Math.PI/180,lon0=center[0]*Math.PI/180,angular=radiusKm/6371;
  for(let i=0;i<=48;i++){const bearing=2*Math.PI*i/48,lat=Math.asin(Math.sin(lat0)*Math.cos(angular)+Math.cos(lat0)*Math.sin(angular)*Math.cos(bearing)),lon=lon0+Math.atan2(Math.sin(bearing)*Math.sin(angular)*Math.cos(lat0),Math.cos(angular)-Math.sin(lat0)*Math.sin(lat));coords.push([((lon*180/Math.PI+540)%360)-180,lat*180/Math.PI]);}
  return [coords];
 };
 const palette=["#526fbd","#8b67b4","#3f8e83","#bd8751","#5985a9","#9a6d78","#6e9658"];
 const settlements=(s.settlementDetails||[]).map(st=>{
  const coordinates=project(st.x,st.y,st.latitude,st.longitude);if(!coordinates)return null;const population=st.population||0,stores=Number(st.stores)||0;
  const radius=Math.min(2500,Math.max(60,Math.sqrt(Math.max(1,Number(st.knownArea)||12)*25/Math.PI)));
  return {type:"Feature",geometry:{type:"Point",coordinates},properties:{id:st.id,name:st.name||"",population,kind:st.kind||"accampamento",stores,knownArea:Number(st.knownArea)||0,polity:s.nationName?(s.nationName+" · "+(s.nationType||s.polity)):s.polity||"Comunità autonoma",label:(st.id===(s.settlementDetails||[])[0]?.id&&s.civilizationName?(s.civilizationName+(st.name?" · "+st.name:"")):(s.nationName||st.name||"")),color:s.nationName?palette[0]:palette[(Math.max(1,st.id)-1)%palette.length],radius}};
 }).filter(Boolean);
 const neighbors=(s.neighbors||[]).filter(n=>n.discovered).map(n=>{
  const coordinates=project(n.x,n.y,n.latitude,n.longitude);if(!coordinates)return null;const population=n.population||0;
  return {type:"Feature",geometry:{type:"Point",coordinates},properties:{id:n.id,name:n.name||"",population,knownArea:Number(n.knownArea)||4,atWar:!!n.atWar,allied:!!n.allied,polity:n.nationName||n.name||"Comunità indipendente",label:n.name||"",color:n.atWar?"#c84f58":n.allied?"#4385c5":"#9b875d",radius:Math.min(2500,Math.max(60,Math.sqrt(Math.max(1,Number(n.knownArea)||4)*25/Math.PI)))}};
 }).filter(Boolean);
 const territories=[
  ...settlements.map(feature=>({type:"Feature",geometry:{type:"Polygon",coordinates:circle(feature.geometry.coordinates,feature.properties.radius)},properties:{...feature.properties,territory:"territorio"}})),
  ...neighbors.map(feature=>({type:"Feature",geometry:{type:"Polygon",coordinates:circle(feature.geometry.coordinates,feature.properties.radius)},properties:{...feature.properties,territory:"territorio indipendente"}}))
 ];
 return {
  settlements:{type:"FeatureCollection",features:settlements},
  territories:{type:"FeatureCollection",features:territories},
  neighbors:{type:"FeatureCollection",features:neighbors},
  features:{type:"FeatureCollection",features:(s.geographicFeatures||[]).filter(f=>f.discovered&&f.name&&(s.settlementDetails||[]).some(st=>Math.hypot(Number(st.x)-Number(f.x),Number(st.y)-Number(f.y))<17)).map(f=>({type:"Feature",geometry:{type:"Point",coordinates:project(f.x,f.y)},properties:{name:f.name,featureType:f.type}}))},
  hazards:{type:"FeatureCollection",features:(s.naturalEvents||[]).filter(e=>(e.type!=="terremoto"||e.active)&&Number.isFinite(e.latitude)&&Number.isFinite(e.longitude)).map(e=>({type:"Feature",geometry:{type:"Point",coordinates:[e.longitude,e.latitude]},properties:{name:e.type,featureType:"calamità naturale",hazardType:e.type,year:e.year,day:e.day,active:!!e.active,daysRemaining:e.daysRemaining||0,severity:e.severity||0}}))},
  routes:{type:"FeatureCollection",features:(s.routes||[]).filter(r=>r.name).map(r=>{const from=(s.settlementDetails||[]).find(st=>st.id===r.from),to=(s.settlementDetails||[]).find(st=>st.id===r.to);return from&&to?{type:"Feature",geometry:{type:"LineString",coordinates:[project(from.x,from.y,from.latitude,from.longitude),project(to.x,to.y,to.latitude,to.longitude)]},properties:{name:r.name}}:null;}).filter(Boolean)},
  explored:{type:"FeatureCollection",features:settlements.map(feature=>({type:"Feature",geometry:{type:"Polygon",coordinates:circle(feature.geometry.coordinates,feature.properties.radius)},properties:{...feature.properties,areaType:"area conosciuta"}}))}
 };
}
function applyMapMode(){worldMap?.setMode(mapMode);}
function updateSimulationMap(s){if(worldMap)worldMap.update(mapFeatures(s));}
async function initWorldMap(s){
 if(worldMap)return;
 const home=s?.settlements?.[0],center=home&&Number.isFinite(home.latitude)&&Number.isFinite(home.longitude)?[home.longitude,home.latitude]:[0,20];
 try{
  worldMap=await createWorldMap("map",center,{view:"3d",zoom:home?9500000:19000000});worldMap.update(mapFeatures(s));worldMap.setMode(mapMode);
  document.querySelectorAll("[data-map-mode]").forEach(b=>b.addEventListener("click",()=>{mapMode=b.dataset.mapMode;document.querySelectorAll("[data-map-mode]").forEach(x=>x.classList.toggle("selected",x===b));applyMapMode();}));
 }catch(error){console.error("CesiumJS non disponibile:",error);$("map").textContent="Cartina non disponibile: CesiumJS non è riuscito a caricarsi.";}
}
function openDB(){return new Promise((ok,no)=>{const r=indexedDB.open(DB,1);r.onupgradeneeded=()=>r.result.createObjectStore(STORE);r.onsuccess=()=>ok(r.result);r.onerror=()=>no(r.error);});}
async function load(){const db=await openDB();return new Promise((ok,no)=>{const r=db.transaction(STORE,"readonly").objectStore(STORE).get("world");r.onsuccess=()=>{db.close();ok(r.result||null);};r.onerror=()=>{db.close();no(r.error);};});}
async function save(){if(!world)return;const meta={speed,paused,timeRemainderMs:elapsedMs,realMinuteMs,pendingDays,lastWallTime:Date.now()};if(worker&&workerReady){const result=await workerRequest({type:"save",meta});latestSummary=result.summary;}else{Object.assign(world,meta);const db=await openDB();await new Promise((ok,no)=>{const tx=db.transaction(STORE,"readwrite");tx.objectStore(STORE).put(world,"world");tx.oncomplete=ok;tx.onerror=()=>no(tx.error);});db.close();}lastSaved=Date.now();$("save-state").textContent="Salvato sul dispositivo";$("last-save").textContent="SALVATO "+new Date(lastSaved).toLocaleTimeString("it-IT",{hour:"2-digit",minute:"2-digit"});}
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
 $("polity").textContent=s.polity;$("belief").textContent=s.religion;const localWeather=s.settlement?.localClimate,climateLabel=localWeather?[localWeather.zone,localWeather.biome,Math.round(localWeather.tempC)+" °C"].join(" · "):"clima in osservazione";$("climate").textContent=climateLabel+(s.climate?.type!=="normale"?" · "+s.climate.type+" ("+s.climate.days+" gg)":"");
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
 const local=s.settlement?.localClimate;if(local)detail+=" · "+(local.biome||"ambiente locale")+" · "+Math.round(local.tempC||0)+" °C";
 $("weather-icon").textContent=weatherIcon;$("weather-label").textContent=weather;$("season-label").textContent=detail;
 const phase=(elapsedMs%60000)/60000;let label="Notte",icon="dark_mode";
 if(phase>=.17&&phase<.29){label="Alba";icon="wb_twilight";}else if(phase>=.29&&phase<.72){label="Giorno";icon="light_mode";}else if(phase>=.72&&phase<.84){label="Tramonto";icon="wb_twilight";}
 $("sky-icon").textContent=icon;$("sky-label").textContent=label;$("sky-time").textContent=phase<.17||phase>=.84?"Ore notturne":phase<.29?"Prime luci":phase<.72?"Luce diurna":"Ultima luce";
 const pct=Math.round(phase*100);$("day-progress-label").textContent=pct+"%";$("day-progress-bar").style.width=pct+"%";
 
}
function setPaused(value){paused=value;$("pause").innerHTML=paused?'<span class="material-symbols-rounded">play_arrow</span> Riprendi':'<span class="material-symbols-rounded">pause</span> Pausa';$("status").textContent=paused?"SIMULAZIONE IN PAUSA":"SIMULAZIONE ATTIVA";$("status-dot").parentElement.classList.toggle("paused",paused);}
function workerRequest(payload){return new Promise((resolve,reject)=>{const id=++step.id;let settled=false;const cleanup=()=>{clearTimeout(timer);worker?.removeEventListener("message",handler);worker?.removeEventListener("error",failed);worker?.removeEventListener("messageerror",failed);};const finish=(fn,value)=>{if(settled)return;settled=true;cleanup();fn(value);};const handler=e=>{if(e.data.id!==id)return;e.data.error?finish(reject,new Error(e.data.error)):finish(resolve,e.data);};const failed=e=>finish(reject,new Error(e?.message||"Worker non disponibile"));const timer=setTimeout(()=>finish(reject,new Error("Timeout del worker")),8000);worker.addEventListener("message",handler);worker.addEventListener("error",failed);worker.addEventListener("messageerror",failed);try{worker.postMessage({id,...payload});}catch(error){finish(reject,error);}});}
async function runAdvance(days){if(worker){try{const result=await workerRequest(workerReady?{type:"advance",days}:{type:"init",world,days});workerReady=true;latestSummary=result.summary;if(result.world)world=result.world;return;}catch(error){console.warn("Worker non disponibile, continuo senza worker:",error);worker.terminate();worker=null;workerReady=false;}}advance(world,days);latestSummary=summary(world);}
async function step(days){if(busy||paused)return false;busy=true;try{await runAdvance(days);render(latestSummary||summary(world));if((latestSummary?.day??world.day)%11===0)await save();return true;}catch(error){console.error(error);$("save-state").textContent="Errore: "+error.message;setPaused(true);return false;}finally{busy=false;}}step.id=0;
$("pause").addEventListener("click",()=>setPaused(!paused));
document.querySelectorAll("[data-speed]").forEach(button=>button.addEventListener("click",()=>{speed=Number(button.dataset.speed);document.querySelectorAll("[data-speed]").forEach(item=>item.classList.toggle("selected",item===button));}));
$("save-now").addEventListener("click",()=>save().catch(()=>$("save-state").textContent="Errore salvataggio"));
$("reset-world").addEventListener("click",async()=>{if(busy){$("save-state").textContent="Attendi la fine del ciclo in corso";return;}if(!window.confirm("Vuoi cancellare la civiltà attuale e ricominciare dall’Anno 0? Questa operazione non si può annullare."))return;setPaused(true);try{const db=await openDB();await new Promise((resolve,reject)=>{const tx=db.transaction(STORE,"readwrite");tx.objectStore(STORE).clear();tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);});db.close();world=null;workerReady=false;latestSummary=null;worldMap?.destroy();worldMap=null;chosenStart=null;elapsedMs=0;speed=1;setPaused(true);await showStartWizard();document.querySelectorAll("[data-speed]").forEach(button=>button.classList.toggle("selected",Number(button.dataset.speed)===1));eventsSeen=-1;$("save-state").textContent="Scegli il nuovo punto di partenza";}catch(error){console.error(error);$("save-state").textContent="Errore durante il riavvio";setPaused(true);}});
window.addEventListener("pagehide",()=>{if(!world)return;const meta={timeRemainderMs:elapsedMs,realMinuteMs,pendingDays,speed,paused,lastWallTime:Date.now()};if(worker&&workerReady){worker.postMessage({id:++step.id,type:"save",meta});return;}Object.assign(world,meta);try{const request=indexedDB.open(DB,1);request.onsuccess=()=>{const db=request.result,tx=db.transaction(STORE,"readwrite");tx.objectStore(STORE).put(world,"world");tx.oncomplete=()=>db.close();};}catch{}});
async function init(){try{let mapAvailable=false;try{mapAvailable=await loadCesium();}catch(error){console.error("CesiumJS non disponibile",error);}nameData=await loadNameData();if(!mapAvailable){$("map").textContent="Cartina non disponibile: CesiumJS non è riuscito a caricarsi.";console.error("CesiumJS non disponibile");}if("Worker"in window)worker=new Worker("./sim-worker.js",{type:"module"});world=await load();if(world){validateWorld(world);world.nameWords=nameData.words;world.personalNames=nameData.names;world.familyNames=nameData.familyNames;refreshWorldNames(world);speed=Number(world.speed)||1;if(speed===120)speed=365;paused=Boolean(world.paused);elapsedMs=Number(world.timeRemainderMs)||0;realMinuteMs=Number(world.realMinuteMs)||0;pendingDays=Number(world.pendingDays)||0;if(!paused){const offlineMs=Math.max(0,Date.now()-(world.lastWallTime||Date.now()));const wallRemainder=elapsedMs+offlineMs;const totalRealMs=realMinuteMs+offlineMs;const missedSeconds=Math.floor(totalRealMs/1000);elapsedMs=wallRemainder%60000;realMinuteMs=totalRealMs%1000;let missed=missedSeconds*speed+Math.floor(pendingDays);pendingDays=0;while(missed>0){const batch=Math.min(missed,3650);await runAdvance(batch);missed-=batch;}}}else{paused=true;await showStartWizard();}setPaused(paused);document.querySelectorAll("[data-speed]").forEach(button=>button.classList.toggle("selected",Number(button.dataset.speed)===speed));if(world){await initWorldMap(world);render(latestSummary||summary(world));await save();}}catch(error){console.error(error);world=createWorld({nameWords:nameData.words,personalNames:nameData.names,familyNames:nameData.familyNames});refreshWorldNames(world);elapsedMs=0;await initWorldMap(world);render(summary(world));$("save-state").textContent="Nuovo stato: salvataggio precedente non leggibile";}setInterval(()=>{if(!paused){elapsedMs=(elapsedMs+1000)%60000;pendingDays+=speed;if(!busy&&!paused&&pendingDays>=1){const days=Math.min(3650,Math.floor(pendingDays));pendingDays-=days;step(days).then(applied=>{if(!applied)pendingDays+=days;});}}if(world){const state=latestSummary||summary(world);updateClock(state);updateAtmosphere(state);}},1000);setInterval(()=>{if(world)save().catch(console.error);},15000);}
init();
