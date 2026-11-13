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

### Fondamenta tempo di Vaelmar — 2026-11-13
- [x] Modulo indipendente `js/world-time.js` per orologio e calendario, senza dipendenze Three.js.
- [x] Giorno di gioco: 30 minuti reali; rapporto temporale 48:1.
- [x] Calendario strutturale: 12 mesi × 30 giorni, 360 giorni per anno, quattro stagioni da tre mesi.
- [x] Snapshot con anno, mese, giorno, stagione, ora, fase del giorno e avanzamento solare.
- [x] Comandi start/pause, avanzamento, impostazione dell'ora, riposo fino a un'ora e serializzazione per i futuri salvataggi.
- [ ] Collegare l'orologio al gameplay quando sarà disponibile la scena esplorabile.
- [ ] Collegare posizione del sole, cielo, luna, luci e ombre al tempo di Vaelmar.
- [ ] Definire i nomi canonici dei dodici mesi e delle quattro stagioni con la lore.

### Stato reale
Questa è una base grafica e una schermata di selezione, non ancora un gioco completo. Il terreno è vuoto: non ci sono ancora movimento, collisioni, città, missioni, combattimenti o salvataggi della nuova architettura. I personaggi sono prototipi 3D procedurali per definire silhouette e presentazione, da rifinire in seguito. Il nuovo modulo temporale è una fondazione autonoma e non è ancora collegato alla scena o all'interfaccia.

### Prossime tappe
1. Verificare menu e modelli sul browser dopo il deploy.
2. Collegare il tempo di Vaelmar alla futura scena esplorabile e poi alla luce dinamica.
3. Rifinire qualità e proporzioni dei quattro personaggi.
4. Definire camera e ingresso nel mondo vuoto.
5. Implementare movimento, terreno e sistema di streaming.
6. Costruire regioni, città, NPC e storia solo dopo aver approvato la base visiva.
