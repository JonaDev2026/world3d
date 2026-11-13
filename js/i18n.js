let current='it';
let dictionary={};
const fallback={
it:{welcome:"Un regno da esplorare, senza una destinazione obbligatoria.",createCharacter:"CREA IL TUO PERSONAGGIO",createTitle:"IL TUO VIAGGIATORE",createIntro:"Scegli un nome, una lingua e un aspetto. Potrai cambiare tutto in seguito.",playerNameLabel:"NOME",languageLabel:"LINGUA",skinLabel:"PELLE",hairLabel:"CAPELLI",clothesLabel:"VESTITI",enterWorld:"ENTRA NEL MONDO",controls:"↑ ↓ cammina · ← → ruota · W A S D movimento · SPAZIO salta<br>Mouse: guarda intorno · P: salva un luogo · M: mappa · E: portale · ESC: libera il mouse",savePlace:"＋ SALVA LUOGO",mapButton:"MAPPA [M]",worldMap:"MAPPA DEL MONDO",closeMap:"CHIUDI [M]",nearPortal:"Avvicinati al portale per attraversarlo",enteredValley:"VALLE DELLE STELLE — un nuovo luogo ti attende",returnedWorld:"Sei tornato nel regno di WORLD",markerPrompt:"Nome di questo luogo:",discoveredPlace:"Luogo scoperto",placeSaved:"Luogo salvato sulla mappa",noMarkers:"Nessun luogo salvato. Premi P durante l’esplorazione."}
};
export function t(key){return dictionary[key]??fallback.it[key]??key}
export async function setLanguage(code){
 current=['it','en','es','fr'].includes(code)?code:'it';
 try{const response=await fetch('./lang/'+current+'.json');if(!response.ok)throw new Error('language file unavailable');dictionary=await response.json();}
 catch{dictionary=fallback[current]??fallback.it}
 document.documentElement.lang=current;
 document.querySelectorAll('[data-i18n]').forEach(el=>{const value=t(el.dataset.i18n);el.innerHTML=value});
}
export async function loadLanguage(code){await setLanguage(code)}
