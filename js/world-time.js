/**
 * WORLD — Orologio e calendario di Vaelmar.
 *
 * Un giorno di gioco dura 30 minuti reali (48x il tempo del mondo).
 * Il modulo non dipende da Three.js: il motore grafico consumerà lo snapshot
 * per aggiornare sole, cielo, illuminazione e atmosfera.
 */

export const VAELMAR_CALENDAR = Object.freeze({
  daysPerMonth: 30,
  monthsPerYear: 12,
  daysPerYear: 360,
  hoursPerDay: 24,
  realMinutesPerGameDay: 30,
  gameSecondsPerRealSecond: 48,
  seasons: 4,
  monthsPerSeason: 3
});

export const VAELMAR_MONTH_NAMES = Object.freeze([
  'Germoglio',
  'Fioritura',
  'Solealto',
  'Ardore',
  'Mietitura',
  'Mezzaluce',
  "Foglia d'Oro",
  'Bruma',
  'Cenere',
  'Gelo Profondo',
  'Notte Quieta',
  'Ultima Fiamma'
]);

export const VAELMAR_SEASON_NAMES = Object.freeze([
  'Risveglio',
  'Alta Luce',
  'Caduta',
  'Lungo Inverno'
]);

export const VAELMAR_DAY_PHASES = Object.freeze([
  { id: 'night', start: 22, end: 5 },
  { id: 'dawn', start: 5, end: 7 },
  { id: 'morning', start: 7, end: 11 },
  { id: 'day', start: 11, end: 16 },
  { id: 'afternoon', start: 16, end: 19 },
  { id: 'sunset', start: 19, end: 20 },
  { id: 'twilight', start: 20, end: 22 }
]);

const SECONDS_PER_HOUR = 60 * 60;
const SECONDS_PER_DAY = VAELMAR_CALENDAR.hoursPerDay * SECONDS_PER_HOUR;

function positiveNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : fallback;
}

function phaseForHour(hour) {
  if (hour >= 5 && hour < 7) return 'dawn';
  if (hour >= 7 && hour < 11) return 'morning';
  if (hour >= 11 && hour < 16) return 'day';
  if (hour >= 16 && hour < 19) return 'afternoon';
  if (hour >= 19 && hour < 20) return 'sunset';
  if (hour >= 20 && hour < 22) return 'twilight';
  return 'night';
}

export function getVaelmarCalendar(gameSeconds = 0) {
  const totalSeconds = positiveNumber(gameSeconds);
  const absoluteDay = Math.floor(totalSeconds / SECONDS_PER_DAY);
  const dayOfYear = absoluteDay % VAELMAR_CALENDAR.daysPerYear;
  const month = Math.floor(dayOfYear / VAELMAR_CALENDAR.daysPerMonth) + 1;
  const day = (dayOfYear % VAELMAR_CALENDAR.daysPerMonth) + 1;
  const seasonIndex = Math.floor((month - 1) / VAELMAR_CALENDAR.monthsPerSeason);
  const secondsToday = totalSeconds % SECONDS_PER_DAY;
  const hour = Math.floor(secondsToday / SECONDS_PER_HOUR);
  const minute = Math.floor((secondsToday % SECONDS_PER_HOUR) / 60);
  const second = Math.floor(secondsToday % 60);
  const year = Math.floor(absoluteDay / VAELMAR_CALENDAR.daysPerYear) + 1;
  const monthName = VAELMAR_MONTH_NAMES[month - 1];

  return Object.freeze({
    year,
    dayOfYear: dayOfYear + 1,
    month,
    monthName,
    day,
    season: VAELMAR_SEASON_NAMES[seasonIndex],
    seasonNumber: seasonIndex + 1,
    dayOfSeason: seasonIndex * 90 + ((month - 1) % 3) * 30 + day,
    hour,
    minute,
    second,
    time: [hour, minute, second].map(value => String(value).padStart(2, '0')).join(':'),
    date: `Giorno ${String(day).padStart(2, '0')} · ${monthName} · Anno ${year}`,
    phase: phaseForHour(hour),
    dayProgress: secondsToday / SECONDS_PER_DAY,
    sunProgress: (secondsToday / SECONDS_PER_DAY + 0.25) % 1,
    absoluteDay
  });
}

export class VaelmarClock {
  constructor({ gameSeconds = 6 * SECONDS_PER_HOUR, running = false } = {}) {
    this.gameSeconds = positiveNumber(gameSeconds, 6 * SECONDS_PER_HOUR);
    this.running = Boolean(running);
  }

  start() {
    this.running = true;
  }

  pause() {
    this.running = false;
  }

  setRunning(running) {
    this.running = Boolean(running);
  }

  advance(realDeltaSeconds) {
    if (this.running) {
      this.gameSeconds += positiveNumber(realDeltaSeconds) *
        VAELMAR_CALENDAR.gameSecondsPerRealSecond;
    }
    return this.snapshot();
  }

  setTime(hour, minute = 0, second = 0) {
    const current = getVaelmarCalendar(this.gameSeconds);
    const h = Math.min(23, Math.max(0, Math.floor(Number(hour) || 0)));
    const m = Math.min(59, Math.max(0, Math.floor(Number(minute) || 0)));
    const s = Math.min(59, Math.max(0, Math.floor(Number(second) || 0)));
    this.gameSeconds = current.absoluteDay * SECONDS_PER_DAY +
      h * SECONDS_PER_HOUR + m * 60 + s;
    return this.snapshot();
  }

  sleepUntil(hour) {
    const target = Math.min(23, Math.max(0, Math.floor(Number(hour) || 0)));
    const current = getVaelmarCalendar(this.gameSeconds);
    let targetSeconds = current.absoluteDay * SECONDS_PER_DAY +
      target * SECONDS_PER_HOUR;
    if (targetSeconds <= this.gameSeconds) targetSeconds += SECONDS_PER_DAY;
    this.gameSeconds = targetSeconds;
    return this.snapshot();
  }

  snapshot() {
    return getVaelmarCalendar(this.gameSeconds);
  }

  serialize() {
    return {
      gameSeconds: this.gameSeconds,
      running: this.running
    };
  }

  static restore(data) {
    return new VaelmarClock({
      gameSeconds: data?.gameSeconds,
      running: false
    });
  }
}
