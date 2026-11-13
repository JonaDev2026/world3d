# WORLD — Struttura del mondo

## Nuova architettura di partenza

Il progetto riparte da una base pulita. Il vecchio prototipo del villaggio, il suo HUD e le precedenti schermate non definiscono più l'architettura del gioco.

### Mondo geografico
- Superficie obiettivo iniziale: **300 km²**.
- Forma di riferimento: quadrato di circa **17.320,5 × 17.320,5 metri**.
- Unità Three.js: 1 unità = 1 metro.
- Stato attuale: un unico piano vuoto, senza biomi, città, strade, alberi o edifici.
- In futuro: suddivisione in chunk caricati progressivamente; non è ancora implementata.

### Menu e selezione
- Menu principale cinematografico, pulito e minimale.
- Scena 3D con quattro personaggi visibili e selezionabili.
- Scheda personaggio con nome, ruolo, descrizione e arma.
- Musica principale: assets/audio/music/main-theme.mp3.
- Impostazioni per musica e volume; effetti sonori da collegare.

### I quattro protagonisti
- **Eldrin:** mago, bastone arcano.
- **Lyra:** arciera, arco lungo.
- **Kael:** guerriero, spada.
- **Il Velato:** misterioso, lancia-reliquia.

### Direzione visiva
Videogioco 3D moderno, pulito, con materiali e forme morbide, illuminazione cinematografica e personaggi leggibili. Evitare voxel, blocchi cubici e interfacce decorative eccessive.

### Fasi successive
1. Approvazione della grafica del menu e della selezione.
2. Modelli definitivi dei protagonisti.
3. Ingresso nel mondo e controllo del personaggio.
4. Terreno, collisioni e streaming.
5. Biomi, città, popolazioni, missioni e combattimento.
