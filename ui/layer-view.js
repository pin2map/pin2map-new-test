"use strict";
/* The layer list uses the SAME list-dialog core as Favorites.
 * This view delegates every state mutation to injected application ports. */
(function(root){
 const Core=root.Pin2MapListDialogCore||
  (typeof require==="function"?require("./list-dialog-core.js"):null);
 class LayerView extends Core{
  constructor({getElement,document,onVisibility,onDelete,onRename=()=>{},
   onCreate=()=>{},onDeleteContents=null,onDeleteLayer=null,onMergeRequest=()=>{},
   getPalette=()=>[],getSuggestedName=()=>"Ebene 1",getNextIndex=()=>0,
   onClose=()=>{},onOpen=()=>{}}){
   super({getElement,document,icons:root.Pin2MapIcons||{
    mount:(button,icon)=>{button.textContent=icon;}
   },panelId:"layersPanel",listId:"layersList",searchId:"layersSearch",
     clearId:"layersSearchClear"});
   this.onVisibility=onVisibility;this.onDelete=onDelete;
   this.onRename=onRename;this.onCreate=onCreate;
   this.onDeleteContents=onDeleteContents||onDelete;
   this.onDeleteLayer=onDeleteLayer||onDelete;
   this.onMergeRequest=onMergeRequest;this.getPalette=getPalette;
   this.getSuggestedName=getSuggestedName;this.getNextIndex=getNextIndex;
   this.onClose=onClose;this.onOpen=onOpen;
   this.selectedIds=new Set();this.mergeMode=false;
   this.counts={};this.geometryCounts={};this.selectedLayerId=null;
   if(this.el("layersSearch")&&this.el("layersSearchClear"))this.bindFilter();
   // Other map overlays can hide our panel. Mirror that close into the
   // shared controller so the next opening cannot be mistaken for a toggle-off.
   const Observer=document.defaultView?.MutationObserver;
   if(Observer&&this.el("layersPanel")){
    this.visibilityObserver=new Observer(()=>{
     if(this.el("layersPanel").classList.contains("hidden"))this.open=false;
    });
    this.visibilityObserver.observe(this.el("layersPanel"),
      {attributes:true,attributeFilter:["class"]});
   }
  }
  show(){
   this.open=true;this.mode=null;this.index=null;
   this.el("layersPanel").classList.remove("hidden");
   this.render();
   this.onOpen();
   this.el("layersClose")?.focus?.({preventScroll:true});
  }
  close(){
   this.open=false;this.mode=null;this.index=null;this.mergeMode=false;
   this.el("layersPanel").classList.add("hidden");
   this.selectedIds.clear();
   this.keepEditorVisible();
   this.onClose();
  }
  toggle(){this.open?this.close():this.show();}
  paletteEditor({section,actions,input}){
   if(!input)return;
   const line=this.doc.createElement("div");line.className="layer-color-name";
   const square=this.button(null,"Ebenenfarbe auswählen",()=>{
    palette.classList.toggle("hidden");
    actions.classList.toggle("hidden",!palette.classList.contains("hidden"));
   },"layer-swatch");
   square.style.backgroundColor=this.draftColor;
   square.setAttribute("aria-label","Ebenenfarbe auswählen");
   input.parentElement.insertBefore(square,input);
   input.parentElement.classList.add("layer-name-with-color");
   const palette=this.doc.createElement("div");palette.className="layer-palette-choice hidden";
   const colors=this.getPalette();
   for(const [index,color] of colors.entries()){
    const dot=this.button(null,"Farbe "+(index+1),()=>{
     this.draftColor=color;this.draftIndex=index;
     square.style.backgroundColor=color;
     palette.classList.add("hidden");actions.classList.remove("hidden");
     input.focus({preventScroll:true});
    },"layer-palette-dot");
    dot.style.backgroundColor=color;
    palette.append(dot);
   }
   section.append(palette);
  }
  editor(mode,index){
   const layer=this.values[index];
   if(mode==="new"||mode==="rename"){
    const creating=mode==="new",name=creating?this.getSuggestedName():layer.name;
    this.draftIndex=creating?this.getNextIndex():
      (Number.isInteger(layer.paletteIndex)?layer.paletteIndex:0);
    this.draftColor=creating?this.getPalette()[this.draftIndex]:layer.color;
    return this.actionEditor({
     mode,index,title:creating?"Neue Ebene hinzufügen?":"Ebene umbenennen?",
     nameLabel:"Name der Ebene",nameValue:name,
     confirmLabel:creating?"Erstellen":"Übernehmen",
     onConfirm:value=>{
      if(creating)this.onCreate(value,this.draftColor,this.draftIndex);
      else this.onRename(layer.id,value,this.draftColor,this.draftIndex);
     },
     renderExtra:ports=>this.paletteEditor(ports)
    });
   }
   if(mode==="delete"){
    const privateLayer=layer.id==="private";
    const section=this.doc.createElement("section");
    section.className="favorite-confirm favorite-confirm-danger list-dialog-confirm";
    const title=this.doc.createElement("p");
    title.textContent=privateLayer?
     'Alle Objekte in der Ebene „Privat“ löschen?':"Was soll gelöscht werden?";
    const actions=this.doc.createElement("div");actions.className="favorite-confirm-actions";
    actions.append(this.labeledButton("Abbrechen",()=>this.start(null)));
    const execute=(callback)=>{this.mode=null;this.index=null;callback(layer.id);};
    actions.append(this.labeledButton("Alle Objekte der Ebene",()=>execute(this.onDeleteContents),"danger"));
    if(!privateLayer)actions.append(
     this.labeledButton("Die Ebene als Ganzes",()=>execute(this.onDeleteLayer),"danger"));
    section.append(title,actions);
    return {target:section,focus:actions.lastChild};
   }
   return null;
  }
  render({layers=this.values,counts=this.counts||{},
    geometryCounts=this.geometryCounts||{},selectedLayerId=this.selectedLayerId??null}={}){
   this.values=layers;this.counts=counts;this.geometryCounts=geometryCounts;
   this.selectedLayerId=selectedLayerId;
   const list=this.el("layersList"),select=this.el("pinLayer");
   if(!list||!select)return;
   const previous=select.value;
   const scroll=list.scrollTop;list.replaceChildren();select.replaceChildren();
   for(const layer of layers){
    const option=this.doc.createElement("option");
    option.value=layer.id;option.textContent=layer.name;select.append(option);
   }
   select.value=selectedLayerId??previous;
   if(this.el("layersSearchClear"))this.configureFilter();
   const matches=Core.search(layers,this.searchText,l=>l.name);
   let pendingFocus=null;
   if(!matches.length){
    const empty=this.doc.createElement("p");empty.className="favorites-empty";
    empty.textContent=layers.length?"Keine passenden Ebenen gefunden.":"Keine Ebenen vorhanden.";
    list.append(empty);
   }
   for(const {item:layer,index} of matches){
    const id=layer.id,privateLayer=id==="private";
    const eye=this.button(layer.visible?"eye":"eye-off",
     layer.visible?"Ebene ausblenden":"Ebene einblenden",
     ()=>this.onVisibility(id,!layer.visible),"favorite-icon layer-eye"+(layer.visible?" is-visible":" is-invisible"));
    const check=this.doc.createElement("input");check.type="checkbox";
    check.className="layer-merge-check";check.checked=this.selectedIds.has(id);
    check.setAttribute("aria-label",layer.name+" zum Verbinden auswählen");
    check.addEventListener("change",()=>{
      if(check.checked)this.selectedIds.add(id);else this.selectedIds.delete(id);
      this.render(); // The toolbar shows squares-unite once >= 2 layers.
    });
    const leading=this.doc.createElement("div");leading.className="layer-leading";
    leading.append(eye,check);
    const data=this.geometryCounts[id]||{};
    const detail=(this.counts[id]||0)+" Pins · "+(data.areas||0)+
     " Flächen · "+(data.waters||0)+" Gewässer";
    const edit=privateLayer?null:this.button("square-pen","Ebene bearbeiten",
     ()=>this.start("rename",index),"favorite-icon favorite-edit");
    const remove=this.button("trash",privateLayer?
      "Alle Objekte in Privat löschen":"Ebene oder ihre Objekte löschen",
     ()=>this.start("delete",index),"favorite-icon favorite-remove");
    const row=this.row({name:layer.name,detail,iconLeft:leading,edit,remove,
     onChoose:()=>this.onVisibility(id,!layer.visible),
     selectedMode:this.mode,selectedIndex:index,itemId:id});
    row.classList.toggle("layer-is-hidden",!layer.visible);
    list.append(row);
    if(this.mode&&this.mode!=="new"&&this.index===index){
     const editor=this.editor(this.mode,index);
     if(editor){list.append(editor.target);pendingFocus=editor.focus;}
    }
   }
   if(this.mode==="new"){
    const editor=this.editor("new");list.append(editor.target);
    pendingFocus=editor.focus;
   }
   list.scrollTop=scroll;
   const unite=this.el("layersUnite"),reset=this.el("layersSearchClear");
   if(unite&&reset){
    const shown=this.selectedIds.size>=2;
    unite.classList.toggle("hidden",!shown);
    reset.classList.toggle("hidden",shown);
   }
   if(this.el("layersPanel"))this.finishRender(pendingFocus);
  }
 }
 root.Pin2MapLayerView=LayerView;
 if(typeof module!=="undefined"&&module.exports)module.exports=LayerView;
})(typeof window!=="undefined"?window:globalThis);
