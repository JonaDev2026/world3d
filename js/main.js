(() => {
  "use strict";
  const $ = (selector) => document.querySelector(selector);
  const music = $("#intro-music");
  const settings = $("#settings-screen");
  const musicVolume = $("#music-volume");
  const fxVolume = $("#fx-volume");
  const musicEnabled = $("#music-enabled");
  const fxEnabled = $("#fx-enabled");
  const musicValue = $("#music-value");
  const fxValue = $("#fx-value");
  const defaults = { musicVolume: 20, fxVolume: 100, musicEnabled: true, fxEnabled: true };
  let prefs = { ...defaults };
  try {
    const saved = JSON.parse(localStorage.getItem("vaelmar-audio-settings") || "null");
    if (saved && typeof saved === "object") prefs = { ...defaults, ...saved };
  } catch (_) {}

  const clamp = (value) => Math.max(0, Math.min(100, Number(value) || 0));
  const save = () => {
    try { localStorage.setItem("vaelmar-audio-settings", JSON.stringify(prefs)); } catch (_) {}
  };
  const applyAudio = () => {
    music.volume = prefs.musicVolume / 100;
    music.muted = !prefs.musicEnabled;
    musicVolume.value = prefs.musicVolume;
    fxVolume.value = prefs.fxVolume;
    musicEnabled.checked = prefs.musicEnabled;
    fxEnabled.checked = prefs.fxEnabled;
    musicValue.textContent = prefs.musicVolume + "%";
    fxValue.textContent = prefs.fxVolume + "%";
  };

  let musicStarted = false;
  const startMusic = () => {
    if (musicStarted || !prefs.musicEnabled || prefs.musicVolume === 0) return;
    music.volume = prefs.musicVolume / 100;
    music.play().then(() => { musicStarted = true; }).catch(() => {});
  };

  const openSettings = () => {
    startMusic();
    settings.hidden = false;
    $("#close-settings").focus();
  };
  const closeSettings = () => {
    settings.hidden = true;
    $("#open-settings").focus();
  };

  $("#open-settings").addEventListener("click", openSettings);
  $("#close-settings").addEventListener("click", closeSettings);
  $("#done-settings").addEventListener("click", closeSettings);
  settings.addEventListener("click", (event) => {
    if (event.target === settings) closeSettings();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !settings.hidden) closeSettings();
  });
  document.querySelector(".primary-entry").addEventListener("click", startMusic);

  musicVolume.addEventListener("input", () => {
    prefs.musicVolume = clamp(musicVolume.value);
    applyAudio();
    save();
    if (prefs.musicVolume > 0 && prefs.musicEnabled) startMusic();
  });
  fxVolume.addEventListener("input", () => {
    prefs.fxVolume = clamp(fxVolume.value);
    applyAudio();
    save();
  });
  musicEnabled.addEventListener("change", () => {
    prefs.musicEnabled = musicEnabled.checked;
    applyAudio();
    save();
    if (prefs.musicEnabled) startMusic();
    else music.pause();
  });
  fxEnabled.addEventListener("change", () => {
    prefs.fxEnabled = fxEnabled.checked;
    applyAudio();
    save();
  });
  applyAudio();
})();