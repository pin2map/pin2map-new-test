"use strict";
/* Presentation-only information selector, modeled on the basemap chooser.
 * Mode callbacks are injected: no project, weather, Leaflet, persistence. */
(function(root){
  class PinInfoMenu {
    constructor({getElement,document:doc,onSelect,onOpening=()=>{},icons}){
      this.element=getElement;this.document=doc;this.onSelect=onSelect;
      this.onOpening=onOpening;this.icons=icons;this.listeners=[];
    }
    get button(){return this.element("pinInfoButton");}
    get menu(){return this.element("pinInfoMenu");}
    isOpen(){return !this.menu.classList.contains("hidden");}
    render(mode){
      this.document.querySelectorAll("#pinInfoMenu [data-pin-info-mode]").forEach(el=>{
        const selected=el.dataset.pinInfoMode===mode;
        el.classList.toggle("is-selected",selected);
        el.setAttribute("aria-pressed",String(selected));
      });
      this.icons.mount(this.button,mode==="off"?"circle-letter-i-off":"circle-letter-i");
      this.button.setAttribute("aria-label","Pin-Informationen auswählen");
      this.button.title="Pin-Informationen auswählen";
    }
    close(){this.menu.classList.add("hidden");this.button.setAttribute("aria-expanded","false");}
    open(){this.onOpening();this.menu.classList.remove("hidden");this.button.setAttribute("aria-expanded","true");}
    bind(){
      if(this.listeners.length)return;
      const listen=(el,type,fn)=>{el.addEventListener(type,fn);this.listeners.push({el,type,fn});};
      listen(this.button,"click",()=>this.isOpen()?this.close():this.open());
      this.document.querySelectorAll("#pinInfoMenu [data-pin-info-mode]").forEach(el=>
        listen(el,"click",()=>{
          this.onSelect(el.dataset.pinInfoMode);
          this.close();
          this.button.focus();
        }));
      listen(this.document,"pointerdown",event=>{
        if(this.isOpen()&&!event.target.closest("#pinInfoMenu,#pinInfoButton"))this.close();
      });
      listen(this.document,"keydown",event=>{
        if(event.key==="Escape"&&this.isOpen()){this.close();this.button.focus();}
      });
    }
    dispose(){this.listeners.forEach(({el,type,fn})=>el.removeEventListener(type,fn));this.listeners=[];}
  }
  root.Pin2MapPinInfoMenu=PinInfoMenu;
  if(typeof module!=="undefined"&&module.exports)module.exports=PinInfoMenu;
})(typeof window!=="undefined"?window:globalThis);
