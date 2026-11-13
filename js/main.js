import * as THREE from 'three';
import { VaelmarClock } from './world-time.js';

const canvas=document.querySelector('#stage');
const scene=new THREE.Scene();
scene.background=new THREE.Color(0x9ba9ad);
scene.fog=new THREE.Fog(0x9ba9ad,90,900);
const camera=new THREE.PerspectiveCamera(34,innerWidth/innerHeight,.1,40000);
camera.position.set(0,3.15,16.8);
const renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false});
renderer.setPixelRatio(Math.min(devicePixelRatio,2));
renderer.setSize(innerWidth,innerHeight);
renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.toneMapping=THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure=1.12;
renderer.shadowMap.enabled=true;
renderer.shadowMap.type=THREE.PCFSoftShadowMap;
const hemisphere=new THREE.HemisphereLight(0xe7edf4,0x46515a,2.1);scene.add(hemisphere);
const key=new THREE.DirectionalLight(0xffe1b2,3.1);key.position.set(-5,10,8);key.castShadow=true;key.shadow.mapSize.set(2048,2048);scene.add(key);
const rim=new THREE.DirectionalLight(0x9bc4e0,2.2);rim.position.set(6,6,-5);scene.add(rim);
const moonLight=new THREE.DirectionalLight(0x9bb8e8,0);moonLight.position.set(5,-8,-6);scene.add(moonLight);
const sunOrb=new THREE.Mesh(new THREE.SphereGeometry(.62,24,16),new THREE.MeshBasicMaterial({color:0xffd69a}));scene.add(sunOrb);
const moonOrb=new THREE.Mesh(new THREE.SphereGeometry(.48,24,16),new THREE.MeshBasicMaterial({color:0xdce5f5}));scene.add(moonOrb);
const groundMat=new THREE.MeshStandardMaterial({color:0x68756c,roughness:1});
const WORLD_SIDE=Math.sqrt(300)*1000;
const WORLD_AREA_KM2=300;
const ground=new THREE.Mesh(new THREE.PlaneGeometry(WORLD_SIDE,WORLD_SIDE),groundMat);ground.rotation.x=-Math.PI/2;ground.position.y=-.08;ground.receiveShadow=true;scene.add(ground);
const horizonMaterial=new THREE.MeshBasicMaterial({color:0x9ba9ad,side:THREE.BackSide});
const horizon=new THREE.Mesh(new THREE.SphereGeometry(1200,48,24),horizonMaterial);horizon.position.y=0;scene.add(horizon);

const mat=(color,roughness=.72,metalness=0)=>new THREE.MeshStandardMaterial({color,roughness,metalness});
const mats={
 skin:mat(0xc58e6c),skinLight:mat(0xd6a27e),dark:mat(0x20252b),leather:mat(0x60452f),gold:mat(0xb99a60,.34,.7),steel:mat(0x9ca8ad,.26,.8),
 robe:mat(0x343b60),robe2:mat(0x4b5278),green:mat(0x3d5944),green2:mat(0x64734e),red:mat(0x713d36),red2:mat(0x9b674e),cloak:mat(0x292e33),silver:mat(0xc5c9c6,.22,.82),hair:mat(0x30251f),linen:mat(0xb5a78b),iron:mat(0x46515a,.32,.72),wood:mat(0x493322)
};
function mesh(parent,geo,material,pos,scale){const m=new THREE.Mesh(geo,material);m.position.set(...pos);if(scale)m.scale.set(...scale);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m}
function capsule(parent,material,pos,r=.22,len=.62){return mesh(parent,new THREE.CapsuleGeometry(r,len,6,12),material,pos)}
function makeHero(type){
 const root=new THREE.Group();
 const palette=[mats.robe,mats.iron,mats.green,mats.red][type];
 const accent=[mats.gold,mats.gold,mats.leather,mats.gold][type];
 const skin=type===2?mats.skinLight:mats.skin;
 const dwarf=type===3;
 const height=dwarf?.76:1;
 const torso=dwarf?.42:.34;
 const leg=dwarf?.48:.57;
 // Ogni protagonista ha proporzioni, equipaggiamento e silhouette distinti.
 capsule(root,palette,[0,1.16*height,0],torso,dwarf?.55:.64);
 mesh(root,new THREE.SphereGeometry(dwarf?.43:.36,28,22),palette,[0,1.62*height,0],[dwarf?1.25:1,.72,.82]);
 if(type===1){
  // Corazza e spallacci della Guardia Reale.
  mesh(root,new THREE.BoxGeometry(.62,.48,.22),mats.steel,[0,1.42,0],[1,1,1]);
  for(const side of [-1,1])mesh(root,new THREE.SphereGeometry(.22,20,16),mats.iron,[side*.39,1.63,0],[1,.8,1]);
  mesh(root,new THREE.BoxGeometry(.38,.12,.08),mats.gold,[0,1.19,.22]);
 }else if(type===0){
  // Mantello lungo e tunica da Maestro Evocatore.
  const mantle=mesh(root,new THREE.ConeGeometry(.53,1.34,32,1,true),mats.robe2,[0,1.13,-.23]);mantle.rotation.x=-.08;mantle.scale.z=.7;
  mesh(root,new THREE.TorusGeometry(.35,.025,8,40),mats.gold,[0,1.55,.02]).rotation.x=Math.PI/2;
 }else if(type===2){
  // Corpetto da caccia, faretra e mantello corto.
  mesh(root,new THREE.SphereGeometry(.37,24,20),mats.leather,[0,1.52,-.04],[1,.72,.84]);
  const hood=mesh(root,new THREE.SphereGeometry(.29,24,18),mats.green2,[0,2.46,-.05],[1,.62,1]);
  const cape=mesh(root,new THREE.ConeGeometry(.42,.85,28,1,true),mats.green,[0,1.27,-.28]);cape.rotation.x=-.08;cape.scale.z=.52;
 }else{
  // Brundar: statura compatta, spalle larghe e barba intrecciata.
  mesh(root,new THREE.SphereGeometry(.34,24,18),mats.red2,[0,2.05*height,.07],[1.12,.95,.9]);
  const beard=mesh(root,new THREE.ConeGeometry(.22,.5,20,3),mats.hair,[0,1.91*height,.2]);beard.rotation.x=-.16;
  for(const side of [-1,1])mesh(root,new THREE.TorusGeometry(.07,.018,8,18),mats.gold,[side*.09,1.82*height,.24]);
 }
 capsule(root,skin,[0,2.03*height,0],.205*height,.22*height);
 mesh(root,new THREE.SphereGeometry(.235*height,28,24),skin,[0,2.34*height,0],[.88,1.08,.86]);
 mesh(root,new THREE.SphereGeometry(.245*height,24,16),type===3?mats.hair:mats.hair,[0,2.48*height,-.035],[1,.62,1]);
 if(type===0){
  // Cappuccio abbassato sulle spalle, volto scoperto.
  mesh(root,new THREE.TorusGeometry(.24,.055,10,28,Math.PI),mats.robe2,[0,2.43,0]).rotation.x=Math.PI;
 }else if(type===1){
  mesh(root,new THREE.BoxGeometry(.48,.13,.34),mats.iron,[0,2.53,0]);
  mesh(root,new THREE.ConeGeometry(.12,.24,8),mats.gold,[0,2.68,0]);
 }else if(type===2){
  // Orecchie lievemente appuntite dei Selvani.
  for(const side of [-1,1])mesh(root,new THREE.ConeGeometry(.055,.23,10),skin,[side*.245,2.34,0]).rotation.z=side*-1.35;
 }
 const eyeMat=new THREE.MeshStandardMaterial({color:0x29231f});
 for(const x of [-.075,.075])mesh(root,new THREE.SphereGeometry(.018*height,10,8),eyeMat,[x,2.36*height,.198*height],[1,1,.5]);
 for(const side of [-1,1]){
  const x=side*(dwarf?.22:.145);
  capsule(root,palette,[x,leg,0],dwarf?.19:.145,dwarf?.35:.48);
  capsule(root,mats.dark,[x,.19*height,.055],.13*height,.2*height);
  mesh(root,new THREE.SphereGeometry(.14*height,16,12),mats.dark,[x,.105*height,.15],[1,.55,1.5]);
  mesh(root,new THREE.SphereGeometry(dwarf?.25:.19,20,16),palette,[side*(dwarf?.48:.39),1.62*height,0],[1,1,.9]);
  const arm=capsule(root,palette,[side*(dwarf?.5:.43),1.32*height,.015],.11*height,.42*height);arm.rotation.z=side*-.12;
  capsule(root,skin,[side*(dwarf?.52:.46),1.02*height,.035],.085*height,.12*height);
 }
 mesh(root,new THREE.TorusGeometry(dwarf?.36:.285,.035,8,32),accent,[0,1.0*height,0]).rotation.x=Math.PI/2;
 mesh(root,new THREE.BoxGeometry(.13,.13,.055),mats.gold,[0,1.0*height,.29]);
 if(type===0){
  const staff=new THREE.Group();mesh(staff,new THREE.CylinderGeometry(.035,.05,2.15,16),mats.wood,[0,1.05,0]);
  mesh(staff,new THREE.OctahedronGeometry(.2,2),new THREE.MeshStandardMaterial({color:0x72c8ef,emissive:0x237ca8,emissiveIntensity:1.5,metalness:.25,roughness:.18}),[0,2.2,0]);
  staff.position.set(.66,0,.08);staff.rotation.z=-.1;root.add(staff);
 }else if(type===1){
  const sword=new THREE.Group();mesh(sword,new THREE.BoxGeometry(.085,1.08,.045),mats.steel,[0,.67,0]);
  mesh(sword,new THREE.BoxGeometry(.4,.075,.1),mats.gold,[0,.15,0]);mesh(sword,new THREE.CylinderGeometry(.045,.045,.28,10),mats.leather,[0,0,0]);
  sword.position.set(.58,1.05,.08);sword.rotation.z=-.18;root.add(sword);
  const shield=mesh(root,new THREE.CylinderGeometry(.34,.34,.09,8),mats.iron,[-.55,1.22,.08]);shield.rotation.z=Math.PI/8;
  mesh(root,new THREE.SphereGeometry(.13,16,12),mats.gold,[-.55,1.22,.15]);
 }else if(type===2){
  const bow=new THREE.Group();const arc=mesh(bow,new THREE.TorusGeometry(.52,.035,10,40,Math.PI),mats.wood,[0,0,0]);arc.rotation.z=Math.PI/2;
  mesh(bow,new THREE.CylinderGeometry(.009,.009,1.04,6),mats.linen,[0,0,0]);bow.position.set(.57,1.48,-.04);bow.rotation.z=-.12;root.add(bow);
  const quiver=mesh(root,new THREE.CylinderGeometry(.1,.13,.68,12),mats.leather,[-.28,1.55,-.22]);quiver.rotation.x=-.2;
  for(let n=0;n<4;n++){const arrow=mesh(root,new THREE.CylinderGeometry(.012,.012,.72,6),mats.wood,[-.28+(n-1.5)*.035,1.92,-.22]);arrow.rotation.z=(n-1.5)*.035;}
 }else{
  const axe=new THREE.Group();mesh(axe,new THREE.CylinderGeometry(.055,.07,1.8,12),mats.wood,[0,.9,0]);
  const blade=mesh(axe,new THREE.ShapeGeometry((()=>{const s=new THREE.Shape();s.moveTo(0,1.7);s.quadraticCurveTo(.62,1.45,.48,.92);s.quadraticCurveTo(.28,.5,0,.55);s.lineTo(0,1.7);return s;})()),mats.silver,[.02,0,.02]);
  axe.position.set(-.62,0,.06);axe.rotation.z=.08;root.add(axe);
 }
 if(dwarf)root.scale.set(1.16,.84,1.16);
 return root;
}
const heroes=[makeHero(0),makeHero(1),makeHero(2),makeHero(3)];
const stageGroup=new THREE.Group();scene.add(stageGroup);
heroes.forEach((h,i)=>{h.position.set((i-1.5)*2.65,0,0);h.scale.multiplyScalar(1.04);stageGroup.add(h)});
const pedestalMat=mat(0x252b2b,.62,.22);
for(let i=0;i<4;i++){const p=mesh(stageGroup,new THREE.CylinderGeometry(.88,.98,.16,48),pedestalMat,[(i-1.5)*2.25,.0,0]);const ring=mesh(stageGroup,new THREE.TorusGeometry(.86,.014,8,64),mats.gold,[(i-1.5)*2.25,.09,0]);ring.rotation.x=Math.PI/2;}
const heroData=[
 {name:'MERRIK VALETH',role:'MAESTRO EVOCATORE · ETÀ SCONOSCIUTA',description:'Esiliato dall’Accademia di Lumenor per aver denunciato lo spegnimento dei Sigilli. Cerca i suoi allievi e la verità sul maestro Corvain.',weapon:'FUOCO · GELO · TEMPESTA · LUCE · EVOCAZIONE'},
 {name:'KAELEN DORNE',role:'EX CAPITANO DELLA GUARDIA · 34 ANNI',description:'Accusato del tradimento che ha ucciso il Re di Aurelan. Non sa ancora di essere figlio illegittimo del sovrano. Cerca il vero assassino e il proprio nome.',weapon:'SPADA · SCUDO · PARATE · CONTRATTACCHI'},
 {name:'ELOWEN KAER',role:'CAPITANA DEI CACCIATORI · 29 ANNI',description:'Cresciuta tra Umani e Selvani, conosce ogni sentiero della Selva Sussurrante. Suo fratello Tamsin è scomparso mentre la foresta moriva.',weapon:'ARCO · FRECCE SPECIALI · FURTIVITÀ · TRAPPOLE'},
 {name:'BRUNDAR FERROCUORE',role:'GUARDIANO DI SOGLIA · 112 ANNI',description:'Nano del clan Martelloscuro, esiliato dopo il crollo del Passo di Pietra. I suoi fratelli sono intrappolati nelle miniere: li ritroverà e riabiliterà il clan.',weapon:'ASCIA · FORZA · RESISTENZA · SPEZZA-ARMATURE'}
];

const vaelmarClock=new VaelmarClock({gameSeconds:6*60*60});
let lastClockMinute='';
const phaseLabels={night:'NOTTE',dawn:'ALBA',morning:'MATTINA',day:'GIORNO',afternoon:'POMERIGGIO',sunset:'TRAMONTO',twilight:'CREPUSCOLO'};
const skyStops=[
 [0,0x111a2a],[5,0x4b526b],[6,0xb17e68],[8,0xa9c3c8],[12,0x9ba9ad],
 [16,0xc0a07b],[19,0x9b665e],[21,0x343b54],[24,0x111a2a]
];
function skyColorAt(hour){
 let index=0;while(index<skyStops.length-2&&hour>skyStops[index+1][0])index++;
 const [h1,c1]=skyStops[index],[h2,c2]=skyStops[index+1];
 return new THREE.Color(c1).lerp(new THREE.Color(c2),THREE.MathUtils.clamp((hour-h1)/(h2-h1),0,1));
}
function updateWorldLighting(state){
 const hour=state.hour+state.minute/60+state.second/3600;
 const solarAngle=((hour-6)/12)*Math.PI;
 const elevation=Math.sin(solarAngle);
 const daylight=THREE.MathUtils.smoothstep(elevation,-.12,.62);
 const sky=skyColorAt(hour);
 scene.background.copy(sky);scene.fog.color.copy(sky);horizonMaterial.color.copy(sky);
 key.position.set(Math.cos(solarAngle)*18,elevation*18,8);
 key.intensity=.04+daylight*3.05;
 key.color.set(0xffd0a0).lerp(new THREE.Color(0xfff0d7),daylight);
 hemisphere.intensity=.28+daylight*1.8;
 rim.intensity=.18+daylight*.75;
 moonLight.position.set(-Math.cos(solarAngle)*16,-elevation*16,-8);
 moonLight.intensity=.04+(1-daylight)*.42;
 sunOrb.visible=elevation>-.08;sunOrb.position.set(Math.cos(solarAngle)*11,1+elevation*4.5,-14);
 moonOrb.visible=elevation<.12;moonOrb.position.set(-Math.cos(solarAngle)*10,1-elevation*4.2,-13);
 renderer.toneMappingExposure=.68+daylight*.44;
 const stamp=state.date+'|'+state.time;
 if(stamp!==lastClockMinute){
  $('worldDate').textContent=state.date;
  $('worldTime').textContent=state.time.slice(0,5);
  $('worldSeason').textContent=state.season.toUpperCase();
  $('worldPhase').textContent=phaseLabels[state.phase]||state.phase.toUpperCase();
  lastClockMinute=stamp;
 }
}

const $=id=>document.getElementById(id);
const audio=$('mainMusic');
audio.volume=.20;
audio.loop=true;
let musicOn=true;
let selected=0;
let mode='menu';

function showScreen(id){
 document.querySelectorAll('.screen').forEach(screen=>screen.classList.toggle('hidden',screen.id!==id));
 document.body.classList.toggle('show-heroes',id==='characterSelect');
 mode=id==='mainMenu'?'menu':id==='characterSelect'?'select':'ready';
}
async function startMusic(){
 if(!musicOn||!audio.paused)return;
 try{await audio.play();}catch(error){/* Il browser può richiedere il primo input dell'utente. */}
}
function chooseHero(index){
 selected=Math.max(0,Math.min(heroData.length-1,index));
 const data=heroData[selected];
 $('heroRole').textContent=data.role;
 $('heroName').textContent=data.name;
 $('heroDescription').textContent=data.description;
 $('heroWeapon').textContent=data.weapon;
 document.querySelectorAll('.hero-card').forEach((card,i)=>{
  const active=i===selected;
  card.classList.toggle('selected',active);
  card.setAttribute('aria-pressed',String(active));
 });
 heroes.forEach((hero,i)=>{
  hero.scale.setScalar(i===selected?1.16:.92);
  hero.position.z=i===selected?.25:-.25;
 });
}
function enterSelection(){
 showScreen('characterSelect');
 chooseHero(selected);
}
function enterWorld(){
 $('readyTitle').textContent=heroData[selected].name+' — VAELMAR';
 showScreen('worldReady');
 $('worldClock').classList.remove('hidden');
 vaelmarClock.start();
 updateWorldLighting(vaelmarClock.snapshot());
}
function backToSelection(){
 vaelmarClock.pause();
 $('worldClock').classList.add('hidden');
 enterSelection();
}
$('beginButton').addEventListener('click',enterSelection);
$('enterWorldButton').addEventListener('click',enterWorld);
$('backToMenu').addEventListener('click',()=>showScreen('mainMenu'));
$('backToCharacters').addEventListener('click',backToSelection);
$('returnMenu').addEventListener('click',()=>{
 vaelmarClock.pause();
 $('worldClock').classList.add('hidden');
 showScreen('mainMenu');
});
document.querySelectorAll('.hero-card').forEach(card=>{
 card.addEventListener('click',()=>chooseHero(Number(card.dataset.hero)));
});
$('musicToggle').addEventListener('click',async()=>{
 musicOn=!musicOn;
 $('musicToggle').classList.toggle('is-muted',!musicOn);
 $('musicToggle').setAttribute('aria-pressed',String(musicOn));
 $('musicToggle').setAttribute('aria-label',musicOn?'Disattiva musica':'Attiva musica');
 if(musicOn)await startMusic();else audio.pause();
});
document.addEventListener('pointerdown',startMusic);
document.addEventListener('keydown',event=>{
 if(event.altKey||event.ctrlKey||event.metaKey)return;
 if(mode==='select'){
  if(event.key==='ArrowLeft'||event.key==='ArrowRight'){
   event.preventDefault();
   chooseHero((selected+(event.key==='ArrowRight'?1:3))%4);
  }else if(event.key==='Enter'&&event.target.tagName!=='BUTTON'){
   event.preventDefault();enterWorld();
  }else if(event.key==='Escape'){
   event.preventDefault();showScreen('mainMenu');
  }
 }else if(mode==='menu'&&event.key==='Enter'){
  event.preventDefault();enterSelection();
 }else if(mode==='ready'&&event.key==='Escape'){
  event.preventDefault();backToSelection();
 }
});
chooseHero(0);
showScreen('mainMenu');
startMusic();
function resize(){
 camera.aspect=innerWidth/innerHeight;
 camera.updateProjectionMatrix();
 renderer.setSize(innerWidth,innerHeight);
}
addEventListener('resize',resize);
const renderClock=new THREE.Clock();
function animate(){
 requestAnimationFrame(animate);
 const delta=renderClock.getDelta();
 const t=renderClock.elapsedTime;
 if(mode==='ready')updateWorldLighting(vaelmarClock.advance(delta));
 stageGroup.rotation.y=Math.sin(t*.12)*.055;
 heroes.forEach((hero,i)=>{
  hero.position.y=Math.sin(t*1.15+i*.8)*.018;
  hero.rotation.y=Math.sin(t*.35+i)*.035;
 });
 renderer.render(scene,camera);
}
animate();
$('readyTitle').dataset.worldSide=String(WORLD_SIDE);
$('readyTitle').dataset.worldArea=String(WORLD_AREA_KM2);
