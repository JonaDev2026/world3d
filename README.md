# WORLD — Open Exploration

![](preview.png)

Prima versione giocabile di WORLD: un mondo 3D voxel da esplorare in prima persona.

## Avvio su Linux

Non servono Node.js, pip, installazioni o compilazioni. È sufficiente Python già presente nel sistema.

1. Clona il repository (solo la prima volta) oppure entra nella cartella già clonata:
   ```bash
   git clone https://github.com/JonaDev2026/world3d.git
   cd world3d
   ```
   Per gli aggiornamenti successivi:
   ```bash
   cd world3d
   git pull
   ```
2. Avvia un piccolo server locale:
   ```bash
   python3 -m http.server 8000
   ```
3. Apri Firefox su http://localhost:8000
4. Premi **ENTRA NEL MONDO**.

Three.js viene caricato da jsDelivr: serve una connessione Internet.

## Comandi

| Tasto | Azione |
|---|---|
| Freccia su / W | Avanti |
| Freccia giù / S | Indietro |
| Freccia sinistra / destra | Ruota |
| A / D | Movimento laterale |
| Mouse | Guarda intorno |
| Spazio | Salta |
| Shift | Corri |
| P | Salva un luogo |
| M | Apri / chiudi la mappa |
| Esc | Libera il mouse |

Puoi anche usare il pulsante **SALVA LUOGO** nell'interfaccia.

Per fermare il server torna al terminale e premi Ctrl+C.

## Salvataggi

Posizione e luoghi salvati vengono conservati nel localStorage di Firefox sul tuo computer. Non vengono sovrascritti da `git pull` e non vengono caricati nel repository.

## Struttura

- `index.html` — gioco, mondo procedurale, controlli, mappa e salvataggi.

## Stato

**0.1 — First Exploration**

Prima base esplorabile: terreno voxel procedurale, colline, alberi, piccolo insediamento, mappa e segnaposto personali.
