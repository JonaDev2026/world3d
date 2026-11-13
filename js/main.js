
import * as THREE from 'three';
import { loadLanguage, t, setLanguage } from './i18n.js';
const scene=new THREE.Scene();scene.background=new THREE.Color(0x9bc4d1);scene.fog=new THREE.Fog(0x9bc4d1,48,125);
const camera=new THREE.PerspectiveCamera(72,innerWidth/innerHeight,.1,220);camera.position.set(0,8,12);
const renderer=new THREE.WebGLRenderer({canvas:document.querySelector('#game'),antialias:false});renderer.setPixelRatio(Math.min(devicePixelRatio,1.6));renderer.setSize(innerWidth,innerHeight);renderer.shadowMap.enabled=false;
scene.add(new THREE.HemisphereLight(0xd9efff,0x65734b,2.0));const sun=new THREE.DirectionalLight(0xffedc5,2.2);sun.position.set(-35,65,25);scene.add(sun);
const mats={grass:0x6f9d4e,dirt:0x79563a,stone:0x858b83,sand:0xc6b77b,wood:0x765034,leaves:0x3e743e,leaf2:0x588947,water:0x4b9ca7,roof:0x70483a};
const geo=new THREE.BoxGeometry(1,1,1);const buckets={};for(const [k,c] of Object.entries(mats)){buckets[k]=[]}
function hash(x,z){let n=Math.sin(x*127.1+z*311.7)*43758.5453;return n-Math.floor(n)}
function heightAt(x,z){const hills=Math.sin(x*.075)*2.7+Math.cos(z*.061)*2.2+Math.sin((x+z)*.035)*2;const ridge=Math.max(0,Math.sin((x-z*.55)*.035))*Math.max(0,Math.cos(z*.025))*7;return Math.floor(3+hills+ridge)}
const HALF=48;
for(let x=-HALF;x<HALF;x++)for(let z=-HALF;z<HALF;z++){let h=heightAt(x,z);let beach=(x>12&&x<25&&z> -22&&z<18);for(let y=0;y<h;y++)buckets[y===h-1?(beach?'sand':'grass'):(y<h-3?'stone':'dirt')].push([x,y,z]);if(h<3)buckets.water.push([x,2,z]);}
function addStructure(x,z,type){const h=heightAt(x,z);if(type==='tree'){for(let y=0;y<4;y++)buckets.wood.push([x,h+y,z]);for(let dx=-2;dx<=2;dx++)for(let dz=-2;dz<=2;dz++)for(let dy=2;dy<=5;dy++){if(Math.abs(dx)+Math.abs(dz)+(dy===5?1:0)<5&&hash(x+dx*7,z+dz*9+dy)>.12)buckets[dy%2?'leaves':'leaf2'].push([x+dx,h+dy,z+dz])}}}
for(let x=-HALF+3;x<HALF-3;x++)for(let z=-HALF+3;z<HALF-3;z++){if(hash(x,z)>.982&&Math.abs(x)<38&&Math.abs(z)<38)addStructure(x,z,'tree')}
function house(x,z){const h=heightAt(x,z);for(let dx=0;dx<7;dx++)for(let dz=0;dz<6;dz++){buckets.wood.push([x+dx,h,z+dz]);if(dx===0||dx===6||dz===0||dz===5)for(let y=1;y<4;y++)if(!(dx===3&&dz===0&&y<3))buckets.wood.push([x+dx,h+y,z+dz]);}for(let dx=-1;dx<8;dx++)for(let dz=-1;dz<7;dz++)buckets.roof.push([x+dx,h+4,z+dz]);}
house(-13,-8);house(-3,-10);

// --- Il regno di WORLD: luoghi, abitanti e portali ---
function solidBox(x,y,z,sx,sy,sz,color,opts={}) {
 const m=new THREE.Mesh(new THREE.BoxGeometry(sx,sy,sz),new THREE.MeshLambertMaterial({color,...opts}));
 m.position.set(x,y,z);scene.add(m);return m;
}
function sign(x,z,title,lines) {
 const y=terrainY(x,z);
 solidBox(x,y+1.05,z,.16,2.1,.16,0x68462f);
 solidBox(x,y+1.05,z+.12,1.9,1.05,.16,0x765237);
 const c=document.createElement('canvas');c.width=512;c.height=256;
 const g=c.getContext('2d');g.fillStyle='#302b20';g.fillRect(0,0,512,256);
 g.strokeStyle='#c5a66b';g.lineWidth=9;g.strokeRect(9,9,494,238);
 g.fillStyle='#f1d99b';g.font='bold 38px Georgia';g.textAlign='center';g.fillText(title,256,66);
 g.fillStyle='#eee4ca';g.font='26px Georgia';lines.forEach((line,i)=>g.fillText(line,256,125+i*42));
 const tex=new THREE.CanvasTexture(c);const board=new THREE.Mesh(new THREE.PlaneGeometry(1.78,.89),new THREE.MeshBasicMaterial({map:tex,transparent:false}));
 board.position.set(x,y+1.08,z+.215);scene.add(board);
}
function person(x,z,name,coat=0x9a6845) {
 const y=terrainY(x,z),group=new THREE.Group();
 const body=new THREE.Mesh(new THREE.BoxGeometry(.62,.9,.38),new THREE.MeshLambertMaterial({color:coat}));
 body.position.y=1.05;group.add(body);
 const head=new THREE.Mesh(new THREE.SphereGeometry(.29,8,7),new THREE.MeshLambertMaterial({color:0xd4a77d}));
 head.position.y=1.72;group.add(head);
 const hood=new THREE.Mesh(new THREE.BoxGeometry(.68,.18,.46),new THREE.MeshLambertMaterial({color:0x3b3328}));
 hood.position.y=1.96;group.add(hood);
 for(const dx of [-.19,.19]){const leg=new THREE.Mesh(new THREE.BoxGeometry(.2,.62,.25),new THREE.MeshLambertMaterial({color:0x493b31}));leg.position.set(dx,.31,0);group.add(leg)}
 group.position.set(x,y,z);scene.add(group);
 const c=document.createElement('canvas');c.width=256;c.height=64;const g=c.getContext('2d');
 g.fillStyle='#14231ee8';g.fillRect(0,0,256,64);g.fillStyle='#fff1c9';g.font='bold 30px sans-serif';g.textAlign='center';g.fillText(name,128,43);
 const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:new THREE.CanvasTexture(c),transparent:true}));
 sprite.position.set(x,y+2.55,z);sprite.scale.set(2.1,.52,1);scene.add(sprite);
 return group;
}
const gateX=25,gateZ=25,gateY=terrainY(gateX,gateZ);
const portalMat=new THREE.MeshStandardMaterial({color:0x55d9c8,emissive:0x167f78,emissiveIntensity:1.5,metalness:.25,roughness:.3});
const portal=new THREE.Mesh(new THREE.TorusGeometry(1.55,.2,8,24),portalMat);
portal.position.set(gateX,gateY+2.15,gateZ);scene.add(portal);
solidBox(gateX-1.9,gateY+1.8,gateZ,.38,3.7,.5,0x71604a);
solidBox(gateX+1.9,gateY+1.8,gateZ,.38,3.7,.5,0x71604a);
solidBox(gateX,gateY+3.65,gateZ,4.2,.38,.5,0x9b8154);
const portalLight=new THREE.PointLight(0x42d8ce,2.2,12);portalLight.position.set(gateX,gateY+2.2,gateZ+1);scene.add(portalLight);
sign(-10,-2,'BENVENUTO A WORLD',['Un regno senza confini','Esplora. Ricorda. Ritorna.']);
sign(21,22,'IL PORTALE',['Premi E per attraversare','La Valle delle Stelle ti attende']);
person(-7,-3,'Eldrin',0x526e8b);
person(5,-14,'Mira',0x8a6847);
const returnGate=new THREE.Mesh(new THREE.TorusGeometry(1.5,.18,8,24),new THREE.MeshStandardMaterial({color:0xe2bd75,emissive:0x8a5520,emissiveIntensity:1.2}));
returnGate.position.set(35,terrainY(35,38)+2.1,38);scene.add(returnGate);
const returnLight=new THREE.PointLight(0xffc56e,2,10);returnLight.position.set(35,terrainY(35,38)+2,39);scene.add(returnLight);
const crystalMat=new THREE.MeshStandardMaterial({color:0x9b8cff,emissive:0x4934a8,emissiveIntensity:1.1,roughness:.25});
for(let i=0;i<7;i++){const crystal=new THREE.Mesh(new THREE.OctahedronGeometry(.65+hash(i,8)*.55),crystalMat);crystal.position.set(34+(i%3)*2,terrainY(34+(i%3)*2,34+Math.floor(i/3)*2)+1.1+i*.22,34+Math.floor(i/3)*2);crystal.rotation.set(i*.4,i*.7,i*.2);scene.add(crystal)}
sign(35,30,'VALLE DELLE STELLE',['Hai trovato il primo mondo segreto','Cerca i cristalli luminosi']);

for(const [k,arr] of Object.entries(buckets)){if(!arr.length)continue;const mesh=new THREE.InstancedMesh(geo,new THREE.MeshLambertMaterial({color:mats[k],transparent:k==='water',opacity:k==='water'?.78:1}),arr.length);const o=new THREE.Object3D();arr.forEach((p,i)=>{o.position.set(p[0],p[1]+.5,p[2]);o.updateMatrix();mesh.setMatrixAt(i,o.matrix)});mesh.instanceMatrix.needsUpdate=true;scene.add(mesh)}
// path and small settlement clearing
const ground=new THREE.PlaneGeometry(200,200);const groundMesh=new THREE.Mesh(ground,new THREE.MeshLambertMaterial({color:0x567e42}));groundMesh.rotation.x=-Math.PI/2;groundMesh.position.y=-.52;scene.add(groundMesh);
const keys={};addEventListener('keydown',e=>{keys[e.code]=true;if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(e.code))e.preventDefault();if(e.code==='KeyM')toggleMap();if(e.code==='KeyP')saveMarker();if(e.code==='KeyE')useWorldGate()});addEventListener('keyup',e=>keys[e.code]=false);

let yaw=0,pitch=.12,locked=false,velocityY=0,onGround=false;const player={x:0,z:8};const start=document.querySelector('#start');
const playerData={name:'',language:'it',skin:'#d4a77d',hair:'#493326',shirt:'#496b91'};
let playerModel=null,playerLabel=null;
function makePlayer(){
 if(playerModel)scene.remove(playerModel);
 playerModel=new THREE.Group();
 const mat=c=>new THREE.MeshLambertMaterial({color:c});
 const torso=new THREE.Mesh(new THREE.BoxGeometry(.72,.92,.38),mat(playerData.shirt));torso.position.y=1.22;playerModel.add(torso);
 const head=new THREE.Mesh(new THREE.SphereGeometry(.31,12,10),mat(playerData.skin));head.position.y=1.95;playerModel.add(head);
 const hair=new THREE.Mesh(new THREE.SphereGeometry(.325,12,7,0,Math.PI*2,0,Math.PI*.48),mat(playerData.hair));hair.position.y=2.08;playerModel.add(hair);
 for(const side of [-1,1]){
  const arm=new THREE.Mesh(new THREE.BoxGeometry(.22,.78,.25),mat(playerData.shirt));arm.position.set(side*.49,1.22,0);playerModel.add(arm);
  const leg=new THREE.Mesh(new THREE.BoxGeometry(.25,.72,.29),mat(0x343b3b));leg.position.set(side*.19,.36,0);playerModel.add(leg);
  const boot=new THREE.Mesh(new THREE.BoxGeometry(.28,.18,.4),mat(0x392b22));boot.position.set(side*.19,.09,-.045);playerModel.add(boot);
 }
 playerModel.position.set(player.x,terrainY(player.x,player.z),player.z);scene.add(playerModel);
 const c=document.createElement('canvas');c.width=512;c.height=96;const g=c.getContext('2d');
 g.fillStyle='#101a18dd';g.fillRect(0,0,512,96);g.fillStyle='#fff0c9';g.font='bold 48px system-ui';g.textAlign='center';g.fillText(playerData.name||'Explorer',256,65);
 playerLabel=new THREE.Sprite(new THREE.SpriteMaterial({map:new THREE.CanvasTexture(c),transparent:true,depthTest:false}));
 playerLabel.scale.set(2.2,.42,1);scene.add(playerLabel);
}
function syncCreator(){
 document.querySelector('#creatorName').value=playerData.name;
 document.querySelector('#creatorLang').value=playerData.language;
 document.querySelector('#creatorSkin').value=playerData.skin;
 document.querySelector('#creatorHair').value=playerData.hair;
 document.querySelector('#creatorShirt').value=playerData.shirt;
}


document.querySelector('#creatorLang').addEventListener('change',async e=>{playerData.language=e.target.value;await setLanguage(e.target.value);});
document.querySelector('#createPlayer').onclick=()=>{
 playerData.name=document.querySelector('#creatorName').value.trim().slice(0,18)||'Explorer';
 playerData.language=document.querySelector('#creatorLang').value;
 playerData.skin=document.querySelector('#creatorSkin').value;
 playerData.hair=document.querySelector('#creatorHair').value;
 playerData.shirt=document.querySelector('#creatorShirt').value;
 saved.character={...playerData};persist();makePlayer();
 document.querySelector('#creator').style.display='none';start.style.display='none';renderer.domElement.requestPointerLock?.();
};

document.addEventListener('pointerlockchange',()=>locked=document.pointerLockElement===renderer.domElement);
document.addEventListener('mousemove',e=>{if(!locked)return;yaw-=e.movementX*.0022;pitch=Math.max(-1.25,Math.min(1.25,pitch-e.movementY*.0022))});
function terrainY(x,z){return heightAt(Math.round(x),Math.round(z))+.15}
function toast(t){const el=document.querySelector('#toast');el.textContent=t;el.style.opacity=1;clearTimeout(toast.timer);toast.timer=setTimeout(()=>el.style.opacity=0,1900)}

const STORE='world3d-v02';let saved={markers:[],position:null,character:null};try{saved={...saved,...JSON.parse(localStorage.getItem(STORE)||'{}')}}catch{}
if(saved.character)Object.assign(playerData,saved.character);
syncCreator();
loadLanguage(playerData.language);

if(saved.position){player.x=saved.position.x;player.z=saved.position.z}
function persist(){saved.position={x:player.x,z:player.z};saved.character={...playerData};localStorage.setItem(STORE,JSON.stringify(saved))}
function saveMarker(){const name=prompt(t('markerPrompt'),t('discoveredPlace'));if(name===null)return;saved.markers.push({name:name.trim()||'Luogo senza nome',x:Math.round(player.x),z:Math.round(player.z)});persist();drawMap();toast(t('placeSaved'))}
document.querySelector('#save').onclick=saveMarker;
let mapOpen=false;function toggleMap(){mapOpen=!mapOpen;document.querySelector('#mapWrap').style.display=mapOpen?'flex':'none';if(mapOpen){if(locked)document.exitPointerLock();drawMap()}}
document.querySelector('#mapBtn').onclick=toggleMap;document.querySelector('#closeMap').onclick=toggleMap;
function drawMap(){const c=document.querySelector('#map'),ctx=c.getContext('2d'),w=c.width;const img=ctx.createImageData(w,w);for(let px=0;px<w;px++)for(let pz=0;pz<w;pz++){let x=Math.floor(px/ w*96)-48,z=Math.floor(pz/w*96)-48,h=heightAt(x,z),col=h<3?[65,135,151]:h>10?[119,124,116]:[Math.max(45,105-h*2),Math.min(160,145-h*2),65];let i=(pz*w+px)*4;img.data.set([...col,255],i)}ctx.putImageData(img,0,0);const dot=(x,z,color,r)=>{ctx.fillStyle=color;ctx.beginPath();ctx.arc((x+48)/96*w,(z+48)/96*w,r,0,Math.PI*2);ctx.fill()};saved.markers.forEach(m=>dot(m.x,m.z,'#ffd45e',5));dot(player.x,player.z,'#fff',6);ctx.strokeStyle='#fff';ctx.lineWidth=2;ctx.strokeRect(1,1,w-2,w-2);document.querySelector('#markerList').innerHTML=saved.markers.length?saved.markers.map(m=>'<span class="marker">◆ '+escapeHtml(m.name)+' ('+m.x+', '+m.z+')</span>').join(''):t('noMarkers')}
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
function animate(){requestAnimationFrame(animate);const dt=Math.min(clock.getDelta(),.04);if(!mapOpen){if(keys.ArrowLeft)yaw+=dt*1.7;if(keys.ArrowRight)yaw-=dt*1.7;let forward=(keys.ArrowUp||keys.KeyW?1:0)-(keys.ArrowDown||keys.KeyS?1:0),side=(keys.KeyD?1:0)-(keys.KeyA?1:0);const speed=keys.ShiftLeft?9:5.2;player.x+=(-Math.sin(yaw)*forward+Math.cos(yaw)*side)*speed*dt;player.z+=(-Math.cos(yaw)*forward-Math.sin(yaw)*side)*speed*dt;player.x=THREE.MathUtils.clamp(player.x,-47,47);player.z=THREE.MathUtils.clamp(player.z,-47,47);if(keys.Space&&onGround){velocityY=7;onGround=false}velocityY-=19*dt;
const floor=terrainY(player.x,player.z);if(playerModel){playerModel.position.set(player.x,floor,player.z);playerModel.rotation.y=yaw}
const bob=(Math.abs(forward)+Math.abs(side)>0)?Math.sin(performance.now()*.012)*.045:0;
const back=5.2,camHeight=3.05+pitch*2.0;
camera.position.set(player.x+Math.sin(yaw)*back, floor+camHeight+bob, player.z+Math.cos(yaw)*back);
camera.lookAt(player.x,floor+1.25+pitch*1.4,player.z);
if(playerLabel){playerLabel.position.set(player.x,floor+3.05,player.z)}
document.querySelector('#coords').textContent='X '+Math.round(player.x)+' · Z '+Math.round(player.z);if(Math.random()<.025)persist()}renderer.render(scene,camera)}
const clock=new THREE.Clock();makePlayer();animate();
addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight)});
addEventListener('beforeunload',persist);drawMap();
