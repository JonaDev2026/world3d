# WORLD — Progress tracker

> Documento operativo del Master. Aggiornare questo file a ogni sessione di sviluppo.
> Ultimo aggiornamento: 2026-11-13

## Visione

Creare un mondo esplorabile persistente, stilizzato con forme organiche e poligoni morbidi (non estetica Minecraft), con città, paesi, edifici, strade, paesaggi, vegetazione, oggetti e personaggi animati. Il mondo finale avrà un'estensione obiettivo di **300 km²**. La costruzione procederà per regioni e chunk: non si caricheranno 300 km² di geometria tutta insieme.

## Stato attuale verificato nel repository

- [x] Applicazione Three.js in `index.html`, `js/main.js`, `css/style.css`.
- [x] Creazione personaggio con nome, lingua e palette base.
- [x] Anteprima 3D del personaggio nella schermata di creazione.
- [x] Prima persona predefinita e terza persona selezionabile.
- [x] Menu pausa, mappa e controlli predisposti per musica/effetti.
- [x] Traduzioni esterne IT / EN / ES / FR.
- [x] Posizione, personaggio e segnaposto salvati in localStorage.
- [x] Primo insediamento embrionale, due abitazioni, due NPC, portale e piccola valle segreta.
- [ ] Test browser end-to-end: da eseguire sul sito Pages.
- [ ] Sistema animazioni articolate condiviso fra giocatore e NPC.
- [ ] Modelli personaggio con silhouette, volto, capelli, abiti e accessori più curati.
- [ ] Sistema città: lotti, strade, piazze, quartieri, interni e arredi.
- [ ] Sistema mondo a chunk con streaming e salvataggio dei cambiamenti.
- [ ] Prima città completa in una regione iniziale di 1 km².
- [ ] Progressiva espansione verso l'obiettivo di 300 km².

## Dimensioni e scala

Obiettivo: **300 km²** di superficie esplorabile. Per un mondo quadrato equivale a circa 17,32 km per lato. Convenzione proposta: 1 unità Three.js = 1 metro; quindi circa 17.321 × 17.321 unità. Non generare/caricare tutto in una volta.

La scena attuale usa un terreno di 96 × 96 unità (circa 9.216 m² = 0,009216 km² con la scala proposta). È un prototipo, non ancora una mappa da 300 km².

## Prossime tappe

### Fase A — Fondamenta del giocatore
1. Correggere e verificare l'ordine di inizializzazione degli attori.
2. Rig articolato: bacino, busto, collo/testa, braccia, avambracci, mani, cosce, gambe e piedi.
3. Cicli distinti: idle, camminata, corsa, salto, atterraggio e svolta; blending morbido.
4. Animazione NPC con idle credibile, sguardo, gesti e camminate brevi.
5. Migliorare stile e proporzioni dei personaggi senza voxel/cubi.

### Fase B — Prima città
1. Definire un'area iniziale pianeggiante e attraversabile.
2. Disegnare planimetria urbana: centro, piazza, strade, quartieri residenziali, botteghe, servizi e margine agricolo.
3. Edifici modulari con varietà regionale, tetti, finestre, porte, balconi e interni visitabili.
4. Oggetti coerenti con il luogo: arredi urbani, insegne, lampioni, panchine, mercati, recinzioni, attrezzi, vegetazione.
5. NPC con ruoli, routine, animazioni e dialoghi localizzati.

### Fase C — Mondo 300 km²
1. Chunk di terreno e biomi caricati in prossimità del giocatore.
2. Dati geografici deterministici da seed: altitudine, acqua, foreste, campi e percorsi.
3. Regioni con identità: città, paesi, borghi, campagne, boschi, fiumi, laghi e rilievi.
4. Persistenza delle modifiche del giocatore e dei luoghi scoperti.
5. Ottimizzazione LOD, istanze, ombre e caricamento progressivo.

## Regole di sviluppo

- Il Master aggiorna PROGRESS.md, DIARY.md e docs/WORLD_STRUCTURE.md quando cambia lo stato.
- Non dichiarare completato ciò che non è stato provato nel browser.
- Non sostituire o cancellare i salvataggi esistenti; mantenere compatibilità con `world3d-v02`.
- Non creare un enorme terreno monolitico: chunk streaming e caricamento progressivo sono requisiti.
- Prima città e dettagli devono avere una logica geografica e culturale coerente.
- Preferire mesh morbide e dettagliate, materiali PBR leggeri e silhouette leggibili; evitare look Minecraft.
