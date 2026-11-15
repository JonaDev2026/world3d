# Diario di sviluppo

## Obiettivo
World3D diventa un editor desktop nativo per Linux, scritto in Python. La versione browser resta temporaneamente nel repository come riferimento durante la migrazione.

## Porting Python - prima base desktop
- Aggiunto `world3d.py` con interfaccia PySide6 e viewport OpenGL.
- Ricreati piano, griglia, strumenti base, selezione, inspector, trasformazioni numeriche, colori e finiture.
- Aggiunti importazione modelli GLB, GLTF, OBJ e STL tramite trimesh.
- Aggiunta importazione immagini PNG, JPG e WEBP.
- Aggiunti salvataggio/apertura JSON, geometrie dei modelli incorporate e cronologia undo/redo.
- Aggiunta lista espandibile degli oggetti importati con rimozione dal catalogo.
- Dipendenze installabili dai repository Linux, senza pip.

## Da completare e verificare
- Verificare l'avvio e il rendering su Debian/Ubuntu X11 e Wayland.
- Completare la navigazione e il posizionamento 3D tramite ray casting reale.
- Portare la mappatura delle texture procedurali in scala metrica e l'applicazione delle texture personali.
- Completare le traduzioni IT/EN/FR/ES.
- Migliorare i gizmo interattivi per spostamento e rotazione.
- Verificare import/export di progetti con modelli e texture.
- Solo dopo la verifica funzionale rimuovere i file della versione browser.
