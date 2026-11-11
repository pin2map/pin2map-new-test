"use strict";
/* Project write scheduling and viewport persistence orchestration.
 * The storage adapter alone owns IndexedDB. No schema or data migration. */
(function(root){
  class ProjectPersistence{
    constructor({getProject,getStore,onError,
      setTimer=(callback,ms)=>root.setTimeout(callback,ms),
      clearTimer=id=>root.clearTimeout(id),delay=300}){
      if([getProject,getStore,onError,setTimer,clearTimer].some(fn=>typeof fn!=="function"))
        throw new TypeError("Persistence callbacks required");
      this.getProject=getProject;this.getStore=getStore;this.onError=onError;
      this.setTimer=setTimer;this.clearTimer=clearTimer;this.delay=delay;
      this.pending=null;
    }
    writeNow(){
      if(this.pending!==null){this.clearTimer(this.pending);this.pending=null;}
      const store=this.getStore();
      return store?store.saveProject(this.getProject()):Promise.resolve();
    }
    save(){
      if(this.pending!==null)this.clearTimer(this.pending);
      this.pending=this.setTimer(()=>{
        this.pending=null;
        Promise.resolve().then(()=>this.writeNow()).catch(()=>this.onError("Lokales Speichern fehlgeschlagen"));
      },this.delay);
    }
    saveViewport(view){
      const state=this.getProject();
      state.viewport={lat:view.center.lat,lng:view.center.lng,zoom:view.zoom};
      this.save();
    }
    flushOnHidden(){
      return this.writeNow().catch(()=>{});
    }
    dispose(){
      if(this.pending!==null)this.clearTimer(this.pending);
      this.pending=null;
    }
  }
  root.Pin2MapProjectPersistence=ProjectPersistence;
  if(typeof module!=="undefined"&&module.exports)module.exports=ProjectPersistence;
})(typeof window!=="undefined"?window:globalThis);
