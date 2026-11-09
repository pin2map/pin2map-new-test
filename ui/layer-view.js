"use strict";
/* Presentation-only layer list. State changes are delegated to the caller. */
(function(root){
  class LayerView{
    constructor({getElement,document,onVisibility,onDelete}){
      if(typeof getElement!=="function"||!document)throw new TypeError("DOM dependencies required");
      this.element=getElement;this.document=document;
      this.onVisibility=onVisibility;this.onDelete=onDelete;
    }
    render({layers,counts,selectedLayerId=null}){
      const list=this.element("layersList"),select=this.element("pinLayer");
      const previous=select.value;
      list.replaceChildren();select.replaceChildren();
      for(const layer of layers){
        const row=this.document.createElement("div");row.className="layer-row";
        const eye=this.document.createElement("input");eye.type="checkbox";
        eye.checked=layer.visible;eye.title="Ebene sichtbar";
        eye.setAttribute("aria-label",layer.name+" sichtbar");
        eye.addEventListener("change",()=>this.onVisibility(layer.id,eye.checked));
        const dot=this.document.createElement("span");dot.className="layer-color";
        dot.style.background=layer.color;
        const label=this.document.createElement("div");label.className="layer-name";
        const name=this.document.createElement("strong");name.textContent=layer.name;
        const count=this.document.createElement("small");count.textContent=(counts[layer.id]||0)+" Pins";
        label.append(name,count);row.append(eye,dot,label);
        const del=this.document.createElement("button");del.type="button";
        del.className="layer-delete";
        const isPrivate=layer.id==="private";
        del.textContent=isPrivate?"⌫":"✕";
        root.Pin2MapIcons?.mount(del,"trash-2");
        del.title=isPrivate?"Alle Pins in Privat löschen":"Ebene mit Pins löschen";
        del.setAttribute("aria-label",del.title);
        del.disabled=isPrivate&&(counts[layer.id]||0)===0;
        del.addEventListener("click",()=>this.onDelete(layer.id));
        row.append(del);list.append(row);
        const option=this.document.createElement("option");
        option.value=layer.id;option.textContent=layer.name;select.append(option);
      }
      select.value=selectedLayerId??previous;
    }
  }
  root.Pin2MapLayerView=LayerView;
  if(typeof module!=="undefined"&&module.exports)module.exports=LayerView;
})(typeof window!=="undefined"?window:globalThis);
