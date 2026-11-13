# WORLD — Open Exploration

Prima versione giocabile di WORLD: un piccolo mondo 3D voxel da esplorare in prima persona.

## Avvio

Non serve installare Python, Node.js o compilare.

1. Clona o aggiorna il repository:
   ```bash
   git pull
   ```
2. Apri `index.html` con Firefox o un browser moderno.
3. Premi **ENTRA NEL MONDO**.

Three.js viene caricato da jsDelivr, quindi è necessaria una connessione Internet al primo avvio.

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

## Salvataggi

Posizione e luoghi salvati vengono conservati nel localStorage del browser sul tuo computer. Non vengono sovrascritti da `git pull` e non vengono caricati nel repository.

## Struttura

- `index.html` — gioco, mondo procedurale, controlli, mappa e salvataggi.

## Stato

**0.1 — First Exploration**

Prima base esplorabile: terreno voxel procedurale, colline, alberi, piccolo insediamento, mappa e segnaposto personali.
