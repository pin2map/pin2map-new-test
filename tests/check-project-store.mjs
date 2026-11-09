import assert from "node:assert/strict";
import {createRequire} from "node:module";
const require=createRequire(import.meta.url);
const Store=require("../adapters/storage/indexeddb-project-store.js");
const transactions=[];
const records=new Map();
const db={
 objectStoreNames:{contains:(name)=>name==="kv"},
 close(){},
 transaction(storeName,mode){
  assert.equal(storeName,"kv");
  const tx={oncomplete:null,onerror:null,onabort:null};
  const kv={
   get(key){
    const req={result:undefined,onsuccess:null,onerror:null};
    queueMicrotask(()=>{req.result=records.get(key);req.onsuccess?.();tx.oncomplete?.();});
    return req;
   },
   put(value,key){
    queueMicrotask(()=>{records.set(key,value);tx.oncomplete?.();});
   }
  };
  tx.objectStore=name=>{assert.equal(name,"kv");return kv;};
  transactions.push({mode,tx});
  return tx;
 }
};
const opens=[];
const indexedDBMock={
 open(name,version){
  opens.push([name,version]);
  const req={result:db,onsuccess:null,onerror:null,onupgradeneeded:null};
  queueMicrotask(()=>req.onsuccess?.());
  return req;
 }
};
const store=await Store.open(indexedDBMock);
assert.deepEqual(opens,[["pin2map-new-v1",1]]);
assert.equal(await store.loadProject(),undefined);
const project={pins:[{id:"p1",layerId:"private",lat:48.7,lng:9.1}],layers:[{id:"private"}]};
await store.saveProject(project);
assert.deepEqual(await store.loadProject(),project);
assert.deepEqual(transactions.map(t=>t.mode),["readonly","readwrite","readonly"]);
console.log("IndexedDB project storage preserves prior database/key and transaction semantics.");
