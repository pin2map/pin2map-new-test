import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import vm from "node:vm";
const root=new URL("../",import.meta.url);
const read=path=>readFileSync(new URL(path,root),"utf8");
const store=read("pmtiles-persistent-store-v1.js");
const app=read("pmtiles-persistent-lab-v1.js");
const html=read("pmtiles-persistent-lab-v1.html");
const workflow=read(".github/workflows/maplibre-prototype.yml");
assert.match(store,/pin2map-pmtiles-persistent-lab-v1/);
assert.doesNotMatch(store,/pin2map-new-v1/);
assert.match(store,/tx\.oncomplete=\(\)=>resolve\(result\)/);
assert.match(app,/new window\.pmtiles\.FileSource\(file\)/);
assert.match(app,/await store\.put\(/);
assert.match(app,/await store\.get\(/);
assert.match(app,/await store\.remove\(/);
assert.match(app,/navigator\.storage\.persist\(\)/);
assert.doesNotMatch(app,/fetch\(|serviceWorker\.register/);
assert.match(html,/pmtiles-persistent-store-v1\.js/);
assert.match(html,/pmtiles-persistent-lab-v1\.js/);
new vm.Script(store);
new vm.Script(app.replace(/^import .*;$/gm,""));
const stored=new Map();
const db={
 objectStoreNames:{contains:()=>true},
 createObjectStore(){},
 close(){},
 transaction(){
  return {
   objectStore(){return {
    get(key){return request(()=>stored.get(key));},
    put(value,key){return request(()=>{stored.set(key,value);return key;});},
    delete(key){return request(()=>stored.delete(key));}
   };},
   oncomplete:null,onabort:null,onerror:null
  };
 }
};
function request(operation){
 const req={result:undefined,onsuccess:null};
 setTimeout(()=>{
  req.result=operation();
  req.onsuccess?.();
  // The object store mock is paired with the active transaction below.
  activeTx?.oncomplete?.();
 },0);
 return req;
}
let activeTx=null;
const originalTransaction=db.transaction;
db.transaction=function(...args){
 const tx=originalTransaction(...args);
 activeTx=tx;
 return tx;
};
const indexedDB={open(){
 const req={result:db,onsuccess:null,onerror:null,onupgradeneeded:null};
 setTimeout(()=>req.onsuccess?.(),0);
 return req;
}};
const context={window:{indexedDB},Promise,Error,setTimeout};
vm.runInNewContext(store,context);
const api=context.window.Pin2MapPMTilesLabStore;
assert.ok(api);
assert.equal(await api.get(),undefined);
const file={name:"stuttgart-z12.pmtiles",size:2866574};
await api.put({file});
assert.equal((await api.get()).file.size,2866574);
await api.remove();
assert.equal(await api.get(),undefined);
console.log("PMTiles isolated persistence: storage round-trip and wiring checks passed.");
