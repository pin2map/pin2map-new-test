"use strict";
/* Geometry editor presentation. Area: three rows only (name/comments/actions).
 * River: compact name and four round actions. No map or storage APIs.
 */
(function(root){
  class GeometryEditor{
    constructor({document:doc,icons,onUpdate,onDelete,onClose,onWikipedia}){
      this.doc=doc;this.icons=icons;
      this.onUpdate=onUpdate;this.onDelete=onDelete;
      this.onClose=onClose||(()=>{});this.onWikipedia=onWikipedia;
      this.model=null;this.type=null;this.layers=[];
      this.panel=this.build();
    }
    makeButton(icon,label,callback,extra=""){
      const button=this.doc.createElement("button");
      button.type="button";button.className="geometry-round "+extra;
      button.title=label;button.setAttribute("aria-label",label);
      if(icon==="wikipedia"){
        const img=this.doc.createElement("img");
        img.src="./assets/wikipedia-social.svg";img.alt="";img.className="pin-wikipedia-logo";
        button.append(img);
      }else button.append(this.icons.svg(icon,this.doc));
      button.addEventListener("click",e=>{e.preventDefault();e.stopPropagation();callback();});
      return button;
    }
    build(){
      const doc=this.doc;
      const panel=doc.createElement("section");
      panel.id="geometryEditor";panel.className="geometry-editor hidden";
      panel.setAttribute("role","dialog");panel.setAttribute("aria-label","Objekt bearbeiten");
      const header=doc.createElement("div");header.className="geometry-head pin-editor-head";
      const remove=this.makeButton("x","Entfernen",()=>this.toggleSub("delete"),"geometry-remove");
      const field=doc.createElement("fieldset");field.className="pin-name-field";
      const legend=doc.createElement("legend");legend.id="geometryNameLegend";
      const name=doc.createElement("input");name.id="geometryName";
      name.type="text";name.maxLength=120;name.setAttribute("aria-label","Objektname");
      name.addEventListener("change",()=>this.update({name:name.value}));
      field.append(legend,name);header.append(remove,field);
      const notes=doc.createElement("fieldset");
      notes.className="geometry-notes";notes.id="geometryNotesRow";
      const notesLegend=doc.createElement("legend");notesLegend.textContent="Flächen Kommentare";
      const textarea=doc.createElement("textarea");
      textarea.id="geometryNotes";textarea.rows=4;
      textarea.placeholder="Kommentar eingeben …";
      textarea.addEventListener("change",()=>this.update({note:textarea.value}));
      notes.append(notesLegend,textarea);
      const actions=doc.createElement("div");actions.className="geometry-actions";
      const layer=this.makeButton("layers","Ebene ändern",()=>this.toggleSub("layer"),"geometry-layer");
      const link=this.makeButton("link-2","Link",()=>this.toggleSub("link"),"geometry-link");
      const wiki=this.makeButton("wikipedia","Wikipedia",()=>this.onWikipedia(this.model?.name||""),"geometry-wiki");
      const ok=this.makeButton("check","OK",()=>{this.flush();this.close();},"geometry-ok");
      actions.append(layer,link,wiki,ok);
      const sub=doc.createElement("div");sub.className="geometry-sub hidden";sub.id="geometrySub";
      panel.append(header,notes,actions,sub);
      this.removeButton=remove;this.layerButton=layer;this.linkButton=link;
      this.nameInput=name;this.notesInput=textarea;
      this.notesRow=notes;this.legend=legend;this.sub=sub;
      this.doc.getElementById("app").append(panel);
      this.doc.addEventListener("keydown",e=>{
        if(e.key==="Escape"&&!panel.classList.contains("hidden")){
          e.preventDefault();
          if(!sub.classList.contains("hidden"))this.toggleSub(null);
          else this.close();
        }
      });
      return panel;
    }
    flush(){
      if(!this.model)return;
      const changes={};
      if(this.nameInput.value.trim()&&this.nameInput.value.trim()!==this.model.name)
        changes.name=this.nameInput.value.trim();
      if(this.type==="area"&&this.notesInput.value!==this.model.note)
        changes.note=this.notesInput.value;
      if(Object.keys(changes).length)this.update(changes);
    }
    update(patch){
      if(!this.model)return;
      const changed=this.onUpdate(this.type,this.model.id,patch);
      if(changed)this.model=changed;
    }
    toggleSub(type){
      this.sub.replaceChildren();
      this.sub.classList.toggle("hidden",!type);
      this.sub.dataset.mode=type||"";
      this.layerButton.setAttribute("aria-expanded",String(type==="layer"));
      this.linkButton.setAttribute("aria-expanded",String(type==="link"));
      this.removeButton.setAttribute("aria-expanded",String(type==="delete"));
      if(!type)return;
      if(type==="layer"){
        const title=this.doc.createElement("strong");title.textContent="Ebene auswählen";
        this.sub.append(title);
        for(const layer of this.layers){
          const row=this.doc.createElement("button");row.type="button";
          row.className="geometry-layer-choice";
          row.textContent=layer.name;
          row.setAttribute("aria-pressed",String(layer.id===this.model.layerId));
          row.addEventListener("click",()=>{
            this.update({layerId:layer.id});this.toggleSub(null);
          });
          this.sub.append(row);
        }
      }else if(type==="link"){
        const heading=this.doc.createElement("strong");heading.textContent="Objekt-URL";
        const input=this.doc.createElement("textarea");input.rows=3;
        input.value=this.model.url||"";input.setAttribute("aria-label","Objekt-URL");
        const save=this.doc.createElement("button");save.type="button";save.textContent="Übernehmen";
        save.addEventListener("click",()=>{this.update({url:input.value.trim()});this.toggleSub(null);});
        const cancel=this.doc.createElement("button");cancel.type="button";cancel.textContent="Abbrechen";
        cancel.addEventListener("click",()=>this.toggleSub(null));
        this.sub.append(heading,input,save,cancel);input.focus({preventScroll:true});
      }else if(type==="delete"){
        const heading=this.doc.createElement("p");heading.textContent=this.type==="river"?
          "Fluss wirklich entfernen?":"Fläche wirklich entfernen?";
        const confirm=this.doc.createElement("button");confirm.type="button";
        confirm.className="geometry-confirm-remove";confirm.textContent="Löschen";
        confirm.addEventListener("click",()=>{
          this.onDelete(this.type,this.model.id);this.close();
        });
        const cancel=this.doc.createElement("button");cancel.type="button";
        cancel.textContent="Abbrechen";cancel.addEventListener("click",()=>this.toggleSub(null));
        this.sub.append(heading,confirm,cancel);
      }
    }
    show(type,item,layers,screen){
      this.close(false);
      this.type=type;this.model=item;this.layers=layers.filter(layer=>layer?.id);
      this.panel.classList.toggle("is-river",type==="river");
      this.panel.setAttribute("aria-label",type==="river"?"Fluss bearbeiten":"Fläche bearbeiten");
      this.legend.textContent=type==="river"?"Flussname":"Flächenname";
      this.notesRow.classList.toggle("hidden",type==="river");
      this.linkButton.classList.toggle("hidden",type==="river");
      this.nameInput.value=item.name||"";
      this.notesInput.value=item.note||"";
      this.panel.classList.remove("hidden");
      const ww=this.doc.defaultView.innerWidth,wh=this.doc.defaultView.innerHeight;
      const w=this.panel.offsetWidth,h=this.panel.offsetHeight;
      this.panel.style.left=Math.max(8,Math.min(screen.x+12,ww-w-8))+"px";
      this.panel.style.top=Math.max(8,Math.min(screen.y-h/2,wh-h-8))+"px";
      this.removeButton.classList.toggle("river-remove",type==="river");
    }
    close(notify=true){
      if(notify)this.onClose();
      this.toggleSub(null);this.panel.classList.add("hidden");
      this.model=null;this.type=null;
    }
  }
  root.Pin2MapGeometryEditor=GeometryEditor;
  if(typeof module!=="undefined"&&module.exports)module.exports=GeometryEditor;
})(typeof window!=="undefined"?window:globalThis);
