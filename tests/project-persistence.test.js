"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const Persistence=require("../application/project-persistence.js");
function fixture(){
  let nextId=0;const timers=new Map(),writes=[],errors=[];
  const state={pins:[{id:"pin-1"}],viewport:{lat:1,lng:2,zoom:7}};
  let store={saveProject(project){writes.push(project);return Promise.resolve();}};
  const persistence=new Persistence({
    getProject:()=>state,getStore:()=>store,onError:message=>errors.push(message),
    setTimer:(fn,ms)=>{assert.equal(ms,300);const id=++nextId;timers.set(id,fn);return id;},
    clearTimer:id=>timers.delete(id)
  });
  return {persistence,timers,writes,errors,state,setStore:value=>store=value,
    async fire(){const entries=[...timers];timers.clear();for(const [,fn] of entries)fn();await new Promise(resolve=>setImmediate(resolve));}};
}
test("multiple requested saves debounce to one write of current project object",async()=>{
  const x=fixture();x.persistence.save();x.persistence.save();x.persistence.save();
  assert.equal(x.timers.size,1);assert.equal(x.writes.length,0);
  await x.fire();assert.equal(x.writes.length,1);assert.equal(x.writes[0],x.state);
});
test("viewport save retains center/zoom contract and is debounced",async()=>{
  const x=fixture();x.persistence.saveViewport({center:{lat:49.3,lng:9.2},zoom:14});
  assert.deepEqual(x.state.viewport,{lat:49.3,lng:9.2,zoom:14});
  assert.equal(x.writes.length,0);await x.fire();assert.equal(x.writes.length,1);
});
test("immediate flush cancels pending timer and never produces a duplicate delayed write",async()=>{
  const x=fixture();x.persistence.save();
  await x.persistence.writeNow();assert.equal(x.timers.size,0);assert.equal(x.writes.length,1);
  await x.fire();assert.equal(x.writes.length,1);
});
test("missing storage remains safe and does not change project object",async()=>{
  const x=fixture();x.setStore(null);x.persistence.save();await x.fire();
  assert.equal(x.writes.length,0);assert.equal(x.state.pins.length,1);
});
test("debounced write errors notify user but hidden-page flush stays silent",async()=>{
  const x=fixture();x.setStore({saveProject:()=>Promise.reject(new Error("disk"))});
  x.persistence.save();await x.fire();
  assert.deepEqual(x.errors,["Lokales Speichern fehlgeschlagen"]);
  await x.persistence.flushOnHidden();
  assert.equal(x.errors.length,1);
});
test("disposing pending scheduled save removes timer without removing user data",async()=>{
  const x=fixture();x.persistence.save();x.persistence.dispose();
  assert.equal(x.timers.size,0);await x.fire();assert.equal(x.writes.length,0);
  assert.equal(x.state.pins.length,1);
});
test("HTML and offline shell load persistence before app; IndexedDB adapter remains owner",()=>{
  const app=fs.readFileSync(path.resolve(__dirname,"../app.js"),"utf8");
  const html=fs.readFileSync(path.resolve(__dirname,"../index.html"),"utf8");
  const sw=fs.readFileSync(path.resolve(__dirname,"../sw.js"),"utf8");
  const storage=fs.readFileSync(path.resolve(__dirname,"../adapters/storage/indexeddb-project-store.js"),"utf8");
  assert.match(app,/new window\.Pin2MapProjectPersistence/);
  assert.match(app,/persistence\.saveViewport\(mapAdapter\.getViewport\(\)\)/);
  assert.match(app,/persistence\.flushOnHidden\(\)/);
  assert.match(app,/save:dbWrite/);
  assert.ok(html.indexOf("./application/project-persistence.js")<html.indexOf("./app.js"));
  assert.match(sw,/"\.\/application\/project-persistence\.js"/);
  assert.match(sw,/const CACHE='pin2map-new-v\d+'/);
  assert.match(storage,/const DATABASE="pin2map-new-v1"/);
  assert.match(storage,/const VERSION=1/);
});
