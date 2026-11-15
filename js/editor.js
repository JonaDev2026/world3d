import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { TransformControls } from "three/addons/controls/TransformControls.js";

const GRID_SIZE = 40;
const SNAP = 0.5;
const COLORS = { Muro:0xd7d0c5, Pavimento:0xb6a995, Porta:0x9b7653, Finestra:0x91b9ca, Blocco:0x9da8b7, Albero:0x6e9a72 };

export class BuildEditor {
  constructor(container) {
    this.container = container;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xb8c0c8);
    this.camera = new THREE.PerspectiveCamera(45, 1, 0.1, 500);
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
    this.controls.maxDistance = 100;
    this.transform = new TransformControls(this.camera, this.renderer.domElement);
    this.transform.setMode("translate");
    this.transform.setTranslationSnap(SNAP);
    this.transform.addEventListener("dragging-changed", e => this.controls.enabled = !e.value);
    this.transform.addEventListener("objectChange", () => { if(this.selected) this.emitSelection(this.selected); });
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
    this.load();
    this.animate();
    this.pushHistory();
  }
  setupWorld() {
    const hemi = new THREE.HemisphereLight(0xffffff, 0x7b8490, 2.1); this.scene.add(hemi);
    const sun = new THREE.DirectionalLight(0xffffff, 2.3); sun.position.set(15,30,12); sun.castShadow=true; sun.shadow.mapSize.set(2048,2048); sun.shadow.camera.left=-30; sun.shadow.camera.right=30; sun.shadow.camera.top=30; sun.shadow.camera.bottom=-30; this.scene.add(sun);
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(GRID_SIZE,GRID_SIZE), new THREE.MeshStandardMaterial({color:0xe4e6e8, roughness:0.95}));
    ground.rotation.x=-Math.PI/2; ground.receiveShadow=true; ground.name="ground"; this.scene.add(ground); this.ground=ground;
    this.grid = new THREE.GridHelper(GRID_SIZE, GRID_SIZE*2, 0x8d969f, 0xb0b7be); this.grid.position.y=0.012; this.scene.add(this.grid);
    const border = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(GRID_SIZE,0.02,GRID_SIZE)), new THREE.LineBasicMaterial({color:0x77818b}));
    border.position.y=0.012; this.scene.add(border);
  }
  resize() { const w=this.container.clientWidth, h=this.container.clientHeight; if(!w||!h)return; this.camera.aspect=w/h; this.camera.updateProjectionMatrix(); this.renderer.setSize(w,h); }
  animate = () => { this.frame=requestAnimationFrame(this.animate); this.controls.update(); this.renderer.render(this.scene,this.camera); };
  setTool(tool) { this.tool=tool; this.transform.detach(); if(tool==="select"&&this.selected)this.transform.attach(this.selected); }
  setTransform(mode) { if(!this.selected)return; this.transform.setMode(mode); this.transform.attach(this.selected); }
  toggleGrid() { this.gridVisible=!this.gridVisible; this.grid.visible=this.gridVisible; }
  toggleSnap() { this.snap=!this.snap; this.transform.setTranslationSnap(this.snap?SNAP:null); }
  setTopView(top) { if(top){this.camera.position.set(0,42,0.01);this.controls.target.set(0,0,0);this.controls.maxPolarAngle=Math.PI;}else{this.camera.position.set(28,24,28);this.controls.target.set(0,0,0);this.controls.maxPolarAngle=Math.PI*.49;} this.camera.lookAt(0,0,0); }
  zoom(factor) { this.camera.position.sub(this.controls.target).multiplyScalar(factor).add(this.controls.target); }
  resetView() { this.camera.position.set(28,24,28);this.controls.target.set(0,0,0);this.controls.maxPolarAngle=Math.PI*.49; }
  snapValue(v) { return this.snap?Math.round(v/SNAP)*SNAP:v; }
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
  addItem(kind,x,z,restored={}) {
    const map={
      wall:{label:"Muro",size:[3,2.8,.18],color:COLORS.Muro,geo:"box"},
      floor:{label:"Pavimento",size:[3,.12,3],color:COLORS.Pavimento,geo:"box"},
      door:{label:"Porta",size:[.95,2.1,.12],color:COLORS.Porta,geo:"box"},
      window:{label:"Finestra",size:[1.4,1.1,.12],color:COLORS.Finestra,geo:"box"},
      cube:{label:"Blocco",size:[1,1,1],color:COLORS.Blocco,geo:"box"},
      tree:{label:"Albero",size:[1.2,3,1.2],color:COLORS.Albero,geo:"tree"}
    };
    const cfg=map[kind];if(!cfg)return;
    const size=restored.size||{x:cfg.size[0],y:cfg.size[1],z:cfg.size[2]};
    const group=new THREE.Group();group.position.set(restored.x??x,0,restored.z??z);group.rotation.y=restored.rotation||0;
    group.userData={root:true,kind:cfg.label,label:cfg.label,size:{...size}};
    if(kind==="tree"){
      const trunk=new THREE.Mesh(new THREE.CylinderGeometry(.13,.18,1.25,8),new THREE.MeshStandardMaterial({color:0x806047}));
      trunk.position.y=.625;trunk.castShadow=true;group.add(trunk);
      const crown=new THREE.Mesh(new THREE.SphereGeometry(.72,12,10),new THREE.MeshStandardMaterial({color:cfg.color}));
      crown.position.y=2.05;crown.scale.set(1,1.35,1);crown.castShadow=true;group.add(crown);
      group.userData.size={x:1.2,y:3,z:1.2};
    }else{
      const mesh=new THREE.Mesh(new THREE.BoxGeometry(size.x,size.y,size.z),new THREE.MeshStandardMaterial({color:cfg.color,roughness:.82}));
      mesh.position.y=size.y/2;mesh.castShadow=true;mesh.receiveShadow=true;mesh.userData.root=group;group.add(mesh);
    }
    group.traverse(o=>{if(o.isMesh)o.userData.root=group;});
    this.scene.add(group);this.items.push(group);this.select(group);this.emitChange();this.pushHistory();return group;
  }
  select(item) { this.selected=item;this.transform.detach();if(item){this.transform.attach(item);this.transform.setMode("translate");}this.selectionCallbacks.forEach(fn=>fn(item)); }
  emitSelection(item){this.selectionCallbacks.forEach(fn=>fn(item));}
  onSelection(fn){this.selectionCallbacks.push(fn);}
  onChange(fn){this.changeCallbacks.push(fn);fn(this.items.length);}
  emitChange(){this.changeCallbacks.forEach(fn=>fn(this.items.length));}
  deleteSelected(){if(!this.selected)return;this.scene.remove(this.selected);this.items=this.items.filter(i=>i!==this.selected);this.select(null);this.emitChange();this.pushHistory();}
  duplicateSelected(){if(!this.selected)return;const d=this.serializeItem(this.selected);d.x+=1;d.z+=1;this.addItem(d.kind,d.x,d.z,{...d,size:d.size});}
  updateSelected(key,value){if(!this.selected)return;const o=this.selected;if(key==="x"||key==="z")o.position[key]=this.snapValue(value);if(key==="rotation")o.rotation.y=value*Math.PI/180;if(key==="sx"||key==="sy"||key==="sz"){const k=key==="sx"?"x":key==="sy"?"y":"z";o.userData.size[k]=Math.max(.1,value);const mesh=o.children.find(c=>c.isMesh);if(mesh){mesh.geometry.dispose();mesh.geometry=new THREE.BoxGeometry(o.userData.size.x,o.userData.size.y,o.userData.size.z);mesh.position.y=o.userData.size.y/2;}}this.emitSelection(o);this.emitChange();this.pushHistory();}
  serializeItem(o){return {kind:o.userData.kind==="Muro"?"wall":o.userData.kind==="Pavimento"?"floor":o.userData.kind==="Porta"?"door":o.userData.kind==="Finestra"?"window":o.userData.kind==="Albero"?"tree":"cube",x:o.position.x,z:o.position.z,rotation:o.rotation.y,size:{...o.userData.size}};}
  save(){localStorage.setItem("build-editor-scene",JSON.stringify(this.items.map(o=>this.serializeItem(o))));}
  load(){try{const data=JSON.parse(localStorage.getItem("build-editor-scene")||"[]");data.forEach(d=>this.addItem(d.kind,d.x,d.z,d));this.select(null);}catch(e){console.warn("Salvataggio non leggibile",e);}}
  clear(){this.items.forEach(o=>this.scene.remove(o));this.items=[];this.select(null);this.emitChange();this.pushHistory();}
  pushHistory(){if(this.restoring)return;const state=JSON.stringify(this.items.map(o=>this.serializeItem(o)));if(this.history[this.historyIndex]===state)return;this.history=this.history.slice(0,this.historyIndex+1);this.history.push(state);if(this.history.length>40)this.history.shift();this.historyIndex=this.history.length-1;}
  restoreHistory(index){if(index<0||index>=this.history.length)return;this.historyIndex=index;this.restoring=true;this.items.forEach(o=>this.scene.remove(o));this.items=[];JSON.parse(this.history[index]).forEach(d=>this.addItem(d.kind,d.x,d.z,d));this.restoring=false;this.select(null);this.emitChange();}
  undo(){this.restoreHistory(this.historyIndex-1);}
  redo(){this.restoreHistory(this.historyIndex+1);}
  dispose(){cancelAnimationFrame(this.frame);this.resizeObserver.disconnect();this.renderer.dispose();}
}