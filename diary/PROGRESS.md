# Diario di sviluppo

## Migrazione a desktop Python

La versione browser è stata rimossa dalla radice del progetto e sostituita con l'app desktop nativa.

### Implementato
- `world3d.py` con interfaccia PySide6/Qt 6 e viewport OpenGL.
- Qt OpenGL Widgets separato, con selezione automatica del backend grafico: X11 o Wayland.
- Piano regolabile, griglia, snap a 0,1 m, orbita, pan, zoom e vista dall'alto.
- Strumenti per muro, pavimento, porta, finestra, blocco e albero.
- Selezione tramite bounding box proiettata, spostamento e rotazione con trascinamento.
- Inspector numerico per posizione, dimensioni e rotazione.
- Palette 16 colori, texture procedurali, texture personalizzate e finiture.
- Importazione di cartelle, immagini PNG/JPG/WEBP e modelli GLB/GLTF/OBJ/STL.
- Conversione dei modelli importati in GLB incorporati nel progetto.
- Catalogo oggetti importati espandibile, inserimento copie e rimozione non distruttiva.
- Salvataggio, apertura, esportazione JSON e compatibilità con lo schema dei progetti browser.
- Undo/redo e preferenza lingua persistente IT/EN/FR/ES con rilevamento automatico.
- Script di avvio e installazione desktop; nessun uso di pip.

### Da verificare
- Compilazione Python e avvio effettivo con le dipendenze di sistema.
- Rendering OpenGL su Wayland nativo e X11.
- Test interattivi di importazione modelli/texture e riapertura dei progetti.
- Verifica di progetti browser complessi, soprattutto GLTF con risorse esterne.

La migrazione è una prima versione desktop completa nelle funzioni principali, ma non va ancora dichiarata stabile finché non supera i test su Linux reale.
