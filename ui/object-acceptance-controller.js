"use strict";
/* Adopt real objects into the current project; map and persistence are ports.
 * No Leaflet, database, geocoding or DOM ownership in this controller. */
(function(root){
  class ObjectAcceptanceController{
    constructor({service,getProject,getLayer,privateId,clearPrevious,clearSelection,
      onSetGpsPin,onCurrentPin,onFlash,onMapPoint,onMapGeometry,
      onSave,onRender,onNotice,onPersist}){
      Object.assign(this,{service,getProject,getLayer,privateId,clearPrevious,
        clearSelection,onSetGpsPin,onCurrentPin,onFlash,onMapPoint,onMapGeometry,
        onSave,onRender,onNotice,onPersist});
    }
    accept(source){
      if(!source)return null;
      // Plate results are frozen; never write local naming state onto catalog records.
      const entry=Object.isExtensible(source)?source:{...source};
      this.clearPrevious();
      const privateLayer=this.getLayer(this.privateId);
      if(!privateLayer)throw Error("Privat-Ebene fehlt");
      this.clearSelection();
      const created=this.service.create(this.getProject(),entry,this.privateId);
      if(!created)return null;
      if(entry.kind==="point"){
        entry.savedId=created.id;
        if(entry.source==="gps")this.onSetGpsPin(created.id);
        this.onCurrentPin(entry);
        this.onFlash("pins",created.id);
        if(!entry.preserveViewport&&entry.source!=="search"&&entry.source!=="gps")
          this.onMapPoint(entry.point);
      }else if(entry.kind==="river"){
        this.onFlash("rivers",created.id);
        if(!entry.preserveViewport)this.onMapGeometry(created);
      }else{
        this.onFlash(created.kind==="lake"?"lakes":"areas",created.id);
        if(!entry.preserveViewport)this.onMapGeometry(created);
      }
      this.onSave();
      this.onRender();
      if(!privateLayer.visible)this.onNotice("Objekt in ausgeblendeter Ebene Privat gespeichert");
      void this.onPersist().catch(()=>this.onNotice("Objekt konnte nicht gespeichert werden"));
      return created;
    }
  }
  root.Pin2MapObjectAcceptanceController=ObjectAcceptanceController;
  if(typeof module!=="undefined"&&module.exports)module.exports=ObjectAcceptanceController;
})(typeof window!=="undefined"?window:globalThis);
