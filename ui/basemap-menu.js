"use strict";
/* Presentation-only basemap menu; no Leaflet, persistence or project ownership. */
(function(root){
  class BasemapMenu {
    constructor({getElement,document:doc,onSelect,onOpening=()=>{}}){
      if(typeof getElement!=="function"||!doc||typeof doc.querySelectorAll!=="function")
        throw new TypeError("Basemap menu requires DOM access");
      if(typeof onSelect!=="function"||typeof onOpening!=="function")
        throw new TypeError("Basemap callbacks required");
      this.getElement=getElement;
      this.document=doc;
      this.onSelect=onSelect;
      this.onOpening=onOpening;
      this.listeners=[];
    }
    get button(){return this.getElement("basemapButton");}
    get menu(){return this.getElement("basemapMenu");}
    options(){return this.document.querySelectorAll("#basemapMenu [data-basemap]");}
    render(selected){
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
        if(value!=="street"&&value!=="topo")return;
        this.onSelect(value);
        this.close();
        this.button.focus();
      }));
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
