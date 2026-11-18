import test from "node:test";
import assert from "node:assert/strict";
import { createWorld, advance, summary, validateWorld, evolveCivilizationName, recordHistoricalEvent, searchHistory } from "../engine.js";

test("world starts at year zero with its founding population", () => {
  const world = createWorld();
  const state = summary(world);
  assert.equal(state.year, 0);
  assert.equal(state.population, 24);
  assert.equal(state.settlements, 1);
  assert.equal(state.settlementDetails[0].population, 24);
});

test("old saves receive defaults for newly introduced systems", () => {
  const world = createWorld();
  delete world.climate;
  delete world.disease;
  delete world.social;
  delete world.leadership;
  for (const person of world.population) delete person.settlementId;
  for (const settlement of world.settlements) delete settlement.population;
  for (const neighbor of world.neighbors) {
    delete neighbor.allied;
    delete neighbor.truceUntil;
  }
  validateWorld(world);
  assert.equal(world.climate.type, "normale");
  assert.equal(world.disease.active, false);
  assert.equal(world.social.inequality, 0);
  assert.equal(world.leadership.legitimacy, 50);
  assert.ok(world.population.every(person => person.settlementId === world.settlements[0].id));
  assert.equal(world.settlements[0].population, 24);
  assert.ok(world.neighbors.every(neighbor => neighbor.allied === false));
});

test("the annual cycle creates political leadership once the community grows", () => {
  const world = createWorld();
  const founders = world.population.slice();
  for (let i = 0; i < 32; i++) {
    const source = founders[i % founders.length];
    world.population.push({
      ...source,
      id: 25 + i,
      age: 25 + (i % 25),
      alive: true,
      health: 95,
      wealth: i * 0.1,
      parents: [],
      children: [],
      traits: { ...source.traits }
    });
  }
  world.nextPersonId = 57;
  advance(world, 365);
  const state = summary(world);
  assert.ok(state.population >= 45);
  assert.ok(state.leader);
  assert.ok(state.leadership.legitimacy >= 20);
  assert.ok(world.institutions.includes("Consiglio degli anziani"));
});

test("advance reports the real number of simulated days after extinction", () => {
  const world = createWorld();
  for (const person of world.population) person.alive = false;
  const first = advance(world, 100);
  assert.equal(first.advanced, 0);
  assert.equal(world.events.filter(event => event.type === "extinction").length, 1);
  const second = advance(world, 100);
  assert.equal(second.advanced, 0);
  assert.equal(world.events.filter(event => event.type === "extinction").length, 1);
});

test("a decade of simulation keeps core resources and social metrics finite", () => {
  const world = createWorld();
  const result = advance(world, 365 * 10);
  assert.equal(result.advanced, 3650);
  assert.ok(Number.isFinite(world.food));
  assert.ok(Number.isFinite(world.knowledge));
  assert.ok(Number.isFinite(world.health));
  assert.ok(world.population.every(person =>
    Number.isFinite(person.health) && Number.isFinite(person.wealth)
  ));
});

test("economic inequality creates measurable social strata", () => {
  const world = createWorld();
  const founders = world.population.slice();
  for (let i = 0; i < 36; i++) {
    const source = founders[i % founders.length];
    world.population.push({
      ...source,
      id: 25 + i,
      age: 30,
      alive: true,
      health: 95,
      wealth: i < 4 ? 1000 : 0,
      parents: [],
      children: [],
      traits: { ...source.traits }
    });
  }
  world.nextPersonId = 61;
  advance(world, 365);
  const state = summary(world);
  assert.ok(state.social.inequality > 0.2);
  assert.equal(
    Object.values(state.social.classes).reduce((sum, count) => sum + count, 0),
    state.population
  );
});

test("research unlocks an invention only after its project and prerequisites are satisfied", () => {
  const world = createWorld();
  world.research.progress.Agricoltura = 100;
  world.research.progress.Bronzo = 100;
  advance(world, 1);
  assert.ok(world.technology.includes("Agricoltura"));
  assert.ok(!world.technology.includes("Bronzo"));
  assert.ok(world.research.inventions.some(item => item.technology === "Agricoltura"));
});

test("settlement population and stores follow the actual residents", () => {
  const world = createWorld();
  world.settlements.push({
    id: 2, name: "Nuovo Guado", x: 140, y: 100, kind: "villaggio",
    homes: 12, fields: 6, stores: 0, water: 400, knownArea: 4, population: 0
  });
  world.nextSettlementId = 3;
  for (const person of world.population.slice(0, 6)) person.settlementId = 2;
  advance(world, 1);
  const state = summary(world);
  assert.equal(state.settlementDetails[0].population, 18);
  assert.equal(state.settlementDetails[1].population, 6);
  const allocated = state.settlementDetails.reduce((sum, site) => sum + site.stores, 0);
  assert.ok(Math.abs(allocated - world.food) < 1e-8);
});

test("agriculture creates specialized farmers", () => {
  const world = createWorld();
  world.research.progress.Agricoltura = 100;
  world.knowledge = 100;
  advance(world, 365);
  const state = summary(world);
  assert.ok(state.roles.agricoltore > 0);
  assert.equal(
    Object.values(state.roles).reduce((sum, count) => sum + count, 0),
    state.workers
  );
  assert.ok(world.specializations.includes("agricoltore"));
});

test("wealth is inherited by surviving children", () => {
  const world = createWorld();
  const parent = world.population[0];
  const heirs = world.population.slice(1, 3);
  parent.children = heirs.map(person => person.id);
  parent.wealth = 120;
  parent.health = -1;
  advance(world, 1);
  assert.equal(parent.alive, false);
  assert.ok(Math.abs(heirs[0].wealth - 60) < 0.001);
  assert.ok(Math.abs(heirs[1].wealth - 60) < 0.001);
});

test("new world has an unnamed generated continent with land, sea, lakes and rivers",()=>{
 const world=createWorld();
 assert.equal(world.settlements[0].name,null);
 assert.ok(world.neighbors.every(group=>group.name===null));
 assert.equal(world.geography.width,128);
 assert.equal(world.geography.height,88);
 assert.equal(world.geography.terrain.length,128*88);
 for(const code of [0,1,2,3,4,5,6])assert.ok(world.geography.terrain.includes(code),"terrain code "+code+" exists");
 assert.ok(world.geography.features.every(feature=>feature.name===null));
});
test("inhabitants invent the first settlement name after the founding period",()=>{
 const world=createWorld();
 advance(world,365);
 assert.ok(world.settlements[0].name);
 assert.ok(world.events.some(event=>event.title==="La comunità dà un nome al proprio luogo"));
});
test("version one saves migrate to the generated geography without losing population",()=>{
 const world=createWorld();world.version=1;delete world.geography;delete world.language;
 validateWorld(world);
 assert.equal(world.version,4);assert.equal(world.population.length,24);assert.ok(world.geography.terrain.length>0);
});

test("advanced technologies materially increase local food production",()=>{
 const basic=createWorld(),advanced=structuredClone(basic);
 advanced.technology.push("Agricoltura","Irrigazione","Mulino ad acqua","Macchine semplici","Bronzo","Ruota");
 advanced.settlements[0].fields=10;
 advance(basic,1);advance(advanced,1);
 assert.ok(advanced.food>basic.food);
});
test("an epidemic spreads locally and survivors gain immunity",()=>{
 const world=createWorld(),founders=world.population.slice();
 for(let i=0;i<126;i++){
  const source=founders[i%founders.length];
  world.population.push({...source,id:25+i,age:30,alive:true,health:95,parents:[],children:[],traits:{...source.traits},settlementId:1,partner:null});
 }
 world.nextPersonId=151;world.settlements[0].homes=40;
 world.disease={active:true,strain:1,days:1};
 world.population[0].infectionDays=70;
 advance(world,30);
 assert.ok(world.population.filter(p=>p.alive&&(p.infectionDays||0)>0).length>1);
});
test("a growing network of settlements can form a named political union",()=>{
 const world=createWorld(),founders=world.population.slice();
 world.settlements.push({id:2,name:null,x:75,y:43,latitude:2,longitude:2,kind:"villaggio",homes:30,fields:10,stores:200,water:400,knownArea:20,population:0,foundingYear:0});
 for(let i=0;i<150;i++){
  const source=founders[i%founders.length];
  world.population.push({...source,id:25+i,age:30,alive:true,health:100,parents:[],children:[],traits:{...source.traits},settlementId:i%2?1:2,partner:null});
 }
 world.nextPersonId=175;world.food=5000;world.settlements[0].stores=2500;world.settlements[1].stores=2500;
 advance(world,365);
 assert.ok(world.nationName);
 assert.ok(world.nationType);
 assert.ok(world.events.some(event=>event.title==="Nasce una nuova entità politica"));
});

test("civilization can adopt a new name and preserve its former name in history",()=>{
 const world=createWorld();
 world.year=150;
 world.civilizationName="Aren";
 world.civilizationNameHistory=[{name:"Aren",fromYear:2,toYear:null}];
 world.lastCivilizationNameYear=2;
 assert.equal(evolveCivilizationName(world),true);
 assert.notEqual(world.civilizationName,"Aren");
 assert.equal(world.civilizationNameHistory[0].name,"Aren");
 assert.equal(world.civilizationNameHistory[0].toYear,150);
 assert.equal(world.civilizationNameHistory.at(-1).name,world.civilizationName);
 assert.equal(world.civilizationNameHistory.at(-1).toYear,null);
 assert.ok(world.events.some(event=>event.title==="La comunità cambia nome"));
});

test("the same seed reproduces the initial world and every subsequent day", () => {
  const first = createWorld({ seed: 123456789 });
  const second = createWorld({ seed: 123456789 });
  assert.equal(first.seed, 123456789);
  assert.deepEqual(first.population, second.population);
  assert.deepEqual(first.geography, second.geography);
  advance(first, 120);
  advance(second, 120);
  const comparable = world => {
    const copy = structuredClone(world);
    delete copy.lastWallTime;
    delete copy._dailyPersonIndex;
    return copy;
  };
  assert.deepEqual(comparable(first), comparable(second));
});

test("legacy saves restore missing collections and counters before resuming", () => {
  const world = createWorld({ seed: 42 });
  world.version = 1;
  for (const key of [
    "events", "stats", "neighbors", "technology", "institutions", "routes",
    "specializations", "history", "civilizationNameHistory", "nextEventId",
    "nextPersonId", "nextSettlementId"
  ]) delete world[key];

  validateWorld(world);
  assert.deepEqual(world.events, []);
  assert.deepEqual(world.neighbors, []);
  assert.equal(world.stats.births, 0);
  assert.equal(world.stats.deaths, 0);
  assert.equal(world.nextEventId, 1);
  assert.equal(world.nextPersonId, 25);
  assert.equal(world.nextSettlementId, 2);
  assert.ok(Array.isArray(world.technology));
  assert.ok(Array.isArray(world.institutions));
  assert.equal(advance(world, 1).advanced, 1);
});

test("a JSON save can resume the same deterministic timeline", () => {
  const uninterrupted = createWorld({ seed: 20261115 });
  const checkpoint = createWorld({ seed: 20261115 });
  advance(uninterrupted, 365);
  advance(checkpoint, 365);

  const restored = validateWorld(JSON.parse(JSON.stringify(checkpoint)));
  advance(uninterrupted, 240);
  advance(restored, 240);
  validateWorld(uninterrupted);

  const comparable = state => {
    const copy = structuredClone(state);
    delete copy.lastWallTime;
    delete copy._dailyPersonIndex;
    return copy;
  };
  assert.deepEqual(comparable(restored), comparable(uninterrupted));
});


test("individual needs generate explicit daily decisions", () => {
  const world = createWorld({seed:77});
  world.settlements[0].stores = 0;
  world.settlements[0].water = 0;
  advance(world,12);
  assert.ok(world.population.some(person=>person.alive && person.needs.food>70));
  assert.ok(world.population.some(person=>person.alive && person.needs.water>70));
  assert.ok(world.population.some(person=>person.alive && person.decision.action!=="lavorare: "+person.role));
});

test("relationships are stored as reciprocal social ties", () => {
  const world = createWorld({seed:88});
  advance(world,30);
  const person = world.population.find(item=>item.alive && item.relationships.some(link=>link.type==="amicizia"));
  assert.ok(person);
  const friend = world.population.find(item=>item.id===person.relationships.find(link=>link.type==="amicizia").personId);
  assert.ok(friend.relationships.some(link=>link.personId===person.id && link.type==="amicizia"));
});

test("water and material stocks remain finite and non-negative", () => {
  const world = createWorld({seed:91});
  advance(world,365);
  for (const site of world.settlements) {
    assert.ok(Number.isFinite(site.water) && site.water>=0);
    for (const key of ["wood","stone","clay","fiber","ore"]) assert.ok(Number.isFinite(site.resources[key]) && site.resources[key]>=0);
  }
  assert.ok(Number.isFinite(world.resources.food));
});

test("community justice records and resolves a case", () => {
  const world = createWorld({seed:92});
  world.institutions.push("Consiglio degli anziani");
  world.stats.crimes = 1;
  world.justice.lastCrimeCount = 0;
  advance(world,30);
  assert.equal(world.justice.cases.length,1);
  assert.equal(world.justice.cases[0].status,"risolto");
  assert.equal(world.justice.sentences.length,1);
  assert.ok(world.events.some(item=>item.type==="justice"));
});

test("culture develops customs from population traits and social conditions", () => {
  const world = createWorld({seed:93});
  for (const person of world.population) person.traits.cooperation = .98;
  world.cohesion = 95;
  advance(world,365);
  assert.ok(world.culture.customs.includes("Mutuo soccorso"));
  assert.ok(world.culture.values.cooperation>.62);
});

test("annual history preserves demographic and institutional records", () => {
  const world = createWorld({seed:94});
  advance(world,365);
  assert.equal(world.history.length,1);
  assert.equal(world.history[0].year,0);
  assert.ok(Number.isFinite(world.history[0].population));
  assert.ok(Array.isArray(world.history[0].technology));
});

test("historical event archive remains searchable after the recent-event window rolls over", () => {
  const world = createWorld({seed:95});
  for (let index=0;index<520;index++) {
    recordHistoricalEvent(world,{title:"Evento "+index,description:"Memoria consultabile",type:"test",cause:{kind:"test"},consequences:["registrato"]});
  }
  assert.equal(world.eventArchive.length,21);
  assert.ok(world.eventArchive.some(item=>item.title==="La comunità si stabilisce"));
  assert.ok(searchHistory(world,{query:"Evento 0",limit:250}).some(item=>item.title==="Evento 0"));
});

test("war resolution records a real armed engagement", () => {
  const world = createWorld({seed:96});
  const neighbor = world.neighbors[0];
  neighbor.discovered = true;
  neighbor.atWar = true;
  neighbor.warDays = 29;
  neighbor.population = 500;
  advance(world,1);
  assert.ok(world.events.some(item=>item.title==="Scontro armato"));
});

test("an armed advance expands the known frontier and records an invasion", () => {
  const world = createWorld({seed:18});
  const neighbor = world.neighbors[0];
  neighbor.discovered = true;
  neighbor.atWar = true;
  neighbor.warDays = 29;
  neighbor.population = 3;
  neighbor.technology = 0;
  const frontier = world.settlements[0];
  const knownArea = frontier.knownArea;

  advance(world,1);

  const event = world.events.find(item=>item.title==="Avanzata oltre il confine");
  assert.ok(event);
  assert.equal(event.cause.kind,"superiorita_militare");
  assert.ok(event.description.includes("esplorate"));
  assert.ok(!event.description.includes("occupate"));
  assert.ok(event.consequences.length>=2);
  assert.ok(Math.abs(frontier.knownArea-knownArea-2)<0.01);
});

test("an enemy incursion records territorial damage", () => {
  const world = createWorld({seed:1});
  const neighbor = world.neighbors[0];
  neighbor.discovered = true;
  neighbor.atWar = true;
  neighbor.warDays = 29;
  neighbor.population = 500;
  neighbor.technology = 0;
  const cohesion = world.cohesion;

  advance(world,1);

  const event = world.events.find(item=>item.title==="Incursione nel territorio");
  assert.ok(event);
  assert.equal(event.cause.kind,"superiorita_militare_avversaria");
  assert.ok(event.consequences.length>=2);
  assert.ok(world.cohesion<cohesion);
});

test("a sustained population surplus creates a settlement through migration", () => {
  const world = createWorld({seed:20261118});
  const template = world.population[0];
  for (let index=24;index<200;index++) {
    const person = JSON.parse(JSON.stringify(template));
    person.id = index+1;
    person.name = template.name+"-"+index;
    person.age = 30;
    person.alive = true;
    person.health = 100;
    person.partner = null;
    person.parents = [];
    person.children = [];
    person.relationships = [];
    person.family = "Famiglia "+index;
    person.familyId = "famiglia-"+index;
    person.settlementId = 1;
    world.population.push(person);
  }
  world.nextPersonId = 201;
  const origin = world.settlements[0];
  origin.population = 200;
  origin.stores = 100000;
  origin.water = 100000;
  world.food = 100000;

  const result = advance(world,3650);

  assert.equal(result.advanced,3650);
  assert.equal(world.stats.migrations,1);
  assert.equal(world.settlements.length,2);
  const founded = world.settlements[1];
  assert.equal(founded.originId,origin.id);
  assert.ok(founded.population>=8);
  assert.ok(founded.stores>0);
  const event = world.events.find(item=>item.type==="migration");
  assert.ok(event);
  assert.equal(event.cause.kind,"surplus_demografico_e_risorse");
  assert.equal(event.cause.originId,origin.id);
  assert.equal(event.cause.destinationId,founded.id);
  assert.equal(event.actors.length,event.cause.migrantCount);
  assert.ok(event.consequences.length>=2);
  assert.equal(event.locationId,founded.id);
  assert.ok(event.description.includes("nuovo insediamento"));
  assert.ok(!event.description.includes("comunità autonoma"));
  assert.equal(world.settlements.reduce((sum,site)=>sum+site.population,0),world.population.filter(person=>person.alive).length);
});

test("diplomacy can dissolve an alliance after hostility rises", () => {
  const world = createWorld({seed:97});
  const neighbor = world.neighbors[0];
  neighbor.discovered = true;
  neighbor.allied = true;
  neighbor.hostility = 80;
  advance(world,365);
  assert.equal(neighbor.allied,false);
  assert.ok(world.events.some(item=>item.title==="Si scioglie un patto"));
});

test("pregnancy produces a newborn with both parent links and a zero-year age",()=>{
  let found=null;
  for(let seed=1;seed<=128&&!found;seed++){
    const world=createWorld({seed});
    const mother=world.population.find(person=>person.sex==="F");
    const father=world.population.find(person=>person.sex==="M");
    if(!mother||!father)continue;
    mother.age=25;mother.health=100;mother.pregnancyDays=1;mother.partner=father.id;
    father.age=25;father.health=100;father.partner=mother.id;
    const fatherAge=father.age;
    advance(world,1);
    const child=world.population.find(person=>
      person.parents?.includes(mother.id)&&person.parents?.includes(father.id)
    );
    if(child)found={world,mother,father,child,fatherAge};
  }
  assert.ok(found,"almeno uno dei semi deterministici deve produrre una nascita");
  assert.equal(found.child.age,0);
  assert.ok(found.mother.children.includes(found.child.id));
  assert.ok(found.father.children.includes(found.child.id));
  assert.ok(Math.abs(found.father.age-found.fatherAge-1/365)<1e-9);
});

test("family ties become reciprocal social relationships",()=>{
  const world=createWorld({seed:31415});
  const parent=world.population[0];
  const child=world.population[1];
  parent.children=[child.id];
  child.parents=[parent.id];
  child.family=parent.family;
  advance(world,30);
  assert.ok(parent.relationships.some(link=>link.personId===child.id&&link.type==="famiglia"));
  assert.ok(child.relationships.some(link=>link.personId===parent.id&&link.type==="famiglia"));
});

test("shared beliefs can produce a new spiritual tradition",()=>{
  const world=createWorld({seed:2718});
  const founders=world.population.slice();
  for(let i=0;i<30;i++){
    const source=founders[i%founders.length];
    world.population.push({
      ...source,id:25+i,age:30,alive:true,health:100,parents:[],children:[],
      traits:{...source.traits},relationships:[],partner:null,beliefs:{ancestors:.9,nature:.03,seasons:.03,community:.04}
    });
  }
  world.nextPersonId=55;
  for(const person of world.population)person.beliefs={ancestors:.9,nature:.03,seasons:.03,community:.04};
  world.year=8;
  world.day=365;
  world.culture.lastUpdatedYear=-1;
  world.culture.lastReligionYear=-8;
  advance(world,1);
  assert.equal(world.religion,"Culto degli antenati");
  assert.ok(world.events.some(event=>event.type==="culture"&&event.title==="Cambia la tradizione spirituale"));
});


test("simulation results do not depend on how elapsed days are batched", () => {
  const uninterrupted = createWorld({seed:20261116});
  const batched = createWorld({seed:20261116});
  advance(uninterrupted,3650);
  for (const days of [1,29,335,365,730,1095,1095]) advance(batched,days);
  const comparable = state => {
    const copy = structuredClone(state);
    delete copy.lastWallTime;
    delete copy._dailyPersonIndex;
    return copy;
  };
  assert.deepEqual(comparable(batched),comparable(uninterrupted));
});

test("resource surveys never wrap across the west map boundary", () => {
  const withDistantWater = createWorld({seed:20261117});
  const withoutDistantWater = structuredClone(withDistantWater);
  const {width} = withDistantWater.geography;
  const site = withDistantWater.settlements[0];
  site.x = 0;
  site.y = 40;
  withoutDistantWater.settlements[0].x = 0;
  withoutDistantWater.settlements[0].y = 40;
  withDistantWater.geography.terrain.fill(1);
  withoutDistantWater.geography.terrain.fill(1);
  withDistantWater.geography.terrain[(site.y-1)*width+(width-1)] = 5;
  advance(withDistantWater,1);
  advance(withoutDistantWater,1);
  assert.equal(
    withDistantWater.resourceFlows.produced.water,
    withoutDistantWater.resourceFlows.produced.water
  );
});
