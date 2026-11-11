"use strict";
/* Apply a selected geocoder result to a pin and the map using injected ports.
 * Provider/network, UI rendering and project persistence remain elsewhere. */
(function(root){
  class SearchPinTransfer{
    constructor({searchView,titleOf,addPin,mapPort,onLayout,isPrivateLayerVisible,onRenderMarkers}){
      if(!searchView||[titleOf,addPin,onLayout,isPrivateLayerVisible,onRenderMarkers].some(fn=>typeof fn!=="function")||
        !mapPort||typeof mapPort.getViewport!=="function"||typeof mapPort.setView!=="function")
        throw new TypeError("Search pin transfer ports required");
      this.searchView=searchView;this.titleOf=titleOf;this.addPin=addPin;this.mapPort=mapPort;
      this.onLayout=onLayout;this.isPrivateLayerVisible=isPrivateLayerVisible;
      this.onRenderMarkers=onRenderMarkers;
    }
    choose(result){
      const lat=Number(result?.lat),lng=Number(result?.lon);
      if(!Number.isFinite(lat)||!Number.isFinite(lng)){
        this.searchView.message("Ort konnte nicht übernommen werden");
        return null;
      }
      this.searchView.hide();
      const pin=this.addPin(lat,lng,this.titleOf(result));
      if(pin){
        this.mapPort.setView({
          center:{lat,lng},
          zoom:Math.max(this.mapPort.getViewport().zoom,13)
        },{animate:false});
        this.onLayout();
        if(this.isPrivateLayerVisible())this.onRenderMarkers();
      }
      return pin||null;
    }
    present(results){
      if(!results.length){
        this.searchView.message("Kein Ort gefunden");
        return;
      }
      if(results.length===1){this.choose(results[0]);return;}
      this.searchView.show(results);
    }
  }
  root.Pin2MapSearchPinTransfer=SearchPinTransfer;
  if(typeof module!=="undefined"&&module.exports)module.exports=SearchPinTransfer;
})(typeof window!=="undefined"?window:globalThis);
