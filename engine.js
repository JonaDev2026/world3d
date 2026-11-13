export const VERSION = 1;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function random(state){let x=state.rng|0;x^=x<<13;x^=x>>>17;x^=x<<5;state.rng=x|0;return (x>>>0)/4294967296}
const pick=(s,a)=>a[Math.floor(random(s)*a.length)];
const alive=p=>p.alive;
export function createWorld(){
 const s={version:VERSION,day:1,year:0,rng:9041987,lastWallTime:Date.now(),speed:1,paused:false,population:[],settlements:[{id:1,name:"Valle del Primo Fiume",x:0,y:0,kind:"accampamento",homes:6,fields:0,stores:180,water:1000,knownArea:12}],nextPersonId:25,nextSettlementId:2,food:240,knowledge:0,health:100,cohesion:75,order:20,technology:["Fuoco","Utensili di pietra"],institutions:[],religion:"Tradizioni orali",polity:"Comunità senza governo",laws:"Consuetudini condivise",economy:"Sussistenza collettiva",events:[],stats:{births:0,deaths:0,crimes:0,discoveries:0,migrations:0,wars:0,epidemics:0},neighbors:[{id:1,name:"Gente della Quercia",population:19,food:125,hostility:12,discovered:false,atWar:false,warDays:0,technology:0,x:-150,y:110},{id:2,name:"Clan delle Colline",population:14,food:95,hostility:8,discovered:false,atWar:false,warDays:0,technology:0,x:190,y:-135}],disease:{active:false,strain:0,days:0},nextEventId:1,history:[]};
 const names=["Aren","Mira","Tarek","Sena","Ilan","Nara","Oren","Lira","Daren","Ena","Korin","Suri","Belen","Toma","Asha","Rovan","Eris","Niko","Vara","Maren","Ciro","Lena","Orin","Yara"];
 const surnames=["della Riva","delle Selci","del Salice","della Valle","del Guado","della Quercia"];
 for(let i=0;i<24;i++){s.population.push({id:i+1,name:names[i],family:pick(s,surnames),age:8+Math.floor(random(s)*42),sex:random(s)<.5?"F":"M",alive:true,health:80+random(s)*20,skill:1+random(s)*3,wealth:0,partner:null,parents:[],children:[],role:i<8?"raccoglitore":i<14?"cacciatore":"artigiano",belief:0,traits:{cooperation:random(s),ambition:random(s),aggression:random(s)}});}
 addEvent(s,"Fondazione","Ventiquattro persone si stabiliscono nella valle del Primo Fiume. Comincia il calendario della comunità: Anno 0.", "society");
 return s;
}
function addEvent(s,title,description,type="society"){
 const e={id:s.nextEventId++,year:s.year,day:s.day,title,description,type};
 s.events.unshift(e);if(s.events.length>600)s.events.length=600;
}
function living(s){return s.population.filter(alive)}
function addPerson(s,parents=[]){
 const first=["Aren","Mira","Tarek","Sena","Ilan","Nara","Oren","Lira","Daren","Ena","Korin","Suri","Belen","Toma","Asha","Rovan","Eris","Niko","Vara","Maren","Ciro","Lena","Orin","Yara","Evan","Sela","Rian","Talia"];
 const p1=s.population.find(p=>p.id===parents[0]),p2=s.population.find(p=>p.id===parents[1]);
 const surname=p1?.family||p2?.family||"della Valle";
 const person={id:s.nextPersonId++,name:pick(s,first),family:surname,age:0,sex:random(s)<.5?"F":"M",alive:true,health:90+random(s)*10,skill:.2+random(s)*.4,wealth:0,partner:null,parents,children:[],role:"bambino",belief:0,traits:{cooperation:random(s),ambition:random(s),aggression:random(s)}};
 s.population.push(person);for(const id of parents){const p=s.population.find(x=>x.id===id);if(p)p.children.push(person.id);}s.stats.births++;return person;
}
function yearBoundary(s){
 const people=living(s),n=people.length;
 s.year++;s.day=1;
 if(n>=45&&!s.institutions.includes("Consiglio degli anziani")){s.institutions.push("Consiglio degli anziani");s.polity="Consiglio degli anziani";s.order+=5;addEvent(s,"Nasce il Consiglio degli anziani","La comunità riconosce un gruppo stabile di persone incaricate di mediare le controversie e coordinare le decisioni collettive.","politics");}
 if(n>=75&&!s.institutions.includes("Custodi delle riserve")){s.institutions.push("Custodi delle riserve");s.economy="Riserve e distribuzione organizzata";addEvent(s,"Le riserve diventano un'istituzione","La gestione delle scorte viene affidata a custodi scelti dalla comunità. La distribuzione del cibo diventa una responsabilità collettiva.","economy");}
 if(n>=110&&!s.institutions.includes("Consuetudini codificate")){s.institutions.push("Consuetudini codificate");s.laws="Prime norme comunitarie";s.order+=7;addEvent(s,"Le consuetudini vengono codificate","Le regole tramandate oralmente vengono raccolte e riconosciute come norme comuni.","politics");}
 if(n>=55&&s.religion==="Tradizioni orali"&&random(s)<.12){s.religion="Culto degli antenati";addEvent(s,"Si consolida il culto degli antenati","Riti funerari e racconti condivisi danno forma a una tradizione spirituale riconoscibile.","culture");}
 if(s.knowledge>=100&&!s.technology.includes("Agricoltura")){s.technology.push("Agricoltura");s.settlements[0].fields=8;s.settlements[0].kind="villaggio";s.settlements[0].homes+=8;addEvent(s,"Inizia la coltivazione","La comunità seleziona semi e coltiva una parte della valle. La produzione alimentare non dipende più soltanto dalla raccolta e dalla caccia.","technology");}
 if(s.knowledge>=260&&!s.technology.includes("Ceramica")){s.technology.push("Ceramica");addEvent(s,"La ceramica cambia la conservazione","Vasi cotti al fuoco permettono di conservare meglio acqua e alimenti.","technology");}
 if(s.knowledge>=500&&!s.technology.includes("Metallurgia del rame")){s.technology.push("Metallurgia del rame");addEvent(s,"Primi oggetti in rame","La lavorazione del rame introduce strumenti nuovi e una specializzazione artigiana.","technology");}
 if(s.knowledge>=900&&!s.technology.includes("Scrittura")){s.technology.push("Scrittura");s.institutions.push("Archivio");addEvent(s,"Nasce la scrittura","Segni incisi su tavolette vengono usati per registrare scorte, accordi e genealogie. La memoria della società supera quella dei singoli.","technology");}
 if(s.knowledge>=1500&&!s.technology.includes("Ruota")){s.technology.push("Ruota");addEvent(s,"La ruota viene adottata","Carri e trasporto su ruote riducono il costo degli scambi e ampliano il territorio accessibile.","technology");}
 if(s.knowledge>=2300&&!s.technology.includes("Bronzo")){s.technology.push("Bronzo");addEvent(s,"La lega di bronzo","La fusione di rame e stagno porta a utensili più resistenti e a nuove reti commerciali.","technology");}
 if(s.knowledge>=3500&&!s.technology.includes("Ferro")){s.technology.push("Ferro");addEvent(s,"La lavorazione del ferro","La metallurgia del ferro si diffonde tra gli artigiani della valle.","technology");}
 if(s.knowledge>=5000&&!s.technology.includes("Medicina organizzata")){s.technology.push("Medicina organizzata");s.institutions.push("Casa di cura");addEvent(s,"Primi guaritori riconosciuti","L'esperienza sulle ferite e sulle malattie viene raccolta e trasmessa da guaritori specializzati.","technology");}
 if(s.knowledge>=7000&&!s.technology.includes("Amministrazione scritta")){s.technology.push("Amministrazione scritta");s.polity="Consiglio e amministratori";addEvent(s,"Amministrazione stabile","Registri e incarichi permanenti rendono possibile coordinare un insediamento più ampio.","politics");}
 if(s.knowledge>=9500&&!s.technology.includes("Macchine semplici")){s.technology.push("Macchine semplici");addEvent(s,"Macchine e forza dell'acqua","Ruote idrauliche e dispositivi meccanici iniziano a svolgere parte del lavoro ripetitivo.","technology");}
}
function daily(s){
 const people=living(s),n=people.length,sett=s.settlements[0];
 if(!n)return;
 // subsistence and production
 const farmers=people.filter(p=>p.role==="agricoltore").length;
 const gatherers=people.filter(p=>["raccoglitore","cacciatore"].includes(p.role)).length;
 const producers=Math.max(1,Math.floor(n*.27)+farmers*0.28);
 let production=(gatherers*.20+farmers*.58+producers*.16)*(s.technology.includes("Agricoltura")?1.35:1);
 if(s.year>0&&s.year%17===0&&s.day===1&&random(s)<.035){production*=.25;addEvent(s,"Raccolto compromesso","Una stagione sfavorevole riduce le riserve alimentari. La comunità deve razionare le scorte.","crisis");}
 s.food=Math.max(0,s.food+production-n*.105);
 sett.stores=s.food;
 const foodRatio=clamp(s.food/Math.max(1,n*12),0,1);
 s.health=clamp(s.health+(foodRatio>.7?.012:foodRatio<.22?-.16:-.025),8,100);
 s.cohesion=clamp(s.cohesion+(foodRatio<.25?-.12:.008)-(s.stats.crimes>n*.3?.02:0),5,100);
 s.order=clamp(s.order+(s.institutions.length?.006:-.002),0,100);
 // aging, health and mortality
 for(const p of people){
  p.health=clamp(p.health+(foodRatio<.3?-.12:.012)+(s.disease.active?-.16:0),0,100);
  if(p.age>55)p.health-=.012+(p.age-55)*.001;
  if(p.health<=0||p.age>82&&random(s)<.00035+(p.age-82)*.00022){p.alive=false;s.stats.deaths++;continue;}
  if(p.age>=15&&p.age<62&&p.role==="bambino")p.role=pick(s,["raccoglitore","cacciatore","artigiano"]);
  if(p.age>18&&p.age<45&&p.sex==="F"&&random(s)<.0012&&n<5000){
   const candidates=people.filter(q=>q.sex==="M"&&q.age>=18&&q.age<55&&q.alive&&q.id!==p.id&&(!p.partner||p.partner===q.id));
   if(candidates.length){const mate=pick(s,candidates);if(random(s)<.45){addPerson(s,[p.id,mate.id]);}}
  }
  p.age+=1/365;
 }
 // Other societies have their own demographic and resource cycles.
 for(const g of s.neighbors){
  const growth=g.food>g.population*5?0.00035:-0.00018;
  g.population=Math.max(3,Math.round(g.population+g.population*growth+(random(s)<0.0006?1:0)));
  g.food=Math.max(0,g.food+g.population*0.11-g.population*0.105);
  g.technology+=g.population*0.000025;
  if(!g.discovered&&n>28&&random(s)<0.00011){g.discovered=true;s.stats.discoveries++;addEvent(s,"Primo incontro con "+g.name,"Esploratori incontrano una comunità indipendente oltre la valle. Le due società hanno lingue e consuetudini differenti.","diplomacy");}
  if(g.discovered){
   if(random(s)<0.000025){g.hostility=clamp(g.hostility+(s.food<n*3?5:1),0,100);addEvent(s,"Tensione al confine","Un incidente tra membri delle due comunità peggiora i rapporti con "+g.name+".","diplomacy");}
   if(random(s)<0.000012&&g.hostility<35){s.knowledge+=2;g.hostility=clamp(g.hostility-2,0,100);}
   if(!g.atWar&&n>70&&g.population>25&&g.hostility>55&&random(s)<0.00008){g.atWar=true;g.warDays=0;s.stats.wars++;addEvent(s,"Conflitto con "+g.name,"Le tensioni per territorio e risorse degenerano in guerra aperta. La comunità mobilita i propri difensori.","war");}
   if(g.atWar){g.warDays++;if(g.warDays%30===0){
    const ownPower=n*0.32+s.order*0.35+s.technology.length*5,enemyPower=g.population*0.42+g.technology*2;
    const ownLoss=Math.max(1,Math.round((random(s)*3+1)*(enemyPower/Math.max(1,ownPower))));
    const enemyLoss=Math.max(1,Math.round((random(s)*3+1)*(ownPower/Math.max(1,enemyPower))));
    for(let k=0;k<ownLoss;k++){const victim=pick(s,living(s));if(victim){victim.alive=false;s.stats.deaths++;}}
    g.population=Math.max(3,g.population-enemyLoss);s.food=Math.max(0,s.food-ownLoss*2);s.cohesion=clamp(s.cohesion-1.2,0,100);
    addEvent(s,"Scontro armato","Uno scontro con "+g.name+" provoca "+ownLoss+" perdite nella comunità e "+enemyLoss+" tra gli avversari.","war");
   }
   if(g.warDays>150||g.population<=4){g.atWar=false;g.hostility=25;addEvent(s,"Cessazione delle ostilità","Il conflitto con "+g.name+" termina dopo mesi di scontri. Le perdite e le tensioni restano nella memoria collettiva.","war");}
   }
  }
 }
 // Disease ecology: outbreaks arise from density, water stress and chance.
 if(!s.disease.active&&n>35&&random(s)<(n>150?.00045:.00012)){
  s.disease.active=true;s.disease.days=0;s.disease.strain=.25+random(s)*.55;s.stats.epidemics++;
  addEvent(s,"Malattia contagiosa","Una malattia si diffonde tra gli abitanti. Le cause non sono ancora comprese e la comunità non dispone di cure efficaci.","disease");
 }
 if(s.disease.active){s.disease.days++;for(const p of people){if(random(s)<.012*s.disease.strain)p.health-=.5+random(s)*.7;}if(s.disease.days>45+random(s)*45){s.disease.active=false;addEvent(s,"L'epidemia si esaurisce","La diffusione della malattia diminuisce. I sopravvissuti conservano memoria dell'epidemia.","disease");}}
 // Knowledge is generated by practice, exchange and accumulated experience.
 const learners=people.filter(p=>p.age>=8&&p.age<60).length;
 s.knowledge+=learners*(.0007+(s.technology.length*.00011))*(s.cohesion/75);
 // theft and disputes emerge under scarcity and inequality
 if(s.food<n*2&&random(s)<.003){s.stats.crimes++;s.cohesion=clamp(s.cohesion-1,0,100);addEvent(s,"Furto di provviste","Una persona sottrae cibo dalle riserve comuni. Il conflitto sulla distribuzione mette alla prova la fiducia reciproca.","crime");}
 if(s.institutions.length&&random(s)<.00016){s.order=clamp(s.order-2,0,100);addEvent(s,"Controversia tra famiglie","Una disputa su risorse e responsabilità richiede la mediazione del consiglio.","politics");}
 // A settlement expands when its population and material base can sustain it.
 if(n>65&&sett.kind==="accampamento"){sett.kind="villaggio";sett.homes=18;addEvent(s,"L'accampamento diventa villaggio","Abitazioni più stabili e depositi comuni segnano il passaggio a un insediamento permanente.","settlement");}
 if(n>240&&sett.kind==="villaggio"){sett.kind="centro urbano";sett.homes=70;addEvent(s,"Nasce il primo centro urbano","L'insediamento si espande oltre il nucleo originario. Artigiani, depositi e spazi collettivi diventano permanenti.","settlement");}
 if(n>500&&s.settlements.length===1&&random(s)<.00004){s.settlements.push({id:s.nextSettlementId++,name:"Nuovo Guado",x:120+random(s)*160,y:90+random(s)*140,kind:"villaggio",homes:12,fields:6,stores:30,water:400,knownArea:4});s.stats.migrations++;addEvent(s,"Fondazione di un secondo insediamento","Un gruppo lascia la valle per stabilirsi presso un altro corso d'acqua. La comunità si distribuisce su più territori.","migration");}
 // seasonal turnover and annual records
 if(s.day%90===0&&random(s)<.08){const p=pick(s,people);if(p)p.skill+=.05;}
 s.day++;if(s.day>365)yearBoundary(s);
}
export function advance(world,days){
 const s=world;const start=s.year;
 for(let i=0;i<days;i++){daily(s);if(!living(s).length){addEvent(s,"Fine della comunità","Non rimangono abitanti. La comunità si è estinta.","extinction");break;}}
 return {world:s,advanced:days,years:s.year-start};
}
export function summary(s){
 const people=living(s),n=people.length;
 return {year:s.year,day:s.day,population:n,settlements:s.settlements.length,food:Math.round(s.food),knowledge:Math.round(s.knowledge),health:Math.round(s.health),cohesion:Math.round(s.cohesion),order:Math.round(s.order),workers:people.filter(p=>p.age>=15&&p.age<65).length,technology:s.technology,events:s.events.slice(0,80),institutions:s.institutions,polity:s.polity,religion:s.religion,laws:s.laws,economy:s.economy,settlement:s.settlements[0],stats:s.stats,dead:s.population.length-n};
}
export function validateWorld(s){
 if(!s||s.version!==VERSION||!Array.isArray(s.population)||!Array.isArray(s.settlements))throw new Error("Salvataggio non valido o versione incompatibile");
 if(!Number.isFinite(s.day)||!Number.isFinite(s.year)||!Number.isFinite(s.rng))throw new Error("Calendario o generatore casuale non valido");
 return s;
}
