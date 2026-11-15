# Diario di sviluppo

## Obiettivo
Editor 3D di costruzione su un piano vuoto, con flusso di lavoro ispirato alla modalità Costruisci di The Sims 4.

## Impostazione iniziale
- Progetto indipendente, senza ambientazioni o identità narrative predefinite.
- Interfaccia dedicata con Google Sans come prima scelta tipografica e Material Symbols.
- HTML, CSS e JavaScript in file distinti.
- Scena 3D vuota all'avvio: piano 40 × 40 metri, griglia e telecamera orbitale.

## Prima versione
- Strumenti per muri, pavimenti, porte, finestre, blocchi e alberi.
- Selezione e trasformazione degli elementi.
- Inspector con posizione, dimensioni e rotazione.
- Griglia, snap, vista dall'alto, zoom e centratura.
- Salvataggio locale della scena nel browser.
- Annulla/ripeti per le operazioni registrate.

## Colori, texture e finiture
- Palette di 16 colori selezionabili e selettore colore libero.
- Catalogo materiali con legno, piastrelle, marmo, cemento, mattoni, tessuto, metallo e vetro.
- Texture procedurali generate nel browser, senza immagini esterne.
- Finiture opaca, satinata, lucida e metallica.
- Applicazione all'elemento selezionato e memorizzazione di colore, texture e finitura nel salvataggio locale.
- Materiali inclusi nella cronologia annulla/ripeti.

## Precisione delle misure
- Posizioni X/Z e dimensioni L/H/P regolabili a incrementi di 0,1 m.
- Snap della griglia e del gizmo di spostamento impostato a 0,1 m.

## Da verificare
- Test nel browser su desktop.
- Rifinire la costruzione di stanze e pareti per segmenti.
- Aggiungere catalogo di oggetti e materiali.
- Verificare compatibilità e caricamento dei font Google Sans nel browser.

## Impostazioni e lingue
- Finestra Impostazioni con larghezza e profondità del piano configurabili senza limite massimo, con minimo 0,1 m e precisione di 0,1 m.
- Ridimensionamento del piano senza eliminare gli oggetti già posizionati.
- Lingue italiano, inglese, francese e spagnolo in file separati.
- Rilevamento automatico della lingua del sistema al primo avvio; scelta manuale persistente nelle preferenze del browser.

## Scala reale delle texture e piani estesi
- Le texture sono dimensionate in metri: piastrelle da 10 cm (10 ripetizioni per metro), mattoni con modulo da circa 50 cm e altre superfici con modulo base da 1 m.
- Le ripetizioni sono calcolate sulle dimensioni fisiche dell'oggetto, non sull'intera superficie come immagine unica.
- Rimosso il limite massimo di 500 m per larghezza e profondità del piano.
- La griglia visualizzata diventa progressivamente meno fitta sui piani molto grandi per contenere il carico grafico; lo snap di posizionamento resta a 0,1 m.
- Distanza massima della camera e piano di clipping ampliate per consentire la navigazione su superfici di scala chilometrica.

## Correzione texture e file progetto
- Corretto il ripristino delle texture: la creazione del materiale riceve ora le dimensioni effettive dell'oggetto anche durante il caricamento.
- Aggiunta esportazione del progetto in un file JSON con piano, oggetti, posizioni, dimensioni, rotazioni e materiali.
- Aggiunta apertura di un file progetto JSON; l'importazione ripristina anche le dimensioni del piano e aggiorna il salvataggio locale.

## Salvataggio esclusivamente su file
- Rimossa la persistenza della scena e delle dimensioni del piano in localStorage.
- L'editor parte da una scena vuota con piano predefinito a ogni nuovo avvio.
- L'apertura e l'esportazione dei progetti avvengono esclusivamente tramite file JSON.
- Lingua e preferenze dell'interfaccia restano salvate separatamente nel browser.
