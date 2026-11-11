"use strict";
/* Presentation-only basemap menu; no Leaflet, persistence or project ownership. */
(function(root){
  class BasemapMenu {
    constructor({getElement,document:doc,onSelect,onReliefChange=()=>{},onSatelliteAdjust=()=>{},onOpening=()=>{}}){
      if(typeof getElement!=="function"||!doc||typeof doc.querySelectorAll!=="function")
        throw new TypeError("Basemap menu requires DOM access");
      if(typeof onSelect!=="function"||typeof onOpening!=="function")
        throw new TypeError("Basemap callbacks required");
      this.getElement=getElement;
      this.document=doc;
      this.onSelect=onSelect;
      this.onReliefChange=onReliefChange;
      this.onSatelliteAdjust=onSatelliteAdjust;
      this.onOpening=onOpening;
      this.listeners=[];
    }
    get button(){return this.getElement("basemapButton");}
    get menu(){return this.getElement("basemapMenu");}
    options(){return this.document.querySelectorAll("#basemapMenu [data-basemap]");}
    render(selected,esriRelief=false,{brightness=100,contrast=100}={}){
      const relief=this.getElement("esriReliefToggle");
      if(relief)relief.checked=!!esriRelief;
      for(const [key,value] of [["Brightness",brightness],["Contrast",contrast]]){
        const input=this.getElement("satellite"+key);
        if(input){input.value=String(value);input.disabled=selected!=="satellite";}
        const output=this.getElement("satellite"+key+"Value");
        if(output)output.textContent=value+" %";
      }
      this.options().forEach(button=>{
        const active=button.dataset.basemap===selected;
        button.setAttribute("aria-pressed",String(active));
        button.classList.toggle("is-selected",active);
      });
    }
    isOpen(){return !this.menu.classList.contains("hidden");}
    close(){
      this.menu.classList.add("hidden");
      this.button.setAttribute("aria-expanded","false");
    }
    open(){
      if(this.isOpen())return;
      this.onOpening();
      this.menu.classList.remove("hidden");
      this.button.setAttribute("aria-expanded","true");
    }
    toggle(){if(this.isOpen())this.close();else this.open();}
    listen(target,type,handler){
      target.addEventListener(type,handler);
      this.listeners.push({target,type,handler});
    }
    bind(){
      if(this.listeners.length)return;
      this.listen(this.button,"click",()=>this.toggle());
      this.options().forEach(button=>this.listen(button,"click",()=>{
        const value=button.dataset.basemap;
        if(!["street","topo","international","satellite","humanitarian"].includes(value))return;
        this.onSelect(value);
        this.close();
        this.button.focus();
      }));
      const relief=this.getElement("esriReliefToggle");
      if(relief)this.listen(relief,"change",()=>this.onReliefChange(!!relief.checked));
      for(const key of ["Brightness","Contrast"]){
        const input=this.getElement("satellite"+key);
        if(!input)continue;
        const emit=commit=>{
          const value=Number(input.value);
          if(!Number.isFinite(value))return;
          const output=this.getElement("satellite"+key+"Value");
          if(output)output.textContent=value+" %";
          this.onSatelliteAdjust(key.toLowerCase(),value,commit);
        };
        this.listen(input,"input",()=>emit(false));
        this.listen(input,"change",()=>emit(true));
      }
      this.listen(this.document,"keydown",event=>{
        if(event.key==="Escape"&&this.isOpen()){
          this.close();
          this.button.focus();
        }
      });
      this.listen(this.document,"pointerdown",event=>{
        if(this.isOpen()&&!event.target.closest("#basemapMenu, #basemapButton"))
          this.close();
      });
    }
    dispose(){
      this.listeners.forEach(({target,type,handler})=>target.removeEventListener(type,handler));
      this.listeners=[];
    }
  }
  root.Pin2MapBasemapMenu=BasemapMenu;
  if(typeof module!=="undefined"&&module.exports)module.exports=BasemapMenu;
})(typeof window!=="undefined"?window:globalThis);
