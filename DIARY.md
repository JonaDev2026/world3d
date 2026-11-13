# WORLD — Diario di sviluppo

## 2026-11-13 — Ripartenza da zero

Decisione: abbandonare il vecchio prototipo e ricostruire il gioco partendo dall'identità grafica. Non si continua a stratificare il vecchio villaggio, l'HUD, la mappa o la vecchia creazione del personaggio.

### Nuova base
- Menu principale cinematografico e minimale.
- Scena 3D Three.js pulita, con quattro protagonisti mostrati come modelli tridimensionali.
- Selezione del protagonista con nome, ruolo, descrizione e arma.
- Musica principale predisposta nel percorso assets/audio/music/main-theme.mp3.
- Controlli di musica e volume; gli effetti sonori saranno collegati quando saranno disponibili gli asset.
- Piano geografico vuoto di 300 km², quadrato di 17,32 km per lato.

### Personaggi
- Eldrin: mago con bastone arcano.
- Lyra: arciera con arco lungo.
- Kael: guerriero con spada.
- Il Velato: figura misteriosa con lancia-reliquia.

### 2026-11-13 — Fondamenta e anteprima del tempo di Vaelmar
- Scelta di design: un giorno completo nel mondo equivale a 30 minuti reali (rapporto 48:1).
- Calendario strutturale iniziale: 12 mesi da 30 giorni, 360 giorni per anno, quattro stagioni da tre mesi.
- Creato il modulo indipendente js/world-time.js per data, ora, fasi del giorno, avanzamento controllato, pausa, riposo e serializzazione.
- La scena Three.js ora usa il clock quando si entra nella schermata di avvio del mondo: il tempo parte alle 06:00 e si arresta tornando al menu.
- La luce direzionale del sole, la luce lunare, gli indicatori sferici di sole/luna e i colori di cielo e nebbia cambiano con l'ora.
- Aggiunto un piccolo orologio a schermo con data, ora e fase.
- I mesi non hanno ancora nomi canonici; sono indicati numericamente. Le quattro stagioni hanno etichette provvisorie.
- Questa è un'anteprima tecnica sulla scena attuale, non ancora il ciclo collegato a un mondo esplorabile. Il comportamento va verificato nel browser locale.

### Verifiche e limiti
- Verificati staticamente gli ID HTML usati dal nuovo JavaScript.
- Il menu e il ciclo non sono ancora stati collaudati visivamente nel browser.
- I personaggi attuali sono modelli procedurali iniziali, non asset finali.
- Il mondo è soltanto un piano vuoto; non sono ancora implementati movimento, collisioni, gameplay, streaming o contenuti.

### Direzione successiva
Verificare la prima anteprima del tempo, poi trasferire il sistema nella scena esplorabile senza ripristinare il vecchio impianto.
