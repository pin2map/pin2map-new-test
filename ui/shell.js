"use strict";
/*
 * Presentation-only shell module. No Leaflet, domain, repository, or network.
 * DOM element access is injected so behavior can be tested independently.
 */
(function(root){
  class UIShell {
    constructor({getElement,mountLabelIcon=()=>{},setTimer=(callback,delay)=>root.setTimeout(callback,delay),
      clearTimer=id=>root.clearTimeout(id)}){
      if(typeof getElement!=="function")throw new TypeError("getElement must be a function");
      this.element=getElement;
      this.mountLabelIcon=mountLabelIcon;
      this.setTimer=setTimer;
      this.clearTimer=clearTimer;
      this.noticeTimer=null;
    }
    showNotice(message){
      const notice=this.element("notice");
      notice.textContent=String(message);
      notice.classList.remove("hidden");
      this.clearTimer(this.noticeTimer);
      this.noticeTimer=this.setTimer(()=>{
        notice.classList.add("hidden");
        this.noticeTimer=null;
      },3500);
    }
    hideNotice(){
      this.clearTimer(this.noticeTimer);
      this.noticeTimer=null;
      this.element("notice").classList.add("hidden");
    }
    closePanels(){
      this.element("layersPanel").classList.add("hidden");
      this.element("settingsPanel").classList.add("hidden");
      this.element("layersButton").setAttribute("aria-expanded","false");
    }
    togglePanel(id){
      if(id!=="layersPanel"&&id!=="settingsPanel")
        throw new RangeError("Unknown panel: "+id);
      const panel=this.element(id);
      const wasHidden=panel.classList.contains("hidden");
      this.closePanels();
      if(wasHidden)panel.classList.remove("hidden");
      this.element("layersButton").setAttribute("aria-expanded",
        String(!this.element("layersPanel").classList.contains("hidden")));
    }
    closePanel(id){
      if(id!=="layersPanel"&&id!=="settingsPanel")
        throw new RangeError("Unknown panel: "+id);
      this.element(id).classList.add("hidden");
      if(id==="layersPanel")
        this.element("layersButton").setAttribute("aria-expanded","false");
    }
    updateLabelButton(labelsVisible){
      const button=this.element("labelsToggle");
      const enabled=Boolean(labelsVisible);
      button.setAttribute("aria-pressed",String(enabled));
      button.title=enabled?"Pin-Beschriftungen ausblenden":"Pin-Beschriftungen einblenden";
      button.classList.toggle("is-off",!enabled);
      this.mountLabelIcon(button,enabled?"tags":"tags-off");
    }
    dispose(){
      this.clearTimer(this.noticeTimer);
      this.noticeTimer=null;
    }
  }
  root.Pin2MapUIShell=UIShell;
  if(typeof module!=="undefined"&&module.exports)module.exports=UIShell;
})(typeof window!=="undefined"?window:globalThis);
