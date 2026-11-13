
import * as THREE from 'three';
import { loadLanguage, t, setLanguage } from './i18n.js';
const scene=new THREE.Scene();scene.background=new THREE.Color(0x9bc4d1);scene.fog=new THREE.Fog(0x9bc4d1,72,165);
const camera=new THREE.PerspectiveCamera(66,innerWidth/innerHeight,.1,240);camera.position.set(0,8,12);
const renderer=new THREE.WebGLRenderer({canvas:document.querySelector('#game'),antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,1.75));renderer.setSize(innerWidth,innerHeight);renderer.shadowMap.enabled=false;
scene.add(new THREE.HemisphereLight(0xd9efff,0x65734b,2.0));const sun=new THREE.DirectionalLight(0xffedc5,2.2);sun.position.set(-35,65,25);scene.add(sun);
const mats={grass:0x789d59,dirt:0x79563a,stone:0x858b83,sand:0xc6b77b,wood:0x765034,leaves:0x3e743e,leaf2:0x588947,water:0x4b9ca7,roof:0x70483a};
function hash(x,z){let n=Math.sin(x*127.1+z*311.7)*43758.5453;return n-Math.floor(n)}
const HALF=48,SEA=1.65;
function smooth(a,b,v){const t=THREE.MathUtils.clamp((v-a)/(b-a),0,1);return t*t*(3-2*t)}
function rawHeight(x,z){return 4.2+Math.sin(x*.075)*2.0+Math.cos(z*.061)*1.65+Math.sin((x+z)*.035)*1.3+Math.max(0,Math.sin((x-z*.55)*.035))*Math.max(0,Math.cos(z*.025))*4.2}
function heightAt(x,z){
 const raw=rawHeight(x,z);
 const village=1-smooth(13,23,Math.hypot(x+5,z+8));
 const spawn=1-smooth(6,13,Math.hypot(x,z-8));
 const roadDist=Math.abs(x-(z*.28-2));
 const road= (1-smooth(2.2,4.5,roadDist))*(1-smooth(5,48,Math.hypot(x,z+5)));
 const flatten=Math.max(village,spawn,road*.88);
 return raw+(4.35-raw)*flatten;
}
const terrainGeo=new THREE.PlaneGeometry(HALF*2,HALF*2,96,96);terrainGeo.rotateX(-Math.PI/2);
const pos=terrainGeo.attributes.position,colors=[];
for(let i=0;i<pos.count;i++){
 const x=pos.getX(i),z=pos.getZ(i),h=heightAt(x,z);pos.setY(i,h);
 const c=new THREE.Color(h<SEA+.25?0x9caa78:h>10?0x85877b:0x789d59);
 colors.push(c.r,c.g,c.b);
}
terrainGeo.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));terrainGeo.computeVertexNormals();
const terrain=new THREE.Mesh(terrainGeo,new THREE.MeshStandardMaterial({vertexColors:true,roughness:1,flatShading:false}));
terrain.receiveShadow=true;scene.add(terrain);
const waterGeo=new THREE.PlaneGeometry(160,160,1,1);waterGeo.rotateX(-Math.PI/2);
const water=new THREE.Mesh(waterGeo,new THREE.MeshPhysicalMaterial({color:0x4b9ca7,transparent:true,opacity:.72,roughness:.24,metalness:.08,clearcoat:.8}));
water.position.y=SEA;scene.add(water);
function makeTree(x,z,scale=1){
 const y=heightAt(x,z),g=new THREE.Group();
 const trunk=new THREE.Mesh(new THREE.CylinderGeometry(.22*scale,.38*scale,2.6*scale,9),new THREE.MeshStandardMaterial({color:0x725039,roughness:1}));
 trunk.position.y=1.3*scale;g.add(trunk);
 const crown=new THREE.Mesh(new THREE.IcosahedronGeometry(1.55*scale,1),new THREE.MeshStandardMaterial({color:hash(x,z)>.5?0x477d43:0x5c914c,roughness:1,flatShading:false}));
 crown.position.y=3.25*scale;crown.scale.set(1,1.12,.94);g.add(crown);
 const crown2=new THREE.Mesh(new THREE.IcosahedronGeometry(.95*scale,1),new THREE.MeshStandardMaterial({color:0x659b50,roughness:1}));
 crown2.position.set(.48*scale,3.8*scale,.08*scale);g.add(crown2);
 g.position.set(x,y,z);scene.add(g);
}
for(let x=-HALF+4;x<HALF-4;x+=3)for(let z=-HALF+4;z<HALF-4;z+=3){
 if(hash(x,z)>.84&&Math.hypot(x+5,z+8)>23&&Math.hypot(x,z-8)>13&&heightAt(x,z)>SEA+1)makeTree(x,z,.82+hash(z,x)*.42);
}
function house(x,z,scale=1){
 const y=heightAt(x,z),g=new THREE.Group();
 const wallMat=new THREE.MeshStandardMaterial({color:0xb69a72,roughness:.92});
 const timberMat=new THREE.MeshStandardMaterial({color:0x69482f,roughness:1});
 const roofMat=new THREE.MeshStandardMaterial({color:0x75493b,roughness:.88});
 const add=(geo,mat,px,py,pz)=>{const m=new THREE.Mesh(geo,mat);m.position.set(px,py,pz);g.add(m);return m};
 add(new THREE.BoxGeometry(6*scale,3.3*scale,5*scale),wallMat,0,1.65*scale,0);
 add(new THREE.BoxGeometry(1.05*scale,2.1*scale,.12*scale),timberMat,0,1.05*scale,2.56*scale);
 add(new THREE.BoxGeometry(1.1*scale,1.15*scale,.16*scale),new THREE.MeshStandardMaterial({color:0x3a2920}),0,.58*scale,2.64*scale);
 for(const side of [-1,1]){
  const roofGeo=new THREE.BufferGeometry();
  const verts=side===-1?[-3,3,0,0,4.9,0,-3,3,-2.5, 0,4.9,0,0,4.9,-2.5,-3,3,-2.5]:[0,4.9,0,3,3,0,0,4.9,-2.5,3,3,0,3,3,-2.5,0,4.9,-2.5];
  roofGeo.setAttribute('position',new THREE.Float32BufferAttribute(verts.map(v=>v*scale),3));roofGeo.computeVertexNormals();
  const roof=new THREE.Mesh(roofGeo,roofMat);roof.material.side=THREE.DoubleSide;g.add(roof);
 }
 for(const dx of [-2.2,2.2]){add(new THREE.BoxGeometry(.14*scale,3.5*scale,.14*scale),timberMat,dx*scale,1.7*scale,2.53*scale)}
 g.position.set(x,y,z);scene.add(g);
}
house(-13,-8,1);house(-3,-10,.88);
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
 const y=terrainY(x,z),group=new THREE.Group(),mat=c=>new THREE.MeshStandardMaterial({color:c,roughness:.85});
 const body=new THREE.Mesh(new THREE.CapsuleGeometry(.3,.55,5,10),mat(coat));body.position.y=1.05;group.add(body);
 const head=new THREE.Mesh(new THREE.SphereGeometry(.27,16,12),mat(0xd4a77d));head.position.y=1.78;group.add(head);
 const hair=new THREE.Mesh(new THREE.SphereGeometry(.285,14,9,0,Math.PI*2,0,Math.PI*.55),mat(0x493326));hair.position.y=1.91;group.add(hair);
 for(const side of [-1,1]){
  const arm=new THREE.Mesh(new THREE.CapsuleGeometry(.09,.42,4,8),mat(coat));arm.position.set(side*.38,1.08,0);arm.rotation.z=side*.18;group.add(arm);
  const leg=new THREE.Mesh(new THREE.CapsuleGeometry(.11,.42,4,8),mat(0x493b31));leg.position.set(side*.15,.35,0);group.add(leg);
 }
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

const keys={};addEventListener('keydown',e=>{keys[e.code]=true;if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(e.code))e.preventDefault();if(e.code==='KeyM')toggleMap();if(e.code==='KeyP')saveMarker();if(e.code==='KeyE')useWorldGate()});addEventListener('keyup',e=>keys[e.code]=false);

let yaw=0,pitch=.12,locked=false,velocityY=0,onGround=false;const player={x:0,z:8};const start=document.querySelector('#start');
const playerData={name:'',language:'it',skin:'#d4a77d',hair:'#493326',shirt:'#496b91'};
let playerModel=null,playerLabel=null,playerLift=0;
function makePlayer(){
 if(playerModel)scene.remove(playerModel);
 playerModel=new THREE.Group();
 const mat=c=>new THREE.MeshStandardMaterial({color:c,roughness:.82});
 const torso=new THREE.Mesh(new THREE.CapsuleGeometry(.34,.58,5,10),mat(playerData.shirt));torso.position.y=1.25;playerModel.add(torso);
 const head=new THREE.Mesh(new THREE.SphereGeometry(.29,16,12),mat(playerData.skin));head.position.y=1.98;playerModel.add(head);
 const hair=new THREE.Mesh(new THREE.SphereGeometry(.305,16,10,0,Math.PI*2,0,Math.PI*.52),mat(playerData.hair));hair.position.y=2.1;playerModel.add(hair);
 for(const side of [-1,1]){
  const arm=new THREE.Mesh(new THREE.CapsuleGeometry(.105,.48,4,8),mat(playerData.shirt));arm.position.set(side*.43,1.23,0);arm.rotation.z=side*.12;playerModel.add(arm);
  const leg=new THREE.Mesh(new THREE.CapsuleGeometry(.12,.43,4,8),mat(0x343b3b));leg.position.set(side*.17,.43,0);playerModel.add(leg);
  const boot=new THREE.Mesh(new THREE.SphereGeometry(.16,12,8),mat(0x392b22));boot.scale.set(1,.58,1.4);boot.position.set(side*.17,.12,-.06);playerModel.add(boot);
 }
 playerModel.position.set(player.x,terrainY(player.x,player.z)+playerLift,player.z);scene.add(playerModel);
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
function terrainY(x,z){return heightAt(x,z)+.08}
function toast(t){const el=document.querySelector('#toast');el.textContent=t;el.style.opacity=1;clearTimeout(toast.timer);toast.timer=setTimeout(()=>el.style.opacity=0,1900)}

const STORE='world3d-v02';let saved={markers:[],position:null,character:null};try{saved={...saved,...JSON.parse(localStorage.getItem(STORE)||localStorage.getItem('world3d-v01')||'{}')}}catch{}
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
function animate(){requestAnimationFrame(animate);const dt=Math.min(clock.getDelta(),.04);if(!mapOpen){const prevX=player.x,prevZ=player.z;if(keys.ArrowLeft)yaw+=dt*1.7;if(keys.ArrowRight)yaw-=dt*1.7;let forward=(keys.ArrowUp||keys.KeyW?1:0)-(keys.ArrowDown||keys.KeyS?1:0),side=(keys.KeyD?1:0)-(keys.KeyA?1:0);const speed=keys.ShiftLeft?9:5.2;player.x+=(-Math.sin(yaw)*forward+Math.cos(yaw)*side)*speed*dt;player.z+=(-Math.cos(yaw)*forward-Math.sin(yaw)*side)*speed*dt;player.x=THREE.MathUtils.clamp(player.x,-46,46);player.z=THREE.MathUtils.clamp(player.z,-46,46);
if(heightAt(player.x,player.z)<SEA+.22|| (player.x>-16.2&&player.x<-9.8&&player.z>-10.7&&player.z<-5.3) || (player.x>-6.2&&player.x<.2&&player.z>-12.7&&player.z<-7.3)){player.x=prevX;player.z=prevZ}
if(keys.Space&&onGround){velocityY=7;onGround=false}velocityY-=19*dt;
playerLift+=velocityY*dt;const floor=terrainY(player.x,player.z);if(playerLift<=0){playerLift=0;velocityY=0;onGround=true}if(playerModel){playerModel.position.set(player.x,floor+playerLift,player.z);playerModel.rotation.y=yaw}
const bob=(Math.abs(forward)+Math.abs(side)>0)?Math.sin(performance.now()*.012)*.045:0;
const back=6.1,camHeight=3.35+pitch*1.7;
camera.position.set(player.x+Math.sin(yaw)*back, floor+playerLift+camHeight+bob, player.z+Math.cos(yaw)*back);
camera.lookAt(player.x,floor+playerLift+1.25+pitch*1.4,player.z);
if(playerLabel){playerLabel.position.set(player.x,floor+playerLift+3.05,player.z)}
document.querySelector('#coords').textContent='X '+Math.round(player.x)+' · Z '+Math.round(player.z);if(Math.random()<.025)persist()}renderer.render(scene,camera)}
const clock=new THREE.Clock();makePlayer();animate();
addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight)});
addEventListener('beforeunload',persist);drawMap();
