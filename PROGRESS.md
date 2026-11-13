# WORLD — Progressi

## Nuova base del gioco — 2026-11-13

### Direzione approvata
- Ripartenza da zero: il vecchio prototipo esplorativo e la vecchia interfaccia non sono più la base del gioco.
- Obiettivo visivo: videogioco 3D moderno, pulito, cinematografico; niente estetica voxel o Minecraft.
- Prima priorità: identità grafica, menu principale, musica e selezione dei protagonisti.

### Implementato
- [x] Nuovo menu principale con titolo della saga, call to action e navigazione essenziale.
- [x] Nuova scena Three.js con quattro protagonisti 3D visibili insieme.
- [x] Selezione individuale dei quattro eroi: Eldrin (mago), Lyra (arciera), Kael (spadaccino), Il Velato (lanciere).
- [x] Scheda dinamica con ruolo, descrizione e arma del personaggio selezionato.
- [x] Impostazioni audio con volume musica e predisposizione per gli effetti sonori.
- [x] Riproduzione predisposta da assets/audio/music/main-theme.mp3; il browser richiede un'interazione prima dell'avvio audio.
- [x] Rimossa dal percorso principale la vecchia interfaccia di creazione personaggio, HUD, mappa e prototipo del villaggio.
- [x] Piano geografico vuoto di 300 km²: quadrato di circa 17.320,5 × 17.320,5 metri.
- [x] Documentazione riallineata alla nuova ripartenza.

### Stato reale
Questa è una base grafica e una schermata di selezione, non ancora un gioco completo. Il terreno è vuoto: non ci sono ancora movimento, collisioni, città, missioni, combattimenti o salvataggi della nuova architettura. I personaggi sono prototipi 3D procedurali per definire silhouette e presentazione, da rifinire in seguito.

### Prossime tappe
1. Verificare menu e modelli sul browser dopo il deploy.
2. Rifinire qualità e proporzioni dei quattro personaggi.
3. Definire camera e ingresso nel mondo vuoto.
4. Implementare movimento, terreno e sistema di streaming.
5. Costruire regioni, città, NPC e storia solo dopo aver approvato la base visiva.
