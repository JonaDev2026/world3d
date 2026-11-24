import { isAdult, isValidGuardian, reassignGuardianships, selectGuardian } from "./kinship.mjs";

const SCHEMA_VERSION = 4;
const DAYS_PER_COMMON_YEAR = 365.2425;
const MONTH_LENGTHS_COMMON = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
const MONTH_LENGTHS_LEAP = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
const PATHOGENS = [
  { id: "febbre_comune", transmissibility: 0.12, severity: 0.12, duration: 10 },
  { id: "infezione_respiratoria", transmissibility: 0.08, severity: 0.18, duration: 14 }
];
const TECHNOLOGIES = [
  { id: "agricoltura", threshold: 120, requires: [] },
  { id: "irrigazione", threshold: 320, requires: ["agricoltura"] },
  { id: "metallurgia", threshold: 620, requires: ["agricoltura"] },
  { id: "scrittura", threshold: 900, requires: ["metallurgia"] },
  { id: "medicina", threshold: 540, requires: ["agricoltura"] }
];

function assert(condition, message) {
  if (!condition) throw new TypeError(message);
}

function hashSeed(seed) {
  if (typeof seed === "number" && Number.isFinite(seed)) return (Math.trunc(seed) >>> 0) || 0x9e3779b9;
  const text = String(seed ?? "world3d");
  let hash = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0 || 0x9e3779b9;
}

function random(world) {
  let x = world.rngState >>> 0;
  x ^= x << 13;
  x ^= x >>> 17;
  x ^= x << 5;
  world.rngState = x >>> 0;
  return world.rngState / 0x100000000;
}

function randomInt(world, min, max) {
  return min + Math.floor(random(world) * (max - min + 1));
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function isLeapYear(year) {
  assert(Number.isInteger(year) && year >= 0, "L'anno deve essere un intero non negativo");
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
}

export function calendarDate(dayIndex) {
  assert(Number.isSafeInteger(dayIndex) && dayIndex >= 0, "Il giorno deve essere un intero non negativo");
  let remaining = dayIndex;
  let year = 0;
  while (remaining >= (isLeapYear(year) ? 366 : 365)) {
    remaining -= isLeapYear(year) ? 366 : 365;
    year += 1;
  }
  const lengths = isLeapYear(year) ? MONTH_LENGTHS_LEAP : MONTH_LENGTHS_COMMON;
  let month = 0;
  while (remaining >= lengths[month]) {
    remaining -= lengths[month];
    month += 1;
  }
  return {
    year,
    month: month + 1,
    day: remaining + 1,
    dayOfYear: dayIndex - daysBeforeYear(year),
    dayIndex
  };
}

function daysBeforeYear(year) {
  const y = year;
  return 365 * y + Math.floor((y + 3) / 4) - Math.floor((y + 99) / 100) + Math.floor((y + 399) / 400);
}

export function dayIndexFromDate({ year, month, day }) {
  assert(Number.isInteger(year) && year >= 0, "Anno non valido");
  assert(Number.isInteger(month) && month >= 1 && month <= 12, "Mese non valido");
  const lengths = isLeapYear(year) ? MONTH_LENGTHS_LEAP : MONTH_LENGTHS_COMMON;
  assert(Number.isInteger(day) && day >= 1 && day <= lengths[month - 1], "Giorno non valido");
  return daysBeforeYear(year) + lengths.slice(0, month - 1).reduce((sum, value) => sum + value, 0) + day - 1;
}

function nextId(world, kind) {
  const id = world.nextIds[kind];
  world.nextIds[kind] += 1;
  return id;
}

function createPerson(world, settlementId, ageDays, sex, parentIds = []) {
  const id = nextId(world, "person");
  return {
    id,
    name: `Abitante ${id}`,
    sex,
    ageDays,
    bornDay: ageDays === 0 ? world.day : null,
    diedDay: null,
    alive: true,
    settlementId,
    parentIds: [...parentIds],
    childIds: [],
    partnerId: null,
    lastBirthDay: null,
    needs: { food: randomInt(world, 12, 32), water: randomInt(world, 12, 32), social: randomInt(world, 20, 55) },
    skills: {
      farming: random(world) * 0.7,
      gathering: 0.2 + random(world) * 0.8,
      building: random(world) * 0.6,
      medicine: random(world) * 0.35,
      research: random(world) * 0.35,
      leadership: random(world) * 0.6
    },
    culture: {
      cooperation: 0.2 + random(world) * 0.8,
      curiosity: 0.2 + random(world) * 0.8,
      spirituality: random(world),
      tradition: random(world),
      beliefVector: [random(world), random(world), random(world)]
    },
    religionId: null,
    guardianId: null,
    wealth: random(world) * 2,
    health: 75 + random(world) * 25,
    infection: null,
    immunity: [],
    decision: "riposo"
  };
}

function createSettlement(world, population) {
  const id = nextId(world, "settlement");
  const settlement = {
    id,
    name: `Insediamento ${id}`,
    x: randomInt(world, 8, 92),
    y: randomInt(world, 8, 92),
    foundedDay: world.day,
    resources: {
      food: population * 7,
      water: population * 7,
      wood: population * 3,
      stone: population * 1.5,
      tools: Math.max(2, population * 0.08),
      treasury: population * 0.2
    },
    fertility: 0.65 + random(world) * 0.7,
    fields: 0,
    knowledge: 0,
    technologies: [],
    governance: {
      councilMemberIds: [],
      legitimacy: 0.5,
      publicOrder: 0.75,
      laws: [],
      justiceCases: []
    },
    culture: {
      cooperation: 0.35 + random(world) * 0.4,
      curiosity: 0.25 + random(world) * 0.5,
      spirituality: 0.1 + random(world) * 0.5,
      tradition: 0.2 + random(world) * 0.5
    },
    religionIds: [],
    health: { activeOutbreaks: [] },
    statistics: { births: 0, deaths: 0, production: 0, consumed: 0 }
  };
  world.settlements.push(settlement);
  return settlement;
}

function recordEvent(world, type, summary, causes = [], effects = [], people = [], settlements = []) {
  const event = {
    id: nextId(world, "event"),
    day: world.day,
    date: calendarDate(world.day),
    type,
    summary,
    causes: causes.map((cause) => ({ ...cause })),
    effects: effects.map((effect) => ({ ...effect })),
    personIds: [...people],
    settlementIds: [...settlements]
  };
  world.events.push(event);
  return event;
}

function chooseInitialPartners(world, people) {
  const candidates = people.filter((person) => person.ageDays >= 18 * 365 && person.ageDays <= 48 * 365);
  const females = candidates.filter((person) => person.sex === "F");
  const males = candidates.filter((person) => person.sex === "M");
  const pairCount = Math.floor(Math.min(females.length, males.length) * 0.55);
  for (let i = 0; i < pairCount; i += 1) {
    const femaleIndex = randomInt(world, 0, females.length - 1);
    const maleIndex = randomInt(world, 0, males.length - 1);
    const female = females.splice(femaleIndex, 1)[0];
    const male = males.splice(maleIndex, 1)[0];
    if (female.partnerId === null && male.partnerId === null) {
      female.partnerId = male.id;
      male.partnerId = female.id;
    }
  }
}

export function createWorld({ seed = "world3d", population = 48 } = {}) {
  assert(Number.isInteger(population) && population >= 4 && population <= 5000, "La popolazione iniziale deve essere compresa tra 4 e 5000");
  const world = {
    schemaVersion: SCHEMA_VERSION,
    seed: String(seed),
    rngState: hashSeed(seed),
    day: 0,
    nextIds: { person: 1, settlement: 1, event: 1, religion: 1 },
    people: [],
    settlements: [],
    religions: [],
    pathogens: PATHOGENS.map((pathogen) => ({ ...pathogen })),
    events: [],
    createdAt: null,
    lastAdvancedAt: null
  };
  const settlement = createSettlement(world, population);
  for (let i = 0; i < population; i += 1) {
    const ageYears = randomInt(world, 2, 58);
    const sex = random(world) < 0.5 ? "F" : "M";
    world.people.push(createPerson(world, settlement.id, ageYears * 365 + randomInt(world, 0, 364), sex));
  }
  chooseInitialPartners(world, world.people);
  const leaders = [...world.people]
    .sort((a, b) => b.skills.leadership - a.skills.leadership || a.id - b.id)
    .slice(0, Math.min(3, Math.ceil(population / 20)));
  settlement.governance.councilMemberIds = leaders.map((person) => person.id);
  recordEvent(world, "fondazione", `È stato registrato ${settlement.name} con ${population} abitanti`,
    [{ kind: "condizioni_iniziali", seed: world.seed }],
    [{ kind: "insediamento_creato", settlementId: settlement.id }, { kind: "popolazione_iniziale", value: population }],
    world.people.map((person) => person.id), [settlement.id]);
  assertWorldInvariants(world);
  return world;
}

function livingInSettlement(world, settlementId) {
  return world.people.filter((person) => person.alive && person.settlementId === settlementId);
}

function seasonFactor(dayOfYear) {
  if (dayOfYear >= 70 && dayOfYear < 190) return 1.35;
  if (dayOfYear >= 190 && dayOfYear < 285) return 1.05;
  if (dayOfYear >= 285 || dayOfYear < 20) return 0.55;
  return 0.82;
}

function chooseDecision(world, person, settlement, population, season) {
  const foodDays = settlement.resources.food / Math.max(1, population);
  const waterDays = settlement.resources.water / Math.max(1, population);
  if (foodDays < 5 && waterDays < 5) return (person.id + world.day) % 2 === 0 ? "raccolta" : "acqua";
  if (person.needs.food > 48 || foodDays < 5) {
    return settlement.technologies.includes("agricoltura") && season > 0.7 ? "agricoltura" : "raccolta";
  }
  if (person.needs.water > 48 || waterDays < 5) return "acqua";
  if (settlement.resources.wood < population * 2.2) return "legname";
  if (settlement.resources.stone < population * 1.2) return "estrazione";
  if (settlement.resources.tools < population * 0.18 && settlement.resources.wood > 4 && settlement.resources.stone > 2) return "artigianato";
  if (foodDays > 5 && waterDays > 5 && random(world) < 0.035 + person.skills.research * 0.025) return "ricerca";
  if (person.infection || livingInSettlement(world, settlement.id).some((candidate) => candidate.infection)) return "cura";
  return "socialita";
}

function workOutput(person, decision, settlement, season) {
  const skill = person.skills;
  switch (decision) {
    case "agricoltura":
      return { food: (1.2 + skill.farming * 1.5) * settlement.fertility * season, skill: "farming" };
    case "raccolta":
      return { food: 1.45 + skill.gathering * 1.15, skill: "gathering" };
    case "acqua":
      return { water: 1.4 + skill.gathering * 1.1, skill: "gathering" };
    case "legname":
      return { wood: 0.7 + skill.building * 0.9, skill: "building" };
    case "estrazione":
      return { stone: 0.45 + skill.building * 0.75, skill: "building" };
    case "artigianato":
      return { tools: 0.08 + skill.building * 0.12, wood: -0.12, stone: -0.05, skill: "building" };
    case "ricerca":
      return { knowledge: 0.08 + skill.research * 0.3, skill: "research" };
    case "cura":
      return { care: 0.08 + skill.medicine * 0.18, skill: "medicine" };
    default:
      return { social: 1, skill: null };
  }
}

function applyProduction(world, settlement, workers, season) {
  const totals = { food: 0, water: 0, wood: 0, stone: 0, tools: 0, knowledge: 0, care: 0, social: 0 };
  for (const person of workers) {
    const output = workOutput(person, person.decision, settlement, season);
    for (const [key, value] of Object.entries(output)) {
      if (key === "skill") continue;
      if (Object.hasOwn(totals, key)) totals[key] += value;
      else if (key === "stone") totals.stone += value;
    }
    if (output.skill) person.skills[output.skill] = clamp(person.skills[output.skill] + 0.00008, 0, 1);
    if (person.decision === "socialita") person.needs.social = clamp(person.needs.social - 4, 0, 100);
     person.wealth += 0.012;
  }
  const caregivers = workers.filter((person) => person.decision === "cura");
  const patients = workers.filter((person) => person.infection).sort((a, b) => a.health - b.health || a.id - b.id);
  for (const caregiver of caregivers) {
    const patient = patients.find((candidate) => candidate.id !== caregiver.id && candidate.health < 100);
    if (patient) patient.health = clamp(patient.health + 0.05 + caregiver.skills.medicine * 0.12, 0, 100);
  }
  for (const key of ["food", "water", "wood", "stone", "tools"]) {
    settlement.resources[key] = Math.max(0, settlement.resources[key] + totals[key]);
  }
  settlement.knowledge += totals.knowledge;
  settlement.resources.treasury += workers.length * 0.0006;
  settlement.statistics.production += totals.food + totals.water + totals.wood + totals.stone + totals.tools;
  return totals;
}

function consumeNeeds(world, settlement, residents) {
  let consumed = 0;
  for (const person of residents) {
    person.needs.food = clamp(person.needs.food + 8, 0, 100);
    person.needs.water = clamp(person.needs.water + 10, 0, 100);
    person.needs.social = clamp(person.needs.social + 1.4, 0, 100);
    if (settlement.resources.food >= 1) {
      settlement.resources.food -= 1;
      person.needs.food = clamp(person.needs.food - 76, 0, 100);
      consumed += 1;
    } else {
      person.health = clamp(person.health - 2.8, 0, 100);
    }
    if (settlement.resources.water >= 1) {
      settlement.resources.water -= 1;
      person.needs.water = clamp(person.needs.water - 82, 0, 100);
      consumed += 1;
    } else {
      person.health = clamp(person.health - 3.5, 0, 100);
    }
    const partner = person.partnerId === null ? null : world.people.find((candidate) => candidate.id === person.partnerId);
    if (partner?.alive && partner.settlementId === person.settlementId) person.needs.social = clamp(person.needs.social - 1.2, 0, 100);
    if (person.needs.social > 92) person.health = clamp(person.health - 0.08, 0, 100);
    if (person.health > 0 && person.needs.food < 45 && person.needs.water < 45) person.health = clamp(person.health + 0.12, 0, 100);
    if (person.needs.food > 85 || person.needs.water > 85) person.health = clamp(person.health - 0.2, 0, 100);
  }
  settlement.statistics.consumed += consumed;
  return consumed;
}

function advanceHealth(world, settlement, residents) {
  const infectedByPathogen = new Map();
  const newCasesByPathogen = new Map();
  const activeOutbreaks = settlement.health.activeOutbreaks;

  for (const person of residents) {
    if (!person.infection) continue;
    const pathogen = world.pathogens.find((candidate) => candidate.id === person.infection.pathogenId);
    if (!pathogen) {
      person.infection = null;
      continue;
    }
    infectedByPathogen.set(pathogen.id, (infectedByPathogen.get(pathogen.id) ?? 0) + 1);
  }

  for (const pathogen of world.pathogens) {
    const activeCases = infectedByPathogen.get(pathogen.id) ?? 0;
    if (activeCases > 0 && !activeOutbreaks.includes(pathogen.id)) {
      activeOutbreaks.push(pathogen.id);
      recordEvent(world, "epidemia", `È stato rilevato un focolaio di ${pathogen.id}`,
        [{ kind: "contagio", pathogenId: pathogen.id, casiIniziali: activeCases }],
        [{ kind: "focolaio_attivo", pathogenId: pathogen.id, casi: activeCases }],
        residents.filter((person) => person.infection?.pathogenId === pathogen.id).map((person) => person.id),
        [settlement.id]);
    }
  }

  for (const person of residents) {
    if (!person.infection) continue;
    const infection = person.infection;
    const pathogen = world.pathogens.find((candidate) => candidate.id === infection.pathogenId);
    if (!pathogen) continue;
    person.health = clamp(person.health - infection.severity * (person.health < 35 ? 1.35 : 1), 0, 100);
    infection.remainingDays -= 1;
    if (infection.remainingDays <= 0 && person.alive) {
      person.infection = null;
      if (!person.immunity.includes(pathogen.id)) person.immunity.push(pathogen.id);
      recordEvent(world, "guarigione", `${person.name} è guarito da ${pathogen.id}`,
        [{ kind: "decorso_malattia", pathogenId: pathogen.id }],
        [{ kind: "immunita_acquisita", personId: person.id, pathogenId: pathogen.id }],
        [person.id], [settlement.id]);
    }
  }

  for (const pathogen of world.pathogens) {
    const infectedCount = residents.filter((person) => person.alive && person.infection?.pathogenId === pathogen.id).length;
    if (infectedCount === 0) continue;
    const susceptible = residents.filter((person) => person.alive && !person.infection && !person.immunity.includes(pathogen.id));
    const probability = clamp(pathogen.transmissibility * infectedCount / Math.max(1, residents.length) * 1.8, 0, 0.35);
    const newCases = [];
    for (const person of susceptible) {
      if (random(world) < probability) {
        person.infection = { pathogenId: pathogen.id, remainingDays: pathogen.duration, severity: pathogen.severity * (0.7 + random(world) * 0.6) };
        newCases.push(person.id);
      }
    }
    if (newCases.length > 0) newCasesByPathogen.set(pathogen.id, newCases);
  }

  for (const pathogen of world.pathogens) {
    const activeCases = residents.filter((person) => person.alive && person.infection?.pathogenId === pathogen.id);
    const isActive = activeOutbreaks.includes(pathogen.id);
    if (activeCases.length > 0 && !isActive) {
      activeOutbreaks.push(pathogen.id);
      recordEvent(world, "epidemia", `È iniziato un focolaio di ${pathogen.id}`,
        [{ kind: "contagio", pathogenId: pathogen.id }],
        [{ kind: "focolaio_attivo", pathogenId: pathogen.id, casi: activeCases.length },
          { kind: "nuovi_casi", value: newCasesByPathogen.get(pathogen.id)?.length ?? 0 }],
        activeCases.map((person) => person.id), [settlement.id]);
    } else if (activeCases.length === 0 && isActive) {
      const activeIndex = activeOutbreaks.indexOf(pathogen.id);
      if (activeIndex >= 0) activeOutbreaks.splice(activeIndex, 1);
      recordEvent(world, "fine_epidemia", `Il focolaio di ${pathogen.id} si è concluso`,
        [{ kind: "nessun_caso_attivo", pathogenId: pathogen.id }],
        [{ kind: "focolaio_concluso", pathogenId: pathogen.id }], [], [settlement.id]);
    }
  }
}
function ageAndMortality(world, person, settlement) {
  person.ageDays += 1;
  if (person.guardianId !== null && isAdult(person)) {
    const formerGuardianId = person.guardianId;
    person.guardianId = null;
    recordEvent(world, "tutela_cessata", person.name + " ha raggiunto la maggiore età",
      [{ kind: "maggiore_eta", formerGuardianId }],
      [{ kind: "tutela_terminata", guardianId: formerGuardianId }],
      [person.id, formerGuardianId], [settlement.id]);
  }
  const age = person.ageDays / DAYS_PER_COMMON_YEAR;
  const senescence = Math.max(0, age - 52) * 0.0000007 + Math.max(0, age - 72) * 0.000009;
  const deprivation = person.needs.food > 90 || person.needs.water > 90 ? 0.0002 : 0;
  if (person.health <= 0 || random(world) < 0.000002 + senescence + deprivation) {
    const healthBeforeDeath = person.health;
    const needsBeforeDeath = { ...person.needs };
    const infectionBeforeDeath = person.infection ? { ...person.infection } : null;
    const deathCause = needsBeforeDeath.food > 90
      ? "carenza_alimentare"
      : needsBeforeDeath.water > 90
        ? "carenza_idrica"
        : healthBeforeDeath <= 0
          ? infectionBeforeDeath ? "malattia" : "salute_critica"
          : "mortalita_naturale";
    person.alive = false;
    person.diedDay = world.day;
    person.health = 0;
    person.guardianId = null;
    if (person.partnerId !== null) {
      const partner = world.people.find((candidate) => candidate.id === person.partnerId);
      if (partner?.partnerId === person.id) partner.partnerId = null;
      person.partnerId = null;
    }
    settlement.statistics.deaths += 1;
    recordEvent(world, "morte", `${person.name} è morto all'età di ${Math.floor(age)} anni`,
      [{ kind: deathCause, ageYears: Math.floor(age), healthBeforeDeath,
        foodNeed: needsBeforeDeath.food, waterNeed: needsBeforeDeath.water,
        pathogenId: infectionBeforeDeath?.pathogenId ?? null }],
      [{ kind: "popolazione_ridotta", value: 1 }], [person.id], [settlement.id]);
    for (const change of reassignGuardianships(world, person.id)) {
      const child = world.people.find((candidate) => candidate.id === change.childId);
      if (!child) continue;
      if (change.guardianId !== null) {
        const guardian = world.people.find((candidate) => candidate.id === change.guardianId);
        recordEvent(world, "tutela_affidata", "La tutela di " + child.name + " è passata a " + guardian.name,
          [{ kind: "perdita_del_genitore_o_tutore", deceasedPersonId: person.id,
            previousGuardianId: change.previousGuardianId }],
          [{ kind: "tutela_assegnata", guardianId: guardian.id }],
          [person.id, child.id, guardian.id], [settlement.id]);
      } else if (change.orphaned) {
        recordEvent(world, "minore_senza_tutore", child.name + " non ha un tutore familiare disponibile",
          [{ kind: "perdita_del_genitore_o_tutore", deceasedPersonId: person.id,
            previousGuardianId: change.previousGuardianId }],
          [{ kind: "tutela_non_disponibile" }],
          [person.id, child.id], [settlement.id]);
      }
    }
    return true;
  }
  return false;
}

function maybeBirth(world, settlement, residents) {
  const byId = new Map(world.people.map((person) => [person.id, person]));
  const couples = residents.filter((person) => person.alive && person.sex === "F" && person.partnerId !== null);
  for (const mother of couples) {
    const father = byId.get(mother.partnerId);
    if (!father?.alive || father.partnerId !== mother.id || father.settlementId !== settlement.id) continue;
    const motherAge = mother.ageDays / DAYS_PER_COMMON_YEAR;
    const fatherAge = father.ageDays / DAYS_PER_COMMON_YEAR;
    if (motherAge < 18 || motherAge > 42 || fatherAge < 18 || fatherAge > 65) continue;
    if (mother.lastBirthDay !== null && world.day - mother.lastBirthDay < 3 * 365) continue;
    if (settlement.resources.food < residents.length * 2 || settlement.resources.water < residents.length * 2) continue;
    if (mother.health < 60 || father.health < 55 || mother.needs.social > 75) continue;
    if (random(world) >= 0.00024) continue;
    const child = createPerson(world, settlement.id, 0, random(world) < 0.5 ? "F" : "M", [mother.id, father.id]);
    child.guardianId = mother.id;
    for (const key of ["cooperation", "curiosity", "spirituality", "tradition"]) {
      child.culture[key] = clamp((mother.culture[key] + father.culture[key]) / 2 + (random(world) - 0.5) * 0.06, 0, 1);
    }
    child.culture.beliefVector = mother.culture.beliefVector.map((value, index) =>
      clamp((value + father.culture.beliefVector[index]) / 2 + (random(world) - 0.5) * 0.05, 0, 1));
    child.religionId = mother.religionId !== null && mother.religionId === father.religionId ? mother.religionId : null;
    child.needs.food = 0;
    child.needs.water = 0;
    mother.childIds.push(child.id);
    father.childIds.push(child.id);
    mother.lastBirthDay = world.day;
    father.lastBirthDay = world.day;
    world.people.push(child);
    settlement.statistics.births += 1;
    recordEvent(world, "nascita", `È nato ${child.name} nella famiglia di ${mother.name} e ${father.name}`,
      [{ kind: "relazione_familiare", parentIds: [mother.id, father.id] }],
      [{ kind: "popolazione_aumentata", value: 1 }], [mother.id, father.id, child.id], [settlement.id]);
  }
}

function developTechnology(world, settlement) {
  for (const technology of TECHNOLOGIES) {
    if (settlement.technologies.includes(technology.id)) continue;
    if (!technology.requires.every((required) => settlement.technologies.includes(required))) continue;
    if (settlement.knowledge < technology.threshold) continue;
    settlement.technologies.push(technology.id);
    if (technology.id === "agricoltura") settlement.fields = Math.max(2, Math.floor(livingInSettlement(world, settlement.id).length / 7));
    if (technology.id === "irrigazione") settlement.fertility = clamp(settlement.fertility + 0.18, 0.5, 1.8);
    recordEvent(world, "innovazione", `È stata sviluppata la tecnologia ${technology.id}`,
      [{ kind: "ricerca_cumulativa", knowledge: settlement.knowledge }],
      [{ kind: "tecnologia_sbloccata", technologyId: technology.id }], [], [settlement.id]);
  }
}

function updateGovernance(settlement, residents) {
  const activeCouncil = settlement.governance.councilMemberIds
    .map((id) => residents.find((person) => person.id === id && person.alive))
    .filter(Boolean);
  settlement.governance.councilMemberIds = activeCouncil.map((person) => person.id);
  if (activeCouncil.length === 0 && residents.length > 0) {
    const leader = [...residents].sort((a, b) => b.skills.leadership - a.skills.leadership || a.id - b.id)[0];
    settlement.governance.councilMemberIds = [leader.id];
    settlement.governance.legitimacy = clamp(settlement.governance.legitimacy - 0.08, 0, 1);
  }
  const averageFoodNeed = residents.length === 0 ? 100 : residents.reduce((sum, person) => sum + person.needs.food, 0) / residents.length;
  const averageHealth = residents.length === 0 ? 0 : residents.reduce((sum, person) => sum + person.health, 0) / residents.length;
  settlement.governance.publicOrder = clamp(0.85 - averageFoodNeed / 250 + averageHealth / 500, 0, 1);
  settlement.governance.legitimacy = clamp(settlement.governance.legitimacy + (settlement.governance.publicOrder - 0.55) * 0.0005, 0, 1);
}


const CULTURAL_TRAITS = ["cooperation", "curiosity", "spirituality", "tradition"];
const RELIGION_NAMES = ["Tradizione della natura", "Tradizione degli antenati", "Tradizione celeste"];

function beliefDistance(a, b) {
  return Math.sqrt(a.reduce((sum, value, index) => sum + (value - b[index]) ** 2, 0));
}

function transmitCulture(world, residents) {
  if (residents.length < 2) return;
  const byId = new Map(residents.map((person) => [person.id, person]));
  const snapshot = new Map(residents.map((person) => [person.id, {
    traits: Object.fromEntries(CULTURAL_TRAITS.map((key) => [key, person.culture[key]])),
    beliefVector: [...person.culture.beliefVector]
  }]));
  for (const person of residents) {
    let contact = person.partnerId === null ? null : byId.get(person.partnerId) ?? null;
    if (!contact) {
      for (const relativeId of [...person.parentIds, ...person.childIds]) {
        const relative = byId.get(relativeId);
        if (relative && relative.id !== person.id) { contact = relative; break; }
      }
    }
    if (!contact) {
      const index = randomInt(world, 0, residents.length - 1);
      contact = residents[index].id === person.id ? residents[(index + 1) % residents.length] : residents[index];
    }
    if (!contact || contact.id === person.id) continue;
    const influence = person.religionId !== null && person.religionId === contact.religionId ? 0.00012 : 0.00004;
    const source = snapshot.get(contact.id);
    for (const key of CULTURAL_TRAITS) {
      person.culture[key] = clamp(person.culture[key] + (source.traits[key] - person.culture[key]) * influence, 0, 1);
    }
    person.culture.beliefVector = person.culture.beliefVector.map((value, index) =>
      clamp(value + (source.beliefVector[index] - value) * influence, 0, 1));
  }
}

function createReligion(world, settlement, members) {
  const id = nextId(world, "religion");
  const vector = [0, 1, 2].map((index) =>
    members.reduce((sum, person) => sum + person.culture.beliefVector[index], 0) / members.length);
  const dominant = vector.indexOf(Math.max(...vector));
  const religion = {
    id,
    settlementId: settlement.id,
    name: RELIGION_NAMES[dominant] + " " + id,
    foundedDay: world.day,
    extinctDay: null,
    founderIds: members.map((person) => person.id),
    tenets: { nature: vector[0], ancestors: vector[1], celestial: vector[2] },
    lastAdherentCount: members.length
  };
  world.religions.push(religion);
  settlement.religionIds.push(id);
  for (const person of members) person.religionId = id;
  recordEvent(world, "religione_emersa", "È emersa " + religion.name + " a " + settlement.name,
    [{ kind: "convergenza_culturale", dimensioneGruppo: members.length,
      spiritualitaMedia: members.reduce((sum, person) => sum + person.culture.spirituality, 0) / members.length,
      raggioConvergenza: 0.28 }],
    [{ kind: "tradizione_religiosa_fondata", religionId: id, aderentiIniziali: members.length,
      tenets: { ...religion.tenets } }],
    members.map((person) => person.id), [settlement.id]);
  return religion;
}

function updateCulture(world, settlement, residents) {
  if (residents.length === 0) return;
  const previous = Object.fromEntries(CULTURAL_TRAITS.map((key) => [key, settlement.culture[key]]));
  for (const key of CULTURAL_TRAITS) {
    settlement.culture[key] = residents.reduce((sum, person) => sum + person.culture[key], 0) / residents.length;
  }
  const largestShift = Math.max(...CULTURAL_TRAITS.map((key) => Math.abs(settlement.culture[key] - previous[key])));
  if (largestShift >= 0.035) {
    recordEvent(world, "trasformazione_culturale", "La cultura di " + settlement.name + " sta cambiando",
      [{ kind: "trasmissione_intergenerazionale_e_sociale", variazioneMassima: largestShift }],
      [{ kind: "valori_culturali_aggiornati", valori: Object.fromEntries(CULTURAL_TRAITS.map((key) => [key, settlement.culture[key]])) }],
      [], [settlement.id]);
  }

  const localReligions = world.religions.filter((religion) => religion.settlementId === settlement.id && religion.extinctDay === null);
  const newlyAffiliated = [];
  for (const person of residents) {
    if (person.religionId !== null || person.culture.spirituality < 0.5) continue;
    const closest = localReligions
      .map((religion) => ({
        religion,
        distance: beliefDistance(person.culture.beliefVector, [
          religion.tenets.nature, religion.tenets.ancestors, religion.tenets.celestial
        ])
      }))
      .sort((a, b) => a.distance - b.distance || a.religion.id - b.religion.id)[0];
    if (closest && closest.distance <= 0.24) {
      person.religionId = closest.religion.id;
      newlyAffiliated.push(person.id);
    }
  }
  if (newlyAffiliated.length > 0) {
    recordEvent(world, "adesione_religiosa", newlyAffiliated.length + " persone hanno aderito a una tradizione religiosa",
      [{ kind: "affinita_di_credenze" }],
      [{ kind: "nuovi_aderenti", personIds: newlyAffiliated }],
      newlyAffiliated, [settlement.id]);
  }

  const candidates = residents.filter((person) => person.religionId === null
    && person.culture.spirituality >= 0.65 && person.culture.tradition >= 0.35);
  const claimed = new Set();
  const minimumGroup = Math.max(4, Math.ceil(residents.length * 0.1));
  for (const seed of candidates) {
    if (claimed.has(seed.id)) continue;
    const cluster = candidates.filter((person) => !claimed.has(person.id)
      && beliefDistance(seed.culture.beliefVector, person.culture.beliefVector) <= 0.28);
    if (cluster.length < minimumGroup) continue;
    for (const person of cluster) claimed.add(person.id);
    createReligion(world, settlement, cluster);
  }

  for (const religion of world.religions.filter((item) => item.settlementId === settlement.id)) {
    const adherents = residents.filter((person) => person.religionId === religion.id);
    if (adherents.length === 0 && religion.extinctDay === null) {
      religion.extinctDay = world.day;
      religion.lastAdherentCount = 0;
      recordEvent(world, "religione_estinta", "La tradizione " + religion.name + " non ha più aderenti",
        [{ kind: "assenza_di_aderenti" }],
        [{ kind: "tradizione_cessata", religionId: religion.id }],
        [], [settlement.id]);
      continue;
    }
    if (adherents.length > 0) {
      const mean = [0, 1, 2].map((index) =>
        adherents.reduce((sum, person) => sum + person.culture.beliefVector[index], 0) / adherents.length);
      const oldTenets = { ...religion.tenets };
      religion.tenets.nature += (mean[0] - religion.tenets.nature) * 0.02;
      religion.tenets.ancestors += (mean[1] - religion.tenets.ancestors) * 0.02;
      religion.tenets.celestial += (mean[2] - religion.tenets.celestial) * 0.02;
      religion.lastAdherentCount = adherents.length;
      const doctrinalShift = Math.max(
        Math.abs(religion.tenets.nature - oldTenets.nature),
        Math.abs(religion.tenets.ancestors - oldTenets.ancestors),
        Math.abs(religion.tenets.celestial - oldTenets.celestial)
      );
      if (doctrinalShift >= 0.035) {
        recordEvent(world, "evoluzione_religiosa", "La tradizione " + religion.name + " ha modificato i propri orientamenti",
          [{ kind: "trasmissione_delle_credenze", variazioneMassima: doctrinalShift }],
          [{ kind: "dottrina_aggiornata", religionId: religion.id, tenets: { ...religion.tenets } }],
          adherents.map((person) => person.id), [settlement.id]);
      }
    }
  }
}

function advanceSettlement(world, settlement) {
  const residents = livingInSettlement(world, settlement.id);
  if (residents.length === 0) return;
  const date = calendarDate(world.day);
  const season = seasonFactor(date.dayOfYear);
  const population = residents.length;
  for (const person of residents) {
    person.decision = chooseDecision(world, person, settlement, population, season);
  }
  applyProduction(world, settlement, residents, season);
  consumeNeeds(world, settlement, residents);
  advanceHealth(world, settlement, residents);
  for (const person of [...residents]) ageAndMortality(world, person, settlement);
  const living = livingInSettlement(world, settlement.id);
  maybeBirth(world, settlement, living);
  const currentResidents = livingInSettlement(world, settlement.id);
  transmitCulture(world, currentResidents);
  developTechnology(world, settlement);
  updateGovernance(settlement, currentResidents);
  if (date.dayOfYear === 0 && date.year > 0) updateCulture(world, settlement, currentResidents);
  if (date.dayOfYear === 0 && date.year > 0) {
    recordEvent(world, "anniversario", `È trascorso un anno a ${settlement.name}`,
      [{ kind: "calendario", year: date.year }],
      [{ kind: "popolazione", value: livingInSettlement(world, settlement.id).length }], [], [settlement.id]);
  }
}

export function advanceDays(world, count = 1) {
  assertWorldInvariants(world);
  assert(Number.isSafeInteger(count) && count >= 0 && count <= 1_000_000, "Numero di giorni non valido");
  for (let i = 0; i < count; i += 1) {
    for (const settlement of world.settlements) advanceSettlement(world, settlement);
    world.day += 1;
    if (world.day % 30 === 0) assertWorldInvariants(world);
  }
  assertWorldInvariants(world);
  return world;
}

export function serializeWorld(world) {
  assertWorldInvariants(world);
  return JSON.stringify(world);
}

function migratedUnit(key) {
  return hashSeed(key) / 0xffffffff;
}

function migrateWorld(world) {
  assert(world && typeof world === "object", "Stato del mondo non valido");
  if (world.schemaVersion === 1) {
    for (const settlement of world.settlements ?? []) {
      const active = (world.people ?? [])
        .filter((person) => person.alive && person.settlementId === settlement.id && person.infection)
        .map((person) => person.infection.pathogenId);
      settlement.health = {
        ...(settlement.health ?? {}),
        activeOutbreaks: [...new Set(active)]
      };
    }
    world.schemaVersion = 2;
  }
  if (world.schemaVersion === 2) {
    world.religions ??= [];
    world.nextIds ??= {};
    const maxReligionId = world.religions.reduce((maximum, religion) => Math.max(maximum, religion.id ?? 0), 0);
    world.nextIds.religion = Math.max(world.nextIds.religion ?? 1, maxReligionId + 1);
    const settlementsById = new Map((world.settlements ?? []).map((settlement) => [settlement.id, settlement]));
    for (const settlement of world.settlements ?? []) settlement.religionIds ??= [];
    for (const person of world.people ?? []) {
      if (!person.culture) {
        const base = settlementsById.get(person.settlementId)?.culture ?? {
          cooperation: 0.5, curiosity: 0.5, spirituality: 0.5, tradition: 0.5
        };
        const trait = (key) => clamp((base[key] ?? 0.5)
          + (migratedUnit(world.seed + ":" + person.id + ":" + key) - 0.5) * 0.08, 0, 1);
        person.culture = {
          cooperation: trait("cooperation"),
          curiosity: trait("curiosity"),
          spirituality: trait("spirituality"),
          tradition: trait("tradition"),
          beliefVector: [0, 1, 2].map((index) => migratedUnit(world.seed + ":" + person.id + ":belief:" + index))
        };
      }
      person.religionId ??= null;
    }
    world.schemaVersion = 3;
  }
  if (world.schemaVersion === 3) {
    for (const person of world.people ?? []) person.guardianId ??= null;
    const people = new Map((world.people ?? []).map((person) => [person.id, person]));
    for (const person of world.people ?? []) {
      if (!person.alive || isAdult(person)) {
        person.guardianId = null;
      } else if (person.guardianId !== null && !isValidGuardian(world, person, person.guardianId, people)) {
        person.guardianId = selectGuardian(world, person, people);
      } else if (person.guardianId === null) {
        person.guardianId = selectGuardian(world, person, people);
      }
    }
    world.schemaVersion = 4;
  }
  return world;
}

export function deserializeWorld(serialized) {
  assert(typeof serialized === "string", "Il salvataggio deve essere una stringa JSON");
  const world = migrateWorld(JSON.parse(serialized));
  assertWorldInvariants(world);
  return world;
}
export function worldSummary(world) {
  const living = world.people.filter((person) => person.alive);
  const dead = world.people.length - living.length;
  return {
    date: calendarDate(world.day),
    day: world.day,
    population: living.length,
    deaths: dead,
    settlements: world.settlements.length,
    religions: world.religions.filter((religion) => religion.extinctDay === null).length,
    events: world.events.length,
    infected: living.filter((person) => person.infection).length,
    technologies: world.settlements.reduce((sum, settlement) => sum + settlement.technologies.length, 0)
  };
}

export function historySince(world, day = 0, limit = 100) {
  assert(Number.isInteger(day) && day >= 0, "Giorno iniziale non valido");
  assert(Number.isInteger(limit) && limit >= 1 && limit <= 1000, "Limite cronologia non valido");
  return world.events.filter((event) => event.day >= day).slice(-limit).map((event) => structuredClone(event));
}

export function assertWorldInvariants(world) {
  assert(world && typeof world === "object", "Stato del mondo non valido");
  assert(world.schemaVersion === SCHEMA_VERSION, "Versione dello schema non supportata");
  assert(Number.isSafeInteger(world.day) && world.day >= 0, "Giorno del mondo non valido");
  assert(Number.isInteger(world.rngState) && world.rngState >= 0 && world.rngState <= 0xffffffff, "Stato del generatore casuale non valido");
  assert(Array.isArray(world.people) && Array.isArray(world.settlements) && Array.isArray(world.events)
    && Array.isArray(world.pathogens) && Array.isArray(world.religions), "Collezioni del mondo mancanti");
  const personIds = new Set(world.people.map((person) => person.id));
  const peopleById = new Map(world.people.map((person) => [person.id, person]));
  const settlementIds = new Set(world.settlements.map((settlement) => settlement.id));
  const eventIds = new Set(world.events.map((event) => event.id));
  assert(personIds.size === world.people.length, "Identificativi delle persone duplicati");
  assert(settlementIds.size === world.settlements.length, "Identificativi degli insediamenti duplicati");
  assert(eventIds.size === world.events.length, "Identificativi degli eventi duplicati");
  for (const person of world.people) {
    assert(personIds.has(person.id), "Persona senza identificativo");
    assert(settlementIds.has(person.settlementId), `Insediamento mancante per la persona ${person.id}`);
    assert(Number.isSafeInteger(person.ageDays) && person.ageDays >= 0, `Età non valida per la persona ${person.id}`);
    assert(person.bornDay === null || (Number.isSafeInteger(person.bornDay) && person.bornDay >= 0 && person.bornDay <= world.day), `Data di nascita non valida per la persona ${person.id}`);
    assert(typeof person.alive === "boolean", `Stato vitale non valido per la persona ${person.id}`);
    assert(person.alive ? person.diedDay === null : Number.isSafeInteger(person.diedDay), `Data di morte incoerente per la persona ${person.id}`);
    assert(Object.hasOwn(person, "guardianId"), `Tutela mancante per la persona ${person.id}`);
    assert(person.guardianId === null || isValidGuardian(world, person, person.guardianId, peopleById),
      `Tutore non valido per la persona ${person.id}`);
    if (person.alive && !isAdult(person) && person.guardianId === null) {
      assert(selectGuardian(world, person, peopleById) === null, `Tutore mancante per la persona ${person.id}`);
    }
    assert(Array.isArray(person.parentIds) && new Set(person.parentIds).size === person.parentIds.length
      && !person.parentIds.includes(person.id), `Genitori non validi per la persona ${person.id}`);
    assert(Array.isArray(person.childIds) && new Set(person.childIds).size === person.childIds.length
      && !person.childIds.includes(person.id), `Figli non validi per la persona ${person.id}`);
    assert(person.parentIds.every((id) => personIds.has(id)), `Genitore inesistente per la persona ${person.id}`);
    assert(person.childIds.every((id) => personIds.has(id)), `Figlio inesistente per la persona ${person.id}`);
    for (const parentId of person.parentIds) {
      const parent = peopleById.get(parentId);
      assert(parent.childIds.includes(person.id), `Relazione genitore-figlio non reciproca per la persona ${person.id}`);
    }
    for (const childId of person.childIds) {
      const child = peopleById.get(childId);
      assert(child.parentIds.includes(person.id), `Relazione figlio-genitore non reciproca per la persona ${person.id}`);
    }
    assert(person.culture && CULTURAL_TRAITS.every((key) => Number.isFinite(person.culture[key])
      && person.culture[key] >= 0 && person.culture[key] <= 1), `Profilo culturale non valido per la persona ${person.id}`);
    assert(Array.isArray(person.culture.beliefVector) && person.culture.beliefVector.length === 3
      && person.culture.beliefVector.every((value) => Number.isFinite(value) && value >= 0 && value <= 1),
      `Credenze non valide per la persona ${person.id}`);
    if (person.religionId !== null) {
      const religion = world.religions.find((candidate) => candidate.id === person.religionId);
      assert(religion && religion.settlementId === person.settlementId,
        `Tradizione religiosa incoerente per la persona ${person.id}`);
    }
    if (person.partnerId !== null) {
      const partner = world.people.find((candidate) => candidate.id === person.partnerId);
      assert(partner && partner.partnerId === person.id, `Relazione di coppia non reciproca per la persona ${person.id}`);
    }
    for (const value of [...Object.values(person.needs), person.health, person.wealth, ...Object.values(person.skills)]) {
      assert(Number.isFinite(value), `Valore numerico non valido per la persona ${person.id}`);
    }
  }
  for (const settlement of world.settlements) {
    for (const [resource, value] of Object.entries(settlement.resources)) {
      assert(Number.isFinite(value) && value >= 0, `Risorsa ${resource} non valida nell'insediamento ${settlement.id}`);
    }
    assert(Number.isFinite(settlement.knowledge) && settlement.knowledge >= 0, `Conoscenza non valida nell'insediamento ${settlement.id}`);
    assert(settlement.governance.councilMemberIds.every((id) => personIds.has(id)), `Consigliere inesistente nell'insediamento ${settlement.id}`);
    assert(Array.isArray(settlement.religionIds) && new Set(settlement.religionIds).size === settlement.religionIds.length,
      `Elenco religioso non valido nell'insediamento ${settlement.id}`);
    assert(settlement.religionIds.every((id) => world.religions.some((religion) => religion.id === id && religion.settlementId === settlement.id)),
      `Tradizione religiosa mancante nell'insediamento ${settlement.id}`);
    assert(settlement.health && Array.isArray(settlement.health.activeOutbreaks), `Stato epidemico mancante nell'insediamento ${settlement.id}`);
    assert(new Set(settlement.health.activeOutbreaks).size === settlement.health.activeOutbreaks.length, `Focolai duplicati nell'insediamento ${settlement.id}`);
    assert(settlement.health.activeOutbreaks.every((id) => world.pathogens.some((pathogen) => pathogen.id === id)), `Patogeno sconosciuto nell'insediamento ${settlement.id}`);
  }
  for (const event of world.events) {
    assert(Number.isSafeInteger(event.day) && event.day <= world.day, `Data evento non valida per l'evento ${event.id}`);
    assert(event.personIds.every((id) => personIds.has(id)), `Persona storica inesistente nell'evento ${event.id}`);
    assert(event.settlementIds.every((id) => settlementIds.has(id)), `Insediamento storico inesistente nell'evento ${event.id}`);
  }
  const religionIds = new Set(world.religions.map((religion) => religion.id));
  assert(religionIds.size === world.religions.length, "Identificativi religiosi duplicati");
  for (const religion of world.religions) {
    assert(settlementIds.has(religion.settlementId), `Insediamento mancante per la tradizione ${religion.id}`);
    assert(Number.isSafeInteger(religion.foundedDay) && religion.foundedDay >= 0 && religion.foundedDay <= world.day,
      `Data di fondazione religiosa non valida per la tradizione ${religion.id}`);
    assert(religion.extinctDay === null || (Number.isSafeInteger(religion.extinctDay)
      && religion.extinctDay >= religion.foundedDay && religion.extinctDay <= world.day),
      `Data di estinzione religiosa non valida per la tradizione ${religion.id}`);
    assert(religion.founderIds.every((id) => personIds.has(id)), `Fondatore inesistente per la tradizione ${religion.id}`);
    assert(Object.values(religion.tenets).length === 3
      && Object.values(religion.tenets).every((value) => Number.isFinite(value) && value >= 0 && value <= 1),
      `Orientamenti religiosi non validi per la tradizione ${religion.id}`);
    assert(world.settlements.find((settlement) => settlement.id === religion.settlementId).religionIds.includes(religion.id),
      `Tradizione non registrata nell'insediamento ${religion.id}`);
  }
  for (const [kind, next] of Object.entries(world.nextIds)) {
    assert(Number.isSafeInteger(next) && next > 0, `Contatore ${kind} non valido`);
  }
  return true;
}

export const SIMULATION_CAPABILITIES = Object.freeze({
  deterministicRandomness: true,
  yearZeroCalendar: true,
  individualAging: true,
  birthAndDeath: true,
  reciprocalPartnerships: true,
  familyGuardianship: "basic",
  basicNeedsAndWorkDecisions: true,
  resourceProductionAndConsumption: "basic",
  agriculture: "basic",
  economyAndTrade: "partial",
  diseaseTransmission: true,
  outbreakLifecycle: true,
  researchAndTechnology: true,
  structuredHistoricalEvents: true,
  jsonSnapshot: true,
  institutions: "partial",
  lawsAndJustice: "not_implemented",
  emergentCultureAndReligion: "basic",
  settlements: "single_settlement",
  diplomacyWarAndMigration: "not_implemented",
  browserPersistenceAndOfflineCatchup: "not_implemented"
});