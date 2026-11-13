# WORLD — Diario del Master

Diario cronologico delle decisioni, del lavoro e delle prossime intenzioni.

## 2026-11-13 — Consolidamento della visione

### Decisioni
- WORLD è un mondo persistente da esplorare, non una semplice demo voxel.
- Obiettivo geografico a lungo termine: 300 km².
- Si costruisce progressivamente partendo da un angolo del mondo e completando la prima città.
- L'identità visiva deve essere stilizzata ma raffinata: forme organiche, poligoni più precisi, materiali e dettagli; niente estetica cubettosa Minecraft.
- Il giocatore deve avere un corpo articolato e animazioni naturali; gli NPC devono sembrare abitanti, non manichini.
- Il Master cura ambienti, città, personaggi, oggetti, segreti e narrazione. La struttura tecnica viene mantenuta documentata.

### Stato ereditato
- Prototipo Three.js con mappa iniziale 96 × 96 unità.
- Prima persona predefinita, terza persona selezionabile.
- Creazione personaggio, anteprima 3D e quattro lingue.
- Menu pausa e salvataggi locali.
- Due case, due abitanti, un portale e una piccola area segreta.

### Nota tecnica da verificare
Nel codice corrente la lista `animatedActors` viene dichiarata dopo la creazione degli NPC, mentre la funzione `person()` la usa. L'ordine può causare un errore di inizializzazione JavaScript (Temporal Dead Zone). Va corretto prima di ampliare la scena.

### Prossimo obiettivo
Costruire un sistema di animazione articolato condiviso dal personaggio giocante e dagli abitanti: locomozione, idle, corsa, salto, atterraggio, movimenti di testa e braccia. Poi rinnovare il design dei personaggi e impostare il primo isolato della città.

---

## 2026-11-13 — Primo corpo articolato

- **Realizzato:** corretto l'ordine di inizializzazione degli NPC; il personaggio giocante ora usa un rig con busto, testa, spalle, gomiti, anche, ginocchia, stinchi e piedi.
- **Realizzato:** camminata e corsa muovono arti opposti, ginocchia e piedi; la transizione idle/movimento è smussata. Il salto ha una posa dedicata.
- **Realizzato:** anteprima di creazione aggiornata con volto, sopracciglia, tunica, cintura, arti articolati e stivali.
- **Realizzato:** gli abitanti respirano, muovono lo sguardo e fanno piccoli gesti.
- **Verifiche:** controllo statico della sintassi JavaScript e dei riferimenti; nessun test grafico browser eseguito in questa sessione.
- **Decisioni:** la prima città deve essere progettata prima come quartieri e percorsi, poi popolata con edifici e oggetti coerenti. Il target 300 km² richiede chunk streaming, non una singola mesh gigantesca.
- **Prossimo passo:** costruire il sistema geografico a chunk e definire l'area della prima città, poi rifinire animazioni e modelli con un test visivo.

## Modello per le prossime annotazioni

### YYYY-MM-DD — Titolo
- **Realizzato:**
- **Decisioni:**
- **Verifiche:**
- **Problemi aperti:**
- **Prossimo passo:**
