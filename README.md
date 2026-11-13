# WORLD — Open Exploration

![](preview.png)

WORLD è un mondo 3D low-poly da esplorare in terza persona, con terreno continuo, pianura abitabile, villaggio, abitanti e un portale verso la Valle delle Stelle.

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
4. Crea il personaggio scegliendo nome, lingua e colori; poi entra nel mondo.

Three.js viene caricato da jsDelivr: serve una connessione Internet.

## Comandi

| Tasto | Azione |
|---|---|
| Freccia su / W | Avanti |
| Freccia giù / S | Indietro |
| Freccia sinistra / destra | Ruota |
| A / D | Movimento laterale |
| Mouse | Ruota la visuale intorno al personaggio |
| Spazio | Salta |
| Shift | Corri |
| P | Salva un luogo |
| E | Attraversa il portale quando sei vicino |
| M | Apri / chiudi la mappa |
| Esc | Libera il mouse |

Puoi anche usare il pulsante **SALVA LUOGO** nell'interfaccia.

Per fermare il server torna al terminale e premi Ctrl+C.

## Personaggio e lingue

Alla prima visita puoi creare un viaggiatore scegliendo nome, tonalità della pelle, capelli e vestiti. Il personaggio viene mostrato in terza persona e segue i movimenti del giocatore. L'interfaccia è disponibile in italiano, inglese, spagnolo e francese. I testi sono separati in `lang/it.json`, `lang/en.json`, `lang/es.json` e `lang/fr.json`.

## Salvataggi

Personaggio, lingua, posizione e luoghi salvati vengono conservati nel localStorage del browser sul tuo dispositivo. Non vengono sovrascritti da `git pull` e non vengono caricati nel repository.

## Struttura

- `index.html` — struttura della pagina.
- `css/style.css` — stile e interfaccia.
- `js/main.js` — mondo 3D, personaggio, movimento e salvataggi.
- `js/i18n.js` — caricamento delle traduzioni.
- `lang/` — file lingua italiano, inglese, spagnolo e francese.

## Stato

**0.4 — The Living Landscape**

Terreno continuo con superfici poligonali, pianura del villaggio, case appoggiate al suolo, acqua separata dalle aree edificabili, alberi e personaggi low-poly più morbidi. Il mondo iniziale misura 96 × 96 unità: assumendo 1 unità = 1 metro, circa 9.216 m² (0,0092 km²). Restano creazione personaggio, terza persona e lingue IT/EN/ES/FR.
