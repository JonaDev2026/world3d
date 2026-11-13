import test from "node:test";
import assert from "node:assert/strict";
import { createWorld, advance, summary, validateWorld } from "../engine.js";

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
