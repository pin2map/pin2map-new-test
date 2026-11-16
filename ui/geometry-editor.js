"use strict";
/* Geometry editor presentation. Area: three rows only (name/comments/actions).
 * River: compact name and four round actions. No map or storage APIs.
 */
(function(root){
  class GeometryEditor{
    constructor({document:doc,icons,onUpdate,onDelete,onClose,onWikipedia}){
      this.doc=doc;this.icons=icons;this.core=root.Pin2MapObjectDialogCore;
      if(!this.core)throw new TypeError("Object dialog core must be loaded");
      this.onUpdate=onUpdate;this.onDelete=onDelete;
      this.onClose=onClose||(()=>{});this.onWikipedia=onWikipedia;
      this.model=null;this.type=null;this.layers=[];
      this.popupMode=null;this.noteEditor=null;this.filterText="";
      this.panel=this.build();
      const Picker=root.Pin2MapObjectLayerPicker;
      if(!Picker)throw new TypeError("Shared object layer picker must load before geometry editor");
      this.layerPicker=new Picker({
        document:this.doc,icons:this.icons,
        getElement:id=>({
          geometryLayerMenu:this.layerMenu,geometryLayerTrigger:this.layerButton,
          geometryEditor:this.panel
        })[id]||this.doc.getElementById(id),
        triggerId:"geometryLayerTrigger",menuId:"geometryLayerMenu",
        panelId:"geometryEditor",pickerId:"geometryLayerTrigger",
        contained:true,header:this.header,actions:this.actions,bindTrigger:false,
        onSelect:(id,layer)=>{
          if(!this.model)return;
          this.update({layerId:id});
          this.layerDot.style.backgroundColor=layer.color;
          this.layerButton.setAttribute("aria-label","Ebene: "+layer.name);
          this.popupMode=null;
        }
      });
    }
    makeButton(icon,label,callback,extra=""){
      const button=this.doc.createElement("button");
      button.type="button";button.className="geometry-round "+extra;
      button.title=label;button.setAttribute("aria-label",label);
      if(icon==="region-off"){
        const image=this.doc.createElement("img");
        image.src="./assets/region.svg";image.alt="";
        image.className="geometry-region-off-icon";
        button.append(image);
      }else if(icon==="wikipedia"){
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
      panel.id="geometryEditor";panel.className="geometry-editor object-editor hidden";
      panel.setAttribute("role","dialog");panel.setAttribute("aria-label","Objekt bearbeiten");
      const header=doc.createElement("div");header.className="geometry-head pin-editor-head object-editor-head";
      const remove=this.makeButton("region-off","Fläche löschen",()=>this.toggleSub("delete"),"geometry-remove");
      const field=doc.createElement("fieldset");field.className="pin-name-field";
      const legend=doc.createElement("legend");legend.id="geometryNameLegend";
      const name=doc.createElement("input");name.id="geometryName";
      name.type="text";name.maxLength=120;name.setAttribute("aria-label","Objektname");
      name.addEventListener("change",()=>this.update({name:name.value}));
      field.append(legend,name);header.append(remove,field);
      const parts=this.core.makeNotes(doc,{
        type:"area",onChange:value=>this.update({note:value}),
        onExpand:()=>this.expandNotes()
      });
      const notes=parts.note,notesLegend=parts.legend,textarea=parts.input,expand=parts.expand;
      notes.classList.add("geometry-notes");notes.id="geometryNotesRow";
      textarea.id="geometryNotes";expand.classList.add("geometry-expand");
      const actions=doc.createElement("div");actions.className="geometry-actions object-editor-actions";
      const layer=this.makeButton("layers-arrow-down","Ebene ändern",()=>this.toggleSub("layer"),"geometry-layer");
      const colorDot=doc.createElement("span");colorDot.className="pin-layer-dot";layer.append(colorDot);this.layerDot=colorDot;
      const link=this.makeButton("link-2","Link",()=>this.toggleSub("link"),"geometry-link");
      const wiki=this.makeButton("wikipedia","Wikipedia",()=>this.onWikipedia(this.model?.name||""),"geometry-wiki");
      const ok=this.makeButton("check","OK",()=>{this.flush();this.close();},"geometry-ok");
      this.core.configureOk(ok);
      actions.append(layer,link,wiki,ok);
      const sub=doc.createElement("div");sub.className="geometry-sub hidden";sub.id="geometrySub";
      panel.append(header,notes,actions,sub);
      this.header=header;this.actions=actions;
      this.removeButton=remove;this.layerButton=layer;this.linkButton=link;
      this.nameInput=name;this.notesInput=textarea;
      this.notesRow=notes;this.notesLegend=notesLegend;this.legend=legend;this.sub=sub;this.expandButton=expand;
      this.core.configureSurface(panel,header,notes,actions);
      this.createAreaPopups();
      this.doc.getElementById("app").append(panel);
      this.doc.addEventListener("pointerdown",e=>{
        if(!this.model)return;
        if(this.popupMode==="layer"&&!e.target.closest?.("#geometryLayerMenu,#geometryEditor .geometry-layer"))this.dismissPopup();
        if(this.popupMode==="url"&&!e.target.closest?.("#geometryUrlBlock,#geometryEditor .geometry-link"))this.dismissPopup();
      });
      this.doc.addEventListener("keydown",e=>{
        if(e.key==="Escape"&&!panel.classList.contains("hidden")&&!this.noteEditor?.open){
          e.preventDefault();
          if(this.popupMode)this.dismissPopup();
          else if(!sub.classList.contains("hidden"))this.toggleSub(null);
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
      if(this.notesInput.value!==this.model.note)
        changes.note=this.notesInput.value;
      if(Object.keys(changes).length)this.update(changes);
    }
    update(patch){
      if(!this.model)return;
      const changed=this.onUpdate(this.type,this.model.id,patch);
      if(changed)this.model=changed;
    }
    toggleSub(type){
      if(this.model&&(type==="layer"||type==="link")){
        this.showAreaPopup(type==="layer"?"layer":"url");return;
      }
      this.dismissPopup();
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

    createAreaPopups(){
      const doc=this.doc;
      const menu=doc.createElement("div");menu.id="geometryLayerMenu";
      menu.className="pin-layer-menu hidden";menu.setAttribute("role","listbox");
      menu.setAttribute("aria-label","Flächenebene auswählen");
      doc.body.append(menu);this.layerMenu=menu;
      const popup=doc.createElement("div");popup.id="geometryUrlBlock";
      popup.className="pin-url-popup hidden";
      popup.setAttribute("role","dialog");
      popup.setAttribute("aria-label","Flächen-URL bearbeiten");
      const field=doc.createElement("fieldset");field.className="pin-url-field";
      const legend=doc.createElement("legend");legend.textContent="Flächen-URL";
      const input=doc.createElement("textarea");input.id="geometryUrl";
      input.rows=3;input.spellcheck=false;input.placeholder="URL eingeben …";
      input.setAttribute("aria-label","Flächen-URL");
      input.setAttribute("autocapitalize","off");
      const actions=doc.createElement("div");actions.className="pin-url-actions";
      const save=doc.createElement("button");save.type="button";save.textContent="OK";
      save.setAttribute("aria-label","Flächen-URL speichern");
      const open=doc.createElement("button");open.type="button";open.textContent="URL öffnen";
      open.disabled=true;
      field.append(legend,input);actions.append(save,open);popup.append(field,actions);
      doc.body.append(popup);
      this.urlPopup=popup;this.urlLegend=legend;this.urlInput=input;this.urlSave=save;this.urlOpen=open;
      const validate=()=>this.normalizedUrl(input.value);
      input.addEventListener("input",()=>{
        open.disabled=!validate();open.classList.toggle("has-url",!open.disabled);
      });
      input.addEventListener("focus",()=>{
        if(this.popupMode!=="url")return;
        const vv=this.doc.defaultView?.visualViewport;
        this.urlKeyboardAnchor={top:parseFloat(popup.style.top)||popup.getBoundingClientRect().top,
          visualOffsetTop:vv?.offsetTop||0};
      });
      input.addEventListener("blur",()=>{this.urlKeyboardAnchor=null;});
      save.addEventListener("click",()=>{
        const value=input.value.trim();
        if(value&&!validate()){
          input.setCustomValidity("Bitte eine gültige URL mit sicherem Protokoll eingeben");
          input.reportValidity();input.setCustomValidity("");return;
        }
        this.update({url:value});this.linkButton.classList.toggle("has-url",Boolean(value));
        this.dismissPopup();
      });
      open.addEventListener("click",()=>{
        const url=validate();if(url)root.open(url,"_blank","noopener,noreferrer");
      });
      const note=doc.createElement("section");note.id="geometryMobileNoteEditor";
      note.className="pin-note-editor hidden";note.setAttribute("role","dialog");
      note.setAttribute("aria-modal","true");note.setAttribute("aria-label","Flächen Kommentare");
      const header=doc.createElement("header");header.className="pin-note-editor-header";
      const title=doc.createElement("strong");title.id="geometryNoteEditorTitle";
      header.append(title);
      const text=doc.createElement("textarea");text.id="geometryNoteEditorText";
      text.placeholder="Notiz eingeben …";text.setAttribute("aria-label","Flächenkommentar bearbeiten");
      const foot=doc.createElement("footer");foot.className="pin-note-editor-actions";
      const date=doc.createElement("button");date.id="geometryNoteInsertDate";date.type="button";date.textContent="Datum";
      const time=doc.createElement("button");time.id="geometryNoteInsertTime";time.type="button";time.textContent="Zeit";
      const space=doc.createElement("span");space.className="pin-note-editor-spacer";
      const done=doc.createElement("button");done.id="geometryNoteEditorDone";done.type="button";done.textContent="Fertig";
      foot.append(date,time,space,done);note.append(header,text,foot);doc.body.append(note);
      this.noteNodes={pinMobileNoteEditor:note,pinNoteEditorTitle:title,pinNoteEditorText:text,
        pinNoteInsertDate:date,pinNoteInsertTime:time,pinNoteEditorDone:done};
      if(root.Pin2MapPinNoteEditor){
        this.noteEditor=new root.Pin2MapPinNoteEditor({
          getElement:id=>this.noteNodes[id],document:doc,
          onChange:value=>{if(this.model){
            this.notesInput.value=value;this.update({note:value});}},
          onClose:()=>{}
        });
        this.noteEditor.bind();
      }
      this.doc.defaultView?.visualViewport?.addEventListener?.("resize",()=>{
        if(this.popupMode==="url")this.positionAreaPopup("url",true);
      });
    }
    normalizedUrl(raw){
      return this.core.normalizedUrl(raw);
      try{
        if(!String(raw||"").trim())return null;
        const url=new URL(raw.trim());
        if(["javascript:","data:","vbscript:","file:","blob:","about:"].includes(url.protocol.toLowerCase()))return null;
        return /^[a-z][a-z0-9+.-]*:$/.test(url.protocol)?url.href:null;
      }catch{return null;}
    }
    expandNotes(){
      if(!this.model||!this.noteEditor)return;
      this.dismissPopup();
      this.noteEditor.show({name:this.model.name,note:this.notesInput.value,
        desktop:this.doc.defaultView?.matchMedia?.("(min-width: 750px) and (pointer: fine)")?.matches||false});
    }
    dismissPopup(){
      this.popupMode=null;
      if(this.layerPicker)this.layerPicker.setOpen(false);
      else if(this.layerMenu)this.layerMenu.classList.add("hidden");
      if(this.urlPopup)this.urlPopup.classList.add("hidden");
      this.urlKeyboardAnchor=null;
      this.layerButton?.setAttribute("aria-expanded","false");
      this.linkButton?.setAttribute("aria-expanded","false");
      if(this.layerMenu)this.layerMenu.replaceChildren();
    }
    positionAreaPopup(mode,keyboard=false){
      const win=this.doc.defaultView, vv=win?.visualViewport;
      const panel=this.panel.getBoundingClientRect(),width=vv?.width||win.innerWidth;
      const height=vv?.height||win.innerHeight,top=vv?.offsetTop||0,left=vv?.offsetLeft||0;
      if(mode==="layer"){
        // The area picker floats over the notes inside the editor, like
        // the pin picker. Long lists scroll rather than escaping the panel.
        const popup=this.layerMenu,margin=10,gap=8;
        const header=this.header.getBoundingClientRect();
        const actions=this.actions.getBoundingClientRect();
        const popupWidth=Math.min(260,Math.max(120,panel.width-margin*2),width-24);
        const upper=Math.max(panel.top+gap,header.bottom+gap,top+gap);
        const lower=Math.min(panel.bottom-gap,actions.top-gap,top+height-gap);
        popup.style.width=popupWidth+"px";
        popup.style.maxHeight=Math.min(310,Math.max(56,lower-upper))+"px";
        popup.style.left=Math.max(left+gap,Math.min(
          panel.left+(panel.width-popupWidth)/2,left+width-popupWidth-gap))+"px";
        popup.style.top=upper+"px";
      }else{
        // Same overlay relationship as the pin URL: inside the editor,
        // over the notes, ending ABOVE the bottom action buttons. Never
        // extend a fixed popup from the panel top to the viewport bottom.
        const popup=this.urlPopup;
        const header=this.header.getBoundingClientRect();
        const actions=this.actions.getBoundingClientRect();
        const margin=12,inset=10,gap=8;
        const popupWidth=Math.min(Math.max(180,panel.width-inset*2),width-margin*2);
        popup.style.width=popupWidth+"px";
        popup.style.left=Math.max(left+margin,Math.min(panel.left+inset,left+width-popupWidth-margin))+"px";
        const preferredTop=Math.max(panel.top+gap,header.bottom+gap);
        const bottom=Math.min(actions.top-gap,top+height-margin);
        if(keyboard&&this.urlKeyboardAnchor){
          // Reuse pin-style anchored viewport compensation while iOS
          // animates its software keyboard; do not jump to the footer.
          const anchor=this.urlKeyboardAnchor;
          const desired=anchor.top+top-anchor.visualOffsetTop;
          popup.style.top=Math.max(top+gap,Math.min(desired,top+height-popup.offsetHeight-gap))+"px";
          popup.style.height=Math.max(100,Math.min(bottom-parseFloat(popup.style.top),top+height-parseFloat(popup.style.top)-margin))+"px";
        }else{
          const available=Math.max(0,bottom-Math.max(top+gap,preferredTop));
          const heightNeeded=Math.min(320,Math.max(145,available));
          const popupTop=Math.max(top+gap,Math.min(preferredTop,bottom-heightNeeded));
          popup.style.top=popupTop+"px";
          popup.style.height=Math.max(100,bottom-popupTop)+"px";
        }
      }
    }
    showAreaPopup(mode){
      if(!this.model)return;
      if(this.popupMode===mode){this.dismissPopup();return;}
      this.dismissPopup();this.popupMode=mode;
      const button=mode==="layer"?this.layerButton:this.linkButton;
      button.setAttribute("aria-expanded","true");
      if(mode==="url"){
        this.urlInput.value=this.model.url||"";
        this.urlOpen.disabled=!this.normalizedUrl(this.urlInput.value);
        this.urlOpen.classList.toggle("has-url",!this.urlOpen.disabled);
        this.urlPopup.classList.remove("hidden");
        this.positionAreaPopup("url");
        return;
      }
      this.layerPicker.render({layers:this.layers,selectedLayerId:this.model.layerId});
      this.layerDot=this.layerButton.children[1];
      this.layerPicker.setOpen(true);
    }

    show(type,item,layers,screen){
      this.close(false);
      this.type=type;this.model=item;this.layers=layers.filter(layer=>layer?.id);
      this.panel.classList.remove("is-river");
      // River controls belong to ONE four-button editing row in the exact
      // order remove, layer, Wikipedia, OK. The area keeps remove in its
      // Pin-like first row and has only three content rows.
      this.header.prepend(this.removeButton);
      this.panel.setAttribute("aria-label",type==="river"?"Fluss bearbeiten":"Fläche bearbeiten");
      const kind=item.kind==="lake"?"lake":type==="river"?"river":"area";
      this.core.configureName({legend:this.legend,input:this.nameInput,type:kind,name:item.name});
      this.core.configureNotes({legend:this.notesLegend,input:this.notesInput,type:kind,value:item.note});
      this.core.configureUrlLegend(this.urlLegend,kind);
      this.core.mountDeleteSymbol(this.removeButton,kind,this.doc,this.icons);
      this.notesRow.classList.remove("hidden");
      this.linkButton.classList.remove("hidden");
      this.expandButton.classList.remove("hidden");
      this.layerDot.style.backgroundColor=this.layers.find(l=>l.id===item.layerId)?.color||"#a4b0bd";
      this.layerButton.setAttribute("aria-label","Ebene: "+(this.layers.find(l=>l.id===item.layerId)?.name||"Privat"));
      this.nameInput.value=item.name||"";
      this.notesInput.value=item.note||"";
      this.linkButton.classList.toggle("has-url",Boolean(item.url));
      this.panel.classList.remove("hidden");
      const ww=this.doc.defaultView.innerWidth,wh=this.doc.defaultView.innerHeight;
      const w=this.panel.offsetWidth,h=this.panel.offsetHeight;
      this.panel.style.left=Math.max(8,Math.min(screen.x+12,ww-w-8))+"px";
      this.panel.style.top=Math.max(8,Math.min(screen.y-h/2,wh-h-8))+"px";
      this.removeButton.classList.toggle("river-remove",type==="river");
    }
    close(notify=true){
      if(notify)this.onClose();
      this.dismissPopup();
      if(this.noteEditor?.open)this.noteEditor.close();
      this.toggleSub(null);this.panel.classList.add("hidden");
      this.model=null;this.type=null;
    }
  }
  root.Pin2MapGeometryEditor=GeometryEditor;
  if(typeof module!=="undefined"&&module.exports)module.exports=GeometryEditor;
})(typeof window!=="undefined"?window:globalThis);
