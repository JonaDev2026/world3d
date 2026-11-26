import test from "node:test";
import assert from "node:assert/strict";
import {
  SIMULATION_CAPABILITIES,
  advanceDays,
  assertWorldInvariants,
  createWorld,
  deserializeWorld,
  historySince,
  serializeWorld,
  worldSummary
} from "../engine.mjs";

function supportSuccessionLaw(world) {
  const settlement = world.settlements[0];
  for (const id of settlement.governance.councilMemberIds) {
    const member = world.people.find((person) => person.id === id);
    member.culture.cooperation = 1;
    member.skills.leadership = 1;
  }
  settlement.resources.food = 100000;
  settlement.resources.water = 100000;
  for (const person of world.people) person.health = 100;
}

test("il consiglio approva la norma successoria con una maggioranza favorevole", () => {
  const world = createWorld({ seed: "law-vote", population: 16 });
  supportSuccessionLaw(world);
  world.day = 366;
  advanceDays(world, 1);

  const law = world.settlements[0].governance.laws.find((item) => item.code === "successione_familiare");
  assert.ok(law);
  assert.equal(law.active, true);
  assert.ok(law.votes.length > 0);
  assert.ok(law.votes.every((vote) => vote.inFavor));
  assert.ok(historySince(world, 0).some((event) => event.type === "legge_approvata"));
  assert.equal(SIMULATION_CAPABILITIES.lawsAndJustice, "basic");
  assertWorldInvariants(world);
});

test("la successione distribuisce il patrimonio agli eredi accertati", () => {
  const world = createWorld({ seed: "inheritance-distribution", population: 16 });
  const settlement = world.settlements[0];
  supportSuccessionLaw(world);
  world.day = 366;
  advanceDays(world, 1);

  const deceased = world.people.find((person) => person.partnerId !== null);
  assert.ok(deceased);
  const partner = world.people.find((person) => person.id === deceased.partnerId);
  const previousWealth = partner.wealth;
  deceased.wealth = 12;
  deceased.health = 0;
  advanceDays(world, 1);

  const justiceCase = settlement.governance.justiceCases.find((item) => item.deceasedPersonId === deceased.id);
  assert.ok(justiceCase);
  assert.equal(justiceCase.status, "risolta");
  assert.ok(justiceCase.resolution.recipientIds.includes(partner.id));
  assert.ok(partner.wealth > previousWealth);
  assert.equal(deceased.wealth, 0);
  assert.ok(historySince(world, 366).some((event) =>
    event.type === "sentenza_successoria" && event.personIds.includes(deceased.id)));
  assert.equal(worldSummary(world).resolvedJusticeCases, 1);
  assertWorldInvariants(world);
});

test("le cause successorie restano sospese e vengono definite dopo l'approvazione della norma", () => {
  const world = createWorld({ seed: "pending-inheritance", population: 16 });
  const settlement = world.settlements[0];
  supportSuccessionLaw(world);
  const deceased = world.people.find((person) => person.partnerId !== null);
  assert.ok(deceased);
  deceased.wealth = 9;
  deceased.health = 0;
  advanceDays(world, 1);

  const justiceCase = settlement.governance.justiceCases.find((item) => item.deceasedPersonId === deceased.id);
  assert.ok(justiceCase);
  assert.equal(justiceCase.status, "in_attesa_di_norma");
  assert.equal(worldSummary(world).pendingJusticeCases, 1);

  world.day = 366;
  advanceDays(world, 1);
  assert.equal(justiceCase.status, "risolta");
  assert.equal(worldSummary(world).pendingJusticeCases, 0);
  assert.equal(worldSummary(world).resolvedJusticeCases, 1);
  assertWorldInvariants(world);
});

test("senza eredi la sentenza trasferisce il patrimonio al fondo comunitario", () => {
  const world = createWorld({ seed: "unclaimed-estate", population: 16 });
  const settlement = world.settlements[0];
  supportSuccessionLaw(world);
  world.day = 366;
  advanceDays(world, 1);

  const deceased = world.people.find((person) => person.partnerId === null && person.childIds.length === 0);
  assert.ok(deceased);
  const treasuryBefore = settlement.resources.treasury;
  deceased.wealth = 7;
  deceased.health = 0;
  advanceDays(world, 1);

  const justiceCase = settlement.governance.justiceCases.find((item) => item.deceasedPersonId === deceased.id);
  assert.equal(justiceCase.status, "risolta");
  assert.deepEqual(justiceCase.resolution.recipientIds, []);
  assert.equal(justiceCase.resolution.transferredToCommunity, 7);
  assert.equal(settlement.resources.treasury, treasuryBefore + 7);
  assertWorldInvariants(world);
});

test("uno snapshot dello schema 4 viene migrato allo schema 5", () => {
  const world = createWorld({ seed: "justice-migration", population: 12 });
  const legacy = JSON.parse(serializeWorld(world));
  legacy.schemaVersion = 4;
  delete legacy.nextIds.case;

  const restored = deserializeWorld(JSON.stringify(legacy));
  assert.equal(restored.schemaVersion, 5);
  assert.equal(restored.nextIds.case, 1);
  assert.deepEqual(restored.settlements[0].governance.justiceCases, []);
  assertWorldInvariants(restored);
});
