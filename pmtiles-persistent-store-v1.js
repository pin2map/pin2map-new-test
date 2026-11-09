"use strict";
// Isolated experiment only. Never opens pin2map's production databases.
// The selected File is stored by IndexedDB structured clone, not uploaded.
(function(root){
 const DB="pin2map-pmtiles-persistent-lab-v1";
 const STORE="regions";
 const KEY="stuttgart-z12";
 function open(){
  if(!root.indexedDB)return Promise.reject(new Error("IndexedDB nicht verfügbar"));
  return new Promise((resolve,reject)=>{
   const request=root.indexedDB.open(DB,1);
   request.onupgradeneeded=()=>{
    const db=request.result;
    if(!db.objectStoreNames.contains(STORE))db.createObjectStore(STORE);
   };
   request.onsuccess=()=>resolve(request.result);
   request.onerror=()=>reject(request.error||new Error("Datenbank konnte nicht geöffnet werden"));
   request.onblocked=()=>reject(new Error("Datenbank ist in einer anderen Ansicht geöffnet"));
  });
 }
 async function run(mode,value){
  const db=await open();
  try{
   return await new Promise((resolve,reject)=>{
    const tx=db.transaction(STORE,mode==="read"?"readonly":"readwrite");
    const store=tx.objectStore(STORE);
    let result;
    const req=mode==="read"?store.get(KEY):mode==="write"?store.put(value,KEY):store.delete(KEY);
    req.onsuccess=()=>{result=req.result;};
    tx.oncomplete=()=>resolve(result);
    tx.onabort=()=>reject(tx.error||new Error("Speichertransaktion abgebrochen"));
    tx.onerror=()=>reject(tx.error||new Error("Speichertransaktion fehlgeschlagen"));
   });
  }finally{db.close();}
 }
 root.Pin2MapPMTilesLabStore=Object.freeze({
  databaseName:DB,
  get:()=>run("read"),
  put:record=>run("write",record),
  remove:()=>run("delete")
 });
})(window);
