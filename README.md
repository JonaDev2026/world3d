# World3D

Editor 3D desktop nativo per Linux, sviluppato in Python, PySide6 e OpenGL. Mantiene il layout a tre pannelli dell'editor originale, con Material Icons Round locali, inspector e viewport centrale. Non dipende dal browser.

## Compatibilità

- Linux con X11 oppure Wayland.
- Qt 6 seleziona automaticamente il backend grafico della sessione.
- Su una sessione Wayland, per forzare il backend nativo: `QT_QPA_PLATFORM=wayland world3d`.
- Richiede un driver Mesa/OpenGL desktop compatibile.
- I font Google Sans (Regular e Medium) e Material Icons Round sono inclusi nell'app e caricati localmente, senza dipendenze di rete.

## Installazione dipendenze

Debian / Ubuntu:

```bash
sudo apt install python3 python3-pyside6.qtwidgets python3-pyside6.qtopenglwidgets python3-opengl python3-numpy python3-trimesh python3-pil
```

Arch / Manjaro:

```bash
sudo pacman -S python pyside6 python-pyopengl python-numpy python-trimesh python-pillow
```

Non serve pip.

## Avvio dal repository

```bash
sh run.sh
```

## Installazione nel sistema

```bash
sudo sh install.sh
```

Il comando `world3d` e la voce applicazione vengono installati sotto `/usr/local`. Per usare un prefisso diverso:

```bash
sudo PREFIX=/opt sh install.sh
```

## Funzioni

- Piano 3D regolabile con incrementi di 0,1 m, griglia e snap.
- Navigazione orbitale, vista dall'alto, pan e zoom.
- Strumenti: selezione, muro, pavimento, porta, finestra, blocco e albero.
- Gizmo cartesiano XYZ visibile, trascinamento sugli assi X/Z, rotazione e proprietà numeriche con incrementi di 0,1 m.
- Duplicazione, eliminazione, svuotamento, undo e redo.
- Palette da 16 colori, texture procedurali, texture personalizzate e finiture opaco/satinato/lucido/metallico.
- Importazione di cartelle, texture PNG/JPG/WEBP e modelli GLB/GLTF/OBJ/STL.
- Catalogo modelli importati espandibile, inserimento di copie e rimozione dalla lista.
- Salvataggio, apertura ed esportazione di progetti JSON.
- Lingue italiano, inglese, francese e spagnolo; rilevamento automatico della lingua di sistema.
- I modelli importati vengono incorporati nei progetti come GLB autonomi.

## Progetti

Il formato JSON mantiene `format=world3d-project` e `version=1`, così i progetti creati dalla versione browser possono essere aperti quando le risorse sono incorporate. I GLTF che dipendono da file esterni non incorporati richiedono prima l'esportazione in GLB.

## Stato

La versione browser è stata sostituita dall'app desktop Python. L'implementazione nativa è pronta come prima versione di lavoro; prima di definirla stabile va ancora verificata su sessioni Wayland e X11 reali, con test pratici di importazione, modifica e riapertura dei progetti.
