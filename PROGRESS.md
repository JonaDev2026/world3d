# WORLD — Progressi

## Nuova ripartenza — 2026-11-13

### Conservato
- Romanzo canonico: `LE CRONACHE DI VAELMAR.md`.
- Tutti gli audio originali in `assets/audio/` (musica e ambienti).

### Fase 1 — Menu principale
- Nuova schermata iniziale realizzata da zero; nessun componente del vecchio menu riutilizzato.
- Direzione visiva: **Cronache antiche**, paesaggio illustrato di Vaelmar, architettura della Cittadella di Aurelan, palette blu notte, nero carbone, avorio e oro antico; accenti rosso scuro molto discreti.
- Font del titolo e delle voci principali: **MedievalSharp**.
- Titolo: **L’Alba dei Cinque Sigilli**.
- Sottotitolo: **Le Cronache di Vaelmar**.
- Voci: **Narrazione**, **Informazioni**, **Entra**; impostazioni audio separate.
- Narrazione e informazioni derivate dal romanzo canonico, senza introdurre nuovi fatti.
- Musica introduttiva: `assets/audio/music/main-theme.mp3`, volume iniziale 20%.
- Impostazioni: volume e attivazione separata di musica ed effetti sonori; preferenze salvate nel browser.
- La musica parte alla prima interazione, nel rispetto del blocco autoplay dei browser.
- La voce Entra è una schermata segnaposto: il mondo giocabile non è ancora implementato.

### File
- `index.html`
- `css/style.css`
- `js/main.js`

### Verifiche
- Struttura e riferimenti agli asset controllati staticamente.
- Test nel browser locale ancora da eseguire.

### Prossimo passo
Aprire il menu in locale e valutare la resa grafica prima di procedere oltre. Nessun mondo 3D o sistema di gioco aggiunto in questa fase.
