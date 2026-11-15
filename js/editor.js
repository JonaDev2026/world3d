import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { TransformControls } from "three/addons/controls/TransformControls.js";

const DEFAULT_WIDTH = 40;
const DEFAULT_DEPTH = 40;
const SNAP = 0.1;
const COLORS = { Muro:0xd7d0c5, Pavimento:0xb6a995, Porta:0x9b7653, Finestra:0x91b9ca, Blocco:0x9da8b7, Albero:0x6e9a72 };
const TEXTURE_CACHE = new Map();
function makeGrid(width, depth) {
  const points=[];
  // Keep the viewport light on kilometre-scale plots; transform snap remains 0.1 m.
  const step=Math.max(SNAP,Math.ceil(Math.max(width,depth)/200)*SNAP);
  for(let x=-width/2;x<=width/2+0.0001;x+=step){points.push(x,0,-depth/2,x,0,depth/2);}
  for(let z=-depth/2;z<=depth/2+0.0001;z+=step){points.push(-width/2,0,z,width/2,0,z);}
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute("position",new THREE.Float32BufferAttribute(points,3));
  return new THREE.LineSegments(geometry,new THREE.LineBasicMaterial({color:0x9ca5ae,transparent:true,opacity:.58}));
}

function makeTexture(type) {
  if (type === "none") return null;
  if (TEXTURE_CACHE.has(type)) return TEXTURE_CACHE.get(type);
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 256;
  const ctx = canvas.getContext("2d");
  const fill = (color) => { ctx.fillStyle = color; ctx.fillRect(0, 0, 256, 256); };
  if (type === "wood") {
    fill("#a97850");
    for (let y=0;y<256;y+=3) { ctx.strokeStyle = y%17===0 ? "#68452f" : y%7===0 ? "#d5a477" : "#8e603e"; ctx.lineWidth=y%17===0?2:1; ctx.beginPath(); ctx.moveTo(0,y); ctx.bezierCurveTo(70,y-4,170,y+4,256,y); ctx.stroke(); }
    for(let x=64;x<256;x+=96){ctx.strokeStyle="#68452f";ctx.lineWidth=2;ctx.strokeRect(x,0,1,256);}
  } else if (type === "tile") {
    fill("#d8d3ca");ctx.strokeStyle="#8e8981";ctx.lineWidth=4;
    for(let y=0;y<=256;y+=64){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(256,y);ctx.stroke();}
    for(let row=0;row<4;row++){const offset=row%2?32:0;for(let x=offset;x<=256;x+=64){ctx.beginPath();ctx.moveTo(x,row*64);ctx.lineTo(x,(row+1)*64);ctx.stroke();}}
  } else if (type === "marble") {
    fill("#e3dfd7");
    for(let i=0;i<18;i++){ctx.strokeStyle=i%3===0?"#9b9a96":"#c0bbb2";ctx.lineWidth=i%3===0?2:1;ctx.beginPath();let x=Math.random()*256;ctx.moveTo(x,0);for(let y=0;y<=256;y+=32){x+=Math.sin(y/35+i)*8;ctx.lineTo(x,y);}ctx.stroke();}
  } else if (type === "concrete") {
    fill("#999b99");for(let i=0;i<1800;i++){ctx.fillStyle=i%2?"#858987":"#b0b2ae";ctx.globalAlpha=.25+Math.random()*.35;ctx.fillRect(Math.random()*256,Math.random()*256,1+Math.random()*3,1+Math.random()*3);}ctx.globalAlpha=1;
  } else if (type === "brick") {
    fill("#a65f4b");ctx.strokeStyle="#d4a18d";ctx.lineWidth=4;
    for(let y=0;y<256;y+=32){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(256,y);ctx.stroke();const off=(y/32)%2?64:0;for(let x=off;x<256;x+=128){ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x,y+32);ctx.stroke();}}
  } else if (type === "fabric") {
    fill("#858d87");ctx.strokeStyle="#aeb6af";ctx.lineWidth=1;
    for(let i=0;i<256;i+=4){ctx.beginPath();ctx.moveTo(i,0);ctx.lineTo(i,256);ctx.moveTo(0,i);ctx.lineTo(256,i);ctx.stroke();}
  } else if (type === "metal") {
    const g=ctx.createLinearGradient(0,0,256,0);g.addColorStop(0,"#686e73");g.addColorStop(.25,"#c6cbd0");g.addColorStop(.5,"#858b91");g.addColorStop(.75,"#d7dbde");g.addColorStop(1,"#70767b");fill(g);
  } else if (type === "glass") {
    const g=ctx.createLinearGradient(0,0,256,256);g.addColorStop(0,"#d9f4ff");g.addColorStop(.48,"#8bbdce");g.addColorStop(.52,"#effcff");g.addColorStop(1,"#8bbdce");fill(g);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  // Texture patterns are authored in physical metres, not stretched over the
  // whole object: tile = 10 cm, brick = 50 cm, other patterns = 1 m.
  TEXTURE_CACHE.set(type, texture);
  return texture;
}

export class BuildEditor {
  constructor(container) {
    this.container = container;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xb8c0c8);
    this.camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000000);
    this.camera.position.set(28, 24, 28);
    this.renderer = new THREE.WebGLRenderer({antialias:true});
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;
    container.appendChild(this.renderer.domElement);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.target.set(0,0,0);
    this.controls.maxPolarAngle = Math.PI * 0.49;
    this.controls.minDistance = 5;
    this.controls.maxDistance = 100000;
    this.transform = new TransformControls(this.camera, this.renderer.domElement);
    this.transform.setMode("translate");
    this.transform.setTranslationSnap(SNAP);
    this.transform.addEventListener("dragging-changed", e => this.controls.enabled = !e.value);
    this.transform.addEventListener("objectChange", () => { if(this.selected) { this.emitSelection(this.selected); this.emitChange(); this.pushHistory(); } });
    this.scene.add(this.transform.getHelper());
    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();
    this.items = [];
    this.selected = null;
    this.tool = "select";
    this.snap = true;
    this.gridVisible = true;
    this.selectionCallbacks = [];
    this.changeCallbacks = [];
    this.history = [];
    this.historyIndex = -1;
    this.restoring = false;
    this.setupWorld();
    this.renderer.domElement.addEventListener("pointerdown", this.onPointerDown);
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(container);
    this.resize();
    this.animate();
    this.pushHistory();
  }
  setupWorld() {
    this.planeWidth = DEFAULT_WIDTH;
    this.planeDepth = DEFAULT_DEPTH;
    const hemi = new THREE.HemisphereLight(0xffffff, 0x7b8490, 2.1); this.scene.add(hemi);
    const sun = new THREE.DirectionalLight(0xffffff, 2.3); sun.position.set(15,30,12); sun.castShadow=true; sun.shadow.mapSize.set(2048,2048); sun.shadow.camera.left=-30; sun.shadow.camera.right=30; sun.shadow.camera.top=30; sun.shadow.camera.bottom=-30; this.scene.add(sun);
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(this.planeWidth,this.planeDepth), new THREE.MeshStandardMaterial({color:0xe4e6e8, roughness:0.95}));
    ground.rotation.x=-Math.PI/2; ground.receiveShadow=true; ground.name="ground"; this.scene.add(ground); this.ground=ground;
    this.grid = makeGrid(this.planeWidth,this.planeDepth); this.grid.position.y=0.012; this.scene.add(this.grid);
    const border = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(this.planeWidth,0.02,this.planeDepth)), new THREE.LineBasicMaterial({color:0x77818b}));
    border.position.y=0.012; this.scene.add(border); this.border=border;
  }
  setPlaneSize(width, depth) {
    const w=Math.max(0.1,Math.round(Number(width)*10)/10);
    const d=Math.max(0.1,Math.round(Number(depth)*10)/10);
    if(!Number.isFinite(w)||!Number.isFinite(d)) return;
    this.planeWidth=w; this.planeDepth=d;
    this.ground.geometry.dispose();
    this.ground.geometry=new THREE.PlaneGeometry(w,d);
    this.scene.remove(this.grid); this.grid.geometry.dispose(); this.grid.material.dispose();
    this.grid=makeGrid(w,d);
    this.grid.position.y=0.012; this.grid.visible=this.gridVisible; this.scene.add(this.grid);
    this.scene.remove(this.border); this.border.geometry.dispose(); this.border.material.dispose();
    this.border=new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(w,0.02,d)),new THREE.LineBasicMaterial({color:0x77818b}));
    this.border.position.y=0.012; this.scene.add(this.border);
    this.controls.maxDistance=Math.max(100,w,d)*2;
    this.camera.far=Math.max(1000,w,d)*10;
    this.camera.updateProjectionMatrix();
    this.controls.target.set(0,0,0);
    this.emitPlaneSize?.(w,d);
  }
  onPlaneSize(fn) { this.emitPlaneSize=fn; fn(this.planeWidth,this.planeDepth); }
  resize() { const w=this.container.clientWidth, h=this.container.clientHeight; if(!w||!h)return; this.camera.aspect=w/h; this.camera.updateProjectionMatrix(); this.renderer.setSize(w,h); }
  animate = () => { this.frame=requestAnimationFrame(this.animate); this.controls.update(); this.renderer.render(this.scene,this.camera); };
  setTool(tool) { this.tool=tool; this.transform.detach(); if(tool==="select"&&this.selected)this.transform.attach(this.selected); }
  setTransform(mode) { if(!this.selected)return; this.transform.setMode(mode); this.transform.attach(this.selected); }
  toggleGrid() { this.gridVisible=!this.gridVisible; this.grid.visible=this.gridVisible; }
  toggleSnap() { this.snap=!this.snap; this.transform.setTranslationSnap(this.snap?SNAP:null); }
  setTopView(top) { if(top){this.camera.position.set(0,42,0.01);this.controls.target.set(0,0,0);this.controls.maxPolarAngle=Math.PI;}else{this.camera.position.set(28,24,28);this.controls.target.set(0,0,0);this.controls.maxPolarAngle=Math.PI*.49;} this.camera.lookAt(0,0,0); }
  zoom(factor) { this.camera.position.sub(this.controls.target).multiplyScalar(factor).add(this.controls.target); }
  resetView() { this.camera.position.set(28,24,28);this.controls.target.set(0,0,0);this.controls.maxPolarAngle=Math.PI*.49; }
  snapValue(v) { return this.snap?Math.round(v*10)/10:v; }
  onPointerDown = (event) => {
    if(event.button!==0 || this.transform.dragging)return;
    const rect=this.renderer.domElement.getBoundingClientRect();
    this.pointer.x=((event.clientX-rect.left)/rect.width)*2-1;
    this.pointer.y=-((event.clientY-rect.top)/rect.height)*2+1;
    this.raycaster.setFromCamera(this.pointer,this.camera);
    const hits=this.raycaster.intersectObjects(this.items,true);
    if(this.tool==="select"){
      const hit=hits.find(h=>h.object.userData.root);
      if(hit){this.select(hit.object.userData.root);return;}
      if(hits.length){let p=hits[0].object;while(p&&!p.userData.root)p=p.parent;if(p)this.select(p);return;}
      this.select(null);return;
    }
    const groundHit=this.raycaster.intersectObject(this.ground)[0];
    if(!groundHit)return;
    const x=this.snapValue(groundHit.point.x), z=this.snapValue(groundHit.point.z);
    this.addItem(this.tool,x,z);
  };
  createMaterial(color, texture, finish, dimensions={x:1,y:1,z:1}) {
    const finishes = {matte:{roughness:.92,metalness:0},satin:{roughness:.48,metalness:0},glossy:{roughness:.16,metalness:.05},metallic:{roughness:.28,metalness:.82}};
    const opts=finishes[finish]||finishes.matte;
    const type=texture||"none";
    const source=makeTexture(type);
    const map=source?source.clone():null;
    if(map){
      // The tile canvas contains 4x4 tiles: 2.5 texture repeats per metre
      // produce 10 cm tiles. Brick canvas: 2 bricks wide and 8 high.
      const densityX=type==="tile"?2.5:type==="brick"?1:1;
      const densityY=type==="tile"?2.5:type==="brick"?0.5:1;
      map.repeat.set(Math.max(dimensions.x,dimensions.z)*densityX,Math.max(dimensions.y,dimensions.z)*densityY);
      map.needsUpdate=true;
    }
    return new THREE.MeshStandardMaterial({color, map, roughness:opts.roughness, metalness:opts.metalness, transparent:type==="glass", opacity:type==="glass"?.58:1});
  }
  applyMaterial(item, settings={}) {
    const color=settings.color||item.userData.materialColor||"#d7d0c5";
    const texture=settings.texture||item.userData.texture||"none";
    const finish=settings.finish||item.userData.finish||"matte";
    item.userData.materialColor=color;item.userData.texture=texture;item.userData.finish=finish;
    item.traverse((obj)=>{
      if(!obj.isMesh)return;
      const old=obj.material;
      const p=obj.geometry?.parameters||{};
      const dimensions={x:p.width||1,y:p.height||1,z:p.depth||1};
      obj.material=this.createMaterial(color,texture,finish,dimensions);
      if(old){const materials=Array.isArray(old)?old:[old];materials.forEach(m=>{if(m.map)m.map.dispose();m.dispose();});}
    });
  }
  addItem(kind,x,z,restored={}) {
    const map={
      wall:{label:"Muro",size:[3,2.8,.18],color:COLORS.Muro},
      floor:{label:"Pavimento",size:[3,.12,3],color:COLORS.Pavimento},
      door:{label:"Porta",size:[.95,2.1,.12],color:COLORS.Porta},
      window:{label:"Finestra",size:[1.4,1.1,.12],color:COLORS.Finestra},
      cube:{label:"Blocco",size:[1,1,1],color:COLORS.Blocco},
      tree:{label:"Albero",size:[1.2,3,1.2],color:COLORS.Albero}
    };
    const cfg=map[kind];if(!cfg)return;
    const size=restored.size||{x:cfg.size[0],y:cfg.size[1],z:cfg.size[2]};
    const group=new THREE.Group();group.position.set(restored.x??x,0,restored.z??z);group.rotation.y=restored.rotation||0;
    group.userData={root:true,kind:cfg.label,label:cfg.label,size:{...size}};
    if(kind==="tree"){
      const trunk=new THREE.Mesh(new THREE.CylinderGeometry(.13,.18,1.25,8),this.createMaterial(restored.color||"#806047","none","matte"));
      trunk.position.y=.625;trunk.castShadow=true;group.add(trunk);
      const crown=new THREE.Mesh(new THREE.SphereGeometry(.72,12,10),this.createMaterial(restored.color||"#6e9a72",restored.texture||"none",restored.finish||"matte"));
      crown.position.y=2.05;crown.scale.set(1,1.35,1);crown.castShadow=true;group.add(crown);
      group.userData.size={x:1.2,y:3,z:1.2};
    }else{
      const mesh=new THREE.Mesh(new THREE.BoxGeometry(size.x,size.y,size.z),this.createMaterial(restored.color||"#"+cfg.color.toString(16).padStart(6,"0"),restored.texture||"none",restored.finish||"matte",size));
      mesh.position.y=size.y/2;mesh.castShadow=true;mesh.receiveShadow=true;mesh.userData.root=group;group.add(mesh);
    }
    group.traverse(o=>{if(o.isMesh)o.userData.root=group;});
    group.userData.materialColor=restored.color||"#"+cfg.color.toString(16).padStart(6,"0");
    group.userData.texture=restored.texture||"none";group.userData.finish=restored.finish||"matte";
    this.scene.add(group);this.items.push(group);this.select(group);this.emitChange();this.pushHistory();return group;
  }
  select(item) { this.selected=item;this.transform.detach();if(item){this.transform.attach(item);this.transform.setMode("translate");}this.selectionCallbacks.forEach(fn=>fn(item)); }
  emitSelection(item){this.selectionCallbacks.forEach(fn=>fn(item));}
  onSelection(fn){this.selectionCallbacks.push(fn);}
  onChange(fn){this.changeCallbacks.push(fn);fn(this.items.length);}
  emitChange(){this.changeCallbacks.forEach(fn=>fn(this.items.length));}
  deleteSelected(){if(!this.selected)return;this.scene.remove(this.selected);this.items=this.items.filter(i=>i!==this.selected);this.select(null);this.emitChange();this.pushHistory();}
  duplicateSelected(){if(!this.selected)return;const d=this.serializeItem(this.selected);d.x+=1;d.z+=1;this.addItem(d.kind,d.x,d.z,d);}
  updateSelected(key,value){if(!this.selected)return;const o=this.selected;
    if(key==="x"||key==="z")o.position[key]=this.snapValue(value);
    if(key==="rotation")o.rotation.y=value*Math.PI/180;
    if(key==="sx"||key==="sy"||key==="sz"){const k=key==="sx"?"x":key==="sy"?"y":"z";o.userData.size[k]=Math.max(.1,Math.round(value*10)/10);const mesh=o.children.find(c=>c.isMesh);if(mesh&&mesh.geometry.type==="BoxGeometry"){mesh.geometry.dispose();mesh.geometry=new THREE.BoxGeometry(o.userData.size.x,o.userData.size.y,o.userData.size.z);mesh.position.y=o.userData.size.y/2;}}
    if(key==="color"||key==="texture"||key==="finish"){this.applyMaterial(o,{[key]:value});}
    this.emitSelection(o);this.emitChange();this.pushHistory();
  }
  serializeItem(o){return {kind:o.userData.kind==="Muro"?"wall":o.userData.kind==="Pavimento"?"floor":o.userData.kind==="Porta"?"door":o.userData.kind==="Finestra"?"window":o.userData.kind==="Albero"?"tree":"cube",x:o.position.x,z:o.position.z,rotation:o.rotation.y,size:{...o.userData.size},color:o.userData.materialColor,texture:o.userData.texture,finish:o.userData.finish};}
  projectData(){return {format:"world3d-project",version:1,plane:{width:this.planeWidth,depth:this.planeDepth},items:this.items.map(o=>this.serializeItem(o))};}
  importProject(data){
    if(!data||data.format!=="world3d-project"||data.version!==1||!data.plane||!Array.isArray(data.items))throw new Error("Formato progetto non valido o non supportato.");
    const width=Number(data.plane.width),depth=Number(data.plane.depth);
    if(!Number.isFinite(width)||!Number.isFinite(depth)||width<0.1||depth<0.1)throw new Error("Dimensioni del piano non valide.");
    const allowed=new Set(["wall","floor","door","window","cube","tree"]);
    if(data.items.some(item=>!item||!allowed.has(item.kind)||!Number.isFinite(Number(item.x))||!Number.isFinite(Number(item.z))))throw new Error("Il progetto contiene elementi non validi.");
    this.restoring=true;
    this.items.forEach(o=>this.scene.remove(o));this.items=[];
    this.setPlaneSize(width,depth);
    data.items.forEach(d=>this.addItem(d.kind,Number(d.x),Number(d.z),d));
    this.restoring=false;this.select(null);this.emitChange();
    this.history=[];this.historyIndex=-1;this.pushHistory();
  }
  clear(){this.items.forEach(o=>this.scene.remove(o));this.items=[];this.select(null);this.emitChange();this.pushHistory();}
  pushHistory(){if(this.restoring)return;const state=JSON.stringify(this.items.map(o=>this.serializeItem(o)));if(this.history[this.historyIndex]===state)return;this.history=this.history.slice(0,this.historyIndex+1);this.history.push(state);if(this.history.length>40)this.history.shift();this.historyIndex=this.history.length-1;}
  restoreHistory(index){if(index<0||index>=this.history.length)return;this.historyIndex=index;this.restoring=true;this.items.forEach(o=>this.scene.remove(o));this.items=[];JSON.parse(this.history[index]).forEach(d=>this.addItem(d.kind,d.x,d.z,d));this.restoring=false;this.select(null);this.emitChange();}
  undo(){this.restoreHistory(this.historyIndex-1);}
  redo(){this.restoreHistory(this.historyIndex+1);}
  dispose(){cancelAnimationFrame(this.frame);this.resizeObserver.disconnect();this.renderer.dispose();}
}
