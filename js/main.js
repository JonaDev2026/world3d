import { BuildEditor } from "./editor.js";
import { initI18n } from "./i18n.js";

const mount=document.querySelector("#viewport");
const editor=new BuildEditor(mount);
const $=id=>document.getElementById(id);
const toolButtons=[...document.querySelectorAll("[data-tool]")];
const i18n=await initI18n();
const t=(key)=>i18n.t(key);

function setTool(name){
  toolButtons.forEach(button=>button.classList.toggle("active",button.dataset.tool===name));
  editor.setTool(name);
  const hints={
    select:"Clicca un elemento per selezionarlo. Trascina sul piano per ruotare la vista.",
    wall:"Clicca sul piano per posizionare un muro. Puoi spostarlo e ridimensionarlo.",
    floor:"Clicca sul piano per aggiungere una piattaforma.",
    door:"Clicca sul piano per inserire una porta.",
    window:"Clicca sul piano per inserire una finestra.",
    cube:"Clicca sul piano per posizionare un blocco.",
    tree:"Clicca sul piano per piantare un albero."
  };
  $("hintCard").lastElementChild.textContent=t(hints[name]||hints.select);
}
toolButtons.forEach(button=>button.addEventListener("click",()=>setTool(button.dataset.tool)));
$("moveBtn").addEventListener("click",()=>{editor.setTransform("translate");$("moveBtn").classList.add("active");$("rotateBtn").classList.remove("active");});
$("rotateBtn").addEventListener("click",()=>{editor.setTransform("rotate");$("rotateBtn").classList.add("active");$("moveBtn").classList.remove("active");});
$("deleteBtn").addEventListener("click",()=>editor.deleteSelected());
$("duplicateBtn").addEventListener("click",()=>editor.duplicateSelected());
function projectBlob(){
 return new Blob([JSON.stringify(editor.projectData(),null,2)],{type:"application/json"});
}
let currentFileHandle=null;
function downloadProject(){
 const url=URL.createObjectURL(projectBlob()),a=document.createElement("a");
 a.href=url;a.download="world3d-project.json";a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
async function writeProject(handle){
 const writable=await handle.createWritable();
 await writable.write(projectBlob());
 await writable.close();
 currentFileHandle=handle;
}
$("saveProjectBtn").addEventListener("click",async()=>{
 try{
  if(currentFileHandle){
   await writeProject(currentFileHandle);
  }else if(window.showSaveFilePicker){
   const handle=await window.showSaveFilePicker({
    suggestedName:"world3d-project.json",
    types:[{description:"Progetto World3D",accept:{"application/json":[".json"]}}]
   });
   await writeProject(handle);
  }else{
   downloadProject();
  }
  $("saveState").textContent=t("Progetto salvato");
 }catch(error){
  if(error.name!=="AbortError")alert(t("Impossibile salvare il progetto")+": "+error.message);
 }
});
$("exportProjectBtn").addEventListener("click",()=>{
 downloadProject();
 $("saveState").textContent=t("Progetto esportato");
});
$("openProjectBtn").addEventListener("click",async()=>{
 if(window.showOpenFilePicker){
  try{
   const [handle]=await window.showOpenFilePicker({
    multiple:false,
    types:[{description:"Progetto World3D",accept:{"application/json":[".json"]}}]
   });
   const file=await handle.getFile();
   const data=JSON.parse(await file.text());
   await editor.importProject(data);
   renderProjectAssets();
   currentFileHandle=handle;
   $("saveState").textContent=t("Progetto caricato");
  }catch(error){
   if(error.name!=="AbortError")alert(t("Impossibile aprire il progetto")+": "+error.message);
  }
 }else{
  currentFileHandle=null;
  $("projectFileInput").click();
 }
});
$("projectFileInput").addEventListener("change",async event=>{
 const file=event.currentTarget.files?.[0];if(!file)return;
 try{
  const data=JSON.parse(await file.text());await editor.importProject(data);renderProjectAssets();
  currentFileHandle=null;
  $("saveState").textContent=t("Progetto caricato");
 }catch(error){alert(t("Impossibile aprire il progetto")+": "+error.message);}
 event.currentTarget.value="";
});
$("clearBtn").addEventListener("click",()=>{if(confirm(t("Eliminare tutti gli elementi dal piano?")))editor.clear();});
$("gridBtn").addEventListener("click",e=>{editor.toggleGrid();e.currentTarget.classList.toggle("active");});
$("snapBtn").addEventListener("click",e=>{editor.toggleSnap();e.currentTarget.classList.toggle("active");e.currentTarget.lastChild.textContent=editor.snap?" "+t("Snap attivo"):" "+t("Snap disattivo");});
$("orbitBtn").addEventListener("click",()=>{editor.setTopView(false);$("orbitBtn").classList.add("active");$("topBtn").classList.remove("active");});
$("topBtn").addEventListener("click",()=>{editor.setTopView(true);$("topBtn").classList.add("active");$("orbitBtn").classList.remove("active");});
$("zoomIn").addEventListener("click",()=>editor.zoom(.82));
$("zoomOut").addEventListener("click",()=>editor.zoom(1.22));
$("homeView").addEventListener("click",()=>editor.resetView());
$("undoBtn").addEventListener("click",()=>editor.undo());
$("redoBtn").addEventListener("click",()=>editor.redo());

const fields={posX:"x",posZ:"z",sizeX:"sx",sizeY:"sy",sizeZ:"sz",rotation:"rotation"};
Object.entries(fields).forEach(([id,key])=>$(id).addEventListener("change",()=>{
 const value=Number($(id).value);if(Number.isFinite(value))editor.updateSelected(key,value);
}));

const textureInput=$("textureFilesInput"),modelInput=$("modelFilesInput");
function dataUrl(file){return new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=reject;reader.readAsDataURL(file);});}
function addTextureButton(asset){
 editor.addCustomTexture(asset);
 const button=document.createElement("button");button.type="button";button.className="texture-option custom-texture-option";button.dataset.customTexture=asset.id;
 const image=document.createElement("img");image.src=asset.data;image.alt="";
 const label=document.createElement("span");label.textContent=asset.name;
 button.append(image,label);$("customTextureCatalog").append(button);
}
function renderProjectAssets(){
 $("customTextureCatalog").replaceChildren();
 for(const asset of editor.customTextures.values())addTextureButton(asset);
 $("modelCatalog").replaceChildren();
 for(const item of editor.items){if(item.userData.modelAsset){const asset=item.userData.modelAsset;const button=document.createElement("button");button.type="button";button.className="asset-entry";button.textContent=asset.name;button.addEventListener("click",async()=>{try{await editor.addModelAsset(asset);}catch(error){alert(t("Impossibile importare il modello")+": "+error.message);}});$("modelCatalog").append(button);}}
}
function addModelButton(asset){
 const button=document.createElement("button");button.type="button";button.className="asset-entry";button.textContent=asset.name;
 button.addEventListener("click",async()=>{try{await editor.addModelAsset(asset);$("saveState").textContent=t("Modifiche non salvate");}catch(error){alert(t("Impossibile importare il modello")+": "+error.message);}});
 $("modelCatalog").append(button);
}
async function importFiles(files){
 for(const file of files){
  const ext=file.name.split(".").pop().toLowerCase();
  if(["png","jpg","jpeg","webp"].includes(ext)){
   const asset={id:"custom-"+crypto.randomUUID(),name:file.name,data:await dataUrl(file)};
   addTextureButton(asset);
  }else if(["glb","gltf","obj","stl"].includes(ext)){
   const asset={id:"model-"+crypto.randomUUID(),name:file.name,extension:ext,data:await dataUrl(file)};
   addModelButton(asset);
  }
 }
}
$("importTextureBtn").addEventListener("click",()=>textureInput.click());
$("importModelBtn").addEventListener("click",()=>modelInput.click());
textureInput.addEventListener("change",async e=>{await importFiles([...e.target.files]);e.target.value="";});
modelInput.addEventListener("change",async e=>{await importFiles([...e.target.files]);e.target.value="";});
$("importFolderBtn").addEventListener("click",async()=>{
 if(!window.showDirectoryPicker){alert(t("Il browser non supporta la selezione di cartelle. Usa Importa texture o Importa modello 3D."));return;}
 try{
  const dir=await window.showDirectoryPicker({mode:"read"});
  const found=[];
  async function scan(handle){for await(const entry of handle.values()){if(entry.kind==="directory")await scan(entry);else if(/\.(png|jpe?g|webp|glb|gltf|obj|stl)$/i.test(entry.name))found.push(await entry.getFile());}}
  await scan(dir);await importFiles(found);
  if(!found.length)alert(t("Nessuna risorsa compatibile trovata nella cartella."));
 }catch(error){if(error.name!=="AbortError")alert(error.message);}
});
$("customTextureCatalog").addEventListener("click",e=>{const b=e.target.closest("[data-custom-texture]");if(b)editor.updateSelected("texture",b.dataset.customTexture);});

function updateMaterialControls(item){
 if(!item)return;
 const color=item.userData.materialColor||"#d7d0c5";
 $("objectColor").value=color;$("colorValue").textContent=color.toUpperCase();
 $("surfaceFinish").value=item.userData.finish||"matte";
 document.querySelectorAll("#textureCatalog [data-texture],#customTextureCatalog [data-custom-texture]").forEach(button=>button.classList.toggle("active",(button.dataset.texture||button.dataset.customTexture)===(item.userData.texture||"none")));
}
$("objectColor").addEventListener("input",e=>{$("colorValue").textContent=e.currentTarget.value.toUpperCase();editor.updateSelected("color",e.currentTarget.value);});
$("colorPalette").addEventListener("click",e=>{const b=e.target.closest("[data-color]");if(!b)return;$("objectColor").value=b.dataset.color;$("colorValue").textContent=b.dataset.color.toUpperCase();editor.updateSelected("color",b.dataset.color);});
$("textureCatalog").addEventListener("click",e=>{const b=e.target.closest("[data-texture]");if(b)editor.updateSelected("texture",b.dataset.texture);});
$("surfaceFinish").addEventListener("change",e=>editor.updateSelected("finish",e.currentTarget.value));
editor.onSelection(item=>{
 $("emptyInspector").classList.toggle("hidden",!!item);$("objectInspector").classList.toggle("hidden",!item);if(!item)return;
 const labels={Muro:"Muro",Pavimento:"Pavimento",Porta:"Porta",Finestra:"Finestra",Blocco:"Blocco",Albero:"Albero"};
 $("objectName").textContent=t(labels[item.userData.label]||item.userData.label);
 $("objectType").textContent=t(item.userData.kind);
 $("objectIcon").textContent=({Muro:"width",Pavimento:"grid_on",Porta:"door_front",Finestra:"window",Blocco:"view_in_ar",Albero:"park"})[item.userData.label]||"view_in_ar";
 $("posX").value=item.position.x.toFixed(1);$("posZ").value=item.position.z.toFixed(1);
 $("sizeX").value=item.userData.size.x.toFixed(1);$("sizeY").value=item.userData.size.y.toFixed(1);$("sizeZ").value=item.userData.size.z.toFixed(1);
 $("rotation").value=Math.round(item.rotation.y*180/Math.PI);updateMaterialControls(item);
});
editor.onChange(count=>{$("objectCount").textContent=count+" "+t(count===1?"elemento":"elementi");$("saveState").textContent=t("Modifiche non salvate");});
editor.onPlaneSize((w,d)=>{$("planeWidth").value=w;$("planeDepth").value=d;document.querySelector(".panel-footer span:last-child").textContent=(editor.items.length?t("Piano"):t("Piano vuoto"))+" · "+w.toFixed(1)+" × "+d.toFixed(1)+" m";});

const modal=$("settingsModal");
function openSettings(){modal.classList.remove("hidden");$("planeWidth").value=editor.planeWidth;$("planeDepth").value=editor.planeDepth;$("languageSelect").value=i18n.preference;}
function closeSettings(){modal.classList.add("hidden");}
$("settingsBtn").addEventListener("click",openSettings);
$("closeSettings").addEventListener("click",closeSettings);
$("cancelSettings").addEventListener("click",closeSettings);
modal.addEventListener("click",e=>{if(e.target===modal)closeSettings();});
$("applySettings").addEventListener("click",async()=>{
 const w=Number($("planeWidth").value),d=Number($("planeDepth").value);
 if(!Number.isFinite(w)||!Number.isFinite(d)||w<0.1||d<0.1){alert(t("Inserisci dimensioni valide: minimo 0,1 metri."));return;}
 editor.setPlaneSize(w,d);
 await i18n.setLanguage($("languageSelect").value);
 editor.emitSelection(editor.selected);
 editor.emitPlaneSize(editor.planeWidth,editor.planeDepth);
 $("objectCount").textContent=editor.items.length+" "+t(editor.items.length===1?"elemento":"elementi");
 $("saveState").textContent=t("Modifiche non salvate");
 closeSettings();
});
window.addEventListener("keydown",event=>{
 if(event.key==="Escape"&&!modal.classList.contains("hidden")){closeSettings();return;}
 if(event.target instanceof HTMLInputElement||event.target instanceof HTMLSelectElement)return;
 if(event.key.toLowerCase()==="v")setTool("select");
 if(event.key==="Delete"||event.key==="Backspace")editor.deleteSelected();
 if(event.key==="Escape")setTool("select");
});
window.addEventListener("beforeunload",()=>editor.dispose());
