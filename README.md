# World3D

Editor 3D desktop per Linux, sviluppato in Python e PySide6.

## Avvio

Su Debian / Ubuntu (pacchetti di sistema, senza pip):

```bash
sudo apt install python3-pyside6.qtwidgets python3-opengl python3-numpy python3-trimesh python3-pil
python3 world3d.py
```

Su distribuzioni Arch-based installare i pacchetti equivalenti: `pyside6`, `python-pyopengl`, `python-numpy`, `python-trimesh`, `python-pillow`.

## Funzioni

- Editor desktop con viewport 3D OpenGL e pannelli laterali.
- Piano regolabile, griglia e navigazione orbitale (tasto destro), pan (tasto centrale), zoom (rotella).
- Strumenti per muri, pavimenti, porte, finestre, blocchi e alberi.
- Selezione, spostamento numerico, rotazione, ridimensionamento, duplicazione ed eliminazione.
- Colori, finiture e catalogo oggetti importati.
- Importazione modelli GLB, GLTF, OBJ e STL tramite trimesh.
- Importazione texture PNG, JPG, WEBP.
- Salvataggio e apertura progetti JSON, con geometrie dei modelli incorporate.
- Undo/redo e scorciatoie da tastiera.

## Dipendenze

Python 3, PySide6, PyOpenGL, NumPy e trimesh. Tutte installabili dai repository della distribuzione; non è richiesto pip.

## Stato

La migrazione dall'editor browser è in corso. Questa è la prima base desktop nativa: alcune funzioni della versione web (texture procedurali con mappatura fisica, materiali avanzati e localizzazione completa) devono ancora essere portate e verificate.
