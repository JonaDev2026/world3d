export const VERSION = 3;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function random(state){let x=state.rng|0;x^=x<<13;x^=x>>>17;x^=x<<5;state.rng=x|0;return (x>>>0)/4294967296}
const pick=(s,a)=>a[Math.floor(random(s)*a.length)];
const alive=p=>p.alive;
const hasTech=(s,name)=>s.technology.includes(name);
function areCloseKin(a,b,byId,archive={}){
 const pa=a.parents||[],pb=b.parents||[];
 if(pa.some(id=>pb.includes(id))||pa.includes(b.id)||pb.includes(a.id))return true;
 const parents=id=>byId.get(id)?.parents||archive[id]||[];
 const grandparents=ids=>new Set(ids.flatMap(parents));
 const ga=grandparents(pa),gb=grandparents(pb);
 for(const id of ga)if(gb.has(id))return true;
 // Also prevent unions between an aunt/uncle and a niece/nephew.
 for(const id of pa)for(const ancestor of parents(id))if(pb.some(parent=>parents(parent).includes(ancestor)))return true;
 for(const id of pb)for(const ancestor of parents(id))if(pa.some(parent=>parents(parent).includes(ancestor)))return true;
 return false;
}
function nearbyCoordinates(origin,x,y){const lat=Math.max(-84,Math.min(84,(Number(origin.latitude)||0)-(y-origin.y)*.18));const lon=((Number(origin.longitude||0)+(x-origin.x)*.18/Math.max(.18,Math.cos(lat*Math.PI/180))+540)%360)-180;return {latitude:lat,longitude:lon};}
function haversine(a,b){const r=Math.PI/180,d1=(b.latitude-a.latitude)*r,d2=(b.longitude-a.longitude)*r,q=Math.sin(d1/2)**2+Math.cos(a.latitude*r)*Math.cos(b.latitude*r)*Math.sin(d2/2)**2;return 6371*2*Math.atan2(Math.sqrt(q),Math.sqrt(1-q));}
function hashNoise(x,y,seed){const n=Math.sin(x*127.1+y*311.7+seed*74.7)*43758.5453;return (n-Math.floor(n))*2-1;}
function generateGeography(seed){
 const width=128,height=88,heights=new Array(width*height),terrain=new Array(width*height),at=(x,y)=>y*width+x;
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  const nx=(x-width*.5)/(width*.49),ny=(y-height*.5)/(height*.49);
  const main=1-Math.pow((x-64)/43,2)-Math.pow((y-44)/31,2);
  const northWest=.78-Math.pow((x-22)/12,2)-Math.pow((y-17)/9,2);
  const westernIsles=.66-Math.pow((x-9)/7,2)-Math.pow((y-43)/12,2);
  const northEast=.72-Math.pow((x-108)/13,2)-Math.pow((y-18)/9,2);
  const southEast=.76-Math.pow((x-111)/14,2)-Math.pow((y-68)/11,2);
  const southWest=.66-Math.pow((x-23)/11,2)-Math.pow((y-78)/7,2);
  const detail=hashNoise(Math.floor(x/8),Math.floor(y/8),seed)*.15+hashNoise(Math.floor(x/3),Math.floor(y/3),seed+11)*.055+hashNoise(x,y,seed+29)*.016;
  const peninsula=Math.max(0,1-Math.pow((x-34)/15,2)-Math.pow((y-61)/18,2))*.12;
  heights[at(x,y)]=Math.max(main,northWest,westernIsles,northEast,southEast,southWest)+detail+peninsula;
 }
 const lakes=[{x:36,y:28,rx:5,ry:3},{x:89,y:58,rx:4,ry:5},{x:73,y:19,rx:2.5,ry:2}];
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  const i=at(x,y),h=heights[i];if(h<.02){terrain[i]=0;continue;}
  if(lakes.some(l=>Math.pow((x-l.x)/l.rx,2)+Math.pow((y-l.y)/l.ry,2)<1)){terrain[i]=5;continue;}
  const moisture=(hashNoise(Math.floor(x/5),Math.floor(y/5),seed+71)+1)/2;
  terrain[i]=h>.76?4:h>.49?3:moisture>.48?2:moisture<.16?7:1;
 }
 const rivers=[];
 const carve=(sx,sy,ex,ey,curve)=>{
  const path=[],steps=Math.max(Math.abs(ex-sx),Math.abs(ey-sy));
  for(let i=0;i<=steps;i++){const t=i/steps,x=Math.round(sx+(ex-sx)*t),y=Math.round(sy+(ey-sy)*t+Math.sin(t*Math.PI)*curve);
   if(x<1||y<1||x>=width-1||y>=height-1)continue;const k=at(x,y);if(terrain[k]===0||terrain[k]===5)continue;terrain[k]=6;path.push([x,y]);}
  if(path.length>12)rivers.push(path);
 };
 carve(68,38,4,43,5);carve(77,26,83,3,-2);carve(58,56,34,85,4);
 const features=[];
 for(const l of lakes)features.push({id:features.length+1,type:"lago",x:l.x,y:l.y,name:null,discovered:false});
 for(let i=0;i<Math.min(2,rivers.length);i++){const p=rivers[i][Math.floor(rivers[i].length*.58)];features.push({id:features.length+1,type:"fiume",x:p[0],y:p[1],name:null,discovered:false});}
 return {mapVersion:2,width,height,tileKm:5,terrain,features,explored:[]};
}
function inventPlaceName(s){
 const c=s.language?.consonants||["k","m","t","s","r","n","l","v","d","g"],v=s.language?.vowels||["a","e","i","o","u"];
 let word="";for(let i=0,n=2+Math.floor(random(s)*2);i<n;i++){word+=pick(s,c)+pick(s,v);if(random(s)<.22)word+=pick(s,["n","r","l","s"]);}
 const candidate=word.charAt(0).toUpperCase()+word.slice(1);
 const used=[...s.settlements.map(x=>x.name),...(s.neighbors||[]).map(x=>x.name),...(s.geography?.features||[]).map(x=>x.name)].filter(Boolean);
 return used.includes(candidate)?candidate+String(s.nextNameId++):candidate;
}
function findColonizationSite(s,origin){
 const g=s.geography;if(!g)return null;const {width,height,terrain}=g,candidates=[];
 for(let y=5;y<height-5;y+=2)for(let x=5;x<width-5;x+=2){
  const d=Math.hypot(x-origin.x,y-origin.y);if(d<15||d>43)continue;
  const t=terrain[y*width+x];if(t===0||t===4||t===5||t===6)continue;
  let water=0,flat=0;for(let yy=-3;yy<=3;yy++)for(let xx=-3;xx<=3;xx++){const q=terrain[(y+yy)*width+x+xx];if(q===5||q===6)water++;if(q===1||q===2||q===7)flat++;}
  candidates.push({x,y,score:water*2.2+flat*.45+(t===2?3:0)+random(s)*4-d*.035});
 }
 candidates.sort((a,b)=>b.score-a.score);return candidates[0]||null;
}
export function createWorld(start={}){
 const s={version:VERSION,day:1,year:0,rng:9041987,lastWallTime:Date.now(),speed:1,paused:false,population:[],settlements:[{id:1,name:null,latitude:Number.isFinite(start.latitude)?start.latitude:0,longitude:Number.isFinite(start.longitude)?start.longitude:0,x:62,y:43,kind:"accampamento",homes:6,fields:0,stores:240,water:1000,knownArea:12,population:24,foundingYear:0}],nextPersonId:25,nextSettlementId:2,nextNameId:1,food:240,knowledge:0,health:100,cohesion:75,order:20,technology:["Fuoco","Utensili di pietra"],institutions:[],specializations:[],religion:"Tradizioni orali",polity:"Comunità senza governo",nationName:null,nationType:null,laws:"Consuetudini condivise",economy:"Sussistenza collettiva",language:{consonants:["k","m","t","s","r","n","l","v","d","g"],vowels:["a","e","i","o","u"],written:false},geography:generateGeography(9041987),events:[],stats:{births:0,deaths:0,crimes:0,discoveries:0,migrations:0,wars:0,epidemics:0},neighbors:[{id:1,name:null,population:19,food:125,hostility:12,discovered:false,allied:false,truceUntil:0,atWar:false,warDays:0,technology:0,x:25,y:28},{id:2,name:null,population:14,food:95,hostility:8,discovered:false,allied:false,truceUntil:0,atWar:false,warDays:0,technology:0,x:104,y:60}],disease:{active:false,strain:0,days:0},climate:{type:"normale",days:0,severity:0},nextEventId:1,history:[],familyArchive:{}};
 for(const neighbor of s.neighbors)Object.assign(neighbor,nearbyCoordinates(s.settlements[0],neighbor.x,neighbor.y));
 const names=["Aren","Mira","Tarek","Sena","Ilan","Nara","Oren","Lira","Daren","Ena","Korin","Suri","Belen","Toma","Asha","Rovan","Eris","Niko","Vara","Maren","Ciro","Lena","Orin","Yara"];
 const surnames=["della Riva","delle Selci","del Salice","della Valle","del Guado","della Quercia"];
 for(let i=0;i<24;i++){s.population.push({id:i+1,name:names[i],family:pick(s,surnames),age:Math.floor(8+random(s)*43),sex:random(s)<.5?"F":"M",alive:true,health:80+random(s)*20,skill:1+random(s)*3,wealth:0,partner:null,parents:[],children:[],role:i<8?"raccoglitore":i<14?"cacciatore":"artigiano",settlementId:1,belief:0,traits:{cooperation:random(s),ambition:random(s),aggression:random(s)}});}
 addEvent(s,"La comunità si stabilisce","Ventiquattro persone scelgono un luogo vicino all’acqua. Il territorio non ha ancora un nome condiviso.","society");
 return s;
}
function addEvent(s,title,description,type="society"){
 const e={id:s.nextEventId++,year:s.year,day:s.day,title,description,type};
 s.events.push(e);if(s.events.length>500)s.events.splice(0,s.events.length-500);
}
function living(s){return s.population.filter(alive)}
function prunePopulation(s){
 if(s.population.length<=15000)return;
 const alivePeople=s.population.filter(p=>p.alive),deadCount=s.population.length-alivePeople.length;
 if(deadCount<=8000)return;
 const byId=new Map(s.population.map(p=>[p.id,p])),needed=new Set(alivePeople.flatMap(p=>p.parents||[])),archive={};
 for(const id of needed){
  const person=byId.get(id);
  if(person)archive[id]=person.parents||[];
  else if(s.familyArchive?.[id])archive[id]=s.familyArchive[id];
 }
 s.population=alivePeople;
 s.familyArchive=archive;
 s.archivedDeaths=(s.archivedDeaths||0)+deadCount;
}
function killPerson(s,p){
 if(!p||!p.alive)return;
 const ids=new Set([...(p.children||[]),p.partner].filter(Boolean));
 const heirs=s.population.filter(q=>q.alive&&q.id!==p.id&&ids.has(q.id));
 if(heirs.length&&p.wealth>0){const share=p.wealth/heirs.length;for(const heir of heirs)heir.wealth=(Number(heir.wealth)||0)+share;p.wealth=0;}
 p.alive=false;p.deathYear=s.year;
}
function addPerson(s,parents=[]){
 const first=["Aren","Mira","Tarek","Sena","Ilan","Nara","Oren","Lira","Daren","Ena","Korin","Suri","Belen","Toma","Asha","Rovan","Eris","Niko","Vara","Maren","Ciro","Lena","Orin","Yara","Evan","Sela","Rian","Talia"];
 const p1=s.population.find(p=>p.id===parents[0]),p2=s.population.find(p=>p.id===parents[1]);
 const surname=p1?.family||p2?.family||"della Valle";
 const person={id:s.nextPersonId++,name:pick(s,first),family:surname,age:0,sex:random(s)<.5?"F":"M",alive:true,health:90+random(s)*10,skill:.2+random(s)*.4,wealth:0,partner:null,parents,children:[],role:"bambino",settlementId:p1?.settlementId||p2?.settlementId||1,belief:0,traits:{cooperation:random(s),ambition:random(s),aggression:random(s)}};
 s.population.push(person);for(const id of parents){const p=s.population.find(x=>x.id===id);if(p)p.children.push(person.id);}s.stats.births++;return person;
}
function updateSocial(s){
 const people=living(s);if(!people.length)return;
 const values=people.map(p=>Math.max(0,Number(p.wealth)||0)).sort((a,b)=>a-b),n=values.length,total=values.reduce((x,y)=>x+y,0);
 let weighted=0;for(let i=0;i<n;i++)weighted+=(2*(i+1)-n-1)*values[i];
 const gini=total>0?clamp(weighted/(n*total),0,1):0,median=values[Math.floor((n-1)/2)],classes={poveri:0,lavoratori:0,agiati:0,"élite":0};
 if(total<=.0001)classes.lavoratori=n;
 else for(const p of people){const w=Math.max(0,Number(p.wealth)||0),base=Math.max(.05,median);if(w<base*.35)classes.poveri++;else if(w<base*1.5)classes.lavoratori++;else if(w<base*4)classes.agiati++;else classes["élite"]++;}
 const topCount=Math.max(1,Math.ceil(n*.1)),topShare=total>0?values.slice(-topCount).reduce((x,y)=>x+y,0)/total:0,previous=s.social||{};
 const tension=clamp((gini-.22)*105+(s.stats.crimes/Math.max(1,n))*14+(55-s.cohesion)*.48,0,100);
 s.social={inequality:gini,tension,topShare,classes,medianWealth:median,lastReformYear:previous.lastReformYear??-100};
 if(gini>.52&&n>=90&&s.technology.includes("Moneta")&&!s.institutions.includes("Consiglio delle famiglie influenti")){
  s.institutions.push("Consiglio delle famiglie influenti");s.polity="Consiglio delle famiglie influenti";s.social.tension=clamp(s.social.tension+12,0,100);
  addEvent(s,"Le famiglie ricche concentrano il potere","Le famiglie che controllano più risorse ottengono un peso crescente nelle decisioni. L'accesso alle cariche e ai mercati diventa diseguale.","politics");
 }else if(gini<.24&&s.cohesion>68&&n>=90&&s.institutions.includes("Consiglio delle famiglie influenti")){
  s.institutions=s.institutions.filter(x=>x!=="Consiglio delle famiglie influenti");s.institutions.push("Assemblea dei cittadini");s.polity="Assemblea dei cittadini";
  addEvent(s,"Riforma delle assemblee","La pressione delle famiglie e dei lavoratori porta a distribuire il potere in un'assemblea più ampia. Le decisioni vengono sottoposte a una rappresentanza più inclusiva.","politics");
 }
 if(s.social.tension>78&&n>100&&s.year-(previous.lastReformYear??-100)>=5&&random(s)<.32){
  const elite=people.filter(p=>p.wealth>median*4),levy=total/Math.max(1,n)*.18;
  for(const p of elite)p.wealth=Math.max(0,p.wealth-levy);
  const poor=people.filter(p=>p.wealth<=median);for(const p of poor)p.wealth+=levy*elite.length/Math.max(1,poor.length);
  s.cohesion=clamp(s.cohesion+5,0,100);s.social.tension=clamp(s.social.tension-22,0,100);s.social.lastReformYear=s.year;s.laws="Norme contro gli abusi di ricchezza";
  addEvent(s,"Riforma dopo le proteste","Proteste e controversie costringono il governo a redistribuire parte delle risorse e a limitare alcuni privilegi. La riforma riduce temporaneamente la tensione sociale.","politics");
 }
 if(previous.inequality!==undefined&&Math.abs(gini-previous.inequality)>.12&&n>70)addEvent(s,gini>previous.inequality?"Aumenta la distanza tra le classi":"Si riduce la distanza tra le classi",gini>previous.inequality?"Le risorse si concentrano progressivamente in una parte ridotta della popolazione. Crescono le differenze nelle condizioni materiali.":"La distribuzione delle risorse diventa più equilibrata e diminuiscono le distanze economiche.","society");
}
function assignRoles(s){
 const adults=living(s).filter(p=>p.age>=15&&p.age<65);
 if(!adults.length)return;
 const agricultural=s.technology.includes("Agricoltura"),hasWriting=s.technology.includes("Scrittura"),hasMoney=s.technology.includes("Moneta");
 const targets=[
  ["agricoltore",agricultural ? .40 : 0,p=>p.skill+p.traits.cooperation],
  ["raccoglitore",agricultural ? .15 : .38,p=>p.traits.cooperation+p.skill*.2],
  ["cacciatore",agricultural ? .08 : .30,p=>p.traits.aggression+p.skill*.3],
  ["artigiano",agricultural ? .15 : .25,p=>p.skill+p.traits.ambition*.4],
  ["costruttore",agricultural&&adults.length>35 ? .08 : 0,p=>p.skill+p.traits.ambition],
  ["amministratore",hasWriting ? .03 : 0,p=>p.skill+p.traits.cooperation+p.traits.ambition*.3],
  ["mercante",hasMoney ? .04 : 0,p=>p.traits.ambition+p.traits.cooperation],
  ["guardia",s.institutions.includes("Guardia civica") ? .03 : 0,p=>p.traits.aggression+p.traits.cooperation],
  ["guaritore",s.technology.includes("Medicina organizzata") ? .02 : 0,p=>p.traits.cooperation+p.skill],
  ["sacerdote",s.religion!=="Tradizioni orali" ? .02 : 0,p=>p.traits.cooperation+p.traits.ambition]
 ];
 let available=adults.slice();
 for(const [role,ratio,score] of targets){
  const count=Math.min(available.length,Math.round(adults.length*ratio));
  const ranked=available.map(person=>({person,value:score(person)+random(s)*.04})).sort((x,y)=>y.value-x.value);
  const chosen=ranked.slice(0,count).map(x=>x.person),chosenIds=new Set(chosen.map(p=>p.id));
  for(const p of chosen)p.role=role;
  available=available.filter(p=>!chosenIds.has(p.id));
  if(count>0&&["agricoltore","costruttore","amministratore","mercante","guardia","guaritore","sacerdote"].includes(role)){
   if(!s.specializations)s.specializations=[];
   if(!s.specializations.includes(role)){s.specializations.push(role);addEvent(s,"Si afferma una nuova professione","La crescita della società rende stabile il ruolo di "+role+". Le competenze vengono trasmesse e riconosciute come attività specializzata.","society");}
  }
 }
 for(const p of available)p.role=agricultural?"artigiano":"raccoglitore";
}
function updateDiplomacy(s){
 for(const g of s.neighbors){
  if(!g.discovered||g.atWar)continue;
  if(g.allied&&g.hostility>50){g.allied=false;addEvent(s,"Si scioglie un patto","Le tensioni con "+g.name+" superano la fiducia reciproca. Il patto viene interrotto.","diplomacy");}
  else if(!g.allied&&g.hostility<22&&s.year>5&&random(s)<.08){g.allied=true;addEvent(s,"Accordo di mutua assistenza","La comunità e "+g.name+" stabiliscono un patto di collaborazione e sostegno reciproco.","diplomacy");}
 }
}
function updateLeadership(s){
 const people=living(s);if(people.length<45)return;
 if(!s.leadership)s.leadership={personId:null,termStarted:0,legitimacy:50};
 const current=people.find(p=>p.id===s.leadership.personId),due=!current||s.year-s.leadership.termStarted>=8;
 if(due){
  const candidates=people.filter(p=>p.age>=20&&p.age<72);
  if(candidates.length){
   const median=s.social?.medianWealth||0;
   const scored=candidates.map(p=>{
    const maturity=1-Math.min(1,Math.abs(p.age-43)/45);
    const institutional=s.institutions.includes("Assemblea dei cittadini")?p.traits.cooperation*1.4:s.institutions.includes("Consiglio degli anziani")?maturity*.65+p.skill*.3:p.traits.ambition*.8;
    const wealthBias=s.institutions.includes("Consiglio delle famiglie influenti")?Math.min(2,p.wealth/Math.max(1,median+1))*.5:0;
    return {person:p,score:p.skill*.8+p.traits.cooperation*.65+p.traits.ambition*.45+institutional+wealthBias+random(s)*.18};
   }).sort((x,y)=>y.score-x.score);
   const chosen=scored[0].person,previous=s.leadership.personId;
   s.leadership={personId:chosen.id,termStarted:s.year,legitimacy:clamp(s.cohesion*.42+s.order*.28+(100-(s.social?.inequality||0)*100)*.18+12,20,95)};
   addEvent(s,previous?"Cambio alla guida della comunità":"Viene riconosciuta una guida","La comunità affida la guida a "+chosen.name+" "+chosen.family+". La legittimità dipenderà dalle decisioni, dalla sicurezza e dalla distribuzione delle risorse.","politics");
  }
 }else{
  const strain=(s.social?.inequality||0)*1.8+(s.stats.crimes/Math.max(1,people.length))*.35;
  s.leadership.legitimacy=clamp(s.leadership.legitimacy+(s.cohesion-55)*.025+(s.order-50)*.012-strain,0,100);
  if(s.leadership.legitimacy<24&&random(s)<.28){
   s.cohesion=clamp(s.cohesion-2.5,0,100);s.order=clamp(s.order-1.5,0,100);s.leadership.legitimacy=35;
   addEvent(s,"Crisi di legittimità","La guida perde sostegno tra gruppi della popolazione. Le istituzioni sono costrette a negoziare nuove condizioni di governo.","politics");
  }
 }
}
function yearBoundary(s){
 const people=living(s),n=people.length;
 s.year++;s.day=1;
 if(!s.language)s.language={consonants:["k","m","t","s","r","n","l","v","d","g"],vowels:["a","e","i","o","u"],written:false};
 const home=s.settlements[0];
 if(home&&!home.name&&n>=24&&s.year>=1){home.name=inventPlaceName(s);addEvent(s,"La comunità dà un nome al proprio luogo","Dopo generazioni di racconti e riferimenti condivisi, gli abitanti scelgono una parola della propria lingua per indicare il luogo in cui vivono: «"+home.name+"».","culture");}
 for(const st of s.settlements)if(!st.name&&(st.population||0)>=8&&s.year>=(st.foundingYear||0)+1){st.name=inventPlaceName(s);addEvent(s,"Un nuovo luogo riceve un nome","Le famiglie dell’insediamento scelgono nella propria lingua un nome per il luogo che hanno colonizzato: «"+st.name+"».","culture");}
 if(!s.nationName&&n>=140&&s.settlements.length>=2){s.nationName=inventPlaceName(s);s.nationType=s.institutions.includes("Assemblea dei villaggi")?"Confederazione":s.technology.includes("Amministrazione scritta")?"Stato amministrato":"Unione territoriale";for(const st of s.settlements)st.nationId=1;addEvent(s,"Nasce una nuova entità politica","Gli insediamenti riconoscono un nome comune e istituiscono un’autorità territoriale: «"+s.nationName+"».","politics");}
 for(const feature of s.geography?.features||[]){if(feature.discovered||!s.settlements.some(st=>Math.hypot(st.x-feature.x,st.y-feature.y)<17))continue;feature.discovered=true;if(n>=24&&s.year>=1){feature.name=inventPlaceName(s);addEvent(s,feature.type==="lago"?"Viene nominato un lago":"Viene nominato un corso d’acqua","Gli abitanti adottano il nome «"+feature.name+"» per questo elemento del territorio, entrato nella loro esperienza quotidiana.","exploration");}}
 if(!s.climate)s.climate={type:"normale",days:0,severity:0};
 if(s.climate.days<=0){
  const roll=random(s);
  if(roll<.035){s.climate={type:"siccità",days:55+Math.floor(random(s)*65),severity:.45+random(s)*.4};addEvent(s,"Siccità nella valle","Le piogge scarseggiano e i corsi d'acqua si abbassano. I raccolti e le riserve idriche sono messi sotto pressione.","climate");}
  else if(roll<.055){s.climate={type:"alluvione",days:18+Math.floor(random(s)*28),severity:.35+random(s)*.45};addEvent(s,"Piena del fiume","Piogge intense fanno straripare il fiume. Alcuni campi e percorsi vengono danneggiati e aumenta il rischio di malattie.","climate");}
  else if(roll<.085){s.climate={type:"inverno rigido",days:35+Math.floor(random(s)*40),severity:.3+random(s)*.5};addEvent(s,"Inverno rigido","Temperature insolitamente basse aumentano il consumo di risorse e rendono più difficile procurarsi cibo.","climate");}
  else s.climate={type:"normale",days:0,severity:0};
 }
 updateSocial(s);
 if(n>=45&&!s.institutions.includes("Consiglio degli anziani")){s.institutions.push("Consiglio degli anziani");s.polity="Consiglio degli anziani";s.order+=5;addEvent(s,"Nasce il Consiglio degli anziani","La comunità riconosce un gruppo stabile di persone incaricate di mediare le controversie e coordinare le decisioni collettive.","politics");}
 if(n>=75&&!s.institutions.includes("Custodi delle riserve")){s.institutions.push("Custodi delle riserve");s.economy="Riserve e distribuzione organizzata";addEvent(s,"Le riserve diventano un'istituzione","La gestione delle scorte viene affidata a custodi scelti dalla comunità. La distribuzione del cibo diventa una responsabilità collettiva.","economy");}
 if(n>=110&&!s.institutions.includes("Consuetudini codificate")){s.institutions.push("Consuetudini codificate");s.laws="Prime norme comunitarie";s.order+=7;addEvent(s,"Le consuetudini vengono codificate","Le regole tramandate oralmente vengono raccolte e riconosciute come norme comuni.","politics");}
 if(n>=55&&s.religion==="Tradizioni orali"&&random(s)<.12){s.religion="Culto degli antenati";addEvent(s,"Si consolida il culto degli antenati","Riti funerari e racconti condivisi danno forma a una tradizione spirituale riconoscibile.","culture");}
 if(s.knowledge>=100&&!s.technology.includes("Agricoltura")){s.technology.push("Agricoltura");for(const st of s.settlements){st.fields=Math.max(st.fields||0,Math.max(4,Math.round((st.population||20)*.22)));if(st===s.settlements[0]){st.kind="villaggio";st.homes+=8;}}addEvent(s,"Inizia la coltivazione","La comunità seleziona semi e coltiva una parte della valle. La produzione alimentare non dipende più soltanto dalla raccolta e dalla caccia.","technology");}
 if(s.knowledge>=260&&!s.technology.includes("Ceramica")){s.technology.push("Ceramica");addEvent(s,"La ceramica cambia la conservazione","Vasi cotti al fuoco permettono di conservare meglio acqua e alimenti.","technology");}
 if(s.knowledge>=500&&!s.technology.includes("Metallurgia del rame")){s.technology.push("Metallurgia del rame");addEvent(s,"Primi oggetti in rame","La lavorazione del rame introduce strumenti nuovi e una specializzazione artigiana.","technology");}
 if(s.knowledge>=900&&!s.technology.includes("Scrittura")){s.technology.push("Scrittura");s.institutions.push("Archivio");s.language.written=true;addEvent(s,"Nasce la scrittura","La comunità sviluppa segni per conservare parole e conoscenze. I nomi di persone, insediamenti, fiumi e territori possono ora essere tramandati senza dipendere soltanto dalla memoria orale.","technology");}
 if(s.knowledge>=1500&&!s.technology.includes("Ruota")){s.technology.push("Ruota");addEvent(s,"La ruota viene adottata","Carri e trasporto su ruote riducono il costo degli scambi e ampliano il territorio accessibile.","technology");}
 if(s.knowledge>=2200&&!s.technology.includes("Irrigazione")){s.technology.push("Irrigazione");addEvent(s,"Canali e irrigazione","Vengono scavati canali per portare l'acqua ai campi. La produzione diventa meno dipendente dalle piogge.","technology");}
 if(s.knowledge>=2300&&!s.technology.includes("Bronzo")){s.technology.push("Bronzo");addEvent(s,"La lega di bronzo","La fusione di rame e stagno porta a utensili più resistenti e a nuove reti commerciali.","technology");}
 if(s.knowledge>=2800&&!s.technology.includes("Moneta")){s.technology.push("Moneta");s.economy="Mercati e scambi monetari";s.institutions.push("Luogo del mercato");addEvent(s,"Prime forme di moneta","Oggetti riconosciuti come unità di valore facilitano gli scambi e rendono più complessa la distribuzione della ricchezza.","economy");}
 if(s.knowledge>=3500&&!s.technology.includes("Ferro")){s.technology.push("Ferro");addEvent(s,"La lavorazione del ferro","La metallurgia del ferro si diffonde tra gli artigiani della valle.","technology");}
 if(s.knowledge>=4200&&!s.technology.includes("Calendario")){s.technology.push("Calendario");s.institutions.push("Osservatori del cielo");addEvent(s,"Viene definito un calendario","L'osservazione delle stagioni permette di prevedere semine, raccolti e periodi di piena.","technology");}
 if(s.knowledge>=5000&&!s.technology.includes("Medicina organizzata")){s.technology.push("Medicina organizzata");s.institutions.push("Casa di cura");s.health=clamp(s.health+8,0,100);addEvent(s,"Primi guaritori riconosciuti","L'esperienza sulle ferite e sulle malattie viene raccolta e trasmessa da guaritori specializzati.","technology");}
 if(s.knowledge>=5800&&!s.technology.includes("Mulino ad acqua")){s.technology.push("Mulino ad acqua");addEvent(s,"La forza del fiume","Un mulino ad acqua riduce il lavoro necessario per macinare i cereali e aumenta la capacità produttiva.","technology");}
 if(s.knowledge>=7000&&!s.technology.includes("Amministrazione scritta")){s.technology.push("Amministrazione scritta");s.polity="Consiglio e amministratori";addEvent(s,"Amministrazione stabile","Registri e incarichi permanenti rendono possibile coordinare un insediamento più ampio.","politics");}
 if(s.knowledge>=8200&&!s.technology.includes("Scuola")){s.technology.push("Scuola");s.institutions.push("Scuola degli scribi");s.cohesion=clamp(s.cohesion+3,0,100);addEvent(s,"Istruzione organizzata","La trasmissione delle conoscenze viene affidata a insegnanti e apprendisti. La lettura non è più limitata agli amministratori.","technology");}
 if(s.knowledge>=9500&&!s.technology.includes("Macchine semplici")){s.technology.push("Macchine semplici");addEvent(s,"Macchine e forza dell'acqua","Ruote idrauliche e dispositivi meccanici iniziano a svolgere parte del lavoro ripetitivo.","technology");}
 if(s.knowledge>=11000&&!s.technology.includes("Vetro")){s.technology.push("Vetro");addEvent(s,"La lavorazione del vetro","Artigiani specializzati producono contenitori e oggetti in vetro. Nuovi materiali entrano nella vita quotidiana.","technology");}
 if(s.year>80&&s.knowledge>500&&s.religion==="Culto degli antenati"&&random(s)<.018){s.religion="Pantheon delle forze naturali";addEvent(s,"Si forma un pantheon","Le tradizioni locali si riuniscono in culti dedicati alle forze della natura e ai cicli agricoli.","culture");}
 if(s.year>260&&s.knowledge>3500&&s.religion==="Pantheon delle forze naturali"&&random(s)<.004){s.religion="Tradizione del Sole";addEvent(s,"Una nuova corrente religiosa","Una comunità di sacerdoti e famiglie sviluppa una tradizione distinta dai culti locali.","culture");}
 if(n>160&&!s.institutions.includes("Guardia civica")&&s.stats.crimes>=5){s.institutions.push("Guardia civica");s.order=clamp(s.order+8,0,100);addEvent(s,"Nasce una guardia civica","La comunità affida a un gruppo stabile il compito di proteggere i mercati, le riserve e le persone.","politics");}
 if(n>250&&s.settlements.length>1&&s.economy==="Riserve e distribuzione organizzata"){s.economy="Scambi tra insediamenti";addEvent(s,"Si organizzano gli scambi interni","I villaggi coordinano la circolazione di cibo, utensili e materie prime.","economy");}
 if(n>320&&!s.institutions.includes("Assemblea dei villaggi")){s.institutions.push("Assemblea dei villaggi");s.polity="Consiglio dei villaggi";addEvent(s,"Nasce un'assemblea territoriale","I rappresentanti dei diversi insediamenti si riuniscono per discutere risorse, confini e decisioni comuni.","politics");}
 updateDiplomacy(s);
 assignRoles(s);
 updateLeadership(s);
 prunePopulation(s);
}
function daily(s){
 const people=living(s),n=people.length,sett=s.settlements[0];
 for(const p of people)if(!p.settlementId)p.settlementId=sett.id;
 let familyIndex=null;
 const related=(a,b)=>{if(!familyIndex)familyIndex=new Map(s.population.map(person=>[person.id,person]));return areCloseKin(a,b,familyIndex,s.familyArchive||{});};
 if(!n)return;
 // Workforce is counted once, then resources are produced and consumed locally.
 const workers=people.filter(p=>p.age>=15&&p.age<65),roleCounts=new Map();
 for(const p of workers)roleCounts.set(p.role,(roleCounts.get(p.role)||0)+1);
 const countRole=role=>roleCounts.get(role)||0;
 const farmers=countRole("agricoltore"),gatherers=countRole("raccoglitore"),hunters=countRole("cacciatore");
 const artisans=countRole("artigiano"),builders=countRole("costruttore"),traders=countRole("mercante");
 const administrators=countRole("amministratore"),guards=countRole("guardia"),healers=countRole("guaritore"),priests=countRole("sacerdote");
 const climate=s.climate||{type:"normale",days:0,severity:0},tech=s.technology||[];
 const residents=new Map(s.settlements.map(st=>[st.id,[]]));
 for(const p of people){if(!residents.has(p.settlementId))p.settlementId=sett.id;residents.get(p.settlementId)?.push(p);}
 const foodRatios=new Map();let production=0,consumption=0,totalFood=0;
 for(const st of s.settlements){
  const locals=residents.get(st.id)||[],count=locals.length;
  st.population=count;
  const active=locals.filter(p=>p.age>=15&&p.age<65),roles=new Map();
  for(const p of active)roles.set(p.role,(roles.get(p.role)||0)+1);
  const role=(name)=>roles.get(name)||0;
  const terrain=s.geography?.terrain,idx=Math.round(st.y)*s.geography.width+Math.round(st.x),land=terrain?.[idx]??1;
  let output=role("raccoglitore")*.18+role("cacciatore")*.16+role("agricoltore")*.45+role("artigiano")*.08+role("costruttore")*.10+role("mercante")*.05+role("amministratore")*.04+role("guardia")*.04+role("guaritore")*.04+role("sacerdote")*.02;
  if(tech.includes("Agricoltura"))output*=1.08+Math.min(.18,(st.fields||0)*.006);
  if(tech.includes("Irrigazione"))output*=1.14;
  if(tech.includes("Mulino ad acqua"))output*=1.08+(role("agricoltore")>0?.06:0);
  if(tech.includes("Macchine semplici"))output*=1.10;
  if(tech.includes("Metallurgia del rame"))output*=1.02;
  if(tech.includes("Bronzo"))output*=1.045;
  if(tech.includes("Ferro"))output*=1.075;
  if(tech.includes("Ruota"))output*=1.035;
  if(tech.includes("Scrittura"))output*=1.02;
  if(tech.includes("Scuola"))output*=1.025;
  if(tech.includes("Calendario"))output*=1.025;
  if(tech.includes("Vetro"))output*=1.015;
  const geography=s.geography||{width:128,height:88,terrain:[]};
  const sx=Math.round(st.x),sy=Math.round(st.y),nearWater=(()=>{let best=99;for(let yy=-3;yy<=3;yy++)for(let xx=-3;xx<=3;xx++){const code=terrain?.[(sy+yy)*geography.width+sx+xx];if(code===5||code===6)best=Math.min(best,Math.hypot(xx,yy));}return best;})();
  const fertility=land===2?1.24:land===1?1.12:land===6?1.18:land===3?1.02:land===7?.72:land===4?.58:1;
  const waterAccess=nearWater<=1?1.18:nearWater<=3?1.09:nearWater<=5?1.03:.88;
  const farmShare=role("agricoltore")*.45;
  output=(output-farmShare)+farmShare*fertility*waterAccess;
  if(land===4||land===7)output*=.94;
  output*=1.18;
  if(climate.days>0){const forecast=tech.includes("Calendario")?.88:1;if(climate.type==="siccità")output*=1-climate.severity*(tech.includes("Irrigazione")?.18:.72)*forecast;else if(climate.type==="alluvione")output*=1-climate.severity*(tech.includes("Irrigazione")?.32:.48)*forecast;else if(climate.type==="inverno rigido")output*=1-climate.severity*.38*forecast;}
  const need=count*.105,localSurplus=output-need,storageCapacity=Math.max(240,count*45)*(tech.includes("Ceramica")?1.2:1)*(tech.includes("Vetro")?1.08:1);
  st.stores=clamp((Number(st.stores)||0)+localSurplus,0,storageCapacity);
  if(count>0)st.knownArea=Math.min(100000,Math.max(4,Number(st.knownArea)||4)+Math.max(0,count*.00008+(st.fields||0)*.00012+(tech.includes("Ruota")?.0004:0)));
  production+=output;consumption+=need;totalFood+=st.stores;
  foodRatios.set(st.id,clamp(st.stores/Math.max(1,count*12),0,1));
 }
 const surplus=production-consumption;
 s.food=totalFood;
 // Weekly exchange moves real stocks between settlements; distance and transport technology set the cost.
 if(s.day%7===0&&s.settlements.length>1){
  const reach=tech.includes("Ruota")?1800:450;
  for(let i=0;i<s.settlements.length;i++)for(let j=i+1;j<s.settlements.length;j++){
   const a=s.settlements[i],b=s.settlements[j];
   const distance=Number.isFinite(a.latitude)&&Number.isFinite(a.longitude)&&Number.isFinite(b.latitude)&&Number.isFinite(b.longitude)?haversine(a,b):Math.hypot(a.x-b.x,a.y-b.y)*20;
   if(distance>reach)continue;
   const aNeed=(a.population||0)*12,bNeed=(b.population||0)*12,aRatio=a.stores/Math.max(1,aNeed),bRatio=b.stores/Math.max(1,bNeed);
   if(Math.abs(aRatio-bRatio)<.18)continue;
   const source=aRatio>bRatio?a:b,destination=source===a?b:a,efficiency=Math.max(.55,1-distance/Math.max(1,reach*2));
   const deficit=Math.max(0,(destination.population||0)*12-destination.stores),surplusStock=Math.max(0,source.stores-(source.population||0)*18);
   const cargo=Math.min(8,surplusStock,deficit/efficiency);
   if(cargo>0){source.stores-=cargo;destination.stores+=cargo*efficiency;}
  }
  s.food=s.settlements.reduce((sum,st)=>sum+(Number(st.stores)||0),0);
 }
 if(surplus>0){
  const adults=people.filter(p=>p.age>=15&&p.age<70),pool=surplus*(s.technology.includes("Moneta")?.035:.012);
  const weights=adults.map(p=>(.55+p.skill*.25+p.traits.ambition*.8)*(["artigiano","mercante","amministratore","costruttore"].includes(p.role)?1.35:p.role==="agricoltore"?.95:1));
  const sum=weights.reduce((x,y)=>x+y,0)||1;
  for(let i=0;i<adults.length;i++){const p=adults[i];p.wealth=Math.min(1000000,(Number(p.wealth)||0)+pool*weights[i]/sum);}
 }else if(surplus<0){const shortage=-surplus;for(const p of people)if(p.wealth>0)p.wealth=Math.max(0,p.wealth-shortage*.0008*(p.traits.cooperation<.35?1.5:.7));}
 const foodRatio=clamp(s.food/Math.max(1,n*12),0,1);
 s.health=clamp(s.health+(foodRatio>.7?.012:foodRatio<.22?-.16:-.025),8,100);
 s.cohesion=clamp(s.cohesion+(foodRatio<.25?-.12:.008)-(s.stats.crimes>n*.3?.02:0),5,100);
 s.order=clamp(s.order+(s.institutions.length?.006:-.002),0,100);
 // Aging, health and mortality. Candidate partners are indexed by settlement once per day.
 const malesBySettlement=new Map();
 for(const q of people)if(q.sex==="M"&&q.age>=18&&q.age<58){if(!malesBySettlement.has(q.settlementId))malesBySettlement.set(q.settlementId,[]);malesBySettlement.get(q.settlementId).push(q);}
 for(const p of people){
  const localFood=foodRatios.get(p.settlementId)??foodRatio;
  p.health=clamp(p.health+(localFood<.3?-.12:.012)+(tech.includes("Medicina organizzata")?.022:0)+(healers>0?.002:0),0,100);
  if(p.age>55)p.health-=.012+(p.age-55)*.001;
  if(p.age<5)p.health-=p.age<1?.018:.006;
  if(p.age>70)p.health-=.012+(p.age-70)*.002;
  if(p.health<=0||p.age>78&&random(s)<.00045+(p.age-78)*.0003){killPerson(s,p);s.stats.deaths++;continue;}
  if(p.age>=15&&p.age<62&&p.role==="bambino")p.role=pick(s,["raccoglitore","cacciatore","artigiano"]);
  if(!Number.isFinite(p.pregnancyDays))p.pregnancyDays=0;
  if(p.pregnancyDays>0){
   p.pregnancyDays--;
   if(p.pregnancyDays<=0){
    const birthRisk=.0007+(p.age>32?Math.max(0,p.age-32)*.00012:0)+(p.health<45?.0015:0);
    if(random(s)<birthRisk){p.health=clamp(p.health-18,0,100);if(random(s)<.12){p.pregnancyDays=0;}}
    else{addPerson(s,[p.id,p.partner]);p.health=clamp(p.health-3,0,100);}
   }
  }else if(p.age>=18&&p.age<43&&p.sex==="F"&&random(s)<.00048&&n<5000){
   const currentPartnerAlive=p.partner&&people.some(r=>r.id===p.partner&&r.alive),candidates=(malesBySettlement.get(p.settlementId)||[]).filter(q=>q.alive&&q.id!==p.id&&(!currentPartnerAlive||p.partner===q.id)&&!related(p,q));
   if(candidates.length){const mate=p.partner?candidates.find(q=>q.id===p.partner)||pick(s,candidates):pick(s,candidates);p.partner=mate.id;mate.partner=p.id;p.pregnancyDays=280;}
  }
  if(p.age<5&&random(s)<(.00008+(5-p.age)*.000055)+(localFood<.25?.0007:0)+(p.health<35?.0008:0)){killPerson(s,p);s.stats.deaths++;}
  p.age+=1/365;
 }
 // Other societies have their own demographic and resource cycles.
 for(const g of s.neighbors){
  const frontier=s.settlements.reduce((best,st)=>{const d=Number.isFinite(g.latitude)&&Number.isFinite(g.longitude)&&Number.isFinite(st.latitude)&&Number.isFinite(st.longitude)?haversine(g,st):Math.hypot(g.x-st.x,g.y-st.y)*20;return !best||d<best.distance?{settlement:st,distance:d}:best;},null)?.settlement||sett;
  const gx=Math.round(g.x),gy=Math.round(g.y),terrainCode=s.geography?.terrain?.[gy*s.geography.width+gx]??1;
  const fertility=terrainCode===1||terrainCode===6?1.09:terrainCode===2?1.04:terrainCode===4||terrainCode===7?.82:1;
  const productivity=.112*fertility+Math.min(.035,g.technology*.00002),need=g.population*.105;
  const growth=g.food>g.population*9?.00012:g.food<g.population*2?-.00032:-.00004;
  g.population=Math.max(3,Math.round(g.population+g.population*growth+(random(s)<.0006?1:0)));
  g.food=clamp(g.food+g.population*productivity-need,0,Math.max(240,g.population*45));
  if(g.food>g.population*18&&random(s)<.000025){const direction=pick(s,[[1,0],[-1,0],[0,1],[0,-1]]),nx=clamp(g.x+direction[0]*3,2,s.geography.width-3),ny=clamp(g.y+direction[1]*3,2,s.geography.height-3),code=s.geography.terrain[Math.round(ny)*s.geography.width+Math.round(nx)];if(code!==0&&code!==4&&code!==5&&code!==6){g.x=nx;g.y=ny;Object.assign(g,nearbyCoordinates(s.settlements[0],g.x,g.y));g.knownArea=(g.knownArea||4)+1;}}
  g.technology+=g.population*.00008;
  const routeDistance=Number.isFinite(g.latitude)&&Number.isFinite(g.longitude)&&Number.isFinite(frontier.latitude)&&Number.isFinite(frontier.longitude)?haversine(g,frontier):Math.hypot(g.x-frontier.x,g.y-frontier.y)*20;
  const proximity=Math.max(.05,1-routeDistance/5000),territorialPressure=Math.max(0,1-routeDistance/900);
  if(!g.discovered&&n>28&&random(s)<.00011*proximity){g.discovered=true;if(!g.name)g.name=inventPlaceName(s);s.stats.discoveries++;addEvent(s,"Primo incontro con "+g.name,"Esploratori incontrano una comunità indipendente oltre la valle. Le due società hanno lingue e consuetudini differenti.","diplomacy");}
  if(g.discovered){
   if(random(s)<.00018*proximity){g.hostility=clamp(g.hostility+(s.food<n*3?6:3),0,100);addEvent(s,"Tensione al confine","Un incidente tra membri delle due comunità peggiora i rapporti con "+g.name+".","diplomacy");}
   const tradeReach=tech.includes("Ruota")?2200:650,routeEfficiency=Math.max(.3,1-routeDistance/Math.max(1,tradeReach*1.5));
   if(!g.atWar&&routeDistance<=tradeReach&&random(s)<(g.allied?.00032:.00012)*proximity){
    let shipment=0;
    if(g.food>g.population*8&&s.food<n*12){shipment=Math.floor(Math.min(12,Math.floor(g.food-g.population*6))*routeEfficiency);g.food-=shipment;frontier.stores=Math.max(0,frontier.stores+shipment);s.food=Math.max(0,s.food+shipment);}
    else if(s.food>n*15&&g.food<g.population*8){shipment=-Math.floor(Math.min(12,Math.floor(s.food-n*8))*routeEfficiency);frontier.stores=Math.max(0,frontier.stores+shipment);s.food=Math.max(0,s.food+shipment);g.food-=shipment;}
    s.knowledge+=1+g.technology*.025;g.technology+=.025;g.hostility=clamp(g.hostility-(g.allied?2:1),0,100);
    addEvent(s,g.allied?"Scambio tra alleati":"Si apre una rotta commerciale",g.name+" e la comunità scambiano conoscenze e beni"+(shipment?" per "+Math.abs(shipment)+" unità di provviste":"")+". I contatti rendono più familiari usi e tecniche differenti.","diplomacy");
   }
   if(!g.atWar&&!g.allied&&s.year>=(g.truceUntil||0)&&n>70&&g.population>25&&g.hostility>45&&territorialPressure>.12&&random(s)<0.00016*proximity*territorialPressure){g.atWar=true;g.warDays=0;s.stats.wars++;addEvent(s,"Conflitto con "+g.name,"Le tensioni per territorio e risorse degenerano in guerra aperta. La comunità mobilita i propri difensori.","war");}
   if(g.atWar){g.warDays++;if(g.warDays%30===0){
    const ownPower=n*0.32+s.order*0.35+s.technology.length*5,enemyPower=g.population*0.42+g.technology*2;
    if(g.warDays===30&&enemyPower>ownPower*1.2){const raid=Math.round(n*1.5);frontier.stores=Math.max(0,frontier.stores-raid);s.food=Math.max(0,s.food-raid);s.cohesion=clamp(s.cohesion-3,0,100);addEvent(s,"Incursione nella valle",g.name+" supera le difese di confine e saccheggia parte delle riserve. La popolazione si rifugia nell’insediamento principale.","war");}
    const ownLoss=Math.max(1,Math.round((random(s)*3+1)*(enemyPower/Math.max(1,ownPower))));
    const enemyLoss=Math.max(1,Math.round((random(s)*3+1)*(ownPower/Math.max(1,enemyPower))));
    for(let k=0;k<ownLoss;k++){const victim=pick(s,living(s));if(victim){killPerson(s,victim);s.stats.deaths++;}}
    g.population=Math.max(3,g.population-enemyLoss);frontier.stores=Math.max(0,frontier.stores-ownLoss*2);s.food=Math.max(0,s.food-ownLoss*2);s.cohesion=clamp(s.cohesion-1.2,0,100);
    addEvent(s,"Scontro armato","Uno scontro con "+g.name+" provoca "+ownLoss+" perdite nella comunità e "+enemyLoss+" tra gli avversari.","war");
    const invasionRoll=random(s);
    if(ownPower>enemyPower*1.2&&invasionRoll<.10){
     const captured=Math.max(1,Math.round(g.population*.08));
     g.population=Math.max(3,g.population-captured);
     const supplies=Math.min(35,Math.round(captured*.7));
     const received=Math.min(supplies,Math.max(0,Math.max(240,living(s).length*45)-s.food));s.food+=received;frontier.stores+=received;
     frontier.knownArea+=2;
     addEvent(s,"Avanzata oltre il confine","Le forze della valle penetrano nel territorio di "+g.name+". Vengono occupate aree di pascolo e raccolta e recuperate alcune provviste.","war");
    }else if(enemyPower>ownPower*1.2&&invasionRoll<.16){
     const damage=Math.max(1,Math.round(living(s).length*.012));
     for(let k=0;k<damage;k++){const defenders=living(s);if(!defenders.length)break;const victim=pick(s,defenders);killPerson(s,victim);s.stats.deaths++;}
     frontier.stores=Math.max(0,frontier.stores-damage*2);s.food=Math.max(0,s.food-damage*2);
     s.cohesion=clamp(s.cohesion-2.5,0,100);
     addEvent(s,"Incursione nel territorio","Un'incursione di "+g.name+" supera le difese periferiche. Vengono sottratte provviste e la comunità deve riorganizzare la protezione del territorio.","war");
    }
   }
   if(g.warDays>150||g.population<=4){g.atWar=false;g.hostility=25;g.truceUntil=s.year+12;g.allied=false;addEvent(s,"Cessazione delle ostilità","Il conflitto con "+g.name+" termina dopo mesi di scontri. Le perdite e le tensioni restano nella memoria collettiva.","war");}
   }
  }
 }
 // Epidemics spread between residents of the same settlement; survivors acquire temporary immunity.
 if(!s.disease)s.disease={active:false,strain:0,days:0};
 const medicine=tech.includes("Medicina organizzata"),hasHealers=healers>0;
 if(!s.disease.active&&n>35&&random(s)<(n>150?.00004:.000025)+(climate.type==="alluvione"&&climate.days>0?.000035:0)){
  const candidates=people.filter(p=>(p.immunityDays||0)<=0&&!(p.infectionDays>0));
  if(candidates.length){const first=pick(s,candidates);first.infectionDays=28+Math.floor(random(s)*55);s.disease.active=true;s.disease.days=0;s.disease.strain=.25+random(s)*.55;s.stats.epidemics++;addEvent(s,"Focolaio di malattia","Una malattia compare in un insediamento. La diffusione dipenderà dai contatti, dalla densità abitativa e dalle cure disponibili.","disease");}
 }
 const infectedBySite=new Map();
 for(const p of people)if((p.infectionDays||0)>0)infectedBySite.set(p.settlementId,(infectedBySite.get(p.settlementId)||0)+1);
 for(const st of s.settlements){
  const locals=residents.get(st.id)||[],infected=infectedBySite.get(st.id)||0;
  if(!infected)continue;
  const crowding=clamp(locals.length/Math.max(12,(st.homes||6)*5),.25,3);
  const spread=.34*(infected/Math.max(1,locals.length))*crowding*(medicine?.58:1);
  for(const p of locals){
   if((p.infectionDays||0)>0||(p.immunityDays||0)>0)continue;
   if(random(s)<spread){p.infectionDays=24+Math.floor(random(s)*50);p.health=clamp(p.health-(medicine?0.08:0.22),0,100);}
  }
 }
 let activeInfections=0;
 for(const p of people){
  if((p.immunityDays||0)>0)p.immunityDays--;
  if((p.infectionDays||0)>0){
   p.infectionDays--;activeInfections++;
   const severity=s.disease.strain*(medicine?.45:1)*(hasHealers?.82:1);
   p.health=clamp(p.health-(.18+random(s)*.28)*severity,0,100);
   if(p.infectionDays<=0)p.immunityDays=365+Math.floor(random(s)*730);
  }
 }
 s.disease.active=activeInfections>0;
 if(s.disease.active)s.disease.days++;
 else if(s.disease.days>0){s.disease.days=0;addEvent(s,"Il focolaio si esaurisce","I contagi si sono fermati. I sopravvissuti conservano una protezione temporanea contro la stessa malattia.","disease");}
 const survivors=living(s);if(survivors.length)s.health=Math.round(survivors.reduce((total,p)=>total+p.health,0)/survivors.length);
 // Knowledge is generated by practice, exchange and accumulated experience.
 let learners=0;for(const p of people)if(p.age>=8&&p.age<60)learners++;
 s.knowledge+=learners*(.00007+(s.technology.length*.000011))*(s.cohesion/75)*(tech.includes("Scrittura")?1.18:1)*(tech.includes("Scuola")?1.65:1);
 // theft and disputes emerge under scarcity and inequality
 if(s.food<n*2&&random(s)<.003+(s.social?.inequality||0)*.002){s.stats.crimes++;s.cohesion=clamp(s.cohesion-1,0,100);addEvent(s,"Furto di provviste","Una persona sottrae cibo dalle riserve comuni. Il conflitto sulla distribuzione mette alla prova la fiducia reciproca.","crime");}
 if(n>70&&random(s)<.000025+(s.social?.inequality||0)*.000035){s.stats.crimes++;s.cohesion=clamp(s.cohesion-.15,0,100);if(s.institutions.includes("Guardia civica"))s.order=clamp(s.order+.02,0,100);if(random(s)<.15)addEvent(s,"Violazione delle norme","Un abitante viene accusato di aver violato una regola della comunità. Il consiglio deve stabilire una risposta.","crime");}
 if(s.institutions.length&&random(s)<.00016){s.order=clamp(s.order-2,0,100);addEvent(s,"Controversia tra famiglie","Una disputa su risorse e responsabilità richiede la mediazione del consiglio.","politics");}
 // A settlement expands when its population and material base can sustain it.
 for(const st of s.settlements){const local=st.population||0;if(local>=35&&st.kind==="accampamento"){st.kind="villaggio";st.homes=Math.max(st.homes||0,18,Math.ceil(local/3));addEvent(s,"L'accampamento diventa villaggio","Le famiglie costruiscono abitazioni permanenti, depositi e spazi comuni.","settlement");}if(local>=120&&st.kind==="villaggio"){st.kind="centro urbano";st.homes=Math.max(st.homes||0,70,Math.ceil(local/2.5));addEvent(s,"Nasce un centro urbano","L'insediamento sviluppa quartieri, artigiani e istituzioni permanenti.","settlement");}if(tech.includes("Agricoltura")&&local>=12)st.fields=Math.max(st.fields||0,Math.round(local*.18));if(tech.includes("Irrigazione")&&local>=20)st.fields=Math.max(st.fields||0,Math.round(local*.25));}
 if(n>95&&s.food>n*5&&s.settlements.length<Math.floor(n/85)&&random(s)<.00022){
  const origins=s.settlements.filter(st=>(st.population||0)>=35&&st.stores>(st.population||0)*8);
  if(origins.length){
   const origin=pick(s,origins),site=findColonizationSite(s,origin),candidates=people.filter(p=>p.age>=16&&p.settlementId===origin.id);
   const migrantCount=Math.min(candidates.length,Math.max(8,Math.floor((origin.population||0)*.12)));
   if(site&&migrantCount>=8){
    const id=s.nextSettlementId++,geo=nearbyCoordinates(origin,site.x,site.y),transfer=Math.min(origin.stores*.28,migrantCount*9);
    const newSite={id,name:null,x:site.x,y:site.y,latitude:geo.latitude,longitude:geo.longitude,kind:"accampamento",homes:8,fields:tech.includes("Agricoltura")?Math.max(2,Math.round(migrantCount*.16)):0,stores:transfer,water:400,knownArea:4,population:0,foundingYear:s.year,nationId:s.nationName?1:null,originId:origin.id};
    origin.stores-=transfer;s.settlements.push(newSite);
    for(let i=0;i<migrantCount;i++){const migrant=pick(s,candidates);migrant.settlementId=id;candidates.splice(candidates.indexOf(migrant),1);}
    s.stats.migrations++;addEvent(s,"Un gruppo parte per nuove terre","Famiglie e lavoratori lasciano "+(origin.name||"l'insediamento")+" e fondano una comunità autonoma in un territorio con acqua e risorse proprie.","migration");
   }
  }
 }
 const settlementCounts=new Map(s.settlements.map(st=>[st.id,0]));
 for(const p of people){if(!settlementCounts.has(p.settlementId))p.settlementId=sett.id;settlementCounts.set(p.settlementId,(settlementCounts.get(p.settlementId)||0)+1);}
 for(const st of s.settlements){st.population=settlementCounts.get(st.id)||0;}
 // seasonal turnover and annual records
 if(s.day%90===0&&random(s)<.08){const p=pick(s,people);if(p)p.skill+=.05;}
 if(climate.days>0){climate.days--;if(climate.days===0){s.climate={type:"normale",days:0,severity:0};addEvent(s,"Fine dell emergenza climatica","Le condizioni meteorologiche tornano gradualmente alla normalità. La comunità avvia il recupero delle risorse.","climate");}}
 s.day++;if(s.day>365)yearBoundary(s);
 prunePopulation(s);
}
export function advance(world,days){
 const s=world;const start=s.year;let advanced=0;
 for(let i=0;i<Math.min(3650,Math.max(0,Math.floor(days)));i++){
  if(!living(s).length){if(!s.extinct){addEvent(s,"Fine della comunità","Non rimangono abitanti. La comunità si è estinta.","extinction");s.extinct=true;}break;}
  daily(s);advanced++;
  if(!living(s).length&&!s.extinct){addEvent(s,"Fine della comunità","Non rimangono abitanti. La comunità si è estinta.","extinction");s.extinct=true;break;}
 }
 return {world:s,advanced,years:s.year-start};
}
export function summary(s){
 const people=living(s),n=people.length,roleCounts=Object.create(null);for(const p of people)if(p.age>=15&&p.age<65)roleCounts[p.role]=(roleCounts[p.role]||0)+1;
 return {year:s.year,day:s.day,population:n,settlements:s.settlements.length,geography:s.geography,language:s.language,leadership:s.leadership||{personId:null,legitimacy:0},leader:people.find(p=>p.id===s.leadership?.personId)||null,social:s.social||{inequality:0,tension:0,topShare:0,classes:{poveri:0,lavoratori:n,agiati:0,"élite":0}},food:Math.round(s.food),knowledge:Math.round(s.knowledge),health:Math.round(s.health),cohesion:Math.round(s.cohesion),order:Math.round(s.order),workers:Object.values(roleCounts).reduce((a,b)=>a+b,0),roles:Object.fromEntries(["agricoltore","raccoglitore","cacciatore","artigiano","costruttore","amministratore","mercante","guardia","guaritore","sacerdote"].map(role=>[role,roleCounts[role]||0])),technology:s.technology,events:s.events.slice(-80).reverse(),eventTotal:s.events.length,neighbors:s.neighbors,relations:s.neighbors.filter(g=>g.discovered).map(g=>g.name+(g.atWar?" · guerra":g.allied?" · alleanza":g.hostility>45?" · tensione":" · contatto")),institutions:s.institutions,polity:s.polity,nationName:s.nationName,nationType:s.nationType,religion:s.religion,laws:s.laws,economy:s.economy,settlement:s.settlements[0],settlementDetails:s.settlements,climate:s.climate||{type:"normale",days:0,severity:0},stats:s.stats,dead:s.stats.deaths||s.population.length-n};
}
export function validateWorld(s){
 if(!s||![1,2,VERSION].includes(s.version)||!Array.isArray(s.population)||!Array.isArray(s.settlements))throw new Error("Salvataggio non valido o versione incompatibile");
 if(!Number.isFinite(s.day)||!Number.isFinite(s.year)||!Number.isFinite(s.rng))throw new Error("Calendario o generatore casuale non valido");
 if(!s.climate)s.climate={type:"normale",days:0,severity:0};
 if(!s.geography)s.geography=generateGeography(s.rng||9041987);
 if(s.geography.mapVersion!==2){
  const previous=s.geography,fresh=generateGeography(s.rng||9041987);
  for(const feature of fresh.features){
   const match=(previous.features||[]).filter(old=>old.type===feature.type).sort((a,b)=>Math.hypot(a.x-feature.x,a.y-feature.y)-Math.hypot(b.x-feature.x,b.y-feature.y))[0];
   if(match&&Math.hypot(match.x-feature.x,match.y-feature.y)<18){feature.name=match.name||null;feature.discovered=Boolean(match.discovered);}
  }
  s.geography=fresh;
  for(const neighbor of s.neighbors||[]){
   const x=Math.round(neighbor.x),y=Math.round(neighbor.y),terrain=s.geography.terrain;
   if(terrain[y*s.geography.width+x]===0){let best=null,dist=Infinity;for(let yy=0;yy<s.geography.height;yy++)for(let xx=0;xx<s.geography.width;xx++){const code=terrain[yy*s.geography.width+xx];if(code===0||code===4||code===5||code===6)continue;const d=Math.hypot(xx-x,yy-y);if(d<dist){dist=d;best={x:xx,y:yy};}}if(best){neighbor.x=best.x;neighbor.y=best.y;}}
  }
 }
 if(!s.language)s.language={consonants:["k","m","t","s","r","n","l","v","d","g"],vowels:["a","e","i","o","u"],written:s.technology?.includes("Scrittura")||false};
 if(!Number.isFinite(s.nextNameId))s.nextNameId=1;
 for(const st of s.settlements){if(st.name==="Valle del Primo Fiume"||st.name==="Nuovo Guado")st.name=null;if(!Number.isFinite(st.foundingYear))st.foundingYear=s.year||0;}
 for(const g of s.neighbors||[])if(g.name==="Gente della Quercia"||g.name==="Clan delle Colline")g.name=null;
 s.version=VERSION;
 if(!s.disease)s.disease={active:false,strain:0,days:0};
 for(const p of s.population){if(!Number.isFinite(p.pregnancyDays))p.pregnancyDays=0;if(!Number.isFinite(p.infectionDays))p.infectionDays=0;if(!Number.isFinite(p.immunityDays))p.immunityDays=0;}
 for(const st of s.settlements)if(!Number.isFinite(st.stores))st.stores=st.population?Math.max(0,s.food*st.population/Math.max(1,living(s).length)):0;
 if(!Number.isFinite(s.archivedDeaths))s.archivedDeaths=0;
 if(!s.familyArchive||typeof s.familyArchive!=="object")s.familyArchive={};
 if(!s.nationName)s.nationName=null;
 if(!s.nationType)s.nationType=null;
 for(const g of s.neighbors){if(g.allied===undefined)g.allied=false;if(!Number.isFinite(g.truceUntil))g.truceUntil=0;}
 if(!s.social)s.social={inequality:0,tension:0,topShare:0,classes:{poveri:0,lavoratori:living(s).length,agiati:0,"élite":0},medianWealth:0};
 if(!Array.isArray(s.specializations))s.specializations=[];
 if(!s.leadership)s.leadership={personId:null,termStarted:0,legitimacy:50};
 for(const p of s.population){if(!Number.isFinite(p.wealth))p.wealth=0;if(!p.settlementId)p.settlementId=s.settlements[0].id;}
 for(const st of s.settlements)if(!Number.isFinite(st.population))st.population=s.population.filter(p=>p.alive&&p.settlementId===st.id).length;
 return s;
}
