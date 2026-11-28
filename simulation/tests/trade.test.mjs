import test from "node:test";
import assert from "node:assert/strict";
import { SIMULATION_CAPABILITIES, advanceDays, assertWorldInvariants, createWorld,
  deserializeWorld, serializeWorld, worldSummary } from "../engine.mjs";

function makeTwoSettlements(seed = "trade-world") {
  const world = createWorld({ seed, population: 12 });
  const first = world.settlements[0], second = JSON.parse(JSON.stringify(first));
  second.id = world.nextIds.settlement++; second.name = "Insediamento commerciale";
  second.x = first.x + 18; second.y = first.y + 4; second.foundedDay = world.day; second.migrationCooldownUntil = 0;
  second.resources = { food: 0, water: 100, wood: 30, stone: 12, tools: 2, treasury: 100 };
  second.statistics = { births: 0, deaths: 0, production: 0, consumed: 0,
    tradeImported: 0, tradeExported: 0, tradeIncome: 0, tradeSpending: 0 };
  first.resources = { food: 1000, water: 100, wood: 30, stone: 12, tools: 2, treasury: 100 };
  Object.assign(first.statistics, { tradeImported: 0, tradeExported: 0, tradeIncome: 0, tradeSpending: 0 });
  for (let index = 0; index < world.people.length; index += 1) {
    const person = world.people[index]; person.partnerId = null; person.parentIds = []; person.childIds = [];
    person.guardianId = null; person.religionId = null;
    if (index >= 6) person.settlementId = second.id;
  }
  first.governance.councilMemberIds = world.people.slice(0, 6).filter((person) => person.ageDays >= 18 * 365).slice(0, 2).map((person) => person.id);
  second.governance.councilMemberIds = world.people.slice(6).filter((person) => person.ageDays >= 18 * 365).slice(0, 2).map((person) => person.id);
  world.settlements.push(second); world.day = 366; assertWorldInvariants(world);
  return world;
}

test("due insediamenti vicini scambiano risorse e trasferiscono il pagamento", () => {
  const world = makeTwoSettlements(), [seller, buyer] = world.settlements;
  const sellerFood = seller.resources.food, buyerTreasury = buyer.resources.treasury, sellerTreasury = seller.resources.treasury;
  advanceDays(world, 1);
  const exchange = world.events.find((event) => event.type === "scambio_commerciale");
  assert.ok(exchange);
  const effect = exchange.effects.find((item) => item.kind === "scambio_registrato");
  assert.equal(effect.venditore, seller.id); assert.equal(effect.acquirente, buyer.id); assert.equal(effect.risorsa, "food");
  assert.ok(effect.quantitaConsegnata > 0 && effect.quantitaConsegnata < effect.quantitaCaricata);
  assert.ok(seller.resources.food < sellerFood && buyer.resources.food > 0);
  assert.ok(buyer.resources.treasury < buyerTreasury && seller.resources.treasury > sellerTreasury);
  assert.equal(world.tradeRoutes.length, 1); assert.equal(worldSummary(world).tradeExchanges, 1);
  assert.equal(SIMULATION_CAPABILITIES.economyAndTrade, "basic"); assertWorldInvariants(world);
});

test("il commercio è deterministico attraverso un checkpoint", () => {
  const whole = makeTwoSettlements("trade-checkpoint"), split = makeTwoSettlements("trade-checkpoint");
  advanceDays(whole, 1); advanceDays(split, 1);
  const restored = deserializeWorld(serializeWorld(split));
  advanceDays(whole, 365); advanceDays(restored, 365);
  assert.equal(serializeWorld(restored), serializeWorld(whole)); assertWorldInvariants(restored);
});

test("non viene aperta una rotta oltre il raggio commerciale o senza deficit", () => {
  const distant = makeTwoSettlements("trade-distance");
  distant.settlements[1].x = distant.settlements[0].x + 80; advanceDays(distant, 1);
  assert.equal(distant.tradeRoutes.length, 0);
  const balanced = makeTwoSettlements("trade-balanced");
  Object.assign(balanced.settlements[1].resources, { food: 1000, water: 1000, wood: 1000, stone: 1000, tools: 1000 });
  advanceDays(balanced, 1); assert.equal(balanced.tradeRoutes.length, 0);
  assertWorldInvariants(distant); assertWorldInvariants(balanced);
});

test("uno snapshot schema 6 viene migrato con contabilità commerciale vuota", () => {
  const world = createWorld({ seed: "trade-migration", population: 12 });
  const legacy = JSON.parse(serializeWorld(world));
  legacy.schemaVersion = 6; delete legacy.tradeRoutes; delete legacy.nextIds.route;
  for (const settlement of legacy.settlements) for (const key of ["tradeImported", "tradeExported", "tradeIncome", "tradeSpending"]) delete settlement.statistics[key];
  const restored = deserializeWorld(JSON.stringify(legacy));
  assert.equal(restored.schemaVersion, 7); assert.deepEqual(restored.tradeRoutes, []);
  assert.equal(restored.nextIds.route, 1); assert.equal(restored.settlements[0].statistics.tradeImported, 0);
  assertWorldInvariants(restored);
});

test("le invarianti rifiutano una rotta commerciale con destinazione inesistente", () => {
  const world = makeTwoSettlements("trade-invariant");
  world.tradeRoutes.push({ id: 1, settlementIds: [1, 999], openedDay: world.day, lastTradeDay: world.day,
    distance: 4, tradeCount: 1, totalValue: 1, totalGoods: 1, status: "active" });
  world.nextIds.route = 2;
  assert.throws(() => assertWorldInvariants(world), /Rotta commerciale non valida/);
});
