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
    assert.equal(child.guardianId, motherId);
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
  assert.equal(SIMULATION_CAPABILITIES.familyGuardianship, "basic");
  assert.equal(SIMULATION_CAPABILITIES.outbreakLifecycle, true);
  assert.equal(SIMULATION_CAPABILITIES.yearZeroCalendar, true);
  assert.equal(SIMULATION_CAPABILITIES.resourceProductionAndConsumption, "basic");
  assert.equal(SIMULATION_CAPABILITIES.economyAndTrade, "partial");
  assert.equal(SIMULATION_CAPABILITIES.institutions, "partial");
  assert.equal(SIMULATION_CAPABILITIES.lawsAndJustice, "basic");
  assert.equal(SIMULATION_CAPABILITIES.inheritanceAndSuccession, "basic");
  assert.equal(SIMULATION_CAPABILITIES.emergentCultureAndReligion, "basic");
  assert.equal(SIMULATION_CAPABILITIES.religiousAffiliationChanges, true);
  assert.equal(SIMULATION_CAPABILITIES.settlements, "single_settlement");
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


test("un focolaio viene registrato una volta, concluso e poi rilevato di nuovo", () => {
  const world = createWorld({ seed: "outbreak-lifecycle", population: 20 });
  const settlement = world.settlements[0];
  const pathogen = world.pathogens[0];
  pathogen.transmissibility = 0;
  pathogen.duration = 2;
  const patient = world.people[0];

  patient.infection = { pathogenId: pathogen.id, remainingDays: 2, severity: 0.01 };
  advanceDays(world, 2);
  assert.deepEqual(settlement.health.activeOutbreaks, []);
  assert.equal(historySince(world, 0).filter((event) => event.type === "epidemia").length, 1);
  assert.equal(historySince(world, 0).filter((event) => event.type === "fine_epidemia").length, 1);

  patient.immunity = [];
  patient.infection = { pathogenId: pathogen.id, remainingDays: 2, severity: 0.01 };
  advanceDays(world, 2);
  assert.deepEqual(settlement.health.activeOutbreaks, []);
  assert.equal(historySince(world, 0).filter((event) => event.type === "epidemia").length, 2);
  assert.equal(historySince(world, 0).filter((event) => event.type === "fine_epidemia").length, 2);
  assertWorldInvariants(world);
});

test("la migrazione dello snapshot v1 conserva i focolai già attivi senza duplicare eventi", () => {
  const world = createWorld({ seed: "legacy-health", population: 16 });
  const patient = world.people[0];
  patient.infection = { pathogenId: world.pathogens[0].id, remainingDays: 8, severity: 0.01 };

  const legacy = JSON.parse(serializeWorld(world));
  legacy.schemaVersion = 1;
  delete legacy.religions;
  delete legacy.nextIds.religion;
  for (const person of legacy.people) {
    delete person.culture;
    delete person.religionId;
  }
  for (const settlement of legacy.settlements) {
    delete settlement.health;
    delete settlement.religionIds;
  }

  const restored = deserializeWorld(JSON.stringify(legacy));
  assert.equal(restored.schemaVersion, 5);
  assert.deepEqual(restored.settlements[0].health.activeOutbreaks, [world.pathogens[0].id]);
  advanceDays(restored, 1);
  assert.equal(historySince(restored, 0).filter((event) => event.type === "epidemia").length, 0);
});

test("le invarianti rifiutano focolai duplicati o riferiti a patogeni inesistenti", () => {
  const world = createWorld({ seed: "health-invariants", population: 12 });
  const active = world.settlements[0].health.activeOutbreaks;
  active.push(world.pathogens[0].id, world.pathogens[0].id);
  assert.throws(() => assertWorldInvariants(world), /Focolai duplicati/);
  active.splice(0, active.length, "patogeno_inesistente");
  assert.throws(() => assertWorldInvariants(world), /Patogeno sconosciuto/);
});


test("un individuo guarito non trasmette nel giorno in cui termina l'infezione", () => {
  const world = createWorld({ seed: "recovery-day", population: 24 });
  const settlement = world.settlements[0];
  const pathogen = world.pathogens[0];
  pathogen.transmissibility = 1;
  pathogen.duration = 1;
  const patient = world.people[0];
  patient.infection = { pathogenId: pathogen.id, remainingDays: 1, severity: 0.01 };

  advanceDays(world, 1);
  assert.equal(patient.infection, null);
  assert.ok(world.people.every((person) => person.id === patient.id || person.infection === null));
  assert.deepEqual(settlement.health.activeOutbreaks, []);
  assert.equal(historySince(world, 0).filter((event) => event.type === "epidemia").length, 1);
  assert.equal(historySince(world, 0).filter((event) => event.type === "fine_epidemia").length, 1);
});


test("la popolazione mantiene l'accesso a cibo e acqua durante il primo anno", () => {
  const world = createWorld({ seed: "resource-balance", population: 40 });
  advanceDays(world, 367);
  const settlement = world.settlements[0];
  assert.ok(world.people.filter((person) => person.alive).length >= 30);
  assert.ok(settlement.resources.food > 0);
  assert.ok(settlement.resources.water > 0);
});

test("culture convergenti possono generare tradizioni religiose distinte", () => {
  const world = createWorld({ seed: "plural-traditions", population: 40 });
  const settlement = world.settlements[0];
  for (let index = 0; index < world.people.length; index += 1) {
    const person = world.people[index];
    person.culture.spirituality = 0.9;
    person.culture.tradition = 0.8;
    person.culture.beliefVector = index < 20 ? [0.08, 0.1, 0.12] : [0.9, 0.92, 0.94];
    person.religionId = null;
  }
  advanceDays(world, 367);
  const traditions = world.religions.filter((religion) => religion.settlementId === settlement.id && religion.extinctDay === null);
  assert.equal(traditions.length, 2);
  for (const tradition of traditions) {
    const adherents = world.people.filter((person) => person.alive && person.religionId === tradition.id);
    assert.equal(adherents.length, 20);
  }
  assert.equal(historySince(world, 0).filter((event) => event.type === "religione_emersa").length, 2);
  assert.equal(worldSummary(world).religions, 2);
  assertWorldInvariants(world);
});

test("le credenze e le tradizioni restano deterministiche dopo un checkpoint", () => {
  const whole = createWorld({ seed: "culture-checkpoint", population: 40 });
  const split = createWorld({ seed: "culture-checkpoint", population: 40 });
  advanceDays(whole, 900);
  advanceDays(split, 410);
  const restored = deserializeWorld(serializeWorld(split));
  advanceDays(restored, 490);
  assert.equal(serializeWorld(restored), serializeWorld(whole));
});

test("uno snapshot v2 senza profili culturali viene migrato allo schema corrente", () => {
  const world = createWorld({ seed: "culture-migration", population: 16 });
  const legacy = JSON.parse(serializeWorld(world));
  legacy.schemaVersion = 2;
  delete legacy.religions;
  delete legacy.nextIds.religion;
  for (const person of legacy.people) {
    delete person.culture;
    delete person.religionId;
  }
  for (const settlement of legacy.settlements) delete settlement.religionIds;
  const restored = deserializeWorld(JSON.stringify(legacy));
  assert.equal(restored.schemaVersion, 5);
  assert.equal(restored.religions.length, 0);
  assert.ok(restored.people.every((person) => person.culture && person.culture.beliefVector.length === 3));
  assertWorldInvariants(restored);
});

test("la cronologia distingue mortalità naturale e morte per salute critica", () => {
  const natural = createWorld({ seed: "natural-death-cause", population: 12 });
  const old = natural.people[0];
  old.ageDays = 1_000_000_000;
  old.needs.food = 0;
  old.needs.water = 0;
  advanceDays(natural, 1);
  const naturalEvent = historySince(natural, 0).find((event) => event.type === "morte" && event.personIds.includes(old.id));
  assert.equal(naturalEvent.causes[0].kind, "mortalita_naturale");
  assert.ok(naturalEvent.causes[0].healthBeforeDeath > 0);

  const critical = createWorld({ seed: "critical-death-cause", population: 12 });
  const patient = critical.people[0];
  patient.health = 0;
  advanceDays(critical, 1);
  const criticalEvent = historySince(critical, 0).find((event) => event.type === "morte" && event.personIds.includes(patient.id));
  assert.equal(criticalEvent.causes[0].kind, "salute_critica");
  assert.equal(criticalEvent.causes[0].healthBeforeDeath, 0);
});


test("la tutela passa al genitore superstite e poi a un nonno", () => {
  const world = createWorld({ seed: "guardianship-transfer", population: 12 });
  const [grandparent, parentA, parentB, child] = world.people;
  for (const person of world.people) {
    person.ageDays = 30 * 365;
    person.health = 100;
    person.needs.food = 0;
    person.needs.water = 0;
    if (person.partnerId !== null) {
      const partner = world.people.find((candidate) => candidate.id === person.partnerId);
      if (partner?.partnerId === person.id) partner.partnerId = null;
      person.partnerId = null;
    }
  }
  grandparent.ageDays = 60 * 365;
  child.ageDays = 10 * 365;
  parentA.parentIds = [grandparent.id];
  grandparent.childIds.push(parentA.id);
  parentA.childIds.push(child.id);
  parentB.childIds.push(child.id);
  child.parentIds = [parentA.id, parentB.id];
  child.guardianId = parentA.id;

  parentA.health = 0;
  advanceDays(world, 1);
  assert.equal(parentA.alive, false);
  assert.equal(child.guardianId, parentB.id);

  parentB.health = 0;
  advanceDays(world, 1);
  assert.equal(parentB.alive, false);
  assert.equal(child.guardianId, grandparent.id);
  assert.equal(historySince(world, 0).filter((event) => event.type === "tutela_affidata").length, 2);
  assertWorldInvariants(world);
});

test("la tutela termina al raggiungimento della maggiore età", () => {
  const world = createWorld({ seed: "guardianship-adulthood", population: 8 });
  const parent = world.people[0];
  const child = world.people[1];
  parent.ageDays = 30 * 365;
  parent.health = 100;
  child.ageDays = 6574;
  child.parentIds = [parent.id];
  parent.childIds.push(child.id);
  child.guardianId = parent.id;

  advanceDays(world, 1);
  assert.equal(child.guardianId, null);
  assert.ok(historySince(world, 0).some((event) => event.type === "tutela_cessata" && event.personIds.includes(child.id)));
  assertWorldInvariants(world);
});

test("la migrazione v3 assegna un genitore vivente come tutore dei minori", () => {
  const world = createWorld({ seed: "guardianship-migration", population: 12 });
  const parent = world.people[0];
  const child = world.people[1];
  parent.ageDays = 30 * 365;
  child.ageDays = 10 * 365;
  parent.childIds.push(child.id);
  child.parentIds = [parent.id];
  child.guardianId = parent.id;

  const legacy = JSON.parse(serializeWorld(world));
  legacy.schemaVersion = 3;
  for (const person of legacy.people) delete person.guardianId;
  const restored = deserializeWorld(JSON.stringify(legacy));
  assert.equal(restored.schemaVersion, 5);
  assert.equal(restored.people.find((person) => person.id === child.id).guardianId, parent.id);
  assertWorldInvariants(restored);
});

test("le invarianti rifiutano un tutore adulto non imparentato", () => {
  const world = createWorld({ seed: "guardianship-invariant", population: 12 });
  const parent = world.people[0];
  const child = world.people[1];
  const unrelated = world.people[2];
  parent.ageDays = 30 * 365;
  unrelated.ageDays = 30 * 365;
  child.ageDays = 10 * 365;
  parent.childIds.push(child.id);
  child.parentIds = [parent.id];
  child.guardianId = unrelated.id;
  assert.throws(() => assertWorldInvariants(world), /Tutore non valido/);
});


test("un minore senza parenti adulti disponibili resta senza tutela ed è registrato", () => {
  const world = createWorld({ seed: "guardianship-orphan", population: 8 });
  const parent = world.people[0];
  const child = world.people[1];
  for (const person of world.people) {
    person.ageDays = 30 * 365;
    person.health = 100;
    if (person.partnerId !== null) {
      const partner = world.people.find((candidate) => candidate.id === person.partnerId);
      if (partner?.partnerId === person.id) partner.partnerId = null;
      person.partnerId = null;
    }
  }
  parent.ageDays = 30 * 365;
  child.ageDays = 10 * 365;
  parent.childIds.push(child.id);
  child.parentIds = [parent.id];
  child.guardianId = parent.id;
  parent.health = 0;

  advanceDays(world, 1);
  assert.equal(child.guardianId, null);
  assert.ok(historySince(world, 0).some((event) => event.type === "minore_senza_tutore" && event.personIds.includes(child.id)));
  assertWorldInvariants(world);
});

test("le invarianti rifiutano un minore con un genitore idoneo ma senza tutore", () => {
  const world = createWorld({ seed: "guardianship-missing", population: 8 });
  const parent = world.people[0];
  const child = world.people[1];
  parent.ageDays = 30 * 365;
  child.ageDays = 10 * 365;
  parent.childIds.push(child.id);
  child.parentIds = [parent.id];
  child.guardianId = null;
  assert.throws(() => assertWorldInvariants(world), /Tutore mancante/);
});


test("una persona può abbandonare una tradizione quando cala la spiritualità", () => {
  const world = createWorld({ seed: "religion-disaffiliation", population: 40 });
  for (let index = 0; index < world.people.length; index += 1) {
    const person = world.people[index];
    person.culture.spirituality = 0.9;
    person.culture.tradition = 0.8;
    person.culture.beliefVector = index < 20 ? [0.08, 0.1, 0.12] : [0.9, 0.92, 0.94];
    person.religionId = null;
  }

  advanceDays(world, 367);
  const member = world.people.find((person) => person.religionId !== null);
  assert.ok(member);
  const formerReligionId = member.religionId;
  member.culture.spirituality = 0.1;
  advanceDays(world, 365);

  assert.equal(member.religionId, null);
  const event = historySince(world, 0).find((entry) =>
    entry.type === "abbandono_religioso" && entry.personIds.includes(member.id));
  assert.ok(event);
  assert.equal(event.causes[0].kind, "spiritualita_in_calo");
  assert.equal(event.effects[0].religionId, formerReligionId);
  assertWorldInvariants(world);
});

test("una persona può convertirsi quando le sue credenze convergono verso un'altra tradizione", () => {
  const world = createWorld({ seed: "religion-conversion", population: 40 });
  for (let index = 0; index < world.people.length; index += 1) {
    const person = world.people[index];
    person.culture.spirituality = 0.9;
    person.culture.tradition = 0.8;
    person.culture.beliefVector = index < 20 ? [0.05, 0.07, 0.09] : [0.91, 0.93, 0.95];
    person.religionId = null;
  }

  advanceDays(world, 367);
  const religions = world.religions.filter((religion) => religion.extinctDay === null);
  assert.equal(religions.length, 2);
  const member = world.people.find((person) => person.religionId === religions[0].id);
  assert.ok(member);
  const previousReligionId = member.religionId;
  const target = religions[1];
  member.culture.beliefVector = [target.tenets.nature, target.tenets.ancestors, target.tenets.celestial];
  member.culture.spirituality = 0.9;

  advanceDays(world, 365);
  assert.equal(member.religionId, target.id);
  const event = historySince(world, 0).find((entry) =>
    entry.type === "conversione_religiosa" && entry.personIds.includes(member.id));
  assert.ok(event);
  assert.equal(event.causes[0].religionePrecedente, previousReligionId);
  assert.equal(event.effects[0].nuovaReligione, target.id);
  assertWorldInvariants(world);
});
