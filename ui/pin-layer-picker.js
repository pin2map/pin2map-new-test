"use strict";
/*
 * Presentation-only colored layer picker for the pin editor. The native select
 * remains the single change event channel used by application logic. All DOM
 * content is created with textContent, never interpolated into HTML.
 */
(function(root){
  class PinLayerPicker{
    constructor({getElement,document:doc,icons=root.Pin2MapIcons}){
      if(typeof getElement!=="function"||!doc)throw new TypeError("Layer picker DOM dependencies required");
      this.el=getElement;this.document=doc;this.icons=icons;
      if(!icons||typeof icons.svg!=="function")throw new TypeError("Lucide icons required");
      this.open=false;
      // The menu is a viewport-level overlay. Keeping it inside the
      // scroll-limited pin panel caused nested scrollbars on iPhone.
      const menu=this.el("pinLayerMenu");
      if(doc.body&&typeof doc.body.append==="function")doc.body.append(menu);
      this.onViewportChange=()=>{if(this.open)this.positionMenu();};
      doc.defaultView?.addEventListener?.("resize",this.onViewportChange);
      doc.defaultView?.visualViewport?.addEventListener?.("resize",this.onViewportChange);
      this.el("pinLayerTrigger").addEventListener("click",()=>this.setOpen(!this.open));
      this.el("pinLayerMenu").addEventListener("keydown",event=>{
        if(event.key==="Escape"){event.preventDefault();this.setOpen(false);this.el("pinLayerTrigger").focus();}
      });
      doc.addEventListener("pointerdown",event=>{
        if(!event.target.closest?.("#pinLayerPicker, #pinLayerMenu"))this.setOpen(false);
      });
    }
    visibilityIcon(visible){
      const icon=this.icons.svg(visible?"eye":"eye-off",this.document);
      icon.classList.add("pin-layer-visibility-icon");
      return icon;
    }
    visibilityLabel(visible){
      return visible?"Sichtbar":"Ausgeblendet";
    }
    positionMenu(){
      const trigger=this.el("pinLayerTrigger").getBoundingClientRect();
      const menu=this.el("pinLayerMenu");
      const view=this.document.defaultView;
      if(!view)return;
      const viewport=view.visualViewport;
      const left=viewport?.offsetLeft||0,top=viewport?.offsetTop||0;
      const width=viewport?.width||view.innerWidth;
      const height=viewport?.height||view.innerHeight;
      const margin=12,gap=8;
      // A fixed width gives long layer names room without expanding the dialog.
      const menuWidth=Math.min(260,width-2*margin);
      const availableAbove=trigger.top-(top+margin)-gap;
      const availableBelow=(top+height-margin)-trigger.bottom-gap;
      const placeAbove=availableAbove>=Math.min(238,availableBelow);
      const space=Math.max(72,placeAbove?availableAbove:availableBelow);
      const maxHeight=Math.min(260,space);
      menu.style.width=menuWidth+"px";
      menu.style.maxHeight=maxHeight+"px";
      menu.style.left=Math.max(left+margin,Math.min(trigger.left,left+width-menuWidth-margin))+"px";
      menu.style.top=(placeAbove
        ?Math.max(top+margin,trigger.top-gap-Math.min(menu.scrollHeight,maxHeight))
        :trigger.bottom+gap)+"px";
    }
    setOpen(open){
      this.open=Boolean(open);
      this.el("pinLayerMenu").classList.toggle("hidden",!this.open);
      this.el("pinLayerTrigger").setAttribute("aria-expanded",String(this.open));
      this.el("pinPanel").classList.toggle("pin-layer-open",this.open);
      if(this.open)this.positionMenu();
    }
    render({layers,selectedLayerId}){
      const trigger=this.el("pinLayerTrigger"),menu=this.el("pinLayerMenu");
      const selected=layers.find(l=>l.id===selectedLayerId)||layers[0];
      trigger.replaceChildren();
      if(selected){
        trigger.setAttribute("aria-label","Ebene: "+selected.name+", "+this.visibilityLabel(selected.visible));
        const dot=this.document.createElement("span");dot.className="pin-layer-dot";dot.style.backgroundColor=selected.color;
        const icon=this.icons.svg("layers-arrow-down",this.document);
        icon.classList.add("pin-layer-trigger-icon");
        trigger.append(icon,dot);
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
