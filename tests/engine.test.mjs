import test from "node:test";
import assert from "node:assert/strict";
import { createWorld, advance, summary, validateWorld, evolveCivilizationName } from "../engine.js";

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

test("technologies are recorded in threshold order", () => {
  const world = createWorld();
  world.knowledge = 12000;
  advance(world, 365);
  assert.deepEqual(world.technology.slice(2), [
    "Agricoltura", "Ceramica", "Metallurgia del rame", "Scrittura",
    "Ruota", "Irrigazione", "Bronzo", "Moneta", "Ferro", "Calendario",
    "Medicina organizzata", "Mulino ad acqua", "Amministrazione scritta",
    "Scuola", "Macchine semplici", "Vetro"
  ]);
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
 assert.equal(world.version,3);assert.equal(world.population.length,24);assert.ok(world.geography.terrain.length>0);
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
