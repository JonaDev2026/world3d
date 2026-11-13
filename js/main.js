
import * as THREE from 'three';
import { loadLanguage, t, setLanguage } from './i18n.js';

// WORLD — Terre Antiche. Prima regione esplorabile: 512 × 512 metri.
const scene=new THREE.Scene();scene.background=new THREE.Color(0x9bb4b5);scene.fog=new THREE.FogExp2(0x9bb4b5,.0017);
const camera=new THREE.PerspectiveCamera(66,innerWidth/innerHeight,.1,900);camera.position.set(0,8,12);
const renderer=new THREE.WebGLRenderer({canvas:document.querySelector('#game'),antialias:true});
renderer.setPixelRatio(Math.min(devicePixelRatio,1.75));renderer.setSize(innerWidth,innerHeight);
renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.08;
scene.add(new THREE.HemisphereLight(0xdce9e8,0x514b3c,1.55));
const sun=new THREE.DirectionalLight(0xffdfb0,2.2);sun.position.set(-180,260,120);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);
sun.shadow.camera.left=-220;sun.shadow.camera.right=220;sun.shadow.camera.top=220;sun.shadow.camera.bottom=-220;scene.add(sun);
const fill=new THREE.DirectionalLight(0x9ab6d1,.4);fill.position.set(180,90,-160);scene.add(fill);
const WORLD_HALF=256,SEA=7;
const mats={
 grass:new THREE.MeshStandardMaterial({color:0x74865a,roughness:1}),dirt:new THREE.MeshStandardMaterial({color:0x796047,roughness:1}),
 stone:new THREE.MeshStandardMaterial({color:0x77766d,roughness:.95}),pale:new THREE.MeshStandardMaterial({color:0xb3a58a,roughness:.9}),
 wood:new THREE.MeshStandardMaterial({color:0x60452f,roughness:.95}),darkWood:new THREE.MeshStandardMaterial({color:0x392d24,roughness:1}),
 roof:new THREE.MeshStandardMaterial({color:0x51443a,roughness:.9}),redRoof:new THREE.MeshStandardMaterial({color:0x704b3c,roughness:.92}),
 leaf:new THREE.MeshStandardMaterial({color:0x405d3e,roughness:1}),leaf2:new THREE.MeshStandardMaterial({color:0x627b49,roughness:1}),
 water:new THREE.MeshPhysicalMaterial({color:0x527e83,roughness:.2,metalness:.08,transparent:true,opacity:.88,clearcoat:.8})
};
function hash(x,z){let n=Math.sin(x*127.1+z*311.7)*43758.5453;return n-Math.floor(n)}
function smooth(a,b,v){const q=THREE.MathUtils.clamp((v-a)/(b-a),0,1);return q*q*(3-2*q)}
function rawHeight(x,z){const hills=12+Math.sin(x*.014)*5+Math.cos(z*.018)*4+Math.sin((x+z)*.011)*3;const ridge=Math.max(0,Math.sin((x+z*.42)*.009))*Math.max(0,Math.cos(z*.012))*42;const mountain=Math.max(0,1-smooth(110,250,Math.hypot(x-85,z+185)))*58;return hills+ridge+mountain}
function heightAt(x,z){const city=1-smooth(100,155,Math.hypot(x+165,z-165));const road=1-smooth(5,13,Math.abs(z-(.42*x+225)));const raw=rawHeight(x,z);return raw+(18-raw)*Math.max(city,road*.82)}
function terrainY(x,z){return heightAt(x,z)+.08}
const terrainGeo=new THREE.PlaneGeometry(512,512,192,192);terrainGeo.rotateX(-Math.PI/2);const pos=terrainGeo.attributes.position,colors=[];
for(let i=0;i<pos.count;i++){const x=pos.getX(i),z=pos.getZ(i),h=heightAt(x,z);pos.setY(i,h);const city=Math.hypot(x+165,z-165)<112;const c=new THREE.Color(city?0x89906c:(h>48?0x77766e:h<SEA+2?0x9a9877:0x74865a));colors.push(c.r,c.g,c.b)}
terrainGeo.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));terrainGeo.computeVertexNormals();
const terrain=new THREE.Mesh(terrainGeo,new THREE.MeshStandardMaterial({vertexColors:true,roughness:1}));terrain.receiveShadow=true;scene.add(terrain);
function box(parent,geo,mat,x,y,z,cast=true){const m=new THREE.Mesh(geo,mat);m.position.set(x,y,z);m.castShadow=cast;m.receiveShadow=true;parent.add(m);return m}
// Fiume e lago, con sponde fuori dall'area edificabile.
const riverPts=[];for(let i=0;i<=28;i++){const z=-250+i*18;riverPts.push(new THREE.Vector3(105+Math.sin(i*.31)*25,SEA,z))}
const river=new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(riverPts),180,5.5,10,false),mats.water);scene.add(river);
const lake=new THREE.Mesh(new THREE.CircleGeometry(43,64),mats.water);lake.rotation.x=-Math.PI/2;lake.position.set(-12,SEA+.15,-150);lake.scale.set(1.35,1,.82);scene.add(lake);
function makeTree(x,z,scale=1,ancient=false){
 const g=new THREE.Group(),y=heightAt(x,z),trunkMat=new THREE.MeshStandardMaterial({color:ancient?0x554331:0x68503a,roughness:1});
 const trunk=box(g,new THREE.CylinderGeometry(.28*scale,.48*scale,3.8*scale,9),trunkMat,0,1.9*scale,0);trunk.rotation.z=(hash(x,z)-.5)*.12;
 const crownMat=ancient?new THREE.MeshStandardMaterial({color:0x344e3b,roughness:1}):(hash(z,x)>.5?mats.leaf:mats.leaf2);
 for(let i=0;i<(ancient?5:3);i++){const r=(ancient?2.1:1.55)*scale*(1-i*.12);const c=box(g,new THREE.IcosahedronGeometry(r,2),crownMat,(hash(i,x)-.5)*.8*scale,(3.6+i*.72)*scale,(hash(z,i)-.5)*.8*scale);c.scale.set(1,1.18,.92)}
 g.position.set(x,y,z);scene.add(g)
}
function makeHouse(x,z,scale=1,kind='cottage',rotation=0){
 const y=heightAt(x,z),g=new THREE.Group(),stone=kind==='stone'||kind==='hall',w=(kind==='hall'?12:kind==='inn'?9:7)*scale,d=(kind==='hall'?10:kind==='inn'?8:6)*scale;
 const wall=stone?mats.pale:new THREE.MeshStandardMaterial({color:kind==='inn'?0xb39a72:0xa58f70,roughness:.96});
 box(g,new THREE.BoxGeometry(w,4.2*scale,d),wall,0,2.1*scale,0);box(g,new THREE.BoxGeometry(w+.35*scale,.55*scale,d+.35*scale),mats.stone,0,.28*scale,0);
 const roofMat=kind==='inn'?mats.redRoof:mats.roof,roof=new THREE.Group();
 const halfW=w*.62,halfD=d*.62,ridge=8.2*scale,eave=5.1*scale;
 const left=box(roof,new THREE.BoxGeometry(w*.72,.22*scale,d*1.28),roofMat,-w*.19*scale,5.5*scale,0);left.rotation.z=-.58;
 const right=box(roof,new THREE.BoxGeometry(w*.72,.22*scale,d*1.28),roofMat,w*.19*scale,5.5*scale,0);right.rotation.z=.58;g.add(roof);
 for(const side of [-1,1]){for(const wx of [-w*.27,w*.27]){box(g,new THREE.BoxGeometry(.95*scale,1.25*scale,.12*scale),mats.darkWood,wx,2.65*scale,side*(d/2+.08*scale));box(g,new THREE.BoxGeometry(.66*scale,.96*scale,.14*scale),new THREE.MeshStandardMaterial({color:0x91a6a0,emissive:0x283b38,roughness:.3}),wx,2.67*scale,side*(d/2+.16*scale),false)}}
 box(g,new THREE.BoxGeometry(1.15*scale,2.35*scale,.18*scale),mats.darkWood,0,1.18*scale,d/2+.12*scale);
 if(kind==='inn'||kind==='hall')box(g,new THREE.BoxGeometry(.85*scale,2.4*scale,.85*scale),mats.stone,w*.28,6*scale,-d*.2);
 g.position.set(x,y,z);g.rotation.y=rotation;scene.add(g)
}
function makeTower(x,z,h=15){const y=heightAt(x,z),g=new THREE.Group();box(g,new THREE.CylinderGeometry(2.8,3.5,h,12),mats.pale,0,h/2,0);box(g,new THREE.ConeGeometry(4.1,4.2,12),mats.roof,0,h+2,0);for(let i=0;i<8;i++){const a=i*Math.PI/4;box(g,new THREE.BoxGeometry(.7,1.1,.7),mats.pale,Math.cos(a)*2.8,h+.3,Math.sin(a)*2.8)}g.position.set(x,y,z);scene.add(g)}
function makeWall(x1,z1,x2,z2){const dx=x2-x1,dz=z2-z1,len=Math.hypot(dx,dz),g=new THREE.Group();box(g,new THREE.BoxGeometry(len,6,3.2),mats.pale,0,3,0);for(let p=-len/2+3;p<len/2;p+=5)box(g,new THREE.BoxGeometry(1.4,1.2,3.5),mats.pale,p,6.3,0);g.position.set((x1+x2)/2,heightAt((x1+x2)/2,(z1+z2)/2),(z1+z2)/2);g.rotation.y=-Math.atan2(dz,dx);scene.add(g)}
function sign(x,z,title,lines){const g=new THREE.Group();box(g,new THREE.BoxGeometry(.2,2.5,.2),mats.darkWood,0,1.25,0);box(g,new THREE.BoxGeometry(2.8,1.15,.2),mats.wood,0,1.8,.1);const c=document.createElement('canvas');c.width=512;c.height=256;const ctx=c.getContext('2d');ctx.fillStyle='#2d3026';ctx.fillRect(0,0,512,256);ctx.strokeStyle='#c5a66b';ctx.lineWidth=9;ctx.strokeRect(9,9,494,238);ctx.fillStyle='#f1d99b';ctx.font='bold 38px Georgia';ctx.textAlign='center';ctx.fillText(title,256,66);ctx.fillStyle='#eee4ca';ctx.font='26px Georgia';lines.forEach((v,i)=>ctx.fillText(v,256,125+i*42));const board=new THREE.Mesh(new THREE.PlaneGeometry(2.6,1.3),new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(c)}));board.position.set(0,1.82,.22);g.add(board);g.position.set(x,terrainY(x,z),z);scene.add(g)}
// Prima città: Valdombra, raccolta in una terrazza pianeggiante.
const CITY={x:-165,z:165},wallR=69;
for(let i=0;i<32;i++){if(i===23||i===24)continue;const a=i*Math.PI*2/32,b=(i+1)*Math.PI*2/32;makeWall(CITY.x+Math.cos(a)*wallR,CITY.z+Math.sin(a)*wallR,CITY.x+Math.cos(b)*wallR,CITY.z+Math.sin(b)*wallR)}
const cityGate=new THREE.Group();box(cityGate,new THREE.BoxGeometry(16,2.2,4),mats.pale,0,8,0);for(const sx of [-6.5,6.5])box(cityGate,new THREE.BoxGeometry(3,12,4),mats.pale,sx,5,0);cityGate.position.set(CITY.x,terrainY(CITY.x,CITY.z-69),CITY.z-69);scene.add(cityGate);
for(const a of [0,Math.PI/2,Math.PI,Math.PI*1.5])makeTower(CITY.x+Math.cos(a)*wallR,CITY.z+Math.sin(a)*wallR,16);
makeTower(CITY.x-43,CITY.z+43,19);makeTower(CITY.x+43,CITY.z-43,19);
makeHouse(CITY.x,CITY.z-53,1.45,'hall');
const plaza=new THREE.Mesh(new THREE.CircleGeometry(20,48),mats.stone);plaza.rotation.x=-Math.PI/2;plaza.position.set(CITY.x,terrainY(CITY.x,CITY.z)+.12,CITY.z);scene.add(plaza);
const fountain=new THREE.Group();box(fountain,new THREE.CylinderGeometry(5,5.6,.8,24),mats.pale,0,.4,0);box(fountain,new THREE.CylinderGeometry(3.3,3.7,.45,24),mats.water,0,.85,0,false);box(fountain,new THREE.CylinderGeometry(.65,.9,3.1,12),mats.pale,0,2.1,0);fountain.position.set(CITY.x,terrainY(CITY.x,CITY.z),CITY.z);scene.add(fountain);
makeHouse(CITY.x-27,CITY.z+17,1.2,'inn',.3);makeHouse(CITY.x+27,CITY.z+18,1.35,'hall',-.4);makeHouse(CITY.x-28,CITY.z-17,1,'stone',.7);makeHouse(CITY.x+27,CITY.z-18,1,'cottage',-.2);
for(const [x,z,k,r] of [[-42,2,'cottage',.2],[42,1,'cottage',-.3],[-3,40,'cottage',.6],[4,-42,'stone',0],[-48,-30,'cottage',.4],[48,31,'cottage',-.5],[-3,54,'inn',0],[1,-56,'cottage',.3]])makeHouse(CITY.x+x,CITY.z+z,.78,k,r);
for(let i=0;i<6;i++){const x=CITY.x-13+(i%3)*13,z=CITY.z+8+Math.floor(i/3)*9,g=new THREE.Group();box(g,new THREE.BoxGeometry(5,2.4,3),mats.wood,0,1.2,0);box(g,new THREE.BoxGeometry(5.8,.25,3.8),i%2?mats.redRoof:mats.grass,0,2.65,0);for(const sx of [-2.5,2.5])for(const sz of [-1.3,1.3])box(g,new THREE.CylinderGeometry(.09,.09,2.8,8),mats.darkWood,sx,1.4,sz);g.position.set(x,terrainY(x,z),z);scene.add(g)}
function path(points,width=5){const curve=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(p[0],terrainY(p[0],p[1])+.12,p[1])));scene.add(new THREE.Mesh(new THREE.TubeGeometry(curve,120,width/2,8,false),mats.dirt))}
path([[-165,96],[-165,40],[-145,-15],[-105,-80],[-65,-150],[-35,-235]],7);path([[-96,165],[-45,165],[10,155],[75,130],[135,95],[205,75]],6);
sign(-165,87,'VALDOMBRA',['La città delle antiche mura','Locanda · Mercato · Forgia']);
// Foreste, campi e rovine: ogni zona ha una propria silhouette.
for(let x=-245;x<=245;x+=9)for(let z=-245;z<=245;z+=9){const cityDist=Math.hypot(x-CITY.x,z-CITY.z),nearRoad=Math.abs(z-(.42*x+225))<13||Math.abs(x+60)<10,riverNear=Math.abs(x-(105+Math.sin((z+250)/18*.31)*25))<13,woodland=Math.hypot(x-90,z-65)<115||Math.hypot(x+75,z+120)<85||hash(x,z)>.91;if(cityDist>94&&!nearRoad&&!riverNear&&heightAt(x,z)>SEA+2&&woodland&&hash(z,x)>.25)makeTree(x+(hash(z+1,x)-.5)*3,z+(hash(x,z+1)-.5)*3,.8+hash(x*2,z)*.65,Math.hypot(x+75,z+120)<42)}
for(let i=0;i<9;i++){const x=-75+(i%3)*7,z=-125+Math.floor(i/3)*7,y=heightAt(x,z),g=new THREE.Group();box(g,new THREE.BoxGeometry(1.5,5+(i%3)*1.5,1.5),mats.stone,0,2.5+(i%3)*.75,0);box(g,new THREE.BoxGeometry(2.2,.5,2.2),mats.pale,0,5.2+(i%3)*1.5,0);g.position.set(x,y,z);g.rotation.z=(hash(i,x)-.5)*.22;scene.add(g)}
const animatedActors=[];
function person(x,z,name,coat=0x9a6845,role='wanderer'){
 const y=terrainY(x,z),g=new THREE.Group(),mat=c=>new THREE.MeshStandardMaterial({color:c,roughness:.84});
 const robe=new THREE.Mesh(new THREE.CapsuleGeometry(role==='guard'?.34:.29,.64,8,14),mat(coat));robe.position.y=1.05;g.add(robe);
 const belt=new THREE.Mesh(new THREE.TorusGeometry(.28,.045,8,20),mat(0x503724));belt.rotation.x=Math.PI/2;belt.position.y=.93;g.add(belt);
 const head=new THREE.Group();head.position.y=1.72;g.add(head);
 const face=new THREE.Mesh(new THREE.SphereGeometry(.245,24,18),mat(0xc69a78));face.position.y=.22;head.add(face);
 const hair=new THREE.Mesh(new THREE.SphereGeometry(.26,20,14,0,Math.PI*2,0,Math.PI*.62),mat(role==='elf'?0xb6b18b:0x493326));hair.position.y=.3;head.add(hair);
 if(role==='mage'||role==='ranger'){const hood=new THREE.Mesh(new THREE.ConeGeometry(.34,.72,8),mat(role==='mage'?0x403b59:coat));hood.position.y=.57;head.add(hood)}
 const arms=[],legs=[];
 for(const side of [-1,1]){const arm=new THREE.Group();arm.position.set(side*.34,1.35,0);g.add(arm);const sleeve=new THREE.Mesh(new THREE.CapsuleGeometry(.09,.42,6,10),mat(coat));sleeve.position.y=-.2;arm.add(sleeve);const hand=new THREE.Mesh(new THREE.SphereGeometry(.075,12,10),mat(0xc69a78));hand.position.y=-.46;arm.add(hand);arms.push(arm);const leg=new THREE.Mesh(new THREE.CapsuleGeometry(.105,.55,6,10),mat(role==='guard'?0x42483f:0x51483e));leg.position.set(side*.14,.38,.015);g.add(leg);legs.push(leg)}
 if(role==='guard'){const helm=new THREE.Mesh(new THREE.SphereGeometry(.29,16,12,0,Math.PI*2,0,Math.PI*.5),mat(0x777e78));helm.position.y=2.05;g.add(helm);const spear=new THREE.Mesh(new THREE.CylinderGeometry(.035,.045,2.7,8),mat(0x60452f));spear.position.set(.55,1.4,-.05);g.add(spear)}
 if(role==='elf')for(const side of [-1,1]){const ear=new THREE.Mesh(new THREE.ConeGeometry(.09,.42,8),mat(0xc69a78));ear.position.set(side*.29,1.98,0);ear.rotation.z=side*-1.15;g.add(ear)}
 g.position.set(x,y,z);scene.add(g);
 const c=document.createElement('canvas');c.width=256;c.height=64;const ctx=c.getContext('2d');ctx.fillStyle='#14231ee8';ctx.fillRect(0,0,256,64);ctx.fillStyle='#fff1c9';ctx.font='bold 28px Georgia';ctx.textAlign='center';ctx.fillText(name,128,42);
 const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:new THREE.CanvasTexture(c),transparent:true}));sprite.position.set(x,y+2.8,z);sprite.scale.set(2.1,.52,1);scene.add(sprite);
 const torso=new THREE.Group();torso.position.y=1.08;g.add(torso);animatedActors.push({group:g,torso,arms,legs,head,phase:hash(x,z)*6.28,role});return g
}
person(CITY.x-18,CITY.z+4,'Arven',0x526b57,'elf');person(CITY.x+17,CITY.z-4,'Darian',0x7b5942,'guard');person(CITY.x-4,CITY.z+27,'Maelis',0x62517c,'mage');person(CITY.x+35,CITY.z+28,'Borin',0x8a6847,'wanderer');person(CITY.x-42,CITY.z-34,'Sentinella',0x59675c,'guard');person(-105,205,'Liora',0x637c83,'ranger');
const gateX=52,gateZ=-178,gateY=terrainY(gateX,gateZ),portalMat=new THREE.MeshStandardMaterial({color:0x9bc7c0,emissive:0x3b8578,emissiveIntensity:1.2,metalness:.35,roughness:.25});
const portal=new THREE.Mesh(new THREE.TorusGeometry(2.2,.24,12,40),portalMat);portal.position.set(gateX,gateY+3,gateZ);scene.add(portal);
for(const sx of [-2.6,2.6])box(scene,new THREE.BoxGeometry(.55,5.4,.65),mats.pale,gateX+sx,gateY+2.7,gateZ);
box(scene,new THREE.BoxGeometry(5.8,.55,.75),mats.pale,gateX,gateY+5.6,gateZ);
const portalLight=new THREE.PointLight(0x75d7c2,2.5,22);portalLight.position.set(gateX,gateY+3,gateZ);scene.add(portalLight);
for(let i=0;i<8;i++){const x=gateX-8+(i%4)*5,z=gateZ-8+Math.floor(i/4)*7,c=box(scene,new THREE.OctahedronGeometry(.75+hash(i,3)*.5),new THREE.MeshStandardMaterial({color:0x9b8cff,emissive:0x4934a8,emissiveIntensity:1.15,roughness:.25}),x,terrainY(x,z)+1.2,z);c.rotation.set(i*.3,i*.6,i*.2)}
sign(gateX,gateZ-8,'IL VARCO ANTICO',['Un sentiero dimenticato','Premi E quando sei vicino']);
const returnGate=new THREE.Mesh(new THREE.TorusGeometry(2,.2,10,32),new THREE.MeshStandardMaterial({color:0xe2bd75,emissive:0x8a5520,emissiveIntensity:1.1}));
returnGate.position.set(35,terrainY(35,38)+2.7,38);scene.add(returnGate);
const returnLight=new THREE.PointLight(0xffc56e,2,18);returnLight.position.set(35,terrainY(35,38)+3,38);scene.add(returnLight);
for(let i=0;i<12;i++){const a=i*Math.PI/6,x=35+Math.cos(a)*9,z=38+Math.sin(a)*9;makeTree(x,z,.9+hash(i,4)*.45,true)}

const keys={};addEventListener('keydown',e=>{
 if(e.code==='Escape'){e.preventDefault();if(mapOpen)toggleMap();else if(pauseOpen)closePause();else openPause();return}
 keys[e.code]=true;if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(e.code))e.preventDefault();
 if(e.code==='KeyM'&&(!pauseOpen||mapOpen))toggleMap();if(e.code==='KeyP'&&!pauseOpen)saveMarker();if(e.code==='KeyE'&&!pauseOpen)useWorldGate();
});addEventListener('keyup',e=>keys[e.code]=false);

let yaw=0,pitch=.12,locked=false,velocityY=0,onGround=false,walkBlend=0,gaitPhase=0;const player={x:-165,z:88};const start=document.querySelector('#start');
const playerData={name:'',language:'it',skin:'#d4a77d',hair:'#493326',shirt:'#496b91'};
let playerModel=null,playerLabel=null,playerLift=0,viewMode='first',pauseOpen=false;
function makePlayer(){
 if(playerModel)scene.remove(playerModel);
 playerModel=new THREE.Group();
 const mat=(c,rough=.82)=>new THREE.MeshStandardMaterial({color:c,roughness:rough});
 const torsoPivot=new THREE.Group();torsoPivot.position.y=1.02;playerModel.add(torsoPivot);
 const body=new THREE.Mesh(new THREE.CapsuleGeometry(.31,.55,10,20),mat(playerData.shirt));body.position.y=.12;torsoPivot.add(body);
 const tunic=new THREE.Mesh(new THREE.CapsuleGeometry(.326,.43,10,20),mat(playerData.shirt));tunic.scale.set(1.04,1,.98);tunic.position.set(0,.13,.015);torsoPivot.add(tunic);
 const collar=new THREE.Mesh(new THREE.TorusGeometry(.115,.035,8,24),mat(0xd8c39a));collar.rotation.x=Math.PI/2;collar.position.y=.43;torsoPivot.add(collar);
 const belt=new THREE.Mesh(new THREE.TorusGeometry(.255,.045,8,24),mat(0x5a3c27));belt.rotation.x=Math.PI/2;belt.position.y=-.16;torsoPivot.add(belt);
 const buckle=new THREE.Mesh(new THREE.BoxGeometry(.12,.12,.045),mat(0xc3a46d,.55));buckle.position.set(0,-.16,.26);torsoPivot.add(buckle);
 const neck=new THREE.Mesh(new THREE.CylinderGeometry(.09,.11,.17,16),mat(playerData.skin));neck.position.y=.48;torsoPivot.add(neck);
 const headPivot=new THREE.Group();headPivot.position.y=.59;torsoPivot.add(headPivot);
 const head=new THREE.Mesh(new THREE.SphereGeometry(.285,32,24),mat(playerData.skin));head.position.y=.24;headPivot.add(head);
 const hair=new THREE.Mesh(new THREE.SphereGeometry(.305,28,20,0,Math.PI*2,0,Math.PI*.62),mat(playerData.hair));hair.position.y=.32;headPivot.add(hair);
 const fringe=new THREE.Mesh(new THREE.SphereGeometry(.19,24,16,0,Math.PI,0,Math.PI*.46),mat(playerData.hair));fringe.scale.set(1,.58,.78);fringe.position.set(0,.27,.18);headPivot.add(fringe);
 const face=mat(0x30251e);
 for(const side of [-1,1]){
  const eye=new THREE.Mesh(new THREE.SphereGeometry(.027,12,10),face);eye.position.set(side*.092,.235,.264);headPivot.add(eye);
  const brow=new THREE.Mesh(new THREE.BoxGeometry(.075,.018,.018),mat(playerData.hair));brow.position.set(side*.092,.29,.265);headPivot.add(brow);
 }
 const arms=[],legs=[];
 for(const side of [-1,1]){
  const shoulder=new THREE.Group();shoulder.position.set(side*.355,.39,0);torsoPivot.add(shoulder);
  const upper=new THREE.Mesh(new THREE.CapsuleGeometry(.105,.34,8,14),mat(playerData.shirt));upper.position.y=-.18;shoulder.add(upper);
  const elbow=new THREE.Group();elbow.position.y=-.37;shoulder.add(elbow);
  const forearm=new THREE.Mesh(new THREE.CapsuleGeometry(.087,.31,8,14),mat(playerData.shirt));forearm.position.y=-.17;elbow.add(forearm);
  const cuff=new THREE.Mesh(new THREE.TorusGeometry(.088,.022,8,18),mat(0xc5a77a));cuff.rotation.x=Math.PI/2;cuff.position.y=-.34;elbow.add(cuff);
  const hand=new THREE.Mesh(new THREE.SphereGeometry(.09,16,12),mat(playerData.skin));hand.position.y=-.43;elbow.add(hand);
  arms.push({shoulder,elbow});
  const hip=new THREE.Group();hip.position.set(side*.155,-.2,0);playerModel.add(hip);
  const thigh=new THREE.Mesh(new THREE.CapsuleGeometry(.12,.35,8,14),mat(0x343b3b));thigh.position.y=-.19;hip.add(thigh);
  const knee=new THREE.Group();knee.position.y=-.39;hip.add(knee);
  const shin=new THREE.Mesh(new THREE.CapsuleGeometry(.095,.34,8,14),mat(0x343b3b));shin.position.y=-.17;knee.add(shin);
  const boot=new THREE.Group();boot.position.set(0,-.37,.045);knee.add(boot);
  const bootMesh=new THREE.Mesh(new THREE.BoxGeometry(.22,.14,.34),mat(0x392b22));bootMesh.position.set(0,-.015,.035);boot.add(bootMesh);
  const sole=new THREE.Mesh(new THREE.BoxGeometry(.225,.035,.35),mat(0x171716));sole.position.set(0,-.085,.035);boot.add(sole);
  legs.push({hip,knee,boot});
 }
 playerModel.position.set(player.x,terrainY(player.x,player.z)+playerLift,player.z);scene.add(playerModel);
 playerModel.userData.rig={torso:torsoPivot,head:headPivot,arms,legs};
 const c=document.createElement('canvas');c.width=512;c.height=96;const g=c.getContext('2d');
 g.fillStyle='#101a18dd';g.fillRect(0,0,512,96);g.fillStyle='#fff0c9';g.font='bold 48px system-ui';g.textAlign='center';g.fillText(playerData.name||'Explorer',256,65);
 playerLabel=new THREE.Sprite(new THREE.SpriteMaterial({map:new THREE.CanvasTexture(c),transparent:true,depthTest:false}));
 playerLabel.scale.set(2.2,.42,1);scene.add(playerLabel);
}
// Anteprima 3D indipendente: il modello ruota mentre si modificano i colori.
const previewScene=new THREE.Scene();previewScene.background=new THREE.Color(0x263b30);
previewScene.add(new THREE.HemisphereLight(0xe4f2ff,0x526044,2.1));
const previewSun=new THREE.DirectionalLight(0xffe5bd,2.4);previewSun.position.set(-3,6,5);previewScene.add(previewSun);
const previewCamera=new THREE.PerspectiveCamera(34,1,.1,30);previewCamera.position.set(0,2.1,6.4);previewCamera.lookAt(0,1.25,0);
const previewRenderer=new THREE.WebGLRenderer({canvas:document.querySelector('#characterPreview'),antialias:true,alpha:false});
previewRenderer.setPixelRatio(Math.min(devicePixelRatio,1.5));
let previewModel=null;
function buildPreview(){
 if(previewModel)previewScene.remove(previewModel);
 const read=id=>document.querySelector('#creator'+id).value;
 const data={skin:read('Skin'),hair:read('Hair'),shirt:read('Shirt')};
 const mat=(c,r=.82)=>new THREE.MeshStandardMaterial({color:c,roughness:r});
 previewModel=new THREE.Group();
 const torso=new THREE.Group();torso.position.y=1.02;previewModel.add(torso);
 const body=new THREE.Mesh(new THREE.CapsuleGeometry(.31,.55,10,20),mat(data.shirt));body.position.y=.12;torso.add(body);
 const tunic=new THREE.Mesh(new THREE.CapsuleGeometry(.326,.43,10,20),mat(data.shirt));tunic.scale.set(1.04,1,.98);tunic.position.set(0,.13,.015);torso.add(tunic);
 const belt=new THREE.Mesh(new THREE.TorusGeometry(.255,.04,8,24),mat(0x5a3c27));belt.rotation.x=Math.PI/2;belt.position.y=-.16;torso.add(belt);
 const buckle=new THREE.Mesh(new THREE.BoxGeometry(.12,.12,.04),mat(0xc3a46d));buckle.position.set(0,-.16,.26);torso.add(buckle);
 const neck=new THREE.Mesh(new THREE.CylinderGeometry(.09,.11,.17,16),mat(data.skin));neck.position.y=.48;torso.add(neck);
 const headPivot=new THREE.Group();headPivot.position.y=.59;torso.add(headPivot);
 const head=new THREE.Mesh(new THREE.SphereGeometry(.285,32,24),mat(data.skin));head.position.y=.24;headPivot.add(head);
 const hair=new THREE.Mesh(new THREE.SphereGeometry(.305,28,20,0,Math.PI*2,0,Math.PI*.62),mat(data.hair));hair.position.y=.32;headPivot.add(hair);
 const fringe=new THREE.Mesh(new THREE.SphereGeometry(.19,24,16,0,Math.PI,0,Math.PI*.46),mat(data.hair));fringe.scale.set(1,.58,.78);fringe.position.set(0,.27,.18);headPivot.add(fringe);
 for(const side of [-1,1]){
  const eye=new THREE.Mesh(new THREE.SphereGeometry(.027,12,10),mat(0x30251e));eye.position.set(side*.092,.235,.264);headPivot.add(eye);
  const brow=new THREE.Mesh(new THREE.BoxGeometry(.075,.018,.018),mat(data.hair));brow.position.set(side*.092,.29,.265);headPivot.add(brow);
  const shoulder=new THREE.Group();shoulder.position.set(side*.355,.39,0);torso.add(shoulder);
  const upper=new THREE.Mesh(new THREE.CapsuleGeometry(.105,.34,8,14),mat(data.shirt));upper.position.y=-.18;shoulder.add(upper);
  const elbow=new THREE.Group();elbow.position.y=-.37;shoulder.add(elbow);
  const forearm=new THREE.Mesh(new THREE.CapsuleGeometry(.087,.31,8,14),mat(data.shirt));forearm.position.y=-.17;elbow.add(forearm);
  const hand=new THREE.Mesh(new THREE.SphereGeometry(.09,16,12),mat(data.skin));hand.position.y=-.43;elbow.add(hand);
  const hip=new THREE.Group();hip.position.set(side*.155,-.2,0);previewModel.add(hip);
  const thigh=new THREE.Mesh(new THREE.CapsuleGeometry(.12,.35,8,14),mat(0x343b3b));thigh.position.y=-.19;hip.add(thigh);
  const knee=new THREE.Group();knee.position.y=-.39;hip.add(knee);
  const shin=new THREE.Mesh(new THREE.CapsuleGeometry(.095,.34,8,14),mat(0x343b3b));shin.position.y=-.17;knee.add(shin);
  const boot=new THREE.Mesh(new THREE.BoxGeometry(.22,.14,.34),mat(0x392b22));boot.position.set(0,-.4,.08);knee.add(boot);
 }
 previewScene.add(previewModel);
}
function resizePreview(){
 const canvas=document.querySelector('#characterPreview'),w=canvas.clientWidth||320,h=canvas.clientHeight||210;
 previewRenderer.setSize(w,h,false);previewCamera.aspect=w/h;previewCamera.updateProjectionMatrix();
}
function syncCreator(){
 document.querySelector('#creatorName').value=playerData.name;
 document.querySelector('#creatorLang').value=playerData.language;
 document.querySelector('#creatorSkin').value=playerData.skin;
 document.querySelector('#creatorHair').value=playerData.hair;
 document.querySelector('#creatorShirt').value=playerData.shirt;
 buildPreview();resizePreview();
}


document.querySelector('#creatorLang').addEventListener('change',async e=>{playerData.language=e.target.value;await setLanguage(e.target.value);});
['creatorSkin','creatorHair','creatorShirt'].forEach(id=>document.querySelector('#'+id).addEventListener('input',buildPreview));
addEventListener('resize',resizePreview);
document.querySelector('#createPlayer').onclick=()=>{
 playerData.name=document.querySelector('#creatorName').value.trim().slice(0,18)||'Explorer';
 playerData.language=document.querySelector('#creatorLang').value;
 playerData.skin=document.querySelector('#creatorSkin').value;
 playerData.hair=document.querySelector('#creatorHair').value;
 playerData.shirt=document.querySelector('#creatorShirt').value;
 saved.character={...playerData};saved.settings={...(saved.settings||{}),viewMode};persist();makePlayer();
 document.querySelector('#creator').style.display='none';start.style.display='none';pauseOpen=false;renderer.domElement.requestPointerLock?.();
};

document.addEventListener('pointerlockchange',()=>locked=document.pointerLockElement===renderer.domElement);
document.addEventListener('mousemove',e=>{if(!locked)return;yaw-=e.movementX*.0022;pitch=Math.max(-1.25,Math.min(1.25,pitch-e.movementY*.0022))});
function toast(t){const el=document.querySelector('#toast');el.textContent=t;el.style.opacity=1;clearTimeout(toast.timer);toast.timer=setTimeout(()=>el.style.opacity=0,1900)}

const STORE='world3d-v02';let saved={markers:[],position:null,character:null,settings:{}};try{saved={...saved,...JSON.parse(localStorage.getItem(STORE)||localStorage.getItem('world3d-v01')||'{}')}}catch{}
viewMode=saved.settings?.viewMode==='third'?'third':'first';
if(saved.character)Object.assign(playerData,saved.character);
syncCreator();
loadLanguage(playerData.language);

if(saved.position){player.x=saved.position.x;player.z=saved.position.z}
function persist(){saved.position={x:player.x,z:player.z};saved.character={...playerData};saved.settings={...(saved.settings||{}),viewMode};localStorage.setItem(STORE,JSON.stringify(saved))}
function saveMarker(){const name=prompt(t('markerPrompt'),t('discoveredPlace'));if(name===null)return;saved.markers.push({name:name.trim()||'Luogo senza nome',x:Math.round(player.x),z:Math.round(player.z)});persist();drawMap();toast(t('placeSaved'))}
document.querySelector('#save').onclick=saveMarker;
let mapOpen=false;
function toggleMap(){
 mapOpen=!mapOpen;
 document.querySelector('#mapWrap').style.display=mapOpen?'flex':'none';
 if(mapOpen){pauseOpen=true;document.querySelector('#pauseMenu').style.display='none';if(locked)document.exitPointerLock();drawMap();}
 else{document.querySelector('#pauseMenu').style.display='flex';pauseOpen=true;}
}
document.querySelector('#closeMap').onclick=toggleMap;
function openPause(){
 if(start.style.display!=='none'||document.querySelector('#creator').style.display!=='none')return;
 pauseOpen=true;document.querySelector('#pauseMenu').style.display='flex';
 if(locked)document.exitPointerLock();
}
function closePause(){
 pauseOpen=false;document.querySelector('#pauseMenu').style.display='none';
 renderer.domElement.requestPointerLock?.();
}
document.querySelector('#pauseBtn').onclick=openPause;
document.querySelector('#resumeBtn').onclick=closePause;
document.querySelector('#closeSettings').onclick=closePause;
document.querySelector('#menuMapBtn').onclick=()=>{mapOpen=false;toggleMap()};
document.querySelector('#menuSettingsBtn').onclick=()=>document.querySelector('#settingsPanel').scrollIntoView({block:'nearest'});
document.querySelector('#viewMode').value=viewMode;
document.querySelector('#settingsLang').value=playerData.language;
document.querySelector('#settingsLang').addEventListener('change',async e=>{playerData.language=e.target.value;await setLanguage(e.target.value);persist();});
document.querySelector('#viewMode').addEventListener('change',e=>{viewMode=e.target.value;persist();});
for(const id of ['musicEnabled','soundEnabled','musicVolume','soundVolume']){
 const el=document.querySelector('#'+id),key=id;
 if(saved.settings?.[key]!==undefined){if(el.type==='checkbox')el.checked=saved.settings[key];else el.value=saved.settings[key]}
 el.addEventListener('input',()=>{saved.settings={...(saved.settings||{}),[key]:el.type==='checkbox'?el.checked:Number(el.value)};persist()});
}
function drawMap(){const c=document.querySelector('#map'),ctx=c.getContext('2d'),w=c.width;const img=ctx.createImageData(w,w);for(let px=0;px<w;px++)for(let pz=0;pz<w;pz++){let x=Math.floor(px/w*WORLD_HALF*2)-WORLD_HALF,z=Math.floor(pz/w*WORLD_HALF*2)-WORLD_HALF,h=heightAt(x,z),col=h<3?[65,135,151]:h>10?[119,124,116]:[Math.max(45,105-h*2),Math.min(160,145-h*2),65];let i=(pz*w+px)*4;img.data.set([...col,255],i)}ctx.putImageData(img,0,0);const dot=(x,z,color,r)=>{ctx.fillStyle=color;ctx.beginPath();ctx.arc((x+WORLD_HALF)/(WORLD_HALF*2)*w,(z+WORLD_HALF)/(WORLD_HALF*2)*w,r,0,Math.PI*2);ctx.fill()};saved.markers.forEach(m=>dot(m.x,m.z,'#ffd45e',5));dot(player.x,player.z,'#fff',6);ctx.strokeStyle='#fff';ctx.lineWidth=2;ctx.strokeRect(1,1,w-2,w-2);document.querySelector('#markerList').innerHTML=saved.markers.length?saved.markers.map(m=>'<span class="marker">◆ '+escapeHtml(m.name)+' ('+m.x+', '+m.z+')</span>').join(''):t('noMarkers')}
function escapeHtml(s){return s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}

// E apre il portale quando sei vicino. Il ritorno è possibile dal cerchio di pietra.
let inStarValley=false;
function useWorldGate(){
 const gx=inStarValley?35:gateX,gz=inStarValley?38:gateZ;
 if(Math.hypot(player.x-gx,player.z-gz)>4.2){toast(t('nearPortal'));return}
 if(!inStarValley){player.x=35;player.z=38;inStarValley=true;yaw=Math.PI;toast(t('enteredValley'))}
 else{player.x=gateX;player.z=gateZ+4;inStarValley=false;toast(t('returnedWorld'))}
 persist();
}
function animate(){requestAnimationFrame(animate);const dt=Math.min(clock.getDelta(),.04);if(previewModel){previewModel.rotation.y+=dt*.45;previewRenderer.render(previewScene,previewCamera)}
for(const actor of animatedActors){
 const p=performance.now()*.001+actor.phase;
 const breath=Math.sin(p*1.15);
 actor.legs[0].rotation.x=Math.sin(p*.8)*.035;actor.legs[1].rotation.x=-Math.sin(p*.8)*.035;
 actor.arms[0].rotation.x=-.045+Math.sin(p*.7)*.035;actor.arms[1].rotation.x=.045-Math.sin(p*.7)*.035;
 actor.arms[0].rotation.z=-.035+Math.max(0,Math.sin(p*.31+actor.phase))*.10;
 actor.arms[1].rotation.z=.035-Math.max(0,Math.sin(p*.31+actor.phase+1.8))*.07;
 actor.torso.position.y=1.08+breath*.012;
 actor.torso.rotation.z=Math.sin(p*.45)*.012;
 actor.head.rotation.x=Math.sin(p*.55)*.025;
 actor.head.rotation.y=Math.sin(p*.32)*.11;
}
if(!mapOpen&&!pauseOpen){const prevX=player.x,prevZ=player.z;if(keys.ArrowLeft)yaw+=dt*1.7;if(keys.ArrowRight)yaw-=dt*1.7;let forward=(keys.ArrowUp||keys.KeyW?1:0)-(keys.ArrowDown||keys.KeyS?1:0),side=(keys.KeyD?1:0)-(keys.KeyA?1:0);const speed=keys.ShiftLeft?9:5.2;player.x+=(-Math.sin(yaw)*forward+Math.cos(yaw)*side)*speed*dt;player.z+=(-Math.cos(yaw)*forward-Math.sin(yaw)*side)*speed*dt;player.x=THREE.MathUtils.clamp(player.x,-WORLD_HALF+5,WORLD_HALF-5);player.z=THREE.MathUtils.clamp(player.z,-WORLD_HALF+5,WORLD_HALF-5);
if(heightAt(player.x,player.z)<SEA+.22){player.x=prevX;player.z=prevZ}
if(keys.Space&&onGround){velocityY=7;onGround=false}velocityY-=19*dt;
playerLift+=velocityY*dt;const floor=terrainY(player.x,player.z);if(playerLift<=0){playerLift=0;velocityY=0;onGround=true}if(playerModel){
 playerModel.position.set(player.x,floor+playerLift,player.z);playerModel.rotation.y=yaw;playerModel.visible=viewMode==='third';
 const rig=playerModel.userData.rig,walking=(Math.abs(forward)+Math.abs(side))>0,phase=performance.now()*.009*(keys.ShiftLeft?1.5:1);
 if(rig){
  const target=walking?1:0;walkBlend=THREE.MathUtils.damp(walkBlend,target,walking?9:7,dt);
  gaitPhase+=dt*(keys.ShiftLeft?12:8.2);
  const swing=Math.sin(gaitPhase)*.72*walkBlend;
  const lift=Math.max(0,Math.cos(gaitPhase*2))*.12*walkBlend;
  rig.legs[0].hip.rotation.x=swing;rig.legs[1].hip.rotation.x=-swing;
  rig.legs[0].knee.rotation.x=Math.max(0,-Math.sin(gaitPhase))*.65*walkBlend;
  rig.legs[1].knee.rotation.x=Math.max(0,Math.sin(gaitPhase))*.65*walkBlend;
  rig.legs[0].boot.rotation.x=-rig.legs[0].knee.rotation.x*.35;
  rig.legs[1].boot.rotation.x=-rig.legs[1].knee.rotation.x*.35;
  rig.arms[0].shoulder.rotation.x=-swing*.78;rig.arms[1].shoulder.rotation.x=swing*.78;
  rig.arms[0].elbow.rotation.x=-.12*walkBlend+Math.max(0,swing)*.22;
  rig.arms[1].elbow.rotation.x=-.12*walkBlend+Math.max(0,-swing)*.22;
  rig.torso.rotation.z=Math.sin(gaitPhase)*.035*walkBlend;
  rig.torso.position.y=1.02+lift*.16;
  rig.head.rotation.x=Math.sin(performance.now()*.0011)*.025;
  rig.head.rotation.z=Math.sin(performance.now()*.0008)*.018;
  if(!onGround){rig.arms[0].shoulder.rotation.x=-.8;rig.arms[1].shoulder.rotation.x=-.8;rig.legs[0].hip.rotation.x=-.25;rig.legs[1].hip.rotation.x=.18;}
 }
}
const bob=(Math.abs(forward)+Math.abs(side)>0)?Math.sin(performance.now()*.012)*.045:0;
if(viewMode==='first'){
 camera.position.set(player.x,floor+playerLift+1.62,player.z);
 camera.rotation.order='YXZ';camera.rotation.y=yaw;camera.rotation.x=pitch;
 }else{
 const back=6.1,camHeight=3.35+pitch*1.7;
 camera.position.set(player.x+Math.sin(yaw)*back,floor+playerLift+camHeight+bob,player.z+Math.cos(yaw)*back);
 camera.lookAt(player.x,floor+playerLift+1.25+pitch*1.4,player.z);
 }
 if(playerLabel){playerLabel.visible=viewMode==='third';playerLabel.position.set(player.x,floor+playerLift+3.05,player.z)}
document.querySelector('#coords').textContent='X '+Math.round(player.x)+' · Z '+Math.round(player.z);if(Math.random()<.025)persist()}renderer.render(scene,camera)}
const clock=new THREE.Clock();makePlayer();buildPreview();resizePreview();
animatedActors.forEach((actor,i)=>{actor.phase=i*1.7});
animate();
addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight)});
addEventListener('beforeunload',persist);drawMap();
