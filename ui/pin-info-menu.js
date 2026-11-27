"use strict";
/* Presentation-only information selector, modeled on the basemap chooser.
 * Mode callbacks are injected: no project, weather, Leaflet, persistence. */
(function(root){
  class PinInfoMenu {
    constructor({getElement,document:doc,onSelect,onPeriodChange=()=>{},onOpening=()=>{},getRestoredMode=()=>"elevation",icons}){
      this.element=getElement;this.document=doc;this.onSelect=onSelect;
      this.onOpening=onOpening;this.getRestoredMode=getRestoredMode;this.onPeriodChange=onPeriodChange;this.icons=icons;this.listeners=[];
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
      this.document.querySelectorAll("#pinInfoMenu input[type=radio]").forEach(input=>{
        input.checked=input.value===(mode==="off"?this.getRestoredMode():mode);
      });
      this.mode=mode;
      this.button.setAttribute("aria-pressed",String(mode!=="off"));
      this.icons.mount(this.button,mode==="off"?"message-circle-exclamation-point-off":"message-circle-exclamation-point");
      this.button.setAttribute("aria-label","Obere Labels anzeigen, auswählen oder ausblenden");
      this.updateTitle();
    }
    setLoading(loading){
      const active=Boolean(loading);
      this.button.classList.toggle("is-loading",active);
      this.button.setAttribute("aria-busy",String(active));
      this.updateTitle();
    }
    updateTitle(){
      this.button.title=this.button.classList.contains("is-loading")?"Pin-Informationen werden geladen":
        this.isOpen()?"Obere Labels ausblenden":this.mode==="off"?"Obere Labels anzeigen":"Menü für obere Labels öffnen";
    }
    close(){this.menu.classList.add("hidden");this.button.setAttribute("aria-expanded","false");this.updateTitle();}
    open(){this.onOpening();this.menu.classList.remove("hidden");this.button.setAttribute("aria-expanded","true");this.updateTitle();}
    bind(){
      if(this.listeners.length)return;
      const listen=(el,type,fn)=>{el.addEventListener(type,fn);this.listeners.push({el,type,fn});};
      listen(this.button,"click",()=>{
        if(this.isOpen()){this.close();this.onSelect("off");}
        else if(this.mode==="off")this.onSelect(this.getRestoredMode());
        else this.open();
      });
      for(const [mode,id] of [["daily","pinInfoDailyPeriod"],["precipitation","pinInfoPrecipitationPeriod"],["sun","pinInfoSunPeriod"]]){
        const selector=this.element(id);
        if(!selector)continue;
        // A focus/click selects the row even when the current option is "Heute".
        listen(selector,"focus",()=>this.onPeriodChange(mode,selector.value));
        listen(selector,"change",()=>this.onPeriodChange(mode,selector.value));
      }
      this.document.querySelectorAll("#pinInfoMenu input[type=radio]").forEach(input=>
        listen(input,"change",()=>{if(input.checked)this.onSelect(input.value);}));
      listen(this.document,"pointerdown",event=>{
        if(this.isOpen()&&!event.target.closest("#pinInfoMenu,#pinInfoButton"))this.close();
      });
      listen(this.document,"keydown",event=>{
        if(event.key==="Escape"&&this.isOpen()){this.close();this.button.focus();}
      });
    }
    dispose(){this.listeners.forEach(({el,type,fn})=>el.removeEventListener(type,fn));this.listeners=[];}
  }
  class NameLabelMenu{
    constructor({getElement,document,getVisible,getTypes,onOpening,onChange}){
      Object.assign(this,{getElement,document,getVisible,getTypes,onOpening,onChange});
    }
    get button(){return this.getElement("labelsToggle");}
    get menu(){return this.getElement("nameLabelMenu");}
    get inputs(){return [...this.menu.querySelectorAll("[data-name-label]")];}
    isOpen(){return !this.menu.classList.contains("hidden");}
    render(){
      for(const input of this.inputs)input.checked=this.getTypes()?.[input.dataset.nameLabel]!==false;
      this.button.title=this.isOpen()?"Namenslabels ausblenden":
        this.getVisible()?"Menü für Namenslabels öffnen":"Namenslabels anzeigen";
    }
    close(){this.menu.classList.add("hidden");this.button.setAttribute("aria-expanded","false");this.render();}
    cycle(){
      if(this.isOpen()){
        this.close();this.onChange(false,this.getTypes());
      }else if(!this.getVisible())this.onChange(true,this.getTypes());
      else{
        this.onOpening();this.menu.classList.remove("hidden");
        this.button.setAttribute("aria-expanded","true");this.render();
      }
    }
    bind(){
      for(const input of this.inputs)input.addEventListener("change",()=>{
        this.onChange(this.getVisible(),Object.fromEntries(this.inputs.map(item=>[item.dataset.nameLabel,item.checked])));
      });
      this.document.addEventListener("pointerdown",event=>{
        if(this.isOpen()&&!event.target.closest("#nameLabelMenu,#labelsToggle"))this.close();
      });
      this.document.addEventListener("keydown",event=>{
        if(event.key==="Escape"&&this.isOpen()){this.close();this.button.focus();}
      });
    }
  }
  root.Pin2MapNameLabelMenu=NameLabelMenu;
  root.Pin2MapPinInfoMenu=PinInfoMenu;
  if(typeof module!=="undefined"&&module.exports)module.exports=PinInfoMenu;
})(typeof window!=="undefined"?window:globalThis);
