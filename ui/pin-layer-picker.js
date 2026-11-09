"use strict";
/*
 * Presentation-only colored layer picker for the pin editor. The native select
 * remains the single change event channel used by application logic. All DOM
 * content is created with textContent, never interpolated into HTML.
 */
(function(root){
  class PinLayerPicker{
    constructor({getElement,document:doc}){
      if(typeof getElement!=="function"||!doc)throw new TypeError("Layer picker DOM dependencies required");
      this.el=getElement;this.document=doc;
      this.open=false;
      this.el("pinLayerTrigger").addEventListener("click",()=>this.setOpen(!this.open));
      this.el("pinLayerMenu").addEventListener("keydown",event=>{
        if(event.key==="Escape"){event.preventDefault();this.setOpen(false);this.el("pinLayerTrigger").focus();}
      });
      doc.addEventListener("pointerdown",event=>{
        if(!event.target.closest?.("#pinLayerPicker"))this.setOpen(false);
      });
    }
    visibilityIcon(visible){
      const icon=root.Pin2MapIcons.svg(visible?"eye":"eye-off",this.document);
      icon.classList.add("pin-layer-visibility-icon");
      return icon;
    }
    visibilityLabel(visible){
      return visible?"Sichtbar":"Ausgeblendet";
    }
    setOpen(open){
      this.open=Boolean(open);
      this.el("pinLayerMenu").classList.toggle("hidden",!this.open);
      this.el("pinLayerTrigger").setAttribute("aria-expanded",String(this.open));
    }
    render({layers,selectedLayerId}){
      const trigger=this.el("pinLayerTrigger"),menu=this.el("pinLayerMenu");
      const selected=layers.find(l=>l.id===selectedLayerId)||layers[0];
      trigger.replaceChildren();
      if(selected){
        const dot=this.document.createElement("span");dot.className="pin-layer-dot";dot.style.backgroundColor=selected.color;
        const name=this.document.createElement("span");name.className="pin-layer-name";name.textContent=selected.name;
        const status=this.document.createElement("span");
        status.className="pin-layer-visibility"+(selected.visible?"":" is-hidden");
        status.title=this.visibilityLabel(selected.visible);
        status.setAttribute("aria-label",this.visibilityLabel(selected.visible));
        status.append(this.visibilityIcon(selected.visible));
        const arrow=this.document.createElement("span");arrow.className="pin-layer-chevron";arrow.setAttribute("aria-hidden","true");arrow.textContent="";
        trigger.append(dot,name,status,arrow);
      }
      menu.replaceChildren();
      for(const layer of layers){
        const option=this.document.createElement("button");
        option.type="button";option.className="pin-layer-option";
        option.setAttribute("role","option");
        option.setAttribute("aria-selected",String(layer.id===selectedLayerId));
        const dot=this.document.createElement("span");dot.className="pin-layer-dot";dot.style.backgroundColor=layer.color;
        const name=this.document.createElement("span");name.className="pin-layer-name";name.textContent=layer.name;
        const status=this.document.createElement("span");
        status.className="pin-layer-visibility"+(layer.visible?"":" is-hidden");
        status.title=this.visibilityLabel(layer.visible);
        status.setAttribute("aria-label",this.visibilityLabel(layer.visible));
        status.append(this.visibilityIcon(layer.visible));
        option.setAttribute("aria-label",layer.name+", "+this.visibilityLabel(layer.visible));
        option.append(dot,name,status);
        option.addEventListener("click",()=>{
          const select=this.el("pinLayer");
          if(select.value!==layer.id){
            select.value=layer.id;
            select.dispatchEvent(new this.document.defaultView.Event("change",{bubbles:true}));
          }
          this.setOpen(false);
          trigger.focus();
        });
        menu.append(option);
      }
    }
  }
  root.Pin2MapPinLayerPicker=PinLayerPicker;
  if(typeof module!=="undefined"&&module.exports)module.exports=PinLayerPicker;
})(typeof window!=="undefined"?window:globalThis);
