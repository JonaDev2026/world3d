// planet.js — procedural planet on a sphere (equirectangular grid). No dependencies, same seed = same planet.
export const PLANET_VERSION=1;
export const TERRAIN={SEA:0,PLAIN:1,FOREST:2,HILL:3,MOUNTAIN:4,LAKE:5,RIVER:6,DESERT:7};
export const BIOMES=["ocean","ice","tundra","taiga","temperate forest","grassland","desert","savanna","rainforest","alpine","lake","shallows"];
const TAU=Math.PI*2,D2R=Math.PI/180,clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),lerp=(a,b,t)=>a+(b-a)*t;
const smooth=(a,b,x)=>{const t=clamp((x-a)/(b-a),0,1);return t*t*(3-2*t)};
function hash32(seed){let h=2166136261>>>0;for(const ch of String(seed)){h^=ch.charCodeAt(0);h=Math.imul(h,16777619);}h^=h>>>13;h=Math.imul(h,0x85ebca6b);h^=h>>>16;return h>>>0;}
function mulberry32(a){return()=>{a=(a+0x6D2B79F5)|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
function makeNoise(rng){
 const p=new Uint8Array(512),b=[...Array(256).keys()];
 for(let i=255;i>0;i--){const j=Math.floor(rng()*(i+1));[b[i],b[j]]=[b[j],b[i]];}
 for(let i=0;i<512;i++)p[i]=b[i&255];
 const fade=t=>t*t*t*(t*(t*6-15)+10);
 const grad=(h,x,y,z)=>{h&=15;const u=h<8?x:y,v=h<4?y:(h===12||h===14?x:z);return((h&1)?-u:u)+((h&2)?-v:v);};
 return(x,y,z)=>{
  const X=Math.floor(x)&255,Y=Math.floor(y)&255,Z=Math.floor(z)&255;x-=Math.floor(x);y-=Math.floor(y);z-=Math.floor(z);
  const u=fade(x),v=fade(y),w=fade(z),A=p[X]+Y,AA=p[A]+Z,AB=p[A+1]+Z,B=p[X+1]+Y,BA=p[B]+Z,BB=p[B+1]+Z;
  return lerp(lerp(lerp(grad(p[AA],x,y,z),grad(p[BA],x-1,y,z),u),lerp(grad(p[AB],x,y-1,z),grad(p[BB],x-1,y-1,z),u),v),
   lerp(lerp(grad(p[AA+1],x,y,z-1),grad(p[BA+1],x-1,y,z-1),u),lerp(grad(p[AB+1],x,y-1,z-1),grad(p[BB+1],x-1,y-1,z-1),u),v),w);
 };
}
function fbm(n,x,y,z,oct){let s=0,a=1,f=1,t=0;for(let i=0;i<oct;i++){s+=n(x*f,y*f,z*f)*a;t+=a;a*=.5;f*=2;}return s/t;}
function heap(n){
 const k=new Float64Array(n),v=new Int32Array(n);let s=0;
 return{push(key,val){let i=s++;while(i>0){const p=(i-1)>>1;if(k[p]<=key)break;k[i]=k[p];v[i]=v[p];i=p;}k[i]=key;v[i]=val;},
  pop(){const top=v[0],key=k[--s],val=v[s];let i=0;for(;;){let c=2*i+1;if(c>=s)break;if(c+1<s&&k[c+1]<k[c])c++;if(k[c]>=key)break;k[i]=k[c];v[i]=v[c];i=c;}k[i]=key;v[i]=val;return top;},
  get size(){return s;}};
}
function eachNeighbor(c,W,H,fn){const i=c%W,j=(c-i)/W;for(let dj=-1;dj<=1;dj++){const jj=j+dj;if(jj<0||jj>=H)continue;for(let di=-1;di<=1;di++){if(!di&&!dj)continue;fn(jj*W+(i+di+W)%W);}}}

export function generatePlanet(seed=1,opts={}){
 const W=opts.w||720,H=opts.h||W>>1,N=W*H,rng=mulberry32(hash32(seed));
 const noises=[makeNoise(rng),makeNoise(rng),makeNoise(rng),makeNoise(rng)],off=()=>[rng()*200-100,rng()*200-100,rng()*200-100];
 const [oW1,oW2,oW3,oA,oB,oC]=[off(),off(),off(),off(),off(),off()];
 const targetLand=opts.land??(.30+rng()*.08);
 // sphere vectors and latitude weights
 const vx=new Float32Array(N),vy=new Float32Array(N),vz=new Float32Array(N),rowLat=new Float32Array(H),wgt=new Float32Array(N);
 for(let j=0;j<H;j++){const lat=90-(j+.5)*180/H,r=lat*D2R,cl=Math.cos(r),sl=Math.sin(r);rowLat[j]=lat;
  for(let i=0;i<W;i++){const lo=((i+.5)*360/W-180)*D2R,c=j*W+i;vx[c]=cl*Math.cos(lo);vy[c]=sl;vz[c]=cl*Math.sin(lo);wgt[c]=cl;}}
 // tectonic plates
 const P=16+Math.floor(rng()*9),plates=[];
 for(let k=0;k<P;k++){
  const z=rng()*2-1,t=rng()*TAU,r=Math.sqrt(1-z*z),pos=[r*Math.cos(t),z,r*Math.sin(t)];
  let a=[rng()*2-1,rng()*2-1,rng()*2-1];const d=a[0]*pos[0]+a[1]*pos[1]+a[2]*pos[2];a=a.map((x,q)=>x-d*pos[q]);
  const len=Math.hypot(...a)||1,mag=.3+.7*rng();
  plates.push({pos,vel:a.map(x=>x/len*mag),cont:k<3?true:k<6?false:rng()<.42});
 }
 // raw height
 const h=new Float32Array(N);
 for(let c=0;c<N;c++){
  const x=vx[c],y=vy[c],z=vz[c];
  let qx=x+fbm(noises[0],x*1.6+oW1[0],y*1.6+oW1[1],z*1.6+oW1[2],4)*.34,qy=y+fbm(noises[0],x*1.6+oW2[0],y*1.6+oW2[1],z*1.6+oW2[2],4)*.34,qz=z+fbm(noises[0],x*1.6+oW3[0],y*1.6+oW3[1],z*1.6+oW3[2],4)*.34;
  const ql=Math.hypot(qx,qy,qz)||1;qx/=ql;qy/=ql;qz/=ql;
  let a=-1,b=-1,da=-2,db=-2;
  for(let k=0;k<P;k++){const pp=plates[k].pos,d=qx*pp[0]+qy*pp[1]+qz*pp[2];if(d>da){b=a;db=da;a=k;da=d;}else if(d>db){b=k;db=d;}}
  const A=plates[a],B=plates[b],edge=Math.sqrt(2-2*db)-Math.sqrt(2-2*da),near=1-smooth(0,.12,edge);
  const dx=B.pos[0]-A.pos[0],dy=B.pos[1]-A.pos[1],dz=B.pos[2]-A.pos[2],dl=Math.hypot(dx,dy,dz)||1;
  const conv=clamp(((A.vel[0]-B.vel[0])*dx+(A.vel[1]-B.vel[1])*dy+(A.vel[2]-B.vel[2])*dz)/dl,-1,1);
  let base=A.cont?.32:-.62;if(A.cont!==B.cont)base=lerp(base,-.1,near*.9);
  let up=0;
  if(conv>0)up=A.cont&&B.cont?1.0*conv*near:A.cont!==B.cont?(A.cont?.75:-.45)*conv*near:.55*conv*near;
  else up=.30*conv*near;
  let v=base+up+fbm(noises[1],x*2.3+oA[0],y*2.3+oA[1],z*2.3+oA[2],6)*.7+fbm(noises[2],x*7+oB[0],y*7+oB[1],z*7+oB[2],4)*.14*(1+Math.max(up,0)*1.5);
  const hot=fbm(noises[3],x*3.4+oC[0],y*3.4+oC[1],z*3.4+oC[2],3);if(hot>.2)v+=(hot-.2)*2.4;
  h[c]=v;
 }
 // sea level: area-weighted quantile so that ~targetLand of the surface is land
 const idx=new Uint32Array(N);for(let c=0;c<N;c++)idx[c]=c;idx.sort((p,q)=>h[q]-h[p]||p-q);
 let totalW=0;for(let c=0;c<N;c++)totalW+=wgt[c];
 let acc=0,sea=h[idx[N-1]];for(let k=0;k<N;k++){acc+=wgt[idx[k]];if(acc>=totalW*targetLand){sea=h[idx[k]];break;}}
 let maxLand=1e-6,maxDepth=1e-6;for(let c=0;c<N;c++){const s=h[c]-sea;if(s>0)maxLand=Math.max(maxLand,s);else maxDepth=Math.max(maxDepth,-s);}
 const alt=new Int16Array(N);
 for(let c=0;c<N;c++){const s=h[c]-sea;alt[c]=s>0?Math.max(1,Math.round(8800*Math.pow(s/maxLand,1.6))):Math.min(-1,Math.round(-10900*Math.pow(-s/maxDepth,.8)));}
 // climate: temperature (lat+altitude), distance from sea, precipitation
 const dist=new Uint16Array(N).fill(65535),q=new Int32Array(N);let qh=0,qt=0;
 for(let c=0;c<N;c++)if(alt[c]<=0){dist[c]=0;q[qt++]=c;}
 while(qh<qt){const c=q[qh++];eachNeighbor(c,W,H,n=>{if(dist[n]===65535){dist[n]=dist[c]+1;q[qt++]=n;}});}
 const precip=new Float32Array(N),temp=new Float32Array(N);
 for(let c=0;c<N;c++){
  const lat=rowLat[(c/W)|0],sl=Math.sin(lat*D2R),land=alt[c]>0;
  temp[c]=28-48*sl*sl-(land?6.5*alt[c]/1000:0)+fbm(noises[1],vx[c]*3+oC[0],vy[c]*3+oC[1],vz[c]*3+oC[2],2)*5;
  const band=.5+.5*Math.cos(lat*TAU/57),cont=land?.35+.65*Math.exp(-dist[c]/(W*.07)):1;
  precip[c]=clamp(band*cont+fbm(noises[2],vx[c]*2.6+oA[0],vy[c]*2.6+oA[1],vz[c]*2.6+oA[2],3)*.3+(land?.1*Math.min(1,alt[c]/2500):0),0,1);
 }
 // hydrology: priority-flood gives flow direction toward the sea and depressions (lakes)
 const closed=new Uint8Array(N),parent=new Int32Array(N).fill(-1),fill=new Float64Array(N),order=new Int32Array(N),hp=heap(N);let oc=0;
 for(let c=0;c<N;c++)if(alt[c]<=0){closed[c]=1;fill[c]=alt[c];}
 for(let c=0;c<N;c++)if(alt[c]<=0){let edgeCell=false;eachNeighbor(c,W,H,n=>{if(alt[n]>0)edgeCell=true;});if(edgeCell)hp.push(fill[c],c);}
 while(hp.size){const c=hp.pop();if(alt[c]>0)order[oc++]=c;
  eachNeighbor(c,W,H,n=>{if(closed[n])return;closed[n]=1;fill[n]=Math.max(alt[n],fill[c]+.01);parent[n]=c;hp.push(fill[n],n);});}
 const LAKE_DEPTH=opts.lakeDepth??20,LAKE_CAP=opts.lakeCap??150,cand=new Uint8Array(N),lake=new Uint8Array(N);
 for(let c=0;c<N;c++)if(alt[c]>0&&fill[c]-alt[c]>=LAKE_DEPTH)cand[c]=1;
 const seen=new Uint8Array(N);
 for(let c=0;c<N;c++){
  if(!cand[c]||seen[c])continue;
  const comp=[c];seen[c]=1;for(let k=0;k<comp.length;k++){const m=comp[k],i=m%W,j=(m-i)/W;
   for(const [di,dj] of [[1,0],[-1,0],[0,1],[0,-1]]){const jj=j+dj;if(jj<0||jj>=H)continue;const n=jj*W+(i+di+W)%W;if(cand[n]&&!seen[n]){seen[n]=1;comp.push(n);}}}
  if(comp.length<=LAKE_CAP)for(const m of comp)lake[m]=1;
 }
 const flow=new Float64Array(N);
 for(let c=0;c<N;c++)if(alt[c]>0)flow[c]=wgt[c]*(.15+precip[c]);
 for(let k=oc-1;k>=0;k--){const c=order[k],p=parent[c];if(p>=0&&alt[p]>0)flow[p]+=flow[c];}
 const landVals=[];for(let c=0;c<N;c++)if(alt[c]>0&&!lake[c])landVals.push(flow[c]);
 landVals.sort((p,r)=>p-r);
 const riverThr=landVals.length?landVals[Math.floor(landVals.length*(1-(opts.riverFrac??.03)))]:Infinity;
 const river=new Uint8Array(N);
 for(let c=0;c<N;c++)if(alt[c]>0&&!lake[c]&&flow[c]>=riverThr)river[c]=Math.min(255,1+Math.floor(32*Math.log2(flow[c]/riverThr)));
 // terrain classes and biomes
 const alts=[];for(let c=0;c<N;c++)if(alt[c]>0&&!lake[c])alts.push(alt[c]);alts.sort((p,r)=>p-r);
 const mountainThr=Math.max(1500,alts[Math.floor(alts.length*.92)]||0),hillThr=Math.max(500,alts[Math.floor(alts.length*.78)]||0);
 const terrain=new Uint8Array(N),biome=new Uint8Array(N);
 for(let c=0;c<N;c++){
  if(alt[c]<=0){terrain[c]=TERRAIN.SEA;biome[c]=alt[c]>-200?11:0;continue;}
  if(lake[c]){terrain[c]=TERRAIN.LAKE;biome[c]=10;continue;}
  const T=temp[c],Pr=precip[c];let b;
  if(T<-12)b=1;else if(T<-5)b=2;else if(alt[c]>=mountainThr)b=9;else if(Pr<.16)b=6;else if(T<2)b=3;
  else if(T>18)b=Pr>.62?8:Pr>.3?7:5;else b=Pr>.4?4:5;
  biome[c]=b;
  terrain[c]=alt[c]>=mountainThr?TERRAIN.MOUNTAIN:river[c]?TERRAIN.RIVER:alt[c]>=hillThr?TERRAIN.HILL:b===6?TERRAIN.DESERT:(b===3||b===4||b===8)?TERRAIN.FOREST:TERRAIN.PLAIN;
 }
 return{version:PLANET_VERSION,seed,w:W,h:H,alt,terrain,biome,river};
}
const b64=arr=>{const u=new Uint8Array(arr.buffer,arr.byteOffset,arr.byteLength);let s="";for(let i=0;i<u.length;i+=8192)s+=String.fromCharCode.apply(null,u.subarray(i,i+8192));return btoa(s);};
const unb64=(s,T)=>{const bin=atob(s),u=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)u[i]=bin.charCodeAt(i);return new T(u.buffer);};
export function exportPlanet(p){return{version:p.version,seed:p.seed,w:p.w,h:p.h,alt:b64(p.alt),terrain:b64(p.terrain),biome:b64(p.biome),river:b64(p.river)};}
export function importPlanet(d){
 if(!d||d.version!==PLANET_VERSION)throw new Error("Pianeta non valido o versione incompatibile");
 const p={version:d.version,seed:d.seed,w:d.w,h:d.h,alt:unb64(d.alt,Int16Array),terrain:unb64(d.terrain,Uint8Array),biome:unb64(d.biome,Uint8Array),river:unb64(d.river,Uint8Array)};
 if(p.alt.length!==p.w*p.h||p.terrain.length!==p.alt.length)throw new Error("Pianeta corrotto");
 return p;
}
// queries by geographic coordinates (degrees)
export const cellAt=(p,lat,lon)=>{let i=Math.floor((lon+180)/360*p.w);i=((i%p.w)+p.w)%p.w;return clamp(Math.floor((90-lat)/180*p.h),0,p.h-1)*p.w+i;};
export const latLonOf=(p,c)=>{const i=c%p.w,j=(c-i)/p.w;return{latitude:90-(j+.5)*180/p.h,longitude:(i+.5)*360/p.w-180};};
export const terrainAt=(p,lat,lon)=>p.terrain[cellAt(p,lat,lon)];
export const heightAt=(p,lat,lon)=>p.alt[cellAt(p,lat,lon)];
export const biomeAt=(p,lat,lon)=>p.biome[cellAt(p,lat,lon)];
export const riverAt=(p,lat,lon)=>p.river[cellAt(p,lat,lon)];
export const isLand=(p,lat,lon)=>{const t=terrainAt(p,lat,lon);return t!==TERRAIN.SEA&&t!==TERRAIN.LAKE;};
export function planetStats(p){
 const N=p.w*p.h,w=c=>Math.cos((90-(((c/p.w)|0)+.5)*180/p.h)*D2R);let tot=0,land=0,lake=0,mount=0,river=0;
 const biomes=new Array(BIOMES.length).fill(0);
 for(let c=0;c<N;c++){const x=w(c);tot+=x;const t=p.terrain[c];if(t!==0&&t!==5)land+=x;if(t===5)lake+=x;if(t===4)mount+=x;if(p.river[c])river++;biomes[p.biome[c]]+=x;}
 const seen=new Uint8Array(N),masses=[];
 for(let c=0;c<N;c++){if(seen[c]||p.alt[c]<=0)continue;let n=0;const st=[c];seen[c]=1;
  while(st.length){const m=st.pop();n++;eachNeighbor(m,p.w,p.h,k=>{if(!seen[k]&&p.alt[k]>0){seen[k]=1;st.push(k);}});}masses.push(n);}
 masses.sort((a,b)=>b-a);
 return{landFraction:land/tot,lakeFraction:lake/tot,mountainShareOfLand:mount/land,riverCells:river,landmasses:masses.length,largestLandmasses:masses.slice(0,8),biomeShare:Object.fromEntries(BIOMES.map((n,i)=>[n,+(biomes[i]/tot).toFixed(3)]))};
}
