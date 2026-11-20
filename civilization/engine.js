import {
  VERSION as LEGACY_VERSION,
  createWorld as createLegacyWorld,
  advance as advanceLegacy,
  summary as legacySummary,
  validateWorld as validateLegacy,
  evolveCivilizationName,
  refreshWorldNames
} from "./legacy-engine.js";

export const VERSION = 4;
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const living = world => world.population.filter(person => person.alive);
function random(world) {
  let x = world.rng | 0;
  x ^= x << 13; x ^= x >>> 17; x ^= x << 5;
  world.rng = x | 0;
  return (x >>> 0) / 4294967296;
}
const TECH_TREE = [
  {name:"Agricoltura",cost:100,requires:[],materials:[],priority:1.1},
  {name:"Ceramica",cost:160,requires:[],materials:[["clay",5]],priority:.8},
  {name:"Metallurgia del rame",cost:240,requires:["Ceramica"],materials:[["ore",10]],priority:.55},
  {name:"Scrittura",cost:400,requires:["Ceramica"],materials:[],priority:.65},
  {name:"Ruota",cost:600,requires:["Ceramica"],materials:[["wood",20]],priority:.55},
  {name:"Irrigazione",cost:700,requires:["Agricoltura"],materials:[["wood",15],["stone",10]],priority:.55},
  {name:"Bronzo",cost:100,requires:["Metallurgia del rame"],materials:[["ore",20]],priority:.4},
  {name:"Moneta",cost:500,requires:["Scrittura"],materials:[],priority:.45},
  {name:"Ferro",cost:700,requires:["Bronzo"],materials:[["ore",30]],priority:.35},
  {name:"Calendario",cost:700,requires:["Scrittura","Agricoltura"],materials:[],priority:.35},
  {name:"Medicina organizzata",cost:800,requires:["Scrittura"],materials:[],priority:.4},
  {name:"Mulino ad acqua",cost:800,requires:["Irrigazione","Ruota"],materials:[["wood",20],["stone",20]],priority:.3},
  {name:"Amministrazione scritta",cost:1200,requires:["Scrittura","Moneta"],materials:[],priority:.25},
  {name:"Scuola",cost:1200,requires:["Scrittura","Amministrazione scritta"],materials:[],priority:.25},
  {name:"Macchine semplici",cost:1300,requires:["Ruota","Ferro"],materials:[["wood",30],["stone",20]],priority:.2},
  {name:"Vetro",cost:1500,requires:["Ceramica","Metallurgia del rame"],materials:[["clay",20]],priority:.2}
];

function roleSkills(person) {
  const base = clamp((Number(person.skill) || 1) / 4, 0, 1);
  const role = person.role || "";
  return {
    gathering: role === "raccoglitore" ? .62 : .22 + base*.12,
    hunting: role === "cacciatore" ? .62 : .18 + base*.12,
    farming: role === "agricoltore" ? .62 : .16 + base*.12,
    crafting: role === "artigiano" ? .62 : .2 + base*.12,
    building: role === "costruttore" ? .62 : .16 + base*.12,
    care: role === "guaritore" ? .62 : .2 + base*.12,
    leadership: role === "amministratore" ? .58 : .18 + (person.traits?.cooperation || .5)*.15,
    trade: role === "mercante" ? .62 : .15 + (person.traits?.ambition || .5)*.12
  };
}
function ensurePerson(person, world) {
  if (!person.needs || typeof person.needs !== "object") {
    person.needs = {food:12,water:10,shelter:10,safety:12,belonging:15,rest:10};
  } else {
    for (const [key,value] of Object.entries({food:12,water:10,shelter:10,safety:12,belonging:15,rest:10})) {
      if (!Number.isFinite(person.needs[key])) person.needs[key] = value;
    }
  }
  if (!person.skills || typeof person.skills !== "object") person.skills = roleSkills(person);
  else for (const [key,value] of Object.entries(roleSkills(person))) if (!Number.isFinite(person.skills[key])) person.skills[key] = value;
  if (!Array.isArray(person.relationships)) person.relationships = [];
  if (!person.decision || typeof person.decision !== "object") person.decision = {year:world.year,day:world.day,action:"lavorare",reason:"attività ordinaria",pressure:0};
  if (!person.beliefs || typeof person.beliefs !== "object") person.beliefs = {ancestors:.25,nature:.25,seasons:.25,community:.25};
  for (const key of ["ancestors","nature","seasons","community"]) if (!Number.isFinite(person.beliefs[key])) person.beliefs[key] = .25;
  if (!person.familyId) person.familyId = String(person.family || ("famiglia-"+person.id)).toLocaleLowerCase();
}
function aggregateResources(world) {
  const totals = {food:0,water:0,wood:0,stone:0,clay:0,fiber:0,ore:0};
  for (const settlement of world.settlements) {
    totals.food += Number(settlement.stores) || 0;
    totals.water += Number(settlement.water) || 0;
    for (const key of ["wood","stone","clay","fiber","ore"]) totals[key] += Number(settlement.resources?.[key]) || 0;
  }
  return Object.fromEntries(Object.entries(totals).map(([key,value]) => [key,Math.round(value*100)/100]));
}
function ensureWorld(world) {
  if (!Array.isArray(world.eventArchive)) world.eventArchive = [];
  if (!Array.isArray(world.history)) world.history = [];
  if (!world.justice || typeof world.justice !== "object") world.justice = {cases:[],sentences:[],nextCaseId:1,lastCrimeCount:Number(world.stats?.crimes)||0};
  if (!Array.isArray(world.justice.cases)) world.justice.cases = [];
  if (!Array.isArray(world.justice.sentences)) world.justice.sentences = [];
  if (!Number.isFinite(world.justice.nextCaseId)) world.justice.nextCaseId = Math.max(0,...world.justice.cases.map(item=>Number(item.id)||0))+1;
  if (!Number.isFinite(world.justice.lastCrimeCount)) world.justice.lastCrimeCount = Number(world.stats?.crimes)||0;
  if (!world.culture || typeof world.culture !== "object") world.culture = {
    values:{cooperation:.5,exploration:.2,equality:.7,tradition:.25},
    beliefs:{ancestors:.25,nature:.25,seasons:.25,community:.25},
    customs:[],rituals:[],lastUpdatedYear:-1,lastReligionYear:-8,language:null
  };
  if (!world.culture.values) world.culture.values = {cooperation:.5,exploration:.2,equality:.7,tradition:.25};
  if (!world.culture.beliefs) world.culture.beliefs = {ancestors:.25,nature:.25,seasons:.25,community:.25};
  if (!Array.isArray(world.culture.customs)) world.culture.customs = [];
  if (!Array.isArray(world.culture.rituals)) world.culture.rituals = [];
  if (!Number.isFinite(world.culture.lastUpdatedYear)) world.culture.lastUpdatedYear = -1;
  if (!Number.isFinite(world.culture.lastReligionYear)) world.culture.lastReligionYear = -8;
  if (!world.research || typeof world.research !== "object") world.research = {focus:null,progress:{},completed:{},inventions:[],lastKnowledge:Number(world.knowledge)||0};
  if (!world.research.progress) world.research.progress = {};
  if (!world.research.completed) world.research.completed = {};
  if (!Array.isArray(world.research.inventions)) world.research.inventions = [];
  if (!Number.isFinite(world.research.lastKnowledge)) world.research.lastKnowledge = Number(world.knowledge)||0;
  if (!world.historyCursor || typeof world.historyCursor !== "object") {
    world.historyCursor = {
      births:Number(world.stats?.births)||0,deaths:Number(world.stats?.deaths)||0,
      crimes:Number(world.stats?.crimes)||0,wars:Number(world.stats?.wars)||0,
      epidemics:Number(world.stats?.epidemics)||0,migrations:Number(world.stats?.migrations)||0,
      naturalDisasters:Number(world.stats?.naturalDisasters)||0,
      eventCount:world.eventArchive.length+world.events.length
    };
  }
  for (const settlement of world.settlements) {
    if (!settlement.resources || typeof settlement.resources !== "object") {
      settlement.resources = {wood:80,stone:35,clay:25,fiber:40,ore:0};
    }
    for (const key of ["wood","stone","clay","fiber","ore"]) {
      if (!Number.isFinite(settlement.resources[key])) settlement.resources[key] = 0;
    }
    if (!Number.isFinite(settlement.water)) settlement.water = Math.max(120,Number(settlement.population)||20);
  }
  for (const person of world.population) ensurePerson(person,world);
  world.extendedVersion = 1;
  world.resources = aggregateResources(world);
  return world;
}
export function createWorld(start={}) {
  const world = createLegacyWorld(start);
  ensureWorld(world);
  world.version = VERSION;
  world.speed = 1;
  world.paused = false;
  world.pendingDays = 0;
  return world;
}
export function validateWorld(world) {
  if (!world || ![1,2,3,VERSION].includes(world.version)) throw new Error("Salvataggio non valido o versione incompatibile");
  world.version = LEGACY_VERSION;
  validateLegacy(world);
  ensureWorld(world);
  world.version = VERSION;
  return world;
}
export function recordHistoricalEvent(world,details={}) {
  const event = {
    id:world.nextEventId++,year:world.year,day:world.day,
    title:String(details.title || "Evento storico"),
    description:String(details.description || ""),
    type:String(details.type || "society"),
    cause:details.cause ?? null,
    consequences:Array.isArray(details.consequences) ? details.consequences : [],
    actors:Array.isArray(details.actors) ? details.actors : [],
    locationId:details.locationId ?? null,
    relatedEventIds:Array.isArray(details.relatedEventIds) ? details.relatedEventIds : []
  };
  world.events.push(event);
  if (world.events.length > 500) world.eventArchive.push(...world.events.splice(0,world.events.length-500));
  return event;
}
function settlementPopulation(world) {
  const map = new Map(world.settlements.map(site=>[site.id,[]]));
  for (const person of living(world)) {
    if (!map.has(person.settlementId)) person.settlementId = world.settlements[0].id;
    map.get(person.settlementId)?.push(person);
  }
  return map;
}
function updateNeedsAndDecisions(world) {
  const people = living(world);
  const residents = settlementPopulation(world);
  const safetyBase = clamp(world.cohesion*.48+world.order*.32+(world.institutions.includes("Guardia civica")?10:0)-(world.neighbors.some(group=>group.atWar)?22:0),0,100);
  for (const person of people) {
    const locals = residents.get(person.settlementId) || [];
    const site = world.settlements.find(item=>item.id===person.settlementId) || world.settlements[0];
    const count = Math.max(1,locals.length);
    const foodRatio = clamp((Number(site.stores)||0)/(count*12),0,1);
    const waterRatio = clamp((Number(site.water)||0)/(count*10),0,1);
    const shelterRatio = clamp((Number(site.homes)||0)*4/count,0,1);
    const friends = person.relationships.filter(link=>link.type==="amicizia" || link.type==="partner" || link.type==="famiglia").length;
    const needs = person.needs;
    needs.food = clamp(needs.food+(foodRatio<.2?9:foodRatio<.55?3:-4),0,100);
    needs.water = clamp(needs.water+(waterRatio<.15?10:waterRatio<.45?3:-5),0,100);
    needs.shelter = clamp(needs.shelter+(shelterRatio<.55?1.6:-.8),0,100);
    needs.safety = clamp(needs.safety+(safetyBase<35?1.8:-.4),0,100);
    needs.belonging = clamp(needs.belonging+(friends===0?1.2:friends>=2?-.9:-.35),0,100);
    needs.rest = clamp(needs.rest+((person.age>=15&&person.age<65)?.55:.2)-(person.decision.action==="riposare"?3:0),0,100);
    const highest = Object.entries(needs).sort((a,b)=>b[1]-a[1])[0];
    let action,reason;
    if (person.age<8) { action="apprendere"; reason="età e apprendimento"; }
    else if (highest[1]<35) { action="lavorare: "+(person.role||"raccoglitore"); reason="bisogni essenziali sotto controllo"; }
    else {
      const choices = {
        food:["cercare cibo","scorte alimentari insufficienti"],
        water:["raccogliere acqua","disponibilità idrica insufficiente"],
        shelter:["riparare riparo","abitazioni insufficienti"],
        safety:["proteggere la comunità","percezione di insicurezza"],
        belonging:["sostenere un familiare","legami sociali deboli"],
        rest:["riposare","affaticamento accumulato"]
      };
      [action,reason] = choices[highest[0]];
    }
    person.decision = {year:world.year,day:world.day,action,reason,pressure:Math.round(highest[1]*10)/10};
    if (needs.food>85) person.health = clamp(person.health-.12,0,100);
    if (needs.water>85) person.health = clamp(person.health-.16,0,100);
    if (needs.shelter>88 && world.climate?.type==="inverno rigido") person.health = clamp(person.health-.05,0,100);
    if (needs.rest>90) person.health = clamp(person.health-.025,0,100);
    const skill = action.startsWith("lavorare:") ? ({
      agricoltore:"farming",raccoglitore:"gathering",cacciatore:"hunting",artigiano:"crafting",
      costruttore:"building",amministratore:"leadership",mercante:"trade",guardia:"leadership",
      guaritore:"care",sacerdote:"care"
    }[(person.role||"").toLowerCase()] || "gathering") : ({
      "cercare cibo":"gathering","raccogliere acqua":"gathering","riparare riparo":"building",
      "proteggere la comunità":"leadership","sostenere un familiare":"care","riposare":"care"
    }[action] || "care");
    person.skills[skill] = Math.min(100,(Number(person.skills[skill])||0)+.0005);
    if (action.startsWith("lavorare:")) person.skill = Math.min(10,(Number(person.skill)||1)+.00008);
  }
}
function related(a,b) {
  if (a.familyId && a.familyId===b.familyId) return true;
  const pa = a.parents || [], pb = b.parents || [];
  return pa.some(id=>pb.includes(id) || id===b.id) || pb.includes(a.id);
}
function updateRelationships(world) {
  const people = living(world);
  const byId = new Map(world.population.map(person=>[person.id,person]));
  const link = (a,b,type,trust) => {
    if (!a || !b || a.id===b.id) return;
    let current = a.relationships.find(item=>item.personId===b.id);
    if (!current) {
      current = {personId:b.id,type,trust,sinceYear:world.year};
      a.relationships.push(current);
    } else {
      if (current.type==="amicizia" && type!=="amicizia") current.type=type;
      current.trust = clamp(Math.max(current.trust||0,trust),0,100);
    }
  };
  for (const person of people) {
    const partner = byId.get(person.partner);
    if (partner?.alive) link(person,partner,"partner",92);
    for (const id of person.parents||[]) {
      const parent = byId.get(id);
      if (parent) link(person,parent,"famiglia",86);
    }
    for (const id of person.children||[]) {
      const child = byId.get(id);
      if (child) link(person,child,"famiglia",86);
    }
  }
  for (const person of people) {
    const friends = person.relationships.filter(item=>item.type==="amicizia" && byId.get(item.personId)?.alive).length;
    if (friends>=3) continue;
    const candidates = people.filter(other=>other.id!==person.id && other.alive && other.settlementId===person.settlementId && !related(person,other) && !person.relationships.some(item=>item.personId===other.id));
    if (!candidates.length || random(world)>.42) continue;
    candidates.sort((a,b)=>((b.traits?.cooperation||.5)+(b.traits?.ambition||.5)*.15)-((a.traits?.cooperation||.5)+(a.traits?.ambition||.5)*.15));
    const other = candidates[0];
    const trust = clamp(48+((person.traits?.cooperation||.5)+(other.traits?.cooperation||.5))*22,0,100);
    link(person,other,"amicizia",trust);
    link(other,person,"amicizia",trust);
  }
  for (const person of people) {
    for (const relation of person.relationships) {
      const other = byId.get(relation.personId);
      if (!other?.alive) { relation.status="deceduto"; continue; }
      const cooperation = ((person.traits?.cooperation||.5)+(other.traits?.cooperation||.5))/2;
      relation.trust = clamp((Number(relation.trust)||50)+(cooperation-.5)*.22+(world.cohesion-50)*.0015,0,100);
    }
    if (person.relationships.length>12) person.relationships.sort((a,b)=>(b.trust||0)-(a.trust||0)).splice(12);
  }
}
function updateMaterialResources(world) {
  const residents = settlementPopulation(world);
  const totals = {food:0,water:0,wood:0,stone:0,clay:0,fiber:0,ore:0};
  const produced = {water:0,wood:0,stone:0,clay:0,fiber:0,ore:0};
  const consumed = {water:0,wood:0,stone:0,clay:0,fiber:0,ore:0};
  for (const site of world.settlements) {
    const locals = residents.get(site.id) || [];
    const workers = locals.filter(person=>person.age>=15&&person.age<65);
    const count = locals.length;
    const roles = role => workers.filter(person=>person.role===role).length;
    const workRatio = workers.length ? workers.filter(person=>!["riposare","sostenere un familiare"].includes(person.decision?.action)).length/workers.length : 0;
    const productivity = .65+.35*workRatio;
    const gatherers = roles("raccoglitore"), farmers = roles("agricoltore"), builders = roles("costruttore"), artisans = roles("artigiano");
    const width = world.geography?.width || 128;
    const height = world.geography?.height || 88;
    const terrain = world.geography?.terrain || [];
    const x = clamp(Math.round(site.x),0,width-1);
    const y = clamp(Math.round(site.y),0,height-1);
    let nearWater = 99, nearOre = false;
    for (let dy=-4;dy<=4;dy++) for (let dx=-4;dx<=4;dx++) {
      const nx=x+dx, ny=y+dy;
      if (nx<0 || ny<0 || nx>=width || ny>=height) continue;
      const code = terrain[ny*width+nx];
      if (code===5 || code===6) nearWater=Math.min(nearWater,Math.hypot(dx,dy));
      if (code===3 || code===4) nearOre=true;
    }
    const rainfall = Number(site.localClimate?.rainfall)||35;
    const waterIn = count*((nearWater<=3?.075:.012)+clamp(rainfall/10000,0,.018));
    const waterUse = count*.045;
    site.water = clamp((Number(site.water)||0)+waterIn-waterUse,0,Math.max(240,count*45));
    produced.water += waterIn; consumed.water += waterUse;
    const output = {
      wood:(gatherers*.055+builders*.025)*productivity,
      stone:(builders*.025+artisans*.008)*productivity,
      clay:(gatherers*.012+farmers*.009)*productivity,
      fiber:(farmers*.025+gatherers*.006)*productivity,
      ore:(gatherers*.003+(nearOre?gatherers*.006:0)+artisans*.001)*productivity
    };
    for (const key of Object.keys(output)) {
      site.resources[key] = clamp((Number(site.resources[key])||0)+output[key],0,Math.max(500,count*60));
      produced[key] += output[key];
    }
    if (world.day%7===0 && count>site.homes*4 && site.resources.wood>=3 && site.resources.stone>=1) {
      site.resources.wood -= 3; site.resources.stone -= 1; site.homes += 1;
      consumed.wood += 3; consumed.stone += 1;
    }
    totals.food += Number(site.stores)||0;
    totals.water += site.water;
    for (const key of ["wood","stone","clay","fiber","ore"]) totals[key] += site.resources[key];
  }
  world.resources = Object.fromEntries(Object.entries(totals).map(([key,value])=>[key,Math.round(value*100)/100]));
  world.resourceFlows = {year:world.year,day:world.day,produced,consumed};
}
function researchScore(name,world,people,resources) {
  const foodRatio = clamp(world.food/Math.max(1,people.length*12),0,1);
  const waterRatio = clamp(resources.water/Math.max(1,people.length*10),0,1);
  const inequality = world.social?.inequality || 0;
  const fields = world.settlements.reduce((sum,site)=>sum+(site.fields||0),0);
  switch (name) {
    case "Agricoltura": return 1.1+(foodRatio<.75?1.4:0)+(people.length>40?.25:0);
    case "Ceramica": return .8+(resources.clay>8?.15:0);
    case "Metallurgia del rame": return .5+(resources.ore>10?.4:0);
    case "Scrittura": return .55+(people.length>45?.55:0);
    case "Ruota": return .5+(world.settlements.length>1?.5:0);
    case "Irrigazione": return .45+(waterRatio<.6?1.1:0)+(fields>0?.25:0);
    case "Bronzo": return .3+(resources.ore>20?.7:0);
    case "Moneta": return .35+(inequality>.25?.75:0)+(world.settlements.length>1?.25:0);
    case "Ferro": return .25+(resources.ore>30?.65:0);
    case "Calendario": return .3+(world.climate?.type!=="normale"?.5:0)+(fields>0?.25:0);
    case "Medicina organizzata": return .35+(world.disease?.active?1.2:0)+(world.stats.epidemics>0?.35:0);
    case "Mulino ad acqua": return .3+(fields>0&&resources.water>people.length*5?.65:0);
    case "Amministrazione scritta": return .25+(people.length>120&&world.settlements.length>1?.7:0);
    case "Scuola": return .25+(people.length>80?.6:0);
    case "Macchine semplici": return .2+(people.length>150?.65:0);
    case "Vetro": return .2+(resources.clay>20?.45:0);
    default: return .1;
  }
}
function hasMaterials(world,requirements) {
  const resources = aggregateResources(world);
  return requirements.every(([key,amount])=>resources[key]>=amount);
}
function consumeMaterials(world,requirements) {
  for (const [key,amount] of requirements) {
    let remaining = amount;
    for (const site of world.settlements) {
      const available = Number(site.resources?.[key])||0;
      const take = Math.min(available,remaining);
      site.resources[key] = available-take;
      remaining -= take;
      if (remaining<=0) break;
    }
  }
}
function applyTechnology(world,name) {
  if (name==="Agricoltura") {
    for (const site of world.settlements) {
      site.fields = Math.max(site.fields||0,Math.max(4,Math.round((site.population||20)*.22)));
      if (site.kind==="accampamento") { site.kind="villaggio"; site.homes=(site.homes||6)+8; }
    }
  } else if (name==="Scrittura") {
    world.institutions.push("Archivio");
    world.language.written = true;
  } else if (name==="Moneta") {
    world.economy = "Mercati e scambi monetari";
    world.institutions.push("Luogo del mercato");
  } else if (name==="Calendario") {
    world.institutions.push("Osservatori del cielo");
  } else if (name==="Medicina organizzata") {
    world.institutions.push("Casa di cura");
  } else if (name==="Amministrazione scritta") {
    world.polity = "Consiglio e amministratori";
  } else if (name==="Scuola") {
    world.institutions.push("Scuola degli scribi");
  }
}
function updateResearch(world,knowledgeDelta) {
  const people = living(world);
  const completed = new Set(world.technology);
  for (const definition of TECH_TREE) {
    if (completed.has(definition.name) && !world.research.completed[definition.name]) {
      world.research.completed[definition.name] = {year:world.year,day:world.day,legacy:true};
      world.research.progress[definition.name] = Math.max(Number(world.research.progress[definition.name])||0,definition.cost);
    }
  }
  const available = TECH_TREE.filter(definition=>!completed.has(definition.name)&&definition.requires.every(name=>completed.has(name)));
  const focus = available.slice().sort((a,b)=>{
    const score = researchScore(b.name,world,people,world.resources)-researchScore(a.name,world,people,world.resources);
    return score || a.cost-b.cost;
  })[0];
  world.research.focus = focus?.name || null;
  if (focus && knowledgeDelta>0) {
    const multiplier = world.technology.includes("Scuola")?1.35:world.technology.includes("Scrittura")?1.12:1;
    world.research.progress[focus.name] = (Number(world.research.progress[focus.name])||0)+knowledgeDelta*multiplier;
  }
  for (const definition of TECH_TREE) {
    if (world.technology.includes(definition.name)) continue;
    if (!definition.requires.every(name=>world.technology.includes(name))) continue;
    if ((Number(world.research.progress[definition.name])||0)<definition.cost) continue;
    if (!hasMaterials(world,definition.materials)) continue;
    consumeMaterials(world,definition.materials);
    world.technology.push(definition.name);
    applyTechnology(world,definition.name);
    const invention = {technology:definition.name,year:world.year,day:world.day,progress:world.research.progress[definition.name],knowledge:world.knowledge};
    world.research.completed[definition.name] = {year:world.year,day:world.day};
    world.research.inventions.push(invention);
    recordHistoricalEvent(world,{
      title:"Nuova conoscenza: "+definition.name,
      description:"La comunità ha accumulato competenze e risorse sufficienti per rendere stabile la tecnologia "+definition.name+".",
      type:"technology",
      cause:{kind:"ricerca",focus:definition.name,progress:invention.progress,knowledge:world.knowledge,prerequisites:definition.requires},
      consequences:["La tecnologia entra nelle pratiche della comunità","Le professioni e la produzione potranno adattarsi nei cicli successivi"]
    });
    break;
  }
  world.research.lastKnowledge = world.knowledge;
}
function updateJustice(world) {
  const people = living(world);
  const currentCrimes = Number(world.stats.crimes)||0;
  const newCases = Math.min(3,Math.max(0,currentCrimes-(world.justice.lastCrimeCount||0)));
  for (let i=0;i<newCases;i++) {
    if (people.length<2) break;
    const suspects = people.filter(person=>person.age>=12).slice().sort((a,b)=>(b.traits?.aggression||0)-(a.traits?.aggression||0));
    const accused = suspects[i%suspects.length] || people[0];
    const victim = people.find(person=>person.id!==accused.id&&person.settlementId===accused.settlementId) || people.find(person=>person.id!==accused.id);
    const cause = world.food<people.length*2 ? "scarsità alimentare" : (world.social?.inequality||0)>.35 ? "disuguaglianza materiale" : "conflitto interpersonale";
    const evidence = clamp(.32+(accused.traits?.aggression||.5)*.38+(1-(accused.traits?.cooperation||.5))*.15+(world.social?.inequality||0)*.15,0,1);
    const applicableLaw = ["Prime norme comunitarie","Norme contro gli abusi di ricchezza"].includes(world.laws) ? world.laws : null;
    const item = {id:world.justice.nextCaseId++,year:world.year,day:world.day,kind:"appropriazione di risorse",accusedId:accused.id,victimId:victim.id,cause,evidence,applicableLaw,status:"pendente",outcome:null};
    world.justice.cases.push(item);
    recordHistoricalEvent(world,{
      title:"Apertura di un procedimento comunitario",
      description:"Una controversia sulle risorse viene sottoposta alla mediazione della comunità.",
      type:"justice",
      cause:{kind:"controversia",trigger:cause,caseId:item.id},
      actors:[accused.id,victim.id],
      consequences:["La controversia entra nella memoria delle istituzioni"]
    });
  }
  world.justice.lastCrimeCount = currentCrimes;
  if (people.length>=80 && world.technology.includes("Scrittura") && !world.institutions.includes("Tribunale comunitario")) {
    world.institutions.push("Tribunale comunitario");
    recordHistoricalEvent(world,{
      title:"Si forma un tribunale comunitario",
      description:"La registrazione delle norme e la crescita della popolazione rendono stabile un organo di giudizio.",
      type:"politics",
      cause:{kind:"sviluppo_istituzionale",population:people.length,technology:"Scrittura"},
      consequences:["I procedimenti possono essere registrati e riesaminati"]
    });
  }
  if ((world.day-1)%30===0 && world.institutions.some(name=>["Consiglio degli anziani","Consuetudini codificate","Tribunale comunitario"].includes(name))) {
    for (const item of world.justice.cases.filter(entry=>entry.status==="pendente")) {
      const accused = world.population.find(person=>person.id===item.accusedId);
      const victim = world.population.find(person=>person.id===item.victimId);
      const evidenceThreshold = .56;
      const responsible = Boolean(item.applicableLaw) && item.evidence>=evidenceThreshold;
      let outcome = "mediazione";
      if (responsible && accused?.alive) {
        const restitution = Math.min(Number(accused.wealth)||0,2+item.evidence*4);
        accused.wealth = Math.max(0,(Number(accused.wealth)||0)-restitution);
        if (victim) victim.wealth = (Number(victim.wealth)||0)+restitution;
        outcome = "restituzione e servizio comunitario";
      } else {
        world.cohesion = clamp(world.cohesion+1,0,100);
      }
      item.status = "risolto";
      item.outcome = outcome;
      item.resolvedYear = world.year;
      item.resolvedDay = world.day;
      world.justice.sentences.push({caseId:item.id,year:world.year,day:world.day,outcome,accusedId:item.accusedId,victimId:item.victimId,law:item.applicableLaw,evidence:item.evidence,finding:responsible?"responsabile":"non_accertato"});
      recordHistoricalEvent(world,{
        title:"Decisione su una controversia",
        description:"Il procedimento "+item.id+" si conclude con: "+outcome+".",
        type:"justice",
        cause:{kind:"procedimento",caseId:item.id,evidence:item.evidence,evidenceThreshold,law:item.applicableLaw,finding:responsible?"responsabile":"non_accertato"},
        actors:[item.accusedId,item.victimId],
        consequences:[outcome,item.applicableLaw ? "Decisione applicata secondo "+item.applicableLaw : "Nessuna norma codificata applicabile: decisione mediata","La decisione viene conservata nella memoria storica"]
      });
    }
  }
  if (world.justice.cases.length>1000) world.justice.cases.splice(0,world.justice.cases.length-1000);
  if (world.justice.sentences.length>1000) world.justice.sentences.splice(0,world.justice.sentences.length-1000);
}
function normalizeBeliefs(beliefs) {
  const keys = ["ancestors","nature","seasons","community"];
  const total = keys.reduce((sum,key)=>sum+Math.max(0,Number(beliefs[key])||0),0) || 1;
  for (const key of keys) beliefs[key] = Math.max(0,Number(beliefs[key])||0)/total;
  return beliefs;
}
function updateCulture(world) {
  if (world.culture.lastUpdatedYear===world.year) return;
  const people = living(world);
  if (!people.length) return;
  const cursor = world.historyCursor;
  const deaths = Math.max(0,(world.stats.deaths||0)-(cursor.deaths||0));
  const disasters = Math.max(0,(world.stats.naturalDisasters||0)-(cursor.naturalDisasters||0));
  const epidemics = Math.max(0,(world.stats.epidemics||0)-(cursor.epidemics||0));
  const cooperation = people.reduce((sum,p)=>sum+(p.traits?.cooperation||.5),0)/people.length;
  const exploration = clamp(((world.stats.migrations||0)*.025+(world.stats.discoveries||0)*.012),0,1);
  const equality = 1-(world.social?.inequality||0);
  const deathPressure = clamp(deaths/Math.max(1,people.length)*4,0,1);
  const disasterPressure = clamp((disasters+epidemics)/Math.max(1,people.length)*3,0,1);
  for (const person of people) {
    const beliefs = person.beliefs;
    beliefs.ancestors += deathPressure*.035+.001;
    beliefs.nature += disasterPressure*.035+.001;
    beliefs.seasons += (world.technology.includes("Agricoltura")?.012:.002);
    beliefs.community += cooperation*.012;
    const peers = person.relationships.map(link=>world.population.find(other=>other.id===link.personId&&other.alive)).filter(Boolean);
    if (peers.length) {
      for (const key of ["ancestors","nature","seasons","community"]) {
        const peerMean = peers.reduce((sum,peer)=>sum+(peer.beliefs?.[key]||.25),0)/peers.length;
        beliefs[key] = beliefs[key]*.96+peerMean*.04;
      }
    }
    normalizeBeliefs(beliefs);
  }
  const meanBeliefs = {ancestors:0,nature:0,seasons:0,community:0};
  for (const person of people) for (const key of Object.keys(meanBeliefs)) meanBeliefs[key]+=person.beliefs[key]/people.length;
  world.culture.beliefs = normalizeBeliefs(meanBeliefs);
  const values = world.culture.values;
  values.cooperation = clamp(values.cooperation*.7+(cooperation*.6+world.cohesion/100*.4)*.3,0,1);
  values.exploration = clamp(values.exploration*.8+exploration*.2,0,1);
  values.equality = clamp(values.equality*.8+equality*.2,0,1);
  values.tradition = clamp(values.tradition*.8+clamp(deathPressure*.7+(world.religion!=="Tradizioni orali"?.3:0),0,1)*.2,0,1);
  const addCustom = (name,condition) => { if (condition&&!world.culture.customs.includes(name)) world.culture.customs.push(name); };
  addCustom("Mutuo soccorso",values.cooperation>.62);
  addCustom("Distribuzione condivisa delle riserve",values.equality>.72);
  addCustom("Ospitalità degli stranieri",values.exploration>.3);
  addCustom("Riti di memoria dei defunti",values.tradition>.58);
  if (world.culture.beliefs.ancestors>.36&&!world.culture.rituals.includes("Ricordo dei defunti")) world.culture.rituals.push("Ricordo dei defunti");
  if (world.culture.beliefs.seasons>.36&&!world.culture.rituals.includes("Osservazione dei cicli stagionali")) world.culture.rituals.push("Osservazione dei cicli stagionali");
  const dominant = Object.entries(world.culture.beliefs).sort((a,b)=>b[1]-a[1])[0];
  const religions = {ancestors:"Culto degli antenati",nature:"Spiritualità dei luoghi",seasons:"Riti dei cicli stagionali",community:"Tradizione comunitaria"};
  if (people.length>=45 && dominant[1]>.34 && world.year-world.culture.lastReligionYear>=8 && world.religion!==religions[dominant[0]]) {
    const previous = world.religion;
    world.religion = religions[dominant[0]];
    world.culture.lastReligionYear = world.year;
    recordHistoricalEvent(world,{
      title:"Cambia la tradizione spirituale",
      description:"Le credenze condivise si orientano verso "+world.religion+". La tradizione precedente resta parte della memoria della comunità.",
      type:"culture",
      cause:{kind:"trasmissione_culturale",belief:dominant[0],share:dominant[1],previous},
      consequences:["Nuovi riti e pratiche vengono trasmessi tra famiglie e relazioni"]
    });
  }
  world.culture.language = {...(world.language||{}),written:Boolean(world.language?.written)};
  world.culture.lastUpdatedYear = world.year;
}
function recordYearHistory(world) {
  const stats = world.stats;
  const cursor = world.historyCursor;
  const eventCount = world.eventArchive.length+world.events.length;
  const record = {
    year:world.year-1,population:living(world).length,settlements:world.settlements.length,
    births:(stats.births||0)-(cursor.births||0),deaths:(stats.deaths||0)-(cursor.deaths||0),
    crimes:(stats.crimes||0)-(cursor.crimes||0),wars:(stats.wars||0)-(cursor.wars||0),
    epidemics:(stats.epidemics||0)-(cursor.epidemics||0),migrations:(stats.migrations||0)-(cursor.migrations||0),
    naturalDisasters:(stats.naturalDisasters||0)-(cursor.naturalDisasters||0),
    food:Math.round(world.food),knowledge:Math.round(world.knowledge),
    technology:[...world.technology],polity:world.polity,religion:world.religion,eventCount:eventCount-(cursor.eventCount||0)
  };
  world.history.push(record);
  if (world.history.length>5000) world.history.splice(0,world.history.length-5000);
  world.historyCursor = {
    births:stats.births||0,deaths:stats.deaths||0,crimes:stats.crimes||0,wars:stats.wars||0,
    epidemics:stats.epidemics||0,migrations:stats.migrations||0,naturalDisasters:stats.naturalDisasters||0,
    eventCount
  };
}
export function advance(world,days) {
  const state = ensureWorld(world);
  const startYear = state.year;
  const count = Math.min(3650,Math.max(0,Math.floor(days)));
  let advanced = 0;
  for (let index=0;index<count;index++) {
    if (!living(state).length) {
      advanceLegacy(state,1);
      break;
    }
    updateNeedsAndDecisions(state);
    const beforeKnowledge = Number(state.knowledge)||0;
    const beforeYear = state.year;
    const result = advanceLegacy(state,1);
    if (!result.advanced) break;
    ensureWorld(state);
    updateMaterialResources(state);
    updateResearch(state,Math.max(0,(Number(state.knowledge)||0)-beforeKnowledge));
    updateJustice(state);
    if ((state.day-1)%30===0) updateRelationships(state);
    if (state.year!==beforeYear) {
      updateCulture(state);
      recordYearHistory(state);
    }
    advanced++;
  }
  return {world:state,advanced,years:state.year-startYear};
}
export function summary(world) {
  const state = ensureWorld(world);
  const base = legacySummary(state);
  const people = living(state);
  const needs = {food:0,water:0,shelter:0,safety:0,belonging:0,rest:0};
  const decisions = {};
  let relationshipCount = 0;
  for (const person of people) {
    for (const key of Object.keys(needs)) needs[key] += person.needs[key]/Math.max(1,people.length);
    decisions[person.decision.action] = (decisions[person.decision.action]||0)+1;
    relationshipCount += person.relationships.length;
  }
  for (const key of Object.keys(needs)) needs[key] = Math.round(needs[key]*10)/10;
  return {
    ...base,version:VERSION,seed:state.seed,births:state.stats.births||0,deaths:state.stats.deaths||0,
    resources:aggregateResources(state),resourceFlows:state.resourceFlows||null,needs,decisions,relationshipCount,
    culture:state.culture,
    justice:{pending:state.justice.cases.filter(item=>item.status==="pendente").length,resolved:state.justice.sentences.length,last:state.justice.sentences.slice(-8).reverse()},
    research:{focus:state.research.focus,progress:state.research.progress,completed:state.research.completed,inventions:state.research.inventions.slice(-12).reverse()},
    history:state.history.slice(-30).reverse(),
    eventTotal:state.eventArchive.length+state.events.length,eventArchiveCount:state.eventArchive.length,
    geography:state.geography,disease:state.disease,
    populationDetails:people.slice(0,50).map(person=>({
      id:person.id,name:person.name,family:person.family,age:Math.floor(person.age),role:person.role,
      settlementId:person.settlementId,health:Math.round(person.health),needs:person.needs,
      decision:person.decision,relationships:person.relationships.length
    }))
  };
}
export function searchHistory(world,options={}) {
  const query = String(options.query||"").trim().toLocaleLowerCase();
  const year = Number.isFinite(options.year)?options.year:null;
  const type = options.type || null;
  const limit = clamp(Math.floor(options.limit||80),1,250);
  const events = [...(world.eventArchive||[]),...(world.events||[])];
  const eventItems = events.map(item=>({...item,recordKind:"evento"}));
  const yearItems = (world.history||[]).map(item=>({
    ...item,day:365,type:"bilancio",recordKind:"anno",
    title:"Bilancio annuale · Anno "+item.year,
    description:item.population+" abitanti, "+item.births+" nascite, "+item.deaths+" decessi, "+item.settlements+" insediamenti"
  }));
  return [...eventItems,...yearItems]
    .filter(item=>(year===null||item.year===year)&&(!type||item.type===type))
    .filter(item=>!query||[item.title,item.description,item.type,item.year,item.cause?.kind,item.cause?.trigger].join(" ").toLocaleLowerCase().includes(query))
    .sort((a,b)=>(b.year-a.year)||(b.day-a.day)||(b.id-a.id))
    .slice(0,limit);
}
export {evolveCivilizationName,refreshWorldNames};
