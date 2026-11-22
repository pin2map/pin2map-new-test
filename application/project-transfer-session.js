"use strict";
/* Project replacement is an application transaction, not a dialog action.
 * No DOM, browser storage API, map engine or filesystem knowledge here. */
(function(root){
  class ProjectTransferSession {
    constructor({transfer,defaults,repairPrivate,ensureFeatures,cleanupSearch,
      getProject,setProject,getStore,writeProject}){
      Object.assign(this,{transfer,defaults,repairPrivate,ensureFeatures,cleanupSearch,
        getProject,setProject,getStore,writeProject});
    }
    prepare(choice,incoming,filename){
      const previous=this.getProject();
      const candidate=choice==="add"
        ?this.transfer.addInNewLayer(previous,incoming,filename)
        :this.transfer.safeProject(incoming);
      const next={...this.defaults(),...candidate};
      if(!["street","international","humanitarian","topo","satellite"].includes(next.basemap))
        next.basemap=previous.basemap;
      this.repairPrivate(next);
      this.ensureFeatures(next);
      this.cleanupSearch(next);
      if(!Number.isFinite(next.viewport?.lat)||!Number.isFinite(next.viewport?.lng)||
         !Number.isFinite(next.viewport?.zoom)||Math.abs(next.viewport.lat)>90||
         Math.abs(next.viewport.lng)>180)next.viewport={...previous.viewport};
      return next;
    }
    async commit(choice,incoming,filename){
      const previous=this.getProject();
      // Validation and normalization must finish without touching active data.
      const next=this.prepare(choice,incoming,filename);
      try{
        this.setProject(next);
        if(!this.getStore())throw Error("Lokaler Projektspeicher nicht verfügbar");
        // One full-project IndexedDB transaction, never per-object writes.
        await this.writeProject();
        return next;
      }catch(error){
        this.setProject(previous);
        throw error;
      }
    }
  }
  root.Pin2MapProjectTransferSession=ProjectTransferSession;
  if(typeof module!=="undefined"&&module.exports)module.exports=ProjectTransferSession;
})(typeof window!=="undefined"?window:globalThis);
