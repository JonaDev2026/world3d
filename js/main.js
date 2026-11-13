(() => {
  "use strict";
  const $ = (s) => document.querySelector(s);
  const music = $("#intro-music");
  const intro = $("#intro-screen");
  const cover = $("#cover-screen");
  const pageScreen = $("#page-screen");
  const pageContent = $("#page-content");
  const settings = $("#settings-screen");
  const musicVolume = $("#music-volume");
  const fxVolume = $("#fx-volume");
  const musicEnabled = $("#music-enabled");
  const fxEnabled = $("#fx-enabled");
  const musicValue = $("#music-value");
  const fxValue = $("#fx-value");
  const defaults = {musicVolume:20,fxVolume:100,musicEnabled:true,fxEnabled:true};
  let prefs = {...defaults};
  try {
    const saved = JSON.parse(localStorage.getItem("vaelmar-audio-settings") || "null");
    if(saved && typeof saved === "object") prefs = {...defaults,...saved};
  } catch (_) {}
  const clamp = (v) => Math.max(0,Math.min(100,Number(v)||0));
  const persist = () => {try{localStorage.setItem("vaelmar-audio-settings",JSON.stringify(prefs));}catch(_){}};
  const applyAudio = () => {
    music.volume=prefs.musicVolume/100;
    music.muted=!prefs.musicEnabled;
    musicVolume.value=prefs.musicVolume;
    fxVolume.value=prefs.fxVolume;
    musicEnabled.checked=prefs.musicEnabled;
    fxEnabled.checked=prefs.fxEnabled;
    musicValue.textContent=prefs.musicVolume+"%";
    fxValue.textContent=prefs.fxVolume+"%";
  };
  let musicStarted=false;
  const startMusic=()=>{
    if(musicStarted || !prefs.musicEnabled || prefs.musicVolume===0) return;
    music.volume=prefs.musicVolume/100;
    music.play().then(()=>{musicStarted=true;}).catch(()=>{});
  };
  const pages={
    story:`<h2>Narrazione</h2>
      <p class="detail-lead">Mille anni fa, Vaelmar conobbe la notte eterna.</p>
      <p>Morvakh, il Re Senza Alba, avvolse la terra nell’oscurità. Cinque popoli si unirono e forgiarono i Cinque Sigilli, imprigionandolo sotto il monte Karn-Ushad.</p>
      <p>Per mille anni la prigione ha retto. Ora i Sigilli si spengono uno dopo l’altro. Qualcuno, dall’interno, li sta spezzando.</p>
      <p class="detail-small">Aurelan. Notte di mezza estate. Il Sigillo della Corona d’Alba si spegne e, per la prima volta in mille anni, cala la notte senza luna.</p>
      <p class="detail-lead">«Venite. Siete gli ultimi.»</p>`,
    info:`<h2>Informazioni</h2>
      <p class="detail-lead">Le Cronache di Vaelmar</p>
      <p>Un’avventura fantasy ambientata a Vaelmar, una terra di circa 300 km² tra foreste antiche, città fortificate, montagne, paludi e coste battute dal mare.</p>
      <p>Quattro eroi, quattro percorsi personali e una storia che conduce ai Cinque Sigilli.</p>
      <p class="detail-small">L’Alba dei Cinque Sigilli · Primo capitolo delle Cronache di Vaelmar</p>`,
    enter:`<h2>Entra a Vaelmar</h2>
      <p class="detail-lead">Il viaggio deve ancora cominciare.</p>
      <p>La nuova avventura è in preparazione. Questa porta resterà qui, pronta ad aprirsi quando il mondo e la prima fase giocabile saranno pronti.</p>`
  };
  $("#intro-continue").addEventListener("click",()=>{
    startMusic();
    intro.hidden=true;
    cover.hidden=false;
  });
  document.querySelectorAll("[data-page]").forEach((button)=>{
    button.addEventListener("click",()=>{
      const content=pages[button.dataset.page];
      if(!content)return;
      startMusic();
      pageContent.innerHTML=content;
      cover.hidden=true;
      pageScreen.hidden=false;
    });
  });
  const back=()=>{pageScreen.hidden=true;cover.hidden=false;};
  $("#back-button").addEventListener("click",back);
  const openSettings=()=>{startMusic();settings.hidden=false;$("#close-settings").focus();};
  const closeSettings=()=>{settings.hidden=true;$("#open-settings").focus();};
  $("#open-settings").addEventListener("click",openSettings);
  $("#close-settings").addEventListener("click",closeSettings);
  $("#done-settings").addEventListener("click",closeSettings);
  settings.addEventListener("click",(e)=>{if(e.target===settings)closeSettings();});
  document.addEventListener("keydown",(e)=>{
    if(e.key==="Escape"){
      if(!settings.hidden)closeSettings();
      else if(!pageScreen.hidden)back();
    }
  });
  musicVolume.addEventListener("input",()=>{
    prefs.musicVolume=clamp(musicVolume.value);applyAudio();persist();
    if(prefs.musicVolume>0&&prefs.musicEnabled)startMusic();
  });
  fxVolume.addEventListener("input",()=>{prefs.fxVolume=clamp(fxVolume.value);applyAudio();persist();});
  musicEnabled.addEventListener("change",()=>{
    prefs.musicEnabled=musicEnabled.checked;applyAudio();persist();
    if(prefs.musicEnabled)startMusic();else music.pause();
  });
  fxEnabled.addEventListener("change",()=>{prefs.fxEnabled=fxEnabled.checked;applyAudio();persist();});
  applyAudio();
})();