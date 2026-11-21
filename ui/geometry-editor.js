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
      this.popupMode=null;this.noteEditor=null;
      this.panel=this.build();
      this.buildDeleteOverlay();
      const Url=root.Pin2MapObjectUrlPopup;
      if(!Url)throw new Error("Shared URL popup controller missing");
      this.urlController=new Url({
        document:this.doc,panel:this.panel,header:this.header,footer:this.actions,
        popup:this.urlPopup,trigger:this.linkButton,input:this.urlInput,
        save:this.urlSave,open:this.urlOpen,bindTrigger:false,
        getValue:()=>this.model?.url||"",
        onSave:value=>{this.update({url:value});this.linkButton.classList.toggle("has-url",Boolean(value));},
        onState:open=>{this.popupMode=open?"url":null;}
      });
      this.urlController.bind();
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
        onOpenChange:open=>{if(open)this.popupMode="layer";else if(this.popupMode==="layer")this.popupMode=null;},
        onSelect:(id,layer)=>{
          if(!this.model)return;
          this.update({layerId:id});
          this.layerDot.style.backgroundColor=layer.color;
          if(!this.model.color){
            this.colorDot.style.backgroundColor=layer.color;
            this.nativeColor.value=layer.color;
          }
          this.layerButton.setAttribute("aria-label","Ebene: "+layer.name);
          this.popupMode=null;
        }
      });
    }
    makeButton(icon,label,callback,extra=""){
      const button=this.doc.createElement("button");
      button.type="button";button.className="geometry-round "+extra;
      button.title=label;button.setAttribute("aria-label",label);
      if(icon===null){}else if(icon==="wikipedia"){
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
      const remove=this.makeButton(null,"Objekt löschen",()=>{},"geometry-remove");
      const field=doc.createElement("fieldset");field.className="pin-name-field";
      const legend=doc.createElement("legend");legend.id="geometryNameLegend";
      const name=doc.createElement("input");name.id="geometryName";
      name.type="text";name.maxLength=120;name.setAttribute("aria-label","Objektname");
      name.addEventListener("change",()=>this.update({name:name.value}));
      field.append(legend,name);header.append(remove,field);
      const parts=this.core.makeNotes(doc,{
        type:"area",icons:this.icons,onChange:value=>this.update({note:value})
      });
      const notes=parts.note,notesLegend=parts.legend,textarea=parts.input,expand=parts.expand;
      notes.classList.add("geometry-notes");notes.id="geometryNotesRow";
      textarea.id="geometryNotes";expand.classList.add("geometry-expand");
      let actions;
      const layer=this.makeButton("layers-arrow-down","Ebene ändern",()=>this.toggleLayerPicker(),"geometry-layer");
      const colorDot=doc.createElement("span");colorDot.className="pin-layer-dot";layer.append(colorDot);this.layerDot=colorDot;
      const color=this.makeButton("palette","Objektfarbe auswählen",()=>this.toggleColorPicker(),"geometry-color");
      const colorDotObject=doc.createElement("span");colorDotObject.className="geometry-color-dot";
      color.append(colorDotObject);this.colorDot=colorDotObject;
      // The native system picker remains a genuine user-controlled input.
      // A separate reset action cannot be inserted into the OS picker itself.
      const colorMenu=doc.createElement("div");colorMenu.id="geometryColorMenu";
      colorMenu.className="geometry-color-menu hidden";
      colorMenu.setAttribute("role","group");colorMenu.setAttribute("aria-label","Objektfarbe");
      const chooseColor=doc.createElement("label");chooseColor.className="geometry-color-choice";
      chooseColor.textContent="Farbe wählen";
      const nativeColor=doc.createElement("input");nativeColor.type="color";
      nativeColor.className="geometry-native-color";nativeColor.setAttribute("aria-label","Individuelle Objektfarbe wählen");
      nativeColor.addEventListener("input",()=>this.applyObjectColor(nativeColor.value));
      nativeColor.addEventListener("change",()=>{this.applyObjectColor(nativeColor.value);this.dismissPopup();});
      chooseColor.append(nativeColor);
      const noColor=doc.createElement("button");noColor.type="button";
      noColor.className="geometry-no-color";noColor.textContent="Keine Farbe";
      noColor.addEventListener("click",()=>this.resetObjectColor());
      colorMenu.append(chooseColor,noColor);
      this.colorMenu=colorMenu;this.noColorButton=noColor;this.nativeColor=nativeColor;
      const link=this.makeButton("link-2","Link",()=>this.toggleSub("link"),"geometry-link");
      const wiki=this.makeButton("wikipedia","Wikipedia",()=>this.onWikipedia(this.model?.name||""),"geometry-wiki");
      const ok=this.makeButton(null,this.core.okLabel,()=>{this.flush();this.close();},"geometry-ok");
      this.core.configureOk(ok);
      actions=this.core.createFooter(doc,{layer,url:link,wiki,ok});
      actions.insertBefore(color,link);
      actions.classList.add("geometry-actions");
      panel.append(header,notes,actions,colorMenu);
      this.header=header;this.actions=actions;
      this.removeButton=remove;this.layerButton=layer;this.colorButton=color;this.linkButton=link;
      this.nameInput=name;this.notesInput=textarea;
      this.notesRow=notes;this.notesLegend=notesLegend;this.legend=legend;this.expandButton=expand;
      this.core.configureSurface(panel,header,notes,actions);
      this.createAreaPopups();
      const tip=doc.createElement("div");
      tip.className="object-editor-tip hidden";tip.setAttribute("aria-hidden","true");
      panel.append(tip);
      this.doc.getElementById("app").append(panel);this.tip=tip;
      // Popup outside-click, Escape and focus are owned by the common
      // ObjectLayerPicker / ObjectUrlPopup controllers; not this view.
      this.doc.addEventListener("keydown",e=>{
        if(e.key==="Escape"&&!panel.classList.contains("hidden")&&!this.noteEditor?.open&&!this.deleteController?.dialog.open){
          e.preventDefault();
          if(this.popupMode)this.dismissPopup();
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
    applyObjectColor(value){
      if(!this.model||!/^#[0-9a-f]{6}$/i.test(value))return;
      this.update({color:value.toUpperCase()});
      this.colorDot.style.backgroundColor=value;
      this.colorButton.setAttribute("title","Objektfarbe: "+value.toUpperCase());
    }
    resetObjectColor(){
      if(!this.model)return;
      this.update({color:null});
      const inherited=this.layers.find(layer=>layer.id===this.model.layerId)?.color||"#a4b0bd";
      this.colorDot.style.backgroundColor=inherited;
      this.nativeColor.value=inherited;
      this.colorButton.title="Objektfarbe auswählen";
      this.dismissPopup();
    }
    toggleColorPicker(){
      if(!this.model)return;
      if(!this.colorMenu.classList.contains("hidden"))return this.dismissPopup();
      this.dismissPopup();
      const button=this.colorButton.getBoundingClientRect();
      const parent=this.panel.getBoundingClientRect();
      const popupWidth=155,popupHeight=100;
      this.colorMenu.style.left=Math.max(8,Math.min(button.left-parent.left,parent.width-popupWidth-8))+"px";
      this.colorMenu.style.top=Math.max(8,button.top-parent.top-popupHeight-5)+"px";
      this.colorMenu.classList.remove("hidden");
      this.popupMode="color";
    }
    toggleLayerPicker(){
      if(!this.model)return;
      if(this.layerPicker.open){
        this.layerPicker.setOpen(false);
        return;
      }
      this.urlController.close();
      this.layerPicker.render({layers:this.layers,selectedLayerId:this.model.layerId});
      this.layerDot=this.layerButton.children[1];
      this.layerPicker.setOpen(true);
    }
    toggleSub(type){
      if(type==="layer")return this.toggleLayerPicker();
      if(type==="link")return this.showAreaPopup("url");
      this.dismissPopup();
    }

    buildDeleteOverlay(){
      const doc=this.doc,dialog=doc.createElement("dialog");
      dialog.id="geometryDeleteDialog";
      dialog.className="object-delete-dialog";
      dialog.setAttribute("aria-labelledby","geometryDeleteQuestion");
      const form=doc.createElement("form");form.method="dialog";
      const title=doc.createElement("h2");title.id="geometryDeleteQuestion";
      const actions=doc.createElement("div");actions.className="dialog-actions";
      const confirm=doc.createElement("button");confirm.type="submit";
      confirm.value="confirm";confirm.className="danger";confirm.textContent="Löschen";
      const cancel=doc.createElement("button");cancel.type="submit";
      cancel.value="cancel";cancel.className="secondary";cancel.textContent="Abbrechen";
      actions.append(confirm,cancel);form.append(title,actions);dialog.append(form);
      doc.body.append(dialog);
      this.deleteDialog=dialog;
      const Controller=root.Pin2MapObjectDeleteDialog;
      if(!Controller)throw new Error("Shared object deletion controller missing");
      this.deleteController=new Controller({
        getElement:id=>({
          geometryDeleteDialog:dialog,geometryDeleteTrigger:this.removeButton,
          geometryEditor:this.panel,geometryName:this.nameInput,
          geometryDeleteQuestion:title
        })[id]||doc.getElementById(id),
        getSelectedId:()=>this.model?.id||null,
        onConfirm:id=>{const type=this.type;this.onDelete(type,id);this.close();},
        buttonId:"geometryDeleteTrigger",dialogId:"geometryDeleteDialog",
        panelId:"geometryEditor",headerSelector:".geometry-head",
        nameId:"geometryName",nameLabelId:null,questionId:"geometryDeleteQuestion",
        objectType:()=>this.core.objectType(this.model?.kind==="lake"?"lake":this.type)
      });
      this.deleteController.bind();
    }

    createAreaPopups(){
      const doc=this.doc;
      const menu=doc.createElement("div");menu.id="geometryLayerMenu";
      menu.className="pin-layer-menu hidden";menu.setAttribute("role","listbox");
      menu.setAttribute("aria-label","Flächenebene auswählen");
      this.layerMenu=menu; // shared picker mounts it into the owner's app overlay root
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
        this.core.bindNoteLaunch({
          textarea:this.notesInput,expand:this.expandButton,editor:this.noteEditor,
          getName:()=>this.model?.name||"",getNote:()=>this.notesInput.value,
          closeTransient:()=>this.dismissPopup(),
          matchMedia:query=>this.doc.defaultView?.matchMedia?.(query)
        });
      }

    }
    normalizedUrl(raw){return this.core.normalizedUrl(raw);}
    dismissPopup(){
      this.popupMode=null;
      this.colorMenu?.classList.add("hidden");
      if(this.layerPicker)this.layerPicker.setOpen(false);
      else if(this.layerMenu)this.layerMenu.classList.add("hidden");
      if(this.urlController)this.urlController.close();
      else if(this.urlPopup)this.urlPopup.classList.add("hidden");
      this.urlKeyboardAnchor=null;
      this.layerButton?.setAttribute("aria-expanded","false");
      this.linkButton?.setAttribute("aria-expanded","false");
      // The shared picker exclusively owns filter DOM, rows and state.
    }
    showAreaPopup(mode){
      if(!this.model)return;
      if(mode==="layer")return this.toggleLayerPicker();
      if(mode!=="url")return this.dismissPopup();
      if(this.urlController.isOpen)return this.urlController.close();
      this.layerPicker.setOpen(false);
      this.urlController.show(true);
    }

    show(type,item,layers,screen){
      this.close(false);
      this.type=type;this.model=item;this.layers=layers.filter(layer=>layer?.id);
      this.panel.classList.remove("is-river");
      // All three geometry types keep the identical shared header, notes
      // and footer; the Pin's Navi/Routing/Meteo/Move are explicit extensions.
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
      const inheritedColor=this.layers.find(l=>l.id===item.layerId)?.color||"#a4b0bd";
      this.layerDot.style.backgroundColor=inheritedColor;
      this.colorDot.style.backgroundColor=item.color||inheritedColor;
      this.nativeColor.value=/^#[0-9a-f]{6}$/i.test(item.color||"")?item.color:inheritedColor;
      this.colorButton.title=item.color?"Objektfarbe: "+item.color:"Objektfarbe auswählen";
      this.layerButton.setAttribute("aria-label","Ebene: "+(this.layers.find(l=>l.id===item.layerId)?.name||"Privat"));
      this.nameInput.value=item.name||"";
      this.notesInput.value=item.note||"";
      this.linkButton.classList.toggle("has-url",Boolean(item.url));
      this.panel.classList.remove("hidden");
      this.reposition(screen);
      this.removeButton.classList.remove("river-remove");
    }
    reposition(screen){
      if(!this.model||this.panel.classList.contains("hidden")||!screen)return;
      const app=this.doc.getElementById("app");
      const rect=app.getBoundingClientRect();
      const Positioner=root.Pin2MapPinPanelPositioner||
        (typeof require==="function"?require("./pin-panel-positioner.js"):null);
      if(!Positioner?.clampedObjectAnchor)
        throw new TypeError("Shared object dialog anchor must be loaded");
      const geometry=Positioner.clampedObjectAnchor({
        point:{x:screen.x,y:screen.y},mapRect:rect,appRect:rect,
        panelWidth:this.panel.offsetWidth,panelHeight:this.panel.offsetHeight,
        viewportWidth:this.doc.defaultView.innerWidth,
        viewportHeight:this.doc.defaultView.innerHeight
      });
      this.panel.style.left=geometry.panel.left+"px";
      this.panel.style.top=geometry.panel.top+"px";
      this.tip.style.left=geometry.tip.left+"px";
      // CSS bottom:-14px attaches the 15px triangle to the LIVE panel edge.
      // Never use a stale offsetHeight from before the final browser layout.
      this.tip.style.top="";
      this.tip.classList.remove("hidden");
    }
    close(notify=true){
      if(notify)this.onClose();
      this.dismissPopup();
      this.deleteController?.close();
      if(this.noteEditor?.open)this.noteEditor.close();
      this.panel.classList.add("hidden");
      this.tip?.classList.add("hidden");
      this.model=null;this.type=null;
    }
  }
  root.Pin2MapGeometryEditor=GeometryEditor;
  if(typeof module!=="undefined"&&module.exports)module.exports=GeometryEditor;
})(typeof window!=="undefined"?window:globalThis);
