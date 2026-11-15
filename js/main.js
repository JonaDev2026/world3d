import { BuildEditor } from "./editor.js";

const mount = document.querySelector("#viewport");
const editor = new BuildEditor(mount);
const $ = (id) => document.getElementById(id);
const toolButtons = [...document.querySelectorAll("[data-tool]")];

function setTool(name) {
  toolButtons.forEach((button) => button.classList.toggle("active", button.dataset.tool === name));
  editor.setTool(name);
  const hints = {
    select: "Clicca un elemento per selezionarlo. Trascina sul piano per ruotare la vista.",
    wall: "Clicca sul piano per posizionare un muro. Puoi spostarlo e ridimensionarlo.",
    floor: "Clicca sul piano per aggiungere una piattaforma.",
    door: "Clicca sul piano per inserire una porta.",
    window: "Clicca sul piano per inserire una finestra.",
    cube: "Clicca sul piano per posizionare un blocco.",
    tree: "Clicca sul piano per piantare un albero."
  };
  $("hintCard").lastElementChild.textContent = hints[name] || hints.select;
}
toolButtons.forEach((button) => button.addEventListener("click", () => setTool(button.dataset.tool)));
$("moveBtn").addEventListener("click", () => { editor.setTransform("translate"); $("moveBtn").classList.add("active"); $("rotateBtn").classList.remove("active"); });
$("rotateBtn").addEventListener("click", () => { editor.setTransform("rotate"); $("rotateBtn").classList.add("active"); $("moveBtn").classList.remove("active"); });
$("deleteBtn").addEventListener("click", () => editor.deleteSelected());
$("duplicateBtn").addEventListener("click", () => editor.duplicateSelected());
$("saveBtn").addEventListener("click", () => { editor.save(); $("saveState").textContent = "Salvato nel browser"; });
$("clearBtn").addEventListener("click", () => { if (confirm("Eliminare tutti gli elementi dal piano?")) editor.clear(); });
$("gridBtn").addEventListener("click", (e) => { editor.toggleGrid(); e.currentTarget.classList.toggle("active"); });
$("snapBtn").addEventListener("click", (e) => { editor.toggleSnap(); e.currentTarget.classList.toggle("active"); e.currentTarget.lastChild.textContent = editor.snap ? " Snap attivo" : " Snap disattivo"; });
$("orbitBtn").addEventListener("click", () => { editor.setTopView(false); $("orbitBtn").classList.add("active"); $("topBtn").classList.remove("active"); });
$("topBtn").addEventListener("click", () => { editor.setTopView(true); $("topBtn").classList.add("active"); $("orbitBtn").classList.remove("active"); });
$("zoomIn").addEventListener("click", () => editor.zoom(0.82));
$("zoomOut").addEventListener("click", () => editor.zoom(1.22));
$("homeView").addEventListener("click", () => editor.resetView());
$("undoBtn").addEventListener("click", () => editor.undo());
$("redoBtn").addEventListener("click", () => editor.redo());

const fields = {posX:"x", posZ:"z", sizeX:"sx", sizeY:"sy", sizeZ:"sz", rotation:"rotation"};
Object.entries(fields).forEach(([id, key]) => $(id).addEventListener("change", () => {
  const value = Number($(id).value);
  if (Number.isFinite(value)) editor.updateSelected(key, value);
}));

function updateMaterialControls(item) {
  if (!item) return;
  const color = item.userData.materialColor || "#d7d0c5";
  $("objectColor").value = color;
  $("colorValue").textContent = color.toUpperCase();
  $("surfaceFinish").value = item.userData.finish || "matte";
  document.querySelectorAll("#textureCatalog [data-texture]").forEach((button) => {
    button.classList.toggle("active", button.dataset.texture === (item.userData.texture || "none"));
  });
}
$("objectColor").addEventListener("input", (event) => {
  $("colorValue").textContent = event.currentTarget.value.toUpperCase();
  editor.updateSelected("color", event.currentTarget.value);
});
$("colorPalette").addEventListener("click", (event) => {
  const button = event.target.closest("[data-color]");
  if (!button) return;
  $("objectColor").value = button.dataset.color;
  $("colorValue").textContent = button.dataset.color.toUpperCase();
  editor.updateSelected("color", button.dataset.color);
});
$("textureCatalog").addEventListener("click", (event) => {
  const button = event.target.closest("[data-texture]");
  if (!button) return;
  editor.updateSelected("texture", button.dataset.texture);
});
$("surfaceFinish").addEventListener("change", (event) => editor.updateSelected("finish", event.currentTarget.value));

editor.onSelection((item) => {
  $("emptyInspector").classList.toggle("hidden", !!item);
  $("objectInspector").classList.toggle("hidden", !item);
  if (!item) return;
  $("objectName").textContent = item.userData.label;
  $("objectType").textContent = item.userData.kind;
  $("objectIcon").textContent = ({Muro:"width", Pavimento:"grid_on", Porta:"door_front", Finestra:"window", Blocco:"view_in_ar", Albero:"park"})[item.userData.label] || "view_in_ar";
  $("posX").value = item.position.x.toFixed(1);
  $("posZ").value = item.position.z.toFixed(1);
  $("sizeX").value = item.userData.size.x.toFixed(1);
  $("sizeY").value = item.userData.size.y.toFixed(1);
  $("sizeZ").value = item.userData.size.z.toFixed(1);
  $("rotation").value = Math.round(item.rotation.y * 180 / Math.PI);
  updateMaterialControls(item);
});
editor.onChange((count) => { $("objectCount").textContent = count + (count === 1 ? " elemento" : " elementi"); $("saveState").textContent = "Modifiche non salvate"; });
window.addEventListener("keydown", (event) => {
  if (event.target instanceof HTMLInputElement || event.target instanceof HTMLSelectElement) return;
  if (event.key.toLowerCase() === "v") setTool("select");
  if (event.key === "Delete" || event.key === "Backspace") editor.deleteSelected();
  if (event.key === "Escape") setTool("select");
});
window.addEventListener("beforeunload", () => editor.dispose());
