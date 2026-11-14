import test from "node:test";
import assert from "node:assert/strict";
import {createWorld,advance,refreshWorldNames} from "./engine.js";

test("la comunità iniziale comprende adulti e giovani senza anziani",()=>{
 const world=createWorld();
 assert.equal(world.population.length,24);
 assert.ok(world.population.every(person=>person.age>=8&&person.age<51));
});

test("le tecnologie modificano concretamente la produzione",()=>{
 const basic=createWorld(),advanced=createWorld();
 advanced.technology.push("Agricoltura","Irrigazione","Mulino ad acqua","Bronzo","Ferro","Vetro","Macchine semplici","Calendario","Scuola");
 advance(basic,1);advance(advanced,1);
 assert.ok(advanced.food>basic.food,"la civiltà tecnologicamente avanzata deve produrre più risorse");
});

test("ogni insediamento mantiene scorte proprie",()=>{
 const world=createWorld();
 const settlement={id:2,name:null,latitude:1,longitude:2,x:80,y:43,kind:"accampamento",homes:8,fields:0,stores:100,water:400,knownArea:4,population:8,foundingYear:0};
 world.settlements.push(settlement);
 for(const person of world.population.slice(0,8))person.settlementId=2;
 advance(world,1);
 assert.notEqual(world.settlements[0].stores,world.settlements[1].stores);
 assert.equal(Math.round(world.food),Math.round(world.settlements.reduce((sum,site)=>sum+site.stores,0)));
});

test("la popolazione morta viene compattata senza perdere gli antenati dei viventi",()=>{
 const world=createWorld();
 const parentId=world.nextPersonId++;
 world.population.push({id:parentId,alive:false,parents:[],children:[world.population[0].id]});
 world.population[0].parents=[parentId];
 for(let i=0;i<15001;i++)world.population.push({id:world.nextPersonId++,alive:false,parents:[]});
 world.deadCount=15002;
 advance(world,1);
 assert.ok(world.population.length<100,"i morti non devono restare nell'array attivo");
 assert.deepEqual(world.familyArchive[parentId],[]);
 assert.ok(world.archivedDeaths>=15000);
});

test("i nomi esistenti vengono rigenerati usando parole reali del dizionario",()=>{
 const world=createWorld();
 world.year=20;
 world.nameWords=["fiume","foresta","montagna","valle","pietra","sorgente"];
 world.settlements[0].name="Ludun";
 world.civilizationName="Kesti";
 world.civilizationNameHistory=[{name:"Kesti",fromYear:2,toYear:null}];
 world.neighbors[0].discovered=true;
 world.neighbors[0].name="Clan delle Colline";
 assert.equal(refreshWorldNames(world),true);
 assert.ok(world.nameWords.includes(world.settlements[0].name.toLocaleLowerCase()));
 assert.ok(world.nameWords.includes(world.civilizationName.toLocaleLowerCase()));
 assert.notEqual(world.settlements[0].name,"Ludun");
 assert.notEqual(world.civilizationName,"Kesti");
 assert.equal(world.civilizationNameHistory.at(-1).name,world.civilizationName);
 assert.equal(refreshWorldNames(world),false);
});
