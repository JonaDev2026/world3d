import * as THREE from 'three';

const canvas=document.querySelector('#stage');
const scene=new THREE.Scene();
scene.background=new THREE.Color(0x9ba9ad);
scene.fog=new THREE.Fog(0x9ba9ad,90,900);
const camera=new THREE.PerspectiveCamera(34,innerWidth/innerHeight,.1,40000);
camera.position.set(0,3.2,15);
const renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false});
renderer.setPixelRatio(Math.min(devicePixelRatio,2));
renderer.setSize(innerWidth,innerHeight);
renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.toneMapping=THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure=1.12;
renderer.shadowMap.enabled=true;
renderer.shadowMap.type=THREE.PCFSoftShadowMap;
scene.add(new THREE.HemisphereLight(0xe7edf4,0x46515a,2.1));
const key=new THREE.DirectionalLight(0xffe1b2,3.1);key.position.set(-5,10,8);key.castShadow=true;key.shadow.mapSize.set(2048,2048);scene.add(key);
const rim=new THREE.DirectionalLight(0x9bc4e0,2.2);rim.position.set(6,6,-5);scene.add(rim);
const groundMat=new THREE.MeshStandardMaterial({color:0x68756c,roughness:1});
const ground=new THREE.Mesh(new THREE.PlaneGeometry(36000,36000),groundMat);ground.rotation.x=-Math.PI/2;ground.position.y=-.08;ground.receiveShadow=true;scene.add(ground);
const horizon=new THREE.Mesh(new THREE.SphereGeometry(1200,48,24),new THREE.MeshBasicMaterial({color:0x9ba9ad,side:THREE.BackSide}));horizon.position.y=0;scene.add(horizon);

const mat=(color,roughness=.72,metalness=0)=>new THREE.MeshStandardMaterial({color,roughness,metalness});
const mats={
 skin:mat(0xc58e6c),skinLight:mat(0xd6a27e),dark:mat(0x20252b),leather:mat(0x60452f),gold:mat(0xb99a60,.34,.7),steel:mat(0x9ca8ad,.26,.8),
 robe:mat(0x343b60),robe2:mat(0x4b5278),green:mat(0x3d5944),green2:mat(0x64734e),red:mat(0x713d36),red2:mat(0x9b674e),cloak:mat(0x292e33),silver:mat(0xc5c9c6,.22,.82),hair:mat(0x30251f)
};
function mesh(parent,geo,material,pos,scale){const m=new THREE.Mesh(geo,material);m.position.set(...pos);if(scale)m.scale.set(...scale);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m}
function capsule(parent,material,pos,r=.22,len=.62){return mesh(parent,new THREE.CapsuleGeometry(r,len,6,12),material,pos)}
function makeHero(type){
 const root=new THREE.Group();
 const palette=[mats.robe,mats.green,mats.red,mats.cloak][type];
 const accent=[mats.gold,mats.leather,mats.gold,mats.silver][type];
 const skin=type===2?mats.skinLight:mats.skin;
 // Silhouette: soft anatomical volumes, layered clothing and separate limbs.
 capsule(root,palette,[0,1.16,0],.34,.64);
 mesh(root,new THREE.SphereGeometry(.36,24,20),palette,[0,1.62,0],[1,.7,.78]);
 capsule(root,skin,[0,2.03,0],.205,.22);
 mesh(root,new THREE.SphereGeometry(.235,28,24),skin,[0,2.34,0],[.88,1.08,.86]);
 const hair=mesh(root,new THREE.SphereGeometry(.245,24,16),type===3?mats.dark:mats.hair,[0,2.48,-.035],[1,.62,1]);
 if(type===3){hair.scale.set(1.12,1.12,1.08);mesh(root,new THREE.SphereGeometry(.22,24,20),mats.dark,[0,2.34,.07],[1,1.1,.8]);}
 // Face details
 const eyeMat=new THREE.MeshStandardMaterial({color:type===3?0xd2b16f:0x29231f,emissive:type===3?0x8b6429:0x000000,emissiveIntensity:.7});
 for(const x of [-.075,.075])mesh(root,new THREE.SphereGeometry(.018,10,8),eyeMat,[x,2.36,.198],[1,1,.5]);
 // Legs and boots
 for(const side of [-1,1]){
  const x=side*.145;
  capsule(root,palette,[x,.57,0],.145,.48);
  capsule(root,mats.dark,[x,.19,.055],.13,.2);
  mesh(root,new THREE.SphereGeometry(.14,16,12),mats.dark,[x,.105,.15],[1,.55,1.5]);
  // shoulders, arms and hands
  mesh(root,new THREE.SphereGeometry(.19,18,14),palette,[side*.39,1.62,0],[1,1,.9]);
  const arm=capsule(root,palette,[side*.43,1.32,.015],.105,.42);arm.rotation.z=side*-.12;
  capsule(root,skin,[side*.46,1.02,.035],.085,.12);
 }
 // Belt and layered shoulder/torso trim
 mesh(root,new THREE.TorusGeometry(.285,.035,8,32),accent,[0,1.0,0]).rotation.x=Math.PI/2;
 mesh(root,new THREE.BoxGeometry(.13,.13,.055),mats.gold,[0,1.0,.29]);
 // Cloak for readable silhouette
 if(type!==1){const cape=mesh(root,new THREE.ConeGeometry(.47,1.05,24,1,true),type===0?mats.robe2:type===2?mats.red2:mats.cloak,[0,1.24,-.27]);cape.rotation.x=-.12;cape.scale.z=.58;}
 if(type===1){const hood=mesh(root,new THREE.SphereGeometry(.28,20,16),mats.green2,[0,2.48,-.015],[1,.55,1]);for(const side of [-1,1])mesh(root,new THREE.ConeGeometry(.045,.23,8),skin,[side*.245,2.34,0]).rotation.z=side*-1.25;}
 // Weapons, each built with smooth metal and wood pieces.
 if(type===0){
  const staff=new THREE.Group();mesh(staff,new THREE.CylinderGeometry(.035,.05,2.15,12),mats.leather,[0,1.05,0]);mesh(staff,new THREE.OctahedronGeometry(.19,2),new THREE.MeshStandardMaterial({color:0x72c8ef,emissive:0x237ca8,emissiveIntensity:1.4,metalness:.25,roughness:.18}),[0,2.2,0]);staff.position.set(.64,0,.08);staff.rotation.z=-.1;root.add(staff);
 }else if(type===1){
  const bow=new THREE.Group();const arc=mesh(bow,new THREE.TorusGeometry(.48,.035,10,36,Math.PI),mats.leather,[0,0,0]);arc.rotation.z=Math.PI/2;mesh(bow,new THREE.CylinderGeometry(.009,.009,.96,6),mats.gold,[0,0,0]);bow.position.set(.55,1.45,-.04);bow.rotation.z=-.12;root.add(bow);
  const quiver=mesh(root,new THREE.CylinderGeometry(.09,.12,.62,12),mats.leather,[-.25,1.55,-.22]);quiver.rotation.x=-.2;
 }else if(type===2){
  const sword=new THREE.Group();mesh(sword,new THREE.BoxGeometry(.085,1.02,.045),mats.steel,[0,.67,0]);mesh(sword,new THREE.BoxGeometry(.38,.07,.1),mats.gold,[0,.15,0]);mesh(sword,new THREE.CylinderGeometry(.045,.045,.28,10),mats.leather,[0,.0,0]);sword.position.set(.55,1.08,.08);sword.rotation.z=-.18;root.add(sword);
 }else{
  const spear=new THREE.Group();mesh(spear,new THREE.CylinderGeometry(.035,.045,2.35,12),mats.dark,[0,1.15,0]);mesh(spear,new THREE.ConeGeometry(.13,.46,8),mats.silver,[0,2.55,0]);mesh(spear,new THREE.TorusGeometry(.09,.018,8,20),mats.gold,[0,2.28,0]);spear.position.set(-.56,0,.04);spear.rotation.z=.12;root.add(spear);
  const hood=mesh(root,new THREE.ConeGeometry(.32,.55,20),mats.cloak,[0,2.52,-.03]);hood.scale.z=.9;
 }
 return root;
}
const heroes=[makeHero(0),makeHero(1),makeHero(2),makeHero(3)];
const stageGroup=new THREE.Group();scene.add(stageGroup);
heroes.forEach((h,i)=>{h.position.set((i-1.5)*2.25,0,0);h.scale.setScalar(1.02);stageGroup.add(h)});
const pedestalMat=mat(0x333b3d,.48,.35);
for(let i=0;i<4;i++){const p=mesh(stageGroup,new THREE.CylinderGeometry(.82,.9,.16,48),pedestalMat,[(i-1.5)*2.25,.0,0]);const ring=mesh(stageGroup,new THREE.TorusGeometry(.79,.012,8,64),mats.gold,[(i-1.5)*2.25,.09,0]);ring.rotation.x=Math.PI/2;}
const heroData=[
 {name:'ELDRIN',role:'MAGO',description:'Custode delle arti antiche. La sua magia porta la luce dove il mondo è stato inghiottito dall’ombra.',weapon:'BASTONE ARCANO · MAGIA'},
 {name:'LYRA',role:'ARCIERA',description:'Esploratrice dei boschi remoti. Colpisce da lontano e legge i sentieri che nessuna mappa ricorda.',weapon:'ARCO LUNGO · FRECCE'},
 {name:'KAEL',role:'GUERRIERO',description:'Spadaccino in esilio. Resiste in prima linea e trasforma ogni parata in un contrattacco.',weapon:'SPADA · DIFESA'},
 {name:'IL VELATO',role:'MISTERIOSO',description:'Un viandante senza nome. La sua lancia-reliquia custodisce un potere che nessuno sa spiegare.',weapon:'LANCIA-RELIQUIA · SOGLIA'}
];
let selected=0,mode='menu',musicOn=true,soundOn=true;
const $=id=>document.getElementById(id);
const audio=$('mainMusic');audio.volume=.55;
function show(id){for(const el of document.querySelectorAll('.screen'))el.classList.add('hidden');$(id).classList.remove('hidden')}
function chooseHero(i){selected=i;const d=heroData[i];$('heroName').textContent=d.name;$('heroRole').textContent=d.role;$('heroDescription').textContent=d.description;$('heroWeapon').textContent='ARMA · '+d.weapon;document.querySelectorAll('.hero-card').forEach((c,n)=>c.classList.toggle('selected',n===i));heroes.forEach((h,n)=>h.traverse(o=>{if(o.isMesh)o.material=o.material.clone();}));}
$('beginButton').addEventListener('click',()=>{show('characterSelect');mode='select';});
$('backButton').addEventListener('click',()=>{show('mainMenu');mode='menu';});
$('confirmHero').addEventListener('click',()=>{$('readyTitle').textContent=heroData[selected].name+' · AVARRA TI ATTENDE';show('worldReady');mode='ready';});
$('returnMenu').addEventListener('click',()=>{show('mainMenu');mode='menu';});
document.querySelectorAll('.hero-card').forEach((card)=>card.addEventListener('click',()=>chooseHero(Number(card.dataset.hero))));
$('settingsToggle').addEventListener('click',()=>$('settingsPanel').classList.remove('hidden'));
$('closeSettings').addEventListener('click',()=>$('settingsPanel').classList.add('hidden'));
$('creditsButton').addEventListener('click',()=>{show('characterSelect');mode='select';});
$('musicToggle').addEventListener('click',async()=>{musicOn=!musicOn;$('musicToggle').classList.toggle('active',musicOn);if(musicOn){try{await audio.play()}catch{}}else audio.pause();});
$('soundToggle').addEventListener('click',()=>{soundOn=!soundOn;$('soundToggle').classList.toggle('active',soundOn);});
$('musicVolume').addEventListener('input',e=>audio.volume=Number(e.target.value)/100);
document.addEventListener('pointerdown',()=>{if(musicOn&&audio.paused)audio.play().catch(()=>{});},{once:true});
chooseHero(0);
function resize(){camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);}
addEventListener('resize',resize);
const clock=new THREE.Clock();
function animate(){requestAnimationFrame(animate);const t=clock.getElapsedTime();stageGroup.rotation.y=Math.sin(t*.12)*.055;heroes.forEach((h,i)=>{h.position.y=Math.sin(t*1.15+i*.8)*.018;h.rotation.y=Math.sin(t*.35+i)*.035;});renderer.render(scene,camera);}
animate();

// The playable world is deliberately an empty 300 km² foundation for future regions.
const WORLD_SIDE=Math.sqrt(300)*1000;
const WORLD_AREA_KM2=300;
$('readyTitle').dataset.worldSide=String(WORLD_SIDE);
$('readyTitle').dataset.worldArea=String(WORLD_AREA_KM2);
