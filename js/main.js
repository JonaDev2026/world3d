(() => {
  "use strict";
  const $ = (selector) => document.querySelector(selector);
  const music = $("#intro-music");
  const main = $("#main-content");
  const detail = $("#detail-panel");
  const detailContent = $("#detail-content");
  const settings = $("#settings-panel");
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
  const persist = () => {
    try { localStorage.setItem("vaelmar-audio-settings", JSON.stringify(prefs)); } catch (_) {}
  };
  const applyAudio = () => {
    music.volume = prefs.musicVolume / 100;
    music.muted = !prefs.musicEnabled;
    musicVolume.value = prefs.musicVolume;
    fxVolume.value = prefs.fxVolume;
    musicEnabled.checked = prefs.musicEnabled;
    fxEnabled.checked = prefs.fxEnabled;
    musicValue.value = prefs.musicVolume + "%";
    fxValue.value = prefs.fxVolume + "%";
    musicValue.textContent = prefs.musicVolume + "%";
    fxValue.textContent = prefs.fxVolume + "%";
  };
  let musicStarted = false;
  const startIntro = () => {
    if (musicStarted || !prefs.musicEnabled || prefs.musicVolume === 0) return;
    music.volume = prefs.musicVolume / 100;
    music.play().then(() => { musicStarted = true; }).catch(() => {});
  };
  document.addEventListener("pointerdown", startIntro, { once: true });
  document.addEventListener("keydown", startIntro, { once: true });

  const pages = {
    story: `<h2>Narrazione</h2>
      <p class="detail-lead">Mille anni fa, Vaelmar conobbe la notte eterna.</p>
      <p>Morvakh, il Re Senza Alba, avvolse la terra nell’oscurità. Cinque popoli si unirono e forgiarono i Cinque Sigilli, imprigionandolo sotto il monte Karn-Ushad.</p>
      <p>Per mille anni la prigione ha retto. Ora i Sigilli si spengono uno dopo l’altro. Qualcuno, dall’interno, li sta spezzando.</p>
      <p class="detail-small">Aurelan. Notte di mezza estate. Il Sigillo della Corona d’Alba si spegne e, per la prima volta in mille anni, cala la notte senza luna.</p>
      <p class="detail-lead">«Venite. Siete gli ultimi.»</p>`,
    info: `<h2>Informazioni</h2>
      <p class="detail-lead">Le Cronache di Vaelmar</p>
      <p>Un’avventura fantasy ambientata a Vaelmar, una terra di circa 300 km² tra foreste antiche, città fortificate, montagne, paludi e coste battute dal mare.</p>
      <p>Quattro eroi, quattro percorsi personali e una storia che conduce ai Cinque Sigilli.</p>
      <p class="detail-small">L’Alba dei Cinque Sigilli · Primo capitolo delle Cronache di Vaelmar</p>`,
    enter: `<h2>Entra a Vaelmar</h2>
      <p class="detail-lead">Il viaggio deve ancora cominciare.</p>
      <p>La nuova avventura è in preparazione. Questa porta resterà qui, pronta ad aprirsi quando il mondo e la prima fase giocabile saranno pronti.</p>`
  };

  document.querySelectorAll("[data-page]").forEach((button) => {
    button.addEventListener("click", () => {
      const page = button.dataset.page;
      if (!pages[page]) return;
      startIntro();
      detailContent.innerHTML = pages[page];
      main.hidden = true;
      detail.hidden = false;
    });
  });
  const closeDetail = () => { detail.hidden = true; main.hidden = false; };
  $("#back-button").addEventListener("click", closeDetail);

  const openSettings = () => { startIntro(); settings.hidden = false; $("#close-settings").focus(); };
  const closeSettings = () => { settings.hidden = true; $("#open-settings").focus(); };
  $("#open-settings").addEventListener("click", openSettings);
  $("#close-settings").addEventListener("click", closeSettings);
  $("#done-settings").addEventListener("click", closeSettings);
  settings.addEventListener("click", (event) => { if (event.target === settings) closeSettings(); });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      if (!settings.hidden) closeSettings();
      else if (!detail.hidden) closeDetail();
    }
  });

  musicVolume.addEventListener("input", () => {
    prefs.musicVolume = clamp(musicVolume.value);
    applyAudio(); persist();
    if (prefs.musicVolume > 0 && prefs.musicEnabled) startIntro();
  });
  fxVolume.addEventListener("input", () => {
    prefs.fxVolume = clamp(fxVolume.value);
    applyAudio(); persist();
  });
  musicEnabled.addEventListener("change", () => {
    prefs.musicEnabled = musicEnabled.checked;
    applyAudio(); persist();
    if (prefs.musicEnabled) startIntro();
    else music.pause();
  });
  fxEnabled.addEventListener("change", () => {
    prefs.fxEnabled = fxEnabled.checked;
    applyAudio(); persist();
  });
  applyAudio();
})();