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
   this.entry=entry;
   this.position=anchor||{left:0,right:0,top:0,bottom:0};
   this.box.replaceChildren();
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
     row.append(dot,name,eye);
     row.addEventListener("click",event=>{
       event.stopPropagation();
       if(this.entry!==entry)return;
       this.close(false);
       this.onChoose(entry,layer.id);
     });
     this.box.append(row);
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
   if(!available.length){this.close();return;}
   this.box.classList.remove("hidden");
   this.positionMenu();
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
   const above=a.top-(top+margin)-gap;
   const below=(top+height-margin)-a.bottom-gap;
   const placeAbove=above>=Math.min(238,below);
   const space=Math.max(72,placeAbove?above:below);
   const maxHeight=Math.min(260,space);
   this.box.style.width=menuWidth+"px";
   this.box.style.maxHeight=maxHeight+"px";
   this.box.style.left=Math.max(left+margin,Math.min(a.left,left+width-menuWidth-margin))+"px";
   this.box.style.top=(placeAbove
     ?Math.max(top+margin,a.top-gap-Math.min(this.box.scrollHeight,maxHeight))
     :Math.min(top+height-margin-maxHeight,a.bottom+gap))+"px";
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
