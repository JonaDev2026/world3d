#!/usr/bin/env python3
"""World3D - editor desktop Linux."""
from __future__ import annotations
import sys, json, math, base64, copy, uuid
from pathlib import Path
import numpy as np
from PySide6.QtCore import Qt, Signal
from PySide6.QtGui import QColor, QSurfaceFormat, QAction, QKeySequence
from PySide6.QtWidgets import (QApplication, QMainWindow, QWidget, QHBoxLayout, QVBoxLayout,
    QGridLayout, QSplitter, QFrame, QLabel, QPushButton, QToolButton, QComboBox,
    QDoubleSpinBox, QColorDialog, QFileDialog, QMessageBox, QScrollArea, QLineEdit,
    QGroupBox, QFormLayout, QInputDialog, QMenu, QOpenGLWidget)
from OpenGL.GL import *
from OpenGL.GLU import *
try:
    import trimesh
except ImportError:
    trimesh = None

APP_DIR = Path(__file__).resolve().parent
COLORS = {"wall":"#d7d0c5","floor":"#b6a995","door":"#9b7653","window":"#91b9ca","cube":"#9da8b7","tree":"#6e9a72","model":"#b7bdc5"}
LABELS = {"wall":"Muro","floor":"Pavimento","door":"Porta","window":"Finestra","cube":"Blocco","tree":"Albero","model":"Modello 3D"}
DEFAULTS = {"wall":(3,2.8,.18),"floor":(3,.12,3),"door":(.95,2.1,.12),"window":(1.4,1.1,.12),"cube":(1,1,1),"tree":(1.2,3,1.2)}
PALETTE = ["#f1eee7","#c8b9a6","#8e7866","#555b63","#b94f45","#d88b52","#d8bd72","#8b9b70","#4f806e","#6d91b8","#7774a5","#c17e9b","#8a5747","#c5c8ca","#34383d","#ffffff"]
TEXTURES = ["Nessuna","Legno","Piastrelle","Marmo","Cemento","Mattoni","Tessuto","Metallo","Vetro"]

def box_mesh(size):
    x,y,z=[v/2 for v in size]
    v=np.array([[-x,-y,-z],[x,-y,-z],[x,y,-z],[-x,y,-z],[-x,-y,z],[x,-y,z],[x,y,z],[-x,y,z]],dtype=float)
    f=np.array([[0,2,1],[0,3,2],[4,5,6],[4,6,7],[0,1,5],[0,5,4],[2,3,7],[2,7,6],[1,2,6],[1,6,5],[3,0,4],[3,4,7]])
    return v,f

def make_item(kind,x=0,z=0):
    size=list(DEFAULTS[kind])
    if kind=="tree":
        # Geometria semplice combinata: tronco + chioma triangolata.
        meshes=[]
        for radius,height,cy in [(.16,1.3,.65),(.78,1.55,2.1)]:
            m=trimesh.creation.cylinder(radius=radius,height=height,sections=12) if trimesh else None
            if m is None: continue
            m.apply_translation([0,cy,0]); meshes.append(m)
        if meshes:
            v=np.vstack([m.vertices for m in meshes]); f=[]; off=0
            for m in meshes: f.extend((m.faces+off).tolist()); off+=len(m.vertices)
            verts,faces=v,np.array(f)
        else: verts,faces=box_mesh(size)
    else:
        verts,faces=box_mesh(size)
        verts[:,1]+=size[1]/2
    return {"id":uuid.uuid4().hex,"kind":kind,"x":x,"z":z,"rotation":0.0,"size":size,"base_size":size[:],
            "color":COLORS[kind],"texture":"Nessuna","finish":"Opaco","vertices":verts.tolist(),"faces":faces.tolist(),"asset_name":""}

class Viewport(QOpenGLWidget):
    selectedChanged=Signal(object)
    changed=Signal()
    def __init__(self,parent=None):
        super().__init__(parent)
        self.setMinimumSize(480,360)
        self.items=[]; self.selected=None; self.width_m=40.; self.depth_m=40.
        self.yaw=math.radians(42); self.pitch=math.radians(34); self.distance=58.
        self.target=np.array([0.,0.,0.]); self.grid=True; self.snap=True
        self.tool="select"; self.last_pos=None; self.dragging=False
        self.setFocusPolicy(Qt.StrongFocus)
    def initializeGL(self):
        glClearColor(.72,.75,.78,1); glEnable(GL_DEPTH_TEST); glEnable(GL_MULTISAMPLE)
        glEnable(GL_BLEND); glBlendFunc(GL_SRC_ALPHA,GL_ONE_MINUS_SRC_ALPHA)
        glEnable(GL_LIGHTING); glEnable(GL_LIGHT0); glEnable(GL_COLOR_MATERIAL)
        glLightfv(GL_LIGHT0,GL_POSITION,[15,30,12,1]); glLightfv(GL_LIGHT0,GL_DIFFUSE,[1,1,1,1])
        glEnable(GL_NORMALIZE)
    def resizeGL(self,w,h):
        glViewport(0,0,w,max(1,h)); glMatrixMode(GL_PROJECTION); glLoadIdentity()
        gluPerspective(45,w/max(1,h),.1,1000000); glMatrixMode(GL_MODELVIEW)
    def camera(self):
        cp=math.cos(self.pitch); sp=math.sin(self.pitch)
        eye=self.target+np.array([self.distance*cp*math.sin(self.yaw),self.distance*sp,self.distance*cp*math.cos(self.yaw)])
        return eye
    def paintGL(self):
        glClear(GL_COLOR_BUFFER_BIT|GL_DEPTH_BUFFER_BIT); glMatrixMode(GL_MODELVIEW); glLoadIdentity()
        eye=self.camera(); gluLookAt(*eye,*self.target,0,1,0)
        self.draw_ground()
        for item in self.items: self.draw_item(item)
    def draw_ground(self):
        glDisable(GL_LIGHTING); glColor3f(.88,.89,.90)
        glBegin(GL_QUADS); glVertex3f(-self.width_m/2,0,-self.depth_m/2); glVertex3f(self.width_m/2,0,-self.depth_m/2); glVertex3f(self.width_m/2,0,self.depth_m/2); glVertex3f(-self.width_m/2,0,self.depth_m/2); glEnd()
        glColor3f(.43,.47,.51); glBegin(GL_LINE_LOOP)
        for x,z in [(-self.width_m/2,-self.depth_m/2),(self.width_m/2,-self.depth_m/2),(self.width_m/2,self.depth_m/2),(-self.width_m/2,self.depth_m/2)]: glVertex3f(x,.015,z)
        glEnd()
        if self.grid:
            step=max(.1,math.ceil(max(self.width_m,self.depth_m)/200)*.1)
            glColor4f(.55,.58,.61,.65); glBegin(GL_LINES)
            for x in np.arange(-self.width_m/2,self.width_m/2+step,step): glVertex3f(x,.012,-self.depth_m/2); glVertex3f(x,.012,self.depth_m/2)
            for z in np.arange(-self.depth_m/2,self.depth_m/2+step,step): glVertex3f(-self.width_m/2,.012,z); glVertex3f(self.width_m/2,.012,z)
            glEnd()
        glEnable(GL_LIGHTING)
    def draw_item(self,o):
        glPushMatrix(); glTranslatef(o["x"],0,o["z"]); glRotatef(o.get("rotation",0),0,1,0)
        base=np.array(o.get("base_size",o["size"]),float); size=np.array(o["size"],float)
        scale=np.divide(size,base,out=np.ones(3),where=base!=0); glScalef(*scale)
        c=QColor(o.get("color","#b7bdc5")); glColor4f(c.redF(),c.greenF(),c.blueF(),.72 if o.get("texture")=="Vetro" else 1)
        if o.get("texture")=="Vetro": glDepthMask(GL_FALSE)
        verts=np.asarray(o["vertices"],float); faces=np.asarray(o["faces"],int)
        glBegin(GL_TRIANGLES)
        for tri in faces:
            a,b,c0=verts[tri]; n=np.cross(b-a,c0-a); ln=np.linalg.norm(n)
            if ln: glNormal3f(*(n/ln))
            for idx in tri: glVertex3f(*verts[idx])
        glEnd()
        glDepthMask(GL_TRUE)
        if self.selected is o:
            glDisable(GL_LIGHTING); glColor3f(.15,.42,.85)
            lo=np.min(verts,axis=0)*scale; hi=np.max(verts,axis=0)*scale
            glBegin(GL_LINES)
            for yy in [lo[1],hi[1]]:
                for xx in [lo[0],hi[0]]:
                    glVertex3f(xx,yy,lo[2]); glVertex3f(hi[0] if xx==lo[0] else lo[0],yy,lo[2])
                    glVertex3f(xx,yy,hi[2]); glVertex3f(hi[0] if xx==lo[0] else lo[0],yy,hi[2])
            for xx in [lo[0],hi[0]]:
                for zz in [lo[2],hi[2]]: glVertex3f(xx,lo[1],zz); glVertex3f(xx,hi[1],zz)
            glEnd(); glEnable(GL_LIGHTING)
        glPopMatrix()
    def project(self,p):
        model=glGetDoublev(GL_MODELVIEW_MATRIX); proj=glGetDoublev(GL_PROJECTION_MATRIX); vp=glGetIntegerv(GL_VIEWPORT)
        return gluProject(*p,model,proj,vp)
    def pick(self,pos):
        self.makeCurrent()
        glMatrixMode(GL_MODELVIEW); glLoadIdentity(); eye=self.camera(); gluLookAt(*eye,*self.target,0,1,0)
        best=None; dist=1e9
        for o in self.items:
            p=self.project((o["x"],max(.5,o["size"][1]/2),o["z"]))
            d=math.hypot(p[0]-pos.x(),self.height()-p[1])
            threshold=max(18, min(60, 420/max(1,p[2])))
            if d<threshold and d<dist: best=o; dist=d
        return best
    def mousePressEvent(self,e):
        self.last_pos=e.position().toPoint()
        if e.button()==Qt.LeftButton and self.tool=="select":
            self.selected=self.pick(self.last_pos); self.selectedChanged.emit(self.selected); self.update()
        elif e.button()==Qt.LeftButton and self.tool!="select":
            x,z=self.screen_ground(self.last_pos); self.add_item(self.tool,x,z)
    def mouseMoveEvent(self,e):
        p=e.position().toPoint()
        if self.last_pos is not None and e.buttons() & Qt.RightButton:
            delta=p-self.last_pos; self.yaw-=delta.x()*.008; self.pitch=max(.04,min(1.52,self.pitch+delta.y()*.008))
        elif self.last_pos is not None and e.buttons() & Qt.MiddleButton:
            delta=p-self.last_pos; self.target[0]-=delta.x()*self.distance/self.width()*.8; self.target[2]+=delta.y()*self.distance/self.height()*.8
        self.last_pos=p; self.update()
    def mouseReleaseEvent(self,e): self.last_pos=None
    def wheelEvent(self,e): self.distance=max(2,min(100000,self.distance*(.88 if e.angleDelta().y()>0 else 1.14))); self.update()
    def screen_ground(self,p):
        # Inserimento al centro del piano: coordinate stimate in base alla vista.
        nx=(p.x()/max(1,self.width())-.5)*2; ny=(p.y()/max(1,self.height())-.5)*2
        x=self.target[0]+nx*self.distance*.55; z=self.target[2]+ny*self.distance*.55
        if self.snap: x=round(x*10)/10; z=round(z*10)/10
        return max(-self.width_m/2,min(self.width_m/2,x)),max(-self.depth_m/2,min(self.depth_m/2,z))
    def add_item(self,kind,x,z):
        o=make_item(kind,x,z); self.items.append(o); self.selected=o; self.selectedChanged.emit(o); self.changed.emit(); self.update()
    def set_plane(self,w,d): self.width_m=max(.1,round(w,1)); self.depth_m=max(.1,round(d,1)); self.update()
    def set_top(self): self.pitch=1.52; self.yaw=0; self.update()
    def reset_view(self): self.yaw=math.radians(42); self.pitch=math.radians(34); self.distance=max(58,self.width_m*1.2,self.depth_m*1.2); self.target=np.zeros(3); self.update()

class MainWindow(QMainWindow):
    def __init__(self):
        super().__init__(); self.setWindowTitle("World3D"); self.resize(1440,900)
        self.lang="it"; self.history=[]; self.history_index=-1; self.textures={}; self.models={}
        root=QWidget(); layout=QVBoxLayout(root); layout.setContentsMargins(0,0,0,0); layout.setSpacing(0)
        top=QHBoxLayout(); top.setContentsMargins(12,8,12,8)
        title=QLabel("◈  World3D"); title.setStyleSheet("font-size:18px;font-weight:700;color:#e8eaed")
        top.addWidget(title); top.addStretch()
        for label,fn in [("Salva",self.save_project),("Apri",self.open_project),("Esporta",self.export_project),("Impostazioni",self.settings)]:
            b=QPushButton(label); b.clicked.connect(fn); top.addWidget(b)
        self.undo_btn=QPushButton("↶"); self.undo_btn.clicked.connect(self.undo); top.addWidget(self.undo_btn)
        self.redo_btn=QPushButton("↷"); self.redo_btn.clicked.connect(self.redo); top.addWidget(self.redo_btn)
        clear=QPushButton("Svuota"); clear.clicked.connect(self.clear); top.addWidget(clear)
        layout.addLayout(top)
        split=QSplitter(); self.viewport=Viewport(); self.viewport.selectedChanged.connect(self.selection_changed); self.viewport.changed.connect(self.push_history)
        split.addWidget(self.build_sidebar()); split.addWidget(self.viewport); split.addWidget(self.build_inspector()); split.setSizes([220,950,270]); layout.addWidget(split)
        self.setCentralWidget(root); self.setStyleSheet(self.styles())
        self.statusBar().showMessage("Piano vuoto · 40 × 40 m")
        self.push_history()
        self.set_shortcuts()
    def styles(self):
        return """QMainWindow,QWidget{background:#202329;color:#e8eaed;font-family:'Noto Sans',sans-serif;font-size:12px} QPushButton,QComboBox,QLineEdit,QDoubleSpinBox{background:#2b3038;border:1px solid #454b55;border-radius:6px;padding:7px;color:#e8eaed} QPushButton:hover{background:#39414d} QFrame#panel{background:#252a32} QLabel#heading{font-size:14px;font-weight:700;padding:8px 2px} QGroupBox{border:1px solid #414751;border-radius:7px;margin-top:10px;padding:8px;font-weight:600} QGroupBox::title{subcontrol-origin:margin;left:8px;padding:0 4px} QDoubleSpinBox{padding:4px} QScrollArea{border:0}"""
    def build_sidebar(self):
        panel=QFrame(); panel.setObjectName("panel"); panel.setMinimumWidth(190); box=QVBoxLayout(panel)
        box.addWidget(QLabel("COSTRUZIONE"))
        for title,tools in [("STRUMENTI",[("Seleziona","select"),("Muro","wall"),("Pavimento","floor"),("Porta","door"),("Finestra","window")]),("OGGETTI",[("Blocco","cube"),("Albero","tree")])]:
            box.addWidget(QLabel(title))
            for label,kind in tools:
                b=QPushButton(label); b.setCheckable(True); b.clicked.connect(lambda checked,k=kind:self.set_tool(k)); box.addWidget(b)
        box.addWidget(QLabel("RISORSE"))
        for label,fn in [("Importa cartella",self.import_folder),("Importa texture",self.import_textures),("Importa modello 3D",self.import_models)]: 
            b=QPushButton(label); b.clicked.connect(fn); box.addWidget(b)
        self.asset_list=QVBoxLayout(); asset_group=QGroupBox("Oggetti importati"); asset_group.setLayout(self.asset_list); box.addWidget(asset_group)
        transform=QGroupBox("TRASFORMA"); tb=QVBoxLayout(transform)
        for label,fn in [("Sposta",lambda:self.focus_field("x")),("Ruota",lambda:self.focus_field("rotation")),("Elimina",self.delete_selected),("Duplica",self.duplicate_selected)]:
            b=QPushButton(label); b.clicked.connect(fn); tb.addWidget(b)
        box.addWidget(transform); box.addStretch()
        return panel
    def build_inspector(self):
        panel=QFrame(); panel.setObjectName("panel"); panel.setMinimumWidth(240); box=QVBoxLayout(panel); box.addWidget(QLabel("PROPRIETÀ"))
        self.inspector=QFormLayout()
        self.fields={}
        for key,label in [("x","Posizione X"),("z","Posizione Z"),("sx","Larghezza"),("sy","Altezza"),("sz","Profondità"),("rotation","Rotazione °")]:
            spin=QDoubleSpinBox(); spin.setRange(-100000,100000); spin.setDecimals(1); spin.setSingleStep(.1 if key!="rotation" else 15); spin.valueChanged.connect(lambda v,k=key:self.update_selected(k,v)); self.fields[key]=spin; self.inspector.addRow(label,spin)
        box.addLayout(self.inspector)
        self.color_btn=QPushButton("Colore"); self.color_btn.clicked.connect(self.choose_color); box.addWidget(self.color_btn)
        self.texture_combo=QComboBox(); self.texture_combo.addItems(TEXTURES); self.texture_combo.currentTextChanged.connect(lambda v:self.update_material("texture",v)); box.addWidget(QLabel("Texture")); box.addWidget(self.texture_combo)
        self.finish_combo=QComboBox(); self.finish_combo.addItems(["Opaco","Satinato","Lucido","Metallico"]); self.finish_combo.currentTextChanged.connect(lambda v:self.update_material("finish",v)); box.addWidget(QLabel("Finitura")); box.addWidget(self.finish_combo)
        box.addStretch(); return panel
    def set_tool(self,k): self.viewport.tool=k
    def set_shortcuts(self):
        for key,fn in [("Delete",self.delete_selected),("Ctrl+S",self.save_project),("Ctrl+O",self.open_project),("Ctrl+Z",self.undo),("Ctrl+Y",self.redo),("V",lambda:self.set_tool("select"))]:
            a=QAction(self); a.setShortcut(QKeySequence(key)); a.triggered.connect(fn); self.addAction(a)
    def selection_changed(self,o):
        for key,w in self.fields.items():
            w.blockSignals(True); w.setValue(0 if o is None else (o["x"] if key=="x" else o["z"] if key=="z" else o["rotation"] if key=="rotation" else o["size"][{"sx":0,"sy":1,"sz":2}[key]])); w.setEnabled(o is not None); w.blockSignals(False)
        self.color_btn.setEnabled(o is not None); self.texture_combo.setEnabled(o is not None); self.finish_combo.setEnabled(o is not None)
        if o:
            self.color_btn.setText("Colore · "+o["color"]); self.texture_combo.blockSignals(True); self.texture_combo.setCurrentText(o.get("texture","Nessuna")); self.texture_combo.blockSignals(False)
            self.finish_combo.blockSignals(True); self.finish_combo.setCurrentText(o.get("finish","Opaco")); self.finish_combo.blockSignals(False)
    def update_selected(self,k,v):
        o=self.viewport.selected
        if not o:return
        if k=="x" or k=="z": o[k]=round(v*10)/10 if self.viewport.snap else v
        elif k=="rotation": o[k]=v
        else:
            idx={"sx":0,"sy":1,"sz":2}[k]; o["size"][idx]=max(.1,round(v*10)/10)
        self.viewport.update(); self.push_history()
    def update_material(self,k,v):
        if self.viewport.selected: self.viewport.selected[k]=v; self.viewport.update(); self.push_history()
    def choose_color(self):
        if not self.viewport.selected:return
        c=QColorDialog.getColor(QColor(self.viewport.selected["color"]),self)
        if c.isValid(): self.viewport.selected["color"]=c.name(); self.selection_changed(self.viewport.selected); self.viewport.update(); self.push_history()
    def focus_field(self,k): self.fields[k].setFocus()
    def delete_selected(self):
        o=self.viewport.selected
        if o in self.viewport.items:self.viewport.items.remove(o); self.viewport.selected=None; self.selection_changed(None); self.viewport.update(); self.push_history()
    def duplicate_selected(self):
        if not self.viewport.selected:return
        o=copy.deepcopy(self.viewport.selected); o["id"]=uuid.uuid4().hex; o["x"]+=1; o["z"]+=1; self.viewport.items.append(o); self.viewport.selected=o; self.selection_changed(o); self.viewport.update(); self.push_history()
    def clear(self):
        if QMessageBox.question(self,"World3D","Eliminare tutti gli elementi dal piano?")!=QMessageBox.Yes:return
        self.viewport.items=[]; self.viewport.selected=None; self.selection_changed(None); self.viewport.update(); self.push_history()
    def project_data(self):
        return {"format":"world3d-project","version":1,"plane":{"width":self.viewport.width_m,"depth":self.viewport.depth_m},"items":self.viewport.items,"models":self.models,"textures":self.textures}
    def save_to(self,path):
        Path(path).write_text(json.dumps(self.project_data(),ensure_ascii=False,indent=2),encoding="utf-8")
    def save_project(self):
        path=QFileDialog.getSaveFileName(self,"Salva progetto","","World3D (*.json)")[0]
        if path:self.save_to(path); self.statusBar().showMessage("Progetto salvato",4000)
    def export_project(self): self.save_project()
    def open_project(self):
        path=QFileDialog.getOpenFileName(self,"Apri progetto","","World3D (*.json)")[0]
        if not path:return
        try:
            d=json.loads(Path(path).read_text(encoding="utf-8"))
            if d.get("format")!="world3d-project" or d.get("version")!=1: raise ValueError("Formato progetto non supportato")
            self.viewport.items=d.get("items",[]); self.models=d.get("models",{}); self.textures=d.get("textures",{})
            self.viewport.set_plane(d["plane"]["width"],d["plane"]["depth"]); self.viewport.selected=None; self.selection_changed(None); self.render_assets(); self.viewport.update(); self.push_history()
        except Exception as e: QMessageBox.critical(self,"World3D",f"Impossibile aprire il progetto:\n{e}")
    def settings(self):
        w,d=self.viewport.width_m,self.viewport.depth_m
        w,ok=QInputDialog.getDouble(self,"Dimensioni piano","Larghezza X (m)",w,.1,1000000,1)
        if not ok:return
        d,ok=QInputDialog.getDouble(self,"Dimensioni piano","Profondità Z (m)",d,.1,1000000,1)
        if ok:self.viewport.set_plane(w,d); self.statusBar().showMessage(f"Piano · {w:.1f} × {d:.1f} m",4000); self.push_history()
    def import_models(self):
        paths=QFileDialog.getOpenFileNames(self,"Importa modelli 3D","","Modelli 3D (*.glb *.gltf *.obj *.stl)")[0]
        self.load_models(paths)
    def import_folder(self):
        folder=QFileDialog.getExistingDirectory(self,"Importa cartella")
        if not folder:return
        p=Path(folder); self.load_models([str(f) for f in p.rglob("*") if f.suffix.lower() in (".glb",".gltf",".obj",".stl")])
        self.load_textures([str(f) for f in p.rglob("*") if f.suffix.lower() in (".png",".jpg",".jpeg",".webp")])
    def load_models(self,paths):
        if not trimesh and paths:
            QMessageBox.warning(self,"World3D","Per importare modelli installa il pacchetto python3-trimesh."); return
        for path in paths:
            try:
                scene=trimesh.load(path,force="scene")
                meshes=list(scene.geometry.values()) if isinstance(scene,trimesh.Scene) else [scene]
                vertices=[]; faces=[]; offset=0
                for m in meshes:
                    v=np.asarray(m.vertices,float); f=np.asarray(m.faces,int)
                    vertices.extend(v.tolist()); faces.extend((f+offset).tolist()); offset+=len(v)
                v=np.asarray(vertices,float); center=(v.min(0)+v.max(0))/2; v-=center
                extent=v.max(0)-v.min(0); factor=2/max(extent.max(),.001); v*=factor; v[:,1]-=v[:,1].min()
                base=np.maximum(extent*factor,.1)
                o={"id":uuid.uuid4().hex,"kind":"model","x":0.,"z":0.,"rotation":0.,"size":base.tolist(),"base_size":base.tolist(),"color":COLORS["model"],"texture":"Nessuna","finish":"Opaco","vertices":v.tolist(),"faces":faces,"asset_name":Path(path).name}
                self.models[o["id"]]=copy.deepcopy(o); self.viewport.items.append(o); self.viewport.selected=o
            except Exception as e: QMessageBox.warning(self,"World3D",f"{Path(path).name}: {e}")
        self.selection_changed(self.viewport.selected); self.render_assets(); self.viewport.update(); self.push_history()
    def import_textures(self):
        paths=QFileDialog.getOpenFileNames(self,"Importa texture","","Immagini (*.png *.jpg *.jpeg *.webp)")[0]; self.load_textures(paths)
    def load_textures(self,paths):
        for p in paths:
            try:self.textures[Path(p).name]=base64.b64encode(Path(p).read_bytes()).decode("ascii")
            except Exception:pass
        self.render_assets()
    def render_assets(self):
        while self.asset_list.count():
            w=self.asset_list.takeAt(0).widget()
            if w:w.deleteLater()
        for aid,name in self.models.items():
            row=QHBoxLayout(); b=QPushButton(name); b.clicked.connect(lambda checked=False,k=aid:self.insert_model(k)); rm=QToolButton(); rm.setText("♲"); rm.clicked.connect(lambda checked=False,k=aid:self.remove_asset(k)); row.addWidget(b,1); row.addWidget(rm); holder=QWidget(); holder.setLayout(row); self.asset_list.addWidget(holder)
    def insert_model(self,aid):
        # I modelli importati sono già disponibili come geometrie nel progetto: duplicazione da catalogo.
        source=self.models.get(aid)
        if source:
            o=copy.deepcopy(source); o["id"]=uuid.uuid4().hex; o["x"]+=1; o["z"]+=1; self.viewport.items.append(o); self.viewport.selected=o; self.selection_changed(o); self.viewport.update(); self.push_history()
    def remove_asset(self,aid):
        self.models.pop(aid,None); self.render_assets()
    def push_history(self):
        state=json.dumps({"items":self.viewport.items,"plane":[self.viewport.width_m,self.viewport.depth_m]},separators=(",",":"))
        if self.history and self.history[self.history_index]==state:return
        self.history=self.history[:self.history_index+1]; self.history.append(state)
        if len(self.history)>40:self.history.pop(0)
        self.history_index=len(self.history)-1
    def restore_history(self,index):
        if index<0 or index>=len(self.history):return
        self.history_index=index; d=json.loads(self.history[index]); self.viewport.items=d["items"]; self.viewport.set_plane(*d["plane"]); self.viewport.selected=None; self.selection_changed(None); self.viewport.update()
    def undo(self): self.restore_history(self.history_index-1)
    def redo(self): self.restore_history(self.history_index+1)

def main():
    fmt=QSurfaceFormat(); fmt.setVersion(2,1); fmt.setProfile(QSurfaceFormat.CompatibilityProfile); fmt.setDepthBufferSize(24); fmt.setSamples(4); QSurfaceFormat.setDefaultFormat(fmt)
    app=QApplication(sys.argv); app.setApplicationName("World3D")
    win=MainWindow(); win.show(); sys.exit(app.exec())
if __name__=="__main__": main()
