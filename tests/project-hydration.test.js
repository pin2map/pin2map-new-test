"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const hydrate=require("../application/project-hydration.js").hydrate;
const model=require("../domain/project-model.js");
function run(saved,cleanupSearch=()=>{}){
  return hydrate(saved,{defaults:model.defaultProject,privateLayerId:model.PRIVATE_ID,cleanupSearch});
}
test("valid stored pins and layers remain in the same order, retaining custom fields",()=>{
  const project=model.defaultProject();
  project.layers=[{id:"travel",name:"Reisen",visible:false,color:"#123456"},project.layers[0]];
  project.pins=[{id:"a",name:"A",lat:50,lng:8,layerId:"travel",metadata:{a:1}}];
  project.viewport={lat:51,lng:9,zoom:11};project.basemap="topo";
  project.activeLayer="travel";project.extraCustomField={tag:"keep"};
  const snapshot=structuredClone(project);
  let cleanupCalled=0;
  const loaded=run(project,p=>{cleanupCalled++;p.geoCache={};});
  assert.equal(cleanupCalled,1);
  assert.deepEqual(loaded.layers,snapshot.layers);
  assert.deepEqual(loaded.pins,snapshot.pins);
  assert.deepEqual(loaded.viewport,snapshot.viewport);
  assert.equal(loaded.basemap,"topo");
  assert.deepEqual(loaded.extraCustomField,snapshot.extraCustomField);
  assert.equal("activeLayer" in loaded,false);
  assert.equal("activeLayer" in project,true,"Stored input must not be mutated at top level");
});
test("missing private layer is prepended while preserving pins and other layers",()=>{
  const saved={layers:[{id:"travel",name:"Reisen",visible:true}],pins:[{id:"p",layerId:"travel"}]};
  const existingTravelLayer=saved.layers[0];
  const loaded=run(saved);
  assert.equal(loaded.layers[0].id,"private");
  assert.equal(loaded.layers[1],existingTravelLayer);
  assert.equal(loaded.pins,saved.pins);
  assert.equal(saved.layers.length,2,"Legacy startup inserted into the same layers array");
});
test("existing private layer remains intact, no duplicate or overwrite",()=>{
  const saved={layers:[{id:"private",name:"Vertraulich",visible:false}],pins:[]};
  const loaded=run(saved);
  assert.equal(loaded.layers.length,1);
  assert.equal(loaded.layers[0].name,"Vertraulich");
  assert.equal(loaded.layers[0].visible,false);
});
test("partial or malformed saved objects fall back to defaults without salvaging pins",()=>{
  for(const saved of [null,undefined,{},{"layers":[]},{"pins":[]},{layers:null,pins:[]},
    {layers:[],pins:"not-an-array"},[1,2],false]){
    const loaded=run(saved);
    assert.deepEqual(loaded,model.defaultProject());
    assert.equal("activeLayer" in loaded,false);
  }
});
test("valid empty arrays preserve legacy behavior: only the mandatory private layer is restored",()=>{
  const loaded=run({layers:[],pins:[],labelsVisible:false,allowGeocode:true});
  assert.deepEqual(loaded.layers.map(l=>l.id),["private"]);
  assert.equal(loaded.pins.length,0);
  assert.equal(loaded.labelsVisible,false);
  assert.equal(loaded.allowGeocode,true);
});
test("cleanup is applied once after the active-layer removal",()=>{
  const order=[];
  const loaded=run({layers:[],pins:[],activeLayer:"private",geoCache:{stale:1}},project=>{
    order.push("cleanup");assert.equal("activeLayer" in project,false);project.geoCache={};
  });
  assert.deepEqual(order,["cleanup"]);assert.deepEqual(loaded.geoCache,{});
});
test("integration boundary and packaging preserve existing repository schema",()=>{
  const read=p=>fs.readFileSync(path.resolve(__dirname,"..",p),"utf8");
  const app=read("app.js"),html=read("index.html"),sw=read("sw.js"),db=read("adapters/storage/indexeddb-project-store.js");
  assert.match(app,/Pin2MapProjectHydration\.hydrate\(savedProject/);
  assert.match(app,/savedProject=await projectStore\.loadProject\(\)/);
  assert.ok(html.indexOf("./application/project-hydration.js")<html.indexOf("./app.js"));
  assert.match(sw,/"\.\/application\/project-hydration\.js"/);
  assert.match(sw,/const CACHE='pin2map-new-v\d+'/);
  assert.match(db,/const DATABASE="pin2map-new-v1"/);
  assert.match(db,/const VERSION=1/);
});

test("optional satellite appearance fields hydrate without a storage schema change",()=>{
  const initial=run({layers:[{id:"private",name:"Privat"}],pins:[],basemap:"satellite",
    satelliteBrightness:115,satelliteContrast:75});
  assert.equal(initial.satelliteBrightness,115);
  assert.equal(initial.satelliteContrast,75);
  const previous=run({layers:[{id:"private",name:"Privat"}],pins:[],basemap:"satellite"});
  assert.equal(previous.satelliteBrightness,140);
  assert.equal(Object.hasOwn(previous,"satelliteContrast"),false);
  assert.deepEqual(previous.pins,[]);
});
