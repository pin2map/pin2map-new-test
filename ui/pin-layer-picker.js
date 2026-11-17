"use strict";
/* The SINGLE layer-selection component for pin, area, lake and river.
 * Application state and persistence are injected through onSelect. */
(function(root){
 class ObjectLayerPicker{
  constructor({getElement,document:doc,icons=root.Pin2MapIcons,
    triggerId="pinLayerTrigger",menuId="pinLayerMenu",panelId="pinPanel",
    pickerId="pinLayerPicker",selectId="pinLayer",onSelect=null,
    contained=false,header=null,actions=null,bindTrigger=true,onOpenChange=()=>{}}){
   if(typeof getElement!=="function"||!doc||!icons?.svg)
     throw new TypeError("Object layer picker dependencies required");
   this.el=getElement;this.doc=doc;this.icons=icons;this.document=doc;
   this.triggerId=triggerId;this.menuId=menuId;this.panelId=panelId;
   this.pickerId=pickerId;this.selectId=selectId;this.onSelect=onSelect;
   this.contained=contained;this.header=header;this.actions=actions;
   this.onOpenChange=onOpenChange;
   this.open=false;this.filterText="";this.options=[];
   const menu=this.el(menuId),trigger=this.el(triggerId);
   if(!menu||!trigger)throw new TypeError("Layer menu and trigger required");
   if(doc.body?.append)doc.body.append(menu);
   this.onViewportChange=()=>{if(this.open)this.positionMenu();};
   doc.defaultView?.addEventListener?.("resize",this.onViewportChange);
   doc.defaultView?.visualViewport?.addEventListener?.("resize",this.onViewportChange);
   if(bindTrigger)trigger.addEventListener("click",()=>this.setOpen(!this.open));
   menu.addEventListener("keydown",event=>{
    if(event.key==="Escape"){
     event.preventDefault();event.stopPropagation?.();
     this.setOpen(false);trigger.focus?.();
    }
   });
   doc.addEventListener("pointerdown",event=>{
    if(!this.open)return;
    // Identity checks, not selector IDs: Geometry buttons are dynamically
    // created and do not share the Pin's static element IDs.
    const inside=event.target===trigger||trigger.contains?.(event.target)||
      event.target===menu||menu.contains?.(event.target)||
      (pickerId&&this.el(pickerId)?.contains?.(event.target));
    if(!inside)this.setOpen(false);
   });
  }
  visibilityIcon(visible){
   const icon=this.icons.svg(visible?"eye":"eye-off",this.doc);
   icon.classList.add("pin-layer-visibility-icon");
   return icon;
  }
  visibilityLabel(visible){return visible?"Sichtbar":"Ausgeblendet";}
  positionMenu(){
   const trigger=this.el(this.triggerId).getBoundingClientRect();
   const menu=this.el(this.menuId),win=this.doc.defaultView;
   if(!win)return;
   const vv=win.visualViewport,left=vv?.offsetLeft||0,top=vv?.offsetTop||0;
   const width=vv?.width||win.innerWidth,height=vv?.height||win.innerHeight;
   const margin=12,gap=8;
   if(this.contained){
    const panel=this.el(this.panelId).getBoundingClientRect();
    const head=this.header?.getBoundingClientRect?.();
    const actions=this.actions?.getBoundingClientRect?.();
    const menuWidth=Math.min(260,Math.max(100,panel.width-20),width-24);
    const upper=Math.max(panel.top+gap,(head?.bottom??panel.top)+gap,top+gap);
    const lower=Math.min(panel.bottom-gap,(actions?.top??panel.bottom)-gap,top+height-gap);
    menu.style.width=menuWidth+"px";
    menu.style.maxHeight=Math.max(45,Math.min(310,lower-upper))+"px";
    menu.style.left=Math.max(left+gap,Math.min(
     panel.left+(panel.width-menuWidth)/2,left+width-menuWidth-gap))+"px";
    menu.style.top=upper+"px";
    return;
   }
   // Restore the approved usable layer list: full object-dialog scale,
   // independent of the narrow circular layer trigger. The list stays
   // portalled outside the panel and scrolls inside the visual viewport.
   const menuWidth=Math.min(390,Math.max(0,width-2*margin));
   const above=Math.max(0,trigger.top-top-margin-gap);
   const below=Math.max(0,top+height-margin-trigger.bottom-gap);
   const placeAbove=above>below;
   const available=Math.max(72,placeAbove?above:below);
   const maxHeight=Math.min(460,available);
   menu.style.width=menuWidth+"px";menu.style.maxHeight=maxHeight+"px";
   const centered=trigger.left+trigger.width/2-menuWidth/2;
   menu.style.left=Math.max(left+margin,
    Math.min(centered,left+width-menuWidth-margin))+"px";
   const rendered=Math.min(menu.scrollHeight||maxHeight,maxHeight);
   menu.style.top=(placeAbove?
    Math.max(top+margin,trigger.top-gap-rendered):
    Math.max(top+margin,Math.min(trigger.bottom+gap,top+height-margin-rendered)))+"px";
  }
  setOpen(open){
   this.open=Boolean(open);
   if(this.open){
    this.filterText="";
    if(this.filterInput)this.filterInput.value="";
   }
   const menu=this.el(this.menuId),trigger=this.el(this.triggerId);
   menu.classList.toggle("hidden",!this.open);
   trigger.setAttribute("aria-expanded",String(this.open));
   trigger.classList.toggle("is-active",this.open);
   this.el(this.panelId)?.classList.toggle("pin-layer-open",this.open);
   if(this.open){this.applyFilter();this.positionMenu();}
   this.onOpenChange(this.open);
  }
  applyFilter(){
   const q=this.filterText.trim().toLocaleLowerCase("de-DE");
   let count=0;
   for(const {button,name} of this.options){
    button.hidden=Boolean(q)&&!name.toLocaleLowerCase("de-DE").includes(q);
    if(!button.hidden)count++;
   }
   if(this.emptyMessage)this.emptyMessage.hidden=count>0;
   if(this.clearButton)this.clearButton.disabled=!this.filterText;
  }
  render({layers,selectedLayerId}){
   const trigger=this.el(this.triggerId),menu=this.el(this.menuId);
   const selected=layers.find(l=>l.id===selectedLayerId)||layers[0];
   // Both the trigger and the colored-dot indicator have ONE owner.
   trigger.replaceChildren();
   if(selected){
    trigger.setAttribute("aria-label","Ebene: "+selected.name+", "+this.visibilityLabel(selected.visible));
    const icon=this.icons.svg("layers-arrow-down",this.doc);
    icon.classList.add("pin-layer-trigger-icon");
    const dot=this.doc.createElement("span");
    dot.className="pin-layer-dot";dot.style.backgroundColor=selected.color;
    trigger.append(icon,dot);
   }
   menu.replaceChildren();this.options=[];
   const filter=this.doc.createElement("div");filter.className="pin-layer-filter";
   const input=this.doc.createElement("input");input.type="search";
   input.className="pin-layer-filter-input";input.placeholder="Ebenen filtern";
   input.setAttribute("aria-label","Ebenen nach Namen filtern");
   input.setAttribute("autocomplete","off");input.value=this.filterText;
   const clear=this.doc.createElement("button");clear.type="button";
   clear.className="pin-layer-filter-clear";
   clear.setAttribute("aria-label","Ebenenfilter zurücksetzen");
   clear.setAttribute("title","Ebenenfilter zurücksetzen");
   clear.append(this.icons.svg("funnel-x",this.doc));
   input.addEventListener("input",()=>{this.filterText=input.value;this.applyFilter();});
   clear.addEventListener("click",()=>{
    this.filterText="";input.value="";this.applyFilter();input.focus();
   });
   filter.append(input,clear);menu.append(filter);
   this.clearButton=clear;this.filterInput=input;
   for(const layer of layers){
    const option=this.doc.createElement("button");option.type="button";
    option.className="pin-layer-option";
    option.setAttribute("role","option");
    option.setAttribute("aria-selected",String(layer.id===selectedLayerId));
    const dot=this.doc.createElement("span");
    dot.className="pin-layer-dot";dot.style.backgroundColor=layer.color;
    const name=this.doc.createElement("span");
    name.className="pin-layer-name";name.textContent=layer.name;
    const status=this.doc.createElement("span");
    status.className="pin-layer-visibility"+(layer.visible?"":" is-hidden");
    status.title=this.visibilityLabel(layer.visible);
    status.setAttribute("aria-label",this.visibilityLabel(layer.visible));
    status.append(this.visibilityIcon(layer.visible));
    option.setAttribute("aria-label",layer.name+", "+this.visibilityLabel(layer.visible));
    option.append(dot,status,name);
    if(!layer.visible)option.classList.add("is-invisible-layer");
    option.addEventListener("click",()=>{
     if(this.onSelect)this.onSelect(layer.id,layer);
     else{
      const select=this.el(this.selectId);
      if(select.value!==layer.id){
       select.value=layer.id;
       select.dispatchEvent(new this.doc.defaultView.Event("change",{bubbles:true}));
      }
     }
     this.setOpen(false);trigger.focus?.();
    });
    menu.append(option);
    this.options.push({button:option,name:layer.name||""});
   }
   const empty=this.doc.createElement("p");
   empty.className="pin-layer-filter-empty";empty.textContent="Keine passende Ebene.";
   menu.append(empty);this.emptyMessage=empty;
   this.applyFilter();
   if(this.open)this.positionMenu();
  }
 }
 root.Pin2MapObjectLayerPicker=ObjectLayerPicker;
 root.Pin2MapPinLayerPicker=ObjectLayerPicker; // compatibility with the Pin view
 if(typeof module!=="undefined"&&module.exports)module.exports=ObjectLayerPicker;
})(typeof window!=="undefined"?window:globalThis);
