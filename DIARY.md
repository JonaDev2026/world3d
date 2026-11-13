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

## Modello per le prossime annotazioni

### YYYY-MM-DD — Titolo
- **Realizzato:**
- **Decisioni:**
- **Verifiche:**
- **Problemi aperti:**
- **Prossimo passo:**
