"use strict";
/*
 * Browser storage adapter. The *existing* IndexedDB database contract is
 * deliberately preserved; migration is NOT part of this refactor.
 * No map, DOM widget, pins or layers code belongs here.
 */
(function(root){
  const DATABASE="pin2map-new-v1";
  const VERSION=1;
  const STORE="kv";
  const PROJECT_KEY="appState";
  // A device-only key in the existing KV store, never part of project export/sync.
  const VIEW_HISTORY_KEY="localMapViewHistory-v1";
  class IndexedDBProjectStore {
    constructor(db){this.db=db;}
    static open(indexedDBApi=root.indexedDB){
      if(!indexedDBApi) return Promise.reject(new Error("IndexedDB unavailable"));
      return new Promise((resolve,reject)=>{
        const request=indexedDBApi.open(DATABASE,VERSION);
        request.onupgradeneeded=()=>{
          const db=request.result;
          if(!db.objectStoreNames.contains(STORE))db.createObjectStore(STORE);
        };
        request.onsuccess=()=>resolve(new IndexedDBProjectStore(request.result));
        request.onerror=()=>reject(request.error||new Error("Cannot open project database"));
        request.onblocked=()=>reject(new Error("Project database is blocked"));
      });
    }
    loadProject(){
      return new Promise((resolve,reject)=>{
        const tx=this.db.transaction(STORE,"readonly");
        const req=tx.objectStore(STORE).get(PROJECT_KEY);
        req.onsuccess=()=>resolve(req.result);
        req.onerror=()=>reject(req.error||new Error("Project read failed"));
        tx.onabort=()=>reject(tx.error||new Error("Project read aborted"));
      });
    }
    saveProject(value){
      return new Promise((resolve,reject)=>{
        const tx=this.db.transaction(STORE,"readwrite");
        tx.objectStore(STORE).put(value,PROJECT_KEY);
        // Only a completed transaction guarantees the save succeeded.
        tx.oncomplete=()=>resolve();
        tx.onerror=()=>reject(tx.error||new Error("Project write failed"));
        tx.onabort=()=>reject(tx.error||new Error("Project write aborted"));
      });
    }
    loadViewHistory(){
      return new Promise((resolve,reject)=>{
        const tx=this.db.transaction(STORE,"readonly");
        const req=tx.objectStore(STORE).get(VIEW_HISTORY_KEY);
        req.onsuccess=()=>resolve(req.result);
        req.onerror=()=>reject(req.error||new Error("History read failed"));
        tx.onabort=()=>reject(tx.error||new Error("History read aborted"));
      });
    }
    saveViewHistory(value){
      return new Promise((resolve,reject)=>{
        const tx=this.db.transaction(STORE,"readwrite");
        tx.objectStore(STORE).put(value,VIEW_HISTORY_KEY);
        tx.oncomplete=()=>resolve();
        tx.onerror=()=>reject(tx.error||new Error("History write failed"));
        tx.onabort=()=>reject(tx.error||new Error("History write aborted"));
      });
    }
    close(){this.db.close();}
  }
  root.Pin2MapIndexedDBProjectStore=IndexedDBProjectStore;
  if(typeof module!=="undefined"&&module.exports)module.exports=IndexedDBProjectStore;
})(typeof window!=="undefined"?window:globalThis);
