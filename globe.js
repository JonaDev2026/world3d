// globe.js — own 3D globe (local Three.js, no map services). Renders a planet from planet.js.
import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js";
import {TERRAIN,cellAt} from "./planet.js";
const D2R=Math.PI/180,R_KM=6371,TEX_W=2048,TEX_H=1024;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export const BIOME_IT=["Oceano","Ghiacci","Tundra","Taiga","Foresta temperata","Prateria","Deserto","Savana","Foresta pluviale","Alta montagna","Lago","Mare basso"];
const PAL=new Uint8Array([22,62,112, 238,243,248, 186,192,168, 86,122,94, 64,130,68, 148,176,92, 222,197,141, 192,177,92, 30,112,62, 152,146,140, 86,150,200, 110,170,205]);
const FERT=[0,0,.15,.3,.85,1,.05,.7,.6,.1,0,0];
export const toVec=(lat,lon)=>{const a=lat*D2R,o=lon*D2R;return[Math.cos(a)*Math.cos(o),Math.sin(a),-Math.cos(a)*Math.sin(o)];};
export const fromVec=(x,y,z)=>({latitude:Math.asin(clamp(y,-1,1))/D2R,longitude:Math.atan2(-z,x)/D2R});
const hexRgb=h=>{const m=/^#?([0-9a-f]{6})$/i.exec(h||"");const n=m?parseInt(m[1],16):0x888888;return[n>>16&255,n>>8&255,n&255];};

// ---- pixel layers (resolution independent from the simulation) ----
export function buildLayers(p,W=TEX_W,H=TEX_H){
 const N=W*H,alt=new Float32Array(N),biome=new Uint8Array(N),river=new Uint8Array(N),terr=new Uint8Array(N),shade=new Uint8Array(N),landBiome=new Uint32Array(12),pw=p.w,ph=p.h;
 for(let y=0;y<H;y++){
  const fy=(y+.5)/H*ph-.5,y0=Math.floor(fy),ty=fy-y0,ya=clamp(y0,0,ph-1),yb=clamp(y0+1,0,ph-1);
  for(let x=0;x<W;x++){
   const fx=(x+.5)/W*pw-.5,x0=Math.floor(fx),tx=fx-x0,xa=((x0%pw)+pw)%pw,xb=(xa+1)%pw;
   const c00=ya*pw+xa,c10=ya*pw+xb,c01=yb*pw+xa,c11=yb*pw+xb,w00=(1-tx)*(1-ty),w10=tx*(1-ty),w01=(1-tx)*ty,w11=tx*ty;
   const a=p.alt[c00]*w00+p.alt[c10]*w10+p.alt[c01]*w01+p.alt[c11]*w11,i=y*W+x,land=a>0;alt[i]=a;
   let best=-1,bw=-1;
   if((p.alt[c00]>0)===land&&w00>bw){bw=w00;best=c00;}
   if((p.alt[c10]>0)===land&&w10>bw){bw=w10;best=c10;}
   if((p.alt[c01]>0)===land&&w01>bw){bw=w01;best=c01;}
   if((p.alt[c11]>0)===land&&w11>bw){bw=w11;best=c11;}
   if(best<0)best=c00;
   biome[i]=p.biome[best];terr[i]=p.terrain[best];river[i]=land?p.river[best]:0;
   if(land)landBiome[biome[i]]++;
  }
 }
 for(let y=0;y<H;y++)for(let x=0;x<W;x++){
  const i=y*W+x;if(alt[i]<=0){shade[i]=100;continue;}
  const nw=alt[Math.max(0,y-1)*W+Math.max(0,x-1)],se=alt[Math.min(H-1,y+1)*W+Math.min(W-1,x+1)];
  shade[i]=Math.round(clamp(1+clamp((nw-se)/3000,-.3,.3),.65,1.3)*100);
 }
 return{W,H,alt,biome,river,terr,shade,landBiome};
}

// ---- compose one mode into RGBA bytes ----
// sites: [{latitude,longitude,population,radiusKm,color:"#rrggbb"}]
export function composeInto(L,mode,sites,out){
 const{W,H,alt,biome,river,terr,shade}=L,N=W*H;
 const cLat=new Float32Array(H),sLat=new Float32Array(H),cLon=new Float32Array(W),sLon=new Float32Array(W);
 for(let y=0;y<H;y++){const a=(90-(y+.5)*180/H)*D2R;cLat[y]=Math.cos(a);sLat[y]=Math.sin(a);}
 for(let x=0;x<W;x++){const a=((x+.5)*360/W-180)*D2R;cLon[x]=Math.cos(a);sLon[x]=Math.sin(a);}
 const S=sites.map(s=>{const v=toVec(s.latitude,s.longitude),sigma=Math.max(70,s.radiusKm*.8);return{x:v[0],y:v[1],z:v[2],cosR:Math.cos(Math.min(3,s.radiusKm/R_KM)),sigma,cut:Math.cos(Math.min(3,sigma*3/R_KM)),pop:s.population||0,rgb:hexRgb(s.color)};});
 let owner=null,dens=null;
 if(S.length&&(mode==="politica"||mode==="popolazione")){
  if(mode==="politica")owner=new Int16Array(N).fill(-1);else dens=new Float32Array(N);
  for(let y=0;y<H;y++)for(let x=0;x<W;x++){
   const i=y*W+x;if(alt[i]<=0||terr[i]===TERRAIN.LAKE)continue;
   const vx=cLat[y]*cLon[x],vy=sLat[y],vz=-cLat[y]*sLon[x];
   if(owner){let best=-1,bd=-2;for(let k=0;k<S.length;k++){const s=S[k],d=vx*s.x+vy*s.y+vz*s.z;if(d>=s.cosR&&d>bd){bd=d;best=k;}}owner[i]=best;}
   else{let v=0;for(let k=0;k<S.length;k++){const s=S[k],d=vx*s.x+vy*s.y+vz*s.z;if(d<s.cut)continue;const ang=Math.acos(Math.min(1,d))*R_KM/s.sigma;v+=s.pop*Math.exp(-ang*ang);}dens[i]=v;}
  }
 }
 let maxPop=1;for(const s of S)maxPop=Math.max(maxPop,s.pop);const logMax=Math.log10(1+maxPop);
 for(let y=0;y<H;y++)for(let x=0;x<W;x++){
  const i=y*W+x,o=i*4,a=alt[i],land=a>0,sh=shade[i]/100,b=biome[i];let r,g,bl;
  if(!land){const t=Math.sqrt(clamp(-a/6000,0,1));
   if(mode==="geografia"){r=120+(24-120)*t;g=178+(66-178)*t;bl=210+(118-210)*t;}else{r=214+(188-214)*t;g=229+(208-229)*t;bl=240+(226-240)*t;}}
  else if(mode==="geografia"){r=PAL[b*3]*sh;g=PAL[b*3+1]*sh;bl=PAL[b*3+2]*sh;if(river[i]){const t=.35+river[i]/255*.5;r+=(70-r)*t;g+=(130-g)*t;bl+=(200-bl)*t;}}
  else{
   const m=.8+.2*sh;r=236*m;g=233*m;bl=224*m;
   if(b===10||river[i]){const t=b===10?.9:.6;r+=(150-r)*t;g+=(185-g)*t;bl+=(220-bl)*t;}
   if(mode==="risorse"){
    const f=FERT[b]+(river[i]?.2:0),fc=clamp(f,0,1);let cr,cg,cb;
    if(fc<.45){const t=fc/.45;cr=200+(225-200)*t;cg=165+(210-165)*t;cb=120+(120-120)*t;}else{const t=(fc-.45)/.55;cr=225+(72-225)*t;cg=210+(150-210)*t;cb=120+(72-120)*t;}
    if(b!==10&&!river[i]){r=cr*m;g=cg*m;bl=cb*m;}else{r=70;g=130;bl=200;}
    if(terr[i]===TERRAIN.MOUNTAIN){r+=(150-r)*.55;g+=(125-g)*.55;bl+=(165-bl)*.55;}
   }else if(mode==="politica"&&owner){
    const k=owner[i];
    if(k>=0){const c=S[k].rgb;r+=(c[0]-r)*.5;g+=(c[1]-g)*.5;bl+=(c[2]-bl)*.5;
     const edge=(x>0&&owner[i-1]!==k)||(x<W-1&&owner[i+1]!==k)||(y>0&&owner[i-W]!==k)||(y<H-1&&owner[i+W]!==k);
     if(edge){r+=(c[0]*.55-r)*.9;g+=(c[1]*.55-g)*.9;bl+=(c[2]*.55-bl)*.9;}}
   }else if(mode==="popolazione"&&dens){
    const t=clamp(Math.log10(1+dens[i])/logMax,0,1);
    if(t>.02){let cr,cg,cb;if(t<.5){const u=t/.5;cr=255+(245-255)*u;cg=240+(150-240)*u;cb=150+(60-150)*u;}else{const u=(t-.5)/.5;cr=245+(190-245)*u;cg=150+(40-150)*u;cb=60+(50-60)*u;}
     const al=Math.min(.88,.25+t*.8);r+=(cr-r)*al;g+=(cg-g)*al;bl+=(cb-bl)*al;}
   }
  }
  out[o]=r;out[o+1]=g;out[o+2]=bl;out[o+3]=255;
 }
}
function makeLegend(L,mode,sites){
 const rgb=(r,g,b)=>"rgb("+r+","+g+","+b+")";
 if(mode==="politica"){
  const seen=new Map();for(const s of sites)if(!seen.has(s.polity))seen.set(s.polity,s.color);
  return[...[...seen].map(([label,color])=>({color,label})),{color:rgb(236,233,224),label:"Terre non reclamate"},{color:rgb(214,229,240),label:"Acque"}];
 }
 if(mode==="popolazione"){const tot=sites.reduce((a,s)=>a+(s.population||0),0);return[{color:rgb(255,240,150),label:"Bassa densità"},{color:rgb(245,150,60),label:"Media"},{color:rgb(190,40,50),label:"Alta"},{color:"#3978df",label:"Insediamenti: "+sites.length+" · "+tot+" abitanti"}];}
 if(mode==="risorse")return[{color:rgb(72,150,72),label:"Terreno fertile"},{color:rgb(200,165,120),label:"Terreno povero"},{color:rgb(70,130,200),label:"Acque dolci"},{color:rgb(150,125,165),label:"Rilievi (potenziali minerali)"},{color:"#d9a441",label:"Insediamenti (riserve)"}];
 const total=L.landBiome.reduce((a,b)=>a+b,0)||1,list=[];
 for(let b=1;b<=9;b++)if(L.landBiome[b]/total>=.004)list.push({b,n:L.landBiome[b]});
 list.sort((p,q)=>q.n-p.n);
 return[{color:rgb(24,66,118),label:"Oceano"},...list.map(e=>({color:rgb(PAL[e.b*3],PAL[e.b*3+1],PAL[e.b*3+2]),label:BIOME_IT[e.b]})),{color:rgb(70,130,200),label:"Fiumi e laghi"},...(sites.length?[{color:"#d94f55",label:"Insediamenti"}]:[])];
}

// ---- Three.js globe ----
const VS="varying vec2 vUv;varying vec3 vN;void main(){vUv=uv;vN=normalize(mat3(modelMatrix)*normal);gl_Position=projectionMatrix*viewMatrix*modelMatrix*vec4(position,1.0);}";
const FS="uniform sampler2D map;uniform vec3 sunDir;varying vec2 vUv;varying vec3 vN;void main(){vec3 c=texture2D(map,vUv).rgb;float d=dot(normalize(vN),normalize(sunDir));float k=smoothstep(-0.1,0.2,d);vec3 day=c*(0.6+0.4*max(d,0.0));vec3 night=c*vec3(0.12,0.15,0.26);gl_FragColor=vec4(mix(night,day,k),1.0);\n#include <colorspace_fragment>\n}";
const AVS="varying vec3 vN;void main(){vN=normalize(normalMatrix*normal);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}";
const AFS="varying vec3 vN;void main(){float a=clamp(-dot(vN,vec3(0.0,0.0,1.0)),0.0,1.0);float g=smoothstep(0.0,0.36,a);gl_FragColor=vec4(0.42,0.66,1.0,g*g*0.55);}";
const CSS='.g-wrap{position:relative;width:100%;height:100%;overflow:hidden;touch-action:none;cursor:grab;user-select:none}.g-wrap:active{cursor:grabbing}.g-wrap canvas{display:block;width:100%;height:100%}.g-label{position:absolute;transform:translate(-50%,0);margin-top:9px;font:600 12px/1.1 "Google Sans",system-ui,sans-serif;color:#263247;text-shadow:0 0 3px #fff,0 0 3px #fff,0 0 3px #fff;pointer-events:none;white-space:nowrap}.g-label.polity{margin-top:-24px;font-size:13px;letter-spacing:.04em;text-transform:uppercase}.g-pop{position:absolute;transform:translate(-50%,-100%);margin-top:-12px;background:#fff;border-radius:10px;padding:10px 26px 10px 12px;font:13px/1.4 "Google Sans",system-ui,sans-serif;color:#1f2937;box-shadow:0 4px 18px #0003;max-width:260px;z-index:3;cursor:default}.g-pop button{position:absolute;top:2px;right:4px;border:0;background:none;font-size:17px;cursor:pointer;color:#6b7280}.g-zoom{position:absolute;right:10px;top:10px;display:flex;flex-direction:column;gap:6px;z-index:2}.g-zoom button{width:34px;height:34px;border:0;border-radius:8px;background:#fff;box-shadow:0 1px 6px #0003;font-size:20px;line-height:1;cursor:pointer;color:#374151}.g-msg{position:absolute;inset:0;display:grid;place-items:center;padding:20px;text-align:center;color:#475569;font:14px system-ui}';
let styled=false;
function injectStyle(){if(styled)return;styled=true;const s=document.createElement("style");s.textContent=CSS;document.head.appendChild(s);}
const stub=wrap=>({setPlanet(){},setMode(){return[];},setData(){return[];},setSun(){},setMarker(){},focus(){},showPopup(){},hidePopup(){},getLegend:()=>[],dispose(){wrap.remove();},onPick:null});

export function createGlobe(container,planet,opts={}){
 injectStyle();
 const wrap=document.createElement("div");wrap.className="g-wrap";container.appendChild(wrap);
 let renderer;
 try{renderer=new THREE.WebGLRenderer({antialias:true,alpha:true});}catch(e){wrap.innerHTML='<div class="g-msg">WebGL non disponibile in questo browser</div>';return stub(wrap);}
 renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,2));wrap.appendChild(renderer.domElement);
 const ac=new AbortController(),signal=ac.signal,scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(35,1,.05,40);
 const canvas=document.createElement("canvas");canvas.width=TEX_W;canvas.height=TEX_H;
 const ctx=canvas.getContext("2d"),image=ctx.createImageData(TEX_W,TEX_H);
 const tex=new THREE.CanvasTexture(canvas);tex.colorSpace=THREE.SRGBColorSpace;tex.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());
 const sun=new THREE.Vector3(1,0,0);
 scene.add(new THREE.Mesh(new THREE.SphereGeometry(1,160,80),new THREE.ShaderMaterial({uniforms:{map:{value:tex},sunDir:{value:sun}},vertexShader:VS,fragmentShader:FS})));
 scene.add(new THREE.Mesh(new THREE.SphereGeometry(1.07,64,32),new THREE.ShaderMaterial({vertexShader:AVS,fragmentShader:AFS,side:THREE.BackSide,transparent:true,depthWrite:false})));
 const markers=new THREE.Group(),startMark=new THREE.Group();scene.add(markers,startMark);
 const ringGeo=new THREE.RingGeometry(.72,1,28),dotGeo=new THREE.CircleGeometry(.72,28),unitSphere=new THREE.Sphere(new THREE.Vector3(),1),ray=new THREE.Raycaster();
 const st={lat:20,lon:0,dist:3.6,tlat:20,tlon:0,tdist:3.6};
 let mode="geografia",sites=[],layers=null,legend=[],lastSig="",dirty=true,raf=0,labels=[],popup=null,startVec=null;
 const fitDist=()=>3.4/Math.min(1,camera.aspect),maxDist=()=>fitDist()*1.3,wrapLon=l=>((l+540)%360)-180;

 function place(){const v=toVec(st.lat,st.lon);camera.position.set(v[0]*st.dist,v[1]*st.dist,v[2]*st.dist);camera.up.set(0,1,0);camera.lookAt(0,0,0);}
 function size(){const w=wrap.clientWidth||600,h=wrap.clientHeight||400;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();st.tdist=clamp(st.tdist,1.1,maxDist());dirty=true;}
 function paint(){if(!layers)return;composeInto(layers,mode,sites,image.data);ctx.putImageData(image,0,0);tex.needsUpdate=true;legend=makeLegend(layers,mode,sites);dirty=true;}
 function markerColor(s){if(s.neighbor)return s.color;if(mode==="popolazione")return"#3978df";if(mode==="risorse")return s.stores<100?"#c85b42":s.stores<1000?"#d9a441":"#39836b";if(mode==="politica")return s.color;return"#d94f55";}
 function decal(vec,color,k){
  const g=new THREE.Group();
  g.add(new THREE.Mesh(ringGeo,new THREE.MeshBasicMaterial({color:0xffffff,side:THREE.DoubleSide})),new THREE.Mesh(dotGeo,new THREE.MeshBasicMaterial({color:new THREE.Color(color),side:THREE.DoubleSide})));
  g.position.set(vec[0]*1.004,vec[1]*1.004,vec[2]*1.004);g.lookAt(vec[0]*2,vec[1]*2,vec[2]*2);g.userData={k};return g;
 }
 function clearGroup(group){for(const g of group.children.slice()){group.remove(g);g.traverse(o=>{if(o.material)o.material.dispose();});}}
 function rebuildMarkers(){
  clearGroup(markers);for(const l of labels)l.el.remove();labels=[];
  const polities=new Set();
  for(const s of sites){
   const v=toVec(s.latitude,s.longitude),k=mode==="popolazione"?.8+.5*Math.log10(1+(s.population||0)):1,g=decal(v,markerColor(s),k);g.userData.site=s;g.userData.vec=new THREE.Vector3(...v);markers.add(g);
   if(s.name)addLabel(s.name,v,"");
   if(mode==="politica"&&s.polity&&!s.neighbor&&!polities.has(s.polity)){polities.add(s.polity);addLabel(s.polity,v,"polity");}
  }
  dirty=true;
 }
 function addLabel(text,v,cls){const el=document.createElement("div");el.className="g-label "+cls;el.textContent=text;wrap.appendChild(el);labels.push({el,vec:new THREE.Vector3(...v)});}
 function project(v){const p=v.clone().project(camera),w=wrap.clientWidth,h=wrap.clientHeight;return{x:(p.x*.5+.5)*w,y:(-p.y*.5+.5)*h,front:v.dot(camera.position)>1.0};}
 function updateOverlays(){
  const base=.0034*st.dist;
  for(const g of markers.children)g.scale.setScalar(base*g.userData.k);
  for(const g of startMark.children)g.scale.setScalar(base*1.5);
  for(const l of labels){const p=project(l.vec);l.el.style.display=p.front?"block":"none";l.el.style.left=p.x+"px";l.el.style.top=p.y+"px";}
  if(popup){const p=project(popup.vec);popup.el.style.display=p.front?"block":"none";popup.el.style.left=p.x+"px";popup.el.style.top=p.y+"px";}
 }
 function frame(){
  raf=requestAnimationFrame(frame);let moving=false;
  const dd=st.tdist-st.dist;if(Math.abs(dd)>.002){st.dist+=dd*.2;moving=true;}
  const dl=st.tlat-st.lat;if(Math.abs(dl)>.01){st.lat+=dl*.15;moving=true;}
  const dn=((st.tlon-st.lon+540)%360)-180;if(Math.abs(dn)>.01){st.lon=wrapLon(st.lon+dn*.15);moving=true;}
  if(moving||dirty){place();updateOverlays();renderer.render(scene,camera);dirty=false;}
 }
 function pick(cx,cy){
  const r=wrap.getBoundingClientRect();ray.setFromCamera({x:((cx-r.left)/r.width)*2-1,y:-((cy-r.top)/r.height)*2+1},camera);
  const hit=ray.ray.intersectSphere(unitSphere,new THREE.Vector3());
  let site=null,best=16;
  for(const g of markers.children){const v=g.userData.vec;if(v.dot(camera.position)<1)continue;const p=project(v),d=Math.hypot(p.x+r.left-cx,p.y+r.top-cy);if(d<best){best=d;site=g.userData.site;}}
  if(!hit&&!site)return;
  const ll=site?{latitude:site.latitude,longitude:site.longitude}:fromVec(hit.x,hit.y,hit.z),c=cellAt(planet,ll.latitude,ll.longitude);
  api.onPick?.({...ll,site,terrain:planet.terrain[c],biome:planet.biome[c],altitude:planet.alt[c],river:planet.river[c]});
 }
 // input: drag, pinch, wheel, zoom buttons
 const pts=new Map();let moved=0,pinch=0;
 const dist2=()=>{const a=[...pts.values()];return Math.hypot(a[0].x-a[1].x,a[0].y-a[1].y)||1;};
 wrap.addEventListener("pointerdown",e=>{if(e.target.closest(".g-zoom,.g-pop"))return;wrap.setPointerCapture(e.pointerId);pts.set(e.pointerId,{x:e.clientX,y:e.clientY});moved=0;if(pts.size===2)pinch=dist2();},{signal});
 wrap.addEventListener("pointermove",e=>{
  const p=pts.get(e.pointerId);if(!p)return;const dx=e.clientX-p.x,dy=e.clientY-p.y;p.x=e.clientX;p.y=e.clientY;moved+=Math.abs(dx)+Math.abs(dy);
  if(pts.size===1){const rate=(st.dist-.95)*.003/D2R;st.lon=wrapLon(st.lon-dx*rate/Math.max(.25,Math.cos(st.lat*D2R)));st.lat=clamp(st.lat+dy*rate,-85,85);st.tlon=st.lon;st.tlat=st.lat;dirty=true;}
  else if(pts.size===2){const d=dist2();if(pinch)st.tdist=clamp(st.tdist*pinch/d,1.1,maxDist());pinch=d;}
 },{signal});
 const release=e=>{if(!pts.has(e.pointerId))return;pts.delete(e.pointerId);if(pts.size<2)pinch=0;if(e.type==="pointerup"&&moved<6&&!pts.size)pick(e.clientX,e.clientY);};
 wrap.addEventListener("pointerup",release,{signal});wrap.addEventListener("pointercancel",release,{signal});
 wrap.addEventListener("wheel",e=>{e.preventDefault();st.tdist=clamp(st.tdist*Math.exp(e.deltaY*.0015),1.1,maxDist());},{passive:false,signal});
 const zoom=document.createElement("div");zoom.className="g-zoom";
 for(const[txt,f]of[["+",.7],["−",1/.7]]){const b=document.createElement("button");b.type="button";b.textContent=txt;b.setAttribute("aria-label",f<1?"Zoom in":"Zoom out");b.onclick=()=>{st.tdist=clamp(st.tdist*f,1.1,maxDist());};zoom.appendChild(b);}
 wrap.appendChild(zoom);
 const ro=new ResizeObserver(size);ro.observe(wrap);

 const api={
  onPick:opts.onPick||null,
  setPlanet(p){planet=p;layers=buildLayers(p);paint();rebuildMarkers();},
  setMode(m){mode=m;paint();rebuildMarkers();return legend;},
  setData(d){
   sites=(d.sites||[]).filter(s=>Number.isFinite(s.latitude)&&Number.isFinite(s.longitude)).map(s=>({...s,radiusKm:Math.max(30,Math.min(2500,Math.sqrt(Math.max(1,s.knownArea||12)*25/Math.PI)))}));
   const sig=mode+JSON.stringify(sites.map(s=>[s.id,s.name,s.latitude,s.longitude,s.population,Math.round(s.radiusKm),s.stores&&Math.round(s.stores/50),s.color,s.polity]));
   if(sig!==lastSig){lastSig=sig;paint();rebuildMarkers();}
   return legend;
  },
  setSun(lat,lon){const v=toVec(lat,lon);sun.set(v[0],v[1],v[2]);dirty=true;},
  setMarker(lat,lon){clearGroup(startMark);startVec=null;if(Number.isFinite(lat)&&Number.isFinite(lon)){const v=toVec(lat,lon);startMark.add(decal(v,"#315efb",1));}dirty=true;},
  focus(lat,lon,dist,instant){st.tlat=clamp(lat,-80,80);st.tlon=lon;if(dist)st.tdist=clamp(dist,1.1,maxDist());if(instant){st.lat=st.tlat;st.lon=st.tlon;st.dist=st.tdist;}dirty=true;},
  showPopup(lat,lon,html){
   api.hidePopup();const el=document.createElement("div");el.className="g-pop";el.innerHTML=html;
   const x=document.createElement("button");x.type="button";x.textContent="×";x.onclick=()=>api.hidePopup();el.appendChild(x);wrap.appendChild(el);
   popup={el,vec:new THREE.Vector3(...toVec(lat,lon))};dirty=true;
  },
  hidePopup(){if(popup){popup.el.remove();popup=null;}},
  getLegend:()=>legend,
  dispose(){cancelAnimationFrame(raf);ac.abort();ro.disconnect();clearGroup(markers);clearGroup(startMark);tex.dispose();renderer.dispose();wrap.remove();}
 };
 size();st.dist=st.tdist=fitDist();
 if(planet)api.setPlanet(planet);
 frame();
 return api;
}
