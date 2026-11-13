# WORLD — Struttura del mondo

## Geografia
- Superficie obiettivo: **300 km²**, quadrato di circa **17.320,5 × 17.320,5 metri**.
- Unità Three.js: 1 unità = 1 metro.
- Stato attuale: piano vuoto, senza biomi, città, strade, alberi o edifici.
- La mappa SVG del menu è un'illustrazione d'atmosfera e non la geografia navigabile.

## Tempo e calendario di Vaelmar
- Giorno completo: **30 minuti reali**, rapporto 48:1.
- 12 mesi da 30 giorni, 360 giorni per anno; quattro stagioni da 90 giorni.
- Mesi: Germoglio, Fioritura, Solealto, Ardore, Mietitura, Mezzaluce, Foglia d'Oro, Bruma, Cenere, Gelo Profondo, Notte Quieta, Ultima Fiamma.
- Stagioni: Risveglio, Alta Luce, Caduta, Lungo Inverno.
- Il modulo js/world-time.js gestisce data, ora, fasi del giorno, pausa, ripresa, riposo e serializzazione.
- Il ciclo attuale è un'anteprima tecnica, non ancora collegata al gameplay.

## Identità e menu
- Titolo del gioco: **L’Alba dei Cinque Sigilli**.
- Nome della saga: **Le Cronache di Vaelmar**.
- Direzione visiva: antica mappa illustrata, titolo gotico avorio/oro, atmosfera pergamena, controlli essenziali.
- assets/images/vaelmar-map.svg è un fondale illustrativo, non il terreno reale.
- Musica: assets/audio/music/main-theme.mp3.

## Protagonisti
- **Merrik Valeth:** 38 anni, Maestro Evocatore esiliato; cinque scuole di magia, cerca gli allievi e la verità su Corvain.
- **Kaelen Dorne:** 34 anni, ex Capitano della Guardia Reale; spada e scudo, cerca di riabilitare il proprio nome.
- **Elowen Kaer:** 29 anni, Capitana dei Cacciatori; arco, furtività e trappole, cerca Tamsin.
- **Brundar Ferrocuore:** 112 anni, Guardiano di Soglia del clan Martelloscuro; ascia e forza, cerca i fratelli.

## Fasi successive
1. Verificare menu e selezione eroi nel browser.
2. Collegare il tempo alla futura scena esplorabile.
3. Definire i modelli definitivi dei protagonisti.
4. Implementare controllo del personaggio, terreno e collisioni.
5. Costruire regioni, città, popolazioni e missioni.
