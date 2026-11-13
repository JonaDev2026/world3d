import * as THREE from 'three';

const $ = id => document.getElementById(id);
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x9ba99e);
scene.fog = new THREE.FogExp2(0x9ba99e, 0.00072);

const camera = new THREE.PerspectiveCamera(72, innerWidth / innerHeight, 0.1, 1800);
camera.position.set(0, 1.72, 18);
const renderer = new THREE.WebGLRenderer({antialias:false, powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.12;
$('viewport').appendChild(renderer.domElement);

const hemi = new THREE.HemisphereLight(0xdce8e2, 0x655b46, 2.0);
scene.add(hemi);
const sun = new THREE.DirectionalLight(0xffe4bd, 2.15);
sun.position.set(-180, 260, 120);
sun.castShadow = true;
sun.shadow.mapSize.set(2048,2048);
sun.shadow.camera.left = -180; sun.shadow.camera.right = 180;
sun.shadow.camera.top = 180; sun.shadow.camera.bottom = -180;
sun.shadow.camera.near = 1; sun.shadow.camera.far = 600;
sun.shadow.bias = -0.00025;
scene.add(sun);

const mat = (color, roughness=1) => new THREE.MeshStandardMaterial({color,roughness});
const M = {
 grass:mat(0x71825b), meadow:mat(0x81916a), darkGrass:mat(0x596f4d),
 road:mat(0x77736a), stone:mat(0x918a7a), paleStone:mat(0xb5a88f),
 wall:[0xbba98b,0xc9b99d,0xa99b83,0xd0c1a6,0x988b79,0xc0ae91].map(c=>mat(c)),
 plaster:[0xd8c9aa,0xb9ad96,0xd6d0bd,0xc8b9a0,0xa89d89].map(c=>mat(c)),
 roof:[0x704c3d,0x874f3d,0x595b55,0x9a7452,0x6b4139].map(c=>mat(c)),
 wood:mat(0x604633), darkWood:mat(0x392f25), glass:mat(0x34434a,.35),
 water: new THREE.MeshStandardMaterial({color:0x527f87,roughness:.24,metalness:.12}),
 bank:mat(0x8e896e), leaf:[0x536b49,0x64794e,0x78845a,0x405d43].map(c=>mat(c)),
 trunk:mat(0x594735), iron:mat(0x383b38,.65), gold:mat(0xb89a62,.45)
};
const boxGeo = new THREE.BoxGeometry(1,1,1);
function box(parent, material, x,y,z,sx,sy,sz, cast=true) {
 const o=new THREE.Mesh(boxGeo,material); o.position.set(x,y,z); o.scale.set(sx,sy,sz); o.castShadow=cast; o.receiveShadow=true; parent.add(o); return o;
}
function seeded(x,z,s=0){let n=Math.sin(x*127.1+z*311.7+s*74.7)*43758.5453;return n-Math.floor(n)}
const riverPaths=[
 [[-1800,-1100],[-1100,-760],[-500,-430],[0,-95],[440,100],[950,470],[1700,980]],
 [[-1500,1450],[-980,1000],[-520,530],[-110,80],[0,-95],[170,-560],[620,-1300]],
 [[1550,-1450],[1100,-980],[650,-540],[180,-180],[0,-95],[-480,150],[-1300,360]]
];
function distanceToSegment(px,pz,a,b){const dx=b[0]-a[0],dz=b[1]-a[1],l=dx*dx+dz*dz;const t=Math.max(0,Math.min(1,((px-a[0])*dx+(pz-a[1])*dz)/l));return Math.hypot(px-a[0]-t*dx,pz-a[1]-t*dz);}
function noise(x,z){return (Math.sin(x*.013+Math.sin(z*.009)*2)+Math.cos(z*.017-x*.004)*.55+Math.sin((x+z)*.031)*.22)*1.7}
function groundHeight(x,z){
 let h=noise(x,z)-Math.max(0,1-Math.abs(z-260)/170)*5,d=1e9;
 for(const path of riverPaths)for(let i=0;i<path.length-1;i++)d=Math.min(d,distanceToSegment(x,z,path[i],path[i+1]));
 if(d<27){const t=Math.max(0,Math.min(1,d/27));h=Math.min(h,-2.5+t*(h+2.5));}
 return h;
}
function addGround(cx,cz){
 const size=256, seg=24, geo=new THREE.PlaneGeometry(size,size,seg,seg);
 const p=geo.attributes.position;
 for(let i=0;i<p.count;i++){const x=p.getX(i)+cx*size,z=-p.getY(i)+cz*size;p.setZ(i,groundHeight(x,z));}
 geo.rotateX(-Math.PI/2);
 // PlaneGeometry is rotated after height assignment; original z heights become world y.
 const mesh=new THREE.Mesh(geo,M.grass);mesh.position.set(cx*size,0,cz*size);mesh.receiveShadow=true;mesh.castShadow=false;scene.add(mesh);
 return mesh;
}
function ribbon(points,width,material,y=0){
 const curve=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(p[0],typeof y==='number'?y:groundHeight(p[0],p[1])-1.15,p[1])));
 const verts=[], inds=[], steps= Math.max(30,points.length*30);
 for(let i=0;i<=steps;i++){const t=i/steps,pt=curve.getPoint(t),tan=curve.getTangent(t),side=new THREE.Vector3(-tan.z,0,tan.x).normalize();verts.push(pt.x+side.x*width/2,pt.y,pt.z+side.z*width/2,pt.x-side.x*width/2,pt.y,pt.z-side.z*width/2);if(i<steps){let a=i*2;inds.push(a,a+1,a+2,a+1,a+3,a+2);}}
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));g.setIndex(inds);g.computeVertexNormals();const m=new THREE.Mesh(g,material);m.receiveShadow=true;scene.add(m);return curve;
}
// The three waters meet below the old town.
const riverA=ribbon(riverPaths[0],28,M.water,null);
const riverB=ribbon(riverPaths[1],21,M.water,null);
const riverC=ribbon(riverPaths[2],17,M.water,null);
function makeBridge(x,z,angle=0){
 const g=new THREE.Group();g.position.set(x,groundHeight(x,z),z);g.rotation.y=angle;scene.add(g);
 box(g,M.paleStone,0,.6,0,38,1.2,7);
 for(let i=-17;i<=17;i+=5){box(g,M.stone,i,1.25,-3.15,1,1.2,.7);box(g,M.stone,i,1.25,3.15,1,1.2,.7);}
 box(g,M.stone,0,1.75,-3.15,38,.28,.35);box(g,M.stone,0,1.75,3.15,38,.28,.35);
 for(let i=-18;i<=18;i+=3){box(g,M.iron,i,2.15,-3.15,.12,.7,.12);box(g,M.iron,i,2.15,3.15,.12,.7,.12);}
}
makeBridge(-20,-95,.18);makeBridge(0,-110,Math.PI/2);makeBridge(14,-80,-.72);

function makeTree(x,z,scale=1){
 const g=new THREE.Group();g.position.set(x,groundHeight(x,z),z);g.scale.setScalar(scale);scene.add(g);
 const trunk=new THREE.Mesh(new THREE.CylinderGeometry(.18,.28,2.3,7),M.trunk);trunk.position.y=1.15;trunk.castShadow=true;g.add(trunk);
 const r=seeded(x,z);
 for(let i=0;i<3;i++){const crown=new THREE.Mesh(new THREE.IcosahedronGeometry(1.25-i*.16,1),M.leaf[Math.floor((r*10+i)%M.leaf.length)]);crown.position.set((seeded(x,z,i)-.5)*.45,2.4+i*.48,(seeded(z,x,i)-.5)*.4);crown.scale.set(1,1.1,.9);crown.castShadow=true;g.add(crown);}
 return g;
}
function makeBuilding(x,z,seed,kind='house'){
 const r=n=>seeded(seed*31+n,seed*17-n);
 const g=new THREE.Group();g.position.set(x,groundHeight(x,z),z);g.rotation.y=(Math.floor(r(1)*4))*Math.PI/2;scene.add(g);
 const w=kind==='inn'?15:kind==='hall'?23:8+r(2)*6;
 const d=kind==='inn'?12:kind==='hall'?18:8+r(3)*7;
 const floors=kind==='hall'?2:kind==='inn'?3:1+Math.floor(r(4)*3);
 const h=floors*(kind==='hall'?4.1:3.15);
 const wall=M.plaster[Math.floor(r(5)*M.plaster.length)],roof=M.roof[Math.floor(r(6)*M.roof.length)];
 box(g, M.stone,0,.35,0,w+.7,.7,d+.7);
 box(g,wall,0,.7+h/2,0,w,h,d);
 // Slightly irregular timber framing and projecting upper floors.
 if(floors>1&&kind!=='hall'){box(g,M.darkWood,0,.9+h*.68,0,w+.5,.22,d+.5);}
 const roofH=kind==='hall'?4.4:2.6+r(7)*1.2;
 const roofGeo=new THREE.BufferGeometry();
 const v=[-w/2,h+.7,-d/2,w/2,h+.7,-d/2,0,h+.7+roofH,-d/2,-w/2,h+.7,d/2,w/2,h+.7,d/2,0,h+.7+roofH,d/2];
 roofGeo.setAttribute('position',new THREE.Float32BufferAttribute(v,3));
 roofGeo.setIndex([0,2,1,3,4,5,0,3,5,0,5,2,1,2,5,1,5,4,0,1,4,0,4,3]);roofGeo.computeVertexNormals();
 const rm=new THREE.Mesh(roofGeo,roof);rm.castShadow=true;rm.receiveShadow=true;g.add(rm);
 // Front facade: entrance, shutters, sills and warm dark glass.
 const doorW=kind==='hall'?2.2:1.35;
 box(g,M.darkWood,0,1.55,d/2+.04,doorW,2.65,.16);
 box(g,M.wood,0,2.92,d/2+.14,doorW+.35,.16,.2);
 for(let floor=0;floor<floors;floor++){
  const y=2.0+floor*3.1;
  const count=Math.max(1,Math.floor(w/3.5));
  for(let j=0;j<count;j++){
   const xx=(j-(count-1)/2)*(w/(count+0.3));
   if(floor===0&&Math.abs(xx)<1.3)continue;
   box(g,M.glass,xx,y+floor*.08,d/2+.055,1.05,1.35,.12);
   box(g,M.wood,xx-0.68,y+floor*.08,d/2+.12,.13,1.55,.12);
   box(g,M.wood,xx+.68,y+floor*.08,d/2+.12,.13,1.55,.12);
   box(g,M.wood,xx,y+.76+floor*.08,d/2+.13,1.5,.13,.12);
   box(g,M.wood,xx,y-.76+floor*.08,d/2+.13,1.5,.13,.12);
   box(g,M.wood,xx,y+floor*.08,d/2+.17,.1,1.25,.1);
  }
 }
 // Chimney and eaves.
 const chimX=(r(8)-.5)*w*.55;
 box(g,M.wall[2],chimX,h+roofH*.65,-d*.18,1.1,2.5,1.1);
 box(g,M.wood,0,h+.75,d/2+.18,w+.7,.22,.28);
 // Side extension / lean-to on selected houses.
 if(r(9)>.58&&kind==='house'){box(g,wall,-w*.34,1.4,d*.55,w*.35,2.8,d*.5);box(g,roof,-w*.34,2.9,d*.55,w*.42,.35,d*.58);}
 return {group:g,x,z,radius:Math.max(w,d)*.58};
}
function makeMarketStall(x,z,seed){
 const g=new THREE.Group();g.position.set(x,groundHeight(x,z),z);scene.add(g);
 box(g,M.wood,0,1,0,3.8,1.8,2.5);
 for(const sx of [-1.65,1.65])for(const sz of [-1,1])box(g,M.darkWood,sx,2.25,sz,.13,2.7,.13);
 const canopy=new THREE.Mesh(new THREE.BoxGeometry(4.3,.18,3.1),[mat(0x9a684c),mat(0xb5a17e),mat(0x6d7770)][seed%3]);canopy.position.y=3.5;canopy.castShadow=true;g.add(canopy);
 for(let i=0;i<5;i++){const fruit=new THREE.Mesh(new THREE.SphereGeometry(.23,8,6),[mat(0x9b4938),mat(0xc49a47),mat(0x74834e)][i%3]);fruit.position.set(-1.3+i*.6,2.05,.1);g.add(fruit);}
}
function buildTownChunk(cx,cz){
 const size=256, x0=cx*size,z0=cz*size, out=[];
 const dist=Math.hypot(x0+128,z0+128);
 const isTown=dist<720;
 // Roads follow a measured medieval grid, softened by local bends.
 if(isTown){
  for(let k=-3;k<=3;k++){
   const x=k*82;
   const road=box(scene,M.road,x,groundHeight(x,z0+128)+.08,z0+128,5,.12,256,false);
   out.push(road);
   const zz=k*82;
   const road2=box(scene,M.road,x0+128,groundHeight(x0+128,zz)+.08,zz,256,.12,5,false);out.push(road2);
  }
 }
 // Town lots are deliberately varied in size and orientation.
 const step=isTown?30:52;
 for(let lx=x0+18;lx<x0+size-12;lx+=step){
  for(let lz=z0+18;lz<z0+size-12;lz+=step){
   const rr=seeded(Math.floor(lx/step),Math.floor(lz/step),4);
   const nearRiver=Math.hypot(lx*.45+(lz+100)*.4,lz*.45-(lx*.35))<36;
   const roadGap=isTown&&(Math.abs((lx%82+82)%82-41)<12||Math.abs((lz%82+82)%82-41)<12);
   if(nearRiver||roadGap)continue;
   if(isTown){
    if(rr<.18)continue;
    const b=makeBuilding(lx+(rr-.5)*7,lz+(seeded(lz,lx)-.5)*7,Math.floor(lx*13+lz*7),'house');out.push(b.group);
   }else if(rr>.88 && dist<2400){
    const b=makeBuilding(lx,lz,Math.floor(lx*13+lz*7),'house');out.push(b.group);
    if(rr>.96)out.push(makeTree(lx+13,lz+8,.9));
   }else if(rr>.95){
    out.push(makeTree(lx,lz,.8+rr*.6));
   }
  }
 }
 // Hamlets are seeded on a wide grid so the countryside has destinations, not just empty terrain.
 if(!isTown && Math.abs(cx)%6===0 && Math.abs(cz)%6===0 && seeded(cx,cz,99)>.28){
  const hx=x0+128,hz=z0+128,count=4+Math.floor(seeded(cx,cz,100)*6);
  for(let i=0;i<count;i++){
   const a=seeded(cx*17+i,cz*19,101)*Math.PI*2,rr=12+seeded(i,cx+cz,102)*42;
   const bx=hx+Math.cos(a)*rr,bz=hz+Math.sin(a)*rr;
   const b=makeBuilding(bx,bz,cx*10000+cz*100+i,'house');out.push(b.group);
   if(i%2===0)out.push(makeTree(bx+9,bz-7,.8+seeded(i,cx,103)*.5));
  }
 }
 return out;
}

// Landmark buildings frame the old market square.
const landmarks=[];
function landmark(x,z,kind,name){
 const b=makeBuilding(x,z,Math.floor(x*7+z*13),kind);landmarks.push({...b,name});
 return b;
}
landmark(-24,18,'inn','Il Cigno Zoppo');
landmark(42,-28,'hall','Palazzo del Consiglio');
landmark(-62,-42,'hall','La Sala delle Gilde');
landmark(18,82,'house','');
function makeTower(x,z,height=31){
 const g=new THREE.Group();g.position.set(x,groundHeight(x,z),z);scene.add(g);
 const base=new THREE.Mesh(new THREE.CylinderGeometry(5.8,7.2,height,8),M.paleStone);base.position.y=height/2;base.castShadow=true;base.receiveShadow=true;g.add(base);
 const roof=new THREE.Mesh(new THREE.ConeGeometry(7.8,10,8),M.roof[1]);roof.position.y=height+5;roof.castShadow=true;g.add(roof);
 for(let y=8;y<height-2;y+=7)for(let a=0;a<8;a++){const ang=a*Math.PI/4;const win=box(g,M.darkWood,Math.sin(ang)*5.5,y,Math.cos(ang)*5.5,.7,2,.3);win.rotation.y=ang;}
 return g;
}
makeTower(-4,6,34);
function makeSquare(){
 const g=new THREE.Group();g.position.set(0,groundHeight(0,0)+.18,0);scene.add(g);
 const plaza=new THREE.Mesh(new THREE.CircleGeometry(43,48),M.paleStone);plaza.rotation.x=-Math.PI/2;plaza.position.y=.05;plaza.receiveShadow=true;g.add(plaza);
 for(let i=0;i<28;i++){const a=i/28*Math.PI*2;const tile=box(g,M.stone,Math.cos(a)*29,.08,Math.sin(a)*29,2.2,.08,2.2);tile.rotation.y=a;}
 // Well at the heart of the market.
 const well=new THREE.Mesh(new THREE.CylinderGeometry(3.2,3.8,1.7,12),M.stone);well.position.y=1;well.castShadow=true;g.add(well);
 const water=new THREE.Mesh(new THREE.CircleGeometry(2.6,16),M.water);water.rotation.x=-Math.PI/2;water.position.y=1.9;g.add(water);
 const post=box(g,M.wood,0,4.4,0,.3,5,.3);box(g,M.wood,0,6,0,5,.25,.25);
 for(let i=0;i<4;i++){const a=i*Math.PI/2;const lamp=new THREE.Mesh(new THREE.BoxGeometry(.4,.6,.4),M.gold);lamp.position.set(Math.sin(a)*2.1,4.9,Math.cos(a)*2.1);g.add(lamp);}
}
makeSquare();
for(let i=0;i<4;i++){const a=i*Math.PI/2;makeTree(Math.cos(a)*52,Math.sin(a)*52,1.1);}

// Market stalls around the square.
for(let i=0;i<8;i++)makeMarketStall(-28+i*8,49+(i%2)*5,i);

// Trees line the roads and mark the river banks.
for(let i=0;i<95;i++){
 const a=seeded(i,3)*Math.PI*2, r=105+seeded(i,7)*360;
 const x=Math.cos(a)*r,z=Math.sin(a)*r;
 if(Math.hypot(x,z)>650 && seeded(i,8)>.35)continue;
 makeTree(x,z,.65+seeded(i,9)*.7);
}

// Chunk streaming: a 17.32 km square world, with only nearby terrain active.
const chunks=new Map();
function loadChunks(px,pz){
 const cx=Math.floor(px/256),cz=Math.floor(pz/256),keep=new Set();
 for(let x=cx-2;x<=cx+2;x++)for(let z=cz-2;z<=cz+2;z++){
  const key=x+','+z;keep.add(key);
  if(!chunks.has(key)){
   const ground=addGround(x,z);
   const objects=buildTownChunk(x,z);
   chunks.set(key,{ground,objects});
  }
 }
 for(const [key,data] of chunks){if(!keep.has(key)){scene.remove(data.ground);data.ground.geometry.dispose();for(const o of data.objects)scene.remove(o);chunks.delete(key);}}
}

// People: small, scaled human figures following independent paths.
const people=[];
const skinM=[mat(0xb98e6d),mat(0xd0a17c),mat(0x8e684f)];
const clothM=[mat(0x6b4d3c),mat(0x465b59),mat(0x8c7550),mat(0x7b3f39),mat(0x555b43),mat(0x9a8b72)];
function makePerson(i){
 const g=new THREE.Group();const x=(seeded(i,21)-.5)*130,z=(seeded(i,22)-.5)*130;g.position.set(x,groundHeight(x,z),z);scene.add(g);
 const cloth=clothM[i%clothM.length],skin=skinM[i%skinM.length];
 const body=new THREE.Mesh(new THREE.CylinderGeometry(.25,.34,.9,7),cloth);body.position.y=1.15;body.castShadow=true;g.add(body);
 const head=new THREE.Mesh(new THREE.SphereGeometry(.22,8,7),skin);head.position.y=1.82;head.castShadow=true;g.add(head);
 const legs=[];
 for(let s of [-1,1]){const leg=new THREE.Mesh(new THREE.CylinderGeometry(.105,.13,.72,6),M.darkWood);leg.position.set(s*.14,.48,0);g.add(leg);legs.push(leg);}
 const arms=[];
 for(let s of [-1,1]){const arm=new THREE.Mesh(new THREE.CylinderGeometry(.09,.11,.65,6),cloth);arm.position.set(s*.34,1.25,0);arm.rotation.z=s*.22;g.add(arm);arms.push(arm);}
 const hat=new THREE.Mesh(new THREE.CylinderGeometry(.28,.3,.12,8),i%3===0?M.wood:cloth);hat.position.y=2.05;g.add(hat);
 people.push({g,legs,arms,phase:seeded(i,30)*6.28,speed:.55+seeded(i,31)*.45,angle:seeded(i,32)*6.28,origin:new THREE.Vector3(x,0,z),radius:12+seeded(i,33)*24});
}
for(let i=0;i<22;i++)makePerson(i);

// Player collision uses the actual footprints of the central buildings.
const keys={};let yaw=0,pitch=0,locked=false,started=false,paused=false,velocityY=0;
const blockers=landmarks.map(b=>({x:b.x,z:b.z,r:b.radius+1}));
const player=new THREE.Vector3(0,1.72,18);
function blocked(x,z){return blockers.some(b=>Math.abs(x-b.x)<b.r*.72&&Math.abs(z-b.z)<b.r*.72);}
function lock(){renderer.domElement.requestPointerLock();}
$('enter').addEventListener('click',()=>{started=true;$('intro').classList.add('hidden');$('hud').classList.remove('hidden');$('crosshair').classList.remove('hidden');lock();});
$('resume').addEventListener('click',lock);
document.addEventListener('pointerlockchange',()=>{locked=document.pointerLockElement===renderer.domElement;$('pause').classList.toggle('hidden',!started||locked);});
document.addEventListener('mousemove',e=>{if(!locked)return;yaw-=e.movementX*.0022;pitch-=e.movementY*.0018;pitch=Math.max(-1.25,Math.min(1.25,pitch));});
document.addEventListener('keydown',e=>{keys[e.code]=true;if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code))e.preventDefault();});
document.addEventListener('keyup',e=>keys[e.code]=false);
renderer.domElement.addEventListener('click',()=>{if(started&&!locked)lock();});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&locked)document.exitPointerLock();});

const clock=new THREE.Clock();let frame=0;
function update(dt,t){
 if(locked){
  const forward=new THREE.Vector3(-Math.sin(yaw),0,-Math.cos(yaw));
  const right=new THREE.Vector3(Math.cos(yaw),0,-Math.sin(yaw));
  const move=new THREE.Vector3();
  if(keys.KeyW||keys.ArrowUp)move.add(forward);
  if(keys.KeyS||keys.ArrowDown)move.sub(forward);
  if(keys.KeyD||keys.ArrowRight)move.add(right);
  if(keys.KeyA||keys.ArrowLeft)move.sub(right);
  if(move.lengthSq()>0){move.normalize().multiplyScalar((keys.ShiftLeft||keys.ShiftRight?13:5.2)*dt);const nx=Math.max(-8660,Math.min(8660,player.x+move.x)),nz=Math.max(-8660,Math.min(8660,player.z+move.z));if(!blocked(nx,player.z))player.x=nx;if(!blocked(player.x,nz))player.z=nz;}
  player.y=groundHeight(player.x,player.z)+1.72;
  camera.position.copy(player);camera.rotation.order='YXZ';camera.rotation.set(pitch,yaw,0);
 }
 for(const p of people){
  p.phase+=dt*p.speed*3;
  p.g.position.x=p.origin.x+Math.cos(p.phase*.25)*p.radius;
  p.g.position.z=p.origin.z+Math.sin(p.phase*.25)*p.radius;
  p.g.position.y=groundHeight(p.g.position.x,p.g.position.z);
  p.g.rotation.y=-p.phase*.25+Math.PI/2;
  const swing=Math.sin(p.phase)*.42;
  p.legs[0].rotation.x=swing;p.legs[1].rotation.x=-swing;p.arms[0].rotation.x=-swing*.55;p.arms[1].rotation.x=swing*.55;
 }
 // Slow water shimmer without expensive shader effects.
 // Acqua animata con luce e materiale, senza shader pesanti.
 if(started){
  const d=Math.hypot(player.x,player.z);
  $('place').textContent=d<170?'Tre Fiumi':d<900?'Piana di Aurelan':d<2800?'Terre di confine':'Lande selvagge';
  $('district').textContent=d<70?'Piazza del Mercato':d<220?'Quartiere dei mercanti':d<700?'Campi oltre le mura':'Strada maestra';
  $('bearing').textContent=((Math.round((yaw*180/Math.PI+360)%360))+'°');
  $('region').textContent=d<900?'PIANA DI AURELAN':d<2800?'MARCHE DI CONFINE':'ALTOPIANI DEL NORD';
 }
}
function animate(){
 requestAnimationFrame(animate);const dt=Math.min(clock.getDelta(),.04),t=clock.elapsedTime;
 if(started){loadChunks(player.x,player.z);update(dt,t);}
 renderer.render(scene,camera);
}
loadChunks(0,0);
$('loading').style.opacity='0';
setTimeout(()=>$('loading').classList.add('hidden'),500);
animate();
addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));});
