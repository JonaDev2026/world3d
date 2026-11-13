# WORLD — Struttura del mondo

## Nuova architettura di partenza

Il progetto riparte da una base pulita. Il vecchio prototipo del villaggio, il suo HUD e le precedenti schermate non definiscono più l'architettura del gioco.

### Mondo geografico
- Superficie obiettivo iniziale: **300 km²**.
- Forma di riferimento: quadrato di circa **17.320,5 × 17.320,5 metri**.
- Unità Three.js: 1 unità = 1 metro.
- Stato attuale: un unico piano vuoto, senza biomi, città, strade, alberi o edifici.
- In futuro: suddivisione in chunk caricati progressivamente; non è ancora implementata.

### Tempo e calendario di Vaelmar
- Durata di un giorno completo: **30 minuti reali**.
- Rapporto temporale: **48 secondi di Vaelmar per ogni secondo reale**; un'ora di Vaelmar dura 75 secondi reali.
- Calendario: 12 mesi da 30 giorni, 360 giorni per anno.
- Quattro stagioni da 90 giorni, ciascuna composta da tre mesi.
- Mesi, in ordine: **Germoglio**, **Fioritura**, **Solealto**, **Ardore**, **Mietitura**, **Mezzaluce**, **Foglia d'Oro**, **Bruma**, **Cenere**, **Gelo Profondo**, **Notte Quieta**, **Ultima Fiamma**.
- Stagioni: **Risveglio** (mesi 1–3), **Alta Luce** (4–6), **Caduta** (7–9), **Lungo Inverno** (10–12).
- Il modulo `js/world-time.js` calcola data, ora, nome del mese, stagione, giorno della stagione, fase del giorno e avanzamento solare; gestisce pausa, ripresa, avanzamento, riposo e serializzazione.
- Fasce giornaliere provvisorie: alba 05:00–07:00; mattina 07:00–11:00; giorno 11:00–16:00; pomeriggio 16:00–19:00; tramonto 19:00–20:00; crepuscolo 20:00–22:00; notte 22:00–05:00.
- Nell'anteprima attuale il clock parte alle 06:00 entrando nella schermata di avvio del mondo e si ferma tornando al menu.
- La scena aggiorna luce solare e lunare, sfere di sole/luna e colore del cielo e della nebbia; un HUD mostra data, ora e fase.
- Questa anteprima non è ancora il ciclo del gameplay: il tempo dovrà avanzare nella futura scena esplorabile e fermarsi nei menu e nelle pause.
- La progressione della Notte Eterna di Morvakh sarà pilotata dagli eventi narrativi e dallo stato dei Sigilli, non dal semplice calendario.

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
1. Verificare il ciclo giorno/notte e la sua resa visiva.
2. Portare il tempo di Vaelmar nella futura scena esplorabile.
3. Definire i modelli definitivi dei protagonisti.
4. Ingresso nel mondo e controllo del personaggio.
5. Terreno, collisioni, biomi e streaming.
6. Città, popolazioni, missioni e combattimento.
