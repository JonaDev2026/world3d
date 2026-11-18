import {createWorld} from "./engine.js";
import {loadWorld,calculateOfflineCatchUp} from "./storage.js";

export function formatCalendar(year,day) {
  const y = Number.isFinite(Number(year)) ? Math.max(0,Math.trunc(Number(year))) : 0;
  const d = Number.isFinite(Number(day)) ? Math.max(1,Math.min(365,Math.trunc(Number(day)))) : 1;
  return "Anno "+y+" · Giorno "+d;
}

export function splitDays(days,maxChunk=3650) {
  let remaining = Math.max(0,Math.floor(Number(days)||0));
  const limit = Math.max(1,Math.min(3650,Math.floor(Number(maxChunk)||3650)));
  const chunks = [];
  while (remaining>0) {
    const chunk = Math.min(limit,remaining);
    chunks.push(chunk);
    remaining -= chunk;
  }
  return chunks;
}

const SYSTEM_COVERAGE = [
  {name:"Calendario e determinismo",level:"tested",status:"Test automatici",detail:"Anno 0, seme riproducibile e avanzamento giornaliero confrontato tra mondi indipendenti."},
  {name:"Popolazione e famiglie",level:"partial",status:"Copertura parziale",detail:"Età, nascite, mortalità, legami, discendenza ed eredità sono nel motore; non tutte le combinazioni familiari hanno test dedicati."},
  {name:"Risorse, produzione e agricoltura",level:"tested",status:"Test automatici",detail:"Produzione, scorte non negative, specializzazione agricola e impatto delle tecnologie hanno test."},
  {name:"Economia e stratificazione",level:"tested",status:"Test automatici",detail:"Ricchezza individuale, disuguaglianza e classi sociali sono verificate."},
  {name:"Istituzioni e giustizia",level:"tested",status:"Test automatici",detail:"Leadership, procedimenti e risoluzione di controversie hanno test; la copertura delle singole leggi resta parziale."},
  {name:"Culture e religioni",level:"partial",status:"Copertura parziale",detail:"Trasmissione delle credenze, usi e riti sono implementati; l'emergere delle religioni non ha ancora un test dedicato completo."},
  {name:"Malattie ed epidemie",level:"tested",status:"Test automatici",detail:"Diffusione locale e immunità dei sopravvissuti sono verificate."},
  {name:"Diplomazia, guerre e migrazioni",level:"partial",status:"Copertura parziale",detail:"Contatti, alleanze, avanzate armate, incursioni nemiche e fondazione di insediamenti tramite migrazione hanno test deterministici; restano da verificare gli esiti territoriali complessi e gli spostamenti forzati."},
  {name:"Ricerca e invenzioni",level:"tested",status:"Test automatici",detail:"Prerequisiti, consumo di materiali e sblocco delle tecnologie sono verificati."},
  {name:"Memoria storica",level:"tested",status:"Test automatici",detail:"Archivio degli eventi, cause, conseguenze e ricerca dopo l'archiviazione hanno test."},
  {name:"Salvataggio e recupero offline",level:"partial",status:"Verifica browser necessaria",detail:"Round-trip JSON e calcolo del tempo trascorso sono testati; IndexedDB, worker e riapertura reale non hanno ancora un test end-to-end in browser."}
];

function formatNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? new Intl.NumberFormat("it-IT",{maximumFractionDigits:1}).format(number) : "0";
}

function startApp() {
  const $ = id => document.getElementById(id);
  const state = {
    worker:null,
    summary:null,
    ready:false,
    paused:false,
    speed:1,
    pendingDays:0,
    lastTick:Date.now(),
    lastSaveAt:0,
    tickPromise:null,
    savePromise:null,
    requestId:0
  };
  const pending = new Map();
  let historyTimer = null;
  let intervalId = null;

  function setStatus(message,isError=false) {
    const node = $("saveState");
    node.textContent = message;
    node.dataset.state = isError ? "error" : "normal";
  }

  function showError(error) {
    $("errorPanel").hidden = false;
    $("errorText").textContent = error && error.message ? error.message : String(error);
    $("pauseBtn").disabled = true;
    $("speedSelect").disabled = true;
    $("saveBtn").disabled = true;
    $("exportBtn").disabled = true;
    setStatus("Avvio o simulazione non riusciti",true);
  }

  function send(type,payload={}) {
    return new Promise((resolve,reject) => {
      const id = ++state.requestId;
      const timer = window.setTimeout(() => {
        pending.delete(id);
        reject(new Error("Il motore non ha risposto al comando "+type));
      },300000);
      pending.set(id,{resolve,reject,timer});
      try {
        state.worker.postMessage(Object.assign({id,type},payload));
      } catch (error) {
        window.clearTimeout(timer);
        pending.delete(id);
        reject(error);
      }
    });
  }

  function absorbElapsed() {
    const now = Date.now();
    if (!state.paused) {
      state.pendingDays += Math.max(0,now-state.lastTick)/1000*state.speed;
    }
    state.lastTick = now;
  }

  async function saveCheckpoint(showStatus=true) {
    if (!state.ready) return;
    if (state.savePromise) return state.savePromise;
    absorbElapsed();
    const operation = (async () => {
      await send("save",{meta:{
        speed:state.speed,
        paused:state.paused,
        pendingDays:state.pendingDays
      }});
      state.lastSaveAt = Date.now();
      if (showStatus) setStatus("Salvataggio completato");
    })();
    state.savePromise = operation;
    try {
      await operation;
    } finally {
      state.savePromise = null;
    }
  }

  function updateControls() {
    const extinct = Boolean(state.summary && state.summary.population===0);
    $("pauseBtn").textContent = state.paused ? "Riprendi" : "Pausa";
    $("pauseBtn").disabled = !state.ready || extinct;
    $("speedSelect").value = String(state.speed);
    $("speedSelect").disabled = !state.ready || extinct;
    $("saveBtn").disabled = !state.ready;
    $("exportBtn").disabled = !state.ready;
  }

  function appendTextList(container,items,emptyText) {
    container.replaceChildren();
    const values = Array.isArray(items) ? items : [];
    if (!values.length) {
      const empty = document.createElement("li");
      empty.className = "empty-row";
      empty.textContent = emptyText;
      container.append(empty);
      return;
    }
    for (const value of values) {
      const item = document.createElement("li");
      item.textContent = String(value);
      container.append(item);
    }
  }

  function renderMap(data) {
    const geography = data.geography;
    const canvas = $("worldMap");
    const context = canvas.getContext("2d");
    if (!geography || !Array.isArray(geography.terrain) || !context) {
      context && context.clearRect(0,0,canvas.width,canvas.height);
      return;
    }
    const width = geography.width;
    const height = geography.height;
    const tile = 10;
    canvas.width = width*tile;
    canvas.height = height*tile;
    const colors = {
      0:"#6f9fb8",1:"#b7c79b",2:"#718e68",3:"#b8a17c",
      4:"#888e96",5:"#80b0c7",6:"#4f91b5",7:"#c9b47b"
    };
    for (let y=0;y<height;y++) {
      for (let x=0;x<width;x++) {
        const code = geography.terrain[y*width+x];
        context.fillStyle = colors[code] || "#b7c79b";
        context.fillRect(x*tile,y*tile,tile,tile);
      }
    }
    context.strokeStyle = "rgba(28,39,46,.16)";
    context.lineWidth = .5;
    for (let x=0;x<=width;x+=8) {
      context.beginPath();
      context.moveTo(x*tile,0);
      context.lineTo(x*tile,height*tile);
      context.stroke();
    }
    for (let y=0;y<=height;y+=8) {
      context.beginPath();
      context.moveTo(0,y*tile);
      context.lineTo(width*tile,y*tile);
      context.stroke();
    }
    context.font = "13px system-ui, sans-serif";
    context.textBaseline = "middle";
    for (const feature of geography.features || []) {
      if (!feature.discovered) continue;
      const x = (feature.x+.5)*tile;
      const y = (feature.y+.5)*tile;
      context.fillStyle = "#263c4b";
      context.fillRect(x-3,y-3,6,6);
    }
    for (const neighbor of data.neighbors || []) {
      if (!neighbor.discovered) continue;
      const x = (neighbor.x+.5)*tile;
      const y = (neighbor.y+.5)*tile;
      context.beginPath();
      context.arc(x,y,6,0,Math.PI*2);
      context.fillStyle = neighbor.atWar ? "#9a4545" : neighbor.allied ? "#3f745b" : "#8b713d";
      context.fill();
      context.strokeStyle = "#f5f1e7";
      context.lineWidth = 1.5;
      context.stroke();
      context.lineWidth = 3;
      context.strokeStyle = "rgba(20,28,34,.7)";
      context.strokeText(neighbor.name || "Comunità",x+9,y-7);
      context.fillStyle = "#f5f1e7";
      context.fillText(neighbor.name || "Comunità",x+9,y-7);
    }
    for (const settlement of data.settlementDetails || []) {
      const x = (settlement.x+.5)*tile;
      const y = (settlement.y+.5)*tile;
      context.beginPath();
      context.arc(x,y,7,0,Math.PI*2);
      context.fillStyle = "#f7f3e8";
      context.fill();
      context.strokeStyle = "#263c4b";
      context.lineWidth = 2;
      context.stroke();
      const label = settlement.name || ("Insediamento "+settlement.id);
      context.lineWidth = 3;
      context.strokeStyle = "rgba(20,28,34,.78)";
      context.strokeText(label,x+11,y+9);
      context.fillStyle = "#ffffff";
      context.fillText(label,x+11,y+9);
    }
    $("mapMeta").textContent = width+" × "+height+" celle · "+(geography.tileKm || 5)+" km per cella";
  }

  function renderResources(data) {
    const container = $("resourceList");
    container.replaceChildren();
    const labels = {
      food:"Cibo",water:"Acqua",wood:"Legno",stone:"Pietra",
      clay:"Argilla",fiber:"Fibre",ore:"Minerali"
    };
    for (const [key,value] of Object.entries(data.resources || {})) {
      const row = document.createElement("div");
      row.className = "resource-row";
      const label = document.createElement("span");
      label.textContent = labels[key] || key;
      const amount = document.createElement("strong");
      amount.textContent = formatNumber(value);
      row.append(label,amount);
      container.append(row);
    }
  }

  function renderPopulation(data) {
    const container = $("populationList");
    container.replaceChildren();
    const people = data.populationDetails || [];
    $("populationMeta").textContent = "Mostrati "+people.length+" di "+formatNumber(data.population)+" individui";
    for (const person of people) {
      const row = document.createElement("li");
      const heading = document.createElement("strong");
      heading.textContent = [person.name,person.family].filter(Boolean).join(" · ") || ("Individuo "+person.id);
      const details = document.createElement("span");
      details.textContent = "Età "+person.age+" · "+(person.role || "ruolo non assegnato")+" · salute "+person.health+"%";
      const decision = document.createElement("small");
      decision.textContent = (person.decision && person.decision.action ? person.decision.action : "decisione non disponibile")+" · legami "+person.relationships;
      row.append(heading,details,decision);
      container.append(row);
    }
    if (!people.length) {
      const empty = document.createElement("li");
      empty.className = "empty-row";
      empty.textContent = "Nessun individuo vivente.";
      container.append(empty);
    }
  }

  function renderDiplomacy(data) {
    const container = $("relationsList");
    container.replaceChildren();
    const groups = (data.neighbors || []).filter(item=>item.discovered);
    $("relationsMeta").textContent = groups.length+" comunità conosciute";
    if (!groups.length) {
      const empty = document.createElement("li");
      empty.className = "empty-row";
      empty.textContent = "Nessun contatto documentato finora.";
      container.append(empty);
      return;
    }
    for (const group of groups) {
      const row = document.createElement("li");
      const heading = document.createElement("strong");
      heading.textContent = group.name || "Comunità indipendente";
      const status = group.atWar ? "Conflitto armato" : group.allied ? "Alleanza" : group.hostility>45 ? "Tensione" : "Relazioni aperte";
      const detail = document.createElement("span");
      detail.textContent = status+" · popolazione stimata "+formatNumber(group.population)+" · ostilità "+formatNumber(group.hostility)+"/100";
      row.append(heading,detail);
      container.append(row);
    }
  }

  function renderSocial(data) {
    $("polityValue").textContent = data.polity || "Non definita";
    $("lawValue").textContent = data.laws || "Consuetudini locali";
    $("economyValue").textContent = data.economy || "Sussistenza";
    $("religionValue").textContent = data.religion || "Tradizioni orali";
    appendTextList($("institutionList"),data.institutions,"Nessuna istituzione formalizzata.");
    const culture = data.culture || {};
    const customs = culture.customs || [];
    const rituals = culture.rituals || [];
    const beliefs = Object.entries(culture.beliefs || {}).map(([name,value])=>name+": "+Math.round(Number(value)*100)+"%");
    $("cultureValue").textContent = [
      customs.length ? "Usi: "+customs.join(", ") : "Nessun uso stabilizzato.",
      rituals.length ? "Riti: "+rituals.join(", ") : "",
      beliefs.length ? "Credenze: "+beliefs.join(" · ") : ""
    ].filter(Boolean).join(" ");
    const justice = data.justice || {};
    $("justiceValue").textContent = formatNumber(justice.pending)+" procedimenti aperti · "+formatNumber(justice.resolved)+" decisioni registrate";
  }

  function renderResearch(data) {
    appendTextList($("technologyList"),data.technology,"Nessuna tecnologia registrata.");
    const research = data.research || {};
    const progress = Object.entries(research.progress || {})
      .filter(([name,value])=>Number(value)>0 && !(research.completed || {})[name])
      .sort((a,b)=>Number(b[1])-Number(a[1]))
      .slice(0,5)
      .map(([name,value])=>name+" · "+formatNumber(value)+" punti");
    const inventions = (research.inventions || []).slice(0,5).map(item=>item.technology+" · Anno "+item.year);
    $("researchValue").textContent = [
      research.focus ? "Ricerca: "+research.focus : "Ricerca distribuita.",
      progress.length ? "Progetti: "+progress.join("; ") : "",
      inventions.length ? "Invenzioni recenti: "+inventions.join("; ") : ""
    ].filter(Boolean).join(" ");
  }

  function renderHealth(data) {
    const disease = data.disease || {};
    $("diseaseValue").textContent = disease.active
      ? "Epidemia attiva · ceppo "+formatNumber(disease.strain)+" · "+formatNumber(disease.days)+" giorni"
      : "Nessuna epidemia attiva.";
    const climate = data.climate || {};
    $("climateValue").textContent = (climate.type || "normale")+" · "+formatNumber(climate.days)+" giorni residui";
  }

  function renderCoverage() {
    const container = $("systemCoverage");
    container.replaceChildren();
    for (const system of SYSTEM_COVERAGE) {
      const row = document.createElement("li");
      row.className = "coverage-row";
      const top = document.createElement("div");
      top.className = "coverage-top";
      const name = document.createElement("strong");
      name.textContent = system.name;
      const status = document.createElement("span");
      status.className = "coverage-status "+system.level;
      status.textContent = system.status;
      top.append(name,status);
      const detail = document.createElement("p");
      detail.textContent = system.detail;
      row.append(top,detail);
      container.append(row);
    }
  }

  function renderState(data) {
    state.summary = data;
    $("calendarValue").textContent = formatCalendar(data.year,data.day);
    $("populationValue").textContent = formatNumber(data.population);
    $("birthsValue").textContent = formatNumber(data.births);
    $("deathsValue").textContent = formatNumber(data.deaths);
    $("settlementsValue").textContent = formatNumber(data.settlements);
    $("workersValue").textContent = formatNumber(data.workers);
    $("healthValue").textContent = formatNumber(data.health)+"%";
    $("cohesionValue").textContent = formatNumber(data.cohesion)+"%";
    $("deadValue").textContent = formatNumber(data.dead);
    renderMap(data);
    renderResources(data);
    renderPopulation(data);
    renderDiplomacy(data);
    renderSocial(data);
    renderResearch(data);
    renderHealth(data);
    updateControls();
  }

  function renderHistory(items) {
    const container = $("historyList");
    container.replaceChildren();
    if (!items.length) {
      const empty = document.createElement("p");
      empty.className = "empty-row";
      empty.textContent = "Nessun evento corrisponde alla ricerca.";
      container.append(empty);
      return;
    }
    for (const item of items) {
      const article = document.createElement("article");
      article.className = "history-item";
      const title = document.createElement("h3");
      title.textContent = item.title || "Evento storico";
      const meta = document.createElement("p");
      meta.className = "history-meta";
      meta.textContent = formatCalendar(item.year,item.day || 365)+" · "+(item.type || item.recordKind || "evento");
      const description = document.createElement("p");
      description.textContent = item.description || "";
      article.append(title,meta,description);
      if (item.cause && (item.cause.kind || item.cause.trigger)) {
        const cause = document.createElement("small");
        cause.textContent = "Causa registrata: "+(item.cause.trigger || item.cause.kind);
        article.append(cause);
      }
      if (Array.isArray(item.consequences) && item.consequences.length) {
        const consequences = document.createElement("small");
        consequences.textContent = "Conseguenze: "+item.consequences.join("; ");
        article.append(consequences);
      }
      container.append(article);
    }
  }

  async function refreshHistory() {
    if (!state.ready) return;
    try {
      const result = await send("history",{query:$("historyQuery").value,limit:120});
      renderHistory(result.history || []);
    } catch (error) {
      $("historyList").textContent = "Cronologia non disponibile: "+error.message;
    }
  }

  async function tick() {
    if (state.tickPromise) return state.tickPromise;
    if (!state.ready) return;
    const now = Date.now();
    if (state.paused) {
      state.lastTick = now;
      return;
    }
    const elapsed = Math.max(0,now-state.lastTick)/1000;
    state.lastTick = now;
    const total = state.pendingDays+elapsed*state.speed;
    let remaining = Math.floor(total);
    state.pendingDays = total-remaining;

    const operation = (async () => {
      try {
        while (remaining>0) {
          const chunk = Math.min(3650,remaining);
          const result = await send("advance",{days:chunk});
          renderState(result.summary);
          const advanced = Math.max(0,Math.floor(Number(result.advanced)||0));
          if (advanced<chunk) {
            remaining = 0;
            state.pendingDays = 0;
            break;
          }
          remaining -= advanced;
        }
        absorbElapsed();
        if (state.summary && state.summary.population===0) {
          state.paused = true;
          updateControls();
          setStatus("La civiltà si è estinta; simulazione arrestata.");
        }
        if (Date.now()-state.lastSaveAt>=10000) await saveCheckpoint(false);
      } catch (error) {
        state.pendingDays += remaining;
        absorbElapsed();
        setStatus("Errore del motore: "+error.message,true);
        throw error;
      }
    })();
    state.tickPromise = operation;
    try {
      await operation;
    } finally {
      state.tickPromise = null;
    }
  }

  async function exportState() {
    await tick();
    const result = await send("snapshot");
    const blob = new Blob([JSON.stringify(result.world,null,2)],{type:"application/json"});
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "world3d-civilta.json";
    link.click();
    window.setTimeout(()=>URL.revokeObjectURL(url),1000);
  }

  async function boot() {
    if (!("Worker" in window)) throw new Error("Questo browser non supporta Web Worker.");
    if (!("indexedDB" in window)) throw new Error("Questo browser non supporta IndexedDB.");
    state.worker = new Worker(new URL("./sim-worker.js",import.meta.url),{type:"module"});
    state.worker.addEventListener("message",event=>{
      const message = event.data || {};
      const task = pending.get(message.id);
      if (!task) return;
      pending.delete(message.id);
      window.clearTimeout(task.timer);
      if (message.error) task.reject(new Error(message.error));
      else task.resolve(message);
    });
    state.worker.addEventListener("error",event=>{
      const error = new Error(event.message || "Errore nel Web Worker.");
      for (const task of pending.values()) {
        window.clearTimeout(task.timer);
        task.reject(error);
      }
      pending.clear();
      setStatus(error.message,true);
    });

    const saved = await loadWorld();
    const world = saved || createWorld();
    const allowedSpeeds = [1,10,60];
    state.speed = allowedSpeeds.includes(Number(world.speed)) ? Number(world.speed) : 1;
    world.speed = state.speed;
    const catchUp = calculateOfflineCatchUp(world,Date.now());
    state.paused = Boolean(world.paused);
    state.pendingDays = catchUp.pendingDays;
    world.paused = state.paused;
    world.pendingDays = catchUp.pendingDays;

    const initial = await send("init",{world,days:0});
    state.summary = initial.summary;
    let remaining = catchUp.days;
    while (remaining>0) {
      setStatus("Recupero del tempo trascorso: "+formatNumber(remaining)+" giorni residui…");
      const chunk = Math.min(3650,remaining);
      const result = await send("advance",{days:chunk});
      state.summary = result.summary;
      const advanced = Math.max(0,Math.floor(Number(result.advanced)||0));
      if (advanced<chunk) {
        remaining = 0;
        state.pendingDays = 0;
      } else {
        remaining -= advanced;
      }
    }
    if (state.summary.population===0) state.paused = true;
    state.ready = true;
    state.lastTick = Date.now();
    renderState(state.summary);
    renderCoverage();
    await saveCheckpoint(false);
    setStatus(saved ? "Stato ripristinato e salvato" : "Nuova simulazione inizializzata");
    await refreshHistory();

    $("pauseBtn").addEventListener("click",async()=>{
      try {
        await tick();
        absorbElapsed();
        state.paused = !state.paused;
        state.lastTick = Date.now();
        updateControls();
        await saveCheckpoint();
      } catch (error) {
        setStatus("Impossibile cambiare lo stato: "+error.message,true);
      }
    });
    $("speedSelect").addEventListener("change",async()=>{
      try {
        await tick();
        absorbElapsed();
        const value = Number($("speedSelect").value);
        state.speed = [1,10,60].includes(value) ? value : 1;
        state.lastTick = Date.now();
        await saveCheckpoint();
      } catch (error) {
        setStatus("Impossibile salvare la velocità: "+error.message,true);
      }
    });
    $("saveBtn").addEventListener("click",async()=>{
      try {
        await tick();
        await saveCheckpoint();
      } catch (error) {
        setStatus("Salvataggio non riuscito: "+error.message,true);
      }
    });
    $("exportBtn").addEventListener("click",async()=>{
      try {
        await exportState();
      } catch (error) {
        setStatus("Esportazione non riuscita: "+error.message,true);
      }
    });
    $("historyQuery").addEventListener("input",()=>{
      window.clearTimeout(historyTimer);
      historyTimer = window.setTimeout(()=>void refreshHistory(),250);
    });
    intervalId = window.setInterval(()=>void tick().catch(()=>{}),1000);
    document.addEventListener("visibilitychange",async()=>{
      if (document.visibilityState!=="hidden") return;
      try {
        await tick();
        await saveCheckpoint(false);
      } catch {}
    });
    window.addEventListener("pagehide",()=>{
      if (!state.ready || !state.worker) return;
      absorbElapsed();
      try {
        state.worker.postMessage({id:++state.requestId,type:"save",meta:{
          speed:state.speed,paused:state.paused,pendingDays:state.pendingDays
        }});
      } catch {}
    });
  }

  boot().catch(error=>showError(error));
  window.addEventListener("beforeunload",()=>{
    if (intervalId!==null) window.clearInterval(intervalId);
    if (historyTimer!==null) window.clearTimeout(historyTimer);
  });
}

if (typeof document!=="undefined") {
  if (document.readyState==="loading") document.addEventListener("DOMContentLoaded",startApp,{once:true});
  else startApp();
}
