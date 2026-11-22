import test from "node:test";
import assert from "node:assert/strict";
import {
  SIMULATION_CAPABILITIES,
  advanceDays,
  assertWorldInvariants,
  calendarDate,
  createWorld,
  dayIndexFromDate,
  deserializeWorld,
  historySince,
  isLeapYear,
  serializeWorld,
  worldSummary
} from "../engine.mjs";

test("il calendario usa l'Anno 0 e applica le regole gregoriane", () => {
  assert.equal(isLeapYear(0), true);
  assert.equal(isLeapYear(100), false);
  assert.equal(isLeapYear(400), true);
  assert.deepEqual(calendarDate(0), { year: 0, month: 1, day: 1, dayOfYear: 0, dayIndex: 0 });
  assert.deepEqual(calendarDate(59), { year: 0, month: 2, day: 29, dayOfYear: 59, dayIndex: 59 });
  assert.deepEqual(calendarDate(366), { year: 1, month: 1, day: 1, dayOfYear: 0, dayIndex: 366 });
  assert.equal(dayIndexFromDate({ year: 0, month: 2, day: 29 }), 59);
  assert.equal(dayIndexFromDate({ year: 1, month: 1, day: 1 }), 366);
});

test("la creazione del mondo è riproducibile a parità di seme", () => {
  const first = createWorld({ seed: "delta", population: 36 });
  const second = createWorld({ seed: "delta", population: 36 });
  assert.equal(serializeWorld(first), serializeWorld(second));
});

test("avanzare in blocchi o in un'unica esecuzione produce lo stesso stato", () => {
  const whole = createWorld({ seed: 2026, population: 44 });
  const chunks = createWorld({ seed: 2026, population: 44 });
  advanceDays(whole, 3650);
  for (const block of [17, 83, 120, 1, 200, 109, 200, 365, 365, 365, 365, 365, 365, 365, 365]) advanceDays(chunks, block);
  assert.equal(serializeWorld(chunks), serializeWorld(whole));
});

test("un checkpoint JSON conserva lo stato del generatore e la continuazione", () => {
  const original = createWorld({ seed: "checkpoint", population: 32 });
  advanceDays(original, 145);
  const restored = deserializeWorld(serializeWorld(original));
  advanceDays(original, 180);
  advanceDays(restored, 180);
  assert.equal(serializeWorld(restored), serializeWorld(original));
});

test("le persone invecchiano e le decisioni producono e consumano risorse", () => {
  const world = createWorld({ seed: "needs", population: 24 });
  const person = world.people[0];
  const initialAge = person.ageDays;
  const initialResources = { ...world.settlements[0].resources };
  advanceDays(world, 12);
  assert.equal(person.ageDays, initialAge + 12);
  assert.ok(["agricoltura", "raccolta", "acqua", "legname", "estrazione", "artigianato", "ricerca", "cura", "socialita"].includes(person.decision));
  assert.ok(Object.values(world.settlements[0].resources).every((value) => Number.isFinite(value) && value >= 0));
  assert.notDeepEqual(world.settlements[0].resources, initialResources);
});

test("la morte conserva la persona nella memoria e aggiorna la cronologia", () => {
  const world = createWorld({ seed: "mortality", population: 12 });
  const person = world.people[0];
  person.health = 0;
  advanceDays(world, 1);
  assert.equal(person.alive, false);
  assert.equal(person.diedDay, 0);
  const death = historySince(world, 0).find((event) => event.type === "morte" && event.personIds.includes(person.id));
  assert.ok(death);
  assert.equal(worldSummary(world).deaths, 1);
});

test("la nascita registra entrambi i genitori e relazioni reciproche", () => {
  const world = createWorld({ seed: "families", population: 80 });
  const settlement = world.settlements[0];
  assert.ok(world.people.every((person) => person.bornDay === null));
  settlement.resources.food = 100000;
  settlement.resources.water = 100000;
  for (const person of world.people) {
    person.health = 100;
    person.needs.social = 0;
    if (person.partnerId !== null) person.ageDays = 28 * 365;
  }
  advanceDays(world, 2500);
  const children = world.people.filter((person) => person.parentIds.length === 2);
  assert.ok(children.length > 0, "il test deve produrre almeno una nascita");
  for (const child of children) {
    assert.ok(Number.isSafeInteger(child.bornDay));
    const [motherId, fatherId] = child.parentIds;
    assert.ok(world.people.find((person) => person.id === motherId).childIds.includes(child.id));
    assert.ok(world.people.find((person) => person.id === fatherId).childIds.includes(child.id));
  }
  assertWorldInvariants(world);
});

test("la ricerca può sbloccare una tecnologia con i prerequisiti soddisfatti", () => {
  const world = createWorld({ seed: "research", population: 16 });
  world.settlements[0].knowledge = 120;
  advanceDays(world, 1);
  assert.ok(world.settlements[0].technologies.includes("agricoltura"));
  assert.ok(world.settlements[0].fields >= 2);
  assert.ok(historySince(world, 0).some((event) => event.type === "innovazione"));
});

test("un focolaio può trasmettersi e viene registrato nella memoria", () => {
  const world = createWorld({ seed: "epidemic", population: 60 });
  const settlement = world.settlements[0];
  const pathogen = world.pathogens[0];
  pathogen.transmissibility = 1;
  const patient = world.people[0];
  patient.infection = { pathogenId: pathogen.id, remainingDays: 20, severity: 0.01 };
  advanceDays(world, 8);
  assert.ok(world.people.some((person) => person.infection?.pathogenId === pathogen.id));
  assert.ok(historySince(world, 0).some((event) => event.type === "epidemia"));
});

test("il consiglio viene ricostituito se tutti i membri muoiono", () => {
  const world = createWorld({ seed: "council", population: 18 });
  const settlement = world.settlements[0];
  const formerMembers = new Set(settlement.governance.councilMemberIds);
  for (const person of world.people) if (formerMembers.has(person.id)) person.health = 0;
  advanceDays(world, 1);
  assert.ok(settlement.governance.councilMemberIds.length > 0);
  const leader = world.people.find((person) => person.id === settlement.governance.councilMemberIds[0]);
  assert.ok(leader?.alive);
});

test("il consiglio rimuove i membri deceduti senza perdere quelli vivi", () => {
  const world = createWorld({ seed: "council-partial", population: 80 });
  const settlement = world.settlements[0];
  const original = [...settlement.governance.councilMemberIds];
  assert.ok(original.length > 1);
  const deceasedId = original[0];
  world.people.find((person) => person.id === deceasedId).health = 0;
  advanceDays(world, 1);
  assert.ok(!settlement.governance.councilMemberIds.includes(deceasedId));
  assert.ok(settlement.governance.councilMemberIds.length > 0);
});

test("le capacità dichiarate distinguono i sistemi parziali o non implementati", () => {
  assert.equal(SIMULATION_CAPABILITIES.deterministicRandomness, true);
  assert.equal(SIMULATION_CAPABILITIES.yearZeroCalendar, true);
  assert.equal(SIMULATION_CAPABILITIES.institutionsAndJustice, "partial");
  assert.equal(SIMULATION_CAPABILITIES.emergentCultureAndReligion, "not_implemented");
  assert.equal(SIMULATION_CAPABILITIES.diplomacyWarAndMigration, "not_implemented");
  assert.equal(SIMULATION_CAPABILITIES.browserPersistenceAndOfflineCatchup, "not_implemented");
});

test("le invarianti rifiutano una relazione di coppia incoerente", () => {
  const world = createWorld({ seed: "invariants", population: 16 });
  const paired = world.people.find((person) => person.partnerId !== null);
  assert.ok(paired);
  paired.partnerId = null;
  assert.throws(() => assertWorldInvariants(world), /non reciproca/);
});
