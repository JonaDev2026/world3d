import test from "node:test";
import assert from "node:assert/strict";
import {generatePlanet,planetStats,latLonOf,cellAt,exportPlanet,importPlanet} from "./planet.js";
import {createWorld} from "./engine.js";
test("stesso seed produce lo stesso pianeta",()=>{const a=generatePlanet(123456,{w:120,h:60}),b=generatePlanet(123456,{w:120,h:60});assert.deepEqual(a.alt,b.alt);assert.deepEqual(a.terrain,b.terrain);assert.deepEqual(a.river,b.river);});
test("il pianeta contiene terre, oceani e biomi",()=>{const p=generatePlanet(42,{w:120,h:60}),stats=planetStats(p);assert.ok(stats.landFraction>.2&&stats.landFraction<.45);assert.ok(stats.landmasses>0);assert.ok(p.terrain.some(t=>t===0));assert.ok(p.terrain.some(t=>t!==0&&t!==5));});
test("salvataggio e ripristino mantengono il pianeta",()=>{const p=generatePlanet(77,{w:90,h:45}),copy=importPlanet(exportPlanet(p));assert.equal(copy.seed,p.seed);assert.deepEqual(copy.alt,p.alt);assert.deepEqual(copy.terrain,p.terrain);});
test("il motore usa la geografia del pianeta nel territorio iniziale",()=>{const p=generatePlanet(991,{w:180,h:90});let c=-1;for(let i=0;i<p.alt.length;i++){const ll=latLonOf(p,i);if(p.alt[i]>0&&p.terrain[i]!==5&&Math.abs(ll.latitude)<80){c=i;break;}}assert.ok(c>=0);const point=latLonOf(p,c),world=createWorld({...point,planet:p});const center=world.geography.terrain[43*world.geography.width+62];assert.equal(center,p.terrain[cellAt(p,point.latitude,point.longitude)]);assert.equal(world.planet.seed,p.seed);});
