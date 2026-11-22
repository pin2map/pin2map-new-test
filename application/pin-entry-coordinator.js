"use strict";
/* Converts explicit map/search/GPS pin requests into object-adoption inputs.
 * Input validation and source semantics stay independent of Leaflet, DOM,
 * storage, and the map-interaction owner's event dispatch. */
(function(root){
  class PinEntryCoordinator{
    constructor({closeMapMenus,getMapZoom,accept,resolveAutoName}={}){
      for(const fn of [closeMapMenus,getMapZoom,accept,resolveAutoName])
        if(typeof fn!=="function")throw new TypeError("Pin entry ports required");
      Object.assign(this,{closeMapMenus,getMapZoom,accept,resolveAutoName});
    }
    create(lat,lng,name,source="search"){
      if(!Number.isFinite(lat)||Math.abs(lat)>90||
         !Number.isFinite(lng)||Math.abs(lng)>180)return null;
      this.closeMapMenus();
      // Capture the current zoom before an adapter can center a new object.
      const mapZoom=this.getMapZoom();
      const entry={kind:"point",point:{lat,lng},mapZoom,
        autoNamed:source==="map"&&!name,
        label:name||"Neuer Pin",name:name||"",source,
        preserveViewport:source==="map"};
      const saved=this.accept(entry);
      if(saved&&entry.autoNamed)void this.resolveAutoName(entry);
      return saved;
    }
  }
  root.Pin2MapPinEntryCoordinator=PinEntryCoordinator;
  if(typeof module!=="undefined"&&module.exports)module.exports=PinEntryCoordinator;
})(typeof window!=="undefined"?window:globalThis);
