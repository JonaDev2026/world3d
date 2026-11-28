import test from "node:test";
import assert from "node:assert/strict";
import { SIMULATION_CAPABILITIES, advanceDays, assertWorldInvariants, createWorld, deserializeWorld, serializeWorld, worldSummary } from "../engine.mjs";

function prepareMigrationWorld(seed = "family-migration", population = 120) {
  const world = createWorld({ seed, population }), origin = world.settlements[0];
  world.day = 366;
  Object.assign(origin.resources, { food: 100000, water: 100000, wood: 10000, stone: 10000, tools: 1000, treasury: 1000 });
  origin.knowledge = 700; origin.technologies = ["agricoltura", "irrigazione"]; origin.fields = 24;
  const first = world.people[0], second = world.people[1], child = world.people[2];
  for (const person of [first, second, child]) {
    if (person.partnerId !== null) {
      const formerPartner = world.people.find((candidate) => candidate.id === person.partnerId);
      if (formerPartner) formerPartner.partnerId = null;
    }
    person.partnerId = null;
  }
  first.partnerId = second.id; second.partnerId = first.id;
  first.ageDays = 30 * 365; second.ageDays = 30 * 365; child.ageDays = 10 * 365;
  child.parentIds = [first.id, second.id]; first.childIds.push(child.id); second.childIds.push(child.id); child.guardianId = first.id;
  for (const person of [first, second, child]) {
    person.culture.spirituality = 0.9; person.culture.tradition = 0.8; person.culture.beliefVector = [0.2, 0.4, 0.7];
  }
  const religion = { id: world.nextIds.religion++, settlementId: origin.id, name: "Tradizione locale",
    foundedDay: 0, extinctDay: null, founderIds: [first.id, second.id, child.id],
    tenets: { nature: 0.2, ancestors: 0.4, celestial: 0.7 }, lastAdherentCount: 3 };
  world.religions.push(religion); origin.religionIds.push(religion.id);
  for (const person of [first, second, child]) person.religionId = religion.id;
  return { world, origin, first, second, child, religion };
}

test("una comunità numerosa fonda un secondo insediamento trasferendo famiglie e risorse", () => {
  const { world, origin, first, second, child, religion } = prepareMigrationWorld();
  const initialPopulation = world.people.filter((person) => person.alive).length;
  advanceDays(world, 1);
  assert.equal(world.settlements.length, 2);
  const destination = world.settlements.find((settlement) => settlement.id !== origin.id);
  const migrants = world.people.filter((person) => person.alive && person.settlementId === destination.id);
  assert.ok(migrants.length >= 12 && migrants.length <= 24 && migrants.length < initialPopulation);
  assert.equal(first.settlementId, destination.id); assert.equal(second.settlementId, destination.id);
  assert.equal(child.settlementId, destination.id); assert.equal(first.partnerId, second.id);
  assert.equal(second.partnerId, first.id); assert.equal(child.guardianId, first.id);
  const branch = world.religions.find((candidate) => candidate.id === first.religionId && candidate.id !== religion.id);
  assert.ok(branch); assert.equal(branch.settlementId, destination.id); assert.ok(destination.religionIds.includes(branch.id));
  assert.equal(first.religionId, second.religionId); assert.equal(first.religionId, child.religionId);
  assert.ok(destination.resources.food > 0 && destination.resources.water > 0);
  assert.ok(destination.technologies.includes("agricoltura") && destination.fields > 0);
  assert.ok(destination.governance.councilMemberIds.length > 0);
  assert.equal(worldSummary(world).migrations, 1);
  assert.ok(world.events.some((event) => event.type === "fondazione_insediamento"));
  assert.ok(world.events.some((event) => event.type === "migrazione"));
  assertWorldInvariants(world);
});

test("la migrazione è deterministica e resta identica dopo un checkpoint", () => {
  const whole = prepareMigrationWorld("migration-checkpoint").world;
  const split = prepareMigrationWorld("migration-checkpoint").world;
  advanceDays(whole, 1); advanceDays(split, 1);
  const restored = deserializeWorld(serializeWorld(split));
  advanceDays(whole, 420); advanceDays(restored, 420);
  assert.equal(serializeWorld(restored), serializeWorld(whole));
  assertWorldInvariants(restored);
});

test("non vengono fondati insediamenti senza popolazione sufficiente o senza risorse", () => {
  const small = createWorld({ seed: "migration-small", population: 80 }), smallSettlement = small.settlements[0];
  small.day = 366; smallSettlement.technologies = ["agricoltura"]; smallSettlement.fields = 10;
  Object.assign(smallSettlement.resources, { food: 100000, water: 100000, wood: 10000, stone: 10000, tools: 1000, treasury: 1000 });
  advanceDays(small, 1); assert.equal(small.settlements.length, 1);
  const scarce = createWorld({ seed: "migration-scarce", population: 120 }), scarceSettlement = scarce.settlements[0];
  scarce.day = 366; scarceSettlement.technologies = ["agricoltura"]; scarceSettlement.fields = 10;
  Object.assign(scarceSettlement.resources, { food: 0, water: 0, wood: 0, stone: 0, tools: 0, treasury: 0 });
  advanceDays(scarce, 1); assert.equal(scarce.settlements.length, 1);
  assertWorldInvariants(small); assertWorldInvariants(scarce);
});

test("le cause successorie pendenti impediscono di selezionare i relativi familiari", () => {
  const { world, origin } = prepareMigrationWorld("migration-justice-protection", 121);
  const protectedPerson = world.people[0], deceased = world.people[120];
  deceased.alive = false; deceased.diedDay = world.day; deceased.health = 0;
  origin.governance.justiceCases.push({
    id: world.nextIds.case++, kind: "successione", openedDay: world.day, deceasedPersonId: deceased.id,
    heirIds: [protectedPerson.id], estate: 4, status: "in_attesa_di_norma", resolvedDay: null, resolution: null
  });
  for (const id of origin.governance.councilMemberIds) {
    const member = world.people.find((person) => person.id === id);
    member.culture.cooperation = 0; member.skills.leadership = 0;
  }
  advanceDays(world, 1);
  assert.equal(protectedPerson.settlementId, origin.id);
  assert.equal(world.settlements.length, 2);
  assertWorldInvariants(world);
});

test("i salvataggi schema 5 vengono migrati e ricevono una finestra di assestamento", () => {
  const world = createWorld({ seed: "migration-schema", population: 16 });
  world.day = 100;
  const legacy = JSON.parse(serializeWorld(world)); legacy.schemaVersion = 5;
  for (const settlement of legacy.settlements) delete settlement.migrationCooldownUntil;
  const restored = deserializeWorld(JSON.stringify(legacy));
  assert.equal(restored.schemaVersion, 7); assert.equal(restored.settlements[0].migrationCooldownUntil, 465);
  assert.equal(SIMULATION_CAPABILITIES.migration, "basic"); assertWorldInvariants(restored);
});
