"use strict";
/* Existing GPX-track overlay actions for a pin; not live routing.
 * UI owns transient selection and controls only. Map/render/export are ports. */
(function(root){
  class PinGpxActions{
    constructor({getElement,getPin,mapPort,prepareExport,download,onNotice}){
      if([getElement,getPin,prepareExport,download,onNotice].some(f=>typeof f!=="function")||
        !mapPort||typeof mapPort.show!=="function"||typeof mapPort.clear!=="function")
        throw new TypeError("Pin GPX action ports required");
      this.getPin=getPin;this.mapPort=mapPort;
      this.prepareExport=prepareExport;this.download=download;this.onNotice=onNotice;
      this.routeButton=getElement("pinGpxRoute");
      this.exportButton=getElement("pinGpxExport");
      this.activePinId=null;
    }
    hide(){
      this.mapPort.clear();
      this.activePinId=null;
      this.routeButton.textContent="Route anzeigen";
      this.routeButton.setAttribute("aria-pressed","false");
    }
    toggle(){
      const pin=this.getPin(),attachment=pin?.gpxAttachment;
      if(!attachment?.chains?.length)return;
      if(this.activePinId===pin.id){this.hide();return;}
      this.hide();
      this.mapPort.show(attachment.chains);
      this.activePinId=pin.id;
      this.routeButton.textContent="Route verbergen";
      this.routeButton.setAttribute("aria-pressed","true");
    }
    export(){
      const pin=this.getPin();
      if(!pin?.gpxAttachment?.chains?.length)return;
      try{
        const {content,filename}=this.prepareExport(pin);
        this.download(content,filename);
      }catch(error){this.onNotice("GPX-Export fehlgeschlagen: "+error.message);}
    }
    bind(){
      this.routeButton.addEventListener("click",()=>this.toggle());
      this.exportButton.addEventListener("click",()=>this.export());
    }
  }
  root.Pin2MapPinGpxActions=PinGpxActions;
  if(typeof module!=="undefined"&&module.exports)module.exports=PinGpxActions;
})(typeof window!=="undefined"?window:globalThis);
