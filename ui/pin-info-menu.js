"use strict";
/* Presentation-only information selector, modeled on the basemap chooser.
 * Mode callbacks are injected: no project, weather, Leaflet, persistence. */
(function(root){
  class PinInfoMenu {
    constructor({getElement,document:doc,onSelect,onPeriodChange=()=>{},onOpening=()=>{},icons}){
      this.element=getElement;this.document=doc;this.onSelect=onSelect;
      this.onOpening=onOpening;this.onPeriodChange=onPeriodChange;this.icons=icons;this.listeners=[];
    }
    get button(){return this.element("pinInfoButton");}
    get menu(){return this.element("pinInfoMenu");}
    isOpen(){return !this.menu.classList.contains("hidden");}
    render(mode,periods={daily:"today",sun:"today"}){
      for(const selectedMode of ["daily","precipitation","sun"]){
        const select=this.element(selectedMode==="daily"?"pinInfoDailyPeriod":selectedMode==="sun"?"pinInfoSunPeriod":"pinInfoPrecipitationPeriod");
        if(select)select.value=periods[selectedMode];
      }
      this.document.querySelectorAll("#pinInfoMenu .pin-info-mode-row").forEach(row=>{
        row.classList.toggle("is-selected",row.dataset.pinInfoMode===mode);
      });
      this.document.querySelectorAll("#pinInfoMenu button[data-pin-info-mode]").forEach(el=>{
        const selected=el.dataset.pinInfoMode===mode;
        el.classList.toggle("is-selected",selected);
        el.setAttribute("aria-pressed",String(selected));
      });
      this.icons.mount(this.button,mode==="off"?"message-circle-exclamation-point-off":"message-circle-exclamation-point");
      this.button.setAttribute("aria-label","Pin-Informationen auswählen");
      this.button.title="Pin-Informationen auswählen";
    }
    close(){this.menu.classList.add("hidden");this.button.setAttribute("aria-expanded","false");}
    open(){this.onOpening();this.menu.classList.remove("hidden");this.button.setAttribute("aria-expanded","true");}
    bind(){
      if(this.listeners.length)return;
      const listen=(el,type,fn)=>{el.addEventListener(type,fn);this.listeners.push({el,type,fn});};
      listen(this.button,"click",()=>this.isOpen()?this.close():this.open());
      for(const [mode,id] of [["daily","pinInfoDailyPeriod"],["precipitation","pinInfoPrecipitationPeriod"],["sun","pinInfoSunPeriod"]]){
        const selector=this.element(id);
        if(!selector)continue;
        // A focus/click selects the row even when the current option is "Heute".
        listen(selector,"focus",()=>this.onPeriodChange(mode,selector.value));
        listen(selector,"change",()=>this.onPeriodChange(mode,selector.value));
      }
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
