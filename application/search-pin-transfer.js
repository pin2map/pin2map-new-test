"use strict";
/* Transfer a selected geocoder result to the application's immediate Pin creation
 * port. Project creation and persistence remain outside this service.
 * Provider/network, UI rendering and project persistence remain elsewhere. */
(function(root){
  class SearchPinTransfer{
    constructor({searchView,titleOf,addPin,addressOf=null,mapPort,onLayout,isPrivateLayerVisible,onRenderMarkers}){
      if(!searchView||[titleOf,addPin,onLayout,isPrivateLayerVisible,onRenderMarkers].some(fn=>typeof fn!=="function")||
        !mapPort||typeof mapPort.getViewport!=="function"||typeof mapPort.setView!=="function")
        throw new TypeError("Search pin transfer ports required");
      this.addressOf=addressOf;this.searchView=searchView;this.titleOf=titleOf;this.addPin=addPin;this.mapPort=mapPort;
      this.onLayout=onLayout;this.isPrivateLayerVisible=isPrivateLayerVisible;
      this.onRenderMarkers=onRenderMarkers;
    }
    choose(result,query=result?.searchQuery){
      const lat=Number(result?.lat),lng=Number(result?.lon);
      if(!Number.isFinite(lat)||!Number.isFinite(lng)){
        this.searchView.message("Ort konnte nicht übernommen werden");
        return null;
      }
      this.searchView.hide();
      const name=this.titleOf(result,query);
      const pin=this.addressOf?this.addPin(lat,lng,name,this.addressOf(result)):this.addPin(lat,lng,name);
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
    present(results,query){
      if(!results.length){
        this.searchView.message("Kein Ort gefunden");
        return;
      }
      if(results.length===1){this.choose(results[0],query);return;}
      this.searchView.show(query?results.map(result=>({...result,searchQuery:query})):results);
    }
  }
  root.Pin2MapSearchPinTransfer=SearchPinTransfer;
  if(typeof module!=="undefined"&&module.exports)module.exports=SearchPinTransfer;
})(typeof window!=="undefined"?window:globalThis);
