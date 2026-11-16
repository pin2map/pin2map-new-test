"use strict";
/* The layer list uses the SAME list-dialog core as Favorites.
 * This view delegates every state mutation to injected application ports. */
(function(root){
 const Core=root.Pin2MapListDialogCore||
  (typeof require==="function"?require("./list-dialog-core.js"):null);
 class LayerView extends Core{
  constructor({getElement,document,onVisibility,onDelete,onRename=()=>{},
   onCreate=()=>{},onDeleteContents=null,onDeleteLayer=null,onMergeRequest=()=>{},
   onVisibilityCycle=()=>{},onReorder=()=>{},
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
   this.onMergeRequest=onMergeRequest;this.onVisibilityCycle=onVisibilityCycle;
   this.onReorder=onReorder;this.getPalette=getPalette;
   this.getSuggestedName=getSuggestedName;this.getNextIndex=getNextIndex;
   this.onClose=onClose;this.onOpen=onOpen;
   this.selectedIds=new Set();this.mergeMode=false;this.mergeTargetId=null;
   this.counts={};this.geometryCounts={};this.selectedLayerId=null;
   this.visibilityCycle=0;this.originalVisibility=null;
   this.el("layersVisibilityCycle")?.addEventListener("click",()=>this.cycleVisibility());
   if(this.el("layersSearch")&&this.el("layersSearchClear"))this.bindFilter();
   // Other map overlays can hide our panel. Mirror that close into the
   // shared controller so the next opening cannot be mistaken for a toggle-off.
   const Observer=document.defaultView?.MutationObserver;
   if(Observer&&this.el("layersPanel")){
    this.visibilityObserver=new Observer(()=>{
     if(this.el("layersPanel").classList.contains("hidden")){
        this.open=false;this.mergeMode=false;this.mergeTargetId=null;
        this.selectedIds.clear();
        this.el("layersButton")?.setAttribute("aria-expanded","false");
        this.el("layersButton")?.setAttribute("aria-pressed","false");
      }
    });
    this.visibilityObserver.observe(this.el("layersPanel"),
      {attributes:true,attributeFilter:["class"]});
   }
  }
  show(){
   this.open=true;this.mode=null;this.index=null;
   this.mergeMode=false;this.mergeTargetId=null;this.selectedIds.clear();
   this.resetVisibilityCycle();
   this.el("layersPanel").classList.remove("hidden");
   this.el("layersButton")?.setAttribute("aria-expanded","true");
   this.el("layersButton")?.setAttribute("aria-pressed","true");
   this.render();
   this.onOpen();
   this.el("layersClose")?.focus?.({preventScroll:true});
  }
  close(){
   this.open=false;this.mode=null;this.index=null;this.mergeMode=false;this.mergeTargetId=null;
   this.el("layersPanel").classList.add("hidden");
   this.el("layersButton")?.setAttribute("aria-expanded","false");
   this.el("layersButton")?.setAttribute("aria-pressed","false");
   this.selectedIds.clear();
   this.keepEditorVisible();
   this.onClose();
  }
  toggle(){this.open?this.close():this.show();}
  beginMerge(){
   if(this.selectedIds.size<2||![...this.selectedIds].some(id=>id!=="private"))return;
   this.mergeMode=true;this.mergeTargetId=null;this.mode=null;this.index=null;this.render();
  }
  cycleVisibility(){
   if(!this.values.length)return;
   if(this.visibilityCycle===0)
     this.originalVisibility=Object.fromEntries(this.values.map(l=>[l.id,!!l.visible]));
   this.visibilityCycle=(this.visibilityCycle%4)+1;
   const next=Object.fromEntries(this.values.map(l=>[l.id,
     this.visibilityCycle===1?!this.originalVisibility[l.id]:
     this.visibilityCycle===2?true:this.visibilityCycle===3?false:
     this.originalVisibility[l.id]]));
   this.onVisibilityCycle(next);
   if(this.visibilityCycle===4){this.visibilityCycle=0;this.originalVisibility=null;}
  }
  resetVisibilityCycle(){this.visibilityCycle=0;this.originalVisibility=null;}
  cancelMerge(){this.mergeMode=false;this.mergeTargetId=null;this.render();}
  chooseMergeTarget(id){
   if(!this.mergeMode||id==="private"||!this.selectedIds.has(id))return;
   this.mergeTargetId=id;this.render();
  }
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
   // Private is always the first UI row, independent of any historical
   // project order. Do not mutate/sort the persisted project array.
   layers=[...layers].sort((a,b)=>a.id==="private"?-1:b.id==="private"?1:0);
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
   const matches=Core.search(this.mergeMode?
      layers.filter(l=>l.id!=="private"&&this.selectedIds.has(l.id)):layers,
      this.mergeMode?"":this.searchText,l=>l.name);
    const cycleButton=this.el("layersVisibilityCycle");
    if(cycleButton){
      cycleButton.setAttribute("aria-label",
       ["Sichtbarkeit invertieren","Alle Ebenen sichtbar machen",
        "Alle Ebenen ausblenden","Ursprüngliche Sichtbarkeit wiederherstellen"][this.visibilityCycle]);
      cycleButton.title=cycleButton.getAttribute("aria-label");
    }
    if(this.mergeMode){
     const banner=this.doc.createElement("section");
     banner.className="layer-merge-guidance list-dialog-confirm";
     const title=this.doc.createElement("p");
     title.textContent=this.mergeTargetId?
       "Zusammenführung bestätigen: Alle Objekte wechseln in die Zielebene.":
       "Zielebene wählen: Tippen Sie auf eine der markierten Ebenen.";
     banner.append(title,this.labeledButton("Abbrechen",()=>this.cancelMerge()));
     if(this.mergeTargetId){
      const target=layers.find(l=>l.id===this.mergeTargetId);
      const note=this.doc.createElement("p");
      note.textContent="Ziel: "+target.name+" · "+(this.selectedIds.size-1)+
        " andere Ebenen werden nach Übertragung entfernt.";
      banner.append(note,this.labeledButton("Zusammenführen",()=>{
       const ids=[...this.selectedIds],targetId=this.mergeTargetId;
       if(this.onMergeRequest(ids,targetId)!==false){
        this.mergeMode=false;this.mergeTargetId=null;this.selectedIds.clear();this.render();
       }
      },"danger"));
     }
     list.append(banner);
    }
   let pendingFocus=null;
   if(!matches.length){
    const empty=this.doc.createElement("p");empty.className="favorites-empty";
    empty.textContent=layers.length?"Keine passenden Ebenen gefunden.":"Keine Ebenen vorhanden.";
    list.append(empty);
   }
   for(const {item:layer,index} of matches){
    const id=layer.id,privateLayer=id==="private";
    const eye=this.mergeMode?null:this.button(layer.visible?"eye":"eye-off",
     layer.visible?"Ebene ausblenden":"Ebene einblenden",
     ()=>{this.resetVisibilityCycle();this.onVisibility(id,!layer.visible);},"favorite-icon layer-eye"+(layer.visible?" is-visible":" is-invisible"));
    const check=this.doc.createElement("input");check.type="checkbox";
    check.className="layer-merge-check";check.checked=this.selectedIds.has(id);
     check.disabled=this.mergeMode;
    check.setAttribute("aria-label",layer.name+" zum Verbinden auswählen");
    check.addEventListener("change",()=>{
      if(check.checked)this.selectedIds.add(id);else this.selectedIds.delete(id);
      this.render(); // The toolbar shows squares-unite once >= 2 layers.
    });
    const leading=this.doc.createElement("div");leading.className="layer-leading";
    if(eye)leading.append(eye);
     if(!this.mergeMode)leading.append(check);
    const data=this.geometryCounts[id]||{};
    const detail=(this.counts[id]||0)+" Pins · "+(data.areas||0)+
     " Flächen · "+(data.waters||0)+" Gewässer";
    const edit=privateLayer||this.mergeMode?null:this.button("square-pen","Ebene bearbeiten",
     ()=>this.start("rename",index),"favorite-icon favorite-edit");
    const remove=this.mergeMode?null:this.button("trash",privateLayer?
      "Alle Objekte in Privat löschen":"Ebene oder ihre Objekte löschen",
     ()=>this.start("delete",index),"favorite-icon favorite-remove");
    const row=this.row({name:layer.name,detail,iconLeft:leading,edit,remove,
     onChoose:()=>this.mergeMode?this.chooseMergeTarget(id):
       (this.resetVisibilityCycle(),this.onVisibility(id,!layer.visible)),
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
   if(!this.mergeMode&&!this.mode&&!this.searchText)
     this.wireReorder({allow:id=>id!=="private",
       onMove:(from,to)=>this.onReorder(from,to)});
   const unite=this.el("layersUnite"),reset=this.el("layersSearchClear");
   if(unite&&reset){
    const shown=this.selectedIds.size>=2&&[...this.selectedIds].some(id=>id!=="private");
    unite.classList.toggle("hidden",!shown||this.mergeMode);
    reset.classList.toggle("hidden",shown||this.mergeMode);
   }
   if(this.el("layersPanel"))this.finishRender(pendingFocus);
  }
 }
 root.Pin2MapLayerView=LayerView;
 if(typeof module!=="undefined"&&module.exports)module.exports=LayerView;
})(typeof window!=="undefined"?window:globalThis);
