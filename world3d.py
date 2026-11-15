#!/usr/bin/env python3
"""World3D - editor desktop Linux."""
from __future__ import annotations
import sys, json, math, base64, copy, uuid, io, locale
from pathlib import Path
import numpy as np
from PySide6.QtCore import Qt, Signal, QSettings
from PySide6.QtGui import QColor, QSurfaceFormat, QAction, QKeySequence, QPainter, QPen, QFont, QFontDatabase
from PySide6.QtWidgets import (QApplication, QMainWindow, QWidget, QHBoxLayout, QVBoxLayout,
    QGridLayout, QSplitter, QFrame, QLabel, QPushButton, QToolButton, QComboBox,
    QDoubleSpinBox, QColorDialog, QFileDialog, QMessageBox, QScrollArea, QLineEdit,
    QGroupBox, QFormLayout, QInputDialog, QMenu, QDialog, QDialogButtonBox)
from PySide6.QtOpenGLWidgets import QOpenGLWidget
from OpenGL.GL import *
from OpenGL.GLU import *
from PIL import Image, ImageDraw
try:
    import trimesh
except ImportError:
    trimesh = None

APP_DIR = Path(__file__).resolve().parent
COLORS = {"wall":"#d7d0c5","floor":"#b6a995","door":"#9b7653","window":"#91b9ca","cube":"#9da8b7","tree":"#6e9a72","model":"#b7bdc5"}
LABELS = {"wall":"Muro","floor":"Pavimento","door":"Porta","window":"Finestra","cube":"Blocco","tree":"Albero","model":"Modello 3D"}
DEFAULTS = {"wall":(3,2.8,.18),"floor":(3,.12,3),"door":(.95,2.1,.12),"window":(1.4,1.1,.12),"cube":(1,1,1),"tree":(1.6,2.9,1.6)}
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
        for index,(radius,height,cy) in enumerate([(.16,1.3,.65),(.78,1.55,1.3)]):
            if not trimesh: continue
            m=(trimesh.creation.cylinder(radius=radius,height=height,sections=12) if index==0
               else trimesh.creation.cone(radius=radius,height=height,sections=12))
            rotate=trimesh.transformations.rotation_matrix(-math.pi/2,[1,0,0])
            m.apply_transform(rotate); m.apply_translation([0,cy,0]); meshes.append(m)
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
        self.transform_mode="translate"; self.drag_origin=None; self.dragging=False; self.texture_assets={}; self.gl_textures={}; self.procedural_images={}
        self.yaw=math.radians(42); self.pitch=math.radians(34); self.distance=58.
        self.target=np.array([0.,0.,0.]); self.grid=True; self.snap=True
        self.tool="select"; self.last_pos=None; self.dragging=False; self.drag_axis=None; self.drag_axis_vector=None; self.drag_start_pos=None
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
        self.draw_gizmo()
        self.draw_orientation_widget()
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
        glLineWidth(2.6); glBegin(GL_LINES)
        glColor3f(.88,.20,.22); glVertex3f(-2.5,.035,0); glVertex3f(2.5,.035,0)
        glColor3f(.20,.72,.36); glVertex3f(0,0,0); glVertex3f(0,3.0,0)
        glColor3f(.20,.48,.95); glVertex3f(0,.035,-2.5); glVertex3f(0,.035,2.5)
        glEnd(); glLineWidth(1.0); glEnable(GL_LIGHTING)
    def draw_gizmo(self):
        if not self.selected: return
        glDisable(GL_LIGHTING); glPushMatrix()
        glTranslatef(self.selected["x"],.08,self.selected["z"])
        glLineWidth(3.2); glBegin(GL_LINES)
        glColor3f(.90,.20,.22); glVertex3f(0,0,0); glVertex3f(2.0,0,0)
        glColor3f(.20,.75,.38); glVertex3f(0,0,0); glVertex3f(0,2.0,0)
        glColor3f(.22,.50,.98); glVertex3f(0,0,0); glVertex3f(0,0,2.0)
        glEnd(); glLineWidth(1.0); glPopMatrix(); glEnable(GL_LIGHTING)
    def draw_orientation_widget(self):
        p=QPainter(self); p.setRenderHint(QPainter.Antialiasing)
        p.setPen(Qt.NoPen); p.setBrush(QColor(32,35,41,225)); p.drawRoundedRect(self.width()-76,14,62,62,10,10)
        p.setPen(QPen(QColor("#e34b50"),2)); p.drawLine(self.width()-45,45,self.width()-20,45)
        p.setPen(QPen(QColor("#38b96a"),2)); p.drawLine(self.width()-45,45,self.width()-45,21)
        p.setPen(QPen(QColor("#4d8df5"),2)); p.drawLine(self.width()-45,45,self.width()-61,59)
        p.setFont(QFont("Google Sans",10,QFont.Bold))
        p.setPen(QColor("#e34b50")); p.drawText(self.width()-18,49,"X")
        p.setPen(QColor("#38b96a")); p.drawText(self.width()-49,19,"Y")
        p.setPen(QColor("#4d8df5")); p.drawText(self.width()-70,67,"Z")
        p.end()
    def draw_item(self,o):
        glPushMatrix(); glTranslatef(o["x"],0,o["z"]); glRotatef(o.get("rotation",0),0,1,0)
        base=np.array(o.get("base_size",o["size"]),float); size=np.array(o["size"],float)
        scale=np.divide(size,base,out=np.ones(3),where=base!=0); glScalef(*scale)
        c=QColor(o.get("color","#b7bdc5")); glColor4f(c.redF(),c.greenF(),c.blueF(),.72 if o.get("texture")=="Vetro" else 1)
        finish=o.get("finish","Opaco")
        shine={"Opaco":8.0,"Satinato":35.0,"Lucido":85.0,"Metallico":110.0}.get(finish,8.0)
        spec=0.75 if finish in ("Lucido","Metallico") else .28 if finish=="Satinato" else .08
        glMaterialfv(GL_FRONT_AND_BACK,GL_SPECULAR,[spec,spec,spec,1]); glMaterialf(GL_FRONT_AND_BACK,GL_SHININESS,shine)
        if o.get("texture")=="Vetro": glDepthMask(GL_FALSE)
        verts=np.asarray(o["vertices"],float); faces=np.asarray(o["faces"],int)
        tex_name=o.get("texture","Nessuna")
        tex_id=self.texture_id(tex_name)
        if tex_id:
            glEnable(GL_TEXTURE_2D); glBindTexture(GL_TEXTURE_2D,tex_id)
        else: glDisable(GL_TEXTURE_2D)
        glBegin(GL_TRIANGLES)
        for tri in faces:
            a,b,c0=verts[tri]; n=np.cross(b-a,c0-a); ln=np.linalg.norm(n)
            if ln: n=n/ln; glNormal3f(*n)
            for idx in tri:
                v=verts[idx]
                if abs(n[1])>=abs(n[0]) and abs(n[1])>=abs(n[2]): uv=(v[0],v[2])
                elif abs(n[0])>=abs(n[2]): uv=(v[2],v[1])
                else: uv=(v[0],v[1])
                if tex_name=="Piastrelle": uv=(uv[0]*2.5,uv[1]*2.5)
                elif tex_name=="Mattoni": uv=(uv[0],uv[1]*.5)
                if tex_id: glTexCoord2f(uv[0],uv[1])
                glVertex3f(*v)
        glEnd()
        glDisable(GL_TEXTURE_2D)
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
    def clear_texture_cache(self):
        self.makeCurrent()
        if self.gl_textures:
            glDeleteTextures(list(self.gl_textures.values()))
            self.gl_textures.clear()
        self.doneCurrent()
    def texture_id(self,name):
        if not name or name=="Nessuna": return 0
        if name in self.gl_textures: return self.gl_textures[name]
        data=self.texture_assets.get(name)
        try:
            if data:
                encoded=data.split(",",1)[1] if "," in data else data
                img=Image.open(io.BytesIO(base64.b64decode(encoded))).convert("RGBA")
            else:
                img=Image.new("RGBA",(256,256),(160,160,160,255)); d=ImageDraw.Draw(img)
                if name=="Legno":
                    img.paste((157,105,67,255),(0,0,256,256))
                    for y in range(0,256,12): d.line((0,y,256,y+3),fill=(91,57,35,255),width=2)
                elif name=="Piastrelle":
                    img.paste((218,214,205,255),(0,0,256,256))
                    for p in range(0,257,64): d.line((p,0,p,256),fill=(120,117,111,255),width=3); d.line((0,p,256,p),fill=(120,117,111,255),width=3)
                elif name=="Marmo":
                    img.paste((226,223,216,255),(0,0,256,256))
                    for p in range(8): d.line((p*37,0,p*37+80,256),fill=(160,158,151,255),width=2)
                elif name=="Cemento":
                    img.paste((145,149,148,255),(0,0,256,256))
                    for p in range(700):
                        x=(p*73)%256; y=(p*137)%256; d.point((x,y),fill=(190,192,187,255))
                elif name=="Mattoni":
                    img.paste((164,91,72,255),(0,0,256,256))
                    for y in range(0,256,32):
                        d.line((0,y,256,y),fill=(215,177,158,255),width=3)
                        off=0 if (y//32)%2 else 64
                        for x in range(off,256,128): d.line((x,y,x,y+32),fill=(215,177,158,255),width=3)
                elif name=="Tessuto":
                    img.paste((120,137,128,255),(0,0,256,256))
                    for p in range(0,256,4): d.line((p,0,p,256),fill=(170,180,171,255)); d.line((0,p,256,p),fill=(75,91,82,255))
                elif name=="Metallo":
                    for x in range(256):
                        c=int(100+100*x/255); d.line((x,0,x,256),fill=(c,min(255,c+20),min(255,c+25),255))
                elif name=="Vetro":
                    img.paste((151,203,220,180),(0,0,256,256)); d.line((0,220,256,20),fill=(235,250,255,220),width=18)
            raw=img.transpose(Image.Transpose.FLIP_TOP_BOTTOM).tobytes()
            tex=glGenTextures(1); glBindTexture(GL_TEXTURE_2D,tex)
            glTexParameteri(GL_TEXTURE_2D,GL_TEXTURE_WRAP_S,GL_REPEAT); glTexParameteri(GL_TEXTURE_2D,GL_TEXTURE_WRAP_T,GL_REPEAT)
            glTexParameteri(GL_TEXTURE_2D,GL_TEXTURE_MIN_FILTER,GL_LINEAR_MIPMAP_LINEAR); glTexParameteri(GL_TEXTURE_2D,GL_TEXTURE_MAG_FILTER,GL_LINEAR)
            gluBuild2DMipmaps(GL_TEXTURE_2D,GL_RGBA,img.width,img.height,GL_RGBA,GL_UNSIGNED_BYTE,raw)
            self.gl_textures[name]=tex
            return tex
        except Exception:
            return 0
    def project(self,p):
        model=glGetDoublev(GL_MODELVIEW_MATRIX); proj=glGetDoublev(GL_PROJECTION_MATRIX); vp=glGetIntegerv(GL_VIEWPORT)
        return gluProject(*p,model,proj,vp)
    def pick(self,pos):
        self.makeCurrent()
        glMatrixMode(GL_MODELVIEW); glLoadIdentity(); eye=self.camera(); gluLookAt(*eye,*self.target,0,1,0)
        best=None; nearest=1e9; px=float(pos.x()); py=float(self.height()-pos.y())
        for o in self.items:
            verts=np.asarray(o["vertices"],float)
            base=np.asarray(o.get("base_size",o["size"]),float); size=np.asarray(o["size"],float)
            scale=np.divide(size,base,out=np.ones(3),where=base!=0)
            lo=verts.min(axis=0)*scale; hi=verts.max(axis=0)*scale
            corners=[]
            angle=math.radians(float(o.get("rotation",0))); c=math.cos(angle); sn=math.sin(angle)
            for x in (lo[0],hi[0]):
                for y in (lo[1],hi[1]):
                    for z in (lo[2],hi[2]):
                        corners.append((o["x"]+x*c+z*sn,y,o["z"]-x*sn+z*c))
            projected=[self.project(p) for p in corners]
            xs=[p[0] for p in projected]; ys=[self.height()-p[1] for p in projected]
            if min(xs)-7<=px<=max(xs)+7 and min(ys)-7<=py<=max(ys)+7:
                depth=sum(p[2] for p in projected)/len(projected)
                if depth<nearest: best=o; nearest=depth
        return best
    def axis_handle_at(self,pos):
        if not self.selected or self.transform_mode!="translate": return None
        self.makeCurrent(); glMatrixMode(GL_MODELVIEW); glLoadIdentity()
        eye=self.camera(); gluLookAt(*eye,*self.target,0,1,0)
        o=self.selected; p0=self.project((o["x"],.12,o["z"]))
        best=None; best_dist=12.0
        for axis,end in (("x",(o["x"]+2,.12,o["z"])),("z",(o["x"],.12,o["z"]+2))):
            p1=self.project(end); ax=p1[0]-p0[0]; ay=-(p1[1]-p0[1]); length=math.hypot(ax,ay)
            if length<1: continue
            vx,vy=ax/length,ay/length; px=pos.x()-p0[0]; py=pos.y()-(self.height()-p0[1])
            along=max(0,min(length,px*vx+py*vy)); dist=math.hypot(px-vx*along,py-vy*along)
            if dist<best_dist: best=(axis,(vx,vy,length)); best_dist=dist
        return best
    def mousePressEvent(self,e):
        self.last_pos=e.position().toPoint()
        if e.button()==Qt.LeftButton and self.tool=="select":
            handle=self.axis_handle_at(self.last_pos)
            if handle:
                self.dragging=True; self.drag_axis,self.drag_axis_vector=handle
                self.drag_origin=(self.selected["x"],self.selected["z"]); self.drag_start_pos=self.last_pos
            else:
                hit=self.pick(self.last_pos)
                if hit is not None and hit is self.selected:
                    self.dragging=True; self.drag_axis=None
                    self.drag_origin=self.screen_ground(self.last_pos)
                else:
                    self.selected=hit; self.selectedChanged.emit(self.selected)
            self.update()
        elif e.button()==Qt.LeftButton and self.tool!="select":
            x,z=self.screen_ground(self.last_pos); self.add_item(self.tool,x,z)
    def mouseMoveEvent(self,e):
        p=e.position().toPoint()
        if self.last_pos is not None and e.buttons() & Qt.LeftButton and self.dragging and self.selected:
            if self.transform_mode=="rotate":
                self.selected["rotation"]+= (p.x()-self.last_pos.x())*.5
            elif getattr(self,"drag_axis",None) and getattr(self,"drag_axis_vector",None):
                vx,vy,length=self.drag_axis_vector; start=getattr(self,"drag_start_pos",self.last_pos)
                delta=((p.x()-start.x())*vx+(p.y()-start.y())*vy)*2.0/max(1.0,length)
                key=self.drag_axis; base=self.drag_origin[0 if key=="x" else 1]; value=base+delta
                self.selected[key]=round(value*10)/10 if self.snap else value
            else:
                x,z=self.screen_ground(p)
                self.selected["x"]=round(x*10)/10 if self.snap else x
                self.selected["z"]=round(z*10)/10 if self.snap else z
            self.selectedChanged.emit(self.selected)
        elif self.last_pos is not None and e.buttons() & Qt.RightButton:
            delta=p-self.last_pos; self.yaw-=delta.x()*.008; self.pitch=max(.04,min(1.52,self.pitch+delta.y()*.008))
        elif self.last_pos is not None and e.buttons() & Qt.MiddleButton:
            delta=p-self.last_pos; self.target[0]-=delta.x()*self.distance/self.width()*.8; self.target[2]+=delta.y()*self.distance/self.height()*.8
        self.last_pos=p; self.update()
    def mouseReleaseEvent(self,e):
        if self.dragging:
            self.dragging=False; self.drag_origin=None; self.drag_axis=None; self.drag_axis_vector=None; self.drag_start_pos=None; self.changed.emit()
        self.last_pos=None
    def wheelEvent(self,e): self.distance=max(2,min(100000,self.distance*(.88 if e.angleDelta().y()>0 else 1.14))); self.update()
    def screen_ground(self,p):
        self.makeCurrent()
        glMatrixMode(GL_MODELVIEW); glLoadIdentity()
        eye=self.camera(); gluLookAt(*eye,*self.target,0,1,0)
        model=glGetDoublev(GL_MODELVIEW_MATRIX); proj=glGetDoublev(GL_PROJECTION_MATRIX)
        vp=glGetIntegerv(GL_VIEWPORT); wx=float(p.x()); wy=float(self.height()-p.y())
        near=np.array(gluUnProject(wx,wy,0.0,model,proj,vp),dtype=float)
        far=np.array(gluUnProject(wx,wy,1.0,model,proj,vp),dtype=float)
        direction=far-near
        if abs(direction[1])<1e-9: x,z=self.target[0],self.target[2]
        else:
            distance=-near[1]/direction[1]; point=near+direction*distance
            x,z=float(point[0]),float(point[2])
        if self.snap: x=round(x*10)/10; z=round(z*10)/10
        return max(-self.width_m/2,min(self.width_m/2,x)),max(-self.depth_m/2,min(self.depth_m/2,z))
    def add_item(self,kind,x,z):
        o=make_item(kind,x,z); self.items.append(o); self.selected=o; self.selectedChanged.emit(o); self.changed.emit(); self.update()
    def set_plane(self,w,d): self.width_m=max(.1,round(w,1)); self.depth_m=max(.1,round(d,1)); self.update()
    def set_transform(self,mode): self.transform_mode=mode
    def toggle_grid(self): self.grid=not self.grid; self.update()
    def toggle_snap(self): self.snap=not self.snap; self.update()
    def zoom(self,factor): self.distance=max(2,min(100000,self.distance*factor)); self.update()
    def set_top(self): self.pitch=1.52; self.yaw=0; self.update()
    def reset_view(self): self.yaw=math.radians(42); self.pitch=math.radians(34); self.distance=max(58,self.width_m*1.2,self.depth_m*1.2); self.target=np.zeros(3); self.update()

class MainWindow(QMainWindow):
    def __init__(self):
        super().__init__(); self.setWindowTitle("Editor 3D · World3D"); self.resize(1480,940)
        self.setMinimumSize(1120,720)
        font_dir=APP_DIR/"assets"/"fonts"
        for font_path in (font_dir/"GoogleSans-Regular.ttf",font_dir/"GoogleSans-Medium.ttf",font_dir/"MaterialSymbolsRounded.ttf"):
            if font_path.exists(): QFontDatabase.addApplicationFont(str(font_path))
        self.icon_font=QFont("Material Symbols Rounded",18)
        self.settings_store=QSettings("JonaDev2026","World3D")
        self.language_preference=self.settings_store.value("language","auto")
        self.hidden_models=set()
        self.lang="it"; self.translations={}; self.history=[]; self.history_index=-1; self.textures={}; self.models={}; self.current_path=None
        root=QWidget(); layout=QVBoxLayout(root); layout.setContentsMargins(0,0,0,0); layout.setSpacing(0)
        topbar=QFrame(); topbar.setObjectName("topbar"); top=QHBoxLayout(topbar); top.setContentsMargins(18,10,18,10); top.setSpacing(8)
        brand=QLabel("◈  Editor 3D"); brand.setObjectName("brand"); brand.setFont(QFont("Google Sans",16,QFont.DemiBold)); top.addWidget(brand); top.addStretch()
        self.save_state=QLabel("Progetto in modifica"); self.save_state.setObjectName("saveState"); top.addWidget(self.save_state)
        def top_button(label,fn,primary=False):
            b=QPushButton(label); b.setProperty("primary",primary); b.clicked.connect(fn); top.addWidget(b); return b
        top_button("save  Salva",self.save_project,True); top_button("folder_open  Apri",self.open_project)
        top_button("file_download  Esporta",self.export_project); top_button("settings  Impostazioni",self.settings)
        self.undo_btn=QPushButton("undo"); self.undo_btn.setFont(self.icon_font); self.undo_btn.setToolTip("Annulla"); self.undo_btn.clicked.connect(self.undo); top.addWidget(self.undo_btn)
        self.redo_btn=QPushButton("redo"); self.redo_btn.setFont(self.icon_font); self.redo_btn.setToolTip("Ripeti"); self.redo_btn.clicked.connect(self.redo); top.addWidget(self.redo_btn)
        top_button("delete_sweep  Svuota",self.clear); layout.addWidget(topbar)
        split=QSplitter(); split.setObjectName("workspace")
        self.viewport=Viewport(); self.viewport.selectedChanged.connect(self.selection_changed); self.viewport.changed.connect(self.push_history)
        center=QWidget(); center.setObjectName("viewportPanel"); center_layout=QVBoxLayout(center); center_layout.setContentsMargins(0,0,0,0); center_layout.setSpacing(0)
        viewbar=QFrame(); viewbar.setObjectName("viewbar"); view_layout=QHBoxLayout(viewbar); view_layout.setContentsMargins(12,7,12,7); view_layout.setSpacing(5)
        for label,fn in [("3d_rotation  Orbita",self.viewport.reset_view),("top_panel_open  Dall'alto",self.viewport.set_top),("grid_4x4  Griglia",self.viewport.toggle_grid),("magnet  Snap 0,1 m",self.viewport.toggle_snap),("remove",lambda:self.viewport.zoom(1.15)),("add",lambda:self.viewport.zoom(.87)),("center_focus_strong  Centra",self.viewport.reset_view)]:
            b=QPushButton(label); b.clicked.connect(fn); view_layout.addWidget(b)
        view_layout.addStretch(); center_layout.addWidget(viewbar); center_layout.addWidget(self.viewport,1)
        split.addWidget(self.build_sidebar()); split.addWidget(center); split.addWidget(self.build_inspector()); split.setSizes([235,970,275]); split.setCollapsible(0,False); split.setCollapsible(2,False)
        layout.addWidget(split,1)
        footer=QFrame(); footer.setObjectName("footer"); foot=QHBoxLayout(footer); foot.setContentsMargins(16,5,16,5)
        self.object_count=QLabel("0 elementi"); foot.addWidget(self.object_count); foot.addSpacing(14); foot.addWidget(QLabel("Griglia 0,1 m")); foot.addStretch()
        foot.addWidget(QLabel("V  Seleziona    Del  Elimina    Ctrl+Z  Annulla")); layout.addWidget(footer)
        self.setCentralWidget(root); self.setStyleSheet(self.styles())
        self.set_tool("select"); self.selection_changed(None)
        self.apply_language(self.language_preference)
        self.statusBar().showMessage("Piano vuoto · 40 × 40 m")
        self.push_history()
        self.set_shortcuts()
    def styles(self):
        return """QMainWindow,QWidget{background:#17191d;color:#e8eaed;font-family:'Google Sans','Noto Sans',sans-serif;font-size:13px}
        QFrame#topbar,QFrame#footer{background:#202329;border:0}
        QLabel#brand{font-size:18px;font-weight:600;color:#f1f3f4;padding:2px 8px}
        QLabel#saveState{color:#9aa0a6;font-size:12px;padding:0 10px}
        QFrame#panel{background:#202329}
        QPushButton,QComboBox,QLineEdit,QDoubleSpinBox{background:#292d34;border:1px solid #414751;border-radius:8px;padding:8px 10px;color:#e8eaed;min-height:18px}
        QPushButton:hover,QComboBox:hover{background:#343a44;border-color:#58616e}
        QPushButton:checked{background:#34465e;color:#c2d7fa;border-color:#536b8c}
        QPushButton[primary="true"]{background:#a8c7fa;color:#102b50;border-color:#a8c7fa;font-weight:600}
        QPushButton[primary="true"]:hover{background:#c1d7fb}
        QPushButton:disabled,QDoubleSpinBox:disabled,QComboBox:disabled{color:#707782;background:#22262c}
        QFrame#viewbar{background:#202329;border-bottom:1px solid #383d46}
        QFrame#viewbar QPushButton{padding:7px 11px;background:transparent;border:0;color:#c7cbd1}
        QFrame#viewbar QPushButton:hover{background:#343a44}
        QLabel#sectionTitle{font-size:14px;font-weight:700;color:#f1f3f4;padding:12px 8px 10px;border-bottom:1px solid #383d46}
        QLabel#groupLabel{font-size:11px;font-weight:700;letter-spacing:1px;color:#858b95;padding:10px 8px 5px}
        QPushButton#toolButton{text-align:left;background:transparent;border:0;padding:8px 12px;color:#c7cbd1;min-height:25px}
        QPushButton#toolButton:hover{background:#343a44}
        QPushButton#toolButton:checked{background:#34465e;color:#c2d7fa}
        QGroupBox{border:1px solid #414751;border-radius:9px;margin-top:12px;padding:10px;font-weight:600}
        QGroupBox::title{subcontrol-origin:margin;left:10px;padding:0 5px;color:#aeb4bd}
        QDoubleSpinBox{padding:5px 7px;min-height:20px}
        QScrollArea{border:0;background:transparent}
        QFrame#footer QLabel{font-size:12px;color:#aeb4bd}
        QToolButton{background:transparent;border:0;padding:8px;color:#c7cbd1}
        QToolButton:hover{background:#343a44;border-radius:7px}"""
    def build_sidebar(self):
        panel=QFrame(); panel.setObjectName("panel"); panel.setMinimumWidth(220); panel.setMaximumWidth(300)
        box=QVBoxLayout(panel); box.setContentsMargins(12,12,12,10); box.setSpacing(3)
        heading=QLabel("Costruzione"); heading.setObjectName("sectionTitle"); box.addWidget(heading)
        self.tool_buttons={}
        def section(name):
            label=QLabel(name.upper()); label.setObjectName("groupLabel"); box.addWidget(label)
        def tool(label,kind,icon):
            b=QPushButton(); b.setObjectName("toolButton"); b.setCheckable(True)
            row=QHBoxLayout(b); row.setContentsMargins(9,0,9,0); row.setSpacing(12)
            ico=QLabel(icon); ico.setFont(self.icon_font); ico.setMinimumWidth(22); ico.setStyleSheet("color:#aab0ba")
            txt=QLabel(label); txt.setStyleSheet("background:transparent;border:0")
            row.addWidget(ico); row.addWidget(txt); row.addStretch()
            b.clicked.connect(lambda checked,k=kind:self.set_tool(k)); self.tool_buttons[kind]=b; box.addWidget(b)
        section("Strumenti")
        for label,kind,icon in [("Seleziona","select","near_me"),("Muro","wall","width"),("Pavimento","floor","grid_on"),("Porta","door","door_front"),("Finestra","window","window")]: tool(label,kind,icon)
        section("Oggetti")
        for label,kind,icon in [("Blocco","cube","view_in_ar"),("Albero","tree","park")]: tool(label,kind,icon)
        section("Risorse")
        for label,fn,icon in [("Importa cartella",self.import_folder,"folder_open"),("Importa texture",self.import_textures,"texture"),("Importa modello 3D",self.import_models,"deployed_code")]:
            b=QPushButton(icon+"   "+label); b.setObjectName("toolButton"); b.clicked.connect(fn); box.addWidget(b)
        self.asset_toggle=QToolButton(); self.asset_toggle.setText("expand_more   Oggetti importati"); self.asset_toggle.setCheckable(True); self.asset_toggle.setChecked(True); box.addWidget(self.asset_toggle)
        asset_panel=QWidget(); self.asset_list=QVBoxLayout(asset_panel); self.asset_list.setContentsMargins(5,2,5,5); self.asset_list.setSpacing(4); box.addWidget(asset_panel)
        self.asset_toggle.toggled.connect(lambda shown:(asset_panel.setVisible(shown),self.asset_toggle.setText(("expand_more" if shown else "chevron_right")+"   Oggetti importati")))
        section("Trasforma")
        transform=QGroupBox(); tb=QVBoxLayout(transform); tb.setContentsMargins(7,9,7,7)
        for label,fn,icon in [("Sposta",lambda:self.viewport.set_transform("translate"),"open_with"),("Ruota",lambda:self.viewport.set_transform("rotate"),"rotate_right"),("Duplica",self.duplicate_selected,"content_copy"),("Elimina",self.delete_selected,"delete")]:
            b=QPushButton(icon+"   "+label); b.setObjectName("toolButton"); b.clicked.connect(fn); tb.addWidget(b)
        box.addWidget(transform); box.addStretch()
        return panel
    def build_inspector(self):
        panel=QFrame(); panel.setObjectName("panel"); panel.setMinimumWidth(250); panel.setMaximumWidth(340)
        outer=QVBoxLayout(panel); outer.setContentsMargins(14,12,14,10); outer.setSpacing(8)
        heading=QLabel("Proprietà"); heading.setObjectName("sectionTitle"); outer.addWidget(heading)
        self.empty_inspector=QLabel("Nessuna selezione\nSeleziona un elemento nel piano per modificarne le proprietà.")
        self.empty_inspector.setAlignment(Qt.AlignCenter); self.empty_inspector.setWordWrap(True); self.empty_inspector.setStyleSheet("color:#9aa0a6;padding:28px 12px")
        outer.addWidget(self.empty_inspector)
        self.inspector_content=QWidget(); content=QVBoxLayout(self.inspector_content); content.setContentsMargins(0,0,0,0); content.setSpacing(8)
        self.selected_label=QLabel("Oggetto"); self.selected_label.setStyleSheet("background:#2b3038;border:1px solid #383d46;border-radius:9px;padding:13px;font-weight:600")
        content.addWidget(self.selected_label)
        def group_title(text):
            l=QLabel(text.upper()); l.setObjectName("groupLabel"); content.addWidget(l)
        group_title("Posizione"); self.fields={}
        for key,label in [("x","Posizione X"),("z","Posizione Z"),("sx","Larghezza"),("sy","Altezza"),("sz","Profondità"),("rotation","Rotazione °")]:
            row=QHBoxLayout(); lab=QLabel(label); lab.setMinimumWidth(84); spin=QDoubleSpinBox(); spin.setRange(-100000,100000); spin.setDecimals(1); spin.setSingleStep(.1 if key!="rotation" else 15)
            spin.valueChanged.connect(lambda v,k=key:self.update_selected(k,v)); self.fields[key]=spin; row.addWidget(lab); row.addWidget(spin,1); content.addLayout(row)
        group_title("Colore"); self.color_btn=QPushButton("Scegli colore"); self.color_btn.clicked.connect(self.choose_color); content.addWidget(self.color_btn)
        palette=QGridLayout(); palette.setSpacing(6)
        for i,color in enumerate(PALETTE):
            swatch=QPushButton(); swatch.setFixedSize(25,25); swatch.setToolTip(color); swatch.setStyleSheet(f"background:{color};border:1px solid #69717c;border-radius:6px;padding:0")
            swatch.clicked.connect(lambda checked=False,c=color:self.set_color(c)); palette.addWidget(swatch,i//8,i%8)
        content.addLayout(palette)
        group_title("Texture"); self.texture_combo=QComboBox()
        for name in TEXTURES: self.texture_combo.addItem(name,name)
        self.texture_combo.currentIndexChanged.connect(lambda i:self.update_material("texture",self.texture_combo.itemData(i)) if i>=0 else None); content.addWidget(self.texture_combo)
        group_title("Finitura"); self.finish_combo=QComboBox()
        for name in ["Opaco","Satinato","Lucido","Metallico"]: self.finish_combo.addItem(name,name)
        self.finish_combo.currentIndexChanged.connect(lambda i:self.update_material("finish",self.finish_combo.itemData(i)) if i>=0 else None); content.addWidget(self.finish_combo); content.addStretch()
        scroll=QScrollArea(); scroll.setWidgetResizable(True); scroll.setWidget(self.inspector_content); outer.addWidget(scroll,1)
        self.inspector_content.setVisible(False)
        return panel
    def set_tool(self,k):
        self.viewport.tool=k
        for name,button in getattr(self,"tool_buttons",{}).items(): button.setChecked(name==k)
    def set_shortcuts(self):
        for key,fn in [("Delete",self.delete_selected),("Ctrl+S",self.save_project),("Ctrl+O",self.open_project),("Ctrl+Z",self.undo),("Ctrl+Y",self.redo),("V",lambda:self.set_tool("select"))]:
            a=QAction(self); a.setShortcut(QKeySequence(key)); a.triggered.connect(fn); self.addAction(a)
    def selection_changed(self,o):
        self.empty_inspector.setVisible(o is None); self.inspector_content.setVisible(o is not None)
        for key,w in self.fields.items():
            w.blockSignals(True)
            w.setValue(0 if o is None else (o["x"] if key=="x" else o["z"] if key=="z" else o["rotation"] if key=="rotation" else o["size"][{"sx":0,"sy":1,"sz":2}[key]]))
            w.setEnabled(o is not None); w.blockSignals(False)
        self.color_btn.setEnabled(o is not None); self.texture_combo.setEnabled(o is not None); self.finish_combo.setEnabled(o is not None)
        if o:
            self.selected_label.setText(LABELS.get(o.get("kind"),o.get("asset_name") or "Oggetto"))
            self.color_btn.setText("Colore · "+o["color"])
            self.texture_combo.blockSignals(True); self.texture_combo.setCurrentIndex(max(0,self.texture_combo.findData(o.get("texture","Nessuna")))); self.texture_combo.blockSignals(False)
            self.finish_combo.blockSignals(True); self.finish_combo.setCurrentIndex(max(0,self.finish_combo.findData(o.get("finish","Opaco")))); self.finish_combo.blockSignals(False)
        if hasattr(self,"object_count"): self.object_count.setText(f"{len(self.viewport.items)} elementi")
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
    def set_color(self,color):
        if not self.viewport.selected:return
        self.viewport.selected["color"]=color; self.selection_changed(self.viewport.selected); self.viewport.update(); self.push_history()
    def choose_color(self):
        if not self.viewport.selected:return
        c=QColorDialog.getColor(QColor(self.viewport.selected["color"]),self)
        if c.isValid(): self.set_color(c.name())
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
        kind_to_web={"Muro":"wall","Pavimento":"floor","Porta":"door","Finestra":"window","Blocco":"cube","Albero":"tree","Modello 3D":"model","wall":"wall","floor":"floor","door":"door","window":"window","cube":"cube","tree":"tree","model":"model"}
        tex_to_web={"Nessuna":"none","Legno":"wood","Piastrelle":"tile","Marmo":"marble","Cemento":"concrete","Mattoni":"brick","Tessuto":"fabric","Metallo":"metal","Vetro":"glass"}
        finish_to_web={"Opaco":"matte","Satinato":"satin","Lucido":"glossy","Metallico":"metallic"}
        items=[]
        for o in self.viewport.items:
            kind=kind_to_web.get(o.get("kind"),"cube")
            size=o.get("size",[1,1,1])
            if isinstance(size,dict): size=[size.get("x",1),size.get("y",1),size.get("z",1)]
            item={"kind":kind,"x":float(o.get("x",0)),"z":float(o.get("z",0)),"rotation":math.radians(float(o.get("rotation",0)))%(2*math.pi),"size":{"x":size[0],"y":size[1],"z":size[2]},"color":o.get("color","#b7bdc5"),"texture":tex_to_web.get(o.get("texture","Nessuna"),("custom-"+o.get("texture")) if o.get("texture") in self.textures else o.get("texture","none")),"finish":finish_to_web.get(o.get("finish","Opaco"),o.get("finish","matte"))}
            if kind=="model": item["assetId"]=o.get("asset_id",o.get("id"))
            items.append(item)
        models=[]
        for aid,asset in self.models.items():
            if asset.get("asset_data"):
                models.append({"id":aid,"name":asset.get("asset_name",aid),"extension":asset.get("extension","glb"),"data":asset["asset_data"],"hiddenFromCatalog":aid in self.hidden_models})
        textures=[]
        for name,data in self.textures.items():
            ext=Path(name).suffix.lower().lstrip(".")
            mime={"jpg":"jpeg"}.get(ext,ext or "png")
            textures.append({"id":"custom-"+name,"name":name,"data":f"data:image/{mime};base64,{data}"})
        return {"format":"world3d-project","version":1,"plane":{"width":self.viewport.width_m,"depth":self.viewport.depth_m},"items":items,"models":models,"textures":textures}
    def save_to(self,path):
        Path(path).write_text(json.dumps(self.project_data(),ensure_ascii=False,indent=2),encoding="utf-8")
    def save_project(self):
        path=self.current_path or QFileDialog.getSaveFileName(self,"Salva progetto","","World3D (*.json)")[0]
        if path:
            self.save_to(path); self.current_path=path; self.statusBar().showMessage(self.t("Progetto salvato"),4000)
    def export_project(self):
        path=QFileDialog.getSaveFileName(self,"Esporta progetto","","World3D (*.json)")[0]
        if path: self.save_to(path); self.statusBar().showMessage(self.t("Progetto esportato"),4000)
    def model_from_asset(self,asset):
        if not trimesh: raise RuntimeError("Il pacchetto python3-trimesh è necessario per importare modelli.")
        ext=str(asset.get("extension","")).lower()
        data=asset.get("data","")
        encoded=data.split(",",1)[1] if "," in data else data
        raw=base64.b64decode(encoded)
        scene=trimesh.load(io.BytesIO(raw),file_type=ext,force="scene")
        merged=scene.dump(concatenate=True) if isinstance(scene,trimesh.Scene) else scene
        if merged is None: raise ValueError("Il modello non contiene geometrie.")
        vertices=np.asarray(merged.vertices,float); faces=np.asarray(merged.faces,int)
        center=(vertices.min(0)+vertices.max(0))/2; vertices-=center
        extent=vertices.max(0)-vertices.min(0); factor=2/max(float(extent.max()),.001)
        vertices*=factor; vertices[:,1]-=vertices[:,1].min()
        base=np.maximum(extent*factor,.1)
        aid=asset.get("id") or uuid.uuid4().hex
        return {"id":uuid.uuid4().hex,"asset_id":aid,"kind":"model","x":0.,"z":0.,"rotation":0.,"size":base.tolist(),"base_size":base.tolist(),"color":COLORS["model"],"texture":"Nessuna","finish":"Opaco","vertices":vertices.tolist(),"faces":faces.tolist(),"asset_name":asset.get("name",aid),"extension":ext,"asset_data":data}
    def open_project(self):
        path=QFileDialog.getOpenFileName(self,"Apri progetto","","World3D (*.json)")[0]
        if not path:return
        try:
            d=json.loads(Path(path).read_text(encoding="utf-8"))
            if d.get("format")!="world3d-project" or d.get("version")!=1: raise ValueError("Formato progetto non supportato")
            raw_models=d.get("models",{})
            self.models={}; self.hidden_models=set()
            if isinstance(raw_models,list):
                for asset in raw_models:
                    proto=self.model_from_asset(asset); self.models[proto["asset_id"]]=proto
                    if asset.get("hiddenFromCatalog"): self.hidden_models.add(proto["asset_id"])
            elif isinstance(raw_models,dict):
                self.models=raw_models
            raw_textures=d.get("textures",{})
            texture_ids={}
            if isinstance(raw_textures,list):
                self.textures={}
                for asset in raw_textures:
                    name=asset.get("name",asset.get("id","texture"))
                    self.textures[name]=asset.get("data","").split(",",1)[1] if "," in asset.get("data","") else asset.get("data","")
                    texture_ids[asset.get("id",name)]=name
            else: self.textures=raw_textures
            self.viewport.texture_assets=self.textures
            self.viewport.clear_texture_cache()
            self.texture_combo.blockSignals(True); self.texture_combo.clear()
            for name in TEXTURES: self.texture_combo.addItem(name,name)
            for name in self.textures: self.texture_combo.addItem(name,name)
            self.texture_combo.blockSignals(False)
            web_tex={"none":"Nessuna","wood":"Legno","tile":"Piastrelle","marble":"Marmo","concrete":"Cemento","brick":"Mattoni","fabric":"Tessuto","metal":"Metallo","glass":"Vetro"}
            web_finish={"matte":"Opaco","satin":"Satinato","glossy":"Lucido","metallic":"Metallico"}
            loaded=[]
            for item in d.get("items",[]):
                kind=item.get("kind","cube")
                if "vertices" in item and "faces" in item:
                    o=item
                elif kind=="model":
                    aid=item.get("assetId") or item.get("asset_id")
                    proto=self.models.get(aid)
                    if proto is None: raise ValueError(f"Modello importato mancante: {aid}")
                    o=copy.deepcopy(proto); o["id"]=uuid.uuid4().hex; o["asset_id"]=aid
                else:
                    o=make_item(kind,float(item.get("x",0)),float(item.get("z",0)))
                o["x"]=float(item.get("x",0)); o["z"]=float(item.get("z",0))
                rot=float(item.get("rotation",0))
                o["rotation"]=math.degrees(rot) if abs(rot)<=6.4 else rot
                size=item.get("size",o.get("size",[1,1,1]))
                if isinstance(size,dict): size=[size.get("x",1),size.get("y",1),size.get("z",1)]
                o["size"]=[float(v) for v in size]
                o["color"]=item.get("color",o.get("color","#b7bdc5"))
                tex=item.get("texture",o.get("texture","Nessuna")); o["texture"]=web_tex.get(tex,texture_ids.get(tex,tex))
                fin=item.get("finish",o.get("finish","Opaco")); o["finish"]=web_finish.get(fin,fin)
                loaded.append(o)
            self.viewport.items=loaded; self.viewport.selected=None; self.current_path=path
            self.viewport.set_plane(d["plane"]["width"],d["plane"]["depth"])
            self.selection_changed(None); self.render_assets(); self.viewport.update(); self.history=[]; self.history_index=-1; self.push_history()
        except Exception as e: QMessageBox.critical(self,"World3D",f"Impossibile aprire il progetto:\n{e}")
    def t(self,key): return self.translations.get(key,key)
    def apply_language(self,preference):
        code=preference
        if code=="auto":
            system=(locale.getlocale()[0] or "en").lower()
            code=next((x for x in ("it","fr","es") if system.startswith(x)),"en")
        if code not in ("it","en","fr","es"): code="en"
        path=APP_DIR/"locales"/f"{code}.json"
        try: self.translations=json.loads(path.read_text(encoding="utf-8"))
        except Exception: self.translations={}
        self.lang=code
        for widget in self.findChildren(QWidget):
            if isinstance(widget,QComboBox):
                for i in range(widget.count()):
                    source=widget.itemData(i)
                    if source is None:
                        source=widget.itemText(i); widget.setItemData(i,source)
                    widget.setItemText(i,self.t(str(source)))
            elif isinstance(widget,(QLabel,QPushButton,QToolButton,QGroupBox)):
                getter=widget.title if isinstance(widget,QGroupBox) else widget.text
                setter=widget.setTitle if isinstance(widget,QGroupBox) else widget.setText
                source=widget.property("world3d_source_text")
                if source is None:
                    source=getter(); widget.setProperty("world3d_source_text",source)
                setter(self.t(source))
        self.setWindowTitle(self.t("World3D"))
    def settings(self):
        dialog=QDialog(self); dialog.setWindowTitle(self.t("Impostazioni")); dialog.setMinimumWidth(360)
        form=QFormLayout(dialog)
        width=QDoubleSpinBox(); width.setRange(.1,1000000); width.setDecimals(1); width.setSingleStep(.1); width.setValue(self.viewport.width_m)
        depth=QDoubleSpinBox(); depth.setRange(.1,1000000); depth.setDecimals(1); depth.setSingleStep(.1); depth.setValue(self.viewport.depth_m)
        language=QComboBox()
        for code,label in [("auto","Automatico (sistema)"),("it","Italiano"),("en","English"),("fr","Français"),("es","Español")]: language.addItem(self.t(label),code)
        language.setCurrentIndex(max(0,language.findData(self.language_preference)))
        form.addRow(self.t("Larghezza (X)"),width); form.addRow(self.t("Profondità (Z)"),depth); form.addRow(self.t("Lingua"),language)
        buttons=QDialogButtonBox(QDialogButtonBox.Ok|QDialogButtonBox.Cancel)
        buttons.accepted.connect(dialog.accept); buttons.rejected.connect(dialog.reject); form.addRow(buttons)
        if dialog.exec()==QDialog.Accepted:
            self.viewport.set_plane(width.value(),depth.value())
            self.language_preference=language.currentData()
            self.settings_store.setValue("language",self.language_preference)
            self.apply_language(self.language_preference)
            self.statusBar().showMessage(self.t("Modifiche non salvate"),4000); self.push_history()
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
                merged=scene.dump(concatenate=True) if isinstance(scene,trimesh.Scene) else scene
                if merged is None: raise ValueError("Nessuna geometria trovata")
                # Normalizza gli import nel formato GLB autonomo, includendo le risorse del modello.
                blob=merged.export(file_type="glb")
                aid=uuid.uuid4().hex
                asset={"id":aid,"name":Path(path).name,"extension":"glb","data":"data:model/gltf-binary;base64,"+base64.b64encode(blob).decode("ascii")}
                o=self.model_from_asset(asset); o["asset_name"]=Path(path).name
                self.models[aid]=copy.deepcopy(o); self.viewport.items.append(o); self.viewport.selected=o
            except Exception as e: QMessageBox.warning(self,"World3D",f"{Path(path).name}: {e}")
        self.selection_changed(self.viewport.selected); self.render_assets(); self.viewport.update(); self.push_history()
    def import_textures(self):
        paths=QFileDialog.getOpenFileNames(self,"Importa texture","","Immagini (*.png *.jpg *.jpeg *.webp)")[0]; self.load_textures(paths)
    def load_textures(self,paths):
        for p in paths:
            try:self.textures[Path(p).name]=base64.b64encode(Path(p).read_bytes()).decode("ascii")
            except Exception:pass
        self.viewport.texture_assets=self.textures
        self.viewport.clear_texture_cache()
        for name in self.textures:
            if self.texture_combo.findData(name)<0: self.texture_combo.addItem(name,name)
        self.render_assets()
    def render_assets(self):
        while self.asset_list.count():
            w=self.asset_list.takeAt(0).widget()
            if w:w.deleteLater()
        for aid,asset in self.models.items():
            if aid in self.hidden_models: continue
            name=asset.get("asset_name",aid) if isinstance(asset,dict) else str(asset)
            row=QHBoxLayout(); b=QPushButton(name); b.setToolTip("Inserisci una copia nel piano"); b.clicked.connect(lambda checked=False,k=aid:self.insert_model(k)); rm=QToolButton(); rm.setText("×"); rm.setToolTip("Rimuovi dalla lista"); rm.clicked.connect(lambda checked=False,k=aid:self.remove_asset(k)); row.addWidget(b,1); row.addWidget(rm); holder=QWidget(); holder.setLayout(row); self.asset_list.addWidget(holder)
    def insert_model(self,aid):
        source=self.models.get(aid)
        if source:
            o=copy.deepcopy(source); o["id"]=uuid.uuid4().hex; o["asset_id"]=aid
            o["x"]+=1; o["z"]+=1; self.viewport.items.append(o); self.viewport.selected=o
            self.selection_changed(o); self.viewport.update(); self.push_history()
    def remove_asset(self,aid):
        self.hidden_models.add(aid)
        self.render_assets(); self.push_history()
    def history_item(self,o):
        return {"id":o.get("id"),"kind":o.get("kind","cube"),"asset_id":o.get("asset_id",o.get("id") if o.get("kind")=="model" else None),
                "x":o.get("x",0),"z":o.get("z",0),"rotation":o.get("rotation",0),"size":o.get("size",[1,1,1]),
                "color":o.get("color","#b7bdc5"),"texture":o.get("texture","Nessuna"),"finish":o.get("finish","Opaco")}
    def push_history(self):
        state=json.dumps({"items":[self.history_item(o) for o in self.viewport.items],"plane":[self.viewport.width_m,self.viewport.depth_m],"hidden_models":list(self.hidden_models)},separators=(",",":"))
        if self.history and self.history[self.history_index]==state:return
        self.history=self.history[:self.history_index+1]; self.history.append(state)
        if len(self.history)>40:self.history.pop(0)
        self.history_index=len(self.history)-1
    def restore_history(self,index):
        if index<0 or index>=len(self.history):return
        self.history_index=index; d=json.loads(self.history[index]); restored=[]
        for item in d["items"]:
            kind=item.get("kind","cube")
            if kind=="model":
                aid=item.get("asset_id"); source=self.models.get(aid)
                if source is None: continue
                o=copy.deepcopy(source); o["id"]=item.get("id") or uuid.uuid4().hex; o["asset_id"]=aid
            else:
                o=make_item(kind,float(item.get("x",0)),float(item.get("z",0)))
            o["x"]=float(item.get("x",0)); o["z"]=float(item.get("z",0)); o["rotation"]=float(item.get("rotation",0))
            size=item.get("size",o.get("size",[1,1,1]))
            if isinstance(size,dict): size=[size.get("x",1),size.get("y",1),size.get("z",1)]
            o["size"]=[float(v) for v in size]
            o["color"]=item.get("color",o.get("color","#b7bdc5")); o["texture"]=item.get("texture","Nessuna"); o["finish"]=item.get("finish","Opaco")
            restored.append(o)
        self.viewport.items=restored; self.hidden_models=set(d.get("hidden_models",[])); self.render_assets()
        self.viewport.set_plane(*d["plane"]); self.viewport.selected=None; self.selection_changed(None); self.viewport.update()
    def undo(self): self.restore_history(self.history_index-1)
    def redo(self): self.restore_history(self.history_index+1)

def main():
    fmt=QSurfaceFormat(); fmt.setVersion(2,1); fmt.setProfile(QSurfaceFormat.CompatibilityProfile); fmt.setDepthBufferSize(24); fmt.setSamples(4); QSurfaceFormat.setDefaultFormat(fmt)
    app=QApplication(sys.argv); app.setApplicationName("World3D")
    win=MainWindow(); win.show(); sys.exit(app.exec())
if __name__=="__main__": main()
