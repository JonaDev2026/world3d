# WORLD — Diario di sviluppo

## 2026-11-13 — Ripartenza da zero

Decisione: abbandonare il vecchio prototipo e ricostruire il gioco partendo dall'identità grafica. Non si continua a stratificare il vecchio villaggio, l'HUD, la mappa o la vecchia creazione del personaggio.

### Nuova base
- Menu principale cinematografico e minimale.
- Scena 3D Three.js pulita, con quattro protagonisti mostrati come modelli tridimensionali.
- Selezione del protagonista con nome, ruolo, descrizione e arma.
- Musica principale predisposta nel percorso assets/audio/music/main-theme.mp3.
- Controlli di musica e volume; gli effetti sonori saranno collegati quando saranno disponibili gli asset.
- Piano geografico vuoto di 300 km², quadrato di 17,32 km per lato.

### Personaggi
- Eldrin: mago con bastone arcano.
- Lyra: arciera con arco lungo.
- Kael: guerriero con spada.
- Il Velato: figura misteriosa con lancia-reliquia.

### Verifiche e limiti
- Verificati staticamente gli ID HTML usati dal nuovo JavaScript.
- Il codice va ancora provato visivamente nel browser: non dichiarare il menu collaudato finché non viene verificato sul sito.
- I personaggi attuali sono modelli procedurali iniziali, non asset finali.
- Il mondo è soltanto un piano vuoto; non sono ancora implementati movimento, collisioni, gameplay, streaming o contenuti.

### Direzione successiva
Prima approvare l'aspetto del menu e dei personaggi. Solo dopo procedere con il mondo giocabile, senza recuperare il vecchio impianto.
