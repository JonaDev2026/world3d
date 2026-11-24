export const ADULT_AGE_DAYS = 18 * 365.2425;

export function isAdult(person) {
  return person.ageDays >= ADULT_AGE_DAYS;
}

function kinshipRank(child, candidate, people) {
  if (child.parentIds.includes(candidate.id)) return 0;

  const parents = child.parentIds.map((id) => people.get(id)).filter(Boolean);
  const grandparents = new Set(parents.flatMap((parent) => parent.parentIds));
  if (grandparents.has(candidate.id)) return 1;

  const siblings = new Set(parents.flatMap((parent) => parent.childIds).filter((id) => id !== child.id));
  if (siblings.has(candidate.id)) return 2;

  const auntsAndUncles = new Set();
  for (const parent of parents) {
    for (const grandparentId of parent.parentIds) {
      const grandparent = people.get(grandparentId);
      for (const siblingId of grandparent?.childIds ?? []) {
        if (siblingId !== parent.id) auntsAndUncles.add(siblingId);
      }
    }
  }
  if (auntsAndUncles.has(candidate.id)) return 3;
  return Number.POSITIVE_INFINITY;
}

export function selectGuardian(world, child, people = new Map(world.people.map((person) => [person.id, person]))) {
  if (!child.alive || isAdult(child) || child.parentIds.length === 0) return null;
  const candidates = [];
  for (const person of world.people) {
    if (!person.alive || person.id === child.id || person.settlementId !== child.settlementId || !isAdult(person)) continue;
    const rank = kinshipRank(child, person, people);
    if (Number.isFinite(rank)) candidates.push({ person, rank });
  }
  candidates.sort((a, b) => a.rank - b.rank
    || (b.person.skills?.leadership ?? 0) - (a.person.skills?.leadership ?? 0)
    || a.person.id - b.person.id);
  return candidates[0]?.person.id ?? null;
}

export function isValidGuardian(world, child, guardianId, people = new Map(world.people.map((person) => [person.id, person]))) {
  if (guardianId === null || !child.alive || isAdult(child)) return false;
  const guardian = people.get(guardianId);
  return Boolean(guardian && guardian.alive && guardian.id !== child.id
    && guardian.settlementId === child.settlementId && isAdult(guardian)
    && Number.isFinite(kinshipRank(child, guardian, people)));
}

export function reassignGuardianships(world, deceasedId) {
  const people = new Map(world.people.map((person) => [person.id, person]));
  const changes = [];
  for (const child of world.people) {
    if (!child.alive || isAdult(child)) continue;
    const lostParent = child.parentIds.includes(deceasedId);
    if (child.guardianId !== deceasedId && !lostParent) continue;

    const previousGuardianId = child.guardianId ?? null;
    const guardianId = selectGuardian(world, child, people);
    if (guardianId !== previousGuardianId) {
      child.guardianId = guardianId;
      changes.push({
        childId: child.id,
        previousGuardianId,
        guardianId,
        orphaned: guardianId === null
      });
    } else if (guardianId === null && lostParent) {
      const hasLivingParent = child.parentIds.some((id) => people.get(id)?.alive);
      if (!hasLivingParent) {
        changes.push({
          childId: child.id,
          previousGuardianId,
          guardianId: null,
          orphaned: true
        });
      }
    }
  }
  return changes;
}
