"use strict";
/* The existing project database and record keys are preserved. */
(function(root){
  const DATABASE="pin2map-new-v1";
  const VERSION=1;
  const STORE="kv";
  const PROJECT_KEY="appState";
  const VIEW_HISTORY_KEY="localMapViewHistory-v1";
  const RESET_KEY="localResetGeneration-v1";
  class IndexedDBProjectStore {
    constructor(db){this.db=db;}
    static get cacheScope(){return DATABASE.includes("-preview-")?"pin2map-preview":"pin2map";}
    static open(indexedDBApi=root.indexedDB){
      if(!indexedDBApi)return Promise.reject(new Error("IndexedDB unavailable"));
      return new Promise((resolve,reject)=>{
        const request=indexedDBApi.open(DATABASE,VERSION);
        request.onupgradeneeded=()=>{
          const db=request.result;
          if(!db.objectStoreNames.contains(STORE))db.createObjectStore(STORE);
        };
        request.onsuccess=async()=>{
          const store=new IndexedDBProjectStore(request.result);
          try{store.generation=await store.read(RESET_KEY);resolve(store);}
          catch(error){store.close();reject(error);}
        };
        request.onerror=()=>reject(request.error||new Error("Cannot open project database"));
        request.onblocked=()=>reject(new Error("Project database is blocked"));
      });
    }
    read(key){
      return new Promise((resolve,reject)=>{
        const tx=this.db.transaction(STORE,"readonly");
        const req=tx.objectStore(STORE).get(key);
        req.onsuccess=()=>resolve(req.result);
        req.onerror=()=>reject(req.error||new Error("Project read failed"));
        tx.onabort=()=>reject(tx.error||new Error("Project read aborted"));
      });
    }
    write(update){
      return new Promise((resolve,reject)=>{
        const tx=this.db.transaction(STORE,"readwrite");
        const records=tx.objectStore(STORE);
        const generation=records.get(RESET_KEY);
        generation.onsuccess=()=>{
          // A tab opened before a reset may still have writes queued.
          if(generation.result!==this.generation){tx.abort();return;}
          update(records);
        };
        tx.oncomplete=()=>resolve();
        tx.onerror=()=>reject(tx.error||new Error("Project write failed"));
        tx.onabort=()=>reject(tx.error||new Error("Project write aborted"));
      });
    }
    loadProject(){return this.read(PROJECT_KEY);}
    saveProject(value){return this.write(records=>records.put(value,PROJECT_KEY));}
    loadViewHistory(){return this.read(VIEW_HISTORY_KEY);}
    saveViewHistory(value){return this.write(records=>records.put(value,VIEW_HISTORY_KEY));}
    reset(){
      return this.write(records=>{
        records.clear();
        records.put(root.crypto.randomUUID(),RESET_KEY);
      });
    }
    close(){this.db.close();}
  }
  root.Pin2MapIndexedDBProjectStore=IndexedDBProjectStore;
  if(typeof module!=="undefined"&&module.exports)module.exports=IndexedDBProjectStore;
})(typeof window!=="undefined"?window:globalThis);
