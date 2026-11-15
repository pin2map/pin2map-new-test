"use strict";
/* Explicit layer choice for a new transient object. Neither persistence nor
 * Leaflet belongs here. An outside tap cancels selection without saving. */
(function(root){
 class TemporaryLayerPicker{
  constructor({document:doc,icons,onChoose,onCreate=()=>null,getLayers=()=>[],onClose=()=>{}}){
   if(!doc||typeof icons?.svg!=="function"||typeof onChoose!=="function")
     throw new TypeError("Temporary layer picker ports required");
   this.doc=doc;this.icons=icons;this.onChoose=onChoose;
   this.onCreate=onCreate;this.getLayers=getLayers;this.onClose=onClose;
   this.entry=null;this.position=null;
   this.filterText="";this.options=[];
   this.box=doc.createElement("section");
   this.box.id="temporaryLayerPicker";
   this.box.className="temporary-layer-picker hidden";
   this.box.setAttribute("role","listbox");
   this.box.setAttribute("aria-label","Zielebene auswählen");
   doc.body.append(this.box);
  }
  bind(){
   if(this.bound)return;
   this.doc.addEventListener("pointerdown",event=>{
     if(this.entry&&!this.box.contains(event.target))this.close();
   });
   this.doc.addEventListener("keydown",event=>{
     if(event.key==="Escape"&&this.entry){
       event.preventDefault();this.close();
     }
   });
   this.bound=true;
  }
  show(entry,layers,anchor){
   this.close(false);
   this.filterText="";
   this.entry=entry;
   this.position=anchor||{left:0,right:0,top:0,bottom:0};
   this.box.replaceChildren();
   const heading=this.doc.createElement("h3");
   heading.className="temporary-layer-heading";
   heading.textContent=entry.kind==="point"?"Pin hinzufügen zu:":
     entry.kind==="river"?"Fluss hinzufügen zu:":
     entry.featureKind==="lake"?"See hinzufügen zu:":"Fläche hinzufügen zu:";
   this.box.append(heading);
   const searchRow=this.doc.createElement("div");
   searchRow.className="pin-layer-filter";
   const search=this.doc.createElement("input");
   search.type="search";search.className="pin-layer-filter-input";
   search.setAttribute("placeholder","Ebenen filtern");
   search.setAttribute("aria-label","Ebenen nach Namen filtern");
   search.setAttribute("autocomplete","off");
   const clear=this.doc.createElement("button");
   clear.type="button";clear.className="pin-layer-filter-clear";
   clear.setAttribute("aria-label","Ebenenfilter zurücksetzen");
   clear.append(this.icons.svg("funnel-x",this.doc));
   search.addEventListener("input",()=>{
     this.filterText=search.value;this.applyFilter();
   });
   clear.addEventListener("click",event=>{
     event.stopPropagation();
     this.filterText="";search.value="";this.applyFilter();search.focus();
   });
   searchRow.append(search,clear);this.box.append(searchRow);
   this.filterInput=search;this.clearButton=clear;
   this.options=[];
   const available=Array.isArray(layers)?layers.filter(l=>l?.id):[];
   for(const layer of available){
     const row=this.doc.createElement("button");
     row.type="button";row.className="temporary-layer-option";
     row.setAttribute("role","option");
     row.setAttribute("aria-selected","false"); // No implicit selection.
     const dot=this.doc.createElement("span");
     dot.className="pin-layer-dot";dot.style.backgroundColor=layer.color;
     const name=this.doc.createElement("span");
     name.className="pin-layer-name";name.textContent=layer.name;
     const eye=this.doc.createElement("span");
     eye.className="pin-layer-visibility"+(layer.visible?"":" is-hidden");
     const icon=this.icons.svg(layer.visible?"eye":"eye-off",this.doc);
     icon.classList.add("pin-layer-visibility-icon");
     eye.append(icon);
     row.setAttribute("aria-label",layer.name+", "+(layer.visible?"Sichtbar":"Ausgeblendet"));
     row.append(dot,eye,name);
     if(!layer.visible)row.classList.add("is-invisible-layer");
     row.addEventListener("click",event=>{
       event.stopPropagation();
       if(this.entry!==entry)return;
       this.close(false);
       this.onChoose(entry,layer.id);
     });
     this.box.append(row);
     this.options.push({button:row,name:layer.name||""});
   }
   if(available.length===1){
     const info=this.doc.createElement("p");
     info.className="temporary-layer-info";
     info.textContent="In diesem Projekt ist nur eine Ebene vorhanden.";
     this.box.append(info);
   }
   const create=this.doc.createElement("button");
   create.type="button";create.className="temporary-layer-create";
   create.setAttribute("aria-label","Neue Ebene erstellen");
   const icon=this.icons.svg("plus",this.doc);
   create.append(icon,this.doc.createTextNode(" Neue Ebene erstellen"));
   create.addEventListener("click",event=>{
     event.stopPropagation();
     if(this.entry!==entry)return;
     const added=this.onCreate();
     // Creating a layer does not create or save the temporary object.
     if(added)this.show(entry,this.getLayers(),this.position);
   });
   this.box.append(create);
   const empty=this.doc.createElement("p");
   empty.className="pin-layer-filter-empty";
   empty.textContent="Keine passende Ebene.";
   this.box.append(empty);this.emptyMessage=empty;
   this.applyFilter();
   if(!available.length){this.close();return;}
   this.box.classList.remove("hidden");
   this.positionMenu();
  }
  applyFilter(){
   const query=this.filterText.trim().toLocaleLowerCase("de-DE");
   let count=0;
   for(const {button,name} of this.options){
     button.hidden=Boolean(query)&&!name.toLocaleLowerCase("de-DE").includes(query);
     if(!button.hidden)count++;
   }
   if(this.emptyMessage)this.emptyMessage.hidden=count>0;
   if(this.clearButton)this.clearButton.disabled=!this.filterText;
  }
  positionMenu(){
   if(!this.entry)return;
   const view=this.doc.defaultView;
   const viewport=view?.visualViewport;
   const left=viewport?.offsetLeft||0,top=viewport?.offsetTop||0;
   const width=viewport?.width||view?.innerWidth||window.innerWidth;
   const height=viewport?.height||view?.innerHeight||window.innerHeight;
   const margin=12,gap=8,menuWidth=Math.min(260,width-2*margin);
   const a=this.position;
   const above=Math.max(0,a.top-(top+margin)-gap);
   const below=Math.max(0,(top+height-margin)-a.bottom-gap);
   // Prefer the side with enough room for ALL project layers rather than
   // clipping the menu to a single row near the top or bottom of a phone.
   const placeAbove=above>below;
   const space=Math.max(72,placeAbove?above:below);
   const maxHeight=Math.min(440,space);
   this.box.style.width=menuWidth+"px";
   this.box.style.maxHeight=maxHeight+"px";
   this.box.style.left=Math.max(left+margin,Math.min(a.left,left+width-menuWidth-margin))+"px";
   this.box.style.top=(placeAbove
     ?Math.max(top+margin,a.top-gap-Math.min(this.box.scrollHeight,maxHeight))
     :Math.max(top+margin,Math.min(top+height-margin-Math.min(this.box.scrollHeight,maxHeight),a.bottom+gap)))+"px";
  }
  close(notify=true){
   if(!this.entry)return;
   this.entry=null;this.position=null;
   this.box.classList.add("hidden");
   if(notify)this.onClose();
  }
 }
 root.Pin2MapTemporaryLayerPicker=TemporaryLayerPicker;
 if(typeof module!=="undefined"&&module.exports)module.exports=TemporaryLayerPicker;
})(typeof window!=="undefined"?window:globalThis);
