# WORLD — Struttura del mondo

## 1. Coordinate e scala

- Unità di misura: 1 unità Three.js = 1 metro.
- Superficie finale: 300 km².
- Ingombro di riferimento quadrato: circa 17.321 m × 17.321 m.
- Origine coordinate: angolo sud-ovest della mappa globale; X verso est, Z verso nord.
- Il giocatore e i dati persistenti usano coordinate globali, non coordinate locali del chunk.

## 2. Suddivisione geografica

La mappa globale è divisa in chunk quadrati. Dimensione iniziale consigliata: 256 m × 256 m (0,065536 km² ciascuno). Per 300 km² occorrono circa 4.578 chunk equivalenti, con una griglia di riferimento 68 × 68 e margini non necessariamente tutti abitati.

Caricare inizialmente solo i chunk vicini al giocatore (anello di prossimità), mantenere un piccolo buffer e scaricare quelli lontani. Le entità e le modifiche persistenti devono essere salvate per ID di chunk.

## 3. Prima regione e prima città

Partire da un angolo della mappa globale. La prima regione deve contenere:
- una città principale con centro riconoscibile;
- piazza centrale e rete stradale leggibile;
- quartieri residenziali con case di forme e materiali vari;
- botteghe e servizi;
- edifici civici e luoghi di incontro;
- campi e fattorie verso la periferia;
- bosco e paesaggio naturale oltre il costruito;
- strade secondarie che suggeriscono futuri collegamenti.

La città deve essere progettata come un insieme coerente e percorribile, non come edifici casuali distribuiti sul terreno.

## 4. Catalogo ambientale

Gli oggetti dipendono dalla regione e dalla cultura del luogo.

### Città
Case, condomini, edifici pubblici, negozi, mercati, fontane, panchine, lampioni, cestini, cartelli stradali, marciapiedi, fermate, veicoli statici e arredi.

### Paesi e borghi
Case rurali, fienili, stalle, pozzi, recinzioni, orti, attrezzi, carri, piccoli negozi, piazzette e campanili.

### Natura
Alberi di specie diverse, arbusti, erba, fiori, rocce, sentieri, corsi d'acqua, laghi, colline e montagne.

### Interni
Pavimenti, pareti, porte apribili, finestre, scale, mobili, scaffali, letti, tavoli, sedie, lampade e oggetti d'uso.

## 5. Personaggi e simulazione

Ogni personaggio deve avere:
- identità e nome;
- modello articolato e animazioni;
- ruolo e luogo di riferimento;
- routine giornaliera semplice;
- punti di destinazione e percorso;
- dialoghi e lingua;
- stato persistente essenziale.

Le animazioni condividono uno scheletro logico: bacino, busto, testa, braccia, avambracci, mani, cosce, gambe e piedi. Cicli base: idle, walk, run, turn, jump, land e gesture.

## 6. Architettura tecnica prevista

- `index.html`: shell e interfaccia.
- `css/style.css`: stile UI.
- `js/main.js`: bootstrap temporaneo del gioco; da suddividere progressivamente.
- `js/world/`: coordinate, chunk, terreno, biomi, città e oggetti.
- `js/actors/`: personaggio giocante, NPC, rig e animazioni.
- `js/systems/`: input, camera, collisioni, audio, persistenza e streaming.
- `js/ui/`: menu, HUD, mappa e creazione personaggio.
- `lang/`: stringhe IT, EN, ES, FR.
- `data/regions/`: dati descrittivi delle regioni e delle città.
- `data/objects/`: catalogo di oggetti e varianti.

## 7. Persistenza locale

Separare i dati salvati:
- profilo personaggio e impostazioni;
- posizione e regione corrente;
- segnaposto e luoghi scoperti;
- modifiche costruite o raccolte;
- stato NPC essenziale.

I dati statici del mondo vengono dal repository; i dati personali e le modifiche del giocatore restano nel browser. Prevedere esportazione/importazione del salvataggio prima di aggiungere grandi progressi di gioco.
